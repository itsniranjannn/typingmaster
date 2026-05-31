import { describe, expect, it } from "vitest"
import { createReplayRenderOrchestrator } from "../replayRenderOrchestrator"
import shortF from "./fixtures/short.json"

describe("replayRenderOrchestrator", () => {
  it("produces deterministic render, sync, and performance snapshots", () => {
    const orchestrator = createReplayRenderOrchestrator({ frameBudgetMs: 8, maxEvents: 128 })

    const ingested = orchestrator.ingest({ seq: 0, events: shortF.events })
    const rendered = orchestrator.render({ start: 0, end: 2000 })
    const snapshot = orchestrator.getSnapshot()

    expect(ingested.render.frame.frame.timeline.length).toBeGreaterThan(0)
    expect(rendered.sync.capabilities.spectatorSafe).toBe(true)
    expect(snapshot.performance.frameCount).toBeGreaterThan(0)
    expect(snapshot.state.phase).toBe("synced")
    expect(orchestrator.validateSync().valid).toBe(true)
    expect(Object.isFrozen(rendered)).toBe(true)
  })
})