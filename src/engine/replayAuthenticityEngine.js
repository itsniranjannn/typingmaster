import { stableHash } from "./replayConsumerValidation"
import { isBackwardCompatibleReplayEnvelope } from "./multiplayerReplayContracts"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const normalizeReplay = (replay = {}) => freezeDeep({
  id: typeof replay.id === "string" ? replay.id : "replay",
  meta: replay.meta && typeof replay.meta === "object" ? replay.meta : {},
  config: replay.config && typeof replay.config === "object" ? replay.config : {},
  metrics: replay.metrics && typeof replay.metrics === "object" ? replay.metrics : {},
  flushedBatches: normalizeArray(replay.flushedBatches),
  events: normalizeArray(replay.events),
  multiplayer: replay.multiplayer && typeof replay.multiplayer === "object" ? replay.multiplayer : null
})

const classify = (score, validity) => {
  if (!validity.valid) return INTEGRITY_CLASSIFICATIONS.INVALID
  if (score < 70) return INTEGRITY_CLASSIFICATIONS.SUSPICIOUS
  if (score < 90) return INTEGRITY_CLASSIFICATIONS.WARNING
  return INTEGRITY_CLASSIFICATIONS.VALID
}

const continuityReport = (events = []) => {
  let lastSequence = -1
  let lastTs = -1
  let chainHash = stableHash("replay-chain-seed")
  let violations = 0
  const details = []
  events.forEach((event, index) => {
    const sequence = Number(event.sequence) || index + 1
    const ts = Math.max(0, Number(event.ts ?? event.serverTs) || 0)
    if (sequence !== lastSequence + 1 && index > 0) {
      violations += 1
      details.push("sequence_continuity")
    }
    if (ts < lastTs) {
      violations += 1
      details.push("timing_continuity")
    }
    const nextHash = stableHash({ chainHash, sequence, ts, type: event.type || null, payload: event.payload || null, participantId: event.participantId || null })
    chainHash = nextHash
    lastSequence = sequence
    lastTs = ts
  })
  return freezeDeep({
    valid: violations === 0,
    violations,
    details: [...new Set(details)].sort(),
    chainHash
  })
}

export function verifyReplayAuthenticity(input = {}) {
  const replay = normalizeReplay(input.replay || input)
  const replayEnvelope = input.replayEnvelope || replay
  const packetChain = continuityReport(replay.events)
  const checkpointChain = continuityReport(normalizeArray(input.checkpoints))
  const envelopeCompatibility = isBackwardCompatibleReplayEnvelope(replayEnvelope || replay)
  const participantConsistency = normalizeArray(input.participants).every((participant, index, list) => {
    const participantId = typeof participant?.id === "string" ? participant.id : typeof participant?.participantId === "string" ? participant.participantId : null
    if (!participantId) return false
    return list.findIndex((entry) => (entry?.id || entry?.participantId) === participantId) === index
  })
  const synchronizationEvents = normalizeArray(input.synchronization)
  const synchronizationContinuity = continuityReport(synchronizationEvents.map((event, index) => ({
    sequence: Number(event.sequence) || index + 1,
    ts: Number(event.ts ?? event.serverTs) || 0,
    type: event.type || "sync",
    payload: event.payload || {}
  })))

  const reasons = []
  if (!packetChain.valid) reasons.push("packet_chain_integrity")
  if (!checkpointChain.valid) reasons.push("checkpoint_chain_integrity")
  if (!envelopeCompatibility.compatible) reasons.push("replay_envelope_integrity")
  if (!synchronizationContinuity.valid) reasons.push("synchronization_continuity")
  if (!participantConsistency) reasons.push("participant_consistency")

  const validity = { valid: reasons.length === 0, reasons: reasons.slice().sort() }
  const authenticityScore = Math.max(0, 100 - packetChain.violations * 20 - checkpointChain.violations * 15 - (envelopeCompatibility.compatible ? 0 : 25) - (participantConsistency ? 0 : 20) - (synchronizationContinuity.valid ? 0 : 15))
  const integrityHash = stableHash({ replay, replayEnvelope, packetChain, checkpointChain, envelopeCompatibility, participantConsistency, synchronizationContinuity, authenticityScore, validity })
  const verificationReport = freezeDeep({
    packetChainIntegrity: packetChain,
    checkpointChainIntegrity: checkpointChain,
    replayEnvelopeIntegrity: envelopeCompatibility,
    sequenceContinuity: packetChain,
    synchronizationContinuity,
    participantConsistency,
    classification: classify(authenticityScore, validity),
    reasons: validity.reasons
  })

  const integrityEvent = createIntegrityEvent({
    type: "REPLAY_AUTHENTICITY",
    classification: verificationReport.classification,
    reasonCodes: validity.reasons,
    payload: { authenticityScore }
  })

  return freezeDeep({
    authenticityScore,
    verificationReport,
    integrityHash,
    replayEnvelope,
    packetChain,
    checkpointChain,
    participantConsistency,
    integrityEvent,
    valid: validity.valid,
    verificationHash: stableHash({ authenticityScore, verificationReport, integrityHash })
  })
}

export function createReplayAuthenticityEngine(options = {}) {
  let lastReport = freezeDeep({ authenticityScore: 100, valid: true, verificationHash: stableHash([]) })

  function verify(input = {}) {
    lastReport = verifyReplayAuthenticity(input)
    return lastReport
  }

  function getSnapshot() {
    return lastReport
  }

  return Object.freeze({
    verify,
    getSnapshot
  })
}

export default { createReplayAuthenticityEngine, verifyReplayAuthenticity }
