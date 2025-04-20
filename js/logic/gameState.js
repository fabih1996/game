// 📁 js/logic/gameState.js

export let characters = [
    { name: "Narrator", status: "present" } // status: present, remote, pending
  ];
  
  export let selectedCharacters = ["Narrator"];
  export let currentLocation = "Nowhere";
  export let storyPhase = "intro";
  export const newCharacters = new Set();
  export const pendingArrival = new Set();
  
  export function setStoryPhase(phase) {
    console.log(`📖 Story phase set to: ${phase}`);
    storyPhase = phase;
  }
  
  export function setCurrentLocation(location) {
    console.log(`📍 Location set to: ${location}`);
    currentLocation = location;
  }
  
  export function addCharacter(name, status = "present") {
    if (!characters.some(c => c.name === name)) {
      characters.push({ name, status });
    }
    if (!selectedCharacters.includes(name)) {
      selectedCharacters.push(name);
    }
  }
  
  export function removeCharacter(name) {
    characters = characters.filter(c => c.name !== name);
    selectedCharacters = selectedCharacters.filter(n => n !== name);
    newCharacters.delete(name);
  }
  
  export function characterExists(name) {
    return characters.some(c => c.name === name);
  }
  
  export function setCharacterStatus(name, status) {
    const char = characters.find(c => c.name === name);
    if (char) char.status = status;
  }
  