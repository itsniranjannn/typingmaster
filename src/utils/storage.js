const STORAGE_KEYS = {
  BEST_WPM: "typingMaster.bestWpm",
  BEST_WPM_BY_MODE: "typingMaster.bestWpmByMode",
  RESULTS: "typing_results",
  RESULTS_LEGACY: "typingMaster.results",
  LEADERBOARD: "typing_leaderboard",
  LEADERBOARD_LEGACY: "typingMaster.leaderboard",
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
  const validModes = new Set(["time", "words", "quote", "custom", "goal", "numbers"]);
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
    improvedBest: typeof result.improvedBest === "boolean" ? result.improvedBest : false
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
  numbers: 0
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
