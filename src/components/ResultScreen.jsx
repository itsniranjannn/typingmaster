import { memo } from "react";
import { motion } from "framer-motion";

function ResultScreen({
  result,
  bestWpm,
  onRestart,
  onViewBadgeGallery,
  onExitToClassicCore,
  arenaMode = false,
  isDark = true
}) {
  if (!result) return null;

  const bgClass = isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-50 border-slate-200";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const cardClass = isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-100 border-slate-300";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-600";
  const goalFailure = result.goalVariant === "reach" && result.goalSuccess === false;
  const challengeFailure = result.challengeFailed && !result.challengeCompleted;
  const badgeMultiplier = Math.max(1, Number(result.challengeEarnedCount) || 1);
  const showArenaResult = arenaMode || result.challengeCompleted || challengeFailure;

  if (showArenaResult) {
    return (
      <section
        className={`result-fade relative overflow-hidden space-y-6 rounded-2xl border ${bgClass} p-8 shadow-lg sm:p-10`}
        aria-live="assertive"
        aria-label="Challenge arena results"
      >
        <div className="confetti-container absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{ '--delay': `${i * 0.05}s` }}></div>
          ))}
        </div>

        <div className="relative space-y-3">
          <h2 className={`text-4xl font-bold ${textClass} md:text-5xl`}>
            {result.challengeCompleted ? "CHALLENGE COMPLETED!" : "CHALLENGE FAILED"}
          </h2>
          <p className={`text-base ${secondaryText} md:text-lg`}>
            {result.challengeCompleted
              ? "You cleared the arena and earned the badge reward."
              : "The arena run ended before every objective was met."}
          </p>
          {result.challengeCompleted ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            >
              <span aria-hidden="true">🏆</span>
              <span>{result.challengeBadgeName || "Arena Badge"}</span>
              <span>{`x${badgeMultiplier}`}</span>
            </motion.div>
          ) : null}
          {challengeFailure ? (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              <span>Retry the challenge to earn the badge.</span>
            </div>
          ) : null}
        </div>

        <div className={`relative grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6`}>
          <div className={`rounded-2xl border ${cardClass} p-6`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Final WPM</p>
            <p className={`mt-4 text-4xl font-bold ${textClass} tabular-nums md:text-5xl`}>{result.wpm}</p>
          </div>
          <div className={`rounded-2xl border ${cardClass} p-6`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Accuracy</p>
            <p className={`mt-4 text-4xl font-bold ${textClass} tabular-nums md:text-5xl`}>{result.accuracy}%</p>
          </div>
          <div className={`rounded-2xl border ${cardClass} p-6`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Time Used</p>
            <p className={`mt-4 text-4xl font-bold ${textClass} tabular-nums md:text-5xl`}>{result.timeUsed}s</p>
          </div>
          <div className={`rounded-2xl border ${cardClass} p-6`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Correct</p>
            <p className={`mt-4 text-4xl font-bold text-emerald-400 tabular-nums md:text-5xl`}>{result.correctCharacters}</p>
          </div>
          <div className={`rounded-2xl border ${cardClass} p-6`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Incorrect</p>
            <p className={`mt-4 text-4xl font-bold text-rose-400 tabular-nums md:text-5xl`}>{result.incorrectCharacters}</p>
          </div>
          <div className={`rounded-2xl border ${cardClass} p-6`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Badge</p>
            <p className={`mt-4 text-2xl font-bold text-sky-400 tabular-nums md:text-3xl`}>{result.challengeBadgeName || "Arena"}</p>
          </div>
        </div>

        <div className="relative flex flex-col gap-3 pt-2 sm:flex-row">
          {result.challengeCompleted ? (
            <button
              type="button"
              onClick={onViewBadgeGallery}
              className={`flex-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-6 py-3 text-base font-semibold text-emerald-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 hover:bg-emerald-500/15 md:py-4 md:text-lg`}
            >
              View Badge Gallery
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRestart}
            aria-label="Retry challenge"
            className={`flex-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 hover:from-purple-700 hover:to-blue-600 md:py-4 md:text-lg`}
          >
            Retry Challenge
          </button>
          <button
            type="button"
            onClick={onExitToClassicCore}
            className={`flex-1 rounded-full border border-slate-500/30 bg-slate-900/30 px-6 py-3 text-base font-semibold text-slate-100 transition hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 md:py-4 md:text-lg`}
          >
            Exit to Classic Core
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`result-fade relative overflow-hidden space-y-8 rounded-2xl border ${bgClass} p-8 shadow-lg sm:p-10`}
      aria-live="assertive"
      aria-label="Typing test results"
    >
      {/* Confetti Container */}
      <div className="confetti-container absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="confetti-piece" style={{ '--delay': `${i * 0.05}s` }}></div>
        ))}
      </div>

      <div className="relative space-y-2">
        <h2 className={`text-4xl font-bold ${textClass} md:text-5xl`}>Test Complete!</h2>
        <p className={`text-base ${secondaryText} md:text-lg`}>
          {goalFailure
            ? "You finished the run, but the target WPM was not reached."
            : challengeFailure
              ? "Challenge failed. Retry the arena for another badge attempt."
            : result.improvedBest
              ? "🎉 You beat your personal best!"
              : "Great effort!"}
        </p>
        {result.challengeCompleted ? (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            <span aria-hidden="true">🏆</span>
            <span>Challenge completed!</span>
            {result.challengeBadgeName ? <span className="opacity-90">{result.challengeBadgeName}</span> : null}
          </motion.div>
        ) : null}
        {challengeFailure ? (
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            <span>Retry Arena</span>
          </div>
        ) : null}
      </div>

      <div className={`relative grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6`}>
        <div className={`rounded-2xl border ${cardClass} p-6`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>WPM</p>
          <p className={`mt-4 text-4xl font-bold ${textClass} tabular-nums md:text-5xl`}>{result.wpm}</p>
        </div>
        <div className={`rounded-2xl border ${cardClass} p-6`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Accuracy</p>
          <p className={`mt-4 text-4xl font-bold ${textClass} tabular-nums md:text-5xl`}>{result.accuracy}%</p>
        </div>
        <div className={`rounded-2xl border ${cardClass} p-6`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Time</p>
          <p className={`mt-4 text-4xl font-bold ${textClass} tabular-nums md:text-5xl`}>{result.timeUsed}s</p>
        </div>
        <div className={`rounded-2xl border ${cardClass} p-6`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Correct</p>
          <p className={`mt-4 text-4xl font-bold text-emerald-400 tabular-nums md:text-5xl`}>{result.correctCharacters}</p>
        </div>
        <div className={`rounded-2xl border ${cardClass} p-6`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Incorrect</p>
          <p className={`mt-4 text-4xl font-bold text-rose-400 tabular-nums md:text-5xl`}>{result.incorrectCharacters}</p>
        </div>
        <div className={`rounded-2xl border ${cardClass} p-6`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Personal Best</p>
          <p className={`mt-4 text-4xl font-bold text-sky-400 tabular-nums md:text-5xl`}>{bestWpm}</p>
        </div>
      </div>

      <div className="relative flex gap-3 pt-4">
        <button onClick={onRestart} aria-label="Restart test" className={`flex-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 hover:from-purple-700 hover:to-blue-600 md:py-4 md:text-lg`}>
          {challengeFailure ? "Retry Arena" : "Try Again"}
        </button>
      </div>
    </section>
  );
}

export default memo(ResultScreen);
