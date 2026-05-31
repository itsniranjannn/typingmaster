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

const getResult = (entry) => {
  if (!entry || typeof entry !== "object") return {};
  return entry.result && typeof entry.result === "object" ? entry.result : entry;
};

const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const variance = (values) => {
  if (values.length === 0) return 0;
  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
};

const linearSlope = (values) => {
  if (values.length < 2) return 0;
  const xs = values.map((_, index) => index);
  const meanX = average(xs);
  const meanY = average(values);
  const numerator = values.reduce((sum, value, index) => sum + ((xs[index] - meanX) * (value - meanY)), 0);
  const denominator = xs.reduce((sum, value) => sum + ((value - meanX) ** 2), 0);
  return denominator === 0 ? 0 : numerator / denominator;
};

const LEAGUES = ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Champion"];
const SKILL_BANDS = [
  { label: "starter", min: 0 },
  { label: "developing", min: 35 },
  { label: "intermediate", min: 50 },
  { label: "advanced", min: 65 },
  { label: "elite", min: 82 }
];

const getRankScore = (history) => {
  const records = normalizeHistory(history);
  if (records.length === 0) return { records, averageWpm: 0, averageAccuracy: 0, bestWpm: 0, score: 0 };

  const wpmValues = records.map((entry) => clampNumber(getResult(entry).wpm, 0));
  const accuracyValues = records.map((entry) => clampNumber(getResult(entry).accuracy, 0));
  const bestWpm = Math.max(0, ...wpmValues);
  const averageWpm = average(wpmValues);
  const averageAccuracy = average(accuracyValues);
  const behavior = summarizePlayerBehaviorHistory(records);
  const consistency = behavior.rollingConsistency.length > 0
    ? behavior.rollingConsistency[behavior.rollingConsistency.length - 1].averageConsistency
    : 0;

  const score = clamp(
    (averageWpm / 120) * 0.5 +
    (averageAccuracy / 100) * 0.3 +
    (bestWpm / 140) * 0.1 +
    (consistency / 100) * 0.1,
    0,
    1
  );

  return { records, averageWpm, averageAccuracy, bestWpm, consistency, score };
};

const getSkillBand = (score) => {
  let band = SKILL_BANDS[0].label;
  for (const entry of SKILL_BANDS) {
    if (score * 100 >= entry.min) band = entry.label;
  }
  return band;
};

const getLeagueRank = (score) => {
  const bounded = clamp(score, 0, 0.999999);
  const bucket = Math.min(31, Math.floor(bounded * 32));
  const leagueIndex = Math.min(LEAGUES.length - 1, Math.floor(bucket / 4));
  const divisionIndex = bucket % 4;
  const division = 4 - divisionIndex;
  const lowerBound = bucket / 32;
  const upperBound = (bucket + 1) / 32;

  return {
    league: LEAGUES[leagueIndex],
    division,
    divisionLabel: `${LEAGUES[leagueIndex]} ${division}`,
    bucket,
    lowerBound,
    upperBound,
    promotionThreshold: upperBound,
    demotionThreshold: lowerBound
  };
};

export const scoreConfidence = (history) => {
  const { records, score } = getRankScore(history);
  if (records.length === 0) return 0;

  const wpmValues = records.map((entry) => clampNumber(getResult(entry).wpm, 0));
  const accuracyValues = records.map((entry) => clampNumber(getResult(entry).accuracy, 0));
  const sampleScore = clamp(records.length / 12, 0, 1);
  const stability = clamp(1 - ((variance(wpmValues) / 900) + (variance(accuracyValues) / 4000)), 0, 1);
  const confidence = clamp((sampleScore * 0.55) + (stability * 0.35) + (score * 0.1), 0, 1);

  return confidence;
};

export const estimatePlacement = (history) => {
  const rankScore = getRankScore(history);
  const rank = getLeagueRank(rankScore.score);
  const confidence = scoreConfidence(history);
  const placementEstimate = clamp(1 - rankScore.score + ((1 - confidence) * 0.12), 0, 1);
  const estimatedDivision = `${rank.league} ${rank.division}`;

  return {
    skillBand: getSkillBand(rankScore.score),
    league: rank.league,
    division: rank.division,
    divisionLabel: rank.divisionLabel,
    estimatedDivision,
    percentile: Math.round((1 - placementEstimate) * 1000) / 10,
    placementEstimate,
    estimatedPlacement: Math.max(1, Math.round(100 * placementEstimate)),
    rankScore: Math.round(rankScore.score * 1000) / 10,
    confidence
  };
};

export const getPromotionSafetyWindow = (history) => {
  const placement = estimatePlacement(history);
  const rankScore = getRankScore(history);
  const momentum = getProgressionMomentum(history);
  const confidence = placement.confidence;
  const safetyWindow = Math.max(1, Math.round(4 + ((1 - confidence) * 4) - Math.min(momentum.momentumScore, 1) * 2));
  const pointsToPromotion = Math.max(0, Math.round((1 - rankScore.score) * 100));
  const pointsToDemotion = Math.max(0, Math.round(rankScore.score * 100 - Math.floor(rankScore.score * 100)));

  return {
    safetyWindow,
    pointsToPromotion,
    pointsToDemotion,
    confidence,
    momentumScore: momentum.momentumScore
  };
};

export const getProgressionMomentum = (history) => {
  const { records } = getRankScore(history);
  if (records.length === 0) {
    return { momentumScore: 0, scoreSlope: 0, streak: 0, recentDirection: "flat" };
  }

  const scores = records.map((entry) => {
    const result = getResult(entry);
    return (clampNumber(result.wpm, 0) * 0.55) + (clampNumber(result.accuracy, 0) * 0.35) + (clampNumber(result.completedWords, 0) * 0.1);
  });
  const slope = linearSlope(scores);
  const streak = scores.slice(-4).reduce((count, value, index, array) => {
    if (index === 0) return 1;
    return value >= array[index - 1] ? count + 1 : 1;
  }, 1);
  const momentumScore = clamp((slope / 5) + (streak / 8), 0, 1);
  const recentDirection = slope > 0.5 ? "rising" : slope < -0.5 ? "falling" : "flat";

  return {
    momentumScore,
    scoreSlope: slope,
    streak,
    recentDirection
  };
};

export const summarizeRankedProgression = (history) => {
  const rankScore = getRankScore(history);
  const placement = estimatePlacement(history);
  const momentum = getProgressionMomentum(history);
  const promotion = getPromotionSafetyWindow(history);

  return {
    skillBand: placement.skillBand,
    league: placement.league,
    division: placement.division,
    divisionLabel: placement.divisionLabel,
    confidence: placement.confidence,
    placementEstimate: placement.placementEstimate,
    estimatedPlacement: placement.estimatedPlacement,
    promotionThreshold: Math.round(placement.placementEstimate * 1000) / 10,
    demotionSafetyWindow: promotion.safetyWindow,
    promotion,
    momentum,
    averageWpm: rankScore.averageWpm,
    averageAccuracy: rankScore.averageAccuracy,
    bestWpm: rankScore.bestWpm,
    score: Math.round(rankScore.score * 1000) / 10
  };
};

export default {
  scoreConfidence,
  estimatePlacement,
  getPromotionSafetyWindow,
  getProgressionMomentum,
  summarizeRankedProgression
};