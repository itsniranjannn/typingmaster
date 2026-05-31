import { stableHash } from "./replayConsumerValidation"
import { createTransportAck, createTransportPacket, createTransportRequest, createTransportResponse, validateTransportPacket, TRANSPORT_PACKET_KINDS } from "./transportContracts"
import { createTransportReliabilityLayer } from "./transportReliabilityLayer"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const boundedInsert = (items, packet, limit) => {
  const next = [...items, packet].sort((left, right) => left.sequence - right.sequence || left.priority - right.priority || left.packetId.localeCompare(right.packetId))
  return next.length <= limit ? next : next.slice(next.length - limit)
}

export function createTransportAdapter(options = {}) {
  const nodeId = typeof options.nodeId === "string" ? options.nodeId : `node-${stableHash(options).slice(0, 8)}`
  const maxQueue = Math.max(1, Number(options.maxQueue) || 256)
  const protocolVersion = Math.max(1, Number(options.protocolVersion) || 1)
  const reliability = options.reliabilityLayer || createTransportReliabilityLayer({
    maxPending: options.maxPending || maxQueue,
    maxHistory: options.maxHistory || maxQueue,
    retryDelayMs: options.retryDelayMs || 100,
    retryJitterMs: options.retryJitterMs || 0
  })

  let router = null
  let inbound = []
  let outbound = []
  let clock = 0

  function normalizePacket(packet = {}, extra = {}) {
    return createTransportPacket({
      ...packet,
      ...extra,
      protocolVersion,
      sourceId: typeof extra.sourceId === "string" ? extra.sourceId : packet.sourceId || nodeId,
      serverTs: Math.max(0, Number(extra.serverTs ?? packet.serverTs ?? clock) || 0)
    })
  }

  function queueOutbound(packet) {
    outbound = boundedInsert(outbound, packet, maxQueue)
    return packet
  }

  function queueInbound(packet) {
    inbound = boundedInsert(inbound, packet, maxQueue)
    return packet
  }

  function emit(packet, targetIds = [], now = clock) {
    const packetTargetIds = Array.isArray(targetIds) ? targetIds : (targetIds ? [targetIds] : [])
    const packetToSend = normalizePacket(packet, { sourceId: nodeId, serverTs: now, targetId: packetTargetIds[0] || packet.targetId || null })
    const validation = validateTransportPacket(packetToSend, { supportedVersion: protocolVersion })
    if (!validation.valid) {
      return freezeDeep({ sent: false, reason: validation.reasons[0] || "invalid_packet", validation })
    }
    reliability.register(packetToSend, now)
    queueOutbound(packetToSend)
    if (router) {
      router.route(packetToSend, nodeId, packetTargetIds)
    }
    return freezeDeep({ sent: true, packet: packetToSend, outboundCount: outbound.length })
  }

  function send(packet, targetIds = [], now = clock) {
    return emit(packet, targetIds, now)
  }

  function broadcast(packet, targetIds = [], now = clock) {
    return emit({ ...packet, kind: TRANSPORT_PACKET_KINDS.BROADCAST }, targetIds, now)
  }

  function request(packet, targetId, now = clock) {
    return emit(createTransportRequest({ ...packet, sourceId: nodeId, targetId, serverTs: now }), [targetId], now)
  }

  function response(requestPacket, payload = {}, now = clock) {
    return emit(createTransportResponse(requestPacket, { payload, sourceId: nodeId, serverTs: now }), [requestPacket?.sourceId].filter(Boolean), now)
  }

  function ack(packet, now = clock) {
    const ackPacket = createTransportAck(packet, { sourceId: nodeId, serverTs: now })
    reliability.ack(packet?.packetId || packet?.ackId || packet?.responseTo || null, now)
    return emit(ackPacket, [packet?.sourceId].filter(Boolean), now)
  }

  function receive(packet, now = clock) {
    const normalized = normalizePacket(packet, { serverTs: now })
    const validation = validateTransportPacket(normalized, { supportedVersion: protocolVersion })
    if (!validation.valid) {
      return freezeDeep({ received: false, reason: validation.reasons[0] || "invalid_packet", validation })
    }
    queueInbound(normalized)
    if (normalized.kind === TRANSPORT_PACKET_KINDS.ACK) {
      reliability.ack(normalized.ackId || normalized.responseTo || normalized.packetId, now)
    }
    return freezeDeep({ received: true, packet: normalized, inboundCount: inbound.length })
  }

  function receiveFromRouter(packet, now = clock) {
    return receive(packet, now)
  }

  function retry(now = clock) {
    clock = Math.max(clock, Number(now) || 0)
    const retries = reliability.retry(clock)
    const dispatched = retries.retries.map((packet) => {
      outbound = boundedInsert(outbound, packet, maxQueue)
      if (router) {
        router.route(packet, nodeId, packet.targetId ? [packet.targetId] : [])
      }
      return packet
    })
    return freezeDeep({
      retries: dispatched,
      retryCount: dispatched.length,
      outboundCount: outbound.length,
      reliability: reliability.getSnapshot()
    })
  }

  function drainInbound(limit = maxQueue) {
    const items = inbound.slice(0, Math.max(0, Number(limit) || maxQueue))
    inbound = inbound.slice(items.length)
    return freezeDeep(items)
  }

  function drainOutbound(limit = maxQueue) {
    const items = outbound.slice(0, Math.max(0, Number(limit) || maxQueue))
    outbound = outbound.slice(items.length)
    return freezeDeep(items)
  }

  function bindRouter(nextRouter) {
    router = nextRouter && typeof nextRouter.route === "function" ? nextRouter : null
    return freezeDeep({ nodeId, bound: Boolean(router) })
  }

  function tick(now = clock) {
    clock = Math.max(clock, Number(now) || 0)
    return retry(clock)
  }

  function getSnapshot() {
    return freezeDeep({
      nodeId,
      protocolVersion,
      clock,
      inboundCount: inbound.length,
      outboundCount: outbound.length,
      inbound: inbound,
      outbound: outbound,
      reliability: reliability.getSnapshot(),
      adapterHash: stableHash({ nodeId, protocolVersion, inbound, outbound })
    })
  }

  return Object.freeze({
    nodeId,
    send,
    broadcast,
    request,
    response,
    ack,
    receive,
    receiveFromRouter,
    retry,
    drainInbound,
    drainOutbound,
    bindRouter,
    tick,
    getSnapshot,
    reliability
  })
}

export default { createTransportAdapter }