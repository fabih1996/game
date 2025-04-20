// 📁 js/logic/gameStart.js

import { appendNarration } from "../ui/storyRenderer.js";
import { refreshSidebar } from "../ui/sidebar.js";

export function startGame() {
  const charSelect = document.getElementById("user-character-select");
  const gameInterface = document.getElementById("game-interface");

  if (charSelect) charSelect.style.display = "none";
  if (gameInterface) gameInterface.style.display = "block";

  appendNarration("The story begins...");
  refreshSidebar();
}
