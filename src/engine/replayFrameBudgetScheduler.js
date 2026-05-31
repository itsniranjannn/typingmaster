function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeTask = (task, index) => ({
  id: typeof task?.id === "string" && task.id.length > 0 ? task.id : `task-${index}`,
  label: typeof task?.label === "string" && task.label.length > 0 ? task.label : `task-${index}`,
  costMs: Math.max(0, Number(task?.costMs ?? task?.cost ?? task?.durationMs) || 0),
  priority: Number.isFinite(Number(task?.priority)) ? Number(task.priority) : index,
  meta: isPlainObject(task?.meta) ? task.meta : {},
  run: typeof task?.run === "function" ? task.run : null
})

export function createReplayFrameBudgetScheduler(options = {}) {
  const frameBudgetMs = Math.max(0, Number(options.frameBudgetMs) || 8)
  let frameId = 0
  const history = []

  function runFrame(tasks = []) {
    const ordered = Array.isArray(tasks)
      ? tasks.map(normalizeTask).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))
      : []

    let consumedMs = 0
    const executed = []
    const overflow = []

    for (const task of ordered) {
      const result = task.run ? task.run() : null
      consumedMs = Number((consumedMs + task.costMs).toFixed(3))
      const withinBudget = consumedMs <= frameBudgetMs
      const entry = freezeDeep({
        id: task.id,
        label: task.label,
        costMs: task.costMs,
        priority: task.priority,
        withinBudget,
        meta: task.meta,
        result
      })
      executed.push(entry)
      if (!withinBudget) {
        overflow.push(entry)
      }
    }

    const summary = freezeDeep({
      frameId: ++frameId,
      budgetMs: frameBudgetMs,
      consumedMs,
      overBudgetMs: Math.max(0, Number((consumedMs - frameBudgetMs).toFixed(3))),
      withinBudget: consumedMs <= frameBudgetMs,
      executed,
      overflow
    })

    history.push(summary)
    return summary
  }

  function snapshot() {
    return freezeDeep({
      frameBudgetMs,
      frameId,
      lastFrame: history.at(-1) || null,
      history: history.slice()
    })
  }

  function reset() {
    history.length = 0
    frameId = 0
  }

  return Object.freeze({
    runFrame,
    snapshot,
    reset
  })
}

export default { createReplayFrameBudgetScheduler }