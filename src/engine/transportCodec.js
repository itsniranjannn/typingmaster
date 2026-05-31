import { stableHash } from "./replayConsumerValidation"
import { createTransportPacket, validateTransportPacket, TRANSPORT_PROTOCOL_VERSION } from "./transportContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const safeJsonParse = (text) => {
  if (typeof text !== "string") return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const TRANSPORT_FRAME_TYPES = Object.freeze({
  PACKET: "packet",
  HEARTBEAT: "heartbeat",
  HEARTBEAT_ACK: "heartbeat-ack",
  PING: "ping",
  PONG: "pong",
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  RECONNECT: "reconnect",
  METRICS: "metrics"
})

export function serializeTransportFrame(frame = {}) {
  const normalized = freezeDeep({
    frameType: typeof frame.frameType === "string" ? frame.frameType : TRANSPORT_FRAME_TYPES.PACKET,
    protocolVersion: Math.max(TRANSPORT_PROTOCOL_VERSION, Number(frame.protocolVersion) || TRANSPORT_PROTOCOL_VERSION),
    transportId: typeof frame.transportId === "string" ? frame.transportId : null,
    connectionId: typeof frame.connectionId === "string" ? frame.connectionId : null,
    reconnectToken: typeof frame.reconnectToken === "string" ? frame.reconnectToken : null,
    sequence: Math.max(0, Number(frame.sequence) || 0),
    serverTs: Math.max(0, Number(frame.serverTs) || 0),
    clientTs: Number.isFinite(Number(frame.clientTs)) ? Number(frame.clientTs) : null,
    heartbeatId: typeof frame.heartbeatId === "string" ? frame.heartbeatId : null,
    payload: frame.payload ?? null,
    metrics: frame.metrics || null,
    packet: frame.packet || null,
    checksum: typeof frame.checksum === "string" ? frame.checksum : stableHash({
      frameType: typeof frame.frameType === "string" ? frame.frameType : TRANSPORT_FRAME_TYPES.PACKET,
      protocolVersion: Math.max(TRANSPORT_PROTOCOL_VERSION, Number(frame.protocolVersion) || TRANSPORT_PROTOCOL_VERSION),
      transportId: typeof frame.transportId === "string" ? frame.transportId : null,
      connectionId: typeof frame.connectionId === "string" ? frame.connectionId : null,
      reconnectToken: typeof frame.reconnectToken === "string" ? frame.reconnectToken : null,
      sequence: Math.max(0, Number(frame.sequence) || 0),
      serverTs: Math.max(0, Number(frame.serverTs) || 0),
      clientTs: Number.isFinite(Number(frame.clientTs)) ? Number(frame.clientTs) : null,
      heartbeatId: typeof frame.heartbeatId === "string" ? frame.heartbeatId : null,
      payload: frame.payload ?? null,
      metrics: frame.metrics || null,
      packet: frame.packet || null
    })
  })
  return JSON.stringify(normalized)
}

export function deserializeTransportFrame(input) {
  const frame = typeof input === "string" ? safeJsonParse(input) : input
  if (!frame || typeof frame !== "object") {
    return freezeDeep({ valid: false, reason: "invalid_frame", frame: null })
  }
  const packet = frame.packet ? createTransportPacket(frame.packet) : null
  const packetValidation = packet ? validateTransportPacket(packet) : null
  return freezeDeep({
    valid: frame.frameType !== TRANSPORT_FRAME_TYPES.PACKET || Boolean(packetValidation?.valid),
    reason: frame.frameType === TRANSPORT_FRAME_TYPES.PACKET && !packetValidation?.valid ? packetValidation.reasons[0] || "invalid_packet" : null,
    frame: freezeDeep(frame),
    packet,
    packetValidation,
    frameHash: frame.checksum || stableHash(frame)
  })
}

export default { serializeTransportFrame, deserializeTransportFrame, TRANSPORT_FRAME_TYPES }