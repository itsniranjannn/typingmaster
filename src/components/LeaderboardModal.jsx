import { memo, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { loadResults, loadLeaderboard, resetLeaderboard } from "../utils/storage";
import { TYPING_MODES, GOAL_VARIANTS } from "../constants/typingModes";

const MODE_FILTERS = [
  { value: null, label: "All" },
  { value: TYPING_MODES.TIME, label: "Time" },
  { value: TYPING_MODES.WORDS, label: "Words" },
  { value: TYPING_MODES.GOAL, label: "Goal" },
  { value: TYPING_MODES.QUOTE, label: "Quote" },
  { value: TYPING_MODES.CUSTOM, label: "Custom" },
  { value: TYPING_MODES.NUMBERS, label: "Numbers" }
];

const GOAL_FILTERS = [
  { value: null, label: "All goal results" },
  { value: GOAL_VARIANTS.SUSTAIN, label: "Sustain" },
  { value: GOAL_VARIANTS.REACH, label: "Reach" }
];

const formatModeLabel = (mode) => {
  if (mode === TYPING_MODES.GOAL) return "Goal";
  if (mode === TYPING_MODES.WORDS) return "Words";
  if (mode === TYPING_MODES.QUOTE) return "Quote";
  if (mode === TYPING_MODES.CUSTOM) return "Custom";
  if (mode === TYPING_MODES.NUMBERS) return "Numbers";
  return "Time";
};

const formatModeVariantLabel = (result) => {
  if (result.mode === TYPING_MODES.GOAL) {
    return `Goal (${result.goalVariant === GOAL_VARIANTS.REACH ? "Reach" : "Sustain"})`;
  }

  if (result.mode === TYPING_MODES.TIME && typeof result.timeLimitSeconds === "number" && result.timeLimitSeconds !== 25) {
    return `Time (${result.timeLimitSeconds}s)`;
  }

  if (result.mode === TYPING_MODES.WORDS && typeof result.wordCount === "number") {
    return `Words (${result.wordCount})`;
  }

  return formatModeLabel(result.mode);
};

function LeaderboardModal({ isOpen, onClose, isDark = true }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedGoalVariant, setSelectedGoalVariant] = useState(null);
  const [results, setResults] = useState(() => loadLeaderboard());

  useEffect(() => {
    if (isOpen) {
      // Load both the cached leaderboard and all recent results so we can compute
      // a mode-aware top list (ensures each mode can surface its own top scores).
      const recent = Array.isArray(loadResults()) ? loadResults() : [];
      // Merge recent and stored leaderboard entries, then dedupe by id.
      const stored = Array.isArray(loadLeaderboard()) ? loadLeaderboard() : [];
      const combined = [...recent, ...stored];
      const deduped = [];
      const seen = new Set();
      for (const r of combined) {
        if (r && r.id && !seen.has(r.id)) {
          deduped.push(r);
          seen.add(r.id);
        }
      }
      setResults(deduped);
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => {
    // compute top results (accuracy >= 90) for the selected mode (or all modes)
    const candidates = (results || []).filter((r) => r && typeof r.accuracy === "number" && r.accuracy >= 90);
    const modeFiltered = selectedMode ? candidates.filter((r) => r.mode === selectedMode) : candidates;
    const goalVariantFiltered =
      selectedMode === TYPING_MODES.GOAL && selectedGoalVariant
        ? modeFiltered.filter((r) => (r.goalVariant || GOAL_VARIANTS.SUSTAIN) === selectedGoalVariant)
        : modeFiltered;
    const sorted = goalVariantFiltered.sort((a, b) => (b.wpm || 0) - (a.wpm || 0) || (b.accuracy || 0) - (a.accuracy || 0));
    return sorted.slice(0, 10);
  }, [selectedGoalVariant, selectedMode, results]);

  const handleResetLeaderboard = () => {
    if (window.confirm("Reset the leaderboard? This keeps raw test results.")) {
      resetLeaderboard();
      setResults([]);
      setSelectedMode(null);
      setSelectedGoalVariant(null);
    }
  };

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
    if (mode !== TYPING_MODES.GOAL) {
      setSelectedGoalVariant(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Leaderboard">
      <div className={`w-full max-w-2xl mx-4 max-h-[90vh] space-y-6 overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDark ? "border-slate-700/50 bg-slate-900" : "border-slate-200 bg-white"}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Leaderboard</h2>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
            aria-label="Close leaderboard"
          >
            <X size={24} />
          </button>
        </div>

        {/* Mode Filter */}
        <div className="space-y-2">
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Filter by mode</p>
          <div className="flex flex-wrap gap-2">
            {MODE_FILTERS.map((filter) => (
              <button
                key={filter.label}
                onClick={() => handleModeChange(filter.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                  selectedMode === filter.value
                    ? "bg-brand-500 text-white shadow-md"
                    : isDark
                      ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                aria-label={`Filter leaderboard by ${filter.label}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {selectedMode === TYPING_MODES.GOAL && (
          <div className="space-y-2">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Filter Goal results by variant</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setSelectedGoalVariant(filter.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                    selectedGoalVariant === filter.value
                      ? "bg-emerald-500 text-white shadow-md"
                      : isDark
                        ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  aria-label={`Filter Goal results by ${filter.label}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleResetLeaderboard}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                isDark
                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            aria-label="Reset leaderboard"
          >
            Reset Leaderboard
          </button>
        </div>

        {/* Results Table */}
        {filteredResults.length > 0 ? (
          <div className="space-y-2">
            <div className={`grid grid-cols-1 sm:grid-cols-12 gap-2 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'border-slate-700/50 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
              <div className="col-span-1 sm:col-span-1">Rank</div>
              <div className="col-span-1 sm:col-span-3">WPM</div>
              <div className="col-span-1 sm:col-span-2">Accuracy</div>
              <div className="col-span-1 sm:col-span-3">Mode / Variant</div>
              <div className="col-span-1 sm:col-span-3">Date</div>
            </div>
            {filteredResults.map((result, index) => (
              <div
                key={result.id}
                className={`grid grid-cols-1 sm:grid-cols-12 gap-2 rounded-lg px-3 py-3 transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-100/60'}`}
              >
                <div className="col-span-1 sm:col-span-1 font-bold text-brand-500">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div className={`col-span-1 sm:col-span-3 flex items-center gap-2 font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>{result.wpm}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'border-slate-600/70 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                    {result.mode === TYPING_MODES.GOAL
                      ? `Goal ${result.goalVariant === GOAL_VARIANTS.REACH ? "Reach" : "Sustain"}`
                      : formatModeLabel(result.mode)}
                  </span>
                </div>
                <div className={`col-span-1 sm:col-span-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{result.accuracy.toFixed(1)}%</div>
                <div className={`col-span-1 sm:col-span-3 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <span>{formatModeVariantLabel(result)}</span>
                  {result.mode === TYPING_MODES.GOAL && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                      {result.goalVariant === GOAL_VARIANTS.REACH ? "Reach" : "Sustain"}
                    </span>
                  )}
                </div>
                <div className={`col-span-1 sm:col-span-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {new Date(result.id).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No scores yet. Start typing to earn a spot!</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          * Only scores with 90%+ accuracy are shown. Goal (Reach) results require a full completion.
        </p>
      </div>
    </div>
  );
}

export default memo(LeaderboardModal);
