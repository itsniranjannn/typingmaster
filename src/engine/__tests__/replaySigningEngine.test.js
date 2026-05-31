import { describe, expect, it } from "vitest"
import { createSignature, verifySignature } from "../replaySigningEngine"

describe("replaySigningEngine", () => {
  it("creates and verifies deterministic replay signatures", () => {
    const input = {
      room: { id: "room-sign" },
      participants: [{ id: "p-1" }],
      checkpoints: [{ sequence: 1, participantId: "p-1" }],
      replayExport: { id: "replay-sign", events: [{ sequence: 1 }] },
      resultPayload: { placement: 1 }
    }
    const signature = createSignature(input)
    const verification = verifySignature(input, signature)

    expect(signature.signatureHash).toBeDefined()
    expect(verification.valid).toBe(true)
    expect(Object.isFrozen(signature)).toBe(true)
  })
})
