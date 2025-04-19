/* main.js */
import {
  characters,
  characterKnowledge,
  //loadDropdown,
  setupActions,
  loadCharacterLore,
  refreshSidebar,
  triggerRandomEvent,
  toggleSidebar,
  toggleMusic,
  startGame,
  addSelectedCharacter,
  addCustomCharacter,
  sendToGPT,
  dismissCharacter,
  setPlayer,
  scheduleArrival,
  travelTimes
  //,
  //triggerExorcismEvent
  // ... aggiungi qui tutte le altre funzioni da usare in main.js
} from './gameFunctions.js';

// Variabile globale per il giocatore
let player = {
  name: "User",
  isCustom: true,
  color: "#3399ff"
};
setPlayer(player);

// Al caricamento del DOM, inizializza il gioco
window.addEventListener("DOMContentLoaded", async () => {
  // Carica il dropdown per la scelta dei personaggi
  //loadDropdown();
  // Imposta le azioni rapide
  setupActions();
  // Carica il lore dei personaggi da file esterno
  await loadCharacterLore();

   // Mostra/nascondi il form “Create custom character”
  const playerSelect = document.getElementById("playerSelect");
  if (playerSelect) {
  playerSelect.addEventListener("change", e => {
  const fields = document.getElementById("customPlayerFields");
  fields.style.display = e.target.value === "custom" ? "block" : "none";
  });
  }
  
  // Abilita l'audio al primo click dell'utente
  document.addEventListener("click", () => {
    const bgm = document.getElementById("background-music");
    if (bgm && bgm.paused) {
      bgm.volume = 0.3;
      bgm.play().catch(err => console.warn("Audio play blocked:", err));
    }
    const arrivalAudio = document.getElementById("sound-arrival");
    if (arrivalAudio) {
      arrivalAudio.play().then(() => {
        arrivalAudio.pause();
        arrivalAudio.currentTime = 0;
      }).catch(err => console.warn("Arrival sound blocked:", err));
    }
  }, { once: true });
  
  // Aggiungi listener per gli input della narrazione e dialogo
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
    // ─────────── PHONE DIALER ───────────
  const phoneOverlay   = document.getElementById("phone-overlay");
  const phoneClose     = document.getElementById("phone-close");
  const contactList    = document.getElementById("phone-contact-list");
  const phoneConvo     = document.getElementById("phone-conversation");
  const messagesDiv    = document.getElementById("messages");
  const phoneInput     = document.getElementById("phone-input");
  const phoneSendBtn   = document.getElementById("phone-send");
  const phoneHangupBtn = document.getElementById("phone-hangup");
  let   currentCallee  = null;
  let   convoHistory   = [];
  // Traccia chi ha detto #PRESENT: durante la chiamata
  const callIntents = new Set();

  // 1) Apri il dialer e popola i contatti
  document.getElementById("phone-button").onclick = () => {
    contactList.innerHTML = "";
    ["Dean","Sam","Castiel","Crowley","Bobby","Ruby","Jo","Ellen"].forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;
      li.onclick = () => openConversation(name);
      contactList.appendChild(li);
    });
    phoneOverlay.classList.remove("hidden");
  };

  // 2) Chiudi telefono (Close e Hangup)
  phoneClose.onclick = resetPhone;
  phoneHangupBtn.onclick = resetPhone;

  // 3) Apri conversazione
  function openConversation(name) {
    currentCallee = name;
    convoHistory = [];
    messagesDiv.innerHTML = "";
    phoneConvo.classList.remove("hidden");
  }

phoneSendBtn.onclick = async () => {
  const txt = phoneInput.value.trim();
  if (!txt || !currentCallee) return;

    // ——— NUOVO SNIPPET: costruiamo lore e convoContext ———
  // Estraggo dal characterKnowledge il profilo di currentCallee
  const lore = characterKnowledge
    .split("---")
    .find(chunk => chunk.startsWith(currentCallee))
    ?.trim() || "";

  // Ricompongo l’intera conversazione fatta finora (You vs NPC)
  const convoContext = convoHistory
    .map(m => m.role === "user"
      ? `You: ${m.content}`
      : `${currentCallee}: ${m.content}`)
    .join("\n");
  // ————————————————————————————————
  
  // 1) Stampa un log per debug
  console.log("📱 Send clicked; reply incoming for", currentCallee);

  // 2) Mostra subito il messaggio dell’utente
  appendMessage("You", txt);
  convoHistory.push({ role: "user", content: txt });

  // 3) Prompt univoco: siamo sempre in chiamata
  const systemMsg = `
You are ${currentCallee}. Here is your complete profile from the Supernatural database:
${lore}

This is the phone‑call conversation so far:
${convoContext}

INSTRUCTIONS:
1. Use every detail in your profile (personality, speech style, history) to reply in character, in plain English.
2. Reply naturally—if the player is checking in (“How’s it going?”, “And Jessica?”), answer with in‑character info.
3. Only if the player’s request clearly asks you to come help (“can you come here?”, “I need your help”), then **after** your dialogue append on its own line:
   #PRESENT: ${currentCallee}
4. In all other cases (greetings, small talk, farewells), **do not** include the tag.
5. Do not output anything else—no extra lines, no JSON, no brackets.
`.trim();


  // 4) Prepara e invia la request
  const msgs = [{ role: "system", content: systemMsg }, ...convoHistory];
  const res  = await fetch("https://supernatural-api.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4", messages: msgs })
  });
  const data  = await res.json();
  const reply = data.choices[0].message.content.trim();
  console.log("Reply string:", reply);

  // 5) Estrai tag e testo pulito
  const lines  = reply.split("\n").map(l => l.trim());
  const hasTag = lines.some(l => l.includes(`#PRESENT: ${currentCallee}`));
  let clean  = lines
    .map(l => l.replace(`#PRESENT: ${currentCallee}`, "").trim())
    .filter(l => l)
    .join("\n");

  // Se GPT4 non ha fornito alcuna battuta ma c'è il tag, usiamo un fallback
  if (!clean && hasTag) {
    clean = "I'll be right there.";
  }

  // 6) Append della risposta solo se c'è testo vero
  if (clean) {
    appendMessage(currentCallee, clean);
    convoHistory.push({ role: "assistant", content: clean });
  }
  phoneInput.value = "";

  // 7) Registra l’intenzione di venire, ma non partire subito
  if (hasTag) {
    console.log(`${currentCallee} intends to come`);
    callIntents.add(currentCallee);
  }
};

  // 5) Helper per appendere messaggi
  function appendMessage(who, text) {
    const d = document.createElement("div");
    d.className = who === "You" ? "msg-you" : "msg-them";
    d.textContent = `${who}: ${text}`;
    messagesDiv.appendChild(d);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // 6) Reset telefono
  function resetPhone() {
    // 1) Se c’è stato un #PRESENT:, ora schedula l’arrivo
    if (currentCallee && callIntents.has(currentCallee)) {
      console.log(`🚗 Scheduling arrival for ${currentCallee} after the call`);
      // imposta come remote
      if (!characters.some(c => c.name === currentCallee)) {
        characters.push({ name: currentCallee, status: 'remote' });
      } else {
        characters.find(c => c.name === currentCallee).status = 'remote';
      }
      refreshSidebar();
      // avvia il timer
      const delay = travelTimes[currentCallee] ?? 30000;
      scheduleArrival(currentCallee, delay);
      callIntents.delete(currentCallee);
    }
  
    // 2) Poi resetta l’interfaccia del telefono
    phoneOverlay.classList.add("hidden");
    phoneConvo.classList.add("hidden");
    messagesDiv.innerHTML = "";
    phoneInput.value = "";
    currentCallee = null;
    convoHistory = [];
  }
  // ───────────────────────────────────────
});

window.startGame = startGame;
// expose these for the inline onclicks in index.html
  window.addSelectedCharacter = addSelectedCharacter;
  window.addCustomCharacter   = addCustomCharacter;
  window.triggerRandomEvent   = triggerRandomEvent;
  window.toggleMusic          = toggleMusic;
  window.toggleSidebar        = toggleSidebar;
  window.scheduleArrival = scheduleArrival;
