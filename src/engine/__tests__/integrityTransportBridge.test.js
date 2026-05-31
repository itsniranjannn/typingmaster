import { describe, expect, it } from "vitest"
import { createIntegrityTransportBridge } from "../integrityTransportBridge"
import { createTransportPacket, NETWORK_EVENT_TYPES } from "../transportContracts"

describe("integrityTransportBridge", () => {
  it("verifies checkpoints, replays, and consistency deterministically", () => {
    const replay = {
      id: "p-1",
      events: [{ type: "input", t: 0 }, { type: "input", t: 10 }],
      meta: {}
    }
    const bridge = createIntegrityTransportBridge({ expectedReplayHash: null })
    const checkpoint = bridge.verifyRemoteCheckpoint({ roomId: "room-1", participantId: "p-1", sequence: 3, serverTs: 100, checkpoint: { participantId: "p-1", sequence: 3, ts: 100, checkpointHash: "cp-1" } })
    const replayReport = bridge.verifyRemoteReplay({ ...replay, transportPacket: createTransportPacket({ eventType: NETWORK_EVENT_TYPES.REPLAY_VERIFY, sequence: 4, sourceId: "host", payload: {} }) })
    const consistency = bridge.validateConsistency({ roomId: "room-1", participantId: "p-1", replay, checkpoint: { participantId: "p-1", sequence: 3, ts: 100, checkpointHash: "cp-1" }, previousRecovery: { recoveryHash: "a" }, nextRecovery: { recoveryHash: "b" } })

    expect(checkpoint.valid).toBe(true)
    expect(replayReport.valid).toBe(true)
    expect(consistency.valid).toBe(true)
  })

  it("reports desync when replay or checkpoint verification fails", () => {
    const bridge = createIntegrityTransportBridge({ expectedReplayHash: "forced-mismatch" })
    const report = bridge.reportDesync({ replay: { id: "p-1", events: [{ type: "input", t: 0 }], meta: {} }, checkpoint: { participantId: "p-1", sequence: 1, ts: 100, checkpointHash: "cp-1" } })

    expect(report.valid).toBe(false)
    expect(report.desync.kind).toBe("desync")
  })
})