import { blueprintConfigs, instructorRoster, studentApplicants, vehicleCatalog } from "../config/game-content.js";
import { state } from "./state.js";
import { translate } from "./game-state.js";

export function getBlueprintById(blueprintId) {
  const config = blueprintConfigs[blueprintId];

  if (!config) {
    return null;
  }

  return {
    id: config.id,
    price: config.price,
    classroomCapacity: config.classroomCapacity || 0,
    name: translate(config.nameKey),
    description: translate(config.descriptionKey),
    shortDescription: translate(config.shortDescriptionKey),
    type: translate(config.typeKey)
  };
}

export function getInstructorProfile(candidateId) {
  return instructorRoster.find((entry) => entry.id === candidateId) || null;
}

export function getLocalizedInstructor(candidateId) {
  const profile = getInstructorProfile(candidateId);

  if (!profile) {
    return null;
  }

  return {
    ...profile,
    name: profile.name[state.currentLanguage],
    specialty: profile.specialty[state.currentLanguage],
    bio: profile.bio[state.currentLanguage]
  };
}

export function getVehicleById(vehicleId) {
  return vehicleCatalog.find((entry) => entry.id === vehicleId) || null;
}

export function getLocalizedVehicle(vehicleId) {
  const vehicle = getVehicleById(vehicleId);

  if (!vehicle) {
    return null;
  }

  return {
    ...vehicle,
    name: vehicle.name[state.currentLanguage],
    description: vehicle.description[state.currentLanguage],
    fuel: vehicle.fuel[state.currentLanguage],
    transmission: vehicle.transmission[state.currentLanguage]
  };
}

export function getStudentApplicant(applicantId) {
  return studentApplicants.find((entry) => entry.id === applicantId) || null;
}

export function getLocalizedStudentApplicant(applicantId) {
  const applicant = getStudentApplicant(applicantId);

  if (!applicant) {
    return null;
  }

  return {
    ...applicant,
    name: applicant.name[state.currentLanguage],
    level: applicant.level[state.currentLanguage],
    focus: applicant.focus[state.currentLanguage],
    note: applicant.note[state.currentLanguage],
    availability: applicant.availability?.[state.currentLanguage] || applicant.availability,
    language: applicant.language?.[state.currentLanguage] || applicant.language
  };
}

export { instructorRoster, studentApplicants, vehicleCatalog };
