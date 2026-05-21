import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, Lightbulb, Zap, Flame } from "lucide-react";
import { PRO_TIPS } from "../constants/typingModes";
import { getStreak } from "../utils/storage";

function SidebarCard({ title, icon: Icon, children, accentClass = "", isDark = true }) {
  return (
    <section className={`rounded-2xl border p-3 shadow-lg backdrop-blur-md transition-all ${
      isDark
        ? "border-gray-700 bg-gray-800/60 hover:bg-gray-800/80"
        : "border-slate-300 bg-slate-100/80 hover:bg-slate-100/100"
    }`}>
      <div className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        <Icon size={13} className={accentClass || (isDark ? "text-slate-400" : "text-slate-600")} />
        <h3 className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-300" : "text-slate-700"}`}>{title}</h3>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function RightSidebar({ bestWpm, liveWpm, resetKey = 0, isDark = true, streakInfo: streakInfoProp = null, dailyGoalProgress = { count: 0, date: null } }) {
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
    <div className="space-y-4">
      <SidebarCard title="Best WPM" icon={Award} accentClass="text-violet-500" isDark={isDark}>
        <div className="space-y-1.5">
          <p className={`text-3xl font-bold tracking-tight tabular-nums ${isDark ? "text-blue-400" : "text-blue-600"}`}>{bestWpm}</p>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Your personal best</p>
          <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-violet-400 to-sky-400" />
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Pro Tip" icon={Lightbulb} accentClass="text-amber-500" isDark={isDark}>
        <p className={`text-[11px] leading-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{currentTip}</p>
      </SidebarCard>

      <SidebarCard title="Live WPM" icon={Zap} accentClass="text-emerald-500" isDark={isDark}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <motion.p
              key={liveWpm}
              initial={{ opacity: 0.65, y: 4, scale: 1.03 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18 }}
              className={`text-3xl font-bold tracking-tight tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {liveWpm}
            </motion.p>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Rolling speed</p>
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Streak" icon={Flame} accentClass="text-orange-500" isDark={isDark}>
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold tracking-tight tabular-nums ${isDark ? "text-orange-400" : "text-orange-600"}`}>🔥 {streakInfo.count}</p>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>day{streakInfo.count !== 1 ? "s" : ""}</p>
          </div>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {streakInfo.count > 0
              ? `Last test: ${streakInfo.lastTestDate ? new Date(streakInfo.lastTestDate).toLocaleDateString() : "Unknown"}`
              : "Complete a test to start"}
          </p>
        </div>
      </SidebarCard>

      <SidebarCard title="Daily Goal" icon={Award} accentClass="text-sky-500" isDark={isDark}>
        <div className="space-y-2">
          <div className={`flex items-center justify-between gap-2 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            <span>Today's goal: 3 tests</span>
            <span>{dailyGoalProgress.count >= 3 ? "Goal completed!" : `${dailyGoalProgress.count}/3`}</span>
          </div>
          <div className={`h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-700/50" : "bg-slate-200"}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min((dailyGoalProgress.count / 3) * 100, 100)}%` }}
            />
          </div>
        </div>
      </SidebarCard>
    </div>
  );
}

export default memo(RightSidebar);
