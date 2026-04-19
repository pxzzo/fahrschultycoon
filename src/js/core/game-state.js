import { defaultGameState } from "../config/game-content.js";
import { elements } from "./dom.js";
import { formatCurrency, getLocale, loadLanguage, t } from "./i18n.js";
import { state } from "./state.js";
import { loadProgressStore, saveProgressStore } from "./storage.js";

export function initializeLanguage() {
  state.currentLanguage = loadLanguage();
}

function createDefaultTimeState() {
  return {
    totalMinutes: 8 * 60,
    speed: 1
  };
}

function normalizeTimeState(timeState = {}) {
  return {
    totalMinutes: Number.isFinite(timeState.totalMinutes) ? Math.max(0, Math.floor(timeState.totalMinutes)) : createDefaultTimeState().totalMinutes,
    speed: [1, 5, 15].includes(timeState.speed) ? timeState.speed : 1
  };
}

export function translate(key, params = {}) {
  return t(state.currentLanguage, key, params);
}

export function formatMoney(value) {
  return formatCurrency(state.currentLanguage, value);
}

export function setAuthStatus(key, params = {}) {
  state.lastAuthStatus = { key, params };
  elements.authStatus.textContent = translate(key, params);
}

export function setSearchStatus(key, params = {}, isError = false) {
  state.lastSearchStatus = { key, params, isError };
  elements.searchStatus.textContent = translate(key, params);
  elements.searchStatus.style.color = isError ? "#7a2b1f" : "";
}

function createDefaultGameState() {
  return {
    money: defaultGameState.money,
    reputation: 50,
    tutorialStep: defaultGameState.tutorialStep,
    tutorialCompleted: defaultGameState.tutorialCompleted,
    time: createDefaultTimeState(),
    appointments: [],
    theoryExamSessions: [],
    activeTheoryExamId: null,
    logs: [],
    buildings: [],
    instructors: [],
    vehicles: [],
    students: []
  };
}

function migrateGameState(gameState) {
  const officeBuilt = gameState.buildings.some((building) => building.blueprintId === "starter-office");
  const garageBuilt = gameState.buildings.some((building) => building.blueprintId === "starter-garage");
  const instructorHired = Array.isArray(gameState.instructors) && gameState.instructors.length > 0;
  const vehicleOwned = Array.isArray(gameState.vehicles) && gameState.vehicles.length > 0;
  const studentAccepted = Array.isArray(gameState.students) && gameState.students.length > 0;

  if (studentAccepted) {
    gameState.tutorialCompleted = true;
    gameState.tutorialStep = "completed";
    return gameState;
  }

  if (vehicleOwned) {
    gameState.tutorialCompleted = false;
    gameState.tutorialStep = "studentIntro";
    return gameState;
  }

  if (instructorHired) {
    gameState.tutorialCompleted = false;
    gameState.tutorialStep = "vehicleIntro";
    return gameState;
  }

  if (garageBuilt) {
    gameState.tutorialCompleted = false;
    gameState.tutorialStep = "instructorIntro";
    return gameState;
  }

  if (officeBuilt) {
    gameState.tutorialCompleted = false;
    gameState.tutorialStep = "garageIntro";
    return gameState;
  }

  gameState.tutorialCompleted = false;
  gameState.tutorialStep = "intro";
  return gameState;
}

export function loadGameState(username, normalizeStudentEntry) {
  const progressStore = loadProgressStore();
  const savedState = progressStore[username];

  if (!savedState) {
    return createDefaultGameState();
  }

  return migrateGameState({
    money: typeof savedState.money === "number" ? savedState.money : defaultGameState.money,
    reputation: typeof savedState.reputation === "number" ? savedState.reputation : 50,
    tutorialStep: savedState.tutorialStep || defaultGameState.tutorialStep,
    tutorialCompleted: Boolean(savedState.tutorialCompleted),
    time: normalizeTimeState(savedState.time),
    appointments: Array.isArray(savedState.appointments) ? savedState.appointments : [],
    theoryExamSessions: Array.isArray(savedState.theoryExamSessions) ? savedState.theoryExamSessions : [],
    activeTheoryExamId: typeof savedState.activeTheoryExamId === "string" ? savedState.activeTheoryExamId : null,
    logs: Array.isArray(savedState.logs) ? savedState.logs : [],
    buildings: Array.isArray(savedState.buildings) ? savedState.buildings : [],
    instructors: Array.isArray(savedState.instructors) ? savedState.instructors : [],
    vehicles: Array.isArray(savedState.vehicles) ? savedState.vehicles : [],
    students: Array.isArray(savedState.students) ? savedState.students.map(normalizeStudentEntry) : []
  });
}

export function saveCurrentGameState() {
  if (!state.currentUser || !state.currentGameState) {
    return;
  }

  const progressStore = loadProgressStore();
  progressStore[state.currentUser] = state.currentGameState;
  saveProgressStore(progressStore);
}

export function updateBalance() {
  elements.balanceLabel.textContent = formatMoney(state.currentGameState?.money ?? 0);
}

export function updateClock() {
  if (state.currentGameState?.time) {
    const totalMinutes = state.currentGameState.time.totalMinutes;
    const absoluteDay = Math.floor(totalMinutes / 1440);
    const minuteOfDay = totalMinutes % 1440;
    const hours = Math.floor(minuteOfDay / 60);
    const minutes = minuteOfDay % 60;
    const week = Math.floor(absoluteDay / 7) + 1;
    const day = (absoluteDay % 7) + 1;
    elements.clockLabel.textContent = `${translate(`schedule.dayName.${absoluteDay % 7}`)} | ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    elements.clockMetaLabel.textContent = translate("schedule.clockMeta", { week, day });
    return;
  }

  const now = new Date();
  elements.clockLabel.textContent = now.toLocaleTimeString(getLocale(state.currentLanguage), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  elements.clockMetaLabel.textContent = "";
}

export function startClock() {
  updateClock();
  if (state.clockTimer) {
    clearInterval(state.clockTimer);
  }
  state.clockTimer = window.setInterval(() => {
    if (state.currentGameState?.time) {
      const previousDay = Math.floor(state.currentGameState.time.totalMinutes / 1440);
      state.currentGameState.time.totalMinutes += state.currentGameState.time.speed;
      const currentDay = Math.floor(state.currentGameState.time.totalMinutes / 1440);
      state.clockTickListeners.forEach((listener) => {
        listener({
          didDayChange: previousDay !== currentDay,
          totalMinutes: state.currentGameState.time.totalMinutes
        });
      });
    }

    updateClock();
  }, 1000);
}

export function applyStaticTranslations() {
  document.documentElement.lang = state.currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = translate(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", translate(node.dataset.i18nPlaceholder));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", translate(node.dataset.i18nAriaLabel));
  });

  elements.languageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.language === state.currentLanguage);
  });
}

export function setTimeSpeed(speed) {
  if (!state.currentGameState?.time || ![1, 5, 15].includes(speed)) {
    return;
  }

  state.currentGameState.time.speed = speed;
}

export function subscribeToClockTicks(listener) {
  state.clockTickListeners.push(listener);
}
