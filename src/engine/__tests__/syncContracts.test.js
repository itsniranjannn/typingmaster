import { describe, expect, it } from "vitest"
import { createRaceSyncContract, resolveRaceSyncConflict, validateRaceSyncContract } from "../syncContracts"

describe("syncContracts", () => {
  it("builds deterministic sync contracts", () => {
    const contract = createRaceSyncContract({
      roomId: "room-1",
      participantId: "p-1",
      sequence: 12,
      previousSequence: 11,
      serverTs: 2500,
      snapshotRef: { revision: 4, state: "RUNNING", participantCount: 4, spectatorCount: 2, snapshotHash: "abc" },
      checkpoint: { sequence: 3, participantId: "p-1", ts: 2500, wordsCompleted: 24, totalWords: 50 }
    })

    const validation = validateRaceSyncContract(contract)

    expect(validation.valid).toBe(true)
    expect(contract.sequence).toBe(12)
    expect(contract.snapshotRef.state).toBe("RUNNING")
    expect(Object.isFrozen(contract)).toBe(true)
  })

  it("resolves conflicts deterministically", () => {
    const left = createRaceSyncContract({ roomId: "room-1", participantId: "p-1", sequence: 10, serverTs: 4000, snapshotRef: { snapshotHash: "left" }, checkpoint: {} })
    const right = createRaceSyncContract({ roomId: "room-1", participantId: "p-1", sequence: 9, serverTs: 6000, snapshotRef: { snapshotHash: "right" }, checkpoint: {} })
    const resolved = resolveRaceSyncConflict(left, right)

    expect(resolved.winner).toBe("left")
    expect(resolved.reason).toBe("sequence")
  })
})