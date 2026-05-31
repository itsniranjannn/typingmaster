import { stableHash } from "./replayConsumerValidation"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"
import { verifyInputStream } from "./inputVerificationEngine"
import { verifyReplayAuthenticity } from "./replayAuthenticityEngine"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const levelFromScore = (score) => {
  if (score >= 85) return INTEGRITY_CLASSIFICATIONS.VALID
  if (score >= 65) return INTEGRITY_CLASSIFICATIONS.WARNING
  if (score >= 40) return INTEGRITY_CLASSIFICATIONS.SUSPICIOUS
  return INTEGRITY_CLASSIFICATIONS.INVALID
}

export function calculateIntegrityScore(input = {}) {
  const inputReport = input.inputReport || verifyInputStream(input.inputs || [], input.inputOptions || {})
  const replayReport = input.replayReport || verifyReplayAuthenticity(input.replay || {})
  const replayValidity = replayReport.valid ? 100 : 20
  const packetOrdering = inputReport.invalidOrderingCount > 0 ? 0 : 100
  const correctionBehavior = inputReport.classification === INTEGRITY_CLASSIFICATIONS.INVALID ? 20 : inputReport.classification === INTEGRITY_CLASSIFICATIONS.SUSPICIOUS ? 55 : 100
  const timingStability = inputReport.reasons.some((reason) => reason.code === "impossible_timing_sequence") ? 40 : 100
  const synchronizationQuality = Math.max(0, Math.min(100, Number(input.synchronizationQuality) || (replayReport.verificationReport?.synchronizationContinuity?.valid ? 100 : 65)))
  const disconnectBehavior = Math.max(0, Math.min(100, Number(input.disconnectBehavior) || 100 - Math.max(0, Number(input.disconnectCount) || 0) * 12))
  const reconnectAbuse = Math.max(0, Math.min(100, Number(input.reconnectAbuse) || 100 - Math.max(0, Number(input.reconnectAbuseCount) || 0) * 20))
  const suspiciousBursts = inputReport.reasons.some((reason) => reason.code === "impossible_typing_burst") ? 35 : 100
  const overallScore = Math.max(0, Math.min(100, Math.round(
    replayValidity * 0.22 +
    packetOrdering * 0.14 +
    correctionBehavior * 0.14 +
    timingStability * 0.12 +
    synchronizationQuality * 0.16 +
    disconnectBehavior * 0.08 +
    reconnectAbuse * 0.08 +
    suspiciousBursts * 0.06
  )))
  const level = levelFromScore(overallScore)
  const reasons = []
  if (!replayReport.valid) reasons.push("replay_invalid")
  if (inputReport.invalidOrderingCount > 0) reasons.push("packet_ordering")
  if (inputReport.reasons.some((reason) => reason.code === "impossible_correction_pattern")) reasons.push("correction_behavior")
  if (inputReport.reasons.some((reason) => reason.code === "impossible_timing_sequence")) reasons.push("timing_stability")
  if (!replayReport.verificationReport?.synchronizationContinuity?.valid) reasons.push("synchronization_quality")
  if ((Number(input.disconnectCount) || 0) > 0) reasons.push("disconnect_behavior")
  if ((Number(input.reconnectAbuseCount) || 0) > 0) reasons.push("reconnect_abuse")
  if (inputReport.reasons.some((reason) => reason.code === "impossible_typing_burst")) reasons.push("suspicious_bursts")
  const integrityEvent = createIntegrityEvent({
    type: "COMPETITIVE_INTEGRITY",
    classification: level,
    reasonCodes: reasons,
    payload: { overallScore, packetOrdering, correctionBehavior, timingStability, synchronizationQuality, disconnectBehavior, reconnectAbuse, suspiciousBursts }
  })
  const integrityReport = freezeDeep({
    integrityScore: overallScore,
    level,
    inputReport,
    replayReport,
    factorScores: freezeDeep({ replayValidity, packetOrdering, correctionBehavior, timingStability, synchronizationQuality, disconnectBehavior, reconnectAbuse, suspiciousBursts }),
    reasons: freezeDeep([...new Set(reasons)].sort()),
    integrityEvent,
    integrityHash: stableHash({ overallScore, level, factorScores: { replayValidity, packetOrdering, correctionBehavior, timingStability, synchronizationQuality, disconnectBehavior, reconnectAbuse, suspiciousBursts }, inputReport, replayReport })
  })
  return integrityReport
}

export function createCompetitiveIntegrityEngine(options = {}) {
  let lastReport = freezeDeep({ integrityScore: 100, level: INTEGRITY_CLASSIFICATIONS.VALID, integrityHash: stableHash([]) })

  function evaluate(input = {}) {
    lastReport = calculateIntegrityScore(input)
    return lastReport
  }

  function getSnapshot() {
    return lastReport
  }

  return Object.freeze({
    evaluate,
    getSnapshot
  })
}

export default { createCompetitiveIntegrityEngine, calculateIntegrityScore }
