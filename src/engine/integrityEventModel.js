import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

export const INTEGRITY_EVENT_TYPES = Object.freeze({
  INPUT_VERIFICATION: "INPUT_VERIFICATION",
  REPLAY_AUTHENTICITY: "REPLAY_AUTHENTICITY",
  COMPETITIVE_INTEGRITY: "COMPETITIVE_INTEGRITY",
  TRUST_SCORE: "TRUST_SCORE",
  RESULT_CERTIFICATION: "RESULT_CERTIFICATION",
  REPLAY_SIGNATURE: "REPLAY_SIGNATURE",
  DESYNC_INVESTIGATION: "DESYNC_INVESTIGATION",
  MODERATION_REVIEW: "MODERATION_REVIEW",
  RANKED_ELIGIBILITY: "RANKED_ELIGIBILITY"
})

export const INTEGRITY_CLASSIFICATIONS = Object.freeze({
  VALID: "VALID",
  WARNING: "WARNING",
  SUSPICIOUS: "SUSPICIOUS",
  INVALID: "INVALID"
})

export const INTEGRITY_SEVERITY = Object.freeze({
  INFO: 0,
  WARNING: 1,
  SUSPICIOUS: 2,
  INVALID: 3
})

export function createIntegrityEvent(input = {}) {
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {}
  const event = {
    sequence: Math.max(0, Number(input.sequence) || 0),
    serverTs: Math.max(0, Number(input.serverTs) || 0),
    roomId: typeof input.roomId === "string" ? input.roomId : null,
    participantId: typeof input.participantId === "string" ? input.participantId : null,
    type: typeof input.type === "string" ? input.type : INTEGRITY_EVENT_TYPES.INPUT_VERIFICATION,
    classification: Object.values(INTEGRITY_CLASSIFICATIONS).includes(input.classification) ? input.classification : INTEGRITY_CLASSIFICATIONS.VALID,
    reasonCodes: Array.isArray(input.reasonCodes) ? input.reasonCodes.filter((code) => typeof code === "string") : [],
    payload,
    eventHash: typeof input.eventHash === "string"
      ? input.eventHash
      : stableHash({
        sequence: Math.max(0, Number(input.sequence) || 0),
        serverTs: Math.max(0, Number(input.serverTs) || 0),
        roomId: typeof input.roomId === "string" ? input.roomId : null,
        participantId: typeof input.participantId === "string" ? input.participantId : null,
        type: typeof input.type === "string" ? input.type : INTEGRITY_EVENT_TYPES.INPUT_VERIFICATION,
        classification: Object.values(INTEGRITY_CLASSIFICATIONS).includes(input.classification) ? input.classification : INTEGRITY_CLASSIFICATIONS.VALID,
        reasonCodes: Array.isArray(input.reasonCodes) ? input.reasonCodes.filter((code) => typeof code === "string") : [],
        payload
      })
  }
  return freezeDeep(event)
}

export function orderIntegrityEvents(events = []) {
  return freezeDeep((Array.isArray(events) ? events : []).slice().sort((left, right) => {
    return (Number(left.sequence) || 0) - (Number(right.sequence) || 0)
      || (Number(left.serverTs) || 0) - (Number(right.serverTs) || 0)
      || String(left.type || "").localeCompare(String(right.type || ""))
      || String(left.eventHash || "").localeCompare(String(right.eventHash || ""))
  }))
}

export default {
  INTEGRITY_EVENT_TYPES,
  INTEGRITY_CLASSIFICATIONS,
  INTEGRITY_SEVERITY,
  createIntegrityEvent,
  orderIntegrityEvents
}
