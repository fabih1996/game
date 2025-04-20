 /* main.js */
import {
  characters,
  characterKnowledge,
  currentLocation,
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
  travelTimes,
  updatePlayerUI,
  setCurrentLocation,
  episodeState,
  updateEpisodeState,
  advanceStage
  //,
  //triggerExorcismEvent
  // ... aggiungi qui tutte le altre funzioni da usare in main.js
} from './gameFunctions.js';

// Variabile globale per il giocatore
let player;

const availableCharacters = [
  "Dean", "Sam", "Castiel", "Crowley", "Jo", "Ellen", "Bobby", "Ruby"
];

// Al caricamento del DOM, inizializza il gioco
window.addEventListener("DOMContentLoaded", async () => {

  // Carica il lore dei personaggi da file esterno
  await loadCharacterLore();
  document.getElementById("start-btn").addEventListener("click", startGame); 
  document.getElementById("sidebar").classList.add("open");

    // mostra overlay telefono
  document.getElementById("phone-button").onclick = () => {
    document.getElementById("phone-overlay").classList.remove("hidden");
  };
  // chiude overlay telefono
  document.getElementById("phone-close").onclick = () => {
    document.getElementById("phone-overlay").classList.add("hidden");
  };
  // apre la rubrica dentro l'overlay
  document.getElementById("open-messages").onclick = () => {
    document.getElementById("phone-contact-list").classList.remove("hidden");
  };

  
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
  const lore = characterKnowledge
    .split("---")
    .find(chunk => chunk.startsWith(currentCallee))
    ?.trim() || "";

  const convoContext = convoHistory
    .map(m => m.role === "user"
      ? `You: ${m.content}`
      : `${currentCallee}: ${m.content}`)
    .join("\n");
  // ———————————————————————————————————————————

  console.log("📱 Send clicked; reply incoming for", currentCallee);
  appendMessage("You", txt);
  convoHistory.push({ role: "user", content: txt });

  // Prepara il prompt e fai la call
  const promptTxt = await (await fetch("texts/phone_prompt.txt")).text();
  const systemMsg = promptTxt
    .replace("{{CALLEE}}", currentCallee)
    .replace("{{LORE}}", lore)
    .replace("{{CONTEXT}}", convoContext);

  const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4", messages: [{ role: "system", content: systemMsg }, ...convoHistory] })
  });
  const data = await res.json();
  const reply = data.choices[0].message.content.trim();
  console.log("Reply string:", reply);

  // 1) Split in righe, individua il tag
  const lines = reply.split("\n").map(l => l.trim());
  const hasTag = lines.some(l => /^#PRESENT:/i.test(l));

  // 2) Interpreta intent anche da frasi “on my way”
  if (
    hasTag ||
    /i'll be there|hang tight|on my way|i'm coming|i am coming|see you soon/i.test(reply)
  ) {
    console.log(`✅ Interpreting as intent to come: ${currentCallee}`);
    callIntents.add(currentCallee);
  }

  // 3) Filtra via SOLO le righe #PRESENT e ricomponi
  const kept = lines.filter(l => !/^#PRESENT:/i.test(l));
  let clean = kept.join(" ").trim();

  // 4) Se non resta niente ma c’era intent, fallback
  if (!clean && hasTag) {
    clean = "I'll be right there.";
  }

  // 5) Aggiungi in chat
  if (clean) {
    appendMessage(currentCallee, clean);
    convoHistory.push({ role: "assistant", content: clean });
  }
  phoneInput.value = "";

  // 6) Mantieni l’intent per scheduleArrival
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
  // ─────────── Mini‑map Widget ───────────
const mmWidget   = document.getElementById('mini-map-widget');
const mmCanvas   = document.getElementById('mini-map-canvas');
const mmCtx      = mmCanvas.getContext('2d');
const mmCloseBtn = document.getElementById('mini-map-close');

let mmPoints = [
  { x:  0.6, y: -0.4, label: 'Shop' },
  { x: -0.3, y:  0.7, label: 'Diner' }
];

// Draw the circular mini‑map
function drawMiniMap() {
  const w = mmCanvas.width, h = mmCanvas.height;
  mmCtx.clearRect(0, 0, w, h);

  // Outer circle
  mmCtx.strokeStyle = '#888';
  mmCtx.lineWidth   = 2;
  mmCtx.beginPath();
  mmCtx.arc(w/2, h/2, w/2 - 2, 0, 2 * Math.PI);
  mmCtx.stroke();

  // Points (gold) + You at center (blue)
  mmPoints.concat([{ x:0, y:0, label: 'You' }]).forEach(p => {
    const px = w/2 + p.x * (w/2 - 20);
    const py = h/2 + p.y * (h/2 - 20);
    mmCtx.fillStyle = p.label === 'You' ? '#3399ff' : 'gold';
    mmCtx.beginPath();
    mmCtx.arc(px, py, 6, 0, 2 * Math.PI);
    mmCtx.fill();
    if (p.label !== 'You') {
      mmCtx.fillStyle = '#fff';
      mmCtx.font = '10px sans-serif';
      mmCtx.fillText(p.label, px + 8, py - 8);
    }
  });
}

// Toggle expand/collapse on widget click
mmWidget.addEventListener('click', e => {
  // Do not toggle if click came from the close button or info box
  if (
    e.target === mmCloseBtn || 
    e.target.closest("#location-info-box")
  ) return;

  mmWidget.classList.toggle('expanded');
  drawMiniMap();

  const storyBox = document.getElementById("story");
  storyBox.classList.toggle("with-expanded-map", mmWidget.classList.contains("expanded"));
});

// Close button hides expanded view
mmCloseBtn.addEventListener('click', e => {
  e.stopPropagation();
  mmWidget.classList.remove('expanded');
});

// Initial draw
drawMiniMap();

//mapLocations
 const mapLocations = {
  "Diner": {
    x: -0.3,
    y: 0.7,
    label: "Diner",
    description: "A greasy spoon with strong coffee."
  },
  "Shop": {
    x: 0.6,
    y: -0.4,
    label: "Shop",
    description: "A dusty place filled with hunting gear."
  }
};

 function showLocationInfo(label, description) {
  const infoBox = document.getElementById("location-info-box");
  document.getElementById("location-name").textContent = label;
  document.getElementById("location-description").textContent = description;
  infoBox.classList.remove("hidden");
}

mmCanvas.addEventListener('click', e => {
  if (!mmWidget.classList.contains("expanded")) return;

  const rect = mmCanvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (mmCanvas.width / rect.width);
  const clickY = (e.clientY - rect.top) * (mmCanvas.height / rect.height);

  let clickedOnLocation = false;

  for (let locName in mapLocations) {
    const loc = mapLocations[locName];
    const px = mmCanvas.width / 2 + loc.x * (mmCanvas.width / 2 - 20);
    const py = mmCanvas.height / 2 + loc.y * (mmCanvas.height / 2 - 20);
    const dx = clickX - px;
    const dy = clickY - py;
    console.log(`Clicked: (${clickX.toFixed(1)}, ${clickY.toFixed(1)}), ${loc.label} at (${px.toFixed(1)}, ${py.toFixed(1)}), dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`);
    if (dx * dx + dy * dy < 10 * 10) {
      showLocationInfo(loc.label, loc.description);
      clickedOnLocation = true;
      break;
    }
  }

  if (clickedOnLocation) {
    e.stopPropagation(); // 👈 blocca il click dal chiudere la mappa
  }
});

 // Handle "Go here" button in location-info box
document.getElementById("go-to-location-btn").addEventListener("click", () => {
  const selectedLocation = document.getElementById("location-name").textContent;

  const story = document.getElementById("story");
  story.innerHTML += `<p><strong>You travel to the ${selectedLocation}.</strong></p>`;
  document.getElementById("location-info-box").classList.add("hidden");

  setCurrentLocation(selectedLocation);  // ✅ solo questa chiamata è sufficiente
});

document.getElementById("close-location-info").addEventListener("click", e => {
  e.stopPropagation(); // prevent map toggle
  document.getElementById("location-info-box").classList.add("hidden");
});
 
// ─────────────────────────────────────────

});

// 🔧 Funzione per aggiornare salute del player
function updateHealthUI() {
  const bar = document.getElementById("player-health-bar");
  const label = document.getElementById("player-health-label");

  if (bar && label) {
    const percent = player.health;
    bar.style.width = percent + "%";
    label.textContent = `${percent}`;
  }
}

// 🔧 Funzione per danneggiare il player
function damagePlayer(amount) {
  if (!player) return;
  player.health = Math.max(0, player.health - amount);
  updateHealthUI();
}

window.startGame = startGame;
// expose these for the inline onclicks in index.html
  window.toggleMusic          = toggleMusic;
  window.toggleSidebar        = toggleSidebar;
  window.scheduleArrival = scheduleArrival;
