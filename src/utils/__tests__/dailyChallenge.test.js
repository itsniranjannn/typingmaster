import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildChallengePrompt, completeChallenge, failDailyChallenge, getDailyChallengeAttemptState, getChallengeTemplate, getChallengeTemplates, getDailyChallenge, getDailyChallengeHistoryEntries } from "../dailyChallenge";
import { loadBadges } from "../storage";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("daily challenge helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("creates a stable challenge for the active UTC day", () => {
    const first = getDailyChallenge();
    const second = getDailyChallenge();

    expect(first).toBeTruthy();
    expect(first?.date).toBe("2026-05-24");
    expect(second?.challenge.id).toBe(first?.challenge.id);
  });

  it("exposes at least 30 arena templates", () => {
    expect(getChallengeTemplates().length).toBeGreaterThanOrEqual(30);
  });

  it("gives every challenge template a validator", () => {
    for (const template of getChallengeTemplates()) {
      expect(template.validateCompletion).toBeTypeOf("function");
    }
  });

  it("builds a non-empty, family-appropriate prompt for every template", () => {
    for (const template of getChallengeTemplates()) {
      const prompt = buildChallengePrompt(template, `test-seed:${template.templateId}`);
      expect(prompt).toEqual(expect.any(String));
      expect(prompt.trim().length).toBeGreaterThan(0);

      if (template.promptType === "quote") {
        expect(prompt.split(/\s+/).length).toBeGreaterThanOrEqual(35);
      }

      if (template.promptType === "numbers") {
        expect(/\d/.test(prompt)).toBe(true);
        expect(/[A-Za-z]/.test(prompt)).toBe(true);
      }

      if (template.promptType === "memory") {
        expect(prompt.split(/\s+/).length).toBeGreaterThanOrEqual(40);
      }

      const targetWords = Number(template.rules?.wordCount || template.rules?.minTypedWords || 0) || 0;
      if (targetWords > 0) {
        expect(prompt.split(/\s+/).filter(Boolean).length).toBe(targetWords);
      }
    }
  });

  it("does not complete the challenge when accuracy is below the objective", () => {
    const state = getDailyChallenge();

    const outcome = completeChallenge(
      {
        mode: state.challenge.mode,
        wpm: 10,
        accuracy: 10,
        timeUsed: 10,
        correctCharacters: 0,
        incorrectCharacters: 999,
        backspaceUsed: true,
        holdSeconds: 0,
        maxHoldWpm: 0,
        promptHiddenUsed: false
      },
      Date.now()
    );

    expect(outcome.completed).toBe(false);
    expect(outcome.state?.challengeCompleted).toBe(false);
  });

  it("marks the challenge complete when the result meets the criteria", () => {
    const state = getDailyChallenge();
    const rules = state.challenge.rules || {};
    const targetWpm = Number(rules.targetWpm || rules.minWpm || 35);
    const targetAccuracy = Number(rules.minAccuracy || 92);
    const targetTypedWords = Number(rules.minTypedWords || rules.wordCount || 0);

    const result = {
      mode: state.challenge.mode,
      wpm: targetWpm + 5,
      accuracy: targetAccuracy,
      timeUsed: Math.max(1, Number(rules.timeLimitSeconds || 60) - 1),
      correctCharacters: 500,
      incorrectCharacters: 0,
      backspaceUsed: false,
      completedWords: targetTypedWords,
      typedWordCount: targetTypedWords,
      holdSeconds: Number(rules.sustainSeconds || 0),
      maxHoldWpm: targetWpm + 5,
      promptHiddenUsed: rules.hideAfterSeconds ? true : false
    };

    const outcome = completeChallenge(result, Date.now());

    expect(outcome.completed).toBe(true);
    expect(outcome.state?.challengeCompleted).toBe(true);
    expect(getDailyChallengeHistoryEntries()).toHaveLength(1);
    expect(getDailyChallengeHistoryEntries()[0]?.completed).toBe(true);
  });

  it("rejects no-backspace challenges when backspace was used or typed words are below the target", () => {
    const template = getChallengeTemplates().find((challenge) => challenge.templateId === "control-silver");
    expect(template?.validateCompletion).toBeTypeOf("function");

    const failingResult = {
      mode: template.mode,
      wpm: 55,
      accuracy: 96,
      timeUsed: 62,
      completedWords: 80,
      typedWordCount: 80,
      correctCharacters: 420,
      incorrectCharacters: 0,
      backspaceUsed: true,
      holdSeconds: 0,
      maxHoldWpm: 0,
      promptHiddenUsed: false
    };

    expect(template.validateCompletion(failingResult)).toBe(false);

    const passingResult = {
      ...failingResult,
      backspaceUsed: false,
      typedWordCount: 80,
      completedWords: 80
    };

    expect(template.validateCompletion(passingResult)).toBe(true);
  });

  it("requires the memory test to fade and meet the speed target", () => {
    const template = getChallengeTemplate("memory-silver");
    expect(template?.validateCompletion).toBeTypeOf("function");

    const promptText = "Memory is built from repetition and calm attention.";

    const notFaded = {
      mode: template.mode,
      wpm: 45,
      accuracy: 95,
      timeUsed: 80,
      correctCharacters: 250,
      incorrectCharacters: 0,
      backspaceUsed: false,
      holdSeconds: 0,
      maxHoldWpm: 0,
      promptHiddenUsed: false,
      hasTextFaded: false,
      typedText: promptText,
      promptText,
      typedCharacterCount: promptText.length
    };

    expect(template.validateCompletion(notFaded)).toBe(false);

    const fadedMismatch = {
      ...notFaded,
      hasTextFaded: true,
      promptHiddenUsed: true,
      typedText: "Memory is built from repetition and calm focus.",
      typedCharacterCount: promptText.length,
      typedWordCount: Number(template.rules.wordCount || 45),
      completedWords: Number(template.rules.wordCount || 45)
    };

    expect(template.validateCompletion(fadedMismatch)).toBe(true);

    const passingResult = {
      ...notFaded,
      hasTextFaded: true,
      promptHiddenUsed: true,
      promptText,
      typedText: promptText,
      typedCharacterCount: promptText.length,
      typedWordCount: Number(template.rules.wordCount || 45),
      completedWords: Number(template.rules.wordCount || 45)
    };

    expect(template.validateCompletion(passingResult)).toBe(true);
  });

  it("requires the speed spike hold to be satisfied exactly", () => {
    const template = getChallengeTemplate("spike-silver");
    expect(template?.validateCompletion).toBeTypeOf("function");

    const failingResult = {
      mode: template.mode,
      wpm: 50,
      accuracy: 95,
      timeUsed: 40,
      correctCharacters: 300,
      incorrectCharacters: 0,
      backspaceUsed: false,
      holdSeconds: 2,
      maxHoldWpm: 50,
      promptHiddenUsed: false,
      hasTextFaded: false,
      typedText: "",
      promptText: "",
      typedCharacterCount: 0
    };

    expect(template.validateCompletion(failingResult)).toBe(false);

    const passingResult = {
      ...failingResult,
      holdSeconds: 3,
      maxHoldWpm: 50,
      typedWordCount: Number(template.rules.wordCount || 0),
      completedWords: Number(template.rules.wordCount || 0),
      typedText: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu"
    };

    expect(template.validateCompletion(passingResult)).toBe(true);
  });

  it("enforces character target and accuracy for numbers challenges", () => {
    const template = getChallengeTemplate("numbers-silver");
    expect(template?.validateCompletion).toBeTypeOf("function");

    const failingResult = {
      mode: template.mode,
      wpm: 46,
      accuracy: 94,
      timeUsed: 40,
      correctCharacters: 320,
      incorrectCharacters: 0,
      backspaceUsed: false,
      holdSeconds: 0,
      maxHoldWpm: 0,
      promptHiddenUsed: false,
      hasTextFaded: false,
      typedText: "123 456",
      promptText: "123 456",
      typedCharacterCount: 10
    };

    expect(template.validateCompletion(failingResult)).toBe(false);

    const passingResult = {
      ...failingResult,
      typedCharacterCount: 90
    };

    expect(template.validateCompletion(passingResult)).toBe(true);
  });

  it("enforces word count and accuracy for endurance and precision challenges", () => {
    const endurance = getChallengeTemplate("endurance-silver");
    const precision = getChallengeTemplate("precision-silver");

    const baseResult = {
      mode: endurance.mode,
      wpm: 50,
      accuracy: 95,
      timeUsed: 90,
      correctCharacters: 500,
      incorrectCharacters: 0,
      backspaceUsed: false,
      holdSeconds: 0,
      maxHoldWpm: 0,
      promptHiddenUsed: false,
      hasTextFaded: false,
      typedText: "alpha beta gamma delta epsilon zeta eta theta",
      promptText: "alpha beta gamma delta epsilon zeta eta theta",
      typedCharacterCount: 48,
      typedWordCount: 4,
      completedWords: 4
    };

    expect(endurance.validateCompletion(baseResult)).toBe(false);
    expect(precision.validateCompletion(baseResult)).toBe(false);

    const passingResult = {
      ...baseResult,
      timeUsed: Math.max(1, Number(precision.rules.timeLimitSeconds || 75) - 1),
      typedWordCount: Number(endurance.rules.wordCount || 0),
      completedWords: Number(endurance.rules.wordCount || 0)
    };

    expect(endurance.validateCompletion(passingResult)).toBe(true);
    expect(precision.validateCompletion({ ...passingResult, typedWordCount: Number(precision.rules.wordCount || 0), completedWords: Number(precision.rules.wordCount || 0) })).toBe(true);
  });

  it("avoids repeating the same challenge on the next UTC day", () => {
    const today = getDailyChallenge();
    const todayId = today?.challenge.id;

    vi.setSystemTime(new Date(Date.now() + DAY_MS));
    const nextDay = getDailyChallenge();

    expect(nextDay?.date).toBe("2026-05-25");
    expect(nextDay?.challenge.id).not.toBe(todayId);
  });

  it("avoids repeats across five simulated UTC days", () => {
    const seen = new Set();

    for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
      vi.setSystemTime(new Date(Date.parse("2026-05-24T12:00:00.000Z") + dayIndex * DAY_MS));
      const state = getDailyChallenge();
      expect(seen.has(state?.challenge.id)).toBe(false);
      seen.add(state?.challenge.id);
    }

    expect(seen.size).toBe(5);
  });

  it("awards the challenge badge only once per day", () => {
    const state = getDailyChallenge();
    const rules = state.challenge.rules || {};
    const typedWords = Number(rules.minTypedWords || rules.wordCount || 0);
    const result = {
      mode: state.challenge.mode,
      wpm: Number(rules.minWpm || rules.targetWpm || 35) + 20,
      accuracy: Number(rules.minAccuracy || 90),
      timeUsed: Math.max(1, Number(rules.timeLimitSeconds || 60) - 1),
      correctCharacters: 500,
      incorrectCharacters: 0,
      backspaceUsed: false,
      completedWords: typedWords,
      typedWordCount: typedWords,
      holdSeconds: Number(rules.sustainSeconds || 0),
      maxHoldWpm: Number(rules.minWpm || rules.targetWpm || 35) + 20,
      promptHiddenUsed: rules.hideAfterSeconds ? true : false
    };

    const firstOutcome = completeChallenge(result, Date.now());
    const secondOutcome = completeChallenge(result, Date.now());

    expect(firstOutcome.completed).toBe(true);
    expect(firstOutcome.state?.challengeCompletedToday).toBe(true);
    expect(secondOutcome.alreadyCompleted).toBe(true);
    expect(loadBadges()).toHaveLength(1);
  });

  it("locks the daily challenge after three failed attempts and resets on the next UTC day", () => {
    const state = getDailyChallenge();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const failedState = failDailyChallenge(Date.now() + attempt);
      expect(failedState?.challengeFailed).toBe(true);
    }

    const attempts = getDailyChallengeAttemptState(Date.now());
    expect(attempts.attempts).toBe(3);
    expect(attempts.locked).toBe(true);

    const lockedOutcome = completeChallenge(
      {
        mode: state.challenge.mode,
        wpm: Number(state.challenge.rules?.minWpm || state.challenge.rules?.targetWpm || 35) + 20,
        accuracy: Number(state.challenge.rules?.minAccuracy || 92),
        timeUsed: Math.max(1, Number(state.challenge.rules?.timeLimitSeconds || 60) - 1),
        correctCharacters: 500,
        incorrectCharacters: 0,
        backspaceUsed: false,
        holdSeconds: Number(state.challenge.rules?.sustainSeconds || 0),
        maxHoldWpm: Number(state.challenge.rules?.minWpm || state.challenge.rules?.targetWpm || 35) + 20,
        promptHiddenUsed: state.challenge.rules?.hideAfterSeconds ? true : false,
        hasTextFaded: state.challenge.rules?.hideAfterSeconds ? true : false,
        typedText: state.challenge.prompt,
        promptText: state.challenge.prompt,
        typedCharacterCount: state.challenge.prompt.length
      },
      Date.now()
    );

    expect(lockedOutcome.completed).toBe(false);

    vi.setSystemTime(new Date("2026-05-25T12:00:00.000Z"));
    const nextDayAttempts = getDailyChallengeAttemptState(Date.now());
    expect(nextDayAttempts.attempts).toBe(0);
    expect(nextDayAttempts.locked).toBe(false);
  });
});
