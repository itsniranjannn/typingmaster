import { stableHash } from "./replayConsumerValidation"
import { createRaceCheckpoint, createRaceParticipant, createRaceSpectator } from "./multiplayerDomainModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const boundedPush = (items, value, limit) => {
  const next = [...items, value]
  return next.length <= limit ? next : next.slice(next.length - limit)
}

const normalizeRoomId = (value) => (typeof value === "string" ? value : null)

const createRoomRecord = () => ({
  participantSequence: 0,
  spectatorSequence: 0,
  participants: new Map(),
  spectators: new Map(),
  reconnectTokens: new Map(),
  checkpoints: [],
  history: []
})

const serializeParticipant = (record, fallback = {}) => freezeDeep({
  id: record.id,
  displayName: record.displayName,
  roomId: record.roomId,
  joinOrder: record.joinOrder,
  joinedAt: record.joinedAt,
  leftAt: record.leftAt,
  connected: record.connected,
  finishedAt: record.finishedAt,
  reconnectToken: record.reconnectToken,
  reconnectIssuedAt: record.reconnectIssuedAt,
  reconnectExpiresAt: record.reconnectExpiresAt,
  checkpoint: record.checkpoint,
  state: freezeDeep({
    ...(record.state || {}),
    ...(fallback.state || {}),
    finished: Boolean(record.finishedAt || record.state?.finished),
    finishTs: record.finishedAt || record.state?.finishTs || null,
    checkpointSeq: record.checkpoint?.sequence || record.state?.checkpointSeq || 0
  })
})

const serializeSpectator = (record) => freezeDeep({
  id: record.id,
  displayName: record.displayName,
  roomId: record.roomId,
  joinOrder: record.joinOrder,
  joinedAt: record.joinedAt,
  leftAt: record.leftAt,
  connected: record.connected,
  focusParticipantId: record.focusParticipantId || null
})

const ensureRoom = (rooms, roomId) => {
  const normalizedRoomId = normalizeRoomId(roomId)
  if (!normalizedRoomId) throw new Error("room_id_required")
  if (!rooms.has(normalizedRoomId)) rooms.set(normalizedRoomId, createRoomRecord())
  return rooms.get(normalizedRoomId)
}

export function createParticipantRegistry(options = {}) {
  const maxRooms = Math.max(1, Number(options.maxRooms) || 64)
  const maxCheckpoints = Math.max(8, Number(options.maxCheckpoints) || 256)
  const maxHistory = Math.max(8, Number(options.maxHistory) || 256)
  const reconnectTtlMs = Math.max(1000, Number(options.reconnectTtlMs) || 120000)

  let rooms = new Map()
  let roomOrder = []

  const touchRoom = (roomId) => {
    const normalizedRoomId = normalizeRoomId(roomId)
    if (!normalizedRoomId) throw new Error("room_id_required")
    if (!rooms.has(normalizedRoomId)) {
      rooms.set(normalizedRoomId, createRoomRecord())
      roomOrder = boundedPush(roomOrder, normalizedRoomId, maxRooms)
    }
    return rooms.get(normalizedRoomId)
  }

  const appendHistory = (record, entry) => {
    record.history = boundedPush(record.history, freezeDeep(entry), maxHistory)
  }

  function admitParticipant(roomId, participant = {}, serverTs = 0) {
    const record = touchRoom(roomId)
    const existing = typeof participant.id === "string" ? record.participants.get(participant.id) || null : null
    const joinOrder = existing ? existing.joinOrder : record.participantSequence
    if (!existing) record.participantSequence += 1
    const base = createRaceParticipant({
      ...(existing || {}),
      ...participant,
      id: typeof participant.id === "string" ? participant.id : existing?.id,
      joinOrder,
      joinedAt: existing?.joinedAt ?? serverTs,
      connected: true,
      state: participant.state || existing?.state || {}
    })
    const next = freezeDeep({
      ...base,
      roomId,
      connected: true,
      joinedAt: existing?.joinedAt ?? serverTs,
      leftAt: null,
      disconnectReason: null,
      reconnectToken: participant.reconnectToken || existing?.reconnectToken || null,
      reconnectIssuedAt: existing?.reconnectIssuedAt || null,
      reconnectExpiresAt: existing?.reconnectExpiresAt || null,
      lastSeenAt: serverTs,
      checkpoint: existing?.checkpoint || null,
      finishedAt: existing?.finishedAt || null
    })
    record.participants.set(next.id, next)
    appendHistory(record, { kind: "participant-joined", roomId, participantId: next.id, ts: serverTs })
    return serializeParticipant(next)
  }

  function removeParticipant(roomId, participantId, serverTs = 0, reason = "left") {
    const record = touchRoom(roomId)
    const existing = record.participants.get(participantId) || null
    if (!existing) return null
    const next = freezeDeep({
      ...existing,
      connected: false,
      leftAt: serverTs,
      disconnectReason: reason,
      lastSeenAt: serverTs
    })
    record.participants.set(participantId, next)
    appendHistory(record, { kind: "participant-left", roomId, participantId, ts: serverTs, reason })
    return serializeParticipant(next)
  }

  function admitSpectator(roomId, spectator = {}, serverTs = 0) {
    const record = touchRoom(roomId)
    const existing = typeof spectator.id === "string" ? record.spectators.get(spectator.id) || null : null
    const joinOrder = existing ? existing.joinOrder : record.spectatorSequence
    if (!existing) record.spectatorSequence += 1
    const base = createRaceSpectator({
      ...(existing || {}),
      ...spectator,
      id: typeof spectator.id === "string" ? spectator.id : existing?.id,
      joinOrder,
      joinedAt: existing?.joinedAt ?? serverTs,
      connected: true
    })
    const next = freezeDeep({
      ...base,
      roomId,
      connected: true,
      joinedAt: existing?.joinedAt ?? serverTs,
      leftAt: null,
      lastSeenAt: serverTs
    })
    record.spectators.set(next.id, next)
    appendHistory(record, { kind: "spectator-admitted", roomId, spectatorId: next.id, ts: serverTs })
    return serializeSpectator(next)
  }

  function removeSpectator(roomId, spectatorId, serverTs = 0, reason = "left") {
    const record = touchRoom(roomId)
    const existing = record.spectators.get(spectatorId) || null
    if (!existing) return null
    const next = freezeDeep({
      ...existing,
      connected: false,
      leftAt: serverTs,
      disconnectReason: reason,
      lastSeenAt: serverTs
    })
    record.spectators.set(spectatorId, next)
    appendHistory(record, { kind: "spectator-left", roomId, spectatorId, ts: serverTs, reason })
    return serializeSpectator(next)
  }

  function reportCheckpoint(roomId, participantId, checkpoint = {}, serverTs = 0) {
    const record = touchRoom(roomId)
    const existing = record.participants.get(participantId) || null
    const nextCheckpoint = freezeDeep(createRaceCheckpoint({
      ...checkpoint,
      participantId: typeof participantId === "string" ? participantId : checkpoint.participantId || null,
      ts: Number.isFinite(Number(checkpoint.ts)) ? Number(checkpoint.ts) : serverTs
    }))
    record.checkpoints = boundedPush(record.checkpoints.filter((entry) => !(entry.participantId === nextCheckpoint.participantId && entry.sequence === nextCheckpoint.sequence)), nextCheckpoint, maxCheckpoints)
    if (existing) {
      const nextParticipant = freezeDeep({
        ...existing,
        checkpoint: nextCheckpoint,
        lastSeenAt: serverTs,
        state: freezeDeep({
          ...(existing.state || {}),
          checkpointSeq: nextCheckpoint.sequence,
          wordsCompleted: Math.max(Number(existing.state?.wordsCompleted) || 0, nextCheckpoint.wordsCompleted),
          totalWords: Math.max(1, Number(existing.state?.totalWords) || nextCheckpoint.totalWords),
          elapsedMs: Math.max(Number(existing.state?.elapsedMs) || 0, Math.max(0, serverTs - existing.joinedAt))
        })
      })
      record.participants.set(participantId, nextParticipant)
    }
    appendHistory(record, { kind: "checkpoint-reported", roomId, participantId, ts: serverTs, sequence: nextCheckpoint.sequence })
    return nextCheckpoint
  }

  function finishParticipant(roomId, participantId, summary = {}, serverTs = 0) {
    const record = touchRoom(roomId)
    const existing = record.participants.get(participantId) || null
    if (!existing) return null
    const finishedAt = Number.isFinite(Number(summary.finishTs)) ? Number(summary.finishTs) : serverTs
    const next = freezeDeep({
      ...existing,
      finishedAt,
      state: freezeDeep({
        ...(existing.state || {}),
        finished: true,
        finishTs: finishedAt,
        wordsCompleted: Math.max(Number(existing.state?.wordsCompleted) || 0, Number(summary.wordsCompleted) || 0),
        totalWords: Math.max(1, Number(summary.totalWords) || Number(existing.state?.totalWords) || 1),
        elapsedMs: Math.max(Number(existing.state?.elapsedMs) || 0, Number(summary.elapsedMs) || Math.max(0, serverTs - existing.joinedAt)),
        wpm: Math.max(0, Number(summary.wpm) || Number(existing.state?.wpm) || 0),
        accuracy: Math.max(0, Math.min(100, Number(summary.accuracy) || Number(existing.state?.accuracy) || 0))
      })
    })
    record.participants.set(participantId, next)
    appendHistory(record, { kind: "participant-finished", roomId, participantId, ts: serverTs })
    return serializeParticipant(next)
  }

  function issueReconnectToken(roomId, participantId, context = {}) {
    const record = touchRoom(roomId)
    const token = typeof context.token === "string"
      ? context.token
      : stableHash({ roomId, participantId, sequence: Math.max(0, Number(context.sequence) || 0), snapshotHash: context.snapshotHash || null, issuedAt: Math.max(0, Number(context.issuedAt) || 0) })
    const reconnectToken = freezeDeep({
      token,
      roomId,
      participantId,
      sequence: Math.max(0, Number(context.sequence) || 0),
      snapshotHash: typeof context.snapshotHash === "string" ? context.snapshotHash : null,
      issuedAt: Math.max(0, Number(context.issuedAt) || 0),
      expiresAt: Math.max(0, Number(context.issuedAt) || 0) + reconnectTtlMs
    })
    record.reconnectTokens.set(token, reconnectToken)
    appendHistory(record, { kind: "reconnect-token-issued", roomId, participantId, ts: reconnectToken.issuedAt })
    return reconnectToken
  }

  function validateReconnectToken(roomId, participantId, tokenInput = {}, currentSnapshot = {}) {
    const record = rooms.get(roomId)
    const token = typeof tokenInput === "string" ? tokenInput : tokenInput.token || null
    const stored = token && record ? record.reconnectTokens.get(token) || null : null
    const valid = Boolean(stored) && stored.roomId === roomId && stored.participantId === participantId && (!currentSnapshot.snapshotHash || !stored.snapshotHash || stored.snapshotHash === currentSnapshot.snapshotHash) && (!currentSnapshot.sequence || stored.sequence <= Number(currentSnapshot.sequence)) && (stored.expiresAt === 0 || stored.expiresAt >= Math.max(0, Number(currentSnapshot.serverTs) || 0))
    return freezeDeep({
      valid,
      reason: valid ? null : stored ? "snapshot_mismatch" : "invalid_token",
      token: stored || null,
      currentSnapshotHash: currentSnapshot.snapshotHash || null,
      validationHash: stableHash({ roomId, participantId, token, snapshotHash: currentSnapshot.snapshotHash || null, sequence: currentSnapshot.sequence || 0 })
    })
  }

  function getRoomParticipants(roomId, options = {}) {
    const record = rooms.get(roomId)
    if (!record) return freezeDeep([])
    const includeDisconnected = Boolean(options.includeDisconnected)
    const list = [...record.participants.values()].map((entry) => serializeParticipant(entry)).filter((entry) => includeDisconnected || entry.connected).sort((left, right) => String(left.id).localeCompare(String(right.id)))
    return freezeDeep(list)
  }

  function getRoomSpectators(roomId, options = {}) {
    const record = rooms.get(roomId)
    if (!record) return freezeDeep([])
    const includeDisconnected = Boolean(options.includeDisconnected)
    const list = [...record.spectators.values()].map((entry) => serializeSpectator(entry)).filter((entry) => includeDisconnected || entry.connected).sort((left, right) => String(left.id).localeCompare(String(right.id)))
    return freezeDeep(list)
  }

  function getRoomCheckpoints(roomId) {
    const record = rooms.get(roomId)
    if (!record) return freezeDeep([])
    return freezeDeep(record.checkpoints.slice().sort((left, right) => left.sequence - right.sequence || left.ts - right.ts || left.checkpointHash.localeCompare(right.checkpointHash)))
  }

  function destroyRoom(roomId, serverTs = 0, reason = "destroyed") {
    const record = rooms.get(roomId)
    if (!record) return freezeDeep({ destroyed: false, roomId, reason: "missing_room" })
    const snapshot = freezeDeep({
      roomId,
      destroyedAt: Math.max(0, Number(serverTs) || 0),
      reason,
      participants: getRoomParticipants(roomId, { includeDisconnected: true }),
      spectators: getRoomSpectators(roomId, { includeDisconnected: true }),
      checkpoints: getRoomCheckpoints(roomId),
      reconnectTokens: [...record.reconnectTokens.values()].sort((left, right) => left.sequence - right.sequence || left.token.localeCompare(right.token))
    })
    rooms.delete(roomId)
    roomOrder = roomOrder.filter((entry) => entry !== roomId)
    return freezeDeep({ destroyed: true, roomId, serverTs: Math.max(0, Number(serverTs) || 0), reason, snapshot })
  }

  function destroyAllRooms() {
    const roomIds = [...rooms.keys()].sort()
    return freezeDeep(roomIds.map((roomId) => destroyRoom(roomId, 0, "destroy-all")))
  }

  function getSnapshot() {
    const roomIds = [...rooms.keys()].sort()
    const roomsSnapshot = roomIds.map((roomId) => freezeDeep({
      roomId,
      participants: getRoomParticipants(roomId),
      spectators: getRoomSpectators(roomId),
      checkpoints: getRoomCheckpoints(roomId),
      reconnectTokens: [...(rooms.get(roomId)?.reconnectTokens.values() || [])].sort((left, right) => left.sequence - right.sequence || left.token.localeCompare(right.token)),
      history: rooms.get(roomId)?.history || [],
      roomHash: stableHash({ roomId, participants: getRoomParticipants(roomId), spectators: getRoomSpectators(roomId), checkpoints: getRoomCheckpoints(roomId) })
    }))
    return freezeDeep({
      roomCount: roomsSnapshot.length,
      rooms: roomsSnapshot,
      roomOrder,
      registryHash: stableHash({ roomsSnapshot, roomOrder })
    })
  }

  return Object.freeze({
    admitParticipant,
    removeParticipant,
    admitSpectator,
    removeSpectator,
    reportCheckpoint,
    finishParticipant,
    issueReconnectToken,
    validateReconnectToken,
    getRoomParticipants,
    getRoomSpectators,
    getRoomCheckpoints,
    destroyRoom,
    destroyAllRooms,
    getSnapshot,
    hasRoom: (roomId) => rooms.has(roomId)
  })
}

export default { createParticipantRegistry }
