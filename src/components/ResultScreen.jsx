import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Brain,
  Calculator,
  Crown,
  Flame,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Lock
} from "lucide-react";
import { getLastResults } from "../utils/storage";

const ICONS = {
  Award,
  Brain,
  Calculator,
  Crown,
  Flame,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Zap
};

const buildSmoothPath = (points, valueKey) => {
  if (!Array.isArray(points) || points.length === 0) return "";
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point[valueKey]}`;
  }

  const path = [`M ${points[0].x} ${points[0][valueKey]}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] || current;
    const following = points[index + 2] || next;

    const controlPoint1X = current.x + (next.x - previous.x) / 6;
    const controlPoint1Y = current[valueKey] + (next[valueKey] - previous[valueKey]) / 6;
    const controlPoint2X = next.x - (following.x - current.x) / 6;
    const controlPoint2Y = next[valueKey] - (following[valueKey] - current[valueKey]) / 6;

    path.push(`C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next[valueKey]}`);
  }

  return path.join(" ");
};

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

  const trendSeries = useMemo(() => {
    const history = getLastResults().slice(0, 8).reverse();
    if (!history.length) return [];
    return history.map((entry) => ({
      id: entry.id,
      wpm: Math.max(0, Number(entry.wpm) || 0),
      accuracy: Math.max(0, Math.min(100, Number(entry.accuracy) || 0)),
      mode: entry.mode || "time"
    }));
  }, [result?.id]);

  const trendMeta = useMemo(() => {
    if (!trendSeries.length) return null;

    const maxWpm = Math.max(1, ...trendSeries.map((entry) => entry.wpm));
    const pointStep = trendSeries.length > 1 ? 100 / (trendSeries.length - 1) : 100;

    const wpmPoints = trendSeries
      .map((entry, index) => {
        const x = Number((index * pointStep).toFixed(2));
        const y = Number((100 - (entry.wpm / maxWpm) * 100).toFixed(2));
        return `${x},${y}`;
      })
      .join(" ");

    const accuracyPoints = trendSeries
      .map((entry, index) => {
        const x = Number((index * pointStep).toFixed(2));
        const y = Number((100 - entry.accuracy).toFixed(2));
        return `${x},${y}`;
      })
      .join(" ");

    const points = trendSeries.map((entry, index) => ({
      ...entry,
      x: Number((index * pointStep).toFixed(2)),
      wpmY: Number((100 - (entry.wpm / maxWpm) * 100).toFixed(2)),
      accuracyY: Number((100 - entry.accuracy).toFixed(2))
    }));

    const wpmPath = buildSmoothPath(points, "wpmY");
    const accuracyPath = buildSmoothPath(points, "accuracyY");

    const wpmArea = trendSeries.length > 1
      ? `${wpmPath} L 100 100 L 0 100 Z`
      : `${wpmPath} L 0 100 Z`;

    const accuracyArea = trendSeries.length > 1
      ? `${accuracyPath} L 100 100 L 0 100 Z`
      : `${accuracyPath} L 0 100 Z`;

    const latest = trendSeries[trendSeries.length - 1];
    const previous = trendSeries[trendSeries.length - 2];
    const deltaWpm = previous ? latest.wpm - previous.wpm : 0;

    return {
      wpmPoints,
      accuracyPoints,
      wpmPath,
      wpmArea,
      accuracyPath,
      accuracyArea,
      points,
      maxWpm,
      latest,
      deltaWpm
    };
  }, [trendSeries]);

  const bgClass = isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-50 border-slate-200";
  const textClass = isDark ? "text-white" : "text-slate-900";
  const cardClass = isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-100 border-slate-300";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-600";
  const goalFailure = result.goalVariant === "reach" && result.goalSuccess === false;
  const challengeFailure = result.challengeFailed && !result.challengeCompleted;
  const badgeMultiplier = Math.max(1, Number(result.challengeEarnedCount) || 1);
  const BadgeIcon = result.challengeCompleted ? (ICONS[result.challengeBadgeIconName] || Trophy) : Lock;
  const showArenaResult = arenaMode || result.challengeCompleted || challengeFailure;

  const trendPanel = trendMeta ? (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${cardClass}`}>
      <div className={`pointer-events-none absolute inset-0 opacity-70 ${isDark ? "bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_36%),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,24px_24px,24px_24px]" : "bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:auto,24px_24px,24px_24px]"}`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${secondaryText}`}>Recent Performance</p>
          <p className={`text-xs ${secondaryText}`}>Across your last {trendSeries.length} runs (all modes)</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${trendMeta.deltaWpm >= 0 ? (isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-100 text-emerald-700") : (isDark ? "bg-rose-500/10 text-rose-200" : "bg-rose-100 text-rose-700")}`}>
          {trendMeta.deltaWpm >= 0 ? "+" : ""}{trendMeta.deltaWpm} WPM vs prev
        </div>
      </div>

      <div className="relative mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_170px]">
        <div className={`rounded-xl border p-3 ${isDark ? "border-slate-700/50 bg-slate-950/55" : "border-slate-200 bg-white/75"}`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-32 w-full overflow-visible">
            <defs>
              <linearGradient id="wpmLine" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="accLine" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
              <linearGradient id="wpmAreaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="accAreaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
              </linearGradient>
              <pattern id="trendGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" fill="none" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)"} strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="url(#trendGrid)" opacity="0.55" />
            <path d={trendMeta.wpmArea} fill="url(#wpmAreaFill)" />
            <path d={trendMeta.accuracyArea} fill="url(#accAreaFill)" />
            <path d={trendMeta.wpmPath} fill="none" stroke="url(#wpmLine)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={trendMeta.accuracyPath} fill="none" stroke="url(#accLine)" strokeWidth="1.5" strokeDasharray="2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
            {trendMeta.points.map((point, index) => (
              <g key={`${point.id}-${index}`}>
                <circle cx={point.x} cy={point.wpmY} r="1.5" fill="#38bdf8" />
                <circle cx={point.x} cy={point.accuracyY} r="1.1" fill="#f472b6" opacity="0.95" />
              </g>
            ))}
          </svg>
          <div className={`mt-1 flex items-center gap-4 text-[11px] ${secondaryText}`}>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" /> WPM</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" /> Accuracy</span>
          </div>
          <div className={`mt-3 flex flex-wrap gap-1.5 text-[10px] ${secondaryText}`}>
            {trendSeries.map((entry, index) => (
              <span key={`${entry.id}-${index}`} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${entry.mode === "challenge_arena" ? "bg-amber-400" : entry.mode === "time" ? "bg-cyan-400" : entry.mode === "words" ? "bg-emerald-400" : entry.mode === "goal" ? "bg-fuchsia-400" : "bg-slate-400"}`} />
                {entry.mode}
              </span>
            ))}
          </div>
        </div>
        <div className={`rounded-xl border p-3 text-sm ${isDark ? "border-slate-700/50 bg-slate-900/40 text-slate-200" : "border-slate-200 bg-white/70 text-slate-700"}`}>
          <p className={`text-[11px] uppercase tracking-[0.14em] ${secondaryText}`}>Latest Run</p>
          <p className="mt-2 font-semibold">{trendMeta.latest.wpm} WPM</p>
          <p className={`${secondaryText}`}>{trendMeta.latest.accuracy.toFixed(1)}% ACC</p>
          <p className={`mt-3 text-[11px] uppercase tracking-[0.14em] ${secondaryText}`}>Scale</p>
          <p>0 - {trendMeta.maxWpm} WPM</p>
          <div className={`mt-4 rounded-xl border px-3 py-2 ${isDark ? "border-slate-700/60 bg-white/5" : "border-slate-200 bg-white/90"}`}>
            <p className={`text-[10px] uppercase tracking-[0.14em] ${secondaryText}`}>Run Type</p>
            <p className="mt-1 font-semibold capitalize">{trendMeta.latest.mode.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    </div>
  ) : null;

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
              <BadgeIcon size={14} aria-hidden="true" />
              <span>{result.challengeBadgeName || "Arena Badge"}</span>
              <span>{`x${badgeMultiplier}`}</span>
            </motion.div>
          ) : null}
          {result.challengeCompletedToday ? (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              <span>Badge already earned today.</span>
            </div>
          ) : null}
          {challengeFailure ? (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              <span>Retry the challenge to earn the badge.</span>
            </div>
          ) : null}
        </div>

        {trendPanel}

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
            {result.challengeCompletedToday ? "Already earned badge today" : "Retry Challenge"}
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

      {trendPanel}

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
