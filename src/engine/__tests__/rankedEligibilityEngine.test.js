import { describe, expect, it } from "vitest"
import { determineRankedEligibility } from "../rankedEligibilityEngine"

describe("rankedEligibilityEngine", () => {
  it("raises eligible tiers when integrity, trust, and verification are strong", () => {
    const ranked = determineRankedEligibility({
      verificationState: "VALID",
      integrityReport: { integrityScore: 95 },
      trustReport: { trustScore: 92, trustTier: "TRUSTED" },
      replayReport: { valid: true, authenticityScore: 96 }
    })

    expect(["RANKED", "TOURNAMENT"]).toContain(ranked.eligibleTier)
    expect(ranked.reasons.length).toBe(0)
    expect(Object.isFrozen(ranked)).toBe(true)
  })

  it("drops to casual when verification or authenticity fails", () => {
    const ranked = determineRankedEligibility({
      verificationState: "INVALID",
      integrityReport: { integrityScore: 20 },
      trustReport: { trustScore: 15, trustTier: "RESTRICTED" },
      replayReport: { valid: false, authenticityScore: 10 }
    })

    expect(ranked.eligibleTier).toBe("CASUAL")
    expect(ranked.reasons.length).toBeGreaterThan(0)
  })
})
