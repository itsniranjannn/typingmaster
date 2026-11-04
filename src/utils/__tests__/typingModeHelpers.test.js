import { describe, expect, it } from "vitest";
import { TYPING_MODES } from "../../constants/typingModes";
import {
  getBestWpmModeKey,
  getGeneratedTextForMode,
  getWordList,
  normalizeGoalVariant,
  normalizeMode,
  normalizeTimeLimitSeconds
} from "../typingModeHelpers";

describe("typing mode helpers", () => {
  it("falls back to time mode for unknown modes", () => {
    expect(normalizeMode("nonsense")).toBe(TYPING_MODES.TIME);
    expect(normalizeMode(TYPING_MODES.QUOTE)).toBe(TYPING_MODES.QUOTE);
  });

  it("normalizes goal variants and time limits", () => {
    expect(normalizeGoalVariant("reach")).toBe("reach");
    expect(normalizeGoalVariant("whatever")).toBe("sustain");
    expect(normalizeTimeLimitSeconds("abc")).toBeGreaterThan(0);
    expect(normalizeTimeLimitSeconds(1)).toBeGreaterThanOrEqual(1);
    expect(normalizeTimeLimitSeconds(99999)).toBeLessThanOrEqual(300);
  });

  it("builds best-WPM keys per mode", () => {
    expect(getBestWpmModeKey({ mode: TYPING_MODES.WORDS, wordCount: 50 })).toBe("words50");
    expect(getBestWpmModeKey({ mode: TYPING_MODES.GOAL, goalVariant: "reach" })).toBe("goalReach");
    expect(getBestWpmModeKey({ mode: TYPING_MODES.GOAL, goalVariant: "sustain" })).toBe("goalSustain");
    expect(getBestWpmModeKey({ mode: TYPING_MODES.CHALLENGE_ARENA })).toBe("challengeArena");
    expect(getBestWpmModeKey({ mode: TYPING_MODES.TIME })).toBe("time");
  });

  it("splits text into words ignoring extra spaces", () => {
    expect(getWordList("a  b c ")).toEqual(["a", "b", "c"]);
  });

  it("generates exactly the requested number of words in words mode", () => {
    expect(getWordList(getGeneratedTextForMode(TYPING_MODES.WORDS, 25))).toHaveLength(25);
  });
});
