// 📁 js/logic/gameStart.js

import { appendNarration } from "../ui/storyRenderer.js";
import { refreshSidebar } from "../ui/sidebar.js";

export function startGame() {
  const gameArea = document.getElementById("game-area");
  const startScreen = document.getElementById("start-screen");

  if (startScreen) startScreen.style.display = "none";
  if (gameArea) gameArea.style.display = "block";

  appendNarration("The story begins...");
  refreshSidebar();
}
