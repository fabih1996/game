// 📁 js/logic/eventManager.js

import {
    characters,
    selectedCharacters,
    newCharacters,
    currentLocation,
    storyPhase,
    addCharacter,
    setCharacterStatus,
    setStoryPhase
  } from "./gameState.js";
  
  import { fetchGPTResponse } from "./apiClient.js";
  import { buildPromptFromTemplate } from "./promptBuilder.js";
  import { appendNarration, appendDialogue } from "../ui/storyRenderer.js";
  import { refreshSidebar } from "../ui/sidebar.js";
  
  // 💬 Mappa dei tempi di viaggio
  export const travelTimes = {
    Dean: 30000, Sam: 40000, Castiel: 5000, Crowley: 7000,
    Bobby: 45000, Ruby: 35000, Jo: 30000, Ellen: 45000
  };
  
  // 🕒 Arrivi programmati
  const arrivalETA = {};
  const arrivalDuration = {};
  
  /**
   * Costruisce il prompt e lo invia a GPT, poi mostra la risposta.
   * @param {string} input - Testo del giocatore
   * @param {'dialogue'|'narration'} type
   * @param {boolean} isRandom
   */
  export async function sendToGPT(input, type = "dialogue", isRandom = false) {
    if (!input) return;
    const storyDiv = document.getElementById("story");
  
    // Mostra input del giocatore
    if (type === "dialogue") {
      const p = document.createElement("p");
      p.className = "character-color-User glow-talk";
      p.textContent = `You: "${input}"`;
      storyDiv.appendChild(p);
      setTimeout(() => p.classList.remove("glow-talk"), 2000);
    } else {
      const p = document.createElement("p");
      p.className = "narration";
      p.textContent = `You: ${input}`;
      storyDiv.appendChild(p);
    }
  
    const contextLines = Array.from(storyDiv.querySelectorAll("p"))
      .slice(-20).map(p => p.textContent).join("\n");
  
    let prompt = "";
  
    if (type === "dialogue") {
      const speakers = characters
        .filter(c => c.status === "present" && selectedCharacters.includes(c.name))
        .map(c => c.name);
  
      prompt = [
        `Scene context (last 20 lines):\n${contextLines}`,
        `Current location: ${currentLocation}`,
        `Story phase: ${storyPhase}`,
        `Player says: "${input}" (do NOT generate their line)`,
        `NOW: let ${speakers.join(", ")} respond in character.`,
        `Format: Name: "Line", or narration. No brackets, no player lines.`
      ].join("\n\n");
    } else {
      prompt = await buildPromptFromTemplate("texts/supernatural_prompt.txt", {
        PLAYER_NAME: "User",
        STORY_CONTEXT: contextLines,
        INPUT: input,
        CHARACTERS: selectedCharacters.join(" and "),
        LOCATION: currentLocation,
        STORY_PHASE: storyPhase
      });
      if (isRandom) prompt += "\nThe player triggers a sudden supernatural event...";
      else prompt += `\nThe player speaks: "${input}". Make sure characters respond in character.`;
    }
  
    const reply = await fetchGPTResponse(prompt, "gpt-3.5-turbo");
    processReply(reply, contextLines);
  }
  
  /**
   * Analizza la risposta GPT: tag, dialoghi, narrazione.
   */
  function processReply(reply, context) {
    const lines = reply.split("\n").map(l => l.trim());
    const lowerReply = reply.toLowerCase();
  
    const rejectedTags = new Set();
  
    for (const line of lines) {
      if (line.startsWith("#PRESENT:")) {
        const name = line.split(":")[1].trim();
        if (
          /can't make it|not right now|maybe another time|urgent matters|can't join|sorry/i.test(lowerReply)
        ) {
          console.log(`❌ Ignored #PRESENT for ${name}`);
          rejectedTags.add(name);
        } else {
          scheduleArrival(name, travelTimes[name] || 30000);
        }
      }
  
      if (line.startsWith("#LEAVE:")) {
        const name = line.split(":")[1].trim();
        const idx = characters.findIndex(c => c.name === name);
        if (idx !== -1) {
          characters.splice(idx, 1);
          refreshSidebar();
          appendNarration(`${name} has left the scene.`);
        }
      }
    }
  
    lines.forEach(line => {
      if (line.startsWith("#")) return;
      if (/^[A-Z][a-zA-Z]+:/.test(line)) {
        const [name, ...rest] = line.split(":");
        const text = rest.join(":").replace(/^["“]+|["”]+$/g, "").trim();
        addCharacter(name.trim(), "present");
        appendDialogue(name.trim(), text);
      } else if (line.trim()) {
        appendNarration(line.trim());
      }
    });
  
    detectStoryPhase(context, reply).catch(e =>
      console.warn("⚠️ Story phase detection failed:", e)
    );
  
    triggerSounds(reply);
    refreshSidebar();
  }
  
  /**
   * Richiede a GPT di aggiornare la fase della storia.
   */
  export async function detectStoryPhase(context, reply) {
    const prompt = `
  Given the story context and the reply, choose the appropriate story phase:
  
  - intro
  - investigation
  - discovery
  - preparation
  - battle
  - epilogue
  
  Context:
  ${context}
  
  Reply:
  ${reply}
  
  Return ONLY the keyword.
    `.trim();
  
    const result = await fetchGPTResponse(prompt);
    const clean = result.toLowerCase().trim();
    if (["intro", "investigation", "discovery", "preparation", "battle", "epilogue"].includes(clean)) {
      setStoryPhase(clean);
      console.log("📘 Phase set:", clean);
    } else {
      console.warn("⚠️ Invalid phase from GPT:", result);
    }
  }
  
  /**
   * Gestisce l’arrivo graduale di un personaggio.
   */
  export function scheduleArrival(name, delay) {
    setCharacterStatus(name, "pending");
    refreshSidebar();
  
    const now = Date.now();
    arrivalETA[name] = now + delay;
    arrivalDuration[name] = delay;
  
    const wrapper = document.querySelector(`.char-wrapper[data-name="${name}"]`);
    if (wrapper) wrapper.style.setProperty("--prog", "0%");
  
    setTimeout(() => {
      setCharacterStatus(name, "present");
      delete arrivalETA[name];
      delete arrivalDuration[name];
      refreshSidebar();
      appendNarration(`${name} has arrived.`);
      triggerSounds("character_arrived");
    }, delay);
  }
  
  /**
   * Suoni in base al testo.
   */
  export function triggerSounds(text) {
    const lower = text.toLowerCase();
    const triggers = [
      { id: "sound-door", patterns: [/knock/, /door/, /opens/] },
      { id: "sound-gunshot", patterns: [/gunshot/, /shoot/] },
      { id: "sound-scream", patterns: [/scream/, /shout/] },
      { id: "sound-demon", patterns: [/demon/, /growl/] },
      { id: "sound-whisper", patterns: [/whisper/, /ghost/] },
      { id: "sound-impala", patterns: [/impala/, /engine/, /roar/] },
      { id: "sound-arrival", patterns: [/phone/, /call/, /dial/] }
    ];
  
    for (const { id, patterns } of triggers) {
      if (patterns.some(rx => rx.test(lower))) {
        const a = document.getElementById(id);
        if (a) {
          a.pause();
          a.currentTime = 0;
          a.volume = 0.8;
          a.play();
        }
        break;
      }
    }
  
    if (text === "character_arrived") {
      const a = document.getElementById("sound-arrival");
      if (a) {
        a.pause();
        a.currentTime = 0;
        a.volume = 0.8;
        a.play();
      }
    }
  }