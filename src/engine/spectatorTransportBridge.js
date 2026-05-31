import { stableHash } from "./replayConsumerValidation"
import { createReplayConsumer } from "./replayConsumer"
import { computeGhostProjection } from "./ghostProjectionEngine"
import { createDeterministicSpectatorSimulation } from "./spectatorSimulationLayer"
import { createSpectatorPresentationRuntime } from "./spectatorPresentationRuntime"
import { createReconnectRecoveryEngine } from "./reconnectRecoveryEngine"
import { createTransportPacket, NETWORK_EVENT_TYPES, TRANSPORT_CHANNELS } from "./transportContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

export function createSpectatorTransportBridge(options = {}) {
  const replay = options.replay || { events: [] }
  const consumer = options.consumer || createReplayConsumer(replay)
  const ghostProjection = options.ghostProjection || computeGhostProjection(replay)
  const simulation = options.spectatorSimulation || createDeterministicSpectatorSimulation(replay, options.simulationOptions || {})
  const presentation = options.presentationRuntime || createSpectatorPresentationRuntime([replay].concat(Array.isArray(options.ghostReplays) ? options.ghostReplays : []), options.presentationOptions || {})
  const recovery = options.reconnectRecoveryEngine || createReconnectRecoveryEngine(options.recoveryOptions || {})
  const transportNodeId = typeof options.nodeId === "string" ? options.nodeId : "spectator-bridge"

  const syncGhosts = (viewport = {}) => {
    const presentationSnapshot = presentation.render(viewport)
    const projection = simulation.getProjection()
    return freezeDeep({
      viewport,
      presentation: presentationSnapshot,
      spectator: projection,
      ghostProjection,
      replayHash: simulation.getReplayHash(),
      syncHash: stableHash({ viewport, presentationSnapshot, projection })
    })
  }

  const routeSpectatorPacket = (packet = {}, targetIds = []) => {
    const payload = packet.payload || {}
    const normalized = createTransportPacket({
      ...packet,
      sourceId: transportNodeId,
      channel: TRANSPORT_CHANNELS.SPECTATOR,
      eventType: packet.eventType || NETWORK_EVENT_TYPES.SPECTATOR_SYNC,
      payload: { ...payload, ghostProjection: ghostProjection }
    })
    return freezeDeep({ packet: normalized, targetIds: Array.isArray(targetIds) ? targetIds.slice().sort() : [], replayCompatible: true })
  }

  const spectatorRecovery = (input = {}) => {
    const token = recovery.issueReconnectToken({ roomId: input.roomId || null, participantId: input.spectatorId || transportNodeId, sequence: Number(input.sequence) || 0, snapshotHash: simulation.getReplayHash(), issuedAt: Number(input.issuedAt) || 0 })
    const recoverySnapshot = recovery.recover({ roomId: input.roomId || null, participantId: input.spectatorId || transportNodeId, token: token.token, fromSequence: Number(input.fromSequence) || 0 })
    return freezeDeep({
      token,
      recovery: recoverySnapshot,
      replayHash: simulation.getReplayHash()
    })
  }

  const detectDesync = (packet = {}) => {
    const classification = simulation.classifyDesync(packet)
    return freezeDeep({
      packet,
      classification,
      replayHash: simulation.getReplayHash(),
      desyncHash: stableHash({ packet, classification, replayHash: simulation.getReplayHash() })
    })
  }

  const getSnapshot = () => freezeDeep({
    replayHash: simulation.getReplayHash(),
    consumer: consumer.getSnapshot(),
    ghostProjection,
    spectator: simulation.getProjection(),
    presentation: presentation.getSnapshot(),
    recovery: recovery.getSnapshot(),
    bridgeHash: stableHash({ replayHash: simulation.getReplayHash(), spectator: simulation.getProjection(), presentation: presentation.getSnapshot() })
  })

  return Object.freeze({
    syncGhosts,
    routeSpectatorPacket,
    spectatorRecovery,
    detectDesync,
    getSnapshot
  })
}

export default { createSpectatorTransportBridge }