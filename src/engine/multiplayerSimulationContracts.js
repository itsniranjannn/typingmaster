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

const normalizeReplay = (replay, index) => {
  const events = Array.isArray(replay?.events) ? replay.events : Array.isArray(replay?.replay?.events) ? replay.replay.events : []
  const meta = isPlainObject(replay?.meta) ? replay.meta : isPlainObject(replay?.replay?.meta) ? replay.replay.meta : {}
  return freezeDeep({
    index,
    id: typeof replay?.id === "string" ? replay.id : `replay-${index}`,
    events,
    meta,
    replayHash: stableHash({ events, meta })
  })
}

const buildPlayerTimelineContract = (replay, index) => {
  const normalized = normalizeReplay(replay, index)
  const finishTs = normalized.events.at(-1)?.t ?? normalized.events.at(-1)?.ts ?? null
  return freezeDeep({
    playerId: normalized.id,
    replayHash: normalized.replayHash,
    eventCount: normalized.events.length,
    finishTs,
    latencyMs: Math.max(0, Number(replay?.latencyMs || replay?.meta?.latencyMs) || 0),
    antiTamper: stableHash({ playerId: normalized.id, replayHash: normalized.replayHash, eventCount: normalized.events.length })
  })
}

const composeMultiReplayTimeline = (replays) => {
  const timelines = (Array.isArray(replays) ? replays : []).map((replay, index) => {
    const normalized = normalizeReplay(replay, index)
    return normalized.events.map((event, eventIndex) => freezeDeep({
      sourceId: normalized.id,
      sourceIndex: index,
      index: eventIndex,
      t: Number.isFinite(Number(event.t)) ? Number(event.t) : Number(event.ts) || eventIndex,
      type: event.type || "event",
      payload: event.payload || event
    }))
  })
  return timelines.flat().sort((left, right) => left.t - right.t || left.sourceIndex - right.sourceIndex || left.index - right.index)
}

const buildSynchronizedGhostTimelines = (replays) => {
  return (Array.isArray(replays) ? replays : []).map((replay, index) => {
    const normalized = normalizeReplay(replay, index)
    const core = createReplayVisualizationCore(normalized)
    return freezeDeep({
      playerId: normalized.id,
      replayHash: normalized.replayHash,
      ghost: core.getSnapshot().frame.overlay.ghost,
      markers: core.getSnapshot().markerClusters,
      density: core.getSnapshot().densityBuckets
    })
  })
}

const reconstructRaceState = (replayContracts) => {
  const ordered = [...replayContracts].sort((left, right) => (left.finishTs ?? Number.POSITIVE_INFINITY) - (right.finishTs ?? Number.POSITIVE_INFINITY) || left.replayHash.localeCompare(right.replayHash))
  return freezeDeep({
    standings: ordered.map((entry, index) => freezeDeep({ playerId: entry.playerId, rank: index + 1, finishTs: entry.finishTs, replayHash: entry.replayHash })),
    finishOrderHash: stableHash(ordered.map((entry) => entry.replayHash))
  })
}

const buildDeterministicRankingSnapshots = (raceState) => {
  return freezeDeep({
    replayHash: raceState.finishOrderHash,
    ranking: raceState.standings.map((entry) => freezeDeep({ playerId: entry.playerId, rank: entry.rank, finishTs: entry.finishTs })),
    rankingHash: stableHash(raceState.standings)
  })
}

const validateFinishOrder = (raceState) => {
  const finishTs = raceState.standings.map((entry) => entry.finishTs ?? Number.POSITIVE_INFINITY)
  const monotonic = finishTs.every((value, index) => index === 0 || value >= finishTs[index - 1])
  return freezeDeep({
    valid: monotonic,
    finishOrderHash: raceState.finishOrderHash,
    reason: monotonic ? null : "non-monotonic-finish-order"
  })
}

const buildSpectatorSafeAggregateProjection = (replayContracts, ghostTimelines, raceState) => {
  const totalEvents = replayContracts.reduce((sum, contract) => sum + contract.eventCount, 0)
  return freezeDeep({
    playerCount: replayContracts.length,
    totalEvents,
    finishOrderHash: raceState.finishOrderHash,
    ghostTimelineCount: ghostTimelines.length,
    spectatorSafe: true,
    aggregateHash: stableHash({ replayContracts, raceState })
  })
}

const computeReplayMergeBoundary = (replayContracts) => freezeDeep({
  mergeHash: stableHash(replayContracts.map((contract) => ({ playerId: contract.playerId, replayHash: contract.replayHash, eventCount: contract.eventCount }))),
  replayHashes: replayContracts.map((contract) => contract.replayHash),
  eventCounts: replayContracts.map((contract) => contract.eventCount)
})

const buildLatencyMetadata = (replayContracts) => freezeDeep({
  averageLatencyMs: Number((replayContracts.reduce((sum, contract) => sum + contract.latencyMs, 0) / Math.max(1, replayContracts.length)).toFixed(3)),
  maxLatencyMs: replayContracts.reduce((max, contract) => Math.max(max, contract.latencyMs), 0)
})

const buildAntiTamperReplayVerificationHook = (replayContracts) => freezeDeep({
  fingerprint: stableHash(replayContracts),
  integrity: replayContracts.map((contract) => freezeDeep({ playerId: contract.playerId, antiTamper: contract.antiTamper, replayHash: contract.replayHash }))
})

export function createMultiplayerSimulationContracts(replays, options = {}) {
  const replayContracts = (Array.isArray(replays) ? replays : []).map(buildPlayerTimelineContract)
  const ghostTimelines = buildSynchronizedGhostTimelines(replays)
  const raceState = reconstructRaceState(replayContracts)
  const rankingSnapshots = buildDeterministicRankingSnapshots(raceState)
  const aggregateProjection = buildSpectatorSafeAggregateProjection(replayContracts, ghostTimelines, raceState)
  const mergeBoundary = computeReplayMergeBoundary(replayContracts)
  const latencyMetadata = buildLatencyMetadata(replayContracts)
  const antiTamperHook = buildAntiTamperReplayVerificationHook(replayContracts)

  return freezeDeep({
    playerTimelineContracts: replayContracts,
    multiReplayComposition: composeMultiReplayTimeline(replays),
    synchronizedGhostTimelines: ghostTimelines,
    raceState,
    deterministicRankingSnapshots: rankingSnapshots,
    finishOrderValidation: validateFinishOrder(raceState),
    spectatorSafeAggregateProjection: aggregateProjection,
    replayMergeBoundary: mergeBoundary,
    latencyMetadata,
    antiTamperReplayVerificationHooks: antiTamperHook,
    options: freezeDeep({
      spectatorSafe: true,
      localOnly: true,
      mergePolicy: typeof options.mergePolicy === "string" ? options.mergePolicy : "bounded"
    })
  })
}

export {
  buildPlayerTimelineContract,
  composeMultiReplayTimeline,
  buildSynchronizedGhostTimelines,
  reconstructRaceState,
  buildDeterministicRankingSnapshots,
  validateFinishOrder,
  buildSpectatorSafeAggregateProjection,
  computeReplayMergeBoundary,
  buildLatencyMetadata,
  buildAntiTamperReplayVerificationHook
}

export default { createMultiplayerSimulationContracts }