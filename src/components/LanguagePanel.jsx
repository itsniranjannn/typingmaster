import { memo, useState } from "react";
import { BookOpen, Check, Hand, Keyboard, Landmark, Lock } from "lucide-react";
import { LANGUAGES, LAYOUTS, isTypeableText } from "../data/keyboardLayouts";
import { NEPALI_LESSONS, getLessonById } from "../data/nepaliLessons";
import { INPUT_METHODS } from "../utils/languageSettings";
import { PASS_ACCURACY, countPassed, getNextLesson, isLessonUnlocked } from "../utils/lessonProgress";
import { LOKSEWA_DURATIONS, LOKSEWA_MIN_ACCURACY, LOKSEWA_TARGETS, LOKSEWA_TITLES, normalizeCustomText } from "../data/loksewaPassages";

function Toggle({ checked, onChange, label, icon: Icon, isDark }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
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
      <span className="hidden 2xl:inline">{label}</span>
    </button>
  );
}

function LanguagePanel({
  language,
  settings,
  onLanguageChange,
  onSettingsChange,
  onStartLesson,
  lessonProgress = { lessons: {}, unlockedAll: false },
  onUnlockAll,
  activeLessonId,
  loksewa,
  onStartLoksewa,
  isDark
}) {
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [loksewaOpen, setLoksewaOpen] = useState(false);
  const [duration, setDuration] = useState(300);
  const [target, setTarget] = useState(30);
  const [passageIndex, setPassageIndex] = useState("random");
  const [customText, setCustomText] = useState("");
  const normalizedCustom = normalizeCustomText(customText);
  const blockedCharacters = normalizedCustom
    ? [...new Set([...normalizedCustom].filter((character) => !isTypeableText(LAYOUTS.ne, character)))]
    : [];
  const customWords = normalizedCustom ? normalizedCustom.split(" ").length : 0;
  const customInvalid = normalizedCustom.length > 0 && (blockedCharacters.length > 0 || customWords < 5);
  const isNepali = language === LANGUAGES.NE;
  const passedCount = countPassed(NEPALI_LESSONS, lessonProgress);
  const nextLesson = getNextLesson(NEPALI_LESSONS, lessonProgress);
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
      className={`rounded-2xl border px-3 py-2 sm:px-4 ${isDark ? "border-slate-700/60 bg-slate-950/50" : "border-slate-200/80 bg-white/90"}`}
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

        {/* The on-screen keyboard and finger hints are for learning the Nepali layout only. */}
        {isNepali ? (
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
        ) : null}
      </div>

      {isNepali && settings.inputMethod === INPUT_METHODS.SYSTEM ? (
        <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Add a Nepali keyboard in your system settings first (Windows: Settings → Time & language → Language → Nepali). The on-screen
          guide shows the traditional (Preeti-style) layout; other layouts may differ.
        </p>
      ) : null}

      {isNepali && loksewaOpen ? (
        <div className="mt-3 border-t border-slate-700/40 pt-3" data-testid="loksewa-setup">
          <p className={`mb-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Practice like a government typing exam: a timed test on a formal Nepali passage, with a pass mark. Time, speed target and font vary
            by vacancy notice, so set them to match yours. Accuracy must be at least {LOKSEWA_MIN_ACCURACY}%.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs">
              <span className={`mb-1 block font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                समय <span className="font-normal opacity-70">(Time)</span>
              </span>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                aria-label="Loksewa test duration"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${isDark ? "border-slate-600 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-800"}`}
              >
                {LOKSEWA_DURATIONS.map((option) => (
                  <option key={option.seconds} value={option.seconds}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className={`mb-1 block font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                अनुच्छेद <span className="font-normal opacity-70">(Passage)</span>
              </span>
              <select
                value={passageIndex}
                onChange={(event) => setPassageIndex(event.target.value)}
                aria-label="Loksewa passage"
                lang="ne"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${isDark ? "border-slate-600 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-800"}`}
              >
                <option value="random">अनियमित छान्नुहोस् (Random)</option>
                {LOKSEWA_TITLES.map((title, index) => (
                  <option key={title} value={index}>{title}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block text-xs">
            <span className={`mb-1 block font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              वा आफ्नो पाठ लेख्नुहोस् <span className="font-normal opacity-70">(Or paste your own text, optional)</span>
            </span>
            <textarea
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              aria-label="Loksewa custom text"
              lang="ne"
              rows={3}
              placeholder="यहाँ आफ्नो नेपाली पाठ लेख्नुहोस्..."
              className={`w-full resize-y rounded-lg border px-3 py-2 text-sm ${isDark ? "border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500" : "border-slate-300 bg-white text-slate-800 placeholder:text-slate-400"}`}
            />
            <span
              data-testid="loksewa-custom-status"
              className={`mt-1 block ${customInvalid ? "text-rose-400" : isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              {!normalizedCustom
                ? "Leave empty to use the passage above."
                : blockedCharacters.length > 0
                  ? `Cannot be typed on this layout: ${blockedCharacters.join(" ")}`
                  : customWords < 5
                    ? "Add at least 5 words."
                    : `${customWords} words, ${normalizedCustom.length} characters. This text replaces the passage.`}
            </span>
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
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
              disabled={customInvalid}
              onClick={() =>
                onStartLoksewa({
                  durationSeconds: duration,
                  targetWpm: target,
                  passageIndex: passageIndex === "random" ? null : Number(passageIndex),
                  customText: normalizedCustom
                })
              }
              className="rounded-full disabled:cursor-not-allowed disabled:opacity-50  bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(141,134,214,0.2)] transition hover:brightness-110"
            >
              परीक्षण सुरु गर्नुहोस् (Start test)
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
        <div className="mt-3 border-t border-slate-700/40 pt-3" data-testid="lesson-list">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Finish each drill with at least {PASS_ACCURACY}% accuracy to pass it and unlock the next lesson.
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`} data-testid="lesson-count">
                {passedCount}/{NEPALI_LESSONS.length} passed
              </span>
              {!lessonProgress.unlockedAll && passedCount < NEPALI_LESSONS.length ? (
                <button
                  type="button"
                  onClick={onUnlockAll}
                  className="rounded-full border border-slate-500/50 px-3 py-1 font-semibold text-slate-300 transition hover:border-sky-400/60 hover:text-white"
                >
                  Unlock all
                </button>
              ) : null}
            </div>
          </div>
          <div className={`mb-3 h-1.5 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`} role="progressbar" aria-valuemin={0} aria-valuemax={NEPALI_LESSONS.length} aria-valuenow={passedCount}>
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500" style={{ width: `${(passedCount / NEPALI_LESSONS.length) * 100}%` }} />
          </div>
          <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {NEPALI_LESSONS.map((lesson, index) => {
              const active = lesson.id === activeLessonId;
              const record = lessonProgress.lessons[lesson.id];
              const passed = Boolean(record?.passed);
              const unlocked = isLessonUnlocked(NEPALI_LESSONS, index, lessonProgress);
              const isNext = unlocked && !passed && nextLesson?.id === lesson.id;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onStartLesson(lesson.id)}
                    aria-current={active ? "step" : undefined}
                    title={unlocked ? undefined : `Pass lesson ${index} with ${PASS_ACCURACY}% accuracy to unlock`}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      !unlocked
                        ? "cursor-not-allowed opacity-50 " + (isDark ? "border-slate-800 bg-slate-900/40 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-400")
                        : active
                          ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                          : passed
                            ? "border-emerald-400/50 " + (isDark ? "bg-emerald-500/10 text-emerald-100" : "bg-emerald-50 text-emerald-800")
                            : isDark
                              ? "border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    } ${active && !isDark ? "!text-sky-800" : ""} ${isNext ? "ring-1 ring-sky-400/60" : ""}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        passed ? "bg-emerald-500 text-white" : active ? "bg-sky-500 text-white" : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {passed ? <Check size={12} aria-label="passed" /> : !unlocked ? <Lock size={11} aria-label="locked" /> : index + 1}
                    </span>
                    <span className="flex-1">{lesson.title}</span>
                    {passed ? <span className="text-[10px] font-medium opacity-80">{Math.round(record.bestAccuracy)}%</span> : null}
                    {isNext ? <span className="rounded-full bg-sky-500/25 px-2 py-0.5 text-[10px] text-sky-200">Next</span> : null}
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
