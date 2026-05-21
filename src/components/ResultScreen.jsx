import { memo } from "react";

function ResultScreen({ result, bestWpm, onRestart, isDark = true }) {
  if (!result) return null;

  const bgClass = isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-50 border-slate-200";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const cardClass = isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-100 border-slate-300";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-600";

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
          {result.improvedBest ? "🎉 You beat your personal best!" : "Great effort!"}
        </p>
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
          Try Again
        </button>
      </div>
    </section>
  );
}

export default memo(ResultScreen);
