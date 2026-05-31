import { summarizePlayerBehaviorHistory } from "../analysis/playerBehaviorAnalysis";

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_HISTORY = 30;

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY).filter((entry) => entry && typeof entry === "object");
};

const getResult = (entry) => (entry?.result && typeof entry.result === "object" ? entry.result : entry || {});

const getFamily = (entry) => {
  const result = getResult(entry);
  const challenge = entry?.challenge && typeof entry.challenge === "object" ? entry.challenge : null;
  return [result.challengeFamily, result.family, challenge?.family, entry?.family].find((value) => typeof value === "string" && value.trim()) || null;
};

const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const linearSlope = (values) => {
  if (values.length < 2) return 0;
  const xs = values.map((_, index) => index);
  const meanX = average(xs);
  const meanY = average(values);
  const numerator = values.reduce((sum, value, index) => sum + ((xs[index] - meanX) * (value - meanY)), 0);
  const denominator = xs.reduce((sum, value) => sum + ((value - meanX) ** 2), 0);
  return denominator === 0 ? 0 : numerator / denominator;
};

const countThresholds = (value, thresholds) => thresholds.map((threshold) => ({ threshold, achieved: value >= threshold }));

const countImprovementStreak = (records) => {
  let longest = 0;
  let current = 0;
  for (let index = 1; index < records.length; index += 1) {
    const previous = getResult(records[index - 1]);
    const currentResult = getResult(records[index]);
    const improved = clampNumber(currentResult.wpm, 0) >= clampNumber(previous.wpm, 0) && clampNumber(currentResult.accuracy, 0) >= clampNumber(previous.accuracy, 0);
    if (improved) {
      current += 1;
    } else {
      longest = Math.max(longest, current);
      current = 0;
    }
  }
  return Math.max(longest, current);
};

export const analyzeMasteryTracking = (history) => {
  const records = normalizeHistory(history);
  if (records.length === 0) {
    return {
      overallMasteryScore: 0,
      consistency: { milestoneCount: 0, bestConsistency: 0, plateauRisk: 1 },
      accuracyMastery: { averageAccuracy: 0, bestAccuracy: 0, milestones: [] },
      speedMastery: { averageWpm: 0, bestWpm: 0, milestones: [] },
      enduranceMastery: { averageTimeUsed: 0, bestTimeUsed: 0, milestones: [] },
      familyMastery: { memory: 0, numbers: 0, specializationScore: 0 },
      improvementStreaks: { longestImprovementStreak: 0, plateauDetected: false },
      plateau: { plateauDetected: false, slopeWpm: 0, slopeAccuracy: 0 }
    };
  }

  const results = records.map(getResult);
  const behavior = summarizePlayerBehaviorHistory(records);
  const wpmValues = results.map((result) => clampNumber(result.wpm, 0));
  const accuracyValues = results.map((result) => clampNumber(result.accuracy, 0));
  const timeValues = results.map((result) => clampNumber(result.timeUsed, 0));
  const familyCounts = records.reduce((map, entry) => {
    const family = getFamily(entry);
    if (!family) return map;
    map.set(family, (map.get(family) || 0) + 1);
    return map;
  }, new Map());

  const accuracyAverage = average(accuracyValues);
  const speedAverage = average(wpmValues);
  const enduranceAverage = average(timeValues);
  const bestAccuracy = Math.max(0, ...accuracyValues);
  const bestWpm = Math.max(0, ...wpmValues);
  const bestTimeUsed = Math.max(0, ...timeValues);
  const slopeWpm = linearSlope(wpmValues.slice(-8));
  const slopeAccuracy = linearSlope(accuracyValues.slice(-8));
  const plateauDetected = Math.abs(slopeWpm) < 0.3 && Math.abs(slopeAccuracy) < 0.25 && records.length >= 5;
  const longestImprovementStreak = countImprovementStreak(records);
  const memoryCount = familyCounts.get("memory") || 0;
  const numbersCount = familyCounts.get("numbers") || 0;
  const memoryAccuracy = average(results.filter((result, index) => getFamily(records[index]) === "memory").map((result) => clampNumber(result.accuracy, 0)));
  const numbersAccuracy = average(results.filter((result, index) => getFamily(records[index]) === "numbers").map((result) => clampNumber(result.accuracy, 0)));

  const consistency = {
    milestoneCount: behavior.rollingConsistency.filter((entry) => entry.averageConsistency >= 75).length,
    bestConsistency: behavior.rollingConsistency.length > 0 ? Math.max(...behavior.rollingConsistency.map((entry) => entry.averageConsistency)) : 0,
    plateauRisk: clamp(plateauDetected ? 0.8 : 0.2 + (behavior.fatigue.fatigueScore * 0.2))
  };

  const accuracyMastery = {
    averageAccuracy: accuracyAverage,
    bestAccuracy,
    milestones: countThresholds(bestAccuracy, [90, 95, 98, 99]),
    masteryScore: clamp((accuracyAverage / 100) * 0.7 + (bestAccuracy / 100) * 0.3)
  };

  const speedMastery = {
    averageWpm: speedAverage,
    bestWpm,
    milestones: countThresholds(bestWpm, [40, 60, 80, 100]),
    masteryScore: clamp((speedAverage / 120) * 0.65 + (bestWpm / 140) * 0.35)
  };

  const enduranceMastery = {
    averageTimeUsed: enduranceAverage,
    bestTimeUsed,
    milestones: countThresholds(bestTimeUsed, [45, 60, 90, 120]),
    masteryScore: clamp((enduranceAverage / 120) * 0.5 + (bestTimeUsed / 150) * 0.5)
  };

  const familyMastery = {
    memory: {
      sessions: memoryCount,
      averageAccuracy: memoryAccuracy,
      milestones: countThresholds(memoryCount, [3, 5, 10])
    },
    numbers: {
      sessions: numbersCount,
      averageAccuracy: numbersAccuracy,
      milestones: countThresholds(numbersCount, [3, 5, 10])
    },
    specializationScore: clamp(((memoryCount + numbersCount) / Math.max(records.length, 1)) * 0.7 + ((memoryAccuracy + numbersAccuracy) / 200) * 0.3)
  };

  const improvementStreaks = {
    longestImprovementStreak,
    currentImprovementStreak: longestImprovementStreak > 0 ? longestImprovementStreak : 0,
    plateauDetected
  };

  const plateau = {
    plateauDetected,
    slopeWpm,
    slopeAccuracy,
    plateauRisk: clamp((Math.abs(slopeWpm) / 5) + (Math.abs(slopeAccuracy) / 8) + (plateauDetected ? 0.25 : 0), 0, 1)
  };

  const overallMasteryScore = clamp(
    accuracyMastery.masteryScore * 0.28 +
    speedMastery.masteryScore * 0.28 +
    enduranceMastery.masteryScore * 0.16 +
    consistency.bestConsistency / 150 * 0.14 +
    familyMastery.specializationScore * 0.14
  );

  return {
    overallMasteryScore,
    consistency,
    accuracyMastery,
    speedMastery,
    enduranceMastery,
    familyMastery,
    improvementStreaks,
    plateau
  };
};

export default {
  analyzeMasteryTracking
};