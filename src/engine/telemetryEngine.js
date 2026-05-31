const DEFAULT_MAX_SAMPLES = 128;

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function getEnvBoolean(name, fallback = false) {
  try {
    const rawValue = typeof import.meta !== "undefined" ? import.meta?.env?.[name] : undefined;
    if (rawValue === undefined) return fallback;
    return String(rawValue).toLowerCase() === "true";
  } catch (error) {
    return fallback;
  }
}

function getEnvNumber(name, fallback) {
  try {
    const rawValue = typeof import.meta !== "undefined" ? import.meta?.env?.[name] : undefined;
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

export function createTelemetrySession(options = {}) {
  return {
    enabled: options.enabled ?? getEnvBoolean("VITE_ENABLE_TELEMETRY", false),
    maxSamples: Number.isFinite(Number(options.maxSamples)) && Number(options.maxSamples) > 0
      ? Number(options.maxSamples)
      : getEnvNumber("VITE_TELEMETRY_MAX_SAMPLES", DEFAULT_MAX_SAMPLES),
    startedAt: null,
    endedAt: null,
    lastCommitAt: null,
    inputLatencySum: 0,
    inputLatencyCount: 0,
    inputLatencyMax: 0,
    commitCount: 0,
    renderMarkerCount: 0,
    frameDropCount: 0,
    heapSnapshotCount: 0,
    replayBufferMax: 0,
    peakHeapSize: 0,
    samples: []
  };
}

function pushSample(session, sample) {
  if (!session.enabled) return;
  session.samples.push(sample);
  if (session.samples.length > session.maxSamples) {
    session.samples.splice(0, session.samples.length - session.maxSamples);
  }
}

export function markSessionStart(session, ts = now()) {
  if (!session.enabled || session.startedAt !== null) return;
  session.startedAt = ts;
  pushSample(session, { type: "start", ts });
}

export function markSessionEnd(session, ts = now()) {
  if (!session.enabled || session.endedAt !== null) return;
  session.endedAt = ts;
  pushSample(session, { type: "end", ts });
}

export function recordInputLatency(session, latencyMs, ts = now()) {
  if (!session.enabled) return;
  const normalizedLatency = Math.max(0, Number(latencyMs) || 0);
  session.inputLatencySum += normalizedLatency;
  session.inputLatencyCount += 1;
  session.inputLatencyMax = Math.max(session.inputLatencyMax, normalizedLatency);
  pushSample(session, { type: "input-latency", ts, latencyMs: normalizedLatency });
}

export function recordCommit(session, { ts = now(), replayBufferSize = 0, renderDurationMs = 0 } = {}) {
  if (!session.enabled) return;
  session.commitCount += 1;
  session.replayBufferMax = Math.max(session.replayBufferMax, Number(replayBufferSize) || 0);
  const commitDeltaMs = session.lastCommitAt === null ? 0 : Math.max(0, ts - session.lastCommitAt);
  session.lastCommitAt = ts;
  pushSample(session, {
    type: "commit",
    ts,
    commitDeltaMs,
    replayBufferSize: Math.max(0, Number(replayBufferSize) || 0),
    renderDurationMs: Math.max(0, Number(renderDurationMs) || 0)
  });
}

export function recordRenderMarker(session, name = "render", { ts = now(), durationMs = 0 } = {}) {
  if (!session.enabled) return;
  session.renderMarkerCount += 1;
  pushSample(session, { type: "render-marker", name, ts, durationMs: Math.max(0, Number(durationMs) || 0) });
}

export function recordFrameObservation(session, { ts = now(), frameDeltaMs = 0 } = {}) {
  if (!session.enabled) return;
  const normalizedDelta = Math.max(0, Number(frameDeltaMs) || 0);
  if (normalizedDelta >= 34) {
    session.frameDropCount += 1;
  }
  pushSample(session, { type: "frame", ts, frameDeltaMs: normalizedDelta });
}

export function recordHeapSnapshot(session, { ts = now(), usedHeapSize = null, totalHeapSize = null, jsHeapLimit = null } = {}) {
  if (!session.enabled) return;
  session.heapSnapshotCount += 1;
  if (typeof usedHeapSize === "number") {
    session.peakHeapSize = Math.max(session.peakHeapSize, usedHeapSize);
  }
  pushSample(session, {
    type: "heap",
    ts,
    usedHeapSize,
    totalHeapSize,
    jsHeapLimit
  });
}

export function getAverageInputLatency(session) {
  if (!session.inputLatencyCount) return 0;
  return session.inputLatencySum / session.inputLatencyCount;
}

export function exportTelemetrySession(session) {
  return {
    enabled: session.enabled,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMs: session.startedAt !== null && session.endedAt !== null ? Math.max(0, session.endedAt - session.startedAt) : 0,
    averageInputLatencyMs: getAverageInputLatency(session),
    inputLatencyMax: session.inputLatencyMax,
    commitCount: session.commitCount,
    renderMarkerCount: session.renderMarkerCount,
    frameDropCount: session.frameDropCount,
    heapSnapshotCount: session.heapSnapshotCount,
    replayBufferMax: session.replayBufferMax,
    peakHeapSize: session.peakHeapSize,
    samples: session.samples.slice()
  };
}

export function clearTelemetrySession(session) {
  session.startedAt = null;
  session.endedAt = null;
  session.lastCommitAt = null;
  session.inputLatencySum = 0;
  session.inputLatencyCount = 0;
  session.inputLatencyMax = 0;
  session.commitCount = 0;
  session.renderMarkerCount = 0;
  session.frameDropCount = 0;
  session.heapSnapshotCount = 0;
  session.replayBufferMax = 0;
  session.peakHeapSize = 0;
  session.samples.length = 0;
}

export default {
  createTelemetrySession,
  markSessionStart,
  markSessionEnd,
  recordInputLatency,
  recordCommit,
  recordRenderMarker,
  recordFrameObservation,
  recordHeapSnapshot,
  exportTelemetrySession,
  clearTelemetrySession,
  getAverageInputLatency
};
