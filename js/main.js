// 📁 js/main.js

import {
    setStoryPhase,
    setCurrentLocation
  } from "./logic/gameState.js";
  
  import { buildPromptFromTemplate } from "./logic/promptBuilder.js";
  import { fetchGPTResponse } from "./logic/apiClient.js";
  import { appendNarration, appendDialogue, clearStory } from "./ui/storyRenderer.js";
  import { refreshSidebar } from "./ui/sidebar.js";
  import { setupPhoneUI } from "./ui/phoneUI.js";
  import { startGame } from "./logic/gameStart.js";

  
  // Dummy player (può essere esteso con un form)
  const playerName = "User";
  
  window.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("start-btn").addEventListener("click", startGame);
    console.log("✨ Supernatural RPG started");
    
    // Setup UI
    setupPhoneUI();
    refreshSidebar();
  
    // Stato iniziale
    setStoryPhase("intro");
    setCurrentLocation("Bunker");
  
    // Costruzione del primo prompt
    const prompt = await buildPromptFromTemplate("texts/supernatural_prompt.txt", {
      PLAYER_NAME: playerName,
      LOCATION: "Bunker",
      STORY_PHASE: "intro",
      CHARACTERS: "Dean and Sam",
      INPUT: "You wake up to a strange noise echoing from the hallway.",
      STORY_CONTEXT: ""
    });
  
    const reply = await fetchGPTResponse(prompt);
    clearStory();
  
    // Rendering del testo
    reply.split("\n").forEach(line => {
      const m = line.match(/^([A-Z][a-zA-Z]+):\s*["“]?(.+?)["”]?$/);
      if (m) {
        const [_, name, text] = m;
        appendDialogue(name, text);
      } else if (line.trim()) {
        appendNarration(line.trim());
      }
    });
  });
