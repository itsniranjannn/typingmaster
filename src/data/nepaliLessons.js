import { NEPALI_WORDS } from "./nepaliText";

/**
 * Guided Nepali typing course. Lessons go from the home row outwards, then vowel
 * signs, Shift letters and conjuncts, the same order a typing teacher would use.
 * Each lesson builds a drill string out of only the characters it teaches.
 *
 * kind "letters":   random 2-4 character clusters from `chars`
 * kind "syllables": consonant + vowel sign pairs (consonants from `base`, signs from `chars`)
 * kind "words":     real words that use the lesson's characters
 */

const HOME_BASE = ["क", "ग", "द", "स", "ल", "ज", "ह"]; // क ग द स ल ज ह

export const NEPALI_LESSONS = [
  {
    id: "home-left",
    title: "Home row: left hand",
    summary: "ा स द उ ग. Rest your left fingers here: pinky, ring, middle, index, index.",
    kind: "letters",
    chars: ["ा", "स", "द", "उ", "ग"]
  },
  {
    id: "home-right",
    title: "Home row: right hand",
    summary: "ह ज क ल ; Rest your right fingers here.",
    kind: "letters",
    chars: ["ह", "ज", "क", "ल"]
  },
  {
    id: "home-both",
    title: "Home row together",
    summary: "Both hands on the home row, plus space with your thumb.",
    kind: "letters",
    chars: ["ा", "स", "द", "उ", "ग", "ह", "ज", "क", "ल"]
  },
  {
    id: "top-row",
    title: "Top row",
    summary: "ट र त य प इ ए. Reach up and come straight back home.",
    kind: "letters",
    chars: ["ट", "र", "त", "य", "प", "इ", "ए"]
  },
  {
    id: "bottom-row",
    title: "Bottom row",
    summary: "ष ड च व ब न म and ।. Reach down with the same finger that owns the column.",
    kind: "letters",
    chars: ["ष", "ड", "च", "व", "ब", "न", "म", "।"]
  },
  {
    id: "matras",
    title: "Vowel signs (matras)",
    summary: "◌ा ◌ि ◌ु ◌े ◌ो ◌ौ attach to the consonant you typed just before them.",
    kind: "syllables",
    base: HOME_BASE,
    chars: ["ा", "ि", "ु", "े", "ो", "ौ"]
  },
  {
    id: "matras-shift",
    title: "Long vowel signs (Shift)",
    summary: "Hold Shift: ◌ी ◌ू ◌ै ◌ृ. Use the Shift key on the opposite hand.",
    kind: "syllables",
    base: HOME_BASE,
    chars: ["ी", "ू", "ै", "ृ"]
  },
  {
    id: "vowels",
    title: "Independent vowels",
    summary: "अ आ इ ई उ ऊ ए ऐ ओ औ ऋ start a word or stand alone.",
    kind: "letters",
    chars: ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ", "ऋ"]
  },
  {
    id: "shift-consonants",
    title: "Shift consonants",
    summary: "ख घ छ झ ठ ढ थ ध फ भ ण ङ ञ श: the second layer of the consonant keys.",
    kind: "letters",
    chars: ["ख", "घ", "छ", "झ", "ठ", "ढ", "थ", "ध", "फ", "भ", "ण", "ङ", "ञ", "श"]
  },
  {
    id: "halant",
    title: "Halant and conjuncts",
    summary: "◌् (the / key) joins consonants: क + ◌् + ष = क्ष, त + ◌् + र = त्र, ज + ◌् + ञ = ज्ञ.",
    kind: "words",
    words: ["क्षमता", "त्रिशूली", "ज्ञानी", "श्रम", "विद्यालय", "विद्यार्थी", "पढ्नु", "लेख्नु", "बुद्ध", "सम्झन", "मन्दिर", "शान्ति", "गण्डकी", "कर्णाली", "जङ्गल", "मित्रता"]
  },
  {
    id: "marks",
    title: "Chandrabindu, anusvara, visarga",
    summary: "◌ँ (Shift+V), ◌ं (Shift+M) and ◌ः (Shift+\\) finish many words.",
    kind: "words",
    words: ["आँखा", "साँझ", "दशैँ", "हिँड्नु", "सधैं", "औंला", "संगीत", "गाउँ", "नयाँ", "रोपाइँ", "काठमाडौं", "दिनहुँ"]
  },
  {
    id: "digits",
    title: "Nepali digits",
    summary: "The number row types ० १ २ ३ ४ ५ ६ ७ ८ ९ without Shift.",
    kind: "digits"
  },
  {
    id: "real-words",
    title: "Everyday words",
    summary: "Put it all together with common Nepali words.",
    kind: "words",
    words: NEPALI_WORDS
  }
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const buildToken = (lesson) => {
  if (lesson.kind === "syllables") {
    const count = 2 + Math.floor(Math.random() * 2);
    return Array.from({ length: count }, () => `${pick(lesson.base)}${pick(lesson.chars)}`).join("");
  }
  const length = 2 + Math.floor(Math.random() * 3);
  return Array.from({ length }, () => pick(lesson.chars)).join("");
};

export const buildLessonText = (lesson, tokenCount = 22) => {
  if (!lesson) return "";
  if (lesson.kind === "words") {
    return Array.from({ length: tokenCount }, () => pick(lesson.words)).join(" ");
  }
  if (lesson.kind === "digits") {
    const digits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
    return Array.from({ length: tokenCount }, () =>
      Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => pick(digits)).join("")
    ).join(" ");
  }
  return Array.from({ length: tokenCount }, () => buildToken(lesson)).join(" ");
};

export const getLessonById = (id) => NEPALI_LESSONS.find((lesson) => lesson.id === id) || null;
