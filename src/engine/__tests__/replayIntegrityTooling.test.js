import { describe, expect, it } from "vitest"
import { createReplayIntegrityTooling } from "../replayIntegrityTooling"
import shortF from "./fixtures/short.json"

describe("replayIntegrityTooling", () => {
  it("builds export-safe integrity reports and bounded repair suggestions", () => {
    const integrity = createReplayIntegrityTooling(shortF, { expectedReplayHash: "mismatch" })

    expect(integrity.replayTamperDetection.tamperDetected).toBe(true)
    expect(integrity.divergenceSeverityScore).toBeGreaterThan(0)
    expect(integrity.exportSafeIntegrityReport.fingerprint).toBeTruthy()
    expect(Array.isArray(integrity.checkpointVerificationTree.checkpoints)).toBe(true)
  })
})