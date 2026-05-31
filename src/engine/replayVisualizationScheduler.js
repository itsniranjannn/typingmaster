import { createReplayFrameBudgetScheduler } from "./replayFrameBudgetScheduler"
import { createReplayVisualizationCore } from "./replayVisualizationCore"

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

const densityScale = (density) => (density > 0.02 ? 0.5 : density > 0.01 ? 0.75 : 1)

export function createReplayVisualizationScheduler(replay, options = {}) {
  const core = options.core || createReplayVisualizationCore(replay, options)
  const scheduler = options.scheduler || createReplayFrameBudgetScheduler({ frameBudgetMs: options.frameBudgetMs || 8 })
  const renderQueue = []
  let lastViewport = normalizeViewport(options.viewport || { start: 0, end: Number.MAX_SAFE_INTEGER })
  let lastPlan = null

  function buildPlan(viewport = lastViewport, priority = 0) {
    const frame = core.getFrame(viewport)
    const density = frame.viewportSummary.density
    const scale = densityScale(density)
    const interpolationThrottle = density > 0.02 ? 2 : density > 0.01 ? 1.25 : 1
    const frameSkipping = density > 0.02 ? 1 : 0
    const tasks = [
      {
        id: "viewport",
        label: "viewport-priority",
        priority,
        costMs: Math.max(0.5, frame.visibleTimeline.length * 0.02),
        run: () => frame
      },
      {
        id: "ghost-layer",
        label: "ghost-layer",
        priority: priority + 1,
        costMs: Math.max(0.25, frame.markerClusters.length * 0.03),
        run: () => frame.overlay.ghost
      },
      {
        id: "timeline-chunks",
        label: "timeline-chunk-prioritization",
        priority: priority + 2,
        costMs: Math.max(0.25, frame.coalescedTimeline.length * 0.015),
        run: () => frame.coalescedTimeline
      }
    ]

    const schedule = scheduler.runFrame(tasks)
    return freezeDeep({
      viewport,
      density,
      adaptiveDensityScale: scale,
      frameSkippingPolicy: frameSkipping,
      interpolationThrottle,
      renderQueueLimit: 8,
      boundedRenderQueue: Math.min(8, renderQueue.length + 1),
      deterministicRenderOrder: schedule.executed.map((entry) => entry.id),
      frameReconstructionBudgetMs: schedule.budgetMs,
      renderDegradationPolicy: density > 0.02 ? "compact" : "full",
      schedule,
      frame
    })
  }

  function queueViewport(viewport = {}, priority = 0) {
    const normalized = normalizeViewport(viewport)
    renderQueue.push({ viewport: normalized, priority })
    renderQueue.sort((left, right) => left.priority - right.priority || left.viewport.start - right.viewport.start || left.viewport.end - right.viewport.end)
    if (renderQueue.length > 8) {
      renderQueue.splice(8)
    }
    const next = renderQueue.shift() || { viewport: normalized, priority }
    lastViewport = next.viewport
    lastPlan = buildPlan(next.viewport, next.priority)
    return lastPlan
  }

  function interpolateViewport(targetViewport = lastViewport) {
    const frame = core.getFrame(targetViewport)
    const source = lastPlan?.frame || frame
    return freezeDeep({
      viewport: targetViewport,
      interpolationThrottle: lastPlan?.interpolationThrottle || 1,
      interpolatedFrame: core.interpolate(source, 0.5),
      density: frame.viewportSummary.density
    })
  }

  function getMetrics() {
    return freezeDeep({
      lastViewport,
      lastPlan,
      queueLength: renderQueue.length,
      scheduler: scheduler.snapshot()
    })
  }

  return Object.freeze({
    queueViewport,
    interpolateViewport,
    getMetrics,
    getCoreSnapshot: () => core.getSnapshot()
  })
}

export default { createReplayVisualizationScheduler }