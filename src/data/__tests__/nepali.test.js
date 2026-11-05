import { describe, expect, it } from "vitest";
import { LAYOUTS, LANGUAGES, charFromKeyEvent, getHintText, getLayout, isTypeableText, keyForText, planKeystroke } from "../keyboardLayouts";
import { NEPALI_SENTENCES, NEPALI_QUOTES, NEPALI_WORDS, getNepaliParagraph, getNepaliWords, getNepaliNumbers } from "../nepaliText";
import { NEPALI_LESSONS, buildLessonText } from "../nepaliLessons";
import { LOKSEWA_PASSAGES, evaluateLoksewa, getLoksewaPassage } from "../loksewaPassages";

const ne = LAYOUTS[LANGUAGES.NE];
const untypeable = (text) => [...text].filter((c) => !ne.chars.has(c));

describe("Nepali traditional layout (from the reference chart)", () => {
  it("maps physical keys, normal and Shift", () => {
    expect(charFromKeyEvent(ne, "KeyK", false)).toBe("प");
    expect(charFromKeyEvent(ne, "KeyK", true)).toBe("प्");
    expect(charFromKeyEvent(ne, "KeyS", false)).toBe("क");
    expect(charFromKeyEvent(ne, "KeyF", false)).toBe("ा");
    expect(charFromKeyEvent(ne, "KeyF", true)).toBe("ँ");
    expect(charFromKeyEvent(ne, "KeyL", true)).toBe("ी");
    expect(charFromKeyEvent(ne, "Space", false)).toBe(" ");
    expect(charFromKeyEvent(ne, "F13", false)).toBeNull();
  });

  it("has conjunct keys that type several code points", () => {
    expect(charFromKeyEvent(ne, "Digit1", false)).toBe("ज्ञ");
    expect(charFromKeyEvent(ne, "Digit4", false)).toBe("द्ध");
    expect(charFromKeyEvent(ne, "KeyQ", false)).toBe("त्र");
    expect(charFromKeyEvent(ne, "KeyI", true)).toBe("क्ष");
    expect(charFromKeyEvent(ne, "Period", true)).toBe("श्र");
    expect(charFromKeyEvent(ne, "Slash", true)).toBe("रु");
    expect(charFromKeyEvent(ne, "Backslash", true)).toBe("्र");
  });

  it("puts the Devanagari digits on Shift + the number row", () => {
    const digits = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"];
    expect(digits.map((code) => charFromKeyEvent(ne, code, true)).join("")).toBe("१२३४५६७८९०");
  });

  it("has an Alt layer for letters missing from the chart", () => {
    expect(charFromKeyEvent(ne, "KeyK", false, true)).toBe("फ");
    expect(charFromKeyEvent(ne, "KeyH", false, true)).toBe("झ");
    expect(charFromKeyEvent(ne, "KeyU", false, true)).toBe("ङ");
    expect(charFromKeyEvent(ne, "KeyA", false, true)).toBeNull();
  });

  it("finds the key, finger and modifiers for upcoming text", () => {
    expect(keyForText(ne, "कमल")).toMatchObject({ code: "KeyS", finger: "LR", shift: false });
    expect(keyForText(ne, "क्त")).toMatchObject({ code: "KeyS", shift: true, shiftCode: "ShiftRight", shiftFinger: "RP" });
    expect(keyForText(ne, "ज्ञान")).toMatchObject({ code: "Digit1", output: "ज्ञ" });
    expect(keyForText(ne, "क्षमता")).toMatchObject({ code: "KeyI", shift: true, output: "क्ष" });
    expect(keyForText(ne, "फल")).toMatchObject({ code: "KeyK", alt: true, altCode: "AltLeft", altFinger: "LT" });
    expect(keyForText(ne, " ")).toMatchObject({ code: "Space" });
    expect(keyForText(ne, "z")).toBeNull();
  });

  it("types प्र as प + the rakar key, not प् + र", () => {
    expect(keyForText(ne, "प्रयास")).toMatchObject({ code: "KeyK", shift: false, output: "प" });
    expect(keyForText(ne, "्रयास")).toMatchObject({ code: "Backslash", shift: true, output: "्र" });
  });

  it("falls back to English for unknown languages", () => {
    expect(getLayout("xx").id).toBe("en");
  });
});

describe("composed vowels (ो ौ आ ओ औ)", () => {
  it("holds a half-typed sequence back and commits the whole vowel", () => {
    expect(planKeystroke({ output: "ा", pending: "", target: "ो" })).toMatchObject({ action: "pending", pending: "ा", ok: true });
    expect(planKeystroke({ output: "े", pending: "ा", target: "ो" })).toMatchObject({ action: "commit", text: "ो", pending: "" });
    expect(planKeystroke({ output: "ै", pending: "ा", target: "ौ" })).toMatchObject({ action: "commit", text: "ौ" });
    expect(planKeystroke({ output: "अ", target: "आ" })).toMatchObject({ action: "pending" });
    expect(planKeystroke({ output: "ा", pending: "अ", target: "आ" })).toMatchObject({ action: "commit", text: "आ" });
    // three keys for ओ
    const first = planKeystroke({ output: "अ", target: "ओ" });
    const second = planKeystroke({ output: "ा", pending: first.pending, target: "ओ" });
    expect(second.action).toBe("pending");
    expect(planKeystroke({ output: "े", pending: second.pending, target: "ओ" })).toMatchObject({ action: "commit", text: "ओ" });
  });

  it("types plain keys straight through, and flags a wrong key", () => {
    expect(planKeystroke({ output: "ा", target: "ा" })).toMatchObject({ action: "commit", text: "ा", ok: true });
    expect(planKeystroke({ output: "क", target: "ख" })).toMatchObject({ action: "commit", text: "क", ok: false });
  });

  it("flushes a half-typed vowel as ordinary characters when the next key does not continue it", () => {
    expect(planKeystroke({ output: "क", pending: "ा", target: "ो" })).toMatchObject({ action: "commit", text: "ाक", ok: false });
  });

  it("explains what is still to type", () => {
    expect(getHintText("ोक")).toBe("ाेक");
    expect(getHintText("ोक", "ा")).toBe("े");
    expect(getHintText("कमल")).toBe("कमल");
  });
});

describe("Nepali content is fully typeable on the layout", () => {
  it("sentences", () => NEPALI_SENTENCES.forEach((s) => expect(untypeable(s), s).toEqual([])));
  it("quotes", () => NEPALI_QUOTES.forEach((s) => expect(untypeable(s), s).toEqual([])));
  it("words", () => NEPALI_WORDS.forEach((s) => expect(untypeable(s), s).toEqual([])));
  it("loksewa passages", () => LOKSEWA_PASSAGES.forEach((s) => expect(untypeable(s), s).toEqual([])));
  it("has no double or edge spaces", () => {
    [...NEPALI_SENTENCES, ...NEPALI_QUOTES, ...LOKSEWA_PASSAGES].forEach((s) => expect(s).toBe(s.trim().replace(/\s+/g, " ")));
  });
  it("generators", () => {
    expect(untypeable(getNepaliParagraph(30))).toEqual([]);
    expect(getNepaliWords(40).split(" ")).toHaveLength(40);
    expect(untypeable(getNepaliNumbers())).toEqual([]);
    expect(getLoksewaPassage(90).split(" ").length).toBeGreaterThanOrEqual(90);
  });
  it("lessons only use typeable characters", () => {
    NEPALI_LESSONS.forEach((lesson) => {
      const text = buildLessonText(lesson);
      expect(text.length, lesson.id).toBeGreaterThan(10);
      expect(isTypeableText(ne, text), lesson.id).toBe(true);
    });
  });

  it("every character of every text can actually be produced by planning keystrokes", () => {
    // walk a passage the way a learner would and make sure no step lacks a key
    const text = LOKSEWA_PASSAGES.join(" ");
    let rest = text;
    let guard = 0;
    while (rest.length && guard < 5000) {
      guard += 1;
      const hint = getHintText(rest);
      const key = keyForText(ne, hint);
      expect(key, rest.slice(0, 12)).not.toBeNull();
      const output = key.output;
      const plan = planKeystroke({ output, pending: "", target: rest });
      if (plan.action === "pending") {
        // finish the composed vowel
        let pending = plan.pending;
        let done = false;
        while (!done) {
          const nextKey = keyForText(ne, getHintText(rest, pending));
          expect(nextKey, rest.slice(0, 12)).not.toBeNull();
          const next = planKeystroke({ output: nextKey.output, pending, target: rest });
          if (next.action === "commit") {
            rest = rest.slice(next.text.length);
            done = true;
          } else {
            pending = next.pending;
          }
        }
      } else {
        expect(plan.ok, rest.slice(0, 12)).toBe(true);
        rest = rest.slice(plan.text.length);
      }
    }
    expect(rest).toBe("");
  });
});

describe("Loksewa scoring", () => {
  it("passes only with both the target speed and the accuracy", () => {
    expect(evaluateLoksewa({ wpm: 31, accuracy: 97, targetWpm: 30 }).passed).toBe(true);
    expect(evaluateLoksewa({ wpm: 29, accuracy: 99, targetWpm: 30 })).toMatchObject({ passed: false, speedOk: false, accuracyOk: true });
    expect(evaluateLoksewa({ wpm: 40, accuracy: 90, targetWpm: 30 })).toMatchObject({ passed: false, speedOk: true, accuracyOk: false });
  });
});
