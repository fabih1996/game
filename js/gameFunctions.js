 
 // ---------------------------
 // Variabili globali di gioco
 // ---------------------------
 let characters = [
  { name: "Narrator", status: "present" }  // status: "present" (ora non usiamo "remote")
];
let selectedCharacters = ["Narrator"];
let pendingArrival = new Set();
const newCharacters = new Set();
let characterKnowledge = "";

// Variabile player (verrà impostata tramite setPlayer da main.js)
let player;
function setPlayer(p) {
  player = p;
}

// Impostazioni predefinite per azioni e intros
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

// Tempo di viaggio (ms) per ciascun NPC  – regolali a piacere
const travelTimes = {
  Dean: 30000,
  Sam: 40000,
  Castiel: 5000,   // teleport!
  Crowley: 7000,
  Bobby: 45000,
  Ruby: 35000,
  Jo: 30000,
  Ellen: 45000
};

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
const characterImages = {}; // Per memorizzare l’immagine associata ad ogni personaggio

// ------------------------------
// Funzioni di caricamento iniziale
// ------------------------------

/**
 * Carica il lore dei personaggi da un file esterno.
 */
async function loadCharacterLore() {
  try {
    const response = await fetch("texts/supernatural_character_profiles.txt");
    characterKnowledge = await response.text();
    console.log("Character lore loaded.");
  } catch (err) {
    console.error("Failed to load character lore:", err);
    characterKnowledge = "";
  }
}

/**
 * Carica una introduzione casuale e la visualizza nell'area della storia.
 */
async function loadIntro() {
  // 1) Pull in the full prompt template
  let prompt = await (await fetch("texts/supernatural_prompt.txt")).text();
  // 2) Fill in the bits we know (no prior story, empty INPUT, no CHARACTERS yet)
  prompt = prompt
    .replace("{{CHARACTER_LORE}}", characterKnowledge)
    .replace("{{STORY_CONTEXT}}", "")
    .replace("{{INPUT}}", "")
    .replace("{{CHARACTERS}}", "");

  // 3) Ask GPT-4 for a Random Event / opening scene
  const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const reply = data.choices[0].message.content.trim();

  // 4) Parse any #PRESENT: tags so we know who shows up
  const presentNames = Array.from(reply.matchAll(/^#PRESENT:\s*(.+)$/gm))
                            .map(m => m[1]);
  presentNames.forEach(name => {
    if (!characterExists(name)) {
      characters.push({ name, status: "present" });
      selectedCharacters.push(name);
      newCharacters.add(name);
    }
  });

  // 5) Fallback scan—if GPT forgot to tag “Bobby” but the text says “Bobby calls you…”
  const narrativeLines = reply
    .split("\n")
    .filter(l => !l.startsWith("#PRESENT:") && !l.startsWith("["));
  narrativeLines.forEach(line => {
    ["Dean","Sam","Castiel","Crowley","Bobby","Ruby","Jo","Ellen"].forEach(npc => {
      const re = new RegExp(`\\b${npc}\\b`, "i");
      if (re.test(line) && !characterExists(npc)) {
        characters.push({ name: npc, status: "present" });
        selectedCharacters.push(npc);
        newCharacters.add(npc);
      }
    });
  });

  // 6) Render everything into the story div
  const storyDiv = document.getElementById("story");
  storyDiv.innerHTML = "";         // clear any old intro
  narrativeLines.forEach(txt => {
    const p = document.createElement("p");
    p.classList.add("narration");
    p.textContent = txt;
    storyDiv.appendChild(p);
  });

  // 7) Refresh the sidebar so you see all newCharacters
  if (newCharacters.size > 0) refreshSidebar();

  // 8) And (optional) set up those first bracketed choices as buttons
  //    (re‑use your existing choice‑parsing logic from sendToGPT)
}

// ------------------------------------------
// Funzioni di gestione dell'interfaccia (Sidebar, Dropdown, ecc.)
// ------------------------------------------

/**
 * Aggiorna la sidebar dei personaggi (presenti) in base allo stato.
 */
function refreshSidebar() {
  const presentList = document.getElementById("charListPresent");
  // In questa versione non utilizziamo la sezione "remote" (rimuoviamo quella lista)
  presentList.innerHTML = "";

 // const knownNames = Object.keys(characterColors);
 // characters.forEach(({ name, status }) => {
 const knownNames = Object.keys(characterColors);
// Only list truly known NPCs or the player—skip any generic “ghost” entries
  characters
    .filter(({ name }) =>
      // is one of our defined NPCs?
      knownNames.some(known =>
        name.toLowerCase().includes(known.toLowerCase())
      )
      // OR is the player
      || name === player.name
    )
    .forEach(({ name, status }) => {
    // Trattiamo tutti i personaggi come "present"
    const li = document.createElement("li");
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    // Generazione immagine del personaggio
    const img = document.createElement("img");
    img.classList.add("char-icon");
    let displayName = name;
    const matchedName = knownNames.find(known => name.toLowerCase().includes(known.toLowerCase()));
    if (matchedName) { displayName = matchedName; }

    let imgSrc;
    if (characterImages[name]) {
      imgSrc = characterImages[name];
    } else {
      if (matchedName) {
        imgSrc = `images/${matchedName.toLowerCase()}.png`;
      } else {
        const rand = Math.floor(Math.random() * 4) + 1;
        imgSrc = `images/ghost${rand}.png`;
      }
      characterImages[name] = imgSrc;
    }
    img.src = imgSrc;
    img.alt = name;
    img.style.color = characterColors[matchedName || name] || characterColors["default"];
    // Se il personaggio è "pending", rendi l'icona semitrasparente
    const charObj = characters.find(c => c.name === name);
    if (charObj && charObj.status === "pending") {
      img.style.opacity = 0.5;   // grigio finché non arriva
    }
    if (selectedCharacters.includes(name)) { img.classList.add("selected"); }
    img.setAttribute("data-name", name);

    // Bottone per rimuovere (dismiss) il personaggio
    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = "Dismiss";
    dismissBtn.className = "dismiss-btn";
    dismissBtn.style.position = "absolute";
    dismissBtn.style.top = "0";
    dismissBtn.style.right = "0";
    dismissBtn.style.display = "none";
    dismissBtn.onclick = () => dismissCharacter(name);

    // Gestione del click sull'immagine per selezionare/deselezionare
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
    presentList.appendChild(li);
  });
}

/**
 * Aggiunge un personaggio personalizzato.
 */
function addCustomCharacter() {
  const name = document.getElementById("customCharName").value.trim();
  const status = document.getElementById("customCharStatus").value;

  if (!name || characterExists(name)) return;

  addCharacter(name, status);
  allAvailableCharacters.push(name);

  if (status === "present") {
    selectedCharacters.push(name);
  }

  refreshSidebar();
  loadDropdown();

  document.getElementById("customCharName").value = "";
  document.getElementById("customCharDesc").value = "";
  document.getElementById("customCharStatus").value = "present";
  document.getElementById("customCharFields").style.display = "none";
}

/**
 * Aggiunge un personaggio dalla selezione.
 */
function addSelectedCharacter() {
  const dropdown = document.getElementById("charDropdown");
  const name = dropdown.value;
  if (name && name !== "Other..." && !characterExists(name)) {
    addCharacter(name, "present");
    refreshSidebar();
    dropdown.value = "";
  }
}

/**
 * Popola il dropdown per la scelta dei personaggi.
 */
function loadDropdown() {
  const dropdown = document.getElementById("charDropdown");
  dropdown.innerHTML = `<option value="">-- Select character --</option>`;
  allAvailableCharacters.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    dropdown.appendChild(opt);
  });

  // Gestione selezione giocatore personalizzato
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

// ------------------------------
// Funzioni di gestione dei personaggi
// ------------------------------

/**
 * Verifica se un personaggio esiste già.
 */
function characterExists(name) {
  return characters.some(c => c.name === name);
}

/**
 * Aggiunge un personaggio alla lista, impostandolo come "present".
 */
function addCharacter(name, status = "present") {
  if (!characterExists(name)) {
    characters.push({ name, status });
    if (status === "present") selectedCharacters.push(name);
  }
}

/**
 * Rimuove un personaggio dalla lista e aggiorna la sidebar.
 */
function removeCharacter(name) {
  const loweredName = name.toLowerCase();
  characters = characters.filter(c => c.name.toLowerCase() !== loweredName);
  selectedCharacters = selectedCharacters.filter(n => n.toLowerCase() !== loweredName);
  newCharacters.delete(name);

  // Rimuove l’icona dalla sidebar
  const icon = document.querySelector(`.char-icon[data-name="${name}"]`);
  if (icon) icon.remove();
  refreshSidebar();
}

// --------------------------------------
// Funzioni per gestire azioni e prompt a GPT
// --------------------------------------

/**
 * Imposta le azioni rapide nell'interfaccia.
 */
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

/**
 * Invia un messaggio a GPT, costruendo un prompt basato sul contesto.
 */
async function sendToGPT(message, type = "dialogue", isRandom = false) {
  console.log("✅ sendToGPT attivata");
  newCharacters.clear();
  const input = message.trim();
 // Se il player aspetta un NPC "pending", facciamolo entrare subito
  arrivalNPCs.forEach(name => {
    const waitRe = new RegExp(`\\bwait\\s+(for\\s+)?${name}\\b`, "i");
    if (waitRe.test(input) && pendingArrival.has(name)) {
      pendingArrival.delete(name);
      scheduleArrival(name, 0);   // entrata immediata
    }
  });
  if (!input) return;

  // Assicuriamoci che il Narrator sia sempre presente
  if (!characterExists("Narrator")) {
    characters.push({ name: "Narrator", status: "present" });
  }

  const storyDiv = document.getElementById("story");
  const speakerNames = characters
    .filter(c => selectedCharacters.includes(c.name) && c.status === "present")
    .map(c => c.name);

  if (!speakerNames.includes(player.name)) {
    speakerNames.push(player.name); // Assicuriamoci che il player ci sia sempre
  }

  const charactersInvolved = speakerNames.join(" and ");

  const storyLines = Array.from(storyDiv.querySelectorAll("p"))
    .slice(-6)
    .map(p => p.textContent)
    .join("\n");

  document.getElementById("choices").innerHTML = "";
  triggerSounds(input);

  // Aggiungi il messaggio del giocatore alla storia
  const playerMsg = document.createElement("p");
  if (type === "dialogue") {
    playerMsg.className = `character-color-User`;
    playerMsg.textContent = `${player.name}: "${input}"`;
  } else {
    playerMsg.className = "narration";
    playerMsg.textContent = input;
  }
  storyDiv.appendChild(playerMsg);

  // COSTRUISCI IL PROMPT: caricalo da un file di testo e sostituisci i placeholder
  let prompt = await (await fetch("texts/supernatural_prompt.txt")).text();
  prompt = prompt.replace("{{PLAYER_NAME}}", player.name)
                 .replace("{{STORY_CONTEXT}}", storyLines)
                 .replace("{{INPUT}}", input)
                 .replace("{{CHARACTERS}}", charactersInvolved);

  if (isRandom) {
    prompt += "\nThe player triggers a sudden supernatural event...";
  } else if (type === "narration") {
    prompt += `\nThe player narrates an action: "${input}"\nDescribe what happens next in third person.`;
  } else {
    prompt += `\nThe player (${player.name}) speaks: "${input}"\nMake sure the characters respond in character. When a character responds, do not repeat the player's action; only provide the character's reaction or dialogue.`;
  }

  // Aggiungi eventuali tag richiesti alla fine del prompt
  prompt += `
# Trigger Tags:
...
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

    const data = await response.json();
    if (!data ||
        !data.choices ||
        !data.choices[0] ||
        !data.choices[0].message ||
        !data.choices[0].message.content) {
      alert("⚠️ GPT did not return a valid response.");
      console.error("Invalid GPT response:", data);
      return;
    }

    const reply = data.choices[0].message.content.trim();
        // --- DETECTION dell’annuncio di arrivo per qualunque NPC ---
    arrivalNPCs.forEach(name => {
      const arrivalRe = new RegExp(
        `^${name}:.*\\b(on my way|be there soon|coming over|heading (over|there)|arriving|en route)\\b`,
        "im"
      );

      if (arrivalRe.test(reply) && !pendingArrival.has(name)) {

        // Mettiamo/aggiorniamo lo status a "pending"
        if (!characterExists(name)) addCharacter(name, "pending");
        else characters.find(c => c.name === name).status = "pending";

        pendingArrival.add(name);

        // Timer di arrivo
        const delay = travelTimes[name] || 30000;
        scheduleArrival(name, delay);

        // Feedback narrativo
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = name === "Castiel"
          ? "Un fruscio d’ali vibra nell’aria: Castiel sta per materializzarsi…"
          : `${name} è in arrivo…`;
        storyDiv.appendChild(p);
      }
    });

    // ── STRICT NPC ADD: ONLY ON #PRESENT: TAGS OR DIALOGUE LINES ─────────────────
    const dialogueSpeakerRegex = /^([A-Z][a-zA-Z]+):/gm;
   
    // ── STRICT NPC ADD: ONLY ON #PRESENT: TAGS OR DIALOGUE LINES ─────────────────
    // We'll only auto-add when GPT actually formats a dialogue line ("Dean: …").
   // After you get `reply` but before pushing newCharacters:
   const dialogueSpeakerRegex = /^([A-Z][a-zA-Z]+):/gm;
   let match;
   while ((match = dialogueSpeakerRegex.exec(reply)) !== null) {
     const cand = match[1];
     if (["Dean","Sam","Castiel","Crowley","Bobby","Ruby","Jo","Ellen"].includes(cand)
         && !characterExists(cand)) {
       // Ask the arbiter if this really means “cand” is entering the scene
       const recent = storyLines;  // the last 6 lines you already captured
       const decision = await askCharacterArbiter(cand, recent);
       if (decision === "present") {
         characters.push({ name: cand, status: "present" });
         selectedCharacters.push(cand);
         newCharacters.add(cand);
       }
     }
   }
   if (newCharacters.size > 0) refreshSidebar();
    // ─────────────────────────────────────────────────────────────────────────────
   
    console.log("GPT reply:", reply);

    const validTags = ["#PRESENT:", "#LEAVE:"];
    const lines = reply.split("\n")
      .map(line => line.trim())
      .filter(line => line && line !== "Options:" && (line[0] !== "#" || validTags.some(tag => line.startsWith(tag))));
    console.log("Lines being processed into story:", lines);

    // Aggiungi le scelte (bottoni)
   const choicesDiv = document.getElementById("choices");
   const choiceLines = [];
   reply.split("\n").forEach(raw => {
     const t = raw.trim();
     if (t.startsWith("[")) {
       // già tra parentesi, es: [Guarda sotto il letto]
       choiceLines.push(t);
     } else if (/^[-–—]\s+/.test(t)) {
       // lista con trattino, es: - Guarda sotto il letto
       choiceLines.push(`[${ t.replace(/^[-–—]\s+/, "") }]`);
     } else if (/^\d+\.\s+/.test(t)) {
       // lista numerata, es: 1. Guarda sotto il letto
       choiceLines.push(`[${ t.replace(/^\d+\.\s+/, "") }]`);
     }
   });
   choicesDiv.innerHTML = "";
   choiceLines.forEach(bracketed => {
     // togli i [...] per il testo vero del bottone
     const choiceText = bracketed.replace(/^\[|\]$/g, "");
     const btn = document.createElement("button");
     btn.className = "choice-btn";
     btn.textContent = choiceText;
     btn.onclick = () => {
       // mantieni la tua logica di exorcism se serve
       if (/exorcism|exorcise|perform an exorcism|expel the spirit/i.test(choiceText)) {
         triggerExorcismEvent();
       }
       sendToGPT(choiceText, "narration");
     };
     choicesDiv.appendChild(btn);
   });

    // Processa ogni linea del reply
    lines.forEach(line => {
      if (/^#PRESENT:\s*(.+)$/.test(line)) {
        // Gestione tag #PRESENT
        const name = line.replace("#PRESENT:", "").trim();
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
        if (pendingArrival.has(name)) pendingArrival.delete(name);
        refreshSidebar();

      } else if (/^#LEAVE:\s*(.+)$/.test(line)) {
        // Gestione tag #LEAVE
        const name = line.replace("#LEAVE:", "").trim();
        removeCharacter(name);

      } else if (/^[A-Z][a-zA-Z\s'-]+:/.test(line)) {
        // Gestione del dialogo (es. "Sam: ...")
        const name = line.split(":")[0].trim();
        const blockedNames = [
          "creature", "lurker", "shadow", "figure", "thing", "entity", "monster",
          "spirit", "demon", "ghost", "voice", "presence", "apparition", "evil",
          "darkness", "phantom", "force", "being"
        ];
        if (blockedNames.includes(name.toLowerCase())) return;
        if (!characterExists(name) && !newCharacters.has(name)) {
          characters.push({ name, status: "present" });
          selectedCharacters.push(name);
          newCharacters.add(name);
          refreshSidebar();
        }
        let dialogue = line.substring(line.indexOf(":") + 1).trim();
        if (dialogue.startsWith(input)) {
          dialogue = dialogue.substring(input.length).trim();
          dialogue = dialogue.replace(/^[-–—,:;.\s]+/, '');
        }
        const p = document.createElement("p");
        p.className = `character-color-${name}`;
        p.textContent = `${name}: "${dialogue}"`;
        storyDiv.appendChild(p);
        triggerSounds(line);

      } else {
        // Gestione della narrazione
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = line;
        storyDiv.appendChild(p);
        triggerSounds(line);
      }
    });

    // Se tra le linee non ci sono né tag né dialoghi, stampa il blocco narrativo principale
   /* 
   const shouldShowReply = !lines.some(line =>
      line.startsWith("#PRESENT:") ||
      line.startsWith("#LEAVE:") ||
      /^[A-Z][a-zA-Z\s'-]+:/.test(line)
    );

    if (shouldShowReply) {
      const p = document.createElement("p");
      p.classList.add("narration");
      // Mostra solo la parte testuale, escludendo righe che iniziano con "[" o "Options:"
      const narrativeOnly = reply
        .split("\n")
        .filter(line => {
          const trimmed = line.trim();
          return !trimmed.startsWith("[") && trimmed !== "Options:";
        })
        .join(" ")
        .trim();
      p.textContent = narrativeOnly;
      storyDiv.appendChild(p);
    }
    */
    if (newCharacters.size > 0) refreshSidebar();

  } catch (err) {
    console.error("Fetch failed:", err);
    alert("Something went wrong: " + err.message);
  }
}

/**
 * Riproduce suoni basati sul contenuto del testo.
 */
function triggerSounds(text) {
  const lowerText = text.toLowerCase();
  const triggers = [
    { id: 'sound-door', patterns: [/knock/, /door\s+creak/, /door\s+slam/, /opens\s+the\s+door/] },
    { id: 'sound-gunshot', patterns: [/gunshot/, /shoots?/, /fired/, /pulls\s+the\s+trigger/, /bang/, /blast/, /bullet/, /pistol/, /shooting/] },
    { id: 'sound-scream', patterns: [/scream/, /shout/, /yell/, /cry\s+out/, /wail/, /screeches?/] },
    { id: 'sound-demon', patterns: [/demon/, /growl/, /possess/, /evil/, /dark\s+presence/, /hellhound/] },
    { id: 'sound-whisper', patterns: [/whisper/, /ghost/, /murmur/, /breath/, /chill/, /spirit/] },
    { id: 'sound-impala', patterns: [/impala/, /car/, /engine/, /rev/, /roar/] },
    { id: 'sound-arrival', patterns: [/phone/, /call/, /dial/, /voicemail/] },
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

/**
 * Verifica se una linea di testo è contestualmente appropriata rispetto al contesto corrente.
 * @param {string} line - La linea di testo da verificare.
 * @param {string} context - Il contesto corrente (tipicamente, le ultime linee della storia).
 * @returns {boolean} - true se la linea è appropriata, false altrimenti.
 */
function isContextuallyAppropriate(line, context) {
  const lowerLine = line.toLowerCase();
  const lowerContext = context.toLowerCase();

  // Esempio: se il contesto contiene 'forest', 'woods' o 'outdoors',
  // scarta le linee che contengono termini tipici degli ambienti interni.
  if (/forest|woods|outdoors/.test(lowerContext)) {
    if (/room|inside|hall|building/.test(lowerLine)) {
      console.warn("Skipping line due to context mismatch:", line);
      return false;
    }
  }

  // Puoi aggiungere ulteriori regole se necessario.
  return true;
}


/**
 * Schedula l'arrivo di un personaggio modificando il suo stato a "present"
 * dopo un certo ritardo (in millisecondi).
 */
function scheduleArrival(characterName, delay) {
  setTimeout(() => {
    const char = characters.find(c => c.name === characterName);
    if (char && char.status !== "present") {
      char.status = "present";
      refreshSidebar();
      const storyDiv = document.getElementById("story");
      const p = document.createElement("p");
      p.classList.add("narration");
      p.textContent = `${characterName} has arrived.`;
      storyDiv.appendChild(p);
      // Riproduci il suono specifico per l'arrivo
      triggerSounds("character_arrived");
    }
  }, delay);
}

/**
 * Invia una richiesta per stabilire se un personaggio deve essere aggiunto come presente.
 * (Funzione per eventuali controlli, se necessario.)
 */
async function askCharacterArbiter(reply, recentStory) {
  const arbiterPrompt = `
You’re a moderator for a Supernatural role‑playing game.
Given the previous context and the AI’s new reply, output ONLY the presence tags:

  • #PRESENT: <Name>   for NPCs (Dean, Sam, Castiel, Crowley, Bobby, Ruby, Jo, Ellen)
  • #PRESENT: <Entity> for supernatural entities (Ghost, Shadow) only when they truly appear

Return nothing else.

CONTEXT:
${recentStory}

REPLY:
${reply}

EXAMPLE 1:
CONTEXT: You wake in a crypt, hear a growl.
REPLY: Suddenly, Dean storms in.
OUTPUT: #PRESENT: Dean

EXAMPLE 2:
CONTEXT: You stand in a clearing, trees silent.
REPLY: A pale mist forms into a skeletal figure.
OUTPUT: #PRESENT: Ghost

EXAMPLE 3:
CONTEXT: You’re safe in the bunker.
REPLY: You dial Sam’s number.
OUTPUT: 
`;

  try {
    const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: arbiterPrompt }]
      })
    });
    const json = await res.json();
    return json.choices[0].message.content
      .split("\n")
      .filter(line => line.startsWith("#PRESENT:"))
      .map(line => line.trim());
  } catch (err) {
    console.error("Arbiter error:", err);
    return [];
  }
}


/**
 * Gestisce l'uscita di un personaggio dalla scena (dismiss).
 */
async function dismissCharacter(name) {
  const storyDiv = document.getElementById("story");
  const recentStory = Array.from(storyDiv.querySelectorAll("p"))
    .slice(-6)
    .map(p => p.textContent)
    .join("\n");

  const prompt = `
You are writing the next line in a Supernatural role-playing game.
The character "${name}" is currently present.
The player wants to dismiss this character in a way that fits the context.
...
(Completa il prompt per il dismiss)
`;
  try {
    const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content.trim();
    const lines = reply.split("\n").filter(line => line.trim() !== "");

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#PRESENT:")) {
        const name = trimmedLine.replace("#PRESENT:", "").trim();
        const existing = characters.find(c => c.name === name);
        const wasAlreadyPresent = existing && existing.status === "present";
        if (existing) { existing.status = "present"; }
        else { characters.push({ name, status: "present" }); }
        if (!selectedCharacters.includes(name)) { selectedCharacters.push(name); }
        newCharacters.add(name);
        if (!wasAlreadyPresent) {
          const msg = document.createElement("p");
          msg.className = "narration";
          msg.textContent = `${name} has arrived.`;
          storyDiv.appendChild(msg);
          triggerSounds("character_arrived");
        }
        if (pendingArrival.has(name)) pendingArrival.delete(name);
        refreshSidebar();
        return;
      }
      if (trimmedLine.startsWith("#LEAVE:")) {
        const name = trimmedLine.replace("#LEAVE:", "").trim();
        removeCharacter(name);
        return;
      }

      if (/^[A-Z][a-zA-Z\s'-]+:/.test(trimmedLine)) {
        const name = trimmedLine.split(":")[0].trim();
        const blockedNames = ["creature", "lurker", "shadow", "figure", "thing", "entity", "monster", "spirit", "demon", "ghost", "voice", "presence", "apparition", "evil", "darkness", "phantom", "force", "being"];
        if (blockedNames.includes(name.toLowerCase())) return;
        if (name.toLowerCase() !== player.name.toLowerCase() &&
            name !== "Narrator" &&
            !characterExists(name) &&
            !newCharacters.has(name) &&
            !selectedCharacters.includes(name)) {
          characters.push({ name, status: "present" });
          selectedCharacters.push(name);
          newCharacters.add(name);
        }
        const p = document.createElement("p");
        p.className = `character-color-${name}`;
        p.textContent = trimmedLine;
        storyDiv.appendChild(p);
        triggerSounds(line);
      } else {
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = trimmedLine;
        storyDiv.appendChild(p);
        triggerSounds(line);
      }
    });
    refreshSidebar();
  } catch (err) {
    console.error("Failed to dismiss character:", err);
    alert("Failed to dismiss character: " + err.message);
  }
}

// -------------------------------
// Funzioni per eventi speciali
// -------------------------------
function triggerRandomEvent() {
  sendToGPT("random", "narration", true);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleMusic() {
  const bgm = document.getElementById("background-music");
  if (bgm) {
    if (bgm.paused) {
      bgm.volume = 0.3;
      bgm.play();
    } else {
      bgm.pause();
    }
  }
}

function triggerExorcismEvent() {
  const overlay = document.getElementById('exorcism-overlay');
  const ghost = document.getElementById('ghost');
  const chant = document.getElementById('chant');

  overlay.classList.remove('hidden');
  ghost.style.opacity = '1';
  ghost.style.transform = 'translateY(0)';
  chant.textContent = '"Exorcizamus te, omnis immundus spiritus..."';
  chant.style.opacity = '1';

  setTimeout(() => {
    ghost.style.opacity = '0';
    ghost.style.transform = 'translateY(-150px)';
  }, 500);

  setTimeout(() => {
    chant.textContent = '"Spiritus expulsus est!"';
  }, 3500);

  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 5500);
}

/**
 * Funzione per avviare il gioco.
 */
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

// -------------------------------
// Export delle funzioni da usare in main.js
// -------------------------------
export {
  setPlayer,
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
  scheduleArrival
};
