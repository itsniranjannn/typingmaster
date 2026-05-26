import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TYPING_MODES,
  TEST_DURATION_SECONDS,
  DEFAULT_GOAL_WPM,
  GOAL_VARIANTS,
  CUSTOM_TIME_MIN_SECONDS,
  CUSTOM_TIME_MAX_SECONDS,
  UNIVERSAL_MODES
} from "../constants/typingModes";
import { getRandomQuote, fetchRandomQuote } from "../data/quotes";
import { generateRandomParagraph, getFirstNWords, generateNumbersParagraph, generateEndlessChunk } from "../utils/paragraphGenerator";
import { useTypingSounds } from "./useTypingSounds";
import { calculateAccuracy, calculateWpm } from "../utils/typingStats";
import confetti from "canvas-confetti";
import {
  addResult,
  getBestWpmByMode,
  getStreak,
  updateStreakWithTimestamp,
  getDailyGoalProgress,
  incrementDailyGoalProgress,
  getChallengeAttemptsToday,
  syncLeaderboard,
  updateLeaderboard,
  getPreferredMode,
  getPreferredGoalVariant,
  getPreferredTimeLimitSeconds,
  getSoundEnabled,
  setBestWpmByMode,
  setPreferredMode,
  setPreferredGoalVariant,
  setPreferredTimeLimitSeconds,
  setSoundEnabled
} from "../utils/storage";
import {
  completeChallenge,
  failDailyChallenge,
  getArenaChallengeProgress,
  getDailyChallenge,
  getDailyChallengeRecentHistory,
  getChallengeObjectiveStatus
} from "../utils/dailyChallenge";

const DEFAULT_WORD_COUNT = 25;
const QUOTE_LOADING_PLACEHOLDER = "Loading quote...";
const getWordList = (text) => text.split(" ").filter((word) => word.length > 0);
const getGeneratedTextForMode = (mode, wordCount) => {
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

const normalizeMode = (value) => {
  const validModes = [TYPING_MODES.TIME, TYPING_MODES.WORDS, TYPING_MODES.QUOTE, TYPING_MODES.CUSTOM, TYPING_MODES.GOAL, TYPING_MODES.NUMBERS, TYPING_MODES.CHALLENGE_ARENA];
  return validModes.includes(value) ? value : TYPING_MODES.TIME;
};

const normalizeGoalVariant = (value) => (value === GOAL_VARIANTS.REACH ? GOAL_VARIANTS.REACH : GOAL_VARIANTS.SUSTAIN);

const normalizeTimeLimitSeconds = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return TEST_DURATION_SECONDS;
  return Math.min(Math.max(Math.round(parsed), CUSTOM_TIME_MIN_SECONDS), CUSTOM_TIME_MAX_SECONDS);
};

const getBestWpmModeKey = ({ mode, wordCount, goalVariant, timeLimitSeconds }) => {
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

export const useTypingTest = () => {
  const initialMode = normalizeMode(getPreferredMode());
  const initialGoalVariant = normalizeGoalVariant(getPreferredGoalVariant());
  const initialTimeLimitSeconds = normalizeTimeLimitSeconds(getPreferredTimeLimitSeconds());
  const initialParagraphRef = useRef(getGeneratedTextForMode(initialMode, DEFAULT_WORD_COUNT));
  const [mode, setMode] = useState(initialMode);
  const [wordCount, setWordCount] = useState(DEFAULT_WORD_COUNT);
  const [targetWpm, setTargetWpm] = useState(DEFAULT_GOAL_WPM);
  const [goalVariant, setGoalVariant] = useState(initialGoalVariant);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(initialTimeLimitSeconds);
  const [customText, setCustomText] = useState("");
  const [paragraph, setParagraph] = useState(initialParagraphRef.current);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [textLoadingMessage, setTextLoadingMessage] = useState("");
  const [typedText, setTypedText] = useState("");
  const [timeLeft, setTimeLeft] = useState(initialTimeLimitSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(getSoundEnabled());
  const [bestWpmByMode, setBestWpmByModeState] = useState(() => getBestWpmByMode());
  const [streakInfo, setStreakInfo] = useState(() => getStreak());
  const [dailyGoalProgress, setDailyGoalProgress] = useState(() => getDailyGoalProgress());
  const [dailyChallenge, setDailyChallenge] = useState(() => getDailyChallenge());
  const [dailyChallengeHistory, setDailyChallengeHistory] = useState(() => getDailyChallengeRecentHistory());
  const [challengeAttemptsToday, setChallengeAttemptsToday] = useState(() => getChallengeAttemptsToday());
  const [challengePromptHidden, setChallengePromptHidden] = useState(false);
  const [challengeHasTextFaded, setChallengeHasTextFaded] = useState(false);
  const [fadedWords, setFadedWords] = useState([]);
  const [missedWords, setMissedWords] = useState([]);
  const [challengeFailed, setChallengeFailed] = useState(false);
  const [challengeWarningMessage, setChallengeWarningMessage] = useState("");
  const [liveWpm, setLiveWpm] = useState(0);
  const [finalResult, setFinalResult] = useState(null);
  const [engineSnapshot, setEngineSnapshot] = useState({
    correctCharacters: 0,
    incorrectCharacters: 0,
    completedWords: 0,
    currentWordIndex: 0,
    isCurrentWordCorrect: true,
    totalWords: 0,
    isWordLimitReached: false
  });

  const hasSavedResultRef = useRef(false);
  const isTestFinishedRef = useRef(false);
  const goalAchievedSecondsRef = useRef(0);
  const timerRef = useRef(null);
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const currentIndexRef = useRef(0);
  const currentWordRef = useRef("");
  const currentWordIndexRef = useRef(0);
  const completedWordsRef = useRef(0);
  const correctCompletedWordsRef = useRef(0);
  const typedWordsRef = useRef([]);
  const wordCorrectnessRef = useRef([]);
  const mistypedCharactersRef = useRef([]);
  const targetWordsRef = useRef(getWordList(initialParagraphRef.current));
  const liveWpmTimerRef = useRef(null);
  const triggeredMilestonesRef = useRef(new Set());
  const hasTriggeredMilestoneRef = useRef(false);
  const goalMilestoneResetTimerRef = useRef(null);
  const latestRawWpmRef = useRef(0);
  const latestLiveWpmRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const testStartTimestampRef = useRef(null);
  const lastWordBoundaryRef = useRef(0);
  const canDeleteTrailingSpaceRef = useRef(false);
  const loadingDelayTimerRef = useRef(null);
  const challengeHideTimerRef = useRef(null);
  const challengeFadeTimerRef = useRef(null);
  const wordFadeTimersRef = useRef(new Map());
  const wordIdleTimersRef = useRef(new Map());
  const wordTypedOnceRef = useRef(new Set());
  const memoryIdleTimerRef = useRef(null);
  const currentArenaChallengeRef = useRef(null);
  const challengeWarningTimerRef = useRef(null);
  const quoteRequestIdRef = useRef(0);
  const lastAppendedElapsedRef = useRef(0);
  const lastAppendedCorrectCharsRef = useRef(0);
  const lastAppendTriggerRef = useRef("");
  const fadedWordsRef = useRef([]);
  const arenaPreviousModeRef = useRef(null);
  const arenaBackspaceUsedRef = useRef(false);
  const arenaHoldSecondsRef = useRef(0);
  const arenaMaxHoldWpmRef = useRef(0);
  const currentBestKey = useMemo(
    () => getBestWpmModeKey({ mode, wordCount, goalVariant, timeLimitSeconds }),
    [goalVariant, mode, timeLimitSeconds, wordCount]
  );
  const bestWpm = useMemo(() => bestWpmByMode[currentBestKey] || 0, [bestWpmByMode, currentBestKey]);
  const activeArenaChallenge = dailyChallenge?.challenge || null;
  const arenaRules = activeArenaChallenge?.rules || {};
  const isArenaMode = mode === TYPING_MODES.CHALLENGE_ARENA;
  const isArenaChallengeLocked = Boolean(dailyChallenge?.challengeCompletedToday || dailyChallenge?.challengeCompleted || challengeAttemptsToday?.locked);
  const {
    playCorrectKey,
    playMilestoneSound,
    playIncorrectKeyForWord,
    volume,
    setVolume,
    resetWordsWithError
  } = useTypingSounds(isSoundEnabled);

  useEffect(() => {
    fadedWordsRef.current = fadedWords;
  }, [fadedWords]);

  const isFinished = useMemo(() => {
    if (isArenaMode) {
      if (challengeFailed) return true;
      if (arenaRules.sustainSeconds && arenaHoldSecondsRef.current >= arenaRules.sustainSeconds) return true;
      if (arenaRules.timeLimitSeconds && timeLeft === 0) return true;
      return paragraph.length > 0 && typedText.length >= paragraph.length;
    }

    if (mode === TYPING_MODES.TIME) return timeLeft === 0;
    if (mode === TYPING_MODES.WORDS) return engineSnapshot.isWordLimitReached;
    if (mode === TYPING_MODES.GOAL) {
      if (goalVariant === GOAL_VARIANTS.REACH) {
        return timeLeft === 0 || engineSnapshot.isWordLimitReached;
      }
      return goalAchievedSecondsRef.current >= 5 || timeLeft === 0;
    }
    return paragraph.length > 0 && typedText.length >= paragraph.length;
  }, [arenaRules.sustainSeconds, arenaRules.timeLimitSeconds, challengeFailed, engineSnapshot.isWordLimitReached, goalVariant, isArenaMode, mode, paragraph.length, timeLeft, typedText.length]);

  const commitSnapshot = useCallback(() => {
    const totalWords = targetWordsRef.current.length;
    const finalWordIndex = Math.max(totalWords - 1, 0);
    const currentWordIndex = Math.min(currentWordIndexRef.current, finalWordIndex);
    const currentTargetWord = targetWordsRef.current[currentWordIndexRef.current] || "";
    const isCurrentWordCorrect = currentTargetWord.startsWith(currentWordRef.current);
    const isLastWordComplete =
      currentWordIndexRef.current >= finalWordIndex &&
      currentWordRef.current === (targetWordsRef.current[finalWordIndex] || "");
    const isAtTextEnd = paragraph.length > 0 && currentIndexRef.current >= paragraph.length;
    const completedWords = isLastWordComplete
      ? totalWords
      : Math.min(completedWordsRef.current, totalWords);
    const isWordLimitReached =
      totalWords === 0 || completedWords >= totalWords || isLastWordComplete || isAtTextEnd;

    setEngineSnapshot({
      correctCharacters: correctCharsRef.current,
      incorrectCharacters: incorrectCharsRef.current,
      completedWords,
      currentWordIndex,
      isCurrentWordCorrect,
      totalWords,
      isWordLimitReached
    });
  }, [paragraph.length]);

  const clearLoadingDelay = useCallback(() => {
    if (loadingDelayTimerRef.current) {
      window.clearTimeout(loadingDelayTimerRef.current);
      loadingDelayTimerRef.current = null;
    }
  }, []);

  const showDelayedGenerationMessage = useCallback(() => {
    clearLoadingDelay();
    setIsTextLoading(false);
    setTextLoadingMessage("");
    loadingDelayTimerRef.current = window.setTimeout(() => {
      setIsTextLoading(true);
      setTextLoadingMessage("Generating new text...");
      loadingDelayTimerRef.current = null;
    }, 100);
  }, [clearLoadingDelay]);

  const hideLoadingMessage = useCallback(() => {
    clearLoadingDelay();
    setIsTextLoading(false);
    setTextLoadingMessage("");
  }, [clearLoadingDelay]);

  const clearMemoryWordIdleTimer = useCallback((wordIndex) => {
    const timerId = wordIdleTimersRef.current.get(wordIndex);
    if (timerId) {
      window.clearTimeout(timerId);
      wordIdleTimersRef.current.delete(wordIndex);
    }
  }, []);

  const clearMemoryIdleTimer = useCallback(() => {
    if (memoryIdleTimerRef.current) {
      window.clearTimeout(memoryIdleTimerRef.current);
      memoryIdleTimerRef.current = null;
    }
  }, []);

  // Clear both single-shot idle timer and continuous fade interval
  const clearAllMemoryFadeTimers = useCallback(() => {
    if (memoryIdleTimerRef.current) {
      window.clearTimeout(memoryIdleTimerRef.current);
      memoryIdleTimerRef.current = null;
    }
    if (continuousFadeIntervalRef.current) {
      window.clearInterval(continuousFadeIntervalRef.current);
      continuousFadeIntervalRef.current = null;
    }
  }, []);

  // Interval used to continuously fade subsequent words while the user remains idle
  const continuousFadeIntervalRef = useRef(null);

  const clearContinuousFadeInterval = useCallback(() => {
    if (continuousFadeIntervalRef.current) {
      window.clearInterval(continuousFadeIntervalRef.current);
      continuousFadeIntervalRef.current = null;
    }
  }, []);

  // timestamp of the last typing event (ms)
  const lastTypingTimeRef = useRef(0);
  const TYPING_ACTIVE_WINDOW_MS = 1200;

  const computeFadeDelaySeconds = useCallback(() => {
    const fast = Math.max(2, Number(arenaRules.hideAfterSeconds ?? 2));
    const slow = Math.max(fast * 2, 4);
    const now = Date.now();
    if (now - lastTypingTimeRef.current < TYPING_ACTIVE_WINDOW_MS) return slow;
    return fast;
  }, [arenaRules.hideAfterSeconds]);
  
  const startContinuousFadeLoop = useCallback(() => {
    if (continuousFadeIntervalRef.current) return;
    const run = () => {
      let nextIndex = -1;
      for (let i = 0; i < targetWordsRef.current.length; i += 1) {
        if (!fadedWordsRef.current.includes(i)) {
          nextIndex = i;
          break;
        }
      }

      if (nextIndex < 0) {
        clearAllMemoryFadeTimers();
        return;
      }

      // mark as missed (inline to avoid referencing hoisted callbacks)
      setFadedWords((prev) => (prev.includes(nextIndex) ? prev : [...prev, nextIndex]));
      setMissedWords((prev) => (prev.includes(nextIndex) ? prev : [...prev, nextIndex]));
      setChallengeHasTextFaded(true);
      setChallengeWarningMessage("Word faded. Keep going.");
      if (challengeWarningTimerRef.current) {
        window.clearTimeout(challengeWarningTimerRef.current);
      }
      challengeWarningTimerRef.current = window.setTimeout(() => {
        setChallengeWarningMessage("");
        challengeWarningTimerRef.current = null;
      }, 1500);

      const delay = computeFadeDelaySeconds() * 1000;
      continuousFadeIntervalRef.current = window.setTimeout(run, delay);
    };

    const initialDelay = computeFadeDelaySeconds() * 1000;
    continuousFadeIntervalRef.current = window.setTimeout(run, initialDelay);
  }, [clearAllMemoryFadeTimers, computeFadeDelaySeconds]);

  


  function getFirstUnfadedMemoryWordIndex() {
    for (let index = 0; index < targetWordsRef.current.length; index += 1) {
      if (!fadedWordsRef.current.includes(index)) {
        return index;
      }
    }
    return -1;
  }

  function markMemoryWordMissed(wordIndex) {
    setFadedWords((prev) => {
      const newFaded = prev.includes(wordIndex) ? prev : [...prev, wordIndex];
      return newFaded;
    });
    setMissedWords((prev) => (prev.includes(wordIndex) ? prev : [...prev, wordIndex]));
    setChallengeHasTextFaded(true);
    setChallengeWarningMessage("Word faded. Keep going.");
    if (challengeWarningTimerRef.current) {
      window.clearTimeout(challengeWarningTimerRef.current);
    }
    challengeWarningTimerRef.current = window.setTimeout(() => {
      setChallengeWarningMessage("");
      challengeWarningTimerRef.current = null;
    }, 1500);
  }

  const scheduleMemoryIdleFade = useCallback(() => {
    const isMemoryChallenge = currentArenaChallengeRef.current?.family === "memory";
    const hasHideAfterSeconds = typeof arenaRules.hideAfterSeconds === "number" && arenaRules.hideAfterSeconds > 0;
    const shouldFade = mode === TYPING_MODES.CHALLENGE_ARENA && isMemoryChallenge && hasHideAfterSeconds && !isFinished;
    if (!shouldFade) return;

    // If continuous loop already running, leave it running; it will adapt delay based on typing
    if (continuousFadeIntervalRef.current) return;

    // If a single-shot idle timer is already scheduled, don't schedule another
    if (memoryIdleTimerRef.current) return;

    const fadeDelay = Math.max(1, Number(arenaRules.hideAfterSeconds || 3));

    const startContinuousFade = () => {
      memoryIdleTimerRef.current = null;
      const firstIndex = getFirstUnfadedMemoryWordIndex();
      if (firstIndex < 0) return;

      markMemoryWordMissed(firstIndex);
      // start adaptive continuous loop
      startContinuousFadeLoop();
    };

    memoryIdleTimerRef.current = window.setTimeout(startContinuousFade, fadeDelay * 1000);
  }, [currentArenaChallengeRef, getFirstUnfadedMemoryWordIndex, isFinished, markMemoryWordMissed, mode, arenaRules.hideAfterSeconds, startContinuousFadeLoop]);

  const scheduleMemoryWordIdleTimer = useCallback((wordIndex) => {
    if (mode !== TYPING_MODES.CHALLENGE_ARENA || currentArenaChallengeRef.current?.family !== "memory") return;
    if (wordIndex < 0 || wordIndex >= targetWordsRef.current.length) return;
    if (wordTypedOnceRef.current.has(wordIndex)) return;

    clearMemoryWordIdleTimer(wordIndex);

    const fadeDelay = Math.max(1, Number(arenaRules.hideAfterSeconds || 3));
    const timerId = window.setTimeout(() => {
      wordIdleTimersRef.current.delete(wordIndex);
      if (wordTypedOnceRef.current.has(wordIndex)) return;
      markMemoryWordMissed(wordIndex);
    }, fadeDelay * 1000);

    wordIdleTimersRef.current.set(wordIndex, timerId);
  }, [arenaRules.hideAfterSeconds, clearMemoryWordIdleTimer, markMemoryWordMissed, mode]);

  const resetTypingState = useCallback(
    ({
      nextMode = mode,
      nextWordCount = wordCount,
      nextParagraph = null,
      nextCustomText = "",
      nextGoalVariant = goalVariant,
      nextTimeLimitSeconds = timeLimitSeconds,
      nextTargetWpm = targetWpm,
      nextChallenge = null
    } = {}) => {
      const shouldGenerateText = !nextParagraph && !nextCustomText;
      const isQuoteMode = nextMode === TYPING_MODES.QUOTE && shouldGenerateText;
      const isArenaMode = nextMode === TYPING_MODES.CHALLENGE_ARENA;
      const arenaChallenge = nextChallenge || dailyChallenge?.challenge || null;

      if (shouldGenerateText && !isQuoteMode) {
        showDelayedGenerationMessage();
      }

      const updatedParagraph = nextParagraph ?? (
        nextCustomText || (isQuoteMode
          ? QUOTE_LOADING_PLACEHOLDER
          : isArenaMode && arenaChallenge
            ? arenaChallenge.prompt
          : getGeneratedTextForMode(nextMode, nextWordCount))
      );

      // Clear any running memory-fade timers when resetting the state
      clearAllMemoryFadeTimers();

      if (nextMode !== mode) {
        setMode(nextMode);
      }
      if (nextWordCount !== wordCount) {
        setWordCount(nextWordCount);
      }
      if (nextGoalVariant !== goalVariant) {
        setGoalVariant(nextGoalVariant);
      }
      if (nextTimeLimitSeconds !== timeLimitSeconds) {
        setTimeLimitSeconds(nextTimeLimitSeconds);
      }
      if (nextTargetWpm !== targetWpm) {
        setTargetWpm(nextTargetWpm);
      }
      if (nextCustomText) {
        setCustomText(nextCustomText);
      }
      if (isArenaMode) {
        currentArenaChallengeRef.current = arenaChallenge;
        arenaBackspaceUsedRef.current = false;
        arenaHoldSecondsRef.current = 0;
        arenaMaxHoldWpmRef.current = 0;
        setChallengePromptHidden(false);
        setChallengeHasTextFaded(false);
        setFadedWords([]);
        setMissedWords([]);
        wordTypedOnceRef.current = new Set();
        setChallengeFailed(false);
        setChallengeWarningMessage("");
      } else {
        currentArenaChallengeRef.current = null;
        arenaBackspaceUsedRef.current = false;
        arenaHoldSecondsRef.current = 0;
        arenaMaxHoldWpmRef.current = 0;
        setChallengePromptHidden(false);
        setChallengeHasTextFaded(false);
        setMissedWords([]);
        wordTypedOnceRef.current = new Set();
        setChallengeFailed(false);
        setChallengeWarningMessage("");
      }

      if (nextMode !== TYPING_MODES.QUOTE) {
        quoteRequestIdRef.current += 1;
      }

      targetWordsRef.current = getWordList(updatedParagraph);
      correctCharsRef.current = 0;
      incorrectCharsRef.current = 0;
      currentIndexRef.current = 0;
      currentWordRef.current = "";
      currentWordIndexRef.current = 0;
      completedWordsRef.current = 0;
      correctCompletedWordsRef.current = 0;
      typedWordsRef.current = [];
      wordCorrectnessRef.current = [];
      mistypedCharactersRef.current = [];
      lastWordBoundaryRef.current = 0;
      canDeleteTrailingSpaceRef.current = false;
      resetWordsWithError();
      lastAppendedElapsedRef.current = 0;
      lastAppendedCorrectCharsRef.current = 0;

      setParagraph(updatedParagraph);
      setTypedText("");
      setTimeLeft(nextMode === TYPING_MODES.TIME || nextMode === TYPING_MODES.GOAL ? nextTimeLimitSeconds : TEST_DURATION_SECONDS);
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;
      testStartTimestampRef.current = null;
      setIsComposing(false);
      setHasStarted(false);
      setIsActive(false);
      setFinalResult(null);
      setEngineSnapshot({
        correctCharacters: 0,
        incorrectCharacters: 0,
        completedWords: 0,
        currentWordIndex: 0,
        isCurrentWordCorrect: true,
        totalWords: getWordList(updatedParagraph).length,
        isWordLimitReached: false
      });
      hasSavedResultRef.current = false;
      isTestFinishedRef.current = false;
      goalAchievedSecondsRef.current = 0;
      hasTriggeredMilestoneRef.current = false;
      triggeredMilestonesRef.current.clear();
      if (goalMilestoneResetTimerRef.current) {
        window.clearTimeout(goalMilestoneResetTimerRef.current);
        goalMilestoneResetTimerRef.current = null;
      }
      latestRawWpmRef.current = 0;
      latestLiveWpmRef.current = 0;
      setDailyGoalProgress(getDailyGoalProgress());
      setStreakInfo(getStreak());
      setLiveWpm(0);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (liveWpmTimerRef.current) {
        window.clearTimeout(liveWpmTimerRef.current);
        liveWpmTimerRef.current = null;
      }
      if (challengeHideTimerRef.current) {
        window.clearTimeout(challengeHideTimerRef.current);
        challengeHideTimerRef.current = null;
      }
      if (challengeFadeTimerRef.current) {
        window.clearTimeout(challengeFadeTimerRef.current);
        challengeFadeTimerRef.current = null;
      }
      clearMemoryIdleTimer();
      // clear per-word idle/fade timers
      try {
        for (const t of wordFadeTimersRef.current.values()) {
          window.clearTimeout(t);
        }
        for (const t of wordIdleTimersRef.current.values()) {
          window.clearTimeout(t);
        }
      } catch (e) {}
      wordFadeTimersRef.current.clear();
      wordIdleTimersRef.current.clear();
      if (challengeWarningTimerRef.current) {
        window.clearTimeout(challengeWarningTimerRef.current);
        challengeWarningTimerRef.current = null;
      }
      setFocusTrigger((previous) => previous + 1);

      if (isQuoteMode) {
        setIsTextLoading(true);
        setTextLoadingMessage("Loading quote...");
        const requestId = quoteRequestIdRef.current + 1;
        quoteRequestIdRef.current = requestId;

        fetchRandomQuote({ timeoutMs: 2000 })
          .then((quote) => {
            if (requestId !== quoteRequestIdRef.current) return;
            const nextQuote = quote.trim();
            if (!nextQuote) return;
            targetWordsRef.current = getWordList(nextQuote);
            setParagraph(nextQuote);
            setTypedText("");
            setElapsedSeconds(0);
            elapsedSecondsRef.current = 0;
            setTimeLeft(TEST_DURATION_SECONDS);
            currentIndexRef.current = 0;
            currentWordRef.current = "";
            currentWordIndexRef.current = 0;
            completedWordsRef.current = 0;
            correctCompletedWordsRef.current = 0;
            mistypedCharactersRef.current = [];
            setEngineSnapshot({
              correctCharacters: 0,
              incorrectCharacters: 0,
              completedWords: 0,
              currentWordIndex: 0,
              isCurrentWordCorrect: true,
              totalWords: getWordList(nextQuote).length,
              isWordLimitReached: false
            });
          })
          .finally(() => {
            if (requestId !== quoteRequestIdRef.current) return;
            hideLoadingMessage();
          });
      } else {
        hideLoadingMessage();
      }
    },
    [clearMemoryIdleTimer, dailyChallenge, goalVariant, hideLoadingMessage, isArenaMode, mode, resetWordsWithError, showDelayedGenerationMessage, targetWpm, timeLimitSeconds, wordCount]
  );

  const finishTest = useCallback(() => {
    if (isTestFinishedRef.current) return;
    isTestFinishedRef.current = true;
      const attempts = getChallengeAttemptsToday();
      if (attempts.locked || dailyChallenge?.challengeCompletedToday || dailyChallenge?.challengeCompleted) {
        setChallengeWarningMessage(attempts.locked ? "Daily challenge locked. Try tomorrow." : "Challenge already completed today.");
        if (challengeWarningTimerRef.current) {
          window.clearTimeout(challengeWarningTimerRef.current);
        }
        challengeWarningTimerRef.current = window.setTimeout(() => {
          setChallengeWarningMessage("");
          challengeWarningTimerRef.current = null;
        }, 2200);
        return;
      }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsActive(false);
    commitSnapshot();
    if (mode !== TYPING_MODES.GOAL) {
      setTimeLeft(0);
    }
  }, [commitSnapshot, mode]);

  useEffect(() => {
    return () => {
      clearLoadingDelay();
    };
  }, [clearLoadingDelay]);

  useEffect(() => {
    if (!hasStarted || isFinished || !isActive) return;

    // ensure no duplicate timers
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((previousElapsed) => {
        const nextElapsed = previousElapsed + 1;
        elapsedSecondsRef.current = nextElapsed;

        if (mode === TYPING_MODES.CHALLENGE_ARENA) {
          if (arenaRules.timeLimitSeconds) {
            setTimeLeft((previousTime) => {
              const nextTime = previousTime <= 1 ? 0 : previousTime - 1;
              if (nextTime === 0 && !isTestFinishedRef.current) {
                finishTest();
              }
              return nextTime;
            });
          }

          if (arenaRules.sustainSeconds) {
            const arenaTargetWpm = Number(arenaRules.targetWpm || arenaRules.minWpm || targetWpm || DEFAULT_GOAL_WPM);
            const currentWpm = latestRawWpmRef.current;
            const currentAccuracy = Math.max(0, Math.min(100, Number(calculateAccuracy(correctCharsRef.current, currentIndexRef.current)) || 0));
            const meetsChallengeNow = getChallengeObjectiveStatus(dailyChallenge?.challenge, {
              wpm: currentWpm,
              accuracy: currentAccuracy,
              timeUsed: nextElapsed,
              incorrectCharacters: engineSnapshot.incorrectCharacters,
              backspaceUsed: arenaBackspaceUsedRef.current,
              promptHiddenUsed: challengePromptHidden || challengeHasTextFaded,
              hasTextFaded: challengeHasTextFaded,
              maxHoldWpm: Math.max(arenaMaxHoldWpmRef.current, currentWpm),
              holdSeconds: arenaHoldSecondsRef.current
            });

            if (meetsChallengeNow && currentWpm >= arenaTargetWpm) {
              arenaHoldSecondsRef.current += 1;
              arenaMaxHoldWpmRef.current = Math.max(arenaMaxHoldWpmRef.current, currentWpm);
              if (arenaHoldSecondsRef.current >= arenaRules.sustainSeconds && !isTestFinishedRef.current) {
                finishTest();
              }
            } else {
              arenaHoldSecondsRef.current = 0;
            }
          }
        }

        if (mode === TYPING_MODES.GOAL) {
          setTimeLeft((previousTime) => {
            const nextTime = previousTime <= 1 ? 0 : previousTime - 1;
            if (nextTime === 0 && !isTestFinishedRef.current) {
              finishTest();
            }
            return nextTime;
          });

          if (goalVariant === GOAL_VARIANTS.SUSTAIN) {
            // Avoid premature spikes in the first few seconds by only starting
            // the goal check after a short warm-up (e.g., 3 seconds).
            const warmupSeconds = 3;
            const currentWpm = latestLiveWpmRef.current;
            if (nextElapsed >= warmupSeconds && currentWpm >= targetWpm) {
              goalAchievedSecondsRef.current += 1;
              if (goalAchievedSecondsRef.current >= 5 && !isTestFinishedRef.current) {
                finishTest();
              }
            } else {
              goalAchievedSecondsRef.current = 0;
            }
          }
        }

        // Time mode: finish at 0 seconds
        if (mode === TYPING_MODES.TIME) {
          setTimeLeft((previousTime) => {
            const nextTime = previousTime <= 1 ? 0 : previousTime - 1;
            if (nextTime === 0 && !isTestFinishedRef.current) {
              finishTest();
            }
            return nextTime;
          });
        }

        return nextElapsed;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [arenaRules.minAccuracy, arenaRules.sustainSeconds, arenaRules.targetWpm, arenaRules.timeLimitSeconds, challengeHasTextFaded, challengePromptHidden, dailyChallenge, finishTest, goalVariant, hasStarted, isFinished, mode, targetWpm]);

  // Control helpers for keyboard shortcuts
  const startTest = useCallback(() => {
    if (!hasStarted) setHasStarted(true);
    if (!isActive) setIsActive(true);
  }, [hasStarted, isActive]);

  const pauseTest = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);

  const toggleActive = useCallback(() => {
    setIsActive((prev) => {
      const next = !prev;
      if (!next && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return next;
    });
  }, []);

  const focusTypingInput = useCallback(() => {
    setFocusTrigger((previous) => previous + 1);
  }, []);

  const recalculateFromText = useCallback(
    (text) => {
      correctCharsRef.current = 0;
      incorrectCharsRef.current = 0;
      currentIndexRef.current = text.length;
      currentWordRef.current = "";
      currentWordIndexRef.current = 0;
      completedWordsRef.current = 0;
      correctCompletedWordsRef.current = 0;
      typedWordsRef.current = [];
      wordCorrectnessRef.current = [];
      mistypedCharactersRef.current = [];

      for (let index = 0; index < text.length; index += 1) {
        const typedChar = text[index];
        const targetChar = paragraph[index];
        if (typedChar === targetChar) {
          correctCharsRef.current += 1;
        } else {
          incorrectCharsRef.current += 1;
          mistypedCharactersRef.current.push(typedChar);
        }

        if (typedChar === " ") {
          const targetWord = targetWordsRef.current[currentWordIndexRef.current] || "";
          const typedWord = currentWordRef.current;
          const isCorrectWord = typedWord === targetWord;

          typedWordsRef.current.push(typedWord);
          wordCorrectnessRef.current.push(isCorrectWord);
          if (isCorrectWord) {
            correctCompletedWordsRef.current += 1;
          }

          completedWordsRef.current += 1;
          currentWordIndexRef.current += 1;
          currentWordRef.current = "";
        } else {
          currentWordRef.current += typedChar;
        }
      }

      lastWordBoundaryRef.current = text.lastIndexOf(" ") + 1;
      canDeleteTrailingSpaceRef.current = text.endsWith(" ");

      commitSnapshot();
    },
    [commitSnapshot, paragraph]
  );

  const handleTyping = useCallback(
    (value, options = {}) => {
      const { skipEngine = false, forceRecalc = false, composing } = options;
      if (typeof composing === "boolean") {
        setIsComposing(composing);
      }
      if (isFinished) return;
      if (isTextLoading) return;

      if (!paragraph || paragraph.length === 0) {
        return;
      }

      const nextValue = value.slice(0, paragraph.length);
      if (!hasStarted && nextValue.length > 0) {
        setHasStarted(true);
        setIsActive(true);
        if (!testStartTimestampRef.current) {
          testStartTimestampRef.current = Date.now();
        }
      }

      if (skipEngine) {
        setTypedText(nextValue);
        return;
      }

      if (forceRecalc) {
        recalculateFromText(nextValue);
        setTypedText(nextValue);
        return;
      }

      if (nextValue === typedText) return;

      const isAppend =
        nextValue.length === typedText.length + 1 && nextValue.startsWith(typedText);
      const isBackspace =
        nextValue.length === typedText.length - 1 && typedText.startsWith(nextValue);

      if (!isAppend && !isBackspace) {
        // Fallback for edits in the middle or unexpected input shapes.
        recalculateFromText(nextValue);
        setTypedText(nextValue);
        return;
      }

      if (isAppend) {
        const typedIndex = nextValue.length - 1;
        const newChar = nextValue[typedIndex];
        const targetChar = paragraph[typedIndex];
        const isCorrectCharacter = newChar === targetChar;
        const currentWordIndex = currentWordIndexRef.current;

        if (mode === TYPING_MODES.CHALLENGE_ARENA && currentArenaChallengeRef.current?.family === "memory") {
          lastTypingTimeRef.current = Date.now();
          scheduleMemoryIdleFade();
          if (currentWordRef.current.length === 0 && newChar !== " ") {
            wordTypedOnceRef.current.add(currentWordIndex);
            // Do not remove the word from fadedWords when user starts typing.
            // Keep faded words as-is so typed words can still be faded later.
          }
        }

        currentIndexRef.current += 1;
        if (isCorrectCharacter) {
          correctCharsRef.current += 1;
          playCorrectKey();
        } else {
          incorrectCharsRef.current += 1;
          mistypedCharactersRef.current.push(newChar);
          playIncorrectKeyForWord(currentWordIndexRef.current);
        }

        if (newChar === " ") {
          const targetWord = targetWordsRef.current[currentWordIndexRef.current] || "";
          const typedWord = currentWordRef.current;
          const isCorrectWord = typedWord === targetWord;

          typedWordsRef.current.push(typedWord);
          wordCorrectnessRef.current.push(isCorrectWord);
          if (isCorrectWord) {
            correctCompletedWordsRef.current += 1;
          }

          completedWordsRef.current += 1;
          currentWordIndexRef.current += 1;
          currentWordRef.current = "";
          if (typedIndex < paragraph.length - 1) {
            lastWordBoundaryRef.current = nextValue.length;
            canDeleteTrailingSpaceRef.current = true;
          }

          if (mode === TYPING_MODES.CHALLENGE_ARENA && currentArenaChallengeRef.current?.family === "memory") {
            wordTypedOnceRef.current.add(currentWordIndex);
            lastTypingTimeRef.current = Date.now();
            scheduleMemoryIdleFade();
          }
        } else {
          if (typedIndex === 0 || typedText[typedIndex - 1] === " ") {
            lastWordBoundaryRef.current = typedIndex;
          }
          canDeleteTrailingSpaceRef.current = false;
          currentWordRef.current += newChar;

          if (mode === TYPING_MODES.CHALLENGE_ARENA && currentArenaChallengeRef.current?.family === "memory") {
            lastTypingTimeRef.current = Date.now();
            scheduleMemoryIdleFade();
          }
        }
      }

      if (isBackspace) {
        if (isArenaMode && arenaRules.noBackspace) {
          arenaBackspaceUsedRef.current = true;
          setChallengeWarningMessage("Backspace is disabled for this challenge!");
          if (challengeWarningTimerRef.current) {
            window.clearTimeout(challengeWarningTimerRef.current);
          }
          challengeWarningTimerRef.current = window.setTimeout(() => {
            setChallengeWarningMessage("");
            challengeWarningTimerRef.current = null;
          }, 1400);
          setChallengeFailed(true);
          failDailyChallenge(Date.now());
          setChallengeAttemptsToday(getChallengeAttemptsToday(Date.now()));
          commitSnapshot();
          return;
        }

        if (mode === TYPING_MODES.CHALLENGE_ARENA) {
          arenaBackspaceUsedRef.current = true;
        }

        const removedIndex = typedText.length - 1;
        const removedChar = typedText[removedIndex];

        // Disallow deleting the trailing space after a completed word.
        if (removedChar === " ") {
          return;
        }

        const targetChar = paragraph[removedIndex];

        currentIndexRef.current = Math.max(currentIndexRef.current - 1, 0);
        if (removedChar === targetChar) {
          correctCharsRef.current = Math.max(correctCharsRef.current - 1, 0);
        } else {
          incorrectCharsRef.current = Math.max(incorrectCharsRef.current - 1, 0);
          mistypedCharactersRef.current.pop();
        }

        if (removedChar === " ") {
          currentWordIndexRef.current = Math.max(currentWordIndexRef.current - 1, 0);
          completedWordsRef.current = Math.max(completedWordsRef.current - 1, 0);

          const lastTypedWord = typedWordsRef.current.pop() || "";
          const lastWordCorrect = wordCorrectnessRef.current.pop();
          if (lastWordCorrect) {
            correctCompletedWordsRef.current = Math.max(correctCompletedWordsRef.current - 1, 0);
          }
          currentWordRef.current = lastTypedWord;
        } else {
          currentWordRef.current = currentWordRef.current.slice(0, -1);
        }
      }

      commitSnapshot();
      setTypedText(nextValue);

      const userInput = nextValue;
      const text = paragraph;

      // Time mode and non-goal free-form modes finish when the full text is matched.
      if (
        (mode === TYPING_MODES.TIME || mode === TYPING_MODES.QUOTE || mode === TYPING_MODES.CUSTOM || mode === TYPING_MODES.NUMBERS) &&
        userInput === text &&
        text.length > 0
      ) {
        finishTest();
        return;
      }

      if (mode === TYPING_MODES.GOAL && goalVariant === GOAL_VARIANTS.REACH && userInput === text && text.length > 0) {
        finishTest();
        return;
      }

      // Words mode: finish when the last word is completed and the full text matches
      if (mode === TYPING_MODES.WORDS) {
        const wordsTyped = userInput.trim().length > 0 ? userInput.trim().split(/\s+/) : [];
        const totalWordsCount = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
        if (wordsTyped.length === totalWordsCount && userInput.trim() === text.trim()) {
          finishTest();
          return;
        }
      }

      if (mode === TYPING_MODES.WORDS && completedWordsRef.current >= targetWordsRef.current.length && targetWordsRef.current.length > 0) {
        finishTest();
        return;
      }
    },
    [
      arenaRules.hideAfterSeconds,
      scheduleMemoryIdleFade,
      finishTest,
      goalVariant,
      hasStarted,
      isFinished,
      isTextLoading,
      mode,
      paragraph,
      playCorrectKey,
      playIncorrectKeyForWord,
      recalculateFromText,
      typedText
    ]
  );

  const handleRestart = useCallback(() => {
    const currentChallenge = dailyChallenge?.challenge;
    if (mode === TYPING_MODES.CHALLENGE_ARENA && currentChallenge) {
      resetTypingState({
        nextMode: TYPING_MODES.CHALLENGE_ARENA,
        nextWordCount: currentChallenge.config?.wordCount ?? wordCount,
        nextParagraph: currentChallenge.prompt,
        nextGoalVariant: currentChallenge.config?.goalVariant ?? goalVariant,
        nextTimeLimitSeconds: currentChallenge.config?.timeLimitSeconds ?? timeLimitSeconds,
        nextTargetWpm: currentChallenge.config?.targetWpm ?? targetWpm,
        nextChallenge: currentChallenge
      });
      return;
    }

    if (mode === TYPING_MODES.CUSTOM && customText.trim().length > 0) {
      resetTypingState({
        nextMode: TYPING_MODES.CUSTOM,
        nextParagraph: customText.trim(),
        nextCustomText: customText.trim()
      });
      return;
    }

    // If restarting into quote mode, try to prepare remote quote
    resetTypingState();
  }, [customText, dailyChallenge, goalVariant, mode, resetTypingState, targetWpm, timeLimitSeconds, wordCount]);

  const startDailyChallenge = useCallback(
    (challenge = dailyChallenge?.challenge) => {
      if (!challenge) return;
      const latestAttempts = getChallengeAttemptsToday(Date.now());
      if (latestAttempts.locked || dailyChallenge?.challengeCompletedToday || dailyChallenge?.challengeCompleted) {
        setChallengeWarningMessage(latestAttempts.locked ? "Daily challenge locked. Try tomorrow." : "Challenge already completed today.");
        if (challengeWarningTimerRef.current) {
          window.clearTimeout(challengeWarningTimerRef.current);
        }
        challengeWarningTimerRef.current = window.setTimeout(() => {
          setChallengeWarningMessage("");
          challengeWarningTimerRef.current = null;
        }, 2200);
        return;
      }

      arenaPreviousModeRef.current = {
        mode,
        wordCount,
        goalVariant,
        timeLimitSeconds,
        targetWpm,
        customText
      };

      resetTypingState({
        nextMode: TYPING_MODES.CHALLENGE_ARENA,
        nextWordCount: challenge.config?.wordCount ?? wordCount,
        nextParagraph: challenge.prompt,
        nextGoalVariant: challenge.config?.goalVariant ?? goalVariant,
        nextTimeLimitSeconds: challenge.config?.timeLimitSeconds ?? timeLimitSeconds,
        nextTargetWpm: challenge.config?.targetWpm ?? targetWpm,
        nextChallenge: challenge
      });
    },
    [customText, dailyChallenge, goalVariant, mode, resetTypingState, targetWpm, timeLimitSeconds, wordCount]
  );

  const cancelDailyChallenge = useCallback(() => {
    const previous = arenaPreviousModeRef.current;
    arenaPreviousModeRef.current = null;

    if (!previous) {
      handleRestart();
      return;
    }

    resetTypingState({
      nextMode: previous.mode,
      nextWordCount: previous.wordCount,
      nextParagraph: previous.mode === TYPING_MODES.CUSTOM ? (previous.customText || "") : null,
      nextCustomText: previous.mode === TYPING_MODES.CUSTOM ? (previous.customText || "") : "",
      nextGoalVariant: previous.goalVariant,
      nextTimeLimitSeconds: previous.timeLimitSeconds,
      nextTargetWpm: previous.targetWpm
    });
  }, [handleRestart, resetTypingState]);

  const handleModeChange = useCallback(
    (nextMode, options = {}) => {
      const normalizedMode = normalizeMode(nextMode);
      const nextGoal = normalizeGoalVariant(options.goalVariant ?? goalVariant);
      const nextTimeLimit = normalizeTimeLimitSeconds(options.timeLimitSeconds ?? timeLimitSeconds);
      const nextWordCount = Number.isFinite(Number(options.wordCount)) ? Number(options.wordCount) : wordCount;
      if (normalizedMode !== TYPING_MODES.CHALLENGE_ARENA) {
        setPreferredMode(normalizedMode);
      }
      setPreferredGoalVariant(nextGoal);
      setPreferredTimeLimitSeconds(nextTimeLimit);
      const nextParagraph =
        normalizedMode === TYPING_MODES.CUSTOM ? (customText && customText.trim().length > 0 ? customText.trim() : null) : null;

      resetTypingState({
        nextMode: normalizedMode,
        nextWordCount,
        nextParagraph,
        nextGoalVariant: nextGoal,
        nextTimeLimitSeconds: nextTimeLimit
      });

    },
    [customText, goalVariant, resetTypingState, timeLimitSeconds]
  );

  const handleCustomTextChange = useCallback(
    (text) => {
      setCustomText(text);
      const trimmedText = text.trim();
      if (trimmedText.length > 0) {
        resetTypingState({ nextMode: TYPING_MODES.CUSTOM, nextCustomText: trimmedText });
      }
    },
    [resetTypingState]
  );

  const handleWordCountChange = useCallback(
    (nextWordCount) => {
      if (mode === TYPING_MODES.WORDS) {
        resetTypingState({ nextWordCount });
      }
    },
    [mode, resetTypingState]
  );

  const handleGoalWpmChange = useCallback(
    (nextWpm) => {
      const parsedWpm = Number(nextWpm);
      const wpm = Number.isFinite(parsedWpm)
        ? Math.max(10, Math.min(200, parsedWpm))
        : DEFAULT_GOAL_WPM;
      setTargetWpm(wpm);
      if (mode === TYPING_MODES.GOAL) {
        resetTypingState({ nextMode: TYPING_MODES.GOAL });
      }
    },
    [mode, resetTypingState]
  );

  const handleGoalVariantChange = useCallback(
    (nextGoalVariant) => {
      const normalizedGoal = normalizeGoalVariant(nextGoalVariant);
      setPreferredGoalVariant(normalizedGoal);
      if (mode === TYPING_MODES.GOAL) {
        resetTypingState({ nextMode: TYPING_MODES.GOAL, nextGoalVariant: normalizedGoal });
      } else {
        setGoalVariant(normalizedGoal);
      }
    },
    [mode, resetTypingState]
  );

  const handleTimeLimitChange = useCallback(
    (nextSeconds) => {
      const normalizedSeconds = normalizeTimeLimitSeconds(nextSeconds);
      setPreferredTimeLimitSeconds(normalizedSeconds);
      if (mode === TYPING_MODES.TIME) {
        resetTypingState({ nextMode: TYPING_MODES.TIME, nextTimeLimitSeconds: normalizedSeconds });
      } else {
        setTimeLimitSeconds(normalizedSeconds);
      }
    },
    [mode, resetTypingState]
  );

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((previous) => {
      const next = !previous;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  const characterStates = useMemo(
    () => {
      if (isComposing) {
        return paragraph.split("").map(() => "default");
      }

      return paragraph.split("").map((character, index) => {
        if (index >= typedText.length) return "default";
        return typedText[index] === character ? "correct" : "incorrect";
      });
    },
    [isComposing, paragraph, typedText]
  );
  const totalWords = useMemo(() => targetWordsRef.current.length, [paragraph]);
  const accuracy = useMemo(
    () => calculateAccuracy(engineSnapshot.correctCharacters, typedText.length),
    [engineSnapshot.correctCharacters, typedText.length]
  );
  const getElapsedSeconds = useCallback(() => {
    const elapsedFromState = Math.max(elapsedSecondsRef.current, elapsedSeconds, 0);
    if (!testStartTimestampRef.current) return elapsedFromState;

    const elapsedFromClock = Math.floor((Date.now() - testStartTimestampRef.current) / 1000);
    return Math.max(elapsedFromClock, elapsedFromState, 0);
  }, [elapsedSeconds]);
  const displayWpm = useMemo(() => {
    if (!hasStarted) return 0;

    return calculateWpm(engineSnapshot.correctCharacters, Math.max(getElapsedSeconds(), 1));
  }, [engineSnapshot.correctCharacters, getElapsedSeconds, hasStarted]);

  const calculateArenaWpm = useCallback((correctCharacters, elapsedSeconds, currentAccuracy = 100) => {
    void currentAccuracy;
    return calculateWpm(correctCharacters, Math.max(1, elapsedSeconds));
  }, []);

  const rawWpm = useMemo(
    () => {
      if (!hasStarted) return 0;
      return calculateArenaWpm(engineSnapshot.correctCharacters, Math.max(getElapsedSeconds(), 1), accuracy);
    },
    [accuracy, calculateArenaWpm, engineSnapshot.correctCharacters, getElapsedSeconds, hasStarted]
  );
  useEffect(() => {
    latestRawWpmRef.current = rawWpm;

    if (!hasStarted) {
      setLiveWpm(0);
      return undefined;
    }

    if (isFinished) {
      if (liveWpmTimerRef.current) {
        window.clearTimeout(liveWpmTimerRef.current);
        liveWpmTimerRef.current = null;
      }
      return undefined;
    }

    if (liveWpmTimerRef.current) {
      window.clearTimeout(liveWpmTimerRef.current);
    }

    liveWpmTimerRef.current = window.setTimeout(() => {
      setLiveWpm(Math.round(displayWpm));
      liveWpmTimerRef.current = null;
    }, 200);

    return () => {
      if (liveWpmTimerRef.current) {
        window.clearTimeout(liveWpmTimerRef.current);
        liveWpmTimerRef.current = null;
      }
    };
  }, [displayWpm, hasStarted, isFinished, rawWpm]);

  useEffect(() => {
    latestLiveWpmRef.current = liveWpm;
  }, [liveWpm]);

  useEffect(() => {
    const canExtendText =
      hasStarted &&
      isActive &&
      !isFinished &&
      timeLimitSeconds > TEST_DURATION_SECONDS &&
      (mode === TYPING_MODES.TIME || (mode === TYPING_MODES.GOAL && goalVariant === GOAL_VARIANTS.SUSTAIN));

    if (!canExtendText) return;

    const nearEnd = paragraph.length - typedText.length < 90;
    const elapsedTrigger = elapsedSeconds > 0 && elapsedSeconds % 10 === 0 && lastAppendedElapsedRef.current !== elapsedSeconds;
    const correctTrigger =
      engineSnapshot.correctCharacters > 0 &&
      engineSnapshot.correctCharacters % 20 === 0 &&
      lastAppendedCorrectCharsRef.current !== engineSnapshot.correctCharacters;

    if (!nearEnd && !elapsedTrigger && !correctTrigger) return;

    const appendTriggerKey = `${elapsedSeconds}:${engineSnapshot.correctCharacters}`;
    if (lastAppendTriggerRef.current === appendTriggerKey) return;
    lastAppendTriggerRef.current = appendTriggerKey;

    const nextParagraph = `${paragraph} ${generateEndlessChunk(12, 20)}`.trim();
    targetWordsRef.current = getWordList(nextParagraph);
    setParagraph(nextParagraph);
    commitSnapshot();
    lastAppendedElapsedRef.current = elapsedSeconds;
    lastAppendedCorrectCharsRef.current = engineSnapshot.correctCharacters;
  }, [commitSnapshot, elapsedSeconds, engineSnapshot.correctCharacters, goalVariant, hasStarted, isActive, isFinished, mode, paragraph, timeLimitSeconds, typedText.length]);

  useEffect(() => {
    if (!hasStarted || !isActive || isFinished || !isSoundEnabled) return;

    [50, 75, 100].forEach((milestone) => {
      if (rawWpm >= milestone && !triggeredMilestonesRef.current.has(milestone)) {
        triggeredMilestonesRef.current.add(milestone);
        playMilestoneSound();
      }
    });
  }, [hasStarted, isActive, isFinished, isSoundEnabled, playMilestoneSound, rawWpm]);

  useEffect(() => {
    if (mode !== TYPING_MODES.GOAL) {
      hasTriggeredMilestoneRef.current = false;
      if (goalMilestoneResetTimerRef.current) {
        window.clearTimeout(goalMilestoneResetTimerRef.current);
        goalMilestoneResetTimerRef.current = null;
      }
      return;
    }

    if (!hasStarted || !isActive || isFinished) return;

    const warmupSeconds = 3;
    const currentWpm = latestLiveWpmRef.current;

    if (elapsedSeconds >= warmupSeconds && currentWpm >= targetWpm && !hasTriggeredMilestoneRef.current) {
      hasTriggeredMilestoneRef.current = true;
      playMilestoneSound();
      confetti({
        particleCount: 34,
        spread: 50,
        startVelocity: 24,
        origin: { x: 0.5, y: 0.58 }
      });

      if (goalMilestoneResetTimerRef.current) {
        window.clearTimeout(goalMilestoneResetTimerRef.current);
      }

      goalMilestoneResetTimerRef.current = window.setTimeout(() => {
        hasTriggeredMilestoneRef.current = false;
        goalMilestoneResetTimerRef.current = null;
      }, 5000);
    }
  }, [elapsedSeconds, hasStarted, isActive, isFinished, mode, playMilestoneSound, targetWpm]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDailyGoalProgress(getDailyGoalProgress());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextChallenge = getDailyChallenge();
      setDailyChallenge(nextChallenge);
      setDailyChallengeHistory(getDailyChallengeRecentHistory());
      setChallengeAttemptsToday(getChallengeAttemptsToday(Date.now()));
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);
  const wordProgress = useMemo(
    () => ({
      totalWords: engineSnapshot.totalWords || totalWords,
      completedWordCount: engineSnapshot.completedWords,
      currentWordIndex: engineSnapshot.currentWordIndex,
      isCurrentWordCorrect: engineSnapshot.isCurrentWordCorrect
    }),
    [engineSnapshot, totalWords]
  );

  const challengeProgress = useMemo(
    () => (isArenaMode
      ? getArenaChallengeProgress(dailyChallenge, {
          wpm: rawWpm,
          accuracy,
          elapsedSeconds,
          holdSeconds: arenaHoldSecondsRef.current,
          backspaceUsed: arenaBackspaceUsedRef.current,
          promptHidden: challengePromptHidden || challengeHasTextFaded,
          incorrectCharacters: engineSnapshot.incorrectCharacters
        })
      : null),
    [accuracy, challengeHasTextFaded, challengePromptHidden, dailyChallenge, elapsedSeconds, engineSnapshot.incorrectCharacters, isArenaMode, rawWpm]
  );

  const activeIndex = useMemo(() => {
    if (isFinished || currentIndexRef.current >= paragraph.length) return -1;
    return Math.min(currentIndexRef.current, paragraph.length);
  }, [isFinished, paragraph.length, typedText.length]);

  useEffect(() => {
    if (!hasStarted || isTestFinishedRef.current || !paragraph) return;

    if (
      (mode === TYPING_MODES.TIME || mode === TYPING_MODES.QUOTE || mode === TYPING_MODES.CUSTOM || mode === TYPING_MODES.NUMBERS) &&
      typedText === paragraph &&
      paragraph.length > 0
    ) {
      finishTest();
      return;
    }

    if (mode === TYPING_MODES.GOAL && goalVariant === GOAL_VARIANTS.REACH && typedText === paragraph && paragraph.length > 0) {
      finishTest();
      return;
    }

    if (mode === TYPING_MODES.WORDS) {
      const userInput = typedText.trim();
      const text = paragraph.trim();
      const wordsTyped = userInput.length > 0 ? userInput.split(/\s+/) : [];
      const totalWordsCount = text.length > 0 ? text.split(/\s+/).length : 0;

      if (wordsTyped.length === totalWordsCount && userInput === text && totalWordsCount > 0) {
        finishTest();
      }
    }
  }, [finishTest, hasStarted, mode, paragraph, typedText]);

  useEffect(() => {
    if (!isFinished || !hasStarted || hasSavedResultRef.current) return;

    const timeUsed = Math.max(getElapsedSeconds(), 1);
    const finalWpm = Math.round(calculateArenaWpm(engineSnapshot.correctCharacters, timeUsed, accuracy));
    const currentBestKey = getBestWpmModeKey({ mode, wordCount, goalVariant, timeLimitSeconds });
    const previousBest = bestWpmByMode[currentBestKey] || 0;
    const goalSuccess =
      mode !== TYPING_MODES.GOAL
        ? true
        : goalVariant === GOAL_VARIANTS.SUSTAIN
          ? goalAchievedSecondsRef.current >= 5
          : finalWpm >= targetWpm && accuracy >= 90 && typedText === paragraph;
    const nextBest = Math.max(previousBest, finalWpm);

    if (nextBest !== previousBest) {
      const nextBestMap = { ...bestWpmByMode, [currentBestKey]: nextBest };
      setBestWpmByModeState(nextBestMap);
      setBestWpmByMode(nextBestMap);
    }

    const result = {
      id: Date.now(),
      mode,
      wordCount: mode === TYPING_MODES.WORDS ? wordCount : null,
      goalVariant: mode === TYPING_MODES.GOAL ? goalVariant : null,
      timeLimitSeconds: mode === TYPING_MODES.TIME || mode === TYPING_MODES.GOAL ? timeLimitSeconds : null,
      modeKey: currentBestKey,
      wpm: finalWpm,
      accuracy,
      correctCharacters: engineSnapshot.correctCharacters,
      incorrectCharacters: engineSnapshot.incorrectCharacters,
      completedWords: engineSnapshot.completedWords,
      typedWordCount: typedText.trim().length > 0 ? typedText.trim().split(/\s+/).filter(Boolean).length : 0,
      mistypedCharacters: mistypedCharactersRef.current,
      timeUsed,
      previousBest,
      improvedBest: finalWpm > previousBest,
      goalSuccess,
      challengeId: dailyChallenge?.challenge?.id || null,
      challengeTitle: dailyChallenge?.challenge?.title || null,
      challengeReward: dailyChallenge?.challenge?.reward || null,
      challengeBadgeId: dailyChallenge?.challenge?.badgeId || dailyChallenge?.challenge?.id || null,
      challengeBadgeName: dailyChallenge?.challenge?.badgeName || dailyChallenge?.challenge?.reward || dailyChallenge?.challenge?.title || null,
      challengeBadgeIconName: dailyChallenge?.challenge?.badgeIconName || "Trophy",
      challengeEarnedCount: 0,
      challengeCompleted: false,
      challengeCompletedToday: false,
      challengeFailed: false,
      challengeStreak: dailyChallenge?.challengeStreak || 0,
      typedText,
      promptText: paragraph,
      typedCharacterCount: typedText.length,
      hasTextFaded: mode === TYPING_MODES.CHALLENGE_ARENA ? challengeHasTextFaded : false,
      backspaceUsed: mode === TYPING_MODES.CHALLENGE_ARENA ? arenaBackspaceUsedRef.current : false,
      holdSeconds: mode === TYPING_MODES.CHALLENGE_ARENA ? arenaHoldSecondsRef.current : 0,
      maxHoldWpm: mode === TYPING_MODES.CHALLENGE_ARENA ? arenaMaxHoldWpmRef.current : 0,
      promptHiddenUsed: mode === TYPING_MODES.CHALLENGE_ARENA ? challengePromptHidden || challengeHasTextFaded : false
    };

    try {
      const progress = incrementDailyGoalProgress(Date.now());
      setDailyGoalProgress(progress);
    } catch {}
    hasSavedResultRef.current = true;
    // update streak info based on now
    try {
      const s = updateStreakWithTimestamp(Date.now());
      setStreakInfo(s);
      result.streak = s.count;
    } catch {}

    let challengeOutcome = null;
    try {
      const arenaObjectivesMet =
        mode === TYPING_MODES.CHALLENGE_ARENA
          ? getChallengeObjectiveStatus(dailyChallenge?.challenge, result)
          : true;

      if (mode === TYPING_MODES.CHALLENGE_ARENA && !arenaObjectivesMet) {
        challengeOutcome = { state: dailyChallenge, history: getDailyChallengeRecentHistory(), completed: false, badgeAwarded: null };
      } else {
        challengeOutcome = completeChallenge(result, Date.now());
      }

      if (challengeOutcome.state) {
        setDailyChallenge(challengeOutcome.state);
      }
      setDailyChallengeHistory(getDailyChallengeRecentHistory());
      if (challengeOutcome.completed && !challengeOutcome.alreadyCompleted && isSoundEnabled) {
        playMilestoneSound();
      }
      if (challengeOutcome.completed && challengeOutcome.badgeAwarded) {
        result.challengeCompleted = true;
        result.challengeEarnedCount = challengeOutcome.badgeAwarded?.earnedCount || result.challengeEarnedCount || 1;
        result.challengeStreak = challengeOutcome.state?.challengeStreak || result.challengeStreak;
        result.challengeBadgeIconName = challengeOutcome.badgeAwarded?.iconName || result.challengeBadgeIconName;
        result.challengeCompletedToday = Boolean(challengeOutcome.alreadyCompleted);
        setChallengeFailed(false);
      } else if (mode === TYPING_MODES.CHALLENGE_ARENA) {
        result.challengeFailed = true;
        setChallengeFailed(true);
        failDailyChallenge(Date.now());
        setChallengeAttemptsToday(getChallengeAttemptsToday(Date.now()));
      }
    } catch {}

    const storedResults = addResult(result);

    if ((goalSuccess || mode !== TYPING_MODES.GOAL) && (mode !== TYPING_MODES.CHALLENGE_ARENA || (result.challengeCompleted && !challengeOutcome?.alreadyCompleted))) {
      syncLeaderboard(storedResults);
      try {
        if (typeof updateLeaderboard === "function") updateLeaderboard(result);
      } catch {}
    }

    setFinalResult(result);
  }, [
    accuracy,
    bestWpmByMode,
    dailyChallenge,
    goalVariant,
    elapsedSeconds,
    engineSnapshot.correctCharacters,
    engineSnapshot.incorrectCharacters,
    hasStarted,
    isFinished,
    mode,
    paragraph,
    playMilestoneSound,
    isSoundEnabled,
    targetWpm,
    timeLeft,
    timeLimitSeconds,
    wordCount,
    rawWpm,
    calculateArenaWpm
  ]);

  return {
    mode,
    wordCount,
    targetWpm,
    customText,
    paragraph,
    typedText,
    handleTyping,
    handleRestart,
    handleModeChange,
    handleWordCountChange,
    handleCustomTextChange,
    handleGoalWpmChange,
    handleGoalVariantChange,
    handleTimeLimitChange,
    characterStates,
    timeLeft,
    elapsedSeconds,
    rawWpm,
    liveWpm,
    goalVariant,
    timeLimitSeconds,
    accuracy,
    isActive,
    isFinished,
    focusTrigger,
    focusTypingInput,
    activeIndex,
    correctCharacters: engineSnapshot.correctCharacters,
    incorrectCharacters: engineSnapshot.incorrectCharacters,
    isSoundEnabled,
    toggleSound,
    volume,
    setVolume,
    resetWordsWithError,
    wordProgress,
    completedWords: engineSnapshot.completedWords,
    currentWordIndex: engineSnapshot.currentWordIndex,
    currentIndex: currentIndexRef.current,
    totalWords: engineSnapshot.totalWords || totalWords,
    goalAchievedSeconds: goalAchievedSecondsRef.current,
    finalResult,
    isTextLoading,
    textLoadingMessage,
    bestWpm,
    bestWpmByMode,
    dailyGoalProgress,
    dailyChallenge,
    dailyChallengeHistory,
    challengeAttemptsToday,
    challengeConfig: dailyChallenge?.challenge || null,
    challengeProgress,
    challengeCompleted: Boolean(dailyChallenge?.challengeCompleted),
    challengeFailed,
    challengeWarningMessage,
    challengePromptHidden,
    challengeHasTextFaded,
    fadedWords,
    challengeLocked: isArenaChallengeLocked,
    startTest,
    pauseTest,
    toggleActive,
    streakInfo,
    startDailyChallenge,
    cancelDailyChallenge
  };
};
