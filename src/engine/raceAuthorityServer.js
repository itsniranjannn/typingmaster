import { stableHash } from "./replayConsumerValidation"
import { createTransportResponse, NETWORK_EVENT_TYPES, validateTransportPacket } from "./transportContracts"
import { deserializeTransportFrame, serializeTransportFrame, TRANSPORT_FRAME_TYPES } from "./transportCodec"
import { createRoomLifecycleService } from "./roomLifecycleService"
import { createParticipantRegistry } from "./participantRegistry"
import { createPlacementEngine } from "./placementEngine"
import { createRaceCoordinator } from "./raceCoordinator"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const AUTHORITY_ROOM_EVENTS = Object.freeze({
  ROOM_CREATE: NETWORK_EVENT_TYPES.ROOM_CREATE,
  ROOM_JOIN: NETWORK_EVENT_TYPES.ROOM_JOIN,
  ROOM_LEAVE: NETWORK_EVENT_TYPES.ROOM_LEAVE,
  SPECTATOR_JOIN: NETWORK_EVENT_TYPES.SPECTATOR_JOIN,
  COUNTDOWN: NETWORK_EVENT_TYPES.RACE_COUNTDOWN,
  RACE_START: NETWORK_EVENT_TYPES.RACE_START,
  CHECKPOINT: NETWORK_EVENT_TYPES.CHECKPOINT_VERIFY,
  RACE_FINISH: NETWORK_EVENT_TYPES.RACE_FINISH
})

const buildHeartbeatFrame = (transportId, connectionId, serverTs, packetId) => freezeDeep({
  frameType: TRANSPORT_FRAME_TYPES.PONG,
  protocolVersion: 1,
  transportId,
  connectionId,
  serverTs,
  checksum: stableHash({ frameType: TRANSPORT_FRAME_TYPES.PONG, transportId, connectionId, serverTs, packetId })
})

export function createRaceAuthorityServer(options = {}) {
  const roomLifecycleService = options.roomLifecycleService || createRoomLifecycleService(options.roomLifecycleOptions || {})
  const participantRegistry = options.participantRegistry || createParticipantRegistry(options.participantRegistryOptions || {})
  const placementEngine = options.placementEngine || createPlacementEngine(options.placementOptions || {})
  const coordinator = options.coordinator || createRaceCoordinator({
    roomLifecycleService,
    participantRegistry,
    placementEngine,
    minimumParticipants: options.minimumParticipants
  })
  const transportId = typeof options.transportId === "string" ? options.transportId : "authority-server"
  let connectionState = "idle"
  let events = []

  const recordEvent = (type, roomId, payload = {}, actorId = null, serverTs = 0) => {
    const event = freezeDeep({
      sequence: events.length + 1,
      serverTs,
      roomId,
      actorId,
      type,
      payload,
      eventHash: stableHash({ sequence: events.length + 1, serverTs, roomId, actorId, type, payload })
    })
    events = [...events, event].slice(-Math.max(16, Number(options.maxEvents) || 512))
    return event
  }

  const buildResponsePacket = (requestPacket, payload = {}) => createTransportResponse(requestPacket, {
    sourceId: transportId,
    targetId: requestPacket?.sourceId || null,
    payload: freezeDeep(payload)
  })

  const handleCommand = (packet = {}) => {
    const roomId = typeof packet.roomId === "string" ? packet.roomId : packet.payload?.roomId || packet.payload?.room?.id || "room"
    const serverTs = Math.max(0, Number(packet.serverTs) || 0)
    let outcome = { accepted: false, reason: "unsupported_packet" }

    if (packet.eventType === NETWORK_EVENT_TYPES.ROOM_CREATE) {
      outcome = coordinator.createRoom(packet.payload?.room || { id: roomId }, serverTs)
      recordEvent(AUTHORITY_ROOM_EVENTS.ROOM_CREATE, roomId, { room: packet.payload?.room || { id: roomId } }, packet.sourceId, serverTs)
    } else if (packet.eventType === NETWORK_EVENT_TYPES.ROOM_JOIN) {
      outcome = coordinator.admitParticipant(roomId, packet.payload?.participant || { id: packet.sourceId }, serverTs, { reconnectToken: packet.payload?.reconnectToken })
      if (outcome.accepted) recordEvent(AUTHORITY_ROOM_EVENTS.ROOM_JOIN, roomId, { participant: outcome.participant }, packet.sourceId, serverTs)
    } else if (packet.eventType === NETWORK_EVENT_TYPES.ROOM_LEAVE) {
      outcome = coordinator.leaveParticipant(roomId, packet.payload?.participantId || packet.sourceId, serverTs, packet.payload?.reason || "left")
      recordEvent(AUTHORITY_ROOM_EVENTS.ROOM_LEAVE, roomId, { participantId: packet.payload?.participantId || packet.sourceId }, packet.sourceId, serverTs)
    } else if (packet.eventType === NETWORK_EVENT_TYPES.SPECTATOR_JOIN) {
      outcome = coordinator.admitSpectator(roomId, packet.payload?.spectator || { id: packet.sourceId }, serverTs)
      recordEvent(AUTHORITY_ROOM_EVENTS.SPECTATOR_JOIN, roomId, { spectator: outcome.spectator }, packet.sourceId, serverTs)
    } else if (packet.eventType === NETWORK_EVENT_TYPES.RACE_COUNTDOWN) {
      outcome = coordinator.startCountdown(roomId, serverTs, packet.payload?.durationMs || 3000)
      recordEvent(AUTHORITY_ROOM_EVENTS.COUNTDOWN, roomId, { countdown: outcome.countdown }, packet.sourceId, serverTs)
    } else if (packet.eventType === NETWORK_EVENT_TYPES.RACE_START) {
      outcome = coordinator.startRace(roomId, serverTs)
      recordEvent(AUTHORITY_ROOM_EVENTS.RACE_START, roomId, {}, packet.sourceId, serverTs)
    } else if (packet.eventType === NETWORK_EVENT_TYPES.CHECKPOINT_VERIFY || packet.eventType === NETWORK_EVENT_TYPES.RACE_PROGRESS) {
      const checkpoint = packet.payload?.checkpoint || packet.payload || {}
      outcome = coordinator.reportCheckpoint(roomId, packet.payload?.participantId || packet.sourceId, checkpoint, serverTs)
      recordEvent(AUTHORITY_ROOM_EVENTS.CHECKPOINT, roomId, { checkpoint: outcome.checkpoint }, packet.sourceId, serverTs)
    } else if (packet.eventType === NETWORK_EVENT_TYPES.RACE_FINISH) {
      if (packet.payload?.participantId) {
        outcome = coordinator.finishParticipant(roomId, packet.payload.participantId, packet.payload.summary || packet.payload || {}, serverTs)
        recordEvent("PLAYER_FINISHED", roomId, { participantId: packet.payload.participantId }, packet.sourceId, serverTs)
      } else {
        outcome = coordinator.finishRace(roomId, serverTs, packet.payload?.result || packet.payload || {})
        recordEvent(AUTHORITY_ROOM_EVENTS.RACE_FINISH, roomId, { result: outcome.result }, packet.sourceId, serverTs)
      }
    } else if (packet.eventType === NETWORK_EVENT_TYPES.DESYNC_REPORT) {
      const validation = coordinator.validateReconnectToken(roomId, packet.payload?.participantId || packet.sourceId, packet.payload?.reconnectToken || null, { snapshotHash: coordinator.getRoomSnapshot(roomId)?.hashes?.snapshotHash || null, sequence: coordinator.getRoomSnapshot(roomId)?.sequence || 0, serverTs })
      outcome = freezeDeep({ accepted: validation.valid, validation })
    }

    const roomSnapshot = coordinator.getRoomSnapshot(roomId)
    return freezeDeep({
      accepted: Boolean(outcome?.accepted ?? true),
      outcome,
      roomSnapshot,
      authorityEvents: events,
      transportPacket: buildResponsePacket(packet, { accepted: Boolean(outcome?.accepted ?? true), roomSnapshot, outcome, authorityEvents: events })
    })
  }

  const handleTransportPacket = (packet = {}) => {
    const validation = validateTransportPacket(packet)
    if (!validation.valid) {
      return freezeDeep({ accepted: false, reason: validation.reasons[0] || "invalid_packet", validation, transportPacket: null })
    }
    const handled = handleCommand(packet)
    return freezeDeep({ ...handled, validation })
  }

  const handleTransportFrame = (frameInput) => {
    const decoded = deserializeTransportFrame(frameInput)
    if (!decoded.valid) {
      return freezeDeep({ accepted: false, reason: decoded.reason || "invalid_frame", frames: [], transportPacket: null })
    }
    const frame = decoded.frame
    if (frame.frameType === TRANSPORT_FRAME_TYPES.CONNECT) {
      connectionState = "connected"
      return freezeDeep({ accepted: true, frames: [serializeTransportFrame(buildHeartbeatFrame(transportId, frame.connectionId || null, frame.serverTs || 0, frame.sequence || 0))], transportPacket: null })
    }
    if (frame.frameType === TRANSPORT_FRAME_TYPES.PING || frame.frameType === TRANSPORT_FRAME_TYPES.HEARTBEAT) {
      return freezeDeep({ accepted: true, frames: [serializeTransportFrame(buildHeartbeatFrame(transportId, frame.connectionId || null, frame.serverTs || 0, frame.sequence || 0))], transportPacket: null })
    }
    if (frame.frameType === TRANSPORT_FRAME_TYPES.DISCONNECT) {
      connectionState = "disconnected"
      return freezeDeep({ accepted: true, frames: [], transportPacket: null })
    }
    if (frame.packet) {
      const handled = handleTransportPacket(frame.packet)
      const responseFrame = serializeTransportFrame({
        frameType: TRANSPORT_FRAME_TYPES.PACKET,
        protocolVersion: 1,
        transportId,
        connectionId: frame.connectionId || null,
        sequence: handled.transportPacket?.sequence || frame.packet.sequence,
        serverTs: frame.serverTs || frame.packet.serverTs || 0,
        packet: handled.transportPacket || frame.packet
      })
      return freezeDeep({ accepted: handled.accepted, frames: [responseFrame], packet: handled.transportPacket, outcome: handled })
    }
    return freezeDeep({ accepted: false, reason: "missing_packet", frames: [], transportPacket: null })
  }

  const ingestTransport = (packet = {}) => handleTransportPacket(packet)

  const attachTransport = (transport) => {
    if (!transport || typeof transport.receiveFromRouter !== "function") return freezeDeep({ attached: false, reason: "invalid_transport" })
    return freezeDeep({ attached: true, transportId: transport.nodeId || transport.transportId || null })
  }

  const validateReconnectToken = (roomId, participantId, token, snapshot) => coordinator.validateReconnectToken(roomId, participantId, token, snapshot)

  const tick = (serverTs = 0) => {
    const roomTicks = coordinator.tick(undefined, serverTs)
    return freezeDeep({
      serverTs,
      rooms: Array.isArray(roomTicks) ? roomTicks : [roomTicks],
      roomCount: coordinator.getSnapshot().roomCount,
      connectionState,
      authorityEvents: events,
      transportHash: stableHash({ serverTs, events, connectionState, rooms: coordinator.getSnapshot().rooms })
    })
  }

  const getSnapshot = () => {
    const serverSnapshot = coordinator.getSnapshot()
    return freezeDeep({
      transportId,
      connectionState,
      events,
      roomLifecycle: roomLifecycleService.getSnapshot(),
      participants: participantRegistry.getSnapshot(),
      coordinator: serverSnapshot,
      authorityHash: stableHash({ transportId, connectionState, events, serverSnapshot })
    })
  }

  return Object.freeze({
    createRoom: coordinator.createRoom,
    destroyRoom: coordinator.destroyRoom,
    admitParticipant: coordinator.admitParticipant,
    leaveParticipant: coordinator.leaveParticipant,
    admitSpectator: coordinator.admitSpectator,
    reportCheckpoint: coordinator.reportCheckpoint,
    startCountdown: coordinator.startCountdown,
    startRace: coordinator.startRace,
    finishParticipant: coordinator.finishParticipant,
    finishRace: coordinator.finishRace,
    validateReconnectToken,
    ingestTransport,
    handleTransportPacket,
    handleTransportFrame,
    attachTransport,
    tick,
    getSnapshot,
    roomLifecycleService,
    participantRegistry,
    placementEngine,
    coordinator,
    AUTHORITY_EVENT_TYPES: AUTHORITY_ROOM_EVENTS
  })
}

export default { createRaceAuthorityServer }
