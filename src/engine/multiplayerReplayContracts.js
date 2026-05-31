import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeReplaySummary = (replaySummary = {}) => freezeDeep({
  id: typeof replaySummary.id === "string" ? replaySummary.id : "session",
  meta: replaySummary.meta && typeof replaySummary.meta === "object" ? replaySummary.meta : {},
  config: replaySummary.config && typeof replaySummary.config === "object" ? replaySummary.config : {},
  metrics: replaySummary.metrics && typeof replaySummary.metrics === "object" ? replaySummary.metrics : {},
  flushedBatches: Array.isArray(replaySummary.flushedBatches) ? replaySummary.flushedBatches : [],
  events: Array.isArray(replaySummary.events) ? replaySummary.events : []
})

export function createMultiplayerReplayEnvelope(replaySummary, metadata = {}) {
  const normalized = normalizeReplaySummary(replaySummary)
  const participantTimelines = Array.isArray(metadata.participantTimelines) ? metadata.participantTimelines : []
  const spectatorTimelines = Array.isArray(metadata.spectatorTimelines) ? metadata.spectatorTimelines : []
  const raceCheckpoints = Array.isArray(metadata.raceCheckpoints) ? metadata.raceCheckpoints : []
  const transportMetadata = metadata.transportMetadata && typeof metadata.transportMetadata === "object" ? metadata.transportMetadata : {}
  const multiplayer = freezeDeep({
    schemaVersion: 1,
    roomId: typeof metadata.roomId === "string" ? metadata.roomId : null,
    raceState: typeof metadata.raceState === "string" ? metadata.raceState : "CREATED",
    participantTimelines,
    spectatorTimelines,
    raceCheckpoints,
    transportMetadata,
    metadataHash: stableHash({ roomId: metadata.roomId || null, raceState: metadata.raceState || "CREATED", participantTimelines, spectatorTimelines, raceCheckpoints, transportMetadata })
  })
  return freezeDeep({
    ...normalized,
    multiplayer
  })
}

export function isBackwardCompatibleReplayEnvelope(envelope) {
  const required = ["id", "meta", "config", "metrics", "flushedBatches", "events"]
  const compatible = required.every((key) => Object.prototype.hasOwnProperty.call(envelope || {}, key))
  return freezeDeep({
    compatible,
    hasMultiplayer: Boolean(envelope?.multiplayer),
    replayHash: stableHash({ id: envelope?.id || null, events: envelope?.events || [], metrics: envelope?.metrics || {} })
  })
}

export function buildParticipantTimelines(participantSnapshots = []) {
  const timelines = (Array.isArray(participantSnapshots) ? participantSnapshots : [])
    .map((entry, index) => freezeDeep({
      participantId: entry?.id || `participant-${index}`,
      sequence: Math.max(0, Number(entry?.sequence) || index),
      ts: Math.max(0, Number(entry?.serverTs) || 0),
      state: entry?.state || {},
      hash: stableHash(entry || {})
    }))
    .sort((left, right) => left.sequence - right.sequence || left.ts - right.ts || left.hash.localeCompare(right.hash))
  return freezeDeep(timelines)
}

export function buildSpectatorTimelines(spectatorSnapshots = []) {
  const timelines = (Array.isArray(spectatorSnapshots) ? spectatorSnapshots : [])
    .map((entry, index) => freezeDeep({
      spectatorId: entry?.id || `spectator-${index}`,
      sequence: Math.max(0, Number(entry?.sequence) || index),
      ts: Math.max(0, Number(entry?.serverTs) || 0),
      focusParticipantId: entry?.focusParticipantId || null,
      lagMs: Math.max(0, Number(entry?.lagMs) || 0),
      hash: stableHash(entry || {})
    }))
    .sort((left, right) => left.sequence - right.sequence || left.ts - right.ts || left.hash.localeCompare(right.hash))
  return freezeDeep(timelines)
}

export default {
  createMultiplayerReplayEnvelope,
  isBackwardCompatibleReplayEnvelope,
  buildParticipantTimelines,
  buildSpectatorTimelines
}