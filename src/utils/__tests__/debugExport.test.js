import { describe, expect, it, vi } from "vitest";
import * as replayEngine from "../../engine/replayEngine";
import * as telemetryEngine from "../../engine/telemetryEngine";
import * as debugExport from "../debugExport";

describe("debugExport", () => {
  it("exports typing sessions deterministically and without mutation", () => {
    const replay = replayEngine.createSession({ mode: "time" }, { maxEvents: 8 });
    const telemetry = telemetryEngine.createTelemetrySession({ enabled: true, maxSamples: 8 });

    replayEngine.markStart(replay, 100);
    replayEngine.recordKey(replay, { key: "a", correct: true, wordIndex: 0, charIndex: 0, ts: 110 });
    replayEngine.markEnd(replay, 200);

    telemetryEngine.markSessionStart(telemetry, 100);
    telemetryEngine.recordInputLatency(telemetry, 11, 111);
    telemetryEngine.recordCommit(telemetry, { ts: 150, replayBufferSize: replay.events.length });
    telemetryEngine.markSessionEnd(telemetry, 200);

    const originalReplayLength = replay.events.length;
    const originalTelemetryLength = telemetry.samples.length;

    const exported = debugExport.exportTypingSession(
      { wpm: 80, accuracy: 96, mode: "time" },
      replay,
      { build: "test" },
      telemetry,
      {
        exportedAt: 1234567890,
        arenaMetadata: { family: "control" },
        history: [
          {
            result: { id: 99, wpm: 81, accuracy: 97, timeUsed: 60, goalSuccess: true },
            replay,
            telemetry
          }
        ],
        challenge: {
          id: "control-one",
          family: "control",
          rules: { noBackspace: true, targetWpm: 60, targetAccuracy: 95 }
        }
      }
    );

    const serialized = debugExport.serializeTypingSession(
      { wpm: 80, accuracy: 96, mode: "time" },
      replay,
      { build: "test" },
      telemetry,
      {
        exportedAt: 1234567890,
        arenaMetadata: { family: "control" },
        history: [
          {
            result: { id: 99, wpm: 81, accuracy: 97, timeUsed: 60, goalSuccess: true },
            replay,
            telemetry
          }
        ],
        challenge: {
          id: "control-one",
          family: "control",
          rules: { noBackspace: true, targetWpm: 60, targetAccuracy: 95 }
        }
      }
    );

    expect(replay.events.length).toBe(originalReplayLength);
    expect(telemetry.samples.length).toBe(originalTelemetryLength);
    expect(JSON.parse(serialized)).toEqual(exported);
    expect(exported.schemaVersion).toBe(debugExport.DEBUG_EXPORT_SCHEMA_VERSION);
    expect(exported.exportedAt).toBe(1234567890);
    expect(exported.replay.events.length).toBe(3);
    expect(exported.telemetry.samples.length).toBeGreaterThan(0);
    expect(exported.analysis.behavior).toBeDefined();
    expect(exported.analysis.progression).toBeDefined();
    expect(exported.analysis.challengeBalance).toBeDefined();
    expect(exported.analysis.engagement).toBeDefined();
    expect(exported.analysis.engagement.ranked).toBeDefined();
    expect(exported.analysis.engagement.seasonal.window.startAt).toBeLessThan(exported.analysis.engagement.seasonal.window.endAt);
    expect(exported.analysis.engagement.retention.burnout.burnoutRisk).toBeGreaterThanOrEqual(0);
    expect(exported.analysis.engagement.mastery.overallMasteryScore).toBeGreaterThanOrEqual(0);
  });

  it("tolerates corrupted replay and missing telemetry data", () => {
    const exportedReplay = debugExport.exportReplayBundle(null, { exportedAt: 9 });
    const exportedTelemetry = debugExport.exportTelemetryBundle(undefined, { exportedAt: 9 });

    expect(exportedReplay.events).toEqual([]);
    expect(exportedTelemetry.enabled).toBe(false);
    expect(() => debugExport.serializeDebugBundle({ replay: { events: [1, 2, 3] } }, { exportedAt: 9 })).not.toThrow();
  });

  it("keeps debug export schema version backward-compatible via optional fields", () => {
    const bundle = debugExport.exportDebugBundle({
      result: { wpm: 66, accuracy: 93 },
      replay: replayEngine.createSession(),
      telemetry: telemetryEngine.createTelemetrySession({ enabled: true })
    }, { exportedAt: 77 });

    expect(bundle.schemaVersion).toBe(debugExport.DEBUG_EXPORT_SCHEMA_VERSION);
    expect(bundle.analysis).toBeDefined();
    expect(bundle.analysis.engagement).toBeDefined();
  });

  it("prints summaries only when debug exports are enabled", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const replay = replayEngine.createSession();
    replayEngine.recordKey(replay, { key: "x", ts: 1 });

    const summary = debugExport.printReplaySummary(replay, { area: "unit-test" });
    if (debugExport.isDebugExportEnabled()) {
      expect(summary).not.toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    } else {
      expect(summary).toBeNull();
    }

    consoleSpy.mockRestore();
  });

  it("optionally includes replay consumer and ghost summaries", () => {
    const replay = replayEngine.createSession({ mode: "time" }, { maxEvents: 8 });
    replayEngine.recordKey(replay, { key: "x", ts: 1 });
    const bundle = debugExport.exportDebugBundle({ replay }, {
      exportedAt: 99,
      includeReplayConsumerSummaries: true,
      replayExecutionProfile: { workerMs: 1.2, projectionMs: 0.8 }
    });

    expect(bundle.replayConsumer).toBeTruthy();
    expect(bundle.ghost).toBeTruthy();
    expect(bundle.replayExecution).toBeTruthy();
    expect(bundle.replayExecution.workerMs).toBe(1.2);
  });
});
