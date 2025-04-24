import {
  enableClickToSelectLocation,
  clearTempMarker,
  getMapInstance,
} from "./map.js";

import { openBuildingModal, openGarageModal } from "./garageModal.js";

let selectedCoords = null;
let buildings = [];
let buildMenuOpen = false;

export function initBuildingSystem() {
  const gebaeudeBox = document.querySelector(".box:nth-child(3)");
  gebaeudeBox.style.position = "relative";
  gebaeudeBox.style.overflow = "hidden";

  gebaeudeBox.innerHTML = `
      <button id="open-building-menu" style="margin: 10px;">🏗️ Gebäude bauen</button>
      <div id="building-menu" style="
        display: none;
        position: absolute;
        top: 10px;
        right: 10px;
        background: #333;
        padding: 10px;
        border-radius: 8px;
        z-index: 999;
      ">
        <h4>🏢 Gebäude bauen</h4>
        <select id="building-type">
          <option value="garage">🚗 Garage</option>
          <option value="schule">📚 Theorieraum</option>
        </select><br><br>
  
        <input type="text" id="building-address" placeholder="Karte klicken oder Adresse eingeben"><br><br>
        <button id="confirm-position">📍 Position</button>
        <button id="cancel-building">❌</button>
      </div>
  
      <div style="margin-top: 120px;">
        <p><strong>Deine Gebäude:</strong></p>
        <ul id="building-list" style="font-size: 0.9rem;"></ul>
      </div>
    `;

  document
    .getElementById("open-building-menu")
    .addEventListener("click", () => {
      document.getElementById("building-menu").style.display = "block";
      buildMenuOpen = true;
    });

  document
    .getElementById("confirm-position")
    .addEventListener("click", handleBuildingConfirm);
  document.getElementById("cancel-building").addEventListener("click", () => {
    clearTempMarker();
    selectedCoords = null;
    document.getElementById("building-menu").style.display = "none";
    buildMenuOpen = false;
  });

  enableClickToSelectLocation((coords) => {
    selectedCoords = coords;
    document.getElementById("building-address").value = `${coords.lat.toFixed(
      5
    )}, ${coords.lng.toFixed(5)}`;
  });

  fetchBuildingsFromDB();
}

async function handleBuildingConfirm() {
  if (!selectedCoords)
    return alert("Bitte zuerst Position auf der Karte wählen!");
  const type = document.getElementById("building-type").value;

  const building = {
    type,
    lat: selectedCoords.lat,
    lng: selectedCoords.lng,
    vehicles: [],
  };

  const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:5000/api/buildings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(building),
  });

  const data = await res.json();
  if (data.success) {
    buildings.push(data.building);
    renderBuildings();
    clearTempMarker();
    document.getElementById("building-address").value = "";
    document.getElementById("building-menu").style.display = "none";
    buildMenuOpen = false;
  } else {
    alert(data.msg);
  }
}

function renderBuildings() {
  const map = getMapInstance();
  const container = document.getElementById("building-list");
  container.innerHTML = "";

  buildings.forEach((building, index) => {
    const isGarage = building.type === "garage";
    const icon = isGarage ? "🚗" : "🏫";

    building.index = index; // für Fahrzeugkauf wichtig

    const wrapper = document.createElement("div");
    wrapper.className = "building-entry";

    wrapper.innerHTML = `
        <div class="building-header" style="cursor:pointer; background:#333; padding:5px 10px; border-radius:6px;">
          ${icon} ${building.name || (isGarage ? "Garage" : "Schule")}
          <span style="float:right;">${isGarage ? "▼" : ""}</span>
        </div>
        <div class="vehicle-list" style="display:none; padding-left:10px; font-size:0.85rem;">
          ${isGarage ? generateVehicleListHTML(building.vehicles || []) : ""}
        </div>
      `;

    const header = wrapper.querySelector(".building-header");
    const list = wrapper.querySelector(".vehicle-list");

    if (isGarage) {
      header.addEventListener("click", () => {
        list.style.display = list.style.display === "none" ? "block" : "none";
      });

      header.addEventListener("dblclick", () => openGarageModal(building));
    }

    container.appendChild(wrapper);

    // Marker
    const label = isGarage ? "🚗 Garage" : "🏫 Schule";
    L.marker([building.lat, building.lng])
      .addTo(map)
      .bindPopup(label)
      .on("click", () => {
        if (isGarage) openGarageModal(building);
        if (!isGarage) openBuildingModal(building);
      });
  });
}

function generateVehicleListHTML(vehicles) {
  if (!vehicles.length) return "<i>Keine Fahrzeuge</i>";
  return vehicles
    .map(
      (v) => `
        <div style="margin:2px 0; background:#222; padding:4px; border-radius:4px;">
          ${v.name} (${v.type})
        </div>`
    )
    .join("");
}

export async function fetchBuildingsFromDB() {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:5000/api/buildings", {
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  if (res.status !== 200) {
    console.warn("🔒 Zugriff verweigert – bist du eingeloggt?");
    return;
  }

  const data = await res.json();
  buildings = data.buildings || [];
  renderBuildings();
}

export function getBuildings() {
  return buildings;
}
