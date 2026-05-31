import { describe, expect, it } from "vitest";
import { playbackFixtures } from "./playbackFixtures";
import { playbackReplaySession, createPlaybackCursor, stepPlaybackCursor, resetPlaybackCursor } from "../replayPlaybackEngine";
import { rebuildPlaybackSnapshots, rebuildSnapshotAtBoundary } from "../snapshotRebuilder";
import { comparePlaybackSnapshots, comparePlaybackProjections, buildPlaybackDivergenceReport, createDeterministicReplayHash } from "../playbackValidationLayer";
import { selectTypingSurfacePresentation } from "../selectorEngine";

describe("replayPlaybackEngine", () => {
  it("reconstructs deterministic final snapshots across representative fixtures", () => {
    playbackFixtures.forEach((fixture) => {
      const first = playbackReplaySession(fixture.replayExport, {
        paragraph: fixture.paragraph,
        targetWords: fixture.targetWords,
        maxCheckpoints: 8,
        telemetrySummary: fixture.telemetryExport
      });
      const second = playbackReplaySession(fixture.replayExport, {
        paragraph: fixture.paragraph,
        targetWords: fixture.targetWords,
        maxCheckpoints: 8,
        telemetrySummary: fixture.telemetryExport
      });

      expect(first.finalSnapshot).toEqual(second.finalSnapshot);
      expect(first.summary.replayHash).toBe(second.summary.replayHash);
      expect(first.summary.eventCount).toBe(fixture.replayExport.events.length);
      expect(Object.isFrozen(first.finalSnapshot)).toBe(true);
      expect(first.checkpoints.length).toBeLessThanOrEqual(8);

      const expectedComparison = comparePlaybackSnapshots(fixture.expectedPlaybackSnapshot, first.finalSnapshot);
      expect(expectedComparison.equal).toBe(true);

      const projectionComparison = comparePlaybackProjections(
        fixture.expectedResult,
        fixture.expectedResult,
        fixture.replayExport,
        fixture.telemetryExport
      );
      expect(projectionComparison.equal).toBe(true);

      const selectorA = selectTypingSurfacePresentation(first.finalSnapshot, fixture.expectedResult.wpm, fixture.expectedResult.accuracy);
      const selectorB = selectTypingSurfacePresentation(fixture.expectedPlaybackSnapshot, fixture.expectedResult.wpm, fixture.expectedResult.accuracy);
      expect(selectorA).toEqual(selectorB);
      expect(Object.isFrozen(selectorA)).toBe(true);
    });
  }, 120000);

  it("supports reset consistency and bounded checkpoint retention", () => {
    const fixture = playbackFixtures.find((entry) => entry.name === "endless");
    const cursor = createPlaybackCursor(fixture.replayExport, {
      paragraph: fixture.paragraph,
      targetWords: fixture.targetWords,
      maxCheckpoints: 4
    });

    const firstStep = stepPlaybackCursor(cursor, 3);
    expect(firstStep.complete).toBe(false);
    expect(cursor.checkpoints.length).toBeLessThanOrEqual(4);

    resetPlaybackCursor(cursor);
    const afterReset = stepPlaybackCursor(cursor, 3);
    expect(afterReset.cursor.index).toBe(firstStep.cursor.index);
    expect(afterReset.cursor.checkpoints.length).toBe(firstStep.cursor.checkpoints.length);

    const stepped = rebuildPlaybackSnapshots(fixture.replayExport, {
      paragraph: fixture.paragraph,
      targetWords: fixture.targetWords,
      maxCheckpoints: 4
    });
    expect(stepped.checkpoints.length).toBeLessThanOrEqual(4);
    expect(Object.isFrozen(stepped.finalSnapshot)).toBe(true);
  });

  it("reconstructs pause and correction flows without divergence", () => {
    const correctionFixture = playbackFixtures.find((entry) => entry.name === "correction-heavy");
    const playback = playbackReplaySession(correctionFixture.replayExport, {
      paragraph: correctionFixture.paragraph,
      targetWords: correctionFixture.targetWords,
      maxCheckpoints: 16,
      telemetrySummary: correctionFixture.telemetryExport
    });

    expect(playback.finalSnapshot.pauseCount).toBeGreaterThanOrEqual(1);
    expect(playback.finalSnapshot.incorrectCharacters).toBe(0);
    expect(playback.finalSnapshot.correctCharacters).toBe(correctionFixture.expectedPlaybackSnapshot.correctCharacters);

    const checkpoint = playback.checkpoints[playback.checkpoints.length - 1] || null;
    const report = buildPlaybackDivergenceReport({
      replayExport: correctionFixture.replayExport,
      checkpoint,
      expectedSnapshot: correctionFixture.expectedPlaybackSnapshot,
      actualSnapshot: playback.finalSnapshot,
      replaySummary: playback.summary,
      telemetrySummary: correctionFixture.telemetryExport
    });

    expect(report.divergenceDetected).toBe(false);
    expect(report.replayHash).toBe(createDeterministicReplayHash(correctionFixture.replayExport));
    expect(report.firstInvalidSnapshotBoundary).toBeNull();
  }, 120000);

  it("reports the first invalid snapshot boundary when playback diverges", () => {
    const fixture = playbackFixtures.find((entry) => entry.name === "short");
    const playback = playbackReplaySession(fixture.replayExport, {
      paragraph: fixture.paragraph,
      targetWords: fixture.targetWords,
      maxCheckpoints: 8
    });

    const mutatedExpected = {
      ...fixture.expectedPlaybackSnapshot,
      currentIndex: fixture.expectedPlaybackSnapshot.currentIndex + 1
    };

    const checkpoint = playback.checkpoints[playback.checkpoints.length - 1] || null;
    const report = buildPlaybackDivergenceReport({
      replayExport: fixture.replayExport,
      checkpoint,
      expectedSnapshot: mutatedExpected,
      actualSnapshot: playback.finalSnapshot,
      replaySummary: playback.summary,
      telemetrySummary: fixture.telemetryExport
    });

    expect(report.divergenceDetected).toBe(true);
    expect(report.firstInvalidSnapshotBoundary).toBeTruthy();
    expect(report.firstInvalidSnapshotBoundary.difference.path).toBe("currentIndex");
  });

  it("keeps commit-boundary snapshots consistent across repeated boundary reconstruction", () => {
    const fixture = playbackFixtures.find((entry) => entry.name === "long");
    const rebuilt = rebuildPlaybackSnapshots(fixture.replayExport, {
      paragraph: fixture.paragraph,
      targetWords: fixture.targetWords,
      maxCheckpoints: 12
    });

    rebuilt.checkpoints.forEach((checkpoint) => {
      const boundary = rebuildSnapshotAtBoundary(fixture.replayExport, checkpoint.eventIndex, {
        paragraph: fixture.paragraph,
        targetWords: fixture.targetWords,
        maxCheckpoints: 12
      });
      const boundarySnapshot = boundary.finalSnapshot;
      const comparison = comparePlaybackSnapshots(checkpoint.snapshot, boundarySnapshot);
      expect(comparison.equal).toBe(true);
      expect(Object.isFrozen(boundarySnapshot)).toBe(true);
    });
  }, 120000);
});
