import { stableHash } from "./replayConsumerValidation"
import { validateTransportPacket } from "./transportContracts"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const normalizeTargets = (targets = []) => Array.isArray(targets) ? [...new Set(targets.filter((target) => typeof target === "string"))].sort() : []

export function createTransportMessageRouter(options = {}) {
  const supportedVersion = Math.max(1, Number(options.supportedVersion) || 1)
  const maxRoutes = Math.max(1, Number(options.maxRoutes) || 256)
  const maxDrops = Math.max(1, Number(options.maxDrops) || 64)
  const adapters = new Map()
  let routeLog = []
  let dropLog = []

  function recordRoute(entry) {
    routeLog = [...routeLog, freezeDeep(entry)]
    if (routeLog.length > maxRoutes) routeLog = routeLog.slice(routeLog.length - maxRoutes)
  }

  function recordDrop(entry) {
    dropLog = [...dropLog, freezeDeep(entry)]
    if (dropLog.length > maxDrops) dropLog = dropLog.slice(dropLog.length - maxDrops)
  }

  function register(adapter) {
    if (!adapter || typeof adapter.nodeId !== "string") return freezeDeep({ registered: false, reason: "invalid_adapter" })
    adapters.set(adapter.nodeId, adapter)
    if (typeof adapter.bindRouter === "function") adapter.bindRouter(api)
    recordRoute({ action: "register", nodeId: adapter.nodeId })
    return freezeDeep({ registered: true, nodeId: adapter.nodeId, count: adapters.size })
  }

  function unregister(nodeId) {
    adapters.delete(nodeId)
    recordRoute({ action: "unregister", nodeId })
    return freezeDeep({ unregistered: true, nodeId, count: adapters.size })
  }

  function resolveRecipients(sourceId, targetIds = []) {
    const explicit = normalizeTargets(targetIds)
    if (explicit.length > 0) return explicit.filter((nodeId) => adapters.has(nodeId) && nodeId !== sourceId)
    return [...adapters.keys()].filter((nodeId) => nodeId !== sourceId).sort()
  }

  function route(packet, sourceId, targetIds = []) {
    const validation = validateTransportPacket(packet, { supportedVersion })
    if (!validation.valid) {
      recordDrop({ packetId: packet?.packetId || null, reason: validation.reasons[0] || "invalid_packet", sourceId })
      return freezeDeep({ delivered: [], dropped: true, reason: validation.reasons[0] || "invalid_packet" })
    }
    const recipients = resolveRecipients(sourceId, targetIds)
    const delivered = recipients.map((nodeId) => {
      const adapter = adapters.get(nodeId)
      if (!adapter) {
        recordDrop({ packetId: packet.packetId, reason: "missing_target", targetId: nodeId })
        return freezeDeep({ nodeId, delivered: false, reason: "missing_target" })
      }
      const receipt = typeof adapter.receiveFromRouter === "function" ? adapter.receiveFromRouter(packet) : adapter.receive(packet)
      return freezeDeep({ nodeId, delivered: Boolean(receipt?.received ?? receipt?.received !== false), receipt })
    })
    const ordered = delivered.slice().sort((left, right) => left.nodeId.localeCompare(right.nodeId))
    recordRoute({ action: "route", packetId: packet.packetId, sourceId, recipients: ordered.map((entry) => entry.nodeId), hash: stableHash({ packetId: packet.packetId, sourceId, recipients: ordered.map((entry) => entry.nodeId) }) })
    return freezeDeep({ delivered: ordered, deliveredCount: ordered.filter((entry) => entry.delivered).length, dropped: false })
  }

  function broadcast(packet, sourceId) {
    return route(packet, sourceId)
  }

  function request(packet, sourceId, targetId) {
    return route(packet, sourceId, [targetId])
  }

  function response(packet, sourceId, targetId) {
    return route(packet, sourceId, [targetId])
  }

  function ack(packet, sourceId, targetId) {
    return route(packet, sourceId, [targetId])
  }

  function getSnapshot() {
    return freezeDeep({
      nodeIds: [...adapters.keys()].sort(),
      routeLog,
      dropLog,
      routeCount: routeLog.length,
      dropCount: dropLog.length,
      routerHash: stableHash({ nodeIds: [...adapters.keys()].sort(), routeLog, dropLog })
    })
  }

  const api = Object.freeze({
    register,
    unregister,
    route,
    broadcast,
    request,
    response,
    ack,
    getSnapshot
  })

  return api
}

export default { createTransportMessageRouter }