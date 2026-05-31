import { describe, expect, it } from "vitest";
import { buildNextBadgeRecord, getLeaderboardCandidates, sanitizeResult } from "../progressionEngine";

describe("progressionEngine parity", () => {
  it("sanitizes non-arena result by clearing challenge fields", () => {
    const sanitized = sanitizeResult({
      id: 1,
      mode: "time",
      wpm: 80,
      accuracy: 96,
      correctCharacters: 400,
      incorrectCharacters: 12,
      timeUsed: 60,
      challengeId: "memory-gold",
      challengeCompleted: true,
      challengeEarnedCount: 2
    });

    expect(sanitized.mode).toBe("time");
    expect(sanitized.challengeId).toBeNull();
    expect(sanitized.challengeCompleted).toBe(false);
    expect(sanitized.challengeEarnedCount).toBe(0);
  });

  it("qualifies leaderboard candidates by accuracy and sort order", () => {
    const candidates = getLeaderboardCandidates([
      { id: 1, wpm: 70, accuracy: 91 },
      { id: 2, wpm: 85, accuracy: 89 },
      { id: 3, wpm: 72, accuracy: 95 },
      { id: 4, wpm: 70, accuracy: 98 }
    ]);

    expect(candidates.map((entry) => entry.id)).toEqual([3, 4, 1]);
  });

  it("increments badge progression count deterministically", () => {
    const next = buildNextBadgeRecord(
      { badgeId: "memory-gold", name: "Memory Gold", iconName: "Trophy", earnedCount: 2, lastEarnedDate: "2026-05-26" },
      "memory-gold",
      { name: "Memory Gold", iconName: "Trophy" },
      Date.parse("2026-05-27T10:00:00.000Z")
    );

    expect(next.badgeId).toBe("memory-gold");
    expect(next.earnedCount).toBe(3);
    expect(next.lastEarnedDate).toBe("2026-05-27");
  });
});
