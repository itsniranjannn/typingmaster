import { stableHash } from "./replayConsumerValidation"
import { createReplayVisualizationCore, interpolateFrame, diffViewport, coalesceEvents, adaptViewportSummary } from "./replayVisualizationCore"
import { createReplayVisualizationScheduler } from "./replayVisualizationScheduler"
import { createCanvasRenderingAdapter } from "./canvasRenderingAdapter"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeViewport = (viewport = {}) => {
  const start = Math.max(0, Number(viewport.start) || 0)
  const end = Math.max(start, Number(viewport.end) || start)
  return { start, end }
}

const layerOrder = ["background", "viewport", "timeline", "ghost", "correction", "pacing", "density", "metrics"]

const buildRenderTree = (frame, viewport, previousFrame = null) => {
  const visibleTimeline = Array.isArray(frame?.visibleTimeline) ? frame.visibleTimeline : []
  const markerClusters = Array.isArray(frame?.markerClusters) ? frame.markerClusters : []
  const correctionHeatmap = Array.isArray(frame?.correctionHeatmap) ? frame.correctionHeatmap : []
  const densityBuckets = Array.isArray(frame?.densityBuckets) ? frame.densityBuckets : []
  const pacingVisualization = Array.isArray(frame?.pacingVisualization) ? frame.pacingVisualization : []
  const ghost = frame?.overlay?.ghost || null
  const sceneGraph = freezeDeep({
    id: "replay-scene",
    viewport,
    fingerprint: frame.fingerprint,
    layers: [
      {
        id: "background",
        kind: "fill",
        order: 0,
        nodes: [{ id: "background-0", kind: "clear", bounds: viewport }]
      },
      {
        id: "viewport",
        kind: "viewport",
        order: 1,
        nodes: [{ id: "viewport-0", kind: "clip", bounds: viewport, summary: frame.viewportSummary }]
      },
      {
        id: "timeline",
        kind: "timeline",
        order: 2,
        nodes: visibleTimeline.map((event) => ({ id: `event-${event.index}`, kind: event.type, t: event.t, label: event.label, payload: event.payload }))
      },
      {
        id: "ghost",
        kind: "overlay",
        order: 3,
        nodes: [
          { id: "ghost-projection", kind: "ghost", markers: ghost?.markers || [], progress: ghost?.progress || [], wpm: ghost?.wpm || [] },
          { id: "ghost-clusters", kind: "ghost-cluster", clusters: markerClusters }
        ]
      },
      {
        id: "correction",
        kind: "overlay",
        order: 4,
        nodes: correctionHeatmap.map((bucket, index) => ({ id: `correction-${index}`, kind: "heatmap", ...bucket }))
      },
      {
        id: "pacing",
        kind: "overlay",
        order: 5,
        nodes: pacingVisualization.map((bucket, index) => ({ id: `pacing-${index}`, kind: "pacing", ...bucket }))
      },
      {
        id: "density",
        kind: "overlay",
        order: 6,
        nodes: densityBuckets.map((bucket) => ({ id: `density-${bucket.bucket}`, kind: "density", ...bucket }))
      },
      {
        id: "metrics",
        kind: "overlay",
        order: 7,
        nodes: [
          { id: "metrics-0", kind: "metrics", eventCount: visibleTimeline.length, cacheKey: frame.fingerprint }
        ]
      }
    ]
  })

  const renderCommands = layerOrder.flatMap((layerId) => {
    const layer = sceneGraph.layers.find((entry) => entry.id === layerId)
    if (!layer) return []
    return layer.nodes.map((node, index) => freezeDeep({
      id: `${layerId}-${index}`,
      layer: layerId,
      order: layerOrder.indexOf(layerId),
      kind: node.kind,
      bounds: node.bounds || viewport,
      payload: node,
      zIndex: layerOrder.indexOf(layerId) * 100 + index
    }))
  })

  return freezeDeep({
    viewport,
    sceneGraph,
    renderCommands,
    renderBatches: layerOrder.map((layerId) => freezeDeep({
      layer: layerId,
      commands: renderCommands.filter((command) => command.layer === layerId),
      commandCount: renderCommands.filter((command) => command.layer === layerId).length
    })),
    frameDiff: previousFrame ? diffViewport(previousFrame.viewport, viewport, frame.visibleTimeline || []) : null,
    frameInterpolation: previousFrame ? interpolateFrame(previousFrame, frame, 0.5) : null,
    frameFingerprint: stableHash({ viewport, fingerprint: frame.fingerprint, commandCount: renderCommands.length }),
    densitySummary: adaptViewportSummary(frame.visibleTimeline || [], viewport, frame.densityBuckets || [])
  })
}

export function createReplayRenderingRuntime(replay, options = {}) {
  const core = options.core || createReplayVisualizationCore(replay, options)
  const scheduler = options.scheduler || createReplayVisualizationScheduler(replay, options)
  const adapter = options.adapter || createCanvasRenderingAdapter(options.adapterOptions || {})
  const maxFrameCache = Math.max(1, Number(options.maxFrameCache) || 32)
  const frameCache = new Map()
  let lastViewport = normalizeViewport(options.viewport || { start: 0, end: Number.MAX_SAFE_INTEGER })
  let lastRenderedFrame = null
  let invalidationCount = 0
  let renderCount = 0
  let droppedFrameEstimate = 0

  function cacheFrame(frame) {
    const key = stableHash({ viewport: frame.viewport, fingerprint: frame.frameFingerprint })
    if (!frameCache.has(key)) {
      frameCache.set(key, frame)
      while (frameCache.size > maxFrameCache) {
        const firstKey = frameCache.keys().next().value
        frameCache.delete(firstKey)
      }
    }
    return key
  }

  function renderFrame(viewport = lastViewport, options = {}) {
    const normalizedViewport = normalizeViewport(viewport)
    const plan = scheduler.queueViewport(normalizedViewport, Number(options.priority) || 0)
    const frame = plan.frame
    const previousFrame = lastRenderedFrame
    const interpolatedFrame = previousFrame ? interpolateFrame(previousFrame, frame, Math.min(1, Math.max(0, Number(options.interpolationRatio ?? 0.5)))) : null
    const renderTree = buildRenderTree(frame, normalizedViewport, previousFrame)
    const canvasProjection = adapter.projectFrame({ renderTree, viewport: normalizedViewport }, normalizedViewport)
    const invalidated = !previousFrame || previousFrame.frameFingerprint !== renderTree.frameFingerprint || previousFrame.viewport.start !== normalizedViewport.start || previousFrame.viewport.end !== normalizedViewport.end
    invalidationCount += invalidated ? 1 : 0
    renderCount += 1
    droppedFrameEstimate += plan.schedule.withinBudget ? 0 : 1
    lastViewport = normalizedViewport
    lastRenderedFrame = freezeDeep({
      viewport: normalizedViewport,
      renderTree,
      canvasProjection,
      interpolatedFrame,
      plan,
      invalidated,
      renderIndex: renderCount,
      frameFingerprint: renderTree.frameFingerprint
    })
    cacheFrame(lastRenderedFrame)
    return lastRenderedFrame
  }

  function getFrame(viewport = lastViewport) {
    return renderFrame(viewport)
  }

  function invalidate(viewport = lastViewport, reason = "manual") {
    invalidationCount += 1
    return freezeDeep({
      viewport: normalizeViewport(viewport),
      reason,
      invalidationCount
    })
  }

  function getSnapshot() {
    const cachedFrames = [...frameCache.values()]
    const coreSnapshot = core.getSnapshot()
    return freezeDeep({
      lastViewport,
      lastRenderedFrame,
      renderCount,
      invalidationCount,
      droppedFrameEstimate,
      frameCacheMetrics: freezeDeep({
        cacheSize: frameCache.size,
        maxFrameCache,
        frameHashes: cachedFrames.map((frame) => frame.frameFingerprint)
      }),
      adapterContracts: adapter.getAdapterContracts(),
      coreSnapshot,
      schedulerMetrics: scheduler.getMetrics(),
      adaptiveDensityRendering: adaptViewportSummary(coreSnapshot.frame?.visibleTimeline || [], lastViewport, coreSnapshot.frame?.densityBuckets || [])
    })
  }

  return Object.freeze({
    renderFrame,
    getFrame,
    invalidate,
    getSnapshot,
    getCoreSnapshot: () => core.getSnapshot(),
    getSchedulerMetrics: () => scheduler.getMetrics(),
    getCacheMetrics: () => getSnapshot().frameCacheMetrics
  })
}

export { buildRenderTree }

export default { createReplayRenderingRuntime }