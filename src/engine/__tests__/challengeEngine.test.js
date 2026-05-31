import { describe, expect, it } from "vitest";
import { getChallengeObjectiveStatus, validateChallengeCompletion } from "../challengeEngine";

describe("challengeEngine parity", () => {
  it("enforces no-backspace control rule", () => {
    const challenge = {
      family: "control",
      rules: {
        noBackspace: true,
        wordCount: 45,
        minTypedWords: 45,
        minAccuracy: 94
      }
    };

    const failing = {
      wpm: 55,
      accuracy: 96,
      timeUsed: 60,
      incorrectCharacters: 0,
      typedWordCount: 45,
      backspaceUsed: true
    };

    const passing = {
      ...failing,
      backspaceUsed: false
    };

    expect(validateChallengeCompletion(challenge, failing)).toBe(false);
    expect(validateChallengeCompletion(challenge, passing)).toBe(true);
  });

  it("validates memory challenge fade and prompt usage", () => {
    const prompt = "alpha beta gamma delta epsilon";
    const challenge = {
      family: "memory",
      prompt,
      rules: {
        hideAfterSeconds: 3,
        wordCount: 5,
        minWpm: 35,
        minAccuracy: 90
      }
    };

    const noFade = {
      wpm: 40,
      accuracy: 95,
      timeUsed: 25,
      incorrectCharacters: 0,
      typedWordCount: 5,
      hasTextFaded: false,
      promptHiddenUsed: false,
      typedText: prompt,
      promptText: prompt
    };

    const faded = {
      ...noFade,
      hasTextFaded: true,
      promptHiddenUsed: true
    };

    expect(validateChallengeCompletion(challenge, noFade)).toBe(false);
    expect(validateChallengeCompletion(challenge, faded)).toBe(true);
  });

  it("challenge objective status matches completion classifier", () => {
    const challenge = {
      family: "spike",
      rules: {
        targetWpm: 45,
        sustainSeconds: 3,
        minAccuracy: 92
      }
    };

    const result = {
      wpm: 48,
      accuracy: 95,
      timeUsed: 40,
      incorrectCharacters: 0,
      holdSeconds: 3,
      maxHoldWpm: 50,
      backspaceUsed: false
    };

    expect(getChallengeObjectiveStatus(challenge, result)).toBe(validateChallengeCompletion(challenge, result));
  });
});
