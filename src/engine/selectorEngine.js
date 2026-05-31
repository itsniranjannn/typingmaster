export function selectTypingSurfacePresentation(engineSnapshot = {}, liveWpm = 0, liveAccuracy = 100) {
  return Object.freeze({
    correctCharacters: engineSnapshot.correctCharacters || 0,
    incorrectCharacters: engineSnapshot.incorrectCharacters || 0,
    completedWords: engineSnapshot.completedWords || 0,
    totalWords: engineSnapshot.totalWords || 0,
    isWordLimitReached: Boolean(engineSnapshot.isWordLimitReached),
    wpm: Number(liveWpm) || 0,
    accuracy: Number(liveAccuracy) || 0
  });
}

export function selectResultSummary(completionSnapshot = {}, replaySummary = null, telemetrySummary = null) {
  return Object.freeze({
    completedWords: completionSnapshot.completedWords || 0,
    totalWords: completionSnapshot.totalWords || 0,
    wpm: completionSnapshot.wpm || 0,
    accuracy: completionSnapshot.accuracy || 0,
    replaySummary,
    telemetrySummary
  });
}
