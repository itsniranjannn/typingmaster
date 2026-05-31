export function computeEngineSnapshot({
  targetWords = [],
  paragraph = "",
  correctCharacters = 0,
  incorrectCharacters = 0,
  completedWords = 0,
  currentWord = "",
  currentWordIndex = 0,
  currentIndex = 0
} = {}) {
  const totalWords = targetWords.length;
  const finalWordIndex = Math.max(totalWords - 1, 0);
  const currentWordIndexClamped = Math.min(currentWordIndex, finalWordIndex);
  const currentTargetWord = targetWords[currentWordIndex] || "";
  const isCurrentWordCorrect = currentTargetWord.startsWith(currentWord);
  const isLastWordComplete =
    currentWordIndex >= finalWordIndex &&
    currentWord === (targetWords[finalWordIndex] || "");
  const isAtTextEnd = paragraph.length > 0 && currentIndex >= paragraph.length;
  const completed = isLastWordComplete ? totalWords : Math.min(completedWords, totalWords);
  const isWordLimitReached =
    totalWords === 0 || completed >= totalWords || isLastWordComplete || isAtTextEnd;

  return Object.freeze({
    correctCharacters,
    incorrectCharacters,
    completedWords: completed,
    currentWordIndex: currentWordIndexClamped,
    isCurrentWordCorrect,
    totalWords,
    isWordLimitReached
  });
}

export function makeImmutableSessionSnapshot(snapshot) {
  // shallow-freeze wrapper for exported completion snapshots
  return Object.freeze({ ...snapshot });
}
