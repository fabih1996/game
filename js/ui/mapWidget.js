// 📁 js/ui/mapWidget.js

let mmCanvas, mmCtx, mmPoints = [];
const YOU_DOT_COLOR = "#3399ff";
const POINT_COLOR = "gold";

/**
 * Inizializza il mini-map widget.
 * @param {Array<{ x: number, y: number, label: string }>} points - punti da mostrare.
 */
export function setupMiniMap(points = []) {
  mmPoints = points;
  mmCanvas = document.getElementById("mini-map-canvas");
  mmCtx = mmCanvas?.getContext("2d");

  if (!mmCanvas || !mmCtx) return;

  // Disegna iniziale
  drawMiniMap();

  // Toggle mappa
  const widget = document.getElementById("mini-map-widget");
  const closeBtn = document.getElementById("mini-map-close");

  widget?.addEventListener("click", e => {
    if (e.target === closeBtn || e.target.closest("#location-info-box")) return;
    widget.classList.toggle("expanded");
    drawMiniMap();
    document.getElementById("story").classList.toggle("with-expanded-map", widget.classList.contains("expanded"));
  });

  closeBtn?.addEventListener("click", e => {
    e.stopPropagation();
    widget.classList.remove("expanded");
  });

  // Click su punti della mappa
  mmCanvas.addEventListener("click", e => {
    if (!widget.classList.contains("expanded")) return;
    const rect = mmCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const clicked = mmPoints.find(p => Math.abs(p.x + 0.5 - x) < 0.1 && Math.abs(p.y + 0.5 - y) < 0.1);
    if (clicked) {
      showLocationInfo(clicked.label, clicked.description || "A mysterious place...");
    }
  });
}

/**
 * Ridisegna la mini-mappa.
 */
function drawMiniMap() {
  if (!mmCtx || !mmCanvas) return;
  const w = mmCanvas.width;
  const h = mmCanvas.height;
  mmCtx.clearRect(0, 0, w, h);

  // Cerchio esterno
  mmCtx.strokeStyle = "#888";
  mmCtx.lineWidth = 2;
  mmCtx.beginPath();
  mmCtx.arc(w / 2, h / 2, w / 2 - 2, 0, 2 * Math.PI);
  mmCtx.stroke();

  // Punti
  [...mmPoints, { x: 0, y: 0, label: "You" }].forEach(p => {
    const px = w / 2 + p.x * (w / 2 - 20);
    const py = h / 2 + p.y * (h / 2 - 20);
    mmCtx.fillStyle = p.label === "You" ? YOU_DOT_COLOR : POINT_COLOR;
    mmCtx.beginPath();
    mmCtx.arc(px, py, 6, 0, 2 * Math.PI);
    mmCtx.fill();
    if (p.label !== "You") {
      mmCtx.fillStyle = "#fff";
      mmCtx.font = "10px sans-serif";
      mmCtx.fillText(p.label, px + 8, py - 8);
    }
  });
}

/**
 * Mostra info su una location cliccata.
 */
function showLocationInfo(label, description) {
  const infoBox = document.getElementById("location-info-box");
  if (!infoBox) return;
  document.getElementById("location-name").textContent = label;
  document.getElementById("location-description").textContent = description;
  infoBox.classList.remove("hidden");
}