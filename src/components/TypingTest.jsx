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
import { TYPING_MODES, GOAL_VARIANTS, CUSTOM_TIME_MIN_SECONDS, CUSTOM_TIME_MAX_SECONDS } from "../constants/typingModes";
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
  const [wordCountInput, setWordCountInput] = useState(String(wordCount));
  const [mobileCoreOpen, setMobileCoreOpen] = useState(false);
  const headerControlsRef = useRef(null);
  const modeBarRef = useRef(null);
  const typingPanelRef = useRef(null);
  const statsBarRef = useRef(null);
  const isCoreMode = [TYPING_MODES.TIME, TYPING_MODES.WORDS, TYPING_MODES.GOAL].includes(mode);

  const syncTypingFocusState = useCallback(() => {
    const wrapper = typingSurfaceRef.current;
    const activeElement = document.activeElement;
    setIsTypingAreaFocused(Boolean(wrapper && activeElement && wrapper.contains(activeElement)));
  }, [mode]);

  useEffect(() => {
    setTimeInput(String(timeLimitSeconds));
  }, [timeLimitSeconds]);

  useEffect(() => {
    setWordCountInput(String(wordCount));
  }, [wordCount]);

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

  const commitWordCountInput = useCallback(
    (value) => {
      const trimmedValue = String(value).trim();
      if (trimmedValue.length === 0) return;

      const parsedValue = Number(trimmedValue);
      if (!Number.isFinite(parsedValue)) return;

      handleModeChange(TYPING_MODES.WORDS, { wordCount: Math.min(300, Math.max(10, Math.round(parsedValue))) });
    },
    [handleModeChange]
  );

  const activateCoreMode = useCallback(() => {
    if (isCoreMode) {
      return;
    }
    handleModeChange(TYPING_MODES.TIME, { timeLimitSeconds });
  }, [handleModeChange, isCoreMode, timeLimitSeconds]);

  const welcomeTourSteps = useMemo(
    () => [
      {
        target: "modeBar",
        title: "Pick a test mode",
        description:
          "This Core bar lets you switch Time, Words, and Goal settings, then restart the run. Use the top selector above to enter Classic Core, Quotes, Custom, or Numbers."
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <AppLogo isDark={isDark} />
            {/* simplified nav - removed Practice / Leaderboard / Pro Tip links per request */}
          </div>
          <div className="w-full flex-1 sm:px-2 mt-3 sm:mt-0">
            <TextSelector
              mode={mode}
              customText={customText}
              onModeChange={handleModeChange}
              onCoreSelect={activateCoreMode}
              onCustomTextChange={handleCustomTextChange}
              isDark={isDark}
            />
          </div>

          <div ref={headerControlsRef} className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
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

      {/* Core settings bar */}
      <motion.div
        ref={modeBarRef}
        initial={false}
        animate={isCoreMode ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -8, scale: 0.995 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={`w-full px-2 sm:px-4 overflow-visible ${isCoreMode ? "pointer-events-auto max-h-[160px]" : "pointer-events-none max-h-0"} relative`}
      >
        <motion.div key="core-settings-bar" initial={false}>
          <div className="hidden sm:block">
            <div className={`w-full rounded-xl border px-3 py-2 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_20px_rgba(2,6,23,0.06)] ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200/70 bg-white/90"}`}>
              <div className="flex items-center gap-2">
                {/* Sections: each button with inline adjacent options when active */}
                {[
                  { value: TYPING_MODES.TIME, label: "Time", detail: "Time mode: choose a duration and type as fast as you can." },
                  { value: TYPING_MODES.WORDS, label: "Words", detail: "Words mode: choose a target word count or type a custom count." },
                  { value: TYPING_MODES.GOAL, label: "Goal", detail: "Goal mode: choose Sustain or Reach, then pick a target WPM." }
                ].map((section) => {
                  const isActive = mode === section.value;
                  return (
                    <div key={section.value} className="inline-flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (section.value === TYPING_MODES.TIME) {
                            handleModeChange(TYPING_MODES.TIME, { timeLimitSeconds });
                          } else if (section.value === TYPING_MODES.WORDS) {
                            handleModeChange(TYPING_MODES.WORDS, { wordCount });
                          } else {
                            handleModeChange(TYPING_MODES.GOAL, { goalVariant });
                          }
                        }}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold tracking-[0.01em] transition ${isActive ? "bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.35),0_8px_20px_rgba(14,165,233,0.14)]" : isDark ? "bg-slate-900/80 text-slate-200 hover:bg-slate-800" : "bg-white/90 text-slate-700 hover:bg-slate-100"}`}
                        aria-pressed={isActive}
                        title={section.detail}
                      >
                        <span>{section.label}</span>
                      </button>

                      {isActive && (
                        <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }} className="inline-flex items-center gap-2 text-sm">
                          {/* reuse existing controls */}
                          {section.value === TYPING_MODES.TIME && (
                            <>
                              {[10, 30, 60].map((seconds) => (
                                <button key={seconds} onClick={() => { setTimeInput(String(seconds)); handleModeChange(TYPING_MODES.TIME, { timeLimitSeconds: seconds }); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }} className={`rounded-full px-2.5 py-1 text-sm font-semibold transition ${mode === TYPING_MODES.TIME && timeLimitSeconds === seconds ? "bg-gradient-to-r from-cyan-400 to-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.22)]" : isDark ? "bg-slate-900/80 text-slate-200 hover:bg-slate-800" : "bg-white text-slate-700 hover:bg-slate-100"}`}>{seconds}s</button>
                              ))}
                              <div className={`flex items-center gap-2 rounded-full border px-2 py-1 ${isDark ? "border-slate-700/70 bg-slate-900/70" : "border-slate-200 bg-white"}`} title="Type a custom time between 10 and 300 seconds">
                                <input type="number" min={CUSTOM_TIME_MIN_SECONDS} max={CUSTOM_TIME_MAX_SECONDS} value={timeInput} onChange={(event) => setTimeInput(event.target.value)} onBlur={() => { if (String(timeInput).trim().length === 0) { setTimeInput(String(timeLimitSeconds)); return; } commitTimeInput(timeInput); }} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } }} className={`w-12 bg-transparent text-sm font-semibold outline-none ${isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}`} aria-label="Custom time limit in seconds" />
                                <span className={`text-[10px] uppercase tracking-[0.2em] ${secondaryText}`}>max 300s</span>
                              </div>
                            </>
                          )}

                          {section.value === TYPING_MODES.WORDS && (
                            <>
                              {[25, 50, 100].map((count) => (
                                <button key={count} onClick={() => { setWordCountInput(String(count)); handleModeChange(TYPING_MODES.WORDS, { wordCount: count }); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${mode === TYPING_MODES.WORDS && wordCount === count ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.24)]" : isDark ? "bg-slate-900/80 text-slate-200 hover:bg-slate-800" : "bg-white text-slate-700 hover:bg-slate-100"}`} title={`Set the test to ${count} words`}>{count}</button>
                              ))}
                              <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDark ? "border-slate-700/70 bg-slate-900/70" : "border-slate-200 bg-white"}`} title="Type a custom word count between 10 and 300">
                                <input type="number" min={10} max={300} value={wordCountInput} onChange={(event) => setWordCountInput(event.target.value)} onBlur={() => { if (String(wordCountInput).trim().length === 0) { setWordCountInput(String(wordCount)); return; } commitWordCountInput(wordCountInput); }} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } }} className={`w-16 bg-transparent text-sm font-semibold outline-none ${isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}`} aria-label="Custom word count" />
                                <span className={`text-[10px] uppercase tracking-[0.2em] ${secondaryText}`}>max 300</span>
                              </div>
                            </>
                          )}

                          {section.value === TYPING_MODES.GOAL && (
                            <>
                              {[{ value: GOAL_VARIANTS.SUSTAIN, label: "Sustain", detail: "Hold the target WPM for a short window to finish." }, { value: GOAL_VARIANTS.REACH, label: "Reach", detail: "Finish the full text and meet the target WPM to score." }].map((goalItem) => (
                                <button key={goalItem.value} onClick={() => { handleModeChange(TYPING_MODES.GOAL, { goalVariant: goalItem.value }); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }} className={`group rounded-full px-3 py-1.5 text-sm font-semibold transition ${mode === TYPING_MODES.GOAL && goalVariant === goalItem.value ? "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-[0_0_18px_rgba(244,114,182,0.24)]" : isDark ? "bg-slate-900/80 text-slate-200 hover:bg-slate-800" : "bg-white text-slate-700 hover:bg-slate-100"}`} aria-pressed={mode === TYPING_MODES.GOAL && goalVariant === goalItem.value} title={goalItem.detail}><span className="inline-flex items-center gap-1"><span>{goalItem.label}</span></span></button>
                              ))}

                              <div className="inline-flex flex-wrap items-center gap-2">
                                {[30, 40, 50, 60, 75, 100].map((wpm) => (
                                  <button key={wpm} onClick={() => { handleGoalWpmChange(wpm); setTipSeed((v) => v + 1); }} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${targetWpm === wpm ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_0_18px_rgba(251,146,60,0.22)]" : isDark ? "bg-slate-900/80 text-slate-200 hover:bg-slate-800" : "bg-white text-slate-700 hover:bg-slate-100"}`} title={`Set the Goal target to ${wpm} WPM`}>{wpm}</button>
                                ))}
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}

                <div className="ml-auto">
                  <motion.button onClick={() => { handleRestart(); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'}`} title="Restart the current Core test with the selected settings"><RotateCcw size={14} /> Restart</motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile compact control */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between">
              <button onClick={() => setMobileCoreOpen((v) => !v)} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'} shadow-sm`}>{mobileCoreOpen ? 'Close' : 'Core'}</button>
              <motion.button onClick={() => { handleRestart(); setTipSeed((v) => v + 1); setGoalReachedShown(false); if (goalReachedTimeoutRef.current) { window.clearTimeout(goalReachedTimeoutRef.current); goalReachedTimeoutRef.current = null; } }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'}`} title="Restart the current Core test with the selected settings"><RotateCcw size={14} /> Restart</motion.button>
            </div>

            {mobileCoreOpen && (
              <div id="mobile-core-panel" className={`mt-2 rounded-lg border p-3 ${isDark ? 'border-slate-700/60 bg-slate-950/55' : 'border-slate-200/70 bg-white/95'}`}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { handleModeChange(TYPING_MODES.TIME, { timeLimitSeconds }); setMobileCoreOpen(false); }} className={`rounded-full px-3 py-1.5 ${mode===TYPING_MODES.TIME ? 'bg-cyan-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Time</button>
                    <button onClick={() => { handleModeChange(TYPING_MODES.WORDS, { wordCount }); setMobileCoreOpen(false); }} className={`rounded-full px-3 py-1.5 ${mode===TYPING_MODES.WORDS ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Words</button>
                    <button onClick={() => { handleModeChange(TYPING_MODES.GOAL, { goalVariant }); setMobileCoreOpen(false); }} className={`rounded-full px-3 py-1.5 ${mode===TYPING_MODES.GOAL ? 'bg-fuchsia-500 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Goal</button>
                  </div>

                  {mode===TYPING_MODES.TIME && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                      {[10,30,60].map(s=> (<button key={s} onClick={()=>{ setTimeInput(String(s)); handleModeChange(TYPING_MODES.TIME, { timeLimitSeconds: s }); setMobileCoreOpen(false); }} className={`rounded-full px-3 py-1 text-sm ${timeLimitSeconds===s ? 'bg-cyan-400 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>{s}s</button>))}
                      <div className={`flex items-center gap-2 rounded-full border px-2 py-1 ${isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <input type="number" min={CUSTOM_TIME_MIN_SECONDS} max={CUSTOM_TIME_MAX_SECONDS} value={timeInput} onChange={(e)=>setTimeInput(e.target.value)} onBlur={()=>commitTimeInput(timeInput)} className="w-14 bg-transparent text-sm outline-none" />
                        <span className="text-xs text-slate-400">max 300s</span>
                      </div>
                    </div>
                  )}

                  {mode===TYPING_MODES.WORDS && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                      {[25,50,100].map(c=> (<button key={c} onClick={()=>{ setWordCountInput(String(c)); handleModeChange(TYPING_MODES.WORDS, { wordCount: c }); setMobileCoreOpen(false); }} className={`rounded-full px-3 py-1 text-sm ${wordCount===c ? 'bg-emerald-400 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>{c}</button>))}
                      <div className={`flex items-center gap-2 rounded-full border px-2 py-1 ${isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <input type="number" min={10} max={300} value={wordCountInput} onChange={(e)=>setWordCountInput(e.target.value)} onBlur={()=>commitWordCountInput(wordCountInput)} className="w-16 bg-transparent text-sm outline-none" />
                        <span className="text-xs text-slate-400">max 300</span>
                      </div>
                    </div>
                  )}

                  {mode===TYPING_MODES.GOAL && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {[{ value: GOAL_VARIANTS.SUSTAIN, label: 'Sustain' }, { value: GOAL_VARIANTS.REACH, label: 'Reach' }].map(g=> (<button key={g.value} onClick={()=>{ handleModeChange(TYPING_MODES.GOAL, { goalVariant: g.value }); setMobileCoreOpen(false); }} className={`rounded-full px-3 py-1 ${goalVariant===g.value ? 'bg-fuchsia-400 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>{g.label}</button>))}
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                        {[30,40,50,60,75,100].map(w=> (<button key={w} onClick={()=>{ handleGoalWpmChange(w); setMobileCoreOpen(false); }} className={`rounded-full px-3 py-1 ${targetWpm===w ? 'bg-amber-400 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>{w}</button>))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`flex-1 overflow-y-auto scrollbar-none px-4 py-6 sm:px-6 sm:py-8 ${isDark ? "bg-gray-900" : "bg-white"}`}
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
