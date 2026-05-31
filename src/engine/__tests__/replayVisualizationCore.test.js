import { describe, expect, it } from "vitest"
import { createReplayVisualizationCore, clusterMarkers, coalesceEvents } from "../replayVisualizationCore"
import shortF from "./fixtures/short.json"
import { makeLongSession } from "./stressFixtures"

describe("replayVisualizationCore", () => {
  it("reconstructs deterministic viewport frames and overlays", () => {
    const core = createReplayVisualizationCore(shortF, { viewport: { start: 0, end: 1200 } })
    const frame = core.getFrame({ start: 0, end: 1000 })

    expect(frame.visibleTimeline.length).toBeGreaterThan(0)
    expect(frame.overlay.ghost.markers.length).toBeGreaterThan(0)
    expect(frame.viewportSummary.eventCount).toBeGreaterThan(0)
    expect(Object.isFrozen(frame)).toBe(true)
  })

  it("coalesces events and clusters markers deterministically", () => {
    const coalesced = coalesceEvents([
      { index: 0, t: 0, type: "input" },
      { index: 1, t: 10, type: "input" },
      { index: 2, t: 20, type: "correction" }
    ])
    const clusters = clusterMarkers([{ idx: 0, t: 0 }, { idx: 1, t: 40 }, { idx: 2, t: 400 }], 100)

    expect(coalesced[0].count).toBe(2)
    expect(clusters.length).toBe(2)
  })

  it("handles large replay windows without mutation", () => {
    const long = makeLongSession(25000)
    const core = createReplayVisualizationCore(long, { viewport: { start: 0, end: 5000 } })
    const snapshot = core.getSnapshot()

    expect(snapshot.visibleEventCount).toBeGreaterThan(0)
    expect(snapshot.densityBuckets.length).toBeGreaterThan(0)
    expect(snapshot.correctionHeatmap.length).toBeGreaterThan(0)
  })
})