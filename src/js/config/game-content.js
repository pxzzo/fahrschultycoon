export const storageKeys = {
  users: "drive-academy-users",
  session: "drive-academy-session",
  progress: "drive-academy-progress",
  language: "drive-academy-language"
};

export const defaultGameState = {
  money: 90000,
  tutorialStep: "intro",
  tutorialCompleted: false,
  buildings: [],
  instructors: [],
  vehicles: [],
  students: []
};

export const blueprintConfigs = {
  "starter-office": {
    id: "starter-office",
    price: 25000,
    classroomCapacity: 6,
    nameKey: "office.starter.name",
    descriptionKey: "office.starter.description",
    shortDescriptionKey: "office.starter.shortDescription",
    typeKey: "office.starter.type"
  },
  "starter-garage": {
    id: "starter-garage",
    price: 18000,
    nameKey: "garage.starter.name",
    descriptionKey: "garage.starter.description",
    shortDescriptionKey: "garage.starter.shortDescription",
    typeKey: "garage.starter.type"
  }
};

export const instructorRoster = [
  {
    id: "jana-bergmann",
    salary: 3200,
    name: { de: "Jana Bergmann", en: "Jana Bergmann" },
    specialty: { de: "Stadtfahrten und Pruefungsroutine", en: "City lessons and exam prep" },
    bio: {
      de: "Ruhige Fahrlehrerin mit Fokus auf sichere erste Fahrstunden und stressfreie Pruefungsvorbereitung.",
      en: "Calm instructor focused on safe first lessons and low-stress exam preparation."
    }
  },
  {
    id: "omar-keller",
    salary: 3600,
    name: { de: "Omar Keller", en: "Omar Keller" },
    specialty: { de: "Schaltwagen und Abendtermine", en: "Manual cars and evening lessons" },
    bio: {
      de: "Strukturierter Allrounder fuer Schaltwagen, Berufstaetige und dichte Wochenplaene.",
      en: "Structured all-rounder for manual cars, working students, and packed weekly schedules."
    }
  }
];

export const vehicleCatalog = [
  {
    id: "city-spark",
    price: 14500,
    seats: 4,
    lessonComfort: 62,
    reliability: 64,
    operatingCostPerHour: 22,
    fuel: { de: "Benzin", en: "Petrol" },
    transmission: { de: "Schaltung", en: "Manual" },
    name: { de: "CitySpark One", en: "CitySpark One" },
    description: {
      de: "Guenstiges Einstiegsauto fuer die ersten Fahrstunden in der Stadt.",
      en: "Affordable starter car for your first city driving lessons."
    }
  },
  {
    id: "metro-glide",
    price: 18900,
    seats: 5,
    lessonComfort: 78,
    reliability: 74,
    operatingCostPerHour: 28,
    fuel: { de: "Hybrid", en: "Hybrid" },
    transmission: { de: "Automatik", en: "Automatic" },
    name: { de: "MetroGlide Flex", en: "MetroGlide Flex" },
    description: {
      de: "Komfortables Ausbildungsauto fuer laengere Fahrten und entspannte Stadtpruefungen.",
      en: "Comfortable training car for longer lessons and relaxed city exams."
    }
  }
];

export const studentApplicants = [
  {
    id: "lea-hoffmann",
    name: { de: "Lea Hoffmann", en: "Lea Hoffmann" },
    level: { de: "Anfaengerin", en: "Beginner" },
    focus: { de: "Schneller Start fuer Klasse B", en: "Fast start for class B" },
    motivation: 88,
    nervousness: 34,
    learningSpeed: 76,
    budget: 2800,
    availability: { de: "Unter der Woche ab 16 Uhr", en: "Weekdays after 4 PM" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Motiviert, unter der Woche flexibel und moechte moeglichst bald mit den ersten Stunden beginnen.",
      en: "Motivated, flexible during the week, and wants to start lessons as soon as possible."
    }
  },
  {
    id: "ben-weiss",
    name: { de: "Ben Weiss", en: "Ben Weiss" },
    level: { de: "Wiedereinsteiger", en: "Returning learner" },
    focus: { de: "Pruefung in 8 Wochen geplant", en: "Exam planned in 8 weeks" },
    motivation: 71,
    nervousness: 49,
    learningSpeed: 64,
    budget: 3400,
    availability: { de: "Fruehmorgens und samstags", en: "Early mornings and Saturdays" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Braucht einen strukturierten Plan und einen ruhigen Fahrlehrer fuer konstante Fortschritte.",
      en: "Needs a structured plan and a calm instructor for steady progress."
    }
  },
  {
    id: "nina-yilmaz",
    name: { de: "Nina Yilmaz", en: "Nina Yilmaz" },
    level: { de: "Anfaengerin", en: "Beginner" },
    focus: { de: "Sicher durch die Theorie", en: "Confident theory progress" },
    motivation: 79,
    nervousness: 58,
    learningSpeed: 69,
    budget: 2600,
    availability: { de: "Mo bis Fr abends", en: "Weekday evenings" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Lernt fleissig, braucht aber klare Erklaerungen und einen ruhigen Aufbau.",
      en: "Studies hard but needs clear explanations and a calm structure."
    }
  },
  {
    id: "samir-haddad",
    name: { de: "Samir Haddad", en: "Samir Haddad" },
    level: { de: "Schnellstarter", en: "Fast learner" },
    focus: { de: "Pruefung so frueh wie moeglich", en: "Exam as early as possible" },
    motivation: 93,
    nervousness: 27,
    learningSpeed: 84,
    budget: 3900,
    availability: { de: "Taeglich flexibel", en: "Flexible every day" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Sehr motiviert und zeitlich flexibel, erwartet schnelle Fortschritte und gute Terminplanung.",
      en: "Highly motivated and flexible, expects quick progress and strong scheduling."
    }
  },
  {
    id: "lara-becker",
    name: { de: "Lara Becker", en: "Lara Becker" },
    level: { de: "Unsicherer Start", en: "Cautious beginner" },
    focus: { de: "Stressfrei lernen", en: "Learn without stress" },
    motivation: 67,
    nervousness: 72,
    learningSpeed: 55,
    budget: 3000,
    availability: { de: "Nachmittags unter der Woche", en: "Weekday afternoons" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Braucht viel Geduld im Auto, moechte aber langfristig sicher und ohne Druck vorankommen.",
      en: "Needs a lot of patience in the car, but wants to improve safely and without pressure."
    }
  },
  {
    id: "jonas-nguyen",
    name: { de: "Jonas Nguyen", en: "Jonas Nguyen" },
    level: { de: "Technisch stark", en: "Technically strong" },
    focus: { de: "Schnell in die Praxis", en: "Move into practice fast" },
    motivation: 82,
    nervousness: 38,
    learningSpeed: 81,
    budget: 3200,
    availability: { de: "Abends und sonntags", en: "Evenings and Sundays" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Versteht Regeln schnell, braucht aber viele reale Situationen fuer Sicherheit im Verkehr.",
      en: "Understands rules quickly but needs lots of real traffic situations to build confidence."
    }
  },
  {
    id: "emilia-kraft",
    name: { de: "Emilia Kraft", en: "Emilia Kraft" },
    level: { de: "Pruefungsfokus", en: "Exam-focused" },
    focus: { de: "Saubere Routine fuer die Pruefung", en: "Solid exam routine" },
    motivation: 75,
    nervousness: 61,
    learningSpeed: 70,
    budget: 4100,
    availability: { de: "Mo, Mi, Fr ganztags", en: "Mon, Wed, Fri full day" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Hat bereits etwas Fahrpraxis im Ausland gesammelt und will jetzt strukturiert zum deutschen Abschluss.",
      en: "Already has some driving practice abroad and now wants a structured path to the German licence."
    }
  },
  {
    id: "david-petros",
    name: { de: "David Petros", en: "David Petros" },
    level: { de: "Berufstaetig", en: "Working professional" },
    focus: { de: "Kompakter Wochenplan", en: "Compact weekly schedule" },
    motivation: 73,
    nervousness: 42,
    learningSpeed: 63,
    budget: 3600,
    availability: { de: "Nur spaetabends", en: "Late evenings only" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Wenig Zeit, aber klares Ziel. Braucht effiziente Planung ohne grosse Leerlaufzeiten.",
      en: "Has little time but a clear goal. Needs efficient planning without much idle time."
    }
  },
  {
    id: "mia-schulz",
    name: { de: "Mia Schulz", en: "Mia Schulz" },
    level: { de: "Theoriestark", en: "Theory-focused" },
    focus: { de: "Sicher in den Fahrstunden", en: "Confidence in practical lessons" },
    motivation: 80,
    nervousness: 66,
    learningSpeed: 74,
    budget: 2900,
    availability: { de: "Nach der Schule und samstags", en: "After school and Saturdays" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Ist in der Theorie stark, fuehlt sich im Strassenverkehr aber noch schnell ueberfordert.",
      en: "Strong in theory, but still gets overwhelmed quickly in live traffic."
    }
  },
  {
    id: "alex-romano",
    name: { de: "Alex Romano", en: "Alex Romano" },
    level: { de: "Internationaler Umstieg", en: "International transfer" },
    focus: { de: "Sprache und Verkehrsregeln", en: "Language and traffic rules" },
    motivation: 77,
    nervousness: 47,
    learningSpeed: 68,
    budget: 4300,
    availability: { de: "Flexibel am Vormittag", en: "Flexible in the mornings" },
    language: { de: "Englisch", en: "English" },
    note: {
      de: "Hat Fahrerfahrung, braucht aber Unterstuetzung bei Sprache und lokalen Regeln.",
      en: "Has driving experience but needs support with language and local rules."
    }
  },
  {
    id: "sofie-hahn",
    name: { de: "Sofie Hahn", en: "Sofie Hahn" },
    level: { de: "Ruhiger Aufbau", en: "Slow and steady" },
    focus: { de: "Sichere Routine im Alltag", en: "Safe routine for daily driving" },
    motivation: 69,
    nervousness: 63,
    learningSpeed: 59,
    budget: 2500,
    availability: { de: "Dienstag bis Donnerstag", en: "Tuesday to Thursday" },
    language: { de: "Deutsch", en: "German" },
    note: {
      de: "Moechte lieber langsam und sauber lernen statt moeglichst schnell fertig zu werden.",
      en: "Prefers to learn slowly and cleanly rather than finish as fast as possible."
    }
  }
];
