// Supernatural RPG - Final JavaScript File with Character Lore Support

let characters = [
    { name: "Narrator", status: "present" }  // status può essere "present" o "remote"
  ];
let selectedCharacters = ["Narrator"];

let pendingArrival = new Set();

let player = {
    name: "User",
    isCustom: true,
    color: "#3399ff"
  };
  
  const allAvailableCharacters = [
    "Dean", "Sam", "Castiel", "Crowley", "Bobby", "Ruby", "Jo", "Ellen", "Other..."
  ];
  
  const characterColors = {
    "Dean": "#FFD700",
    "Sam": "#00BFFF",
    "Castiel": "#7FFFD4",
    "Crowley": "#FF4500",
    "Bobby": "#90EE90",
    "Ruby": "#FF69B4",
    "Jo": "#FF8C00",
    "Ellen": "#8A2BE2",
    "Narrator": "#dddddd",
    "User": "#3399ff",
    "default": "#cccccc" // fallback
  };
  
  const quickActions = [
    "Let's go to the Impala",
    "I pull out my gun",
    "I open the door cautiously",
    "I check the anti-demon salts",
    "I call Castiel",
    "I grab Ruby's knife",
    "I turn on a flashlight",
    "I read from John's journal",
    "I punch the demon",
    "I hide behind the bed"
  ];
  
  const randomIntros = [
    "You find yourself standing in a circle of salt. Something moves outside.",
    "A phone rings at 3:33 AM. No one is on the line.",
    "There's a message carved into your motel mirror.",
    "You hear Latin chanting in the woods behind your house.",
    "Your laptop opens by itself. A page about exorcisms appears.",
    "A cold hand touches your shoulder. No one's there.",
    "You wake up handcuffed in the backseat of the Impala.",
    "Someone left a sealed envelope on your pillow.",
    "Dean Winchester is missing. Sam calls you for help.",
    "You open your eyes in a church with broken stained glass."
  ];
  
  let characterKnowledge = "";
  
  async function loadCharacterLore() {
        try {
                const response = await fetch("supernatural_character_profiles.txt");
                characterKnowledge = await response.text();
                console.log("Character lore loaded.");
            } catch (err) {
                console.error("Failed to load character lore:", err);
                characterKnowledge = "";
  }
  }
  
  function loadIntro() {
        const intro = randomIntros[Math.floor(Math.random() * randomIntros.length)];
        const storyDiv = document.getElementById("story");
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = intro;
        storyDiv.appendChild(p);
        triggerSounds(intro);
  }
  
  const characterImages = {}; // memorizza l’immagine scelta per ogni personaggio
  function refreshSidebar() {
    const presentList = document.getElementById("charListPresent");
    const remoteList = document.getElementById("charListRemote");
  
    presentList.innerHTML = "";
    remoteList.innerHTML = "";
  
    const knownNames = Object.keys(characterColors);
  
    characters.forEach(({ name, status }) => {
      const li = document.createElement("li");
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
  
      const img = document.createElement("img");
      img.classList.add("char-icon");
      const sanitizedName = name.toLowerCase().replace(/\s+/g, "");
  
      let imgSrc;
      if (characterImages[name]) {
        imgSrc = characterImages[name];
      } else {
        if (knownNames.includes(name)) {
          imgSrc = `images/${sanitizedName}.png`;
        } else {
          const rand = Math.floor(Math.random() * 4) + 1;
          imgSrc = `images/ghost${rand}.png`;
        }
        characterImages[name] = imgSrc;
      }
  
      img.src = imgSrc;
      img.alt = name;
      if (selectedCharacters.includes(name)) {
          img.classList.add("selected");
        }
      img.setAttribute("data-name", name);
      img.style.color = characterColors[name] || characterColors["default"];
  
      const dismissBtn = document.createElement("button");
      dismissBtn.textContent = "Dismiss";
      dismissBtn.className = "dismiss-btn";
      dismissBtn.style.position = "absolute";
      dismissBtn.style.top = "0";
      dismissBtn.style.right = "0";
      dismissBtn.style.display = "none";
      dismissBtn.onclick = () => dismissCharacter(name);
  
      img.onclick = () => {
        if (selectedCharacters.includes(name)) {
          selectedCharacters = selectedCharacters.filter(n => n !== name);
          dismissBtn.style.display = "none";
        } else {
          selectedCharacters.push(name);
          dismissBtn.style.display = "inline";
        }
        refreshSidebar();
      };
  
      wrapper.appendChild(img);
      wrapper.appendChild(dismissBtn);
      li.appendChild(wrapper);
  
      if (status === "present") {
        presentList.appendChild(li);
      } else if (status === "remote") {
        remoteList.appendChild(li);
      }
    });
  }
  
function removeCharacter(name) {
  const loweredName = name.toLowerCase();

  characters = characters.filter(c => c.name.toLowerCase() !== loweredName);
  selectedCharacters = selectedCharacters.filter(n => n.toLowerCase() !== loweredName);
  newCharacters.delete(name);

  // Rimuove l'icona dalla sidebar
  const icon = document.querySelector(`.char-icon[data-name="${name}"]`);
  if (icon) icon.remove();

  refreshSidebar();
}
  
  
  function setupActions() {
    const container = document.getElementById("actions-container");
    container.innerHTML = "";
    quickActions.forEach(action => {
      const btn = document.createElement("button");
      btn.textContent = action;
      btn.className = "action-btn";
      btn.onclick = () => sendToGPT(action, "narration");
      container.appendChild(btn);
    });
  }
  
  function startGame() {
    const selection = document.getElementById("playerSelect").value;
    if (selection === "custom") {
      const name = document.getElementById("playerName").value.trim();
      if (name) player.name = name;
      player.isCustom = true;
    } else if (selection !== "") {
      player.name = selection;
      player.isCustom = false;
    }
    characterColors["User"] = "#3399ff";
    document.getElementById("user-character-select").style.display = "none";
    document.getElementById("game-interface").style.display = "block";
    refreshSidebar();
    loadIntro();
  }
  
  function loadDropdown() {
    const dropdown = document.getElementById("charDropdown");
    dropdown.innerHTML = `<option value="">-- Select character --</option>`;
    allAvailableCharacters.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      dropdown.appendChild(opt);
    });
  
    const playerSelect = document.getElementById("playerSelect");
    if (playerSelect) {
      playerSelect.onchange = () => {
        const val = playerSelect.value;
        const fields = document.getElementById("customPlayerFields");
        fields.style.display = val === "custom" ? "block" : "none";
      };
    }
  
    dropdown.onchange = () => {
      const val = dropdown.value;
      document.getElementById("customCharFields").style.display = val === "Other..." ? "block" : "none";
    };
  }
  
  function addSelectedCharacter() {
    const dropdown = document.getElementById("charDropdown");
    const name = dropdown.value;
    if (name && name !== "Other..." && !characters.includes(name)) {
      addCharacter(name, "present");
      refreshSidebar();
      dropdown.value = "";
    }
  }
  
  function addCustomCharacter() {
    const name = document.getElementById("customCharName").value.trim();
    const status = document.getElementById("customCharStatus").value;
  
    if (!name || characterExists(name)) return;
  
    addCharacter(name, status);
    allAvailableCharacters.push(name);
  
    if (status === "present") {
      selectedCharacters.push(name); // Present means selectable
    }
  
    refreshSidebar();
    loadDropdown();
  
    document.getElementById("customCharName").value = "";
    document.getElementById("customCharDesc").value = "";
    document.getElementById("customCharStatus").value = "present";
    document.getElementById("customCharFields").style.display = "none";
  }
  
  window.addEventListener("DOMContentLoaded", async () => {
    if (typeof loadDropdown === "function") loadDropdown();
    setupActions();
    await loadCharacterLore();
  
  document.addEventListener("click", () => {
    const bgm = document.getElementById("background-music");
    if (bgm && bgm.paused) {
      bgm.volume = 0.3;
      bgm.play().catch(err => console.warn("Audio play blocked:", err));
    }
  }, { once: true }); // parte solo al primo click
  
    const narrationInput = document.getElementById("narrationInput");
    const dialogueInput = document.getElementById("dialogueInput");
    [narrationInput, dialogueInput].forEach(input => {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          const type = input === narrationInput ? "narration" : "dialogue";
          sendToGPT(input.value, type);
          input.value = "";
        }
      });
    });
  });
  
    const narrationInput = document.getElementById("narrationInput");
    const dialogueInput = document.getElementById("dialogueInput");
    [narrationInput, dialogueInput].forEach(input => {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          const type = input === narrationInput ? "narration" : "dialogue";
          sendToGPT(input.value, type);
          input.value = "";
        }
      });
    });
  
  function triggerSounds(text) {
    const lowerText = text.toLowerCase();
    const triggers = [
      { id: 'sound-door', patterns: [/knock/, /door\s+creak/, /door\s+slam/, /opens\s+the\s+door/] },
      { id: 'sound-gunshot', patterns: [/gunshot/, /shoots?/, /fired/, /pulls\s+the\s+trigger/, /bang/, /blast/, /bullet/, /pistol/, /shooting/] },
      { id: 'sound-scream', patterns: [/scream/, /shout/, /yell/, /cry\s+out/, /wail/, /screeches?/] },
      { id: 'sound-demon', patterns: [/demon/, /growl/, /possess/, /evil/, /dark\s+presence/, /hellhound/] },
      { id: 'sound-whisper', patterns: [/whisper/, /ghost/, /murmur/, /breath/, /chill/, /spirit/] },
      { id: 'sound-impala', patterns: [/impala/, /car/, /engine/, /rev/, /roar/] },
    ];
  
    for (const { id, patterns } of triggers) {
      if (patterns.some(regex => regex.test(lowerText))) {
        const audio = document.getElementById(id);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.8;
          audio.play();
        }
        break;
      }
    }
        // 👇 Aggiungi da qui in giù
  if (text === "character_arrived") {
    const arrivalAudio = document.getElementById("sound-arrival");
    if (arrivalAudio) {
      arrivalAudio.pause();
      arrivalAudio.currentTime = 0;
      arrivalAudio.volume = 0.8;
      arrivalAudio.play();
    }
  }
  }
  
  async function askCharacterArbiter(name, line, context) {
    const prompt = `
  You're helping moderate a roleplaying game. Your job is to decide whether a character should be added to the game as a present or remote participant, based on recent story events.
  
  STORY CONTEXT:
  ${context}
  
  NEW LINE:
  ${line}
  
  CHARACTER TO ANALYSE:
  "${name}"
  
  Question: Based on the context and the new line, should this character be added as a speaking character in the story?
  
  Reply with:
  - "yes-present" if they should be added as a physically present character
  - "yes-remote" if they should be added as a remote character (e.g., phone call)
  - "no" if they are just passively mentioned
  
  Only respond with one of those options.
  `;
  
    const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
    });
  
    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    alert("GPT did not return a valid response.");
    console.error("GPT response issue:", data);
    return;
  }
  
  const replyRaw = data.choices[0].message.content;

if (!replyRaw || replyRaw.trim() === "") {
  alert("GPT returned an empty response.");
  console.error("GPT reply was empty:", data);
  return;
}

const reply = replyRaw.trim();
  
    if (reply.includes("yes-present")) return "present";
    if (reply.includes("yes-remote")) return "remote";
    return null;
  }
  
  function characterExists(name) {
    return characters.some(c => typeof c === "object" && c.name === name);
  }
  
  function addCharacter(name, status = "remote") {
    if (!characterExists(name)) {
      characters.push({ name, status });
      if (status === "present") selectedCharacters.push(name);
    }
  }
  
  async function sendToGPT(message, type = "dialogue", isRandom = false) {
    const newCharacters = new Set();
    const input = message.trim();
    if (!input) return;
    // 🔒 Assicura che il Narrator sia sempre presente
      if (!characterExists("Narrator")) {
        characters.push({ name: "Narrator", status: "present" });
      }
  
    const storyDiv = document.getElementById("story");
  const speakerNames = characters
    .filter(c => selectedCharacters.includes(c.name) && c.status === "present")
    .map(c => c.name)
    .filter(name => name !== player.name)
    .join(" and ");
    const storyLines = Array.from(storyDiv.querySelectorAll("p"))
      .slice(-6)
      .map(p => p.textContent)
      .join("\n");
  
    document.getElementById("choices").innerHTML = "";
    triggerSounds(input);
  
  const playerMsg = document.createElement("p");
  if (type === "dialogue") {
    playerMsg.className = `character-color-User`;
    playerMsg.textContent = `${player.name}: "${input}"`;
  } else {
    playerMsg.className = "narration";
    playerMsg.textContent = input;
  }
  storyDiv.appendChild(playerMsg);
  
  let prompt = `# Supernatural Character Lore:\n${characterKnowledge}\n\n# Current Situation:\n${storyLines}\n\n`;
  prompt += `The main character is named ${player.name}. Avoid calling them Dean or Sam. Use their name when characters speak to them.\n\n`;
 
if (isRandom) {
    prompt += `The player triggers a sudden supernatural event. Continue the story in a suspenseful and logical way. Make sure the event fits the context. Include short narration and only logical character reactions. End with 2–3 meaningful and situation-appropriate player options.`;
} else if (type === "narration") {
  prompt += `The player narrates an action:\n"${input}"\n\nRespond with a short, clear continuation of the scene, describing the **consequences** of the action — do **not repeat** what the player just did. Keep narration concise but vivid. Maintain flow from the last story context. Then give 2–3 realistic next actions in this format:\n[Look around the room]\n[Ask a question]\n[Get your weapon]`;
} else {
    prompt += `The player (${player.name}) says:\n"${input}"\n\nCharacters involved: ${speakerNames}\n\nContinue the story naturally and logically. Characters must respond as they would in the series, based on the character lore. Keep lines brief, reactive, and in-character. Avoid redundancy. Let the narrator add connecting context only when needed.
  
  The player is speaking directly to a character.
  That character must respond with a direct line of dialogue, not just a reaction.
  Do not only describe the character’s expression or actions — include what they say.`;
  }
  
  prompt += `
  # Trigger Tags:
  If a character becomes physically present in the scene, include this tag on its own line:
  #PRESENT: CharacterName
  
  If a character was previously remote and now joins the scene in person, also include:
  #PRESENT: CharacterName
  
  If a character is contacted remotely (e.g. by phone), include:
  #REMOTE: CharacterName
  
  These tags must appear on a separate line, outside of narration or dialogue.
  
  IMPORTANT BEHAVIOUR RULES:
  
  - If the player mentions a character (e.g. "I'll call Dean"), that character must NOT respond unless:
    - They are already marked as 'present', OR
    - The narrator explicitly brings them into the scene.
  
  - Do NOT repeat what the player just said as a line of dialogue.
    Example: if the player says "Bobby! Can you hear me?", do NOT write that again.
  
  - When a character speaks, always use this format:
  CharacterName: "Their line"
  
  - NEVER embed dialogue in narration.
    ❌ Wrong: Narrator: Bobby looks at you and says, "Be careful."
    ✅ Correct: Bobby: "Be careful."
  
  - Characters who are not present or contacted remotely must NOT speak. They can be mentioned by the narrator, but cannot reply.
  
  - For phone calls or remote contacts:
    Only the narrator can describe interference, ringing, or connection.
    Only AFTER that may the contacted character speak.
  
  - Only the narrator may describe the results of player actions like calling, summoning, or approaching someone.
  
  CHARACTER DYNAMICS AND OUTPUT:
  
  - Characters must act consistently with their personalities and story arcs.
  - Their lines should:
    - React meaningfully to what the player said
    - Build on recent events
    - Avoid generic filler like “Stay sharp” (unless it truly fits)
    - Be emotionally grounded and unique to each character
  
  - Avoid repeating actions already taken in the last turn.
  
  - Always end with 2–3 fresh and realistic player choices, in this format:
    [Inspect the mirror]
    [Call Castiel]
    [Look for weapons]
  
  Only the following characters are allowed to speak: ${selectedCharacters.join(", ")}, and the Narrator.
  The Narrator is always allowed to describe, connect, or respond to the player's actions, even if no other character is present..
  - DO NOT include dialogue or actions for characters not in this list.
  - If a new character enters the story, include them only in narration.
  - The player must explicitly add a character before they can speak.
  
  If the player clearly asks a character to leave (e.g. "please go", "leave me alone", "you can go now"), and that character is a peaceful or cooperative supernatural presence (like a ghost seeking closure), then you may end their presence with:
  
  #LEAVE: CharacterName

  - If a conversation with a remote character clearly ends (for example, the player hangs up, says goodbye, or no longer engages with that character), and that character is not needed in the next action, you may end the call with:
  #LEAVE: CharacterName
  
  Do NOT use this tag for hostile or uncooperative entities (e.g. demons, monsters, or aggressive spirits) unless the context makes their exit logical (e.g. they flee, are banished, or retreat for story reasons).
  `;
    
   try {
      const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
      });
  
      const data = await response.json();
    if (
      !data ||
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message ||
      !data.choices[0].message.content
    ) {
      alert("⚠️ GPT did not return a valid response. Try again or check your internet connection.");
      console.error("Invalid GPT response:", data);
      return;
    }
    
    
const reply = data.choices[0].message.content.trim();
console.log("GPT reply:", reply);
const lines = reply.split("\n").filter(line => line.trim() !== "");

// --- Personaggi presenti/remoti e gestione sidebar definitiva ---
lines.forEach(line => {
  const presentMatch = line.match(/^#PRESENT:\s*(.+)$/);
  const remoteMatch = line.match(/^#REMOTE:\s*(.+)$/);

  if (presentMatch) {
    const name = presentMatch[1].trim();
    const existing = characters.find(c => c.name === name);
    const wasAlreadyPresent = existing && existing.status === "present";

    if (existing) {
      existing.status = "present";
    } else {
      characters.push({ name, status: "present" });
    }

    if (!selectedCharacters.includes(name)) {
      selectedCharacters.push(name);
    }

    newCharacters.add(name);

    if (!wasAlreadyPresent) {
      const msg = document.createElement("p");
      msg.className = "narration";
      msg.textContent = `${name} has arrived.`;
      storyDiv.appendChild(msg);
      triggerSounds("character_arrived");
    }

    if (pendingArrival.has(name)) {
      pendingArrival.delete(name);
    }

    refreshSidebar();
  }

  if (remoteMatch) {
    const name = remoteMatch[1].trim();
    const existing = characters.find(c => c.name === name);

    if (!existing) {
      characters.push({ name, status: "remote" });
      newCharacters.add(name);
      selectedCharacters.push(name);

      const msg = document.createElement("p");
      msg.className = "narration";
      msg.textContent = `${name} is now on the line.`;
      storyDiv.appendChild(msg);
    } else {
      existing.status = "remote";
    }

    refreshSidebar();
  }

  const arrivalMatch = line.match(/([A-Z][a-z]+) (is on his way|is coming|will arrive soon|will be joining us|is heading here)/i);
  if (arrivalMatch) {
    const name = arrivalMatch[1].trim();
    pendingArrival.add(name);
  }
});

// --- Bottoni per le scelte (pulito) ---
const choicesDiv = document.getElementById("choices");
const choiceLines = reply
  .split("\n")
  .filter(line => line.trim().startsWith("["));

choicesDiv.innerHTML = "";

choiceLines.forEach(choice => {
  const choiceText = choice.replace(/[\[\]]/g, "");
  const btn = document.createElement("button");
  btn.className = "choice-btn";
  btn.textContent = choiceText;
  btn.onclick = () => {
    document.getElementById("userInput").value = choiceText;
    sendToGPT(choiceText);
  };
  choicesDiv.appendChild(btn);
});
} catch (error) {
  console.error("Fetch failed:", error);
}
}

async function startGame() {
  const initialScenario = await getRandomScenario();
  const storyDiv = document.getElementById("story");
  storyDiv.innerHTML = "";
  
  const initialMsg = document.createElement("p");
  initialMsg.className = "narration";
  initialMsg.textContent = initialScenario;
  storyDiv.appendChild(initialMsg);

  await sendToGPT(initialScenario, "initial");
}

async function getRandomScenario() {
  const response = await fetch("scenarios.txt");
  const scenariosText = await response.text();
  const scenarios = scenariosText.split("\n").filter(Boolean);
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

window.onload = function () {
  populateCharacterDropdown();
  document.getElementById("userInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendToGPT(this.value, "dialogue");
      this.value = "";
    }
  });
};
