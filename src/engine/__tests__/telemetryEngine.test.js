import { describe, expect, it } from "vitest";
import * as telemetry from "../telemetryEngine";

describe("telemetryEngine", () => {
  it("records input latency, commit cadence, and session bounds", () => {
    const session = telemetry.createTelemetrySession({ enabled: true, maxSamples: 8 });

    telemetry.markSessionStart(session, 100);
    telemetry.recordInputLatency(session, 12, 112);
    telemetry.recordCommit(session, { ts: 200, replayBufferSize: 5 });
    telemetry.recordRenderMarker(session, "ui", { ts: 220, durationMs: 4 });
    telemetry.markSessionEnd(session, 300);

    const snapshot = telemetry.exportTelemetrySession(session);
    expect(snapshot.durationMs).toBe(200);
    expect(snapshot.averageInputLatencyMs).toBe(12);
    expect(snapshot.commitCount).toBe(1);
    expect(snapshot.renderMarkerCount).toBe(1);
    expect(snapshot.replayBufferMax).toBe(5);
    expect(snapshot.samples[0].type).toBe("start");
    expect(snapshot.samples[snapshot.samples.length - 1].type).toBe("end");
  });

  it("tracks frame drops and heap growth snapshots", () => {
    const session = telemetry.createTelemetrySession({ enabled: true, maxSamples: 4 });

    telemetry.recordFrameObservation(session, { ts: 10, frameDeltaMs: 16 });
    telemetry.recordFrameObservation(session, { ts: 20, frameDeltaMs: 48 });
    telemetry.recordHeapSnapshot(session, { ts: 30, usedHeapSize: 1000, totalHeapSize: 2000, jsHeapLimit: 3000 });

    const snapshot = telemetry.exportTelemetrySession(session);
    expect(snapshot.frameDropCount).toBe(1);
    expect(snapshot.heapSnapshotCount).toBe(1);
    expect(snapshot.peakHeapSize).toBe(1000);
  });

  it("bounds retained telemetry samples", () => {
    const session = telemetry.createTelemetrySession({ enabled: true, maxSamples: 2 });
    telemetry.recordCommit(session, { ts: 1 });
    telemetry.recordCommit(session, { ts: 2 });
    telemetry.recordCommit(session, { ts: 3 });

    const snapshot = telemetry.exportTelemetrySession(session);
    expect(snapshot.samples.length).toBeLessThanOrEqual(2);
    expect(snapshot.commitCount).toBe(3);
  });
});
