import { describe, expect, it } from "vitest"
import { createDeterministicSpectatorSimulation, createRemoteSpectatorPacket } from "../spectatorSimulationLayer"
import shortF from "./fixtures/short.json"

describe("spectatorSimulationLayer", () => {
  it("validates replay hashes and produces immutable spectator projections", () => {
    const sim = createDeterministicSpectatorSimulation(shortF)
    const packet = createRemoteSpectatorPacket({ sequence: 0, replayHash: sim.getReplayHash(), viewport: { start: 0, end: 1200 } })
    const projection = sim.ingestPacket(packet)

    expect(projection.predictionEnabled).toBe(false)
    expect(projection.desync.severity).toBe(0)
    expect(Object.isFrozen(projection)).toBe(true)
  })

  it("classifies hash mismatches as desyncs", () => {
    const sim = createDeterministicSpectatorSimulation(shortF)
    const packet = createRemoteSpectatorPacket({ sequence: 2, replayHash: "bad-hash", viewport: { start: 0, end: 300 } })
    const classification = sim.classifyDesync(packet)

    expect(classification.kind).toBe("hash-mismatch")
    expect(classification.severity).toBe(5)
  })
})