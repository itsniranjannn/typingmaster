/**
 * Progress through the guided Nepali lessons.
 *
 * A lesson is passed by finishing its drill with at least PASS_ACCURACY percent accuracy.
 * The next lesson unlocks when the previous one is passed (or when the learner chooses
 * "Unlock all"). Everything is stored per browser in localStorage.
 */

export const PASS_ACCURACY = 90;
const KEY = "typingMaster.nepaliLessons";

const empty = () => ({ lessons: {}, unlockedAll: false });

export const getLessonProgress = () => {
  try {
    if (typeof window === "undefined") return empty();
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object" || typeof parsed.lessons !== "object" || parsed.lessons === null) return empty();
    const lessons = {};
    Object.entries(parsed.lessons).forEach(([id, entry]) => {
      if (!entry || typeof entry !== "object") return;
      lessons[id] = {
        passed: entry.passed === true,
        bestAccuracy: Number.isFinite(entry.bestAccuracy) ? entry.bestAccuracy : 0,
        bestWpm: Number.isFinite(entry.bestWpm) ? entry.bestWpm : 0,
        attempts: Number.isFinite(entry.attempts) ? entry.attempts : 0
      };
    });
    return { lessons, unlockedAll: parsed.unlockedAll === true };
  } catch {
    return empty();
  }
};

const save = (progress) => {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable: progress simply will not persist
  }
};

/** Record one finished attempt. Returns the updated progress and whether this attempt passed. */
export const recordLessonAttempt = (progress, lessonId, { accuracy, wpm }) => {
  const previous = progress.lessons[lessonId] || { passed: false, bestAccuracy: 0, bestWpm: 0, attempts: 0 };
  const passedNow = accuracy >= PASS_ACCURACY;
  const next = {
    passed: previous.passed || passedNow,
    bestAccuracy: Math.max(previous.bestAccuracy, accuracy),
    bestWpm: Math.max(previous.bestWpm, wpm),
    attempts: previous.attempts + 1
  };
  const updated = { ...progress, lessons: { ...progress.lessons, [lessonId]: next } };
  save(updated);
  return { progress: updated, passedNow, newlyPassed: passedNow && !previous.passed };
};

export const setUnlockedAll = (progress, value) => {
  const updated = { ...progress, unlockedAll: Boolean(value) };
  save(updated);
  return updated;
};

export const resetLessonProgress = () => {
  const fresh = empty();
  save(fresh);
  return fresh;
};

/** Lesson at `index` is open when it is the first, everything is unlocked, or the one before is passed. */
export const isLessonUnlocked = (lessons, index, progress) => {
  if (index <= 0 || progress.unlockedAll) return true;
  const previous = lessons[index - 1];
  return Boolean(previous && progress.lessons[previous.id]?.passed);
};

export const countPassed = (lessons, progress) => lessons.filter((lesson) => progress.lessons[lesson.id]?.passed).length;

/** First lesson that is not yet passed, i.e. the one to do next. */
export const getNextLesson = (lessons, progress) => lessons.find((lesson) => !progress.lessons[lesson.id]?.passed) || null;
