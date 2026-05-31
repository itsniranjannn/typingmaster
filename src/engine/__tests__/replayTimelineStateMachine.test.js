import { describe, expect, it } from "vitest"
import { createReplayTimelineStateMachine, REPLAY_TIMELINE_PHASES } from "../replayTimelineStateMachine"

describe("replayTimelineStateMachine", () => {
  it("tracks deterministic render and sync phases", () => {
    const machine = createReplayTimelineStateMachine()

    expect(machine.snapshot().phase).toBe(REPLAY_TIMELINE_PHASES.IDLE)
    expect(machine.transition({ type: "attach", spectatorCount: 1 }).phase).toBe(REPLAY_TIMELINE_PHASES.BUFFERING)
    expect(machine.transition({ type: "ingest", replayHash: "hash-1", timelineLength: 3 }).phase).toBe(REPLAY_TIMELINE_PHASES.READY)
    expect(machine.transition({ type: "render", viewport: { start: 0, end: 10 }, cursor: 3, frameHash: "frame-1" }).phase).toBe(REPLAY_TIMELINE_PHASES.RENDERING)
    expect(machine.transition({ type: "sync", viewport: { start: 0, end: 10 }, cursor: 3 }).phase).toBe(REPLAY_TIMELINE_PHASES.SYNCED)
    expect(machine.transition({ type: "complete" }).phase).toBe(REPLAY_TIMELINE_PHASES.ENDED)
  })
})