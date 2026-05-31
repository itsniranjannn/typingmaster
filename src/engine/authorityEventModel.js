import { stableHash } from "./replayConsumerValidation"
import { NETWORK_EVENT_TYPES } from "./transportContracts"

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
  COUNTDOWN_STARTED: "COUNTDOWN_STARTED",
  RACE_STARTED: "RACE_STARTED",
  CHECKPOINT_REPORTED: "CHECKPOINT_REPORTED",
  PLAYER_FINISHED: "PLAYER_FINISHED",
  RACE_FINISHED: "RACE_FINISHED",
  SPECTATOR_ADMITTED: "SPECTATOR_ADMITTED"
})

export const AUTHORITY_EVENT_TO_TRANSPORT_EVENT = Object.freeze({
  [AUTHORITY_EVENT_TYPES.ROOM_CREATED]: NETWORK_EVENT_TYPES.ROOM_CREATE,
  [AUTHORITY_EVENT_TYPES.PLAYER_JOINED]: NETWORK_EVENT_TYPES.ROOM_JOIN,
  [AUTHORITY_EVENT_TYPES.PLAYER_LEFT]: NETWORK_EVENT_TYPES.ROOM_LEAVE,
  [AUTHORITY_EVENT_TYPES.COUNTDOWN_STARTED]: NETWORK_EVENT_TYPES.RACE_COUNTDOWN,
  [AUTHORITY_EVENT_TYPES.RACE_STARTED]: NETWORK_EVENT_TYPES.RACE_START,
  [AUTHORITY_EVENT_TYPES.CHECKPOINT_REPORTED]: NETWORK_EVENT_TYPES.CHECKPOINT_VERIFY,
  [AUTHORITY_EVENT_TYPES.PLAYER_FINISHED]: NETWORK_EVENT_TYPES.RACE_PROGRESS,
  [AUTHORITY_EVENT_TYPES.RACE_FINISHED]: NETWORK_EVENT_TYPES.RACE_FINISH,
  [AUTHORITY_EVENT_TYPES.SPECTATOR_ADMITTED]: NETWORK_EVENT_TYPES.SPECTATOR_JOIN
})

export function createAuthorityEvent(input = {}) {
  const eventType = typeof input.type === "string" ? input.type : AUTHORITY_EVENT_TYPES.ROOM_CREATED
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {}
  const event = freezeDeep({
    sequence: Math.max(0, Number(input.sequence) || 0),
    serverTs: Math.max(0, Number(input.serverTs) || 0),
    roomId: typeof input.roomId === "string" ? input.roomId : null,
    actorId: typeof input.actorId === "string" ? input.actorId : null,
    targetId: typeof input.targetId === "string" ? input.targetId : null,
    type: eventType,
    payload,
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    eventHash: typeof input.eventHash === "string"
      ? input.eventHash
      : stableHash({
        sequence: Math.max(0, Number(input.sequence) || 0),
        serverTs: Math.max(0, Number(input.serverTs) || 0),
        roomId: typeof input.roomId === "string" ? input.roomId : null,
        actorId: typeof input.actorId === "string" ? input.actorId : null,
        targetId: typeof input.targetId === "string" ? input.targetId : null,
        type: eventType,
        payload,
        metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {}
      })
  })
  return event
}

export function mapAuthorityEventToTransportEvent(type) {
  return AUTHORITY_EVENT_TO_TRANSPORT_EVENT[type] || null
}

export default {
  AUTHORITY_EVENT_TYPES,
  AUTHORITY_EVENT_TO_TRANSPORT_EVENT,
  createAuthorityEvent,
  mapAuthorityEventToTransportEvent
}