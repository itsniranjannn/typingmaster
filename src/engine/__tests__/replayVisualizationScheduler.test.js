import { describe, expect, it } from "vitest"
import { createReplayVisualizationScheduler } from "../replayVisualizationScheduler"
import burstF from "./fixtures/burst.json"

describe("replayVisualizationScheduler", () => {
  it("schedules viewport-priority updates with deterministic ordering", () => {
    const scheduler = createReplayVisualizationScheduler(burstF, { frameBudgetMs: 6 })
    const plan = scheduler.queueViewport({ start: 0, end: 800 }, 0)

    expect(plan.deterministicRenderOrder[0]).toBe("viewport")
    expect(plan.schedule.executed.length).toBe(3)
    expect(plan.adaptiveDensityScale).toBeGreaterThan(0)
  })
})