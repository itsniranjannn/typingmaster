import { stableHash } from "./replayConsumerValidation"
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

export function createReplayTimelineInteractionRuntime(replay, options = {}) {
  const renderRuntime = options.renderRuntime || createReplayRenderingRuntime(replay, options)
  const markers = options.markers || renderRuntime.getCoreSnapshot().markerClusters || []
  const bookmarks = new Map()
  let state = {
    cursor: 0,
    viewport: normalizeViewport(options.viewport || { start: 0, end: Number.MAX_SAFE_INTEGER }),
    playbackSpeed: Number(options.playbackSpeed) > 0 ? Number(options.playbackSpeed) : 1,
    isPaused: true,
    seekCount: 0,
    rewindCount: 0,
    fastForwardCount: 0,
    resumeCount: 0,
    pauseCount: 0,
    lastMarkerIndex: null,
    boundedInterpolationWindow: Math.max(1, Number(options.boundedInterpolationWindow) || 5),
    lastRenderHash: null
  }

  function renderAtCursor(cursor, viewport = state.viewport) {
    const frame = renderRuntime.getFrame(viewport)
    state = {
      ...state,
      cursor,
      viewport: normalizeViewport(viewport),
      lastRenderHash: stableHash({ cursor, viewport, frameFingerprint: frame.frameFingerprint })
    }
    return freezeDeep({
      cursor: state.cursor,
      viewport: state.viewport,
      frame,
      playbackSpeed: state.playbackSpeed,
      boundedInterpolationWindow: state.boundedInterpolationWindow,
      renderHash: state.lastRenderHash
    })
  }

  function seek(cursor, viewport = state.viewport) {
    state = { ...state, seekCount: state.seekCount + 1, isPaused: true }
    return renderAtCursor(Math.max(0, Number(cursor) || 0), viewport)
  }

  function fastForward(step = 1, viewport = state.viewport) {
    const nextCursor = state.cursor + Math.max(0, Number(step) || 0)
    state = { ...state, fastForwardCount: state.fastForwardCount + 1 }
    return renderAtCursor(nextCursor, viewport)
  }

  function rewind(step = 1, viewport = state.viewport) {
    const nextCursor = Math.max(0, state.cursor - Math.max(0, Number(step) || 0))
    state = { ...state, rewindCount: state.rewindCount + 1 }
    return renderAtCursor(nextCursor, viewport)
  }

  function setPlaybackSpeed(speed) {
    const nextSpeed = Number(speed)
    state = {
      ...state,
      playbackSpeed: Number.isFinite(nextSpeed) && nextSpeed > 0 ? nextSpeed : state.playbackSpeed
    }
    return freezeDeep({ playbackSpeed: state.playbackSpeed, speedHash: stableHash({ playbackSpeed: state.playbackSpeed }) })
  }

  function pause() {
    state = { ...state, isPaused: true, pauseCount: state.pauseCount + 1 }
    return freezeDeep({ isPaused: true, pauseCount: state.pauseCount })
  }

  function resume() {
    state = { ...state, isPaused: false, resumeCount: state.resumeCount + 1 }
    return freezeDeep({ isPaused: false, resumeCount: state.resumeCount })
  }

  function navigateMarker(direction = 1, viewport = state.viewport) {
    if (markers.length === 0) return renderAtCursor(state.cursor, viewport)
    const currentIndex = state.lastMarkerIndex == null ? (direction >= 0 ? 0 : markers.length - 1) : state.lastMarkerIndex + direction
    const nextIndex = Math.max(0, Math.min(markers.length - 1, currentIndex))
    state = { ...state, lastMarkerIndex: nextIndex }
    return renderAtCursor(markers[nextIndex]?.idx ?? markers[nextIndex]?.index ?? state.cursor, viewport)
  }

  function bookmark(name, cursor = state.cursor, viewport = state.viewport) {
    const normalizedCursor = Math.max(0, Number(cursor) || 0)
    const snapshot = freezeDeep({
      name: typeof name === "string" ? name : `bookmark-${bookmarks.size}`,
      cursor: normalizedCursor,
      viewport: normalizeViewport(viewport),
      hash: stableHash({ name, cursor: normalizedCursor, viewport })
    })
    bookmarks.set(snapshot.name, snapshot)
    return snapshot
  }

  function scrubberState() {
    return freezeDeep({
      cursor: state.cursor,
      viewport: state.viewport,
      playbackSpeed: state.playbackSpeed,
      isPaused: state.isPaused,
      seekCount: state.seekCount,
      rewindCount: state.rewindCount,
      fastForwardCount: state.fastForwardCount,
      resumeCount: state.resumeCount,
      pauseCount: state.pauseCount,
      lastMarkerIndex: state.lastMarkerIndex,
      boundedInterpolationWindow: state.boundedInterpolationWindow,
      renderHash: state.lastRenderHash
    })
  }

  function getSnapshot() {
    const renderSnapshot = renderRuntime.getSnapshot()
    return freezeDeep({
      interaction: scrubberState(),
      bookmarks: [...bookmarks.values()],
      frame: renderSnapshot.lastRenderedFrame,
      render: renderSnapshot,
      frameStableReplaySeeking: true,
      boundedInterpolationWindows: state.boundedInterpolationWindow,
      viewportSeeking: state.viewport,
      markerNavigationCount: state.lastMarkerIndex == null ? 0 : state.lastMarkerIndex + 1
    })
  }

  return Object.freeze({
    seek,
    fastForward,
    rewind,
    setPlaybackSpeed,
    pause,
    resume,
    navigateMarker,
    bookmark,
    renderAtCursor,
    getSnapshot,
    getScrubberState: scrubberState
  })
}

export default { createReplayTimelineInteractionRuntime }