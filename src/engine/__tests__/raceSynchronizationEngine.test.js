import { describe, expect, it } from "vitest"
import { createRaceSynchronizationEngine } from "../raceSynchronizationEngine"
import { createRaceSyncContract } from "../syncContracts"

describe("raceSynchronizationEngine", () => {
  it("supports snapshot reconciliation and sequence progression", () => {
    const engine = createRaceSynchronizationEngine({ roomId: "room-a" })
    engine.createLocalSync({ revision: 1, state: "WAITING", snapshotHash: "hash-1", participantCount: 2, spectatorCount: 0 }, { participantId: "p-1", serverTs: 1000 })

    const remote = createRaceSyncContract({
      roomId: "room-a",
      participantId: "p-2",
      sequence: 1,
      previousSequence: 0,
      serverTs: 1020,
      snapshotRef: { revision: 2, state: "READY", snapshotHash: "hash-2", participantCount: 2, spectatorCount: 1 },
      checkpoint: { sequence: 1, participantId: "p-2", ts: 1020, wordsCompleted: 3, totalWords: 45 }
    })

    const result = engine.ingestRemoteSync(remote, { revision: 1, state: "WAITING", snapshotHash: "hash-1", participantCount: 2, spectatorCount: 0 })

    expect(result.accepted).toBe(true)
    expect(result.reconciliation.winner).toBe("remote")
    expect(engine.getSnapshot().remoteSequence).toBe(1)
  })

  it("handles reconnect recovery deterministically", () => {
    const engine = createRaceSynchronizationEngine({ roomId: "room-b" })
    for (let i = 0; i < 5; i += 1) {
      const contract = createRaceSyncContract({
        roomId: "room-b",
        participantId: "p-1",
        sequence: i + 1,
        previousSequence: i,
        serverTs: 2000 + i,
        snapshotRef: { revision: i + 1, state: "RUNNING", snapshotHash: `hash-${i + 1}`, participantCount: 4, spectatorCount: 5 },
        checkpoint: { sequence: i + 1, participantId: "p-1", ts: 2000 + i, wordsCompleted: i + 1, totalWords: 100 }
      })
      engine.ingestRemoteSync(contract, { revision: i, state: "RUNNING", snapshotHash: `local-${i}` })
    }

    const recovery = engine.recoverFromReconnect({ fromSequence: 3 })
    expect(recovery.contracts.length).toBeGreaterThanOrEqual(3)
    expect(recovery.fromSequence).toBe(3)
    expect(typeof recovery.recoveryHash).toBe("string")
  })

  it("resolves out-of-order and delayed packets deterministically", () => {
    const engine = createRaceSynchronizationEngine({ roomId: "room-c" })
    const first = createRaceSyncContract({ roomId: "room-c", participantId: "p-1", sequence: 3, previousSequence: 2, serverTs: 3000, snapshotRef: { revision: 3, state: "RUNNING", snapshotHash: "h3" }, checkpoint: {} })
    const delayed = createRaceSyncContract({ roomId: "room-c", participantId: "p-1", sequence: 2, previousSequence: 1, serverTs: 2990, snapshotRef: { revision: 2, state: "RUNNING", snapshotHash: "h2" }, checkpoint: {} })

    const acceptFirst = engine.ingestRemoteSync(first, { revision: 0, state: "WAITING", snapshotHash: "l0" })
    const acceptDelayed = engine.ingestRemoteSync(delayed, { revision: 0, state: "WAITING", snapshotHash: "l0" })

    expect(acceptFirst.accepted).toBe(true)
    expect(acceptDelayed.accepted).toBe(false)
    expect(engine.getSnapshot().remoteSequence).toBe(3)
  })
})