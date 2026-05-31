import { stableHash, stableStringify } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

export const RACE_EVENT_TYPES = Object.freeze({
  ROOM_CREATED: "room-created",
  PARTICIPANT_JOINED: "participant-joined",
  PARTICIPANT_LEFT: "participant-left",
  SPECTATOR_JOINED: "spectator-joined",
  CHECKPOINT: "checkpoint",
  COUNTDOWN_TICK: "countdown-tick",
  RACE_STARTED: "race-started",
  RACE_FINISHED: "race-finished",
  RACE_ABORTED: "race-aborted",
  SYNC: "sync"
})

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const normalizeParticipantState = (state = {}) => freezeDeep({
  wordsCompleted: Math.max(0, Number(state.wordsCompleted) || 0),
  totalWords: Math.max(1, Number(state.totalWords) || 1),
  elapsedMs: Math.max(0, safeNumber(state.elapsedMs, 0)),
  accuracy: Math.max(0, Math.min(100, safeNumber(state.accuracy, 100))),
  wpm: Math.max(0, safeNumber(state.wpm, 0)),
  finished: Boolean(state.finished),
  finishTs: Number.isFinite(Number(state.finishTs)) ? Number(state.finishTs) : null,
  checkpointSeq: Math.max(0, Number(state.checkpointSeq) || 0)
})

export const createRaceRoom = (input = {}) => freezeDeep({
  id: typeof input.id === "string" ? input.id : `room-${Math.max(0, Number(input.seq) || 0)}`,
  createdAt: Math.max(0, safeNumber(input.createdAt, 0)),
  expiresAt: Math.max(0, safeNumber(input.expiresAt, 0)),
  hostParticipantId: typeof input.hostParticipantId === "string" ? input.hostParticipantId : null,
  maxParticipants: Math.max(1, Number(input.maxParticipants) || 10),
  maxSpectators: Math.max(0, Number(input.maxSpectators) || 100),
  capacityPolicy: typeof input.capacityPolicy === "string" ? input.capacityPolicy : "bounded",
  revision: Math.max(0, Number(input.revision) || 0)
})

export const createRaceParticipant = (input = {}) => freezeDeep({
  id: typeof input.id === "string" ? input.id : `participant-${Math.max(0, Number(input.joinOrder) || 0)}`,
  displayName: typeof input.displayName === "string" ? input.displayName : "anonymous",
  joinOrder: Math.max(0, Number(input.joinOrder) || 0),
  connected: Boolean(input.connected ?? true),
  joinedAt: Math.max(0, safeNumber(input.joinedAt, 0)),
  state: normalizeParticipantState(input.state)
})

export const createRaceSpectator = (input = {}) => freezeDeep({
  id: typeof input.id === "string" ? input.id : `spectator-${Math.max(0, Number(input.joinOrder) || 0)}`,
  joinOrder: Math.max(0, Number(input.joinOrder) || 0),
  connected: Boolean(input.connected ?? true),
  joinedAt: Math.max(0, safeNumber(input.joinedAt, 0)),
  focusParticipantId: typeof input.focusParticipantId === "string" ? input.focusParticipantId : null,
  lagMs: Math.max(0, safeNumber(input.lagMs, 0))
})

export const createRaceCheckpoint = (input = {}) => freezeDeep({
  sequence: Math.max(0, Number(input.sequence) || 0),
  participantId: typeof input.participantId === "string" ? input.participantId : null,
  ts: Math.max(0, safeNumber(input.ts, 0)),
  wordsCompleted: Math.max(0, Number(input.wordsCompleted) || 0),
  totalWords: Math.max(1, Number(input.totalWords) || 1),
  checkpointHash: typeof input.checkpointHash === "string"
    ? input.checkpointHash
    : stableHash({ participantId: input.participantId || null, wordsCompleted: input.wordsCompleted || 0, ts: input.ts || 0 })
})

export const createRaceCountdown = (input = {}) => freezeDeep({
  phase: typeof input.phase === "string" ? input.phase : "pending",
  startAtServerTs: Math.max(0, safeNumber(input.startAtServerTs, 0)),
  durationMs: Math.max(0, Number(input.durationMs) || 0),
  remainingMs: Math.max(0, Number(input.remainingMs) || 0),
  driftMs: safeNumber(input.driftMs, 0),
  correctedAtServerTs: Math.max(0, safeNumber(input.correctedAtServerTs, 0)),
  checkpointSeq: Math.max(0, Number(input.checkpointSeq) || 0)
})

export const createRaceResult = (input = {}) => {
  const placements = Array.isArray(input.placements) ? input.placements : []
  const normalized = placements.map((placement, index) => freezeDeep({
    rank: Math.max(1, Number(placement.rank) || index + 1),
    participantId: typeof placement.participantId === "string" ? placement.participantId : null,
    finishTs: Number.isFinite(Number(placement.finishTs)) ? Number(placement.finishTs) : null,
    elapsedMs: Math.max(0, safeNumber(placement.elapsedMs, 0)),
    wpm: Math.max(0, safeNumber(placement.wpm, 0)),
    accuracy: Math.max(0, Math.min(100, safeNumber(placement.accuracy, 0)))
  }))
  return freezeDeep({
    raceId: typeof input.raceId === "string" ? input.raceId : null,
    finishedAt: Math.max(0, safeNumber(input.finishedAt, 0)),
    placements: normalized,
    resultHash: stableHash(normalized)
  })
}

export const createRaceEvent = (input = {}) => freezeDeep({
  sequence: Math.max(0, Number(input.sequence) || 0),
  serverTs: Math.max(0, safeNumber(input.serverTs, 0)),
  roomId: typeof input.roomId === "string" ? input.roomId : null,
  actorId: typeof input.actorId === "string" ? input.actorId : null,
  type: typeof input.type === "string" ? input.type : RACE_EVENT_TYPES.SYNC,
  payload: isPlainObject(input.payload) ? input.payload : {},
  eventHash: stableHash({
    sequence: Math.max(0, Number(input.sequence) || 0),
    serverTs: Math.max(0, safeNumber(input.serverTs, 0)),
    roomId: typeof input.roomId === "string" ? input.roomId : null,
    actorId: typeof input.actorId === "string" ? input.actorId : null,
    type: typeof input.type === "string" ? input.type : RACE_EVENT_TYPES.SYNC,
    payload: isPlainObject(input.payload) ? input.payload : {}
  })
})

export const orderRaceEvents = (events = []) => {
  const normalized = (Array.isArray(events) ? events : []).map((event) => createRaceEvent(event))
  return freezeDeep(normalized
    .slice()
    .sort((left, right) => left.sequence - right.sequence || left.serverTs - right.serverTs || left.eventHash.localeCompare(right.eventHash)))
}

export const createRaceSnapshot = (input = {}) => {
  const participants = (Array.isArray(input.participants) ? input.participants : []).map((participant) => createRaceParticipant(participant))
  const spectators = (Array.isArray(input.spectators) ? input.spectators : []).map((spectator) => createRaceSpectator(spectator))
  const checkpoints = (Array.isArray(input.checkpoints) ? input.checkpoints : []).map((checkpoint) => createRaceCheckpoint(checkpoint))
  const events = orderRaceEvents(input.events)
  const room = createRaceRoom(input.room || {})
  const countdown = createRaceCountdown(input.countdown || {})
  const result = input.result ? createRaceResult(input.result) : null
  const orderedParticipants = participants.slice().sort((left, right) => left.joinOrder - right.joinOrder || left.id.localeCompare(right.id))
  const orderedSpectators = spectators.slice().sort((left, right) => left.joinOrder - right.joinOrder || left.id.localeCompare(right.id))

  return freezeDeep({
    room,
    state: typeof input.state === "string" ? input.state : "CREATED",
    serverTs: Math.max(0, safeNumber(input.serverTs, 0)),
    revision: Math.max(0, Number(input.revision) || 0),
    sequence: Math.max(0, Number(input.sequence) || 0),
    participants: orderedParticipants,
    spectators: orderedSpectators,
    checkpoints,
    countdown,
    result,
    events,
    hashes: freezeDeep({
      roomHash: stableHash(room),
      participantHash: stableHash(orderedParticipants),
      spectatorHash: stableHash(orderedSpectators),
      checkpointHash: stableHash(checkpoints),
      countdownHash: stableHash(countdown),
      eventHash: stableHash(events),
      snapshotHash: stableHash({ room, state: typeof input.state === "string" ? input.state : "CREATED", orderedParticipants, orderedSpectators, checkpoints, countdown, result, events })
    })
  })
}

export const serializeRaceSnapshot = (snapshot) => stableStringify(createRaceSnapshot(snapshot))

export default {
  RACE_EVENT_TYPES,
  createRaceRoom,
  createRaceParticipant,
  createRaceSpectator,
  createRaceCheckpoint,
  createRaceCountdown,
  createRaceResult,
  createRaceEvent,
  orderRaceEvents,
  createRaceSnapshot,
  serializeRaceSnapshot
}