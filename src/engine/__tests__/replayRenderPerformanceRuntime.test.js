import { describe, expect, it } from "vitest"
import { createReplayRenderingRuntime } from "../replayRenderingRuntime"
import { createReplayRenderPerformanceRuntime } from "../replayRenderPerformanceRuntime"
import shortF from "./fixtures/short.json"

describe("replayRenderPerformanceRuntime", () => {
  it("collects deterministic render queue and invalidation metrics", () => {
    const renderingRuntime = createReplayRenderingRuntime(shortF)
    const performanceRuntime = createReplayRenderPerformanceRuntime(renderingRuntime, { frameBudgetMs: 8 })
    const result = performanceRuntime.recordRender({ start: 0, end: 1200 })

    expect(result.sample.commandCount).toBeGreaterThan(0)
    expect(performanceRuntime.getMetrics().sampleCount).toBe(1)
    expect(performanceRuntime.getMetrics().renderInvalidationCounts).toBeGreaterThanOrEqual(0)
  })
})