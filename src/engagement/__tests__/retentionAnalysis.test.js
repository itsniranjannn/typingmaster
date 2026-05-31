import { describe, expect, it } from "vitest";
import * as retention from "../retentionAnalysis";

const history = [
  { exportedAt: 1710000000000, result: { wpm: 68, accuracy: 96, goalSuccess: true, family: "memory" }, replay: { events: [{ type: "pause", ts: 1, duration: 1200 }] } },
  { exportedAt: 1710200000000, result: { wpm: 64, accuracy: 94, goalSuccess: false, challengeFailed: true, family: "memory" }, replay: { events: [{ type: "key", ts: 1, backspace: true, correct: false }] } },
  { exportedAt: 1710400000000, result: { wpm: 58, accuracy: 92, goalSuccess: false, challengeFailed: true, family: "numbers" }, replay: { events: [{ type: "pause", ts: 1, duration: 2600 }] } }
];

describe("retentionAnalysis", () => {
  it("scores burnout risk deterministically", () => {
    const first = retention.scoreBurnoutRisk(history);
    const second = retention.scoreBurnoutRisk(history);

    expect(first).toEqual(second);
    expect(first.burnoutRisk).toBeGreaterThanOrEqual(0);
    expect(first.burnoutRisk).toBeLessThanOrEqual(1);
  });

  it("detects challenge fatigue and streak pressure", () => {
    const fatigue = retention.detectChallengeFatigue(history);
    const streak = retention.analyzeStreakPressure(history);

    expect(fatigue.challengeFatigueScore).toBeGreaterThanOrEqual(0);
    expect(streak.streakPressureScore).toBeGreaterThanOrEqual(0);
  });

  it("keeps recovery recommendations bounded for malformed input", () => {
    const recovery = retention.summarizeRecoveryRecommendations([null, {}, { result: { goalSuccess: false } }]);
    const intensity = retention.balanceSessionIntensity(history);

    expect(Array.isArray(recovery.recommendations)).toBe(true);
    expect(intensity.targetLoad).toBeGreaterThanOrEqual(0.25);
    expect(intensity.targetLoad).toBeLessThanOrEqual(1);
  });
});
