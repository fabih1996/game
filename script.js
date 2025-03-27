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

function loadIntro() {
  const intro = randomIntros[Math.floor(Math.random() * randomIntros.length)];
  const storyDiv = document.getElementById("story");
  const p = document.createElement("p");
  p.classList.add("narration");
  p.textContent = intro;
  storyDiv.appendChild(p);
}
function refreshSidebar() {
  const list = document.getElementById("charList");
  list.innerHTML = "";

  characters.forEach(name => {
    const li = document.createElement("li");
    const img = document.createElement("img");
    img.src = `images/${name.toLowerCase()}.png`;
    img.alt = name;
    img.className = "char-icon";
    img.style.color = characterColors[name] || "#eee";

    if (selectedCharacters.includes(name)) {
      img.classList.add("selected");
    }

    img.onclick = () => {
      if (name === "Narrator") return;
      if (selectedCharacters.includes(name)) {
        selectedCharacters = selectedCharacters.filter(n => n !== name);
        img.classList.remove("selected");
      } else {
        selectedCharacters.push(name);
        img.classList.add("selected");
      }
    };

    li.appendChild(img);
    list.appendChild(li);
  });
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

function setupActions() {
  const container = document.getElementById("actions-container");
  container.innerHTML = "";
  quickActions.forEach(action => {
    const btn = document.createElement("button");
    btn.textContent = action;
    btn.className = "action-btn";
    btn.onclick = () => sendToGPT(action);
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
window.addEventListener("DOMContentLoaded", () => {
  loadDropdown();
  setupActions();

  const bgm = document.getElementById("background-music");
  const btn = document.getElementById("continueBtn");
  btn.addEventListener("click", () => {
    if (bgm && bgm.paused) {
      bgm.volume = 0.3;
      bgm.play();
    }
  });
});

function triggerSounds(text) {
  const lowerText = text.toLowerCase();
  const triggers = [
    { id: 'sound-door', patterns: [/knock/, /door\s+creak/, /door\s+slam/] },
    { id: 'sound-gunshot', patterns: [/gunshot/, /shoots?/, /fired/, /pulls\s+the\s+trigger/, /bang/] },
    { id: 'sound-scream', patterns: [/scream/, /shout/, /yell/, /cry\s+out/, /wail/] },
    { id: 'sound-demon', patterns: [/demon/, /growl/, /possess/, /evil/, /dark\s+presence/] },
    { id: 'sound-whisper', patterns: [/whisper/, /ghost/, /murmur/, /breath/, /chill/] },
    { id: 'sound-impala', patterns: [/impala/, /car/, /engine/, /rev/, /roar/] },
  ];

  for (const { id, patterns } of triggers) {
    if (patterns.some(regex => regex.test(lowerText))) {
      const audio = document.getElementById(id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play();
      }
      break;
    }
  }
}

async function sendToGPT(messageOverride = null, isRandom = false) {
  const input = messageOverride || document.getElementById("userInput").value.trim();
  const storyDiv = document.getElementById("story");
  const speakerNames = selectedCharacters.filter(name => name !== player.name).join(" and ");

  if (!input) return;

  document.getElementById("choices").innerHTML = "";
  triggerSounds(input);

  // Stampa input utente
  const playerMsg = document.createElement("p");
  playerMsg.className = `character-color-User`;
  playerMsg.textContent = `${player.name}: ${input}`;
  storyDiv.appendChild(playerMsg);

  let prompt = "";

  if (isRandom) {
    prompt = `Trigger a completely unexpected event in a dark Supernatural setting. Use atmospheric narration and short character dialogue from ${characters.join(", ")}.`;
  } else if (selectedCharacters.includes("Narrator") && selectedCharacters.length === 1) {
    prompt = `You are the narrator of a dark supernatural thriller. The player says: "${input}". Continue the story with rich, immersive narration.`;
  } else {
    prompt = `
The following characters are speaking: ${speakerNames}.
The player (${player.name}) says: "${input}"

Rules:
- ONLY the selected characters may speak
- DO NOT write lines for the player (${player.name})
- DO NOT think, act, or describe anything for the player
- Keep lines short and believable
- Optionally offer 2-3 choices at the end in this format:
[Go upstairs]
[Call Sam]
[Leave quietly]
`;
  }

  try {
    const response = await fetch("https://supernatural-api.vercel.app/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) {
      alert("OpenAI Error: " + data.error.message);
      console.error(data.error);
      return;
    }

    const reply = data.choices[0].message.content.trim();
    const lines = reply.split("\n").filter(line => line.trim() !== "");

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
      storyDiv.appendChild(p);
    }

    const choicesDiv = document.getElementById("choices");
    choicesDiv.innerHTML = "";

    const choiceLines = lines.filter(line => line.startsWith("["));
    if (choiceLines.length > 0) {
      choiceLines.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice.replace(/[\[\]]/g, "");
        btn.onclick = () => sendToGPT(choice.replace(/[\[\]]/g, ""));
        choicesDiv.appendChild(btn);
      });
    }

    document.getElementById("userInput").value = "";

  } catch (err) {
    console.error("Fetch failed:", err);
    alert("Something went wrong.");
  }
}

function triggerRandomEvent() {
  sendToGPT("random", true);
}
