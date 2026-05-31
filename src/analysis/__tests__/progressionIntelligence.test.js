import { describe, expect, it } from "vitest";
import * as progression from "../progressionIntelligence";

const history = [
  { exportedAt: 1000, result: { id: 1, wpm: 32, accuracy: 90, timeUsed: 60, goalSuccess: true }, replay: { events: [{ type: "start", ts: 1 }, { type: "key", ts: 2 }, { type: "end", ts: 5 }] } },
  { exportedAt: 2000, result: { id: 2, wpm: 44, accuracy: 94, timeUsed: 58, goalSuccess: true }, replay: { events: [{ type: "start", ts: 1 }, { type: "key", ts: 2 }, { type: "key", ts: 3 }, { type: "end", ts: 5 }] } },
  { exportedAt: 3000, result: { id: 3, wpm: 57, accuracy: 97, timeUsed: 56, goalSuccess: false, challengeFailed: true }, replay: { events: [{ type: "start", ts: 1 }, { type: "key", ts: 2 }, { type: "pause", ts: 2, duration: 2400 }, { type: "end", ts: 5 }] } }
];

describe("progressionIntelligence", () => {
  it("estimates a stable skill band", () => {
    const band = progression.estimateSkillBand(history);
    expect(band.band).toBeDefined();
    expect(band.score).toBeGreaterThanOrEqual(0);
  });

  it("estimates streak sustainability and burnout risk", () => {
    const streak = progression.analyzeStreakSustainability(history);
    const burnout = progression.estimateBurnoutRisk(history);

    expect(streak.sustainabilityScore).toBeGreaterThanOrEqual(0);
    expect(streak.sustainabilityScore).toBeLessThanOrEqual(1);
    expect(burnout.burnoutRisk).toBeGreaterThanOrEqual(0);
    expect(burnout.burnoutRisk).toBeLessThanOrEqual(1);
  });

  it("summarizes engagement trends and goal calibration", () => {
    const engagement = progression.summarizeEngagementTrends(history);
    const dailyGoals = progression.calibrateDailyGoals(history);
    const pacing = progression.recommendBadgePacing(history);

    expect(engagement.sessions).toBe(history.length);
    expect(dailyGoals.recommendedDailySessions).toBeGreaterThanOrEqual(1);
    expect(pacing.paceMultiplier).toBeGreaterThanOrEqual(0.5);
  });

  it("builds a progression intelligence summary with challenge balance", () => {
    const summary = progression.summarizeProgressionIntelligence(history, {
      id: "memory-medium",
      family: "memory",
      rules: { hideAfterSeconds: 3, noBackspace: true, sustainSeconds: 5, targetWpm: 55, targetAccuracy: 96 }
    });

    expect(summary.skillBand.band).toBeDefined();
    expect(summary.challengeBalance).not.toBeNull();
  });
});
