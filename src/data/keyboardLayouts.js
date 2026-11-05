/**
 * Physical keyboard model shared by the on-screen keyboard, the key-to-character
 * mapping and the finger hints.
 *
 * Keys are identified by KeyboardEvent.code (the PHYSICAL key), exactly like
 * Monkeytype's layout emulator: the user can have any OS layout installed and
 * the built-in layout still produces the right characters.
 *
 * Nepali layout: the traditional (Preeti-style) Nepali keyboard, transcribed from
 * the reference chart supplied for this project. Normal press = the big glyph on a
 * key, Shift = the small glyph (half letters such as क्, and the Devanagari digits).
 * A key can output several code points (ज्ञ, द्ध, त्र, क्ष, श्र, रु, ्र ...), and the
 * vowel signs ो and ौ and the vowels आ ओ औ are typed as sequences (ा + े, अ + ा ...).
 */

export const LANGUAGES = {
  EN: "en",
  NE: "ne"
};

export const FINGERS = {
  LP: { id: "LP", label: "Left pinky", hand: "left", index: 0 },
  LR: { id: "LR", label: "Left ring finger", hand: "left", index: 1 },
  LM: { id: "LM", label: "Left middle finger", hand: "left", index: 2 },
  LI: { id: "LI", label: "Left index finger", hand: "left", index: 3 },
  LT: { id: "LT", label: "Left thumb", hand: "left", index: 4 },
  RT: { id: "RT", label: "Right thumb", hand: "right", index: 0 },
  RI: { id: "RI", label: "Right index finger", hand: "right", index: 1 },
  RM: { id: "RM", label: "Right middle finger", hand: "right", index: 2 },
  RR: { id: "RR", label: "Right ring finger", hand: "right", index: 3 },
  RP: { id: "RP", label: "Right pinky", hand: "right", index: 4 }
};

// [code, finger, latin label]
export const KEY_ROWS = [
  [
    ["Backquote", "LP", "`"], ["Digit1", "LP", "1"], ["Digit2", "LR", "2"], ["Digit3", "LM", "3"],
    ["Digit4", "LI", "4"], ["Digit5", "LI", "5"], ["Digit6", "RI", "6"], ["Digit7", "RI", "7"],
    ["Digit8", "RM", "8"], ["Digit9", "RR", "9"], ["Digit0", "RP", "0"], ["Minus", "RP", "-"], ["Equal", "RP", "="]
  ],
  [
    ["KeyQ", "LP", "Q"], ["KeyW", "LR", "W"], ["KeyE", "LM", "E"], ["KeyR", "LI", "R"], ["KeyT", "LI", "T"],
    ["KeyY", "RI", "Y"], ["KeyU", "RI", "U"], ["KeyI", "RM", "I"], ["KeyO", "RR", "O"], ["KeyP", "RP", "P"],
    ["BracketLeft", "RP", "["], ["BracketRight", "RP", "]"], ["Backslash", "RP", "\\"]
  ],
  [
    ["KeyA", "LP", "A"], ["KeyS", "LR", "S"], ["KeyD", "LM", "D"], ["KeyF", "LI", "F"], ["KeyG", "LI", "G"],
    ["KeyH", "RI", "H"], ["KeyJ", "RI", "J"], ["KeyK", "RM", "K"], ["KeyL", "RR", "L"],
    ["Semicolon", "RP", ";"], ["Quote", "RP", "'"]
  ],
  [
    ["KeyZ", "LP", "Z"], ["KeyX", "LR", "X"], ["KeyC", "LM", "C"], ["KeyV", "LI", "V"], ["KeyB", "LI", "B"],
    ["KeyN", "RI", "N"], ["KeyM", "RI", "M"], ["Comma", "RM", ","], ["Period", "RR", "."], ["Slash", "RP", "/"]
  ]
];

export const HOME_ROW_CODES = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL", "Semicolon"];

const FINGER_BY_CODE = {};
KEY_ROWS.forEach((row) => row.forEach(([code, finger]) => { FINGER_BY_CODE[code] = finger; }));
FINGER_BY_CODE.Space = "RT";

export const getFingerForCode = (code) => FINGER_BY_CODE[code] || null;

/** Shift is pressed with the hand opposite to the key. */
export const getShiftCodeFor = (code) => {
  const finger = FINGER_BY_CODE[code];
  if (!finger) return "ShiftLeft";
  return finger.startsWith("L") ? "ShiftRight" : "ShiftLeft";
};

export const getShiftFinger = (shiftCode) => (shiftCode === "ShiftRight" ? "RP" : "LP");

/* ------------------------------------------------------------------ */
/* English (US QWERTY)                                                  */
/* ------------------------------------------------------------------ */

const EN_PAIRS = {
  Backquote: ["`", "~"], Digit1: ["1", "!"], Digit2: ["2", "@"], Digit3: ["3", "#"], Digit4: ["4", "$"],
  Digit5: ["5", "%"], Digit6: ["6", "^"], Digit7: ["7", "&"], Digit8: ["8", "*"], Digit9: ["9", "("],
  Digit0: ["0", ")"], Minus: ["-", "_"], Equal: ["=", "+"],
  KeyQ: ["q", "Q"], KeyW: ["w", "W"], KeyE: ["e", "E"], KeyR: ["r", "R"], KeyT: ["t", "T"], KeyY: ["y", "Y"],
  KeyU: ["u", "U"], KeyI: ["i", "I"], KeyO: ["o", "O"], KeyP: ["p", "P"], BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"], Backslash: ["\\", "|"],
  KeyA: ["a", "A"], KeyS: ["s", "S"], KeyD: ["d", "D"], KeyF: ["f", "F"], KeyG: ["g", "G"], KeyH: ["h", "H"],
  KeyJ: ["j", "J"], KeyK: ["k", "K"], KeyL: ["l", "L"], Semicolon: [";", ":"], Quote: ["'", "\""],
  KeyZ: ["z", "Z"], KeyX: ["x", "X"], KeyC: ["c", "C"], KeyV: ["v", "V"], KeyB: ["b", "B"], KeyN: ["n", "N"],
  KeyM: ["m", "M"], Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"]
};

/* ------------------------------------------------------------------ */
/* Nepali traditional (Preeti-style)                                    */
/* ------------------------------------------------------------------ */

// [normal, shifted]; strings may hold several code points.
const NE_PAIRS = {
  Backquote: ["ञ", "ञ्"],
  Digit1: ["ज्ञ", "१"], Digit2: ["द्द", "२"], Digit3: ["घ", "३"], Digit4: ["द्ध", "४"], Digit5: ["छ", "५"],
  Digit6: ["ट", "६"], Digit7: ["ठ", "७"], Digit8: ["ड", "८"], Digit9: ["ढ", "९"], Digit0: ["ण", "०"],
  Minus: ["(", ")"], Equal: [".", "ं"], Backslash: ["्", "्र"],
  KeyQ: ["त्र", "त्त"], KeyW: ["ध", "ध्"], KeyE: ["भ", "भ्"], KeyR: ["च", "च्"], KeyT: ["त", "त्"],
  KeyY: ["थ", "थ्"], KeyU: ["ग", "ग्"], KeyI: ["ष", "क्ष"], KeyO: ["य", "इ"], KeyP: ["उ", "ए"],
  BracketLeft: ["ृ", "र्"], BracketRight: ["े", "ै"],
  KeyA: ["ब", "ब्"], KeyS: ["क", "क्"], KeyD: ["म", "म्"], KeyF: ["ा", "ँ"], KeyG: ["न", "न्"],
  KeyH: ["ज", "ज्"], KeyJ: ["व", "व्"], KeyK: ["प", "प्"], KeyL: ["ि", "ी"], Semicolon: ["स", "स्"],
  Quote: ["ु", "ू"],
  KeyZ: ["श", "श्"], KeyX: ["ह", "ह्"], KeyC: ["अ", "ऋ"], KeyV: ["ख", "ख्"], KeyB: ["द", "द्"],
  KeyN: ["ल", "ल्"], KeyM: ["ं", "ः"], Comma: [",", "?"], Period: ["।", "श्र"], Slash: ["र", "रु"]
};

/**
 * Letters the reference chart has no key for. They sit on an extra Alt layer
 * (Alt or AltGr + key) next to the closest sound, and are shown in a different
 * colour on the on-screen keyboard.
 */
const NE_ALT = {
  KeyK: "फ", // next to प
  KeyH: "झ", // next to ज
  KeyU: "ङ", // next to ग
  KeyO: "ई", // next to इ
  KeyP: "ऊ", // next to उ
  BracketRight: "ऐ" // next to ए
};

/**
 * Vowels the chart has no single key for are typed as a sequence. The typing
 * engine compares code points, so while a sequence is half-typed the input layer
 * holds it back (see planKeystroke) and commits the composed character at once.
 */
export const DECOMPOSITION = {
  "ो": "ाे",
  "ौ": "ाै",
  "आ": "अा",
  "ओ": "अाे",
  "औ": "अाै"
};

const buildLayout = (id, label, pairs, extraChars = [], alt = {}) => {
  const byCode = {};
  const outputs = [];
  const chars = new Set([" ", ...extraChars]);
  Object.entries(pairs).forEach(([code, [normal, shifted]]) => {
    byCode[code] = { normal, shifted, alt: alt[code] || "" };
    outputs.push({ text: normal, code, shift: false });
    outputs.push({ text: shifted, code, shift: true });
    if (alt[code]) outputs.push({ text: alt[code], code, shift: false, alt: true });
    [...normal, ...shifted, ...(alt[code] || "")].forEach((character) => chars.add(character));
  });
  return { id, label, byCode, outputs, chars };
};

export const LAYOUTS = {
  [LANGUAGES.EN]: buildLayout(LANGUAGES.EN, "English (QWERTY)", EN_PAIRS),
  [LANGUAGES.NE]: buildLayout(LANGUAGES.NE, "Nepali traditional (Preeti-style)", NE_PAIRS, Object.keys(DECOMPOSITION), NE_ALT)
};

/**
 * Some virtual keyboards and automation tools send key events with an empty `code`.
 * Work out the physical key from the character they did send (US QWERTY position).
 */
export const physicalFromKey = (key) => {
  if (typeof key !== "string" || key.length !== 1) return null;
  const english = LAYOUTS[LANGUAGES.EN].byCode;
  for (const [code, { normal, shifted }] of Object.entries(english)) {
    if (key === normal) return { code, shift: false };
    if (key === shifted) return { code, shift: true };
  }
  return null;
};

export const getLayout = (language) => LAYOUTS[language] || LAYOUTS[LANGUAGES.EN];

/** Text produced by a physical key press (may be several code points), or null if unmapped. */
export const charFromKeyEvent = (layout, code, shiftKey, altKey = false) => {
  if (code === "Space") return " ";
  const entry = layout.byCode[code];
  if (!entry) return null;
  if (altKey) return entry.alt || null;
  return shiftKey ? entry.shifted : entry.normal;
};

const describeKey = (hit) => {
  if (hit.code === "Space") return { code: "Space", shift: false, finger: "RT", shiftCode: null, shiftFinger: null, output: " " };
  const shiftCode = hit.shift ? getShiftCodeFor(hit.code) : null;
  // Alt is held with the thumb on the side opposite the key's hand
  const altCode = hit.alt ? (getFingerForCode(hit.code)?.startsWith("L") ? "AltRight" : "AltLeft") : null;
  return {
    code: hit.code,
    shift: hit.shift,
    alt: Boolean(hit.alt),
    finger: getFingerForCode(hit.code),
    shiftCode,
    shiftFinger: shiftCode ? getShiftFinger(shiftCode) : null,
    altCode,
    altFinger: altCode ? (altCode === "AltRight" ? "RT" : "LT") : null,
    output: hit.text
  };
};

/**
 * The key that types the start of `text`. Prefers the longest key output (so ज्ञ is
 * one key press), except that a half letter followed by र is typed as the plain
 * consonant plus the rakar key (प + ्र), the way Preeti typists do.
 */
export const keyForText = (layout, text) => {
  if (!text) return null;
  if (text[0] === " ") return describeKey({ code: "Space", shift: false, text: " " });
  let best = null;
  for (const output of layout.outputs) {
    if (!text.startsWith(output.text)) continue;
    if (layout.id === LANGUAGES.NE && output.text.length > 1 && output.text.endsWith("्") && text[output.text.length] === "र") continue;
    if (!best || output.text.length > best.text.length) best = output;
  }
  return best ? describeKey(best) : null;
};

export const keyForChar = (layout, character) => keyForText(layout, character);

/** True when every character of `text` can be typed on the layout. */
export const isTypeableText = (layout, text) => [...text].every((character) => layout.chars.has(character));

/**
 * Decide what a key press does, given the characters still to type.
 *  - "commit": append `text` (may be a whole composed vowel)
 *  - "pending": hold `pending` back, it is the start of a composed vowel
 * `ok` is whether the press is on track for the target text.
 */
export const planKeystroke = ({ output, pending = "", target = "" }) => {
  const decomposed = DECOMPOSITION[target[0]];
  const candidate = `${pending}${output}`;
  if (decomposed && decomposed.startsWith(candidate)) {
    if (decomposed === candidate) return { action: "commit", text: target[0], pending: "", ok: true };
    return { action: "pending", text: "", pending: candidate, ok: true };
  }
  return { action: "commit", text: candidate, pending: "", ok: target.startsWith(candidate) };
};

/** What the learner still has to type, with an unfinished composed vowel expanded. */
export const getHintText = (target, pending = "") => {
  if (!target) return "";
  const decomposed = DECOMPOSITION[target[0]];
  if (decomposed && pending && decomposed.startsWith(pending)) return decomposed.slice(pending.length);
  if (decomposed) return `${decomposed}${target.slice(1)}`;
  return target;
};
