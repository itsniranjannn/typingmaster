import { memo } from "react";
import { TYPING_MODES, WORD_MODE_OPTIONS, TEST_DURATION_SECONDS } from "../constants/typingModes";
import GoalModeSettings from "./GoalModeSettings";

function ModeSwitcher({ mode, wordCount, customText, targetWpm, goalAchievedSeconds, onModeChange, onWordCountChange, onCustomTextChange, onTargetWpmChange, isDark = true }) {
  return (
    <section className="space-y-3" aria-label="Typing mode options">
      <div className="flex flex-wrap gap-2">
        {[
          { value: TYPING_MODES.TIME, label: `Time ${TEST_DURATION_SECONDS}s` },
          { value: TYPING_MODES.WORDS, label: "Words" },
          { value: TYPING_MODES.GOAL, label: "Goal" }
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${mode === value ? (isDark ? 'bg-sky-500 text-white' : 'bg-sky-500 text-white') : (isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700')}`}
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
              className={`px-2 py-1 rounded-md text-sm ${wordCount === option ? 'bg-emerald-500 text-white' : (isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700')}`}
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
