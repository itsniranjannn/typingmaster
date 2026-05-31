import { stableHash } from "./replayConsumerValidation"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"
import { verifyReplayAuthenticity } from "./replayAuthenticityEngine"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const compareChain = (left = [], right = []) => {
  const limit = Math.min(left.length, right.length)
  let mismatches = 0
  for (let index = 0; index < limit; index += 1) {
    const leftEvent = left[index] || {}
    const rightEvent = right[index] || {}
    if (leftEvent.sequence !== rightEvent.sequence || leftEvent.checkpointHash !== rightEvent.checkpointHash) mismatches += 1
  }
  return mismatches + Math.abs(left.length - right.length)
}

export function investigateDesync(input = {}) {
  const replay = input.replay || {}
  const referenceReplay = input.referenceReplay || {}
  const replayReport = verifyReplayAuthenticity({ replay })
  const referenceReport = verifyReplayAuthenticity({ replay: referenceReplay })
  const packetOrderingIssues = Math.max(0, (replayReport.packetChain?.violations || 0) - (referenceReport.packetChain?.violations || 0))
  const reconnectDivergence = Math.abs((Number(replay.reconnectCount) || 0) - (Number(referenceReplay.reconnectCount) || 0))
  const checkpointMismatches = compareChain(replay.checkpoints || [], referenceReplay.checkpoints || [])
  const spectatorDivergence = Math.abs((replay.spectators || []).length - (referenceReplay.spectators || []).length)
  const projectionDivergence = Math.abs((replay.projections || []).length - (referenceReplay.projections || []).length)
  const severity = Math.min(5, packetOrderingIssues + reconnectDivergence + checkpointMismatches + spectatorDivergence + projectionDivergence > 0 ? 4 : 0)
  const reasons = []
  if (packetOrderingIssues > 0) reasons.push("packet_ordering_issues")
  if (reconnectDivergence > 0) reasons.push("reconnect_divergence")
  if (checkpointMismatches > 0) reasons.push("checkpoint_mismatches")
  if (spectatorDivergence > 0) reasons.push("spectator_divergence")
  if (projectionDivergence > 0) reasons.push("projection_divergence")
  const desyncReport = {
    packetOrderingIssues,
    reconnectDivergence,
    checkpointMismatches,
    spectatorDivergence,
    projectionDivergence,
    severity,
    reasons: freezeDeep([...new Set(reasons)].sort()),
    replayReport,
    referenceReport,
    desyncHash: stableHash({ packetOrderingIssues, reconnectDivergence, checkpointMismatches, spectatorDivergence, projectionDivergence, replayReport, referenceReport }),
    investigationEvent: createIntegrityEvent({
      type: "DESYNC_INVESTIGATION",
      classification: severity === 0 ? INTEGRITY_CLASSIFICATIONS.VALID : severity >= 4 ? INTEGRITY_CLASSIFICATIONS.SUSPICIOUS : INTEGRITY_CLASSIFICATIONS.WARNING,
      reasonCodes: [...new Set(reasons)].sort(),
      payload: { severity, desyncHash: stableHash({ packetOrderingIssues, reconnectDivergence, checkpointMismatches, spectatorDivergence, projectionDivergence, replayReport, referenceReport }) }
    })
  }
  return freezeDeep(desyncReport)
}

export function createDesyncInvestigationEngine() {
  let lastReport = freezeDeep({ severity: 0, reasons: [], desyncHash: stableHash([]) })

  function investigate(input = {}) {
    lastReport = investigateDesync(input)
    return lastReport
  }

  function getSnapshot() {
    return lastReport
  }

  return Object.freeze({
    investigate,
    getSnapshot
  })
}

export default { createDesyncInvestigationEngine, investigateDesync }
