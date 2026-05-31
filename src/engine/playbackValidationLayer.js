import { projectCompletionSnapshot } from "./resultProjectionEngine";
import { selectResultSummary, selectTypingSurfacePresentation } from "./selectorEngine";

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (!isPlainObject(value)) {
    return JSON.stringify(value);
  }

  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
};

export function createDeterministicReplayHash(replayExport) {
  const normalized = isPlainObject(replayExport) ? replayExport : {};
  const input = stableStringify(normalized);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

const compareValue = (path, expected, actual, differences) => {
  const same = Object.is(expected, actual);
  if (!same) {
    differences.push({ path, expected, actual });
  }
  return same;
};

export function comparePlaybackSnapshots(expectedSnapshot, actualSnapshot) {
  const differences = [];
  const fields = [
    "correctCharacters",
    "incorrectCharacters",
    "completedWords",
    "currentWordIndex",
    "totalWords",
    "isWordLimitReached",
    "currentIndex",
    "typedText"
  ];

  let equal = true;
  fields.forEach((field) => {
    if (!compareValue(field, expectedSnapshot?.[field], actualSnapshot?.[field], differences)) {
      equal = false;
    }
  });

  return {
    equal,
    differences,
    firstDifference: differences[0] || null
  };
}

export function comparePlaybackProjections(expectedResult, actualResult, replaySummary = null, telemetrySummary = null) {
  const expectedProjection = projectCompletionSnapshot(expectedResult);
  const actualProjection = projectCompletionSnapshot(actualResult);
  const expectedSummary = selectResultSummary(expectedProjection, replaySummary, telemetrySummary);
  const actualSummary = selectResultSummary(actualProjection, replaySummary, telemetrySummary);
  const expectedSurface = selectTypingSurfacePresentation(expectedResult, expectedResult?.wpm || 0, expectedResult?.accuracy || 0);
  const actualSurface = selectTypingSurfacePresentation(actualResult, actualResult?.wpm || 0, actualResult?.accuracy || 0);

  const projectionReport = comparePlaybackSnapshots(expectedProjection, actualProjection);
  const surfaceReport = comparePlaybackSnapshots(expectedSurface, actualSurface);

  return {
    equal: projectionReport.equal && surfaceReport.equal && stableStringify(expectedSummary) === stableStringify(actualSummary),
    projectionReport,
    surfaceReport,
    expectedSummary,
    actualSummary
  };
}

export function buildPlaybackDivergenceReport({ replayExport = null, checkpoint = null, expectedSnapshot = null, actualSnapshot = null, replaySummary = null, telemetrySummary = null } = {}) {
  const snapshotReport = comparePlaybackSnapshots(expectedSnapshot, actualSnapshot);
  const projectionReport = comparePlaybackProjections(expectedSnapshot, actualSnapshot, replaySummary, telemetrySummary);
  const replayHash = createDeterministicReplayHash(replayExport);

  return {
    replayHash,
    checkpointIndex: checkpoint?.eventIndex ?? null,
    checkpointType: checkpoint?.eventType ?? null,
    firstInvalidSnapshotBoundary: snapshotReport.equal ? null : {
      eventIndex: checkpoint?.eventIndex ?? null,
      eventType: checkpoint?.eventType ?? null,
      difference: snapshotReport.firstDifference
    },
    snapshotReport,
    projectionReport,
    divergenceDetected: !(snapshotReport.equal && projectionReport.equal)
  };
}

export function buildPlaybackSummary({ replayExport = null, checkpoints = [], finalSnapshot = null } = {}) {
  const replayHash = createDeterministicReplayHash(replayExport);
  return {
    replayHash,
    eventCount: Array.isArray(replayExport?.events) ? replayExport.events.length : 0,
    checkpointCount: checkpoints.length,
    finalSnapshot,
    checkpointBoundaries: checkpoints.map((checkpoint) => ({
      eventIndex: checkpoint.eventIndex,
      eventType: checkpoint.eventType,
      ts: checkpoint.ts
    }))
  };
}
