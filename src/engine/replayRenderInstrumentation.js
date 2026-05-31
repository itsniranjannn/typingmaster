function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeViewport = (viewport = {}) => ({
  start: Math.max(0, Number(viewport.start) || 0),
  end: Math.max(Math.max(0, Number(viewport.start) || 0), Number(viewport.end) || 0)
})

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number((total / values.length).toFixed(3))
}

export function createReplayRenderInstrumentation() {
  const frames = []

  function recordFrame(report = {}) {
    const schedule = isPlainObject(report.schedule) ? report.schedule : {}
    const frame = isPlainObject(report.frame) ? report.frame : {}
    const viewport = normalizeViewport(report.viewport ?? frame.viewport ?? {})
    const entry = freezeDeep({
      frameId: Math.max(0, Number(schedule.frameId ?? report.frameId ?? frames.length + 1) || 0),
      viewport,
      replayHash: typeof report.replayHash === "string" ? report.replayHash : null,
      phase: typeof report.phase === "string" ? report.phase : null,
      budgetMs: Math.max(0, Number(schedule.budgetMs ?? report.budgetMs) || 0),
      consumedMs: Math.max(0, Number(schedule.consumedMs ?? report.consumedMs) || 0),
      overBudgetMs: Math.max(0, Number(schedule.overBudgetMs ?? report.overBudgetMs) || 0),
      withinBudget: Boolean(schedule.withinBudget ?? report.withinBudget ?? true),
      taskCount: Array.isArray(schedule.executed) ? schedule.executed.length : Math.max(0, Number(report.taskCount) || 0),
      overflowCount: Array.isArray(schedule.overflow) ? schedule.overflow.length : Math.max(0, Number(report.overflowCount) || 0),
      timelineCount: Array.isArray(frame.frame?.timeline) ? frame.frame.timeline.length : Math.max(0, Number(report.timelineCount) || 0),
      correctionCount: Array.isArray(frame.frame?.corrections) ? frame.frame.corrections.length : Math.max(0, Number(report.correctionCount) || 0),
      checkpointCount: Array.isArray(frame.frame?.checkpoints) ? frame.frame.checkpoints.length : Math.max(0, Number(report.checkpointCount) || 0),
      markerCount: Array.isArray(frame.frame?.markers) ? frame.frame.markers.length : Math.max(0, Number(report.markerCount) || 0),
      frameHash: typeof report.frameHash === "string" ? report.frameHash : null,
      syncToken: typeof report.syncToken === "string" ? report.syncToken : null
    })

    frames.push(entry)
    return entry
  }

  function snapshot() {
    const consumedValues = frames.map((frame) => frame.consumedMs)
    const overBudgetValues = frames.map((frame) => frame.overBudgetMs)
    const timelineCounts = frames.map((frame) => frame.timelineCount)

    return freezeDeep({
      frameCount: frames.length,
      overBudgetFrames: frames.filter((frame) => !frame.withinBudget).length,
      averageConsumedMs: average(consumedValues),
      averageOverBudgetMs: average(overBudgetValues),
      averageTimelineCount: average(timelineCounts),
      maxConsumedMs: frames.reduce((max, frame) => Math.max(max, frame.consumedMs), 0),
      lastFrame: frames.at(-1) || null,
      frames: frames.slice()
    })
  }

  function reset() {
    frames.length = 0
  }

  return Object.freeze({
    recordFrame,
    snapshot,
    reset
  })
}

export default { createReplayRenderInstrumentation }