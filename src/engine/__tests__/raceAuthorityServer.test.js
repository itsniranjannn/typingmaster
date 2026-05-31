import { describe, expect, it } from "vitest"
import { createTransportPacket, NETWORK_EVENT_TYPES, TRANSPORT_PACKET_KINDS } from "../transportContracts"
import { createRoomLifecycleService } from "../roomLifecycleService"
import { createParticipantRegistry } from "../participantRegistry"
import { createPlacementEngine } from "../placementEngine"
import { createRaceCoordinator } from "../raceCoordinator"
import { createRaceAuthorityServer } from "../raceAuthorityServer"

describe("authoritative race layer", () => {
  it("covers room lifecycle, joins, spectators, and leave flows through the coordinator", () => {
    const roomLifecycleService = createRoomLifecycleService({ maxRooms: 8, roomTtlMs: 60_000 })
    const participantRegistry = createParticipantRegistry({ maxRooms: 8, maxHistory: 64 })
    const placementEngine = createPlacementEngine()
    const coordinator = createRaceCoordinator({
      roomLifecycleService,
      participantRegistry,
      placementEngine,
      minimumParticipants: 1
    })

    const created = coordinator.createRoom({ id: "room-alpha", maxParticipants: 200, maxSpectators: 600 }, 100)
    const joined = coordinator.admitParticipant("room-alpha", { id: "p-1", displayName: "Player 1" }, 120)
    const spectator = coordinator.admitSpectator("room-alpha", { id: "s-1", displayName: "Viewer" }, 140)
    const left = coordinator.leaveParticipant("room-alpha", "p-1", 160, "left")

    expect(created.roomSnapshot.room.id).toBe("room-alpha")
    expect(joined.accepted).toBe(true)
    expect(joined.participant.id).toBe("p-1")
    expect(spectator.spectator.id).toBe("s-1")
    expect(spectator.roomSnapshot.spectators.some((entry) => entry.id === "s-1")).toBe(true)
    expect(left.participant.connected).toBe(false)

    const snapshot = coordinator.getSnapshot()
    expect(snapshot.roomCount).toBe(1)
    expect(snapshot.rooms[0].spectators.some((entry) => entry.id === "s-1")).toBe(true)
    expect(Object.isFrozen(snapshot)).toBe(true)
  })

  it("runs countdown, finish, reconnect validation, and deterministic placements", () => {
    const roomLifecycleService = createRoomLifecycleService({ maxRooms: 8, roomTtlMs: 60_000 })
    const participantRegistry = createParticipantRegistry({ maxRooms: 8, maxHistory: 64 })
    const placementEngine = createPlacementEngine()
    const coordinator = createRaceCoordinator({
      roomLifecycleService,
      participantRegistry,
      placementEngine,
      minimumParticipants: 1
    })

    coordinator.createRoom({ id: "room-race", maxParticipants: 32, maxSpectators: 64 }, 1_000)
    coordinator.admitParticipant("room-race", { id: "p-1", displayName: "Alpha" }, 1_010)
    coordinator.admitParticipant("room-race", { id: "p-2", displayName: "Beta" }, 1_020)

    const countdown = coordinator.startCountdown("room-race", 1_050, 3_000)
    const started = coordinator.startRace("room-race", 4_100)
    const finished = coordinator.finishParticipant("room-race", "p-1", { finishTs: 4_250, elapsedMs: 3_250, wordsCompleted: 50, totalWords: 50, wpm: 96, accuracy: 99 }, 4_250)
    const placements = placementEngine.calculatePlacements({
      participants: [
      { id: "a", state: { finished: true, finishTs: 10, elapsedMs: 10, wordsCompleted: 40, totalWords: 40, wpm: 100, accuracy: 99 } },
      { id: "b", state: { finished: true, finishTs: 10, elapsedMs: 10, wordsCompleted: 40, totalWords: 40, wpm: 100, accuracy: 99 } }
      ]
    })
    const reconnectToken = participantRegistry.issueReconnectToken("room-race", "p-1", { snapshotHash: "snapshot-a", sequence: 7, issuedAt: 4_260 })
    const validation = coordinator.validateReconnectToken("room-race", "p-1", reconnectToken.token, { snapshotHash: "snapshot-a", sequence: 7, serverTs: 4_260 })

    expect(countdown.accepted).toBe(true)
    expect(started.accepted).toBe(true)
    expect(finished.accepted).toBe(true)
    expect(finished.placements.participantCount).toBeGreaterThan(0)
    expect(placements.placements[0].participantId).toBe("a")
    expect(placements.placements[0].tied).toBe(true)
    expect(validation.valid).toBe(true)
    expect(Object.isFrozen(finished)).toBe(true)
  })

  it("handles a high-volume room deterministically", () => {
    const participantRegistry = createParticipantRegistry({ maxRooms: 8, maxHistory: 256, maxCheckpoints: 512 })
    participantRegistry.admitParticipant("room-stress", { id: "seed", displayName: "Seed" }, 10_000)

    for (let index = 0; index < 99; index += 1) {
      participantRegistry.admitParticipant("room-stress", { id: `p-${index}`, displayName: `Player ${index}` }, 10_010 + index)
    }

    for (let index = 0; index < 500; index += 1) {
      participantRegistry.admitSpectator("room-stress", { id: `s-${index}`, displayName: `Spectator ${index}` }, 11_000 + index)
    }

    const snapshots = []
    for (let index = 0; index < 20; index += 1) {
      const token = participantRegistry.issueReconnectToken("room-stress", index === 0 ? "seed" : `p-${index - 1}`, { snapshotHash: "stress-hash", sequence: index + 1, issuedAt: 12_000 + index })
      snapshots.push(participantRegistry.validateReconnectToken("room-stress", index === 0 ? "seed" : `p-${index - 1}`, token.token, { snapshotHash: "stress-hash", sequence: index + 1, serverTs: 12_000 + index }))
    }

    const snapshot = participantRegistry.getSnapshot()

    expect(snapshot.roomCount).toBe(1)
    expect(snapshot.rooms[0].participants.length).toBe(100)
    expect(snapshot.rooms[0].spectators.length).toBe(500)
    expect(snapshots.every((entry) => entry.valid)).toBe(true)
  })

  it("accepts a transport packet through the authoritative server wrapper", () => {
    const server = createRaceAuthorityServer({ minimumParticipants: 1, maxEvents: 64 })
    const createPacket = createTransportPacket({
      kind: TRANSPORT_PACKET_KINDS.EVENT,
      eventType: NETWORK_EVENT_TYPES.ROOM_CREATE,
      sequence: 1,
      serverTs: 20,
      sourceId: "host",
      payload: { room: { id: "room-wire", maxParticipants: 10, maxSpectators: 20 } }
    })
    const joinPacket = createTransportPacket({
      kind: TRANSPORT_PACKET_KINDS.EVENT,
      eventType: NETWORK_EVENT_TYPES.ROOM_JOIN,
      sequence: 2,
      serverTs: 30,
      sourceId: "wire-1",
      roomId: "room-wire",
      payload: { participant: { id: "wire-1", displayName: "Wire Player" } }
    })

    const created = server.handleTransportPacket(createPacket)
    const joined = server.handleTransportPacket(joinPacket)
    const snapshot = server.getSnapshot()

    expect(created.accepted).toBe(true)
    expect(joined.accepted).toBe(true)
    expect(joined.roomSnapshot.participants.some((participant) => participant.id === "wire-1")).toBe(true)
    expect(snapshot.coordinator.roomCount).toBeGreaterThanOrEqual(1)
    expect(Object.isFrozen(joined)).toBe(true)
  })
})