// Lightweight selectors for replay consumer. All functions are pure and deterministic.

export function computeTimeline(events) {
  // Normalize existing replayEngine events and synthetic test fixtures
  return events.map((e, i) => {
    const t = e.t == null ? (e.ts == null ? i : e.ts) : e.t
    let type = e.type
    if (e.type === 'key') {
      type = e.backspace ? 'correction' : 'input'
    }
    return { idx: i, t, type, payload: e.payload || e }
  })
}

export function computePauseSpans(timeline) {
  const pauses = []
  for (let i = 0; i < timeline.length; i++) {
    const ev = timeline[i]
    if (ev.type === 'pause') pauses.push({ start: ev.t, duration: ev.payload.duration })
  }
  return pauses
}

export function computeCorrectionSpans(timeline) {
  const corrections = []
  for (const ev of timeline) {
    if (ev.type === 'correction') {
      corrections.push({
        t: ev.t,
        index: ev.payload.index ?? ev.payload.charIndex ?? -1,
        before: ev.payload.before,
        after: ev.payload.after,
      })
    }
  }
  return corrections
}

export function computeCheckpoints(timeline) {
  return timeline
    .filter((e) => e.type === 'checkpoint' || e.type === 'marker')
    .map((e) => ({ t: e.t, label: e.payload.label || e.payload.name || e.type }))
}

export function computeDivergenceSummaries(timeline) {
  return timeline.filter((e) => e.type === 'diverge').map((e) => ({ t: e.t, info: e.payload }))
}

export function computeProgressSummary(timeline) {
  const last = timeline[timeline.length - 1]
  return { length: timeline.length, duration: last ? last.t : 0 }
}

export default { computeTimeline }
