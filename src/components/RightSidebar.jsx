import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PRO_TIPS } from "../constants/typingModes";
import { getStreak } from "../utils/storage";
import ChallengeCard from "./ChallengeCard";

function SidebarCard({ title, children, isDark = true }) {
  return (
    <section className={`rounded-2xl border p-2 shadow-sm backdrop-blur-md transition-all ${
      isDark
        ? "border-gray-700/70 bg-gray-900/50 hover:bg-gray-900/65"
        : "border-slate-200 bg-white/90 hover:bg-white"
    }`}>
      <div className={`flex items-center justify-between ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        <h3 className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-300" : "text-slate-700"}`}>{title}</h3>
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </section>
  );
}

function RightSidebar({ bestWpm, bestWpmLabel = "Current mode", liveWpm, resetKey = 0, isDark = true, streakInfo: streakInfoProp = null, dailyGoalProgress = { count: 0, date: null }, dailyChallenge = null, dailyChallengeHistory = [], onStartChallenge = null }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [streakInfo, setStreakInfo] = useState(() => streakInfoProp || getStreak());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTipIndex((previous) => (previous + 1) % PRO_TIPS.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setTipIndex(resetKey % PRO_TIPS.length);
    if (!streakInfoProp) setStreakInfo(getStreak());
  }, [resetKey]);

  useEffect(() => {
    if (streakInfoProp) setStreakInfo(streakInfoProp);
  }, [streakInfoProp]);

  const currentTip = useMemo(() => PRO_TIPS[tipIndex % PRO_TIPS.length], [tipIndex]);

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }} className="space-y-2">
      <SidebarCard title="Best WPM" isDark={isDark}>
        <div className="space-y-1">
          <p className={`text-xl font-semibold tracking-tight tabular-nums ${isDark ? "text-blue-300" : "text-blue-600"}`}>{bestWpm}</p>
          <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{bestWpmLabel}</p>
          <div className={`h-1 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-violet-400 to-sky-400" />
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Pro Tip" isDark={isDark}>
        <p className={`text-[11px] leading-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{currentTip}</p>
      </SidebarCard>

      <ChallengeCard
        challengeState={dailyChallenge}
        history={dailyChallengeHistory}
        isDark={isDark}
        onEnterArena={onStartChallenge}
        onRetryArena={onStartChallenge}
      />

      <SidebarCard title="Live WPM" isDark={isDark}>
        <div className="flex items-end justify-between gap-2">
          <div>
            <motion.p
              key={liveWpm}
              initial={{ opacity: 0.65, y: 4, scale: 1.03 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18 }}
              className={`text-xl font-semibold tracking-tight tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {liveWpm}
            </motion.p>
            <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Rolling speed</p>
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Streak" isDark={isDark}>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <p className={`text-lg font-semibold tracking-tight tabular-nums ${isDark ? "text-orange-300" : "text-orange-600"}`}>{streakInfo.count}</p>
            <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>day{streakInfo.count !== 1 ? "s" : ""}</p>
          </div>
          <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {streakInfo.count > 0
              ? `Last test: ${streakInfo.lastTestDate ? new Date(streakInfo.lastTestDate).toLocaleDateString() : "Unknown"}`
              : "Complete a test to start"}
          </p>
        </div>
      </SidebarCard>

      <SidebarCard title="Daily Goal" isDark={isDark}>
        <div className="space-y-2">
          <div className={`flex items-center justify-between gap-2 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span>Today's goal</span>
            <span>{dailyGoalProgress.count >= 3 ? "Done" : `${dailyGoalProgress.count}/3`}</span>
          </div>
          <div className={`h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-700/50" : "bg-slate-200"}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min((dailyGoalProgress.count / 3) * 100, 100)}%` }}
            />
          </div>
        </div>
      </SidebarCard>
    </motion.div>
  );
}

export default memo(RightSidebar);
