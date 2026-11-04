import { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

/** Non-blocking first-visit nudge: typing starts immediately, the tour is opt-in. */
function TourHint({ isDark = true, onStartTour, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        isDark ? "border-violet-400/25 bg-violet-500/10 text-violet-100" : "border-violet-200 bg-violet-50 text-violet-900"
      }`}
      role="status"
    >
      <Sparkles size={16} className="shrink-0 text-fuchsia-400" aria-hidden="true" />
      <p className="flex-1">
        <strong className="font-semibold">Just start typing</strong> — the test begins on your first key.
      </p>
      <button type="button" onClick={onStartTour} className="rounded-full bg-violet-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        20-second tour
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss tip" className="rounded-full p-1 opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        <X size={14} />
      </button>
    </motion.div>
  );
}

export default memo(TourHint);
