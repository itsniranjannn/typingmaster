import { describe, expect, it } from "vitest"
import { createRaceRoomManager } from "../raceRoomManager"

describe("raceRoomManager", () => {
  it("creates, joins, leaves, and kicks participants", () => {
    const manager = createRaceRoomManager({ roomTtlMs: 5000 })
    const room = manager.createRoom({ id: "room-1", createdAt: 100, maxParticipants: 3, maxSpectators: 2 })

    manager.joinRoom(room.room.id, { id: "p1", displayName: "A" }, 120)
    manager.joinRoom(room.room.id, { id: "p2", displayName: "B" }, 130)
    manager.leaveRoom(room.room.id, "p2", 140)
    const kicked = manager.joinRoom(room.room.id, { id: "p3", displayName: "C" }, 150)
    const afterKick = manager.kickParticipant(room.room.id, "p3", 160)

    expect(kicked.participants.length).toBe(2)
    expect(afterKick.participants.some((entry) => entry.id === "p3")).toBe(false)
  })

  it("enforces spectator capacity and expiration", () => {
    const manager = createRaceRoomManager({ roomTtlMs: 1000 })
    const room = manager.createRoom({ id: "room-2", createdAt: 0, maxParticipants: 2, maxSpectators: 1 })
    manager.admitSpectator(room.room.id, { id: "s1" }, 100)
    expect(() => manager.admitSpectator(room.room.id, { id: "s2" }, 120)).toThrow("spectator_capacity")

    const expired = manager.expireRooms(1200)
    expect(expired.expiredCount).toBeGreaterThanOrEqual(1)
    expect(manager.getRoomSnapshot(room.room.id).state).toBe("EXPIRED")
  })
})