import { memo } from "react";

const formatClock = (seconds) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

function Tile({ value, label, hint, tone, isDark }) {
  const tones = {
    cpm: isDark ? "border-sky-400/40 bg-sky-400/10 text-sky-200" : "border-sky-300 bg-sky-50 text-sky-800",
    gross: isDark ? "border-sky-400/40 bg-sky-400/10 text-sky-200" : "border-sky-300 bg-sky-50 text-sky-800",
    net: isDark ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-emerald-300 bg-emerald-50 text-emerald-800",
    accuracy: isDark ? "border-slate-500/50 bg-slate-500/10 text-slate-100" : "border-slate-300 bg-slate-50 text-slate-800",
    time: isDark ? "border-amber-300/50 bg-amber-300/10 text-amber-200" : "border-amber-300 bg-amber-50 text-amber-800"
  };
  return (
    <div className={`rounded-xl border px-2 py-1.5 text-center ${tones[tone]}`}>
      <div className="text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-90">{label}</div>
      {hint ? <div className="text-[10px] opacity-70 [@media(max-height:850px)]:hidden" lang="ne">{hint}</div> : null}
    </div>
  );
}

/**
 * Same set of numbers Nepali typing-test sites show:
 * characters per minute, gross WPM, net WPM, accuracy and time left.
 * Net WPM counts only correct characters, so mistakes lower it.
 */
function NepaliStatTiles({
  typedLength,
  correctCharacters,
  elapsedSeconds,
  accuracy,
  timeLeft,
  showCountdown,
  isDark = true
}) {
  const minutes = elapsedSeconds > 0 ? elapsedSeconds / 60 : 0;
  const cpm = minutes > 0 ? Math.round(typedLength / minutes) : 0;
  const gross = minutes > 0 ? Math.round(typedLength / 5 / minutes) : 0;
  const net = minutes > 0 ? Math.round(correctCharacters / 5 / minutes) : 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="status" aria-live="off" data-testid="nepali-stats">
      <Tile value={cpm} label="CPM" hint="अक्षर/मिनेट" tone="cpm" isDark={isDark} />
      <Tile value={gross} label="Gross WPM" hint="कुल गति" tone="gross" isDark={isDark} />
      <Tile value={net} label="Net WPM" hint="शुद्ध गति" tone="net" isDark={isDark} />
      <Tile value={`${Math.round(accuracy)}%`} label="Accuracy" hint="शुद्धता" tone="accuracy" isDark={isDark} />
      <Tile
        value={showCountdown ? formatClock(timeLeft) : formatClock(elapsedSeconds)}
        label={showCountdown ? "Time left" : "Time"}
        hint={showCountdown ? "बाँकी समय" : "बितेको समय"}
        tone="time"
        isDark={isDark}
      />
    </div>
  );
}

export default memo(NepaliStatTiles);
