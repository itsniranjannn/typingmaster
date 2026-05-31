import { describe, expect, it } from "vitest"
import { calculateIntegrityScore } from "../competitiveIntegrityEngine"
import { verifyInputStream } from "../inputVerificationEngine"
import { verifyReplayAuthenticity } from "../replayAuthenticityEngine"

describe("competitiveIntegrityEngine", () => {
  it("combines replay and input verification into a bounded score", () => {
    const inputReport = verifyInputStream([
      { sequence: 1, ts: 0, type: "key", packetId: "a", wordsCompleted: 1, totalWords: 20 },
      { sequence: 2, ts: 15, type: "key", packetId: "b", wordsCompleted: 2, totalWords: 20 }
    ])
    const replayReport = verifyReplayAuthenticity({
      replay: {
        id: "replay-3",
        meta: {},
        config: {},
        metrics: {},
        flushedBatches: [],
        events: [
          { sequence: 1, ts: 0, type: "key", payload: {} },
          { sequence: 2, ts: 15, type: "key", payload: {} }
        ]
      },
      participants: [{ id: "p-1" }],
      checkpoints: []
    })

    const report = calculateIntegrityScore({
      inputReport,
      replayReport,
      synchronizationQuality: 95,
      disconnectCount: 0,
      reconnectAbuseCount: 0
    })

    expect(report.integrityScore).toBeGreaterThan(70)
    expect(report.level).toBeDefined()
    expect(report.factorScores.replayValidity).toBe(100)
    expect(Object.isFrozen(report)).toBe(true)
  })

  it("lowers the score for invalid input streams and replay tamper", () => {
    const report = calculateIntegrityScore({
      inputs: [
        { sequence: 1, ts: 20, packetId: "dup", wordsCompleted: 4, totalWords: 10 },
        { sequence: 1, ts: 10, packetId: "dup", wordsCompleted: 20, totalWords: 10 }
      ],
      replay: {
        id: "replay-4",
        meta: {},
        config: {},
        metrics: {},
        flushedBatches: [],
        events: []
      }
    })

    expect(report.integrityScore).toBeLessThan(80)
    expect(report.reasons.length).toBeGreaterThan(0)
  })
})
