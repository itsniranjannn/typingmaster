import { stableHash } from "./replayConsumerValidation"

function freezeDeep(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.keys(obj).forEach((k) => freezeDeep(obj[k]))
    Object.freeze(obj)
  }
  return obj
}

export function createReplayChunkAssembler(options = {}) {
  const maxEvents = Math.max(1, Number(options.maxEvents) || 5000)
  const chunks = new Map()
  let events = []
  let nextSeq = 0

  function ingestChunk(chunk) {
    const seq = Number(chunk?.seq)
    const payload = Array.isArray(chunk?.events) ? chunk.events : []
    if (!Number.isFinite(seq) || seq < 0) return { accepted: false, reason: "bad_seq" }
    chunks.set(seq, payload)

    while (chunks.has(nextSeq)) {
      const part = chunks.get(nextSeq)
      chunks.delete(nextSeq)
      events = events.concat(part)
      if (events.length > maxEvents) {
        events = events.slice(events.length - maxEvents)
      }
      nextSeq += 1
    }

    return freezeDeep({ accepted: true, nextSeq, bufferedChunks: chunks.size, totalEvents: events.length })
  }

  function rewind(count) {
    const n = Math.max(0, Number(count) || 0)
    events = events.slice(0, Math.max(0, events.length - n))
    return freezeDeep({ totalEvents: events.length })
  }

  function snapshot() {
    const replay = { events: events.slice() }
    return freezeDeep({ replay, replayHash: stableHash(replay), totalEvents: events.length, nextSeq, bufferedChunks: chunks.size })
  }

  return Object.freeze({ ingestChunk, rewind, snapshot })
}

export default { createReplayChunkAssembler }
