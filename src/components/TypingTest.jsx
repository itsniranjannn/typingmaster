import { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Settings, RotateCcw, Trophy, BarChart2 } from "lucide-react";
import confetti from "canvas-confetti";
import AppLogo from "./AppLogo";
import TextSelector from "./TextSelector";
import TypingText from "./TypingText";
import ResultScreen from "./ResultScreen";
import SettingsModal from "./SettingsModal";
import LeaderboardModal from "./LeaderboardModal";
// ModeSwitcher removed; controls moved to top bar for Monkeytype-like layout
import SoundControls from "./SoundControls";
import HistoryInsights from "./HistoryInsights";
import RightSidebar from "./RightSidebar";
import SidebarModal from "./SidebarModal";
import WelcomeTour from "./WelcomeTour";
import { useTypingTest } from "../hooks/useTypingTest";
import { TYPING_MODES, GOAL_VARIANTS, UNIVERSAL_MODES, CUSTOM_TIME_MIN_SECONDS, CUSTOM_TIME_MAX_SECONDS } from "../constants/typingModes";
import { exportResultsToCSV, getHasSeenTour, setHasSeenTour } from "../utils/storage";

function TypingTest({ theme, onToggleTheme }) {
  const {
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
    handleTimeLimitChange,
    characterStates,
    timeLeft,
    elapsedSeconds,
    liveWpm,
    accuracy,
    isActive,
    isFinished,
    focusTrigger,
    activeIndex,
    correctCharacters,
    incorrectCharacters,
    isSoundEnabled,
    toggleSound,
    volume,
    setVolume,
    resetWordsWithError,
    wordProgress,
    completedWords,
    currentWordIndex,
    totalWords,
    goalAchievedSeconds,
    finalResult,
    isTextLoading,
    textLoadingMessage,
    bestWpm,
    goalVariant,
    timeLimitSeconds,
    dailyGoalProgress,
    startTest,
    pauseTest,
    toggleActive,
    streakInfo
  } = useTypingTest();

  const [fontScale, setFontScale] = useState(1);
  const [goalReachedShown, setGoalReachedShown] = useState(false);
  const goalReachedTimeoutRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tipSeed, setTipSeed] = useState(0);
  const [historyCloseSignal, setHistoryCloseSignal] = useState(0);
  const didCelebrateBestRef = useRef(false);
  const [prevAccuracy, setPrevAccuracy] = useState(accuracy);
  const [accuracyState, setAccuracyState] = useState(null);
  const typingSurfaceRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const [isTypingAreaFocused, setIsTypingAreaFocused] = useState(false);
  const [isWelcomeTourOpen, setIsWelcomeTourOpen] = useState(() => !getHasSeenTour());
  const [welcomeTourStep, setWelcomeTourStep] = useState(0);
  const [welcomeTourRect, setWelcomeTourRect] = useState(null);
  const [timeInput, setTimeInput] = useState(String(timeLimitSeconds));
  const headerControlsRef = useRef(null);
  const modeBarRef = useRef(null);
  const typingPanelRef = useRef(null);
  const statsBarRef = useRef(null);

  const syncTypingFocusState = useCallback(() => {
    const wrapper = typingSurfaceRef.current;
    const activeElement = document.activeElement;
    setIsTypingAreaFocused(Boolean(wrapper && activeElement && wrapper.contains(activeElement)));
  }, [mode]);

  useEffect(() => {
    setTimeInput(String(timeLimitSeconds));
  }, [timeLimitSeconds]);

  const commitTimeInput = useCallback(
    (value) => {
      const trimmedValue = String(value).trim();
      if (trimmedValue.length === 0) return;

      const parsedValue = Number(trimmedValue);
      if (!Number.isFinite(parsedValue)) return;

      handleTimeLimitChange(parsedValue);
    },
    [handleTimeLimitChange]
  );

  const welcomeTourSteps = useMemo(
    () => [
      {
        target: "modeBar",
        title: "Pick a test mode",
        description:
          "Use this bar for the core tests: Time, Words, and Goal. The header mode picker also includes Quote, Custom text, and Numbers."
      },
      {
        target: "typingPanel",
        title: "Type in the panel",
        description:
          "Click the prompt to start typing. The current word stays anchored while the text can grow during long sessions."
      },
      {
        target: "statsBar",
        title: "Watch live progress",
        description:
          "WPM, accuracy, remaining time, and completed words update live above the typing area."
      },
      {
        target: "headerControls",
        title: "Use the top-right tools",
        description:
          "Sound, theme, leaderboard, and settings live here. The right sidebar and mobile drawer show best WPM, streak, and daily goals."
      }
    ],
    []
  );

  const tourTargetRefs = useMemo(
    () => ({
      modeBar: modeBarRef,
      typingPanel: typingPanelRef,
      statsBar: statsBarRef,
      headerControls: headerControlsRef
    }),
    []
  );

  const focusTypingArea = useCallback(() => {
    if (isFinished) return;
    if (typingSurfaceRef.current) {
      typingSurfaceRef.current.focus();
    }
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus({ preventScroll: true });
    }
    setIsTypingAreaFocused(true);
  }, [isFinished]);

  const handleInlineKeyDown = useCallback(
    (event) => {
      if (isFinished) return;

      const { key } = event;
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (key === "Tab") {
        return;
      }

      if (key === "Backspace") {
        event.preventDefault();
        handleTyping(typedText.slice(0, -1));
        return;
      }

      if (key === " ") {
        event.preventDefault();
        handleTyping(`${typedText} `);
        return;
      }

      if (key.length === 1) {
        event.preventDefault();
        handleTyping(`${typedText}${key}`);
      }
    },
    [handleTyping, isFinished, typedText]
  );

  useEffect(() => {
    if (accuracy === prevAccuracy) return;
    setAccuracyState(accuracy > prevAccuracy ? 'up' : 'down');
    const timer = window.setTimeout(() => setAccuracyState(null), 300);
    setPrevAccuracy(accuracy);
    return () => window.clearTimeout(timer);
  }, [accuracy, prevAccuracy]);

  useEffect(() => {
    if (!finalResult) {
      didCelebrateBestRef.current = false;
      return;
    }

    if (finalResult.improvedBest && finalResult.accuracy >= 90 && !didCelebrateBestRef.current) {
      didCelebrateBestRef.current = true;
      confetti({
        particleCount: 120,
        spread: 70,
        startVelocity: 38,
        origin: { x: 0.5, y: 0.55 }
      });
      window.setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 90,
          startVelocity: 28,
          origin: { x: 0.5, y: 0.48 }
        });
      }, 180);
    }
  }, [finalResult]);

  const closeOverlays = useCallback(() => {
    setIsSettingsOpen(false);
    setIsLeaderboardOpen(false);
    setHistoryCloseSignal((value) => value + 1);
  }, []);

  // CSV Export functionality
  const handleExportCsv = useCallback(() => {
    const fileName = exportResultsToCSV();
    if (!fileName) {
      alert("No results to export");
      return;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isShortcut = event.ctrlKey || event.metaKey;

      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlays();
        return;
      }

      if (isShortcut && event.shiftKey && event.code === "KeyR") {
        event.preventDefault();
        handleRestart();
      }

      if (isShortcut && event.shiftKey && event.code === "KeyS") {
        event.preventDefault();
        toggleSound();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOverlays, handleRestart, toggleSound]);

  useEffect(() => {
    const handlePaste = (event) => {
      // Allow paste into custom text inputs (Mode=CUSTOM) and otherwise block
      const active = document.activeElement;
      // If the active element is the hidden typing input, block paste unless in CUSTOM mode
      if (hiddenInputRef.current && hiddenInputRef.current === active && mode !== TYPING_MODES.CUSTOM) {
        event.preventDefault();
      }
      // Otherwise allow paste (so users can paste into custom text fields)
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    focusTypingArea();
  }, [focusTrigger, focusTypingArea]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);

  const closeWelcomeTour = useCallback(() => {
    setIsWelcomeTourOpen(false);
    setHasSeenTour(true);
  }, []);

  const advanceWelcomeTour = useCallback(() => {
    setWelcomeTourStep((currentStep) => {
      const nextStep = currentStep + 1;
      if (nextStep >= welcomeTourSteps.length) {
        closeWelcomeTour();
        return currentStep;
      }
      return nextStep;
    });
  }, [closeWelcomeTour, welcomeTourSteps.length]);

  useEffect(() => {
    if (!isWelcomeTourOpen) return undefined;

    const measure = () => {
      const currentStep = welcomeTourSteps[welcomeTourStep];
      const currentTarget = currentStep ? tourTargetRefs[currentStep.target] : null;
      const element = currentTarget?.current || null;

      if (!element) {
        setWelcomeTourRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        setWelcomeTourRect(null);
        return;
      }

      setWelcomeTourRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    const rafId = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isWelcomeTourOpen, tourTargetRefs, welcomeTourStep, welcomeTourSteps]);

  // Show a short, immediate message when the user first reaches the target WPM in Goal mode
  useEffect(() => {
    if (mode !== TYPING_MODES.GOAL || goalVariant !== GOAL_VARIANTS.SUSTAIN) return;
    if (goalReachedShown) return;
    // Show the banner only after a short warmup and use the smoothed liveWpm to avoid spikes
    const warmupSeconds = 3;
    if (typeof liveWpm === 'number' && elapsedSeconds >= warmupSeconds && liveWpm >= targetWpm && targetWpm > 0) {
      setGoalReachedShown(true);
    }

    return () => {};
  }, [mode, liveWpm, elapsedSeconds, targetWpm, goalReachedShown]);

  // When a final result is produced (test finished), and we're in Goal mode,
  // schedule an SPA restart after showing the banner for a short period.
  useEffect(() => {
    if (!finalResult) return;
    if (mode !== TYPING_MODES.GOAL || goalVariant !== GOAL_VARIANTS.SUSTAIN) return;
    if (goalReachedTimeoutRef.current) {
      window.clearTimeout(goalReachedTimeoutRef.current);
      goalReachedTimeoutRef.current = null;
    }
    goalReachedTimeoutRef.current = window.setTimeout(() => {
      try {
        handleRestart();
      } catch (e) {
        window.location.reload();
      }
      goalReachedTimeoutRef.current = null;
    }, 5000);

    return () => {
      if (goalReachedTimeoutRef.current) {
        window.clearTimeout(goalReachedTimeoutRef.current);
        goalReachedTimeoutRef.current = null;
      }
    };
  }, [finalResult, goalVariant, mode, handleRestart]);

  const isDark = theme === "dark";
  const cardBg = isDark
    ? "border-gray-700 bg-gray-800"
    : "border-slate-300 bg-slate-100";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-600";
  const bestWpmLabel =
    mode === TYPING_MODES.TIME
      ? `Time ${timeLimitSeconds}s best`
      : mode === TYPING_MODES.WORDS
        ? `Words ${wordCount} best`
        : mode === TYPING_MODES.GOAL
          ? `Goal (${goalVariant === GOAL_VARIANTS.REACH ? "Reach" : "Sustain"}) best`
          : mode === TYPING_MODES.QUOTE
            ? "Quote best"
            : mode === TYPING_MODES.CUSTOM
              ? "Custom best"
              : "Numbers best";

  return (
    <div className={`flex h-screen flex-col ${isDark ? "bg-gray-900" : "bg-white"}`}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`border-b ${isDark ? "border-gray-700 bg-gray-800" : "border-slate-300 bg-slate-100"}`}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <AppLogo isDark={isDark} />
            {/* simplified nav - removed Practice / Leaderboard / Pro Tip links per request */}
          </div>

          <div className="hidden flex-1 sm:block">
            <TextSelector
              mode={mode}
              goalVariant={goalVariant}
              timeLimitSeconds={timeLimitSeconds}
              customText={customText}
              onModeChange={handleModeChange}
              onCustomTextChange={handleCustomTextChange}
              isDark={isDark}
            />
          </div>

          <div ref={headerControlsRef} className="flex items-center gap-2">
            <SoundControls
              isSoundEnabled={isSoundEnabled}
              onToggleSound={toggleSound}
              volume={volume}
              onVolumeChange={setVolume}
            />

            <motion.button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-200 hover:bg-slate-300"}`}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.18 }}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun size={18} className="text-yellow-500" />
              ) : (
                <Moon size={18} className="text-slate-700" />
              )}
            </motion.button>
            {/* Leaderboard button (open leaderboard modal) */}
            <motion.button
              onClick={() => setIsLeaderboardOpen(true)}
              className={`p-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-200 hover:bg-slate-300"}`}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.18 }}
              aria-label="Open leaderboard"
            >
              <Trophy size={18} />
            </motion.button>

            <motion.button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-200 hover:bg-slate-300"}`}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
              aria-label="Open settings"
            >
              <Settings size={18} />
            </motion.button>
          </div>

        </div>
      </motion.header>

      {/* Top mode bar (Monkeytype-style) */}
      {UNIVERSAL_MODES.includes(mode) && (
      <div ref={modeBarRef} className={`mx-auto w-full max-w-6xl px-4 sm:px-6`}>
        <div className={`rounded-xl backdrop-blur-sm px-3 py-2 flex flex-wrap items-center gap-2 justify-between ${isDark ? 'bg-gray-900/60 border-gray-700' : 'bg-white/60 border-transparent'} border-b`}>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode buttons */}
            <div className="inline-flex items-center gap-2">
              <button
                onClick={() => { commitTimeInput(timeInput); handleModeChange(TYPING_MODES.TIME, { timeLimitSeconds: Number(timeInput) || timeLimitSeconds }); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${mode === TYPING_MODES.TIME ? 'bg-sky-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                aria-pressed={mode === TYPING_MODES.TIME}
              >
                Time {timeLimitSeconds}s
              </button>
              <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                <input
                  type="number"
                  min={CUSTOM_TIME_MIN_SECONDS}
                  max={CUSTOM_TIME_MAX_SECONDS}
                  value={timeInput}
                  onChange={(event) => {
                    setTimeInput(event.target.value);
                  }}
                  onBlur={() => {
                    if (String(timeInput).trim().length === 0) {
                      setTimeInput(String(timeLimitSeconds));
                      return;
                    }

                    commitTimeInput(timeInput);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className={`w-16 bg-transparent text-sm font-semibold outline-none ${isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`}
                  aria-label="Custom time limit in seconds"
                />
                <span className={`text-xs uppercase tracking-[0.18em] ${secondaryText}`}>sec</span>
              </div>
              <button
                onClick={() => { handleModeChange(TYPING_MODES.WORDS); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${mode === TYPING_MODES.WORDS ? 'bg-sky-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                aria-pressed={mode === TYPING_MODES.WORDS}
              >
                Words
              </button>
              <button
                onClick={() => { handleModeChange(TYPING_MODES.GOAL, { goalVariant: GOAL_VARIANTS.SUSTAIN }); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }}
                className={`group px-3 py-1.5 rounded-full text-sm font-semibold transition ${mode === TYPING_MODES.GOAL && goalVariant === GOAL_VARIANTS.SUSTAIN ? 'bg-sky-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                aria-pressed={mode === TYPING_MODES.GOAL && goalVariant === GOAL_VARIANTS.SUSTAIN}
                aria-label="Goal (Sustain). Hold the target WPM for a short window to finish."
                title="Goal (Sustain): hold the target WPM briefly to finish."
              >
                <span className="inline-flex items-center gap-1">
                  <span>Goal (Sustain)</span>
                  <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">?</span>
                </span>
              </button>
              <button
                onClick={() => { handleModeChange(TYPING_MODES.GOAL, { goalVariant: GOAL_VARIANTS.REACH }); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }}
                className={`group px-3 py-1.5 rounded-full text-sm font-semibold transition ${mode === TYPING_MODES.GOAL && goalVariant === GOAL_VARIANTS.REACH ? 'bg-sky-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                aria-pressed={mode === TYPING_MODES.GOAL && goalVariant === GOAL_VARIANTS.REACH}
                aria-label="Goal (Reach). Finish the full text and meet the target WPM to score."
                title="Goal (Reach): complete the full text and hit the target WPM to score."
              >
                <span className="inline-flex items-center gap-1">
                  <span>Goal (Reach)</span>
                  <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">?</span>
                </span>
              </button>
            </div>

            {/* WORDS mode: quick word-count chips */}
            {mode === TYPING_MODES.WORDS && (
              <div className="inline-flex items-center gap-2 ml-2">
                {[25, 50, 100].map((count) => (
                  <button
                    key={count}
                    onClick={() => { handleWordCountChange(count); setTipSeed((v) => v + 1); }}
                    className={`px-2 py-1 rounded-md text-sm ${wordCount === count ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                  >{count}</button>
                ))}
              </div>
            )}

            {/* GOAL mode: target WPM chips */}
            {mode === TYPING_MODES.GOAL && (
              <div className="inline-flex items-center gap-2 ml-2">
                {[30, 40, 50, 60, 75, 100].map((w) => (
                  <button
                    key={w}
                    onClick={() => { handleGoalWpmChange(w); setTipSeed((v) => v + 1); }}
                    className={`px-2 py-1 rounded-md text-sm ${targetWpm === w ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                  >{w}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => { handleRestart(); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'}`}
            >
              <RotateCcw size={14} /> Restart
            </motion.button>
          </div>
        </div>
      </div>
      )}

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`flex-1 overflow-y-auto scrollbar-none px-4 py-6 sm:px-6 sm:py-8 ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_240px]">
          {!isFinished ? (
            <div className="mx-auto w-full max-w-5xl space-y-5 lg:mx-auto xl:max-w-[58rem]">
              {/* Stats Bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                ref={statsBarRef}
                className={`flex flex-wrap justify-center gap-2 rounded-2xl border px-4 py-2 sm:px-5 sm:py-2 ${
                  isDark
                    ? "bg-gray-900/70 border-gray-700"
                    : "bg-white border-slate-200"
                }`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <motion.div className="min-w-[78px] text-center" whileHover={{ scale: 1.02 }}>
                  <motion.span
                    key={liveWpm}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-2xl sm:text-3xl font-semibold text-blue-400 tabular-nums font-mono"
                  >
                    {liveWpm}
                  </motion.span>
                  <div className={`text-[10px] uppercase tracking-[0.18em] ${secondaryText} mt-1 font-medium`}>WPM</div>
                </motion.div>
                <div className={`hidden h-10 w-px ${isDark ? "bg-gray-700/70" : "bg-slate-200"} sm:block`} />
                <motion.div className="min-w-[78px] text-center" whileHover={{ scale: 1.02 }}>
                  <motion.span
                    key={accuracy}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`text-2xl sm:text-3xl font-semibold tabular-nums font-mono ${accuracyState === 'up' ? 'text-emerald-400' : accuracyState === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}
                  >
                    {accuracy}%
                  </motion.span>
                  <div className={`text-[10px] uppercase tracking-[0.18em] ${secondaryText} mt-1 font-medium`}>ACC</div>
                </motion.div>
                {mode === TYPING_MODES.TIME && (
                  <>
                    <div className={`hidden h-10 w-px ${isDark ? "bg-gray-700/70" : "bg-slate-200"} sm:block`} />
                    <motion.div className="min-w-[78px] text-center" whileHover={{ scale: 1.02 }}>
                      <motion.span
                        key={timeLeft}
                        initial={{ scale: 1.2, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-2xl sm:text-3xl font-semibold text-amber-400 tabular-nums font-mono"
                      >
                        {timeLeft}
                      </motion.span>
                      <div className={`text-[10px] uppercase tracking-[0.18em] ${secondaryText} mt-1 font-medium`}>LEFT</div>
                    </motion.div>
                  </>
                )}
                <div className={`hidden h-10 w-px ${isDark ? "bg-gray-700/70" : "bg-slate-200"} sm:block`} />
                <motion.div className="min-w-[96px] text-center" whileHover={{ scale: 1.02 }}>
                  <div className="text-2xl sm:text-3xl font-semibold text-violet-400 tabular-nums font-mono">{completedWords}/{Math.max(totalWords, 0)}</div>
                  <div className={`text-[10px] uppercase tracking-[0.18em] ${secondaryText} mt-1 font-medium`}>WORDS</div>
                </motion.div>
              </motion.div>

              {goalReachedShown && mode === TYPING_MODES.GOAL && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mx-auto w-full max-w-5xl"
                >
                  <div className={`mb-4 rounded-lg px-4 py-2 text-center font-medium ${isDark ? 'bg-emerald-900 text-white/95' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                    You reached your goal of {targetWpm} WPM!
                  </div>
                </motion.div>
              )}

              {/* Typing Area */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
                ref={typingPanelRef}
                className={`rounded-3xl border p-6 sm:p-8 min-h-[220px] shadow-[0_20px_60px_rgba(0,0,0,0.14)] leading-loose ${
                  isDark
                    ? "bg-gray-900/75 border-gray-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <div
                  ref={typingSurfaceRef}
                  className={`${isDark ? "text-slate-300 text-2xl" : "text-slate-700 text-2xl"} outline-none focus:outline-none`}
                  onFocusCapture={syncTypingFocusState}
                  onBlurCapture={() => window.setTimeout(syncTypingFocusState, 0)}
                >
                  <TypingText
                    paragraph={paragraph || customText}
                    characterStates={characterStates}
                    activeIndex={activeIndex}
                    currentWordIndex={currentWordIndex}
                    isDark={isDark}
                    fontScale={fontScale}
                    focused={isTypingAreaFocused}
                    onPointerDown={focusTypingArea}
                    onKeyDown={handleInlineKeyDown}
                    onFocus={syncTypingFocusState}
                    onBlur={() => window.setTimeout(syncTypingFocusState, 0)}
                  />

                  <textarea
                    ref={hiddenInputRef}
                    value={typedText}
                    onKeyDown={handleInlineKeyDown}
                    onChange={() => {}}
                    onPaste={(event) => { if (mode !== TYPING_MODES.CUSTOM) event.preventDefault(); }}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="absolute h-1 w-1 opacity-0 pointer-events-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="mt-4">
                  <div id="typing-input-instructions" className="mt-2 text-center text-sm text-slate-400">
                    Click the text and type directly. Paste is blocked. Characters typed {typedText.length} / {Math.max((paragraph || customText || "").length, 0)}
                  </div>
                  {isTextLoading && textLoadingMessage ? (
                    <div className={`mt-2 text-center text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {textLoadingMessage}
                    </div>
                  ) : null}
                </div>
              </motion.div>

              {/* Mode Switcher removed (moved to top bar) */}

              {/* History & Insights */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <HistoryInsights isDark={isDark} onExportCsv={handleExportCsv} closeSignal={historyCloseSignal} />
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="lg:col-span-1"
            >
              <ResultScreen result={finalResult} bestWpm={bestWpm} onRestart={handleRestart} isDark={isDark} />
            </motion.div>
          )}

          {/* Right Sidebar */}
          {!isFinished ? (
            <aside className="hidden lg:block w-full max-w-[260px]">
              <div className="sticky top-24">
                <RightSidebar bestWpm={bestWpm} bestWpmLabel={bestWpmLabel} liveWpm={liveWpm} resetKey={tipSeed} isDark={isDark} streakInfo={streakInfo} dailyGoalProgress={dailyGoalProgress} />
              </div>
            </aside>
          ) : null}

          {/* Mobile floating toggle */}
          {!isFinished && (
            <div className="lg:hidden">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleSidebar}
                aria-label="Open stats"
                className="fixed right-4 bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-2 text-sm text-white shadow-lg action-btn-mini"
              >
                <BarChart2 size={16} />
              </motion.button>
            </div>
          )}

          <SidebarModal
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isDark={isDark}
            bestWpm={bestWpm}
            bestWpmLabel={bestWpmLabel}
            liveWpm={liveWpm}
            resetKey={tipSeed}
            streakInfo={streakInfo}
            dailyGoalProgress={dailyGoalProgress}
          />
        </div>
      </motion.main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={onToggleTheme}
      />
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} isDark={isDark} />
      <WelcomeTour
        isOpen={isWelcomeTourOpen}
        stepIndex={welcomeTourStep}
        steps={welcomeTourSteps}
        highlightRect={welcomeTourRect}
        onNext={advanceWelcomeTour}
        onSkip={closeWelcomeTour}
      />
    </div>
  );
}

export default memo(TypingTest);
