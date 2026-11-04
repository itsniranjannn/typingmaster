import { beforeEach, describe, expect, it } from "vitest";
import { generateWeakKeyParagraph } from "../paragraphGenerator";
import { getGhostIndexAt } from "../../hooks/useGhostCursor";
import { getTopMistakes } from "../typingStats";
import { addResult, getGhostRun, getLastResults, setGhostRun } from "../storage";

describe("weak-key drills", () => {
  it("leans on the requested letters", () => {
    const text = generateWeakKeyParagraph([{ character: "q", count: 5 }, { character: "z", count: 2 }], 40);
    const words = text.split(" ");
    expect(words).toHaveLength(40);
    const hits = words.filter((word) => /[qz]/.test(word)).length;
    expect(hits / words.length).toBeGreaterThan(0.6);
  });

  it("adds punctuation and digits when those keys are weak", () => {
    const text = generateWeakKeyParagraph([{ character: ",", count: 3 }], 30);
    expect(text).toContain(",");
  });

  it("falls back to a normal paragraph without usable input", () => {
    expect(generateWeakKeyParagraph([], 30).split(" ").length).toBeGreaterThanOrEqual(20);
  });
});

describe("mistake window", () => {
  it("honors the window size", () => {
    const results = [
      { mistypedCharacters: ["a"] },
      { mistypedCharacters: ["b"] },
      { mistypedCharacters: ["b"] },
      { mistypedCharacters: ["c", "c", "c"] }
    ];
    expect(getTopMistakes(results, 5, 3).map((item) => item.character)).not.toContain("c");
    expect(getTopMistakes(results, 5, 10)[0].character).toBe("c");
  });
});

describe("ghost cursor", () => {
  it("interpolates between per-second samples", () => {
    const samples = [10, 20, 30];
    expect(getGhostIndexAt(samples, 0)).toBe(0);
    expect(getGhostIndexAt(samples, 0.5)).toBe(5);
    expect(getGhostIndexAt(samples, 1.5)).toBe(15);
    expect(getGhostIndexAt(samples, 99)).toBe(30);
    expect(getGhostIndexAt([], 2)).toBe(0);
  });
});

describe("ghost and sample storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a ghost run and ignores runs that are too short", () => {
    setGhostRun("time", [5, 12, 20, 31]);
    expect(getGhostRun("time")).toEqual([5, 12, 20, 31]);
    setGhostRun("quote", [1, 2]);
    expect(getGhostRun("quote")).toEqual([]);
  });

  it("persists sanitized WPM samples with a result", () => {
    addResult({ id: 1, mode: "time", wpm: 50, accuracy: 96, wpmSamples: [30, 45, "x", -3, 52.4] });
    expect(getLastResults()[0].wpmSamples).toEqual([30, 45, 52]);
  });
});
