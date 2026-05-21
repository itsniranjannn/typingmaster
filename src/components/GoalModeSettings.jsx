import { memo } from "react";
import { GOAL_WPM_OPTIONS } from "../constants/typingModes";

function GoalModeSettings({ targetWpm, onTargetWpmChange, achievedSeconds, isDark = true }) {
  return (
    <div className={`space-y-3 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Target WPM</label>
        <input
          type="number"
          min="10"
          max="200"
          value={targetWpm}
          onChange={(e) => onTargetWpmChange(parseInt(e.target.value, 10))}
          className={`w-20 rounded-lg border px-2 py-1.5 text-center font-mono text-sm focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100"
              : "border-gray-200 bg-white text-gray-900"
          }`}
          aria-label="Target WPM"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto py-1">
        {GOAL_WPM_OPTIONS.map((wpm) => (
          <button
            key={wpm}
            onClick={() => onTargetWpmChange(wpm)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 ${
              targetWpm === wpm
                ? "bg-green-500 text-white"
                : `${isDark ? "bg-gray-700 text-slate-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
            }`}
            aria-label={`Set target WPM to ${wpm}`}
          >
            {wpm}
          </button>
        ))}
      </div>

      {achievedSeconds > 0 && (
        <div className="pt-2 text-xs font-semibold text-emerald-600">
          ✓ {achievedSeconds}/5 seconds at target WPM
        </div>
      )}
    </div>
  );
}

export default memo(GoalModeSettings);
