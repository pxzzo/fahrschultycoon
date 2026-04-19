import { PRACTICE_LESSON_BASE_MINUTES, PRACTICE_LOOP_RADIUS_KM, PRACTICE_ROUTE_POINT_DENSITY } from "../config/practice-sim.js";
import { clamp, createRandomPointAround, createSegmentPoints } from "../core/geo.js";
import { elements } from "../core/dom.js";
import { getLocalizedInstructor, getLocalizedVehicle } from "../core/content.js";
import { saveCurrentGameState, setTimeSpeed, subscribeToClockTicks, translate, updateClock } from "../core/game-state.js";
import { state } from "../core/state.js";

const MINUTES_PER_DAY = 1440;
const BOARD_START_MINUTE = 7 * 60;
const BOARD_END_MINUTE = 21 * 60;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 24;
const DEFAULT_SCHEDULES = {
  instructor: [
    { day: 0, start: 8 * 60, end: 18 * 60 },
    { day: 1, start: 8 * 60, end: 18 * 60 },
    { day: 2, start: 8 * 60, end: 18 * 60 },
    { day: 3, start: 8 * 60, end: 18 * 60 },
    { day: 4, start: 8 * 60, end: 18 * 60 }
  ],
  vehicle: [
    { day: 0, start: 7 * 60, end: 21 * 60 },
    { day: 1, start: 7 * 60, end: 21 * 60 },
    { day: 2, start: 7 * 60, end: 21 * 60 },
    { day: 3, start: 7 * 60, end: 21 * 60 },
    { day: 4, start: 7 * 60, end: 21 * 60 },
    { day: 5, start: 9 * 60, end: 17 * 60 }
  ],
  student: [
    { day: 0, start: 16 * 60, end: 20 * 60 },
    { day: 1, start: 16 * 60, end: 20 * 60 },
    { day: 2, start: 16 * 60, end: 20 * 60 },
    { day: 3, start: 16 * 60, end: 20 * 60 },
    { day: 4, start: 16 * 60, end: 20 * 60 },
    { day: 5, start: 10 * 60, end: 16 * 60 }
  ],
  location: [
    { day: 0, start: 7 * 60, end: 21 * 60 },
    { day: 1, start: 7 * 60, end: 21 * 60 },
    { day: 2, start: 7 * 60, end: 21 * 60 },
    { day: 3, start: 7 * 60, end: 21 * 60 },
    { day: 4, start: 7 * 60, end: 21 * 60 },
    { day: 5, start: 8 * 60, end: 17 * 60 }
  ]
};

export function createScheduleFeature({
  closeAllPanels,
  applyTheoryLessonBatch,
  applyPracticeLesson,
  abortPracticeLesson,
  refreshStudentsPanel
}) {
  let dragPayload = null;

  function getCurrentTotalMinutes() {
    return state.currentGameState?.time?.totalMinutes ?? 0;
  }

  function getCurrentAbsoluteDay() {
    return Math.floor(getCurrentTotalMinutes() / MINUTES_PER_DAY);
  }

  function getAbsoluteDayLabel(absoluteDay) {
    const weekday = absoluteDay % 7;
    const week = Math.floor(absoluteDay / 7) + 1;
    return translate("schedule.dayOption", {
      dayName: translate(`schedule.dayName.${weekday}`),
      week,
      day: absoluteDay + 1
    });
  }

  function formatClock(minutesOfDay) {
    const hours = Math.floor(minutesOfDay / 60);
    const minutes = minutesOfDay % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function normalizeAvailabilitySchedule(slots, type) {
    if (Array.isArray(slots) && slots.length > 0) {
      return slots;
    }

    return DEFAULT_SCHEDULES[type].map((slot) => ({ ...slot }));
  }

  function normalizeAppointment(entry) {
    const studentIds = Array.isArray(entry.studentIds)
      ? entry.studentIds
      : (entry.studentId ? [entry.studentId] : []);

    return {
      id: entry.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      startMinute: Number.isFinite(entry.startMinute) ? entry.startMinute : getCurrentTotalMinutes(),
      endMinute: Number.isFinite(entry.endMinute) ? entry.endMinute : getCurrentTotalMinutes() + 60,
      type: entry.type || "practice",
      studentIds,
      instructorId: entry.instructorId || "",
      vehicleId: entry.vehicleId || "",
      studentId: entry.studentId || studentIds[0] || "",
      locationId: entry.locationId || "",
      status: entry.status || "scheduled",
      automationEligible: entry.automationEligible !== false,
      outcomeApplied: Boolean(entry.outcomeApplied),
      practiceRoute: entry.practiceRoute || null
    };
  }

  function normalizeGameState(gameState) {
    gameState.time = gameState.time || { totalMinutes: 8 * 60, speed: 1 };
    gameState.appointments = Array.isArray(gameState.appointments)
      ? gameState.appointments.map(normalizeAppointment).map(ensurePracticeAppointmentData)
      : [];
    gameState.instructors = (gameState.instructors || []).map((entry) => ({
      ...entry,
      teachingPower: Number.isFinite(entry.teachingPower) ? entry.teachingPower : 70,
      availabilitySchedule: normalizeAvailabilitySchedule(entry.availabilitySchedule, "instructor")
    }));
    gameState.vehicles = (gameState.vehicles || []).map((entry) => ({
      ...entry,
      availabilitySchedule: normalizeAvailabilitySchedule(entry.availabilitySchedule, "vehicle")
    }));
    gameState.students = (gameState.students || []).map((entry) => ({
      ...entry,
      availabilitySchedule: normalizeAvailabilitySchedule(entry.availabilitySchedule, "student")
    }));
    gameState.buildings = (gameState.buildings || []).map((entry) => ({
      ...entry,
      classroomCapacity: Number(entry.classroomCapacity || 0),
      availabilitySchedule: normalizeAvailabilitySchedule(entry.availabilitySchedule, "location")
    }));
    gameState.logs = Array.isArray(gameState.logs) ? gameState.logs : [];
    gameState.reputation = typeof gameState.reputation === "number" ? gameState.reputation : 50;
    return gameState;
  }

  function getAppointmentStatus(entry) {
    if (entry.status === "cancelled") {
      return "cancelled";
    }

    return entry.endMinute <= getCurrentTotalMinutes() ? "completed" : "scheduled";
  }

  function syncAppointmentStatuses() {
    if (!state.currentGameState) {
      return;
    }

    state.currentGameState.appointments = state.currentGameState.appointments.map((entry) => ({
      ...entry,
      status: getAppointmentStatus(entry)
    }));
  }

  function getScheduleForResource(resource, type) {
    return normalizeAvailabilitySchedule(resource?.availabilitySchedule, type);
  }

  function isInsideAvailability(resource, type, absoluteStart, absoluteEnd) {
    const day = Math.floor(absoluteStart / MINUTES_PER_DAY) % 7;
    const start = absoluteStart % MINUTES_PER_DAY;
    const end = absoluteEnd % MINUTES_PER_DAY;
    const schedule = getScheduleForResource(resource, type);

    if (Math.floor(absoluteStart / MINUTES_PER_DAY) !== Math.floor((absoluteEnd - 1) / MINUTES_PER_DAY)) {
      return false;
    }

    return schedule.some((slot) => slot.day === day && start >= slot.start && end <= slot.end);
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function findConflict({ startMinute, endMinute, instructorId, vehicleId, studentIds, locationId, ignoreAppointmentId = "" }) {
    return (state.currentGameState?.appointments || []).find((entry) => {
      if (ignoreAppointmentId && entry.id === ignoreAppointmentId) {
        return false;
      }

      if (!overlaps(startMinute, endMinute, entry.startMinute, entry.endMinute)) {
        return false;
      }

      const sharedStudent = (studentIds || []).some((studentId) => entry.studentIds?.includes(studentId));
      return (instructorId && entry.instructorId === instructorId)
        || (vehicleId && entry.vehicleId === vehicleId)
        || sharedStudent
        || (locationId && entry.locationId === locationId);
    }) || null;
  }

  function setScheduleStatus(key, params = {}, isError = false) {
    elements.scheduleStatus.textContent = translate(key, params);
    elements.scheduleStatus.style.color = isError ? "#7a2b1f" : "";
  }

  function getSelectedAbsoluteDay() {
    return Number(elements.scheduleDaySelect.value || getCurrentAbsoluteDay());
  }

  function getTheoryCapableBuildings() {
    return (state.currentGameState?.buildings || []).filter((entry) => Number(entry.classroomCapacity) > 0);
  }

  function getGarageBuildings() {
    return (state.currentGameState?.buildings || []).filter((entry) => entry.blueprintId === "starter-garage");
  }

  function getStudentById(studentId) {
    return (state.currentGameState?.students || []).find((entry) => entry.id === studentId) || null;
  }

  function getVehicleForInstructor(instructorId) {
    return (state.currentGameState?.vehicles || []).find((entry) => entry.assignedInstructorId === instructorId) || null;
  }

  function getPracticeGarage(student) {
    const garages = getGarageBuildings();
    const assignedOffice = (state.currentGameState?.buildings || []).find((entry) => entry.id === student?.assignedOfficeId);
    if (garages.length === 0) {
      return assignedOffice || (state.currentGameState?.buildings || [])[0] || null;
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

  function formatPracticeRouteSummary(route) {
    if (!route) {
      return "-";
    }

    return `${route.homeLabel} -> ${route.trainingLabel} -> ${route.garageLabel}`;
  }

  async function fetchRoadPolyline(points) {
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }

    const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      throw new Error("practice-route-fetch-failed");
    }

    const payload = await response.json();
    const geometry = payload.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(geometry) || geometry.length === 0) {
      return [];
    }

    return geometry.map(([lng, lat]) => ({ lat, lng }));
  }

  function buildFallbackPolyline(points) {
    return points.flatMap((point, index) => {
      if (index === 0) {
        return [{ lat: point.lat, lng: point.lng }];
      }

      const previous = points[index - 1];
      return createSegmentPoints(
        { lat: previous.lat, lng: previous.lng },
        { lat: point.lat, lng: point.lng },
        PRACTICE_ROUTE_POINT_DENSITY
      ).slice(1);
    });
  }

  async function buildPracticeRoute(student, appointment) {
    const garage = getPracticeGarage(student);
    if (!student?.homeLat || !student?.homeLng || !garage) {
      return null;
    }

    const homePoint = { lat: student.homeLat, lng: student.homeLng };
    const garagePoint = { lat: garage.lat, lng: garage.lng };
    const waypointA = createRandomPointAround(homePoint, PRACTICE_LOOP_RADIUS_KM);
    const waypointB = createRandomPointAround(homePoint, PRACTICE_LOOP_RADIUS_KM);
    const appointmentStops = [
      { key: "pickup", label: translate("practice.phase.start"), lat: homePoint.lat, lng: homePoint.lng },
      { key: "trainingA", label: translate("practice.phase.underway"), lat: waypointA.lat, lng: waypointA.lng },
      { key: "trainingB", label: translate("practice.phase.underway"), lat: waypointB.lat, lng: waypointB.lng },
      { key: "dropoff", label: translate("practice.phase.finished"), lat: homePoint.lat, lng: homePoint.lng }
    ];
    const transferToStudentStops = [
      { key: "garageStart", label: translate("practice.phase.dispatch"), lat: garagePoint.lat, lng: garagePoint.lng },
      { key: "pickup", label: translate("practice.phase.pickup"), lat: homePoint.lat, lng: homePoint.lng }
    ];
    const transferToGarageStops = [
      { key: "dropoff", label: translate("practice.phase.dropoff"), lat: homePoint.lat, lng: homePoint.lng },
      { key: "garageEnd", label: translate("practice.phase.returnGarage"), lat: garagePoint.lat, lng: garagePoint.lng }
    ];

    let appointmentPolyline = [];
    let transferToStudentPolyline = [];
    let transferToGaragePolyline = [];

    try {
      [appointmentPolyline, transferToStudentPolyline, transferToGaragePolyline] = await Promise.all([
        fetchRoadPolyline(appointmentStops),
        fetchRoadPolyline(transferToStudentStops),
        fetchRoadPolyline(transferToGarageStops)
      ]);
    } catch {
      appointmentPolyline = buildFallbackPolyline(appointmentStops);
      transferToStudentPolyline = buildFallbackPolyline(transferToStudentStops);
      transferToGaragePolyline = buildFallbackPolyline(transferToGarageStops);
    }

    return {
      appointmentId: appointment.id,
      garageLabel: garage.name || translate("garage.starter.name"),
      homeLabel: student.homeAddress,
      trainingLabel: translate("practice.route.trainingLabel"),
      stops: appointmentStops,
      transferToStudentStops,
      transferToGarageStops,
      polyline: appointmentPolyline,
      transferToStudentPolyline,
      transferToGaragePolyline
    };
  }

  async function hydratePracticeRoute(appointmentId) {
    const appointment = (state.currentGameState?.appointments || []).find((entry) => entry.id === appointmentId);
    if (!appointment || appointment.type !== "practice" || appointment.practiceRoute?.isLoading) {
      return;
    }

    const student = appointment.studentIds?.[0] ? getStudentById(appointment.studentIds[0]) : null;
    if (!student) {
      return;
    }

    state.currentGameState.appointments = state.currentGameState.appointments.map((entry) => (
      entry.id === appointmentId
        ? {
          ...entry,
          practiceRoute: {
            ...(entry.practiceRoute || {}),
            isLoading: true
          }
        }
        : entry
    ));

    const route = await buildPracticeRoute(student, appointment);
    state.currentGameState.appointments = state.currentGameState.appointments.map((entry) => (
      entry.id === appointmentId
        ? {
          ...entry,
          practiceRoute: route
            ? { ...route, isLoading: false }
            : null
        }
        : entry
    ));
    saveCurrentGameState();
    renderPracticeMapOverlay();
  }

  function getActivePracticeAppointments(totalMinutes = getCurrentTotalMinutes()) {
    return (state.currentGameState?.appointments || []).filter((entry) => (
      entry.type === "practice"
      && entry.status !== "cancelled"
      && entry.startMinute <= totalMinutes
      && entry.endMinute > totalMinutes
    ));
  }

  function getPracticeMarkerState(appointment, totalMinutes = getCurrentTotalMinutes()) {
    const route = appointment.practiceRoute;
    if (!route?.polyline?.length) {
      return null;
    }

    const duration = Math.max(1, appointment.endMinute - appointment.startMinute);
    const progress = clamp((totalMinutes - appointment.startMinute) / duration, 0, 0.999);
    const index = Math.min(route.polyline.length - 1, Math.floor(progress * (route.polyline.length - 1)));
    const point = route.polyline[index];
    const segmentProgress = index / Math.max(1, route.polyline.length - 1);
    const phase = segmentProgress < 0.1
      ? translate("practice.phase.start")
      : (segmentProgress < 0.85
        ? translate("practice.phase.underway")
        : translate("practice.phase.finished"));

    return { point, phase };
  }

  function renderPracticeMapOverlay() {
    if (!state.practiceRouteLayer || !state.practiceVehicleLayer) {
      return;
    }

    state.practiceRouteLayer.clearLayers();
    state.practiceVehicleLayer.clearLayers();

    getActivePracticeAppointments().forEach((appointment) => {
      if (!appointment.practiceRoute?.polyline?.length) {
        void hydratePracticeRoute(appointment.id);
        return;
      }

      const routePoints = appointment.practiceRoute.polyline.map((point) => [point.lat, point.lng]);
      L.polyline(routePoints, {
        color: "#ff7a00",
        weight: 4,
        opacity: 0.72,
        dashArray: "8 8"
      }).addTo(state.practiceRouteLayer);

      const markerState = getPracticeMarkerState(appointment);
      if (!markerState) {
        return;
      }

      const vehicle = appointment.vehicleId ? getLocalizedVehicle(appointment.vehicleId) : null;
      const student = appointment.studentIds?.[0] ? getStudentById(appointment.studentIds[0]) : null;
      const marker = L.marker([markerState.point.lat, markerState.point.lng], {
        icon: L.divIcon({
          className: "practice-vehicle-marker",
          html: `<span>${vehicle?.name?.slice(0, 1) || "A"}</span>`
        })
      }).bindPopup(
        `<strong>${vehicle?.name || translate("practice.route.vehicleFallback")}</strong><br>${student?.name || "-"}<br>${markerState.phase}`
      );
      marker.addTo(state.practiceVehicleLayer);
    });
  }

  function cancelPracticeAppointment(appointment, reasonKey = "practice.abort.generic") {
    const student = appointment.studentIds?.[0] ? getStudentById(appointment.studentIds[0]) : null;
    abortPracticeLesson({
      studentId: student?.id || "",
      routeSummary: formatPracticeRouteSummary(appointment.practiceRoute),
      reason: translate(reasonKey)
    });
    state.currentGameState.appointments = state.currentGameState.appointments.map((entry) => (
      entry.id === appointment.id
        ? { ...entry, status: "cancelled", outcomeApplied: true }
        : entry
    ));
    saveCurrentGameState();
  }

  function ensurePracticeAppointmentData(appointment) {
    if (appointment.type !== "practice") {
      return appointment;
    }

    const student = appointment.studentIds?.[0] ? getStudentById(appointment.studentIds[0]) : null;
    if (!student) {
      return appointment;
    }

    const garage = getPracticeGarage(student);
    return {
      ...appointment,
      locationId: garage?.id || appointment.locationId,
      practiceRoute: appointment.practiceRoute || null
    };
  }

  function renderDayOptions() {
    const currentDay = getCurrentAbsoluteDay();
    const currentValue = elements.scheduleDaySelect.value;
    elements.scheduleDaySelect.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const absoluteDay = currentDay + index;
      return `<option value="${absoluteDay}">${getAbsoluteDayLabel(absoluteDay)}</option>`;
    }).join("");
    elements.scheduleDaySelect.value = currentValue && [...elements.scheduleDaySelect.options].some((option) => option.value === currentValue)
      ? currentValue
      : String(currentDay);
  }

  function getStudentNeedTemplates() {
    const buildings = state.currentGameState?.buildings || [];
    const theoryBuildings = getTheoryCapableBuildings();
    const students = (state.currentGameState?.students || []).filter((entry) => entry.status !== "completed");
    const templates = [];

    theoryBuildings.forEach((building) => {
      const groupedByInstructor = new Map();
      students
        .filter((student) => student.progress?.theory !== "passed" && student.assignedInstructorId)
        .forEach((student) => {
          const key = `${building.id}-${student.assignedInstructorId}`;
          const current = groupedByInstructor.get(key) || [];
          current.push(student);
          groupedByInstructor.set(key, current);
        });

      groupedByInstructor.forEach((groupStudents, key) => {
        const capacity = Math.max(1, Number(building.classroomCapacity || 1));
        const batch = groupStudents.slice(0, capacity);
        const instructorId = batch[0]?.assignedInstructorId || "";
        templates.push({
          id: `template-theory-group-${key}`,
          kind: "template",
          type: "theory",
          duration: 90,
          studentIds: batch.map((entry) => entry.id),
          instructorId,
          vehicleId: "",
          locationId: building.id,
          label: translate("schedule.templateTheoryGroup", {
            count: batch.length,
            location: building.name
          }),
          badges: [
            translate("schedule.capacityBadge", { count: batch.length, capacity }),
            translate("schedule.instructorLabel", { name: getLocalizedInstructor(instructorId)?.name || "-" }),
            translate("schedule.locationLabel", { name: building.name })
          ],
          isReady: Boolean(instructorId && building.id)
        });
      });
    });

    students.forEach((student) => {
      const assignedInstructorId = student.assignedInstructorId || "";
      const assignedVehicleId = student.assignedVehicleId || getVehicleForInstructor(assignedInstructorId)?.id || "";
      const defaultLocationId = getPracticeGarage(student)?.id || student.assignedOfficeId || buildings[0]?.id || "";

      if (student.progress?.theoryExam === "passed" && student.progress?.practice !== "passed") {
        templates.push({
          id: `template-practice-${student.id}`,
          kind: "template",
          type: "practice",
          duration: PRACTICE_LESSON_BASE_MINUTES,
          studentIds: [student.id],
          instructorId: assignedInstructorId,
          vehicleId: assignedVehicleId,
          locationId: defaultLocationId,
          label: translate("schedule.templatePractice", { student: student.name }),
          badges: [
            translate("schedule.studentLabel", { name: student.name }),
            assignedInstructorId
              ? translate("schedule.instructorLabel", { name: getLocalizedInstructor(assignedInstructorId)?.name || "-" })
              : translate("schedule.templateMissingInstructor"),
            assignedVehicleId
              ? translate("schedule.vehicleLabel", { name: getLocalizedVehicle(assignedVehicleId)?.name || "-" })
              : translate("schedule.templateMissingVehicle")
          ],
          isReady: Boolean(assignedInstructorId && assignedVehicleId && defaultLocationId)
        });
      }
    });

    return templates;
  }

  function renderTemplateList() {
    const templates = getStudentNeedTemplates();

    if (templates.length === 0) {
      elements.scheduleTemplateList.innerHTML = `<div class="team-entry">${translate("schedule.templateEmpty")}</div>`;
      return;
    }

    elements.scheduleTemplateList.innerHTML = templates.map((template) => `
      <article
        class="schedule-template-card ${template.isReady ? "" : "is-disabled"}"
        draggable="${template.isReady ? "true" : "false"}"
        data-template-id="${template.id}"
      >
        <strong>${template.label}</strong>
        <div class="schedule-template-meta">
          <span>${translate(`schedule.type.${template.type}`)}</span>
          <span>${translate("schedule.durationShort", { minutes: template.duration })}</span>
        </div>
        <div class="schedule-template-meta">
          ${template.badges.map((badge) => `<span>${badge}</span>`).join("")}
        </div>
      </article>
    `).join("");
  }

  function renderSummary() {
    const currentDay = getCurrentAbsoluteDay();
    const todayAppointments = (state.currentGameState?.appointments || []).filter((entry) => Math.floor(entry.startMinute / MINUTES_PER_DAY) === currentDay);
    const openAppointments = todayAppointments.filter((entry) => getAppointmentStatus(entry) === "scheduled").length;

    elements.scheduleSummary.innerHTML = `
      <strong>${translate("schedule.summaryTitle")}</strong>
      <div class="team-entry-meta">
        <span>${translate("schedule.currentDay", { day: getAbsoluteDayLabel(currentDay) })}</span>
        <span>${translate("schedule.todayCount", { count: todayAppointments.length })}</span>
        <span>${translate("schedule.openCount", { count: openAppointments })}</span>
      </div>
    `;
  }

  function renderAppointmentList() {
    syncAppointmentStatuses();
    const appointments = [...(state.currentGameState?.appointments || [])]
      .sort((a, b) => a.startMinute - b.startMinute);

    if (appointments.length === 0) {
      elements.scheduleAppointmentList.innerHTML = `<div class="team-entry">${translate("schedule.empty")}</div>`;
      return;
    }

    elements.scheduleAppointmentList.innerHTML = appointments.map((entry) => {
      const instructor = entry.instructorId ? getLocalizedInstructor(entry.instructorId) : null;
      const vehicle = entry.vehicleId ? getLocalizedVehicle(entry.vehicleId) : null;
      const studentNames = (entry.studentIds || [])
        .map((studentId) => (state.currentGameState?.students || []).find((candidate) => candidate.id === studentId)?.name)
        .filter(Boolean);
      const location = (state.currentGameState?.buildings || []).find((candidate) => candidate.id === entry.locationId);
      const absoluteDay = Math.floor(entry.startMinute / MINUTES_PER_DAY);
      const start = formatClock(entry.startMinute % MINUTES_PER_DAY);
      const end = formatClock(entry.endMinute % MINUTES_PER_DAY);
      const status = getAppointmentStatus(entry);

      return `
        <div class="team-entry">
          <strong>${translate(`schedule.type.${entry.type}`)}</strong>
          <div class="team-entry-meta">
            <span>${translate("schedule.daySlot", { day: getAbsoluteDayLabel(absoluteDay), start, end })}</span>
            <span>${translate("schedule.instructorLabel", { name: instructor?.name || "-" })}</span>
            <span>${translate("schedule.vehicleLabel", { name: vehicle?.name || "-" })}</span>
            <span>${translate("schedule.groupLabel", { names: studentNames.join(", ") || "-" })}</span>
            <span>${translate("schedule.locationLabel", { name: location?.name || "-" })}</span>
            <span>${translate(`schedule.status.${status}`)}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderHistoryList() {
    const container = document.getElementById("scheduleHistoryList");
    if (!container) {
      return;
    }

    const logs = state.currentGameState?.logs || [];
    if (logs.length === 0) {
      container.innerHTML = `<div class="team-entry">${translate("schedule.historyEmpty")}</div>`;
      return;
    }

    container.innerHTML = logs.slice(0, 8).map((entry) => `
      <div class="team-entry">
        <strong>${translate("schedule.historyTitle")}</strong>
        <div class="team-entry-meta">
          <span>${entry.text}</span>
        </div>
      </div>
    `).join("");
  }

  function getSelectedDayAppointments() {
    const absoluteDay = getSelectedAbsoluteDay();
    return (state.currentGameState?.appointments || [])
      .filter((entry) => Math.floor(entry.startMinute / MINUTES_PER_DAY) === absoluteDay)
      .sort((a, b) => a.startMinute - b.startMinute);
  }

  function renderCalendarBoard() {
    const totalSlots = (BOARD_END_MINUTE - BOARD_START_MINUTE) / SLOT_MINUTES;
    const timeColumn = Array.from({ length: totalSlots }, (_, index) => {
      const minuteOfDay = BOARD_START_MINUTE + (index * SLOT_MINUTES);
      const label = minuteOfDay % 60 === 0 ? formatClock(minuteOfDay) : "";
      return `<div class="schedule-time-label">${label}</div>`;
    }).join("");

    const slots = Array.from({ length: totalSlots }, (_, index) => {
      const minuteOfDay = BOARD_START_MINUTE + (index * SLOT_MINUTES);
      return `<div class="schedule-slot" data-slot-minute="${minuteOfDay}"></div>`;
    }).join("");

    const appointments = getSelectedDayAppointments().map((entry) => {
      const minuteOfDay = entry.startMinute % MINUTES_PER_DAY;
      const duration = entry.endMinute - entry.startMinute;
      const offsetTop = ((minuteOfDay - BOARD_START_MINUTE) / SLOT_MINUTES) * SLOT_HEIGHT;
      const height = Math.max((duration / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT);
      const instructor = entry.instructorId ? getLocalizedInstructor(entry.instructorId) : null;
      const studentNames = (entry.studentIds || [])
        .map((studentId) => (state.currentGameState?.students || []).find((candidate) => candidate.id === studentId)?.name)
        .filter(Boolean);
      const status = getAppointmentStatus(entry);

      return `
        <article
          class="schedule-appointment-card ${status === "completed" ? "is-completed" : ""}"
          style="top:${offsetTop}px;height:${height - 6}px;"
          draggable="true"
          data-appointment-id="${entry.id}"
        >
          <strong>${translate(`schedule.type.${entry.type}`)}</strong>
          <div class="schedule-appointment-meta">
            <span>${formatClock(minuteOfDay)} - ${formatClock(entry.endMinute % MINUTES_PER_DAY)}</span>
            <span>${entry.type === "theory"
              ? translate("schedule.groupCount", { count: entry.studentIds?.length || 0 })
              : (studentNames[0] || "-")}</span>
            <span>${instructor?.name || "-"}</span>
          </div>
        </article>
      `;
    }).join("");

    elements.scheduleCalendarBoard.innerHTML = `
      <div class="schedule-board-grid">
        <div class="schedule-time-column">${timeColumn}</div>
        <div class="schedule-slot-column">
          ${slots}
          <div class="schedule-appointments-layer">${appointments}</div>
        </div>
      </div>
    `;
  }

  function renderSpeedButtons() {
    const speed = state.currentGameState?.time?.speed || 1;
    elements.timeSpeedButtons.forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.timeSpeed) === speed);
    });
  }

  function renderPanel() {
    renderDayOptions();
    renderSummary();
    renderTemplateList();
    renderCalendarBoard();
    renderAppointmentList();
    renderHistoryList();
    renderSpeedButtons();
    renderPracticeMapOverlay();
  }

  function openPanel() {
    closeAllPanels();
    elements.schedulePanel.classList.remove("hidden");
    renderPanel();
  }

  function closePanel() {
    elements.schedulePanel.classList.add("hidden");
  }

  function validateAppointmentPayload(payload, startMinute) {
    const endMinute = startMinute + payload.duration;
    const instructor = state.currentGameState.instructors.find((entry) => entry.id === payload.instructorId);
    const vehicle = state.currentGameState.vehicles.find((entry) => entry.id === payload.vehicleId);
    const students = (payload.studentIds || [])
      .map((studentId) => state.currentGameState.students.find((entry) => entry.id === studentId))
      .filter(Boolean);
    const location = state.currentGameState.buildings.find((entry) => entry.id === payload.locationId);

    if (!payload.instructorId || !payload.studentIds?.length || !payload.locationId) {
      setScheduleStatus("schedule.status.missing", {}, true);
      return null;
    }

    if (payload.type === "practice" && !payload.vehicleId) {
      setScheduleStatus("schedule.status.practiceNeedsVehicle", {}, true);
      return null;
    }

    if (payload.type === "practice" && vehicle?.assignedInstructorId && vehicle.assignedInstructorId !== payload.instructorId) {
      setScheduleStatus("schedule.status.practiceVehicleMismatch", {}, true);
      return null;
    }

    if (payload.type === "practice") {
      const missingHome = students.find((student) => !student.homeLat || !student.homeLng);
      if (missingHome) {
        setScheduleStatus("schedule.status.practiceNeedsHome", {}, true);
        return null;
      }
    }

    if (!isInsideAvailability(instructor, "instructor", startMinute, endMinute)) {
      setScheduleStatus("schedule.status.instructorUnavailable", {}, true);
      return null;
    }

    if (payload.vehicleId && !isInsideAvailability(vehicle, "vehicle", startMinute, endMinute)) {
      setScheduleStatus("schedule.status.vehicleUnavailable", {}, true);
      return null;
    }

    if (payload.type === "theory" && Number(location?.classroomCapacity || 0) < payload.studentIds.length) {
      setScheduleStatus("schedule.status.classroomCapacity", {
        count: payload.studentIds.length,
        capacity: Number(location?.classroomCapacity || 0)
      }, true);
      return null;
    }

    const unavailableStudent = students.find((student) => !isInsideAvailability(student, "student", startMinute, endMinute));
    if (unavailableStudent) {
      setScheduleStatus("schedule.status.studentUnavailable", {}, true);
      return null;
    }

    if (!isInsideAvailability(location, "location", startMinute, endMinute)) {
      setScheduleStatus("schedule.status.locationUnavailable", {}, true);
      return null;
    }

    const conflict = findConflict({
      startMinute,
      endMinute,
      instructorId: payload.instructorId,
      vehicleId: payload.vehicleId,
      studentIds: payload.studentIds,
      locationId: payload.locationId,
      ignoreAppointmentId: payload.ignoreAppointmentId
    });

    if (conflict) {
      setScheduleStatus("schedule.status.conflict", {}, true);
      return null;
    }

    return {
      ...payload,
      startMinute,
      endMinute
    };
  }

  function buildTemplatePayload(templateId) {
    const template = getStudentNeedTemplates().find((entry) => entry.id === templateId);
    if (!template || !template.isReady) {
      setScheduleStatus("schedule.status.templateIncomplete", {}, true);
      return null;
    }

    return {
      type: template.type,
      duration: template.duration,
      studentIds: template.studentIds || [],
      instructorId: template.instructorId,
      vehicleId: template.vehicleId,
      locationId: template.locationId
    };
  }

  function buildAppointmentPayload(appointmentId) {
    const appointment = (state.currentGameState?.appointments || []).find((entry) => entry.id === appointmentId);
    if (!appointment) {
      return null;
    }

    return {
      type: appointment.type,
      duration: appointment.endMinute - appointment.startMinute,
      studentIds: appointment.studentIds || [],
      instructorId: appointment.instructorId,
      vehicleId: appointment.vehicleId,
      locationId: appointment.locationId,
      ignoreAppointmentId: appointment.id
    };
  }

  function handleDropOnSlot(slotMinute) {
    if (!dragPayload) {
      return;
    }

    const startMinute = (getSelectedAbsoluteDay() * MINUTES_PER_DAY) + slotMinute;
    const payload = dragPayload.kind === "template"
      ? buildTemplatePayload(dragPayload.id)
      : buildAppointmentPayload(dragPayload.id);

    if (!payload) {
      dragPayload = null;
      return;
    }

    const validated = validateAppointmentPayload(payload, startMinute);
    if (!validated) {
      dragPayload = null;
      return;
    }

    if (dragPayload.kind === "appointment") {
      state.currentGameState.appointments = state.currentGameState.appointments.map((entry) => (
        entry.id === dragPayload.id
          ? ensurePracticeAppointmentData(normalizeAppointment({
            ...entry,
            startMinute: validated.startMinute,
            endMinute: validated.endMinute
          }))
          : entry
      ));
      setScheduleStatus("schedule.status.moved");
    } else {
      const newAppointment = ensurePracticeAppointmentData(normalizeAppointment({
        id: `${Date.now()}`,
        startMinute: validated.startMinute,
        endMinute: validated.endMinute,
        type: validated.type,
        studentIds: validated.studentIds,
        instructorId: validated.instructorId,
        vehicleId: validated.vehicleId,
        studentId: validated.studentIds[0] || "",
        locationId: validated.locationId,
        status: "scheduled",
        automationEligible: true,
        outcomeApplied: false
      }));
      state.currentGameState.appointments.push(newAppointment);
      setScheduleStatus("schedule.status.created");
    }

    dragPayload = null;
    saveCurrentGameState();
    renderPanel();
    renderPracticeMapOverlay();
  }

  function clearDropTargets() {
    elements.scheduleCalendarBoard.querySelectorAll(".schedule-slot.is-drop-target").forEach((slot) => {
      slot.classList.remove("is-drop-target");
    });
  }

  function handleClockTick({ didDayChange, totalMinutes }) {
    state.currentGameState.appointments = (state.currentGameState.appointments || []).map((entry) => ensurePracticeAppointmentData(entry));
    syncAppointmentStatuses();

    const activePracticeAppointments = getActivePracticeAppointments(totalMinutes);
    if (activePracticeAppointments.length > 0) {
      activePracticeAppointments.forEach((entry) => {
        const student = entry.studentIds?.[0] ? getStudentById(entry.studentIds[0]) : null;
        const vehicle = (state.currentGameState?.vehicles || []).find((candidate) => candidate.id === entry.vehicleId);
        const instructor = (state.currentGameState?.instructors || []).find((candidate) => candidate.id === entry.instructorId);
        const garage = student ? getPracticeGarage(student) : null;
        const isBroken = !student
          || !student.homeLat
          || !student.homeLng
          || !vehicle
          || !instructor
          || !garage
          || (vehicle.assignedInstructorId && vehicle.assignedInstructorId !== entry.instructorId);

        if (isBroken) {
          cancelPracticeAppointment(entry, "practice.abort.resource");
        }
      });
    }

    const theoryToApply = (state.currentGameState?.appointments || []).filter((entry) => (
      entry.type === "theory"
      && entry.status === "completed"
      && !entry.outcomeApplied
    ));

    if (theoryToApply.length > 0) {
      theoryToApply.forEach((entry) => {
        applyTheoryLessonBatch({
          studentIds: entry.studentIds || [],
          instructorId: entry.instructorId,
          startMinute: entry.startMinute,
          endMinute: entry.endMinute,
          groupSize: entry.studentIds?.length || 1
        });
      });

      state.currentGameState.appointments = state.currentGameState.appointments.map((entry) => (
        theoryToApply.some((candidate) => candidate.id === entry.id)
          ? { ...entry, outcomeApplied: true }
          : entry
      ));
      saveCurrentGameState();
      refreshStudentsPanel();
    }

    const practiceToApply = (state.currentGameState?.appointments || []).filter((entry) => (
      entry.type === "practice"
      && entry.status === "completed"
      && !entry.outcomeApplied
    ));

    if (practiceToApply.length > 0) {
      practiceToApply.forEach((entry) => {
        const studentId = entry.studentIds?.[0] || "";
        applyPracticeLesson({
          studentId,
          instructorId: entry.instructorId,
          vehicleId: entry.vehicleId,
          startMinute: entry.startMinute,
          endMinute: entry.endMinute,
          routeSummary: formatPracticeRouteSummary(entry.practiceRoute)
        });
      });

      state.currentGameState.appointments = state.currentGameState.appointments.map((entry) => (
        practiceToApply.some((candidate) => candidate.id === entry.id)
          ? { ...entry, outcomeApplied: true }
          : entry
      ));
      saveCurrentGameState();
      refreshStudentsPanel();
    }

    if (didDayChange || totalMinutes % 15 === 0) {
      saveCurrentGameState();
    }

    renderPracticeMapOverlay();

    if (!elements.schedulePanel.classList.contains("hidden")) {
      renderSummary();
      renderCalendarBoard();
      renderAppointmentList();
      renderDayOptions();
      renderTemplateList();
      renderHistoryList();
    }
  }

  function changeSelectedDay(offset) {
    const nextDay = getSelectedAbsoluteDay() + offset;
    const options = [...elements.scheduleDaySelect.options];
    if (options.some((option) => Number(option.value) === nextDay)) {
      elements.scheduleDaySelect.value = String(nextDay);
      renderCalendarBoard();
      renderAppointmentList();
    }
  }

  function bindEvents() {
    elements.plannerMenuBtn.addEventListener("click", openPanel);
    elements.closeSchedulePanelBtn.addEventListener("click", closePanel);
    elements.scheduleDaySelect.addEventListener("change", () => {
      renderCalendarBoard();
      renderAppointmentList();
    });
    elements.schedulePrevDayBtn.addEventListener("click", () => changeSelectedDay(-1));
    elements.scheduleNextDayBtn.addEventListener("click", () => changeSelectedDay(1));
    elements.timeSpeedButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setTimeSpeed(Number(button.dataset.timeSpeed));
        updateClock();
        renderSpeedButtons();
        saveCurrentGameState();
      });
    });

    elements.scheduleTemplateList.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-template-id]");
      if (!card || card.classList.contains("is-disabled")) {
        event.preventDefault();
        return;
      }

      dragPayload = { kind: "template", id: card.dataset.templateId };
    });

    elements.scheduleTemplateList.addEventListener("dragend", () => {
      dragPayload = null;
      clearDropTargets();
    });

    elements.scheduleCalendarBoard.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-appointment-id]");
      if (!card) {
        return;
      }

      dragPayload = { kind: "appointment", id: card.dataset.appointmentId };
    });

    elements.scheduleCalendarBoard.addEventListener("dragend", () => {
      dragPayload = null;
      clearDropTargets();
    });

    elements.scheduleCalendarBoard.addEventListener("dragover", (event) => {
      const slot = event.target.closest("[data-slot-minute]");
      if (!slot || !dragPayload) {
        return;
      }

      event.preventDefault();
      clearDropTargets();
      slot.classList.add("is-drop-target");
    });

    elements.scheduleCalendarBoard.addEventListener("dragleave", (event) => {
      const slot = event.target.closest("[data-slot-minute]");
      if (!slot) {
        return;
      }

      slot.classList.remove("is-drop-target");
    });

    elements.scheduleCalendarBoard.addEventListener("drop", (event) => {
      const slot = event.target.closest("[data-slot-minute]");
      if (!slot || !dragPayload) {
        return;
      }

      event.preventDefault();
      clearDropTargets();
      handleDropOnSlot(Number(slot.dataset.slotMinute));
    });

    subscribeToClockTicks(handleClockTick);
  }

  function getSchedulingHooks() {
    return {
      automationReady: true,
      getNextSuggestedWindow(resourceType) {
        return {
          resourceType,
          fromMinute: getCurrentTotalMinutes()
        };
      }
    };
  }

  return {
    bindEvents,
    closePanel,
    getSchedulingHooks,
    normalizeGameState,
    openPanel,
    renderPanel,
    renderPracticeMapOverlay,
    renderSpeedButtons
  };
}
