import { describe, expect, it } from "vitest"
import { createReviewBundle, verifyReviewBundle } from "../moderationReviewEngine"

describe("moderationReviewEngine", () => {
  it("bundles review artifacts immutably and verifies them deterministically", () => {
    const bundle = createReviewBundle({
      certificates: [{ certificationHash: "c-1" }],
      replayReports: [{ valid: true }],
      integrityReports: [{ integrityScore: 91 }],
      trustReports: [{ trustScore: 88 }],
      desyncReports: [{ severity: 0 }]
    })
    const verification = verifyReviewBundle(bundle)

    expect(bundle.bundleHash).toBeDefined()
    expect(verification.valid).toBe(true)
    expect(Object.isFrozen(bundle)).toBe(true)
  })
})
