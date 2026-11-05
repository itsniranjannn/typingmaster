import { LANGUAGES } from "../data/keyboardLayouts";

const KEY = "typingMaster.languageSettings";

export const INPUT_METHODS = {
  BUILT_IN: "builtin", // physical-key emulation, works with any OS keyboard layout
  SYSTEM: "system" // pass through whatever the OS keyboard produces
};

const DEFAULTS = {
  language: LANGUAGES.EN,
  inputMethod: INPUT_METHODS.BUILT_IN,
  showKeyboard: true,
  showFingerHints: true
};

export const getLanguageSettings = () => {
  try {
    if (typeof window === "undefined") return { ...DEFAULTS };
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") return { ...DEFAULTS };
    return {
      language: parsed.language === LANGUAGES.NE ? LANGUAGES.NE : LANGUAGES.EN,
      inputMethod: parsed.inputMethod === INPUT_METHODS.SYSTEM ? INPUT_METHODS.SYSTEM : INPUT_METHODS.BUILT_IN,
      showKeyboard: parsed.showKeyboard !== false,
      showFingerHints: parsed.showFingerHints !== false
    };
  } catch {
    return { ...DEFAULTS };
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
