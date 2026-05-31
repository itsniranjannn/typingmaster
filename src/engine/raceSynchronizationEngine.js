import { stableHash } from "./replayConsumerValidation"
import { createRaceSyncContract, validateRaceSyncContract, resolveRaceSyncConflict } from "./syncContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeSnapshot = (snapshot = {}) => freezeDeep({
  revision: Math.max(0, Number(snapshot.revision) || 0),
  state: typeof snapshot.state === "string" ? snapshot.state : "CREATED",
  participantCount: Math.max(0, Number(snapshot.participantCount) || 0),
  spectatorCount: Math.max(0, Number(snapshot.spectatorCount) || 0),
  snapshotHash: typeof snapshot.snapshotHash === "string" ? snapshot.snapshotHash : stableHash(snapshot)
})

const boundedPush = (list, value, limit) => {
  const next = [...list, value]
  if (next.length <= limit) return next
  return next.slice(next.length - limit)
}

export function createRaceSynchronizationEngine(options = {}) {
  const maxSnapshots = Math.max(4, Number(options.maxSnapshots) || 64)
  const maxContracts = Math.max(4, Number(options.maxContracts) || 128)
  const maxCheckpoints = Math.max(4, Number(options.maxCheckpoints) || 128)

  let state = freezeDeep({
    roomId: typeof options.roomId === "string" ? options.roomId : "race-room",
    localSequence: Math.max(0, Number(options.localSequence) || 0),
    remoteSequence: Math.max(0, Number(options.remoteSequence) || 0),
    lastServerTs: Math.max(0, Number(options.lastServerTs) || 0),
    snapshots: [],
    contracts: [],
    checkpoints: [],
    reconnectRecoveries: 0,
    rejectedContracts: 0
  })

  function update(nextPatch) {
    state = freezeDeep({ ...state, ...nextPatch })
    return state
  }

  function reconcileSnapshot(localSnapshot, remoteSnapshot) {
    const left = normalizeSnapshot(localSnapshot)
    const right = normalizeSnapshot(remoteSnapshot)
    if (right.revision > left.revision) return freezeDeep({ winner: "remote", snapshot: right, reason: "revision" })
    if (left.revision > right.revision) return freezeDeep({ winner: "local", snapshot: left, reason: "revision" })
    if (right.snapshotHash === left.snapshotHash) return freezeDeep({ winner: "equal", snapshot: left, reason: "hash-match" })
    return freezeDeep({ winner: right.snapshotHash > left.snapshotHash ? "remote" : "local", snapshot: right.snapshotHash > left.snapshotHash ? right : left, reason: "hash" })
  }

  function createLocalSync(snapshotRef = {}, context = {}) {
    const sequence = state.localSequence + 1
    const contract = createRaceSyncContract({
      roomId: state.roomId,
      participantId: context.participantId || null,
      spectatorId: context.spectatorId || null,
      sequence,
      previousSequence: state.localSequence,
      serverTs: Math.max(state.lastServerTs, Number(context.serverTs) || 0),
      snapshotRef,
      checkpoint: context.checkpoint || {},
      reconnectToken: context.reconnectToken,
      conflictStrategy: "sequence-server-ts-hash"
    })
    return update({
      localSequence: sequence,
      lastServerTs: contract.serverTs,
      contracts: boundedPush(state.contracts, contract, maxContracts),
      checkpoints: boundedPush(state.checkpoints, contract.checkpoint, maxCheckpoints)
    })
  }

  function ingestRemoteSync(rawContract, localSnapshot = {}) {
    const contract = createRaceSyncContract(rawContract)
    const validation = validateRaceSyncContract(contract)
    if (!validation.valid) {
      return update({ rejectedContracts: state.rejectedContracts + 1 })
    }

    const latest = state.contracts.at(-1)
    const resolved = latest ? resolveRaceSyncConflict(latest, contract) : freezeDeep({ winner: "right", reason: "initial", contract })
    const accepted = resolved.winner === "right" || resolved.winner === "equal"
    if (!accepted) {
      return freezeDeep({
        accepted: false,
        reason: resolved.reason,
        state
      })
    }

    const remoteSnapshot = normalizeSnapshot(contract.snapshotRef)
    const local = normalizeSnapshot(localSnapshot)
    const reconciliation = reconcileSnapshot(local, remoteSnapshot)
    const nextState = update({
      remoteSequence: Math.max(state.remoteSequence, contract.sequence),
      lastServerTs: Math.max(state.lastServerTs, contract.serverTs),
      contracts: boundedPush(state.contracts, contract, maxContracts),
      checkpoints: boundedPush(state.checkpoints, contract.checkpoint, maxCheckpoints),
      snapshots: boundedPush(state.snapshots, reconciliation.snapshot, maxSnapshots)
    })

    return freezeDeep({
      accepted: true,
      reason: resolved.reason,
      reconciliation,
      contract,
      state: nextState
    })
  }

  function recoverFromReconnect(recovery = {}) {
    const fromSequence = Math.max(0, Number(recovery.fromSequence ?? state.remoteSequence) || 0)
    const contracts = state.contracts.filter((contract) => contract.sequence >= fromSequence)
    const checkpoints = state.checkpoints.filter((checkpoint) => checkpoint.sequence >= fromSequence)
    const latestSnapshot = state.snapshots.at(-1) || normalizeSnapshot({})
    update({ reconnectRecoveries: state.reconnectRecoveries + 1 })
    return freezeDeep({
      roomId: state.roomId,
      fromSequence,
      contracts,
      checkpoints,
      latestSnapshot,
      recoveryHash: stableHash({ roomId: state.roomId, fromSequence, contracts, checkpoints, latestSnapshot })
    })
  }

  return Object.freeze({
    createLocalSync,
    ingestRemoteSync,
    reconcileSnapshot,
    recoverFromReconnect,
    getSnapshot: () => state
  })
}

export default { createRaceSynchronizationEngine }