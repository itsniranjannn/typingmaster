import { LANGUAGES } from "../data/keyboardLayouts";

const KEY = "typingMaster.languageSettings";

export const INPUT_METHODS = {
  BUILT_IN: "builtin", // physical-key emulation, works with any OS keyboard layout
  SYSTEM: "system" // pass through whatever the OS keyboard produces
};

/** Phones and tablets have no physical keyboard, so the key-position emulation cannot work there. */
export const isTouchDevice = () => {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};

const getDefaults = () => {
  const touch = isTouchDevice();
  return {
    language: LANGUAGES.EN,
    inputMethod: touch ? INPUT_METHODS.SYSTEM : INPUT_METHODS.BUILT_IN,
    showKeyboard: !touch,
    showFingerHints: !touch
  };
};

export const getLanguageSettings = () => {
  try {
    if (typeof window === "undefined") return getDefaults();
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") return getDefaults();
    return {
      language: parsed.language === LANGUAGES.NE ? LANGUAGES.NE : LANGUAGES.EN,
      inputMethod: parsed.inputMethod === INPUT_METHODS.SYSTEM ? INPUT_METHODS.SYSTEM : INPUT_METHODS.BUILT_IN,
      showKeyboard: parsed.showKeyboard !== false,
      showFingerHints: parsed.showFingerHints !== false
    };
  } catch {
    return getDefaults();
  }
};

export const saveLanguageSettings = (settings) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable: settings simply will not persist
  }
};
