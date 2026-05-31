import { describe, expect, it } from "vitest";
import { serializeTypingResult } from "../sessionEngine";

describe("sessionEngine parity", () => {
  it("serializes result fields with existing mode-specific semantics", () => {
    const result = serializeTypingResult({
      now: 123,
      mode: "words",
      wordCount: 50,
      goalVariant: "sustain",
      timeLimitSeconds: 60,
      wpm: 88,
      accuracy: 97,
      correctCharacters: 440,
      incorrectCharacters: 8,
      completedWords: 50,
      typedText: "alpha beta",
      promptText: "alpha beta",
      mistypedCharacters: ["x"],
      timeUsed: 60,
      previousBest: 82,
      goalSuccess: true,
      challenge: {
        id: "memory-silver",
        title: "Memory Test",
        reward: "Memory Silver",
        badgeId: "memory-silver",
        badgeName: "Memory Silver",
        badgeIconName: "Brain"
      },
      challengeStreak: 3,
      hasTextFaded: true,
      backspaceUsed: false,
      holdSeconds: 0,
      maxHoldWpm: 0,
      promptHiddenUsed: true,
      typedWordCount: 2
    });

    expect(result.id).toBe(123);
    expect(result.mode).toBe("words");
    expect(result.wordCount).toBe(50);
    expect(result.goalVariant).toBeNull();
    expect(result.promptText).toBe("alpha beta");
    expect(result.challengeBadgeIconName).toBe("Brain");
    expect(result.improvedBest).toBe(true);
  });
});
