import { beforeEach, describe, expect, it } from "vitest";
import {
  PASS_ACCURACY,
  countPassed,
  getLessonProgress,
  getNextLesson,
  isLessonUnlocked,
  recordLessonAttempt,
  resetLessonProgress,
  setUnlockedAll
} from "../lessonProgress";

const lessons = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("lesson progress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty with only the first lesson open", () => {
    const progress = getLessonProgress();
    expect(progress).toEqual({ lessons: {}, unlockedAll: false });
    expect(lessons.map((_, index) => isLessonUnlocked(lessons, index, progress))).toEqual([true, false, false]);
    expect(getNextLesson(lessons, progress).id).toBe("a");
  });

  it("passes at the accuracy threshold and unlocks the next lesson", () => {
    const first = recordLessonAttempt(getLessonProgress(), "a", { accuracy: PASS_ACCURACY, wpm: 12 });
    expect(first.passedNow).toBe(true);
    expect(first.newlyPassed).toBe(true);
    expect(isLessonUnlocked(lessons, 1, first.progress)).toBe(true);
    expect(isLessonUnlocked(lessons, 2, first.progress)).toBe(false);
    expect(countPassed(lessons, first.progress)).toBe(1);
    expect(getNextLesson(lessons, first.progress).id).toBe("b");
  });

  it("does not pass below the threshold, but keeps the best score and attempts", () => {
    const low = recordLessonAttempt(getLessonProgress(), "a", { accuracy: PASS_ACCURACY - 0.01, wpm: 20 });
    expect(low.passedNow).toBe(false);
    expect(isLessonUnlocked(lessons, 1, low.progress)).toBe(false);
    const again = recordLessonAttempt(low.progress, "a", { accuracy: 80, wpm: 25 });
    expect(again.progress.lessons.a).toMatchObject({ passed: false, bestAccuracy: 89.99, bestWpm: 25, attempts: 2 });
  });

  it("never un-passes a lesson, and only the first pass is 'new'", () => {
    const passed = recordLessonAttempt(getLessonProgress(), "a", { accuracy: 97, wpm: 15 });
    const worse = recordLessonAttempt(passed.progress, "a", { accuracy: 60, wpm: 10 });
    expect(worse.progress.lessons.a.passed).toBe(true);
    expect(worse.newlyPassed).toBe(false);
    expect(worse.progress.lessons.a.bestAccuracy).toBe(97);
  });

  it("persists across reads", () => {
    recordLessonAttempt(getLessonProgress(), "a", { accuracy: 95, wpm: 14 });
    expect(getLessonProgress().lessons.a.passed).toBe(true);
  });

  it("Unlock all opens every lesson, and reset clears everything", () => {
    const unlocked = setUnlockedAll(getLessonProgress(), true);
    expect(lessons.map((_, index) => isLessonUnlocked(lessons, index, unlocked))).toEqual([true, true, true]);
    expect(getLessonProgress().unlockedAll).toBe(true);
    expect(resetLessonProgress()).toEqual({ lessons: {}, unlockedAll: false });
    expect(getLessonProgress().unlockedAll).toBe(false);
  });

  it("survives corrupt storage", () => {
    window.localStorage.setItem("typingMaster.nepaliLessons", "{not json");
    expect(getLessonProgress()).toEqual({ lessons: {}, unlockedAll: false });
    window.localStorage.setItem("typingMaster.nepaliLessons", JSON.stringify({ lessons: { a: { passed: "yes", bestAccuracy: "x" } } }));
    expect(getLessonProgress().lessons.a).toEqual({ passed: false, bestAccuracy: 0, bestWpm: 0, attempts: 0 });
  });
});
