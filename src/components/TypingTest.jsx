import { memo, useCallback, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Settings, RotateCcw, Trophy, Type } from "lucide-react";
import confetti from "canvas-confetti";
import AppLogo from "./AppLogo";
import TextSelector from "./TextSelector";
import TypingInput from "./TypingInput";
import TypingText from "./TypingText";
import ResultScreen from "./ResultScreen";
import SettingsModal from "./SettingsModal";
import LeaderboardModal from "./LeaderboardModal";
import ModeSwitcher from "./ModeSwitcher";
import SoundControls from "./SoundControls";
import HistoryInsights from "./HistoryInsights";
import RightSidebar from "./RightSidebar";
import { useTypingTest } from "../hooks/useTypingTest";
import { TYPING_MODES } from "../constants/typingModes";
import { exportResultsToCSV } from "../utils/storage";

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
    characterStates,
    timeLeft,
    elapsedSeconds,
    liveWpm,
    accuracy,
    isActive,
    isFinished,
    focusTrigger,
    focusTypingInput,
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
    bestWpm,
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
  const [tipSeed, setTipSeed] = useState(0);
  const [historyCloseSignal, setHistoryCloseSignal] = useState(0);
  const didCelebrateBestRef = useRef(false);
  const [prevAccuracy, setPrevAccuracy] = useState(accuracy);
  const [accuracyState, setAccuracyState] = useState(null);

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

      if (event.key === "Tab") {
        const activeElement = document.activeElement;
        const typingTag = activeElement?.tagName;
        const isTypingFocused = typingTag === "TEXTAREA" || typingTag === "INPUT";
        if (!isTypingFocused) {
          event.preventDefault();
          focusTypingInput();
        }
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
  }, [closeOverlays, focusTypingInput, handleRestart, toggleSound]);

  // Show a short, immediate message when the user first reaches the target WPM in Goal mode
  useEffect(() => {
    if (mode !== TYPING_MODES.GOAL) return;
    if (goalReachedShown) return;
    // Show the banner only after a short warmup and use the smoothed liveWpm to avoid spikes
    const warmupSeconds = 3;
    if (typeof liveWpm === 'number' && elapsedSeconds >= warmupSeconds && liveWpm >= targetWpm && targetWpm > 0) {
      setGoalReachedShown(true);
      if (goalReachedTimeoutRef.current) {
        window.clearTimeout(goalReachedTimeoutRef.current);
        goalReachedTimeoutRef.current = null;
      }
      goalReachedTimeoutRef.current = window.setTimeout(() => {
        window.location.reload();
        goalReachedTimeoutRef.current = null;
      }, 5000);
    }

    return () => {
      if (goalReachedTimeoutRef.current) {
        window.clearTimeout(goalReachedTimeoutRef.current);
        goalReachedTimeoutRef.current = null;
      }
    };
  }, [mode, liveWpm, elapsedSeconds, targetWpm, goalReachedShown]);

  const isDark = theme === "dark";
  const cardBg = isDark
    ? "border-gray-700 bg-gray-800"
    : "border-slate-300 bg-slate-100";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-600";

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
          <AppLogo isDark={isDark} />

          <div className="hidden flex-1 sm:block">
            <TextSelector
              mode={mode}
              customText={customText}
              onModeChange={handleModeChange}
              onCustomTextChange={handleCustomTextChange}
              isDark={isDark}
            />
          </div>

          <div className="flex items-center gap-2">
            <SoundControls
              isSoundEnabled={isSoundEnabled}
              onToggleSound={toggleSound}
              volume={volume}
              onVolumeChange={setVolume}
            />

            <motion.button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-200 hover:bg-slate-300"}`}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun size={18} className="text-yellow-500" />
              ) : (
                <Moon size={18} className="text-slate-700" />
              )}
            </motion.button>
            <motion.button
              onClick={() => setIsLeaderboardOpen(true)}
              className={`p-2 rounded-lg transition ${isDark ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-200 hover:bg-slate-300"}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
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

          <div className={`hidden md:flex items-center gap-3 rounded-full border px-4 py-2 ${isDark ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
            <Type size={16} className={isDark ? "text-cyan-300" : "text-blue-500"} />
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${secondaryText}`}>Text size</span>
              <input
                type="range"
                min="0.9"
                max="1.35"
                step="0.05"
                value={fontScale}
                onChange={(event) => setFontScale(Number(event.target.value))}
                className="w-28 accent-sky-500"
                aria-label="Text size"
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`flex-1 overflow-y-auto px-4 py-8 sm:px-6 sm:py-10 ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_240px]">
          {!isFinished ? (
            <div className="mx-auto w-full max-w-5xl space-y-8 lg:mx-auto xl:max-w-[58rem]">
              {/* Stats Bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`flex flex-wrap justify-center gap-8 rounded-2xl border p-6 sm:p-8 ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-slate-100 border-slate-300"
                }`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                  <motion.span
                    key={liveWpm}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-5xl font-bold text-blue-400 tabular-nums font-mono"
                  >
                    {liveWpm}
                  </motion.span>
                  <div className={`text-xs uppercase tracking-widest ${secondaryText} mt-2 font-semibold`}>WPM</div>
                </motion.div>
                <div className={`hidden h-16 w-px ${isDark ? "bg-gray-700" : "bg-slate-300"} sm:block`} />
                <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                  <motion.span
                    key={accuracy}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`text-5xl font-bold tabular-nums font-mono ${accuracyState === 'up' ? 'text-emerald-400' : accuracyState === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}
                  >
                    {accuracy}%
                  </motion.span>
                  <div className={`text-xs uppercase tracking-widest ${secondaryText} mt-2 font-semibold`}>Accuracy</div>
                </motion.div>
                {mode === TYPING_MODES.TIME && (
                  <>
                    <div className={`hidden h-16 w-px ${isDark ? "bg-gray-700" : "bg-slate-300"} sm:block`} />
                    <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                      <motion.span
                        key={timeLeft}
                        initial={{ scale: 1.2, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-5xl font-bold text-amber-400 tabular-nums font-mono"
                      >
                        {timeLeft}
                      </motion.span>
                      <div className={`text-xs uppercase tracking-widest ${secondaryText} mt-2 font-semibold`}>Time Left</div>
                    </motion.div>
                  </>
                )}
                <div className={`hidden h-16 w-px ${isDark ? "bg-gray-700" : "bg-slate-300"} sm:block`} />
                <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                  <div className="text-5xl font-bold text-violet-400 tabular-nums font-mono">{completedWords}/{Math.max(totalWords, 0)}</div>
                  <div className={`text-xs uppercase tracking-widest ${secondaryText} mt-2 font-semibold`}>Words</div>
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
                className={`rounded-3xl border p-8 sm:p-12 min-h-[250px] shadow-xl leading-loose ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-slate-100 border-slate-300"
                }`}
              >
                <div className={isDark ? "text-slate-300 text-2xl" : "text-slate-700 text-2xl"}>
                  <TypingText
                    paragraph={paragraph || customText}
                    characterStates={characterStates}
                    activeIndex={activeIndex}
                    isDark={isDark}
                    fontScale={fontScale}
                  />
                </div>

                <div className="mt-8">
                  <TypingInput
                    typedText={typedText}
                    onType={handleTyping}
                    disabled={isFinished || (!isActive && typedText !== "")}
                    focusTrigger={focusTrigger}
                    maxLength={paragraph?.length || customText?.length || 1000}
                    fontScale={fontScale}
                    describedById="typing-input-instructions"
                  />
                  <div id="typing-input-instructions" className="mt-2 text-center text-sm text-slate-400">
                    Start typing here. Paste is blocked. Characters typed {typedText.length} / {Math.max((paragraph || customText || "").length, 0)}
                  </div>
                </div>
              </motion.div>

              {/* Mode Switcher & Restart */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-2xl border p-6 ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-slate-100 border-slate-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <ModeSwitcher
                    mode={mode}
                    wordCount={wordCount}
                    customText={customText}
                    targetWpm={targetWpm}
                    goalAchievedSeconds={goalAchievedSeconds}
                    isDark={isDark}
                    onModeChange={(newMode) => {
                      handleModeChange(newMode);
                      setTipSeed((value) => value + 1);
                      setGoalReachedShown(false);
                      if (goalReachedTimeoutRef.current) {
                        window.clearTimeout(goalReachedTimeoutRef.current);
                        goalReachedTimeoutRef.current = null;
                      }
                    }}
                    onWordCountChange={handleWordCountChange}
                    onCustomTextChange={handleCustomTextChange}
                    onTargetWpmChange={handleGoalWpmChange}
                  />

                  <motion.button
                    onClick={() => {
                      handleRestart();
                      setTipSeed((value) => value + 1);
                      setGoalReachedShown(false);
                      if (goalReachedTimeoutRef.current) {
                        window.clearTimeout(goalReachedTimeoutRef.current);
                        goalReachedTimeoutRef.current = null;
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`inline-flex items-center gap-2 rounded-lg px-6 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${
                      isDark
                        ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-900 hover:bg-slate-300"
                    }`}
                    aria-label="Restart test"
                  >
                    <RotateCcw size={16} />
                    Restart
                  </motion.button>
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Shortcuts: Ctrl+Shift+R (restart), Ctrl+Shift+S (sound), Esc (close)
                </p>
              </motion.div>

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
            <aside className="hidden lg:block w-full max-w-[240px]">
              <div className="sticky top-6">
                <RightSidebar bestWpm={bestWpm} liveWpm={liveWpm} resetKey={tipSeed} isDark={isDark} streakInfo={streakInfo} dailyGoalProgress={dailyGoalProgress} />
              </div>
            </aside>
          ) : null}
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
    </div>
  );
}

export default memo(TypingTest);
