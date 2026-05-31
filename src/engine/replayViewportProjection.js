function freezeDeep(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.keys(obj).forEach((k) => freezeDeep(obj[k]))
    Object.freeze(obj)
  }
  return obj
}

export function projectViewportReplay(consumerSnapshot, ghostProjection, viewport = {}) {
  const start = Math.max(0, Number(viewport.start) || 0)
  const end = Math.max(start, Number(viewport.end) || start)

  const timeline = Array.isArray(consumerSnapshot?.timeline) ? consumerSnapshot.timeline : []
  const visibleTimeline = timeline.filter((e) => e.t >= start && e.t <= end)
  const visibleCorrections = (consumerSnapshot?.corrections || []).filter((c) => c.t >= start && c.t <= end)
  const visibleCheckpoints = (consumerSnapshot?.checkpoints || []).filter((c) => c.t >= start && c.t <= end)
  const visibleMarkers = (ghostProjection?.markers || []).filter((m) => m.t >= start && m.t <= end)
  const visiblePacing = (ghostProjection?.pacing || []).filter((p) => p.end >= start && p.start <= end)

  return freezeDeep({
    viewport: { start, end },
    frame: {
      timeline: visibleTimeline,
      corrections: visibleCorrections,
      checkpoints: visibleCheckpoints,
      markers: visibleMarkers,
      pacing: visiblePacing,
      ghostOverlay: {
        progress: (ghostProjection?.progress || []).filter((p) => p.t >= start && p.t <= end),
        wpm: (ghostProjection?.wpm || []).filter((p) => p.t >= start && p.t <= end),
        confidence: (ghostProjection?.confidence || []).filter((p) => p.t >= start && p.t <= end)
      }
    }
  })
}

export default { projectViewportReplay }
