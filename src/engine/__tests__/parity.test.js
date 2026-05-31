import { describe, it, expect } from "vitest";
import short from "./fixtures/short.json";
import corr from "./fixtures/correctionHeavy.json";
import burst from "./fixtures/burst.json";
import arena from "./fixtures/arena.json";

import { computeEngineSnapshot, makeImmutableSessionSnapshot } from "../runtimeSnapshotEngine";
import { selectTypingSurfacePresentation } from "../selectorEngine";
import { projectCompletionSnapshot } from "../resultProjectionEngine";
import { projectSessionSnapshot } from "../sessionProjectionEngine";
import { serializeTypingResult } from "../sessionEngine";
import * as replay from "../replayEngine";
import * as telemetry from "../telemetryEngine";
import { calculateWpm, calculateAccuracy } from "../../utils/typingStats";

const FIXTURES = [short, corr, burst, arena];

describe("Parity validation: runtime snapshot vs legacy exports", () => {
  FIXTURES.forEach((f) => {
    it(`${f.name} parity and immutability`, () => {
      // compute engine snapshot (new engine)
      const engineSnap = computeEngineSnapshot({
        targetWords: f.targetWords,
        paragraph: f.paragraph,
        correctCharacters: f.correctCharacters,
        incorrectCharacters: f.incorrectCharacters,
        completedWords: f.completedWords,
        currentWord: f.currentWord,
        currentWordIndex: f.currentWordIndex,
        currentIndex: f.currentIndex
      });

      // basic parity fields
      expect(engineSnap.correctCharacters).toBe(f.correctCharacters);
      expect(engineSnap.incorrectCharacters).toBe(f.incorrectCharacters);
      expect(engineSnap.completedWords).toBeLessThanOrEqual(f.targetWords.length);
      expect(engineSnap.currentWordIndex).toBe(Math.min(f.currentWordIndex, Math.max(f.targetWords.length - 1, 0)));
      expect(Object.isFrozen(engineSnap)).toBe(true);

      // selector presentation parity
      const wpm = calculateWpm(engineSnap.correctCharacters, Math.max(1, f.timeUsed));
      const acc = calculateAccuracy(engineSnap.correctCharacters, engineSnap.correctCharacters + engineSnap.incorrectCharacters);
      const pres = selectTypingSurfacePresentation(engineSnap, wpm, acc);
      expect(pres.completedWords).toBe(engineSnap.completedWords);
      expect(pres.totalWords).toBe(engineSnap.totalWords);
      expect(pres.wpm).toBe(Number(wpm) || 0);
      expect(pres.accuracy).toBe(Number(acc) || 0);
      expect(Object.isFrozen(pres)).toBe(true);

      // result serialization parity
      const finalWpm = Math.round(wpm);
      const serialized = serializeTypingResult({
        now: 1,
        mode: f.mode,
        wordCount: f.wordCount,
        goalVariant: null,
        timeLimitSeconds: null,
        wpm: finalWpm,
        accuracy: acc,
        correctCharacters: engineSnap.correctCharacters,
        incorrectCharacters: engineSnap.incorrectCharacters,
        completedWords: engineSnap.completedWords,
        typedText: f.typedText,
        promptText: f.paragraph,
        mistypedCharacters: [],
        timeUsed: f.timeUsed,
        previousBest: f.previousBest,
        goalSuccess: true,
        challenge: f.challenge || null,
        typedWordCount: f.typedText ? f.typedText.trim().split(/\s+/).filter(Boolean).length : 0
      });

      expect(serialized.wpm).toBe(finalWpm);
      expect(serialized.correctCharacters).toBe(engineSnap.correctCharacters);
      expect(serialized.completedWords).toBe(engineSnap.completedWords);

      // projections
      const completion = projectCompletionSnapshot({
        mode: serialized.mode,
        wpm: serialized.wpm,
        accuracy: serialized.accuracy,
        completedWords: serialized.completedWords,
        totalWords: engineSnap.totalWords,
        timestamp: serialized.timeUsed || Date.now()
      });

      expect(completion.wpm).toBe(serialized.wpm);
      expect(Object.isFrozen(completion)).toBe(true);

      const sessionProj = projectSessionSnapshot(f.replaySession);
      expect(sessionProj.eventsCount).toBe(Array.isArray(f.replaySession.events) ? f.replaySession.events.length : 0);
      expect(Object.isFrozen(sessionProj)).toBe(true);

      // replay export parity
      const replayExport = replay.exportReplaySession(f.replaySession);
      expect(replayExport.events.length).toBe(sessionProj.eventsCount);

      // telemetry export parity (if telemetry fields present, otherwise basic shape)
      if (f.telemetrySession) {
        const tel = telemetry.exportTelemetrySession(f.telemetrySession);
        expect(tel).toHaveProperty("durationMs");
      }

      // frozen snapshot wrapper
      const imm = makeImmutableSessionSnapshot({ id: serialized.id || 'x', result: serialized });
      expect(Object.isFrozen(imm)).toBe(true);
    });
  });
});
