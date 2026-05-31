import { createReplayStreamAdapter } from "./replayStreamAdapter"
import { createReplayViewAdapter } from "./replayViewAdapter"
import { createReplayFrameBudgetScheduler } from "./replayFrameBudgetScheduler"
import { createReplayTimelineStateMachine } from "./replayTimelineStateMachine"
import { createReplayRenderInstrumentation } from "./replayRenderInstrumentation"
import { createReplaySyncContract, validateReplaySyncContract } from "./replaySyncContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeViewport = (viewport = {}) => ({
  start: Math.max(0, Number(viewport.start) || 0),
  end: Math.max(Math.max(0, Number(viewport.start) || 0), Number(viewport.end) || 0)
})

const estimateProjectionCost = (frame) => {
  const timelineCount = Array.isArray(frame?.frame?.timeline) ? frame.frame.timeline.length : 0
  const correctionCount = Array.isArray(frame?.frame?.corrections) ? frame.frame.corrections.length : 0
  const checkpointCount = Array.isArray(frame?.frame?.checkpoints) ? frame.frame.checkpoints.length : 0
  const markerCount = Array.isArray(frame?.frame?.markers) ? frame.frame.markers.length : 0
  return Number((1 + timelineCount * 0.04 + correctionCount * 0.12 + checkpointCount * 0.08 + markerCount * 0.03).toFixed(3))
}

export function createReplayRenderOrchestrator(options = {}) {
  const streamAdapter = options.streamAdapter || createReplayStreamAdapter({ maxEvents: options.maxEvents || 5000 })
  const viewAdapter = options.viewAdapter || createReplayViewAdapter(streamAdapter)
  const scheduler = options.scheduler || createReplayFrameBudgetScheduler({ frameBudgetMs: options.frameBudgetMs || 8 })
  const stateMachine = options.stateMachine || createReplayTimelineStateMachine({
    phase: "idle",
    syncMode: typeof options.syncMode === "string" ? options.syncMode : "local"
  })
  const instrumentation = options.instrumentation || createReplayRenderInstrumentation()

  let spectator = {
    id: typeof options.spectator?.id === "string" ? options.spectator.id : null,
    mode: typeof options.spectator?.mode === "string" ? options.spectator.mode : "spectator",
    connected: Boolean(options.spectator?.connected),
    lagMs: Math.max(0, Number(options.spectator?.lagMs) || 0)
  }
  let lastViewport = normalizeViewport(options.viewport || {})
  let lastFrame = null
  let lastSync = null
  let lastSchedule = null

  function captureState(action, extra = {}) {
    stateMachine.transition({
      type: action,
      viewport: extra.viewport ?? lastViewport,
      cursor: extra.cursor,
      replayHash: extra.replayHash,
      timelineLength: extra.timelineLength,
      frameHash: extra.frameHash,
      overBudgetMs: extra.overBudgetMs,
      spectatorCount: extra.spectatorCount,
      syncMode: extra.syncMode
    })
  }

  function render(viewport = lastViewport) {
    lastViewport = normalizeViewport(viewport)
    const projection = streamAdapter.getProjection()
    const frame = viewAdapter.getFrame(lastViewport)
    const schedule = scheduler.runFrame([
      {
        id: "projection",
        label: "projection",
        priority: 0,
        costMs: estimateProjectionCost(frame),
        meta: { viewport: lastViewport },
        run: () => frame
      },
      {
        id: "sync-boundary",
        label: "sync-boundary",
        priority: 1,
        costMs: 1,
        meta: { replayHash: projection?.replayHash || null },
        run: () => createReplaySyncContract({
          sessionId: options.sessionId || null,
          replayHash: projection?.replayHash || null,
          viewport: lastViewport,
          state: stateMachine.snapshot(),
          frame,
          schedule: scheduler.snapshot().lastFrame,
          cursor: frame?.frame?.timeline?.length || 0,
          spectator
        })
      }
    ])

    const sync = schedule.executed.find((entry) => entry.id === "sync-boundary")?.result || null
    lastSchedule = schedule
    lastSync = sync

    const performance = instrumentation.recordFrame({
      viewport: lastViewport,
      replayHash: projection?.replayHash || null,
      phase: stateMachine.snapshot().phase,
      frame,
      schedule,
      sync,
      frameHash: sync?.frameHash || null,
      syncToken: sync?.syncToken || null
    })

    lastFrame = freezeDeep({
      viewport: lastViewport,
      projection,
      frame,
      schedule,
      sync,
      performance,
      state: stateMachine.snapshot()
    })

    captureState("render", {
      viewport: lastViewport,
      cursor: frame?.frame?.timeline?.length || 0,
      replayHash: projection?.replayHash || null,
      timelineLength: frame?.frame?.timeline?.length || 0,
      frameHash: sync?.frameHash || null,
      overBudgetMs: schedule.overBudgetMs,
      syncMode: spectator.mode
    })

    if (sync) {
      captureState("sync", {
        viewport: lastViewport,
        cursor: frame?.frame?.timeline?.length || 0,
        replayHash: projection?.replayHash || null,
        timelineLength: frame?.frame?.timeline?.length || 0,
        frameHash: sync?.frameHash || null,
        syncMode: spectator.mode
      })
    }

    return lastFrame
  }

  function ingest(chunk) {
    const result = streamAdapter.ingest(chunk)
    const snapshot = streamAdapter.getSnapshot()
    captureState("ingest", {
      replayHash: snapshot.replayHash,
      timelineLength: snapshot.totalEvents,
      syncMode: spectator.mode
    })
    return freezeDeep({
      ingestion: result,
      render: render(lastViewport)
    })
  }

  function rewind(count) {
    const result = streamAdapter.rewind(count)
    const snapshot = streamAdapter.getSnapshot()
    captureState("rewind", {
      replayHash: snapshot.replayHash,
      cursor: Math.max(0, snapshot.totalEvents - 1),
      timelineLength: snapshot.totalEvents,
      syncMode: spectator.mode
    })
    return freezeDeep({
      rewind: result,
      render: render(lastViewport)
    })
  }

  function attachSpectator(nextSpectator = {}) {
    spectator = {
      id: typeof nextSpectator.id === "string" ? nextSpectator.id : spectator.id,
      mode: typeof nextSpectator.mode === "string" ? nextSpectator.mode : spectator.mode,
      connected: Boolean(nextSpectator.connected ?? spectator.connected),
      lagMs: Math.max(0, Number(nextSpectator.lagMs ?? spectator.lagMs) || 0)
    }
    captureState("attach", {
      spectatorCount: 1,
      syncMode: spectator.mode
    })
    return freezeDeep({ spectator })
  }

  function setViewport(viewport = {}) {
    lastViewport = normalizeViewport(viewport)
    captureState("seek", {
      viewport: lastViewport,
      cursor: lastFrame?.frame?.timeline?.length || 0,
      syncMode: spectator.mode
    })
    return render(lastViewport)
  }

  function getSnapshot() {
    return freezeDeep({
      viewport: lastViewport,
      frame: lastFrame,
      sync: lastSync,
      schedule: lastSchedule,
      state: stateMachine.snapshot(),
      performance: instrumentation.snapshot(),
      projection: streamAdapter.getProjection(),
      snapshot: streamAdapter.getSnapshot()
    })
  }

  function getTimelineState() {
    return stateMachine.snapshot()
  }

  function getPerformance() {
    return instrumentation.snapshot()
  }

  function getSyncContract() {
    return lastSync
  }

  function validateSync() {
    return validateReplaySyncContract(lastSync)
  }

  return Object.freeze({
    ingest,
    rewind,
    render,
    setViewport,
    attachSpectator,
    getSnapshot,
    getTimelineState,
    getPerformance,
    getSyncContract,
    validateSync
  })
}

export default { createReplayRenderOrchestrator }