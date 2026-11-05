import { memo } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

/** Shown above the usual results after a guided Nepali lesson. */
function LessonVerdict({ result, onStartLesson, isDark = true }) {
  const lesson = result?.lesson;
  if (!lesson) return null;
  const passed = lesson.passed;

  return (
    <section
      aria-label="Nepali lesson result"
      className={`mb-4 rounded-3xl border p-5 ${
        passed ? "border-emerald-400/50 bg-emerald-500/10" : isDark ? "border-amber-300/40 bg-amber-400/10" : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Lesson {lesson.number} of {lesson.total}
          </p>
          <h3 className={`mt-1 flex items-center gap-2 text-xl font-bold ${passed ? "text-emerald-400" : "text-amber-400"}`}>
            {passed ? <CheckCircle2 size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
            {passed ? (lesson.newlyPassed ? "Lesson passed. Next one unlocked!" : "Lesson passed again") : "Not passed yet"}
          </h3>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {lesson.title}: {lesson.accuracy}% accuracy at {lesson.wpm} WPM
            {lesson.mistakes ? ` (${lesson.mistakes} wrong ${lesson.mistakes === 1 ? "key" : "keys"}, even the ones you fixed)` : ""}.
            {passed ? "" : ` You need ${lesson.passAccuracy}% to pass. Slow down a little and aim for clean keystrokes.`}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {passed && lesson.nextId ? (
          <button
            type="button"
            onClick={() => onStartLesson(lesson.nextId)}
            className="rounded-full bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            Next lesson: {lesson.nextTitle}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onStartLesson(lesson.id)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isDark ? "border-white/15 text-slate-200 hover:bg-white/10" : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {passed ? "Practice again" : "Try again"}
        </button>
      </div>
    </section>
  );
}

export default memo(LessonVerdict);
