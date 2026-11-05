import { memo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

function Row({ label, value, ok, isDark }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${isDark ? "bg-slate-900/70" : "bg-slate-100"}`}>
      <span className={isDark ? "text-slate-300" : "text-slate-600"}>{label}</span>
      <span className={`inline-flex items-center gap-1.5 font-semibold ${ok ? "text-emerald-400" : "text-rose-400"}`}>
        {ok ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
        {value}
      </span>
    </div>
  );
}

function LoksewaVerdict({ result, isDark = true }) {
  const check = result?.loksewa;
  if (!check) return null;
  const minutes = Math.round((check.durationSeconds || 0) / 60);

  return (
    <section
      aria-label="Loksewa typing test result"
      className={`mb-4 rounded-3xl border p-5 ${
        check.passed
          ? "border-emerald-400/50 bg-emerald-500/10"
          : isDark
            ? "border-rose-400/40 bg-rose-500/10"
            : "border-rose-300 bg-rose-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Loksewa-style test · {minutes} min · target {check.targetWpm} WPM
          </p>
          <h3 className={`mt-1 text-2xl font-bold ${check.passed ? "text-emerald-400" : "text-rose-400"}`}>
            {check.passed ? "Passed" : "Not yet"}
          </h3>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>{Math.round(check.netWpm)}</p>
          <p className="text-xs text-slate-400">net WPM</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Row label={`Speed (need ${check.targetWpm})`} value={`${Math.round(check.netWpm)} WPM`} ok={check.speedOk} isDark={isDark} />
        <Row label={`Accuracy (need ${check.minAccuracy}%)`} value={`${Math.round(check.accuracy * 10) / 10}%`} ok={check.accuracyOk} isDark={isDark} />
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Net WPM = correct characters ÷ 5 ÷ minutes, so every mistake lowers your score. Official limits, time and font differ by vacancy
        notice: check yours and set the target here to match.
      </p>
    </section>
  );
}

export default memo(LoksewaVerdict);
