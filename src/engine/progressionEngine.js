const sanitizeNumber = (value, fallbackValue = 0) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallbackValue;
  return Math.max(value, 0);
};

const sanitizeAccuracy = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

const sanitizeMode = (value) => {
  const validModes = new Set(["time", "words", "quote", "custom", "goal", "numbers", "challenge_arena"]);
  if (value === "goal_sustain" || value === "goal_reach") return "goal";
  return validModes.has(value) ? value : "time";
};

const sanitizeGoalVariant = (value) => (value === "reach" ? "reach" : "sustain");

const sanitizeTimeLimitSeconds = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 25;
  return Math.min(Math.max(Math.round(value), 10), 300);
};

export const createDefaultBestWpmByMode = () => ({
  time: 0,
  words25: 0,
  words35: 0,
  words50: 0,
  words100: 0,
  goalSustain: 0,
  goalReach: 0,
  quote: 0,
  custom: 0,
  numbers: 0,
  challengeArena: 0
});

export const sanitizeBestWpmByMode = (value) => {
  const defaults = createDefaultBestWpmByMode();
  if (!value || typeof value !== "object") return defaults;
  return Object.keys(defaults).reduce((accumulator, key) => {
    accumulator[key] = sanitizeNumber(value[key], 0);
    return accumulator;
  }, {});
};

export const stripChallengeFieldsForNonArenaResult = (result) => {
  if (!result || result.mode === "challenge_arena") return result;

  return {
    ...result,
    challengeId: null,
    challengeTitle: null,
    challengeReward: null,
    challengeBadgeId: null,
    challengeBadgeName: null,
    challengeBadgeIconName: null,
    challengeEarnedCount: 0,
    challengeCompleted: false,
    challengeCompletedToday: false,
    challengeFailed: false,
    challengeStreak: 0
  };
};

export const sanitizeResult = (result) => {
  if (!result || typeof result !== "object") return null;

  const sanitized = {
    id: sanitizeNumber(result.id, Date.now()),
    mode: sanitizeMode(result.mode),
    wordCount:
      typeof result.wordCount === "number" && Number.isFinite(result.wordCount) && result.wordCount > 0
        ? result.wordCount
        : null,
    wpm: sanitizeNumber(result.wpm, 0),
    accuracy: sanitizeAccuracy(result.accuracy),
    correctCharacters: sanitizeNumber(result.correctCharacters, 0),
    incorrectCharacters: sanitizeNumber(result.incorrectCharacters, 0),
    mistypedCharacters: Array.isArray(result.mistypedCharacters)
      ? result.mistypedCharacters
          .filter((character) => typeof character === "string" && character.length === 1)
          .slice(0, 5000)
      : [],
    timeUsed: sanitizeNumber(result.timeUsed, 0),
    timeLimitSeconds: sanitizeTimeLimitSeconds(result.timeLimitSeconds || result.timeLimit || 25),
    goalVariant: sanitizeGoalVariant(result.goalVariant),
    goalSuccess: typeof result.goalSuccess === "boolean" ? result.goalSuccess : null,
    modeKey: typeof result.modeKey === "string" ? result.modeKey : null,
    previousBest: sanitizeNumber(result.previousBest, 0),
    improvedBest: typeof result.improvedBest === "boolean" ? result.improvedBest : false,
    challengeId: typeof result.challengeId === "string" ? result.challengeId : null,
    challengeTitle: typeof result.challengeTitle === "string" ? result.challengeTitle : null,
    challengeBadgeId: typeof result.challengeBadgeId === "string" ? result.challengeBadgeId : null,
    challengeBadgeName: typeof result.challengeBadgeName === "string" ? result.challengeBadgeName : null,
    challengeBadgeIconName: typeof result.challengeBadgeIconName === "string" ? result.challengeBadgeIconName : null,
    challengeEarnedCount: sanitizeNumber(result.challengeEarnedCount, 0),
    challengeCompleted: typeof result.challengeCompleted === "boolean" ? result.challengeCompleted : false,
    challengeCompletedToday: typeof result.challengeCompletedToday === "boolean" ? result.challengeCompletedToday : false,
    challengeFailed: typeof result.challengeFailed === "boolean" ? result.challengeFailed : false,
    challengeStreak: sanitizeNumber(result.challengeStreak, 0)
  };

  return stripChallengeFieldsForNonArenaResult(sanitized);
};

export const getLeaderboardCandidates = (results) =>
  results
    .filter((result) => result.accuracy >= 90)
    .sort((left, right) => right.wpm - left.wpm || right.accuracy - left.accuracy)
    .slice(0, 10);

export const buildNextBadgeRecord = (existing, badgeId, badgeDefinition = {}, earnedAt = Date.now()) => ({
  badgeId,
  name: typeof badgeDefinition.name === "string" ? badgeDefinition.name.trim() : existing?.name || badgeId,
  iconName: typeof badgeDefinition.iconName === "string" ? badgeDefinition.iconName.trim() : existing?.iconName || "Trophy",
  earnedCount: (existing?.earnedCount || 0) + 1,
  lastEarnedDate: typeof earnedAt === "number" && Number.isFinite(earnedAt) ? new Date(earnedAt).toISOString().slice(0, 10) : existing?.lastEarnedDate || null
});

export const getMilestoneBadgeIds = ({ totalWins = 0, uniqueBadgeCount = 0 } = {}) => {
  const targets = [
    { badgeId: "milestone-first-blood", target: 1 },
    { badgeId: "milestone-challenger", target: 5 },
    { badgeId: "milestone-veteran", target: 10 },
    { badgeId: "milestone-legend", target: 25 },
    { badgeId: "milestone-master-of-all", target: 10, unique: true }
  ];

  return targets.filter((milestone) => (milestone.unique ? uniqueBadgeCount >= milestone.target : totalWins >= milestone.target));
};
