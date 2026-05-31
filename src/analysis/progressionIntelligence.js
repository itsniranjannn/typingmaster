import { getBurstVsSustainedSpeed, getFrustrationIndicators, getImprovementVelocity, detectFatigue, summarizePlayerBehaviorHistory } from "./playerBehaviorAnalysis";
import { analyzeChallengeBalancing } from "./challengeBalancing";

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_HISTORY = 20;

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY).filter((entry) => entry && typeof entry === "object");
};

const getResult = (entry) => (entry?.result && typeof entry.result === "object" ? entry.result : entry || {});

const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const weightedAverage = (values, weights) => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return 0;
  return values.reduce((sum, value, index) => sum + (value * weights[index]), 0) / totalWeight;
};

export const estimateSkillBand = (history) => {
  const records = normalizeHistory(history);
  if (records.length === 0) {
    return { band: "unrated", score: 0, averageWpm: 0, averageAccuracy: 0 };
  }

  const scores = records.map((entry) => {
    const result = getResult(entry);
    const wpm = clampNumber(result.wpm, 0);
    const accuracy = clampNumber(result.accuracy, 0);
    return (wpm * 0.65) + (accuracy * 0.35);
  });
  const averageWpm = average(records.map((entry) => clampNumber(getResult(entry).wpm, 0)));
  const averageAccuracy = average(records.map((entry) => clampNumber(getResult(entry).accuracy, 0)));
  const score = average(scores);

  let band = "novice";
  if (score >= 90) band = "elite";
  else if (score >= 75) band = "advanced";
  else if (score >= 55) band = "intermediate";
  else if (score >= 35) band = "developing";

  return { band, score, averageWpm, averageAccuracy };
};

export const analyzeStreakSustainability = (history) => {
  const records = normalizeHistory(history);
  if (records.length === 0) {
    return { sustainabilityScore: 0, averageGapDays: 0, activeDays: 0, streakRisk: 1 };
  }

  const dates = records
    .map((entry) => entry.exportedAt || entry.exportedAtIso || getResult(entry).id || null)
    .filter(Boolean);
  const successful = records.filter((entry) => Boolean(getResult(entry).goalSuccess !== false && getResult(entry).challengeFailed !== true));
  const successfulRate = records.length > 0 ? successful.length / records.length : 0;
  const behavior = summarizePlayerBehaviorHistory(records);
  const fatigue = behavior.fatigue;

  return {
    sustainabilityScore: clamp((successfulRate * 0.5) + ((1 - fatigue.fatigueScore) * 0.5)),
    averageGapDays: dates.length > 1 && successful.length > 0 ? (dates.length / successful.length) : 0,
    activeDays: dates.length,
    streakRisk: clamp((fatigue.fatigueScore * 0.6) + ((1 - successfulRate) * 0.4))
  };
};

export const estimateBurnoutRisk = (history) => {
  const records = normalizeHistory(history);
  const behavior = summarizePlayerBehaviorHistory(records);
  const fatigue = detectFatigue(records);
  const frustration = getFrustrationIndicators(records);
  const improvement = getImprovementVelocity(records);
  const burst = getBurstVsSustainedSpeed(records);

  const risk = clamp(
    (fatigue.fatigueScore * 0.35) +
    (frustration.frustrationScore * 0.25) +
    (behavior.retry.retryRatio * 0.15) +
    (burst.ratio > 1.5 ? 0.1 : 0) +
    (improvement.combinedVelocity < 0 ? 0.15 : 0)
  );

  return {
    burnoutRisk: risk,
    fatigueScore: fatigue.fatigueScore,
    frustrationScore: frustration.frustrationScore,
    improvementVelocity: improvement.combinedVelocity,
    indicators: [
      risk > 0.7 ? "high_burnout_risk" : null,
      fatigue.fatigueScore > 0.5 ? "fatigue" : null,
      frustration.frustrationScore > 0.5 ? "frustration" : null,
      burst.ratio > 1.5 ? "burst_overuse" : null
    ].filter(Boolean)
  };
};

export const summarizeEngagementTrends = (history) => {
  const records = normalizeHistory(history);
  const band = estimateSkillBand(records);
  const behavior = summarizePlayerBehaviorHistory(records);
  const totalWpm = records.map((entry) => clampNumber(getResult(entry).wpm, 0));
  const totalAccuracy = records.map((entry) => clampNumber(getResult(entry).accuracy, 0));
  const activeCount = records.filter((entry) => Boolean(getResult(entry).typedText || getResult(entry).wpm)).length;

  return {
    sessions: records.length,
    activeCount,
    engagementScore: clamp((band.score / 100) * 0.4 + (behavior.improvement.combinedVelocity > 0 ? 0.3 : 0.1) + (behavior.retry.retryRatio < 0.3 ? 0.2 : 0.1)),
    averageWpm: average(totalWpm),
    averageAccuracy: average(totalAccuracy),
    consistency: behavior.rollingConsistency.length > 0 ? behavior.rollingConsistency[behavior.rollingConsistency.length - 1].averageConsistency : 0
  };
};

export const calibrateDailyGoals = (history) => {
  const records = normalizeHistory(history);
  const skill = estimateSkillBand(records);
  const behavior = summarizePlayerBehaviorHistory(records);
  const fatigue = behavior.fatigue.fatigueScore;
  const avgWpm = skill.averageWpm;
  const avgAccuracy = skill.averageAccuracy;

  const recommendedDailySessions = clampNumber(Math.round(2 + (skill.score / 25) - (fatigue * 2)), 1);
  const recommendedTargetWpm = Math.round(Math.max(20, Math.min(120, avgWpm * (1 + (1 - fatigue) * 0.08))));
  const recommendedAccuracy = Math.round(Math.max(80, Math.min(100, avgAccuracy + ((1 - fatigue) * 4))));

  return {
    recommendedDailySessions,
    recommendedTargetWpm,
    recommendedAccuracy,
    fatigue,
    skillBand: skill.band
  };
};

export const recommendBadgePacing = (history) => {
  const records = normalizeHistory(history);
  const skill = estimateSkillBand(records);
  const burnout = estimateBurnoutRisk(records);
  const calibration = calibrateDailyGoals(records);
  const paceMultiplier = clamp(1 - burnout.burnoutRisk * 0.35 + (skill.score / 200), 0.5, 1.5);

  return {
    paceMultiplier,
    recommendedGapSessions: Math.max(1, Math.round(3 + (burnout.burnoutRisk * 4))),
    recommendedBadgeTier: skill.band,
    needsRecovery: burnout.burnoutRisk > 0.7,
    calibration
  };
};

export const summarizeProgressionIntelligence = (history, currentChallenge = null) => {
  const records = normalizeHistory(history);
  const skillBand = estimateSkillBand(records);
  const streak = analyzeStreakSustainability(records);
  const burnout = estimateBurnoutRisk(records);
  const engagement = summarizeEngagementTrends(records);
  const dailyGoals = calibrateDailyGoals(records);
  const badgePacing = recommendBadgePacing(records);
  const challengeBalance = currentChallenge ? analyzeChallengeBalancing(currentChallenge, {
    wpm: skillBand.averageWpm,
    accuracy: skillBand.averageAccuracy,
    history: records
  }) : null;

  return {
    skillBand,
    streak,
    burnout,
    engagement,
    dailyGoals,
    badgePacing,
    challengeBalance
  };
};

export default {
  estimateSkillBand,
  analyzeStreakSustainability,
  estimateBurnoutRisk,
  summarizeEngagementTrends,
  calibrateDailyGoals,
  recommendBadgePacing,
  summarizeProgressionIntelligence
};
