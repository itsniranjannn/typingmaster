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
            className={`rounded-full border px-3 py-1 text-xs font-medium tracking-[0.08em] uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${
              mode === value
                ? `${isDark ? "border-slate-500 text-slate-50" : "border-slate-400 text-slate-900"} bg-transparent shadow-none`
                : `${isDark ? "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700" : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200"}`
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
              className={`rounded-full border px-3 py-1 text-xs font-medium tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                wordCount === option
                  ? `${isDark ? "border-slate-500 text-slate-50" : "border-slate-400 text-slate-900"} bg-transparent`
                  : `${isDark ? "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700" : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200"}`
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
