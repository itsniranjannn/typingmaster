import { describe, expect, it } from "vitest"
import { createSpectatorTransportBridge } from "../spectatorTransportBridge"
import { createTransportPacket, NETWORK_EVENT_TYPES } from "../transportContracts"

const replay = {
  id: "session-1",
  events: [
    { type: "input", t: 0 },
    { type: "input", t: 40 },
    { type: "marker", t: 80, payload: { label: "cp" } }
  ],
  meta: {}
}

describe("spectatorTransportBridge", () => {
  it("syncs ghosts, routes packets, and performs recovery deterministically", () => {
    const bridge = createSpectatorTransportBridge({ replay, ghostReplays: [replay], nodeId: "spec-bridge" })
    const sync = bridge.syncGhosts({ start: 0, end: 100 })
    const packet = bridge.routeSpectatorPacket({ eventType: NETWORK_EVENT_TYPES.SPECTATOR_SYNC, sequence: 1, payload: { viewport: { start: 0, end: 100 } } }, ["peer-1"])
    const recovery = bridge.spectatorRecovery({ roomId: "room-1", spectatorId: "spec-1", sequence: 1, fromSequence: 1, issuedAt: 1000 })
    const desync = bridge.detectDesync(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.DESYNC_REPORT, sequence: 2, sourceId: "peer-1", payload: { replayHash: "mismatch" } }))

    expect(sync.replayHash).toBeDefined()
    expect(packet.packet.eventType).toBe(NETWORK_EVENT_TYPES.SPECTATOR_SYNC)
    expect(recovery.token.token).toBeDefined()
    expect(desync.classification.kind).toBeDefined()
  })
})