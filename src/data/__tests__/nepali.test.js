import { describe, expect, it } from "vitest";
import { LAYOUTS, LANGUAGES, charFromKeyEvent, keyForChar, getLayout } from "../keyboardLayouts";
import { NEPALI_SENTENCES, NEPALI_QUOTES, NEPALI_WORDS, getNepaliParagraph, getNepaliWords, getNepaliNumbers } from "../nepaliText";
import { NEPALI_LESSONS, buildLessonText } from "../nepaliLessons";

const ne = LAYOUTS[LANGUAGES.NE];
const untypeable = (text) => [...text].filter((c) => !ne.byChar[c]);

describe("Nepali layout", () => {
  it("maps physical keys to Devanagari, with Shift", () => {
    expect(charFromKeyEvent(ne, "KeyK", false)).toBe("क");
    expect(charFromKeyEvent(ne, "KeyK", true)).toBe("ख");
    expect(charFromKeyEvent(ne, "KeyA", false)).toBe("ा");
    expect(charFromKeyEvent(ne, "Slash", false)).toBe("्");
    expect(charFromKeyEvent(ne, "Space", false)).toBe(" ");
    expect(charFromKeyEvent(ne, "F13", false)).toBeNull();
  });

  it("types a conjunct as consonant + halant + consonant", () => {
    const typed = ["KeyK", "Slash", "KeyZ"].map((code) => charFromKeyEvent(ne, code, false)).join("");
    expect(typed).toBe("क्ष");
  });

  it("finds the key, finger and Shift for a target character", () => {
    expect(keyForChar(ne, "क")).toMatchObject({ code: "KeyK", shift: false, finger: "RM" });
    expect(keyForChar(ne, "ख")).toMatchObject({ code: "KeyK", shift: true, shiftCode: "ShiftLeft", shiftFinger: "LP" });
    expect(keyForChar(ne, "ट")).toMatchObject({ code: "KeyQ", finger: "LP", shiftCode: null });
    expect(keyForChar(ne, "ठ")).toMatchObject({ code: "KeyQ", shift: true, shiftCode: "ShiftRight" });
    expect(keyForChar(ne, " ")).toMatchObject({ code: "Space" });
    expect(keyForChar(ne, "z")).toBeNull();
  });

  it("round-trips every mapped key", () => {
    Object.entries(ne.byCode).forEach(([code, { normal, shifted }]) => {
      expect(keyForChar(ne, normal)).not.toBeNull();
      expect(keyForChar(ne, shifted)).not.toBeNull();
      expect(charFromKeyEvent(ne, code, false)).toBe(normal);
    });
  });

  it("falls back to English for unknown languages", () => {
    expect(getLayout("xx").id).toBe("en");
  });
});

describe("Nepali content is fully typeable on the layout", () => {
  it("sentences", () => NEPALI_SENTENCES.forEach((s) => expect(untypeable(s), s).toEqual([])));
  it("quotes", () => NEPALI_QUOTES.forEach((s) => expect(untypeable(s), s).toEqual([])));
  it("words", () => NEPALI_WORDS.forEach((s) => expect(untypeable(s), s).toEqual([])));
  it("has no double or edge spaces", () => {
    [...NEPALI_SENTENCES, ...NEPALI_QUOTES].forEach((s) => expect(s).toBe(s.trim().replace(/\s+/g, " ")));
  });
  it("generators", () => {
    expect(untypeable(getNepaliParagraph(30))).toEqual([]);
    expect(getNepaliWords(40).split(" ")).toHaveLength(40);
    expect(untypeable(getNepaliNumbers())).toEqual([]);
  });
  it("lessons only use typeable characters", () => {
    NEPALI_LESSONS.forEach((lesson) => {
      const text = buildLessonText(lesson);
      expect(text.length, lesson.id).toBeGreaterThan(10);
      expect(untypeable(text), lesson.id).toEqual([]);
    });
  });
});
