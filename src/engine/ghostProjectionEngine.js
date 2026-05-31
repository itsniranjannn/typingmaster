// Ghost projection: derive spectator projections from replay events
import * as tAnalysis from './ghostTimelineAnalysis.js'

function deepFreeze(o){ if (o && typeof o==='object' && !Object.isFrozen(o)){ Object.getOwnPropertyNames(o).forEach(n=>deepFreeze(o[n])); Object.freeze(o);} return o }

export function computeGhostProjection(replay) {
  const timeline = tAnalysis.normalizeTimeline(replay.events || [])
  const progress = tAnalysis.computeProgressCurve(timeline)
  const wpm = tAnalysis.computeWpmCurve(timeline)
  const pacing = tAnalysis.computePacingWindows(timeline)
  const correctionDensity = tAnalysis.computeCorrectionDensity(timeline)
  const confidence = tAnalysis.computeConfidenceWindows(timeline)
  const checkpoints = tAnalysis.computeCheckpoints(timeline)
  const markers = tAnalysis.computeDeterministicMarkers(timeline)
  return deepFreeze({ progress, wpm, pacing, correctionDensity, confidence, checkpoints, markers })
}

export default { computeGhostProjection }
