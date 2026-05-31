import { describe, expect, it } from "vitest"
import { createReplayRenderIntegrity } from "../replayRenderIntegrity"
import shortF from "./fixtures/short.json"

describe("replayRenderIntegrity", () => {
  it("creates deterministic render integrity reports", () => {
    const integrity = createReplayRenderIntegrity(shortF)

    expect(integrity.renderSnapshotValidation.valid).toBe(true)
    expect(integrity.deterministicFrameHashes.currentHash).toBeTruthy()
    expect(integrity.exportSafeIntegrityReport.checkpointCount).toBe(1)
  })
})