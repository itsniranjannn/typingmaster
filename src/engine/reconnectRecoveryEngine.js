import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const boundedPush = (list, value, limit) => {
  const next = [...list, value]
  return next.length <= limit ? next : next.slice(next.length - limit)
}

export function createReconnectRecoveryEngine(options = {}) {
  const maxSnapshots = Math.max(4, Number(options.maxSnapshots) || 32)
  const maxEvents = Math.max(8, Number(options.maxEvents) || 256)
  const maxCheckpoints = Math.max(4, Number(options.maxCheckpoints) || 64)
  const replayWindowSize = Math.max(1, Number(options.replayWindowSize) || 64)
  let snapshots = []
  let events = []
  let checkpoints = []
  let tokens = []

  function registerSnapshot(snapshot = {}) {
    const next = freezeDeep({
      revision: Math.max(0, Number(snapshot.revision) || 0),
      sequence: Math.max(0, Number(snapshot.sequence) || 0),
      snapshotHash: typeof snapshot.snapshotHash === "string" ? snapshot.snapshotHash : stableHash(snapshot),
      serverTs: Math.max(0, Number(snapshot.serverTs) || 0),
      state: typeof snapshot.state === "string" ? snapshot.state : "CREATED"
    })
    snapshots = boundedPush(snapshots, next, maxSnapshots)
    return next
  }

  function registerEvent(event = {}) {
    const next = freezeDeep({
      sequence: Math.max(0, Number(event.sequence) || 0),
      serverTs: Math.max(0, Number(event.serverTs) || 0),
      type: typeof event.type === "string" ? event.type : "event",
      participantId: typeof event.participantId === "string" ? event.participantId : null,
      payload: event.payload && typeof event.payload === "object" ? event.payload : {},
      eventHash: typeof event.eventHash === "string" ? event.eventHash : stableHash(event)
    })
    events = boundedPush(events, next, maxEvents)
    return next
  }

  function registerCheckpoint(checkpoint = {}) {
    const next = freezeDeep({
      sequence: Math.max(0, Number(checkpoint.sequence) || 0),
      participantId: typeof checkpoint.participantId === "string" ? checkpoint.participantId : null,
      ts: Math.max(0, Number(checkpoint.ts) || 0),
      checkpointHash: typeof checkpoint.checkpointHash === "string" ? checkpoint.checkpointHash : stableHash(checkpoint),
      snapshotHash: typeof checkpoint.snapshotHash === "string" ? checkpoint.snapshotHash : null
    })
    checkpoints = boundedPush(checkpoints, next, maxCheckpoints)
    return next
  }

  function issueReconnectToken(context = {}) {
    const token = freezeDeep({
      token: typeof context.token === "string" ? context.token : stableHash({ roomId: context.roomId || null, participantId: context.participantId || null, sequence: Math.max(0, Number(context.sequence) || 0), snapshotHash: context.snapshotHash || null }),
      roomId: typeof context.roomId === "string" ? context.roomId : null,
      participantId: typeof context.participantId === "string" ? context.participantId : null,
      sequence: Math.max(0, Number(context.sequence) || 0),
      snapshotHash: typeof context.snapshotHash === "string" ? context.snapshotHash : null,
      issuedAt: Math.max(0, Number(context.issuedAt) || 0)
    })
    tokens = boundedPush(tokens, token, maxSnapshots)
    return token
  }

  function recover(input = {}) {
    const fromSequence = Math.max(0, Number(input.fromSequence ?? input.sequence ?? 0) || 0)
    const replayWindow = events.filter((event) => event.sequence >= fromSequence).slice(0, replayWindowSize)
    const checkpointWindow = checkpoints.filter((checkpoint) => checkpoint.sequence >= fromSequence).slice(0, replayWindowSize)
    const snapshotRecovery = snapshots.slice().sort((left, right) => left.sequence - right.sequence || left.revision - right.revision || left.snapshotHash.localeCompare(right.snapshotHash)).at(-1) || null
    const token = typeof input.token === "string" ? input.token : null
    const matchedToken = token ? tokens.find((entry) => entry.token === token) || null : null
    const recovery = freezeDeep({
      roomId: typeof input.roomId === "string" ? input.roomId : matchedToken?.roomId || null,
      participantId: typeof input.participantId === "string" ? input.participantId : matchedToken?.participantId || null,
      token,
      matchedToken,
      fromSequence,
      replayWindow,
      checkpointWindow,
      snapshotRecovery,
      missedEventCount: Math.max(0, events.length - replayWindow.length),
      replayHash: stableHash({ roomId: input.roomId || matchedToken?.roomId || null, fromSequence, replayWindow, checkpointWindow, snapshotRecovery })
    })
    return recovery
  }

  function getSnapshot() {
    return freezeDeep({
      snapshots,
      events,
      checkpoints,
      tokens,
      replayWindowSize,
      recoveryHash: stableHash({ snapshots, events, checkpoints, tokens })
    })
  }

  function reset() {
    snapshots = []
    events = []
    checkpoints = []
    tokens = []
  }

  return Object.freeze({
    registerSnapshot,
    registerEvent,
    registerCheckpoint,
    issueReconnectToken,
    recover,
    getSnapshot,
    reset
  })
}

export default { createReconnectRecoveryEngine }