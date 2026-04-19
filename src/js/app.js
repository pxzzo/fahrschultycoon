import { appShell, elements } from "./core/dom.js";
import { getBlueprintById } from "./core/content.js";
import {
  applyStaticTranslations,
  formatMoney,
  initializeLanguage,
  loadGameState,
  saveCurrentGameState,
  setAuthStatus,
  setSearchStatus,
  startClock,
  translate,
  updateBalance,
  updateClock
} from "./core/game-state.js";
import { saveLanguage } from "./core/i18n.js";
import { state } from "./core/state.js";
import { loadUsers, saveSession, saveUsers } from "./core/storage.js";
import { createInstructorsFeature } from "./features/instructors.js";
import { createScheduleFeature } from "./features/schedule.js";
import { createStudentsFeature } from "./features/students.js";
import { createVehiclesFeature } from "./features/vehicles.js";

initializeLanguage();

function getRequiredBlueprintId() {
  if (!state.currentGameState || state.currentGameState.tutorialCompleted) {
    return null;
  }

  if (state.currentGameState.tutorialStep === "officePlacement") {
    return "starter-office";
  }

  if (state.currentGameState.tutorialStep === "garagePlacement") {
    return "starter-garage";
  }

  return null;
}

function isInstructorTutorialStep() {
  return Boolean(state.currentGameState)
    && !state.currentGameState.tutorialCompleted
    && state.currentGameState.tutorialStep === "instructorHire";
}

function isVehicleTutorialStep() {
  return Boolean(state.currentGameState)
    && !state.currentGameState.tutorialCompleted
    && state.currentGameState.tutorialStep === "vehiclePurchase";
}

function isStudentTutorialStep() {
  return Boolean(state.currentGameState)
    && !state.currentGameState.tutorialCompleted
    && state.currentGameState.tutorialStep === "studentIntake";
}

const studentsFeature = createStudentsFeature({
  isStudentTutorialStep,
  onTutorialStudentComplete: () => {
    state.currentGameState.tutorialStep = "completed";
    state.currentGameState.tutorialCompleted = true;
    saveCurrentGameState();
    showTutorialCompletion();
  }
});

const instructorsFeature = createInstructorsFeature({
  isInstructorTutorialStep,
  onTutorialHireComplete: () => {
    state.currentGameState.tutorialStep = "vehicleIntro";
    state.currentGameState.tutorialCompleted = false;
    saveCurrentGameState();
    showVehicleTutorial();
  }
});

const vehiclesFeature = createVehiclesFeature({
  isVehicleTutorialStep,
  onTutorialVehicleComplete: () => {
    state.currentGameState.tutorialStep = "studentIntro";
    state.currentGameState.tutorialCompleted = false;
    saveCurrentGameState();
    showStudentTutorial();
  }
});

const scheduleFeature = createScheduleFeature({
  closeAllPanels,
  applyTheoryLessonBatch: studentsFeature.applyTheoryLessonBatch,
  applyPracticeLesson: studentsFeature.applyPracticeLesson,
  abortPracticeLesson: studentsFeature.abortPracticeLesson,
  refreshStudentsPanel: studentsFeature.renderPanel
});

function refreshBlueprintCards() {
  const office = getBlueprintById("starter-office");
  const garage = getBlueprintById("starter-garage");
  const requiredBlueprintId = getRequiredBlueprintId();

  elements.starterOfficeType.textContent = translate("building.typeLabel", { type: office.type });
  elements.starterOfficePrice.textContent = translate("building.priceLabel", { price: formatMoney(office.price) });
  elements.starterGarageType.textContent = translate("building.typeLabel", { type: garage.type });
  elements.starterGaragePrice.textContent = translate("building.priceLabel", { price: formatMoney(garage.price) });

  elements.blueprintButtons.forEach((button) => {
    const isRequired = requiredBlueprintId === button.dataset.blueprintId;
    const isLocked = Boolean(requiredBlueprintId) && !isRequired;

    button.disabled = isLocked;
    button.classList.toggle("is-recommended", isRequired);

    if (isLocked) {
      const requiredBlueprint = getBlueprintById(requiredBlueprintId);
      button.title = translate("building.selectionLocked", { building: requiredBlueprint?.name || "" });
    } else {
      button.removeAttribute("title");
    }
  });

  if (state.selectedBlueprintId) {
    const selected = getBlueprintById(state.selectedBlueprintId);
    if (selected) {
      elements.selectedOfficeName.textContent = selected.name;
      elements.selectedOfficeDescription.textContent = selected.shortDescription;
      elements.selectedOfficeType.textContent = translate("building.typeLabel", { type: selected.type });
      elements.selectedOfficePrice.textContent = translate("building.priceLabel", { price: formatMoney(selected.price) });
    }
  }
}

function getPlacementLabel() {
  if (!state.selectedPlacement) {
    return "";
  }

  if (state.selectedPlacement.labelKey) {
    return translate(state.selectedPlacement.labelKey);
  }

  return state.selectedPlacement.label;
}

function refreshPlacementStatus() {
  if (!state.selectedPlacement) {
    setSearchStatus("building.searchStatus.none");
    return;
  }

  setSearchStatus("building.searchStatus.selected", {
    label: getPlacementLabel(),
    lat: state.selectedPlacement.lat.toFixed(5),
    lng: state.selectedPlacement.lng.toFixed(5)
  });
}

function setPlacementLocation(lat, lng, { label = "", labelKey = "" } = {}) {
  state.selectedPlacement = { lat, lng, label, labelKey };

  if (!state.placementMarker && state.mapInstance) {
    state.placementMarker = L.marker([lat, lng], { draggable: true }).addTo(state.mapInstance);
    state.placementMarker.on("dragend", () => {
      const position = state.placementMarker.getLatLng();
      setPlacementLocation(position.lat, position.lng, { labelKey: "building.location.dragged" });
    });
  }

  state.placementMarker?.setLatLng([lat, lng]);
  refreshPlacementStatus();
}

function clearPlacementMarker() {
  if (state.placementMarker && state.mapInstance) {
    state.mapInstance.removeLayer(state.placementMarker);
  }

  state.placementMarker = null;
  state.selectedPlacement = null;
}

function renderBuildings() {
  if (!state.buildingsLayer || !state.currentGameState) {
    return;
  }

  state.buildingsLayer.clearLayers();

  state.currentGameState.buildings.forEach((building) => {
    const blueprint = getBlueprintById(building.blueprintId);
    const marker = L.marker([building.lat, building.lng]).bindPopup(
      `<strong>${blueprint?.name || building.name}</strong><br>${blueprint?.type || building.type}<br>${building.address || translate("building.locationSet")}`
    );

    state.buildingsLayer.addLayer(marker);
  });
}

function closeAllPanels() {
  elements.buildingsPanel.classList.add("hidden");
  elements.instructorsPanel.classList.add("hidden");
  elements.vehiclesPanel.classList.add("hidden");
  elements.studentsPanel.classList.add("hidden");
  elements.schedulePanel.classList.add("hidden");
  elements.buildingsMenuBtn.classList.remove("is-active");
  elements.instructorsMenuBtn.classList.remove("is-active");
  elements.vehiclesMenuBtn.classList.remove("is-active");
  elements.studentsMenuBtn.classList.remove("is-active");
}

function showBuildingSelection() {
  const requiredBlueprintId = getRequiredBlueprintId();
  const requiredBlueprint = requiredBlueprintId ? getBlueprintById(requiredBlueprintId) : null;

  state.selectedBlueprintId = null;
  clearPlacementMarker();
  closeAllPanels();
  elements.buildingsPanel.classList.remove("hidden");
  elements.buildingsMenuBtn.classList.add("is-active");
  elements.buildingsPanelTitle.textContent = translate("building.panelTitle.selection");
  elements.buildingSelection.classList.remove("hidden");
  elements.placementSection.classList.add("hidden");
  elements.buildingSelectionCopy.textContent = requiredBlueprint
    ? translate("building.selectionCopy.required", { building: requiredBlueprint.name })
    : translate("building.selectionCopy");
  setSearchStatus("building.searchStatus.none");
  refreshBlueprintCards();
}

function showPlacementSection() {
  if (!state.selectedBlueprintId) {
    return;
  }

  const blueprint = getBlueprintById(state.selectedBlueprintId);
  if (!blueprint) {
    return;
  }

  closeAllPanels();
  elements.buildingsPanel.classList.remove("hidden");
  elements.buildingsMenuBtn.classList.add("is-active");
  elements.buildingsPanelTitle.textContent = translate("building.panelTitle.location");
  elements.buildingSelection.classList.add("hidden");
  elements.placementSection.classList.remove("hidden");
  elements.selectedOfficeName.textContent = blueprint.name;
  elements.selectedOfficeDescription.textContent = blueprint.shortDescription;
  elements.selectedOfficeType.textContent = translate("building.typeLabel", { type: blueprint.type });
  elements.selectedOfficePrice.textContent = translate("building.priceLabel", { price: formatMoney(blueprint.price) });

  if (!state.selectedPlacement && state.mapInstance) {
    const center = state.mapInstance.getCenter();
    setPlacementLocation(center.lat, center.lng, { labelKey: "building.location.mapCenter" });
    return;
  }

  refreshPlacementStatus();
}

function openBuildingsPanel() {
  if (elements.placementSection.classList.contains("hidden") || !state.selectedBlueprintId) {
    showBuildingSelection();
    return;
  }

  showPlacementSection();
}

function openInstructorsPanel() {
  closeAllPanels();
  elements.instructorsPanel.classList.remove("hidden");
  elements.instructorsMenuBtn.classList.add("is-active");
  instructorsFeature.renderInstructorCandidates();
  instructorsFeature.renderInstructorTeam();
}

function openVehiclesPanel() {
  closeAllPanels();
  elements.vehiclesPanel.classList.remove("hidden");
  elements.vehiclesMenuBtn.classList.add("is-active");
  vehiclesFeature.renderVehicleShop();
  vehiclesFeature.renderVehicleFleet();
}

function openStudentsPanel() {
  closeAllPanels();
  elements.studentsPanel.classList.remove("hidden");
  elements.studentsMenuBtn.classList.add("is-active");
  studentsFeature.renderPanel();
}

function ensureMapWarningTranslated() {
  const warning = document.querySelector(".map-warning");
  if (!warning) {
    return;
  }
  warning.innerHTML = `<strong>${translate("warning.file.title")}</strong>${translate("warning.file.text")}`;
}

function initMap() {
  if (state.mapInstance || typeof L === "undefined") {
    return;
  }

  state.mapInstance = L.map(elements.map).setView([52.52, 13.405], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
    referrerPolicy: "strict-origin-when-cross-origin"
  }).addTo(state.mapInstance);

  state.buildingsLayer = L.layerGroup().addTo(state.mapInstance);
  state.practiceRouteLayer = L.layerGroup().addTo(state.mapInstance);
  state.practiceVehicleLayer = L.layerGroup().addTo(state.mapInstance);

  state.mapInstance.on("click", (event) => {
    if (!state.selectedBlueprintId || elements.placementSection.classList.contains("hidden")) {
      return;
    }

    setPlacementLocation(event.latlng.lat, event.latlng.lng, { labelKey: "building.location.mapClick" });
  });

  window.setTimeout(() => {
    state.mapInstance.invalidateSize();
  }, 0);
}

function showLocalFileWarning() {
  if (location.protocol !== "file:" || document.querySelector(".map-warning")) {
    ensureMapWarningTranslated();
    return;
  }

  const warning = document.createElement("div");
  warning.className = "map-warning";
  warning.innerHTML = `<strong>${translate("warning.file.title")}</strong>${translate("warning.file.text")}`;
  elements.map.parentElement.appendChild(warning);
}

function setTutorialModal({ titleKey, textKey, hintKey, primaryKey }) {
  elements.tutorialTitle.textContent = translate(titleKey);
  elements.tutorialText.textContent = translate(textKey);
  elements.tutorialHint.textContent = translate(hintKey);
  elements.tutorialPrimaryBtn.textContent = translate(primaryKey);
  elements.tutorialSecondaryBtn.classList.add("hidden");
  elements.tutorialModal.classList.remove("hidden");
}

function hideTutorialModal() {
  elements.tutorialModal.classList.add("hidden");
}

function showTutorialIntro() {
  state.tutorialMode = "intro";
  setTutorialModal({
    titleKey: "tutorial.intro.title",
    textKey: "tutorial.intro.text",
    hintKey: "tutorial.intro.hint",
    primaryKey: "tutorial.intro.primary"
  });
}

function showGarageTutorial() {
  state.tutorialMode = "garageIntro";
  setTutorialModal({
    titleKey: "tutorial.garage.title",
    textKey: "tutorial.garage.text",
    hintKey: "tutorial.garage.hint",
    primaryKey: "tutorial.garage.primary"
  });
}

function showInstructorTutorial() {
  state.tutorialMode = "instructorIntro";
  setTutorialModal({
    titleKey: "tutorial.instructor.title",
    textKey: "tutorial.instructor.text",
    hintKey: "tutorial.instructor.hint",
    primaryKey: "tutorial.instructor.primary"
  });
}

function showVehicleTutorial() {
  state.tutorialMode = "vehicleIntro";
  setTutorialModal({
    titleKey: "tutorial.vehicle.title",
    textKey: "tutorial.vehicle.text",
    hintKey: "tutorial.vehicle.hint",
    primaryKey: "tutorial.vehicle.primary"
  });
}

function showStudentTutorial() {
  state.tutorialMode = "studentIntro";
  setTutorialModal({
    titleKey: "tutorial.student.title",
    textKey: "tutorial.student.text",
    hintKey: "tutorial.student.hint",
    primaryKey: "tutorial.student.primary"
  });
}

function showTutorialCompletion() {
  state.tutorialMode = "completed";
  setTutorialModal({
    titleKey: "tutorial.completed.title",
    textKey: "tutorial.completed.text",
    hintKey: "tutorial.completed.hint",
    primaryKey: "tutorial.completed.primary"
  });
}

function refreshTutorialCopy() {
  if (elements.tutorialModal.classList.contains("hidden")) {
    return;
  }

  if (state.tutorialMode === "garageIntro") {
    showGarageTutorial();
    return;
  }

  if (state.tutorialMode === "instructorIntro") {
    showInstructorTutorial();
    return;
  }

  if (state.tutorialMode === "vehicleIntro") {
    showVehicleTutorial();
    return;
  }

  if (state.tutorialMode === "studentIntro") {
    showStudentTutorial();
    return;
  }

  if (state.tutorialMode === "completed") {
    showTutorialCompletion();
    return;
  }

  showTutorialIntro();
}

function startTutorialPlacement(step) {
  if (!state.currentGameState) {
    return;
  }

  state.selectedBlueprintId = null;
  clearPlacementMarker();
  elements.locationSearchInput.value = "";
  state.currentGameState.tutorialStep = step;
  saveCurrentGameState();
  hideTutorialModal();
  openBuildingsPanel();
}

function startInstructorHiringTutorial() {
  if (!state.currentGameState) {
    return;
  }

  state.currentGameState.tutorialStep = "instructorHire";
  saveCurrentGameState();
  hideTutorialModal();
  openInstructorsPanel();
}

function startVehiclePurchaseTutorial() {
  if (!state.currentGameState) {
    return;
  }

  state.currentGameState.tutorialStep = "vehiclePurchase";
  saveCurrentGameState();
  hideTutorialModal();
  openVehiclesPanel();
}

function startStudentIntakeTutorial() {
  if (!state.currentGameState) {
    return;
  }

  state.currentGameState.tutorialStep = "studentIntake";
  saveCurrentGameState();
  hideTutorialModal();
  openStudentsPanel();
}

async function searchLocation() {
  const query = elements.locationSearchInput.value.trim();
  if (!query) {
    setSearchStatus("building.searchStatus.empty", {}, true);
    return;
  }

  setSearchStatus("building.searchStatus.searching");

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      throw new Error("search failed");
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      setSearchStatus("building.searchStatus.noResults", {}, true);
      return;
    }

    const match = results[0];
    const lat = Number(match.lat);
    const lng = Number(match.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setSearchStatus("building.searchStatus.invalidCoordinates", {}, true);
      return;
    }

    setPlacementLocation(lat, lng, { label: match.display_name || query });
    state.mapInstance?.setView([lat, lng], 15);
  } catch {
    setSearchStatus("building.searchStatus.unavailable", {}, true);
  }
}

function completeBuildForTutorial(blueprintId) {
  if (!state.currentGameState || state.currentGameState.tutorialCompleted) {
    return false;
  }

  if (state.currentGameState.tutorialStep === "officePlacement" && blueprintId === "starter-office") {
    state.currentGameState.tutorialStep = "garageIntro";
    state.currentGameState.tutorialCompleted = false;
    saveCurrentGameState();
    showGarageTutorial();
    return true;
  }

  if (state.currentGameState.tutorialStep === "garagePlacement" && blueprintId === "starter-garage") {
    state.currentGameState.tutorialStep = "instructorIntro";
    state.currentGameState.tutorialCompleted = false;
    saveCurrentGameState();
    showInstructorTutorial();
    return true;
  }

  return false;
}

function buildSelectedBuilding() {
  const blueprint = state.selectedBlueprintId ? getBlueprintById(state.selectedBlueprintId) : null;

  if (!state.currentGameState || !blueprint || !state.selectedPlacement) {
    setSearchStatus("building.searchStatus.chooseLocationFirst", {}, true);
    return;
  }

  if (state.currentGameState.money < blueprint.price) {
    setSearchStatus("building.searchStatus.notEnoughMoney", {}, true);
    return;
  }

  const confirmed = window.confirm(
    translate("building.buildConfirm", {
      name: blueprint.name,
      price: formatMoney(blueprint.price)
    })
  );

  if (!confirmed) {
    return;
  }

  state.currentGameState.money -= blueprint.price;
  state.currentGameState.buildings.push({
    id: `${Date.now()}`,
    blueprintId: blueprint.id,
    name: blueprint.name,
    type: blueprint.type,
    classroomCapacity: blueprint.classroomCapacity || 0,
    price: blueprint.price,
    address: getPlacementLabel(),
    lat: state.selectedPlacement.lat,
    lng: state.selectedPlacement.lng,
    availabilitySchedule: [
      { day: 0, start: 7 * 60, end: 21 * 60 },
      { day: 1, start: 7 * 60, end: 21 * 60 },
      { day: 2, start: 7 * 60, end: 21 * 60 },
      { day: 3, start: 7 * 60, end: 21 * 60 },
      { day: 4, start: 7 * 60, end: 21 * 60 },
      { day: 5, start: 8 * 60, end: 17 * 60 }
    ]
  });

  updateBalance();
  renderBuildings();
  closeAllPanels();
  clearPlacementMarker();
  state.selectedBlueprintId = null;
  elements.locationSearchInput.value = "";

  const handledByTutorial = completeBuildForTutorial(blueprint.id);
  saveCurrentGameState();

  if (!handledByTutorial) {
    hideTutorialModal();
  }
}

function handleTutorialPrimaryAction() {
  if (state.tutorialMode === "intro") {
    startTutorialPlacement("officePlacement");
    return;
  }

  if (state.tutorialMode === "garageIntro") {
    startTutorialPlacement("garagePlacement");
    return;
  }

  if (state.tutorialMode === "instructorIntro") {
    startInstructorHiringTutorial();
    return;
  }

  if (state.tutorialMode === "vehicleIntro") {
    startVehiclePurchaseTutorial();
    return;
  }

  if (state.tutorialMode === "studentIntro") {
    startStudentIntakeTutorial();
    return;
  }

  hideTutorialModal();
}

function showAuthMode(mode) {
  const loginMode = mode === "login";
  elements.loginForm.classList.toggle("hidden", !loginMode);
  elements.registerForm.classList.toggle("hidden", loginMode);
  elements.showLoginBtn.classList.toggle("active", loginMode);
  elements.showRegisterBtn.classList.toggle("active", !loginMode);
  setAuthStatus(loginMode ? "auth.status.loginPrompt" : "auth.status.registerPrompt");
}

function enterGame(username) {
  state.currentUser = username;
  state.currentGameState = loadGameState(username, studentsFeature.normalizeStudentEntry);
  scheduleFeature.normalizeGameState(state.currentGameState);
  state.currentStudentFilter = "applicants";

  appShell?.classList.add("game-shell");
  elements.authScreen.classList.add("hidden");
  elements.gameScreen.classList.remove("hidden");
  setAuthStatus("auth.status.welcomeBack", { username });

  startClock();
  showLocalFileWarning();
  initMap();
  updateBalance();
  refreshBlueprintCards();
  renderBuildings();
  scheduleFeature.renderPracticeMapOverlay();
  instructorsFeature.renderInstructorCandidates();
  instructorsFeature.renderInstructorTeam();
  vehiclesFeature.renderVehicleShop();
  vehiclesFeature.renderVehicleFleet();
  studentsFeature.renderPanel();
  scheduleFeature.renderSpeedButtons();

  if (!state.currentGameState.tutorialCompleted) {
    if (state.currentGameState.tutorialStep === "garageIntro") {
      showGarageTutorial();
      return;
    }

    if (state.currentGameState.tutorialStep === "instructorIntro") {
      showInstructorTutorial();
      return;
    }

    if (state.currentGameState.tutorialStep === "vehicleIntro") {
      showVehicleTutorial();
      return;
    }

    if (state.currentGameState.tutorialStep === "studentIntro") {
      showStudentTutorial();
      return;
    }

    if (state.currentGameState.tutorialStep === "officePlacement" || state.currentGameState.tutorialStep === "garagePlacement") {
      hideTutorialModal();
      openBuildingsPanel();
      return;
    }

    if (state.currentGameState.tutorialStep === "instructorHire") {
      hideTutorialModal();
      openInstructorsPanel();
      return;
    }

    if (state.currentGameState.tutorialStep === "vehiclePurchase") {
      hideTutorialModal();
      openVehiclesPanel();
      return;
    }

    if (state.currentGameState.tutorialStep === "studentIntake") {
      hideTutorialModal();
      openStudentsPanel();
      return;
    }

    showTutorialIntro();
    return;
  }

  hideTutorialModal();
}

function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(elements.loginForm);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const users = loadUsers();
  const user = users.find((entry) => entry.username.toLowerCase() === username.toLowerCase());

  if (!user || user.password !== password) {
    setAuthStatus("auth.status.loginFailed");
    return;
  }

  saveSession(user.username);
  enterGame(user.username);
}

function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(elements.registerForm);
  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (username.length < 3) {
    setAuthStatus("auth.status.usernameMin");
    return;
  }

  if (password.length < 4) {
    setAuthStatus("auth.status.passwordMin");
    return;
  }

  const users = loadUsers();
  const exists = users.some((entry) => entry.username.toLowerCase() === username.toLowerCase());

  if (exists) {
    setAuthStatus("auth.status.usernameExists");
    return;
  }

  users.push({ username, email, password });
  saveUsers(users);
  saveSession(username);
  elements.registerForm.reset();
  enterGame(username);
}

function applyTranslations() {
  applyStaticTranslations();
  updateClock();
  updateBalance();
  refreshBlueprintCards();
  setAuthStatus(state.lastAuthStatus.key, state.lastAuthStatus.params);
  setSearchStatus(state.lastSearchStatus.key, state.lastSearchStatus.params, state.lastSearchStatus.isError);
  instructorsFeature.renderInstructorCandidates();
  instructorsFeature.renderInstructorTeam();
  vehiclesFeature.renderVehicleShop();
  vehiclesFeature.renderVehicleFleet();
  studentsFeature.renderPanel();
  scheduleFeature.renderSpeedButtons();

  if (!elements.buildingsPanel.classList.contains("hidden")) {
    if (state.selectedBlueprintId) {
      showPlacementSection();
    } else {
      showBuildingSelection();
    }
  }

  if (!elements.instructorsPanel.classList.contains("hidden")) {
    openInstructorsPanel();
  }

  if (!elements.vehiclesPanel.classList.contains("hidden")) {
    openVehiclesPanel();
  }

  if (!elements.studentsPanel.classList.contains("hidden")) {
    openStudentsPanel();
  }

  if (!elements.schedulePanel.classList.contains("hidden")) {
    scheduleFeature.openPanel();
  }

  renderBuildings();
  scheduleFeature.renderPracticeMapOverlay();
  ensureMapWarningTranslated();
  refreshTutorialCopy();
}

function setLanguage(language) {
  if (language === state.currentLanguage) {
    return;
  }

  state.currentLanguage = language;
  saveLanguage(language);
  applyTranslations();
}

function initAuth() {
  const existingSession = localStorage.getItem("drive-academy-session");

  if (existingSession) {
    enterGame(existingSession);
    return;
  }

  state.currentUser = null;
  state.currentGameState = null;
  appShell?.classList.remove("game-shell");
  hideTutorialModal();
  showAuthMode("login");
}

elements.showLoginBtn.addEventListener("click", () => showAuthMode("login"));
elements.showRegisterBtn.addEventListener("click", () => showAuthMode("register"));
elements.loginForm.addEventListener("submit", handleLogin);
elements.registerForm.addEventListener("submit", handleRegister);
elements.buildingsMenuBtn.addEventListener("click", openBuildingsPanel);
elements.instructorsMenuBtn.addEventListener("click", openInstructorsPanel);
elements.vehiclesMenuBtn.addEventListener("click", openVehiclesPanel);
elements.studentsMenuBtn.addEventListener("click", openStudentsPanel);
elements.closeBuildingsPanelBtn.addEventListener("click", closeAllPanels);
elements.closeInstructorsPanelBtn.addEventListener("click", closeAllPanels);
elements.closeVehiclesPanelBtn.addEventListener("click", closeAllPanels);
elements.closeStudentsPanelBtn.addEventListener("click", closeAllPanels);
elements.tutorialPrimaryBtn.addEventListener("click", handleTutorialPrimaryAction);
elements.blueprintButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }

    state.selectedBlueprintId = button.dataset.blueprintId;
    showPlacementSection();
  });
});
elements.searchLocationBtn.addEventListener("click", searchLocation);
elements.locationSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchLocation();
  }
});
elements.buildOfficeBtn.addEventListener("click", buildSelectedBuilding);
instructorsFeature.bindEvents();
vehiclesFeature.bindEvents();
studentsFeature.bindEvents();
scheduleFeature.bindEvents();
elements.languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

applyTranslations();
initAuth();
