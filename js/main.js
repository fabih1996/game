/* main.js */
import {
  characters,
  characterKnowledge,
  loadCharacterLore,
  refreshSidebar,
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
let player

const availableCharacters = [
  "Dean", "Sam", "Castiel", "Crowley", "Jo", "Ellen", "Bobby", "Ruby"
];

// Al caricamento del DOM, inizializza il gioco
window.addEventListener("DOMContentLoaded", async () => {

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
  const phoneScreen    = document.getElementById("phone-screen");
  const openMsgBtn    = document.getElementById("open-messages");
  let   currentCallee  = null;
  let   convoHistory   = [];
  // Traccia chi ha detto #PRESENT: durante la chiamata
  const callIntents = new Set();

  // 1) Apri il dialer e popola i contatti
document.getElementById("phone-button").onclick = () => {
  // ── 1. Wallpaper casuale da lista ─────────────────────
  const wallpaperList = [
    "images/wallpaper1.jpg",
    "images/wallpaper2.jpg",
    "images/wallpaper3.jpg",
    "images/wallpaper4.jpg"
    // Aggiungi qui eventuali altri sfondi
  ];
  const picked = wallpaperList[Math.floor(Math.random() * wallpaperList.length)];
  phoneScreen.style.background = `url('${picked}') center/cover no-repeat`;

  // ── 2. Home screen: mostra solo ✉ ─────────────────────
  contactList.innerHTML = "";
  contactList.classList.add("hidden");
  phoneConvo.classList.add("hidden");
  openMsgBtn.classList.remove("hidden");

  // ── 3. Mostra il telefono ─────────────────────────────
  phoneOverlay.classList.remove("hidden");
};

  // 2) Chiudi telefono (Close e Hangup)
  phoneClose.onclick = resetPhone;
  // 3) Apri conversazione
  function openConversation(name) {
    // ─── Highlight grafico sul contatto selezionato
    Array.from(contactList.children).forEach(li => {
      li.classList.toggle("selected", li.textContent === name);
    });
    currentCallee = name;
    convoHistory = [];
    messagesDiv.innerHTML = "";
    phoneConvo.classList.remove("hidden");
  }

  /* ─── Apertura app Messaggi (clic su ✉) ───────── */
openMsgBtn.onclick = () => {
  contactList.innerHTML = "";

  const activeNames = characters
  .filter(c => ["present", "remote", "pending"].includes(c.status))
  .map(c => c.name);
  const contacts = availableCharacters.filter(
    name => name !== "Narrator" && !activeNames.includes(name)
  );

  if (contacts.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No contacts available";
    li.style.color = "#888";
    li.style.textAlign = "center";
    contactList.appendChild(li);
  } else {
    contacts.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;
      li.onclick = () => openConversation(name);
      contactList.appendChild(li);
    });
  }

  contactList.classList.remove("hidden");
  openMsgBtn.classList.add("hidden");
};

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
  const promptTxt = await (await fetch("texts/phone_prompt.txt")).text();
const systemMsg = promptTxt
  .replace("{{CALLEE}}", currentCallee)
  .replace("{{LORE}}", lore)
  .replace("{{CONTEXT}}", convoContext);

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
  const normalizedTag = `#PRESENT: ${currentCallee}`;
  const hasTag = lines.some(l => l.toUpperCase() === normalizedTag.toUpperCase());
  // Controllo per tag errati tipo "#PRESENT: User" o "#PRESENT: Me"
  const wrongTag = lines.find(l => /^#PRESENT:\s*/i.test(l) && !hasTag);
if (wrongTag) {
  console.warn("⚠️ GPT gave a wrong #PRESENT tag:", wrongTag);
}

if (
  hasTag || 
  /i'll be there|hang tight|on my way|i'm coming|i am coming|see you soon/i.test(reply)
) {
  console.log(`✅ Interpreting as intent to come: ${currentCallee}`);
  callIntents.add(currentCallee);
}
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

function updateHealthUI() {
  const el = document.getElementById("player-health");
  if (el) el.textContent = `❤️ Health: ${player.health}`;
}

function damagePlayer(amount) {
  player.health = Math.max(0, player.health - amount);
  updateHealthUI();
}

window.startGame = startGame;
// expose these for the inline onclicks in index.html
  window.addSelectedCharacter = addSelectedCharacter;
  window.addCustomCharacter   = addCustomCharacter;
  window.toggleMusic          = toggleMusic;
  window.toggleSidebar        = toggleSidebar;
  window.scheduleArrival = scheduleArrival;
