import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTypingTest } from "../useTypingTest";
import { LOKSEWA_PASSAGES } from "../../data/loksewaPassages";
import { NEPALI_LESSONS } from "../../data/nepaliLessons";
import { getLessonProgress } from "../../utils/lessonProgress";

const seedNepali = (extra = {}) => {
  window.localStorage.clear();
  window.localStorage.setItem(
    "typingMaster.languageSettings",
    JSON.stringify({ language: "ne", inputMethod: "builtin", showKeyboard: true, showFingerHints: true, ...extra })
  );
};

/** Start a fresh Nepali hook with `text` as the custom practice text. */
const withText = (text) => {
  seedNepali();
  const hook = renderHook(() => useTypingTest());
  act(() => hook.result.current.handleCustomTextChange(text));
  expect(hook.result.current.paragraph).toBe(text);
  return hook;
};

// each key press is its own act so the hook sees the updated typedText, like real typing
const press = (hook, output) => act(() => hook.result.current.typeOutput(output));
const backspace = (hook) => act(() => hook.result.current.handleBackspace());

describe("typing engine: composed vowels on the built-in Nepali layout", () => {
  beforeEach(() => seedNepali());

  it("holds ा back until े arrives, then commits ो whole", () => {
    const hook = withText("को");
    press(hook, "क");
    expect(hook.result.current.typedText).toBe("क");

    press(hook, "ा");
    expect(hook.result.current.typedText).toBe("क"); // held back, not a mistake
    expect(hook.result.current.pendingVowel).toBe("ा");
    expect(hook.result.current.engineSnapshot?.incorrectCharacters ?? 0).toBe(0);

    press(hook, "े");
    expect(hook.result.current.typedText).toBe("को");
    expect(hook.result.current.pendingVowel).toBe("");
  });

  it("composes ौ and the three-key ओ", () => {
    const au = withText("कौ");
    press(au, "क");
    press(au, "ा");
    press(au, "ै");
    expect(au.result.current.typedText).toBe("कौ");

    const o = withText("ओ");
    press(o, "अ");
    press(o, "ा");
    expect(o.result.current.typedText).toBe("");
    press(o, "े");
    expect(o.result.current.typedText).toBe("ओ");
  });

  it("flushes a held-back vowel as plain characters when the next key does not continue it", () => {
    const hook = withText("कोकन");
    press(hook, "क");
    press(hook, "ा");
    press(hook, "क");
    expect(hook.result.current.typedText).toBe("काक");
    expect(hook.result.current.pendingVowel).toBe("");
  });

  it("reports whether each press was on track", () => {
    const hook = withText("कम");
    let ok;
    act(() => {
      ok = hook.result.current.typeOutput("क");
    });
    expect(ok).toBe(true);
    act(() => {
      ok = hook.result.current.typeOutput("ब");
    });
    expect(ok).toBe(false);
  });
});

describe("typing engine: multi-character keys and Backspace", () => {
  beforeEach(() => seedNepali());

  it("accepts a conjunct key (ज्ञ) as one press and counts every character", () => {
    const hook = withText("ज्ञान");
    press(hook, "ज्ञ");
    expect(hook.result.current.typedText).toBe("ज्ञ");
    expect(hook.result.current.currentIndex).toBe(3);
    expect(hook.result.current.correctCharacters).toBe(3);
  });

  it("one Backspace removes the whole conjunct", () => {
    const hook = withText("ज्ञान");
    press(hook, "ज्ञ");
    press(hook, "ा");
    backspace(hook); // ा
    expect(hook.result.current.typedText).toBe("ज्ञ");
    backspace(hook); // ज्ञ in one go
    expect(hook.result.current.typedText).toBe("");
  });

  it("Backspace drops a half-typed vowel before touching typed text", () => {
    const hook = withText("को");
    press(hook, "क");
    press(hook, "ा");
    backspace(hook);
    expect(hook.result.current.pendingVowel).toBe("");
    expect(hook.result.current.typedText).toBe("क");
    backspace(hook);
    expect(hook.result.current.typedText).toBe("");
  });

  it("finishes the test when the whole custom text, conjuncts and vowels included, is typed", async () => {
    const hook = withText("कोज्ञ");
    press(hook, "क");
    press(hook, "ा");
    press(hook, "े");
    press(hook, "ज्ञ");
    await waitFor(() => expect(hook.result.current.isFinished).toBe(true));
    expect(hook.result.current.finalResult.accuracy).toBe(100);
  });
});

describe("Loksewa state", () => {
  beforeEach(() => seedNepali());

  it("starts with the chosen passage and the chosen clock", () => {
    const hook = renderHook(() => useTypingTest());
    act(() => hook.result.current.startLoksewaTest({ durationSeconds: 120, targetWpm: 25, passageIndex: 2 }));
    expect(hook.result.current.loksewa).toMatchObject({ durationSeconds: 120, targetWpm: 25, passageIndex: 2 });
    expect(hook.result.current.paragraph.startsWith(LOKSEWA_PASSAGES[2])).toBe(true);
    expect(hook.result.current.timeLimitSeconds).toBe(120);
  });

  it("types learner-supplied text exactly as given", () => {
    const hook = renderHook(() => useTypingTest());
    act(() => hook.result.current.startLoksewaTest({ durationSeconds: 60, customText: "  नेपाल   एक\nसुन्दर देश हो।  " }));
    expect(hook.result.current.paragraph).toBe("नेपाल एक सुन्दर देश हो।");
    expect(hook.result.current.loksewa.customText).toBe("नेपाल एक सुन्दर देश हो।");
  });

  it("is cancelled by changing the time, word count, goal or mode", () => {
    const start = () => {
      const hook = renderHook(() => useTypingTest());
      act(() => hook.result.current.startLoksewaTest({ durationSeconds: 120 }));
      expect(hook.result.current.loksewa).not.toBeNull();
      return hook;
    };
    for (const change of [
      (h) => h.result.current.handleTimeLimitChange(30),
      (h) => h.result.current.handleWordCountChange(50),
      (h) => h.result.current.handleGoalWpmChange(40),
      (h) => h.result.current.handleGoalVariantChange("reach"),
      (h) => h.result.current.handleModeChange("words")
    ]) {
      const hook = start();
      act(() => change(hook));
      expect(hook.result.current.loksewa).toBeNull();
    }
  });

  it("is cancelled by switching language", () => {
    const hook = renderHook(() => useTypingTest());
    act(() => hook.result.current.startLoksewaTest({ durationSeconds: 120 }));
    act(() => hook.result.current.setLanguage("en"));
    expect(hook.result.current.loksewa).toBeNull();
    expect(hook.result.current.language).toBe("en");
  });
});

describe("lesson progress", () => {
  beforeEach(() => seedNepali());

  it("passes a lesson with clean typing, records it and unlocks the next", async () => {
    const hook = renderHook(() => useTypingTest());
    act(() => hook.result.current.startNepaliLesson(NEPALI_LESSONS[0].id));
    const text = hook.result.current.paragraph;
    for (const character of text) press(hook, character);
    await waitFor(() => expect(hook.result.current.isFinished).toBe(true));

    const lesson = hook.result.current.finalResult.lesson;
    expect(lesson).toMatchObject({ id: NEPALI_LESSONS[0].id, passed: true, newlyPassed: true, number: 1, nextId: NEPALI_LESSONS[1].id });
    expect(hook.result.current.lessonProgress.lessons[NEPALI_LESSONS[0].id].passed).toBe(true);
    expect(getLessonProgress().lessons[NEPALI_LESSONS[0].id].passed).toBe(true);
  });

  it("does not pass a lesson typed with too many mistakes", async () => {
    const hook = renderHook(() => useTypingTest());
    act(() => hook.result.current.startNepaliLesson(NEPALI_LESSONS[0].id));
    const text = hook.result.current.paragraph;
    // type every character wrong first, then fix it, so the final text is right but accuracy is low
    for (const character of text) {
      if (character === " ") {
        press(hook, " ");
        continue;
      }
      press(hook, "ट");
      backspace(hook);
      press(hook, character);
    }
    await waitFor(() => expect(hook.result.current.isFinished).toBe(true));
    const lesson = hook.result.current.finalResult.lesson;
    expect(lesson.passed).toBe(false);
    expect(lesson.newlyPassed).toBe(false);
    expect(lesson.accuracy).toBeLessThan(90);
    expect(lesson.mistakes).toBeGreaterThan(0);
    expect(getLessonProgress().lessons[NEPALI_LESSONS[0].id]?.passed ?? false).toBe(false);
  });
});
