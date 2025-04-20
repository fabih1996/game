// 📁 js/ui/sidebar.js

import { characters, selectedCharacters } from "../logic/gameState.js";

/**
 * Aggiorna visivamente la sidebar con i personaggi presenti.
 */
export function refreshSidebar() {
  const presentList = document.getElementById("charListPresent");
  if (!presentList) return;
  presentList.innerHTML = "";

  characters
    .filter(c => c.name !== "Narrator")
    .forEach(({ name, status }) => {
      const li = document.createElement("li");
      const wrapper = document.createElement("div");
      wrapper.className = "char-wrapper";
      wrapper.dataset.name = name;

      const color = getCharacterColor(name);
      wrapper.style.setProperty("--ring-color", color);
      wrapper.style.color = color;

      if (status === "pending") {
        wrapper.classList.add("pending");
        wrapper.style.setProperty("--prog", "0%");
      }

      const dismissBtn = document.createElement("div");
      dismissBtn.className = "dismiss-btn";
      dismissBtn.textContent = "❌";
      dismissBtn.onclick = e => {
        e.stopPropagation();
        if (typeof window.dismissCharacter === "function") {
          window.dismissCharacter(name); // fallback globale
        }
      };
      wrapper.appendChild(dismissBtn);

      const img = document.createElement("img");
      img.classList.add("char-icon");
      img.dataset.name = name;
      img.src = `images/${name.toLowerCase()}.png`;
      img.alt = name;

      if (selectedCharacters.includes(name)) {
        img.classList.add("selected");
        wrapper.classList.add("selected");
      }

      img.onclick = e => {
        e.stopPropagation();
        const i = selectedCharacters.indexOf(name);
        if (i >= 0) selectedCharacters.splice(i, 1);
        else selectedCharacters.push(name);
        refreshSidebar();
      };

      wrapper.appendChild(img);
      li.appendChild(wrapper);
      presentList.appendChild(li);
    });
}

/**
 * Colore associato a ciascun personaggio (fallback se non definito).
 */
function getCharacterColor(name) {
  const map = {
    Dean: "#FFD700", Sam: "#00BFFF", Castiel: "#7FFFD4", Crowley: "#FF4500",
    Bobby: "#90EE90", Ruby: "#FF69B4", Jo: "#FF8C00", Ellen: "#8A2BE2",
    Narrator: "#dddddd", User: "#3399ff"
  };
  return map[name] || "#cccccc";
}