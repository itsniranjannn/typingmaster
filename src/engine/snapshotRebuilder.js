import { createPlaybackSnapshot, createPlaybackState, stepPlaybackEvent } from "./deterministicEventStepper";

const cloneEvents = (replayExport) => (Array.isArray(replayExport?.events) ? replayExport.events.slice() : []);

export function rebuildPlaybackSnapshots(replayExport, options = {}) {
  const events = cloneEvents(replayExport);
  const state = createPlaybackState({
    paragraph: options.paragraph || "",
    targetWords: options.targetWords || []
  });
  const maxCheckpoints = Math.max(1, Number(options.maxCheckpoints) || 64);
  const checkpoints = [];

  events.forEach((event, index) => {
    stepPlaybackEvent(state, event);
    const shouldCheckpoint = event.type === "key" || event.type === "pause" || event.type === "end";

    if (shouldCheckpoint) {
      const snapshot = createPlaybackSnapshot(state);
      checkpoints.push(Object.freeze({
        eventIndex: index,
        eventType: event.type,
        ts: typeof event.ts === "number" ? event.ts : null,
        snapshot
      }));

      if (checkpoints.length > maxCheckpoints) {
        checkpoints.shift();
      }
    }
  });

  return Object.freeze({
    finalSnapshot: createPlaybackSnapshot(state),
    checkpoints: Object.freeze(checkpoints.slice()),
    replayEvents: events,
    state: Object.freeze({
      typedText: state.typedText,
      correctCharacters: state.correctCharacters,
      incorrectCharacters: state.incorrectCharacters,
      completedWords: state.completedWords,
      currentWord: state.currentWord,
      currentWordIndex: state.currentWordIndex,
      currentIndex: state.currentIndex,
      pauseCount: state.pauseCount,
      eventCount: state.eventCount,
      startTs: state.startTs,
      endTs: state.endTs
    })
  });
}

export function rebuildSnapshotAtBoundary(replayExport, boundaryIndex, options = {}) {
  const events = cloneEvents(replayExport).slice(0, Math.max(0, boundaryIndex + 1));
  return rebuildPlaybackSnapshots({ events }, options);
}
