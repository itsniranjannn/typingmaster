import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReplayVisualizationPanel from "../ReplayVisualizationPanel";
import * as replayEngine from "../../engine/replayEngine";

const buildReplaySummary = (eventCount = 18) => {
  const session = replayEngine.createSession({ mode: "time" }, { maxEvents: 64 });
  replayEngine.markStart(session, 0);
  for (let index = 0; index < eventCount; index += 1) {
    replayEngine.recordKey(session, {
      key: String.fromCharCode(97 + (index % 26)),
      correct: index % 5 !== 0,
      wordIndex: Math.floor(index / 5),
      charIndex: index,
      ts: index * 120
    });
    if (index % 7 === 0) {
      replayEngine.recordRenderMarker(session, "checkpoint", index * 120);
    }
  }
  replayEngine.markEnd(session, eventCount * 120);
  return replayEngine.exportReplaySession(session);
};

describe("ReplayVisualizationPanel", () => {
  it("renders replay controls and virtualized timeline data", () => {
    const replaySummary = buildReplaySummary(24);
    const comparisonReplaySummary = buildReplaySummary(12);

    render(
      <ReplayVisualizationPanel
        replaySummary={replaySummary}
        comparisonReplaySummary={comparisonReplaySummary}
        isDark={true}
      />
    );

    expect(screen.getByText("Replay Visualization Runtime")).toBeTruthy();
    expect(screen.getByRole("button", { name: /play/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /comparison/i })).toBeTruthy();
    expect(screen.getByLabelText("Replay viewport scrubber")).toBeTruthy();
    expect(screen.getByText(/deterministic draw commands/i)).toBeTruthy();
    expect(screen.getByText("Replay Comparison")).toBeTruthy();
    expect(screen.getByRole("list", { name: /comparison replay events/i })).toBeTruthy();
  });

  it("bounds visible timeline rendering for larger replay exports", () => {
    const replaySummary = buildReplaySummary(1200);

    render(<ReplayVisualizationPanel replaySummary={replaySummary} isDark={false} />);

    const visibleEvents = screen.getByRole("list", { name: /visible replay events/i });
    expect(visibleEvents.querySelectorAll('[role="listitem"]').length).toBeLessThanOrEqual(64);
  });
});