import { memo, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { loadResults, loadLeaderboard, resetLeaderboard } from "../utils/storage";
import { TYPING_MODES } from "../constants/typingModes";

const MODE_FILTERS = [
  { value: null, label: "All" },
  { value: TYPING_MODES.TIME, label: "Time" },
  { value: TYPING_MODES.WORDS, label: "Words" },
  { value: TYPING_MODES.QUOTE, label: "Quote" },
  { value: TYPING_MODES.CUSTOM, label: "Custom" }
];

const formatModeLabel = (mode) => {
  if (mode === TYPING_MODES.WORDS) return "Words";
  if (mode === TYPING_MODES.QUOTE) return "Quote";
  if (mode === TYPING_MODES.CUSTOM) return "Custom";
  return "Time";
};

function LeaderboardModal({ isOpen, onClose, isDark = true }) {
  const [selectedMode, setSelectedMode] = useState(null);
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
    const sorted = modeFiltered.sort((a, b) => (b.wpm || 0) - (a.wpm || 0) || (b.accuracy || 0) - (a.accuracy || 0));
    return sorted.slice(0, 10);
  }, [selectedMode, results]);

  const handleResetLeaderboard = () => {
    if (window.confirm("Reset the leaderboard? This keeps raw test results.")) {
      resetLeaderboard();
      setResults([]);
      setSelectedMode(null);
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
          <p className="text-sm text-slate-400">Filter by mode</p>
          <div className="flex flex-wrap gap-2">
            {MODE_FILTERS.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setSelectedMode(filter.value)}
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
            <div className="grid grid-cols-12 gap-2 border-b border-slate-700/50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">WPM</div>
              <div className="col-span-2">Accuracy</div>
              <div className="col-span-3">Mode</div>
              <div className="col-span-3">Date</div>
            </div>
            {filteredResults.map((result, index) => (
              <div
                key={result.id}
                className="grid grid-cols-12 gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-slate-800/30"
              >
                <div className="col-span-1 font-bold text-brand-500">#{index + 1}</div>
                <div className="col-span-3 font-semibold text-lg text-white">{result.wpm}</div>
                <div className="col-span-2 text-emerald-400">{result.accuracy.toFixed(1)}%</div>
                <div className="col-span-3 capitalize text-slate-200">{formatModeLabel(result.mode)}</div>
                <div className="col-span-3 text-xs text-slate-400">
                  {new Date(result.id).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">No scores yet. Start typing to earn a spot!</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          * Only scores with 90%+ accuracy are shown
        </p>
      </div>
    </div>
  );
}

export default memo(LeaderboardModal);
