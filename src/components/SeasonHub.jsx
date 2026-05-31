import { memo } from "react";
import { CalendarClock, Gift, Medal, Sparkles, TimerReset } from "lucide-react";

function SeasonHub({ summary = null, isDark = true }) {
  if (!summary) return null;

  const containerClass = isDark ? "border-slate-700/50 bg-slate-900/60 text-slate-100" : "border-slate-200 bg-white/90 text-slate-900";
  const subTextClass = isDark ? "text-slate-400" : "text-slate-600";
  const seasonal = summary.seasonal || summary;
  const window = seasonal.window || seasonal.currentSeason || {};
  const milestones = seasonal.milestones?.milestones || seasonal.milestones || [];
  const carryover = seasonal.carryover || seasonal;
  const rewardPacing = seasonal.rewardPacing || seasonal.pacing || {};
  const challengeGroups = seasonal.challengeGroups || [];

  return (
    <section className={`rounded-3xl border p-5 shadow-lg ${containerClass}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subTextClass}`}>Season Hub</p>
          <h3 className="mt-1 text-lg font-semibold">Current season status</h3>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-slate-50"}`}>
          <TimerReset size={14} />
          <span>{window?.daysUntilReset ?? 0} days left</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SeasonStat label="Prestige" value={carryover?.prestige?.prestigePoints ?? 0} icon={Medal} isDark={isDark} />
        <SeasonStat label="Reward Pace" value={`${rewardPacing?.rewardGapSessions ?? 0} runs`} icon={Gift} isDark={isDark} />
        <SeasonStat label="Milestones" value={seasonal?.milestones?.achievedCount ?? 0} icon={Sparkles} isDark={isDark} />
        <SeasonStat label="Season Reset" value={window?.endAtIso ? new Date(window.endAtIso).toLocaleDateString() : "Unknown"} icon={CalendarClock} isDark={isDark} />
      </div>

      <div className="mt-4 grid gap-2">
        {milestones.slice(0, 4).map((milestone) => (
          <div key={milestone.key} className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
            <span>{milestone.key.replace(/_/g, " ")}</span>
            <span className={milestone.achieved ? (isDark ? "text-emerald-300" : "text-emerald-700") : subTextClass}>{milestone.achieved ? "Reached" : `${Math.round(milestone.value)} / ${milestone.target}`}</span>
          </div>
        ))}
      </div>

      <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${subTextClass}`}>Carryover</p>
        <p className="mt-1 leading-6">
          Prestige carries {Math.round((carryover?.prestige?.carryoverScore ?? 0) * 100)}% confidence into the next season, with {challengeGroups.length} challenge group(s) ready.
        </p>
      </div>
    </section>
  );
}

function SeasonStat({ label, value, icon: Icon, isDark }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default memo(SeasonHub);