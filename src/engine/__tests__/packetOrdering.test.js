import { describe, expect, it } from "vitest"
import { createTransportAdapter } from "../transportAdapter"
import { createTransportMessageRouter } from "../transportMessageRouter"
import { createTransportPacket, NETWORK_EVENT_TYPES } from "../transportContracts"

describe("packetOrdering", () => {
  it("delivers packets in deterministic sequence order under router pressure", () => {
    const router = createTransportMessageRouter({ maxRoutes: 32 })
    const source = createTransportAdapter({ nodeId: "source", maxQueue: 8 })
    const target = createTransportAdapter({ nodeId: "target", maxQueue: 8 })
    router.register(source)
    router.register(target)

    ;[9, 1, 6, 3, 2, 8, 4, 7, 5].forEach((sequence) => {
      source.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence, sourceId: "source", payload: { sequence } }), ["target"])
    })

    const inboundSequences = target.drainInbound(20).map((packet) => packet.sequence)
    expect(inboundSequences).toEqual([...inboundSequences].sort((left, right) => left - right))
  })
})