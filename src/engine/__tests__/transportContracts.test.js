import { describe, expect, it } from "vitest"
import { TRANSPORT_PACKET_KINDS, NETWORK_EVENT_TYPES, createTransportAck, createTransportPacket, createTransportRequest, createTransportResponse, validateTransportCompatibility, validateTransportPacket } from "../transportContracts"

describe("transportContracts", () => {
  it("creates frozen versioned packets with backward-compatible validation", () => {
    const packet = createTransportPacket({
      kind: TRANSPORT_PACKET_KINDS.EVENT,
      eventType: NETWORK_EVENT_TYPES.ROOM_CREATE,
      sequence: 7,
      serverTs: 120,
      sourceId: "host",
      payload: { roomId: "room-1" }
    })

    const validation = validateTransportPacket(packet)
    const compatibility = validateTransportCompatibility(packet)

    expect(packet.protocolVersion).toBe(1)
    expect(packet.channel).toBe("room")
    expect(validation.valid).toBe(true)
    expect(compatibility.compatible).toBe(true)
    expect(Object.isFrozen(packet)).toBe(true)
  })

  it("builds request/response/ack packets deterministically", () => {
    const request = createTransportRequest({ eventType: NETWORK_EVENT_TYPES.SPECTATOR_SYNC, sourceId: "a", targetId: "b", sequence: 4 })
    const response = createTransportResponse(request, { sourceId: "b", targetId: "a", payload: { ok: true } })
    const ack = createTransportAck(request, { sourceId: "b" })

    expect(request.kind).toBe(TRANSPORT_PACKET_KINDS.REQUEST)
    expect(response.responseTo).toBe(request.requestId)
    expect(ack.ackId).toBe(request.packetId)
  })
})