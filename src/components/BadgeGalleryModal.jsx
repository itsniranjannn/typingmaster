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
import { getBadgeCatalog, getChallengeTemplates } from "../utils/dailyChallenge";
import { loadBadges } from "../utils/storage";
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

function BadgeTile({ badge, earned, isDark, selected = false, onClick }) {
  const Icon = ICONS[badge.iconName] || Trophy;
  const earnedClass = earned
    ? (isDark
      ? "border-amber-300/25 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(15,23,42,0.94)_58%)] shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
      : "border-amber-300/50 bg-[radial-gradient(circle_at_top,_rgba(255,248,226,0.98),_rgba(241,245,249,0.96)_58%)] shadow-[0_18px_32px_rgba(148,163,184,0.16)]")
    : (isDark
      ? "border-slate-700/45 bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.92),_rgba(15,23,42,0.97)_60%)] opacity-95"
      : "border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(241,245,249,0.96)_60%)] text-slate-700");

  const iconWrap = earned
    ? (isDark
      ? "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-slate-950 ring-1 ring-amber-200/80 shadow-[0_10px_25px_rgba(251,191,36,0.25)]"
      : "bg-gradient-to-br from-amber-100 via-amber-200 to-orange-200 text-amber-950 ring-1 ring-amber-200/80 shadow-[0_10px_25px_rgba(251,191,36,0.16)]")
    : (isDark ? "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-slate-300 ring-1 ring-white/5" : "bg-gradient-to-br from-slate-100 via-slate-200 to-slate-50 text-slate-500 ring-1 ring-slate-200/70");

  const todayKey = new Date().toISOString().slice(0, 10);
  const isNew = earned && earned.lastEarnedDate === todayKey;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!earned}
      className={`group relative flex h-full min-h-[220px] w-full flex-col overflow-hidden rounded-3xl border p-4 text-left transition duration-200 ${earned ? "hover:-translate-y-1 hover:scale-[1.01]" : "cursor-default"} ${selected ? "ring-2 ring-amber-300/60" : ""} ${earnedClass} ${isNew ? "animate-pulse" : ""}`}
      title={earned ? "View challenge details" : undefined}
      aria-pressed={selected}
    >
      <div className={`pointer-events-none absolute inset-0 ${isDark ? "bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-80" : "bg-gradient-to-br from-white/70 via-transparent to-transparent opacity-60"}`} />
      <div className="relative flex items-start justify-between gap-2">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${iconWrap}`}>
          <Icon size={26} strokeWidth={2.2} />
        </div>
        {earned ? (
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isDark ? "bg-white/10 text-amber-200" : "bg-amber-100 text-amber-700"}`}>x{earned.earnedCount}</span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${isDark ? "bg-slate-800/80 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
            <Lock size={12} /> Locked
          </span>
        )}
      </div>
      <div className="relative mt-4 flex flex-1 flex-col">
        <div className="min-h-[52px]">
          <p className={`text-sm font-semibold tracking-wide ${isDark ? "text-white" : "text-slate-950"}`}>{badge.name}</p>
          <p className={`mt-1 text-[11px] leading-5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{badge.description || (earned ? "Unlocked in arena" : "Unlock this badge in the arena")}</p>
        </div>
        <div className={`mt-auto rounded-2xl px-3 py-2 text-[11px] font-medium ${earned ? (isDark ? "bg-white/6 text-amber-100" : "bg-amber-100/80 text-amber-800") : (isDark ? "bg-slate-900/55 text-slate-400" : "bg-slate-100 text-slate-600")}`}>
          {earned ? (isNew ? "Recently earned" : "Earned badge") : "Locked badge"}
        </div>
      </div>
    </button>
  );
}

function BadgeGalleryModal({ isOpen, onClose, isDark = true, refreshToken = 0 }) {
  const badges = useMemo(() => getBadgeCatalog(), []);
  const [earnedBadges, setEarnedBadges] = useState(() => loadBadges());
  const [copied, setCopied] = useState(false);
  const [themeDark, setThemeDark] = useState(isDark);
  const [selectedBadgeId, setSelectedBadgeId] = useState(null);
  const prevEarnedRef = useRef(earnedBadges);
  const earnedLookup = useMemo(() => new Map(earnedBadges.map((badge) => [badge.badgeId, badge])), [earnedBadges]);
  const challengeLookup = useMemo(() => new Map(getChallengeTemplates().map((challenge) => [challenge.badgeId, challenge])), []);
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

  const selectedBadge = selectedBadgeId ? earnedLookup.get(selectedBadgeId) || null : null;
  const selectedChallenge = selectedBadge ? challengeLookup.get(selectedBadge.badgeId) || null : null;

  useEffect(() => {
    // Reload earned badges whenever the modal opens or a refresh token changes.
    if (!isOpen) return;
    try {
      const nextBadges = loadBadges();
      setEarnedBadges(nextBadges);
      const nextRecent = [...nextBadges].sort((a, b) => (b.lastEarnedDate || "").localeCompare(a.lastEarnedDate || ""))[0] || null;
      setSelectedBadgeId(nextRecent?.badgeId || null);
    } catch {
      setEarnedBadges([]);
      setSelectedBadgeId(null);
    }
  }, [isOpen, refreshToken]);

  useEffect(() => {
    setThemeDark(isDark);
  }, [isDark]);

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
    };

    window.addEventListener("storage", handleBadgeStorageUpdate);
    return () => window.removeEventListener("storage", handleBadgeStorageUpdate);
  }, [isOpen]);

  if (!isOpen) return null;

  const modalThemeClass = themeDark
    ? "border-slate-700/60 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_rgba(2,6,23,0.96)_34%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] text-slate-100 shadow-[0_24px_90px_rgba(2,6,23,0.55)]"
    : "border-slate-300/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(241,245,249,0.96)_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(226,232,240,0.96))] text-slate-900 shadow-[0_24px_90px_rgba(148,163,184,0.22)]";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ scale: 0.96, y: 18 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className={`relative z-50 w-full max-w-6xl overflow-hidden rounded-3xl border ${modalThemeClass}`}>
        <div className={`flex items-center justify-between border-b px-5 py-4 ${themeDark ? "border-white/10" : "border-slate-200/80"}`}>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${themeDark ? "text-amber-300" : "text-amber-700"}`}>Badge Gallery</p>
            <h3 className={`text-xl font-semibold ${themeDark ? "text-white" : "text-slate-950"}`}>Arena rewards and milestones</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportEarnedBadges} className={`rounded-md border px-3 py-1 text-sm ${themeDark ? "border-white/6 text-slate-200 hover:bg-white/5" : "border-slate-300 bg-white/80 text-slate-700 hover:bg-white"}`}>Export</button>
            {copied ? <div className={`mr-2 text-sm ${themeDark ? "text-emerald-300" : "text-emerald-700"}`}>Copied!</div> : null}
            <button onClick={onClose} className={`rounded-full border px-3 py-2 text-sm ${themeDark ? "border-white/10 text-slate-200 hover:bg-white/5" : "border-slate-300 bg-white/70 text-slate-700 hover:bg-white"}`}>Close</button>
          </div>
        </div>
        <div className="max-h-[78vh] overflow-y-auto scrollbar-none p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setFilterMode("all")} className={`rounded-md px-3 py-1 text-sm font-medium ${filterMode === "all" ? (themeDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-100 text-amber-800") : (themeDark ? "bg-transparent text-slate-300" : "bg-transparent text-slate-700")}`}>All</button>
              <button onClick={() => setFilterMode("earned")} className={`rounded-md px-3 py-1 text-sm font-medium ${filterMode === "earned" ? (themeDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-100 text-emerald-800") : (themeDark ? "bg-transparent text-slate-300" : "bg-transparent text-slate-700")}`}>Earned</button>
              <button onClick={() => setFilterMode("locked")} className={`rounded-md px-3 py-1 text-sm font-medium ${filterMode === "locked" ? (themeDark ? "bg-slate-700/30 text-slate-200" : "bg-slate-200 text-slate-800") : (themeDark ? "bg-transparent text-slate-300" : "bg-transparent text-slate-700")}`}>Locked</button>
            </div>
            <div className={`text-sm ${themeDark ? "text-slate-400" : "text-slate-600"}`}>Showing {filteredBadges.length} of {visibleBadges.length}</div>
          </div>

          {filterMode === "all" && mostRecentEarned ? (
            <div className={`mb-5 rounded-3xl border px-4 py-4 ${themeDark ? "border-amber-300/15 bg-amber-400/5" : "border-amber-200/70 bg-amber-50/90"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${themeDark ? "text-amber-300" : "text-amber-700"}`}>Recently Earned</p>
                  <p className={`mt-1 text-sm ${themeDark ? "text-slate-300" : "text-slate-700"}`}>The latest badge sits here so the grid can stay balanced.</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 ${themeDark ? "bg-slate-900/70 text-white" : "bg-white text-slate-950 shadow-sm"}`}>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${themeDark ? "bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950" : "bg-gradient-to-br from-amber-100 to-orange-200 text-amber-950"}`}>
                    <Trophy size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${themeDark ? "text-white" : "text-slate-950"}`}>{mostRecentEarned.name || mostRecentEarned.badgeId}</p>
                    <p className={`text-[11px] ${themeDark ? "text-slate-400" : "text-slate-600"}`}>{mostRecentEarned.earnedCount ? `Earned ${mostRecentEarned.earnedCount} time${mostRecentEarned.earnedCount > 1 ? "s" : ""}` : "Recently unlocked"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBadges.map((badge) => (
              <BadgeTile
                key={badge.badgeId}
                badge={badge}
                earned={earnedLookup.get(badge.badgeId)}
                isDark={themeDark}
                selected={selectedBadgeId === badge.badgeId}
                onClick={earnedLookup.has(badge.badgeId) ? () => setSelectedBadgeId((current) => (current === badge.badgeId ? null : badge.badgeId)) : undefined}
              />
            ))}
          </div>

          {selectedBadge && selectedChallenge ? (
            <div className={`mt-5 rounded-3xl border p-4 ${themeDark ? "border-amber-300/15 bg-slate-900/70" : "border-slate-200 bg-white/90 shadow-sm"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${themeDark ? "text-amber-300" : "text-amber-700"}`}>Challenge unlocked this badge</p>
                  <h4 className={`mt-1 text-lg font-semibold ${themeDark ? "text-white" : "text-slate-950"}`}>{selectedChallenge.title}</h4>
                  <p className={`mt-1 max-w-3xl text-sm leading-6 ${themeDark ? "text-slate-300" : "text-slate-700"}`}>{selectedChallenge.subtitle || selectedChallenge.objective}</p>
                  <p className={`mt-2 text-sm ${themeDark ? "text-amber-100/90" : "text-amber-800"}`}>
                    Why you earned this: {selectedChallenge.subtitle || selectedChallenge.objective}
                  </p>
                </div>
                <div className={`rounded-2xl px-3 py-2 text-right ${themeDark ? "bg-white/5 text-amber-100" : "bg-amber-50 text-amber-800"}`}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em]">Badge</div>
                  <div className="text-sm font-semibold">{selectedBadge.name}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className={`rounded-2xl border px-3 py-3 ${themeDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${themeDark ? "text-slate-400" : "text-slate-500"}`}>Objective</div>
                  <div className={`mt-1 text-sm ${themeDark ? "text-slate-200" : "text-slate-800"}`}>{selectedChallenge.objective || selectedChallenge.subtitle}</div>
                </div>
                <div className={`rounded-2xl border px-3 py-3 ${themeDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${themeDark ? "text-slate-400" : "text-slate-500"}`}>Reward</div>
                  <div className={`mt-1 text-sm ${themeDark ? "text-slate-200" : "text-slate-800"}`}>{selectedChallenge.reward || selectedBadge.name}</div>
                </div>
                <div className={`rounded-2xl border px-3 py-3 ${themeDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${themeDark ? "text-slate-400" : "text-slate-500"}`}>Earned</div>
                  <div className={`mt-1 text-sm ${themeDark ? "text-slate-200" : "text-slate-800"}`}>{selectedBadge.earnedCount} time{selectedBadge.earnedCount > 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(BadgeGalleryModal);
