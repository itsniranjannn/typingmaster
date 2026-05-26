import { motion } from "framer-motion";
import RightSidebar from "./RightSidebar";

export default function SidebarModal({ isOpen, onClose, isDark, bestWpm, bestWpmLabel, liveWpm, resetKey, streakInfo, dailyGoalProgress, dailyChallenge, dailyChallengeHistory, challengeAttemptsToday, onStartChallenge }) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-50 w-full max-w-md p-4 sm:p-6"
      >
        <div className="rounded-2xl border p-3 bg-white/5 backdrop-blur-md border-slate-700/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Stats</h3>
            <button onClick={onClose} aria-label="Close stats" className="px-2 py-1 rounded hover:bg-white/5">✕</button>
          </div>
          <RightSidebar
            bestWpm={bestWpm}
            bestWpmLabel={bestWpmLabel}
            liveWpm={liveWpm}
            resetKey={resetKey}
            isDark={isDark}
            streakInfo={streakInfo}
            dailyGoalProgress={dailyGoalProgress}
            dailyChallenge={dailyChallenge}
            dailyChallengeHistory={dailyChallengeHistory}
            challengeAttemptsToday={challengeAttemptsToday}
            onStartChallenge={onStartChallenge}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
