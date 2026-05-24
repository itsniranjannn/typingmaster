import { memo, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BadgeCheck,
  Brain,
  BookOpenText,
  Calculator,
  Crown,
  Flame,
  Gauge,
  Lightbulb,
  Medal,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Lock,
  Zap
} from "lucide-react";
import { getBadgeCatalog } from "../utils/dailyChallenge";
import { loadBadges } from "../utils/storage";

const ICONS = {
  Award,
  BadgeCheck,
  Brain,
  BookOpenText,
  Calculator,
  Crown,
  Flame,
  Gauge,
  Lightbulb,
  Medal,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap
};

function BadgeTile({ badge, earned }) {
  const Icon = ICONS[badge.iconName] || Trophy;
  return (
    <div className={`rounded-2xl border p-3 transition ${earned ? "border-emerald-400/20 bg-slate-900/70" : "border-slate-700/40 bg-slate-950/60 opacity-75 grayscale"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${earned ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
          <Icon size={18} />
        </div>
        {earned ? <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">x{earned.earnedCount}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-400"><Lock size={10} /> Locked</span>}
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-white">{earned ? `${badge.name} x${earned.earnedCount}` : "???"}</p>
        <p className="mt-1 text-[11px] text-slate-400">{earned ? `${earned.earnedCount > 1 ? "Multiplier unlocked" : "Earned once"}` : "Complete the arena to unlock"}</p>
      </div>
    </div>
  );
}

function BadgeGalleryModal({ isOpen, onClose, isDark = true, refreshToken = 0 }) {
  const badges = useMemo(() => getBadgeCatalog(), []);
  const [earnedBadges, setEarnedBadges] = useState(() => loadBadges());
  const earnedLookup = useMemo(() => new Map(earnedBadges.map((badge) => [badge.badgeId, badge])), [earnedBadges]);
  const visibleBadges = useMemo(() => {
    const badgeMap = new Map(badges.map((badge) => [badge.badgeId, badge]));
    earnedBadges.forEach((badge) => {
      if (!badgeMap.has(badge.badgeId)) {
        badgeMap.set(badge.badgeId, {
          badgeId: badge.badgeId,
          name: badge.name || badge.badgeId,
          iconName: badge.iconName || "Trophy"
        });
      }
    });
    return [...badgeMap.values()];
  }, [badges, earnedBadges]);

  useEffect(() => {
    // Reload earned badges whenever the modal opens or a refresh token changes.
    if (!isOpen) return;
    try {
      setEarnedBadges(loadBadges());
    } catch {
      setEarnedBadges([]);
    }
  }, [isOpen, refreshToken]);

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div initial={{ scale: 0.96, y: 18 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className="relative z-50 w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950 shadow-[0_24px_90px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">Badge Gallery</p>
            <h3 className="text-xl font-semibold text-white">Arena rewards and milestones</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">Close</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBadges.map((badge) => (
              <BadgeTile key={badge.badgeId} badge={badge} earned={earnedLookup.get(badge.badgeId)} />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(BadgeGalleryModal);
