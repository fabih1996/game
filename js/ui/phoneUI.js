// 📁 js/ui/phoneUI.js

import { characters, pendingArrival, addCharacter } from "../logic/gameState.js";
import { fetchGPTResponse } from "../logic/apiClient.js";
import { buildPromptFromTemplate } from "../logic/promptBuilder.js";
import { refreshSidebar } from "./sidebar.js";

// Variabili interne al modulo
let currentCallee = null;
let convoHistory = [];
const callIntents = new Set();

/**
 * Inizializza gli eventi per l'interfaccia del telefono.
 */
export function setupPhoneUI() {
  const overlay = document.getElementById("phone-overlay");
  const screen = document.getElementById("phone-screen");
  const contactList = document.getElementById("phone-contact-list");
  const phoneConvo = document.getElementById("phone-conversation");
  const openMessages = document.getElementById("open-messages");
  const input = document.getElementById("phone-input");
  const sendBtn = document.getElementById("phone-send");
  const closeBtn = document.getElementById("phone-close");
  const messagesDiv = document.getElementById("messages");

  // Apre la schermata iniziale del telefono
  document.getElementById("phone-button").onclick = () => {
    contactList.innerHTML = "";
    contactList.classList.add("hidden");
    phoneConvo.classList.add("hidden");
    openMessages.classList.remove("hidden");

    // Sfondi casuali
    const wallpaperList = [
      "images/wallpaper1.jpg",
      "images/wallpaper2.jpg",
      "images/wallpaper3.jpg",
      "images/wallpaper4.jpg"
    ];
    const picked = wallpaperList[Math.floor(Math.random() * wallpaperList.length)];
    screen.style.background = `url('${picked}') center/cover no-repeat`;

    overlay.classList.remove("hidden");
  };

  // Mostra i contatti disponibili
  openMessages.onclick = () => {
    contactList.innerHTML = "";
    const activeNames = characters.map(c => c.name);
    const possible = ["Dean", "Sam", "Castiel", "Crowley", "Bobby", "Ruby", "Jo", "Ellen"];
    const contacts = possible.filter(name => !activeNames.includes(name));

    if (contacts.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No contacts available";
      li.style.color = "#888";
      li.style.textAlign = "center";
      contactList.appendChild(li);
    } else {
      contacts.forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        li.onclick = () => openConversation(name, phoneConvo, contactList, openMessages, messagesDiv);
        contactList.appendChild(li);
      });
    }

    contactList.classList.remove("hidden");
    openMessages.classList.add("hidden");
  };

  // Invio messaggi
  sendBtn.onclick = async () => {
    const txt = input.value.trim();
    if (!txt || !currentCallee) return;
    input.value = "";

    convoHistory.push({ role: "user", content: txt });
    appendMessage("You", txt, messagesDiv);

    // Costruzione prompt
    const template = await fetch("texts/phone_prompt.txt").then(r => r.text());
    const lore = await fetch("texts/supernatural_character_profiles.txt").then(r => r.text());
    const profile = lore.split("---").find(chunk => chunk.startsWith(currentCallee)) || "";

    const context = convoHistory.map(m =>
      m.role === "user" ? `You: ${m.content}` : `${currentCallee}: ${m.content}`
    ).join("\n");

    const prompt = template
      .replace("{{CALLEE}}", currentCallee)
      .replace("{{LORE}}", profile)
      .replace("{{CONTEXT}}", context);

    const reply = await fetchGPTResponse(prompt, "gpt-4");
    const lines = reply.split("\n").map(l => l.trim());
    const hasTag = lines.some(l => l.startsWith("#PRESENT:"));

    const cleanLines = lines.filter(l => !l.startsWith("#"));
    const final = cleanLines.join(" ").trim();
    if (final) {
      appendMessage(currentCallee, final, messagesDiv);
      convoHistory.push({ role: "assistant", content: final });
    }

    if (hasTag) {
      callIntents.add(currentCallee);
    }
  };

  // Chiudi telefono
  closeBtn.onclick = () => {
    if (currentCallee && callIntents.has(currentCallee)) {
      addCharacter(currentCallee, "remote");
      refreshSidebar();
      // Potresti importare scheduleArrival e usarlo qui
      pendingArrival.add(currentCallee);
      callIntents.delete(currentCallee);
    }

    overlay.classList.add("hidden");
    phoneConvo.classList.add("hidden");
    messagesDiv.innerHTML = "";
    input.value = "";
    currentCallee = null;
    convoHistory = [];
  };
}

/**
 * Mostra la conversazione per un contatto selezionato.
 */
function openConversation(name, phoneConvo, contactList, openMessages, messagesDiv) {
  currentCallee = name;
  convoHistory = [];
  messagesDiv.innerHTML = "";

  Array.from(contactList.children).forEach(li => {
    li.classList.toggle("selected", li.textContent === name);
  });

  phoneConvo.classList.remove("hidden");
}

/**
 * Aggiunge un messaggio nella conversazione.
 */
function appendMessage(who, text, container) {
  const div = document.createElement("div");
  div.className = who === "You" ? "msg-you" : "msg-them";
  div.textContent = `${who}: ${text}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}