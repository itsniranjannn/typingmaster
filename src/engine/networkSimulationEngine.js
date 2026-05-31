import { stableHash } from "./replayConsumerValidation"
import { createTransportPacket, TRANSPORT_PACKET_KINDS } from "./transportContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

export const NETWORK_SCENARIOS = Object.freeze({
  "50ms": { latencyMs: 50, jitterMs: 6, lossRate: 0.005, reorderRate: 0.03 },
  "100ms": { latencyMs: 100, jitterMs: 12, lossRate: 0.01, reorderRate: 0.05 },
  "250ms": { latencyMs: 250, jitterMs: 24, lossRate: 0.02, reorderRate: 0.08 },
  "500ms": { latencyMs: 500, jitterMs: 48, lossRate: 0.03, reorderRate: 0.1 },
  "1000ms": { latencyMs: 1000, jitterMs: 90, lossRate: 0.05, reorderRate: 0.12 }
})

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const scenarioFromInput = (input = {}) => {
  if (typeof input.scenario === "string" && NETWORK_SCENARIOS[input.scenario]) return NETWORK_SCENARIOS[input.scenario]
  return {
    latencyMs: Math.max(0, Number(input.latencyMs) || 0),
    jitterMs: Math.max(0, Number(input.jitterMs) || 0),
    lossRate: clamp(Number(input.lossRate) || 0, 0, 1),
    reorderRate: clamp(Number(input.reorderRate) || 0, 0, 1)
  }
}

const score = (value) => {
  const hash = stableHash(value)
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff
}

export function createNetworkSimulationEngine(options = {}) {
  const scenario = scenarioFromInput(options)
  const maxQueue = Math.max(1, Number(options.maxQueue) || 1024)
  const packetLossRate = clamp(Number(options.packetLossRate ?? scenario.lossRate) || 0, 0, 1)
  const reorderRate = clamp(Number(options.reorderRate ?? scenario.reorderRate) || 0, 0, 1)
  const latencyMs = Math.max(0, Number(options.latencyMs ?? scenario.latencyMs) || 0)
  const jitterMs = Math.max(0, Number(options.jitterMs ?? scenario.jitterMs) || 0)
  const reconnectStormSize = Math.max(1, Number(options.reconnectStormSize) || 8)
  let queue = []
  let delivered = []
  let dropped = []
  let now = 0
  let packetSequence = 0

  function schedule(packet, meta = {}) {
    const sequence = Math.max(0, Number(packet.sequence ?? packetSequence) || 0)
    packetSequence = Math.max(packetSequence, sequence + 1)
    const packetHashScore = score({ packet, meta, scenario, sequence })
    if (packetHashScore < packetLossRate) {
      const droppedPacket = freezeDeep({ packet, reason: "loss", scheduledAt: now, sequence })
      dropped = [...dropped, droppedPacket].slice(-maxQueue)
      return freezeDeep({ delivered: false, dropped: true, packet: droppedPacket })
    }

    const jitterWindow = jitterMs > 0 ? Math.round((score({ packetHashScore, packet }) * 2 - 1) * jitterMs) : 0
    const reorderWindow = packetHashScore < reorderRate ? Math.max(-jitterMs, Math.min(jitterMs, Math.round(jitterMs / 2))) * -1 : 0
    const deliverAt = Math.max(0, now + latencyMs + jitterWindow + reorderWindow)
    const transportPacket = createTransportPacket({
      ...packet,
      sequence,
      serverTs: Number(packet.serverTs) || deliverAt,
      metadata: { ...(packet.metadata || {}), networkScenario: scenario, scheduledAt: now, deliverAt }
    })
    queue = [...queue, freezeDeep({ deliverAt, packet: transportPacket, score: packetHashScore })]
      .sort((left, right) => left.deliverAt - right.deliverAt || left.packet.sequence - right.packet.sequence || left.packet.packetId.localeCompare(right.packet.packetId))
      .slice(-maxQueue)
    return freezeDeep({ delivered: false, dropped: false, packet: transportPacket, deliverAt })
  }

  function send(packet, meta = {}) {
    return schedule(packet, meta)
  }

  function advance(time = now) {
    now = Math.max(now, Number(time) || 0)
    const due = queue.filter((entry) => entry.deliverAt <= now)
    queue = queue.filter((entry) => entry.deliverAt > now)
    const ordered = due.sort((left, right) => left.deliverAt - right.deliverAt || left.packet.sequence - right.packet.sequence || left.packet.packetId.localeCompare(right.packet.packetId))
    const nextDelivered = ordered.map((entry) => entry.packet)
    delivered = [...delivered, ...nextDelivered].slice(-maxQueue)
    return freezeDeep({
      delivered: nextDelivered,
      deliveredCount: nextDelivered.length,
      droppedCount: dropped.length,
      queueCount: queue.length,
      now
    })
  }

  function flush() {
    return advance(Number.MAX_SAFE_INTEGER)
  }

  function simulateReconnectStorm(options = {}) {
    const count = Math.max(1, Number(options.count) || reconnectStormSize)
    const participantId = typeof options.participantId === "string" ? options.participantId : "storm"
    const packets = []
    for (let index = 0; index < count; index += 1) {
      packets.push(createTransportPacket({
        kind: TRANSPORT_PACKET_KINDS.REQUEST,
        eventType: "SPECTATOR_SYNC",
        channel: "spectator",
        sourceId: participantId,
        targetId: typeof options.targetId === "string" ? options.targetId : null,
        sequence: packetSequence + index,
        serverTs: now + index,
        requestId: `reconnect-${participantId}-${index}`,
        payload: { reconnect: true, stormIndex: index, scenario }
      }))
    }
    packets.forEach((packet) => schedule(packet, { reconnectStorm: true }))
    return freezeDeep({ packets, count: packets.length, scenario })
  }

  function getSnapshot() {
    return freezeDeep({
      scenario,
      latencyMs,
      jitterMs,
      packetLossRate,
      reorderRate,
      queue,
      delivered,
      dropped,
      now,
      simulationHash: stableHash({ scenario, queue, delivered, dropped, now })
    })
  }

  function reset() {
    queue = []
    delivered = []
    dropped = []
    now = 0
    packetSequence = 0
  }

  return Object.freeze({
    send,
    advance,
    flush,
    simulateReconnectStorm,
    getSnapshot,
    reset
  })
}

export default { createNetworkSimulationEngine, NETWORK_SCENARIOS }