import { memo, useMemo } from "react";
import { Activity, BarChart3, Flame, Gauge, KeyRound, TimerReset, Waves } from "lucide-react";
import { summarizePlayerBehaviorHistory } from "../analysis/playerBehaviorAnalysis";

const ICONS = {
  consistency: Gauge,
  burst: Activity,
  correction: KeyRound,
  fatigue: Flame,
  weakKeys: BarChart3,
  improvement: Waves,
  rhythm: TimerReset
};

const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPercent = (value) => `${Math.round(clampNumber(value) * 100)}%`;

function InsightPill({ label, value, tone = "cyan", icon: Icon }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-100"
  };

  return (
    <div className={`rounded-2xl border px-3 py-3 ${tones[tone] || tones.cyan}`}>
      <div className="flex items-start gap-2">
        {Icon ? <Icon size={14} className="mt-0.5 shrink-0" /> : null}
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PerformanceInsights({ history = [], isDark = true }) {
  const summary = useMemo(() => summarizePlayerBehaviorHistory(history), [history]);

  const weakKeys = useMemo(() => {
    const top = summary.correctionClustering?.averageClusterSize || 0;
    const count = summary.correctionClustering?.clusterCount || 0;
    return count > 0 ? `${count} clusters, ${top.toFixed(1)} avg size` : "No correction clusters";
  }, [summary]);

  const rhythmSummary = useMemo(() => {
    const hesitation = summary.hesitation?.hesitationScore ?? 0;
    const burstRatio = summary.burst?.ratio ?? 0;
    return `${burstRatio.toFixed(2)} burst ratio · ${formatPercent(1 - clampNumber(hesitation, 0))} rhythm`;
  }, [summary]);

  const cards = [
    { label: "Consistency", value: `${summary.rollingConsistency.at(-1)?.averageConsistency?.toFixed(1) ?? "0.0"}%`, icon: ICONS.consistency, tone: "cyan" },
    { label: "Burst vs Sustained", value: `${summary.burst?.ratio?.toFixed(2) ?? "0.00"}x`, icon: ICONS.burst, tone: "violet" },
    { label: "Correction Habits", value: `${formatPercent(summary.retry?.retryRatio ?? 0)} retry rate`, icon: ICONS.correction, tone: "amber" },
    { label: "Fatigue", value: `${formatPercent(summary.fatigue?.fatigueScore ?? 0)} risk`, icon: ICONS.fatigue, tone: "rose" },
    { label: "Improvement Velocity", value: `${(summary.improvement?.combinedVelocity ?? 0).toFixed(2)} / run`, icon: ICONS.improvement, tone: "emerald" },
    { label: "Weak Keys", value: weakKeys, icon: ICONS.weakKeys, tone: "violet" },
    { label: "Typing Rhythm", value: rhythmSummary, icon: ICONS.rhythm, tone: "cyan" }
  ];

  const containerClass = isDark ? "border-slate-700/50 bg-slate-900/60 text-slate-100" : "border-slate-200 bg-white/90 text-slate-900";
  const subTextClass = isDark ? "text-slate-400" : "text-slate-600";

  return (
    <section className={`rounded-3xl border p-5 shadow-lg ${containerClass}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subTextClass}`}>Performance Insights</p>
          <h3 className="mt-1 text-lg font-semibold">Post-run rhythm and consistency</h3>
        </div>
        <p className={`text-xs ${subTextClass}`}>Derived from your completed sessions only</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <InsightPill key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}

export default memo(PerformanceInsights);