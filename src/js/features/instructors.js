import { elements } from "../core/dom.js";
import { getInstructorProfile, getLocalizedInstructor, instructorRoster } from "../core/content.js";
import { formatMoney, saveCurrentGameState, translate, updateBalance } from "../core/game-state.js";
import { state } from "../core/state.js";

export function createInstructorsFeature({ isInstructorTutorialStep, onTutorialHireComplete }) {
  function renderInstructorTeam() {
    if (!state.currentGameState) {
      elements.instructorTeamList.innerHTML = "";
      return;
    }

    if (state.currentGameState.instructors.length === 0) {
      elements.instructorTeamList.innerHTML = `<div class="team-entry">${translate("instructor.teamEmpty")}</div>`;
      return;
    }

    elements.instructorTeamList.innerHTML = state.currentGameState.instructors.map((entry) => {
      const profile = getLocalizedInstructor(entry.id);
      const name = profile?.name || entry.name || entry.id;
      const specialty = profile?.specialty || entry.specialty || "";
      return `
        <div class="team-entry">
          <strong>${name}</strong>
          <div class="team-entry-meta">
            <span>${translate("instructor.specialty", { specialty })}</span>
            <span>${translate("instructor.salary", { salary: formatMoney(entry.salary) })}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderInstructorCandidates() {
    const hiredIds = new Set((state.currentGameState?.instructors || []).map((entry) => entry.id));
    const required = isInstructorTutorialStep();

    elements.instructorCandidates.innerHTML = instructorRoster.map((candidate) => {
      const localized = getLocalizedInstructor(candidate.id);
      const hired = hiredIds.has(candidate.id);
      const actionLabel = hired ? translate("instructor.hiredBadge") : translate("instructor.hireButton");

      return `
        <article class="building-card candidate-card">
          <strong>${localized.name}</strong>
          <p>${localized.bio}</p>
          <div class="candidate-stats">
            <span>${translate("instructor.specialty", { specialty: localized.specialty })}</span>
            <span>${translate("instructor.salary", { salary: formatMoney(candidate.salary) })}</span>
          </div>
          <div class="candidate-actions">
            <button class="${hired ? "secondary-button" : "primary-button"}" type="button" data-hire-id="${candidate.id}" ${hired ? "disabled" : ""}>
              ${actionLabel}
            </button>
          </div>
        </article>
      `;
    }).join("");

    elements.instructorsPanelCopy.textContent = required
      ? translate("instructor.panelCopy.required")
      : translate("instructor.panelCopy");
  }

  function hireInstructor(candidateId) {
    if (!state.currentGameState) {
      return;
    }

    const profile = getLocalizedInstructor(candidateId);
    const baseProfile = getInstructorProfile(candidateId);
    if (!profile || !baseProfile) {
      return;
    }

    const alreadyHired = state.currentGameState.instructors.some((entry) => entry.id === candidateId);
    if (alreadyHired) {
      return;
    }

    if (state.currentGameState.money < baseProfile.salary) {
      window.alert(translate("instructor.hireNotEnoughMoney"));
      return;
    }

    const confirmed = window.confirm(
      translate("instructor.hireConfirm", {
        name: profile.name,
        salary: formatMoney(baseProfile.salary)
      })
    );

    if (!confirmed) {
      return;
    }

    state.currentGameState.money -= baseProfile.salary;
    state.currentGameState.instructors.push({
      id: candidateId,
      salary: baseProfile.salary,
      teachingPower: Math.min(95, Math.max(60, Math.round(baseProfile.salary / 45))),
      availabilitySchedule: [
        { day: 0, start: 8 * 60, end: 18 * 60 },
        { day: 1, start: 8 * 60, end: 18 * 60 },
        { day: 2, start: 8 * 60, end: 18 * 60 },
        { day: 3, start: 8 * 60, end: 18 * 60 },
        { day: 4, start: 8 * 60, end: 18 * 60 }
      ]
    });

    updateBalance();
    renderInstructorCandidates();
    renderInstructorTeam();

    if (isInstructorTutorialStep()) {
      onTutorialHireComplete();
      return;
    }

    saveCurrentGameState();
    window.alert(translate("instructor.hireSuccess", { name: profile.name }));
  }

  function bindEvents() {
    elements.instructorCandidates.addEventListener("click", (event) => {
      const target = event.target.closest("[data-hire-id]");
      if (!target) {
        return;
      }

      hireInstructor(target.dataset.hireId);
    });
  }

  return {
    bindEvents,
    hireInstructor,
    renderInstructorCandidates,
    renderInstructorTeam
  };
}
