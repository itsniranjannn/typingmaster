import { describe, expect, it } from "vitest"
import { createNetworkSimulationEngine, NETWORK_SCENARIOS } from "../networkSimulationEngine"
import { createTransportPacket, NETWORK_EVENT_TYPES } from "../transportContracts"

describe("networkSimulationEngine", () => {
  it("supports scenario presets and deterministic delivery under high latency", () => {
    const engine = createNetworkSimulationEngine({ scenario: "250ms", maxQueue: 16 })
    expect(NETWORK_SCENARIOS["250ms"].latencyMs).toBe(250)

    const packets = []
    for (let index = 0; index < 5; index += 1) {
      packets.push(engine.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence: index, sourceId: "a", payload: { index } }), { targetIds: ["b"] }))
    }
    const delivered = engine.advance(1000)

    expect(packets.every((entry) => entry.packet.protocolVersion === 1)).toBe(true)
    expect(delivered.deliveredCount).toBe(5)
  })

  it("simulates packet loss, out-of-order, and reconnect storms", () => {
    const engine = createNetworkSimulationEngine({ latencyMs: 100, jitterMs: 30, packetLossRate: 1, reorderRate: 1, maxQueue: 32 })
    for (let index = 0; index < 8; index += 1) {
      engine.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence: index, sourceId: "a", payload: { index } }), { targetIds: ["b"] })
    }
    const delivered = engine.advance(1000)
    expect(delivered.deliveredCount).toBe(0)
    expect(engine.getSnapshot().dropped.length).toBe(8)

    const storm = createNetworkSimulationEngine({ scenario: "100ms", maxQueue: 32 })
    const reconnect = storm.simulateReconnectStorm({ participantId: "p-1", count: 10 })
    expect(reconnect.count).toBe(10)
  })
})