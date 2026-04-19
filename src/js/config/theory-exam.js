export const THEORY_EXAM_FEE = 140;
export const THEORY_EXAM_REGISTRATION_CREDIT = 25;
export const THEORY_EXAM_PASSING_ERROR_POINTS = 10;
export const THEORY_EXAM_RETAKE_DELAY_MINUTES = 24 * 60;
export const THEORY_EXAM_QUESTION_COUNT = 5;

export const theoryQuestionPool = [
  {
    id: "right-of-way-crossing-1",
    category: "rightOfWay",
    difficulty: "easy",
    errorPoints: 2,
    prompt: {
      de: "Du naeherst dich einer Kreuzung ohne Beschilderung. Von rechts kommt ein Fahrzeug. Wie verhaeltst du dich?",
      en: "You approach an unsigned intersection. A vehicle is coming from the right. How do you react?"
    },
    answers: {
      de: ["Ich fahre zuerst.", "Ich gewaehre Vorfahrt.", "Ich hupe und fahre weiter."],
      en: ["I go first.", "I yield.", "I honk and keep going."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "right-of-way-emergency-1",
    category: "rightOfWay",
    difficulty: "medium",
    errorPoints: 3,
    prompt: {
      de: "Ein Einsatzfahrzeug mit Blaulicht und Martinshorn naehert sich. Was gilt?",
      en: "An emergency vehicle with lights and siren approaches. What applies?"
    },
    answers: {
      de: ["Ich darf normal weiterfahren.", "Ich bilde sofort freie Bahn.", "Ich halte nur an, wenn ich rot habe."],
      en: ["I may continue normally.", "I immediately clear the way.", "I only stop if my light is red."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "signs-speed-zone-1",
    category: "roadSigns",
    difficulty: "easy",
    errorPoints: 2,
    prompt: {
      de: "Was bedeutet ein rundes Schild mit rotem Rand und der Zahl 30?",
      en: "What does a round sign with a red border and the number 30 mean?"
    },
    answers: {
      de: ["Empfohlene Geschwindigkeit 30 km/h", "Hoechstgeschwindigkeit 30 km/h", "Mindestens 30 km/h fahren"],
      en: ["Recommended speed 30 km/h", "Maximum speed 30 km/h", "Drive at least 30 km/h"]
    },
    correctAnswerIndex: 1
  },
  {
    id: "signs-environment-zone-1",
    category: "roadSigns",
    difficulty: "hard",
    errorPoints: 5,
    prompt: {
      de: "Wofuer steht das rechteckige Schild 'Umweltzone'?",
      en: "What does the rectangular 'environmental zone' sign indicate?"
    },
    answers: {
      de: ["Nur Anwohner duerfen einfahren.", "Nur Fahrzeuge mit passender Umweltplakette duerfen hinein.", "Es gilt absolutes Halteverbot."],
      en: ["Only residents may enter.", "Only vehicles with the correct environmental sticker may enter.", "No stopping at all applies."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "hazard-braking-distance-1",
    category: "hazards",
    difficulty: "medium",
    errorPoints: 3,
    prompt: {
      de: "Die Fahrbahn ist nass und rutschig. Wie veraendert sich dein Bremsweg?",
      en: "The road is wet and slippery. How does your braking distance change?"
    },
    answers: {
      de: ["Er wird kuerzer.", "Er bleibt gleich.", "Er wird laenger."],
      en: ["It becomes shorter.", "It stays the same.", "It becomes longer."]
    },
    correctAnswerIndex: 2
  },
  {
    id: "hazard-children-1",
    category: "hazards",
    difficulty: "easy",
    errorPoints: 2,
    prompt: {
      de: "Neben der Fahrbahn spielen Kinder. Wie solltest du reagieren?",
      en: "Children are playing next to the road. How should you react?"
    },
    answers: {
      de: ["Geschwindigkeit anpassen und bremsbereit sein.", "Nur den Abstand leicht vergroessern.", "Weiterfahren, solange sie auf dem Gehweg bleiben."],
      en: ["Adjust speed and be ready to brake.", "Only increase distance a little.", "Continue as long as they stay on the sidewalk."]
    },
    correctAnswerIndex: 0
  },
  {
    id: "hazard-alcohol-1",
    category: "hazards",
    difficulty: "hard",
    errorPoints: 5,
    prompt: {
      de: "Du fuehlst dich nach Alkohol noch fit. Was ist die sichere Entscheidung?",
      en: "You still feel fit after drinking alcohol. What is the safe decision?"
    },
    answers: {
      de: ["Langsamer fahren.", "Gar nicht fahren.", "Nur kurze Strecken fahren."],
      en: ["Drive slower.", "Do not drive at all.", "Only drive short distances."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "vehicle-seatbelt-1",
    category: "vehicleKnowledge",
    difficulty: "easy",
    errorPoints: 2,
    prompt: {
      de: "Wann muessen Sicherheitsgurte angelegt sein?",
      en: "When must seat belts be worn?"
    },
    answers: {
      de: ["Nur auf der Autobahn.", "Sobald das Fahrzeug faehrt.", "Nur auf dem Vordersitz."],
      en: ["Only on motorways.", "Whenever the vehicle is moving.", "Only in the front seats."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "vehicle-tires-1",
    category: "vehicleKnowledge",
    difficulty: "medium",
    errorPoints: 3,
    prompt: {
      de: "Was bewirkt zu geringer Reifendruck?",
      en: "What is an effect of tire pressure that is too low?"
    },
    answers: {
      de: ["Der Bremsweg kann laenger werden.", "Das Fahrzeug spart Kraftstoff.", "Die Lenkung wird praeziser."],
      en: ["The braking distance can increase.", "The vehicle saves fuel.", "Steering becomes more precise."]
    },
    correctAnswerIndex: 0
  },
  {
    id: "vehicle-warning-light-1",
    category: "vehicleKnowledge",
    difficulty: "hard",
    errorPoints: 4,
    prompt: {
      de: "Eine rote Warnleuchte fuer den Oeldruck geht waehrend der Fahrt an. Was tust du?",
      en: "A red oil pressure warning light comes on while driving. What do you do?"
    },
    answers: {
      de: ["Weiterfahren und spaeter kontrollieren.", "Motor moeglichst bald anhalten und Ursache pruefen lassen.", "Nur die Heizung ausschalten."],
      en: ["Keep driving and check later.", "Stop the engine as soon as possible and have the cause checked.", "Only switch off the heating."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "rules-phone-1",
    category: "trafficRules",
    difficulty: "easy",
    errorPoints: 2,
    prompt: {
      de: "Darfst du waehrend der Fahrt ein Handy in die Hand nehmen?",
      en: "May you hold a phone in your hand while driving?"
    },
    answers: {
      de: ["Ja, wenn ich langsam fahre.", "Nein, grundsaetzlich nicht.", "Ja, bei kurzen Gesprächen."],
      en: ["Yes, if I drive slowly.", "No, generally not.", "Yes, for short calls."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "rules-follow-distance-1",
    category: "trafficRules",
    difficulty: "medium",
    errorPoints: 3,
    prompt: {
      de: "Warum ist ausreichender Sicherheitsabstand wichtig?",
      en: "Why is a sufficient safety distance important?"
    },
    answers: {
      de: ["Damit ich spaeter bremsen kann.", "Damit ich bei ploetzlichem Bremsen reagieren kann.", "Damit ich schneller ueberholen kann."],
      en: ["So I can brake later.", "So I can react if someone brakes suddenly.", "So I can overtake faster."]
    },
    correctAnswerIndex: 1
  },
  {
    id: "rules-zebra-crossing-1",
    category: "trafficRules",
    difficulty: "hard",
    errorPoints: 4,
    prompt: {
      de: "Ein Fussgaenger will einen Zebrastreifen benutzen. Was gilt?",
      en: "A pedestrian wants to use a zebra crossing. What applies?"
    },
    answers: {
      de: ["Ich darf weiterfahren, wenn ich Vorrang habe.", "Ich muss das Ueberqueren ermoeglichen.", "Ich hupe zur Warnung und fahre weiter."],
      en: ["I may keep driving because I have priority.", "I must allow the pedestrian to cross.", "I honk as a warning and continue."]
    },
    correctAnswerIndex: 1
  }
];
