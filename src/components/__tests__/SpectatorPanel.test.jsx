import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SpectatorPanel from "../SpectatorPanel";
import { makeHugeSession } from "../../engine/__tests__/stressFixtures";


const buildReplaySummary = (id, eventCount = 800) => {
  const generated = makeHugeSession(eventCount);
  return {
    id,
    events: generated.events.map((event, index) => ({
      type: event.type,
      t: event.t,
      payload: { ...(event.payload || {}), idx: index }
    })),
    metrics: { eventCount },
    flushedBatches: eventCount > 2000 ? [{ count: eventCount - 2000, firstTs: 0, lastTs: 12000 }] : []
  };
};

describe("SpectatorPanel", () => {
  it("renders spectator controls and sync status in observational mode", () => {
    const replay = buildReplaySummary("primary", 1200);
    const ghosts = [buildReplaySummary("ghost-1", 900), buildReplaySummary("ghost-2", 700)];

    render(<SpectatorPanel replaySummary={replay} ghostReplays={ghosts} isDark={true} />);

    expect(screen.getByText(/Live Spectator Runtime/i)).toBeTruthy();
    expect(screen.getByLabelText("Spectator viewport start")).toBeTruthy();
    expect(screen.getByLabelText("Spectator viewport width")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ghost comparison/i })).toBeTruthy();
    expect(screen.getByRole("list", { name: /Spectator packet history/i })).toBeTruthy();
    expect(screen.getByRole("list", { name: /Spectator ghost lanes/i })).toBeTruthy();
  }, 60000);

  it("supports multi-ghost rendering and comparison deltas", () => {
    const replay = buildReplaySummary("primary", 1500);
    const ghosts = [buildReplaySummary("ghost-a", 1250), buildReplaySummary("ghost-b", 1100), buildReplaySummary("ghost-c", 970)];

    render(<SpectatorPanel replaySummary={replay} ghostReplays={ghosts} isDark={false} />);

    fireEvent.click(screen.getByRole("button", { name: /Ghost comparison/i }));
    expect(screen.getByText(/Ghost comparison mode/i)).toBeTruthy();
    expect(screen.getByLabelText("Comparison ghost selector")).toBeTruthy();
    expect(screen.getByText(/Timeline delta/i)).toBeTruthy();
  }, 60000);

  it("keeps lane and event virtualization bounded", () => {
    const replay = buildReplaySummary("primary", 4000);
    const ghosts = Array.from({ length: 12 }, (_, index) => buildReplaySummary(`ghost-${index}`, 1000 + index * 150));

    render(<SpectatorPanel replaySummary={replay} ghostReplays={ghosts} isDark={true} />);

    const lanes = screen.getByRole("list", { name: /Spectator ghost lanes/i }).querySelectorAll('[role="listitem"]');
    expect(lanes.length).toBeLessThanOrEqual(4);
    expect(screen.getByText(/Lane virtualization active/i)).toBeTruthy();

    const primaryEvents = screen.getByRole("list", { name: /Primary spectator events/i }).querySelectorAll('[role="listitem"]');
    expect(primaryEvents.length).toBeLessThanOrEqual(40);
  }, 30000);

  it("shows desync visualization indicators when simulation is enabled", () => {
    const replay = buildReplaySummary("primary", 1300);
    const ghosts = [buildReplaySummary("ghost-1", 1000), buildReplaySummary("ghost-2", 1000)];

    render(<SpectatorPanel replaySummary={replay} ghostReplays={ghosts} isDark={true} />);

    fireEvent.click(screen.getByRole("button", { name: /Desync simulation off/i }));
    expect(screen.getByRole("button", { name: /Desync simulation on/i })).toBeTruthy();
    expect(screen.getByText(/Severe desync/i)).toBeTruthy();
  }, 60000);

  it("keeps deterministic parity-sensitive labels stable across rerender", () => {
    const replay = buildReplaySummary("primary", 1800);
    const ghosts = [buildReplaySummary("ghost-1", 1000), buildReplaySummary("ghost-2", 990)];

    const { rerender } = render(<SpectatorPanel replaySummary={replay} ghostReplays={ghosts} isDark={true} />);
    const firstLabel = screen.getByText(/Replay-safe boundary/i).textContent;
    rerender(<SpectatorPanel replaySummary={replay} ghostReplays={ghosts} isDark={true} />);
    const secondLabel = screen.getByText(/Replay-safe boundary/i).textContent;

    expect(firstLabel).toBe(secondLabel);
  });
  it("handles 50k stress sessions with bounded UI output", () => {
    const replay = buildReplaySummary("primary", 50000);
    const ghosts = [];

    render(<SpectatorPanel replaySummary={replay} ghostReplays={ghosts} isDark={false} />);

    expect(screen.getByText(/Live Spectator Runtime/i)).toBeTruthy();
    expect(screen.getByText(/Bounded replay buffering UI/i)).toBeTruthy();
    const packetItems = screen.getByRole("list", { name: /Spectator packet history/i }).querySelectorAll('[role="listitem"]');
    expect(packetItems.length).toBeLessThanOrEqual(18);
  }, 3600000);
});