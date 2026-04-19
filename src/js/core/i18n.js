import { storageKeys } from "../config/game-content.js";
import { translations } from "../config/translations.js";

export function loadLanguage() {
  const savedLanguage = localStorage.getItem(storageKeys.language);
  return savedLanguage === "en" ? "en" : "de";
}

export function saveLanguage(language) {
  localStorage.setItem(storageKeys.language, language);
}

export function t(language, key, params = {}) {
  const template = translations[language][key] || translations.de[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ""));
}

export function getLocale(language) {
  return language === "en" ? "en-IE" : "de-DE";
}

export function formatCurrency(language, value) {
  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}
