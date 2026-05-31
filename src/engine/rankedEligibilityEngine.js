import { stableHash } from "./replayConsumerValidation"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const orderedTiers = Object.freeze(["CASUAL", "UNRANKED", "RANKED", "TOURNAMENT"])

const tierRank = Object.freeze({ CASUAL: 0, UNRANKED: 1, RANKED: 2, TOURNAMENT: 3 })

const maxTier = (left, right) => (tierRank[left] >= tierRank[right] ? left : right)

export function determineRankedEligibility(input = {}) {
  const integrityReport = input.integrityReport || {}
  const trustReport = input.trustReport || {}
  const replayReport = input.replayReport || {}
  const verificationState = typeof input.verificationState === "string" ? input.verificationState : "VALID"
  const verificationValid = verificationState === "VALID"
  const authenticityValid = replayReport.valid !== false && Number(replayReport.authenticityScore) >= 50
  const integrityScore = Math.max(0, Math.min(100, Number(integrityReport.integrityScore) || 0))
  const trustScore = Math.max(0, Math.min(100, Number(trustReport.trustScore) || 0))
  const trustTier = typeof trustReport.trustTier === "string" ? trustReport.trustTier : "NORMAL"

  let eligibleTier = "CASUAL"
  const reasons = []

  if (!verificationValid) reasons.push("verification_state")
  if (!authenticityValid) reasons.push("replay_authenticity")
  if (integrityScore < 35) reasons.push("integrity_floor")
  if (trustScore < 40) reasons.push("trust_floor")

  if (verificationValid && integrityScore >= 35 && trustScore >= 40 && replayReport.valid !== false) eligibleTier = maxTier(eligibleTier, "UNRANKED")
  if (verificationValid && authenticityValid && integrityScore >= 75 && trustScore >= 70 && trustTier !== "RESTRICTED") eligibleTier = maxTier(eligibleTier, "RANKED")
  if (verificationValid && authenticityValid && integrityScore >= 90 && trustScore >= 85 && trustTier === "TRUSTED" && replayReport.valid !== false) eligibleTier = maxTier(eligibleTier, "TOURNAMENT")

  const rankedEligibility = {
    eligibleTier,
    orderedTiers,
    eligible: eligibleTier !== "CASUAL" || (integrityScore >= 35 && trustScore >= 40 && verificationValid),
    reasons: freezeDeep([...new Set(reasons)].sort()),
    verificationState,
    integrityScore,
    trustScore,
    trustTier,
    replayAuthenticityScore: Number(replayReport.authenticityScore) || 0,
    eligibilityHash: stableHash({ eligibleTier, reasons, verificationState, integrityScore, trustScore, trustTier, replayAuthenticityScore: Number(replayReport.authenticityScore) || 0 }),
    rankedEvent: createIntegrityEvent({
      type: "RANKED_ELIGIBILITY",
      classification: eligibleTier === "TOURNAMENT" || eligibleTier === "RANKED" ? INTEGRITY_CLASSIFICATIONS.VALID : eligibleTier === "UNRANKED" ? INTEGRITY_CLASSIFICATIONS.WARNING : INTEGRITY_CLASSIFICATIONS.SUSPICIOUS,
      reasonCodes: [...new Set(reasons)].sort(),
      payload: { eligibleTier, integrityScore, trustScore, trustTier }
    })
  }

  return freezeDeep(rankedEligibility)
}

export function createRankedEligibilityEngine() {
  let lastEligibility = determineRankedEligibility()

  function evaluate(input = {}) {
    lastEligibility = determineRankedEligibility(input)
    return lastEligibility
  }

  function getSnapshot() {
    return lastEligibility
  }

  return Object.freeze({
    evaluate,
    getSnapshot
  })
}

export default { createRankedEligibilityEngine, determineRankedEligibility }
