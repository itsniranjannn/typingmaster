import { describe, expect, it } from "vitest"
import { createTransportAdapter } from "../transportAdapter"
import { createTransportMessageRouter } from "../transportMessageRouter"
import { NETWORK_EVENT_TYPES, createTransportPacket } from "../transportContracts"

describe("transportAdapter", () => {
  it("routes sends, requests, responses, acks, and retries deterministically", () => {
    const router = createTransportMessageRouter({ maxRoutes: 64 })
    const host = createTransportAdapter({ nodeId: "host", maxQueue: 4 })
    const left = createTransportAdapter({ nodeId: "left", maxQueue: 4 })
    const right = createTransportAdapter({ nodeId: "right", maxQueue: 4 })

    router.register(host)
    router.register(left)
    router.register(right)

    left.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.ROOM_JOIN, sequence: 3, sourceId: "left", payload: { participant: { id: "left" } } }), ["host"])
    left.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.ROOM_JOIN, sequence: 1, sourceId: "left", payload: { participant: { id: "left" } } }), ["host"])
    left.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.ROOM_JOIN, sequence: 2, sourceId: "left", payload: { participant: { id: "left" } } }), ["host"])

    const inbound = host.drainInbound(10)
    expect(inbound.map((packet) => packet.sequence)).toEqual([1, 2, 3])

    left.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence: 4, sourceId: "left", payload: { value: 1 } }), ["host"])
    const nextInbound = host.drainInbound(10)[0]
    const ackResult = host.ack(nextInbound, 200)
    expect(ackResult.sent).toBe(true)
    expect(left.drainInbound(10)[0].kind).toBe("ack")

    const requestResult = left.request({ eventType: NETWORK_EVENT_TYPES.SPECTATOR_SYNC, payload: { sync: true }, sequence: 5 }, "host", 300)
    expect(requestResult.sent).toBe(true)
    const requestPacket = host.drainInbound(10)[0]
    const responseResult = host.response(requestPacket, { accepted: true }, 320)
    expect(responseResult.sent).toBe(true)
    expect(left.drainInbound(10)[0].kind).toBe("response")

    left.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence: 6, sourceId: "left", payload: { value: 2 } }), ["host"])
    const retryResult = left.retry(1000)
    expect(retryResult.retryCount).toBeGreaterThanOrEqual(1)
    expect(left.getSnapshot().reliability.pendingCount).toBeGreaterThan(0)
  })

  it("bounds queue growth under burst load", () => {
    const router = createTransportMessageRouter({ maxRoutes: 64 })
    const sender = createTransportAdapter({ nodeId: "sender", maxQueue: 2 })
    const receiver = createTransportAdapter({ nodeId: "receiver", maxQueue: 2 })
    router.register(sender)
    router.register(receiver)

    for (let index = 0; index < 10; index += 1) {
      sender.send(createTransportPacket({ eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence: index, sourceId: "sender", payload: { index } }), ["receiver"])
    }

    expect(receiver.getSnapshot().inboundCount).toBeLessThanOrEqual(2)
  })
})