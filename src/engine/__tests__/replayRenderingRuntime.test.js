import { describe, expect, it } from "vitest"
import { createReplayRenderingRuntime } from "../replayRenderingRuntime"
import shortF from "./fixtures/short.json"
import { makeLongSession } from "./stressFixtures"

describe("replayRenderingRuntime", () => {
  it("generates deterministic render frames and scene graphs", () => {
    const runtime = createReplayRenderingRuntime(shortF, { maxFrameCache: 4 })
    const frame = runtime.renderFrame({ start: 0, end: 1200 })

    expect(frame.renderTree.sceneGraph.layers.length).toBeGreaterThan(0)
    expect(frame.renderTree.renderCommands.length).toBeGreaterThan(0)
    expect(frame.invalidated).toBe(true)
    expect(Object.isFrozen(frame.renderTree)).toBe(true)
  })

  it("keeps cache bounded under heavy replay input", { timeout: 15000 }, () => {
    const runtime = createReplayRenderingRuntime(makeLongSession(50000), { maxFrameCache: 3 })
    runtime.renderFrame({ start: 0, end: 2000 })
    runtime.renderFrame({ start: 2000, end: 4000 })
    runtime.renderFrame({ start: 4000, end: 6000 })
    runtime.renderFrame({ start: 6000, end: 8000 })

    expect(runtime.getCacheMetrics().cacheSize).toBeLessThanOrEqual(3)
  })
})