import { describe, expect, it } from "vitest"
import { evaluateTrustScore, updateTrustProfile } from "../trustScoreEngine"

describe("trustScoreEngine", () => {
  it("produces stable trust tiers from verified and suspicious race history", () => {
    const trusted = evaluateTrustScore({
      playerId: "p-1",
      verifiedRaces: 12,
      suspiciousRaces: 0,
      invalidRaces: 0,
      disconnectCount: 0,
      replayVerificationHistory: [{ valid: true }, { valid: true }]
    })

    const restricted = evaluateTrustScore({
      playerId: "p-2",
      verifiedRaces: 2,
      suspiciousRaces: 3,
      invalidRaces: 2,
      disconnectCount: 4,
      replayVerificationHistory: [{ valid: false }]
    })

    expect(trusted.trustTier).toBe("TRUSTED")
    expect(restricted.trustTier).toBe("RESTRICTED")
    expect(trusted.trustScore).toBeGreaterThan(restricted.trustScore)
  })

  it("updates profiles deterministically from integrity and replay reports", () => {
    const next = updateTrustProfile({ playerId: "p-3", verifiedRaces: 1, suspiciousRaces: 0, invalidRaces: 0, disconnectCount: 0, replayVerificationHistory: [] }, { valid: true, classification: "VALID", disconnectCount: 0 }, { valid: true, authenticityScore: 95 })

    expect(next.verifiedRaces).toBeGreaterThan(1)
    expect(next.trustTier).toBeDefined()
    expect(Object.isFrozen(next)).toBe(true)
  })
})
