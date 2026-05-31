import { stableHash } from "./replayConsumerValidation"
import { createAuthorityEvent, AUTHORITY_EVENT_TYPES, orderAuthorityEvents } from "./raceAuthorityEvents"
import { calculatePlacements } from "./placementEngine"
import { createRaceResult, createRaceSnapshot } from "./multiplayerDomainModel"
import { createReconnectRecoveryEngine } from "./reconnectRecoveryEngine"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const buildSnapshot = (roomSnapshot, context, registry, placements = [], result = null) => createRaceSnapshot({
  room: roomSnapshot.room,
  state: context.state,
  serverTs: context.lastServerTs,
  revision: roomSnapshot.revision,
  sequence: context.sequence,
  participants: registry.getRoomParticipants(context.roomId, { includeDisconnected: true }),
  spectators: registry.getRoomSpectators(context.roomId, { includeDisconnected: true }),
  checkpoints: registry.getRoomCheckpoints(context.roomId),
  countdown: context.countdown,
  result,
  events: orderAuthorityEvents(context.events),
  placements
})

export function createRaceCoordinator(options = {}) {
  const roomLifecycleService = options.roomLifecycleService
  const participantRegistry = options.participantRegistry
  const placementEngine = options.placementEngine || { calculatePlacements }
  const reconnectRecoveryEngine = options.reconnectRecoveryEngine || createReconnectRecoveryEngine(options.reconnectOptions || {})
  const minParticipants = Math.max(1, Number(options.minimumParticipants) || 2)
  const rooms = new Map()

  if (!roomLifecycleService) throw new Error("room_lifecycle_service_required")
  if (!participantRegistry) throw new Error("participant_registry_required")

  const getRoomContext = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, freezeDeep({
        roomId,
        state: "CREATED",
        sequence: 0,
        lastServerTs: 0,
        countdown: { phase: "pending", durationMs: 0, remainingMs: 0 },
        events: [],
        lastResult: null,
        lastPlacements: []
      }))
    }
    return rooms.get(roomId)
  }

  const setRoomContext = (roomId, nextContext) => {
    rooms.set(roomId, freezeDeep(nextContext))
    return rooms.get(roomId)
  }

  const appendEvent = (roomId, type, payload = {}, actorId = null, serverTs = 0) => {
    const context = getRoomContext(roomId)
    const event = createAuthorityEvent({
      sequence: context.sequence + 1,
      serverTs,
      roomId,
      actorId,
      type,
      payload
    })
    setRoomContext(roomId, {
      ...context,
      sequence: context.sequence + 1,
      lastServerTs: Math.max(context.lastServerTs, serverTs),
      events: [...context.events, event]
    })
    return event
  }

  const syncSnapshot = (roomId) => {
    const roomSnapshot = roomLifecycleService.getRoomSnapshot(roomId)
    if (!roomSnapshot) return null
    const context = getRoomContext(roomId)
    const placements = context.lastPlacements || []
    const nextSnapshot = buildSnapshot(roomSnapshot, context, participantRegistry, placements, context.lastResult)
    roomLifecycleService.replaceRoom(roomId, nextSnapshot)
    return nextSnapshot
  }

  const ensureRoom = (roomId, serverTs = 0, roomInput = {}) => {
    let roomSnapshot = roomLifecycleService.getRoomSnapshot(roomId)
    if (!roomSnapshot) {
      roomSnapshot = roomLifecycleService.createRoom({ id: roomId, createdAt: serverTs, ...roomInput })
      getRoomContext(roomId)
      appendEvent(roomId, AUTHORITY_EVENT_TYPES.ROOM_CREATED, { roomId }, null, serverTs)
      roomSnapshot = syncSnapshot(roomId)
    }
    return roomSnapshot
  }

  function createRoom(roomInput = {}, serverTs = 0) {
    const roomId = typeof roomInput.id === "string" ? roomInput.id : `room-${stableHash({ roomInput }).slice(0, 8)}`
    const roomSnapshot = ensureRoom(roomId, serverTs, roomInput)
    return freezeDeep({
      roomId,
      roomSnapshot,
      event: appendEvent(roomId, AUTHORITY_EVENT_TYPES.ROOM_CREATED, { room: roomInput }, null, serverTs)
    })
  }

  function destroyRoom(roomId, serverTs = 0, reason = "destroyed") {
    const destroyed = roomLifecycleService.destroyRoom(roomId, serverTs, reason)
    rooms.delete(roomId)
    participantRegistry.destroyRoom(roomId)
    return freezeDeep({
      destroyed,
      event: appendEvent(roomId, AUTHORITY_EVENT_TYPES.ROOM_DESTROYED || AUTHORITY_EVENT_TYPES.RACE_FINISHED, { reason }, null, serverTs)
    })
  }

  function admitParticipant(roomId, participant = {}, serverTs = 0, context = {}) {
    ensureRoom(roomId, serverTs)
    const currentRoom = roomLifecycleService.getRoomSnapshot(roomId)
    const issuedReconnectToken = participant.reconnectToken || context.reconnectToken || null
    const tokenValidation = issuedReconnectToken
      ? participantRegistry.validateReconnectToken(roomId, participant.id, issuedReconnectToken, { snapshotHash: currentRoom.hashes.snapshotHash, sequence: currentRoom.sequence, serverTs })
      : freezeDeep({ valid: true, reason: null })
    if (issuedReconnectToken && !tokenValidation.valid) {
      return freezeDeep({ accepted: false, reason: tokenValidation.reason, roomSnapshot: currentRoom, tokenValidation })
    }
    const admitted = participantRegistry.admitParticipant(roomId, { ...participant, reconnectToken: issuedReconnectToken }, serverTs)
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.PLAYER_JOINED, { participant: admitted }, admitted.id, serverTs)
    syncSnapshot(roomId)
    return freezeDeep({ accepted: true, participant: admitted, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId), tokenValidation })
  }

  function leaveParticipant(roomId, participantId, serverTs = 0, reason = "left") {
    ensureRoom(roomId, serverTs)
    const left = participantRegistry.removeParticipant(roomId, participantId, serverTs, reason)
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.PLAYER_LEFT, { participantId, reason }, participantId, serverTs)
    syncSnapshot(roomId)
    return freezeDeep({ participant: left, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
  }

  function admitSpectator(roomId, spectator = {}, serverTs = 0) {
    ensureRoom(roomId, serverTs)
    const admitted = participantRegistry.admitSpectator(roomId, spectator, serverTs)
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.SPECTATOR_ADMITTED, { spectator: admitted }, admitted.id, serverTs)
    syncSnapshot(roomId)
    return freezeDeep({ spectator: admitted, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
  }

  function reportCheckpoint(roomId, participantId, checkpoint = {}, serverTs = 0) {
    ensureRoom(roomId, serverTs)
    const roomSnapshot = roomLifecycleService.getRoomSnapshot(roomId)
    const storedCheckpoint = participantRegistry.reportCheckpoint(roomId, participantId, checkpoint, serverTs)
    const syncContract = { roomId, participantId, sequence: getRoomContext(roomId).sequence + 1, serverTs, snapshotRef: { revision: roomSnapshot.revision, state: getRoomContext(roomId).state, snapshotHash: roomSnapshot.hashes.snapshotHash, participantCount: roomSnapshot.participants.length, spectatorCount: roomSnapshot.spectators.length }, checkpoint: storedCheckpoint }
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.CHECKPOINT_REPORTED, { participantId, checkpoint: storedCheckpoint }, participantId, serverTs)
    reconnectRecoveryEngine.registerCheckpoint(storedCheckpoint)
    syncSnapshot(roomId)
    return freezeDeep({ accepted: true, checkpoint: storedCheckpoint, validation: { valid: true, reasons: [] }, syncContract, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
  }

  function startCountdown(roomId, serverTs = 0, durationMs = 3000) {
    ensureRoom(roomId, serverTs)
    const context = getRoomContext(roomId)
    const participantCount = participantRegistry.getRoomParticipants(roomId).length
    if (participantCount < minParticipants) {
      return freezeDeep({ accepted: false, reason: "insufficient_participants", roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
    }
    const countdown = freezeDeep({ phase: "countdown", durationMs: Math.max(0, Number(durationMs) || 0), remainingMs: Math.max(0, Number(durationMs) || 0), startedAt: serverTs })
    setRoomContext(roomId, { ...context, state: "COUNTDOWN", countdown })
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.COUNTDOWN_STARTED, { durationMs, countdown }, null, serverTs)
    syncSnapshot(roomId)
    return freezeDeep({ accepted: true, countdown, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
  }

  function startRace(roomId, serverTs = 0) {
    ensureRoom(roomId, serverTs)
    const context = getRoomContext(roomId)
    setRoomContext(roomId, { ...context, state: "RUNNING" })
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.RACE_STARTED, { roomId }, null, serverTs)
    syncSnapshot(roomId)
    return freezeDeep({ accepted: true, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
  }

  function finishParticipant(roomId, participantId, summary = {}, serverTs = 0) {
    ensureRoom(roomId, serverTs)
    const finished = participantRegistry.finishParticipant(roomId, participantId, summary, serverTs)
    if (!finished) {
      return freezeDeep({ accepted: false, reason: "missing_participant", roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
    }
    const placements = placementEngine.calculatePlacements({ participants: participantRegistry.getRoomParticipants(roomId, { includeDisconnected: true }) })
    const context = getRoomContext(roomId)
    setRoomContext(roomId, { ...context, lastPlacements: placements.placements })
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.PLAYER_FINISHED, { participantId, summary }, participantId, serverTs)
    syncSnapshot(roomId)
    return freezeDeep({ accepted: true, participant: finished, placements, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
  }

  function finishRace(roomId, serverTs = 0, result = {}) {
    ensureRoom(roomId, serverTs)
    const placements = placementEngine.calculatePlacements({ participants: participantRegistry.getRoomParticipants(roomId, { includeDisconnected: true }) })
    const raceResult = createRaceResult({ raceId: roomId, finishedAt: serverTs, placements: placements.placements, metadata: result })
    const context = getRoomContext(roomId)
    setRoomContext(roomId, { ...context, state: "FINISHED", lastPlacements: placements.placements, lastResult: raceResult })
    appendEvent(roomId, AUTHORITY_EVENT_TYPES.RACE_FINISHED, { result: raceResult, placements, payload: result }, null, serverTs)
    syncSnapshot(roomId)
    return freezeDeep({ accepted: true, result: raceResult, placements, roomSnapshot: roomLifecycleService.getRoomSnapshot(roomId) })
  }

  function validateReconnectToken(roomId, participantId, token, currentSnapshot = {}) {
    const validation = participantRegistry.validateReconnectToken(roomId, participantId, token, currentSnapshot)
    appendEvent(roomId, validation.valid ? AUTHORITY_EVENT_TYPES.RECONNECT_VALIDATED : AUTHORITY_EVENT_TYPES.RECONNECT_REJECTED, { participantId, token: typeof token === "string" ? token : token?.token || null, validation }, participantId, currentSnapshot.serverTs || 0)
    return validation
  }

  function tick(roomId, serverTs = 0) {
    if (typeof roomId !== "string") {
      return freezeDeep(roomLifecycleService.listRooms().map((room) => tick(room.room.id, serverTs)))
    }
    const roomSnapshot = roomLifecycleService.getRoomSnapshot(roomId)
    if (!roomSnapshot) return freezeDeep({ roomId, skipped: true, reason: "missing_room" })
    const context = getRoomContext(roomId)
    setRoomContext(roomId, { ...context, lastServerTs: Math.max(context.lastServerTs, serverTs) })
    const placements = placementEngine.calculatePlacements({ participants: participantRegistry.getRoomParticipants(roomId, { includeDisconnected: true }) })
    setRoomContext(roomId, { ...getRoomContext(roomId), lastPlacements: placements.placements })
    syncSnapshot(roomId)
    const latestSnapshot = roomLifecycleService.getRoomSnapshot(roomId)
    return freezeDeep({ roomId, roomSnapshot: latestSnapshot, countdown: getRoomContext(roomId).countdown, placements, state: { state: getRoomContext(roomId).state }, sync: { roomId, serverTs }, replayHash: stableHash({ roomId, roomSnapshot: latestSnapshot, events: getRoomContext(roomId).events, state: getRoomContext(roomId).state }) })
  }

  function getRoomSnapshot(roomId) {
    return roomLifecycleService.getRoomSnapshot(roomId) || null
  }

  function getSnapshot() {
    const roomsSnapshot = roomLifecycleService.listRooms().map((roomSnapshot) => {
      const context = getRoomContext(roomSnapshot.room.id)
      const placements = placementEngine.calculatePlacements({ participants: participantRegistry.getRoomParticipants(roomSnapshot.room.id, { includeDisconnected: true }) })
      return freezeDeep({
        roomId: roomSnapshot.room.id,
        room: roomSnapshot.room,
        state: { state: context.state },
        countdown: context.countdown,
        participants: participantRegistry.getRoomParticipants(roomSnapshot.room.id),
        spectators: participantRegistry.getRoomSpectators(roomSnapshot.room.id),
        checkpoints: participantRegistry.getRoomCheckpoints(roomSnapshot.room.id),
        events: orderAuthorityEvents(context.events),
        placements,
        result: context.lastResult,
        sync: { roomId: roomSnapshot.room.id, state: context.state },
        replayHash: stableHash({ roomId: roomSnapshot.room.id, roomSnapshot, events: context.events, state: context.state, countdown: context.countdown, placements })
      })
    })
    return freezeDeep({
      roomCount: roomsSnapshot.length,
      rooms: roomsSnapshot,
      coordinatorHash: stableHash(roomsSnapshot),
      reconnectRecovery: reconnectRecoveryEngine.getSnapshot()
    })
  }

  return Object.freeze({
    createRoom,
    destroyRoom,
    admitParticipant,
    leaveParticipant,
    admitSpectator,
    reportCheckpoint,
    startCountdown,
    startRace,
    finishParticipant,
    finishRace,
    validateReconnectToken,
    tick,
    getRoomSnapshot,
    getSnapshot,
    ensureRoom
  })
}

export default { createRaceCoordinator }
