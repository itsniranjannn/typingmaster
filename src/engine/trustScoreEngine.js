import { stableHash } from "./replayConsumerValidation"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const tiers = Object.freeze({
  TRUSTED: "TRUSTED",
  NORMAL: "NORMAL",
  WATCHLIST: "WATCHLIST",
  RESTRICTED: "RESTRICTED"
})

const riskLevels = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
})

const classifyTier = (score, invalidRaces, suspiciousRaces) => {
  if (score >= 85 && invalidRaces === 0 && suspiciousRaces <= 1) return tiers.TRUSTED
  if (score >= 65 && invalidRaces === 0) return tiers.NORMAL
  if (score >= 40) return tiers.WATCHLIST
  return tiers.RESTRICTED
}

const classifyRisk = (score, invalidRaces, suspiciousRaces, disconnectFrequency) => {
  if (score >= 80 && invalidRaces === 0 && suspiciousRaces <= 1 && disconnectFrequency <= 0.08) return riskLevels.LOW
  if (score >= 60 && invalidRaces === 0) return riskLevels.MEDIUM
  if (score >= 35 && invalidRaces <= 1) return riskLevels.HIGH
  return riskLevels.CRITICAL
}

export function evaluateTrustScore(profile = {}) {
  const verifiedRaces = Math.max(0, Number(profile.verifiedRaces) || 0)
  const suspiciousRaces = Math.max(0, Number(profile.suspiciousRaces) || 0)
  const invalidRaces = Math.max(0, Number(profile.invalidRaces) || 0)
  const disconnectCount = Math.max(0, Number(profile.disconnectCount) || 0)
  const replayVerificationHistory = Array.isArray(profile.replayVerificationHistory) ? profile.replayVerificationHistory : []
  const replayVerificationPasses = replayVerificationHistory.filter((entry) => entry?.valid === true).length
  const replayVerificationFails = replayVerificationHistory.filter((entry) => entry?.valid === false).length
  const totalRaces = verifiedRaces + suspiciousRaces + invalidRaces
  const disconnectFrequency = totalRaces > 0 ? disconnectCount / totalRaces : 0
  const score = Math.max(0, Math.min(100,
    100
    + verifiedRaces * 2
    + replayVerificationPasses * 3
    - suspiciousRaces * 12
    - invalidRaces * 25
    - replayVerificationFails * 8
    - Math.round(disconnectFrequency * 100)
  ))
  const trustTier = classifyTier(score, invalidRaces, suspiciousRaces)
  const riskClassification = classifyRisk(score, invalidRaces, suspiciousRaces, disconnectFrequency)
  const reasons = []
  if (invalidRaces > 0) reasons.push("invalid_race_history")
  if (suspiciousRaces > 0) reasons.push("suspicious_race_history")
  if (disconnectFrequency > 0.15) reasons.push("disconnect_frequency")
  if (replayVerificationFails > 0) reasons.push("replay_verification_history")
  const trustEvent = createIntegrityEvent({
    type: "TRUST_SCORE",
    classification: invalidRaces > 0 ? INTEGRITY_CLASSIFICATIONS.INVALID : suspiciousRaces > 0 ? INTEGRITY_CLASSIFICATIONS.SUSPICIOUS : INTEGRITY_CLASSIFICATIONS.VALID,
    reasonCodes: reasons,
    payload: { score, trustTier, riskClassification }
  })
  return freezeDeep({
    playerId: typeof profile.playerId === "string" ? profile.playerId : null,
    verifiedRaces,
    suspiciousRaces,
    invalidRaces,
    disconnectCount,
    replayVerificationHistory: freezeDeep(replayVerificationHistory.slice()),
    trustScore: score,
    trustTier,
    riskClassification,
    disconnectFrequency: Number(disconnectFrequency.toFixed(4)),
    reasons: freezeDeep(reasons.slice().sort()),
    trustEvent,
    trustHash: stableHash({ verifiedRaces, suspiciousRaces, invalidRaces, disconnectCount, replayVerificationHistory, score, trustTier, riskClassification })
  })
}

export function updateTrustProfile(previousProfile = {}, integrityReport = {}, replayReport = {}) {
  const nextProfile = {
    playerId: previousProfile.playerId || integrityReport.playerId || replayReport.playerId || null,
    verifiedRaces: Math.max(0, Number(previousProfile.verifiedRaces) || 0) + (integrityReport.valid === true && replayReport.valid !== false ? 1 : 0),
    suspiciousRaces: Math.max(0, Number(previousProfile.suspiciousRaces) || 0) + (integrityReport.classification === INTEGRITY_CLASSIFICATIONS.SUSPICIOUS || replayReport.valid === false ? 1 : 0),
    invalidRaces: Math.max(0, Number(previousProfile.invalidRaces) || 0) + (integrityReport.classification === INTEGRITY_CLASSIFICATIONS.INVALID || replayReport.valid === false && integrityReport.valid === false ? 1 : 0),
    disconnectCount: Math.max(0, Number(previousProfile.disconnectCount) || 0) + Math.max(0, Number(integrityReport.disconnectCount) || 0),
    replayVerificationHistory: [...(Array.isArray(previousProfile.replayVerificationHistory) ? previousProfile.replayVerificationHistory : []), { valid: replayReport.valid !== false, authenticityScore: Number(replayReport.authenticityScore) || 0 }]
  }
  return evaluateTrustScore(nextProfile)
}

export function createTrustScoreEngine(options = {}) {
  let profile = evaluateTrustScore(options.initialProfile || {})

  function update(integrityReport = {}, replayReport = {}) {
    profile = updateTrustProfile(profile, integrityReport, replayReport)
    return profile
  }

  function evaluate(nextProfile = profile) {
    profile = evaluateTrustScore(nextProfile)
    return profile
  }

  function getSnapshot() {
    return profile
  }

  return Object.freeze({
    evaluate,
    update,
    getSnapshot,
    tiers,
    riskLevels
  })
}

export default { createTrustScoreEngine, evaluateTrustScore, updateTrustProfile, tiers, riskLevels }
