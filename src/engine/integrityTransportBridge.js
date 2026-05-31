import { stableHash } from "./replayConsumerValidation"
import { createMultiplayerIntegrityLayer } from "./multiplayerIntegrityLayer"
import { validateTransportPacket } from "./transportContracts"
import { createRaceSyncContract, validateRaceSyncContract } from "./syncContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

export function createIntegrityTransportBridge(options = {}) {
  const integrityLayer = options.integrityLayer || createMultiplayerIntegrityLayer(options.integrityOptions || {})
  const expectedReplayHash = typeof options.expectedReplayHash === "string" ? options.expectedReplayHash : null

  function verifyRemoteCheckpoint(packetOrCheckpoint = {}) {
    const checkpoint = packetOrCheckpoint.checkpoint || packetOrCheckpoint
    const snapshotHash = typeof packetOrCheckpoint.snapshotRef?.snapshotHash === "string"
      ? packetOrCheckpoint.snapshotRef.snapshotHash
      : checkpoint.checkpointHash || stableHash(checkpoint)
    const contract = createRaceSyncContract({
      roomId: packetOrCheckpoint.roomId || null,
      participantId: packetOrCheckpoint.participantId || null,
      spectatorId: packetOrCheckpoint.spectatorId || null,
      sequence: Number(packetOrCheckpoint.sequence) || Number(checkpoint.sequence) || 0,
      serverTs: Number(packetOrCheckpoint.serverTs) || Number(checkpoint.ts) || 0,
      snapshotRef: packetOrCheckpoint.snapshotRef || { snapshotHash },
      checkpoint
    })
    const validation = validateRaceSyncContract(contract)
    const integrity = integrityLayer.validateCheckpoint(checkpoint, packetOrCheckpoint.remoteCheckpoint || checkpoint)
    return freezeDeep({
      contract,
      validation,
      integrity,
      valid: validation.valid && integrity.valid,
      verificationHash: stableHash({ contract, validation, integrity })
    })
  }

  function verifyRemoteReplay(replaySummary = {}) {
    const report = integrityLayer.verifyParticipant(replaySummary)
    const packetValidation = validateTransportPacket(replaySummary.transportPacket || { protocolVersion: 1, packetId: "noop", kind: "event", sequence: 0, eventType: "REPLAY_VERIFY" })
    return freezeDeep({
      report,
      packetValidation,
      valid: report.valid && packetValidation.valid,
      replayHash: report.report?.deterministicReplayFingerprint || expectedReplayHash || null,
      verificationHash: stableHash({ report, packetValidation, expectedReplayHash })
    })
  }

  function reportDesync(input = {}) {
    const replayReport = verifyRemoteReplay(input.replay || {})
    const checkpointReport = verifyRemoteCheckpoint(input.checkpoint || {})
    return freezeDeep({
      desync: {
        kind: replayReport.valid && checkpointReport.valid ? "in-sync" : "desync",
        severity: replayReport.valid && checkpointReport.valid ? 0 : 4
      },
      replayReport,
      checkpointReport,
      valid: replayReport.valid && checkpointReport.valid,
      reportHash: stableHash({ replayReport, checkpointReport })
    })
  }

  function validateConsistency(input = {}) {
    const replayReport = verifyRemoteReplay(input.replay || {})
    const checkpointReport = verifyRemoteCheckpoint({
      roomId: input.roomId || input.checkpoint?.roomId || null,
      participantId: input.participantId || input.checkpoint?.participantId || null,
      spectatorId: input.spectatorId || input.checkpoint?.spectatorId || null,
      sequence: Number(input.sequence) || Number(input.checkpoint?.sequence) || 0,
      serverTs: Number(input.serverTs) || Number(input.checkpoint?.ts) || 0,
      snapshotRef: input.snapshotRef || { snapshotHash: input.checkpoint?.checkpointHash || stableHash(input.checkpoint || {}) },
      checkpoint: input.checkpoint || {}
    })
    const reconnectReport = integrityLayer.verifyReconnect(input.previousRecovery || {}, input.nextRecovery || {})
    return freezeDeep({
      valid: replayReport.valid && checkpointReport.valid && reconnectReport.valid,
      replayReport,
      checkpointReport,
      reconnectReport,
      consistencyHash: stableHash({ replayReport, checkpointReport, reconnectReport })
    })
  }

  return Object.freeze({
    verifyRemoteCheckpoint,
    verifyRemoteReplay,
    reportDesync,
    validateConsistency
  })
}

export default { createIntegrityTransportBridge }