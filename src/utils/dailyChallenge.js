import { GOAL_VARIANTS, TYPING_MODES } from "../constants/typingModes";
import {
  appendDailyChallengeHistoryEntry,
  getDailyChallengeHistory,
  getDailyChallengeState,
  loadBadges,
  saveBadge,
  setDailyChallengeState,
  updateBadgeCount,
  updateDailyChallengeHistoryEntry
} from "./storage";

const DAY_MS = 24 * 60 * 60 * 1000;
const REUSE_WINDOW_MS = 30 * DAY_MS;
const ARENA_MODE = TYPING_MODES.CHALLENGE_ARENA;

const WORD_BANK = [
  "about", "active", "again", "alpha", "answer", "around", "arrow", "basic", "beacon", "better",
  "bridge", "bright", "build", "calm", "candle", "careful", "charge", "clear", "clock", "close",
  "collect", "control", "create", "current", "delta", "detail", "distant", "effect", "energy", "focus",
  "future", "gentle", "glance", "growth", "handle", "horizon", "human", "impact", "inside", "journey",
  "kind", "listen", "moment", "motion", "notice", "open", "pattern", "phase", "practice", "pulse",
  "quiet", "ripple", "rhythm", "signal", "simple", "skill", "smooth", "speed", "spirit", "steady",
  "target", "thought", "timing", "today", "together", "under", "value", "vision", "watch", "whole",
  "write", "yellow", "zero", "zest", "cipher", "vector", "stream", "unlock", "arena", "crown"
];

const QUOTE_FRAGMENTS = [
  "Precision is built one careful stroke at a time",
  "Speed matters only when accuracy keeps pace",
  "The best results come from calm repetition",
  "Every clean run makes the next one easier",
  "Focus is a skill that improves under pressure",
  "A good rhythm is faster than a rushed mistake",
  "Memory grows sharper when you trust the pattern",
  "The keyboard rewards patience more than panic",
  "A small clean habit is stronger than a noisy sprint",
  "Consistency turns effort into momentum"
];

const NUMBER_FRAGMENTS = [
  "4 8 15 16 23 42",
  "7 12 19 28 31 45",
  "5 11 18 24 36 48",
  "9 14 22 27 33 41",
  "3 6 10 17 25 39",
  "2 13 21 34 55 89"
];

const BADGE_FAMILIES = [
  { family: "endurance", iconName: "Trophy" },
  { family: "control", iconName: "Shield" },
  { family: "spike", iconName: "Zap" },
  { family: "precision", iconName: "Target" },
  { family: "numbers", iconName: "Calculator" },
  { family: "memory", iconName: "Brain" }
];

const BADGE_TIERS = [
  { suffix: "bronze", label: "Bronze", iconName: "Award" },
  { suffix: "silver", label: "Silver", iconName: "Medal" },
  { suffix: "gold", label: "Gold", iconName: "Trophy" },
  { suffix: "legend", label: "Legend", iconName: "Crown" },
  { suffix: "master", label: "Master", iconName: "Sparkles" }
];

const MILESTONE_BADGES = [
  { badgeId: "milestone-first-blood", name: "First Blood", iconName: "Flame" },
  { badgeId: "milestone-challenger", name: "Challenger", iconName: "Target" },
  { badgeId: "milestone-veteran", name: "Veteran", iconName: "Shield" },
  { badgeId: "milestone-legend", name: "Legend", iconName: "Trophy" },
  { badgeId: "milestone-master-of-all", name: "Master of All", iconName: "Crown" }
];

const hashSeed = (seed) => {
  const input = String(seed || "arena");
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createRandom = (seed) => {
  let state = hashSeed(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

const randomInt = (random, min, max) => Math.floor(random() * (max - min + 1)) + min;
const pick = (values, random) => values[randomInt(random, 0, values.length - 1)];
const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();

const utcDateKey = (timestampMs = Date.now()) => new Date(timestampMs).toISOString().slice(0, 10);

const buildParagraph = (seed, wordTarget, sentenceCount = 2) => {
  const random = createRandom(seed);
  const sentences = [];

  for (let sentenceIndex = 0; sentenceIndex < sentenceCount; sentenceIndex += 1) {
    const target = Math.max(6, Math.round(wordTarget / sentenceCount));
    const sentenceWords = [];
    for (let wordIndex = 0; wordIndex < target; wordIndex += 1) {
      sentenceWords.push(pick(WORD_BANK, random));
    }
    sentenceWords[0] = `${sentenceWords[0].charAt(0).toUpperCase()}${sentenceWords[0].slice(1)}`;
    sentences.push(`${sentenceWords.join(" ")}.`);
  }

  return normalizeWhitespace(sentences.join(" "));
};

const buildQuote = (seed, quoteCount = 2) => {
  const random = createRandom(seed);
  const parts = [];
  for (let index = 0; index < quoteCount; index += 1) {
    parts.push(pick(QUOTE_FRAGMENTS, random));
  }
  const sentence = normalizeWhitespace(parts.join(", "));
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
};

const buildNumbers = (seed, chunks = 3) => {
  const random = createRandom(seed);
  const parts = [];
  for (let index = 0; index < chunks; index += 1) {
    parts.push(pick(NUMBER_FRAGMENTS, random));
  }
  return normalizeWhitespace(parts.join(" "));
};

const makeBadgeCatalog = () => {
  const catalog = [];

  BADGE_FAMILIES.forEach((family) => {
    BADGE_TIERS.forEach((tier) => {
      const badgeId = `${family.family}-${tier.suffix}`;
      catalog.push({
        badgeId,
        name: `${family.family[0].toUpperCase()}${family.family.slice(1)} ${tier.label}`,
        iconName: tier.iconName || family.iconName,
        family: family.family,
        tier: tier.suffix
      });
    });
  });

  return [...catalog, ...MILESTONE_BADGES];
};

const BADGE_CATALOG = makeBadgeCatalog();
const BADGE_LOOKUP = new Map(BADGE_CATALOG.map((badge) => [badge.badgeId, badge]));

const createTemplate = (template) => ({
  ...template,
  mode: ARENA_MODE,
  challengeMode: ARENA_MODE,
  badge: BADGE_LOOKUP.get(template.badgeId) || BADGE_LOOKUP.get("endurance-bronze")
});

const buildTemplates = () => {
  const templates = [];
  const difficultyStarsByTier = [1, 1, 2, 3, 3];
  const families = [
    {
      family: "endurance",
      title: "Endurance",
      promptType: "paragraph",
      variants: [
        { suffix: "bronze", description: "Type 110 words at 35 WPM and 92% accuracy.", wordCount: 110, minWpm: 35, minAccuracy: 92, timeLimitSeconds: 120 },
        { suffix: "silver", description: "Type 140 words at 42 WPM and 94% accuracy.", wordCount: 140, minWpm: 42, minAccuracy: 94, timeLimitSeconds: 135 },
        { suffix: "gold", description: "Type 180 words at 50 WPM and 96% accuracy.", wordCount: 180, minWpm: 50, minAccuracy: 96, timeLimitSeconds: 150 },
        { suffix: "legend", description: "Clear a 220-word endurance run at 58 WPM and 97% accuracy.", wordCount: 220, minWpm: 58, minAccuracy: 97, timeLimitSeconds: 180 },
        { suffix: "master", description: "Finish 260 words at 66 WPM and 98% accuracy.", wordCount: 260, minWpm: 66, minAccuracy: 98, timeLimitSeconds: 210 }
      ]
    },
    {
      family: "control",
      title: "No Backspace",
      promptType: "paragraph",
      variants: [
        { suffix: "bronze", description: "Type 60 words without Backspace and keep 92% accuracy.", wordCount: 60, noBackspace: true, allowedMistakes: 2, minAccuracy: 92, minWpm: 35 },
        { suffix: "silver", description: "Type 80 words without Backspace and keep 94% accuracy.", wordCount: 80, noBackspace: true, allowedMistakes: 1, minAccuracy: 94, minWpm: 42 },
        { suffix: "gold", description: "Type 100 words without Backspace and keep 96% accuracy.", wordCount: 100, noBackspace: true, allowedMistakes: 1, minAccuracy: 96, minWpm: 48 },
        { suffix: "legend", description: "Type 120 words without Backspace and stay near-perfect.", wordCount: 120, noBackspace: true, allowedMistakes: 0, minAccuracy: 98, minWpm: 55 },
        { suffix: "master", description: "Type 150 words without Backspace and stay flawless at speed.", wordCount: 150, noBackspace: true, allowedMistakes: 0, minAccuracy: 99, minWpm: 60 }
      ]
    },
    {
      family: "spike",
      title: "Speed Spike",
      promptType: "paragraph",
      variants: [
        { suffix: "bronze", description: "Reach 35 WPM and hold it for 2 seconds within 60 seconds.", wordCount: 60, targetWpm: 35, sustainSeconds: 2, timeLimitSeconds: 60, minAccuracy: 92 },
        { suffix: "silver", description: "Reach 45 WPM and hold it for 3 seconds within 60 seconds.", wordCount: 75, targetWpm: 45, sustainSeconds: 3, timeLimitSeconds: 60, minAccuracy: 94 },
        { suffix: "gold", description: "Reach 55 WPM and hold it for 4 seconds within 60 seconds.", wordCount: 90, targetWpm: 55, sustainSeconds: 4, timeLimitSeconds: 60, minAccuracy: 96 },
        { suffix: "legend", description: "Reach 65 WPM and hold it for 5 seconds within 75 seconds.", wordCount: 105, targetWpm: 65, sustainSeconds: 5, timeLimitSeconds: 75, minAccuracy: 97 },
        { suffix: "master", description: "Reach 75 WPM and hold it for 6 seconds within 90 seconds.", wordCount: 120, targetWpm: 75, sustainSeconds: 6, timeLimitSeconds: 90, minAccuracy: 98 }
      ]
    },
    {
      family: "precision",
      title: "Perfectionist",
      promptType: "quote",
      variants: [
        { suffix: "bronze", description: "Type a 45-word quote with at least 92% accuracy.", wordCount: 45, minAccuracy: 92, minWpm: 35, timeLimitSeconds: 60 },
        { suffix: "silver", description: "Type a 65-word quote with at least 95% accuracy.", wordCount: 65, minAccuracy: 95, minWpm: 40, timeLimitSeconds: 75 },
        { suffix: "gold", description: "Type an 85-word quote with at least 97% accuracy.", wordCount: 85, minAccuracy: 97, minWpm: 45, timeLimitSeconds: 90 },
        { suffix: "legend", description: "Type a 105-word quote with near-perfect accuracy.", wordCount: 105, minAccuracy: 99, minWpm: 50, timeLimitSeconds: 120 },
        { suffix: "master", description: "Type a 130-word quote with perfect accuracy.", wordCount: 130, minAccuracy: 100, minWpm: 55, timeLimitSeconds: 135 }
      ]
    },
    {
      family: "numbers",
      title: "Numbers Blitz",
      promptType: "numbers",
      variants: [
        { suffix: "bronze", description: "Type a mixed word+number paragraph in under 60 seconds at 35 WPM.", charTarget: 80, timeLimitSeconds: 60, minWpm: 35, minAccuracy: 92 },
        { suffix: "silver", description: "Type a mixed word+number paragraph in under 50 seconds at 45 WPM.", charTarget: 90, timeLimitSeconds: 50, minWpm: 45, minAccuracy: 94 },
        { suffix: "gold", description: "Type a mixed word+number paragraph in under 40 seconds at 55 WPM.", charTarget: 100, timeLimitSeconds: 40, minWpm: 55, minAccuracy: 96 },
        { suffix: "legend", description: "Type a mixed word+number paragraph in under 32 seconds at 65 WPM.", charTarget: 110, timeLimitSeconds: 32, minWpm: 65, minAccuracy: 97 },
        { suffix: "master", description: "Type a mixed word+number paragraph in under 28 seconds at 75 WPM.", charTarget: 120, timeLimitSeconds: 28, minWpm: 75, minAccuracy: 98 }
      ]
    },
    {
      family: "memory",
      title: "Memory Test",
      promptType: "memory",
      variants: [
        { suffix: "bronze", description: "Memorize a paragraph that fades after 4 seconds and finish at 35 WPM.", wordCount: 60, hideAfterSeconds: 4, minWpm: 35, minAccuracy: 92 },
        { suffix: "silver", description: "Memorize a paragraph that fades after 3 seconds and finish at 42 WPM.", wordCount: 72, hideAfterSeconds: 3, minWpm: 42, minAccuracy: 94 },
        { suffix: "gold", description: "Memorize a paragraph that fades after 2 seconds and finish at 50 WPM.", wordCount: 88, hideAfterSeconds: 2, minWpm: 50, minAccuracy: 96 },
        { suffix: "legend", description: "Memorize a paragraph that fades after 2 seconds and finish at 58 WPM.", wordCount: 100, hideAfterSeconds: 2, minWpm: 58, minAccuracy: 97 },
        { suffix: "master", description: "Memorize a paragraph that fades after 1 second and finish at 66 WPM.", wordCount: 112, hideAfterSeconds: 1, minWpm: 66, minAccuracy: 98 }
      ]
    }
  ];

  families.forEach((family) => {
    family.variants.forEach((variant, index) => {
      const badgeId = `${family.family}-${variant.suffix}`;
      const difficulty = difficultyStarsByTier[index] || 3;
      templates.push(
        createTemplate({
          templateId: `${family.family}-${variant.suffix}`,
          family: family.family,
          title: family.title,
          subtitle: variant.description,
          difficulty,
          difficultyStars: "⭐".repeat(difficulty),
          badgeId,
          promptType: family.promptType,
          objective: variant.description,
          rules: {
            timeLimitSeconds: variant.timeLimitSeconds || null,
            wordCount: variant.wordCount || null,
            minWpm: variant.minWpm || null,
            minAccuracy: variant.minAccuracy || null,
            noBackspace: Boolean(variant.noBackspace),
            allowedMistakes: typeof variant.allowedMistakes === "number" ? variant.allowedMistakes : 0,
            sustainSeconds: variant.sustainSeconds || null,
            hideAfterSeconds: variant.hideAfterSeconds || null,
            targetWpm: variant.targetWpm || null,
            charTarget: variant.charTarget || null
          },
          config: {
            timeLimitSeconds: variant.timeLimitSeconds || null,
            wordCount: variant.wordCount || null,
            targetWpm: variant.targetWpm || null,
            hideAfterSeconds: variant.hideAfterSeconds || null
          }
        })
      );
    });
  });

  return templates;
};

const CHALLENGE_TEMPLATES = buildTemplates();
const getChallengeTemplateById = (templateId) => CHALLENGE_TEMPLATES.find((template) => template.templateId === templateId) || null;
const getBadgeById = (badgeId) => BADGE_LOOKUP.get(badgeId) || null;

const buildPromptFromTemplate = (template, seed) => {
  if (template.promptType === "quote") {
    return buildQuote(seed, Math.max(2, Math.ceil((template.rules.wordCount || 60) / 40)));
  }

  if (template.promptType === "numbers") {
    return normalizeWhitespace(`${buildNumbers(seed, 3)} ${buildParagraph(`${seed}:tail`, 12, 1)}`);
  }

  return buildParagraph(seed, template.rules.wordCount || 80, Math.max(2, Math.ceil((template.rules.wordCount || 80) / 60)));
};

const buildChallengeInstance = (template, dateKey, timestampMs) => {
  const badge = getBadgeById(template.badgeId);
  return {
    id: template.templateId,
    templateId: template.templateId,
    family: template.family,
    date: dateKey,
    createdAt: timestampMs,
    title: template.title,
    description: template.subtitle,
    objective: template.objective,
    difficulty: template.difficulty,
    difficultyStars: template.difficultyStars || "⭐".repeat(Math.min(3, Math.max(1, Math.ceil(template.difficulty / 2)))),
    mode: ARENA_MODE,
    badgeId: template.badgeId,
    badgeName: badge?.name || template.badgeId,
    badgeIconName: badge?.iconName || "Trophy",
    reward: badge?.name || "Badge",
    promptType: template.promptType,
    prompt: buildPromptFromTemplate(template, `${dateKey}:${template.templateId}`),
    rules: template.rules,
    config: template.config,
    challengeCompleted: false,
    challengeFailed: false,
    challengeStreak: 0
  };
};

const getRecentChallengeIds = (history, timestampMs) => {
  const lowerBound = timestampMs - REUSE_WINDOW_MS;
  const recentEntries = history
    .filter((entry) => {
      if (typeof entry.createdAt === "number") return entry.createdAt >= lowerBound;
      if (typeof entry.date === "string") {
        const parsed = Date.parse(`${entry.date}T00:00:00.000Z`);
        return Number.isFinite(parsed) && parsed >= lowerBound;
      }
      return false;
    })
    .slice(0, 30);

  return new Set(recentEntries.map((entry) => entry.challengeId || entry.templateId).filter(Boolean));
};

const selectTemplateForDate = (dateKey, history, timestampMs = Date.now()) => {
  const recentIds = getRecentChallengeIds(history, timestampMs);
  const safeFallback = CHALLENGE_TEMPLATES.find((template) => template.templateId === "endurance-bronze") || CHALLENGE_TEMPLATES[0];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const random = createRandom(`${dateKey}:${attempt}`);
    const pool = CHALLENGE_TEMPLATES.filter((template) => !recentIds.has(template.templateId));
    if (pool.length > 0) {
      const candidate = pool[randomInt(random, 0, pool.length - 1)];
      if (candidate) return candidate;
    }

    const fallbackCandidate = CHALLENGE_TEMPLATES[randomInt(random, 0, CHALLENGE_TEMPLATES.length - 1)];
    if (fallbackCandidate && !recentIds.has(fallbackCandidate.templateId)) {
      return fallbackCandidate;
    }
  }

  return safeFallback;
};

const getCompletedHistory = (history) => history.filter((entry) => entry.completed === true);
const getLastCompletedEntry = (history) => [...getCompletedHistory(history)].sort((left, right) => right.completedAt - left.completedAt)[0] || null;

const updateTodayHistoryEntry = (state, timestampMs) => {
  const challengeId = state.challengeId || state.challenge?.id || state.id || "";
  const entry = {
    date: state.date,
    templateId: state.templateId,
    challengeId,
    badgeId: state.badgeId,
    title: state.title || state.challenge?.title || "",
    badgeName: state.badgeName || state.challenge?.badgeName || "",
    difficulty: state.difficulty,
    completed: Boolean(state.challengeCompleted),
    createdAt: state.createdAt || timestampMs,
    completedAt: state.completedAt || null,
    reward: state.reward || state.challenge?.reward || "",
    challengeStreak: state.challengeStreak || 0
  };

  const history = getDailyChallengeHistory();
  const matchExists = history.some((item) => item.date === entry.date && item.templateId === entry.templateId);
  if (matchExists) {
    updateDailyChallengeHistoryEntry(entry.date, (current) => ({ ...current, ...entry }));
    return;
  }

  appendDailyChallengeHistoryEntry(entry);
};

const buildInitialState = (template, dateKey, timestampMs) => {
  const instance = buildChallengeInstance(template, dateKey, timestampMs);
  return {
    date: dateKey,
    lastChallengeDate: dateKey,
    challengeCompleted: false,
    challengeCompletedToday: false,
    challengeFailed: false,
    completedAt: null,
    challengeStreak: 0,
    challenge: instance,
    challengeId: instance.id,
    templateId: template.templateId,
    badgeId: instance.badgeId,
    badgeName: instance.badgeName,
    badgeIconName: instance.badgeIconName
  };
};

export const getBadgeCatalog = () => BADGE_CATALOG.slice();
export const getChallengeTemplates = () => CHALLENGE_TEMPLATES.slice();
export const getChallengeTemplate = (templateId) => getChallengeTemplateById(templateId);
export const getChallengeBadge = (badgeId) => getBadgeById(badgeId);

export const ensureDailyChallenge = (timestampMs = Date.now()) => {
  const dateKey = utcDateKey(timestampMs);
  const storedState = getDailyChallengeState();
  if (storedState && storedState.date === dateKey && storedState.challenge) {
    return storedState;
  }

  const history = getDailyChallengeHistory();
  const selectedTemplate = selectTemplateForDate(dateKey, history, timestampMs);
  if (!selectedTemplate) return null;

  const nextState = buildInitialState(selectedTemplate, dateKey, timestampMs);
  setDailyChallengeState(nextState);
  updateTodayHistoryEntry(nextState, timestampMs);
  return nextState;
};

export const getDailyChallenge = (timestampMs = Date.now()) => ensureDailyChallenge(timestampMs);
export const getDailyChallengeStateSnapshot = () => getDailyChallengeState();
export const getDailyChallengeHistoryEntries = () => getDailyChallengeHistory().slice().sort((left, right) => right.createdAt - left.createdAt);
export const getDailyChallengeCompletedHistory = () => getCompletedHistory(getDailyChallengeHistory()).sort((left, right) => right.completedAt - left.completedAt);
export const getDailyChallengeRecentHistory = (limit = 6) => getDailyChallengeCompletedHistory().slice(0, Math.max(0, limit));
export const getChallengeHistoryForGallery = () => getDailyChallengeHistoryEntries();

export const getArenaChallengeProgress = (state, stats = {}) => {
  if (!state?.challenge) return null;
  const rules = state.challenge.rules || {};
  const progress = {
    wpm: Math.max(0, Number(stats.wpm) || 0),
    accuracy: Math.max(0, Number(stats.accuracy) || 0),
    elapsedSeconds: Math.max(0, Number(stats.elapsedSeconds) || 0),
    timeLimitSeconds: rules.timeLimitSeconds || null,
    holdSeconds: Math.max(0, Number(stats.holdSeconds) || 0),
    requiredHoldSeconds: rules.sustainSeconds || null,
    mistakes: Math.max(0, Number(stats.incorrectCharacters) || 0),
    allowedMistakes: rules.allowedMistakes || 0,
    backspaceUsed: Boolean(stats.backspaceUsed),
    promptHidden: Boolean(stats.promptHidden)
  };

  if (rules.timeLimitSeconds) progress.timeProgress = Math.min(1, progress.elapsedSeconds / rules.timeLimitSeconds);
  if (rules.targetWpm || rules.minWpm) progress.wpmProgress = Math.min(1, progress.wpm / (rules.targetWpm || rules.minWpm));
  if (rules.minAccuracy) progress.accuracyProgress = Math.min(1, progress.accuracy / rules.minAccuracy);
  if (rules.sustainSeconds) progress.holdProgress = Math.min(1, progress.holdSeconds / rules.sustainSeconds);

  return progress;
};

const meetsChallengeObjectives = (challenge, result, { requireHold = true } = {}) => {
  if (!challenge || !result) return false;
  const rules = challenge.rules || {};
  const wpm = Math.max(0, Number(result.wpm) || 0);
  const accuracy = Math.max(0, Number(result.accuracy) || 0);
  const timeUsed = Math.max(0, Number(result.timeUsed) || 0);
  const incorrectCharacters = Math.max(0, Number(result.incorrectCharacters) || 0);
  const holdSeconds = Math.max(0, Number(result.holdSeconds) || 0);
  const maxHoldWpm = Math.max(0, Number(result.maxHoldWpm) || 0);

  if (rules.noBackspace && result.backspaceUsed) return false;
  if (typeof rules.allowedMistakes === "number" && incorrectCharacters > rules.allowedMistakes) return false;
  if (typeof rules.minWpm === "number" && wpm < rules.minWpm) return false;
  if (typeof rules.minAccuracy === "number" && accuracy < rules.minAccuracy) return false;
  if (rules.timeLimitSeconds && timeUsed > rules.timeLimitSeconds) return false;
  if (rules.hideAfterSeconds && !result.promptHiddenUsed) return false;
  if (rules.targetWpm && maxHoldWpm < rules.targetWpm) return false;
  if (rules.sustainSeconds && requireHold && holdSeconds < rules.sustainSeconds) return false;
  return true;
};

const awardMilestoneBadges = () => {
  const history = getDailyChallengeCompletedHistory();
  const totalWins = history.length;
  const uniqueBadgeCount = new Set(history.map((entry) => entry.badgeId).filter(Boolean)).size;

  const milestoneTargets = [
    { badgeId: "milestone-first-blood", target: 1 },
    { badgeId: "milestone-challenger", target: 5 },
    { badgeId: "milestone-veteran", target: 10 },
    { badgeId: "milestone-legend", target: 25 },
    { badgeId: "milestone-master-of-all", target: 10, unique: true }
  ];

  milestoneTargets.forEach((milestone) => {
    const badge = BADGE_LOOKUP.get(milestone.badgeId);
    if (!badge) return;

    if (milestone.unique) {
      if (uniqueBadgeCount >= milestone.target) {
        saveBadge({ badgeId: badge.badgeId, name: badge.name, iconName: badge.iconName, earnedCount: 1, lastEarnedDate: utcDateKey() });
      }
      return;
    }

    if (totalWins >= milestone.target) {
      saveBadge({ badgeId: badge.badgeId, name: badge.name, iconName: badge.iconName, earnedCount: 1, lastEarnedDate: utcDateKey() });
    }
  });
};

export const completeChallenge = (result, timestampMs = Date.now()) => {
  const state = ensureDailyChallenge(timestampMs);
  if (!state || state.challengeCompletedToday || state.challengeCompleted) {
    const existingBadge = state?.challenge?.badgeId
      ? loadBadges().find((badge) => badge.badgeId === state.challenge.badgeId) || getBadgeById(state.challenge.badgeId) || {
          badgeId: state.challenge.badgeId,
          name: state.challenge.badgeName || state.challenge.reward || state.challenge.title || state.challenge.badgeId,
          iconName: state.challenge.badgeIconName || "Trophy"
        }
      : null;
    return { state, history: getDailyChallengeHistory(), completed: Boolean(state?.challengeCompleted || state?.challengeCompletedToday), alreadyCompleted: Boolean(state?.challengeCompletedToday || state?.challengeCompleted), badgeAwarded: existingBadge };
  }

  const challenge = state.challenge;
  const completed = meetsChallengeObjectives(challenge, result);
  if (!completed) {
    return { state, history: getDailyChallengeHistory(), completed: false, badgeAwarded: null };
  }

  const previousCompleted = getLastCompletedEntry(getDailyChallengeHistory());
  const yesterdayKey = utcDateKey(timestampMs - DAY_MS);
  const nextChallengeStreak = previousCompleted && previousCompleted.date === yesterdayKey ? (previousCompleted.challengeStreak || 0) + 1 : 1;

  const awardedBadge = updateBadgeCount(challenge.badgeId, {
    name: challenge.badgeName,
    iconName: challenge.badgeIconName
  }, timestampMs);

  awardMilestoneBadges();

  const completedState = {
    ...state,
    challengeCompleted: true,
    challengeCompletedToday: true,
    challengeFailed: false,
    completedAt: timestampMs,
    challengeStreak: nextChallengeStreak,
    badgeEarnedCount: awardedBadge?.earnedCount || 1
  };

  setDailyChallengeState(completedState);
  updateTodayHistoryEntry(completedState, timestampMs);

  return {
    state: completedState,
    history: getDailyChallengeHistory(),
    completed: true,
    badgeAwarded: awardedBadge
  };
};

export const completeDailyChallenge = completeChallenge;

export const failDailyChallenge = (timestampMs = Date.now()) => {
  const state = ensureDailyChallenge(timestampMs);
  if (!state || state.challengeCompleted) return state;

  const failedState = {
    ...state,
    challengeFailed: true,
    challengeCompleted: false,
    challengeCompletedToday: false
  };

  setDailyChallengeState(failedState);
  updateTodayHistoryEntry(failedState, timestampMs);
  return failedState;
};

export const getBadgeByChallengeId = (challengeId) => {
  const template = getChallengeTemplateById(challengeId);
  return template ? getBadgeById(template.badgeId) : null;
};

export const getDailyChallengeBadgeState = () => loadBadges();
export const getChallengeObjectiveStatus = (challenge, result) => meetsChallengeObjectives(challenge, result, { requireHold: false });
