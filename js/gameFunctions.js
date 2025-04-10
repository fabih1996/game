/* gameFunctions.js */

// ---------------------------
// Variabili globali di gioco
// ---------------------------
let characters = [
  { name: "Narrator", status: "present" }  // status: "present" o "remote"
];
let selectedCharacters = ["Narrator"];
let pendingArrival = new Set();
const newCharacters = new Set();
let characterKnowledge = "";

//costruiamo la variabile player
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
function loadIntro() {
  const intro = randomIntros[Math.floor(Math.random() * randomIntros.length)];
  const storyDiv = document.getElementById("story");
  const p = document.createElement("p");
  p.classList.add("narration");
  p.textContent = intro;
  storyDiv.appendChild(p);
  triggerSounds(intro);
}

// ------------------------------------------
// Funzioni di gestione dell'interfaccia (Sidebar, Dropdown, ecc.)
// ------------------------------------------

/**
 * Aggiorna la sidebar dei personaggi (presenti e remoti) in base allo stato.
 */
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
    
    if (status === "present") presentList.appendChild(li);
    else if (status === "remote") remoteList.appendChild(li);
  });
}

/**
* Add custom character function
*/

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

/**
 * Aggiungi i personaggi
 */
  function addSelectedCharacter() {
    const dropdown = document.getElementById("charDropdown");
    const name = dropdown.value;
    if (name && name !== "Other..." && !characters.includes(name)) {
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
 * Aggiunge un personaggio alla lista, con stato predefinito "remote" se non specificato.
 */
function addCharacter(name, status = "remote") {
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
 * Imposta le azioni rapide (quick actions) nell'interfaccia.
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
 * In questo esempio, puoi caricare la parte del prompt da un file di testo separato (es. supernatural_prompt.txt).
 */
async function sendToGPT(message, type = "dialogue", isRandom = false) {
  newCharacters.clear();
  const input = message.trim();
  if (!input) return;
  
  // Assicura che il Narrator sia sempre presente
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
  
  // COSTRUISCI IL PROMPT:
  // Qui puoi leggere il prompt da un file testo (ad esempio, utilizzando fetch su "texts/supernatural_prompt.txt")
  let prompt = await (await fetch("texts/supernatural_prompt.txt")).text();
  
  // Sostituisci parti dinamiche del prompt
  prompt = prompt.replace("{{PLAYER_NAME}}", player.name)
                 .replace("{{STORY_CONTEXT}}", storyLines)
                 .replace("{{INPUT}}", input)
                 .replace("{{CHARACTERS}}", speakerNames);
  
  // Se l'azione è casuale o diversa, modifica il prompt
  if (isRandom) {
    prompt += "\nThe player triggers a sudden supernatural event...";
  } else if (type === "narration") {
    prompt += `\nThe player narrates an action: "${input}"\nDescribe what happens next in third person.`;
  } else {
    prompt += `\nThe player (${player.name}) speaks: "${input}"\nMake sure the characters respond in character.`;
  }
  
  // Aggiungi alla fine eventuali tag richiesti (#PRESENT, #REMOTE, #LEAVE, ecc.)
  prompt += `
# Trigger Tags:
...
`;
  
  try {
    const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
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
    console.log("GPT reply:", reply);
    
    // Processa la risposta eliminando eventuali tag sconosciuti
    const validTags = ["#PRESENT:", "#REMOTE:", "#LEAVE:"];
    const lines = reply.split("\n")
      .map(line => line.trim())
      .filter(line => line && (line[0] !== "#" || validTags.some(tag => line.startsWith(tag))));
    
    // Aggiungi le scelte (bottoni) se presenti
    const choicesDiv = document.getElementById("choices");
    const choiceLines = reply.split("\n").filter(line => line.trim().startsWith("["));
    choicesDiv.innerHTML = "";
    choiceLines.forEach(choice => {
      const choiceText = choice.replace(/[\[\]]/g, "");
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choiceText;
      btn.onclick = () => {
        if (/exorcism|exorcise|perform an exorcism|expel the spirit/i.test(choiceText)) {
          triggerExorcismEvent();
        }
        sendToGPT(choiceText, "narration");
      };
      choicesDiv.appendChild(btn);
    });
    
    // Gestione dei tag nella risposta per aggiornare i personaggi e visualizzare il testo
    lines.forEach(line => {
      const presentMatch = line.match(/^#PRESENT:\s*(.+)$/);
      const remoteMatch = line.match(/^#REMOTE:\s*(.+)$/);
      
      if (presentMatch) {
        const name = presentMatch[1].trim();
        const existing = characters.find(c => c.name === name);
        const wasAlreadyPresent = existing && existing.status === "present";
        
        if (existing) { existing.status = "present"; }
        else { characters.push({ name, status: "present" }); }
        
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
      }
      
      if (remoteMatch) {
        const name = remoteMatch[1].trim();
        if (!characterExists(name)) {
          characters.push({ name, status: "remote" });
        }
        if (!selectedCharacters.includes(name)) {
          selectedCharacters.push(name);
        }
        newCharacters.add(name);
        refreshSidebar();
      }
      
      // Gestisci dialoghi e narrazione
      if (/^[A-Z][a-zA-Z\s'-]+:/.test(line)) {
        const name = line.split(":")[0].trim();
        // Ignora nomi non autorizzati (es.: creature, ghost, ecc.)
        const blockedNames = ["creature", "lurker", "shadow", "figure", "thing", "entity", "monster", "spirit", "demon", "ghost", "voice", "presence", "apparition", "evil", "darkness", "phantom", "force", "being"];
        if (blockedNames.includes(name.toLowerCase())) return;
        if (name.toLowerCase() !== player.name.toLowerCase() &&
            name !== "Narrator" &&
            !characterExists(name) &&
            !newCharacters.has(name) &&
            !selectedCharacters.includes(name)) {
          characters.push({ name, status: "remote" });
          selectedCharacters.push(name);
          newCharacters.add(name);
        }
        const p = document.createElement("p");
        p.className = `character-color-${name}`;
        p.textContent = line;
        storyDiv.appendChild(p);
        triggerSounds(line);
      } else {
        const p = document.createElement("p");
        p.classList.add("narration");
        p.textContent = line;
        storyDiv.appendChild(p);
        triggerSounds(line);
      }
    });
    
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
  // Suono specifico per l'arrivo di un personaggio
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
 * Invia una richiesta per stabilire se un personaggio deve essere aggiunto come presente o remoto.
 */
async function askCharacterArbiter(name, line, context) {
  const prompt = `
You're helping moderate a roleplaying game.
...
(Completa il prompt come da tua logica.)
`;
  try {
    const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
    });
  
    const data = await response.json();
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
  } catch (err) {
    console.error("Error asking arbiter:", err);
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
    
    // Gestione dei tag specifici (PRESENT, REMOTE, LEAVE)
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
      if (trimmedLine.startsWith("#REMOTE:")) {
        const name = trimmedLine.replace("#REMOTE:", "").trim();
        const existing = characters.find(c => c.name === name);
        if (!existing) { characters.push({ name, status: "remote" }); }
        else { existing.status = "remote"; }
        if (!selectedCharacters.includes(name)) { selectedCharacters.push(name); }
        newCharacters.add(name);
        const msg = document.createElement("p");
        msg.className = "narration";
        msg.textContent = `${name} is now on the line.`;
        storyDiv.appendChild(msg);
        refreshSidebar();
        return;
      }
      if (trimmedLine.startsWith("#LEAVE:")) {
        const name = trimmedLine.replace("#LEAVE:", "").trim();
        removeCharacter(name);
        return;
      }
      
      // Gestione del dialogo o narrazione
      const colonIndex = trimmedLine.indexOf(":");
      const charName = colonIndex !== -1 ? trimmedLine.slice(0, colonIndex).trim() : "";
      const isDialogue = /^[A-Z][a-zA-Z\s'-]+:/.test(trimmedLine);
      const blockedNames = ["creature", "lurker", "shadow", "figure", "thing", "entity", "monster", "spirit", "demon", "ghost", "voice", "presence", "apparition", "evil", "darkness", "phantom", "force", "being"];
      
      if (isDialogue && !characterExists(charName) && !newCharacters.has(charName) && !selectedCharacters.includes(charName)) {
        characters.push({ name: charName, status: "remote" });
        selectedCharacters.push(charName);
        newCharacters.add(charName);
      }
      
      const p = document.createElement("p");
      if (isDialogue) {
        p.className = `character-color-${charName}`;
        p.textContent = trimmedLine;
      } else {
        p.classList.add("narration");
        p.textContent = trimmedLine;
      }
      storyDiv.appendChild(p);
      triggerSounds(trimmedLine);
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
// FUNZIONE DI INIZIO GIOCO
//---------//
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

// Esempio di export (ES6 Modules)
export {
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
  setPlayer
  // ... aggiungi qui tutte le altre funzioni da usare in main.js
};
