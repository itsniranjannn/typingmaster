import { computeGhostProjection } from "./ghostProjectionEngine"
import { stableHash } from "./replayConsumerValidation"
import * as ghostTimelineAnalysis from "./ghostTimelineAnalysis"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeReplay = (replay) => {
  if (!replay || typeof replay !== "object") return { events: [], meta: {}, replayHash: "" }
  const events = Array.isArray(replay.events)
    ? replay.events
    : Array.isArray(replay.replay?.events)
      ? replay.replay.events
      : []
  const meta = isPlainObject(replay.meta) ? replay.meta : isPlainObject(replay.replay?.meta) ? replay.replay.meta : {}
  return { events, meta, replayHash: stableHash({ events, meta }) }
}

const normalizeViewport = (viewport = {}) => {
  const start = Math.max(0, Number(viewport.start) || 0)
  const end = Math.max(start, Number(viewport.end) || start)
  return { start, end }
}

const normalizeEvent = (event, index) => {
  const base = isPlainObject(event?.payload) ? event.payload : event || {}
  const type = event?.type === "key" && (event.backspace || event.correct === false)
    ? "correction"
    : event?.type === "key"
      ? "input"
      : event?.type || "event"
  const t = Number.isFinite(Number(event?.t)) ? Number(event.t) : Number.isFinite(Number(event?.ts)) ? Number(event.ts) : index
  return freezeDeep({
    index,
    t,
    type,
    label: typeof base.label === "string" ? base.label : typeof base.name === "string" ? base.name : type,
    payload: base,
    raw: event
  })
}

const coalesceEvents = (timeline, bucketMs = 120) => {
  const coalesced = []
  for (const event of timeline) {
    const previous = coalesced.at(-1)
    if (previous && previous.type === event.type && Math.abs(event.t - previous.endT) <= bucketMs) {
      previous.count += 1
      previous.endT = Math.max(previous.endT, event.t)
      previous.indices.push(event.index)
      continue
    }
    coalesced.push({
      type: event.type,
      startT: event.t,
      endT: event.t,
      count: 1,
      indices: [event.index]
    })
  }
  return coalesced.map(freezeDeep)
}

const diffViewport = (previousViewport, nextViewport, timeline) => {
  const previous = normalizeViewport(previousViewport)
  const next = normalizeViewport(nextViewport)
  const visible = (range) => timeline.filter((event) => event.t >= range.start && event.t <= range.end)
  const previousVisible = visible(previous)
  const nextVisible = visible(next)
  return freezeDeep({
    previous,
    next,
    deltaStart: next.start - previous.start,
    deltaEnd: next.end - previous.end,
    added: nextVisible.filter((event) => !previousVisible.some((match) => match.index === event.index)).length,
    removed: previousVisible.filter((event) => !nextVisible.some((match) => match.index === event.index)).length,
    overlap: nextVisible.filter((event) => previousVisible.some((match) => match.index === event.index)).length
  })
}

const interpolateFrame = (leftFrame, rightFrame, ratio = 0.5) => {
  const safeRatio = Math.min(1, Math.max(0, Number(ratio) || 0))
  const lerp = (left, right) => Number((left + (right - left) * safeRatio).toFixed(3))
  const leftProgress = Number(leftFrame?.progress || 0)
  const rightProgress = Number(rightFrame?.progress || 0)
  return freezeDeep({
    ratio: safeRatio,
    progress: lerp(leftProgress, rightProgress),
    cursor: Math.round(lerp(Number(leftFrame?.cursor || 0), Number(rightFrame?.cursor || 0))),
    density: lerp(Number(leftFrame?.density || 0), Number(rightFrame?.density || 0)),
    viewport: rightFrame?.viewport || leftFrame?.viewport || { start: 0, end: 0 }
  })
}

const clusterMarkers = (markers, thresholdMs = 250) => {
  const sorted = [...(Array.isArray(markers) ? markers : [])].sort((left, right) => left.t - right.t || (left.idx || 0) - (right.idx || 0))
  const clusters = []
  for (const marker of sorted) {
    const previous = clusters.at(-1)
    if (previous && marker.t - previous.endT <= thresholdMs) {
      previous.endT = Math.max(previous.endT, marker.t)
      previous.count += 1
      previous.indices.push(marker.idx ?? marker.index ?? 0)
      continue
    }
    clusters.push({
      startT: marker.t,
      endT: marker.t,
      count: 1,
      indices: [marker.idx ?? marker.index ?? 0]
    })
  }
  return clusters.map(freezeDeep)
}

const buildCorrectionHeatmap = (timeline, bucketSize = 5) => {
  const buckets = []
  const input = timeline.filter((event) => event.type === "correction")
  for (let index = 0; index < input.length; index += bucketSize) {
    const slice = input.slice(index, index + bucketSize)
    buckets.push({
      startIndex: index,
      endIndex: index + slice.length - 1,
      count: slice.length,
      intensity: Number((slice.length / Math.max(1, bucketSize)).toFixed(3))
    })
  }
  return buckets.map(freezeDeep)
}

const bucketDensity = (timeline, bucketMs = 1000) => {
  const buckets = new Map()
  for (const event of timeline) {
    const key = Math.floor(event.t / Math.max(1, bucketMs))
    const current = buckets.get(key) || { bucket: key, startT: key * bucketMs, endT: key * bucketMs, count: 0 }
    current.count += 1
    current.endT = event.t
    buckets.set(key, current)
  }
  return [...buckets.values()].sort((left, right) => left.bucket - right.bucket).map((bucket) => freezeDeep({ ...bucket }))
}

const summarizeViewport = (timeline, viewport) => {
  const normalized = normalizeViewport(viewport)
  const visible = timeline.filter((event) => event.t >= normalized.start && event.t <= normalized.end)
  return freezeDeep({
    viewport: normalized,
    eventCount: visible.length,
    density: visible.length / Math.max(1, normalized.end - normalized.start || 1),
    startIndex: visible[0]?.index ?? null,
    endIndex: visible.at(-1)?.index ?? null
  })
}

const adaptViewportSummary = (timeline, viewport, densityBuckets) => {
  const summary = summarizeViewport(timeline, viewport)
  const bucketCount = densityBuckets.length
  const adaptiveScale = bucketCount > 8 ? 0.5 : bucketCount > 4 ? 0.75 : 1
  return freezeDeep({
    ...summary,
    adaptiveScale,
    summaryMode: bucketCount > 8 ? "compact" : bucketCount > 4 ? "balanced" : "full"
  })
}

const sampleTimeline = (timeline, maxPoints) => {
  const limit = Math.max(1, Number(maxPoints) || 1)
  if (timeline.length <= limit) return timeline
  const step = Math.max(1, Math.floor(timeline.length / limit))
  const sampled = []
  for (let index = 0; index < timeline.length; index += step) {
    sampled.push(timeline[index])
    if (sampled.length >= limit - 1) break
  }
  if (sampled.at(-1) !== timeline.at(-1)) {
    sampled.push(timeline.at(-1))
  }
  return sampled.slice(0, limit)
}

export function createReplayVisualizationCore(replay, options = {}) {
  const normalized = normalizeReplay(replay)
  const viewport = normalizeViewport(options.viewport || { start: 0, end: Number.MAX_SAFE_INTEGER })
  const timeline = normalized.events.map(normalizeEvent)
  const analysisEventLimit = Math.max(100, Number(options.analysisEventLimit) || 2000)
  const analysisTimeline = sampleTimeline(timeline, analysisEventLimit)
  const ghostProjection = options.ghostProjection || computeGhostProjection({ events: analysisTimeline })
  const visibleTimeline = timeline.filter((event) => event.t >= viewport.start && event.t <= viewport.end)
  const coalescedTimeline = coalesceEvents(visibleTimeline, options.coalesceWindowMs || 120)
  const densityBuckets = bucketDensity(timeline, options.bucketMs || 1000)
  const markerClusters = clusterMarkers(ghostProjection.markers || [], options.markerClusterMs || 250)
  const correctionHeatmap = buildCorrectionHeatmap(timeline, options.heatmapBucketSize || 5)
  const pacingVisualization = (ghostTimelineAnalysis.computePacingWindows(analysisTimeline) || []).map((window) => freezeDeep({ ...window }))
  const frameReconstruction = freezeDeep({
    replayHash: normalized.replayHash,
    viewport,
    visibleTimeline,
    coalescedTimeline,
    densityBuckets,
    markerClusters,
    correctionHeatmap,
    pacingVisualization,
    analysisTimeline,
    analysisEventLimit,
    viewportSummary: adaptViewportSummary(timeline, viewport, densityBuckets),
    overlay: freezeDeep({
      markers: markerClusters,
      ghost: ghostProjection,
      density: densityBuckets,
      corrections: correctionHeatmap
    }),
    fingerprint: stableHash({ replayHash: normalized.replayHash, viewport, visibleTimeline, coalescedTimeline })
  })

  let currentViewport = viewport
  let currentFrame = frameReconstruction
  let scrubber = {
    cursor: visibleTimeline.length > 0 ? visibleTimeline.at(-1).index : 0,
    viewport: currentViewport,
    replayHash: normalized.replayHash,
    checkpointIndex: 0,
    version: 0
  }

  function getFrame(nextViewport = currentViewport) {
    const normalizedViewport = normalizeViewport(nextViewport)
    if (normalizedViewport.start === currentViewport.start && normalizedViewport.end === currentViewport.end) {
      return currentFrame
    }
    const nextVisible = timeline.filter((event) => event.t >= normalizedViewport.start && event.t <= normalizedViewport.end)
    const nextCoalesced = coalesceEvents(nextVisible, options.coalesceWindowMs || 120)
    const nextFrame = freezeDeep({
      ...frameReconstruction,
      viewport: normalizedViewport,
      visibleTimeline: nextVisible,
      coalescedTimeline: nextCoalesced,
      viewportSummary: adaptViewportSummary(timeline, normalizedViewport, densityBuckets),
      viewportDiff: diffViewport(currentViewport, normalizedViewport, timeline),
      fingerprint: stableHash({ replayHash: normalized.replayHash, viewport: normalizedViewport, visibleTimeline: nextVisible, coalescedTimeline: nextCoalesced })
    })
    currentViewport = normalizedViewport
    currentFrame = nextFrame
    scrubber = freezeDeep({ ...scrubber, viewport: normalizedViewport, cursor: nextVisible.at(-1)?.index ?? scrubber.cursor, version: scrubber.version + 1 })
    return nextFrame
  }

  function interpolate(nextFrame, ratio = 0.5) {
    return interpolateFrame(currentFrame, nextFrame, ratio)
  }

  function scrub(cursor, nextViewport = currentViewport) {
    const normalizedViewport = normalizeViewport(nextViewport)
    const safeCursor = Math.max(0, Number(cursor) || 0)
    const candidate = timeline.filter((event) => event.index <= safeCursor && event.t >= normalizedViewport.start && event.t <= normalizedViewport.end)
    scrubber = freezeDeep({
      cursor: safeCursor,
      viewport: normalizedViewport,
      replayHash: normalized.replayHash,
      checkpointIndex: candidate.filter((event) => event.type === "checkpoint" || event.type === "marker").length,
      version: scrubber.version + 1
    })
    return scrubber
  }

  function getSnapshot() {
    return freezeDeep({
      replayHash: normalized.replayHash,
      viewport: currentViewport,
      frame: currentFrame,
      scrubber,
      densityBuckets,
      markerClusters,
      correctionHeatmap,
      pacingVisualization,
      visibleEventCount: currentFrame.visibleTimeline.length,
      eventFingerprint: stableHash({ replayHash: normalized.replayHash, visible: currentFrame.visibleTimeline, viewport: currentViewport })
    })
  }

  return Object.freeze({
    getFrame,
    interpolate,
    scrub,
    getSnapshot
  })
}

export {
  clusterMarkers,
  bucketDensity,
  coalesceEvents,
  diffViewport,
  interpolateFrame,
  buildCorrectionHeatmap,
  adaptViewportSummary
}

export default { createReplayVisualizationCore }