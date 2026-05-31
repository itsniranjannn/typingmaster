import { describe, expect, it } from "vitest";
import * as analysis from "../sessionAnalysis";

const sampleReplay = {
  events: [
    { type: "start", ts: 100 },
    { type: "key", key: "a", correct: true, ts: 200 },
    { type: "key", key: "a", correct: false, backspace: true, ts: 260 },
    { type: "pause", ts: 260, duration: 2400 },
    { type: "key", key: "b", correct: true, ts: 3000 },
    { type: "key", key: "b", correct: false, ts: 3100 },
    { type: "end", ts: 3200 }
  ]
};

describe("sessionAnalysis", () => {
  it("summarizes pauses and corrections", () => {
    const pauses = analysis.getPauseDistribution(sampleReplay);
    const corrections = analysis.getCorrectionFrequency(sampleReplay);

    expect(pauses.count).toBe(1);
    expect(pauses.longestPauseMs).toBe(2400);
    expect(corrections.keyCount).toBe(4);
    expect(corrections.correctionCount).toBe(2);
    expect(corrections.backspaceCount).toBe(1);
  });

  it("estimates burst speed and consistency deterministically", () => {
    const burst = analysis.estimateBurstSpeed(sampleReplay, 1000);
    const consistency = analysis.scoreConsistency(sampleReplay);

    expect(burst.windowMs).toBe(1000);
    expect(burst.burstKeysPerWindow).toBeGreaterThan(0);
    expect(burst.burstWpm).toBeGreaterThan(0);
    expect(consistency.score).toBeGreaterThanOrEqual(0);
    expect(consistency.score).toBeLessThanOrEqual(1);
  });

  it("aggregates weak keys and replay density", () => {
    const weakKeys = analysis.getWeakKeyAggregation(sampleReplay);
    const density = analysis.analyzeReplayDensity(sampleReplay);

    expect(weakKeys[0].key).toBe("a");
    expect(weakKeys[0].corrections).toBeGreaterThan(0);
    expect(density.totalEvents).toBe(sampleReplay.events.length);
    expect(density.keysPerSecond).toBeGreaterThan(0);
  });

  it("builds lightweight performance summaries", () => {
    const summary = analysis.summarizePerformanceSignals({
      replay: sampleReplay,
      telemetry: {
        averageInputLatencyMs: 13,
        replayBufferMax: 7,
        renderMarkerCount: 2,
        frameDropCount: 1,
        heapSnapshotCount: 3
      }
    });

    expect(summary.averageInputLatencyMs).toBe(13);
    expect(summary.replayBufferUsage).toBe(sampleReplay.events.length);
    expect(summary.renderMarkerCount).toBe(2);
    expect(summary.frameDropCount).toBe(1);
    expect(summary.heapSampleCount).toBe(3);
    expect(summary.longestPauseMs).toBe(2400);
    expect(summary.correctionRatio).toBeGreaterThan(0);
  });
});
