import { describe, expect, it } from "vitest"
import { createMultiplayerSimulationContracts } from "../multiplayerSimulationContracts"
import shortF from "./fixtures/short.json"
import burstF from "./fixtures/burst.json"

describe("multiplayerSimulationContracts", () => {
  it("builds spectator-safe aggregate projections and merge boundaries", () => {
    const contracts = createMultiplayerSimulationContracts([shortF, burstF])

    expect(contracts.playerTimelineContracts.length).toBe(2)
    expect(contracts.spectatorSafeAggregateProjection.spectatorSafe).toBe(true)
    expect(contracts.finishOrderValidation.valid).toBe(true)
    expect(contracts.replayMergeBoundary.replayHashes.length).toBe(2)
    expect(Object.isFrozen(contracts)).toBe(true)
  })
})