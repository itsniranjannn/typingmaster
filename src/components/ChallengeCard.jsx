import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Trophy, ArrowRight, CalendarDays } from "lucide-react";
import { loadBadges } from "../utils/storage";

function starsToText(level = 1) {
  return "⭐".repeat(Math.max(1, Math.min(3, level)));
}

function ChallengeCard({ challengeState = null, history = [], challengeAttemptsToday = null, isDark = true, onEnterArena, onRetryArena, arenaActive = false }) {
  const challenge = challengeState?.challenge || null;
  const badge = challenge ? loadBadges().find((entry) => entry.badgeId === challenge.badgeId) : null;
  const badgeMultiplier = Math.max(1, badge?.earnedCount || 1);
  const recentHistory = Array.isArray(history) ? history.slice(0, 3) : [];
  const attemptsLeft = Math.max(0, 3 - (challengeAttemptsToday?.attempts || 0));
  const attemptsLocked = Boolean(challengeAttemptsToday?.locked || challengeState?.challengeCompletedToday || challengeState?.challengeCompleted);

  const tone = isDark
    ? "border-amber-500/25 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-amber-950/20"
    : "border-amber-200 bg-gradient-to-br from-white via-amber-50/80 to-amber-100/70";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={`rounded-2xl border p-3 shadow-sm backdrop-blur-md ${tone}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-amber-300" : "text-amber-700"}`}>
            <CalendarDays size={12} />
            Challenge Arena
          </div>
          <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            {challenge?.title || "Daily Arena"}
          </h3>
          <p className={`text-[11px] leading-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            {challenge?.description || challengeState?.challenge?.objective || "A new arena challenge awaits."}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isDark ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-100 text-amber-700"}`}>
          <Trophy size={18} />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}>
            Difficulty: {starsToText(challenge?.difficultyStars ? challenge.difficultyStars.length : challenge?.difficulty || 1)}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
            Reward: {challenge?.badgeName || "Badge"}
          </span>
        </div>

        <div className={`rounded-xl border px-3 py-2 ${isDark ? "border-slate-700/70 bg-slate-900/70" : "border-slate-200 bg-white/85"}`}>
          <div className={`flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span>{challengeState?.challengeCompleted ? "Arena cleared" : "Arena objective"}</span>
            <span>{badgeMultiplier > 1 ? `${badgeMultiplier}x` : "x1"}</span>
          </div>
          <p className={`mt-1 text-[11px] leading-4 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {challenge?.objective || challenge?.description || "Start the day's challenge and earn a badge."}
          </p>
        </div>

        {!challengeState?.challengeCompleted && !arenaActive ? (
          <button
            type="button"
            onClick={() => onEnterArena?.(challenge)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
              isDark
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_10px_24px_rgba(245,158,11,0.18)] hover:from-amber-300 hover:to-orange-400"
                : "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_10px_24px_rgba(245,158,11,0.16)] hover:from-amber-300 hover:to-orange-400"
            }`}
          >
            <ArrowRight size={14} />
            Enter Arena
          </button>
        ) : null}

        {arenaActive && !challengeState?.challengeCompleted ? (
          <div className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${isDark ? "border-slate-700 bg-slate-900/60 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
            Arena Active
          </div>
        ) : null}

        {challengeState?.challengeCompleted ? (
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${isDark ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            <BadgeCheck size={14} />
            Challenge completed! Badge earned.
          </div>
        ) : null}

        {!challengeState?.challengeCompleted ? (
          <div className={`rounded-xl border px-3 py-2 text-[11px] ${isDark ? "border-slate-700/70 bg-slate-950/55 text-slate-300" : "border-slate-200 bg-white/90 text-slate-700"}`}>
            <div className="flex items-center justify-between gap-2">
              <span>Attempts left</span>
              <span className="font-semibold">{attemptsLocked ? "0/3" : `${attemptsLeft}/3`}</span>
            </div>
            <p className={`mt-1 ${attemptsLocked ? (isDark ? "text-amber-300" : "text-amber-700") : (isDark ? "text-slate-400" : "text-slate-500")}`}>
              {attemptsLocked ? "Try again tomorrow" : "Up to 3 attempts today"}
            </p>
          </div>
        ) : null}
      </div>

      {recentHistory.length > 0 ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 ${isDark ? "border-slate-700/70 bg-slate-950/55" : "border-slate-200 bg-white/85"}`}>
          <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Recent wins</p>
          <ul className="space-y-1">
            {recentHistory.map((entry) => (
              <li key={`${entry.date}-${entry.templateId}`} className={`flex items-center justify-between gap-2 text-[11px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                <span className="truncate">{entry.title}</span>
                <span className={isDark ? "text-emerald-300" : "text-emerald-700"}>{entry.challengeStreak ? `x${entry.challengeStreak}` : "x1"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </motion.section>
  );
}

export default memo(ChallengeCard);
