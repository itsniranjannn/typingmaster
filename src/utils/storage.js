const STORAGE_KEYS = {
  BEST_WPM: "typingMaster.bestWpm",
  BEST_WPM_BY_MODE: "typingMaster.bestWpmByMode",
  RESULTS: "typing_results",
  RESULTS_LEGACY: "typingMaster.results",
  LEADERBOARD: "typing_leaderboard",
  LEADERBOARD_LEGACY: "typingMaster.leaderboard",
  BADGES: "typingMaster.badges",
  THEME: "typingMaster.theme",
  MODE: "typingMaster.mode",
  GOAL_VARIANT: "typingMaster.goalVariant",
  TIME_LIMIT_SECONDS: "typingMaster.timeLimitSeconds",
  SOUND: "typingMaster.soundEnabled",
  SOUND_VOLUME: "typingMaster.soundVolume",
  HAS_SEEN_TOUR: "typingMaster.hasSeenTour"
};

const STREAK_KEYS = {
  STREAK: "typingMaster.streak"
};

const DAILY_GOAL_KEYS = {
  PROGRESS: "typingMaster.dailyGoalProgress"
};

const DAILY_CHALLENGE_KEYS = {
  STATE: "typingMaster.dailyChallenge",
  HISTORY: "typingMaster.dailyChallengeHistory",
  ATTEMPTS: "typingMaster.challengeAttemptsToday"
};

const ARENA_KEYS = {
  BANNER_COLLAPSED: "typingMaster.challengeArena.bannerCollapsed"
};

const DEFAULT_TIME_LIMIT_SECONDS = 25;

const safeRead = (key, fallbackValue) => {
  try {
    if (typeof window === "undefined") return fallbackValue;
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) return fallbackValue;
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

const safeWrite = (key, value) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
    if (typeof window.dispatchEvent === "function") {
      const storageEvent = typeof StorageEvent === "function"
        ? new StorageEvent("storage", { key, newValue: JSON.stringify(value), storageArea: window.localStorage, url: window.location.href })
        : new Event("storage");
      if (storageEvent && typeof storageEvent === "object" && !("key" in storageEvent)) {
        try {
          Object.defineProperty(storageEvent, "key", { value: key, configurable: true });
        } catch {}
      }
      window.dispatchEvent(storageEvent);
    }
  } catch {
    // Ignore storage write errors silently to keep typing flow stable.
  }
};

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const sanitizeNumber = (value, fallbackValue = 0) => {
  if (!isFiniteNumber(value)) return fallbackValue;
  return Math.max(value, 0);
};

const sanitizeAccuracy = (value) => {
  if (!isFiniteNumber(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

const sanitizeMode = (value) => {
  const validModes = new Set(["time", "words", "quote", "custom", "goal", "numbers", "challenge_arena"]);
  if (value === "goal_sustain" || value === "goal_reach") return "goal";
  return validModes.has(value) ? value : "time";
};

const sanitizeGoalVariant = (value) => (value === "reach" ? "reach" : "sustain");

const sanitizeTimeLimitSeconds = (value) => {
  if (!isFiniteNumber(value)) return DEFAULT_TIME_LIMIT_SECONDS;
  return Math.min(Math.max(Math.round(value), 10), 300);
};

const sanitizeTheme = (value) => (value === "light" ? "light" : "dark");

const sanitizeBoolean = (value, fallbackValue = true) =>
  typeof value === "boolean" ? value : fallbackValue;

const sanitizeVolume = (value) => {
  if (!isFiniteNumber(value)) return 0.5;
  return Math.min(Math.max(value, 0), 1);
};

const sanitizeDateKey = (value) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

const sanitizeAttemptBucket = (value) => {
  if (!value || typeof value !== "object") return null;

  const date = sanitizeDateKey(value.date);
  if (!date) return null;

  return {
    date,
    attempts: Math.min(Math.max(Math.round(sanitizeNumber(value.attempts, 0)), 0), 3),
    locked: typeof value.locked === "boolean" ? value.locked : false
  };
};

const sanitizeDailyChallengeConfig = (value) => {
  if (!value || typeof value !== "object") return null;

  const config = {};
  if (Object.prototype.hasOwnProperty.call(value, "timeLimitSeconds") && isFiniteNumber(value.timeLimitSeconds)) {
    config.timeLimitSeconds = sanitizeTimeLimitSeconds(value.timeLimitSeconds);
  }
  if (Object.prototype.hasOwnProperty.call(value, "wordCount") && isFiniteNumber(value.wordCount)) {
    config.wordCount = Math.min(Math.max(Math.round(value.wordCount), 1), 300);
  }
  if (Object.prototype.hasOwnProperty.call(value, "targetWpm") && isFiniteNumber(value.targetWpm)) {
    config.targetWpm = sanitizeNumber(value.targetWpm, 0);
  }
  if (Object.prototype.hasOwnProperty.call(value, "hideAfterSeconds") && isFiniteNumber(value.hideAfterSeconds)) {
    config.hideAfterSeconds = Math.max(0, Math.round(value.hideAfterSeconds));
  }
  if (Object.prototype.hasOwnProperty.call(value, "sustainSeconds") && isFiniteNumber(value.sustainSeconds)) {
    config.sustainSeconds = Math.max(0, Math.round(value.sustainSeconds));
  }
  if (Object.prototype.hasOwnProperty.call(value, "goalVariant") && typeof value.goalVariant === "string") {
    config.goalVariant = sanitizeGoalVariant(value.goalVariant);
  }
  return config;
};

const sanitizeDailyChallengeCriteria = (value) => {
  if (!value || typeof value !== "object") return null;

  const criteria = {};
  if (Object.prototype.hasOwnProperty.call(value, "mode") && typeof value.mode === "string") {
    criteria.mode = sanitizeMode(value.mode);
  }
  if (Object.prototype.hasOwnProperty.call(value, "minWpm") && isFiniteNumber(value.minWpm)) {
    criteria.minWpm = sanitizeNumber(value.minWpm, 0);
  }
  if (Object.prototype.hasOwnProperty.call(value, "targetWpm") && isFiniteNumber(value.targetWpm)) {
    criteria.targetWpm = sanitizeNumber(value.targetWpm, 0);
  }
  if (Object.prototype.hasOwnProperty.call(value, "minAccuracy") && isFiniteNumber(value.minAccuracy)) {
    criteria.minAccuracy = sanitizeAccuracy(value.minAccuracy);
  }
  if (Object.prototype.hasOwnProperty.call(value, "targetAccuracy") && isFiniteNumber(value.targetAccuracy)) {
    criteria.targetAccuracy = sanitizeAccuracy(value.targetAccuracy);
  }
  if (Object.prototype.hasOwnProperty.call(value, "timeLimitSeconds") && isFiniteNumber(value.timeLimitSeconds)) {
    criteria.timeLimitSeconds = sanitizeTimeLimitSeconds(value.timeLimitSeconds);
  }
  if (Object.prototype.hasOwnProperty.call(value, "wordCount") && isFiniteNumber(value.wordCount)) {
    criteria.wordCount = Math.min(Math.max(Math.round(value.wordCount), 1), 300);
  }
  if (Object.prototype.hasOwnProperty.call(value, "charTarget") && isFiniteNumber(value.charTarget)) {
    criteria.charTarget = Math.min(Math.max(Math.round(value.charTarget), 1), 5000);
  }
  if (Object.prototype.hasOwnProperty.call(value, "minTypedWords") && isFiniteNumber(value.minTypedWords)) {
    criteria.minTypedWords = Math.min(Math.max(Math.round(value.minTypedWords), 1), 300);
  }
  if (Object.prototype.hasOwnProperty.call(value, "allowedMistakes") && isFiniteNumber(value.allowedMistakes)) {
    criteria.allowedMistakes = Math.min(Math.max(Math.round(value.allowedMistakes), 0), 300);
  }
  if (Object.prototype.hasOwnProperty.call(value, "sustainSeconds") && isFiniteNumber(value.sustainSeconds)) {
    criteria.sustainSeconds = Math.max(0, Math.round(value.sustainSeconds));
  }
  if (Object.prototype.hasOwnProperty.call(value, "hideAfterSeconds") && isFiniteNumber(value.hideAfterSeconds)) {
    criteria.hideAfterSeconds = Math.max(0, Math.round(value.hideAfterSeconds));
  }
  if (Object.prototype.hasOwnProperty.call(value, "noBackspace")) {
    criteria.noBackspace = Boolean(value.noBackspace);
  }
  if (Object.prototype.hasOwnProperty.call(value, "goalVariant") && typeof value.goalVariant === "string") {
    criteria.goalVariant = sanitizeGoalVariant(value.goalVariant);
  }
  return criteria;
};

const sanitizeDailyChallenge = (value) => {
  if (!value || typeof value !== "object") return null;

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const target = typeof value.target === "string"
    ? value.target.trim()
    : typeof value.objective === "string"
      ? value.objective.trim()
      : "";
  const reward = typeof value.reward === "string" ? value.reward.trim() : "";
  const prompt = typeof value.prompt === "string" ? value.prompt.trim() : "";
  const mode = sanitizeMode(value.mode);

  if (!id || !title || !description || !target || !reward || !prompt) return null;

  return {
    id,
    templateId: typeof value.templateId === "string" ? value.templateId.trim() : id,
    family: typeof value.family === "string" ? value.family.trim() : null,
    title,
    description,
    mode,
    target,
    reward,
    prompt,
    promptType: typeof value.promptType === "string" ? value.promptType.trim() : null,
    objective: typeof value.objective === "string" ? value.objective.trim() : target,
    badgeId: typeof value.badgeId === "string" ? value.badgeId.trim() : id,
    badgeName: typeof value.badgeName === "string" ? value.badgeName.trim() : reward || title,
    badgeIconName: typeof value.badgeIconName === "string" ? value.badgeIconName.trim() : "Trophy",
    config: sanitizeDailyChallengeConfig(value.config),
    rules: sanitizeDailyChallengeCriteria(value.rules || value.criteria),
    criteria: sanitizeDailyChallengeCriteria(value.criteria || value.rules)
  };
};

const sanitizeDailyChallengeHistoryEntry = (value) => {
  if (!value || typeof value !== "object") return null;

  const date = sanitizeDateKey(value.date);
  const challengeId = typeof value.challengeId === "string" ? value.challengeId.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!date || !challengeId || !title) return null;

  return {
    date,
    challengeId,
    title,
    reward: typeof value.reward === "string" ? value.reward.trim() : "",
    completed: typeof value.completed === "boolean" ? value.completed : false,
    createdAt: sanitizeNumber(value.createdAt, 0),
    completedAt: typeof value.completedAt === "number" && Number.isFinite(value.completedAt) ? value.completedAt : null,
    challengeStreak: sanitizeNumber(value.challengeStreak, 0)
  };
};

const sanitizeDailyChallengeState = (value) => {
  if (!value || typeof value !== "object") return null;

  const date = sanitizeDateKey(value.date);
  const lastChallengeDate = sanitizeDateKey(value.lastChallengeDate || value.date);
  const challenge = sanitizeDailyChallenge(value.challenge);
  if (!date || !lastChallengeDate || !challenge) return null;

  return {
    date,
    lastChallengeDate,
    challengeCompleted: typeof value.challengeCompleted === "boolean" ? value.challengeCompleted : false,
    challengeCompletedToday: typeof value.challengeCompletedToday === "boolean" ? value.challengeCompletedToday : false,
    challengeLocked: typeof value.challengeLocked === "boolean" ? value.challengeLocked : false,
    challengeAttempts: sanitizeNumber(value.challengeAttempts, 0),
    challengeAttemptsLeft: sanitizeNumber(value.challengeAttemptsLeft, 3),
    completedAt: typeof value.completedAt === "number" && Number.isFinite(value.completedAt) ? value.completedAt : null,
    challengeStreak: sanitizeNumber(value.challengeStreak, 0),
    challenge
  };
};

const sanitizeBadge = (value) => {
  if (!value || typeof value !== "object") return null;

  const badgeId = typeof value.badgeId === "string" ? value.badgeId.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const iconName = typeof value.iconName === "string" ? value.iconName.trim() : "Trophy";
  if (!badgeId || !name) return null;

  return {
    badgeId,
    name,
    earnedCount: Math.max(0, Math.round(sanitizeNumber(value.earnedCount, 0))),
    lastEarnedDate: sanitizeDateKey(value.lastEarnedDate) || null,
    iconName
  };
};

const sanitizeResult = (result) => {
  if (!result || typeof result !== "object") return null;

  return {
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
    timeLimitSeconds: sanitizeTimeLimitSeconds(result.timeLimitSeconds || result.timeLimit || DEFAULT_TIME_LIMIT_SECONDS),
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
};

const getLeaderboardCandidates = (results) =>
  results
    .filter((result) => result.accuracy >= 90)
    .sort((left, right) => right.wpm - left.wpm || right.accuracy - left.accuracy)
    .slice(0, 10);

const createDefaultBestWpmByMode = () => ({
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

const sanitizeBestWpmByMode = (value) => {
  const defaults = createDefaultBestWpmByMode();
  if (!value || typeof value !== "object") return defaults;
  return Object.keys(defaults).reduce((accumulator, key) => {
    accumulator[key] = sanitizeNumber(value[key], 0);
    return accumulator;
  }, {});
};

const getLegacyBestWpm = () => sanitizeNumber(safeRead(STORAGE_KEYS.BEST_WPM, 0), 0);

export const getBestWpmByMode = () => {
  const stored = safeRead(STORAGE_KEYS.BEST_WPM_BY_MODE, null);
  const legacyBest = getLegacyBestWpm();
  if (stored === null) {
    const migrated = createDefaultBestWpmByMode();
    migrated.time = legacyBest;
    return migrated;
  }

  const sanitized = sanitizeBestWpmByMode(stored);
  if (legacyBest > (sanitized.time || 0)) {
    sanitized.time = legacyBest;
  }
  return sanitized;
};

export const setBestWpmByMode = (value) => safeWrite(STORAGE_KEYS.BEST_WPM_BY_MODE, sanitizeBestWpmByMode(value));

export const getBestWpm = (modeKey = "time") => {
  const bestWpmByMode = getBestWpmByMode();
  return sanitizeNumber(bestWpmByMode[modeKey], 0);
};

export const setBestWpm = (value, modeKey = "time") => {
  const bestWpmByMode = getBestWpmByMode();
  bestWpmByMode[modeKey] = sanitizeNumber(value, 0);
  setBestWpmByMode(bestWpmByMode);
  safeWrite(STORAGE_KEYS.BEST_WPM, sanitizeNumber(bestWpmByMode.time, 0));
};

export const getLastResults = () => {
  const stored = safeRead(STORAGE_KEYS.RESULTS, null);
  const fallbackStored = stored === null ? safeRead(STORAGE_KEYS.RESULTS_LEGACY, []) : stored;
  if (!Array.isArray(fallbackStored)) return [];
  return fallbackStored.map(sanitizeResult).filter(Boolean);
};
export const addResult = (result) => {
  const currentResults = getLastResults();
  const sanitizedResult = sanitizeResult(result);
  const nextResults = sanitizedResult ? [sanitizedResult, ...currentResults].slice(0, 10) : currentResults;
  safeWrite(STORAGE_KEYS.RESULTS, nextResults);
  return nextResults;
};

export const getLeaderboard = () => {
  const stored = safeRead(STORAGE_KEYS.LEADERBOARD, null);
  const fallbackStored = stored === null ? safeRead(STORAGE_KEYS.LEADERBOARD_LEGACY, []) : stored;
  if (!Array.isArray(fallbackStored)) return [];
  return fallbackStored.map(sanitizeResult).filter(Boolean);
};

export const syncLeaderboard = (results = getLastResults()) => {
  const sanitized = Array.isArray(results) ? results.map(sanitizeResult).filter(Boolean) : [];
  const leaderboard = getLeaderboardCandidates(sanitized);
  safeWrite(STORAGE_KEYS.LEADERBOARD, leaderboard);
  return leaderboard;
};

// Leaderboard helpers
export const loadLeaderboard = () => {
  return getLeaderboard();
};

export const resetLeaderboard = () => {
  safeWrite(STORAGE_KEYS.LEADERBOARD, []);
};

export const updateLeaderboard = (result) => {
  try {
    const candidate = sanitizeResult(result);
    if (!candidate || !isFiniteNumber(candidate.wpm) || candidate.wpm <= 0 || candidate.accuracy < 90) return getLeaderboard();
    if (candidate.goalVariant === "reach" && candidate.goalSuccess === false) return getLeaderboard();
    if (candidate.goalVariant === "sustain" && candidate.goalSuccess === false) return getLeaderboard();
    const current = getLeaderboard();
    const next = [...current, candidate].sort((a, b) => b.wpm - a.wpm).slice(0, 10);
    safeWrite(STORAGE_KEYS.LEADERBOARD, next);
    return next;
  } catch {
    return getLeaderboard();
  }
};

export const loadBadges = () => {
  const stored = safeRead(STORAGE_KEYS.BADGES, []);
  if (!Array.isArray(stored)) return [];
  return stored.map(sanitizeBadge).filter(Boolean);
};

export const saveBadges = (badges) => {
  const sanitizedBadges = Array.isArray(badges) ? badges.map(sanitizeBadge).filter(Boolean) : [];
  safeWrite(STORAGE_KEYS.BADGES, sanitizedBadges);
  return sanitizedBadges;
};

export const saveBadge = (badge) => {
  const sanitizedBadge = sanitizeBadge(badge);
  if (!sanitizedBadge) return null;

  const currentBadges = loadBadges();
  const existingIndex = currentBadges.findIndex((item) => item.badgeId === sanitizedBadge.badgeId);
  if (existingIndex >= 0) {
    currentBadges[existingIndex] = {
      ...currentBadges[existingIndex],
      ...sanitizedBadge,
      earnedCount: Math.max(currentBadges[existingIndex].earnedCount, sanitizedBadge.earnedCount)
    };
    saveBadges(currentBadges);
    return currentBadges[existingIndex];
  }

  const nextBadges = [...currentBadges, sanitizedBadge];
  saveBadges(nextBadges);
  return sanitizedBadge;
};

export const updateBadgeCount = (badgeId, badgeDefinition = {}, earnedAt = Date.now()) => {
  if (typeof badgeId !== "string" || !badgeId.trim()) return null;

  const currentBadges = loadBadges();
  const badgeKey = badgeId.trim();
  const existing = currentBadges.find((item) => item.badgeId === badgeKey);
  const nextBadge = {
    badgeId: badgeKey,
    name: typeof badgeDefinition.name === "string" ? badgeDefinition.name.trim() : existing?.name || badgeKey,
    iconName: typeof badgeDefinition.iconName === "string" ? badgeDefinition.iconName.trim() : existing?.iconName || "Trophy",
    earnedCount: (existing?.earnedCount || 0) + 1,
    lastEarnedDate: typeof earnedAt === "number" && Number.isFinite(earnedAt) ? new Date(earnedAt).toISOString().slice(0, 10) : existing?.lastEarnedDate || null
  };

  const nextBadges = existing
    ? currentBadges.map((item) => (item.badgeId === badgeKey ? nextBadge : item))
    : [...currentBadges, nextBadge];

  saveBadges(nextBadges);
  return nextBadge;
};

export const resetBadges = () => saveBadges([]);

export const getArenaBannerCollapsed = () => sanitizeBoolean(safeRead(ARENA_KEYS.BANNER_COLLAPSED, false), false);
export const setArenaBannerCollapsed = (collapsed) => safeWrite(ARENA_KEYS.BANNER_COLLAPSED, sanitizeBoolean(collapsed, false));

export const getPreferredTheme = () => sanitizeTheme(safeRead(STORAGE_KEYS.THEME, "dark"));
export const setPreferredTheme = (theme) => safeWrite(STORAGE_KEYS.THEME, sanitizeTheme(theme));

export const getPreferredMode = () => sanitizeMode(safeRead(STORAGE_KEYS.MODE, "time"));
export const setPreferredMode = (mode) => safeWrite(STORAGE_KEYS.MODE, sanitizeMode(mode));

export const getPreferredGoalVariant = () => sanitizeGoalVariant(safeRead(STORAGE_KEYS.GOAL_VARIANT, "sustain"));
export const setPreferredGoalVariant = (variant) => safeWrite(STORAGE_KEYS.GOAL_VARIANT, sanitizeGoalVariant(variant));

export const getPreferredTimeLimitSeconds = () => sanitizeTimeLimitSeconds(safeRead(STORAGE_KEYS.TIME_LIMIT_SECONDS, DEFAULT_TIME_LIMIT_SECONDS));
export const setPreferredTimeLimitSeconds = (seconds) => safeWrite(STORAGE_KEYS.TIME_LIMIT_SECONDS, sanitizeTimeLimitSeconds(seconds));

export const getSoundEnabled = () => sanitizeBoolean(safeRead(STORAGE_KEYS.SOUND, true), true);
export const setSoundEnabled = (enabled) => safeWrite(STORAGE_KEYS.SOUND, sanitizeBoolean(enabled, true));

export const getSoundVolume = () => sanitizeVolume(safeRead(STORAGE_KEYS.SOUND_VOLUME, 0.5));
export const setSoundVolume = (volume) => safeWrite(STORAGE_KEYS.SOUND_VOLUME, sanitizeVolume(volume));

export const getHasSeenTour = () => sanitizeBoolean(safeRead(STORAGE_KEYS.HAS_SEEN_TOUR, false), false);
export const setHasSeenTour = (seen) => safeWrite(STORAGE_KEYS.HAS_SEEN_TOUR, sanitizeBoolean(seen, false));

// Backward-compatible helpers used by tests and potential external callers.
export const saveResult = (result) => addResult(result);
export const loadResults = () => getLastResults();

export const exportResultsToCSV = (fileNamePrefix = "typing_results") => {
  const results = getLastResults();
  if (!Array.isArray(results) || results.length === 0) return null;

  const headers = ["Date","WPM","Accuracy","CorrectChars","IncorrectChars","Mode","Duration","TextLength"];
  const rows = results.map((r) => [
    new Date(r.id).toISOString(),
    r.wpm,
    r.accuracy,
    r.correctCharacters || 0,
    r.incorrectCharacters || 0,
    r.mode || "time",
    r.timeUsed || 0,
    (r.textLength != null) ? r.textLength : ((typeof r.correctCharacters === 'number' ? r.correctCharacters + (r.incorrectCharacters || 0) : ""))
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const fileName = `${fileNamePrefix}_${new Date().toISOString().split("T")[0]}.csv`;
  const link = typeof window !== "undefined" ? document.createElement("a") : null;
  if (link) {
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  }
  return fileName;
};

export const saveSettings = (settings) => {
  const payload = settings && typeof settings === "object" ? settings : {};
  if (Object.prototype.hasOwnProperty.call(payload, "theme")) {
    setPreferredTheme(payload.theme);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "mode")) {
    setPreferredMode(payload.mode);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "goalVariant")) {
    setPreferredGoalVariant(payload.goalVariant);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "timeLimitSeconds")) {
    setPreferredTimeLimitSeconds(payload.timeLimitSeconds);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "soundEnabled")) {
    setSoundEnabled(payload.soundEnabled);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "soundVolume")) {
    setSoundVolume(payload.soundVolume);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "hasSeenTour")) {
    setHasSeenTour(payload.hasSeenTour);
  }
};

export const loadSettings = () => ({
  theme: getPreferredTheme(),
  mode: getPreferredMode(),
  goalVariant: getPreferredGoalVariant(),
  timeLimitSeconds: getPreferredTimeLimitSeconds(),
  soundEnabled: getSoundEnabled(),
  soundVolume: getSoundVolume(),
  hasSeenTour: getHasSeenTour()
});

// Streak helpers: tracks consecutive active days (local date strings)
const formatDateKey = (ms = Date.now()) => {
  try {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  } catch {
    return null;
  }
};

export const getDailyGoalProgress = (timestampMs = Date.now()) => {
  const today = formatDateKey(timestampMs);
  if (!today) return { date: null, count: 0 };

  const stored = safeRead(DAILY_GOAL_KEYS.PROGRESS, { date: today, count: 0 });
  if (!stored || typeof stored !== "object") return { date: today, count: 0 };

  if (stored.date !== today) return { date: today, count: 0 };

  return {
    date: today,
    count: sanitizeNumber(stored.count, 0)
  };
};

export const incrementDailyGoalProgress = (timestampMs = Date.now()) => {
  const next = getDailyGoalProgress(timestampMs);
  const payload = { date: next.date, count: next.count + 1 };
  safeWrite(DAILY_GOAL_KEYS.PROGRESS, payload);
  return payload;
};

export const resetDailyGoalProgress = (timestampMs = Date.now()) => {
  const payload = { date: formatDateKey(timestampMs), count: 0 };
  safeWrite(DAILY_GOAL_KEYS.PROGRESS, payload);
  return payload;
};

export const getStreak = () => {
  const stored = safeRead(STREAK_KEYS.STREAK, { count: 0, lastTestDate: null });
  if (!stored || typeof stored !== "object") return { count: 0, lastTestDate: null };
  return {
    count: sanitizeNumber(stored.count, 0),
    lastTestDate: typeof stored.lastTestDate === "string" ? stored.lastTestDate : null
  };
};

export const saveStreak = (payload) => {
  try {
    if (!payload || typeof payload !== "object") return;
    const next = {
      count: sanitizeNumber(payload.count, 0),
      lastTestDate: typeof payload.lastTestDate === "string" ? payload.lastTestDate : formatDateKey()
    };
    safeWrite(STREAK_KEYS.STREAK, next);
  } catch {}
};

export const loadStreak = () => getStreak();

export const updateStreakWithTimestamp = (timestampMs = Date.now()) => {
  const key = formatDateKey(timestampMs);
  if (!key) return getStreak();

  const previous = getStreak();
  // If already recorded for today, return current
  if (previous.lastTestDate === key) return previous;

  // Compute yesterday key
  const yesterday = formatDateKey(timestampMs - 24 * 60 * 60 * 1000);
  const nextCount = previous.lastTestDate === yesterday ? previous.count + 1 : 1;

  const payload = { count: nextCount, lastTestDate: key };
  safeWrite(STREAK_KEYS.STREAK, payload);
  return payload;
};

export const getDailyChallengeHistory = () => {
  const stored = safeRead(DAILY_CHALLENGE_KEYS.HISTORY, []);
  if (!Array.isArray(stored)) return [];
  return stored.map(sanitizeDailyChallengeHistoryEntry).filter(Boolean).sort((left, right) => right.createdAt - left.createdAt);
};

const getCurrentUtcDateKey = (timestampMs = Date.now()) => new Date(timestampMs).toISOString().slice(0, 10);

export const getChallengeAttemptsToday = (timestampMs = Date.now()) => {
  const currentDate = getCurrentUtcDateKey(timestampMs);
  const stored = sanitizeAttemptBucket(safeRead(DAILY_CHALLENGE_KEYS.ATTEMPTS, null));
  if (!stored || stored.date !== currentDate) {
    return { date: currentDate, attempts: 0, locked: false };
  }
  return stored;
};

export const setChallengeAttemptsToday = (value, timestampMs = Date.now()) => {
  const currentDate = getCurrentUtcDateKey(timestampMs);
  const sanitized = sanitizeAttemptBucket(value) || { date: currentDate, attempts: 0, locked: false };
  const nextBucket = {
    date: currentDate,
    attempts: Math.min(Math.max(sanitized.attempts, 0), 3),
    locked: Boolean(sanitized.locked)
  };
  safeWrite(DAILY_CHALLENGE_KEYS.ATTEMPTS, nextBucket);
  return nextBucket;
};

export const incrementChallengeAttemptsToday = (timestampMs = Date.now()) => {
  const current = getChallengeAttemptsToday(timestampMs);
  const nextAttempts = Math.min(current.attempts + 1, 3);
  const nextBucket = {
    date: current.date,
    attempts: nextAttempts,
    locked: nextAttempts >= 3 ? true : current.locked
  };
  safeWrite(DAILY_CHALLENGE_KEYS.ATTEMPTS, nextBucket);
  return nextBucket;
};

export const lockChallengeAttemptsToday = (timestampMs = Date.now()) => {
  const current = getChallengeAttemptsToday(timestampMs);
  const nextBucket = { ...current, locked: true };
  safeWrite(DAILY_CHALLENGE_KEYS.ATTEMPTS, nextBucket);
  return nextBucket;
};

export const setDailyChallengeHistory = (history) => {
  const sanitizedHistory = Array.isArray(history)
    ? history.map(sanitizeDailyChallengeHistoryEntry).filter(Boolean).sort((left, right) => right.createdAt - left.createdAt)
    : [];
  safeWrite(DAILY_CHALLENGE_KEYS.HISTORY, sanitizedHistory);
  return sanitizedHistory;
};

export const getDailyChallengeState = () => sanitizeDailyChallengeState(safeRead(DAILY_CHALLENGE_KEYS.STATE, null));

export const setDailyChallengeState = (state) => {
  const sanitizedState = sanitizeDailyChallengeState(state);
  if (!sanitizedState) return null;
  safeWrite(DAILY_CHALLENGE_KEYS.STATE, sanitizedState);
  return sanitizedState;
};

export const appendDailyChallengeHistoryEntry = (entry) => {
  const sanitizedEntry = sanitizeDailyChallengeHistoryEntry(entry);
  if (!sanitizedEntry) return getDailyChallengeHistory();

  const currentHistory = getDailyChallengeHistory();
  const nextHistory = [sanitizedEntry, ...currentHistory.filter((item) => !(item.challengeId === sanitizedEntry.challengeId && item.date === sanitizedEntry.date))].slice(0, 60);
  return setDailyChallengeHistory(nextHistory);
};

export const updateDailyChallengeHistoryEntry = (date, updater) => {
  const dateKey = sanitizeDateKey(date);
  if (!dateKey || typeof updater !== "function") return getDailyChallengeHistory();

  const currentHistory = getDailyChallengeHistory();
  const nextHistory = currentHistory.map((entry) => {
    if (entry.date !== dateKey) return entry;
    return sanitizeDailyChallengeHistoryEntry(updater(entry)) || entry;
  });

  return setDailyChallengeHistory(nextHistory);
};

export const resetDailyChallengeState = () => {
  safeWrite(DAILY_CHALLENGE_KEYS.STATE, null);
  safeWrite(DAILY_CHALLENGE_KEYS.HISTORY, []);
  safeWrite(DAILY_CHALLENGE_KEYS.ATTEMPTS, null);
  return { state: null, history: [] };
};
