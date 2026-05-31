import { stableHash } from "./replayConsumerValidation"
import { createRaceCountdown, createRaceCheckpoint } from "./multiplayerDomainModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const boundedPush = (items, value, limit) => {
  const next = [...items, value]
  return next.length <= limit ? next : next.slice(next.length - limit)
}

export function createRaceCountdownEngine(options = {}) {
  const checkpointEveryMs = Math.max(100, Number(options.checkpointEveryMs) || 250)
  const maxCheckpoints = Math.max(4, Number(options.maxCheckpoints) || 128)
  const driftToleranceMs = Math.max(0, Number(options.driftToleranceMs) || 32)

  let state = freezeDeep({
    countdown: createRaceCountdown({ phase: "pending", durationMs: Math.max(0, Number(options.durationMs) || 3000), remainingMs: Math.max(0, Number(options.durationMs) || 3000) }),
    checkpoints: []
  })

  function start(serverTs, durationMs = state.countdown.durationMs) {
    state = freezeDeep({
      countdown: createRaceCountdown({
        phase: "running",
        startAtServerTs: Math.max(0, Number(serverTs) || 0),
        correctedAtServerTs: Math.max(0, Number(serverTs) || 0),
        durationMs: Math.max(0, Number(durationMs) || 0),
        remainingMs: Math.max(0, Number(durationMs) || 0),
        driftMs: 0,
        checkpointSeq: 0
      }),
      checkpoints: []
    })
    return state
  }

  function tick({ serverTs = 0, clientTs = 0 } = {}) {
    const current = state.countdown
    if (current.phase !== "running") return state
    const elapsedServer = Math.max(0, Number(serverTs) - current.startAtServerTs)
    const elapsedClient = Math.max(0, Number(clientTs) - current.startAtServerTs)
    const driftMs = Number((elapsedClient - elapsedServer).toFixed(3))
    const correctedDrift = Math.abs(driftMs) > driftToleranceMs ? driftMs : 0
    const remainingMs = Math.max(0, current.durationMs - elapsedServer - correctedDrift)
    const checkpointSeq = Math.floor(elapsedServer / checkpointEveryMs)
    const countdown = createRaceCountdown({
      phase: remainingMs === 0 ? "finished" : "running",
      startAtServerTs: current.startAtServerTs,
      durationMs: current.durationMs,
      remainingMs,
      driftMs,
      correctedAtServerTs: Math.max(0, Number(serverTs) || 0),
      checkpointSeq
    })
    const checkpoint = createRaceCheckpoint({
      sequence: checkpointSeq,
      participantId: "countdown",
      ts: Math.max(0, Number(serverTs) || 0),
      wordsCompleted: current.durationMs - remainingMs,
      totalWords: current.durationMs,
      checkpointHash: stableHash({ checkpointSeq, remainingMs, driftMs })
    })
    state = freezeDeep({
      countdown,
      checkpoints: boundedPush(state.checkpoints, checkpoint, maxCheckpoints)
    })
    return state
  }

  function getReplayCompatibleSnapshot() {
    return freezeDeep({
      countdown: state.countdown,
      checkpoints: state.checkpoints,
      spectatorCompatible: true,
      replayCompatible: true,
      countdownHash: stableHash(state)
    })
  }

  return Object.freeze({
    start,
    tick,
    getSnapshot: () => state,
    getReplayCompatibleSnapshot
  })
}

export default { createRaceCountdownEngine }