import { getCorrectionFrequency, getPauseDistribution } from "../utils/sessionAnalysis";
import { detectFatigue, getFrustrationIndicators, getBurstVsSustainedSpeed, summarizePlayerBehaviorHistory } from "./playerBehaviorAnalysis";

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeChallenge = (challenge) => (challenge && typeof challenge === "object" ? challenge : {});

const getRules = (challenge) => normalizeChallenge(challenge).rules || {};

const getChallengeFamily = (challenge) => {
  const family = normalizeChallenge(challenge).family;
  if (typeof family === "string" && family.trim()) return family.trim();
  const id = normalizeChallenge(challenge).id || "";
  return typeof id === "string" && id.includes("-") ? id.split("-")[0] : "";
};

const normalizeSessionStats = (stats) => (stats && typeof stats === "object" ? stats : {});

export const scoreChallengeDifficulty = (challenge, sessionStats = {}) => {
  const rules = getRules(challenge);
  const stats = normalizeSessionStats(sessionStats);
  const family = getChallengeFamily(challenge);

  const targetWpm = clampNumber(rules.targetWpm || rules.minWpm || stats.wpm || 0);
  const targetAccuracy = clampNumber(rules.targetAccuracy || rules.minAccuracy || stats.accuracy || 0);
  const wordCount = clampNumber(rules.wordCount || rules.minTypedWords || stats.completedWords || 0);
  const charTarget = clampNumber(rules.charTarget || stats.typedCharacterCount || 0);
  const sustainSeconds = clampNumber(rules.sustainSeconds || stats.holdSeconds || 0);
  const hideAfterSeconds = clampNumber(rules.hideAfterSeconds || 0);
  const allowedMistakes = clampNumber(rules.allowedMistakes || 0);
  const timeLimitSeconds = clampNumber(rules.timeLimitSeconds || stats.timeLimitSeconds || 0);
  const noBackspace = Boolean(rules.noBackspace);

  const familyWeights = {
    memory: 12,
    control: 10,
    spike: 14,
    endurance: 8,
    precision: 6,
    numbers: 7
  };

  const difficulty = clamp(
    0.08 +
      (targetWpm / 200) * 0.28 +
      (targetAccuracy / 100) * 0.12 +
      (wordCount / 100) * 0.16 +
      (charTarget / 1000) * 0.12 +
      (sustainSeconds / 20) * 0.12 +
      (hideAfterSeconds > 0 ? Math.min(hideAfterSeconds / 10, 0.1) : 0) +
      (allowedMistakes === 0 ? 0.08 : Math.max(0, 0.05 - (allowedMistakes / 20))) +
      (timeLimitSeconds > 0 && timeLimitSeconds < 30 ? (30 - timeLimitSeconds) / 100 * 0.08 : 0) +
      (noBackspace ? 0.08 : 0) +
      ((familyWeights[family] || 0) / 100)
  );

  return Math.round(difficulty * 1000) / 10;
};

export const estimateExpectedCompletionRate = (challenge, sessionStats = {}) => {
  const difficulty = scoreChallengeDifficulty(challenge, sessionStats) / 100;
  const stats = normalizeSessionStats(sessionStats);
  const behavior = stats.behavior || summarizePlayerBehaviorHistory(stats.history || []);
  const skillBonus = clamp((clampNumber(stats.wpm, 0) / Math.max(clampNumber(getRules(challenge).targetWpm || getRules(challenge).minWpm || 60), 1)) * 0.25 + (clampNumber(stats.accuracy, 0) / 100) * 0.2, 0, 0.4);
  const fatiguePenalty = clampNumber(behavior?.fatigue?.fatigueScore, 0) * 0.2;
  const frustrationPenalty = clampNumber(behavior?.frustration?.frustrationScore, 0) * 0.15;

  return clamp(1 - difficulty + skillBonus - fatiguePenalty - frustrationPenalty, 0, 1);
};

export const estimateSustainDifficulty = (challenge, sessionStats = {}) => {
  const rules = getRules(challenge);
  const stats = normalizeSessionStats(sessionStats);
  const sustainSeconds = clampNumber(rules.sustainSeconds || stats.holdSeconds || 0);
  const targetWpm = clampNumber(rules.targetWpm || rules.minWpm || stats.wpm || 0);
  const accuracyTarget = clampNumber(rules.targetAccuracy || rules.minAccuracy || stats.accuracy || 0);
  const burstVsSustained = stats.burstVsSustained || getBurstVsSustainedSpeed(stats.history || []);

  return clamp(
    (sustainSeconds / 20) * 0.45 +
    (targetWpm / 120) * 0.25 +
    (accuracyTarget / 100) * 0.15 +
    (burstVsSustained.ratio > 1 ? Math.min((burstVsSustained.ratio - 1) / 2, 0.15) : 0)
  );
};

export const scoreMemoryChallengeIntensity = (challenge, sessionStats = {}) => {
  const rules = getRules(challenge);
  const prompt = typeof challenge?.prompt === "string" ? challenge.prompt : "";
  const wordCount = prompt.trim().length > 0 ? prompt.trim().split(/\s+/).filter(Boolean).length : clampNumber(rules.wordCount || 0);
  const hideAfterSeconds = clampNumber(rules.hideAfterSeconds || 0);
  const sustainSeconds = clampNumber(rules.sustainSeconds || 0);
  const noBackspace = Boolean(rules.noBackspace);
  const allowedMistakes = clampNumber(rules.allowedMistakes || 0);
  const stats = normalizeSessionStats(sessionStats);
  const pausePressure = getPauseDistribution(stats.replay || {}).longestPauseMs / 5000;

  return clamp(
    (wordCount / 60) * 0.3 +
    (hideAfterSeconds / 10) * 0.25 +
    (sustainSeconds / 20) * 0.15 +
    (noBackspace ? 0.15 : 0) +
    (allowedMistakes === 0 ? 0.1 : 0) +
    clamp(pausePressure, 0, 0.15)
  );
};

export const scoreNoBackspacePressure = (challenge, sessionStats = {}) => {
  const rules = getRules(challenge);
  const stats = normalizeSessionStats(sessionStats);
  const correction = stats.correction || getCorrectionFrequency(stats.replay || {});
  const noBackspace = Boolean(rules.noBackspace);
  const allowedMistakes = clampNumber(rules.allowedMistakes || 0);
  const correctionRatio = clampNumber(correction.correctionRatio, 0);

  return clamp((noBackspace ? 0.5 : 0.1) + (allowedMistakes === 0 ? 0.3 : 0.05) + (correctionRatio * 0.2));
};

export const scoreSessionDurationStress = (challenge, sessionStats = {}) => {
  const rules = getRules(challenge);
  const stats = normalizeSessionStats(sessionStats);
  const durationSeconds = clampNumber(stats.durationSeconds || stats.timeUsed || 0);
  const timeLimitSeconds = clampNumber(rules.timeLimitSeconds || stats.timeLimitSeconds || 0);
  const sustainSeconds = clampNumber(rules.sustainSeconds || 0);

  if (timeLimitSeconds > 0) {
    return clamp(durationSeconds / Math.max(timeLimitSeconds, 1));
  }

  if (sustainSeconds > 0) {
    return clamp(durationSeconds / Math.max(sustainSeconds * 3, 1));
  }

  return clamp(durationSeconds / 120, 0, 1);
};

export const analyzeChallengeBalancing = (challenge, sessionStats = {}) => {
  const difficulty = scoreChallengeDifficulty(challenge, sessionStats);
  const expectedCompletionRate = estimateExpectedCompletionRate(challenge, sessionStats);
  const sustainDifficulty = estimateSustainDifficulty(challenge, sessionStats);
  const memoryIntensity = scoreMemoryChallengeIntensity(challenge, sessionStats);
  const noBackspacePressure = scoreNoBackspacePressure(challenge, sessionStats);
  const durationStress = scoreSessionDurationStress(challenge, sessionStats);

  return {
    difficulty,
    expectedCompletionRate,
    sustainDifficulty,
    memoryIntensity,
    noBackspacePressure,
    durationStress,
    family: getChallengeFamily(challenge) || null
  };
};

export default {
  scoreChallengeDifficulty,
  estimateExpectedCompletionRate,
  estimateSustainDifficulty,
  scoreMemoryChallengeIntensity,
  scoreNoBackspacePressure,
  scoreSessionDurationStress,
  analyzeChallengeBalancing
};
