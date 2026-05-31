import { stableHash } from "./replayConsumerValidation"
import { createRaceRoom, createRaceParticipant, createRaceSpectator, createRaceSnapshot } from "./multiplayerDomainModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const boundedPush = (items, value, maxEntries) => {
  const next = [...items, value]
  return next.length <= maxEntries ? next : next.slice(next.length - maxEntries)
}

export function createRaceRoomManager(options = {}) {
  const maxRooms = Math.max(1, Number(options.maxRooms) || 64)
  const maxAuditEntries = Math.max(8, Number(options.maxAuditEntries) || 256)
  const roomTtlMs = Math.max(1000, Number(options.roomTtlMs) || 120000)
  let rooms = new Map()
  let audit = []

  const appendAudit = (entry) => {
    audit = boundedPush(audit, freezeDeep(entry), maxAuditEntries)
  }

  function enforceRoomLimit() {
    const ordered = [...rooms.values()].sort((left, right) => left.room.createdAt - right.room.createdAt || left.room.id.localeCompare(right.room.id))
    while (ordered.length > maxRooms) {
      const room = ordered.shift()
      if (room) rooms.delete(room.room.id)
    }
  }

  function createRoom(input = {}) {
    const createdAt = Math.max(0, Number(input.createdAt) || 0)
    const room = createRaceRoom({
      id: input.id,
      seq: rooms.size,
      createdAt,
      expiresAt: createdAt + roomTtlMs,
      hostParticipantId: input.hostParticipantId,
      maxParticipants: input.maxParticipants,
      maxSpectators: input.maxSpectators
    })
    const snapshot = createRaceSnapshot({ room, state: "CREATED", serverTs: createdAt, participants: [], spectators: [], checkpoints: [], countdown: {}, result: null, events: [] })
    rooms.set(room.id, snapshot)
    enforceRoomLimit()
    appendAudit({ action: "create-room", roomId: room.id, ts: createdAt })
    return snapshot
  }

  function ensureRoom(roomId) {
    const snapshot = rooms.get(roomId)
    if (!snapshot) throw new Error("room_not_found")
    return snapshot
  }

  function joinRoom(roomId, participant = {}, serverTs = 0) {
    const snapshot = ensureRoom(roomId)
    if (snapshot.participants.length >= snapshot.room.maxParticipants) throw new Error("room_full")
    const nextParticipant = createRaceParticipant({ ...participant, joinOrder: snapshot.participants.length, joinedAt: serverTs })
    const nextSnapshot = createRaceSnapshot({ ...snapshot, state: "WAITING", revision: snapshot.revision + 1, sequence: snapshot.sequence + 1, serverTs, participants: [...snapshot.participants, nextParticipant] })
    rooms.set(roomId, nextSnapshot)
    appendAudit({ action: "join-room", roomId, participantId: nextParticipant.id, ts: serverTs })
    return nextSnapshot
  }

  function admitSpectator(roomId, spectator = {}, serverTs = 0) {
    const snapshot = ensureRoom(roomId)
    if (snapshot.spectators.length >= snapshot.room.maxSpectators) throw new Error("spectator_capacity")
    const nextSpectator = createRaceSpectator({ ...spectator, joinOrder: snapshot.spectators.length, joinedAt: serverTs })
    const nextSnapshot = createRaceSnapshot({ ...snapshot, revision: snapshot.revision + 1, sequence: snapshot.sequence + 1, serverTs, spectators: [...snapshot.spectators, nextSpectator] })
    rooms.set(roomId, nextSnapshot)
    appendAudit({ action: "admit-spectator", roomId, spectatorId: nextSpectator.id, ts: serverTs })
    return nextSnapshot
  }

  function leaveRoom(roomId, participantId, serverTs = 0) {
    const snapshot = ensureRoom(roomId)
    const participants = snapshot.participants.filter((entry) => entry.id !== participantId)
    const nextSnapshot = createRaceSnapshot({ ...snapshot, revision: snapshot.revision + 1, sequence: snapshot.sequence + 1, serverTs, participants })
    rooms.set(roomId, nextSnapshot)
    appendAudit({ action: "leave-room", roomId, participantId, ts: serverTs })
    return nextSnapshot
  }

  function kickParticipant(roomId, participantId, serverTs = 0) {
    const snapshot = leaveRoom(roomId, participantId, serverTs)
    appendAudit({ action: "kick-participant", roomId, participantId, ts: serverTs })
    return snapshot
  }

  function expireRooms(serverTs = 0) {
    const expiredIds = []
    for (const [roomId, snapshot] of rooms.entries()) {
      if (serverTs >= snapshot.room.expiresAt) {
        expiredIds.push(roomId)
      }
    }
    expiredIds.sort()
    expiredIds.forEach((roomId) => {
      const snapshot = rooms.get(roomId)
      if (!snapshot) return
      rooms.set(roomId, createRaceSnapshot({ ...snapshot, state: "EXPIRED", revision: snapshot.revision + 1, sequence: snapshot.sequence + 1, serverTs }))
    })
    appendAudit({ action: "expire-rooms", serverTs, expiredCount: expiredIds.length })
    return freezeDeep({ expiredIds, expiredCount: expiredIds.length })
  }

  function getRoomSnapshot(roomId) {
    return rooms.get(roomId) || null
  }

  function getSnapshot() {
    const values = [...rooms.values()].sort((left, right) => left.room.createdAt - right.room.createdAt || left.room.id.localeCompare(right.room.id))
    return freezeDeep({
      roomCount: values.length,
      rooms: values,
      audit,
      managerHash: stableHash({ values, audit })
    })
  }

  return Object.freeze({
    createRoom,
    joinRoom,
    leaveRoom,
    kickParticipant,
    admitSpectator,
    expireRooms,
    getRoomSnapshot,
    getSnapshot
  })
}

export default { createRaceRoomManager }