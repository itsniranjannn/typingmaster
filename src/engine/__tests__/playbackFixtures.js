import * as replayEngine from "../replayEngine";
import * as telemetryEngine from "../telemetryEngine";
import { calculateAccuracy, calculateWpm } from "../../utils/typingStats";
import { serializeTypingResult } from "../sessionEngine";
import { projectCompletionSnapshot } from "../resultProjectionEngine";
import { computeEngineSnapshot } from "../runtimeSnapshotEngine";

const buildReplayFromText = ({ name, mode, paragraph, startTs = 1000, stepMs = 45, pauseAt = [], pauseMs = 2400, typos = {}, challenge = null, wordCount = null, goalVariant = null, timeLimitSeconds = null, previousBest = 0, timeUsedSeconds = 30, telemetryLatency = 12 }) => {
  const session = replayEngine.createSession({ mode, name, challengeId: challenge?.id || null }, { maxEvents: 1024 });
  replayEngine.markStart(session, startTs);

  const chars = Array.from(paragraph);
  let ts = startTs;
  let wordIndex = 0;
  let typedCharIndex = 0;

  chars.forEach((char, index) => {
    if (pauseAt.includes(index)) {
      ts += pauseMs;
    }

    const typo = typos[index];
    if (typo) {
      ts += stepMs;
      replayEngine.recordKey(session, { key: typo, correct: false, wordIndex, charIndex: typedCharIndex, backspace: false, ts });
      ts += stepMs;
      replayEngine.recordKey(session, { key: typo, correct: false, wordIndex, charIndex: typedCharIndex, backspace: true, ts });
    }

    ts += stepMs;
    const isCorrect = typo ? true : true;
    replayEngine.recordKey(session, { key: char, correct: isCorrect, wordIndex, charIndex: typedCharIndex, backspace: false, ts });
    typedCharIndex += 1;

    if (char === " ") {
      wordIndex += 1;
    }
  });

  replayEngine.markEnd(session, ts + stepMs);

  const replayExport = replayEngine.exportReplaySession(session);
  const targetWords = paragraph.trim().split(/\s+/).filter(Boolean);
  const snapshot = computeEngineSnapshot({
    targetWords,
    paragraph,
    correctCharacters: paragraph.length,
    incorrectCharacters: 0,
    completedWords: Math.max(0, targetWords.length - 1),
    currentWord: targetWords[targetWords.length - 1] || "",
    currentWordIndex: Math.max(0, targetWords.length - 1),
    currentIndex: paragraph.length
  });

  const finalWpm = Math.round(calculateWpm(snapshot.correctCharacters, Math.max(1, timeUsedSeconds)));
  const accuracy = calculateAccuracy(snapshot.correctCharacters, Math.max(1, snapshot.correctCharacters + snapshot.incorrectCharacters));
  const result = serializeTypingResult({
    now: startTs + (timeUsedSeconds * 1000),
    mode,
    wordCount,
    goalVariant,
    timeLimitSeconds,
    wpm: finalWpm,
    accuracy,
    correctCharacters: snapshot.correctCharacters,
    incorrectCharacters: snapshot.incorrectCharacters,
    completedWords: snapshot.completedWords,
    typedText: paragraph,
    promptText: paragraph,
    mistypedCharacters: [],
    timeUsed: timeUsedSeconds,
    previousBest,
    goalSuccess: true,
    challenge,
    typedWordCount: targetWords.length
  });
  result.totalWords = targetWords.length;
  result.timestamp = startTs + (timeUsedSeconds * 1000);

  const completionProjection = projectCompletionSnapshot({
    ...result,
    totalWords: targetWords.length,
    timestamp: startTs + (timeUsedSeconds * 1000)
  });

  const expectedPlaybackSnapshot = Object.freeze({
    ...snapshot,
    currentIndex: paragraph.length,
    typedText: paragraph,
    eventCount: replayExport.metrics.eventCount,
    pauseCount: replayExport.metrics.pauseCount,
    lastEventType: "end",
    startTs: replayExport.metrics.startTs,
    endTs: replayExport.metrics.endTs,
    lastMarker: null
  });

  const telemetrySession = telemetryEngine.createTelemetrySession({ enabled: true, maxSamples: 16 });
  telemetryEngine.markSessionStart(telemetrySession, startTs);
  telemetryEngine.recordInputLatency(telemetrySession, telemetryLatency, startTs + telemetryLatency);
  telemetryEngine.recordCommit(telemetrySession, { ts: startTs + Math.floor((timeUsedSeconds * 1000) / 2), replayBufferSize: replayExport.events.length });
  telemetryEngine.recordRenderMarker(telemetrySession, `${name}-checkpoint`, { ts: startTs + Math.floor((timeUsedSeconds * 1000) / 2), durationMs: 2 });
  telemetryEngine.markSessionEnd(telemetrySession, startTs + (timeUsedSeconds * 1000));

  return {
    name,
    mode,
    paragraph,
    targetWords,
    replayExport,
    telemetryExport: telemetryEngine.exportTelemetrySession(telemetrySession),
    expectedSnapshot: snapshot,
    expectedPlaybackSnapshot,
    expectedResult: result,
    expectedProjection: completionProjection,
    challenge,
    wordCount,
    goalVariant,
    timeLimitSeconds,
    previousBest,
    timeUsedSeconds
  };
};

export const playbackFixtures = [
  buildReplayFromText({
    name: "short",
    mode: "words",
    paragraph: "the quick brown fox",
    wordCount: 4,
    previousBest: 51,
    timeUsedSeconds: 12
  }),
  buildReplayFromText({
    name: "long",
    mode: "time",
    paragraph: "deterministic playback reconstructs repeated event streams without drifting across boundaries",
    wordCount: 11,
    pauseAt: [5, 12, 18],
    previousBest: 68,
    timeUsedSeconds: 36
  }),
  buildReplayFromText({
    name: "correction-heavy",
    mode: "words",
    paragraph: "correction heavy sessions require careful backspace reconstruction under repeated validation",
    wordCount: 10,
    pauseAt: [6],
    typos: { 2: "z", 18: "q", 43: "x" },
    previousBest: 72,
    timeUsedSeconds: 41
  }),
  buildReplayFromText({
    name: "burst-speed",
    mode: "time",
    paragraph: "fast typists sustain bursts by maintaining rhythm and clean character flow",
    wordCount: 11,
    previousBest: 145,
    timeUsedSeconds: 16
  }),
  buildReplayFromText({
    name: "arena",
    mode: "challenge_arena",
    paragraph: "arena qualification requires precision control and steady completion under pressure",
    wordCount: 10,
    challenge: {
      id: "arena-qualification",
      title: "Arena Qualification",
      reward: "Arena Badge",
      badgeId: "arena-qualification",
      badgeName: "Arena Qualification",
      badgeIconName: "Trophy",
      family: "control",
      rules: { targetWpm: 62, minAccuracy: 95, noBackspace: true }
    },
    previousBest: 84,
    timeUsedSeconds: 27
  }),
  buildReplayFromText({
    name: "endless",
    mode: "time",
    paragraph: "endless sessions keep flow steady and deterministic across long spans while preserving every checkpoint boundary endless sessions keep flow steady and deterministic across long spans while preserving every checkpoint boundary",
    wordCount: 28,
    pauseAt: [10, 35, 52, 88, 120],
    previousBest: 101,
    timeUsedSeconds: 90
  }),
  buildReplayFromText({
    name: "memory",
    mode: "challenge_arena",
    paragraph: "memory challenge sessions depend on accurate recall after a brief delay and a clean final submission",
    wordCount: 15,
    pauseAt: [4, 9],
    typos: { 7: "m", 26: "p" },
    challenge: {
      id: "memory-silver",
      title: "Memory Silver",
      reward: "Memory Silver",
      badgeId: "memory-silver",
      badgeName: "Memory Silver",
      badgeIconName: "Brain",
      family: "memory",
      rules: { hideAfterSeconds: 3, minWpm: 45, minAccuracy: 95 }
    },
    previousBest: 69,
    timeUsedSeconds: 55
  })
];
