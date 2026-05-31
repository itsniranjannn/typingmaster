import { memo } from "react";
import { Award, Brackets, Gauge, LineChart, Sparkles, TimerReset } from "lucide-react";

function MasteryOverview({ summary = null, isDark = true }) {
  if (!summary) return null;

  const containerClass = isDark ? "border-slate-700/50 bg-slate-900/60 text-slate-100" : "border-slate-200 bg-white/90 text-slate-900";
  const subTextClass = isDark ? "text-slate-400" : "text-slate-600";
  const accuracy = summary.mastery?.accuracyMastery || summary.accuracyMastery || {};
  const speed = summary.mastery?.speedMastery || summary.speedMastery || {};
  const endurance = summary.mastery?.enduranceMastery || summary.enduranceMastery || {};
  const family = summary.mastery?.familyMastery || summary.familyMastery || {};
  const plateau = summary.mastery?.plateau || summary.plateau || {};

  return (
    <section className={`rounded-3xl border p-5 shadow-lg ${containerClass}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subTextClass}`}>Mastery & Specialization</p>
          <h3 className="mt-1 text-lg font-semibold">Long-term progress snapshot</h3>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-slate-50"}`}>
          <Sparkles size={14} />
          <span>{Math.round((summary.overallMasteryScore ?? 0) * 100)}% mastery</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MasteryTile label="Speed Mastery" value={`${Math.round(speed.masteryScore ?? 0)}%`} icon={Gauge} isDark={isDark} note={`${Math.round(speed.bestWpm ?? 0)} best WPM`} />
        <MasteryTile label="Accuracy Mastery" value={`${Math.round(accuracy.masteryScore ?? 0)}%`} icon={Award} isDark={isDark} note={`${Math.round(accuracy.bestAccuracy ?? 0)}% best accuracy`} />
        <MasteryTile label="Endurance Mastery" value={`${Math.round(endurance.masteryScore ?? 0)}%`} icon={TimerReset} isDark={isDark} note={`${Math.round(endurance.bestTimeUsed ?? 0)}s best duration`} />
        <MasteryTile label="Plateau Risk" value={`${Math.round((plateau.plateauRisk ?? 0) * 100)}%`} icon={LineChart} isDark={isDark} note={plateau.plateauDetected ? "Plateau detected" : "Still trending"} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">
            <Brackets size={14} />
            <span>Specialization</span>
          </div>
          <p className="mt-2 text-sm leading-6">
            Memory sessions: {Math.round(family.memory?.sessions ?? 0)}. Numbers sessions: {Math.round(family.numbers?.sessions ?? 0)}. Specialization score: {Math.round((family.specializationScore ?? 0) * 100)}%.
          </p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">
            <Sparkles size={14} />
            <span>Consistency</span>
          </div>
          <p className="mt-2 text-sm leading-6">
            {summary.consistency?.milestoneCount ?? 0} consistency milestone(s) reached. Best rolling consistency: {Math.round(summary.consistency?.bestConsistency ?? 0)}%.
          </p>
        </div>
      </div>
    </section>
  );
}

function MasteryTile({ label, value, note, icon: Icon, isDark }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{note}</p>
    </div>
  );
}

export default memo(MasteryOverview);