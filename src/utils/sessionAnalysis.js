const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const getSafeEvents = (exportedSession) => {
  if (!exportedSession || typeof exportedSession !== "object") return [];
  if (!Array.isArray(exportedSession.events)) return [];
  return exportedSession.events.filter((event) => event && typeof event === "object");
};

const getEventTimestamp = (event) => {
  const ts = clampNumber(event?.ts, null);
  return typeof ts === "number" && Number.isFinite(ts) ? ts : null;
};

export const getPauseDistribution = (exportedSession) => {
  const events = getSafeEvents(exportedSession);
  const pauses = events.filter((event) => event.type === "pause" && Number.isFinite(Number(event.duration)));
  const durations = pauses.map((event) => Math.max(0, Number(event.duration) || 0));
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  const longestPauseMs = durations.length > 0 ? Math.max(...durations) : 0;
  const averagePauseMs = durations.length > 0 ? total / durations.length : 0;

  return {
    count: durations.length,
    totalPauseMs: total,
    averagePauseMs,
    longestPauseMs,
    shortPauses: durations.filter((duration) => duration < 1000).length,
    mediumPauses: durations.filter((duration) => duration >= 1000 && duration < 3000).length,
    longPauses: durations.filter((duration) => duration >= 3000).length
  };
};

export const getCorrectionFrequency = (exportedSession) => {
  const events = getSafeEvents(exportedSession);
  const keyEvents = events.filter((event) => event.type === "key");
  const correctionEvents = keyEvents.filter((event) => Boolean(event.backspace) || event.correct === false);
  const backspaceEvents = keyEvents.filter((event) => Boolean(event.backspace));

  return {
    keyCount: keyEvents.length,
    correctionCount: correctionEvents.length,
    backspaceCount: backspaceEvents.length,
    correctionRatio: keyEvents.length > 0 ? correctionEvents.length / keyEvents.length : 0,
    backspaceRatio: keyEvents.length > 0 ? backspaceEvents.length / keyEvents.length : 0
  };
};

export const estimateBurstSpeed = (exportedSession, windowMs = 1000) => {
  const events = getSafeEvents(exportedSession)
    .filter((event) => event.type === "key")
    .map((event) => ({
      ...event,
      ts: getEventTimestamp(event)
    }))
    .filter((event) => typeof event.ts === "number")
    .sort((left, right) => left.ts - right.ts);

  if (events.length === 0) {
    return { burstKeysPerWindow: 0, burstWpm: 0, windowMs: Math.max(1, Number(windowMs) || 1000) };
  }

  const normalizedWindow = Math.max(1, Number(windowMs) || 1000);
  let left = 0;
  let maxCount = 0;

  for (let right = 0; right < events.length; right += 1) {
    while (events[right].ts - events[left].ts > normalizedWindow) {
      left += 1;
    }
    maxCount = Math.max(maxCount, right - left + 1);
  }

  return {
    burstKeysPerWindow: maxCount,
    burstWpm: Math.round((maxCount / normalizedWindow) * 60000 / 5),
    windowMs: normalizedWindow
  };
};

export const scoreConsistency = (exportedSession) => {
  const events = getSafeEvents(exportedSession)
    .filter((event) => event.type === "key")
    .map((event) => ({ ...event, ts: getEventTimestamp(event) }))
    .filter((event) => typeof event.ts === "number")
    .sort((left, right) => left.ts - right.ts);

  if (events.length < 2) {
    return { score: 1, intervalVariance: 0, averageIntervalMs: 0 };
  }

  const intervals = [];
  for (let index = 1; index < events.length; index += 1) {
    intervals.push(Math.max(0, events[index].ts - events[index - 1].ts));
  }

  const averageIntervalMs = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const variance = intervals.reduce((sum, value) => sum + ((value - averageIntervalMs) ** 2), 0) / intervals.length;
  const normalizedVariance = Math.min(variance / 10000, 1);
  const correctionPenalty = Math.min(getCorrectionFrequency(exportedSession).correctionRatio, 1);
  const score = Math.max(0, Math.min(1, 1 - normalizedVariance * 0.7 - correctionPenalty * 0.3));

  return {
    score,
    intervalVariance: variance,
    averageIntervalMs
  };
};

export const getWeakKeyAggregation = (exportedSession) => {
  const keyEvents = getSafeEvents(exportedSession).filter((event) => event.type === "key");
  const counts = new Map();

  for (const event of keyEvents) {
    const key = typeof event.key === "string" && event.key.length > 0 ? event.key : "unknown";
    const bucket = counts.get(key) || { key, count: 0, corrections: 0 };
    bucket.count += 1;
    if (event.backspace || event.correct === false) {
      bucket.corrections += 1;
    }
    counts.set(key, bucket);
  }

  return Array.from(counts.values())
    .map((entry) => ({ ...entry, correctionRatio: entry.count > 0 ? entry.corrections / entry.count : 0 }))
    .sort((left, right) => right.corrections - left.corrections || right.count - left.count || left.key.localeCompare(right.key));
};

export const analyzeReplayDensity = (exportedSession) => {
  const events = getSafeEvents(exportedSession);
  const keyEvents = events.filter((event) => event.type === "key");
  const startEvent = events.find((event) => event.type === "start");
  const endEvent = [...events].reverse().find((event) => event.type === "end");
  const durationMs = Math.max(0, clampNumber(endEvent?.ts, 0) - clampNumber(startEvent?.ts, 0));
  const durationSeconds = durationMs > 0 ? durationMs / 1000 : 0;

  return {
    totalEvents: events.length,
    keyEvents: keyEvents.length,
    eventsPerSecond: durationSeconds > 0 ? events.length / durationSeconds : events.length,
    keysPerSecond: durationSeconds > 0 ? keyEvents.length / durationSeconds : keyEvents.length,
    keyDensityPerThousandMs: durationMs > 0 ? (keyEvents.length / durationMs) * 1000 : keyEvents.length
  };
};

export const summarizePerformanceSignals = ({ replay, telemetry }) => ({
  averageInputLatencyMs: clampNumber(telemetry?.averageInputLatencyMs, 0),
  replayBufferUsage: clampNumber(replay?.events?.length, 0),
  renderMarkerCount: clampNumber(telemetry?.renderMarkerCount, 0),
  frameDropCount: clampNumber(telemetry?.frameDropCount, 0),
  heapSampleCount: clampNumber(telemetry?.heapSnapshotCount, 0),
  longestPauseMs: getPauseDistribution(replay).longestPauseMs,
  correctionRatio: getCorrectionFrequency(replay).correctionRatio
});

export default {
  getPauseDistribution,
  getCorrectionFrequency,
  estimateBurstSpeed,
  scoreConsistency,
  getWeakKeyAggregation,
  analyzeReplayDensity,
  summarizePerformanceSignals
};
