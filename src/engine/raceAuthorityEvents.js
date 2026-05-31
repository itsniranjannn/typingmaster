import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

export const AUTHORITY_EVENT_TYPES = Object.freeze({
  ROOM_CREATED: "ROOM_CREATED",
  PLAYER_JOINED: "PLAYER_JOINED",
  PLAYER_LEFT: "PLAYER_LEFT",
  SPECTATOR_ADMITTED: "SPECTATOR_ADMITTED",
  COUNTDOWN_STARTED: "COUNTDOWN_STARTED",
  RACE_STARTED: "RACE_STARTED",
  CHECKPOINT_REPORTED: "CHECKPOINT_REPORTED",
  PLAYER_FINISHED: "PLAYER_FINISHED",
  RACE_FINISHED: "RACE_FINISHED",
  RECONNECT_VALIDATED: "RECONNECT_VALIDATED",
  RECONNECT_REJECTED: "RECONNECT_REJECTED",
  ROOM_DESTROYED: "ROOM_DESTROYED"
})

export function createAuthorityEvent(input = {}) {
  const sequence = Math.max(0, Number(input.sequence) || 0)
  const serverTs = Math.max(0, Number(input.serverTs) || 0)
  const type = typeof input.type === "string" ? input.type : AUTHORITY_EVENT_TYPES.ROOM_CREATED
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {}
  return freezeDeep({
    sequence,
    serverTs,
    roomId: typeof input.roomId === "string" ? input.roomId : null,
    actorId: typeof input.actorId === "string" ? input.actorId : null,
    type,
    payload,
    eventHash: typeof input.eventHash === "string" ? input.eventHash : stableHash({ sequence, serverTs, roomId: typeof input.roomId === "string" ? input.roomId : null, actorId: typeof input.actorId === "string" ? input.actorId : null, type, payload })
  })
}

export function orderAuthorityEvents(events = []) {
  return freezeDeep((Array.isArray(events) ? events : []).map((event) => createAuthorityEvent(event)).slice().sort((left, right) => left.sequence - right.sequence || left.serverTs - right.serverTs || left.eventHash.localeCompare(right.eventHash)))
}

export default { AUTHORITY_EVENT_TYPES, createAuthorityEvent, orderAuthorityEvents }