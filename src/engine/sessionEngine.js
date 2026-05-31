import {
  CUSTOM_TIME_MAX_SECONDS,
  CUSTOM_TIME_MIN_SECONDS,
  DEFAULT_GOAL_WPM,
  GOAL_VARIANTS,
  TEST_DURATION_SECONDS,
  TYPING_MODES
} from "../constants/typingModes";
import { getRandomQuote } from "../data/quotes";
import { generateRandomParagraph, getFirstNWords, generateNumbersParagraph } from "../utils/paragraphGenerator";

export const DEFAULT_WORD_COUNT = 25;
export const QUOTE_LOADING_PLACEHOLDER = "Loading quote...";

export const getWordList = (text) => text.split(" ").filter((word) => word.length > 0);

export const getGeneratedTextForMode = (mode, wordCount) => {
  if (mode === TYPING_MODES.WORDS) {
    const sourceMin = Math.max(wordCount + 10, 35);
    const sourceMax = Math.max(wordCount + 25, sourceMin + 10);
    return getFirstNWords(generateRandomParagraph(sourceMin, sourceMax), wordCount);
  }

  if (mode === TYPING_MODES.NUMBERS) return generateNumbersParagraph();

  if (mode === TYPING_MODES.TIME) return generateRandomParagraph(30, 30);

  if (mode === TYPING_MODES.QUOTE) return getRandomQuote();

  return generateRandomParagraph();
};

export const normalizeMode = (value) => {
  const validModes = [TYPING_MODES.TIME, TYPING_MODES.WORDS, TYPING_MODES.QUOTE, TYPING_MODES.CUSTOM, TYPING_MODES.GOAL, TYPING_MODES.NUMBERS, TYPING_MODES.CHALLENGE_ARENA];
  return validModes.includes(value) ? value : TYPING_MODES.TIME;
};

export const normalizeGoalVariant = (value) => (value === GOAL_VARIANTS.REACH ? GOAL_VARIANTS.REACH : GOAL_VARIANTS.SUSTAIN);

export const normalizeTimeLimitSeconds = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return TEST_DURATION_SECONDS;
  return Math.min(Math.max(Math.round(parsed), CUSTOM_TIME_MIN_SECONDS), CUSTOM_TIME_MAX_SECONDS);
};

export const getBestWpmModeKey = ({ mode, wordCount, goalVariant, timeLimitSeconds }) => {
  if (mode === TYPING_MODES.WORDS) {
    const count = Number.isFinite(Number(wordCount)) ? Number(wordCount) : DEFAULT_WORD_COUNT;
    return `words${count}`;
  }

  if (mode === TYPING_MODES.GOAL) {
    return goalVariant === GOAL_VARIANTS.REACH ? "goalReach" : "goalSustain";
  }

  if (mode === TYPING_MODES.QUOTE) return "quote";
  if (mode === TYPING_MODES.CUSTOM) return "custom";
  if (mode === TYPING_MODES.NUMBERS) return "numbers";
  if (mode === TYPING_MODES.CHALLENGE_ARENA) return "challengeArena";
  if (mode === TYPING_MODES.TIME) return timeLimitSeconds > TEST_DURATION_SECONDS ? "time" : "time";

  return "time";
};

export const serializeTypingResult = ({
  now = Date.now(),
  mode,
  wordCount,
  goalVariant,
  timeLimitSeconds,
  wpm,
  accuracy,
  correctCharacters,
  incorrectCharacters,
  completedWords,
  typedText,
  promptText = "",
  mistypedCharacters,
  timeUsed,
  previousBest,
  goalSuccess,
  challenge,
  challengeStreak = 0,
  hasTextFaded = false,
  backspaceUsed = false,
  holdSeconds = 0,
  maxHoldWpm = 0,
  promptHiddenUsed = false,
  typedWordCount = 0
}) => {
  const currentBestKey = getBestWpmModeKey({ mode, wordCount, goalVariant, timeLimitSeconds });

  return {
    id: now,
    mode,
    wordCount: mode === TYPING_MODES.WORDS ? wordCount : null,
    goalVariant: mode === TYPING_MODES.GOAL ? goalVariant : null,
    timeLimitSeconds: mode === TYPING_MODES.TIME || mode === TYPING_MODES.GOAL ? timeLimitSeconds : null,
    modeKey: currentBestKey,
    wpm,
    accuracy,
    correctCharacters,
    incorrectCharacters,
    completedWords,
    typedWordCount,
    mistypedCharacters,
    timeUsed,
    previousBest,
    improvedBest: wpm > previousBest,
    goalSuccess,
    challengeId: challenge?.id || null,
    challengeTitle: challenge?.title || null,
    challengeReward: challenge?.reward || null,
    challengeBadgeId: challenge?.badgeId || challenge?.id || null,
    challengeBadgeName: challenge?.badgeName || challenge?.reward || challenge?.title || null,
    challengeBadgeIconName: challenge?.badgeIconName || "Trophy",
    challengeEarnedCount: 0,
    challengeCompleted: false,
    challengeCompletedToday: false,
    challengeFailed: false,
    challengeStreak,
    typedText,
    promptText,
    typedCharacterCount: typedText.length,
    hasTextFaded,
    backspaceUsed,
    holdSeconds,
    maxHoldWpm,
    promptHiddenUsed
  };
};

export const getDefaultGoalWpm = () => DEFAULT_GOAL_WPM;