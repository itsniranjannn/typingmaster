import { memo, useMemo, useState, useEffect, useRef } from "react";
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
import { loadBadges, getPreferredTheme } from "../utils/storage";
import confetti from "canvas-confetti";

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

function BadgeTile({ badge, earned, isDark }) {
  const Icon = ICONS[badge.iconName] || Trophy;
  const earnedClass = earned
    ? (isDark ? "border-emerald-400/20 bg-emerald-900/5" : "border-emerald-200/30 bg-emerald-50/60")
    : (isDark ? "border-slate-700/40 bg-slate-950/60 opacity-75 grayscale" : "border-slate-200/30 bg-white/60 text-slate-600");

  const iconWrap = earned
    ? (isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-100 text-emerald-700")
    : (isDark ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400");

  const todayKey = new Date().toISOString().slice(0, 10);
  const isNew = earned && earned.lastEarnedDate === todayKey;

  return (
    <div className={`rounded-2xl border p-3 transition transform hover:scale-[1.02] ${earnedClass} ${isNew ? "animate-pulse" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconWrap} shadow-sm ${earned ? "ring-2 ring-emerald-400/20" : ""}`}>
          <Icon size={20} />
        </div>
        {earned ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">x{earned.earnedCount}</span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${isDark ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500"}`}>
            <Lock size={12} /> Locked
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>{earned ? `${badge.name} x${earned.earnedCount}` : "???"}</p>
        <p className={`mt-1 text-[11px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>{earned ? `${earned.earnedCount > 1 ? "Multiplier unlocked" : "Earned once"}` : "Complete the arena to unlock"}</p>
      </div>
    </div>
  );
}

function BadgeGalleryModal({ isOpen, onClose, isDark = true, refreshToken = 0 }) {
  const badges = useMemo(() => getBadgeCatalog(), []);
  const [earnedBadges, setEarnedBadges] = useState(() => loadBadges());
  const [copied, setCopied] = useState(false);
  const [themeDark, setThemeDark] = useState(isDark);
  const prevEarnedRef = useRef(earnedBadges);
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
    // Sort so most recently earned badges appear first, then by earnedCount, then locked
    const list = [...badgeMap.values()];
    const todayKey = new Date().toISOString().slice(0, 10);
    list.sort((a, b) => {
      const ea = earnedLookup.get(a.badgeId);
      const eb = earnedLookup.get(b.badgeId);
      // Both earned -> compare lastEarnedDate (desc)
      if (ea && eb) {
        const da = ea.lastEarnedDate || "";
        const db = eb.lastEarnedDate || "";
        if (da !== db) return db.localeCompare(da);
        return (eb.earnedCount || 0) - (ea.earnedCount || 0);
      }
      if (ea) return -1;
      if (eb) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [badges, earnedBadges]);

  const mostRecentEarned = useMemo(() => {
    if (!earnedBadges || earnedBadges.length === 0) return null;
    const sorted = [...earnedBadges].sort((a, b) => (b.lastEarnedDate || "").localeCompare(a.lastEarnedDate || ""));
    return sorted[0] || null;
  }, [earnedBadges]);

  const [filterMode, setFilterMode] = useState("all");
  const filteredBadges = useMemo(() => {
    if (filterMode === "all") return visibleBadges;
    if (filterMode === "earned") return visibleBadges.filter((b) => earnedLookup.has(b.badgeId));
    return visibleBadges.filter((b) => !earnedLookup.has(b.badgeId));
  }, [visibleBadges, filterMode, earnedLookup]);

  useEffect(() => {
    // Reload earned badges whenever the modal opens or a refresh token changes.
    if (!isOpen) return;
    try {
      setEarnedBadges(loadBadges());
    } catch {
      setEarnedBadges([]);
    }
  }, [isOpen, refreshToken]);

  useEffect(() => {
    try {
      const stored = getPreferredTheme();
      if (stored) setThemeDark(stored === "dark");
      const mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => setThemeDark(e.matches);
      if (mql && typeof mql.addEventListener === "function") mql.addEventListener("change", handler);
      return () => { if (mql && typeof mql.removeEventListener === "function") mql.removeEventListener("change", handler); };
    } catch {}
  }, []);

  useEffect(() => {
    // detect newly earned badges and trigger confetti for badges earned today
    const todayKey = new Date().toISOString().slice(0, 10);
    const prev = prevEarnedRef.current || [];
    const prevMap = new Map(prev.map((b) => [b.badgeId, b]));
    const newly = earnedBadges.find((b) => {
      const p = prevMap.get(b.badgeId);
      if (!p && b.lastEarnedDate === todayKey) return true;
      if (p && p.lastEarnedDate !== b.lastEarnedDate && b.lastEarnedDate === todayKey) return true;
      return false;
    });
    if (newly) {
      try { confetti({ particleCount: 60, spread: 60, origin: { y: 0.4 } }); } catch {}
      try { playEarnSound(); } catch {}
    }
    prevEarnedRef.current = earnedBadges;
  }, [earnedBadges]);

  const playEarnSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.35);
      // close context after sound
      setTimeout(() => { try { ctx.close(); } catch {} }, 800);
    } catch {}
  };

  const exportEarnedBadges = async () => {
    try {
      const data = loadBadges();
      const payload = JSON.stringify(data, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        return;
      }
      // Fallback: create a temporary download
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `typing_master_badges_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleBadgeStorageUpdate = (event) => {
      if (!event?.key || event.key === "typingMaster.badges") {
        setEarnedBadges(loadBadges());
      }
      if (event?.key === "typingMaster.theme") {
        setThemeDark(getPreferredTheme() === "dark");
      }
    };

    window.addEventListener("storage", handleBadgeStorageUpdate);
    return () => window.removeEventListener("storage", handleBadgeStorageUpdate);
  }, [isOpen]);

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
          <div className="flex items-center gap-2">
            <button onClick={exportEarnedBadges} className="rounded-md border border-white/6 px-3 py-1 text-sm text-slate-200 hover:bg-white/5">Export</button>
            {copied ? <div className="text-sm text-emerald-300 mr-2">Copied!</div> : null}
            <button onClick={onClose} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">Close</button>
          </div>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setFilterMode("all")} className={`rounded-md px-3 py-1 text-sm font-medium ${filterMode === "all" ? "bg-amber-500/10 text-amber-300" : "bg-transparent text-slate-300"}`}>All</button>
              <button onClick={() => setFilterMode("earned")} className={`rounded-md px-3 py-1 text-sm font-medium ${filterMode === "earned" ? "bg-emerald-500/10 text-emerald-300" : "bg-transparent text-slate-300"}`}>Earned</button>
              <button onClick={() => setFilterMode("locked")} className={`rounded-md px-3 py-1 text-sm font-medium ${filterMode === "locked" ? "bg-slate-700/30 text-slate-200" : "bg-transparent text-slate-300"}`}>Locked</button>
            </div>
            <div className="text-sm text-slate-400">Showing {filteredBadges.length} of {visibleBadges.length}</div>
          </div>

          {mostRecentEarned ? (
            <div className="mb-4">
              <p className="text-xs text-amber-300 font-semibold">Recently Earned</p>
              <div className="mt-2 max-w-sm">
                <BadgeTile badge={{ badgeId: mostRecentEarned.badgeId, name: mostRecentEarned.name || mostRecentEarned.badgeId, iconName: mostRecentEarned.iconName || 'Medal' }} earned={mostRecentEarned} isDark={themeDark} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBadges.map((badge) => (
              <BadgeTile key={badge.badgeId} badge={badge} earned={earnedLookup.get(badge.badgeId)} isDark={themeDark} />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(BadgeGalleryModal);
