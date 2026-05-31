// Lightweight replay / event engine
// - append-only events recorded into an in-memory buffer stored on the session object
// - minimal allocation on hot path: small object pushes and simple checks
// - pause detection (if gap >= PAUSE_THRESHOLD_MS) inserts a pause event

const PAUSE_THRESHOLD_MS = 2000;
const DEFAULT_MAX_EVENTS = 2048;

function getEnvNumber(name, fallback) {
  try {
    const value = typeof import.meta !== "undefined" ? import.meta?.env?.[name] : undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

export function getDefaultReplayMaxEvents() {
  return getEnvNumber("VITE_REPLAY_MAX_EVENTS", DEFAULT_MAX_EVENTS);
}

let nextSessionId = 1;

export function createSession(meta = {}, options = {}) {
  return {
    id: `session-${nextSessionId++}`,
    meta,
    events: [],
    flushedBatches: [],
    metrics: {
      eventCount: 0,
      keyCount: 0,
      correctionCount: 0,
      pauseCount: 0,
      renderMarkerCount: 0,
      durationMs: 0,
      startTs: null,
      endTs: null
    },
    lastTs: null,
    maxEvents: Number.isFinite(Number(options.maxEvents)) && Number(options.maxEvents) > 0 ? Number(options.maxEvents) : getDefaultReplayMaxEvents(),
    flushStrategy: typeof options.flushStrategy === "function" ? options.flushStrategy : null
  };
}

function pushEvent(session, ev) {
  // append-only
  session.events.push(ev);
  session.metrics.eventCount += 1;

  if (ev.type === "key") {
    session.metrics.keyCount += 1;
    if (ev.backspace || ev.correct === false) {
      session.metrics.correctionCount += 1;
    }
  } else if (ev.type === "pause") {
    session.metrics.pauseCount += 1;
  } else if (ev.type === "marker") {
    session.metrics.renderMarkerCount += 1;
  } else if (ev.type === "start") {
    session.metrics.startTs = ev.ts;
  } else if (ev.type === "end") {
    session.metrics.endTs = ev.ts;
    if (typeof session.metrics.startTs === "number") {
      session.metrics.durationMs = Math.max(0, ev.ts - session.metrics.startTs);
    }
  }

  if (session.events.length > session.maxEvents) {
    const overflow = session.events.length - session.maxEvents;
    const evicted = session.events.splice(0, overflow);
    if (evicted.length > 0) {
      if (session.flushStrategy) {
        session.flushStrategy(evicted, session);
      } else {
        session.flushedBatches.push({ count: evicted.length, firstTs: evicted[0]?.ts ?? null, lastTs: evicted[evicted.length - 1]?.ts ?? null });
      }
    }
  }
}

export function markStart(session, ts = performance.now()) {
  pushEvent(session, { type: "start", ts });
  session.lastTs = ts;
}

export function markEnd(session, ts = performance.now()) {
  pushEvent(session, { type: "end", ts });
  session.lastTs = ts;
}

export function recordKey(session, { key = "", correct = true, wordIndex = -1, charIndex = -1, backspace = false, ts = performance.now() } = {}) {
  // Pause detection (observational): if gap since lastTs is large, record a pause event
  const last = session.lastTs;
  if (typeof last === "number") {
    const gap = Math.max(0, ts - last);
    if (gap >= PAUSE_THRESHOLD_MS) {
      pushEvent(session, { type: "pause", ts: last, duration: Math.round(gap) });
    }
  }

  pushEvent(session, { type: "key", ts, key, correct: Boolean(correct), wordIndex, charIndex, backspace: Boolean(backspace) });
  session.lastTs = ts;
}

export function recordRenderMarker(session, name = "render", ts = performance.now()) {
  pushEvent(session, { type: "marker", name, ts });
}

export function getEvents(session) {
  // return a shallow copy to keep internal buffer append-only for callers
  return session.events.slice();
}

export function exportReplaySession(session) {
  return {
    id: session.id,
    meta: session.meta,
    config: {
      maxEvents: session.maxEvents
    },
    events: session.events.slice(),
    flushedBatches: session.flushedBatches.slice(),
    metrics: { ...session.metrics }
  };
}

export function exportTypingSession(result, replay, metadata = {}) {
  return {
    result,
    replay: exportReplaySession(replay),
    metadata
  };
}

export function serializeSession(session) {
  return JSON.stringify(exportReplaySession(session));
}

export function clearSession(session) {
  session.events.length = 0;
  session.flushedBatches.length = 0;
  session.metrics = {
    eventCount: 0,
    keyCount: 0,
    correctionCount: 0,
    pauseCount: 0,
    renderMarkerCount: 0,
    durationMs: 0,
    startTs: null,
    endTs: null
  };
  session.lastTs = null;
}

export default {
  createSession,
  markStart,
  markEnd,
  recordKey,
  recordRenderMarker,
  getEvents,
  exportReplaySession,
  exportTypingSession,
  serializeSession,
  clearSession,
  getDefaultReplayMaxEvents
};
