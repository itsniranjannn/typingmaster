/**
 * Physical keyboard model shared by the on-screen keyboard, the key-to-character
 * mapping and the finger hints.
 *
 * Keys are identified by KeyboardEvent.code (the PHYSICAL key), exactly like
 * Monkeytype's layout emulator: the user can have any OS layout installed and
 * the built-in layout still produces the right characters.
 *
 * Nepali mapping source: the standard "Nepali" Devanagari layout shipped in
 * xkeyboard-config (symbols/np, group "basic"), which follows the traditional
 * Nepali typewriter order. Every key yields exactly ONE Unicode code point, so
 * the typing engine can keep comparing text one character at a time.
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
/* Nepali (Devanagari, xkeyboard-config "np" basic)                    */
/* ------------------------------------------------------------------ */

const NE_PAIRS = {
  Backquote: ["ऽ", "़"],
  Digit1: ["१", "!"], Digit2: ["२", "@"], Digit3: ["३", "#"], Digit4: ["४", "$"],
  Digit5: ["५", "%"], Digit6: ["६", "^"], Digit7: ["७", "&"], Digit8: ["८", "*"],
  Digit9: ["९", "("], Digit0: ["०", ")"], Minus: ["-", "॒"], Equal: ["=", "+"],
  KeyQ: ["ट", "ठ"], // ट ठ
  KeyW: ["ौ", "औ"], // ौ औ
  KeyE: ["े", "ै"], // े ै
  KeyR: ["र", "ृ"], // र ृ
  KeyT: ["त", "थ"], // त थ
  KeyY: ["य", "ञ"], // य ञ
  KeyU: ["ु", "ू"], // ु ू
  KeyI: ["ि", "ी"], // ि ी
  KeyO: ["ो", "ओ"], // ो ओ
  KeyP: ["प", "फ"], // प फ
  BracketLeft: ["इ", "ई"], // इ ई
  BracketRight: ["ए", "ऐ"], // ए ऐ
  Backslash: ["ॐ", "ः"], // ॐ ः
  KeyA: ["ा", "आ"], // ा आ
  KeyS: ["स", "श"], // स श
  KeyD: ["द", "ध"], // द ध
  KeyF: ["उ", "ऊ"], // उ ऊ
  KeyG: ["ग", "घ"], // ग घ
  KeyH: ["ह", "अ"], // ह अ
  KeyJ: ["ज", "झ"], // ज झ
  KeyK: ["क", "ख"], // क ख
  KeyL: ["ल", "॥"], // ल ॥
  Semicolon: [";", ":"], Quote: ["'", "\""],
  KeyZ: ["ष", "ऋ"], // ष ऋ
  KeyX: ["ड", "ढ"], // ड ढ
  KeyC: ["च", "छ"], // च छ
  KeyV: ["व", "ँ"], // व ँ
  KeyB: ["ब", "भ"], // ब भ
  KeyN: ["न", "ण"], // न ण
  KeyM: ["म", "ं"], // म ं
  Comma: [",", "ङ"], // , ङ
  Period: ["।", "."], // । .
  Slash: ["्", "?"] // ् ?
};

const buildLayout = (id, label, pairs) => {
  const byCode = {};
  const byChar = {};
  Object.entries(pairs).forEach(([code, [normal, shifted]]) => {
    byCode[code] = { normal, shifted };
    if (!(normal in byChar)) byChar[normal] = { code, shift: false };
    if (!(shifted in byChar)) byChar[shifted] = { code, shift: true };
  });
  byChar[" "] = { code: "Space", shift: false };
  return { id, label, byCode, byChar };
};

export const LAYOUTS = {
  [LANGUAGES.EN]: buildLayout(LANGUAGES.EN, "English (QWERTY)", EN_PAIRS),
  [LANGUAGES.NE]: buildLayout(LANGUAGES.NE, "Nepali (Devanagari)", NE_PAIRS)
};

export const getLayout = (language) => LAYOUTS[language] || LAYOUTS[LANGUAGES.EN];

/** Character produced by a physical key press, or null if the key is unmapped. */
export const charFromKeyEvent = (layout, code, shiftKey) => {
  if (code === "Space") return " ";
  const entry = layout.byCode[code];
  if (!entry) return null;
  return shiftKey ? entry.shifted : entry.normal;
};

/** Which key (and whether Shift) types a character. */
export const keyForChar = (layout, character) => {
  if (!character) return null;
  const hit = layout.byChar[character];
  if (!hit) return null;
  if (hit.code === "Space") return { code: "Space", shift: false, finger: "RT", shiftCode: null, shiftFinger: null };
  const shiftCode = hit.shift ? getShiftCodeFor(hit.code) : null;
  return {
    code: hit.code,
    shift: hit.shift,
    finger: getFingerForCode(hit.code),
    shiftCode,
    shiftFinger: shiftCode ? getShiftFinger(shiftCode) : null
  };
};

export const isTypeableCharacter = (layout, character) => Boolean(layout.byChar[character]);
