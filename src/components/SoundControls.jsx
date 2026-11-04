import { memo } from "react";
import { Volume2, VolumeX } from "lucide-react";

function SoundControls({ isSoundEnabled, onToggleSound, volume, onVolumeChange, isDark = true }) {
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-sm ${isDark ? "border-slate-600/50 bg-slate-900/30" : "border-slate-300 bg-white/70"}`}>
      <button
        type="button"
        onClick={onToggleSound}
        className={`action-btn !h-8 !w-8 !px-0 ${isDark ? "text-slate-400" : "text-slate-600"}`}
        aria-label="Toggle sound"
        aria-pressed={isSoundEnabled}
      >
        {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      <label htmlFor="sound-volume" className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDark ? "text-slate-400" : "text-slate-600"}`}>
        Vol
      </label>
      <input
        id="sound-volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(event) => onVolumeChange(Number(event.target.value))}
        disabled={!isSoundEnabled}
        className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-slate-700/50 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-28"
        aria-label="Sound volume"
      />
    </div>
  );
}

export default memo(SoundControls);
