export function createReplayTaskScheduler(options = {}) {
  const maxQueue = Math.max(1, Number(options.maxQueue) || 16)
  const queue = []
  const cancelled = new Set()
  let running = false

  function enqueue(task) {
    if (queue.length >= maxQueue) {
      // Deterministic bounded behavior: drop oldest pending task
      queue.shift()
    }
    queue.push(task)
  }

  function cancel(taskId) {
    cancelled.add(taskId)
  }

  async function run(processor) {
    if (running) return
    running = true
    try {
      while (queue.length > 0) {
        const next = queue.shift()
        if (!next || cancelled.has(next.id)) continue
        await processor(next)
      }
    } finally {
      running = false
    }
  }

  function stats() {
    return Object.freeze({ queued: queue.length, cancelled: cancelled.size, maxQueue })
  }

  return Object.freeze({ enqueue, cancel, run, stats })
}

export default { createReplayTaskScheduler }
