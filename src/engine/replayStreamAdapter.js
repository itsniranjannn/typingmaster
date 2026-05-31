import { createReplayChunkAssembler } from "./replayChunkAssembler"
import { createReplayConsumer } from "./replayConsumer"
import { computeGhostProjection } from "./ghostProjectionEngine"

function freezeDeep(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.keys(obj).forEach((k) => freezeDeep(obj[k]))
    Object.freeze(obj)
  }
  return obj
}

export function createReplayStreamAdapter(options = {}) {
  const assembler = createReplayChunkAssembler({ maxEvents: options.maxEvents || 5000 })
  let lastProjection = freezeDeep({ replayHash: "", consumer: null, ghost: null })

  function ingest(chunk) {
    const assembly = assembler.ingestChunk(chunk)
    const snap = assembler.snapshot()
    const consumer = createReplayConsumer(snap.replay, { maxListeners: 1 })
    const ghost = computeGhostProjection(snap.replay)
    lastProjection = freezeDeep({ replayHash: snap.replayHash, consumer: consumer.getSnapshot(), ghost })
    return freezeDeep({ assembly, projection: lastProjection })
  }

  function rewind(eventsCount) {
    const result = assembler.rewind(eventsCount)
    const snap = assembler.snapshot()
    const consumer = createReplayConsumer(snap.replay, { maxListeners: 1 })
    const ghost = computeGhostProjection(snap.replay)
    lastProjection = freezeDeep({ replayHash: snap.replayHash, consumer: consumer.getSnapshot(), ghost })
    return freezeDeep({ rewind: result, projection: lastProjection })
  }

  function getProjection() {
    return lastProjection
  }

  function getSnapshot() {
    return assembler.snapshot()
  }

  return Object.freeze({ ingest, rewind, getProjection, getSnapshot })
}

export default { createReplayStreamAdapter }
