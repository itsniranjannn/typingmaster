function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

export const REPLAY_TIMELINE_PHASES = Object.freeze({
  IDLE: "idle",
  BUFFERING: "buffering",
  READY: "ready",
  RENDERING: "rendering",
  SYNCED: "synced",
  PAUSED: "paused",
  ENDED: "ended"
})

const normalizeViewport = (viewport = {}) => ({
  start: Math.max(0, Number(viewport.start) || 0),
  end: Math.max(Math.max(0, Number(viewport.start) || 0), Number(viewport.end) || 0)
})

export function createReplayTimelineStateMachine(initialState = {}) {
  let state = freezeDeep({
    phase: typeof initialState.phase === "string" ? initialState.phase : REPLAY_TIMELINE_PHASES.IDLE,
    revision: Math.max(0, Number(initialState.revision) || 0),
    cursor: Math.max(0, Number(initialState.cursor) || 0),
    viewport: normalizeViewport(initialState.viewport),
    replayHash: typeof initialState.replayHash === "string" ? initialState.replayHash : null,
    syncMode: typeof initialState.syncMode === "string" ? initialState.syncMode : "local",
    spectatorCount: Math.max(0, Number(initialState.spectatorCount) || 0),
    renderCount: Math.max(0, Number(initialState.renderCount) || 0),
    lastTimelineLength: Math.max(0, Number(initialState.lastTimelineLength) || 0),
    lastFrameHash: typeof initialState.lastFrameHash === "string" ? initialState.lastFrameHash : null,
    lastOverBudgetMs: Math.max(0, Number(initialState.lastOverBudgetMs) || 0),
    lastAction: "init"
  })

  function transition(event = {}) {
    const type = typeof event.type === "string" ? event.type : "noop"
    const next = {
      ...state,
      revision: state.revision + 1,
      lastAction: type
    }

    switch (type) {
      case "reset":
        next.phase = REPLAY_TIMELINE_PHASES.IDLE
        next.cursor = 0
        next.viewport = normalizeViewport(event.viewport || {})
        next.replayHash = typeof event.replayHash === "string" ? event.replayHash : null
        next.syncMode = typeof event.syncMode === "string" ? event.syncMode : next.syncMode
        next.spectatorCount = 0
        next.renderCount = 0
        next.lastTimelineLength = 0
        next.lastFrameHash = null
        next.lastOverBudgetMs = 0
        break
      case "attach":
        next.phase = REPLAY_TIMELINE_PHASES.BUFFERING
        next.syncMode = typeof event.syncMode === "string" ? event.syncMode : next.syncMode
        next.spectatorCount = Math.max(0, Number(event.spectatorCount ?? next.spectatorCount) || 0)
        break
      case "ingest":
        next.phase = REPLAY_TIMELINE_PHASES.READY
        next.replayHash = typeof event.replayHash === "string" ? event.replayHash : next.replayHash
        next.lastTimelineLength = Math.max(0, Number(event.timelineLength ?? next.lastTimelineLength) || 0)
        break
      case "render":
        next.phase = REPLAY_TIMELINE_PHASES.RENDERING
        next.cursor = Math.max(0, Number(event.cursor ?? next.cursor) || 0)
        next.viewport = normalizeViewport(event.viewport ?? next.viewport)
        next.lastFrameHash = typeof event.frameHash === "string" ? event.frameHash : next.lastFrameHash
        next.lastOverBudgetMs = Math.max(0, Number(event.overBudgetMs ?? next.lastOverBudgetMs) || 0)
        next.renderCount = next.renderCount + 1
        break
      case "sync":
        next.phase = REPLAY_TIMELINE_PHASES.SYNCED
        next.cursor = Math.max(0, Number(event.cursor ?? next.cursor) || 0)
        next.viewport = normalizeViewport(event.viewport ?? next.viewport)
        next.syncMode = typeof event.syncMode === "string" ? event.syncMode : next.syncMode
        break
      case "pause":
        next.phase = REPLAY_TIMELINE_PHASES.PAUSED
        break
      case "play":
        next.phase = REPLAY_TIMELINE_PHASES.RENDERING
        break
      case "seek":
        next.phase = REPLAY_TIMELINE_PHASES.READY
        next.cursor = Math.max(0, Number(event.cursor ?? next.cursor) || 0)
        next.viewport = normalizeViewport(event.viewport ?? next.viewport)
        break
      case "rewind":
        next.phase = REPLAY_TIMELINE_PHASES.BUFFERING
        next.cursor = Math.max(0, Number(event.cursor ?? 0) || 0)
        break
      case "spectator":
        next.phase = REPLAY_TIMELINE_PHASES.SYNCED
        next.spectatorCount = Math.max(0, Number(event.spectatorCount ?? next.spectatorCount) || 0)
        next.syncMode = typeof event.syncMode === "string" ? event.syncMode : next.syncMode
        break
      case "complete":
        next.phase = REPLAY_TIMELINE_PHASES.ENDED
        break
      default:
        break
    }

    state = freezeDeep(next)
    return state
  }

  function snapshot() {
    return state
  }

  function reset() {
    state = freezeDeep({
      phase: REPLAY_TIMELINE_PHASES.IDLE,
      revision: 0,
      cursor: 0,
      viewport: normalizeViewport({}),
      replayHash: null,
      syncMode: "local",
      spectatorCount: 0,
      renderCount: 0,
      lastTimelineLength: 0,
      lastFrameHash: null,
      lastOverBudgetMs: 0,
      lastAction: "reset"
    })
    return state
  }

  return Object.freeze({
    transition,
    snapshot,
    reset
  })
}

export default { createReplayTimelineStateMachine, REPLAY_TIMELINE_PHASES }