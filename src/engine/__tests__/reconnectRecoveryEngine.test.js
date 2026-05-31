import { describe, expect, it } from "vitest"
import { createReconnectRecoveryEngine } from "../reconnectRecoveryEngine"

describe("reconnectRecoveryEngine", () => {
  it("reconstructs replay windows, checkpoints, and tokens with bounded memory", () => {
    const engine = createReconnectRecoveryEngine({ maxSnapshots: 4, maxEvents: 6, maxCheckpoints: 4, replayWindowSize: 3 })

    for (let index = 0; index < 8; index += 1) {
      engine.registerSnapshot({ revision: index, sequence: index, snapshotHash: `snapshot-${index}`, state: "RUNNING", serverTs: 100 + index })
      engine.registerEvent({ sequence: index, serverTs: 200 + index, type: "RACE_PROGRESS", participantId: `p-${index % 2}` })
      engine.registerCheckpoint({ sequence: index, participantId: `p-${index % 2}`, ts: 300 + index, checkpointHash: `checkpoint-${index}` })
    }

    const token = engine.issueReconnectToken({ roomId: "room-1", participantId: "p-1", sequence: 6, snapshotHash: "snapshot-6", issuedAt: 999 })
    const recovery = engine.recover({ roomId: "room-1", participantId: "p-1", token: token.token, fromSequence: 6 })

    expect(recovery.replayWindow.length).toBeLessThanOrEqual(3)
    expect(recovery.checkpointWindow.length).toBeLessThanOrEqual(3)
    expect(engine.getSnapshot().snapshots.length).toBeLessThanOrEqual(4)
    expect(Object.isFrozen(recovery)).toBe(true)
  })
})