import { describe, expect, it } from "vitest"
import { createMultiplayerIntegrityLayer } from "../multiplayerIntegrityLayer"

const replay = {
  id: "p1",
  events: [
    { type: "input", t: 0 },
    { type: "input", t: 10 },
    { type: "marker", t: 12, payload: { label: "cp" } }
  ],
  meta: {}
}

describe("multiplayerIntegrityLayer", () => {
  it("verifies participant and consistency reports", () => {
    const layer = createMultiplayerIntegrityLayer()
    const participant = layer.verifyParticipant(replay)
    const consistency = layer.verifyReplayConsistency([replay, { ...replay, id: "p2" }])

    expect(participant.valid).toBe(true)
    expect(consistency.valid).toBe(true)
    expect(typeof consistency.consistencyHash).toBe("string")
  })

  it("validates checkpoints and reconnect contracts", () => {
    const layer = createMultiplayerIntegrityLayer()
    const checkpoint = layer.validateCheckpoint({ checkpointHash: "abc" }, { checkpointHash: "def" })
    const reconnect = layer.verifyReconnect({ recoveryHash: "x" }, { recoveryHash: "y" })

    expect(checkpoint.valid).toBe(false)
    expect(checkpoint.desync.kind).toBe("checkpoint-mismatch")
    expect(reconnect.valid).toBe(true)
  })
})