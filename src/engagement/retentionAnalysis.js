import { detectFatigue, getBurstVsSustainedSpeed, getFrustrationIndicators, getHesitationPatterns, getImprovementVelocity, getRetryFrequency, summarizePlayerBehaviorHistory } from "../analysis/playerBehaviorAnalysis";

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_HISTORY = 24;

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY).filter((entry) => entry && typeof entry === "object");
};

const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const getResult = (entry) => (entry?.result && typeof entry.result === "object" ? entry.result : entry || {});

const extractFamily = (entry) => {
  const result = getResult(entry);
  const challenge = entry?.challenge && typeof entry.challenge === "object" ? entry.challenge : null;
  return [result.challengeFamily, result.family, challenge?.family, entry?.family].find((value) => typeof value === "string" && value.trim()) || null;
};

export const detectChallengeFatigue = (history) => {
  const records = normalizeHistory(history);
  if (records.length === 0) {
    return { challengeFatigueScore: 0, repeatedFamilyRatio: 0, repeatedFailureRatio: 0, families: [] };
  }

  const families = records.map((entry) => extractFamily(entry)).filter(Boolean);
  const familyCounts = families.reduce((map, family) => map.set(family, (map.get(family) || 0) + 1), new Map());
  const repeatedFamilyRatio = families.length > 0 ? Math.max(0, Math.max(...familyCounts.values()) - 1) / families.length : 0;
  const repeatedFailureRatio = records.filter((entry) => Boolean(getResult(entry).challengeFailed || getResult(entry).goalSuccess === false)).length / records.length;
  const challengeFatigueScore = clamp((repeatedFamilyRatio * 0.55) + (repeatedFailureRatio * 0.45));

  return {
    challengeFatigueScore,
    repeatedFamilyRatio,
    repeatedFailureRatio,
    families: Array.from(familyCounts.entries()).map(([family, count]) => ({ family, count }))
  };
};

export const analyzeStreakPressure = (history) => {
  const records = normalizeHistory(history);
  if (records.length === 0) {
    return { streakPressureScore: 0, successStreak: 0, failureStreak: 0, pressureWindow: 0 };
  }

  let currentSuccessStreak = 0;
  let currentFailureStreak = 0;
  let longestSuccessStreak = 0;
  let longestFailureStreak = 0;

  for (const entry of records) {
    const failed = Boolean(getResult(entry).challengeFailed || getResult(entry).goalSuccess === false);
    if (failed) {
      currentFailureStreak += 1;
      longestSuccessStreak = Math.max(longestSuccessStreak, currentSuccessStreak);
      currentSuccessStreak = 0;
    } else {
      currentSuccessStreak += 1;
      longestFailureStreak = Math.max(longestFailureStreak, currentFailureStreak);
      currentFailureStreak = 0;
    }
  }

  longestSuccessStreak = Math.max(longestSuccessStreak, currentSuccessStreak);
  longestFailureStreak = Math.max(longestFailureStreak, currentFailureStreak);
  const streakPressureScore = clamp((longestFailureStreak / Math.max(records.length, 1)) * 0.7 + (currentFailureStreak / Math.max(records.length, 1)) * 0.3);

  return {
    streakPressureScore,
    successStreak: longestSuccessStreak,
    failureStreak: longestFailureStreak,
    pressureWindow: currentFailureStreak,
    currentDirection: currentFailureStreak > 0 ? "negative" : "positive"
  };
};

export const analyzeEngagementPacing = (history) => {
  const records = normalizeHistory(history);
  const timestamps = records
    .map((entry) => clampNumber(entry.exportedAt ?? getResult(entry).completedAt ?? getResult(entry).endedAt ?? null, null))
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);

  const gaps = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    gaps.push(Math.max(0, timestamps[index] - timestamps[index - 1]) / (24 * 60 * 60 * 1000));
  }

  const behavior = summarizePlayerBehaviorHistory(records);
  const averageGapDays = average(gaps);
  const sessionIntensity = clamp(
    (behavior.fatigue.fatigueScore * 0.35) +
    (behavior.frustration.frustrationScore * 0.25) +
    (behavior.retry.retryRatio * 0.2) +
    (behavior.hesitation.hesitationScore * 0.2)
  );

  return {
    averageGapDays,
    sessionIntensity,
    cadenceScore: clamp(1 - (averageGapDays / 7) - (sessionIntensity * 0.2), 0, 1),
    sessionCount: records.length,
    activeSpanDays: timestamps.length > 1 ? Math.max(0, (timestamps.at(-1) - timestamps[0]) / (24 * 60 * 60 * 1000)) : 0
  };
};

export const scoreBurnoutRisk = (history) => {
  const records = normalizeHistory(history);
  const behavior = summarizePlayerBehaviorHistory(records);
  const fatigue = detectFatigue(records);
  const frustration = getFrustrationIndicators(records);
  const retry = getRetryFrequency(records);
  const challengeFatigue = detectChallengeFatigue(records);
  const streakPressure = analyzeStreakPressure(records);
  const pacing = analyzeEngagementPacing(records);
  const improvement = getImprovementVelocity(records);
  const burst = getBurstVsSustainedSpeed(records);

  const burnoutRisk = clamp(
    (fatigue.fatigueScore * 0.26) +
    (frustration.frustrationScore * 0.2) +
    (retry.retryRatio * 0.14) +
    (challengeFatigue.challengeFatigueScore * 0.12) +
    (streakPressure.streakPressureScore * 0.1) +
    ((1 - pacing.cadenceScore) * 0.08) +
    (improvement.combinedVelocity < 0 ? 0.05 : 0) +
    (burst.ratio > 1.35 ? 0.05 : 0)
  );

  return {
    burnoutRisk,
    fatigueScore: fatigue.fatigueScore,
    frustrationScore: frustration.frustrationScore,
    retryRatio: retry.retryRatio,
    challengeFatigueScore: challengeFatigue.challengeFatigueScore,
    streakPressureScore: streakPressure.streakPressureScore,
    cadenceScore: pacing.cadenceScore,
    indicators: [
      burnoutRisk > 0.7 ? "high_burnout_risk" : null,
      fatigue.fatigueScore > 0.5 ? "fatigue" : null,
      frustration.frustrationScore > 0.5 ? "frustration" : null,
      challengeFatigue.challengeFatigueScore > 0.4 ? "challenge_fatigue" : null,
      streakPressure.streakPressureScore > 0.35 ? "streak_pressure" : null
    ].filter(Boolean)
  };
};

export const detectOvertraining = (history) => {
  const burnout = scoreBurnoutRisk(history);
  const pacing = analyzeEngagementPacing(history);
  const overtrainingRisk = clamp((burnout.burnoutRisk * 0.6) + ((1 - pacing.cadenceScore) * 0.4));

  return {
    overtrainingRisk,
    overtrainingDetected: overtrainingRisk > 0.72,
    cadenceScore: pacing.cadenceScore,
    recommendedCooldownDays: Math.max(1, Math.round(1 + (overtrainingRisk * 4)))
  };
};

export const balanceSessionIntensity = (history) => {
  const burnout = scoreBurnoutRisk(history);
  const pacing = analyzeEngagementPacing(history);
  const overtraining = detectOvertraining(history);
  const targetLoad = clamp(1 - (burnout.burnoutRisk * 0.45) - (overtraining.overtrainingRisk * 0.2), 0.25, 1);

  return {
    targetLoad,
    recommendedMinutes: Math.max(10, Math.round(25 + (targetLoad * 20))),
    cooldownMinutes: Math.max(5, Math.round(10 + (burnout.burnoutRisk * 20))),
    cadenceScore: pacing.cadenceScore,
    risk: burnout.burnoutRisk
  };
};

export const summarizeRecoveryRecommendations = (history) => {
  const burnout = scoreBurnoutRisk(history);
  const overtraining = detectOvertraining(history);
  const intensity = balanceSessionIntensity(history);
  const recommendations = [
    burnout.burnoutRisk > 0.6 ? "take_a_short_break" : null,
    burnout.challengeFatigueScore > 0.35 ? "rotate_challenge_family" : null,
    burnout.streakPressureScore > 0.3 ? "reduce_streak_pressure" : null,
    overtraining.overtrainingDetected ? "schedule_recovery_session" : null,
    intensity.targetLoad < 0.5 ? "lower_next_session_load" : null
  ].filter(Boolean);

  return {
    recommendations,
    recoveryUrgency: clamp(burnout.burnoutRisk * 0.7 + overtraining.overtrainingRisk * 0.3),
    cooldownMinutes: intensity.cooldownMinutes,
    nextSessionLoad: intensity.targetLoad
  };
};

export const summarizeRetentionAnalysis = (history) => {
  const records = normalizeHistory(history);
  const burnout = scoreBurnoutRisk(records);
  const pacing = analyzeEngagementPacing(records);
  const recovery = summarizeRecoveryRecommendations(records);
  const behavior = summarizePlayerBehaviorHistory(records);

  return {
    burnout,
    pacing,
    recovery,
    behavior,
    retentionRiskIndicators: burnout.indicators,
    nextLoad: balanceSessionIntensity(records)
  };
};

export default {
  detectChallengeFatigue,
  analyzeStreakPressure,
  analyzeEngagementPacing,
  scoreBurnoutRisk,
  detectOvertraining,
  balanceSessionIntensity,
  summarizeRecoveryRecommendations,
  summarizeRetentionAnalysis
};