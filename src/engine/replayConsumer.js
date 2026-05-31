// Replay consumer: read-only, deterministic wrapper over replay event streams
import { stableHash } from './replayConsumerValidation.js'
import * as selectors from './replayConsumerSelectors.js'

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.getOwnPropertyNames(obj).forEach((name) => deepFreeze(obj[name]))
    Object.freeze(obj)
  }
  return obj
}

export function createReplayConsumer(replay, opts = {}) {
  const maxListeners = typeof opts.maxListeners === 'number' ? opts.maxListeners : 8
  let listeners = new Set()
  let cursor = { pos: 0 }

  const verification = {
    hash: stableHash(replay),
    length: Array.isArray(replay.events) ? replay.events.length : 0,
  }

  function compute() {
    const timeline = selectors.computeTimeline(replay.events || [])
    const pauses = selectors.computePauseSpans(timeline)
    const corrections = selectors.computeCorrectionSpans(timeline)
    const checkpoints = selectors.computeCheckpoints(timeline)
    const divergence = selectors.computeDivergenceSummaries(timeline)
    const progress = selectors.computeProgressSummary(timeline)
    return deepFreeze({ timeline, pauses, corrections, checkpoints, divergence, progress })
  }

  let snapshot = compute()

  function getSnapshot() { return snapshot }

  function getVerification() { return Object.freeze({ ...verification }) }

  function getTimelineProgress() { return snapshot.progress }

  function subscribe(fn) {
    if (listeners.size >= maxListeners) throw new Error('max listeners')
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  function notify() {
    for (const l of Array.from(listeners)) {
      try { l(snapshot) } catch (e) { /* swallow listener errors */ }
    }
  }

  function reset() {
    cursor.pos = 0
    snapshot = compute()
    notify()
  }

  function restart() { reset() }

  function advanceTo(index) {
    cursor.pos = Math.max(0, Math.min(index, snapshot.timeline.length))
    return snapshot.timeline[cursor.pos] || null
  }

  return Object.freeze({
    getSnapshot,
    getVerification,
    getTimelineProgress,
    getPauseSpans: () => snapshot.pauses,
    getCorrectionSpans: () => snapshot.corrections,
    getCheckpoints: () => snapshot.checkpoints,
    getDivergenceSummaries: () => snapshot.divergence,
    subscribe,
    reset,
    restart,
    advanceTo,
  })
}

export default { createReplayConsumer }
