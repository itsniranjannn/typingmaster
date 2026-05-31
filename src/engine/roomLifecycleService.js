import { stableHash } from "./replayConsumerValidation"
import { createRaceRoom, createRaceSnapshot } from "./multiplayerDomainModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const cloneRoomSnapshot = (snapshot) => createRaceSnapshot(snapshot || {})

export function createRoomLifecycleService(options = {}) {
  const maxRooms = Math.max(1, Number(options.maxRooms) || 64)
  const roomTtlMs = Math.max(1000, Number(options.roomTtlMs) || 120000)
  let rooms = new Map()
  let destroyedRooms = []

  function createRoom(input = {}) {
    const existing = rooms.get(input.id)
    if (existing) return existing
    const createdAt = Math.max(0, Number(input.createdAt) || 0)
    const room = createRaceRoom({
      id: input.id,
      seq: rooms.size,
      createdAt,
      expiresAt: input.expiresAt ?? createdAt + roomTtlMs,
      hostParticipantId: input.hostParticipantId,
      maxParticipants: input.maxParticipants,
      maxSpectators: input.maxSpectators
    })
    const snapshot = cloneRoomSnapshot({ room, state: input.state || "CREATED", serverTs: createdAt, participants: input.participants || [], spectators: input.spectators || [], checkpoints: input.checkpoints || [], countdown: input.countdown || {}, result: input.result || null, events: input.events || [] })
    rooms.set(room.id, snapshot)
    return snapshot
  }

  function destroyRoom(roomId, serverTs = 0, reason = "destroyed") {
    const snapshot = rooms.get(roomId)
    if (!snapshot) return freezeDeep({ destroyed: false, roomId, reason: "missing_room" })
    const destroyed = freezeDeep({
      roomId,
      reason,
      destroyedAt: Math.max(0, Number(serverTs) || 0),
      snapshot
    })
    destroyedRooms = [...destroyedRooms, destroyed]
    rooms.delete(roomId)
    return freezeDeep({ destroyed: true, roomId, reason, destroyedAt: Math.max(0, Number(serverTs) || 0), snapshot })
  }

  function replaceRoom(roomId, snapshot) {
    const next = cloneRoomSnapshot(snapshot)
    rooms.set(roomId, next)
    return next
  }

  function mergeRoom(roomId, patch = {}) {
    const previous = rooms.get(roomId)
    if (!previous) throw new Error("room_not_found")
    const next = cloneRoomSnapshot({
      room: patch.room || previous.room,
      state: typeof patch.state === "string" ? patch.state : previous.state,
      serverTs: Math.max(0, Number(patch.serverTs ?? previous.serverTs) || 0),
      revision: Math.max(previous.revision + 1, Number(patch.revision) || previous.revision + 1),
      sequence: Math.max(previous.sequence + 1, Number(patch.sequence) || previous.sequence + 1),
      participants: patch.participants || previous.participants,
      spectators: patch.spectators || previous.spectators,
      checkpoints: patch.checkpoints || previous.checkpoints,
      countdown: patch.countdown || previous.countdown,
      result: patch.result ?? previous.result,
      events: patch.events || previous.events
    })
    rooms.set(roomId, next)
    return next
  }

  function getRoomSnapshot(roomId) {
    return rooms.get(roomId) || null
  }

  function listRooms() {
    return [...rooms.values()].sort((left, right) => left.room.createdAt - right.room.createdAt || left.room.id.localeCompare(right.room.id))
  }

  function expireRooms(serverTs = 0) {
    const expired = []
    for (const [roomId, snapshot] of rooms.entries()) {
      if (serverTs >= snapshot.room.expiresAt) {
        expired.push(roomId)
      }
    }
    expired.sort()
    expired.forEach((roomId) => destroyRoom(roomId, serverTs, "expired"))
    return freezeDeep({ expiredIds: expired, expiredCount: expired.length })
  }

  function getSnapshot() {
    const activeRooms = listRooms()
    return freezeDeep({
      roomCount: activeRooms.length,
      destroyedRooms,
      rooms: activeRooms,
      lifecycleHash: stableHash({ activeRooms, destroyedRooms })
    })
  }

  function clear() {
    rooms = new Map()
    destroyedRooms = []
  }

  return Object.freeze({
    createRoom,
    destroyRoom,
    replaceRoom,
    mergeRoom,
    getRoomSnapshot,
    listRooms,
    expireRooms,
    getSnapshot,
    clear
  })
}

export default { createRoomLifecycleService }