import { stableHash } from "./replayConsumerValidation"
import { createRaceRoomManager } from "./raceRoomManager"
import { createRaceStateMachine, RACE_STATES } from "./raceStateMachine"
import { createClockSynchronizationEngine } from "./clockSynchronizationEngine"
import { createRaceCountdownEngine } from "./raceCountdownEngine"
import { createRaceSynchronizationEngine } from "./raceSynchronizationEngine"
import { createReconnectRecoveryEngine } from "./reconnectRecoveryEngine"
import { createNetworkSimulationEngine } from "./networkSimulationEngine"
import { createTransportAdapter } from "./transportAdapter"
import { createWebSocketTransport } from "./websocketTransport"
import { createTransportMessageRouter } from "./transportMessageRouter"
import { createTransportPacket, NETWORK_EVENT_TYPES, TRANSPORT_CHANNELS } from "./transportContracts"
import { projectRaceProgress } from "./raceProgressProjection"
import { createMultiplayerReplayEnvelope, buildParticipantTimelines, buildSpectatorTimelines } from "./multiplayerReplayContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeSnapshot = (snapshot) => freezeDeep(snapshot && typeof snapshot === "object" ? snapshot : {})

const roomEventForState = (state) => {
  if (state === RACE_STATES.CREATED || state === RACE_STATES.WAITING) return NETWORK_EVENT_TYPES.ROOM_CREATE
  if (state === RACE_STATES.READY) return NETWORK_EVENT_TYPES.RACE_READY
  if (state === RACE_STATES.COUNTDOWN) return NETWORK_EVENT_TYPES.RACE_COUNTDOWN
  if (state === RACE_STATES.RUNNING) return NETWORK_EVENT_TYPES.RACE_START
  if (state === RACE_STATES.FINISHED) return NETWORK_EVENT_TYPES.RACE_FINISH
  if (state === RACE_STATES.ABORTED || state === RACE_STATES.EXPIRED) return NETWORK_EVENT_TYPES.ROOM_CLOSE
  return NETWORK_EVENT_TYPES.SPECTATOR_SYNC
}

export function createMultiplayerSessionRuntime(options = {}) {
  const roomManager = options.roomManager || createRaceRoomManager(options.roomOptions || {})
  const stateMachine = options.stateMachine || createRaceStateMachine({ state: RACE_STATES.CREATED })
  const clockSync = options.clockSyncEngine || createClockSynchronizationEngine(options.clockOptions || {})
  const countdown = options.countdownEngine || createRaceCountdownEngine(options.countdownOptions || {})
  const syncEngine = options.syncEngine || createRaceSynchronizationEngine({ roomId: options.roomId || "room" })
  const reconnectEngine = options.reconnectEngine || createReconnectRecoveryEngine(options.reconnectOptions || {})
  const transportRouter = options.transportRouter || createTransportMessageRouter(options.routerOptions || {})
  const websocketTransport = options.websocketTransport || (options.transportOptions?.url || options.transportOptions?.endpoint ? createWebSocketTransport({
    ...options.transportOptions,
    nodeId: options.hostNodeId || options.transportOptions?.nodeId || "host",
    reliabilityLayer: options.reliabilityLayer || options.transportOptions?.reliabilityLayer,
    protocolVersion: options.transportOptions?.protocolVersion || 1
  }) : null)
  const hostTransport = options.hostTransport || websocketTransport || createTransportAdapter({ nodeId: options.hostNodeId || "host", maxQueue: options.maxQueue || 256, reliabilityLayer: options.reliabilityLayer || undefined })
  const network = options.networkEngine || createNetworkSimulationEngine(options.networkOptions || {})
  const roomId = typeof options.roomId === "string" ? options.roomId : "room"

  transportRouter.register(hostTransport)
  if (typeof hostTransport.connect === "function" && options.transportOptions?.autoconnect !== false) {
    hostTransport.connect(options.transportOptions || {})
  }

  let roomSnapshot = roomManager.createRoom({
    id: roomId,
    createdAt: Math.max(0, Number(options.createdAt) || 0),
    maxParticipants: options.maxParticipants || 10,
    maxSpectators: options.maxSpectators || 100
  })
  let replayEnvelope = createMultiplayerReplayEnvelope({ id: roomId, events: [], meta: {} }, {
    roomId,
    raceState: stateMachine.snapshot().state,
    participantTimelines: [],
    spectatorTimelines: [],
    raceCheckpoints: []
  })
  let lastClockObservation = clockSync.getSnapshot()
  let lastNetworkFlush = network.getSnapshot()
  let lastRecovery = reconnectEngine.getSnapshot()

  const processIncomingPacket = (packet) => {
    if (!packet) return null
    const normalized = packet.protocolVersion ? packet : createTransportPacket({ ...packet, sourceId: packet.sourceId || hostTransport.nodeId })
    if (normalized.eventType === NETWORK_EVENT_TYPES.ROOM_JOIN) {
      roomSnapshot = roomManager.joinRoom(roomId, normalized.payload?.participant || { id: normalized.sourceId }, normalized.serverTs)
      stateMachine.transition({ type: "participants-ready" }, { participantCount: roomSnapshot.participants.length, minimumParticipants: 2 })
    }
    if (normalized.eventType === NETWORK_EVENT_TYPES.SPECTATOR_JOIN) {
      roomSnapshot = roomManager.admitSpectator(roomId, normalized.payload?.spectator || { id: normalized.sourceId }, normalized.serverTs)
      stateMachine.transition({ type: "spectator" }, { spectatorCount: roomSnapshot.spectators.length, syncMode: "spectator" })
    }
    if (normalized.eventType === NETWORK_EVENT_TYPES.ROOM_LEAVE) {
      roomSnapshot = roomManager.leaveRoom(roomId, normalized.payload?.participantId || normalized.sourceId, normalized.serverTs)
    }
    if (normalized.eventType === NETWORK_EVENT_TYPES.DESYNC_REPORT) {
      reconnectEngine.registerEvent({ sequence: normalized.sequence, serverTs: normalized.serverTs, type: normalized.eventType, participantId: normalized.sourceId, payload: normalized.payload })
    }
    reconnectEngine.registerEvent({ sequence: normalized.sequence, serverTs: normalized.serverTs, type: normalized.eventType, participantId: normalized.sourceId, payload: normalized.payload })
    const syncResult = syncEngine.ingestRemoteSync({
      roomId,
      participantId: normalized.sourceId,
      sequence: normalized.sequence,
      serverTs: normalized.serverTs,
      snapshotRef: { revision: roomSnapshot.revision, state: stateMachine.snapshot().state, participantCount: roomSnapshot.participants.length, spectatorCount: roomSnapshot.spectators.length, snapshotHash: roomSnapshot.hashes.snapshotHash },
      checkpoint: normalized.payload?.checkpoint || {}
    }, { revision: roomSnapshot.revision, state: stateMachine.snapshot().state, snapshotHash: roomSnapshot.hashes.snapshotHash, participantCount: roomSnapshot.participants.length, spectatorCount: roomSnapshot.spectators.length })
    updateReplayEnvelope()
    return freezeDeep({ accepted: true, packet: normalized, syncResult })
  }

  const updateReplayEnvelope = () => {
    const participantTimelines = buildParticipantTimelines(roomSnapshot.participants.map((participant) => ({
      id: participant.id,
      sequence: roomSnapshot.sequence,
      serverTs: roomSnapshot.serverTs,
      state: participant.state
    })))
    const spectatorTimelines = buildSpectatorTimelines(roomSnapshot.spectators.map((spectator) => ({
      id: spectator.id,
      sequence: roomSnapshot.sequence,
      serverTs: roomSnapshot.serverTs,
      focusParticipantId: spectator.focusParticipantId,
      lagMs: spectator.lagMs
    })))
    replayEnvelope = createMultiplayerReplayEnvelope(replayEnvelope, {
      roomId,
      raceState: stateMachine.snapshot().state,
      participantTimelines,
      spectatorTimelines,
      raceCheckpoints: roomSnapshot.checkpoints,
      transportMetadata: { hostNodeId: hostTransport.nodeId, routerHash: transportRouter.getSnapshot().routerHash }
    })
  }

  const publishRoomEvent = (eventType, payload = {}, targetIds = []) => {
    const packet = createTransportPacket({
      roomId,
      sourceId: hostTransport.nodeId,
      kind: "event",
      eventType,
      channel: eventType === NETWORK_EVENT_TYPES.SPECTATOR_SYNC ? TRANSPORT_CHANNELS.SPECTATOR : TRANSPORT_CHANNELS.ROOM,
      sequence: roomSnapshot.sequence + 1,
      serverTs: roomSnapshot.serverTs,
      payload
    })
    const routed = network ? network.send(packet, { targetIds, roomId }) : packet
    if (!network) {
      transportRouter.route(routed.packet || routed, hostTransport.nodeId, targetIds)
    }
    reconnectEngine.registerEvent({ sequence: packet.sequence, serverTs: packet.serverTs, type: eventType, participantId: payload.participantId || null, payload })
    return packet
  }

  const ingestTransport = (packet = {}) => {
    const received = hostTransport.receiveFromRouter(packet)
    if (!received.received) return freezeDeep({ accepted: false, reason: received.reason || "invalid_packet" })
    return processIncomingPacket(received.packet)
  }

  const joinParticipant = (participant = {}, serverTs = 0) => {
    roomSnapshot = roomManager.joinRoom(roomId, participant, serverTs)
    stateMachine.transition({ type: "participants-ready" }, { participantCount: roomSnapshot.participants.length, minimumParticipants: 2 })
    publishRoomEvent(NETWORK_EVENT_TYPES.ROOM_JOIN, { participant }, [participant.id].filter(Boolean))
    updateReplayEnvelope()
    return roomSnapshot
  }

  const leaveParticipant = (participantId, serverTs = 0) => {
    roomSnapshot = roomManager.leaveRoom(roomId, participantId, serverTs)
    publishRoomEvent(NETWORK_EVENT_TYPES.ROOM_LEAVE, { participantId }, [])
    updateReplayEnvelope()
    return roomSnapshot
  }

  const admitSpectator = (spectator = {}, serverTs = 0) => {
    roomSnapshot = roomManager.admitSpectator(roomId, spectator, serverTs)
    publishRoomEvent(NETWORK_EVENT_TYPES.SPECTATOR_JOIN, { spectator }, [spectator.id].filter(Boolean))
    updateReplayEnvelope()
    return roomSnapshot
  }

  const closeRoom = (serverTs = 0) => {
    roomSnapshot = roomManager.expireRooms(serverTs) ? roomManager.getRoomSnapshot(roomId) || roomSnapshot : roomSnapshot
    stateMachine.transition({ type: "expire" }, { expired: true })
    publishRoomEvent(NETWORK_EVENT_TYPES.ROOM_CLOSE, { roomId }, [])
    updateReplayEnvelope()
    return roomSnapshot
  }

  const startCountdown = (serverTs = 0, durationMs = 3000) => {
    stateMachine.transition({ type: "room-open" }, { participantCount: roomSnapshot.participants.length, minimumParticipants: 2 })
    stateMachine.transition({ type: "participants-ready" }, { participantCount: roomSnapshot.participants.length, minimumParticipants: 2 })
    stateMachine.transition({ type: "countdown-start" }, { countdownReady: true })
    countdown.start(serverTs, durationMs)
    publishRoomEvent(NETWORK_EVENT_TYPES.RACE_COUNTDOWN, { durationMs, serverTs }, [])
    updateReplayEnvelope()
    return countdown.getSnapshot()
  }

  const startRace = (serverTs = 0) => {
    stateMachine.transition({ type: "race-start" }, {})
    publishRoomEvent(NETWORK_EVENT_TYPES.RACE_START, { serverTs }, [])
    updateReplayEnvelope()
    return stateMachine.snapshot()
  }

  const finishRace = (result = {}, serverTs = 0) => {
    stateMachine.transition({ type: "race-finish" }, { raceComplete: true })
    roomSnapshot = roomManager.getRoomSnapshot(roomId) || roomSnapshot
    publishRoomEvent(NETWORK_EVENT_TYPES.RACE_FINISH, { result, serverTs }, [])
    updateReplayEnvelope()
    return freezeDeep({ result, serverTs, state: stateMachine.snapshot().state })
  }

  const observeClock = (sample = {}) => {
    lastClockObservation = clockSync.observe(sample)
    return lastClockObservation
  }

  const tick = ({ serverTs = 0, clientTs = 0, now = serverTs } = {}) => {
    if (serverTs || clientTs) {
      observeClock({ serverTs, clientTs, rttMs: Math.max(0, Number(now) - Number(clientTs) || 0) })
    }
    const correctedCountdown = countdown.tick({ serverTs, clientTs })
    const networkAdvance = network.advance(now)
    networkAdvance.delivered.forEach((packet) => {
      transportRouter.route(packet, packet.sourceId || hostTransport.nodeId, packet.metadata?.targetIds || (packet.targetId ? [packet.targetId] : []))
    })
    hostTransport.drainInbound().forEach((packet) => {
      processIncomingPacket(packet)
    })
    const retries = hostTransport.tick(now)
    const snapshot = roomManager.getSnapshot()
    roomSnapshot = roomManager.getRoomSnapshot(roomId) || roomSnapshot
    if (serverTs && roomSnapshot?.room?.expiresAt && serverTs >= roomSnapshot.room.expiresAt) {
      stateMachine.transition({ type: "expire" }, { expired: true })
    }
    reconnectEngine.registerSnapshot({ revision: roomSnapshot.revision, sequence: roomSnapshot.sequence, snapshotHash: roomSnapshot.hashes.snapshotHash, serverTs, state: stateMachine.snapshot().state })
    updateReplayEnvelope()
    lastNetworkFlush = networkAdvance
    lastRecovery = reconnectEngine.getSnapshot()
    const progress = projectRaceProgress(roomSnapshot)
    return freezeDeep({
      room: roomSnapshot,
      state: stateMachine.snapshot(),
      countdown: correctedCountdown,
      transport: hostTransport.getSnapshot(),
      network: network.getSnapshot(),
      clock: clockSync.getSnapshot(),
      sync: syncEngine.getSnapshot(),
      recovery: lastRecovery,
      retries,
      progress,
      replayEnvelope,
      snapshot,
      now
    })
  }

  const recover = (input = {}) => {
    const recovery = reconnectEngine.recover({ ...input, roomId, participantId: input.participantId || null })
    const snapshotRecovery = syncEngine.recoverFromReconnect({ fromSequence: recovery.fromSequence })
    return freezeDeep({
      recovery,
      snapshotRecovery,
      transport: hostTransport.reliability.getSnapshot(),
      clock: clockSync.getSnapshot()
    })
  }

  const getSnapshot = () => {
    const progress = projectRaceProgress(roomSnapshot)
    return freezeDeep({
      room: roomSnapshot,
      state: stateMachine.snapshot(),
      countdown: countdown.getReplayCompatibleSnapshot(),
      transport: hostTransport.getSnapshot(),
      network: network.getSnapshot(),
      sync: syncEngine.getSnapshot(),
      clock: clockSync.getSnapshot(),
      recovery: lastRecovery,
      progress,
      replayEnvelope,
      hostNodeId: hostTransport.nodeId,
      router: transportRouter.getSnapshot(),
      lastNetworkFlush,
      sessionHash: stableHash({ roomSnapshot, state: stateMachine.snapshot(), countdown: countdown.getReplayCompatibleSnapshot(), transport: hostTransport.getSnapshot(), network: network.getSnapshot(), sync: syncEngine.getSnapshot(), clock: clockSync.getSnapshot() })
    })
  }

  return Object.freeze({
    joinParticipant,
    leaveParticipant,
    admitSpectator,
    closeRoom,
    startCountdown,
    startRace,
    finishRace,
    tick,
    observeClock,
    recover,
    ingestTransport,
    publishRoomEvent,
    registerPeerTransport: (adapter) => transportRouter.register(adapter),
    getSnapshot,
    getRoomSnapshot: () => roomSnapshot,
    transportRouter,
    hostTransport,
    websocketTransport,
    network,
    roomManager,
    stateMachine,
    clockSync,
    countdown,
    syncEngine,
    reconnectEngine
  })
}

export default { createMultiplayerSessionRuntime }