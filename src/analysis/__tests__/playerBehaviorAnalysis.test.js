import { describe, expect, it } from "vitest";
import * as analysis from "../playerBehaviorAnalysis";

const makeReplay = (keyPairs) => ({
  events: [
    { type: "start", ts: 100 },
    ...keyPairs,
    { type: "end", ts: 5000 }
  ]
});

const history = [
  {
    result: { id: 1, wpm: 42, accuracy: 94, timeUsed: 60, completedWords: 25, goalSuccess: true },
    replay: makeReplay([
      { type: "key", key: "a", correct: true, ts: 200 },
      { type: "key", key: "b", correct: true, ts: 420 },
      { type: "pause", ts: 420, duration: 800 },
      { type: "key", key: "a", correct: false, backspace: true, ts: 1250 }
    ])
  },
  {
    result: { id: 2, wpm: 54, accuracy: 96, timeUsed: 58, completedWords: 26, goalSuccess: false, challengeFailed: true },
    replay: makeReplay([
      { type: "key", key: "a", correct: true, ts: 220 },
      { type: "key", key: "a", correct: false, backspace: true, ts: 500 },
      { type: "pause", ts: 500, duration: 2200 },
      { type: "key", key: "c", correct: false, ts: 2900 }
    ])
  },
  {
    result: { id: 3, wpm: 61, accuracy: 98, timeUsed: 57, completedWords: 30, goalSuccess: true },
    replay: makeReplay([
      { type: "key", key: "d", correct: true, ts: 250 },
      { type: "key", key: "e", correct: true, ts: 340 },
      { type: "key", key: "f", correct: true, ts: 430 }
    ])
  }
];

describe("playerBehaviorAnalysis", () => {
  it("produces bounded rolling consistency trends", () => {
    const trends = analysis.getRollingConsistencyTrends(history, 2);
    expect(trends.length).toBe(history.length);
    expect(trends[trends.length - 1].count).toBeLessThanOrEqual(2);
    expect(trends[trends.length - 1].averageWpm).toBeGreaterThan(0);
  });

  it("detects fatigue and frustration deterministically", () => {
    const fatigue = analysis.detectFatigue(history);
    const frustration = analysis.getFrustrationIndicators(history);

    expect(fatigue.fatigueScore).toBeGreaterThanOrEqual(0);
    expect(fatigue.fatigueScore).toBeLessThanOrEqual(1);
    expect(frustration.frustrationScore).toBeGreaterThanOrEqual(0);
    expect(frustration.frustrationScore).toBeLessThanOrEqual(1);
    expect(frustration.indicators.length).toBeGreaterThanOrEqual(0);
  });

  it("summarizes retries, burst speed, and correction clustering", () => {
    const retries = analysis.getRetryFrequency(history);
    const burst = analysis.getBurstVsSustainedSpeed(history);
    const clustering = analysis.getCorrectionClustering(history);

    expect(retries.totalAttempts).toBe(3);
    expect(retries.failedAttempts).toBe(1);
    expect(burst.ratio).toBeGreaterThanOrEqual(0);
    expect(clustering.clusterCount).toBeGreaterThanOrEqual(0);
  });

  it("tolerates malformed history and stays bounded", () => {
    const result = analysis.summarizePlayerBehaviorHistory([null, undefined, {}, { result: { wpm: 10, accuracy: 90 } }]);
    expect(result.samples).toBeLessThanOrEqual(2);
    expect(result.rollingConsistency.length).toBeGreaterThan(0);
  });
});
