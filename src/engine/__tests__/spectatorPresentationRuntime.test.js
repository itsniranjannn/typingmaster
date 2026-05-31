import { describe, expect, it } from "vitest"
import { createSpectatorPresentationRuntime } from "../spectatorPresentationRuntime"
import shortF from "./fixtures/short.json"
import burstF from "./fixtures/burst.json"

describe("spectatorPresentationRuntime", () => {
  it("builds synchronized multi-ghost spectator presentations", () => {
    const runtime = createSpectatorPresentationRuntime([shortF, burstF])
    const presentation = runtime.render({ start: 0, end: 1200 })

    expect(presentation.synchronizedGhostPlayback.length).toBe(2)
    expect(presentation.spectatorSafeRankingOverlays.playerCount).toBe(2)
    expect(presentation.deterministicSpectatorSummary.playerCount).toBe(2)
    expect(Object.isFrozen(presentation)).toBe(true)
  })
})