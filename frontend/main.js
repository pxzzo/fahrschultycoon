import { initMap } from "./modules/map.js";
import { initBuildingSystem } from "./modules/buildings.js";
import { initChat } from "./modules/chat.js";
import { initStudentSystem } from "./modules/students.js";

// Main init
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  initBuildingSystem();
  initChat();
  setTimeout(() => {
    initStudentSystem();
  }, 200);
});
