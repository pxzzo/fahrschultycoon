export const state = {
  currentLanguage: "de",
  currentUser: null,
  currentGameState: null,
  selectedBlueprintId: null,
  selectedPlacement: null,
  placementMarker: null,
  mapInstance: null,
  buildingsLayer: null,
  practiceRouteLayer: null,
  practiceVehicleLayer: null,
  clockTimer: null,
  clockTickListeners: [],
  currentStudentFilter: "applicants",
  tutorialMode: "intro",
  lastAuthStatus: { key: "auth.status.default", params: {} },
  lastSearchStatus: { key: "building.searchStatus.none", params: {}, isError: false }
};
