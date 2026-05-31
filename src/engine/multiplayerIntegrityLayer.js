import { stableHash } from "./replayConsumerValidation"
import { createReplayIntegrityTooling } from "./replayIntegrityTooling"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const classifyDesync = (localCheckpointHash, remoteCheckpointHash) => {
  if (!localCheckpointHash || !remoteCheckpointHash) return freezeDeep({ kind: "missing-checkpoint", severity: 2 })
  if (localCheckpointHash === remoteCheckpointHash) return freezeDeep({ kind: "in-sync", severity: 0 })
  return freezeDeep({ kind: "checkpoint-mismatch", severity: 4 })
}

export function createMultiplayerIntegrityLayer(options = {}) {
  const expectedReplayHash = typeof options.expectedReplayHash === "string" ? options.expectedReplayHash : null

  function verifyParticipant(participantReplay) {
    const report = createReplayIntegrityTooling(participantReplay, { expectedReplayHash })
    return freezeDeep({
      participantId: participantReplay?.id || null,
      valid: !report.replayTamperDetection.tamperDetected,
      report
    })
  }

  function validateCheckpoint(localCheckpoint, remoteCheckpoint) {
    const desync = classifyDesync(localCheckpoint?.checkpointHash || null, remoteCheckpoint?.checkpointHash || null)
    return freezeDeep({
      valid: desync.severity === 0,
      desync,
      localCheckpoint: localCheckpoint || null,
      remoteCheckpoint: remoteCheckpoint || null
    })
  }

  function verifyReplayConsistency(participantReplays = []) {
    const reports = (Array.isArray(participantReplays) ? participantReplays : []).map((replay) => verifyParticipant(replay))
    const tamperedCount = reports.filter((report) => !report.valid).length
    return freezeDeep({
      valid: tamperedCount === 0,
      reports,
      tamperedCount,
      consistencyHash: stableHash(reports.map((report) => ({ participantId: report.participantId, valid: report.valid, fingerprint: report.report.deterministicReplayFingerprint })))
    })
  }

  function verifyReconnect(previousRecovery, nextRecovery) {
    const previousHash = previousRecovery?.recoveryHash || ""
    const nextHash = nextRecovery?.recoveryHash || ""
    const valid = previousHash === "" || nextHash !== ""
    return freezeDeep({
      valid,
      reason: valid ? null : "missing_recovery_hash",
      previousHash,
      nextHash,
      reconnectHash: stableHash({ previousHash, nextHash })
    })
  }

  return Object.freeze({
    verifyParticipant,
    validateCheckpoint,
    verifyReplayConsistency,
    verifyReconnect
  })
}

export default { createMultiplayerIntegrityLayer }