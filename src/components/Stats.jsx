import { memo } from "react";
import { Gauge, Target } from "lucide-react";

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="stat-card rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <Icon size={14} className="text-slate-400/70" />
      </div>
      <p className="stat-value mt-2 text-3xl font-extrabold tabular-nums sm:text-5xl">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label === "WPM" ? "Words per minute" : "Your accuracy"}</p>
    </div>
  );
}

function Stats({ wpm, accuracy }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <StatCard label="WPM" value={wpm} icon={Gauge} />
      <StatCard label="Accuracy" value={`${accuracy}%`} icon={Target} />
    </div>
  );
}

export default memo(Stats);
