export function projectCompletionSnapshot(result) {
  if (!result) return null;
  // Produce a compact, immutable completion snapshot for result screens and exports
  const snapshot = {
    mode: result.mode || null,
    wpm: result.wpm || 0,
    accuracy: result.accuracy || 0,
    completedWords: result.completedWords || 0,
    totalWords: result.totalWords || 0,
    timestamp: result.timestamp || Date.now()
  };
  return Object.freeze(snapshot);
}
