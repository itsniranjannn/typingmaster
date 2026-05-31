import { stableHash } from "./replayConsumerValidation"
import { createIntegrityEvent, INTEGRITY_CLASSIFICATIONS } from "./integrityEventModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

export function createSignature(input = {}) {
  const payload = freezeDeep({
    room: input.room && typeof input.room === "object" ? input.room : {},
    participants: normalizeArray(input.participants),
    checkpoints: normalizeArray(input.checkpoints),
    replayExport: input.replayExport && typeof input.replayExport === "object" ? input.replayExport : {},
    resultPayload: input.resultPayload && typeof input.resultPayload === "object" ? input.resultPayload : {}
  })
  const payloadHash = stableHash(payload)
  const roomHash = stableHash(payload.room)
  const participantsHash = stableHash(payload.participants)
  const checkpointsHash = stableHash(payload.checkpoints)
  const replayHash = stableHash(payload.replayExport)
  const resultHash = stableHash(payload.resultPayload)
  const signatureHash = stableHash({ payloadHash, roomHash, participantsHash, checkpointsHash, replayHash, resultHash, algorithm: "deterministic-integrity-hash-v1" })
  return freezeDeep({
    algorithm: "deterministic-integrity-hash-v1",
    payload,
    payloadHash,
    roomHash,
    participantsHash,
    checkpointsHash,
    replayHash,
    resultHash,
    signatureHash,
    integrityEvent: createIntegrityEvent({
      type: "REPLAY_SIGNATURE",
      classification: INTEGRITY_CLASSIFICATIONS.VALID,
      reasonCodes: [],
      payload: { signatureHash }
    })
  })
}

export function verifySignature(input = {}, signature = null) {
  const expected = createSignature(input)
  const candidateHash = typeof signature === "string" ? signature : signature?.signatureHash || null
  const valid = candidateHash === expected.signatureHash
  return freezeDeep({
    valid,
    expected,
    providedSignatureHash: candidateHash,
    verificationHash: stableHash({ valid, expected: expected.signatureHash, providedSignatureHash: candidateHash })
  })
}

export function createReplaySigningEngine() {
  function sign(input = {}) {
    return createSignature(input)
  }

  function verify(input = {}, signature = null) {
    return verifySignature(input, signature)
  }

  return Object.freeze({
    createSignature: sign,
    verifySignature: verify
  })
}

export default { createReplaySigningEngine, createSignature, verifySignature }
