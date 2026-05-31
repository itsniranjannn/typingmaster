import { memo } from "react";
import { ArrowUpRight, ShieldAlert, ShieldCheck, Target } from "lucide-react";

function RankProgressCard({ summary = null, isDark = true }) {
  if (!summary) return null;

  const containerClass = isDark ? "border-slate-700/50 bg-slate-900/60 text-slate-100" : "border-slate-200 bg-white/90 text-slate-900";
  const subTextClass = isDark ? "text-slate-400" : "text-slate-600";

  const momentumDirection = summary.momentum?.recentDirection || "flat";
  const momentumTone = momentumDirection === "rising" ? "text-emerald-300" : momentumDirection === "falling" ? "text-rose-300" : (isDark ? "text-slate-300" : "text-slate-700");
  const confidenceValue = Math.round((summary.confidence ?? 0) * 100);
  const promotionValue = Math.round((summary.placementEstimate ?? 0) * 100);

  return (
    <section className={`rounded-3xl border p-5 shadow-lg ${containerClass}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subTextClass}`}>Ranked Progression</p>
          <h3 className="mt-1 text-lg font-semibold">{summary.divisionLabel}</h3>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-slate-50"}`}>
          <ArrowUpRight size={14} className={momentumTone} />
          <span className={momentumTone}>{momentumDirection}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
          <p className={`text-[10px] uppercase tracking-[0.14em] ${subTextClass}`}>Confidence</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{confidenceValue}%</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
          <p className={`text-[10px] uppercase tracking-[0.14em] ${subTextClass}`}>Placement</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{promotionValue}%</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
          <p className={`text-[10px] uppercase tracking-[0.14em] ${subTextClass}`}>Safety Window</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{summary.demotionSafetyWindow}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          <ShieldCheck size={14} />
          <span>Promotion threshold: {summary.promotion?.pointsToPromotion ?? 0}</span>
        </div>
        <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-amber-400/20 bg-amber-500/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          <ShieldAlert size={14} />
          <span>Demotion buffer: {summary.promotion?.pointsToDemotion ?? 0}</span>
        </div>
        <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>
          <Target size={14} />
          <span>Season placement: {summary.estimatedPlacement}</span>
        </div>
      </div>
    </section>
  );
}

export default memo(RankProgressCard);