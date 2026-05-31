import { rebuildPlaybackSnapshots } from "./snapshotRebuilder";
import { buildPlaybackSummary, buildPlaybackDivergenceReport } from "./playbackValidationLayer";

const cloneEvents = (replayExport) => (Array.isArray(replayExport?.events) ? replayExport.events.slice() : []);

export function createPlaybackCursor(replayExport, options = {}) {
  return {
    replayExport: replayExport && typeof replayExport === "object" ? replayExport : { events: [] },
    options: {
      paragraph: options.paragraph || "",
      targetWords: Array.isArray(options.targetWords) ? options.targetWords.slice() : [],
      maxCheckpoints: Math.max(1, Number(options.maxCheckpoints) || 64)
    },
    index: 0,
    checkpoints: [],
    invalidatedAt: null,
    state: null,
    lastSummary: null
  };
}

function recordCheckpoint(cursor, checkpoint) {
  cursor.checkpoints.push(Object.freeze({
    eventIndex: checkpoint.eventIndex,
    eventType: checkpoint.eventType,
    ts: checkpoint.ts,
    snapshot: checkpoint.snapshot
  }));

  if (cursor.checkpoints.length > cursor.options.maxCheckpoints) {
    cursor.checkpoints.shift();
  }
}

export function resetPlaybackCursor(cursor) {
  if (!cursor) return null;
  cursor.index = 0;
  cursor.checkpoints = [];
  cursor.invalidatedAt = null;
  cursor.state = null;
  cursor.lastSummary = null;
  return cursor;
}

export function stepPlaybackCursor(cursor, stepCount = 1) {
  if (!cursor) {
    return null;
  }

  const events = cloneEvents(cursor.replayExport);
  if (!cursor.state) {
    cursor.state = rebuildPlaybackSnapshots(cursor.replayExport, cursor.options).state;
  }

  const maxIndex = Math.min(events.length, cursor.index + Math.max(1, Number(stepCount) || 1));
  let lastCheckpoint = null;

  while (cursor.index < maxIndex) {
    const event = events[cursor.index];
    cursor.index += 1;
    const rebuilt = rebuildPlaybackSnapshots({ events: events.slice(0, cursor.index) }, cursor.options);
    cursor.state = rebuilt.state;

    const checkpoint = rebuilt.checkpoints[rebuilt.checkpoints.length - 1] || null;
    if (checkpoint) {
      lastCheckpoint = checkpoint;
      recordCheckpoint(cursor, checkpoint);
    }
  }

  cursor.lastSummary = buildPlaybackSummary({
    replayExport: cursor.replayExport,
    checkpoints: cursor.checkpoints,
    finalSnapshot: cursor.state
  });

  return {
    cursor,
    checkpoint: lastCheckpoint,
    summary: cursor.lastSummary,
    complete: cursor.index >= events.length
  };
}

export function playbackReplaySession(replayExport, options = {}) {
  const cursor = createPlaybackCursor(replayExport, options);
  const events = cloneEvents(replayExport);

  while (cursor.index < events.length) {
    stepPlaybackCursor(cursor, 1);
  }

  const rebuilt = rebuildPlaybackSnapshots(replayExport, cursor.options);
  const summary = buildPlaybackSummary({
    replayExport,
    checkpoints: rebuilt.checkpoints,
    finalSnapshot: rebuilt.finalSnapshot
  });

  return Object.freeze({
    cursor,
    finalSnapshot: rebuilt.finalSnapshot,
    checkpoints: rebuilt.checkpoints,
    summary,
    replayHash: summary.replayHash
  });
}

export function validatePlaybackReplay(replayExport, options = {}) {
  const playback = playbackReplaySession(replayExport, options);
  const checkpoint = playback.checkpoints[playback.checkpoints.length - 1] || null;
  const report = buildPlaybackDivergenceReport({
    replayExport,
    checkpoint,
    expectedSnapshot: playback.finalSnapshot,
    actualSnapshot: playback.finalSnapshot,
    replaySummary: playback.summary,
    telemetrySummary: options.telemetrySummary || null
  });

  return Object.freeze({
    playback,
    report
  });
}
