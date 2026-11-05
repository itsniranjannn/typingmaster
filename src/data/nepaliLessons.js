import { NEPALI_WORDS } from "./nepaliText";

/**
 * Guided course for the traditional Nepali layout. Lessons follow a typing teacher's
 * order: home row, then the rows above and below, vowel signs, Shift half letters,
 * the conjunct keys, Shift digits and marks, the extra Alt letters, then real words.
 *
 * kind "letters":   random 2-4 character clusters from `chars`
 * kind "syllables": consonant + vowel sign pairs (consonants from `base`, signs from `chars`)
 * kind "halves":    half letter + consonant clusters (Shift keys), e.g. क्त न्म
 * kind "words":     real words that use the lesson's keys
 * kind "digits":    Nepali digits (Shift + number row)
 */

const HOME_BASE = ["ब", "क", "म", "न", "ज", "व", "प", "स"];

export const NEPALI_LESSONS = [
  {
    id: "home-left",
    title: "Home row: left hand",
    summary: "ब क म ा न: A S D F G. Rest your left fingers here (pinky, ring, middle, index, index).",
    kind: "letters",
    chars: ["ब", "क", "म", "ा", "न"]
  },
  {
    id: "home-right",
    title: "Home row: right hand",
    summary: "ज व प ि स: H J K L ;. Rest your right fingers here.",
    kind: "letters",
    chars: ["ज", "व", "प", "ि", "स"]
  },
  {
    id: "home-both",
    title: "Home row together",
    summary: "Both hands on the home row, and the space bar with either thumb.",
    kind: "letters",
    chars: ["ब", "क", "म", "ा", "न", "ज", "व", "प", "ि", "स"]
  },
  {
    id: "top-row",
    title: "Top row",
    summary: "ध भ च त थ ग ष य उ: W to P. Reach up, then come straight back to the home row.",
    kind: "letters",
    chars: ["ध", "भ", "च", "त", "थ", "ग", "ष", "य", "उ"]
  },
  {
    id: "bottom-row",
    title: "Bottom row",
    summary: "श ह अ ख द ल ं र ।: Z to /. Reach down with the finger that owns the column.",
    kind: "letters",
    chars: ["श", "ह", "अ", "ख", "द", "ल", "ं", "र", "।"]
  },
  {
    id: "matras",
    title: "Vowel signs (matras)",
    summary: "◌ा ◌ि ◌ु ◌े ◌ृ ◌ं follow the consonant. ो and ौ are typed ा + े and ा + ै: press both keys and they join.",
    kind: "syllables",
    base: HOME_BASE,
    chars: ["ा", "ि", "ु", "े", "ृ", "ं", "ो", "ौ"]
  },
  {
    id: "matras-shift",
    title: "Long signs and marks (Shift)",
    summary: "Hold Shift: ◌ी (L), ◌ू (apostrophe), ◌ै (]), ◌ँ (F), ◌ः (M).",
    kind: "syllables",
    base: HOME_BASE,
    chars: ["ी", "ू", "ै", "ँ", "ः"]
  },
  {
    id: "half-letters",
    title: "Half letters (Shift)",
    summary: "Shift + a consonant key gives its half form: क् (Shift+S), न् (Shift+G), म् (Shift+D). Then type the next consonant.",
    kind: "halves",
    halves: ["क्", "म्", "न्", "त्", "ग्", "ज्", "व्", "प्", "स्", "द्", "ल्", "ब्", "भ्", "च्", "थ्", "ध्", "श्", "ह्", "ख्"],
    base: ["क", "त", "न", "म", "र", "य", "ब", "व", "स", "प"]
  },
  {
    id: "conjunct-keys",
    title: "Conjunct keys",
    summary: "One key, a whole conjunct: ज्ञ (1), द्द (2), द्ध (4), त्र (Q), त्त (Shift+Q), क्ष (Shift+I), श्र (Shift+.), रु (Shift+/), and ्र (Shift+\\) for प्र, क्र.",
    kind: "words",
    words: ["ज्ञान", "ज्ञानी", "सिद्धि", "बुद्धि", "त्रिशूली", "पत्रकार", "सत्तर", "क्षमता", "शिक्षा", "श्रम", "श्रीमान", "रुचि", "रुपैयाँ", "प्रयास", "प्रेम", "प्रश्न", "क्रम", "ग्राम", "प्रकाश"]
  },
  {
    id: "extra-vowels",
    title: "Vowels and Alt letters",
    summary: "अ (C), आ (अ + ा), इ (Shift+O), उ (P), ए (Shift+P), ऋ (Shift+C), ओ (अ + ा + े). Extra Alt layer: Alt+U ङ, Alt+K फ, Alt+H झ, Alt+O ई, Alt+P ऊ, Alt+] ऐ.",
    kind: "words",
    words: ["आमा", "इमान", "उमेर", "एक", "ऋषि", "ओठ", "औषधि", "अब", "आज", "इतिहास", "उपहार", "एकता", "फल", "सफल", "झोला", "झण्डा", "रङ", "जङ्गल", "ईश्वर", "ऊर्जा", "ऐना"]
  },
  {
    id: "digits",
    title: "Nepali digits (Shift)",
    summary: "Hold Shift on the number row: १ २ ३ ४ ५ ६ ७ ८ ९ ०.",
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
  if (lesson.kind === "halves") {
    const count = 1 + Math.floor(Math.random() * 2);
    const halves = Array.from({ length: count }, () => `${pick(lesson.halves)}${pick(lesson.base)}`).join("");
    return `${halves}${pick(lesson.base)}`;
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
