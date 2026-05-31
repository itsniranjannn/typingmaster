import { beforeEach, describe, expect, it } from "vitest"
import { createWebSocketTransport } from "../websocketTransport"
import { createTransportPacket, NETWORK_EVENT_TYPES, TRANSPORT_PROTOCOL_VERSION } from "../transportContracts"
import { deserializeTransportFrame, serializeTransportFrame, TRANSPORT_FRAME_TYPES } from "../transportCodec"

class FakeWebSocket {
  constructor(url, protocols) {
    this.url = url
    this.protocols = protocols
    this.readyState = 0
    this.sent = []
    this.closed = []
    FakeWebSocket.instances.push(this)
  }

  open() {
    this.readyState = 1
    this.onopen?.({ target: this })
  }

  receive(data) {
    this.onmessage?.({ data })
  }

  send(data) {
    this.sent.push(data)
  }

  close(code = 1000, reason = "") {
    this.readyState = 3
    this.closed.push({ code, reason })
    this.onclose?.({ code, reason })
  }
}

FakeWebSocket.instances = []

describe("websocketTransport", () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
  })

  it("connects, serializes packets, and preserves the adapter contract", () => {
    const transport = createWebSocketTransport({
      url: "ws://example.test/socket",
      WebSocketCtor: FakeWebSocket,
      heartbeatIntervalMs: 5000,
      heartbeatTimeoutMs: 10000
    })

    const connectResult = transport.connect()
    expect(connectResult.connected).toBe(true)
    const socket = FakeWebSocket.instances.at(-1)
    socket.open()

    const packet = createTransportPacket({ eventType: NETWORK_EVENT_TYPES.ROOM_JOIN, sequence: 2, sourceId: transport.nodeId, payload: { participant: { id: "peer" } } })
    const sendResult = transport.send(packet, ["peer"])
    const decoded = deserializeTransportFrame(socket.sent.at(-1))

    expect(sendResult.sent).toBe(true)
    expect(decoded.frame.frameType).toBe(TRANSPORT_FRAME_TYPES.PACKET)
    expect(decoded.packet.eventType).toBe(NETWORK_EVENT_TYPES.ROOM_JOIN)
    expect(Object.isFrozen(transport.getSnapshot())).toBe(true)
  })

  it("handles ping/pong, duplicate packets, protocol mismatch, and heartbeat timeout", () => {
    const transport = createWebSocketTransport({ url: "ws://example.test/socket", WebSocketCtor: FakeWebSocket, heartbeatIntervalMs: 5, heartbeatTimeoutMs: 10 })
    transport.connect({ now: 100 })
    const socket = FakeWebSocket.instances.at(-1)
    socket.open()

    transport.ping(100)
    const pingFrame = deserializeTransportFrame(socket.sent.at(-1))
    expect(pingFrame.frame.frameType).toBe(TRANSPORT_FRAME_TYPES.PING)

    socket.receive(serializeTransportFrame({ frameType: TRANSPORT_FRAME_TYPES.PONG, protocolVersion: TRANSPORT_PROTOCOL_VERSION, transportId: transport.transportId, connectionId: transport.getSnapshot().connectionId, sequence: 2, serverTs: 108, payload: { sentAt: 100 } }))
    expect(transport.getMetrics().latencyMs).toBe(8)

    const packet = createTransportPacket({ eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence: 3, sourceId: "remote", payload: { value: 1 } })
    socket.receive(serializeTransportFrame({ frameType: TRANSPORT_FRAME_TYPES.PACKET, protocolVersion: TRANSPORT_PROTOCOL_VERSION, transportId: transport.transportId, connectionId: transport.getSnapshot().connectionId, sequence: 3, serverTs: 120, packet }))
    socket.receive(serializeTransportFrame({ frameType: TRANSPORT_FRAME_TYPES.PACKET, protocolVersion: TRANSPORT_PROTOCOL_VERSION, transportId: transport.transportId, connectionId: transport.getSnapshot().connectionId, sequence: 3, serverTs: 120, packet }))

    expect(transport.getMetrics().duplicateCount).toBe(1)

    const mismatch = deserializeTransportFrame(serializeTransportFrame({ frameType: TRANSPORT_FRAME_TYPES.PACKET, protocolVersion: TRANSPORT_PROTOCOL_VERSION + 1, transportId: transport.transportId, connectionId: transport.getSnapshot().connectionId, sequence: 4, serverTs: 130, packet: createTransportPacket({ protocolVersion: TRANSPORT_PROTOCOL_VERSION + 1, eventType: NETWORK_EVENT_TYPES.RACE_PROGRESS, sequence: 4, sourceId: "remote", payload: {} }) }))
    expect(mismatch.valid).toBe(false)

    transport.disconnect("test")
    const timeoutTransport = createWebSocketTransport({ url: "ws://example.test/socket", WebSocketCtor: FakeWebSocket, heartbeatIntervalMs: 5, heartbeatTimeoutMs: 10 })
    timeoutTransport.connect({ now: 100 })
    FakeWebSocket.instances.at(-1).open()
    timeoutTransport.heartbeat(100)
    timeoutTransport.tick(1101)
    expect(timeoutTransport.getMetrics().heartbeatFailures).toBeGreaterThan(0)
  })

  it("reconnects with a stable token and keeps snapshots frozen", () => {
    const transport = createWebSocketTransport({ url: "ws://example.test/socket", WebSocketCtor: FakeWebSocket, maxReconnectAttempts: 2, reconnectDelayMs: 1 })
    transport.connect()
    const socket = FakeWebSocket.instances.at(-1)
    socket.open()
    const tokenBefore = transport.reconnectToken
    socket.close(1006, "lost")
    transport.reconnect()

    expect(transport.reconnectToken).toBe(tokenBefore)
    expect(transport.getMetrics().reconnectCount).toBeGreaterThanOrEqual(1)
    expect(Object.isFrozen(transport.getMetrics())).toBe(true)
  })
})