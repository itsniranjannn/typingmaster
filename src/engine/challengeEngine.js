import { TYPING_MODES } from "../constants/typingModes";

const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();

const getChallengeFamily = (challenge) => {
  if (!challenge || typeof challenge !== "object") return "";
  if (typeof challenge.family === "string" && challenge.family.trim()) return challenge.family.trim();
  if (typeof challenge.templateId === "string" && challenge.templateId.includes("-")) {
    return challenge.templateId.split("-")[0];
  }
  if (typeof challenge.id === "string" && challenge.id.includes("-")) {
    return challenge.id.split("-")[0];
  }
  return "";
};

const getTypedWordCount = (result) => {
  if (typeof result?.typedWordCount === "number" && Number.isFinite(result.typedWordCount)) {
    return Math.max(0, Math.round(result.typedWordCount));
  }

  if (typeof result?.typedText === "string") {
    return result.typedText.trim().split(/\s+/).filter(Boolean).length;
  }

  if (typeof result?.completedWords === "number" && Number.isFinite(result.completedWords)) {
    return Math.max(0, Math.round(result.completedWords));
  }

  return 0;
};

export const validateBaseChallengeRules = (challenge, result) => {
  const rules = challenge.rules || {};
  const wpm = Math.max(0, Number(result.wpm) || 0);
  const accuracy = Math.max(0, Number(result.accuracy) || 0);
  const timeUsed = Math.max(0, Number(result.timeUsed) || 0);
  const incorrectCharacters = Math.max(0, Number(result.incorrectCharacters) || 0);
  const typedWordCount = getTypedWordCount(result);
  const minWpm = typeof rules.targetWpm === "number" ? rules.targetWpm : rules.minWpm;
  const minAccuracy = typeof rules.targetAccuracy === "number" ? rules.targetAccuracy : rules.minAccuracy;

  if (rules.noBackspace && result.backspaceUsed) return false;
  if (typeof rules.allowedMistakes === "number" && incorrectCharacters > rules.allowedMistakes) return false;
  if (typeof minWpm === "number" && wpm < minWpm) return false;
  if (typeof minAccuracy === "number" && accuracy < minAccuracy) return false;
  if (typeof rules.timeLimitSeconds === "number" && timeUsed > rules.timeLimitSeconds) return false;
  if (typeof rules.minTypedWords === "number" && typedWordCount < rules.minTypedWords) return false;
  return true;
};

export const validateEnduranceChallenge = (challenge, result) => {
  const rules = challenge.rules || {};
  if (!validateBaseChallengeRules(challenge, result)) return false;
  if (typeof rules.wordCount === "number" && getTypedWordCount(result) < rules.wordCount) return false;
  return true;
};

export const validateControlChallenge = (challenge, result) => {
  const rules = challenge.rules || {};
  if (!validateBaseChallengeRules(challenge, result)) return false;
  if (!rules.noBackspace || result.backspaceUsed) return false;
  if (typeof rules.wordCount === "number" && getTypedWordCount(result) < rules.wordCount) return false;
  return true;
};

export const validateSpikeChallenge = (challenge, result) => {
  const rules = challenge.rules || {};
  if (!validateBaseChallengeRules(challenge, result)) return false;
  const targetWpm = Math.max(0, Number(rules.targetWpm || rules.minWpm) || 0);
  const holdSeconds = Math.max(0, Number(result.holdSeconds) || 0);
  const maxHoldWpm = Math.max(0, Number(result.maxHoldWpm) || 0);
  if (!targetWpm) return false;
  if (holdSeconds < (rules.sustainSeconds || 0)) return false;
  if (maxHoldWpm < targetWpm) return false;
  return true;
};

export const validatePrecisionChallenge = (challenge, result) => {
  const rules = challenge.rules || {};
  if (!validateBaseChallengeRules(challenge, result)) return false;
  if (typeof rules.wordCount === "number" && getTypedWordCount(result) < rules.wordCount) return false;
  return true;
};

export const validateNumbersChallenge = (challenge, result) => {
  const rules = challenge.rules || {};
  if (!validateBaseChallengeRules(challenge, result)) return false;
  const typedCharacterCount = Math.max(0, Number(result.typedCharacterCount ?? result.typedText?.length ?? 0) || 0);
  if (typeof rules.charTarget === "number" && typedCharacterCount < rules.charTarget) return false;
  return true;
};

export const validateMemoryChallenge = (challenge, result) => {
  const rules = challenge.rules || {};
  if (!validateBaseChallengeRules(challenge, result)) return false;
  if (!rules.hideAfterSeconds || !result.hasTextFaded || !result.promptHiddenUsed) return false;

  const typedWords = getTypedWordCount(result);
  const requiredWords = typeof rules.wordCount === "number" ? rules.wordCount : typedWords;
  if (typedWords < requiredWords) return false;

  const challengeText = normalizeWhitespace(result.promptText || challenge.prompt);
  const typedText = normalizeWhitespace(result.typedText);
  if (!challengeText || !typedText) return false;

  const wordsMatch = challengeText.split(" ").length === typedText.split(" ").length;
  if (!wordsMatch) return false;

  return true;
};

export const validateChallengeCompletion = (challenge, result) => {
  if (!challenge || !result) return false;

  const family = getChallengeFamily(challenge);
  const validators = {
    endurance: validateEnduranceChallenge,
    control: validateControlChallenge,
    spike: validateSpikeChallenge,
    precision: validatePrecisionChallenge,
    numbers: validateNumbersChallenge,
    memory: validateMemoryChallenge
  };

  const validator = validators[family];
  if (!validator) return false;

  return validator(challenge, result);
};

export const getArenaChallengeProgress = (state, stats = {}) => {
  if (!state?.challenge) return null;
  const rules = state.challenge.rules || {};
  const wordTarget = Number(rules.wordCount || rules.minTypedWords || 0) || 0;
  const charTarget = Number(rules.charTarget || 0) || 0;
  const progress = {
    wpm: Math.max(0, Number(stats.wpm) || 0),
    accuracy: Math.max(0, Number(stats.accuracy) || 0),
    elapsedSeconds: Math.max(0, Number(stats.elapsedSeconds) || 0),
    timeLimitSeconds: rules.timeLimitSeconds || null,
    holdSeconds: Math.max(0, Number(stats.holdSeconds) || 0),
    requiredHoldSeconds: rules.sustainSeconds || null,
    completedWords: Math.max(0, Number(stats.completedWords) || 0),
    typedCharacterCount: Math.max(0, Number(stats.typedCharacterCount) || 0),
    requiredWordCount: wordTarget || null,
    requiredCharTarget: charTarget || null,
    mistakes: Math.max(0, Number(stats.incorrectCharacters) || 0),
    allowedMistakes: rules.allowedMistakes || 0,
    backspaceUsed: Boolean(stats.backspaceUsed),
    promptHidden: Boolean(stats.promptHidden)
  };

  if (rules.timeLimitSeconds) progress.timeProgress = Math.min(1, progress.elapsedSeconds / rules.timeLimitSeconds);
  if (rules.targetWpm || rules.minWpm) progress.wpmProgress = Math.min(1, progress.wpm / (rules.targetWpm || rules.minWpm));
  if (rules.minAccuracy) progress.accuracyProgress = Math.min(1, progress.accuracy / rules.minAccuracy);
  if (rules.sustainSeconds) progress.holdProgress = Math.min(1, progress.holdSeconds / rules.sustainSeconds);
  if (wordTarget) progress.wordProgress = Math.min(1, progress.completedWords / wordTarget);
  if (charTarget) progress.charProgress = Math.min(1, progress.typedCharacterCount / charTarget);

  return progress;
};

export const getChallengeObjectiveStatus = (challenge, result) => validateChallengeCompletion(challenge, result);

export const getArenaModeFamily = (mode) => (mode === TYPING_MODES.CHALLENGE_ARENA ? TYPING_MODES.CHALLENGE_ARENA : mode);