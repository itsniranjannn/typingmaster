import { stableHash } from "./replayConsumerValidation"
import { createReplaySigningEngine } from "./replaySigningEngine"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeValue = (value, fallback = null) => (value === undefined ? fallback : value)

export function createResultCertificate(input = {}) {
  const signingEngine = input.signingEngine || createReplaySigningEngine()
  const verificationState = typeof input.verificationState === "string" ? input.verificationState : "VALID"
  const signature = input.replaySignature || signingEngine.createSignature({
    room: input.room || {},
    participants: input.participants || [],
    checkpoints: input.checkpoints || [],
    replayExport: input.replayExport || {},
    resultPayload: input.resultPayload || {}
  })
  const certificate = {
    certificateVersion: 1,
    roomId: normalizeValue(input.roomId || input.room?.id, null),
    participantId: normalizeValue(input.participantId || input.participant?.id, null),
    placement: Math.max(0, Number(input.placement) || 0),
    wpm: Math.max(0, Number(input.wpm) || 0),
    accuracy: Math.max(0, Math.min(100, Number(input.accuracy) || 0)),
    integrityScore: Math.max(0, Math.min(100, Number(input.integrityScore) || 0)),
    trustScore: Math.max(0, Math.min(100, Number(input.trustScore) || 0)),
    verificationState,
    replaySignature: signature,
    resultPayload: input.resultPayload && typeof input.resultPayload === "object" ? input.resultPayload : {},
    resultHash: stableHash(input.resultPayload || {}),
    certificationHash: stableHash({
      roomId: normalizeValue(input.roomId || input.room?.id, null),
      participantId: normalizeValue(input.participantId || input.participant?.id, null),
      placement: Math.max(0, Number(input.placement) || 0),
      wpm: Math.max(0, Number(input.wpm) || 0),
      accuracy: Math.max(0, Math.min(100, Number(input.accuracy) || 0)),
      integrityScore: Math.max(0, Math.min(100, Number(input.integrityScore) || 0)),
      trustScore: Math.max(0, Math.min(100, Number(input.trustScore) || 0)),
      verificationState,
      replaySignatureHash: signature.signatureHash,
      resultHash: stableHash(input.resultPayload || {})
    }),
    status: input.status || "CERTIFIED",
    integrityEvent: createIntegrityEvent({
      type: "RESULT_CERTIFICATION",
      classification: verificationState === "VALID" ? INTEGRITY_CLASSIFICATIONS.VALID : INTEGRITY_CLASSIFICATIONS.WARNING,
      reasonCodes: [],
      payload: { certificationHash: stableHash({
        roomId: normalizeValue(input.roomId || input.room?.id, null),
        participantId: normalizeValue(input.participantId || input.participant?.id, null),
        placement: Math.max(0, Number(input.placement) || 0),
        wpm: Math.max(0, Number(input.wpm) || 0),
        accuracy: Math.max(0, Math.min(100, Number(input.accuracy) || 0)),
        integrityScore: Math.max(0, Math.min(100, Number(input.integrityScore) || 0)),
        trustScore: Math.max(0, Math.min(100, Number(input.trustScore) || 0)),
        verificationState,
        replaySignatureHash: signature.signatureHash,
        resultHash: stableHash(input.resultPayload || {})
      }) }
    })
  }
  return freezeDeep(certificate)
}

export function verifyResultCertificate(input = {}, certificate = null) {
  const expected = createResultCertificate(input)
  const candidateHash = typeof certificate === "string" ? certificate : certificate?.certificationHash || null
  return freezeDeep({
    valid: candidateHash === expected.certificationHash,
    expected,
    providedCertificationHash: candidateHash,
    verificationHash: stableHash({ expected: expected.certificationHash, providedCertificationHash: candidateHash })
  })
}

export function createResultCertificationEngine(options = {}) {
  const signingEngine = options.signingEngine || createReplaySigningEngine()
  let lastCertificate = null

  function certify(input = {}) {
    lastCertificate = createResultCertificate({ ...input, signingEngine })
    return lastCertificate
  }

  function verify(input = {}, certificate = null) {
    return verifyResultCertificate(input, certificate)
  }

  function getSnapshot() {
    return lastCertificate
  }

  return Object.freeze({
    certify,
    verify,
    getSnapshot
  })
}

export default { createResultCertificationEngine, createResultCertificate, verifyResultCertificate }
