import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeCheckpoint = (checkpoint = {}) => freezeDeep({
  sequence: Math.max(0, Number(checkpoint.sequence) || 0),
  participantId: typeof checkpoint.participantId === "string" ? checkpoint.participantId : null,
  ts: Math.max(0, Number(checkpoint.ts) || 0),
  wordsCompleted: Math.max(0, Number(checkpoint.wordsCompleted) || 0),
  totalWords: Math.max(1, Number(checkpoint.totalWords) || 1),
  checkpointHash: typeof checkpoint.checkpointHash === "string"
    ? checkpoint.checkpointHash
    : stableHash({ sequence: Number(checkpoint.sequence) || 0, participantId: checkpoint.participantId || null, ts: Number(checkpoint.ts) || 0, wordsCompleted: Number(checkpoint.wordsCompleted) || 0 })
})

const normalizeSnapshotRef = (snapshot = {}) => freezeDeep({
  revision: Math.max(0, Number(snapshot.revision) || 0),
  state: typeof snapshot.state === "string" ? snapshot.state : "CREATED",
  snapshotHash: typeof snapshot.snapshotHash === "string" ? snapshot.snapshotHash : stableHash(snapshot),
  participantCount: Math.max(0, Number(snapshot.participantCount) || 0),
  spectatorCount: Math.max(0, Number(snapshot.spectatorCount) || 0)
})

export const createRaceSyncContract = (input = {}) => {
  const snapshotRef = normalizeSnapshotRef(isPlainObject(input.snapshotRef) ? input.snapshotRef : {})
  const checkpoint = normalizeCheckpoint(isPlainObject(input.checkpoint) ? input.checkpoint : {})
  const sequence = Math.max(0, Number(input.sequence) || 0)
  const serverTs = Math.max(0, Number(input.serverTs) || 0)
  const reconnect = freezeDeep({
    token: typeof input.reconnectToken === "string" ? input.reconnectToken : stableHash({ roomId: input.roomId || null, participantId: input.participantId || null, sequence }),
    canRecoverFromSequence: Math.max(0, Number(input.canRecoverFromSequence ?? sequence) || 0),
    snapshotHash: snapshotRef.snapshotHash
  })

  const conflictPolicy = freezeDeep({
    strategy: typeof input.conflictStrategy === "string" ? input.conflictStrategy : "sequence-server-ts-hash",
    deterministic: true
  })

  return freezeDeep({
    roomId: typeof input.roomId === "string" ? input.roomId : null,
    participantId: typeof input.participantId === "string" ? input.participantId : null,
    spectatorId: typeof input.spectatorId === "string" ? input.spectatorId : null,
    sequence,
    serverTs,
    previousSequence: Math.max(0, Number(input.previousSequence) || 0),
    snapshotRef,
    checkpoint,
    reconnect,
    conflictPolicy,
    contractHash: stableHash({
      roomId: input.roomId || null,
      participantId: input.participantId || null,
      spectatorId: input.spectatorId || null,
      sequence,
      serverTs,
      previousSequence: Math.max(0, Number(input.previousSequence) || 0),
      snapshotRef,
      checkpoint,
      reconnect,
      conflictPolicy
    })
  })
}

export const validateRaceSyncContract = (contract) => {
  const reasons = []
  if (!contract || typeof contract !== "object") reasons.push("missing_contract")
  if (typeof contract?.roomId !== "string" || contract.roomId.length === 0) reasons.push("missing_room")
  if (!Number.isFinite(Number(contract?.sequence)) || Number(contract.sequence) < 0) reasons.push("bad_sequence")
  if (!Number.isFinite(Number(contract?.serverTs)) || Number(contract.serverTs) < 0) reasons.push("bad_server_ts")
  if (!contract?.snapshotRef?.snapshotHash) reasons.push("missing_snapshot_hash")
  if (!contract?.checkpoint?.checkpointHash) reasons.push("missing_checkpoint_hash")
  return freezeDeep({ valid: reasons.length === 0, reasons, contractHash: contract?.contractHash || null })
}

export const resolveRaceSyncConflict = (leftContract, rightContract) => {
  const left = createRaceSyncContract(leftContract || {})
  const right = createRaceSyncContract(rightContract || {})
  if (left.sequence !== right.sequence) {
    return freezeDeep({ winner: left.sequence > right.sequence ? "left" : "right", reason: "sequence", contract: left.sequence > right.sequence ? left : right })
  }
  if (left.serverTs !== right.serverTs) {
    return freezeDeep({ winner: left.serverTs > right.serverTs ? "left" : "right", reason: "serverTs", contract: left.serverTs > right.serverTs ? left : right })
  }
  if (left.contractHash === right.contractHash) {
    return freezeDeep({ winner: "equal", reason: "hash-match", contract: left })
  }
  return freezeDeep({ winner: left.contractHash > right.contractHash ? "left" : "right", reason: "hash", contract: left.contractHash > right.contractHash ? left : right })
}

export default { createRaceSyncContract, validateRaceSyncContract, resolveRaceSyncConflict }