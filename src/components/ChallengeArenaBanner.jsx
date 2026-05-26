import { memo } from "react";
import { motion } from "framer-motion";
import { Flag, XCircle, RotateCcw, Timer, Target, Keyboard, ChevronDown, ChevronUp } from "lucide-react";

function ChallengeArenaBanner({ challenge = null, progress = null, challengeFailed = false, challengeCompleted = false, collapsed = false, isDark = true, onToggleCollapsed, onCancel, onRetry, attemptsLeft = 3 }) {
  if (!challenge) return null;
  const rules = challenge.rules || {};
  const objectiveText = `${challenge.objective || ""} ${challenge.description || ""}`.toLowerCase();

  const surfaceClass = isDark
    ? "border-amber-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20"
    : "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 text-slate-900";
  const panelClass = isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/85";
  const mutedText = isDark ? "text-slate-300" : "text-slate-600";
  const mutedLabel = isDark ? "text-slate-400" : "text-slate-500";
  const progressTrackClass = isDark ? "bg-white/10" : "bg-slate-200";
  const buttonClass = isDark
    ? "border-white/10 bg-white/8 text-white hover:bg-white/12"
    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";

  const badgeTone = challengeCompleted
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : challengeFailed
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : "border-amber-400/30 bg-amber-500/10 text-amber-100";

  const wpmValue = progress?.wpm ?? 0;
  const accuracyValue = progress?.accuracy ?? 0;
  const holdValue = progress?.holdSeconds ?? 0;
  const targetWpm = rules.targetWpm || rules.minWpm || "--";
  const accuracyTarget = rules.targetAccuracy || (rules.minAccuracy ?? 100);
  const wordTarget = Number(rules.wordCount || rules.minTypedWords || 0) || null;
  const charTarget = Number(rules.charTarget || 0) || null;
  const timeTarget = Number(rules.timeLimitSeconds || 0) || null;
  const holdTarget = Number(rules.sustainSeconds || 0) || null;
  const hideAfter = Number(rules.hideAfterSeconds || 0) || null;
  const showsAccuracy = Boolean(rules.targetAccuracy) || /\baccuracy\b|%/.test(objectiveText);

  const liveItems = [];
  const progressParts = [];

  if (rules.targetWpm || rules.minWpm || /\bwpm\b/.test(objectiveText)) {
    liveItems.push({ label: "WPM", value: `${wpmValue}/${targetWpm}` });
    if (typeof progress?.wpmProgress === "number") progressParts.push(progress.wpmProgress);
  }

  if (showsAccuracy) {
    liveItems.push({ label: "Accuracy", value: `${accuracyValue}%/${accuracyTarget}%` });
    if (typeof progress?.accuracyProgress === "number") progressParts.push(progress.accuracyProgress);
  }

  if (wordTarget) {
    liveItems.push({ label: "Words", value: `${progress?.completedWords ?? 0}/${wordTarget}` });
    if (typeof progress?.wordProgress === "number") progressParts.push(progress.wordProgress);
  }

  if (charTarget) {
    liveItems.push({ label: "Chars", value: `${progress?.typedCharacterCount ?? 0}/${charTarget}` });
    if (typeof progress?.charProgress === "number") progressParts.push(progress.charProgress);
  }

  if (holdTarget) {
    liveItems.push({ label: "Hold", value: `${holdValue}/${holdTarget}s` });
    if (typeof progress?.holdProgress === "number") progressParts.push(progress.holdProgress);
  }

  if (hideAfter) {
    liveItems.push({ label: "Text", value: progress?.promptHidden ? "Hidden" : "Visible" });
    if (typeof progress?.elapsedSeconds === "number") {
      progressParts.push(progress?.promptHidden ? 1 : Math.min(1, progress.elapsedSeconds / hideAfter));
    }
  }

  if (rules.noBackspace) {
    liveItems.push({ label: "Backspace", value: progress?.backspaceUsed ? "Used" : "Clean" });
    progressParts.push(progress?.backspaceUsed ? 0 : 1);
  }

  if (rules.allowedMistakes != null) {
    const mistakeLimit = Number(rules.allowedMistakes) || 0;
    const mistakes = progress?.mistakes ?? 0;
    liveItems.push({ label: "Mistakes", value: `${mistakes}/${mistakeLimit}` });
    progressParts.push(Math.max(0, Math.min(1, 1 - mistakes / (mistakeLimit + 1))));
  }

  if (timeTarget) {
    liveItems.push({ label: "Time", value: `${progress?.elapsedSeconds ?? 0}/${timeTarget}s` });
    if (typeof progress?.timeProgress === "number") progressParts.push(progress.timeProgress);
  }

  const progressRatio = progressParts.length > 0
    ? progressParts.reduce((sum, value) => sum + value, 0) / progressParts.length
    : 0;
  const progressValue = Math.min(100, Math.max(0, Math.round(progressRatio * 100)));
  const collapsedItems = liveItems.slice(0, 3);

  if (collapsed) {
    return (
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`mb-4 rounded-2xl border px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${surfaceClass}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${isDark ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-100 text-amber-700"}`}>
              <Flag size={12} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{challenge.title}</p>
              <p className={`truncate text-[11px] ${mutedLabel}`}>{challenge.badgeName}</p>
            </div>
          </div>
          <div className={`flex min-w-0 flex-wrap items-center gap-3 text-[11px] ${mutedText}`}>
            <span className="truncate max-w-[18rem]">Objective: {challenge.objective || challenge.description}</span>
            {collapsedItems.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1 whitespace-nowrap">
                {item.label} {item.value}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${buttonClass}`}
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
      className={`mb-4 rounded-3xl border p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] ${surfaceClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${isDark ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-100 text-amber-700"}`}>
            <Flag size={12} />
            Arena Mode
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{challenge.title}</h2>
            <p className={`mt-1 max-w-3xl text-sm ${mutedText}`}>{challenge.objective || challenge.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${badgeTone}`}>
            {challenge.badgeName}
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200 border-gray-700' : 'bg-white text-slate-700 border-slate-200'}`}>
            Attempts: {attemptsLeft}/3
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className={`rounded-2xl border p-3 ${panelClass}`}>
          <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedLabel}`}>
            <Target size={12} />
            Objective
          </div>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>{challenge.description}</p>
        </div>

        <div className={`rounded-2xl border p-3 ${panelClass}`}>
          <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedLabel}`}>
            <Keyboard size={12} />
            Live Progress
          </div>
          <div className={`mt-2 space-y-2 text-xs ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {liveItems.length > 0 ? liveItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between"><span>{item.label}</span><span>{item.value}</span></div>
            )) : <div className="flex items-center justify-between"><span>Status</span><span>In progress</span></div>}
          </div>
        </div>

        <div className={`rounded-2xl border p-3 ${panelClass}`}>
          <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedLabel}`}>
            <Timer size={12} />
            Arena Rules
          </div>
          <div className={`mt-2 space-y-1 text-xs ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {rules.timeLimitSeconds ? <p>Time limit: {rules.timeLimitSeconds}s</p> : null}
            {rules.noBackspace ? <p>No backspace allowed</p> : null}
            {rules.hideAfterSeconds ? <p>Text hides after {rules.hideAfterSeconds}s</p> : null}
            {rules.allowedMistakes != null ? <p>Allowed mistakes: {rules.allowedMistakes}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className={`mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${mutedLabel}`}>
          <span>Challenge Progress</span>
          <span>{progress?.promptHidden ? "Hidden" : "Visible"}</span>
        </div>
        <div className={`h-2 overflow-hidden rounded-full ${progressTrackClass}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-300"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={challengeCompleted ? onRetry : onCancel}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${buttonClass}`}
        >
          {challengeCompleted ? <RotateCcw size={14} /> : <XCircle size={14} />}
          {challengeCompleted ? "Retry" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${buttonClass}`}
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
