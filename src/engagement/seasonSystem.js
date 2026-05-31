import { summarizeRankedProgression } from "./rankedProgression";
import { summarizePlayerBehaviorHistory } from "../analysis/playerBehaviorAnalysis";

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

const getTimestamp = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getSeasonLengthMs = (seasonLengthDays = 28) => Math.max(1, clampNumber(seasonLengthDays, 28)) * 24 * 60 * 60 * 1000;

const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export const getSeasonWindow = (referenceTimestamp = Date.now(), seasonLengthDays = 28, anchorTimestamp = 0) => {
  const reference = getTimestamp(referenceTimestamp) ?? 0;
  const anchor = getTimestamp(anchorTimestamp) ?? 0;
  const seasonLengthMs = getSeasonLengthMs(seasonLengthDays);
  const seasonIndex = Math.max(0, Math.floor((reference - anchor) / seasonLengthMs));
  const startAt = anchor + (seasonIndex * seasonLengthMs);
  const endAt = startAt + seasonLengthMs;

  return {
    seasonIndex,
    startAt,
    endAt,
    startAtIso: new Date(startAt).toISOString(),
    endAtIso: new Date(endAt).toISOString(),
    progress: clamp((reference - startAt) / seasonLengthMs, 0, 1),
    seasonLengthDays: Math.max(1, clampNumber(seasonLengthDays, 28))
  };
};

export const calculateSeasonReset = (referenceTimestamp = Date.now(), seasonLengthDays = 28, anchorTimestamp = 0) => {
  const window = getSeasonWindow(referenceTimestamp, seasonLengthDays, anchorTimestamp);
  return {
    seasonIndex: window.seasonIndex,
    nextResetAt: window.endAt,
    nextResetAtIso: window.endAtIso,
    daysUntilReset: Math.max(0, Math.ceil((window.endAt - (getTimestamp(referenceTimestamp) ?? 0)) / (24 * 60 * 60 * 1000))),
    window
  };
};

export const trackPrestige = (history) => {
  const records = normalizeHistory(history);
  const ranked = summarizeRankedProgression(records);
  const prestigePoints = Math.max(0, Math.round((ranked.score * 1.5) + (ranked.momentum.momentumScore * 25) + (records.length * 2)));
  return {
    prestigePoints,
    prestigeTier: Math.floor(prestigePoints / 100),
    nextPrestigeAt: (Math.floor(prestigePoints / 100) + 1) * 100,
    carryoverScore: clamp(ranked.confidence * 0.4 + ranked.momentum.momentumScore * 0.6, 0, 1)
  };
};

export const summarizeSeasonMilestones = (history) => {
  const records = normalizeHistory(history);
  const behavior = summarizePlayerBehaviorHistory(records);
  const ranked = summarizeRankedProgression(records);
  const bestWpm = Math.max(0, ...records.map((entry) => clampNumber(entry.result?.wpm ?? entry.wpm, 0)));
  const averageAccuracy = average(records.map((entry) => clampNumber(entry.result?.accuracy ?? entry.accuracy, 0)));

  const milestones = [
    { key: "first_sessions", achieved: records.length >= 3, value: records.length, target: 3 },
    { key: "consistency", achieved: behavior.rollingConsistency.some((entry) => entry.averageConsistency >= 75), value: behavior.rollingConsistency.at(-1)?.averageConsistency ?? 0, target: 75 },
    { key: "speed", achieved: bestWpm >= 70, value: bestWpm, target: 70 },
    { key: "accuracy", achieved: averageAccuracy >= 95, value: averageAccuracy, target: 95 },
    { key: "ranked_progress", achieved: ranked.score >= 60, value: ranked.score, target: 60 }
  ];

  return {
    milestones,
    achievedCount: milestones.filter((milestone) => milestone.achieved).length,
    bestWpm,
    averageAccuracy,
    rankLabel: ranked.divisionLabel
  };
};

export const groupSeasonChallenges = (challenges) => {
  if (!Array.isArray(challenges)) return [];

  const groups = new Map();
  for (const challenge of challenges.slice(0, 40)) {
    if (!challenge || typeof challenge !== "object") continue;
    const family = typeof challenge.family === "string" && challenge.family.trim() ? challenge.family.trim() : "uncategorized";
    const bucket = groups.get(family) || [];
    bucket.push(challenge);
    groups.set(family, bucket);
  }

  return Array.from(groups.entries()).map(([family, items]) => ({
    family,
    count: items.length,
    challenges: items
  }));
};

export const recommendRewardPacing = (history) => {
  const records = normalizeHistory(history);
  const ranked = summarizeRankedProgression(records);
  const behavior = summarizePlayerBehaviorHistory(records);
  const fatigue = behavior.fatigue.fatigueScore;
  const rewardGapSessions = Math.max(1, Math.round(2 + (fatigue * 4) + ((1 - ranked.confidence) * 2)));
  const rewardCadenceDays = Math.max(1, Math.round(3 + (fatigue * 5) + ((1 - ranked.momentum.momentumScore) * 2)));

  return {
    rewardGapSessions,
    rewardCadenceDays,
    rewardIntensity: clamp(1 - fatigue * 0.5 + ranked.confidence * 0.2, 0.25, 1),
    fatigue,
    confidence: ranked.confidence
  };
};

export const summarizeProgressionCarryover = (history, previousSeason = null, currentSeason = null) => {
  const records = normalizeHistory(history);
  const prestige = trackPrestige(records);
  const milestoneSummary = summarizeSeasonMilestones(records);
  const pacing = recommendRewardPacing(records);
  const previousWindow = previousSeason ? getSeasonWindow(previousSeason.referenceTimestamp ?? previousSeason.startAt ?? 0, previousSeason.seasonLengthDays ?? 28, previousSeason.anchorTimestamp ?? 0) : null;
  const currentWindow = currentSeason ? getSeasonWindow(currentSeason.referenceTimestamp ?? currentSeason.startAt ?? 0, currentSeason.seasonLengthDays ?? 28, currentSeason.anchorTimestamp ?? 0) : null;

  return {
    prestige,
    milestones: milestoneSummary,
    pacing,
    carryoverScore: clamp((prestige.carryoverScore * 0.5) + (milestoneSummary.achievedCount / Math.max(milestoneSummary.milestones.length, 1)) * 0.3 + (pacing.rewardIntensity * 0.2), 0, 1),
    previousSeason: previousWindow,
    currentSeason: currentWindow,
    resetPressure: currentWindow && previousWindow ? clamp((currentWindow.seasonIndex - previousWindow.seasonIndex) / 4, 0, 1) : 0
  };
};

export default {
  getSeasonWindow,
  calculateSeasonReset,
  trackPrestige,
  summarizeSeasonMilestones,
  groupSeasonChallenges,
  recommendRewardPacing,
  summarizeProgressionCarryover
};