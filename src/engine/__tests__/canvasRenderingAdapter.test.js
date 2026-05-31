import { describe, expect, it } from "vitest"
import { createCanvasRenderingAdapter } from "../canvasRenderingAdapter"
import { createReplayRenderingRuntime } from "../replayRenderingRuntime"
import shortF from "./fixtures/short.json"

describe("canvasRenderingAdapter", () => {
  it("projects deterministic draw ordering and clipping contracts", () => {
    const runtime = createReplayRenderingRuntime(shortF)
    const frame = runtime.renderFrame({ start: 0, end: 1200 })
    const adapter = createCanvasRenderingAdapter({ offscreenSupported: true, webglCompatible: true })
    const projection = adapter.createCanvasRenderer(frame, { start: 0, end: 1200 })

    expect(projection.deterministicDrawOrdering.length).toBeGreaterThan(0)
    expect(projection.viewportClipping.clipRect.start).toBe(0)
    expect(adapter.getAdapterContracts().webglCompatible).toBe(true)
    expect(Object.isFrozen(projection)).toBe(true)
  })
})