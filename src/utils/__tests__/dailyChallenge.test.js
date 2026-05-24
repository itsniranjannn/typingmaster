import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeChallenge, getChallengeTemplates, getDailyChallenge, getDailyChallengeHistoryEntries } from "../dailyChallenge";
import { loadBadges } from "../storage";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("daily challenge helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("creates a stable challenge for the active UTC day", () => {
    const first = getDailyChallenge();
    const second = getDailyChallenge();

    expect(first).toBeTruthy();
    expect(first?.date).toBe("2026-05-24");
    expect(second?.challenge.id).toBe(first?.challenge.id);
  });

  it("exposes at least 30 arena templates", () => {
    expect(getChallengeTemplates().length).toBeGreaterThanOrEqual(30);
  });

  it("does not complete the challenge when accuracy is below the objective", () => {
    const state = getDailyChallenge();

    const outcome = completeChallenge(
      {
        mode: state.challenge.mode,
        wpm: 10,
        accuracy: 10,
        timeUsed: 10,
        correctCharacters: 0,
        incorrectCharacters: 999,
        backspaceUsed: true,
        holdSeconds: 0,
        maxHoldWpm: 0,
        promptHiddenUsed: false
      },
      Date.now()
    );

    expect(outcome.completed).toBe(false);
    expect(outcome.state?.challengeCompleted).toBe(false);
  });

  it("marks the challenge complete when the result meets the criteria", () => {
    const state = getDailyChallenge();
    const rules = state.challenge.rules || {};
    const targetWpm = Number(rules.targetWpm || rules.minWpm || 35);
    const targetAccuracy = Number(rules.minAccuracy || 92);

    const result = {
      mode: state.challenge.mode,
      wpm: targetWpm + 5,
      accuracy: targetAccuracy,
      timeUsed: Math.max(1, Number(rules.timeLimitSeconds || 60) - 1),
      correctCharacters: 500,
      incorrectCharacters: 0,
      backspaceUsed: false,
      holdSeconds: Number(rules.sustainSeconds || 0),
      maxHoldWpm: targetWpm + 5,
      promptHiddenUsed: rules.hideAfterSeconds ? true : false
    };

    const outcome = completeChallenge(result, Date.now());

    expect(outcome.completed).toBe(true);
    expect(outcome.state?.challengeCompleted).toBe(true);
    expect(getDailyChallengeHistoryEntries()).toHaveLength(1);
    expect(getDailyChallengeHistoryEntries()[0]?.completed).toBe(true);
  });

  it("avoids repeating the same challenge on the next UTC day", () => {
    const today = getDailyChallenge();
    const todayId = today?.challenge.id;

    vi.setSystemTime(new Date(Date.now() + DAY_MS));
    const nextDay = getDailyChallenge();

    expect(nextDay?.date).toBe("2026-05-25");
    expect(nextDay?.challenge.id).not.toBe(todayId);
  });

  it("avoids repeats across five simulated UTC days", () => {
    const seen = new Set();

    for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
      vi.setSystemTime(new Date(Date.parse("2026-05-24T12:00:00.000Z") + dayIndex * DAY_MS));
      const state = getDailyChallenge();
      expect(seen.has(state?.challenge.id)).toBe(false);
      seen.add(state?.challenge.id);
    }

    expect(seen.size).toBe(5);
  });

  it("awards the challenge badge only once per day", () => {
    const state = getDailyChallenge();
    const rules = state.challenge.rules || {};
    const result = {
      mode: state.challenge.mode,
      wpm: Number(rules.minWpm || rules.targetWpm || 35) + 20,
      accuracy: Number(rules.minAccuracy || 90),
      timeUsed: Math.max(1, Number(rules.timeLimitSeconds || 60) - 1),
      correctCharacters: 500,
      incorrectCharacters: 0,
      backspaceUsed: false,
      holdSeconds: Number(rules.sustainSeconds || 0),
      maxHoldWpm: Number(rules.minWpm || rules.targetWpm || 35) + 20,
      promptHiddenUsed: rules.hideAfterSeconds ? true : false
    };

    const firstOutcome = completeChallenge(result, Date.now());
    const secondOutcome = completeChallenge(result, Date.now());

    expect(firstOutcome.completed).toBe(true);
    expect(firstOutcome.state?.challengeCompletedToday).toBe(true);
    expect(secondOutcome.alreadyCompleted).toBe(true);
    expect(loadBadges()).toHaveLength(1);
  });
});
