import { describe, expect, it } from "vitest"
import { createResultCertificate, verifyResultCertificate } from "../resultCertificationEngine"
import { createSignature } from "../replaySigningEngine"

describe("resultCertificationEngine", () => {
  it("creates immutable reproducible certificates", () => {
    const replaySignature = createSignature({
      room: { id: "room-cert" },
      participants: [{ id: "p-1" }],
      checkpoints: [{ sequence: 1, participantId: "p-1" }],
      replayExport: { id: "replay-cert", events: [] },
      resultPayload: { placement: 1 }
    })

    const certificate = createResultCertificate({
      roomId: "room-cert",
      participantId: "p-1",
      placement: 1,
      wpm: 101,
      accuracy: 99,
      integrityScore: 95,
      trustScore: 88,
      verificationState: "VALID",
      replaySignature,
      resultPayload: { placement: 1 }
    })

    const verification = verifyResultCertificate({
      roomId: "room-cert",
      participantId: "p-1",
      placement: 1,
      wpm: 101,
      accuracy: 99,
      integrityScore: 95,
      trustScore: 88,
      verificationState: "VALID",
      replaySignature,
      resultPayload: { placement: 1 }
    }, certificate)

    expect(certificate.roomId).toBe("room-cert")
    expect(verification.valid).toBe(true)
    expect(Object.isFrozen(certificate)).toBe(true)
  })
})
