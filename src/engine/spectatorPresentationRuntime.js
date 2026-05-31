import { stableHash } from "./replayConsumerValidation"
import { createDeterministicSpectatorSimulation } from "./spectatorSimulationLayer"
import { createMultiplayerSimulationContracts } from "./multiplayerSimulationContracts"
import { createReplayRenderingRuntime } from "./replayRenderingRuntime"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeViewport = (viewport = {}) => {
  const start = Math.max(0, Number(viewport.start) || 0)
  const end = Math.max(start, Number(viewport.end) || start)
  return { start, end }
}

export function createSpectatorPresentationRuntime(replays, options = {}) {
  const contracts = options.contracts || createMultiplayerSimulationContracts(replays, options)
  const primaryRenderingRuntime = options.renderingRuntime || createReplayRenderingRuntime(replays?.[0] || {}, options)
  const simulations = (Array.isArray(replays) ? replays : []).map((replay, index) => createDeterministicSpectatorSimulation(replay, {
    viewport: options.viewport || {},
    boundedWindow: options.boundedWindow || 3,
    syncWindowMs: options.syncWindowMs || 5000,
    repairPolicy: options.repairPolicy || "bounded-replay"
  }))
  let lastViewport = normalizeViewport(options.viewport || { start: 0, end: Number.MAX_SAFE_INTEGER })
  let lastPresentation = null

  function render(viewport = lastViewport) {
    lastViewport = normalizeViewport(viewport)
    const primaryFrame = primaryRenderingRuntime.getFrame(lastViewport)
    const synchronizedGhosts = simulations.map((simulation) => simulation.ingestPacket({
      sequence: 0,
      replayHash: simulation.getReplayHash(),
      viewport: lastViewport,
      latencyMs: 0
    }))
    const ranking = freezeDeep({
      playerCount: contracts.playerTimelineContracts.length,
      ranking: contracts.deterministicRankingSnapshots.ranking,
      rankingHash: contracts.deterministicRankingSnapshots.rankingHash
    })
    const splitMarkers = contracts.multiReplayComposition.filter((event, index, array) => index > 0 && event.sourceId !== array[index - 1].sourceId)
    lastPresentation = freezeDeep({
      viewport: lastViewport,
      primaryFrame,
      synchronizedGhostPlayback: synchronizedGhosts,
      spectatorSafeRankingOverlays: ranking,
      raceProgressProjections: contracts.spectatorSafeAggregateProjection,
      finishOrderVisualization: contracts.finishOrderValidation,
      pacingComparisons: contracts.synchronizedGhostTimelines.map((entry) => freezeDeep({ playerId: entry.playerId, density: entry.density, markers: entry.markers })),
      correctionComparisonOverlays: contracts.synchronizedGhostTimelines.map((entry) => freezeDeep({ playerId: entry.playerId, ghost: entry.ghost })),
      synchronizedReplayAlignment: freezeDeep({ replayHashes: contracts.playerTimelineContracts.map((entry) => entry.replayHash), viewport: lastViewport }),
      replaySplitMarkers: freezeDeep(splitMarkers.map((event) => ({ sourceId: event.sourceId, t: event.t, type: event.type }))),
      deterministicSpectatorSummary: freezeDeep({
        presentationHash: stableHash({ viewport: lastViewport, ranking, splitMarkers, replays: contracts.playerTimelineContracts.map((entry) => entry.replayHash) }),
        playerCount: contracts.playerTimelineContracts.length,
        ghostCount: synchronizedGhosts.length
      })
    })
    return lastPresentation
  }

  function getSnapshot() {
    return freezeDeep({
      viewport: lastViewport,
      presentation: lastPresentation,
      contracts,
      runtimeHash: stableHash({ viewport: lastViewport, presentation: lastPresentation?.deterministicSpectatorSummary?.presentationHash || null })
    })
  }

  return Object.freeze({
    render,
    getSnapshot,
    getContracts: () => contracts,
    getPrimaryFrame: () => primaryRenderingRuntime.getSnapshot()
  })
}

export default { createSpectatorPresentationRuntime }