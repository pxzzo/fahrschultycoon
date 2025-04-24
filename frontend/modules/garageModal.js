import { availableVehicles } from "../data/vehicles.js";
import { aktiveSchueler } from "./students.js";
import { studentStates } from "./students.js";
import { renderAktiveSchueler } from "./students.js";
import { saveStudentStatus } from "./students.js";

export function openGarageModal(garage) {
  const modal = document.createElement("div");
  modal.id = "garage-modal";
  modal.innerHTML = `
    <div id="garage-modal-content">
      <h2>🚗 Garage: ${garage.name || "Unbenannt"}</h2>
      <label>Name ändern:</label><br/>
      <input id="garage-name" value="${garage.name || ""}" /><br/><br/>
      
      <button id="save-name">💾 Speichern</button>
      <button id="toggle-market">🛒 Fahrzeug kaufen</button>
      <button id="delete-building">🗑️ Gebäude abreißen</button>
      <button id="close-modal">❌ Schließen</button>

      <div id="vehicle-market" style="margin-top:20px; display:none;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("close-modal").onclick = () => modal.remove();

  document.getElementById("save-name").onclick = () => {
    garage.name = document.getElementById("garage-name").value;
    alert("Name gespeichert (Demo)");
    modal.remove();
  };

  document.getElementById("delete-building").onclick = async () => {
    const confirmDelete = confirm(
      "Bist du sicher, dass du dieses Gebäude löschen möchtest?"
    );
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");
    const res = await fetch(
      `http://localhost:5000/api/buildings/${garage.index}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    const data = await res.json();
    if (data.success) {
      alert("Gebäude erfolgreich entfernt.");
      modal.remove();
      renderBuildings(); // Marker und Übersicht neu aufbauen
    } else {
      alert("Fehler beim Entfernen.");
    }
  };

  document.getElementById("toggle-market").onclick = () => {
    const market = document.getElementById("vehicle-market");
    market.style.display = market.style.display === "none" ? "block" : "none";
    if (market.innerHTML === "") {
      renderVehicleMarket(market, garage);
    }
  };
}

function renderVehicleMarket(container, garage) {
  container.innerHTML = "<h3>🛒 Fahrzeugmarkt</h3>";

  availableVehicles.forEach((v) => {
    const item = document.createElement("div");
    item.style.marginBottom = "10px";
    item.style.borderBottom = "1px solid #555";
    item.style.paddingBottom = "10px";

    item.innerHTML = `
      <strong>${v.name}</strong><br/>
      Typ: ${v.type} | Preis: €${v.price.toLocaleString()}<br/>
      <button>🚗 Kaufen</button>
    `;

    const button = item.querySelector("button");
    button.onclick = async () => {
      const token = localStorage.getItem("token");

      const vehicle = {
        ...v,
        assignedGarage: garage.name || "Unbenannt",
        id: `${v.id}-${Date.now()}`,
      };

      const res = await fetch(
        `http://localhost:5000/api/buildings/vehicle/${garage.index}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ vehicle }),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(`${v.name} wurde erfolgreich gekauft und gespeichert ✅`);
        container.innerHTML += `<p style="color:lime;">${v.name} erfolgreich gekauft</p>`;
      } else {
        alert("Fehler beim Speichern");
      }
    };

    container.appendChild(item);
  });
}

export function openBuildingModal(building) {
  const modal = document.createElement("div");
  modal.id = "garage-modal";
  modal.innerHTML = `
      <div id="garage-modal-content">
        <h2>🏫 Schule: ${building.name || "Unbenannt"}</h2>
        <label>Name ändern:</label><br/>
        <input id="garage-name" value="${building.name || ""}" /><br/><br/>
        
        <button id="save-name">💾 Speichern</button>
        <button id="start-theory">📘 Theoriekurs starten</button>
        <button id="delete-building">🗑️ Gebäude abreißen</button>
        <button id="close-modal">❌ Schließen</button>
  
        <div id="vehicle-market" style="margin-top:20px; display:none;"></div>
      </div>
    `;

  document.body.appendChild(modal);

  document.getElementById("close-modal").onclick = () => modal.remove();

  document.getElementById("save-name").onclick = () => {
    building.name = document.getElementById("garage-name").value;
    alert("Name gespeichert (Demo)");
    modal.remove();
  };

  document.getElementById("delete-building").onclick = async () => {
    const confirmDelete = confirm(
      "Bist du sicher, dass du dieses Gebäude löschen möchtest?"
    );
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");
    const res = await fetch(
      `http://localhost:5000/api/buildings/${building.index}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    const data = await res.json();
    if (data.success) {
      alert("Gebäude erfolgreich entfernt.");
      modal.remove();
      renderBuildings(); // Marker und Übersicht neu aufbauen
    } else {
      alert("Fehler beim Entfernen.");
    }
  };

  document.getElementById("start-theory").onclick = () =>
    openTheorieModal(building);

  function openTheorieModal(building) {
    const modal = document.getElementById("garage-modal-content");
    modal.innerHTML = `
      <h2>📘 Theoriekurs starten</h2>
      <p>Wähle Schüler & Lehrer</p>
  
      <label>Fahrlehrer:</label>
      <select id="theory-trainer">
        <option value="LehrerX">Herr Schmidt</option>
      </select>
  
      <label>Fahrschüler:</label>
      <div id="theory-student-list"></div>
  
      <button id="start-course">✅ Kurs starten</button>
    `;

    // Schüler mit passendem Status anzeigen
    const list = document.getElementById("theory-student-list");
    const schueler = aktiveSchueler.filter(
      (s) => s.status === "theoriestunden ausstehend"
    );

    schueler.forEach((s, i) => {
      const id = `student-${i}`;
      list.innerHTML += `
        <label><input type="checkbox" id="${id}" data-index="${i}"> ${s.name}</label><br/>
      `;
    });

    document.getElementById("start-course").onclick = () =>
      startTheoryCourse(schueler);
  }

  function startTheoryCourse(selectedStudents) {
    const selected = [];
    document
      .querySelectorAll("#theory-student-list input:checked")
      .forEach((input) => {
        const index = input.dataset.index;
        const student = aktiveSchueler[index];
        if (student.status === "theoriestunden ausstehend") {
          student.status = "theoriestunden";
          student.statusIndex = studentStates.indexOf("theoriestunden");
          selected.push(student);
          saveStudentStatus(index, student.status, student.statusIndex); // DB-Update
        }
      });

    renderAktiveSchueler();
    modal.remove();

    // ⏱️ Nach 1 Minute Status updaten
    setTimeout(() => {
      selected.forEach((s) => {
        if (s.status === "theoriestunden") {
          s.status = "theoriestunden abgeschlossen";
          s.statusIndex = studentStates.indexOf("theoriestunden abgeschlossen");
          saveStudentStatus(index, next, nextIndex); // DB-Update
        }
      });
      renderAktiveSchueler();
    }, 60000);
  }
}
