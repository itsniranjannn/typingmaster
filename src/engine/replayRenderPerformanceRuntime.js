import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const average = (values) => (Array.isArray(values) && values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

export function createReplayRenderPerformanceRuntime(renderRuntime, options = {}) {
  const samples = []
  let droppedFrameEstimate = 0
  let invalidationCount = 0
  let offscreenTiming = []

  function observeFrame(frame, metrics = {}) {
    const sample = freezeDeep({
      renderHash: frame?.frameFingerprint || null,
      commandCount: Array.isArray(frame?.renderTree?.renderCommands) ? frame.renderTree.renderCommands.length : 0,
      batchCount: Array.isArray(frame?.renderTree?.renderBatches) ? frame.renderTree.renderBatches.length : 0,
      density: Number(frame?.renderTree?.densitySummary?.density || 0),
      interpolationCostMs: Number(metrics.interpolationCostMs || 0),
      invalidations: Number(metrics.invalidations || 0),
      queueDepth: Number(metrics.queueDepth || 0),
      offscreenRenderMs: Number(metrics.offscreenRenderMs || 0),
      schedulerRenderMs: Number(metrics.schedulerRenderMs || 0)
    })
    samples.push(sample)
    invalidationCount += sample.invalidations
    offscreenTiming.push(sample.offscreenRenderMs)
    droppedFrameEstimate += sample.schedulerRenderMs > Number(options.frameBudgetMs || 8) ? 1 : 0
    return sample
  }

  function recordRender(viewport = {}) {
    const startedAt = performance.now()
    const rendered = renderRuntime.renderFrame(viewport)
    const endedAt = performance.now()
    const sample = observeFrame(rendered, {
      interpolationCostMs: rendered.interpolatedFrame ? 0.5 : 0,
      invalidations: rendered.invalidated ? 1 : 0,
      queueDepth: renderRuntime.getSchedulerMetrics().queueLength,
      offscreenRenderMs: Number((endedAt - startedAt).toFixed(3)),
      schedulerRenderMs: Number((renderRuntime.getSchedulerMetrics().lastPlan?.schedule?.consumedMs || 0).toFixed(3))
    })
    return freezeDeep({ rendered, sample })
  }

  function getMetrics() {
    return freezeDeep({
      sampleCount: samples.length,
      frameReconstructionMetrics: freezeDeep({
        averageRenderHash: stableHash(samples.map((sample) => sample.renderHash)),
        averageCommandCount: Number(average(samples.map((sample) => sample.commandCount)).toFixed(3)),
        averageBatchCount: Number(average(samples.map((sample) => sample.batchCount)).toFixed(3))
      }),
      renderQueueInstrumentation: freezeDeep({
        averageQueueDepth: Number(average(samples.map((sample) => sample.queueDepth)).toFixed(3)),
        maxQueueDepth: samples.reduce((max, sample) => Math.max(max, sample.queueDepth), 0)
      }),
      viewportDensityMetrics: freezeDeep({
        averageDensity: Number(average(samples.map((sample) => sample.density)).toFixed(6)),
        densitySamples: samples.map((sample) => sample.density)
      }),
      interpolationCostSummaries: freezeDeep({
        averageInterpolationCostMs: Number(average(samples.map((sample) => sample.interpolationCostMs)).toFixed(3)),
        maxInterpolationCostMs: samples.reduce((max, sample) => Math.max(max, sample.interpolationCostMs), 0)
      }),
      renderInvalidationCounts: invalidationCount,
      replayFrameCacheMetrics: renderRuntime.getCacheMetrics(),
      droppedFrameEstimation: droppedFrameEstimate,
      adaptiveDegradationTelemetry: freezeDeep({
        totalSamples: samples.length,
        degradedSamples: samples.filter((sample) => sample.schedulerRenderMs > Number(options.frameBudgetMs || 8)).length
      }),
      offscreenRenderTiming: freezeDeep({
        averageOffscreenRenderMs: Number(average(offscreenTiming).toFixed(3)),
        samples: offscreenTiming.slice()
      }),
      schedulerRenderCoordinationSummaries: freezeDeep(samples.map((sample, index) => ({ index, queueDepth: sample.queueDepth, schedulerRenderMs: sample.schedulerRenderMs })))
    })
  }

  function reset() {
    samples.length = 0
    offscreenTiming = []
    invalidationCount = 0
    droppedFrameEstimate = 0
  }

  return Object.freeze({
    recordRender,
    observeFrame,
    getMetrics,
    reset
  })
}

export default { createReplayRenderPerformanceRuntime }