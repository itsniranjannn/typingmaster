import { stableHash } from "./replayConsumerValidation"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeList = (value) => (Array.isArray(value) ? value : [])

export function createReviewBundle(input = {}) {
  const bundle = freezeDeep({
    certificates: normalizeList(input.certificates),
    replayReports: normalizeList(input.replayReports),
    integrityReports: normalizeList(input.integrityReports),
    trustReports: normalizeList(input.trustReports),
    desyncReports: normalizeList(input.desyncReports)
  })
  const bundleHash = stableHash(bundle)
  const integrityEvent = createIntegrityEvent({
    type: "MODERATION_REVIEW",
    classification: INTEGRITY_CLASSIFICATIONS.VALID,
    reasonCodes: [],
    payload: { bundleHash, certificateCount: bundle.certificates.length }
  })
  return freezeDeep({
    ...bundle,
    bundleHash,
    integrityEvent
  })
}

export function verifyReviewBundle(bundle = {}) {
  const expected = createReviewBundle(bundle)
  const candidateHash = typeof bundle.bundleHash === "string" ? bundle.bundleHash : stableHash(bundle)
  const valid = candidateHash === expected.bundleHash
  return freezeDeep({
    valid,
    expected,
    providedBundleHash: candidateHash,
    reviewHash: stableHash({ valid, expected: expected.bundleHash, providedBundleHash: candidateHash })
  })
}

export function createModerationReviewEngine() {
  let lastBundle = createReviewBundle()

  function create(input = {}) {
    lastBundle = createReviewBundle(input)
    return lastBundle
  }

  function verify(bundle = {}) {
    return verifyReviewBundle(bundle)
  }

  function getSnapshot() {
    return lastBundle
  }

  return Object.freeze({
    createReviewBundle: create,
    verifyReviewBundle: verify,
    getSnapshot
  })
}

export default { createModerationReviewEngine, createReviewBundle, verifyReviewBundle }
