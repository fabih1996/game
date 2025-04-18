/* main.js */
import {
  characters,
  loadDropdown,
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
  loadDropdown();
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
  
    // 1) Mostra subito il messaggio dell'utente
    appendMessage("You", txt);
    convoHistory.push({ role: "user", content: txt });
  
    // 2) Determina se è una chiamata vera (/call) o un SMS
    const isCall = txt.startsWith("/call");
    let systemMsg;
    if (isCall) {
      systemMsg = `You are ${currentCallee}, speaking via phone call in character.
  After your next line, if you intend to come help the player, append on its own line:
  #PRESENT: ${currentCallee}
  Otherwise do not output that tag. Only output your dialogue and that tag—nothing else.`;
    } else {
      systemMsg = `You are ${currentCallee}, speaking via SMS in character.
  Just reply to the message naturally. Do not append any #PRESENT: tag under any circumstance.`;
    }
  
    // 3) Prepara i messaggi per GPT‑4
    const msgs = [{ role: "system", content: systemMsg }, ...convoHistory];
  
    // 4) Chiamata a GPT‑4
    const res  = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4", messages: msgs })
    });
    const data  = await res.json();
    const reply = data.choices[0].message.content.trim();
    console.log("Reply string:", reply);
  
    // 5) Parsifica eventuale tag #PRESENT:
    const lines  = reply.split("\n").map(l => l.trim());
    const hasTag = lines.includes(`#PRESENT: ${currentCallee}`);
    const clean  = lines.filter(l => l !== `#PRESENT: ${currentCallee}`).join("\n");
  
    // 6) Mostra la risposta
    appendMessage(currentCallee, clean);
    convoHistory.push({ role: "assistant", content: clean });
    phoneInput.value = "";
  
    // 7) Se è una vera chiamata e c'è il tag, avvia l'arrivo
    if (isCall && hasTag) {
      const delay = travelTimes[currentCallee] ?? 30000;
      scheduleArrival(currentCallee, delay);
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
