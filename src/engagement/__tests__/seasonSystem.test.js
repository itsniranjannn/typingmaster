import { describe, expect, it } from "vitest";
import * as seasons from "../seasonSystem";

const history = [
  { exportedAt: 1710000000000, result: { wpm: 40, accuracy: 90, goalSuccess: true } },
  { exportedAt: 1710500000000, result: { wpm: 55, accuracy: 95, goalSuccess: true } },
  { exportedAt: 1711000000000, result: { wpm: 61, accuracy: 97, goalSuccess: true } }
];

describe("seasonSystem", () => {
  it("calculates deterministic season windows and resets", () => {
    const window = seasons.getSeasonWindow(1711200000000, 28, 1710000000000);
    const reset = seasons.calculateSeasonReset(1711200000000, 28, 1710000000000);

    expect(window.startAt).toBeLessThan(window.endAt);
    expect(reset.nextResetAt).toBe(window.endAt);
    expect(reset.daysUntilReset).toBeGreaterThanOrEqual(0);
  });

  it("tracks prestige and seasonal milestones", () => {
    const prestige = seasons.trackPrestige(history);
    const milestones = seasons.summarizeSeasonMilestones(history);

    expect(prestige.prestigePoints).toBeGreaterThanOrEqual(0);
    expect(milestones.milestones.length).toBeGreaterThan(0);
  });

  it("groups seasonal challenges and bounds pacing", () => {
    const groups = seasons.groupSeasonChallenges([
      { id: "memory-a", family: "memory" },
      { id: "memory-b", family: "memory" },
      { id: "numbers-a", family: "numbers" }
    ]);
    const pacing = seasons.recommendRewardPacing(history);

    expect(groups.length).toBe(2);
    expect(pacing.rewardGapSessions).toBeGreaterThanOrEqual(1);
  });

  it("summarizes progression carryover safely", () => {
    const carryover = seasons.summarizeProgressionCarryover(history, { referenceTimestamp: 1710000000000 }, { referenceTimestamp: 1711200000000 });

    expect(carryover.carryoverScore).toBeGreaterThanOrEqual(0);
    expect(carryover.carryoverScore).toBeLessThanOrEqual(1);
  });
});
