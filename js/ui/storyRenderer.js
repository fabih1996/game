// 📁 js/ui/storyRenderer.js

/**
 * Aggiunge una riga di narrazione alla storia.
 * @param {string} text - Il testo della narrazione.
 */
export function appendNarration(text) {
    const storyDiv = document.getElementById("story");
    const p = document.createElement("p");
    p.className = "narration";
    p.textContent = text;
    storyDiv.appendChild(p);
  }
  
  /**
   * Aggiunge una battuta di dialogo alla storia.
   * @param {string} speaker - Nome del personaggio.
   * @param {string} text - Testo della battuta.
   * @param {boolean} glow - Se attivare l'effetto glow.
   */
  export function appendDialogue(speaker, text, glow = true) {
    const storyDiv = document.getElementById("story");
    const p = document.createElement("p");
    const safeClass = `character-color-${speaker.replace(/\\s+/g, "")}`;
    p.classList.add(safeClass);
    if (glow) p.classList.add("glow-talk");
    p.textContent = `${speaker}: "${text}"`;
    storyDiv.appendChild(p);
  
    if (glow) setTimeout(() => p.classList.remove("glow-talk"), 2000);
  }
  
  /**
   * Svuota completamente la storia.
   */
  export function clearStory() {
    const storyDiv = document.getElementById("story");
    storyDiv.innerHTML = "";
  }