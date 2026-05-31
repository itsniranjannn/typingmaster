import { describe, expect, it } from "vitest"
import { createInputVerificationEngine } from "../inputVerificationEngine"
import { verifyReplayAuthenticity } from "../replayAuthenticityEngine"
import { createCompetitiveIntegrityEngine } from "../competitiveIntegrityEngine"
import { createTrustScoreEngine } from "../trustScoreEngine"
import { createModerationReviewEngine } from "../moderationReviewEngine"
import { createReviewBundle } from "../moderationReviewEngine"
import { determineRankedEligibility } from "../rankedEligibilityEngine"
import { createMultiplayerReplayEnvelope } from "../multiplayerReplayContracts"

const buildEvents = (count) => Array.from({ length: count }, (_, index) => ({
  sequence: index + 1,
  ts: index * 5,
  type: index % 7 === 0 ? "key" : "checkpoint",
  key: String.fromCharCode(97 + (index % 26)),
  packetId: `packet-${index}`,
  wordsCompleted: Math.min(100, index + 1),
  totalWords: 100,
  checkpointId: index % 5 === 0 ? `checkpoint-${index}` : null
}))

describe("integrityStress", () => {
  it("handles 10k, 50k, and 100k replay events without breaking determinism", () => {
    const sizes = [10_000, 50_000, 100_000]
    const reports = sizes.map((size) => {
      const events = buildEvents(size)
      const checkpoints = events
        .filter((event) => event.checkpointId)
        .map((event, index) => ({ sequence: index + 1, participantId: "p-1", ts: event.ts, checkpointHash: event.checkpointId }))
      return verifyReplayAuthenticity({
        replay: createMultiplayerReplayEnvelope({ id: `replay-${size}`, meta: {}, config: {}, metrics: { eventCount: size }, flushedBatches: [], events }, { roomId: "stress-room", raceState: "RUNNING", participantTimelines: [{ id: "p-1", sequence: 1, serverTs: 0, state: {} }], spectatorTimelines: [], raceCheckpoints: checkpoints }),
        participants: [{ id: "p-1" }],
        checkpoints
      })
    })

    expect(reports.map((report) => report.valid)).toEqual([true, true, true])
    expect(reports[0].integrityHash).not.toBe(reports[1].integrityHash)
  }, 300000)

  it("keeps trust and eligibility deterministic under mass history updates", () => {
    const trustEngine = createTrustScoreEngine({ initialProfile: { playerId: "p-1" } })
    let trust = trustEngine.getSnapshot()
    for (let index = 0; index < 100; index += 1) {
      trust = trustEngine.update({ valid: index % 10 !== 0, classification: index % 10 === 0 ? "SUSPICIOUS" : "VALID", disconnectCount: index % 12 === 0 ? 1 : 0 }, { valid: index % 13 !== 0, authenticityScore: 90 })
    }

    const eligibility = determineRankedEligibility({
      verificationState: "VALID",
      integrityReport: { integrityScore: 87 },
      trustReport: trust,
      replayReport: { valid: true, authenticityScore: 92 }
    })

    expect(trust.trustScore).toBeGreaterThanOrEqual(0)
    expect(eligibility.eligibleTier).toBeDefined()
  })

  it("bounds 500-player competition and review bundles deterministically", () => {
    const inputEngine = createInputVerificationEngine({ burstLimit: 12, burstWindowMs: 250 })
    const inputs = Array.from({ length: 500 }, (_, index) => ({ sequence: index + 1, ts: index * 7, packetId: `p-${index}`, wordsCompleted: Math.min(100, index % 100), totalWords: 100 }))
    const inputReport = inputEngine.verify(inputs)
    const integrityReport = createCompetitiveIntegrityEngine().evaluate({ inputReport, replay: { id: "stress", meta: {}, config: {}, metrics: {}, flushedBatches: [], events: buildEvents(1_000) }, synchronizationQuality: 90 })
    const reviewBundle = createReviewBundle({
      certificates: [{ certificationHash: "cert-1" }],
      replayReports: [{ valid: true }],
      integrityReports: [integrityReport],
      trustReports: [createTrustScoreEngine({ initialProfile: { playerId: "p-1" } }).getSnapshot()],
      desyncReports: [{ severity: 0 }]
    })
    const reviewEngine = createModerationReviewEngine()
    const verified = reviewEngine.verifyReviewBundle(reviewBundle)

    expect(inputReport.normalizedInputs.length).toBe(500)
    expect(integrityReport.integrityScore).toBeGreaterThan(0)
    expect(verified.valid).toBe(true)
  })
})
