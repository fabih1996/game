// Supernatural RPG - Final JavaScript File with Character Lore Support

let characters = ["Narrator"];
let selectedCharacters = ["Narrator"];
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
  "User": "#3399ff"
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

function refreshSidebar() {
  const presentList = document.getElementById("charListPresent");
  const remoteList = document.getElementById("charListRemote");

  presentList.innerHTML = "";
  remoteList.innerHTML = "";

  characters.forEach(name => {
    const li = document.createElement("li");
    const img = document.createElement("img");
    img.src = `images/${name.toLowerCase()}.png`;
    img.alt = name;
    img.className = "char-icon";
    img.style.color = characterColors[name] || "#eee";

    const isSelected = selectedCharacters.includes(name);
    const isRemote = !isSelected && name !== "Narrator" && name !== player.name;

    if (isSelected) {
      img.classList.add("selected");
      img.onclick = () => {
        selectedCharacters = selectedCharacters.filter(n => n !== name);
        refreshSidebar();
      };
      li.appendChild(img);
      presentList.appendChild(li);
    } else if (isRemote) {
      li.appendChild(img);
      remoteList.appendChild(li);
    }
  });
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
    characters.push(name);
    refreshSidebar();
    dropdown.value = "";
  }
}

function addCustomCharacter() {
  const name = document.getElementById("customCharName").value.trim();
  if (!name || characters.includes(name)) return;

  characters.push(name);
  allAvailableCharacters.push(name);
  refreshSidebar();
  loadDropdown();
  document.getElementById("customCharName").value = "";
  document.getElementById("customCharDesc").value = "";
  document.getElementById("customCharFields").style.display = "none";
}

window.addEventListener("DOMContentLoaded", async () => {
  if (typeof loadDropdown === "function") loadDropdown();
  setupActions();
  await loadCharacterLore();

  const bgm = document.getElementById("background-music");
  if (bgm) {
    bgm.volume = 0.3;
    bgm.play();
  }

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

window.addEventListener("DOMContentLoaded", async () => {
  await loadCharacterLore();
  setupActions();
  loadDropdown(); // This must be defined in another part of your script
  const bgm = document.getElementById("background-music");
  if (bgm) {
    bgm.volume = 0.3;
    bgm.play();
  }

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
}
async function sendToGPT(message, type = "dialogue", isRandom = false) {
  const newCharacters = new Set();
  const input = message.trim();
  if (!input) return;

  const storyDiv = document.getElementById("story");
  const speakerNames = selectedCharacters.filter(name => name !== player.name).join(" and ");
  const storyLines = Array.from(storyDiv.querySelectorAll("p"))
    .slice(-6)
    .map(p => p.textContent)
    .join("\n");

  document.getElementById("choices").innerHTML = "";
  triggerSounds(input);

  const playerMsg = document.createElement("p");
  playerMsg.className = `character-color-User`;
  playerMsg.textContent = `${player.name}: ${input}`;
  storyDiv.appendChild(playerMsg);

  let prompt = `# Supernatural Character Lore:\n${characterKnowledge}\n\n# Current Situation:\n${storyLines}\n\n`;

  if (isRandom) {
    prompt += `The player triggers a sudden supernatural event. Continue the story in a suspenseful and logical way. Make sure the event fits the context. Include short narration and only logical character reactions. End with 2–3 meaningful and situation-appropriate player options.`;
  } else if (type === "narration") {
    prompt += `The player narrates an action:\n"${input}"\n\nRespond with a short, clear continuation of the scene, describing the consequences of the action. Keep narration concise but vivid. Maintain flow from the last story context. Then give 2–3 realistic next actions in this format:\n[Look around the room]\n[Ask a question]\n[Get your weapon]`;
  } else {
    prompt += `The player (${player.name}) says:\n"${input}"\n\nCharacters involved: ${speakerNames}\n\nContinue the story naturally and logically. Characters must respond as they would in the series, based on the character lore. Keep lines brief, reactive, and in-character. Avoid redundancy. Let the narrator add connecting context only when needed. 
    Characters must NEVER propose player options themselves.
Only the narrator can suggest actions like [Inspect the sigil] or [Call Bobby].
All player options must be presented by the narrator only.`;
  }

  prompt += `
Characters must act consistently with their personalities and experiences from the show.
Their lines should:
- React meaningfully to what the player said
- Build on the previous dialogue and story events
- Reveal insights, fears, or memories relevant to the scene
- Avoid repeating themselves or each other
- Avoid generic filler like “Stay sharp” unless it’s contextually appropriate
- Stay emotionally grounded and true to character arcs

Rules:
- Do not include actions already performed in the last turn
- End with 2–3 FRESH and realistic player choices formatted like [Inspect the mirror]
- Narrator should add brief and cinematic transitions, not long descriptions

Only the following characters are allowed to speak: ${selectedCharacters.join(", ")}.
- DO NOT include dialogue or actions for any character not in this list.
- If a character is mentioned narratively, they must not speak unless they are in the list.
- If a new character appears in the story, include them only as narration. The player must explicitly add them to interact.
`;

  try {
    const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const reply = data.choices[0].message.content.trim();
    const lines = reply.split("\n").filter(line => line.trim() !== "");

    // Detect speakers
    const isDialogueLine = /^[A-Z][a-z]+:/.test(line);
    for (const line of lines) {
      if (isDialogueLine) {
        const name = line.split(":")[0].trim();
        if (
          name.toLowerCase() !== player.name.toLowerCase() &&
          !characters.includes(name) &&
          name !== "Narrator"
        ) {
          characters.push(name);
          selectedCharacters.push(name);
          newCharacters.add(name);
        }
      }
    }

    // Detect characters mentioned in narration
    const allCharacterNames = allAvailableCharacters.concat(
      characters.filter(name => !allAvailableCharacters.includes(name))
    );

    lines.forEach(line => {
      allCharacterNames.forEach(name => {
        if (
          line.includes(name) &&
          !characters.includes(name) &&
          name !== player.name &&
          name !== "Narrator"
        ) {
          characters.push(name);
          selectedCharacters.push(name);
          newCharacters.add(name);
        }
      });
    });

    if (newCharacters.size > 0) {
      refreshSidebar();
    }

if (newCharacters.size > 0) {
  refreshSidebar();
}
    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      const name = colonIndex !== -1 ? line.slice(0, colonIndex).trim() : "";

      if (name.toLowerCase() === player.name.toLowerCase()) continue;

      const p = document.createElement("p");
      if (/^[A-Z][a-z]+:/.test(line)) {
        p.className = `character-color-${name}`;
        p.textContent = line;
      } else {
        p.classList.add("narration");
        p.textContent = line;
      }
      triggerSounds(line);
      storyDiv.appendChild(p);
    }

    const choicesDiv = document.getElementById("choices");
    const choiceLines = lines.filter(line => line.startsWith("["));
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
        sendToGPT(choiceText, "dialogue");
      };
      choicesDiv.appendChild(btn);
    });

  } catch (err) {
    console.error("Fetch failed:", err);
    alert("Something went wrong: " + err.message);
  }
}

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

window.startGame = startGame;
