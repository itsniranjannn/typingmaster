import { createReplayTaskScheduler } from "./replayTaskScheduler"
import { executeReplayTask } from "./replayWorkerRuntime"

function mkResultPromise() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function createReplayWorkerBridge(options = {}) {
  const scheduler = createReplayTaskScheduler({ maxQueue: options.maxQueue || 16 })
  const pending = new Map()
  const deferredById = new Map()
  const forceSync = Boolean(options.forceSync)
  const WorkerCtor = options.WorkerCtor || (typeof Worker !== "undefined" ? Worker : null)

  let worker = null
  let workerAvailable = false

  if (!forceSync && WorkerCtor) {
    try {
      worker = typeof options.createWorker === "function" ? options.createWorker() : null
      if (worker) {
        worker.onmessage = (event) => {
          const msg = event?.data || {}
          const pendingEntry = pending.get(msg.taskId)
          if (!pendingEntry) return
          pending.delete(msg.taskId)
          pendingEntry.resolve(msg)
        }
        worker.onerror = (err) => {
          // deterministic fallback behavior: reject all pending and force sync for subsequent tasks
          for (const [, p] of pending) p.reject(err)
          pending.clear()
          workerAvailable = false
        }
        workerAvailable = true
      }
    } catch (e) {
      workerAvailable = false
    }
  }

  async function processTask(task) {
    if (workerAvailable && worker) {
      const deferred = mkResultPromise()
      pending.set(task.id, deferred)
      worker.postMessage(task.message)
      return deferred.promise
    }
    return executeReplayTask(task.message)
  }

  function runQueue() {
    return scheduler.run(async (task) => {
      const result = await processTask(task)
      task.resolve(result)
    })
  }

  function submit(message) {
    const taskId = message?.taskId || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const deferred = mkResultPromise()
    deferredById.set(taskId, deferred)
    scheduler.enqueue({ id: taskId, message: { ...message, taskId }, resolve: (result) => {
      deferredById.delete(taskId)
      deferred.resolve(result)
    } })
    void runQueue()
    return { taskId, promise: deferred.promise }
  }

  function cancel(taskId) {
    scheduler.cancel(taskId)
    const queued = deferredById.get(taskId)
    if (queued) {
      deferredById.delete(taskId)
      queued.reject(new Error("cancelled"))
    }
    const p = pending.get(taskId)
    if (p) {
      pending.delete(taskId)
      p.reject(new Error("cancelled"))
    }
  }

  function reset() {
    for (const [id, d] of deferredById) {
      deferredById.delete(id)
      d.reject(new Error("reset"))
    }
    for (const [id, p] of pending) {
      pending.delete(id)
      p.reject(new Error("reset"))
    }
  }

  return Object.freeze({
    submit,
    cancel,
    reset,
    stats: scheduler.stats,
    isWorkerMode: () => workerAvailable,
    isSyncFallback: () => !workerAvailable
  })
}

export default { createReplayWorkerBridge }
