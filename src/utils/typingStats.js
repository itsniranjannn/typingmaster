export const calculateWpm = (correctCharacters, elapsedSeconds) => {
  if (!Number.isFinite(correctCharacters) || correctCharacters <= 0) return 0;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0;

  const elapsedMinutes = elapsedSeconds / 60;
  const words = correctCharacters / 5;
  const rawWpm = words / elapsedMinutes;

  if (!Number.isFinite(rawWpm) || rawWpm < 0) return 0;

  if (rawWpm > 300) {
    return 300;
  }

  return Number(rawWpm.toFixed(2));
};

export const calculateAccuracy = (correctCharacters, totalTypedCharacters) => {
  if (totalTypedCharacters <= 0) return 0;

  const rawAccuracy = (correctCharacters / totalTypedCharacters) * 100;
  if (!Number.isFinite(rawAccuracy) || rawAccuracy < 0) return 0;
  return Number(Math.min(rawAccuracy, 100).toFixed(2));
};

export const getTopMistakes = (results, limit = 5) => {
  if (!Array.isArray(results) || results.length === 0) return [];

  const recentResults = results.slice(0, Math.min(3, results.length));
  const mistakeCounter = new Map();

  recentResults.forEach((result) => {
    const mistakes = Array.isArray(result?.mistypedCharacters) ? result.mistypedCharacters : [];
    mistakes.forEach((character) => {
      if (typeof character !== "string" || character.length !== 1) return;
      mistakeCounter.set(character, (mistakeCounter.get(character) || 0) + 1);
    });
  });

  return [...mistakeCounter.entries()]
    .sort((first, second) => {
      if (second[1] !== first[1]) return second[1] - first[1];
      return first[0].localeCompare(second[0]);
    })
    .slice(0, Math.max(limit, 0))
    .map(([character, count]) => ({
      character,
      count
    }));
};
