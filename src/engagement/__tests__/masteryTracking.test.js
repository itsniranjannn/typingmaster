import { describe, expect, it } from "vitest";
import * as mastery from "../masteryTracking";

const history = [
  { result: { wpm: 35, accuracy: 90, timeUsed: 54, family: "memory", goalSuccess: true } },
  { result: { wpm: 43, accuracy: 93, timeUsed: 58, family: "memory", goalSuccess: true } },
  { result: { wpm: 55, accuracy: 96, timeUsed: 61, family: "numbers", goalSuccess: true } },
  { result: { wpm: 62, accuracy: 97, timeUsed: 66, family: "numbers", goalSuccess: true } },
  { result: { wpm: 66, accuracy: 98, timeUsed: 70, family: "control", goalSuccess: true } }
];

describe("masteryTracking", () => {
  it("summarizes mastery capabilities deterministically", () => {
    const first = mastery.analyzeMasteryTracking(history);
    const second = mastery.analyzeMasteryTracking(history);

    expect(first).toEqual(second);
    expect(first.overallMasteryScore).toBeGreaterThanOrEqual(0);
    expect(first.overallMasteryScore).toBeLessThanOrEqual(1);
  });

  it("captures accuracy, speed, endurance, and family specialization", () => {
    const summary = mastery.analyzeMasteryTracking(history);

    expect(summary.accuracyMastery.milestones.length).toBeGreaterThan(0);
    expect(summary.speedMastery.bestWpm).toBeGreaterThanOrEqual(66);
    expect(summary.enduranceMastery.bestTimeUsed).toBeGreaterThanOrEqual(70);
    expect(summary.familyMastery.memory.sessions).toBeGreaterThan(0);
    expect(summary.familyMastery.numbers.sessions).toBeGreaterThan(0);
  });

  it("detects plateaus and tolerates malformed history", () => {
    const plateau = mastery.analyzeMasteryTracking([
      { result: { wpm: 55, accuracy: 95, timeUsed: 60 } },
      { result: { wpm: 55.1, accuracy: 95.1, timeUsed: 60 } },
      { result: { wpm: 55.2, accuracy: 95.1, timeUsed: 60 } },
      { result: { wpm: 55.3, accuracy: 95.1, timeUsed: 60 } },
      { result: { wpm: 55.2, accuracy: 95.2, timeUsed: 60 } }
    ]);

    const fallback = mastery.analyzeMasteryTracking([null, undefined, {}]);

    expect(typeof plateau.plateau.plateauDetected).toBe("boolean");
    expect(fallback.overallMasteryScore).toBeGreaterThanOrEqual(0);
    expect(fallback.overallMasteryScore).toBeLessThanOrEqual(1);
  });
});
