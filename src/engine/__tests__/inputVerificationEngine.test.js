import { describe, expect, it } from "vitest"
import { createInputVerificationEngine, verifyInputStream } from "../inputVerificationEngine"
import { INTEGRITY_CLASSIFICATIONS } from "../integrityEventModel"

describe("inputVerificationEngine", () => {
  it("classifies invalid packet ordering, duplicates, and bursts deterministically", () => {
    const report = verifyInputStream([
      { sequence: 1, ts: 0, type: "key", key: "a", packetId: "p-1", wordsCompleted: 1, totalWords: 50 },
      { sequence: 1, ts: 5, type: "key", key: "b", packetId: "p-1", wordsCompleted: 8, totalWords: 50 },
      { sequence: 2, ts: 4, type: "key", key: "c", backspace: true, packetId: "p-2", wordsCompleted: 12, totalWords: 50 }
    ], { burstLimit: 2, burstWindowMs: 10, maxProgressJump: 2 })

    expect(report.classification).toBe(INTEGRITY_CLASSIFICATIONS.INVALID)
    expect(report.reasons.length).toBeGreaterThan(0)
    expect(report.integrityEvent.type).toBe("INPUT_VERIFICATION")
    expect(Object.isFrozen(report)).toBe(true)
  })

  it("tracks warning-level behavior for rapid but valid typing", () => {
    const engine = createInputVerificationEngine({ burstLimit: 4, burstWindowMs: 40 })
    const report = engine.verify([
      { sequence: 1, ts: 0, type: "key", key: "a", packetId: "a", wordsCompleted: 1, totalWords: 10 },
      { sequence: 2, ts: 6, type: "key", key: "b", packetId: "b", wordsCompleted: 2, totalWords: 10 },
      { sequence: 3, ts: 12, type: "key", key: "c", packetId: "c", wordsCompleted: 3, totalWords: 10 }
    ])

    expect(report.score).toBeLessThanOrEqual(100)
    expect([INTEGRITY_CLASSIFICATIONS.VALID, INTEGRITY_CLASSIFICATIONS.WARNING]).toContain(report.classification)
    expect(engine.getSnapshot()).toEqual(report)
  })
})
