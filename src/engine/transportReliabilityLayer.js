import { stableHash } from "./replayConsumerValidation"
import { TRANSPORT_PACKET_KINDS, createTransportPacket, createTransportAck, validateTransportPacket } from "./transportContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const boundedPush = (list, value, limit) => {
  const next = [...list, value]
  return next.length <= limit ? next : next.slice(next.length - limit)
}

export function createTransportReliabilityLayer(options = {}) {
  const maxPending = Math.max(1, Number(options.maxPending) || 128)
  const maxHistory = Math.max(1, Number(options.maxHistory) || 256)
  const retryDelayMs = Math.max(1, Number(options.retryDelayMs) || 100)
  const retryJitterMs = Math.max(0, Number(options.retryJitterMs) || 0)
  let pending = new Map()
  let history = []

  function register(packet, now = 0) {
    const validation = validateTransportPacket(packet)
    if (!validation.valid) {
      return freezeDeep({ accepted: false, reason: validation.reasons[0] || "invalid_packet", validation })
    }
    const entry = freezeDeep({
      packet,
      attempts: Math.max(0, Number(packet.attempt) || 0),
      nextRetryAt: Math.max(0, Number(now) || 0) + retryDelayMs,
      lastSentAt: Math.max(0, Number(now) || 0),
      acked: false
    })
    pending.set(packet.packetId, entry)
    while (pending.size > maxPending) {
      const oldest = pending.keys().next().value
      if (oldest) pending.delete(oldest)
    }
    history = boundedPush(history, freezeDeep({ action: "register", packetId: packet.packetId, now, checksum: stableHash(packet) }), maxHistory)
    return freezeDeep({ accepted: true, packetId: packet.packetId, pendingCount: pending.size })
  }

  function ack(packetOrAck, now = 0) {
    const ackId = typeof packetOrAck === "string" ? packetOrAck : packetOrAck?.ackId || packetOrAck?.responseTo || packetOrAck?.packetId || null
    if (!ackId || !pending.has(ackId)) {
      history = boundedPush(history, freezeDeep({ action: "ack-miss", ackId, now }), maxHistory)
      return freezeDeep({ acknowledged: false, ackId, pendingCount: pending.size })
    }
    pending.delete(ackId)
    history = boundedPush(history, freezeDeep({ action: "ack", ackId, now }), maxHistory)
    return freezeDeep({ acknowledged: true, ackId, pendingCount: pending.size })
  }

  function retry(now = 0) {
    const current = Math.max(0, Number(now) || 0)
    const due = [...pending.values()].filter((entry) => !entry.acked && current >= entry.nextRetryAt)
    const ordered = due.sort((left, right) => left.packet.sequence - right.packet.sequence || left.packet.packetId.localeCompare(right.packet.packetId))
    const retries = ordered.map((entry) => {
      const nextAttempt = entry.attempts + 1
      const retriedPacket = createTransportPacket({
        ...entry.packet,
        kind: TRANSPORT_PACKET_KINDS.RETRY,
        retryOf: entry.packet.packetId,
        attempt: nextAttempt,
        serverTs: current,
        checksum: stableHash({ ...entry.packet, kind: TRANSPORT_PACKET_KINDS.RETRY, retryOf: entry.packet.packetId, attempt: nextAttempt, serverTs: current })
      })
      const jitterOffset = retryJitterMs > 0 ? stableHash(retriedPacket.packetId).charCodeAt(0) % (retryJitterMs + 1) : 0
      pending.set(entry.packet.packetId, freezeDeep({
        ...entry,
        attempts: nextAttempt,
        lastSentAt: current,
        nextRetryAt: current + retryDelayMs + jitterOffset
      }))
      history = boundedPush(history, freezeDeep({ action: "retry", packetId: entry.packet.packetId, attempt: nextAttempt, now: current }), maxHistory)
      return retriedPacket
    })
    return freezeDeep({
      retries,
      retryCount: retries.length,
      pendingCount: pending.size,
      nextRetryAt: retries.length ? Math.min(...ordered.map((entry) => pending.get(entry.packet.packetId)?.nextRetryAt || current + retryDelayMs)) : null
    })
  }

  function consume(packet, now = 0) {
    const result = packet?.kind === TRANSPORT_PACKET_KINDS.ACK ? ack(packet, now) : register(packet, now)
    return freezeDeep({
      result,
      snapshot: getSnapshot()
    })
  }

  function getSnapshot() {
    const pendingPackets = [...pending.values()].map((entry) => freezeDeep({
      packetId: entry.packet.packetId,
      attempts: entry.attempts,
      nextRetryAt: entry.nextRetryAt,
      lastSentAt: entry.lastSentAt,
      kind: entry.packet.kind,
      eventType: entry.packet.eventType
    }))
    return freezeDeep({
      pendingPackets,
      pendingCount: pendingPackets.length,
      retryDelayMs,
      retryJitterMs,
      history,
      reliabilityHash: stableHash({ pendingPackets, history })
    })
  }

  function clear() {
    pending = new Map()
    history = []
  }

  return Object.freeze({
    register,
    ack,
    retry,
    consume,
    getSnapshot,
    clear
  })
}

export default { createTransportReliabilityLayer }