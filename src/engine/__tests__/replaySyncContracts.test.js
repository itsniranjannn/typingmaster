import { describe, expect, it } from "vitest"
import { createReplaySyncContract, validateReplaySyncContract } from "../replaySyncContracts"

describe("replaySyncContracts", () => {
  it("creates deterministic spectator sync boundaries", () => {
    const contract = createReplaySyncContract({
      sessionId: "session-1",
      replayHash: "replay-hash",
      viewport: { start: 0, end: 120 },
      state: { phase: "rendering", revision: 7, cursor: 12 },
      spectator: { id: "spec-1", connected: true, lagMs: 24 },
      budget: { frameBudgetMs: 8, consumedMs: 6, overBudgetMs: 0, withinBudget: true, executedCount: 2, overflowCount: 0 },
      counts: { timelineCount: 12, correctionCount: 2, checkpointCount: 1, markerCount: 3 }
    })

    const validation = validateReplaySyncContract(contract)

    expect(contract.replayHash).toBe("replay-hash")
    expect(contract.capabilities.spectatorSafe).toBe(true)
    expect(validation.valid).toBe(true)
    expect(validation.syncToken).toBe(contract.syncToken)
    expect(Object.isFrozen(contract)).toBe(true)
  })
})