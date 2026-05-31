import { projectViewportReplay } from "./replayViewportProjection"

export function createReplayViewAdapter(streamAdapter) {
  function getFrame(viewport) {
    const projection = streamAdapter.getProjection()
    const consumer = projection?.consumer || { timeline: [], corrections: [], checkpoints: [] }
    const ghost = projection?.ghost || { markers: [], pacing: [], progress: [], wpm: [], confidence: [] }
    return projectViewportReplay(consumer, ghost, viewport)
  }

  function getCursor(viewport) {
    const frame = getFrame(viewport)
    const timeline = frame.frame.timeline
    return { start: frame.viewport.start, end: frame.viewport.end, size: timeline.length }
  }

  return Object.freeze({ getFrame, getCursor })
}

export default { createReplayViewAdapter }
