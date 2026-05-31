import { describe, expect, it } from "vitest"
import { createRaceRoomManager } from "../raceRoomManager"
import { createRaceSynchronizationEngine } from "../raceSynchronizationEngine"
import { createRaceSyncContract } from "../syncContracts"

function buildSnapshot(revision, participantCount, spectatorCount) {
  return {
    revision,
    state: "RUNNING",
    participantCount,
    spectatorCount,
    snapshotHash: `snapshot-${revision}-${participantCount}-${spectatorCount}`
  }
}

describe("multiplayerRaceStress", () => {
  it("supports 10 players, 50 players, and 100 spectators with bounded snapshots", () => {
    const manager = createRaceRoomManager({ roomTtlMs: 60000, maxRooms: 8 })
    const room = manager.createRoom({ id: "stress-room", createdAt: 0, maxParticipants: 50, maxSpectators: 100 })

    for (let i = 0; i < 50; i += 1) {
      manager.joinRoom(room.room.id, { id: `p-${i}`, displayName: `P${i}` }, 100 + i)
    }
    for (let i = 0; i < 100; i += 1) {
      manager.admitSpectator(room.room.id, { id: `s-${i}` }, 1000 + i)
    }

    const snapshot = manager.getRoomSnapshot(room.room.id)
    expect(snapshot.participants.length).toBe(50)
    expect(snapshot.spectators.length).toBe(100)

    const engine = createRaceSynchronizationEngine({ roomId: room.room.id, maxSnapshots: 32, maxContracts: 64, maxCheckpoints: 64 })
    for (let seq = 1; seq <= 80; seq += 1) {
      const contract = createRaceSyncContract({
        roomId: room.room.id,
        participantId: `p-${seq % 10}`,
        sequence: seq,
        previousSequence: seq - 1,
        serverTs: 5000 + seq,
        snapshotRef: buildSnapshot(seq, 50, 100),
        checkpoint: { sequence: seq, participantId: `p-${seq % 10}`, ts: 5000 + seq, wordsCompleted: seq, totalWords: 250 }
      })
      engine.ingestRemoteSync(contract, buildSnapshot(seq - 1, 50, 100))
    }

    const syncSnapshot = engine.getSnapshot()
    expect(syncSnapshot.snapshots.length).toBeLessThanOrEqual(32)
    expect(syncSnapshot.contracts.length).toBeLessThanOrEqual(64)
    expect(syncSnapshot.checkpoints.length).toBeLessThanOrEqual(64)
  })

  it("handles reconnect storms, delayed packets, and out-of-order packets", () => {
    const engine = createRaceSynchronizationEngine({ roomId: "storm-room", maxSnapshots: 20, maxContracts: 40, maxCheckpoints: 40 })

    // In-order baseline
    for (let seq = 1; seq <= 20; seq += 1) {
      const contract = createRaceSyncContract({
        roomId: "storm-room",
        participantId: "p-1",
        sequence: seq,
        previousSequence: seq - 1,
        serverTs: 1000 + seq,
        snapshotRef: buildSnapshot(seq, 10, 5),
        checkpoint: { sequence: seq, participantId: "p-1", ts: 1000 + seq, wordsCompleted: seq, totalWords: 100 }
      })
      engine.ingestRemoteSync(contract, buildSnapshot(seq - 1, 10, 5))
    }

    // Delayed and out-of-order packets
    const delayed = createRaceSyncContract({ roomId: "storm-room", participantId: "p-1", sequence: 15, previousSequence: 14, serverTs: 1015, snapshotRef: buildSnapshot(15, 10, 5), checkpoint: {} })
    const ahead = createRaceSyncContract({ roomId: "storm-room", participantId: "p-1", sequence: 25, previousSequence: 24, serverTs: 1025, snapshotRef: buildSnapshot(25, 10, 5), checkpoint: {} })
    const delayedResult = engine.ingestRemoteSync(delayed, buildSnapshot(20, 10, 5))
    const aheadResult = engine.ingestRemoteSync(ahead, buildSnapshot(20, 10, 5))

    expect(delayedResult.accepted).toBe(false)
    expect(aheadResult.accepted).toBe(true)

    // Reconnect storm
    for (let i = 0; i < 25; i += 1) {
      const recovery = engine.recoverFromReconnect({ fromSequence: Math.max(0, 5 + (i % 10)) })
      expect(recovery.contracts.length).toBeLessThanOrEqual(40)
    }

    expect(engine.getSnapshot().reconnectRecoveries).toBe(25)
  })
})