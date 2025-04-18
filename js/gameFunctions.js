// ---------------------------
// Variabili globali di gioco
// ---------------------------
let characters = [
  { name: "Narrator", status: "present" }  // status: "present", "remote", "pending"
];
let selectedCharacters = ["Narrator"];
let pendingArrival = new Set();
const newCharacters = new Set();
let characterKnowledge = "";

// Variabile player (verrà impostata tramite setPlayer da main.js)
let player;
export function setPlayer(p) {
  player = p;
}

// ---------------------------
// Azioni rapide e NPC disponibili
// ---------------------------
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
const allAvailableCharacters = [
  "Dean", "Sam", "Castiel", "Crowley", "Bobby", "Ruby", "Jo", "Ellen", "Other..."
];
const arrivalNPCs = allAvailableCharacters.filter(n => n !== "Other...");

// ---------------------------
// Tempi di viaggio e messaggi
// ---------------------------
const travelTimes = {
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

    // 4) Render della narrazione (escludendo tag e scelte)
    const storyDiv = document.getElementById("story");
    storyDiv.innerHTML = "";
    reply.split("\n").forEach(line => {
      if (!line.startsWith("#PRESENT:") && !line.startsWith("[")) {
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = line.trim();
        storyDiv.appendChild(p);
      }
    });

    // 5) Se ci sono nuovi personaggi, aggiorna subito la sidebar
    if (newCharacters.size) refreshSidebar();

    // 6) Crea i pulsanti delle prime scelte
    const choicesDiv = document.getElementById("choices");
    choicesDiv.innerHTML = "";
    reply.split("\n")
      .filter(l => l.trim().startsWith("["))
      .forEach(br => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = br.replace(/^\[|\]$/g, "");
        btn.onclick = () => sendToGPT(btn.textContent, "narration");
        choicesDiv.appendChild(btn);
      });

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
    if (newCharacters.size) refreshSidebar();

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
  // Remotely Contacted
  const remoteList = document.getElementById("charListRemote");
  if (remoteList) {
    remoteList.innerHTML = "";
    characters.filter(c => c.status === "remote")
      .forEach(c => {
        const li = document.createElement("li");
        li.textContent = c.name;
        li.style.opacity = 0.6;
        remoteList.appendChild(li);
      });
  }

  // Present & Pending
  const presentList = document.getElementById("charListPresent");
  presentList.innerHTML = "";
  characters
    .filter(c => c.status !== "remote")
    .filter(({ name }) =>
      Object.keys(characterColors).some(kn => name.toLowerCase().includes(kn.toLowerCase())) ||
      name === player.name
    )
    .forEach(({ name, status }) => {
      const li = document.createElement("li");
      const wrapper = document.createElement("div");
      wrapper.className = "char-wrapper";
      wrapper.style.setProperty(
        "--ring-color",
        characterColors[name] || characterColors.default
      );
      if (status === "pending") wrapper.classList.add("pending");

      const img = document.createElement("img");
      img.classList.add("char-icon");
      img.dataset.name = name;
      img.src = characterImages[name] ||
                (characterImages[name] = `images/${name.toLowerCase()}.png`);
      img.alt = name;
      if (selectedCharacters.includes(name)) img.classList.add("selected");

      const dismissBtn = document.createElement("button");
      dismissBtn.textContent = "Dismiss";
      dismissBtn.className = "dismiss-btn";
      dismissBtn.onclick = () => dismissCharacter(name);

      img.onclick = () => {
        if (selectedCharacters.includes(name))
          selectedCharacters = selectedCharacters.filter(n => n !== name);
        else
          selectedCharacters.push(name);
        refreshSidebar();
      };

      wrapper.appendChild(img);
      wrapper.appendChild(dismissBtn);
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

export function loadDropdown() {
  const dropdown = document.getElementById("charDropdown");
  dropdown.innerHTML = `<option value="">-- Select character --</option>`;
  allAvailableCharacters.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    dropdown.appendChild(opt);
  });
  dropdown.onchange = () => {
    document.getElementById("customCharFields").style.display =
      dropdown.value === "Other..." ? "block" : "none";
  };
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
// Azioni rapide
// ---------------------------
export function setupActions() {
  const container = document.getElementById("actions-container");
  container.innerHTML = "";
  quickActions.forEach(action => {
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = action;
    btn.onclick = () => sendToGPT(action, "narration");
    container.appendChild(btn);
  });
}

// ---------------------------
// sendToGPT: costruzione prompt, telefonate, arrivi
// ---------------------------
export async function sendToGPT(message, type = "dialogue", isRandom = false) {
  newCharacters.clear();
  const input = message.trim();
  if (!input) return;

  // 1) Rileva “call X”
  const callMatch = input.match(/\bcall\s+([A-Za-z]+)\b/i);
  if (callMatch) {
    const callee = callMatch[1][0].toUpperCase() + callMatch[1].slice(1);
    if (!characters.some(c => c.name === callee))
      characters.push({ name: callee, status: "remote" });
    else
      characters.find(c => c.name === callee).status = "remote";
    refreshSidebar();
  }

  // 2) “wait for X” se pending
  arrivalNPCs.forEach(name => {
    const waitRe = new RegExp(`\\bwait (?:for )?${name}\\b`, "i");
    if (waitRe.test(input) && pendingArrival.has(name)) {
      pendingArrival.delete(name);
      scheduleArrival(name, 0);
    }
  });

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
    .slice(-6).map(p => p.textContent).join("\n");

  let prompt = await (await fetch("texts/supernatural_prompt.txt")).text();
  prompt = prompt
    .replace("{{PLAYER_NAME}}", player.name)
    .replace("{{STORY_CONTEXT}}", contextLines)
    .replace("{{INPUT}}", input)
    .replace("{{CHARACTERS}}", speakerNames.join(" and "));
  if (isRandom) prompt += "\nThe player triggers a sudden supernatural event...";
  else if (type === "narration")
    prompt += `\nThe player narrates an action: "${input}"\nDescribe what happens next.`;
  else
    prompt += `\nThe player speaks: "${input}". Make sure characters respond in character.`;

  const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  const reply = data.choices[0].message.content.trim();

  // 5) remote → pending via “on my way”, “rush”, “runs”
  arrivalNPCs.forEach(name => {
    const arrivalRe = new RegExp(
      `\\b${name}\\b.*\\b(on my way|rush(?:es|ing)?|runs?)\\b`, "i"
    );
    const char = characters.find(c => c.name === name);
    if (arrivalRe.test(reply) && char && char.status === "remote") {
      char.status = "pending";
      pendingArrival.add(name);
      scheduleArrival(name, travelTimes[name] || 30000);
      const p = document.createElement("p");
      p.classList.add("narration");
      p.textContent = arrivalMessages[name] || `${name} is arriving…`;
      storyDiv.appendChild(p);
      refreshSidebar();
    }
  });

  // 6) Processa #PRESENT, #LEAVE, dialoghi, narrazione
  const validTags = ["#PRESENT:", "#LEAVE:"];
  const lines = reply.split("\n")
    .map(l => l.trim())
    .filter(l =>
      l && !l.startsWith("[") && l !== "Options:" &&
      (l[0] !== "#" || validTags.some(t => l.startsWith(t)))
    );

  // 6a) Schermo scelte
  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";
  reply.split("\n").forEach(raw => {
    const t = raw.trim();
    if (t.startsWith("[")) {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = t.replace(/^\[|\]$/g, "");
      btn.onclick = () => sendToGPT(btn.textContent, "narration");
      choicesDiv.appendChild(btn);
    }
  });

  // 6b) Append lines
  lines.forEach(line => {
    if (/^#PRESENT:\s*(.+)$/.test(line)) {
      const name = line.replace(/^#PRESENT:\s*/, "").trim();
      const existing = characters.find(c => c.name === name);
      if (existing) existing.status = "present";
      else characters.push({ name, status: "present" });
      if (!selectedCharacters.includes(name)) selectedCharacters.push(name);
      const p = document.createElement("p");
      p.classList.add("narration");
      p.textContent = `${name} has arrived.`;
      storyDiv.appendChild(p);
      pendingArrival.delete(name);
      refreshSidebar();

    } else if (/^#LEAVE:\s*(.+)$/.test(line)) {
      removeCharacter(line.replace(/^#LEAVE:\s*/, "").trim());

    } else if (/^[A-Z][a-zA-Z\s'-]+:/.test(line)) {
      const [name, ...rest] = line.split(":");
      let dlg = rest.join(":").trim().replace(/^"+|"+$/g, "");
      const p = document.createElement("p");
      p.className = `character-color-${name}`;
      p.textContent = `${name}: "${dlg}"`;
      storyDiv.appendChild(p);

    } else {
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
  arrivalETA[characterName]    = Date.now() + delay;
  arrivalDuration[characterName] = delay;
  setTimeout(() => {
    const char = characters.find(c => c.name === characterName);
    if (char && char.status !== "present") {
      char.status = "present";
      delete arrivalETA[characterName];
      delete arrivalDuration[characterName];
      refreshSidebar();
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

export function triggerRandomEvent() {
  sendToGPT("random", "narration", true);
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
  const sel = document.getElementById("playerSelect").value;
  if (sel === "custom") {
    const name = document.getElementById("playerName").value.trim();
    if (name) player.name = name;
    player.isCustom = true;
  } else if (sel) {
    player.name = sel;
    player.isCustom = false;
  }
  document.getElementById("user-character-select").style.display = "none";
  document.getElementById("game-interface").style.display = "block";
  refreshSidebar();
  loadIntro();
}
