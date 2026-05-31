import { describe, it, expect } from "vitest";
import { selectTypingSurfacePresentation, selectResultSummary } from "../selectorEngine";

describe("selector stability and stale-state protections", () => {
  it("returns identical, frozen outputs across repeated calls with same input", () => {
    const engineSnapshot = { correctCharacters: 120, incorrectCharacters: 4, completedWords: 24, totalWords: 30, isWordLimitReached: false };
    const a = selectTypingSurfacePresentation(engineSnapshot, 80, 96);
    const b = selectTypingSurfacePresentation(engineSnapshot, 80, 96);
    expect(a).toEqual(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(b)).toBe(true);
  });

  it("selectResultSummary is stable and frozen when given same inputs", () => {
    const completion = { completedWords: 10, totalWords: 20, wpm: 72, accuracy: 95 };
    const replay = { id: "x", events: [] };
    const t = null;
    const s1 = selectResultSummary(completion, replay, t);
    const s2 = selectResultSummary(completion, replay, t);
    expect(s1).toEqual(s2);
    expect(Object.isFrozen(s1)).toBe(true);
  });
});
