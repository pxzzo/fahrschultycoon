import { storageKeys } from "../config/game-content.js";

export function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.users) || "[]");
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(storageKeys.users, JSON.stringify(users));
}

export function saveSession(username) {
  localStorage.setItem(storageKeys.session, username);
}

export function loadProgressStore() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.progress) || "{}");
  } catch {
    return {};
  }
}

export function saveProgressStore(progressStore) {
  localStorage.setItem(storageKeys.progress, JSON.stringify(progressStore));
}
