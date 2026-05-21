import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TYPING_MODES, TEST_DURATION_SECONDS, DEFAULT_GOAL_WPM } from "../constants/typingModes";
import { getRandomParagraph, getRandomWordText } from "../data/paragraphs";
import { getRandomQuote, fetchRemoteQuote } from "../data/quotes";
import { useTypingSounds } from "./useTypingSounds";
import { calculateAccuracy, calculateWpm } from "../utils/typingStats";
import confetti from "canvas-confetti";
import {
  addResult,
  getBestWpm,
  getStreak,
  updateStreakWithTimestamp,
  getDailyGoalProgress,
  incrementDailyGoalProgress,
  syncLeaderboard,
  updateLeaderboard,
  getPreferredMode,
  getSoundEnabled,
  setBestWpm as saveBestWpm,
  setPreferredMode,
  setSoundEnabled
} from "../utils/storage";

const DEFAULT_WORD_COUNT = 25;
const getWordList = (text) => text.split(" ").filter((word) => word.length > 0);

const getNextText = (mode, wordCount) => {
  if (mode === TYPING_MODES.WORDS) return getRandomWordText(wordCount);
  if (mode === TYPING_MODES.QUOTE) return getRandomQuote();
  return getRandomParagraph();
};

const normalizeMode = (value) => {
  const validModes = [TYPING_MODES.TIME, TYPING_MODES.WORDS, TYPING_MODES.QUOTE, TYPING_MODES.CUSTOM, TYPING_MODES.GOAL];
  return validModes.includes(value) ? value : TYPING_MODES.TIME;
};

export const useTypingTest = () => {
  const initialMode = normalizeMode(getPreferredMode());
  const initialParagraphRef = useRef(getNextText(initialMode, DEFAULT_WORD_COUNT));
  const [mode, setMode] = useState(initialMode);
  const [wordCount, setWordCount] = useState(DEFAULT_WORD_COUNT);
  const [targetWpm, setTargetWpm] = useState(DEFAULT_GOAL_WPM);
  const [customText, setCustomText] = useState("");
  const [paragraph, setParagraph] = useState(initialParagraphRef.current);
  const [typedText, setTypedText] = useState("");
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(getSoundEnabled());
  const [bestWpm, setBestWpm] = useState(getBestWpm());
  const [streakInfo, setStreakInfo] = useState(() => getStreak());
  const [dailyGoalProgress, setDailyGoalProgress] = useState(() => getDailyGoalProgress());
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
  const {
    playCorrectKey,
    playMilestoneSound,
    playIncorrectKeyForWord,
    volume,
    setVolume,
    resetWordsWithError
  } = useTypingSounds(isSoundEnabled);

  const isFinished = useMemo(() => {
    if (mode === TYPING_MODES.TIME) return timeLeft === 0;
    if (mode === TYPING_MODES.WORDS) return engineSnapshot.isWordLimitReached;
    if (mode === TYPING_MODES.GOAL) return goalAchievedSecondsRef.current >= 5 || timeLeft === 0;
    return paragraph.length > 0 && typedText.length >= paragraph.length;
  }, [engineSnapshot.isWordLimitReached, mode, paragraph.length, timeLeft, typedText.length]);

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

  const resetTypingState = useCallback(
    ({ nextMode = mode, nextWordCount = wordCount, nextParagraph = null, nextCustomText = "" } = {}) => {
      const updatedParagraph = nextParagraph ?? (nextCustomText || getNextText(nextMode, nextWordCount));

      if (nextMode !== mode) {
        setMode(nextMode);
      }
      if (nextWordCount !== wordCount) {
        setWordCount(nextWordCount);
      }
      if (nextCustomText) {
        setCustomText(nextCustomText);
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
      resetWordsWithError();

      setParagraph(updatedParagraph);
      setTypedText("");
      setTimeLeft(TEST_DURATION_SECONDS);
      setElapsedSeconds(0);
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
      setFocusTrigger((previous) => previous + 1);
    },
    [mode, resetWordsWithError, wordCount]
  );

  // Try fetching a fresh remote quote when switching to quote mode, but keep a local quote synchronously
  const prepareQuoteForMode = useCallback((modeToPrepare) => {
    if (modeToPrepare !== TYPING_MODES.QUOTE) return;
    // Start with a local quote immediately
    const local = getRandomQuote();
    setParagraph(local);
    // Attempt to fetch remote quote and update when available
    fetchRemoteQuote().then((q) => {
      // If paragraph unchanged or still the local placeholder, update
      setParagraph((current) => (current === local ? q : current));
    });
  }, []);

  const finishTest = useCallback(() => {
    if (isTestFinishedRef.current) return;
    isTestFinishedRef.current = true;

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
    if (!hasStarted || isFinished || !isActive) return;

    // ensure no duplicate timers
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((previousElapsed) => {
        const nextElapsed = previousElapsed + 1;

        // Goal mode: check if the smoothed WPM target has been held for 5 consecutive seconds
        if (mode === TYPING_MODES.GOAL) {
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
            // Reset if below target or still in warmup
            goalAchievedSecondsRef.current = 0;
          }

          // Also finish on 60-second timeout
          if (nextElapsed >= TEST_DURATION_SECONDS && !isTestFinishedRef.current) {
            finishTest();
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
  }, [hasStarted, isFinished, mode, targetWpm, finishTest]);

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

      if (!paragraph || paragraph.length === 0) {
        return;
      }

      const nextValue = value.slice(0, paragraph.length);
      if (!hasStarted && nextValue.length > 0) {
        setHasStarted(true);
        setIsActive(true);
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
        } else {
          currentWordRef.current += newChar;
        }
      }

      if (isBackspace) {
        const removedIndex = typedText.length - 1;
        const removedChar = typedText[removedIndex];
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

      // Time mode, quote mode, and custom mode: finish when the full text is matched
      if (mode !== TYPING_MODES.WORDS && userInput === text && text.length > 0) {
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
      finishTest,
      hasStarted,
      isFinished,
      mode,
      paragraph,
      playCorrectKey,
      playIncorrectKeyForWord,
      recalculateFromText,
      typedText
    ]
  );

  const handleRestart = useCallback(() => {
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
  }, [customText, mode, resetTypingState]);

  const handleModeChange = useCallback(
    (nextMode) => {
      const normalizedMode = normalizeMode(nextMode);
      setPreferredMode(normalizedMode);
      const nextParagraph =
        normalizedMode === TYPING_MODES.CUSTOM ? (customText && customText.trim().length > 0 ? customText.trim() : null) : null;

      resetTypingState({
        nextMode: normalizedMode,
        nextWordCount: DEFAULT_WORD_COUNT,
        nextParagraph
      });

      // If switching to quote mode, attempt to prepare remote quote
      if (normalizedMode === TYPING_MODES.QUOTE) {
        prepareQuoteForMode(TYPING_MODES.QUOTE);
      }
    },
    [customText, prepareQuoteForMode, resetTypingState]
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

  const rawWpm = useMemo(
    () => {
      if (!hasStarted) return 0;
      // Use actual elapsed time based on mode
      const actualElapsed = mode === TYPING_MODES.TIME ? TEST_DURATION_SECONDS - timeLeft : Math.max(elapsedSeconds, 1);
      return calculateWpm(engineSnapshot.correctCharacters, actualElapsed);
    },
    [engineSnapshot.correctCharacters, elapsedSeconds, hasStarted, mode, timeLeft]
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
      setLiveWpm(rawWpm);
      liveWpmTimerRef.current = null;
    }, 200);

    return () => {
      if (liveWpmTimerRef.current) {
        window.clearTimeout(liveWpmTimerRef.current);
        liveWpmTimerRef.current = null;
      }
    };
  }, [hasStarted, isFinished, rawWpm]);

  useEffect(() => {
    latestLiveWpmRef.current = liveWpm;
  }, [liveWpm]);

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
  const accuracy = useMemo(
    () => calculateAccuracy(engineSnapshot.correctCharacters, typedText.length),
    [engineSnapshot.correctCharacters, typedText.length]
  );
  const wordProgress = useMemo(
    () => ({
      totalWords: engineSnapshot.totalWords || totalWords,
      completedWordCount: engineSnapshot.completedWords,
      currentWordIndex: engineSnapshot.currentWordIndex,
      isCurrentWordCorrect: engineSnapshot.isCurrentWordCorrect
    }),
    [engineSnapshot, totalWords]
  );

  const activeIndex = useMemo(() => {
    if (isFinished || typedText.length >= paragraph.length) return -1;
    return typedText.length;
  }, [isFinished, paragraph.length, typedText.length]);

  useEffect(() => {
    if (!hasStarted || isTestFinishedRef.current || !paragraph) return;

    if (mode !== TYPING_MODES.WORDS && typedText === paragraph && paragraph.length > 0) {
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

    const timeUsed = Math.max(elapsedSeconds, 1);
    // Recalculate WPM using the actual time used so final WPM matches the live pace the user saw.
    const finalWpm = calculateWpm(engineSnapshot.correctCharacters, timeUsed);
    const previousBest = bestWpm;
    const nextBest = Math.max(previousBest, finalWpm);

    if (nextBest !== previousBest) {
      setBestWpm(nextBest);
      saveBestWpm(nextBest);
    }

    const result = {
      id: Date.now(),
      mode,
      wordCount: mode === TYPING_MODES.WORDS ? wordCount : null,
      wpm: finalWpm,
      accuracy,
      correctCharacters: engineSnapshot.correctCharacters,
      incorrectCharacters: engineSnapshot.incorrectCharacters,
      mistypedCharacters: mistypedCharactersRef.current,
      timeUsed,
      previousBest,
      improvedBest: finalWpm > previousBest
    };

    const storedResults = addResult(result);
    syncLeaderboard(storedResults);
    try {
      // attempt to add to explicit leaderboard store if it qualifies
      if (typeof updateLeaderboard === "function") updateLeaderboard(result);
    } catch {}
    try {
      const progress = incrementDailyGoalProgress(Date.now());
      setDailyGoalProgress(progress);
    } catch {}
    setFinalResult(result);
    hasSavedResultRef.current = true;
    // update streak info based on now
    try {
      const s = updateStreakWithTimestamp(Date.now());
      setStreakInfo(s);
      // attach streak to final result for UI
      setFinalResult((prev) => (prev ? { ...prev, streak: s.count } : prev));
    } catch {}
  }, [
    accuracy,
    bestWpm,
    elapsedSeconds,
    engineSnapshot.correctCharacters,
    engineSnapshot.incorrectCharacters,
    hasStarted,
    isFinished,
    mode,
    wordCount,
    rawWpm
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
    characterStates,
    timeLeft,
    elapsedSeconds,
    rawWpm,
    liveWpm,
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
    totalWords: engineSnapshot.totalWords || totalWords,
    goalAchievedSeconds: goalAchievedSecondsRef.current,
    finalResult,
    bestWpm,
    dailyGoalProgress,
    startTest,
    pauseTest,
    toggleActive,
    streakInfo
  };
};
