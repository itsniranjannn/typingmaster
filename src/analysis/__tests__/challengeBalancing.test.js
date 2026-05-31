import { describe, expect, it } from "vitest";
import * as balancing from "../challengeBalancing";

const memoryChallenge = {
  id: "memory-medium",
  family: "memory",
  prompt: "Remember the sentence before it fades.",
  rules: {
    hideAfterSeconds: 3,
    wordCount: 12,
    sustainSeconds: 5,
    noBackspace: true,
    allowedMistakes: 0,
    targetWpm: 55,
    targetAccuracy: 96,
    timeLimitSeconds: 40
  }
};

describe("challengeBalancing", () => {
  it("scores difficulty deterministically and within bounds", () => {
    const scoreA = balancing.scoreChallengeDifficulty(memoryChallenge, { wpm: 58, accuracy: 97, completedWords: 12 });
    const scoreB = balancing.scoreChallengeDifficulty(memoryChallenge, { wpm: 58, accuracy: 97, completedWords: 12 });

    expect(scoreA).toBe(scoreB);
    expect(scoreA).toBeGreaterThanOrEqual(0);
    expect(scoreA).toBeLessThanOrEqual(100);
  });

  it("estimates expected completion rate and sustain difficulty", () => {
    const completionRate = balancing.estimateExpectedCompletionRate(memoryChallenge, { wpm: 60, accuracy: 98, history: [] });
    const sustainDifficulty = balancing.estimateSustainDifficulty(memoryChallenge, { wpm: 60, accuracy: 98, holdSeconds: 5, history: [] });

    expect(completionRate).toBeGreaterThanOrEqual(0);
    expect(completionRate).toBeLessThanOrEqual(1);
    expect(sustainDifficulty).toBeGreaterThanOrEqual(0);
    expect(sustainDifficulty).toBeLessThanOrEqual(1);
  });

  it("scores memory intensity, no-backspace pressure, and duration stress", () => {
    const memoryIntensity = balancing.scoreMemoryChallengeIntensity(memoryChallenge, { replay: { events: [{ type: "pause", ts: 1, duration: 2400 }] } });
    const noBackspacePressure = balancing.scoreNoBackspacePressure(memoryChallenge, { replay: { events: [{ type: "key", key: "a", correct: false, backspace: true, ts: 1 }] } });
    const durationStress = balancing.scoreSessionDurationStress(memoryChallenge, { durationSeconds: 30, timeLimitSeconds: 40 });

    expect(memoryIntensity).toBeGreaterThanOrEqual(0);
    expect(memoryIntensity).toBeLessThanOrEqual(1);
    expect(noBackspacePressure).toBeGreaterThanOrEqual(0);
    expect(noBackspacePressure).toBeLessThanOrEqual(1);
    expect(durationStress).toBeGreaterThanOrEqual(0);
    expect(durationStress).toBeLessThanOrEqual(1);
  });

  it("handles malformed input without throwing", () => {
    expect(() => balancing.analyzeChallengeBalancing(null, null)).not.toThrow();
    const result = balancing.analyzeChallengeBalancing(null, null);
    expect(result.difficulty).toBeGreaterThanOrEqual(0);
  });
});
