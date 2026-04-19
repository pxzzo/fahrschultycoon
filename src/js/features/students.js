import {
  HOME_ADDRESS_MAX_ATTEMPTS,
  HOME_ADDRESS_RADIUS_KM,
  PRACTICE_BASE_COST,
  PRACTICE_PRICE_PER_HOUR,
  PRACTICE_PROGRESS_CAP
} from "../config/practice-sim.js";
import {
  THEORY_EXAM_FEE,
  THEORY_EXAM_PASSING_ERROR_POINTS,
  THEORY_EXAM_QUESTION_COUNT,
  THEORY_EXAM_REGISTRATION_CREDIT,
  THEORY_EXAM_RETAKE_DELAY_MINUTES,
  theoryQuestionPool
} from "../config/theory-exam.js";
import { studentApplicants } from "../config/game-content.js";
import { createRandomPointAround } from "../core/geo.js";
import { elements } from "../core/dom.js";
import { getLocalizedInstructor, getLocalizedStudentApplicant, getLocalizedVehicle, getStudentApplicant, getVehicleById } from "../core/content.js";
import { formatMoney, saveCurrentGameState, translate, updateBalance } from "../core/game-state.js";
import { state } from "../core/state.js";

export function createStudentsFeature({ isStudentTutorialStep, onTutorialStudentComplete }) {
  function createStudentJourneyState() {
    return {
      theory: "pending",
      theoryExam: "locked",
      practice: "locked",
      practiceExam: "locked"
    };
  }

  function createStudentAttributes(applicant) {
    return {
      motivation: applicant?.motivation ?? 70,
      nervousness: applicant?.nervousness ?? 50,
      learningSpeed: applicant?.learningSpeed ?? 65,
      budget: applicant?.budget ?? 3000,
      theoryProgress: applicant?.theoryProgress ?? 0,
      practiceProgress: applicant?.practiceProgress ?? 0,
      satisfaction: applicant?.satisfaction ?? 70,
      availability: applicant?.availability?.[state.currentLanguage] || applicant?.availability || "-",
      language: applicant?.language?.[state.currentLanguage] || applicant?.language || (state.currentLanguage === "de" ? "Deutsch" : "English")
    };
  }

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  }

  function getCurrentTotalMinutes() {
    return state.currentGameState?.time?.totalMinutes ?? 0;
  }

  function formatAbsoluteDay(absoluteDay) {
    const weekday = absoluteDay % 7;
    const week = Math.floor(absoluteDay / 7) + 1;
    return translate("schedule.dayOption", {
      dayName: translate(`schedule.dayName.${weekday}`),
      week,
      day: absoluteDay + 1
    });
  }

  function getDefaultAssignedVehicleId(instructorId, preferredVehicleId = "") {
    if (preferredVehicleId) {
      return preferredVehicleId;
    }

    return (state.currentGameState?.vehicles || []).find((entry) => entry.assignedInstructorId === instructorId)?.id || null;
  }

  function getPrimaryOfficeBuilding() {
    const buildings = state.currentGameState?.buildings || [];
    return buildings.find((entry) => entry.blueprintId === "starter-office") || buildings[0] || null;
  }

  function getGarageBuildingForStudent(student) {
    const buildings = state.currentGameState?.buildings || [];
    const assignedOffice = buildings.find((entry) => entry.id === student.assignedOfficeId);
    const garages = buildings.filter((entry) => entry.blueprintId === "starter-garage");
    if (garages.length === 0) {
      return assignedOffice || buildings[0] || null;
    }

    if (!assignedOffice) {
      return garages[0];
    }

    return garages
      .slice()
      .sort((a, b) => {
        const deltaA = ((a.lat - assignedOffice.lat) ** 2) + ((a.lng - assignedOffice.lng) ** 2);
        const deltaB = ((b.lat - assignedOffice.lat) ** 2) + ((b.lng - assignedOffice.lng) ** 2);
        return deltaA - deltaB;
      })[0];
  }

  async function fetchHomeAddressCandidate(point) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1&accept-language=${encodeURIComponent(state.currentLanguage)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) {
      throw new Error("home-address-search-failed");
    }

    const result = await response.json();
    const address = result.address || {};
    const road = address.road || address.pedestrian || address.residential || address.footway || "";
    const houseNumber = address.house_number || address.house_name || "";
    if (!road || !houseNumber) {
      return null;
    }

    return {
      address: `${road} ${houseNumber}, ${address.postcode || ""} ${address.city || address.town || address.village || ""}`.replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim(),
      lat: Number(result.lat),
      lng: Number(result.lon)
    };
  }

  async function createStudentHomeAddress(office) {
    for (let attempt = 0; attempt < HOME_ADDRESS_MAX_ATTEMPTS; attempt += 1) {
      const point = createRandomPointAround({ lat: office.lat, lng: office.lng }, HOME_ADDRESS_RADIUS_KM);
      try {
        const candidate = await fetchHomeAddressCandidate(point);
        if (candidate) {
          return candidate;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  function getStudentProgressValue(student, step) {
    return student.progress?.[step] || createStudentJourneyState()[step];
  }

  function isStudentFinished(student) {
    const progress = student.progress || {};
    return progress.theory === "passed"
      && progress.theoryExam === "passed"
      && progress.practice === "passed"
      && progress.practiceExam === "passed";
  }

  function isStudentExamReady(student) {
    return getStudentProgressValue(student, "practice") === "passed"
      || getStudentProgressValue(student, "practiceExam") === "pending"
      || getStudentProgressValue(student, "practiceExam") === "inProgress"
      || getStudentProgressValue(student, "practiceExam") === "failed";
  }

  function isStudentTheoryReady(student) {
    return getStudentProgressValue(student, "theory") === "passed"
      && getStudentProgressValue(student, "theoryExam") !== "passed";
  }

  function isStudentPracticeReady(student) {
    return getStudentProgressValue(student, "theoryExam") === "passed"
      && getStudentProgressValue(student, "practice") !== "passed";
  }

  function getStudentStatus(student) {
    if (isStudentFinished(student)) {
      return "completed";
    }

    if (isStudentExamReady(student)) {
      return "ready";
    }

    if (isStudentPracticeReady(student)) {
      return "practiceReady";
    }

    if (isStudentTheoryReady(student)) {
      return "theoryReady";
    }

    return "active";
  }

  function normalizeStudentProgress(progress = {}) {
    const normalized = {
      ...createStudentJourneyState(),
      ...progress
    };

    if (normalized.theory !== "passed") {
      normalized.theoryExam = "locked";
      normalized.practice = "locked";
      normalized.practiceExam = "locked";
      return normalized;
    }

    if (normalized.theoryExam === "locked") {
      normalized.theoryExam = "pending";
    }

    if (normalized.theoryExam !== "passed") {
      normalized.practice = "locked";
      normalized.practiceExam = "locked";
      return normalized;
    }

    if (normalized.practice === "locked") {
      normalized.practice = "pending";
    }

    if (normalized.practice !== "passed") {
      normalized.practiceExam = "locked";
      return normalized;
    }

    if (normalized.practiceExam === "locked") {
      normalized.practiceExam = "pending";
    }

    return normalized;
  }

  function normalizeTheoryExamHistoryEntry(entry = {}) {
    return {
      id: entry.id || createId("theory-exam-history"),
      sessionId: entry.sessionId || "",
      attemptedAtMinute: Number.isFinite(entry.attemptedAtMinute) ? entry.attemptedAtMinute : getCurrentTotalMinutes(),
      result: entry.result === "passed" ? "passed" : "failed",
      errorPoints: Number.isFinite(entry.errorPoints) ? entry.errorPoints : 0,
      mistakeCount: Number.isFinite(entry.mistakeCount) ? entry.mistakeCount : 0,
      questionCount: Number.isFinite(entry.questionCount) ? entry.questionCount : THEORY_EXAM_QUESTION_COUNT
    };
  }

  function normalizeStudentEntry(student) {
    const applicant = getStudentApplicant(student.id);
    const baseAttributes = createStudentAttributes(applicant);
    const theoryProgress = typeof student.theoryProgress === "number"
      ? Math.max(0, Math.min(100, student.theoryProgress))
      : baseAttributes.theoryProgress;
    const practiceProgress = typeof student.practiceProgress === "number"
      ? Math.max(0, Math.min(PRACTICE_PROGRESS_CAP, student.practiceProgress))
      : baseAttributes.practiceProgress;
    const progressSource = {
      ...(student.progress || {}),
      theory: theoryProgress >= 100 ? "passed" : (student.progress?.theory || "pending"),
      practice: practiceProgress >= PRACTICE_PROGRESS_CAP ? "passed" : (student.progress?.practice || "pending")
    };
    const normalizedProgress = normalizeStudentProgress(progressSource);
    const normalizedStudent = {
      ...student,
      assignedInstructorId: student.assignedInstructorId || null,
      assignedVehicleId: getDefaultAssignedVehicleId(student.assignedInstructorId || null, student.assignedVehicleId || null),
      assignedOfficeId: student.assignedOfficeId || getPrimaryOfficeBuilding()?.id || null,
      motivation: typeof student.motivation === "number" ? student.motivation : baseAttributes.motivation,
      nervousness: typeof student.nervousness === "number" ? student.nervousness : baseAttributes.nervousness,
      learningSpeed: typeof student.learningSpeed === "number" ? student.learningSpeed : baseAttributes.learningSpeed,
      budget: typeof student.budget === "number" ? student.budget : baseAttributes.budget,
      theoryProgress,
      practiceProgress,
      satisfaction: typeof student.satisfaction === "number" ? Math.max(0, Math.min(100, student.satisfaction)) : baseAttributes.satisfaction,
      history: Array.isArray(student.history) ? student.history.slice(-8) : [],
      practiceDriveHistory: Array.isArray(student.practiceDriveHistory) ? student.practiceDriveHistory.slice(-8) : [],
      theoryExamHistory: Array.isArray(student.theoryExamHistory)
        ? student.theoryExamHistory.slice(-8).map(normalizeTheoryExamHistoryEntry)
        : [],
      theoryExamAttempts: Number.isFinite(student.theoryExamAttempts) ? student.theoryExamAttempts : 0,
      theoryExamRetakeAvailableAt: Number.isFinite(student.theoryExamRetakeAvailableAt) ? student.theoryExamRetakeAvailableAt : 0,
      homeAddress: student.homeAddress || "",
      homeLat: Number.isFinite(student.homeLat) ? student.homeLat : null,
      homeLng: Number.isFinite(student.homeLng) ? student.homeLng : null,
      availability: student.availability || baseAttributes.availability,
      language: student.language || baseAttributes.language,
      progress: normalizedProgress
    };

    return {
      ...normalizedStudent,
      status: getStudentStatus(normalizedStudent)
    };
  }

  function normalizeTheoryExamSession(session = {}) {
    const answers = Array.isArray(session.answers) ? session.answers : [];
    const questions = Array.isArray(session.questions) ? session.questions : [];
    return {
      id: session.id || createId("theory-exam"),
      studentId: session.studentId || "",
      status: ["registered", "inProgress", "passed", "failed"].includes(session.status) ? session.status : "registered",
      startedAtMinute: Number.isFinite(session.startedAtMinute) ? session.startedAtMinute : null,
      registeredAtMinute: Number.isFinite(session.registeredAtMinute) ? session.registeredAtMinute : getCurrentTotalMinutes(),
      completedAtMinute: Number.isFinite(session.completedAtMinute) ? session.completedAtMinute : null,
      currentQuestionIndex: Number.isFinite(session.currentQuestionIndex) ? session.currentQuestionIndex : 0,
      errorPoints: Number.isFinite(session.errorPoints) ? session.errorPoints : 0,
      attempt: Number.isFinite(session.attempt) ? session.attempt : 1,
      fee: Number.isFinite(session.fee) ? session.fee : THEORY_EXAM_FEE,
      registrationCredit: Number.isFinite(session.registrationCredit) ? session.registrationCredit : THEORY_EXAM_REGISTRATION_CREDIT,
      maxErrorPoints: Number.isFinite(session.maxErrorPoints) ? session.maxErrorPoints : THEORY_EXAM_PASSING_ERROR_POINTS,
      questions,
      answers: answers.map((value) => (Number.isFinite(value) ? value : -1)),
      result: session.result === "passed" ? "passed" : (session.result === "failed" ? "failed" : "")
    };
  }

  function ensureExamState() {
    if (!state.currentGameState) {
      return;
    }

    state.currentGameState.theoryExamSessions = Array.isArray(state.currentGameState.theoryExamSessions)
      ? state.currentGameState.theoryExamSessions.map(normalizeTheoryExamSession)
      : [];
    state.currentGameState.activeTheoryExamId = typeof state.currentGameState.activeTheoryExamId === "string"
      ? state.currentGameState.activeTheoryExamId
      : null;
  }

  function validateStudentState(student) {
    if (!student || !student.id) {
      return false;
    }

    const validStatuses = new Set(["active", "theoryReady", "practiceReady", "ready", "completed"]);
    const validProgress = new Set(["locked", "pending", "inProgress", "passed", "failed"]);
    const progress = normalizeStudentProgress(student.progress || {});

    if (!validStatuses.has(getStudentStatus({ ...student, progress }))) {
      return false;
    }

    return Object.values(progress).every((value) => validProgress.has(value));
  }

  function getStudentById(studentId) {
    return state.currentGameState?.students?.find((entry) => entry.id === studentId) || null;
  }

  function getTheoryExamSessionsForStudent(studentId) {
    ensureExamState();
    return (state.currentGameState?.theoryExamSessions || []).filter((entry) => entry.studentId === studentId);
  }

  function getLatestTheoryExamSession(studentId) {
    return getTheoryExamSessionsForStudent(studentId).slice().sort((a, b) => a.registeredAtMinute - b.registeredAtMinute).at(-1) || null;
  }

  function getActiveTheoryExamSession() {
    ensureExamState();
    const activeId = state.currentGameState?.activeTheoryExamId;
    if (!activeId) {
      return null;
    }

    return (state.currentGameState.theoryExamSessions || []).find((entry) => entry.id === activeId) || null;
  }

  function shuffleList(list) {
    return list
      .map((value) => ({ value, sortKey: Math.random() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((entry) => entry.value);
  }

  function buildTheoryExamQuestions() {
    const shuffled = shuffleList(theoryQuestionPool);
    return shuffled.slice(0, THEORY_EXAM_QUESTION_COUNT).map((question) => ({
      id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      errorPoints: question.errorPoints,
      prompt: question.prompt,
      answers: question.answers,
      correctAnswerIndex: question.correctAnswerIndex
    }));
  }

  function getTheoryExamReadiness(student) {
    const normalizedStudent = normalizeStudentEntry(student);
    const activeOrQueuedSession = getLatestTheoryExamSession(normalizedStudent.id);
    const hasOpenSession = activeOrQueuedSession && ["registered", "inProgress"].includes(activeOrQueuedSession.status);
    const retakeReady = getCurrentTotalMinutes() >= normalizedStudent.theoryExamRetakeAvailableAt;
    const eligible = normalizedStudent.progress.theory === "passed"
      && normalizedStudent.progress.theoryExam !== "passed"
      && !hasOpenSession
      && retakeReady;

    return {
      eligible,
      hasOpenSession,
      retakeReady,
      nextAvailableMinute: normalizedStudent.theoryExamRetakeAvailableAt
    };
  }

  function updateStudentState(studentId, updater) {
    if (!state.currentGameState) {
      return;
    }

    const updatedStudents = state.currentGameState.students.map((entry) => {
      if (entry.id !== studentId) {
        return entry;
      }

      const nextValue = typeof updater === "function" ? updater(entry) : entry;
      const normalized = normalizeStudentEntry(nextValue);
      return validateStudentState(normalized) ? normalized : normalizeStudentEntry(entry);
    });

    state.currentGameState.students = updatedStudents;
  }

  function appendLog(type, text, minute = getCurrentTotalMinutes()) {
    state.currentGameState.logs = [
      {
        id: createId(`log-${type}`),
        type,
        text,
        minute
      },
      ...(state.currentGameState.logs || [])
    ].slice(0, 20);
  }

  function getExamHistoryMarkup(student) {
    if (!student.theoryExamHistory?.length) {
      return `<div class="progress-pill">${translate("student.examNoHistory")}</div>`;
    }

    return `
      <div class="exam-history-list">
        ${student.theoryExamHistory.slice().reverse().map((entry) => {
          const resultKey = `student.examResult.${entry.result === "passed" ? "pass" : "fail"}`;
          return `
            <div class="progress-pill">
              ${formatAbsoluteDay(Math.floor(entry.attemptedAtMinute / 1440))} | ${translate(resultKey)} | ${translate("student.examErrorPoints", { points: entry.errorPoints })}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderActiveStudents() {
    if (!state.currentGameState) {
      elements.studentActiveList.innerHTML = "";
      return;
    }

    const displayStudents = state.currentGameState.students
      .map((entry) => normalizeStudentEntry(entry))
      .filter((entry) => {
        if (state.currentStudentFilter !== "active") {
          return false;
        }

        return entry.status === "active" || entry.status === "practiceReady" || entry.status === "ready";
      });

    if (displayStudents.length === 0) {
      elements.studentActiveList.innerHTML = `<div class="team-entry">${translate("student.activeEmpty")}</div>`;
      return;
    }

    elements.studentActiveList.innerHTML = displayStudents.map((entry) => {
      const applicant = getLocalizedStudentApplicant(entry.id);
      const instructor = entry.assignedInstructorId ? getLocalizedInstructor(entry.assignedInstructorId) : null;
      const office = entry.assignedOfficeId
        ? state.currentGameState.buildings.find((building) => building.id === entry.assignedOfficeId)
        : null;
      const displayName = applicant?.name || entry.name;
      const level = applicant?.level || entry.level || "-";
      const focus = applicant?.focus || entry.focus || "-";
      const availability = applicant?.availability || entry.availability || "-";
      const language = applicant?.language || entry.language || "-";
      const lastHistory = entry.history?.[entry.history.length - 1] || "";
      const lastDriveHistory = entry.practiceDriveHistory?.[entry.practiceDriveHistory.length - 1] || "";
      const assignedVehicle = entry.assignedVehicleId ? getLocalizedVehicle(entry.assignedVehicleId) : null;

      return `
        <div class="team-entry">
          <strong>${displayName}</strong>
          <div class="team-entry-meta">
            <span>${translate("student.level", { level })}</span>
            <span>${translate("student.focus", { focus })}</span>
            <span>${translate("student.status", { status: translate(`student.status.${entry.status}`) })}</span>
            <span>${instructor ? translate("student.assignedTo", { instructor: instructor.name }) : ""}</span>
            <span>${assignedVehicle ? translate("student.vehicleAssignedTo", { vehicle: assignedVehicle.name }) : ""}</span>
            <span>${translate("student.stats", {
              motivation: entry.motivation,
              nervousness: entry.nervousness,
              learningSpeed: entry.learningSpeed,
              budget: formatMoney(entry.budget)
            })}</span>
            <span>${translate("student.satisfaction", { satisfaction: entry.satisfaction })}</span>
            <span>${translate("student.meta", { language, office: office?.name || "-" })}</span>
            <span>${translate("student.availability", { availability })}</span>
            <span>${translate("student.homeAddress", { address: entry.homeAddress || translate("schedule.noneAvailable") })}</span>
          </div>
          <div class="theory-progress-card">
            <div class="theory-progress-header">
              <span>${translate("student.theoryProgressLabel")}</span>
              <strong>${entry.theoryProgress}%</strong>
            </div>
            <div class="theory-progress-bar">
              <span style="width:${entry.theoryProgress}%"></span>
            </div>
          </div>
          <div class="theory-progress-card">
            <div class="theory-progress-header">
              <span>${translate("student.practiceProgressLabel")}</span>
              <strong>${entry.practiceProgress}%</strong>
            </div>
            <div class="theory-progress-bar">
              <span style="width:${entry.practiceProgress}%"></span>
            </div>
          </div>
          <div class="student-progress-grid">
            <span class="progress-pill">${translate("student.progress.theory")}: ${translate(`student.progress.${entry.progress?.theory || "pending"}`)}</span>
            <span class="progress-pill">${translate("student.progress.theoryExam")}: ${translate(`student.progress.${entry.progress?.theoryExam || "locked"}`)}</span>
            <span class="progress-pill">${translate("student.progress.practice")}: ${translate(`student.progress.${entry.progress?.practice || "locked"}`)}</span>
            <span class="progress-pill">${translate("student.progress.practiceExam")}: ${translate(`student.progress.${entry.progress?.practiceExam || "locked"}`)}</span>
          </div>
          ${lastHistory ? `<div class="progress-pill">${translate("student.latestHistory", { entry: lastHistory })}</div>` : ""}
          ${lastDriveHistory ? `<div class="progress-pill">${translate("student.latestDriveHistory", { entry: lastDriveHistory })}</div>` : ""}
          <div class="debug-actions">
            <button class="debug-button" type="button" data-student-debug="${entry.id}" data-student-step="theory">${translate("student.debugTheory")}</button>
            <button class="debug-button" type="button" data-student-debug="${entry.id}" data-student-step="theoryExam">${translate("student.debugTheoryExam")}</button>
            <button class="debug-button" type="button" data-student-debug="${entry.id}" data-student-step="practice">${translate("student.debugPractice")}</button>
            <button class="debug-button" type="button" data-student-debug="${entry.id}" data-student-step="practiceExam">${translate("student.debugPracticeExam")}</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderStudentApplicants() {
    if (state.currentStudentFilter !== "applicants") {
      elements.studentApplicantsList.innerHTML = "";
      elements.studentsPanelCopy.textContent = isStudentTutorialStep()
        ? translate("student.panelCopy.required")
        : translate("student.panelCopy");
      return;
    }

    const acceptedIds = new Set((state.currentGameState?.students || []).map((entry) => entry.id));
    const hasInstructors = (state.currentGameState?.instructors || []).length > 0;
    const required = isStudentTutorialStep();
    const availableApplicants = studentApplicants.filter((entry) => !acceptedIds.has(entry.id));

    if (availableApplicants.length === 0) {
      elements.studentApplicantsList.innerHTML = `<div class="team-entry">${translate("student.noApplicants")}</div>`;
      elements.studentsPanelCopy.textContent = required
        ? translate("student.panelCopy.required")
        : translate("student.panelCopy");
      return;
    }

    elements.studentApplicantsList.innerHTML = availableApplicants.map((entry) => {
      const applicant = getLocalizedStudentApplicant(entry.id);
      const instructorOptions = (state.currentGameState?.instructors || []).map((instructorEntry) => {
        const instructor = getLocalizedInstructor(instructorEntry.id);
        return `<option value="${instructorEntry.id}">${instructor?.name || instructorEntry.id}</option>`;
      }).join("");

      return `
        <article class="building-card candidate-card">
          <strong>${applicant.name}</strong>
          <p>${applicant.note}</p>
          <div class="candidate-stats">
            <span>${translate("student.level", { level: applicant.level })}</span>
            <span>${translate("student.focus", { focus: applicant.focus })}</span>
          </div>
          <div class="candidate-actions-split">
            <select class="inline-select" data-student-assign="${entry.id}" ${!hasInstructors ? "disabled" : ""}>
              <option value="">${translate("student.assignLabel")}</option>
              ${instructorOptions}
            </select>
            <button class="primary-button" type="button" data-accept-student-id="${entry.id}" ${!hasInstructors ? "disabled" : ""}>
              ${translate("student.acceptButton")}
            </button>
            <button class="secondary-button" type="button" data-reject-student-id="${entry.id}">
              ${translate("student.rejectButton")}
            </button>
          </div>
        </article>
      `;
    }).join("");

    elements.studentsPanelCopy.textContent = required
      ? translate("student.panelCopy.required")
      : translate("student.panelCopy");
  }

  function renderExamQueue() {
    if (!state.currentGameState || state.currentStudentFilter !== "ready") {
      elements.studentExamQueueList.innerHTML = "";
      return;
    }

    const readyStudents = state.currentGameState.students
      .map((entry) => normalizeStudentEntry(entry))
      .filter((entry) => entry.progress?.theory === "passed" && entry.progress?.theoryExam !== "passed");

    if (readyStudents.length === 0) {
      elements.studentExamQueueList.innerHTML = `<div class="team-entry">${translate("student.examQueueEmpty")}</div>`;
      return;
    }

    elements.studentExamQueueList.innerHTML = readyStudents.map((entry) => {
      const readiness = getTheoryExamReadiness(entry);
      const latestSession = getLatestTheoryExamSession(entry.id);
      const hasOpenSession = latestSession && ["registered", "inProgress"].includes(latestSession.status);
      const lastHistory = entry.theoryExamHistory?.slice(-1)[0] || null;
      const resultLabel = lastHistory ? translate(`student.examResult.${lastHistory.result === "passed" ? "pass" : "fail"}`) : "";
      const shownAttempt = latestSession?.attempt || (entry.theoryExamAttempts + 1);
      const retryLabel = !readiness.retakeReady && readiness.nextAvailableMinute
        ? translate("student.examRetryIn", { day: formatAbsoluteDay(Math.floor(readiness.nextAvailableMinute / 1440)) })
        : translate("student.examRetakeReady");
      const canRegister = readiness.eligible;
      const canStart = latestSession && latestSession.status === "registered";
      const canContinue = latestSession && latestSession.status === "inProgress";

      return `
        <div class="team-entry ${hasOpenSession ? "is-highlight" : ""}">
          <strong>${entry.name}</strong>
          <div class="team-entry-meta">
            <span>${translate("student.status", { status: translate(`student.status.${entry.status}`) })}</span>
            <span>${translate("student.examAttempt", { count: shownAttempt })}</span>
            <span>${translate("student.examFee", { amount: formatMoney(THEORY_EXAM_FEE) })}</span>
            <span>${translate("student.examCredit", { amount: formatMoney(THEORY_EXAM_REGISTRATION_CREDIT) })}</span>
            <span>${translate("student.examNetCost", { amount: formatMoney(THEORY_EXAM_FEE - THEORY_EXAM_REGISTRATION_CREDIT) })}</span>
            ${latestSession ? `<span>${translate(`student.examStatus.${latestSession.status}`)}</span>` : ""}
            ${lastHistory ? `<span>${translate("student.examLastResult", { result: resultLabel })}</span>` : ""}
            <span>${retryLabel}</span>
          </div>
          <div class="exam-toolbar">
            <button class="primary-button" type="button" data-register-theory-exam="${entry.id}" ${canRegister ? "" : "disabled"}>
              ${translate("student.examRegister")}
            </button>
            ${canStart ? `
              <button class="secondary-button" type="button" data-start-theory-exam="${latestSession.id}">
                ${translate("student.examStart")}
              </button>
            ` : ""}
            ${canContinue ? `
              <button class="secondary-button" type="button" data-start-theory-exam="${latestSession.id}">
                ${translate("student.examContinue")}
              </button>
            ` : ""}
          </div>
          ${getExamHistoryMarkup(entry)}
        </div>
      `;
    }).join("");
  }

  function renderTheoryExamStage() {
    if (!state.currentGameState || state.currentStudentFilter !== "ready") {
      elements.studentTheoryExamStage.innerHTML = "";
      return;
    }

    const session = getActiveTheoryExamSession();
    if (!session) {
      elements.studentTheoryExamStage.innerHTML = `<div class="team-entry">${translate("student.examStageEmpty")}</div>`;
      return;
    }

    const student = normalizeStudentEntry(getStudentById(session.studentId) || {});
    if (!student.id) {
      elements.studentTheoryExamStage.innerHTML = `<div class="team-entry">${translate("student.examStageEmpty")}</div>`;
      return;
    }

    if (session.status === "passed" || session.status === "failed") {
      elements.studentTheoryExamStage.innerHTML = `
        <div class="team-entry is-highlight">
          <strong>${translate("student.examResultHeadline", {
            name: student.name,
            result: translate(`student.examResult.${session.result === "passed" ? "pass" : "fail"}`)
          })}</strong>
          <div class="exam-summary-grid">
            <span class="progress-pill">${translate("student.examErrorPoints", { points: session.errorPoints })}</span>
            <span class="progress-pill">${translate("student.examAllowedPoints", { points: session.maxErrorPoints })}</span>
          </div>
          <p>${translate(`student.examResultCopy.${session.result === "passed" ? "pass" : "fail"}`)}</p>
        </div>
      `;
      return;
    }

    const question = session.questions[session.currentQuestionIndex];
    if (!question) {
      elements.studentTheoryExamStage.innerHTML = `<div class="team-entry">${translate("student.examStageEmpty")}</div>`;
      return;
    }

    elements.studentTheoryExamStage.innerHTML = `
      <div class="exam-question-card">
        <strong>${student.name}</strong>
        <div class="exam-meta-row">
          <span class="progress-pill">${translate("student.examQuestion", {
            current: session.currentQuestionIndex + 1,
            total: session.questions.length
          })}</span>
          <span class="progress-pill">${translate("student.examAllowedPoints", { points: session.maxErrorPoints })}</span>
          <span class="progress-pill">${translate("student.examCategory", {
            category: translate(`student.examCategory.${question.category}`)
          })}</span>
          <span class="progress-pill">${translate("student.examDifficulty", {
            difficulty: translate(`student.examDifficulty.${question.difficulty}`)
          })}</span>
        </div>
        <div class="exam-question-list">
          <strong>${question.prompt[state.currentLanguage]}</strong>
          <div class="exam-answer-grid">
            ${question.answers[state.currentLanguage].map((answer, index) => `
              <button
                class="secondary-button exam-answer-button"
                type="button"
                data-answer-theory-question="${session.id}"
                data-answer-index="${index}"
              >
                ${answer}
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderCompletedStudents() {
    if (!state.currentGameState) {
      elements.studentCompletedList.innerHTML = "";
      return;
    }

    if (state.currentStudentFilter !== "completed") {
      elements.studentCompletedList.innerHTML = `<div class="team-entry">${translate("student.completedEmpty")}</div>`;
      return;
    }

    const completedStudents = state.currentGameState.students
      .map((entry) => normalizeStudentEntry(entry))
      .filter((entry) => entry.status === "completed");

    if (completedStudents.length === 0) {
      elements.studentCompletedList.innerHTML = `<div class="team-entry">${translate("student.completedEmpty")}</div>`;
      return;
    }

    elements.studentCompletedList.innerHTML = completedStudents.map((entry) => {
      const applicant = getLocalizedStudentApplicant(entry.id);
      const displayName = applicant?.name || entry.name;
      const level = applicant?.level || entry.level || "-";
      return `
        <div class="team-entry">
          <strong>${displayName}</strong>
          <div class="team-entry-meta">
            <span>${translate("student.level", { level })}</span>
            <span>${translate("student.status", { status: translate("student.status.completed") })}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function toggleStudentSections() {
    const filter = state.currentStudentFilter;
    elements.studentExamQueueSection.classList.toggle("hidden", filter !== "ready");
    elements.studentTheoryExamSection.classList.toggle("hidden", filter !== "ready");
    elements.studentActiveSection.classList.toggle("hidden", filter !== "active");
    elements.studentCompletedSection.classList.toggle("hidden", filter !== "completed");
  }

  function renderPanel() {
    ensureExamState();
    elements.studentFilters.forEach((button) => {
      button.classList.toggle("active", button.dataset.studentFilter === state.currentStudentFilter);
    });
    elements.studentsPanelCopy.textContent = state.currentStudentFilter === "ready"
      ? translate("student.readyCopy")
      : (isStudentTutorialStep() && state.currentStudentFilter === "applicants"
        ? translate("student.panelCopy.required")
        : translate("student.panelCopy"));
    toggleStudentSections();
    renderStudentApplicants();
    renderExamQueue();
    renderTheoryExamStage();
    renderActiveStudents();
    renderCompletedStudents();
  }

  function getNextProgressState(currentValue, stepKey) {
    const unlockedStates = ["pending", "inProgress", "passed", "failed"];
    const lockedAwareStates = ["locked", "pending", "inProgress", "passed", "failed"];
    const cycle = stepKey === "theory" ? unlockedStates : lockedAwareStates;
    const currentIndex = cycle.indexOf(currentValue);
    return cycle[(currentIndex + 1) % cycle.length];
  }

  function applyTheoryLessonBatch({ studentIds, instructorId, startMinute, endMinute, groupSize }) {
    if (!state.currentGameState || !Array.isArray(studentIds) || studentIds.length === 0) {
      return [];
    }

    const instructor = state.currentGameState.instructors.find((entry) => entry.id === instructorId);
    const instructorPower = instructor?.teachingPower || 70;
    const duration = Math.max(15, endMinute - startMinute);
    const minuteOfDay = startMinute % 1440;
    const badPlanning = minuteOfDay < 9 * 60 || endMinute % 1440 > 19 * 60 || duration > 120;
    const logs = [];

    state.currentGameState.students = state.currentGameState.students.map((entry) => {
      if (!studentIds.includes(entry.id)) {
        return entry;
      }

      const student = normalizeStudentEntry(entry);
      const theoryBase = (duration / 60) * 20;
      const motivationBonus = student.motivation * 0.08;
      const learningBonus = student.learningSpeed * 0.1;
      const nervousnessPenalty = student.nervousness * 0.06;
      const instructorBonus = instructorPower * 0.09;
      const availabilityBonus = 6;
      const groupPenalty = Math.max(0, groupSize - 4) * 2;
      const gain = Math.max(8, Math.round(theoryBase + motivationBonus + learningBonus + instructorBonus + availabilityBonus - nervousnessPenalty - groupPenalty));
      const nextTheoryProgress = Math.min(100, student.theoryProgress + gain);
      const completedTheory = nextTheoryProgress >= 100;
      const satisfactionDelta = badPlanning ? -4 : 3;
      const historyEntry = translate("student.history.theoryLesson", {
        gain,
        total: nextTheoryProgress,
        instructor: getLocalizedInstructor(instructorId)?.name || "-"
      });

      logs.push(historyEntry.replace(/^/, `${student.name}: `));

      return normalizeStudentEntry({
        ...student,
        theoryProgress: nextTheoryProgress,
        satisfaction: Math.max(0, Math.min(100, student.satisfaction + satisfactionDelta)),
        history: [...student.history, historyEntry].slice(-8),
        progress: {
          ...student.progress,
          theory: completedTheory ? "passed" : "inProgress"
        }
      });
    });

    state.currentGameState.reputation = Math.max(0, Math.min(100, (state.currentGameState.reputation || 50) + (badPlanning ? -1 : 1)));
    state.currentGameState.logs = [
      ...logs.map((entry) => ({
        id: createId("log-theory"),
        type: "theory",
        text: entry,
        minute: endMinute
      })),
      ...(state.currentGameState.logs || [])
    ].slice(0, 20);
    saveCurrentGameState();
    renderPanel();
    return logs;
  }

  function applyPracticeLesson({
    studentId,
    instructorId,
    vehicleId,
    startMinute,
    endMinute,
    routeSummary = ""
  }) {
    if (!state.currentGameState || !studentId) {
      return null;
    }

    const instructor = state.currentGameState.instructors.find((entry) => entry.id === instructorId);
    const vehicle = getVehicleById(vehicleId);
    const durationMinutes = Math.max(30, endMinute - startMinute);
    const durationHours = durationMinutes / 60;
    let outcome = null;

    updateStudentState(studentId, (entry) => {
      const student = normalizeStudentEntry(entry);
      const instructorQuality = (instructor?.teachingPower || 70) * 0.11;
      const vehicleHandling = Number(vehicle?.lessonComfort || 65) * 0.08;
      const vehicleReliability = Number(vehicle?.reliability || 65) * 0.05;
      const learningBonus = student.learningSpeed * 0.1;
      const motivationBonus = student.motivation * 0.05;
      const nervousnessPenalty = student.nervousness * 0.08;
      const gain = Math.max(
        6,
        Math.round((durationHours * 12) + instructorQuality + vehicleHandling + vehicleReliability + learningBonus + motivationBonus - nervousnessPenalty)
      );
      const nextPracticeProgress = Math.min(PRACTICE_PROGRESS_CAP, student.practiceProgress + gain);
      const lessonRevenue = Math.round((PRACTICE_PRICE_PER_HOUR * durationHours) + ((vehicle?.lessonComfort || 60) * 0.35));
      const chargedRevenue = Math.min(student.budget, lessonRevenue);
      const operatingCost = Math.round(PRACTICE_BASE_COST + ((vehicle?.operatingCostPerHour || 24) * durationHours));
      const netIncome = chargedRevenue - operatingCost;
      const completedPractice = nextPracticeProgress >= PRACTICE_PROGRESS_CAP;
      const satisfactionDelta = chargedRevenue < lessonRevenue ? -2 : (student.nervousness > 65 ? 1 : 3);
      const historyEntry = translate("student.history.practiceLesson", {
        gain,
        total: nextPracticeProgress,
        route: routeSummary || "-",
        income: formatMoney(chargedRevenue),
        cost: formatMoney(operatingCost)
      });

      outcome = {
        gain,
        nextPracticeProgress,
        chargedRevenue,
        operatingCost,
        netIncome,
        completedPractice,
        historyEntry
      };

      state.currentGameState.money += netIncome;

      return {
        ...student,
        budget: Math.max(0, student.budget - chargedRevenue),
        practiceProgress: nextPracticeProgress,
        satisfaction: Math.max(0, Math.min(100, student.satisfaction + satisfactionDelta)),
        history: [...student.history, historyEntry].slice(-8),
        practiceDriveHistory: [...student.practiceDriveHistory, historyEntry].slice(-8),
        progress: {
          ...student.progress,
          practice: completedPractice ? "passed" : "inProgress"
        }
      };
    });

    if (!outcome) {
      return null;
    }

    updateBalance();
    appendLog("practice", `${getStudentById(studentId)?.name || "-"}: ${outcome.historyEntry}`, endMinute);
    saveCurrentGameState();
    renderPanel();
    return outcome;
  }

  function abortPracticeLesson({ studentId, routeSummary = "", reason = "" }) {
    if (!state.currentGameState || !studentId) {
      return null;
    }

    let historyEntry = "";
    updateStudentState(studentId, (entry) => {
      const student = normalizeStudentEntry(entry);
      historyEntry = translate("student.history.practiceLessonAborted", {
        reason: reason || translate("student.practiceAbort.generic"),
        route: routeSummary || "-"
      });

      return {
        ...student,
        satisfaction: Math.max(0, student.satisfaction - 6),
        history: [...student.history, historyEntry].slice(-8),
        practiceDriveHistory: [...student.practiceDriveHistory, historyEntry].slice(-8),
        progress: {
          ...student.progress,
          practice: student.practiceProgress > 0 ? "inProgress" : "pending"
        }
      };
    });

    appendLog("practice", `${getStudentById(studentId)?.name || "-"}: ${historyEntry}`);
    saveCurrentGameState();
    renderPanel();
    return historyEntry;
  }

  function registerTheoryExam(studentId) {
    if (!state.currentGameState) {
      return;
    }

    const student = normalizeStudentEntry(getStudentById(studentId) || {});
    const readiness = getTheoryExamReadiness(student);
    if (!student.id || !readiness.eligible) {
      window.alert(translate("student.examRegistrationBlocked"));
      return;
    }

    const netCost = THEORY_EXAM_FEE - THEORY_EXAM_REGISTRATION_CREDIT;
    if (state.currentGameState.money < netCost) {
      window.alert(translate("student.examNotEnoughMoney"));
      return;
    }

    state.currentGameState.money -= THEORY_EXAM_FEE;
    state.currentGameState.money += THEORY_EXAM_REGISTRATION_CREDIT;
    updateBalance();

    const session = normalizeTheoryExamSession({
      id: createId("theory-exam"),
      studentId,
      status: "registered",
      registeredAtMinute: getCurrentTotalMinutes(),
      currentQuestionIndex: 0,
      errorPoints: 0,
      attempt: student.theoryExamAttempts + 1,
      fee: THEORY_EXAM_FEE,
      registrationCredit: THEORY_EXAM_REGISTRATION_CREDIT,
      maxErrorPoints: THEORY_EXAM_PASSING_ERROR_POINTS,
      questions: buildTheoryExamQuestions(),
      answers: []
    });

    state.currentGameState.theoryExamSessions.push(session);
    updateStudentState(studentId, (entry) => {
      const normalized = normalizeStudentEntry(entry);
      return {
        ...normalized,
        theoryExamAttempts: normalized.theoryExamAttempts + 1,
        history: [
          ...normalized.history,
          translate("student.history.theoryExamRegistered", {
            fee: formatMoney(THEORY_EXAM_FEE),
            credit: formatMoney(THEORY_EXAM_REGISTRATION_CREDIT)
          })
        ].slice(-8)
      };
    });

    appendLog("theoryExam", `${student.name}: ${translate("student.history.theoryExamRegistered", {
      fee: formatMoney(THEORY_EXAM_FEE),
      credit: formatMoney(THEORY_EXAM_REGISTRATION_CREDIT)
    })}`);
    saveCurrentGameState();
    renderPanel();
  }

  function startTheoryExam(sessionId) {
    ensureExamState();
    state.currentGameState.theoryExamSessions = state.currentGameState.theoryExamSessions.map((entry) => (
      entry.id === sessionId
        ? {
          ...entry,
          status: "inProgress",
          startedAtMinute: entry.startedAtMinute ?? getCurrentTotalMinutes()
        }
        : entry
    ));

    const session = state.currentGameState.theoryExamSessions.find((entry) => entry.id === sessionId);
    if (session?.studentId) {
      updateStudentState(session.studentId, (entry) => ({
        ...entry,
        progress: {
          ...entry.progress,
          theoryExam: "inProgress"
        }
      }));
    }

    state.currentGameState.activeTheoryExamId = sessionId;
    saveCurrentGameState();
    renderPanel();
  }

  function finalizeTheoryExam(sessionId) {
    ensureExamState();
    const session = state.currentGameState.theoryExamSessions.find((entry) => entry.id === sessionId);
    if (!session) {
      return;
    }

    const questionResults = session.questions.map((question, index) => ({
      question,
      selectedAnswerIndex: session.answers[index],
      isCorrect: session.answers[index] === question.correctAnswerIndex
    }));
    const errorPoints = questionResults.reduce((sum, entry) => (
      entry.isCorrect ? sum : sum + Number(entry.question.errorPoints || 0)
    ), 0);
    const mistakeCount = questionResults.filter((entry) => !entry.isCorrect).length;
    const result = errorPoints <= session.maxErrorPoints ? "passed" : "failed";
    const completedAtMinute = getCurrentTotalMinutes();

    state.currentGameState.theoryExamSessions = state.currentGameState.theoryExamSessions.map((entry) => (
      entry.id === sessionId
        ? {
          ...entry,
          status: result,
          result,
          errorPoints,
          completedAtMinute,
          currentQuestionIndex: entry.questions.length
        }
        : entry
    ));
    state.currentGameState.activeTheoryExamId = sessionId;

    updateStudentState(session.studentId, (entry) => {
      const student = normalizeStudentEntry(entry);
      const historyKey = result === "passed"
        ? "student.history.theoryExamPassed"
        : "student.history.theoryExamFailed";
      const nextHistoryEntry = translate(historyKey, { points: errorPoints });

      return {
        ...student,
        satisfaction: Math.max(0, Math.min(100, student.satisfaction + (result === "passed" ? 6 : -8))),
        history: [...student.history, nextHistoryEntry].slice(-8),
        theoryExamRetakeAvailableAt: result === "passed"
          ? 0
          : completedAtMinute + THEORY_EXAM_RETAKE_DELAY_MINUTES,
        theoryExamHistory: [
          ...student.theoryExamHistory,
          normalizeTheoryExamHistoryEntry({
            sessionId,
            attemptedAtMinute: completedAtMinute,
            result,
            errorPoints,
            mistakeCount,
            questionCount: session.questions.length
          })
        ].slice(-8),
        progress: {
          ...student.progress,
          theoryExam: result
        }
      };
    });

    appendLog(
      "theoryExam",
      translate(`student.examOutcome.${result === "passed" ? "pass" : "fail"}`, {
        name: getStudentById(session.studentId)?.name || "-"
      }),
      completedAtMinute
    );

    saveCurrentGameState();
    renderPanel();
  }

  function answerTheoryQuestion(sessionId, answerIndex) {
    ensureExamState();
    const session = state.currentGameState.theoryExamSessions.find((entry) => entry.id === sessionId);
    if (!session || session.status !== "inProgress") {
      return;
    }

    const answers = session.answers.slice();
    answers[session.currentQuestionIndex] = answerIndex;
    const nextIndex = session.currentQuestionIndex + 1;

    state.currentGameState.theoryExamSessions = state.currentGameState.theoryExamSessions.map((entry) => (
      entry.id === sessionId
        ? {
          ...entry,
          answers,
          currentQuestionIndex: nextIndex
        }
        : entry
    ));

    if (nextIndex >= session.questions.length) {
      finalizeTheoryExam(sessionId);
      return;
    }

    saveCurrentGameState();
    renderPanel();
  }

  async function acceptStudent(studentId, assignedInstructorId) {
    if (!state.currentGameState) {
      return;
    }

    const applicant = getLocalizedStudentApplicant(studentId);
    const applicantSource = getStudentApplicant(studentId);
    const instructor = assignedInstructorId ? getLocalizedInstructor(assignedInstructorId) : null;

    if (!applicant || !applicantSource) {
      return;
    }

    if (!assignedInstructorId || !instructor) {
      window.alert(translate("student.acceptMissingInstructor"));
      return;
    }

    const confirmed = window.confirm(
      translate("student.acceptConfirm", {
        name: applicant.name,
        instructor: instructor.name
      })
    );

    if (!confirmed) {
      return;
    }

    const assignedOffice = getPrimaryOfficeBuilding();
    const homeAddress = assignedOffice ? await createStudentHomeAddress(assignedOffice) : null;
    if (!homeAddress) {
      window.alert(translate("student.homeAddressUnavailable"));
      return;
    }

    const assignedVehicleId = getDefaultAssignedVehicleId(assignedInstructorId);

    state.currentGameState.students.push(normalizeStudentEntry({
      id: studentId,
      applicantId: studentId,
      name: applicant.name,
      status: "active",
      level: applicant.level,
      focus: applicant.focus,
      assignedInstructorId,
      assignedVehicleId,
      assignedOfficeId: assignedOffice?.id || null,
      homeAddress: homeAddress.address,
      homeLat: homeAddress.lat,
      homeLng: homeAddress.lng,
      availabilitySchedule: [
        { day: 0, start: 16 * 60, end: 20 * 60 },
        { day: 1, start: 16 * 60, end: 20 * 60 },
        { day: 2, start: 16 * 60, end: 20 * 60 },
        { day: 3, start: 16 * 60, end: 20 * 60 },
        { day: 4, start: 16 * 60, end: 20 * 60 },
        { day: 5, start: 10 * 60, end: 16 * 60 }
      ],
      practiceDriveHistory: [],
      theoryExamHistory: [],
      theoryExamAttempts: 0,
      theoryExamRetakeAvailableAt: 0,
      ...createStudentAttributes(applicantSource),
      progress: createStudentJourneyState()
    }));

    renderPanel();

    if (isStudentTutorialStep()) {
      onTutorialStudentComplete();
      return;
    }

    saveCurrentGameState();
  }

  function rejectStudent(studentId) {
    const applicant = getLocalizedStudentApplicant(studentId);
    if (!applicant) {
      return;
    }

    const confirmed = window.confirm(
      translate("student.rejectConfirm", { name: applicant.name })
    );

    if (!confirmed) {
      return;
    }

    const index = studentApplicants.findIndex((entry) => entry.id === studentId);
    if (index >= 0) {
      studentApplicants.splice(index, 1);
    }

    renderPanel();
    window.alert(translate("student.rejectSuccess", { name: applicant.name }));
  }

  function bindEvents() {
    elements.studentApplicantsList.addEventListener("click", (event) => {
      const acceptTarget = event.target.closest("[data-accept-student-id]");
      if (acceptTarget) {
        const studentId = acceptTarget.dataset.acceptStudentId;
        const select = elements.studentApplicantsList.querySelector(`[data-student-assign="${studentId}"]`);
        acceptStudent(studentId, select?.value || "");
        return;
      }

      const rejectTarget = event.target.closest("[data-reject-student-id]");
      if (rejectTarget) {
        rejectStudent(rejectTarget.dataset.rejectStudentId);
      }
    });

    elements.studentExamQueueList.addEventListener("click", (event) => {
      const registerTarget = event.target.closest("[data-register-theory-exam]");
      if (registerTarget) {
        registerTheoryExam(registerTarget.dataset.registerTheoryExam);
        return;
      }

      const startTarget = event.target.closest("[data-start-theory-exam]");
      if (startTarget) {
        startTheoryExam(startTarget.dataset.startTheoryExam);
      }
    });

    elements.studentTheoryExamStage.addEventListener("click", (event) => {
      const answerTarget = event.target.closest("[data-answer-theory-question]");
      if (!answerTarget) {
        return;
      }

      answerTheoryQuestion(
        answerTarget.dataset.answerTheoryQuestion,
        Number(answerTarget.dataset.answerIndex)
      );
    });

    elements.studentActiveList.addEventListener("click", (event) => {
      const debugTarget = event.target.closest("[data-student-debug]");
      if (!debugTarget) {
        return;
      }

      const studentId = debugTarget.dataset.studentDebug;
      const stepKey = debugTarget.dataset.studentStep;

      updateStudentState(studentId, (entry) => {
        const currentValue = getStudentProgressValue(entry, stepKey);
        const nextValue = getNextProgressState(currentValue, stepKey);
        return {
          ...entry,
          progress: {
            ...entry.progress,
            [stepKey]: nextValue
          }
        };
      });
      saveCurrentGameState();
      renderPanel();
    });

    elements.studentFilters.forEach((button) => {
      button.addEventListener("click", () => {
        state.currentStudentFilter = button.dataset.studentFilter;
        renderPanel();
      });
    });
  }

  return {
    acceptStudent,
    abortPracticeLesson,
    applyPracticeLesson,
    applyTheoryLessonBatch,
    bindEvents,
    createStudentJourneyState,
    normalizeStudentEntry,
    renderActiveStudents,
    renderCompletedStudents,
    renderPanel,
    renderStudentApplicants
  };
}
