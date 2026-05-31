import { describe, it, expect } from "vitest";
import { computeEngineSnapshot } from "../runtimeSnapshotEngine";

describe("runtimeSnapshotEngine.computeEngineSnapshot", () => {
  it("computes a stable snapshot for normal input", () => {
    const targetWords = ["hello", "world"];
    const paragraph = "hello world";
    const snap = computeEngineSnapshot({
      targetWords,
      paragraph,
      correctCharacters: 5,
      incorrectCharacters: 1,
      completedWords: 1,
      currentWord: "w",
      currentWordIndex: 1,
      currentIndex: 6
    });

    expect(snap).toHaveProperty("correctCharacters", 5);
    expect(snap).toHaveProperty("incorrectCharacters", 1);
    expect(snap).toHaveProperty("completedWords", 1);
    expect(snap).toHaveProperty("currentWordIndex", 1);
    expect(snap).toHaveProperty("totalWords", 2);
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it("handles empty targets and text end correctly", () => {
    const snap = computeEngineSnapshot({
      targetWords: [],
      paragraph: "",
      correctCharacters: 0,
      incorrectCharacters: 0,
      completedWords: 0,
      currentWord: "",
      currentWordIndex: 0,
      currentIndex: 0
    });

    expect(snap.totalWords).toBe(0);
    expect(snap.isWordLimitReached).toBe(true);
    expect(Object.isFrozen(snap)).toBe(true);
  });
});
