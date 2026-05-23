import { memo, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getLastResults } from "../utils/storage";
import { getTopMistakes } from "../utils/typingStats";

const formatModeLabel = (mode) => {
  if (mode === "words") return "Words";
  if (mode === "quote") return "Quote";
  if (mode === "custom") return "Custom";
  return "Time";
};

const formatCharacter = (character) => {
  if (character === " ") return "[space]";
  return character;
};

function HistoryInsights({ isDark = true, onExportCsv, closeSignal = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [results, setResults] = useState([]);
  const [topMistakes, setTopMistakes] = useState([]);

  useEffect(() => {
    if (!isExpanded) return;

    const latestResults = getLastResults();
    setResults(latestResults);
    setTopMistakes(getTopMistakes(latestResults, 5));
  }, [isExpanded]);

  useEffect(() => {
    if (closeSignal > 0) {
      setIsExpanded(false);
    }
  }, [closeSignal]);

  const maxMistakeCount = useMemo(() => {
    if (!topMistakes.length) return 1;
    return Math.max(...topMistakes.map((item) => item.count), 1);
  }, [topMistakes]);

  return (
    <section
      className={`rounded-2xl border p-5 transition-colors ${
        isDark
          ? "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/40"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
      aria-label="History and insights"
    >
      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse history and insights" : "Expand history and insights"}
      >
        <span className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">History & Insights</span>
        {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-5">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onExportCsv}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                isDark
                  ? "bg-slate-900 text-slate-100 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              aria-label="Export typing history as CSV"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-lg border border-slate-700/40">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead className="bg-slate-800/35 text-xs uppercase tracking-[0.1em] text-slate-400">
                <tr>
                  <th className="px-3 py-2">WPM</th>
                  <th className="px-3 py-2">Accuracy</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Mode</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-sm text-slate-400">
                      No completed tests yet.
                    </td>
                  </tr>
                )}
                {results.map((result) => (
                  <tr key={result.id} className="border-t border-slate-700/30 text-slate-200">
                    <td className="px-3 py-2 tabular-nums">{result.wpm}</td>
                    <td className="px-3 py-2 tabular-nums">{result.accuracy}%</td>
                    <td className="px-3 py-2 text-xs sm:text-sm break-words">{new Date(result.id).toLocaleString()}</td>
                    <td className="px-3 py-2">{formatModeLabel(result.mode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Mistake Heatmap (last 3 tests)</h3>
            {topMistakes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No mistake data available yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {topMistakes.map((item) => {
                  const widthPercent = (item.count / maxMistakeCount) * 100;
                  return (
                    <div key={`${item.character}-${item.count}`} className="grid grid-cols-[80px_1fr_36px] items-center gap-2 text-sm">
                      <span className="font-mono text-slate-200">{formatCharacter(item.character)}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/40">
                        <div className="h-full rounded-full bg-rose-400/80" style={{ width: `${widthPercent}%` }} />
                      </div>
                      <span className="tabular-nums text-slate-300">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(HistoryInsights);
