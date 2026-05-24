import { memo } from "react";
import { motion } from "framer-motion";
import { Flag, XCircle, RotateCcw, Timer, Target, Keyboard, ChevronDown, ChevronUp } from "lucide-react";

function ChallengeArenaBanner({ challenge = null, progress = null, challengeFailed = false, challengeCompleted = false, collapsed = false, onToggleCollapsed, onCancel, onRetry }) {
  if (!challenge) return null;

  const badgeTone = challengeCompleted
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : challengeFailed
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : "border-amber-400/30 bg-amber-500/10 text-amber-100";

  const wpmValue = progress?.wpm ?? 0;
  const accuracyValue = progress?.accuracy ?? 0;
  const holdValue = progress?.holdSeconds ?? 0;

  if (collapsed) {
    return (
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-4 rounded-2xl border border-amber-400/25 bg-gradient-to-r from-slate-950 to-slate-900 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200">
              <Flag size={12} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{challenge.title}</p>
              <p className="truncate text-[11px] text-slate-400">{challenge.badgeName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Show
            <ChevronDown size={12} />
          </button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="mb-4 rounded-3xl border border-amber-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200">
            <Flag size={12} />
            Arena Mode
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{challenge.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-300">{challenge.objective || challenge.description}</p>
          </div>
        </div>

        <div className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${badgeTone}`}>
          {challenge.badgeName}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Target size={12} />
            Objective
          </div>
          <p className="mt-2 text-sm text-slate-100">{challenge.description}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Keyboard size={12} />
            Live Progress
          </div>
          <div className="mt-2 space-y-2 text-xs text-slate-200">
            <div className="flex items-center justify-between"><span>WPM</span><span>{wpmValue}/{challenge.rules?.targetWpm || challenge.rules?.minWpm || "--"}</span></div>
            <div className="flex items-center justify-between"><span>Accuracy</span><span>{accuracyValue}%/{challenge.rules?.minAccuracy || 100}%</span></div>
            {challenge.rules?.sustainSeconds ? (
              <div className="flex items-center justify-between"><span>Hold</span><span>{holdValue}/{challenge.rules.sustainSeconds}s</span></div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Timer size={12} />
            Arena Rules
          </div>
          <div className="mt-2 space-y-1 text-xs text-slate-200">
            {challenge.rules?.timeLimitSeconds ? <p>Time limit: {challenge.rules.timeLimitSeconds}s</p> : null}
            {challenge.rules?.noBackspace ? <p>No backspace allowed</p> : null}
            {challenge.rules?.hideAfterSeconds ? <p>Text hides after {challenge.rules.hideAfterSeconds}s</p> : null}
            {challenge.rules?.allowedMistakes != null ? <p>Allowed mistakes: {challenge.rules.allowedMistakes}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span>Challenge Progress</span>
          <span>{progress?.promptHidden ? "Hidden" : "Visible"}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, Math.round((progress?.wpmProgress || progress?.timeProgress || progress?.holdProgress || progress?.accuracyProgress || 0) * 100)))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={challengeCompleted ? onRetry : onCancel}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
        >
          {challengeCompleted ? <RotateCcw size={14} /> : <XCircle size={14} />}
          {challengeCompleted ? "Retry" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
        >
          Hide
          <ChevronUp size={14} />
        </button>
        {challengeFailed ? <span className="inline-flex items-center rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">Failed - retry the arena</span> : null}
      </div>
    </motion.section>
  );
}

export default memo(ChallengeArenaBanner);
