// ---------------------------
// Variabili globali di gioco
// ---------------------------
export let characters = [
  { name: "Narrator", status: "present" }  // status: "present", "remote", "pending"
];
let selectedCharacters = ["Narrator"];
let pendingArrival = new Set();
const newCharacters = new Set();
export let characterKnowledge = "";

// Variabile player (verrà impostata tramite setPlayer da main.js)
let player;
export function setPlayer(p) {
  player = p;
}

// ---------------------------
// Azioni rapide e NPC disponibili
// ---------------------------
const allAvailableCharacters = [
  "Dean", "Sam", "Castiel", "Crowley", "Bobby", "Ruby", "Jo", "Ellen", "Other..."
];
const arrivalNPCs = allAvailableCharacters.filter(n => n !== "Other...");

// ---------------------------
// Tempi di viaggio e messaggi
// ---------------------------
export const travelTimes = {
  Dean:    30000,
  Sam:     40000,
  Castiel: 5000,
  Crowley: 7000,
  Bobby:   45000,
  Ruby:    35000,
  Jo:      30000,
  Ellen:   45000
};
const arrivalMessages = {
  Dean:    "You hear the Impala roaring in the distance—Dean is on his way…",
  Sam:     "Sam is sprinting toward you—he’ll be there soon…",
  Castiel: "A flutter of wings ripples through the air—Castiel is about to manifest…",
  Crowley: "You smell sulfur—Crowley is about to appear…"
};

export let storyPhase = "intro";

export function setStoryPhase(newPhase) {
  console.log(`📖 Story phase changed to: ${newPhase}`);
  storyPhase = newPhase;
}

const arrivalETA = {};
const arrivalDuration = {};

// ---------------------------
// Anello di progresso
// ---------------------------
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll(".char-wrapper.pending").forEach(wrap => {
    const name = wrap.querySelector(".char-icon").dataset.name;
    const eta  = arrivalETA[name];
    const dur  = arrivalDuration[name] || 1;
    const pct  = Math.max(0, Math.min(100, 100 - ((eta - now) / dur) * 100));
    wrap.style.setProperty("--prog", pct + "%");
    if (now >= eta) wrap.classList.remove("pending");
  });
}, 1000);

// ---------------------------
// Colori e immagini NPC
// ---------------------------
const characterColors = {
  Dean: "#FFD700", Sam: "#00BFFF", Castiel: "#7FFFD4", Crowley: "#FF4500",
  Bobby: "#90EE90", Ruby: "#FF69B4", Jo: "#FF8C00", Ellen: "#8A2BE2",
  Narrator: "#dddddd", User: "#3399ff", default: "#cccccc"
};
const characterImages = {};

// ---------------------------
// Gestione luogo
// ---------------------------

export let currentLocation = "Nowhere";

export function setCurrentLocation(locName) {
  currentLocation = locName;
  console.log(`📍 Current location set to: ${locName}`);

  if (storyPhase === "intro") {
    setStoryPhase("investigation");
  }
}

// ---------------------------
// Caricamento iniziale
// ---------------------------
export async function loadCharacterLore() {
  try {
    const res = await fetch("texts/supernatural_character_profiles.txt");
    characterKnowledge = await res.text();
  } catch {
    characterKnowledge = "";
  }
}

export async function loadIntro() {
  try {
    // 1) Carica il template del prompt
    let prompt = await (await fetch("texts/supernatural_prompt.txt")).text();
    prompt = prompt
      .replace("{{CHARACTER_LORE}}", characterKnowledge)
      .replace("{{STORY_CONTEXT}}", "")
      .replace("{{INPUT}}", "")
      .replace("{{LOCATION}}", currentLocation)
      .replace("{{STORY_PHASE}}", storyPhase)
      .replace("{{CHARACTERS}}", "");

    // 2) Chiamata al server AI
    const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4", messages: [{ role: "user", content: prompt }] })
    });
    const data  = await res.json();
    const reply = data.choices[0].message.content.trim();

    // 3) Parsing di #PRESENT: per tag manuali
    Array.from(reply.matchAll(/^#PRESENT:\s*(.+)$/gm))
      .map(m => m[1])
      .forEach(name => {
        if (!characters.some(c => c.name === name)) {
          characters.push({ name, status: "present" });
          selectedCharacters.push(name);
          newCharacters.add(name);
        }
      });
    // 4) Render della narrazione (ripulita da vuoti, separatori e tag)
    const storyDiv = document.getElementById("story");
    storyDiv.innerHTML = "";
    reply
      .split("\n")                // spezza in righe
      .map(l => l.trim())         // togli spazi
      .filter(line =>
        line &&                    // non vuota
        !line.startsWith("#PRESENT:") &&
        !line.startsWith("[") &&
        !/^[-–—]{3,}$/.test(line)  // non '---' o simili
      )
      .forEach(line => {
        const m = line.match(/^([A-Z][a-zA-Z]+):\s*["“]?(.+?)["”]?$/);
        const p = document.createElement("p");
      
        if (m) {
          const name = m[1];
          const cleanText = m[2];
          const safeClass = `character-color-${name.replace(/\s+/g, "")}`;
          p.classList.add(safeClass);
          p.classList.add("glow-talk"); // facoltativo: glow anche nell’intro
          p.textContent = `${name}: "${cleanText}"`;
          storyDiv.appendChild(p);
          setTimeout(() => p.classList.remove("glow-talk"), 2000);
        } else {
          p.classList.add("narration");
          p.textContent = line;
          storyDiv.appendChild(p);
        }
      });
        // 4b) Scansione del testo per menzioni di NPC e auto‑aggiunta in “present”
    const introText = storyDiv.textContent;
    allAvailableCharacters.forEach(name => {
      if (
        introText.includes(name) &&                                  // nome menzionato
        !characters.some(c => c.name === name)                       // non già presente
      ) {
        characters.push({ name, status: "present" });
        selectedCharacters.push(name);
      }
    });

    // 5) Se ci sono nuovi personaggi, aggiorna subito la sidebar
    refreshSidebar();

    // 7) Auto‑aggiungi come “present” chi appare in dialogo
    reply.split("\n").forEach(line => {
      const m = line.match(/^([A-Z][a-zA-Z]+):/);
      if (m) {
        const speaker = m[1];
        if (
          ["Dean","Sam","Castiel","Crowley","Bobby","Ruby","Jo","Ellen"]
            .includes(speaker) &&
          !characters.some(c => c.name === speaker)
        ) {
          characters.push({ name: speaker, status: "present" });
          selectedCharacters.push(speaker);
        }
      }
    });

    // 8) Refresh finale della sidebar
    refreshSidebar();

  } catch (err) {
    console.error(err);
    // Fallback narrativo in caso di errore
    document.getElementById("story").innerHTML =
      `<p class="narration">The bunker is quiet… maybe too quiet.</p>`;
    refreshSidebar();
  }
}

// ---------------------------
// Sidebar & Interfaccia
// ---------------------------
export function refreshSidebar() {
  const presentList = document.getElementById("charListPresent");
  presentList.innerHTML = "";

  characters
    .filter(c => c.name !== "Narrator")   // non mostrare più il Narrator
    .forEach(({ name, status }) => {
      const li = document.createElement("li");
      const wrapper = document.createElement("div");
      wrapper.className = "char-wrapper";
      wrapper.dataset.name = name;
      wrapper.style.setProperty(
        "--ring-color",
        characterColors[name] || characterColors.default
      );
      wrapper.style.color = characterColors[name] || characterColors.default;
      if (status === "pending"){
        wrapper.classList.add("pending");
        wrapper.style.setProperty("--prog", "0%");  // inizializza l’anello
      }
      // Aggiunta del pulsante ❌
      const dismissBtn = document.createElement("div");
      dismissBtn.className = "dismiss-btn";
      dismissBtn.textContent = "❌";
      dismissBtn.onclick = (e) => {
        e.stopPropagation();
        dismissCharacter(name);
      };
      wrapper.appendChild(dismissBtn);
      
      // Icona
      const img = document.createElement("img");
      img.classList.add("char-icon");
      img.dataset.name = name;
      img.src = characterImages[name] ||
                (characterImages[name] = `images/${name.toLowerCase()}.png`);
      img.alt = name;
      wrapper.setAttribute("data-tooltip", name);
      if (selectedCharacters.includes(name)){
        img.classList.add("selected");
        wrapper.classList.add("selected");
      } 

      // Click sull’icona per selezionare/deselezionare
     img.onclick = (e) => {
      e.stopPropagation();          // ← impedisce al click di “risalire” al wrapper
      if (selectedCharacters.includes(name))
        selectedCharacters = selectedCharacters.filter(n => n !== name);
      else
        selectedCharacters.push(name);
      refreshSidebar();
    };

      wrapper.appendChild(img);
      li.appendChild(wrapper);
      presentList.appendChild(li);
    });
}

// ---------------------------
// Aggiungi/Rimuovi NPC
// ---------------------------
export function addCustomCharacter() {
  const name = document.getElementById("customCharName").value.trim();
  const status = document.getElementById("customCharStatus").value;
  if (!name || characters.some(c => c.name === name)) return;
  characters.push({ name, status });
  if (status === "present") selectedCharacters.push(name);
  refreshSidebar();
  loadDropdown();
  document.getElementById("customCharName").value = "";
  document.getElementById("customCharDesc").value = "";
  document.getElementById("customCharStatus").value = "present";
  document.getElementById("customCharFields").style.display = "none";
}

export function addSelectedCharacter() {
  const dropdown = document.getElementById("charDropdown");
  const name = dropdown.value;
  if (name && name !== "Other..." && !characters.some(c => c.name === name)) {
    characters.push({ name, status: "present" });
    selectedCharacters.push(name);
    refreshSidebar();
    dropdown.value = "";
  }
}
// ---------------------------
// Helper NPC
// ---------------------------
function characterExists(name) {
  return characters.some(c => c.name === name);
}

function removeCharacter(name) {
  characters = characters.filter(c => c.name !== name);
  selectedCharacters = selectedCharacters.filter(n => n !== name);
  newCharacters.delete(name);
  refreshSidebar();
}

// ---------------------------
// GPT4 in detecting story
// ---------------------------

export async function detectStoryPhase(context, latestReply) {
  const prompt = `
Given the following recent story context and GPT reply, decide what phase the story should be in.

PHASES:
- intro: the player is just starting and getting oriented
- investigation: the player explores, gathers clues or talks to locals
- discovery: the enemy or major supernatural force is uncovered
- preparation: the player prepares for confrontation
- battle: a major confrontation occurs
- epilogue: aftermath and closure

CONTEXT:
${context}

REPLY:
${latestReply}

Only reply with the phase keyword: intro, investigation, discovery, preparation, battle, or epilogue. Do not add any other text.
`.trim();

  const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: prompt }
      ]
    })
  });

  const data = await res.json();
  const raw = data.choices[0]?.message?.content?.trim().toLowerCase();

  if (["intro", "investigation", "discovery", "preparation", "battle", "epilogue"].includes(raw)) {
    setStoryPhase(raw);
    console.log("📘 Phase set via GPT:", raw);
  } else {
    console.warn("⚠️ Unrecognized story phase reply:", raw);
  }
}


// ---------------------------
// sendToGPT: costruzione prompt, telefonate, arrivi
// ---------------------------
export async function sendToGPT(message, type = "dialogue", isRandom = false) {
  newCharacters.clear();
  const input = message.trim();
  if (!input) return;


  // 3) Aggiungi input del player alla storia
  const storyDiv = document.getElementById("story");
  const playerMsg = document.createElement("p");
  playerMsg.className = (type === "dialogue" ? "character-color-User" : "narration");
  playerMsg.textContent = `${player.name}: "${input}"`;
  storyDiv.appendChild(playerMsg);

  // 4) Costruisci prompt
  const speakerNames = characters
    .filter(c => c.status === "present" && selectedCharacters.includes(c.name))
    .map(c => c.name);
  if (!speakerNames.includes(player.name)) speakerNames.push(player.name);

  const contextLines = Array.from(storyDiv.querySelectorAll("p"))
    .slice(-20).map(p => p.textContent).join("\n");

  // Costruisco un prompt semplificato per i dialoghi, in modo che non ripetano il contesto
  let prompt;
  if (type === "dialogue") {
    prompt = [
      `Scene context (last 20 rows):\n${contextLines}`,
      `Current location: ${currentLocation}`
      `Player (${player.name}) dice: "${input}"`,
      `NOW: Reply only with new jokes of the characters present (${speakerNames.join(", ")}), ` +
        `formatted exactly as CharacterName: "Text". ` +
        `Never repeat sentences already present in the context, do not add narration or choices.`
    ].join("\n\n");
  } else {
    // per narrazione e RandomEvent puoi usare ancora il template originale
    prompt = await (await fetch("texts/supernatural_prompt.txt")).text();
    prompt = prompt
      .replace("{{PLAYER_NAME}}", player.name)
      .replace("{{STORY_CONTEXT}}", contextLines)
      .replace("{{INPUT}}", input)
      .replace("{{CHARACTERS}}", speakerNames.join(" and "))
      .replace("{{LOCATION}}", currentLocation);
    
    if (isRandom) prompt += "\nThe player triggers a sudden supernatural event...";
    else if (type === "narration")
      prompt += `\nThe player narrates an action: "${input}"\nDescribe what happens next.`;
    else
      prompt += `\nThe player speaks: "${input}". Make sure characters respond in character.`;
  }

  const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  const reply = data.choices[0].message.content.trim();

  // 👁️ Rileva personaggi presenti anche se non taggati
  allavailableCharacters.forEach(name => {
    const lowerName = name.toLowerCase();
    const alreadyListed = characters.some(c => c.name === name);
    const speaks = new RegExp(`^${name}:`, "m").test(reply); // parla chiaramente
    const mentionedNarratively = lowerReply.includes(`${lowerName} `) || lowerReply.includes(`${lowerName}'`);
    if ((speaks || mentionedNarratively) && !alreadyListed) {
      characters.push({ name, status: "present" });
      selectedCharacters.push(name);
      console.log(`✨ ${name} added as present from narrative or speech`);
    }
  });
  refreshSidebar();

  // Trigger story phase detection (async, but we don't block)
  detectStoryPhase(contextLines, reply).catch(err =>
  console.warn("⚠️ GPT phase detection failed:", err)
  );


  // 6) Processa #PRESENT, #LEAVE, dialoghi, narrazione
  const validTags = ["#PRESENT:", "#LEAVE:"];
  const lines = reply.split("\n")
    .map(l => l.trim())
    .filter(l =>
      l && !l.startsWith("[") && l !== "Options:" &&
      (l[0] !== "#" || validTags.some(t => l.startsWith(t)))
    );

  // ------------------------------
// Filtro: rifiuto implicito → ignora #PRESENT
// ------------------------------
const lowerReply = reply.toLowerCase();
const rejectedTags = new Set();
lines.forEach(line => {
  if (line.startsWith("#PRESENT:")) {
    const name = line.split(":")[1].trim();
    if (rejectedTags.has(name)) return; // ignora
    if (
      lowerReply.includes("can't make it") ||
      lowerReply.includes("can't join") ||
      lowerReply.includes("not right now") ||
      lowerReply.includes("maybe another time") ||
      lowerReply.includes("i'm sorry") && lowerReply.includes("can't") ||
      lowerReply.includes("have some urgent matters") ||
      lowerReply.includes("really can't") ||
      lowerReply.includes("i understand it's urgent")
    ) {
      console.log(`❌ Ignored #PRESENT for ${name} due to contradiction`);
      rejectedTags.add(name);
    }
  }
});

  // 6b) Append narrazione pulita e dialoghi
  lines
    .map(l => l.trim())
    .filter(line =>
      line &&                       // non vuota
      !line.startsWith("[") &&      // non scelta
      !/^[-–—]{3,}$/.test(line) &&   // non separatore
      !/^#/.test(line)              // non tag (#PRESENT,/LEAVE)
    )
    .forEach(line => {
      if (/^[A-Z][a-zA-Z\s'-]+:/.test(line)) {
        const [name, ...rest] = line.split(":");

        if (!characters.some(c => c.name === name)) {
          characters.push({ name, status: "present" });
          refreshSidebar(); // aggiorna la sidebar con l’aggiunta
        }
        
        if (!selectedCharacters.includes(name)) {
          selectedCharacters.push(name); // ora può rispondere
        }
        // Se è una battuta del player, la saltiamo (vedi punto 2)
        if (name === "Narrator" || name === player.name) return;  // salta Narratore e Player
      
        const rawText   = rest.join(":").trim();
        const cleanText = rawText.replace(/^"+|"+$/g, "");  // rimuove eventuali virgolette esterne
        const p = document.createElement("p");
        
        function safeClass(name) {
          return `character-color-${name.replace(/\s+/g, "")}`;
        }
          p.classList.add(safeClass(name));  
          p.classList.add("glow-talk"); // ← AGGIUNGI QUESTO
          p.textContent = `${name}: "${cleanText}"`;
          storyDiv.appendChild(p);
          setTimeout(() => p.classList.remove("glow-talk"), 2000); // opzionale
      } else {
        // narrazione
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = line;
        storyDiv.appendChild(p);
      }
    });
  
  if (newCharacters.size) refreshSidebar();
}

// ---------------------------
// Audio e helper vari
// ---------------------------
export function triggerSounds(text) {
  const lower = text.toLowerCase();
  const triggers = [
    { id: 'sound-door', patterns: [/knock/, /door/, /opens/] },
    { id: 'sound-gunshot', patterns: [/gunshot/, /shoot/] },
    { id: 'sound-scream', patterns: [/scream/, /shout/] },
    { id: 'sound-demon', patterns: [/demon/, /growl/] },
    { id: 'sound-whisper', patterns: [/whisper/, /ghost/] },
    { id: 'sound-impala', patterns: [/impala/, /engine/, /roar/] },
    { id: 'sound-arrival', patterns: [/phone/, /call/, /dial/] }
  ];
  for (const { id, patterns } of triggers) {
    if (patterns.some(rx => rx.test(lower))) {
      const a = document.getElementById(id);
      if (a) { a.pause(); a.currentTime = 0; a.volume = 0.8; a.play(); }
      break;
    }
  }
  if (text === "character_arrived") {
    const a = document.getElementById("sound-arrival");
    if (a) { a.pause(); a.currentTime = 0; a.volume = 0.8; a.play(); }
  }
}

export function isContextuallyAppropriate(line, context) {
  const lowL = line.toLowerCase(), lowC = context.toLowerCase();
  if (/forest|woods|outdoors/.test(lowC) && /room|inside|hall/.test(lowL))
    return false;
  return true;
}

 export function scheduleArrival(characterName, delay) {
   // 1) Imposta subito lo stato a "pending" e mostralo in sidebar
   const char = characters.find(c => c.name === characterName);
   if (char) {
     char.status = "pending";
     pendingArrival.add(characterName);
     refreshSidebar();

   // ⇒ appena lo rendiamo pending, inizializziamo "--prog" a 0%
    const wrapperEl = document.querySelector(`.char-wrapper[data-name="${characterName}"]`);
    if (wrapperEl) {
      wrapperEl.style.setProperty("--prog", "0%");
    }
   }

   // 2) Registra ETA e durata per il ring
   arrivalETA[characterName]      = Date.now() + delay;
   arrivalDuration[characterName] = delay;

   // 3) Dopo il delay, rendilo "present"
   setTimeout(() => {
     const c = characters.find(c => c.name === characterName);
     if (c && c.status !== "present") {
       c.status = "present";
       pendingArrival.delete(characterName);
       delete arrivalETA[characterName];
       delete arrivalDuration[characterName];
       refreshSidebar();

       // Aggiungi la linea in chat
       const storyDiv = document.getElementById("story");
       const p = document.createElement("p");
       p.classList.add("narration");
       p.textContent = `${characterName} has arrived.`;
       storyDiv.appendChild(p);
       triggerSounds("character_arrived");
     }
   }, delay);
 }

export async function dismissCharacter(name) {
  const storyDiv = document.getElementById("story");
  // Prendi le ultime 6 righe di storia come contesto
  const recentStory = Array.from(storyDiv.querySelectorAll("p"))
    .slice(-6)
    .map(p => p.textContent)
    .join("\n");

  // Costruisci il prompt per far uscire il personaggio in modo coerente
  const prompt = `
You are writing the next line in a Supernatural role-playing game.
The character "${name}" is currently present.
The player wants to dismiss this character in a way that fits the context.

CONTEXT:
${recentStory}

INSTRUCTION:
Output the next lines of dialogue or narration to dismiss ${name}, 
preceded by either:
  • #LEAVE: ${name}  (to remove them)
  • #PRESENT: <Name> if for qualche motivo torna
Nothing else.
`;

  try {
    const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data  = await response.json();
    const reply = data.choices[0].message.content.trim();
    const lines = reply.split("\n").filter(l => l.trim() !== "");

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#PRESENT:")) {
        // Rientra un NPC (se serve)
        const nm = trimmed.replace("#PRESENT:", "").trim();
        const existing = characters.find(c => c.name === nm);
        if (existing) existing.status = "present";
        else {
          characters.push({ name: nm, status: "present" });
          selectedCharacters.push(nm);
        }
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = `${nm} has arrived.`;
        storyDiv.appendChild(p);
        refreshSidebar();
      }
      else if (trimmed.startsWith("#LEAVE:")) {
        // Rimuovi l’NPC
        const nm = trimmed.replace("#LEAVE:", "").trim();
        removeCharacter(nm);
      }
      else if (/^[A-Z][a-zA-Z\s'-]+:/.test(trimmed)) {
        // Dialogo normalizzato
        const [speaker, ...rest] = trimmed.split(":");
        let text = rest.join(":").trim().replace(/^"+|"+$/g, "");
        const p = document.createElement("p");
        p.className = `character-color-${speaker}`;
        p.textContent = `${speaker}: "${text}"`;
        storyDiv.appendChild(p);
      }
      else {
        // Narrazione
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = trimmed;
        storyDiv.appendChild(p);
      }
    });

    refreshSidebar();
  } catch (err) {
    console.error("Failed to dismiss character:", err);
    alert("Failed to dismiss character: " + err.message);
  }
}

export function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
export function toggleMusic() {
  const bgm = document.getElementById("background-music");
  if (bgm.paused) bgm.play().catch(()=>{});
  else bgm.pause();
}
export function triggerExorcismEvent() {
  const o = document.getElementById('exorcism-overlay'),
        g = document.getElementById('ghost'),
        c = document.getElementById('chant');
  o.classList.remove('hidden');
  g.style.opacity = '1'; g.style.transform = 'translateY(0)';
  c.textContent = '"Exorcizamus te, omnis immundus spiritus..."'; c.style.opacity = '1';
  setTimeout(()=>{ g.style.opacity='0'; g.style.transform='translateY(-150px)'; }, 500);
  setTimeout(()=>{ c.textContent = '"Spiritus expulsus est!"'; }, 3500);
  setTimeout(()=>{ o.classList.add('hidden'); }, 5500);
}

export function startGame() {
  console.log("✅ startGame called");
  const name = document.getElementById("playerName").value.trim();
  const age = document.getElementById("playerAge").value.trim();
  const desc = document.getElementById("playerDesc").value.trim();
  const hungerBar = document.getElementById("player-hunger-bar");
  const thirstBar = document.getElementById("player-thirst-bar");
  console.log("Name:", name, "Age:", age, "Desc:", desc);

  if (!name || !age || !desc) {
    alert("Please fill in all fields to start the game.");
    return;
  }

  player = {
    name,
    age,
    desc,
    isCustom: true,
    color: "#3399ff",
    health: 100
  };
  setPlayer(player);

  updatePlayerUI(player);

  // Mostra la sezione player
  document.getElementById("player-section").classList.remove("hidden");

  // Nascondi la selezione iniziale e mostra il gioco
  document.getElementById("user-character-select").style.display = "none";
  document.getElementById("game-interface").style.display = "block";

  loadIntro();
}

export function updatePlayerUI(player) {
  const nameEl  = document.getElementById("player-name-display");
  const ageEl   = document.getElementById("player-age-display");
  const descEl  = document.getElementById("player-desc-display");
  const healthBar = document.getElementById("player-health-bar");
  const healthLabel = document.getElementById("player-health-label");

  if (nameEl) nameEl.textContent = `🧍 Name: ${player.name}`;
  if (ageEl) ageEl.textContent = `🎂 Age: ${player.age}`;
  if (descEl) descEl.textContent = `📝 ${player.desc}`;
  if (healthBar) healthBar.style.width = player.health + "%";
  if (healthLabel) healthLabel.textContent = `❤️ Health: ${player.health}`;
}

// ───────────── Episodic Story Structure ─────────────
export const episodeState = {
  episodeStage: "intro",          // intro → investigation → discovery → prep → showdown → epilogue
  cluesFound: 0,
  enemyIdentified: false,
  ritualFound: false,
  possessedVictim: null,
  finalBoss: null,
  victory: null
};

export function updateEpisodeState(key, value) {
  if (episodeState.hasOwnProperty(key)) {
    episodeState[key] = value;
    console.log(`🧩 Episode state updated: ${key} = ${value}`);
  }
}

export function advanceStage() {
  const sequence = ["intro", "investigation", "discovery", "prep", "showdown", "epilogue"];
  const currentIndex = sequence.indexOf(episodeState.episodeStage);
  if (currentIndex < sequence.length - 1) {
    episodeState.episodeStage = sequence[currentIndex + 1];
    console.log(`⏩ Episode stage advanced to: ${episodeState.episodeStage}`);
  }
}


