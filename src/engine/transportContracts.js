import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

export const TRANSPORT_PROTOCOL_VERSION = 1
export const TRANSPORT_PROTOCOL_MIN_VERSION = 1

export const TRANSPORT_PACKET_KINDS = Object.freeze({
  EVENT: "event",
  REQUEST: "request",
  RESPONSE: "response",
  ACK: "ack",
  RETRY: "retry",
  BROADCAST: "broadcast"
})

export const NETWORK_EVENT_TYPES = Object.freeze({
  ROOM_CREATE: "ROOM_CREATE",
  ROOM_JOIN: "ROOM_JOIN",
  ROOM_LEAVE: "ROOM_LEAVE",
  ROOM_CLOSE: "ROOM_CLOSE",
  RACE_READY: "RACE_READY",
  RACE_COUNTDOWN: "RACE_COUNTDOWN",
  RACE_START: "RACE_START",
  RACE_PROGRESS: "RACE_PROGRESS",
  RACE_FINISH: "RACE_FINISH",
  SPECTATOR_JOIN: "SPECTATOR_JOIN",
  SPECTATOR_LEAVE: "SPECTATOR_LEAVE",
  SPECTATOR_SYNC: "SPECTATOR_SYNC",
  CHECKPOINT_VERIFY: "CHECKPOINT_VERIFY",
  REPLAY_VERIFY: "REPLAY_VERIFY",
  DESYNC_REPORT: "DESYNC_REPORT"
})

export const TRANSPORT_CHANNELS = Object.freeze({
  ROOM: "room",
  RACE: "race",
  SPECTATOR: "spectator",
  INTEGRITY: "integrity",
  CONTROL: "control"
})

const roomEventTypes = new Set([NETWORK_EVENT_TYPES.ROOM_CREATE, NETWORK_EVENT_TYPES.ROOM_JOIN, NETWORK_EVENT_TYPES.ROOM_LEAVE, NETWORK_EVENT_TYPES.ROOM_CLOSE])
const raceEventTypes = new Set([NETWORK_EVENT_TYPES.RACE_READY, NETWORK_EVENT_TYPES.RACE_COUNTDOWN, NETWORK_EVENT_TYPES.RACE_START, NETWORK_EVENT_TYPES.RACE_PROGRESS, NETWORK_EVENT_TYPES.RACE_FINISH])
const spectatorEventTypes = new Set([NETWORK_EVENT_TYPES.SPECTATOR_JOIN, NETWORK_EVENT_TYPES.SPECTATOR_LEAVE, NETWORK_EVENT_TYPES.SPECTATOR_SYNC])
const integrityEventTypes = new Set([NETWORK_EVENT_TYPES.CHECKPOINT_VERIFY, NETWORK_EVENT_TYPES.REPLAY_VERIFY, NETWORK_EVENT_TYPES.DESYNC_REPORT])

const channelByEventType = (eventType) => {
  if (roomEventTypes.has(eventType)) return TRANSPORT_CHANNELS.ROOM
  if (raceEventTypes.has(eventType)) return TRANSPORT_CHANNELS.RACE
  if (spectatorEventTypes.has(eventType)) return TRANSPORT_CHANNELS.SPECTATOR
  if (integrityEventTypes.has(eventType)) return TRANSPORT_CHANNELS.INTEGRITY
  return TRANSPORT_CHANNELS.CONTROL
}

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function createTransportPacket(input = {}) {
  const protocolVersion = Math.max(TRANSPORT_PROTOCOL_MIN_VERSION, Number(input.protocolVersion) || TRANSPORT_PROTOCOL_VERSION)
  const sequence = Math.max(0, Number(input.sequence) || 0)
  const packetId = typeof input.packetId === "string" ? input.packetId : stableHash({
    protocolVersion,
    kind: input.kind || TRANSPORT_PACKET_KINDS.EVENT,
    eventType: input.eventType || null,
    sequence,
    channel: input.channel || null,
    sourceId: input.sourceId || null,
    targetId: input.targetId || null,
    requestId: input.requestId || null,
    responseTo: input.responseTo || null,
    ackId: input.ackId || null,
    payload: isPlainObject(input.payload) ? input.payload : input.payload ?? null
  })
  const kind = Object.values(TRANSPORT_PACKET_KINDS).includes(input.kind) ? input.kind : TRANSPORT_PACKET_KINDS.EVENT
  const eventType = typeof input.eventType === "string" ? input.eventType : null
  const channel = typeof input.channel === "string" ? input.channel : channelByEventType(eventType)
  const payload = isPlainObject(input.payload) ? input.payload : input.payload ?? {}
  const packet = {
    protocolVersion,
    packetId,
    kind,
    eventType,
    channel,
    sequence,
    serverTs: Math.max(0, safeNumber(input.serverTs, 0)),
    clientTs: Number.isFinite(Number(input.clientTs)) ? Number(input.clientTs) : null,
    sourceId: typeof input.sourceId === "string" ? input.sourceId : null,
    targetId: typeof input.targetId === "string" ? input.targetId : null,
    requestId: typeof input.requestId === "string" ? input.requestId : null,
    responseTo: typeof input.responseTo === "string" ? input.responseTo : null,
    ackId: typeof input.ackId === "string" ? input.ackId : null,
    retryOf: typeof input.retryOf === "string" ? input.retryOf : null,
    attempt: Math.max(0, Number(input.attempt) || 0),
    maxAttempts: Math.max(1, Number(input.maxAttempts) || 3),
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : 0,
    payload,
    headers: isPlainObject(input.headers) ? input.headers : {},
    metadata: isPlainObject(input.metadata) ? input.metadata : {},
    checksum: typeof input.checksum === "string" ? input.checksum : stableHash({ protocolVersion, packetId, kind, eventType, channel, sequence, serverTs: Math.max(0, safeNumber(input.serverTs, 0)), sourceId: typeof input.sourceId === "string" ? input.sourceId : null, targetId: typeof input.targetId === "string" ? input.targetId : null, requestId: typeof input.requestId === "string" ? input.requestId : null, responseTo: typeof input.responseTo === "string" ? input.responseTo : null, ackId: typeof input.ackId === "string" ? input.ackId : null, payload, headers: isPlainObject(input.headers) ? input.headers : {}, metadata: isPlainObject(input.metadata) ? input.metadata : {} }),
    protocolHash: stableHash({ protocolVersion, kind, eventType, channel })
  }
  return freezeDeep(packet)
}

export function createTransportAck(packet, input = {}) {
  return createTransportPacket({
    kind: TRANSPORT_PACKET_KINDS.ACK,
    eventType: input.eventType || packet?.eventType || null,
    channel: input.channel || packet?.channel || channelByEventType(packet?.eventType),
    sequence: Math.max(0, Number(input.sequence ?? packet?.sequence) || 0),
    serverTs: Math.max(0, Number(input.serverTs ?? packet?.serverTs) || 0),
    sourceId: input.sourceId || packet?.targetId || null,
    targetId: input.targetId || packet?.sourceId || null,
    ackId: packet?.packetId || null,
    requestId: packet?.requestId || null,
    responseTo: packet?.responseTo || null,
    payload: isPlainObject(input.payload) ? input.payload : { acked: true }
  })
}

export function createTransportRequest(input = {}) {
  return createTransportPacket({
    ...input,
    kind: TRANSPORT_PACKET_KINDS.REQUEST,
    requestId: typeof input.requestId === "string" ? input.requestId : stableHash({ sourceId: input.sourceId || null, targetId: input.targetId || null, sequence: Number(input.sequence) || 0, eventType: input.eventType || null })
  })
}

export function createTransportResponse(requestPacket, input = {}) {
  return createTransportPacket({
    ...input,
    kind: TRANSPORT_PACKET_KINDS.RESPONSE,
    eventType: input.eventType || requestPacket?.eventType || null,
    channel: input.channel || requestPacket?.channel || channelByEventType(requestPacket?.eventType),
    responseTo: requestPacket?.requestId || requestPacket?.packetId || null,
    requestId: requestPacket?.requestId || null,
    targetId: input.targetId || requestPacket?.sourceId || null,
    sourceId: input.sourceId || requestPacket?.targetId || null
  })
}

export function isCompatibleTransportVersion(version) {
  const numeric = Number(version)
  return Number.isFinite(numeric) && numeric >= TRANSPORT_PROTOCOL_MIN_VERSION && numeric <= TRANSPORT_PROTOCOL_VERSION
}

export function validateTransportPacket(packet, options = {}) {
  const supportedVersion = Math.max(TRANSPORT_PROTOCOL_MIN_VERSION, Number(options.supportedVersion) || TRANSPORT_PROTOCOL_VERSION)
  const reasons = []
  if (!packet || typeof packet !== "object") reasons.push("missing_packet")
  else {
    if (!isCompatibleTransportVersion(packet.protocolVersion) || packet.protocolVersion > supportedVersion) reasons.push("protocol_version")
    if (typeof packet.packetId !== "string" || packet.packetId.length === 0) reasons.push("packet_id")
    if (!Object.values(TRANSPORT_PACKET_KINDS).includes(packet.kind)) reasons.push("kind")
    if (!Number.isFinite(Number(packet.sequence)) || Number(packet.sequence) < 0) reasons.push("sequence")
    if (packet.eventType && !(roomEventTypes.has(packet.eventType) || raceEventTypes.has(packet.eventType) || spectatorEventTypes.has(packet.eventType) || integrityEventTypes.has(packet.eventType))) reasons.push("event_type")
    if (packet.kind === TRANSPORT_PACKET_KINDS.REQUEST && !packet.requestId) reasons.push("request_id")
    if (packet.kind === TRANSPORT_PACKET_KINDS.RESPONSE && !packet.responseTo) reasons.push("response_to")
  }
  return freezeDeep({
    valid: reasons.length === 0,
    reasons,
    packetId: packet?.packetId || null,
    protocolVersion: packet?.protocolVersion ?? null,
    packetHash: packet?.checksum || null
  })
}

export function validateTransportCompatibility(packet, supportedVersion = TRANSPORT_PROTOCOL_VERSION) {
  const validation = validateTransportPacket(packet, { supportedVersion })
  return freezeDeep({
    compatible: validation.valid,
    validation,
    channel: packet?.channel || null,
    eventType: packet?.eventType || null
  })
}

export default {
  TRANSPORT_PROTOCOL_VERSION,
  TRANSPORT_PROTOCOL_MIN_VERSION,
  TRANSPORT_PACKET_KINDS,
  NETWORK_EVENT_TYPES,
  TRANSPORT_CHANNELS,
  createTransportPacket,
  createTransportAck,
  createTransportRequest,
  createTransportResponse,
  isCompatibleTransportVersion,
  validateTransportPacket,
  validateTransportCompatibility
}