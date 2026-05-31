import { describe, expect, it } from "vitest"
import { investigateDesync } from "../desyncInvestigationEngine"

describe("desyncInvestigationEngine", () => {
  it("produces deterministic desync reports from replay exports", () => {
    const report = investigateDesync({
      replay: {
        events: [{ sequence: 1, ts: 10 }, { sequence: 3, ts: 5 }],
        checkpoints: [{ sequence: 1, checkpointHash: "a" }],
        spectators: [{ id: "s-1" }],
        projections: [{ id: "g-1" }],
        reconnectCount: 2
      },
      referenceReplay: {
        events: [{ sequence: 1, ts: 10 }, { sequence: 2, ts: 20 }],
        checkpoints: [{ sequence: 1, checkpointHash: "b" }],
        spectators: [],
        projections: [],
        reconnectCount: 0
      }
    })

    expect(report.severity).toBeGreaterThan(0)
    expect(report.reasons.length).toBeGreaterThan(0)
    expect(Object.isFrozen(report)).toBe(true)
  })
})
