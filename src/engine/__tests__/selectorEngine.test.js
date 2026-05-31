import { describe, it, expect } from "vitest";
import { selectTypingSurfacePresentation } from "../selectorEngine";

describe("selectorEngine.selectTypingSurfacePresentation", () => {
  it("builds a minimal presentation object and freezes it", () => {
    const engineSnapshot = {
      correctCharacters: 10,
      incorrectCharacters: 2,
      completedWords: 4,
      totalWords: 10,
      isWordLimitReached: false
    };

    const pres = selectTypingSurfacePresentation(engineSnapshot, 72, 95);
    expect(pres).toHaveProperty("wpm", 72);
    expect(pres).toHaveProperty("accuracy", 95);
    expect(pres.completedWords).toBe(4);
    expect(Object.isFrozen(pres)).toBe(true);
  });
});
