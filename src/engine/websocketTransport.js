import { stableHash } from "./replayConsumerValidation"
import { createTransportAdapter } from "./transportAdapter"
import { createTransportPacket, NETWORK_EVENT_TYPES, TRANSPORT_CHANNELS, validateTransportPacket, TRANSPORT_PROTOCOL_VERSION } from "./transportContracts"
import { deserializeTransportFrame, serializeTransportFrame, TRANSPORT_FRAME_TYPES } from "./transportCodec"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const heartbeatFrame = (transportId, connectionId, sequence, serverTs) => freezeDeep({
  frameType: TRANSPORT_FRAME_TYPES.HEARTBEAT,
  protocolVersion: TRANSPORT_PROTOCOL_VERSION,
  transportId,
  connectionId,
  sequence,
  serverTs,
  checksum: stableHash({ frameType: TRANSPORT_FRAME_TYPES.HEARTBEAT, transportId, connectionId, sequence, serverTs })
})

const parseUrl = (value) => {
  try {
    return typeof value === "string" && value.length > 0 ? new URL(value) : null
  } catch {
    return null
  }
}

export function createWebSocketTransport(options = {}) {
  const adapter = options.adapter || createTransportAdapter({
    nodeId: options.nodeId || options.transportId || "ws-transport",
    maxQueue: options.maxQueue || 256,
    protocolVersion: options.protocolVersion || TRANSPORT_PROTOCOL_VERSION,
    reliabilityLayer: options.reliabilityLayer
  })
  const WebSocketCtor = options.WebSocketCtor || globalThis.WebSocket || null
  const transportId = adapter.nodeId
  const endpoint = parseUrl(options.url || options.endpoint || null)
  const reconnectDelayMs = Math.max(100, Number(options.reconnectDelayMs) || 1000)
  const heartbeatIntervalMs = Math.max(1000, Number(options.heartbeatIntervalMs) || 15000)
  const heartbeatTimeoutMs = Math.max(heartbeatIntervalMs, Number(options.heartbeatTimeoutMs) || 30000)
  const maxReconnectAttempts = Math.max(0, Number(options.maxReconnectAttempts) || 5)
  const protocolVersion = Math.max(TRANSPORT_PROTOCOL_VERSION, Number(options.protocolVersion) || TRANSPORT_PROTOCOL_VERSION)
  const reconnectToken = typeof options.reconnectToken === "string" ? options.reconnectToken : stableHash({ transportId, endpoint: endpoint?.toString() || null, protocolVersion })

  let socket = null
  let connectionId = null
  let state = "idle"
  let nextReconnectAt = null
  let lastHeartbeatAt = 0
  let lastPongAt = 0
  let lastPingAt = 0
  let lastLatencyMs = null
  let connectedAt = 0
  let attempt = 0
  let heartbeatFailures = 0
  let reconnectCount = 0
  let packetLossCount = 0
  let duplicateCount = 0
  let incomingSequence = 0
  let lastIncomingPacketId = null
  let lastOutboundSequence = 0
  let metricsHistory = []

  const recordMetric = (entry) => {
    metricsHistory = [...metricsHistory, freezeDeep(entry)].slice(-Math.max(1, Number(options.maxMetrics) || 64))
  }

  const updateState = (nextState, reason = null) => {
    state = nextState
    recordMetric({ kind: "state", state, reason, at: lastHeartbeatAt || connectedAt || 0 })
  }

  const sendFrame = (frame) => {
    const payload = serializeTransportFrame(frame)
    if (socket && socket.readyState === 1) {
      socket.send(payload)
      return freezeDeep({ sent: true, frame })
    }
    packetLossCount += 1
    return freezeDeep({ sent: false, reason: "socket_not_open", frame })
  }

  const emitPacket = (packet, targetIds = []) => {
    const normalized = createTransportPacket({
      ...packet,
      protocolVersion,
      sourceId: packet.sourceId || transportId,
      channel: packet.channel || TRANSPORT_CHANNELS.CONTROL
    })
    adapter.send(normalized, targetIds, lastOutboundSequence + 1)
    lastOutboundSequence = normalized.sequence
    return sendFrame({
      frameType: TRANSPORT_FRAME_TYPES.PACKET,
      protocolVersion,
      transportId,
      connectionId,
      sequence: normalized.sequence,
      serverTs: normalized.serverTs,
      reconnectToken,
      packet: normalized
    })
  }

  const send = (packet, targetIds = [], now = lastOutboundSequence + 1) => emitPacket(packet, targetIds, now)

  const broadcast = (packet, targetIds = [], now = lastOutboundSequence + 1) => emitPacket({ ...packet, kind: "broadcast" }, targetIds, now)

  const request = (packet, targetId, now = lastOutboundSequence + 1) => emitPacket(createTransportPacket({ ...packet, kind: "request", targetId, sourceId: transportId, serverTs: now }), [targetId], now)

  const response = (requestPacket, payload = {}, now = lastOutboundSequence + 1) => emitPacket(createTransportPacket({
    kind: "response",
    eventType: requestPacket?.eventType || null,
    channel: requestPacket?.channel || TRANSPORT_CHANNELS.CONTROL,
    responseTo: requestPacket?.requestId || requestPacket?.packetId || null,
    requestId: requestPacket?.requestId || null,
    targetId: requestPacket?.sourceId || null,
    sourceId: transportId,
    serverTs: now,
    payload
  }), [requestPacket?.sourceId].filter(Boolean), now)

  const ack = (packet, now = lastOutboundSequence + 1) => emitPacket(createTransportPacket({
    kind: "ack",
    eventType: packet?.eventType || null,
    channel: packet?.channel || TRANSPORT_CHANNELS.CONTROL,
    ackId: packet?.packetId || null,
    responseTo: packet?.responseTo || null,
    requestId: packet?.requestId || null,
    targetId: packet?.sourceId || null,
    sourceId: transportId,
    serverTs: now,
    payload: { acked: true }
  }), [packet?.sourceId].filter(Boolean), now)

  const processIncomingFrame = (event) => {
    const decoded = deserializeTransportFrame(event?.data)
    if (!decoded.valid) {
      packetLossCount += 1
      recordMetric({ kind: "drop", reason: decoded.reason || "invalid_frame", at: Date.now() })
      return freezeDeep({ accepted: false, reason: decoded.reason || "invalid_frame" })
    }

    const frame = decoded.frame
    if (frame.frameType === TRANSPORT_FRAME_TYPES.HEARTBEAT || frame.frameType === TRANSPORT_FRAME_TYPES.PING) {
      lastPongAt = Number(frame.serverTs) || Date.now()
      return sendFrame({
        frameType: TRANSPORT_FRAME_TYPES.PONG,
        protocolVersion,
        transportId,
        connectionId,
        sequence: frame.sequence,
        serverTs: lastPongAt,
        heartbeatId: frame.heartbeatId,
        reconnectToken,
        payload: { pong: true }
      })
    }

    if (frame.frameType === TRANSPORT_FRAME_TYPES.PONG || frame.frameType === TRANSPORT_FRAME_TYPES.HEARTBEAT_ACK) {
      lastPongAt = Number(frame.serverTs) || Date.now()
      lastLatencyMs = Math.max(0, Number(lastPongAt) - Number(frame.payload?.sentAt || lastPingAt || lastHeartbeatAt || lastPongAt))
      recordMetric({ kind: "heartbeat", latencyMs: lastLatencyMs, at: lastPongAt })
      return freezeDeep({ accepted: true, frame })
    }

    if (frame.frameType === TRANSPORT_FRAME_TYPES.CONNECT) {
      connectionId = typeof frame.connectionId === "string" ? frame.connectionId : connectionId || stableHash({ transportId, reconnectToken, at: frame.serverTs })
      connectedAt = Number(frame.serverTs) || Date.now()
      updateState("connected", "connect")
      return freezeDeep({ accepted: true, frame })
    }

    if (frame.frameType === TRANSPORT_FRAME_TYPES.DISCONNECT) {
      updateState("disconnected", "disconnect")
      return freezeDeep({ accepted: true, frame })
    }

    const packet = frame.packet || null
    if (!packet) {
      return freezeDeep({ accepted: false, reason: "missing_packet" })
    }

    const validation = validateTransportPacket(packet, { supportedVersion: protocolVersion })
    if (!validation.valid) {
      packetLossCount += 1
      return freezeDeep({ accepted: false, reason: validation.reasons[0] || "invalid_packet", validation })
    }

    if (lastIncomingPacketId === packet.packetId) {
      duplicateCount += 1
      return freezeDeep({ accepted: false, reason: "duplicate_packet", duplicate: true, packet })
    }

    lastIncomingPacketId = packet.packetId
    incomingSequence = Math.max(incomingSequence, packet.sequence)
    adapter.receiveFromRouter(packet, Number(packet.serverTs) || Date.now())
    recordMetric({ kind: "packet", packetId: packet.packetId, sequence: packet.sequence, at: Number(packet.serverTs) || Date.now() })
    return freezeDeep({ accepted: true, packet, validation })
  }

  const connect = (nextOptions = {}) => {
    if (!endpoint && !nextOptions.url && !nextOptions.endpoint) {
      updateState("simulated", "fallback")
      return freezeDeep({ connected: false, reason: "missing_endpoint", fallback: true, snapshot: getSnapshot() })
    }
    if (!WebSocketCtor) {
      updateState("simulated", "no_websocket_ctor")
      return freezeDeep({ connected: false, reason: "missing_websocket_ctor", fallback: true, snapshot: getSnapshot() })
    }

    const url = parseUrl(nextOptions.url || nextOptions.endpoint || endpoint?.toString())
    if (!url) {
      updateState("simulated", "bad_url")
      return freezeDeep({ connected: false, reason: "invalid_url", fallback: true, snapshot: getSnapshot() })
    }

    try {
      socket = new WebSocketCtor(url.toString(), nextOptions.protocols || options.protocols || [])
      attempt += 1
      updateState("connecting", null)
      socket.onopen = () => {
        const connectedNow = Math.max(0, Number(nextOptions.now ?? options.now ?? Date.now()) || 0)
        connectionId = nextOptions.connectionId || connectionId || stableHash({ transportId, reconnectToken, connectedAt: connectedNow })
        connectedAt = connectedNow
        lastHeartbeatAt = connectedNow
        lastPongAt = connectedNow
        updateState("connected", "open")
        sendFrame({
          frameType: TRANSPORT_FRAME_TYPES.CONNECT,
          protocolVersion,
          transportId,
          connectionId,
          reconnectToken,
          sequence: lastOutboundSequence,
          serverTs: connectedNow,
          payload: { protocolVersion, reconnectToken, transportId }
        })
      }
      socket.onmessage = processIncomingFrame
      socket.onerror = (error) => {
        recordMetric({ kind: "error", reason: error?.message || "socket_error", at: Date.now() })
      }
      socket.onclose = () => {
        updateState("disconnected", "close")
        if (attempt <= maxReconnectAttempts) {
          nextReconnectAt = Date.now() + reconnectDelayMs
          reconnectCount += 1
          recordMetric({ kind: "reconnect-scheduled", at: nextReconnectAt, attempt })
        }
      }
      return freezeDeep({ connected: true, url: url.toString(), protocolVersion, connectionId })
    } catch (error) {
      updateState("error", "connect_failed")
      return freezeDeep({ connected: false, reason: error?.message || "connect_failed", fallback: true })
    }
  }

  const disconnect = (reason = "client_disconnect") => {
    if (socket && socket.readyState <= 1) {
      try {
        sendFrame({
          frameType: TRANSPORT_FRAME_TYPES.DISCONNECT,
          protocolVersion,
          transportId,
          connectionId,
          reconnectToken,
          sequence: lastOutboundSequence + 1,
          serverTs: Date.now(),
          payload: { reason }
        })
      } catch {
        // ignore transport tear-down errors
      }
      try {
        socket.close(1000, reason)
      } catch {
        // ignore close failures in tests and fallback transports
      }
    }
    updateState("disconnected", reason)
    socket = null
    return freezeDeep({ disconnected: true, reason })
  }

  const reconnect = (nextOptions = {}) => {
    reconnectCount += 1
    disconnect("reconnect")
    attempt = Math.min(attempt + 1, maxReconnectAttempts + 1)
    return connect({ ...nextOptions, reconnectToken })
  }

  const heartbeat = (now = Date.now()) => {
    lastHeartbeatAt = Number(now) || Date.now()
    if (lastPongAt && lastHeartbeatAt - lastPongAt > heartbeatTimeoutMs) {
      heartbeatFailures += 1
      updateState("heartbeat-timeout", "timeout")
      disconnect("heartbeat_timeout")
      return freezeDeep({ ok: false, reason: "heartbeat_timeout", heartbeatFailures })
    }
    const frame = heartbeatFrame(transportId, connectionId, lastOutboundSequence + 1, lastHeartbeatAt)
    lastPingAt = lastHeartbeatAt
    const sent = sendFrame({
      ...frame,
      frameType: TRANSPORT_FRAME_TYPES.PING,
      reconnectToken,
      payload: { sentAt: lastHeartbeatAt }
    })
    if (!sent.sent) {
      heartbeatFailures += 1
    }
    return freezeDeep({ ok: Boolean(sent.sent), sentAt: lastHeartbeatAt, heartbeatFailures })
  }

  const ping = (now = Date.now()) => heartbeat(now)

  const pong = (now = Date.now(), input = {}) => sendFrame({
    frameType: TRANSPORT_FRAME_TYPES.PONG,
    protocolVersion,
    transportId,
    connectionId,
    reconnectToken,
    sequence: lastOutboundSequence + 1,
    serverTs: Number(now) || Date.now(),
    payload: { sentAt: Number(input.sentAt) || lastPingAt || now }
  })

  const tick = (now = Date.now()) => {
    const current = Number(now) || Date.now()
    if (socket && socket.readyState === 1 && current - lastHeartbeatAt >= heartbeatIntervalMs) {
      heartbeat(current)
    }
    if (nextReconnectAt && current >= nextReconnectAt && state !== "connected") {
      nextReconnectAt = null
      reconnect({ reconnectToken })
    }
    return freezeDeep({
      state,
      current,
      connectionId,
      metrics: getMetrics(),
      adapter: adapter.getSnapshot()
    })
  }

  const getMetrics = () => freezeDeep({
    latencyMs: lastLatencyMs,
    packetLossCount,
    reconnectCount,
    heartbeatFailures,
    duplicateCount,
    connectedAt,
    lastHeartbeatAt,
    lastPongAt,
    lastPingAt,
    metricsHistory
  })

  const serializePacket = (packet) => serializeTransportFrame({
    frameType: TRANSPORT_FRAME_TYPES.PACKET,
    protocolVersion,
    transportId,
    connectionId,
    reconnectToken,
    sequence: packet.sequence,
    serverTs: packet.serverTs,
    packet
  })

  const deserializePacket = (message) => deserializeTransportFrame(message)

  const getSnapshot = () => freezeDeep({
    transportId,
    protocolVersion,
    state,
    connectionId,
    reconnectToken,
    endpoint: endpoint?.toString() || null,
    socketReadyState: socket?.readyState ?? null,
    connectedAt,
    lastHeartbeatAt,
    lastPongAt,
    lastLatencyMs,
    attempt,
    nextReconnectAt,
    metrics: getMetrics(),
    adapter: adapter.getSnapshot(),
    transportHash: stableHash({ transportId, protocolVersion, state, connectionId, reconnectToken, metrics: getMetrics(), adapter: adapter.getSnapshot() })
  })

  return Object.freeze({
    nodeId: adapter.nodeId,
    protocolVersion,
    connect,
    disconnect,
    reconnect,
    heartbeat,
    ping,
    pong,
    send,
    broadcast,
    request,
    response,
    ack,
    receive: adapter.receive,
    receiveFromRouter: adapter.receiveFromRouter,
    retry: adapter.retry,
    drainInbound: adapter.drainInbound,
    drainOutbound: adapter.drainOutbound,
    bindRouter: adapter.bindRouter,
    tick,
    getMetrics,
    getSnapshot,
    serializePacket,
    deserializePacket,
    receiveFromSocket: processIncomingFrame,
    sendFrame,
    reconnectToken,
    transportId,
    reliability: adapter.reliability
  })
}

export default { createWebSocketTransport }