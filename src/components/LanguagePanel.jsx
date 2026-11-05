import { memo, useState } from "react";
import { BookOpen, Hand, Keyboard, Landmark } from "lucide-react";
import { LANGUAGES } from "../data/keyboardLayouts";
import { NEPALI_LESSONS, getLessonById } from "../data/nepaliLessons";
import { INPUT_METHODS } from "../utils/languageSettings";
import { LOKSEWA_DURATIONS, LOKSEWA_MIN_ACCURACY, LOKSEWA_TARGETS } from "../data/loksewaPassages";

function Toggle({ checked, onChange, label, icon: Icon, isDark }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        checked
          ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
          : isDark
            ? "border-slate-700 bg-slate-900/70 text-slate-400 hover:text-slate-200"
            : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
      } ${checked && !isDark ? "!text-sky-700" : ""}`}
    >
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

function LanguagePanel({
  language,
  settings,
  onLanguageChange,
  onSettingsChange,
  onStartLesson,
  activeLessonId,
  loksewa,
  onStartLoksewa,
  isDark
}) {
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [loksewaOpen, setLoksewaOpen] = useState(false);
  const [duration, setDuration] = useState(300);
  const [target, setTarget] = useState(30);
  const isNepali = language === LANGUAGES.NE;
  const activeLesson = getLessonById(activeLessonId);

  const segment = (value, label, lang) => (
    <button
      type="button"
      onClick={() => onLanguageChange(value)}
      aria-pressed={language === value}
      lang={lang}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        language === value
          ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-[0_8px_20px_rgba(141,134,214,0.2)]"
          : isDark
            ? "text-slate-300 hover:bg-slate-800"
            : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`rounded-2xl border px-3 py-3 sm:px-4 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200/80 bg-white/90"}`}
      data-testid="language-panel"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="group"
          aria-label="Typing language"
          className={`inline-flex rounded-full border p-0.5 ${isDark ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-slate-50"}`}
        >
          {segment(LANGUAGES.EN, "English", "en")}
          {segment(LANGUAGES.NE, "नेपाली", "ne")}
        </div>

        {isNepali ? (
          <>
            <div
              role="group"
              aria-label="Keyboard input method"
              className={`inline-flex rounded-full border p-0.5 text-xs font-semibold ${isDark ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-slate-50"}`}
            >
              {[
                [INPUT_METHODS.BUILT_IN, "Built-in Nepali layout", "Type with the physical keys shown below: works with any keyboard, no setup."],
                [INPUT_METHODS.SYSTEM, "My system keyboard", "Use the Nepali keyboard you installed in Windows/macOS/Android."]
              ].map(([value, label, title]) => (
                <button
                  key={value}
                  type="button"
                  title={title}
                  aria-pressed={settings.inputMethod === value}
                  onClick={() => onSettingsChange({ inputMethod: value })}
                  className={`rounded-full px-3 py-1.5 transition ${
                    settings.inputMethod === value
                      ? "bg-sky-500/25 text-sky-200"
                      : isDark
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                  } ${settings.inputMethod === value && !isDark ? "!text-sky-700" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLessonsOpen((open) => !open)}
              aria-expanded={lessonsOpen}
              className="inline-flex items-center gap-2 rounded-full border border-sand-400/50 bg-sand-400/10 px-3 py-1.5 text-xs font-semibold text-sand-300 transition hover:bg-sand-400/20"
            >
              <BookOpen size={14} aria-hidden="true" />
              Learn Nepali typing
            </button>

            <button
              type="button"
              onClick={() => setLoksewaOpen((open) => !open)}
              aria-expanded={loksewaOpen}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                loksewa
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                  : "border-wine-400/50 bg-wine-400/10 text-wine-300 hover:bg-wine-400/20"
              }`}
            >
              <Landmark size={14} aria-hidden="true" />
              Loksewa typing test
            </button>
          </>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Toggle
            checked={settings.showKeyboard}
            onChange={(value) => onSettingsChange({ showKeyboard: value })}
            label="Keyboard"
            icon={Keyboard}
            isDark={isDark}
          />
          <Toggle
            checked={settings.showFingerHints}
            onChange={(value) => onSettingsChange({ showFingerHints: value })}
            label="Finger hints"
            icon={Hand}
            isDark={isDark}
          />
        </div>
      </div>

      {isNepali && settings.inputMethod === INPUT_METHODS.SYSTEM ? (
        <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Add a Nepali keyboard in your system settings first (Windows: Settings → Time & language → Language → Nepali). The on-screen
          guide follows the standard Nepali layout; other layouts may differ.
        </p>
      ) : null}

      {isNepali && loksewaOpen ? (
        <div className="mt-3 border-t border-slate-700/40 pt-3" data-testid="loksewa-setup">
          <p className={`mb-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Practice like a government typing exam: a timed test on formal Nepali passages with a pass mark. Time, speed target and font vary by
            vacancy notice, so set them to match yours. Accuracy must be at least {LOKSEWA_MIN_ACCURACY}%.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Time</span>
              <div role="group" aria-label="Loksewa test duration" className="inline-flex gap-1">
                {LOKSEWA_DURATIONS.map((option) => (
                  <button
                    key={option.seconds}
                    type="button"
                    aria-pressed={duration === option.seconds}
                    onClick={() => setDuration(option.seconds)}
                    className={`rounded-full px-3 py-1.5 font-semibold transition ${
                      duration === option.seconds ? "bg-sky-500/25 text-sky-200" : isDark ? "bg-slate-900/70 text-slate-300" : "bg-slate-100 text-slate-600"
                    } ${duration === option.seconds && !isDark ? "!text-sky-700" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Target</span>
              <div role="group" aria-label="Loksewa target speed" className="inline-flex gap-1">
                {LOKSEWA_TARGETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={target === value}
                    onClick={() => setTarget(value)}
                    className={`rounded-full px-3 py-1.5 font-semibold transition ${
                      target === value ? "bg-sky-500/25 text-sky-200" : isDark ? "bg-slate-900/70 text-slate-300" : "bg-slate-100 text-slate-600"
                    } ${target === value && !isDark ? "!text-sky-700" : ""}`}
                  >
                    {value} WPM
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onStartLoksewa({ durationSeconds: duration, targetWpm: target })}
              className="rounded-full bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(141,134,214,0.2)] transition hover:brightness-110"
            >
              Start test
            </button>
          </div>
        </div>
      ) : null}

      {isNepali && loksewa ? (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${isDark ? "bg-emerald-500/10 text-emerald-100" : "bg-emerald-50 text-emerald-800"}`}>
          <span className="font-semibold">Loksewa test:</span> {Math.round(loksewa.durationSeconds / 60)} minutes, pass at {loksewa.targetWpm} WPM and{" "}
          {LOKSEWA_MIN_ACCURACY}% accuracy. The clock starts on your first key.
        </p>
      ) : null}

      {isNepali && lessonsOpen ? (
        <div className="mt-3 border-t border-slate-700/40 pt-3">
          <p className={`mb-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Follow the lessons in order. Each one drills only the keys it teaches, and the keyboard shows which finger to use.
          </p>
          <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {NEPALI_LESSONS.map((lesson, index) => {
              const active = lesson.id === activeLessonId;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => onStartLesson(lesson.id)}
                    aria-current={active ? "step" : undefined}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      active
                        ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                        : isDark
                          ? "border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    } ${active && !isDark ? "!text-sky-800" : ""}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        active ? "bg-sky-500 text-white" : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {lesson.title}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {isNepali && activeLesson ? (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${isDark ? "bg-slate-900/70 text-slate-200" : "bg-slate-100 text-slate-700"}`} lang="en">
          <span className="font-semibold">{activeLesson.title}.</span> {activeLesson.summary}
        </p>
      ) : null}
    </div>
  );
}

export default memo(LanguagePanel);
