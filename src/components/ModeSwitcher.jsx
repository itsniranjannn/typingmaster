import { memo } from "react";
import { TYPING_MODES, WORD_MODE_OPTIONS } from "../constants/typingModes";
import GoalModeSettings from "./GoalModeSettings";

function ModeSwitcher({ mode, wordCount, customText, targetWpm, goalAchievedSeconds, onModeChange, onWordCountChange, onCustomTextChange, onTargetWpmChange, isDark = true }) {
  return (
    <section className="space-y-4" aria-label="Typing mode options">
      <div className="flex flex-wrap gap-2">
        {[
          { value: TYPING_MODES.TIME, label: "Time: 60 sec" },
          { value: TYPING_MODES.WORDS, label: "Words" },
          { value: TYPING_MODES.GOAL, label: "Goal based" }
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${
              mode === value
                ? `${isDark ? "bg-blue-500" : "bg-blue-600"} text-white shadow-md ring-2 ring-blue-400`
                : `${isDark ? "bg-gray-700 text-slate-200 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
            }`}
            aria-label={`Switch to ${label} mode`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === TYPING_MODES.WORDS && (
        <div className="flex flex-wrap gap-2" aria-label="Word count options">
          {WORD_MODE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onWordCountChange(option)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                wordCount === option ? "bg-blue-500 text-white shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              aria-label={`Set word count to ${option}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {mode === TYPING_MODES.GOAL && (
        <GoalModeSettings
          targetWpm={targetWpm}
          onTargetWpmChange={onTargetWpmChange}
          achievedSeconds={goalAchievedSeconds}
        />
      )}

    </section>
  );
}

export default memo(ModeSwitcher);
