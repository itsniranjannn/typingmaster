import { stableHash } from "./replayConsumerValidation"
import { createReplayRenderingRuntime } from "./replayRenderingRuntime"
import { createDeterministicSpectatorSimulation } from "./spectatorSimulationLayer"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const classifyCorruption = (report) => {
  if (!report.match) return "hash-mismatch"
  if (!report.viewportParity) return "viewport-mismatch"
  if (!report.commandOrderingParity) return "command-order-mismatch"
  if (!report.frameSnapshotParity) return "snapshot-mismatch"
  return "healthy"
}

export function createReplayRenderIntegrity(replay, options = {}) {
  const renderingRuntime = options.renderingRuntime || createReplayRenderingRuntime(replay, options)
  const spectatorSimulation = options.spectatorSimulation || createDeterministicSpectatorSimulation(replay, options)
  const frame = renderingRuntime.getFrame(options.viewport || {})
  const baselineFrame = options.baselineFrame || frame
  const currentHash = stableHash(frame)
  const baselineHash = stableHash(baselineFrame)
  const viewportHash = stableHash(frame.viewport)
  const baselineViewportHash = stableHash(baselineFrame.viewport)
  const commandOrderingParity = stableHash(frame.renderTree.renderCommands.map((command) => command.id)) === stableHash((baselineFrame.renderTree.renderCommands || []).map((command) => command.id))
  const frameSnapshotParity = stableHash(frame.renderTree) === stableHash(baselineFrame.renderTree)
  const report = {
    currentHash,
    baselineHash,
    match: currentHash === baselineHash,
    viewportParity: viewportHash === baselineViewportHash,
    commandOrderingParity,
    frameSnapshotParity,
    corruptionClassification: null
  }
  report.corruptionClassification = classifyCorruption(report)
  const mismatchSummaries = report.match ? [] : [{ kind: "render-hash", severity: 5, reason: "frame-hash-mismatch" }]
  const checkpoints = freezeDeep([{
    frameHash: currentHash,
    viewportHash,
    renderHash: stableHash(frame.renderTree),
    commandCount: frame.renderTree.renderCommands.length
  }])

  return freezeDeep({
    deterministicFrameHashes: { currentHash, baselineHash },
    replayRenderParityVerification: freezeDeep(report),
    renderSnapshotValidation: freezeDeep({ valid: report.match && report.viewportParity && report.commandOrderingParity, reason: report.corruptionClassification }),
    viewportReconstructionParity: freezeDeep({ match: report.viewportParity, viewportHash, baselineViewportHash }),
    renderCorruptionDetection: freezeDeep({ corrupted: report.corruptionClassification !== "healthy", classification: report.corruptionClassification }),
    replayFrameMismatchSummaries: freezeDeep(mismatchSummaries),
    deterministicRenderAuditLogs: freezeDeep([{ hash: currentHash, classification: report.corruptionClassification, viewportHash }]),
    renderStateVerificationCheckpoints: checkpoints,
    synchronizedSpectatorVerification: freezeDeep({
      replayHash: spectatorSimulation.getReplayHash(),
      confidence: spectatorSimulation.getAudit().confidence,
      desyncCount: spectatorSimulation.getAudit().desyncCount
    }),
    boundedRepairSuggestions: freezeDeep(mismatchSummaries.length > 0 ? [{ action: "rebuild-render-tree", bounded: true, confidence: 0.65 }] : []),
    exportSafeIntegrityReport: freezeDeep({
      currentHash,
      baselineHash,
      classification: report.corruptionClassification,
      checkpointCount: checkpoints.length,
      mismatchCount: mismatchSummaries.length
    })
  })
}

export default { createReplayRenderIntegrity }