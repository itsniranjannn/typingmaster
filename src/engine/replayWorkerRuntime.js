import { createReplayConsumer } from "./replayConsumer"
import { computeGhostProjection } from "./ghostProjectionEngine"
import { stableHash } from "./replayConsumerValidation"

const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())

function freezeDeep(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.keys(obj).forEach((k) => freezeDeep(obj[k]))
    Object.freeze(obj)
  }
  return obj
}

export function executeReplayTask(message) {
  const start = now()
  const { taskId, op, payload = {} } = message || {}

  if (op !== "project") {
    return freezeDeep({ taskId, ok: false, error: "unsupported_op" })
  }

  const replay = payload.replay || { events: [] }
  const expectedHash = payload.replayHash || null
  const replayHash = stableHash(replay)
  const hashValid = !expectedHash || expectedHash === replayHash

  const consumer = createReplayConsumer(replay, {
    maxListeners: Math.max(1, Number(payload.maxListeners) || 8)
  })

  const consumerSnapshot = consumer.getSnapshot()
  const ghost = computeGhostProjection(replay)

  const end = now()
  const result = {
    taskId,
    ok: true,
    replayHash,
    hashValid,
    consumer: {
      verification: consumer.getVerification(),
      progress: consumer.getTimelineProgress(),
      pauses: consumer.getPauseSpans(),
      corrections: consumer.getCorrectionSpans(),
      checkpoints: consumer.getCheckpoints(),
      divergence: consumer.getDivergenceSummaries(),
      timelineLength: consumerSnapshot.timeline.length
    },
    ghost,
    profile: {
      workerMs: Number((end - start).toFixed(3)),
      projectionMs: Number((end - start).toFixed(3)),
      estimatedMemoryBytes: JSON.stringify(consumerSnapshot).length + JSON.stringify(ghost).length,
      checkpointDensity: consumerSnapshot.timeline.length > 0 ? consumer.getCheckpoints().length / consumerSnapshot.timeline.length : 0
    }
  }

  return freezeDeep(result)
}

export default { executeReplayTask }
