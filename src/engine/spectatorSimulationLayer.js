import { stableHash } from "./replayConsumerValidation"
import { createReplayVisualizationCore } from "./replayVisualizationCore"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeViewport = (viewport = {}) => ({
  start: Math.max(0, Number(viewport.start) || 0),
  end: Math.max(Math.max(0, Number(viewport.start) || 0), Number(viewport.end) || 0)
})

const normalizePacket = (packet = {}) => freezeDeep({
  sequence: Math.max(0, Number(packet.sequence ?? packet.seq) || 0),
  replayHash: typeof packet.replayHash === "string" ? packet.replayHash : null,
  viewport: normalizeViewport(packet.viewport || {}),
  cursor: Math.max(0, Number(packet.cursor) || 0),
  latencyMs: Math.max(0, Number(packet.latencyMs) || 0),
  predictionEnabled: false,
  acknowledgedAt: Number.isFinite(Number(packet.acknowledgedAt)) ? Number(packet.acknowledgedAt) : null,
  snapshot: isPlainObject(packet.snapshot) ? packet.snapshot : null,
  repairHint: typeof packet.repairHint === "string" ? packet.repairHint : null
})

const classifyDesync = (expectedHash, packet) => {
  if (!packet) return freezeDeep({ kind: "missing-packet", severity: 3, reason: "no_packet" })
  if (expectedHash && packet.replayHash && expectedHash !== packet.replayHash) {
    return freezeDeep({ kind: "hash-mismatch", severity: 5, reason: "replay_hash" })
  }
  if (packet.sequence === 0) return freezeDeep({ kind: "in-sync", severity: 0, reason: null })
  return freezeDeep({ kind: "sequence-gap", severity: packet.sequence > 1 ? 2 : 1, reason: "packet_sequence" })
}

const buildCheckpoints = (frame) => {
  const checkpoints = Array.isArray(frame?.overlay?.markers) ? frame.overlay.markers : []
  const markers = Array.isArray(frame?.overlay?.ghost?.markers) ? frame.overlay.ghost.markers : []
  return freezeDeep({
    checkpointCount: checkpoints.length,
    markerCount: markers.length,
    checkpointTree: checkpoints.map((checkpoint, index) => freezeDeep({ index, t: checkpoint.t, label: checkpoint.label, hash: stableHash(checkpoint) })),
    verificationHash: stableHash({ checkpoints, markers })
  })
}

export function createRemoteSpectatorPacket(packet = {}) {
  return normalizePacket(packet)
}

export function createDeterministicSpectatorSimulation(replay, options = {}) {
  const core = options.core || createReplayVisualizationCore(replay, { viewport: options.viewport || { start: 0, end: Number.MAX_SAFE_INTEGER } })
  const replayHash = stableHash({ events: Array.isArray(replay?.events) ? replay.events : replay?.replay?.events || [] })
  const syncWindowMs = Math.max(1, Number(options.syncWindowMs) || 5000)
  const boundedWindow = Math.max(1, Number(options.boundedWindow) || 3)
  const repairPolicy = typeof options.repairPolicy === "string" ? options.repairPolicy : "bounded-replay"
  const state = {
    mode: "spectator",
    predictionEnabled: false,
    authorityBoundary: "replay-only",
    desyncs: [],
    packets: [],
    lastSequence: -1,
    repairPolicy,
    syncWindowMs,
    boundedWindow
  }

  function ingestPacket(packet) {
    const normalized = normalizePacket(packet)
    const desync = classifyDesync(replayHash, normalized)
    const frame = core.getFrame(normalized.viewport)
    const checkpoint = buildCheckpoints(frame)
    const repair = normalized.sequence > state.lastSequence + 1
      ? freezeDeep({ action: "bounded-repair", missing: normalized.sequence - state.lastSequence - 1, window: boundedWindow })
      : freezeDeep({ action: "accept", missing: 0, window: boundedWindow })
    const projection = freezeDeep({
      replayHash,
      packet: normalized,
      desync,
      repair,
      checkpoint,
      frame,
      immutable: true,
      predictionEnabled: false,
      syncWindowMs,
      boundary: state.authorityBoundary
    })
    state.packets.push(projection)
    state.desyncs.push(desync)
    state.lastSequence = Math.max(state.lastSequence, normalized.sequence)
    return projection
  }

  function reconcileSnapshot(packet) {
    const projection = ingestPacket(packet)
    return freezeDeep({
      reconciled: true,
      snapshot: projection.frame,
      checkpoint: projection.checkpoint,
      desync: projection.desync,
      authorityBoundary: state.authorityBoundary,
      syncWindowMs,
      replayHash
    })
  }

  function getProjection() {
    const latest = state.packets.at(-1) || null
    return freezeDeep({
      replayHash,
      mode: state.mode,
      predictionEnabled: state.predictionEnabled,
      authorityBoundary: state.authorityBoundary,
      syncWindowMs,
      boundedWindow,
      packetCount: state.packets.length,
      latest,
      desyncCount: state.desyncs.filter((entry) => entry.severity > 0).length
    })
  }

  function getAudit() {
    const severe = state.desyncs.filter((entry) => entry.severity >= 4).length
    const medium = state.desyncs.filter((entry) => entry.severity >= 2 && entry.severity < 4).length
    const confidence = Math.max(0, 1 - (severe * 0.35 + medium * 0.15))
    return freezeDeep({
      replayHash,
      confidence: Number(confidence.toFixed(3)),
      desyncCount: state.desyncs.length,
      severeDesyncCount: severe,
      mediumDesyncCount: medium,
      repairPolicy: state.repairPolicy,
      authorityBoundary: state.authorityBoundary
    })
  }

  return Object.freeze({
    ingestPacket,
    reconcileSnapshot,
    getProjection,
    getAudit,
    classifyDesync: (packet) => classifyDesync(replayHash, normalizePacket(packet)),
    getCheckpoints: () => buildCheckpoints(core.getSnapshot().frame),
    getReplayHash: () => replayHash
  })
}

export { classifyDesync }

export default { createRemoteSpectatorPacket, createDeterministicSpectatorSimulation }