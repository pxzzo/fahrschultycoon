import { getMapInstance } from "./map.js";
import { getBuildings } from "./buildings.js";

const FIRST_NAMES = ["Max", "Lena", "Tim", "Sophie", "Jonas", "Mia"];
const LAST_NAMES = [
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Becker",
];

export const studentStates = [
  "fahrschüler angenommen",
  "dokumente erhalten",
  "theoriestunden ausstehend",
  "theoriestunden",
  "theoriestunden abgeschlossen",
  "theorieprüfung ausstehend",
  "theorieprüfung",
  "theorieprüfung bestanden",
  "praxisstunden ausstehend",
  "praxisstunden",
  "praxisstunden abgeschlossen",
  "praxisprüfung ausstehend",
  "praxisprüfung",
  "praxisprüfung bestanden",
  "führerschein erhalten",
];

export let aktiveSchueler = [];
let anfragen = [];

// Initialisierung
export function initStudentSystem() {
  const boxAnfragen = document.querySelector("#box-anfragen");
  const boxSchueler = document.querySelector("#box-schueler");

  boxAnfragen.innerHTML =
    "<h4>📥 Neue Anfragen</h4><ul id='anfrage-liste'></ul>";
  boxSchueler.innerHTML = "<h4>👨‍🎓 Fahrschüler</h4><p>Wird geladen...</p>";

  loadStudentsFromDB(); // 🔁 DB-Laden
  setTimeout(() => {
    generateNewStudent(); // Neue Anfrage erzeugen
  }, 300);
}

// Schüler automatisch erzeugen
async function generateNewStudent() {
  const verfuegbareTypen = getVerfuegbareKlassen();
  if (verfuegbareTypen.length === 0) return;

  const type = rand(verfuegbareTypen);
  const name = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;
  const age = rand(17, 35);
  const coords = getRandomGarageCoords();
  const address = await reverseGeocode(coords.lat, coords.lng);

  const student = {
    name,
    age,
    address,
    type,
    coords,
    status: "fahrschüler angenommen",
    statusIndex: 0,
  };

  anfragen.push(student);
  renderAnfragen();
}

// Anfrage-Liste anzeigen
function renderAnfragen() {
  const list = document.getElementById("anfrage-liste");
  list.innerHTML = "";

  anfragen.forEach((s, index) => {
    const li = document.createElement("li");
    li.textContent = `${s.name}, ${s.type}`;
    li.style.cursor = "pointer";
    li.onclick = () => showStudentRequestDetail(index);
    list.appendChild(li);
  });
}

// Anfrage-Details anzeigen
function showStudentRequestDetail(index) {
  const s = anfragen[index];
  const box = document.querySelector("#box-schueler");

  box.innerHTML = `
    <h4>👤 Fahrschüler ansehen</h4>
    <p><b>Name:</b> ${s.name}</p>
    <p><b>Alter:</b> ${s.age}</p>
    <p><b>Adresse:</b> ${s.address}</p>
    <p><b>Typ:</b> ${s.type}</p>
    <button id="accept-student">✅ Annehmen</button>
  `;

  document.getElementById("accept-student").onclick = () =>
    acceptStudent(index);
}

// Schüler aktivieren
function acceptStudent(index) {
  const s = anfragen.splice(index, 1)[0];
  aktiveSchueler.push(s);
  saveStudentToDB(s);
  renderAnfragen();
  renderAktiveSchueler();
  placeStudentOnMap(s);
  setupAutoTransition(s, aktiveSchueler.length - 1);
}

// Aktive Schüler anzeigen
export function renderAktiveSchueler() {
  const box = document.querySelector("#box-schueler");

  if (aktiveSchueler.length === 0) {
    box.innerHTML = "<h4>👨‍🎓 Fahrschüler</h4><p>Keine aktiven Schüler</p>";
    return;
  }

  box.innerHTML = "<h4>👨‍🎓 Aktive Schüler</h4>";
  const list = document.createElement("ul");

  aktiveSchueler.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${s.name} – <b>${s.status}</b>`;
    li.style.cursor = "pointer";
    li.onclick = () => showStudentDetails(s, i);
    list.appendChild(li);
  });

  box.appendChild(list);
}

// Detailansicht mit Status-Fortschritt
function showStudentDetails(student, index) {
  const box = document.querySelector("#box-schueler");

  let content = `
      <h4>👨‍🎓 ${student.name}</h4>
      <p><b>Führerscheinklasse:</b> ${student.type}</p>
      <p><b>Status:</b> ${student.status}</p>
      <progress max="${studentStates.length - 1}" value="${
    student.statusIndex
  }"></progress><br/><br/>
    `;

  // 📄 Wenn Dokumente abgeben möglich:
  if (student.status === "dokumente erhalten") {
    content += `
        <button id="confirm-documents">📄 Dokumente einsammeln</button>
      `;
  }

  box.innerHTML = content;

  // Event-Handler für Dokumente
  if (student.status === "dokumente erhalten") {
    document.getElementById("confirm-documents").onclick = () => {
      student.status = "theoriestunden ausstehend";
      student.statusIndex = studentStates.indexOf("theoriestunden ausstehend");
      saveStudentStatus(index, student.status, student.statusIndex);
      renderAktiveSchueler();
    };
  }

  // Alternativ: normaler Fortschritt
  if (student.status !== "dokumente erhalten") {
    document.getElementById("next-status").onclick = () => {
      nextStudentStatus(student);
      renderAktiveSchueler();
    };
  }
}

// Schüler auf Karte anzeigen
function placeStudentOnMap(s) {
  const marker = L.marker([s.coords.lat, s.coords.lng]).addTo(getMapInstance());
  marker.bindPopup(`👨‍🎓 ${s.name}<br/>${s.status}`);
}

// Hilfsfunktionen
function rand(arrOrMin, max) {
  if (Array.isArray(arrOrMin))
    return arrOrMin[Math.floor(Math.random() * arrOrMin.length)];
  return Math.floor(Math.random() * (max - arrOrMin + 1)) + arrOrMin;
}

function getVerfuegbareKlassen() {
  const buildings = getBuildings();
  const fahrzeugTypen = new Set();

  buildings.forEach((b) => {
    if (b.type === "garage" && Array.isArray(b.vehicles)) {
      b.vehicles.forEach((v) => {
        fahrzeugTypen.add(getFahrerlaubnisklasse(v));
      });
    }
  });

  return [...fahrzeugTypen];
}

function getFahrerlaubnisklasse(vehicle) {
  const typ = vehicle.type?.toLowerCase() || "";

  if (typ.includes("auto") || typ.includes("pkw") || typ.includes("van"))
    return "B";
  if (
    typ.includes("roller") ||
    typ.includes("motorrad") ||
    typ.includes("zweirad")
  )
    return "A";
  if (typ.includes("klein")) return "AM";
  return "B";
}

function getRandomGarageCoords() {
  const garagen = getBuildings().filter((b) => b.type === "garage");
  if (garagen.length === 0) return randomBerlinCoords();
  const g = garagen[Math.floor(Math.random() * garagen.length)];
  return randomNearbyCoords(g.lat, g.lng, 5);
}

function randomNearbyCoords(lat, lng, radiusKm = 0.5) {
  const r = radiusKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const dx = w * Math.cos(t);
  const dy = w * Math.sin(t);
  return { lat: lat + dy, lng: lng + dx };
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.display_name || "Adresse nicht gefunden";
}

const autoTransitions = {
  "fahrschüler angenommen": "dokumente erhalten",
  "theoriestunden abgeschlossen": "theorieprüfung ausstehend",
  "theorieprüfung bestanden": "praxisstunden ausstehend",
  "praxisstunden abgeschlossen": "praxisprüfung ausstehend",
  "praxisprüfung bestanden": "führerschein erhalten",
};

function setupAutoTransition(student, index) {
  const next = autoTransitions[student.status];
  if (!next) return;

  setTimeout(() => {
    // Nur fortsetzen, wenn Status noch gleich
    if (aktiveSchueler[index]?.status === student.status) {
      const nextIndex = studentStates.indexOf(next);
      student.status = next;
      student.statusIndex = nextIndex;

      saveStudentStatus(index, next, nextIndex); // DB-Update
      renderAktiveSchueler(); // UI aktualisieren
    }
  }, 60000); // 1 Minute
}

async function saveStudentToDB(student) {
  const token = localStorage.getItem("token");
  await fetch("http://localhost:5000/api/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(student),
  });
}

export async function saveStudentStatus(index, status, statusIndex) {
  const token = localStorage.getItem("token");
  await fetch(`http://localhost:5000/api/students/${index}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ status, statusIndex }),
  });
}

export async function loadStudentsFromDB() {
  const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:5000/api/students", {
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  const data = await res.json();
  aktiveSchueler = data.students || [];

  // Karte + Liste aufbauen
  aktiveSchueler.forEach((s, index) => {
    placeStudentOnMap(s);
    setupAutoTransition(s, index);
  });

  renderAktiveSchueler();
}
