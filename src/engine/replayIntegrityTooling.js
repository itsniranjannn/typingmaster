import { stableHash } from "./replayConsumerValidation"
import { createReplayVisualizationCore } from "./replayVisualizationCore"
import { createDeterministicSpectatorSimulation } from "./spectatorSimulationLayer"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const severityScore = (mismatchCount, desyncCount, tamperCount) => {
  const score = Math.min(1, mismatchCount * 0.2 + desyncCount * 0.15 + tamperCount * 0.35)
  return Number(score.toFixed(3))
}

export function createReplayIntegrityTooling(replay, options = {}) {
  const core = options.core || createReplayVisualizationCore(replay, options)
  const spectator = options.spectatorSimulation || createDeterministicSpectatorSimulation(replay, options)
  const snapshot = core.getSnapshot()
  const checkpoints = Array.isArray(snapshot.frame.overlay.markers) ? snapshot.frame.overlay.markers : []
  const fingerprint = stableHash({
    replayHash: snapshot.replayHash,
    eventFingerprint: snapshot.eventFingerprint,
    checkpointCount: checkpoints.length
  })

  const checkpointVerificationTree = freezeDeep({
    root: fingerprint,
    checkpoints: checkpoints.map((checkpoint, index) => freezeDeep({
      index,
      startT: checkpoint.startT,
      endT: checkpoint.endT,
      hash: stableHash(checkpoint)
    }))
  })

  const tamperDetected = Boolean(options.expectedReplayHash && options.expectedReplayHash !== snapshot.replayHash)
  const corruptionClassification = tamperDetected
    ? "tamper-detected"
    : snapshot.visibleEventCount === 0
      ? "empty-replay"
      : checkpoints.length === 0 && snapshot.visibleEventCount > 0
        ? "low-checkpoint-density"
        : "healthy"

  const mismatchCount = tamperDetected ? 1 : 0
  const desyncCount = spectator.getAudit().desyncCount
  const tamperCount = tamperDetected ? 1 : 0
  const divergenceSeverity = severityScore(mismatchCount, desyncCount, tamperCount)
  const syncConfidence = Number((1 - divergenceSeverity).toFixed(3))

  const mismatchSummaries = freezeDeep(mismatchCount > 0 ? [{ kind: "replay-hash", severity: 5, reason: "expected-hash-mismatch" }] : [])
  const boundedRepairSuggestions = freezeDeep(tamperDetected
    ? [{ action: "rebuild-checkpoint-tree", bounded: true, confidence: 0.5 }]
    : spectator.getAudit().desyncCount > 0
      ? [{ action: "request-snapshot-reconciliation", bounded: true, confidence: 0.65 }]
      : [])

  return freezeDeep({
    deterministicReplayFingerprint: fingerprint,
    checkpointVerificationTree,
    replayTamperDetection: freezeDeep({ tamperDetected, corruptionClassification }),
    divergenceSeverityScore: divergenceSeverity,
    deterministicMismatchSummaries: mismatchSummaries,
    syncConfidenceScore: syncConfidence,
    replayAuditSummary: freezeDeep({
      replayHash: snapshot.replayHash,
      eventFingerprint: snapshot.eventFingerprint,
      visibleEventCount: snapshot.visibleEventCount,
      checkpointCount: checkpoints.length
    }),
    corruptionClassification,
    boundedRepairSuggestions,
    exportSafeIntegrityReport: freezeDeep({
      fingerprint,
      tamperDetected,
      divergenceSeverity,
      syncConfidence,
      corruptionClassification,
      checkpointCount: checkpoints.length,
      replayHash: snapshot.replayHash
    }),
    spectatorAudit: spectator.getAudit(),
    frameSnapshot: snapshot
  })
}

export default { createReplayIntegrityTooling }