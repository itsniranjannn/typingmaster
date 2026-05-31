import { describe, expect, it } from "vitest"
import { createTransportPacket, NETWORK_EVENT_TYPES } from "../transportContracts"
import { deserializeTransportFrame, serializeTransportFrame, TRANSPORT_FRAME_TYPES } from "../transportCodec"

describe("transportCodec", () => {
  it("round-trips packet frames with frozen deterministic output", () => {
    const packet = createTransportPacket({ eventType: NETWORK_EVENT_TYPES.SPECTATOR_SYNC, sequence: 9, sourceId: "peer", payload: { sync: true } })
    const serialized = serializeTransportFrame({ frameType: TRANSPORT_FRAME_TYPES.PACKET, protocolVersion: 1, transportId: "ws", connectionId: "conn", sequence: 9, serverTs: 42, packet })
    const decoded = deserializeTransportFrame(serialized)

    expect(decoded.valid).toBe(true)
    expect(decoded.packet.packetId).toBe(packet.packetId)
    expect(Object.isFrozen(decoded.frame)).toBe(true)
  })
})