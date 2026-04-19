import { elements } from "../core/dom.js";
import { getLocalizedInstructor, getLocalizedVehicle, getVehicleById, vehicleCatalog } from "../core/content.js";
import { formatMoney, saveCurrentGameState, translate, updateBalance } from "../core/game-state.js";
import { state } from "../core/state.js";

export function createVehiclesFeature({ isVehicleTutorialStep, onTutorialVehicleComplete }) {
  function renderVehicleFleet() {
    if (!state.currentGameState) {
      elements.vehicleFleetList.innerHTML = "";
      return;
    }

    if (state.currentGameState.vehicles.length === 0) {
      elements.vehicleFleetList.innerHTML = `<div class="team-entry">${translate("vehicle.fleetEmpty")}</div>`;
      return;
    }

    elements.vehicleFleetList.innerHTML = state.currentGameState.vehicles.map((entry) => {
      const vehicle = getLocalizedVehicle(entry.id);
      const assignedInstructor = entry.assignedInstructorId ? getLocalizedInstructor(entry.assignedInstructorId) : null;
      return `
        <div class="team-entry">
          <strong>${vehicle?.name || entry.id}</strong>
          <div class="team-entry-meta">
            <span>${translate("vehicle.specs", {
              transmission: vehicle?.transmission || "",
              fuel: vehicle?.fuel || "",
              seats: vehicle?.seats || 0
            })}</span>
            <span>${assignedInstructor
              ? translate("vehicle.assignedTo", { instructor: assignedInstructor.name })
              : translate("vehicle.unassigned")}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderVehicleShop() {
    const hasInstructors = (state.currentGameState?.instructors || []).length > 0;
    const required = isVehicleTutorialStep();

    elements.vehicleShopList.innerHTML = vehicleCatalog.map((vehicle) => {
      const localizedVehicle = getLocalizedVehicle(vehicle.id);
      const owned = (state.currentGameState?.vehicles || []).some((entry) => entry.id === vehicle.id);
      const instructorOptions = (state.currentGameState?.instructors || []).map((entry) => {
        const instructor = getLocalizedInstructor(entry.id);
        return `<option value="${entry.id}">${instructor?.name || entry.id}</option>`;
      }).join("");

      return `
        <article class="building-card candidate-card">
          <strong>${localizedVehicle.name}</strong>
          <p>${localizedVehicle.description}</p>
          <div class="candidate-stats">
            <span>${translate("vehicle.price", { price: formatMoney(vehicle.price) })}</span>
            <span>${translate("vehicle.specs", {
              transmission: localizedVehicle.transmission,
              fuel: localizedVehicle.fuel,
              seats: vehicle.seats
            })}</span>
          </div>
          <div class="candidate-actions-inline">
            <select class="inline-select" data-vehicle-assign="${vehicle.id}" ${owned || !hasInstructors ? "disabled" : ""}>
              <option value="">${translate("vehicle.assignNone")}</option>
              ${instructorOptions}
            </select>
            <button class="${owned ? "secondary-button" : "primary-button"}" type="button" data-buy-vehicle-id="${vehicle.id}" ${owned || !hasInstructors ? "disabled" : ""}>
              ${owned ? translate("vehicle.ownedBadge") : translate("vehicle.buyButton")}
            </button>
          </div>
        </article>
      `;
    }).join("");

    elements.vehiclesPanelCopy.textContent = required
      ? translate("vehicle.panelCopy.required")
      : translate("vehicle.panelCopy");
  }

  function buyVehicle(vehicleId, assignedInstructorId) {
    if (!state.currentGameState) {
      return;
    }

    const vehicle = getLocalizedVehicle(vehicleId);
    const baseVehicle = getVehicleById(vehicleId);
    const instructor = assignedInstructorId ? getLocalizedInstructor(assignedInstructorId) : null;

    if (!vehicle || !baseVehicle) {
      return;
    }

    if (!assignedInstructorId || !instructor) {
      window.alert(translate("vehicle.buyMissingInstructor"));
      return;
    }

    const alreadyOwned = state.currentGameState.vehicles.some((entry) => entry.id === vehicleId);
    if (alreadyOwned) {
      return;
    }

    if (state.currentGameState.money < baseVehicle.price) {
      window.alert(translate("vehicle.buyNotEnoughMoney"));
      return;
    }

    const confirmed = window.confirm(
      translate("vehicle.buyConfirm", {
        name: vehicle.name,
        price: formatMoney(baseVehicle.price),
        instructor: instructor.name
      })
    );

    if (!confirmed) {
      return;
    }

    state.currentGameState.money -= baseVehicle.price;
    state.currentGameState.vehicles.push({
      id: vehicleId,
      assignedInstructorId,
      availabilitySchedule: [
        { day: 0, start: 7 * 60, end: 21 * 60 },
        { day: 1, start: 7 * 60, end: 21 * 60 },
        { day: 2, start: 7 * 60, end: 21 * 60 },
        { day: 3, start: 7 * 60, end: 21 * 60 },
        { day: 4, start: 7 * 60, end: 21 * 60 },
        { day: 5, start: 9 * 60, end: 17 * 60 }
      ]
    });
    updateBalance();
    renderVehicleShop();
    renderVehicleFleet();

    if (isVehicleTutorialStep()) {
      onTutorialVehicleComplete();
      return;
    }

    saveCurrentGameState();
  }

  function bindEvents() {
    elements.vehicleShopList.addEventListener("click", (event) => {
      const target = event.target.closest("[data-buy-vehicle-id]");
      if (!target) {
        return;
      }

      const vehicleId = target.dataset.buyVehicleId;
      const select = elements.vehicleShopList.querySelector(`[data-vehicle-assign="${vehicleId}"]`);
      buyVehicle(vehicleId, select?.value || "");
    });
  }

  return {
    bindEvents,
    buyVehicle,
    renderVehicleFleet,
    renderVehicleShop
  };
}
