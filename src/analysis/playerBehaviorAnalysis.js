import { analyzeReplayDensity, estimateBurstSpeed, getCorrectionFrequency, getPauseDistribution, scoreConsistency, getWeakKeyAggregation } from "../utils/sessionAnalysis";

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_HISTORY = 20;
const MAX_WINDOW = 8;

const normalizeHistory = (history, limit = MAX_HISTORY) => {
  if (!Array.isArray(history)) return [];
  const bounded = history.slice(-Math.max(1, Math.min(limit, MAX_HISTORY)));
  return bounded.filter((entry) => entry && typeof entry === "object");
};

const extractResult = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  if (entry.result && typeof entry.result === "object") return entry.result;
  return entry;
};

const extractReplay = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  if (entry.replay && typeof entry.replay === "object") return entry.replay;
  return entry.events ? entry : null;
};

const extractTelemetry = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  if (entry.telemetry && typeof entry.telemetry === "object") return entry.telemetry;
  return null;
};

const toMetrics = (entry, index) => {
  const result = extractResult(entry) || {};
  const replay = extractReplay(entry);
  const telemetry = extractTelemetry(entry);

  const wpm = clampNumber(result.wpm, clampNumber(entry.wpm, 0));
  const accuracy = clampNumber(result.accuracy, clampNumber(entry.accuracy, 0));
  const timeUsed = clampNumber(result.timeUsed, clampNumber(entry.timeUsed, 0));
  const durationMs = clampNumber(telemetry?.durationMs, timeUsed > 0 ? timeUsed * 1000 : 0);
  const correction = getCorrectionFrequency(replay || {});
  const pauseDistribution = getPauseDistribution(replay || {});
  const burst = estimateBurstSpeed(replay || {}, 1000);
  const consistency = scoreConsistency(replay || {});

  return {
    index,
    id: clampNumber(result.id, index),
    wpm,
    accuracy,
    timeUsed,
    durationMs,
    completedWords: clampNumber(result.completedWords, 0),
    challengeCompleted: Boolean(result.challengeCompleted),
    challengeFailed: Boolean(result.challengeFailed),
    goalSuccess: result.goalSuccess,
    correctionRatio: correction.correctionRatio,
    backspaceRatio: correction.backspaceRatio,
    pauseCount: pauseDistribution.count,
    longestPauseMs: pauseDistribution.longestPauseMs,
    burstWpm: burst.burstWpm,
    burstKeysPerWindow: burst.burstKeysPerWindow,
    consistencyScore: consistency.score,
    replayDensity: analyzeReplayDensity(replay || {}),
    weakKeys: getWeakKeyAggregation(replay || {})
  };
};

const linearSlope = (points) => {
  if (points.length < 2) return 0;
  const xs = points.map((_, index) => index);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = points.reduce((sum, value) => sum + value, 0) / points.length;
  const numerator = points.reduce((sum, value, index) => sum + ((xs[index] - meanX) * (value - meanY)), 0);
  const denominator = xs.reduce((sum, value) => sum + ((value - meanX) ** 2), 0);
  return denominator === 0 ? 0 : numerator / denominator;
};

const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export const getRollingConsistencyTrends = (history, windowSize = 5) => {
  const records = normalizeHistory(history);
  const size = Math.max(1, Math.min(Number(windowSize) || 5, MAX_WINDOW));
  if (records.length === 0) return [];

  const trends = [];
  for (let endIndex = 0; endIndex < records.length; endIndex += 1) {
    const startIndex = Math.max(0, endIndex - size + 1);
    const window = records.slice(startIndex, endIndex + 1).map(toMetrics);
    const wpmValues = window.map((entry) => entry.wpm);
    const accuracyValues = window.map((entry) => entry.accuracy);
    const consistencyValues = window.map((entry) => entry.consistencyScore);

    trends.push({
      startIndex,
      endIndex,
      count: window.length,
      averageWpm: average(wpmValues),
      averageAccuracy: average(accuracyValues),
      averageConsistency: average(consistencyValues),
      slopeWpm: linearSlope(wpmValues),
      slopeAccuracy: linearSlope(accuracyValues)
    });
  }

  return trends;
};

export const detectFatigue = (history) => {
  const records = normalizeHistory(history, MAX_HISTORY).map(toMetrics);
  if (records.length < 2) {
    return { fatigueScore: 0, baseline: null, recent: null, indicators: [] };
  }

  const midpoint = Math.max(1, Math.floor(records.length / 2));
  const baseline = records.slice(0, midpoint);
  const recent = records.slice(-midpoint);
  const baselineWpm = average(baseline.map((entry) => entry.wpm));
  const recentWpm = average(recent.map((entry) => entry.wpm));
  const baselineAccuracy = average(baseline.map((entry) => entry.accuracy));
  const recentAccuracy = average(recent.map((entry) => entry.accuracy));
  const baselinePause = average(baseline.map((entry) => entry.longestPauseMs));
  const recentPause = average(recent.map((entry) => entry.longestPauseMs));
  const baselineCorrection = average(baseline.map((entry) => entry.correctionRatio));
  const recentCorrection = average(recent.map((entry) => entry.correctionRatio));

  const wpmDrop = baselineWpm > 0 ? clamp((baselineWpm - recentWpm) / Math.max(baselineWpm, 1), 0, 1) : 0;
  const accuracyDrop = baselineAccuracy > 0 ? clamp((baselineAccuracy - recentAccuracy) / 100, 0, 1) : 0;
  const pauseIncrease = recentPause > baselinePause ? clamp((recentPause - baselinePause) / Math.max(recentPause, 1), 0, 1) : 0;
  const correctionIncrease = recentCorrection > baselineCorrection ? clamp(recentCorrection - baselineCorrection, 0, 1) : 0;

  const fatigueScore = clamp((wpmDrop * 0.4) + (accuracyDrop * 0.25) + (pauseIncrease * 0.2) + (correctionIncrease * 0.15));

  return {
    fatigueScore,
    baseline: {
      averageWpm: baselineWpm,
      averageAccuracy: baselineAccuracy,
      averagePauseMs: baselinePause,
      averageCorrectionRatio: baselineCorrection
    },
    recent: {
      averageWpm: recentWpm,
      averageAccuracy: recentAccuracy,
      averagePauseMs: recentPause,
      averageCorrectionRatio: recentCorrection
    },
    indicators: [
      wpmDrop > 0.1 ? "wpm_drop" : null,
      accuracyDrop > 0.05 ? "accuracy_drop" : null,
      pauseIncrease > 0.1 ? "pause_spike" : null,
      correctionIncrease > 0.05 ? "correction_spike" : null
    ].filter(Boolean)
  };
};

export const getRetryFrequency = (history) => {
  const records = normalizeHistory(history, MAX_HISTORY).map(toMetrics);
  if (records.length === 0) {
    return { totalAttempts: 0, failedAttempts: 0, successAttempts: 0, retryRatio: 0, longestFailureStreak: 0, averageRetriesBeforeSuccess: 0 };
  }

  let failedStreak = 0;
  let longestFailureStreak = 0;
  let failedAttempts = 0;
  let successAttempts = 0;
  let retryBursts = 0;
  let retriesBeforeSuccess = 0;

  for (const record of records) {
    const failed = Boolean(record.challengeFailed) || record.goalSuccess === false;
    if (failed) {
      failedAttempts += 1;
      failedStreak += 1;
      retryBursts += 1;
    } else {
      successAttempts += 1;
      longestFailureStreak = Math.max(longestFailureStreak, failedStreak);
      if (failedStreak > 0) {
        retriesBeforeSuccess += failedStreak;
      }
      failedStreak = 0;
    }
  }

  longestFailureStreak = Math.max(longestFailureStreak, failedStreak);
  return {
    totalAttempts: records.length,
    failedAttempts,
    successAttempts,
    retryRatio: records.length > 0 ? failedAttempts / records.length : 0,
    longestFailureStreak,
    averageRetriesBeforeSuccess: successAttempts > 0 ? retriesBeforeSuccess / successAttempts : 0,
    retryBursts
  };
};

export const getFrustrationIndicators = (history) => {
  const fatigue = detectFatigue(history);
  const retry = getRetryFrequency(history);
  const records = normalizeHistory(history, MAX_HISTORY).map(toMetrics);
  const averageCorrection = average(records.map((entry) => entry.correctionRatio));
  const averagePause = average(records.map((entry) => entry.longestPauseMs));
  const burstSpeed = average(records.map((entry) => entry.burstWpm));
  const sustainedSpeed = average(records.map((entry) => entry.wpm));

  const score = clamp(
    (fatigue.fatigueScore * 0.35) +
    (retry.retryRatio * 0.25) +
    (averageCorrection * 0.15) +
    (averagePause > 2000 ? 0.15 : 0) +
    (burstSpeed > 0 && sustainedSpeed > 0 && burstSpeed > sustainedSpeed * 1.4 ? 0.1 : 0)
  );

  return {
    frustrationScore: score,
    fatigueScore: fatigue.fatigueScore,
    retryRatio: retry.retryRatio,
    averageCorrectionRatio: averageCorrection,
    averagePauseMs: averagePause,
    burstToSustainedRatio: sustainedSpeed > 0 ? burstSpeed / sustainedSpeed : 0,
    indicators: [
      score > 0.7 ? "high_frustration" : null,
      fatigue.fatigueScore > 0.5 ? "fatigue" : null,
      retry.retryRatio > 0.3 ? "frequent_retries" : null,
      averageCorrection > 0.12 ? "correction_heavy" : null,
      averagePause > 1500 ? "hesitation" : null
    ].filter(Boolean)
  };
};

export const getImprovementVelocity = (history) => {
  const records = normalizeHistory(history, MAX_HISTORY).map(toMetrics);
  if (records.length < 2) {
    return { wpmVelocityPerSession: 0, accuracyVelocityPerSession: 0, combinedVelocity: 0, samples: records.length };
  }

  const wpmValues = records.map((entry) => entry.wpm);
  const accuracyValues = records.map((entry) => entry.accuracy);
  const wpmVelocityPerSession = linearSlope(wpmValues);
  const accuracyVelocityPerSession = linearSlope(accuracyValues);
  const combinedVelocity = clampNumber((wpmVelocityPerSession * 0.7) + (accuracyVelocityPerSession * 0.3), 0);

  return {
    wpmVelocityPerSession,
    accuracyVelocityPerSession,
    combinedVelocity,
    samples: records.length
  };
};

export const getBurstVsSustainedSpeed = (history) => {
  const records = normalizeHistory(history, MAX_HISTORY).map(toMetrics);
  const burstValues = records.map((entry) => entry.burstWpm);
  const sustainedValues = records.map((entry) => entry.wpm);
  const burstWpm = average(burstValues);
  const sustainedWpm = average(sustainedValues);
  const ratio = sustainedWpm > 0 ? burstWpm / sustainedWpm : 0;

  return {
    burstWpm,
    sustainedWpm,
    ratio,
    gap: burstWpm - sustainedWpm,
    burstAdvantage: clamp(ratio / 2, 0, 1)
  };
};

export const getHesitationPatterns = (history) => {
  const records = normalizeHistory(history, MAX_HISTORY).map(toMetrics);
  const pauseCounts = records.map((entry) => entry.pauseCount);
  const longestPauses = records.map((entry) => entry.longestPauseMs);
  const density = records.map((entry) => entry.replayDensity?.keyDensityPerThousandMs || 0);

  return {
    averagePauseCount: average(pauseCounts),
    averageLongestPauseMs: average(longestPauses),
    averageDensity: average(density),
    hesitationScore: clamp((average(longestPauses) / 5000) + (average(pauseCounts) / 4) - (average(density) / 20))
  };
};

export const getCorrectionClustering = (history) => {
  const records = normalizeHistory(history, MAX_HISTORY).map(toMetrics);
  const clusterGapMs = 1500;
  let clusterCount = 0;
  let totalClusterSize = 0;
  let maxClusterSize = 0;

  for (const record of records) {
    const replay = extractReplay(history?.[record.index]) || {};
    const correctionEvents = Array.isArray(replay.events)
      ? replay.events.filter((event) => event?.type === "key" && (event.backspace || event.correct === false)).map((event) => clampNumber(event.ts, null)).filter((ts) => typeof ts === "number").sort((left, right) => left - right)
      : [];

    if (correctionEvents.length === 0) continue;

    let currentCluster = 1;
    for (let index = 1; index < correctionEvents.length; index += 1) {
      if (correctionEvents[index] - correctionEvents[index - 1] <= clusterGapMs) {
        currentCluster += 1;
      } else {
        clusterCount += 1;
        totalClusterSize += currentCluster;
        maxClusterSize = Math.max(maxClusterSize, currentCluster);
        currentCluster = 1;
      }
    }

    clusterCount += 1;
    totalClusterSize += currentCluster;
    maxClusterSize = Math.max(maxClusterSize, currentCluster);
  }

  return {
    clusterCount,
    averageClusterSize: clusterCount > 0 ? totalClusterSize / clusterCount : 0,
    maxClusterSize,
    clusterDensity: records.length > 0 ? clusterCount / records.length : 0
  };
};

export const summarizePlayerBehaviorHistory = (history) => {
  const records = normalizeHistory(history, MAX_HISTORY);
  const rolling = getRollingConsistencyTrends(records, 5);
  const fatigue = detectFatigue(records);
  const retry = getRetryFrequency(records);
  const frustration = getFrustrationIndicators(records);
  const improvement = getImprovementVelocity(records);
  const burst = getBurstVsSustainedSpeed(records);
  const hesitation = getHesitationPatterns(records);
  const correctionClustering = getCorrectionClustering(records);

  return {
    samples: records.length,
    rollingConsistency: rolling.slice(-5),
    fatigue,
    retry,
    frustration,
    improvement,
    burst,
    hesitation,
    correctionClustering
  };
};

export default {
  getRollingConsistencyTrends,
  detectFatigue,
  getRetryFrequency,
  getFrustrationIndicators,
  getImprovementVelocity,
  getBurstVsSustainedSpeed,
  getHesitationPatterns,
  getCorrectionClustering,
  summarizePlayerBehaviorHistory
};
