let map;
let tempMarker = null;
let clickCallback = null;

export function initMap() {
  map = L.map("map").setView([52.52, 13.405], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 18,
  }).addTo(map);

  // Kartenklick für Positionen
  map.on("click", (e) => {
    if (clickCallback) {
      const { lat, lng } = e.latlng;

      // Temporären Marker setzen/ersetzen
      if (tempMarker) {
        tempMarker.setLatLng([lat, lng]);
      } else {
        tempMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
      }

      // Callback an Modul übergeben (z. B. buildings.js)
      clickCallback({ lat, lng });
    }
  });
}

export function enableClickToSelectLocation(callback) {
  clickCallback = callback;
}

export function getMapInstance() {
  return map;
}

export function clearTempMarker() {
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}
