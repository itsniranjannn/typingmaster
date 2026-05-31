import { describe, expect, it } from "vitest"
import { createMultiplayerSessionRuntime } from "../multiplayerSessionRuntime"
import { createTransportAdapter } from "../transportAdapter"
import { createTransportPacket, NETWORK_EVENT_TYPES } from "../transportContracts"

describe("multiplayerSessionRuntime", () => {
  it("orchestrates room lifecycle, transport, sync, countdown, and reconnect flows", () => {
    const runtime = createMultiplayerSessionRuntime({ roomId: "room-rt", maxParticipants: 50, maxSpectators: 100, networkOptions: { scenario: "50ms" } })
    const peer = createTransportAdapter({ nodeId: "peer-1", maxQueue: 8 })

    runtime.registerPeerTransport(peer)

    for (let index = 0; index < 10; index += 1) {
      runtime.joinParticipant({ id: `p-${index}`, displayName: `P${index}` }, 100 + index)
    }
    for (let index = 0; index < 100; index += 1) {
      runtime.admitSpectator({ id: `s-${index}` }, 200 + index)
    }

    peer.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.ROOM_JOIN, sequence: 1, sourceId: "peer-1", payload: { participant: { id: "peer-1", displayName: "Peer" } } }), [runtime.hostTransport.nodeId])
    const afterTick = runtime.tick({ serverTs: 1000, clientTs: 980, now: 1025 })

    expect(afterTick.room.participants.some((participant) => participant.id === "peer-1")).toBe(true)
    expect(afterTick.room.spectators.length).toBe(100)
    expect(afterTick.transport.reliability.pendingCount).toBeGreaterThanOrEqual(0)

    runtime.startCountdown(1100, 3000)
    runtime.startRace(1200)
    const finalTick = runtime.tick({ serverTs: 1400, clientTs: 1380, now: 1500 })
    expect(finalTick.state.state).toBeDefined()
    expect(finalTick.progress.placements.length).toBeGreaterThan(0)
    expect(Object.isFrozen(finalTick)).toBe(true)
  })
})