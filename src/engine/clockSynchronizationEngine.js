import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const boundedPush = (list, value, limit) => {
  const next = [...list, value]
  return next.length <= limit ? next : next.slice(next.length - limit)
}

export function createClockSynchronizationEngine(options = {}) {
  const maxSamples = Math.max(4, Number(options.maxSamples) || 64)
  const smoothing = Math.min(1, Math.max(0, Number(options.smoothing) || 0.35))
  const driftToleranceMs = Math.max(0, Number(options.driftToleranceMs) || 24)

  let samples = []
  let lastEstimate = freezeDeep({ offsetMs: 0, latencyMs: 0, rttMs: 0, driftMs: 0, sampleCount: 0 })

  function observe(sample = {}) {
    const serverTs = Math.max(0, Number(sample.serverTs) || 0)
    const clientTs = Math.max(0, Number(sample.clientTs) || 0)
    const rttMs = Math.max(0, Number(sample.rttMs) || 0)
    const oneWay = rttMs / 2
    const offsetMs = Number((serverTs - (clientTs + oneWay)).toFixed(3))
    const latencyMs = Number(oneWay.toFixed(3))
    const driftMs = samples.length > 0 ? Number((offsetMs - (samples.at(-1)?.offsetMs || 0)).toFixed(3)) : 0
    const adjustedDrift = Math.abs(driftMs) <= driftToleranceMs ? 0 : driftMs
    const record = freezeDeep({ serverTs, clientTs, rttMs, offsetMs, latencyMs, driftMs: adjustedDrift })
    samples = boundedPush(samples, record, maxSamples)

    const averageOffset = samples.reduce((sum, entry) => sum + entry.offsetMs, 0) / samples.length
    const averageLatency = samples.reduce((sum, entry) => sum + entry.latencyMs, 0) / samples.length
    const averageRtt = samples.reduce((sum, entry) => sum + entry.rttMs, 0) / samples.length
    const smoothedOffset = Number(((lastEstimate.offsetMs || 0) * (1 - smoothing) + averageOffset * smoothing).toFixed(3))
    lastEstimate = freezeDeep({
      offsetMs: smoothedOffset,
      latencyMs: Number(averageLatency.toFixed(3)),
      rttMs: Number(averageRtt.toFixed(3)),
      driftMs: adjustedDrift,
      sampleCount: samples.length
    })
    return lastEstimate
  }

  function estimate() {
    return lastEstimate
  }

  function correctCountdown(countdown = {}, nowClientTs = 0) {
    const estimateState = estimate()
    const remainingMs = Math.max(0, Number(countdown.remainingMs) || 0)
    const correctedRemaining = Math.max(0, Number((remainingMs - estimateState.offsetMs).toFixed(3)))
    return freezeDeep({
      ...countdown,
      remainingMs: correctedRemaining,
      correctedAtClientTs: Math.max(0, Number(nowClientTs) || 0),
      driftMs: estimateState.driftMs,
      latencyMs: estimateState.latencyMs,
      clockHash: stableHash({ countdown, nowClientTs, estimateState })
    })
  }

  function synchronizeCountdown(countdown = {}, observation = {}) {
    observe(observation)
    return correctCountdown(countdown, observation.clientTs || 0)
  }

  function getSnapshot() {
    return freezeDeep({
      samples,
      estimate: lastEstimate,
      sampleCount: samples.length,
      clockHash: stableHash({ samples, estimate: lastEstimate })
    })
  }

  function reset() {
    samples = []
    lastEstimate = freezeDeep({ offsetMs: 0, latencyMs: 0, rttMs: 0, driftMs: 0, sampleCount: 0 })
  }

  return Object.freeze({
    observe,
    estimate,
    correctCountdown,
    synchronizeCountdown,
    getSnapshot,
    reset
  })
}

export default { createClockSynchronizationEngine }