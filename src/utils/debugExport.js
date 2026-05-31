import { exportReplaySession } from "../engine/replayEngine";
import { exportTelemetrySession } from "../engine/telemetryEngine";
import { summarizePerformanceSignals, getPauseDistribution, getCorrectionFrequency, estimateBurstSpeed, scoreConsistency, getWeakKeyAggregation, analyzeReplayDensity } from "./sessionAnalysis";
import { createReplayConsumer } from "../engine/replayConsumer";
import { computeGhostProjection } from "../engine/ghostProjectionEngine";
import { createReplayRenderOrchestrator } from "../engine/replayRenderOrchestrator";
import { createReplayVisualizationCore } from "../engine/replayVisualizationCore";
import { createReplayVisualizationScheduler } from "../engine/replayVisualizationScheduler";
import { createDeterministicSpectatorSimulation, createRemoteSpectatorPacket } from "../engine/spectatorSimulationLayer";
import { createMultiplayerSimulationContracts } from "../engine/multiplayerSimulationContracts";
import { createReplayIntegrityTooling } from "../engine/replayIntegrityTooling";
import { summarizePlayerBehaviorHistory } from "../analysis/playerBehaviorAnalysis";
import { summarizeProgressionIntelligence } from "../analysis/progressionIntelligence";
import { analyzeChallengeBalancing } from "../analysis/challengeBalancing";
import { summarizeRankedProgression } from "../engagement/rankedProgression";
import { summarizeProgressionCarryover, summarizeSeasonMilestones, recommendRewardPacing, getSeasonWindow, groupSeasonChallenges } from "../engagement/seasonSystem";
import { summarizeRetentionAnalysis } from "../engagement/retentionAnalysis";
import { analyzeMasteryTracking } from "../engagement/masteryTracking";

export const DEBUG_EXPORT_SCHEMA_VERSION = 3;

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const sortDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((accumulator, key) => {
      accumulator[key] = sortDeep(value[key]);
      return accumulator;
    }, {});
};

const nowIso = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
};

const safeSliceArray = (value, maxLength) => {
  if (!Array.isArray(value)) return [];
  const limit = Math.max(0, Number(maxLength) || 0);
  return value.slice(0, limit);
};

const safeObject = (value) => (isPlainObject(value) ? value : {});

const buildReplayVisualizationSummary = (replaySession, options = {}) => {
  if (!replaySession) return null;
  const core = createReplayVisualizationCore(replaySession, { viewport: options.viewport || { start: 0, end: options.viewportEnd || Number.MAX_SAFE_INTEGER } });
  const scheduler = createReplayVisualizationScheduler(replaySession, { viewport: options.viewport || { start: 0, end: options.viewportEnd || Number.MAX_SAFE_INTEGER }, frameBudgetMs: options.frameBudgetMs || 8, core });
  const scheduled = scheduler.queueViewport(options.viewport || { start: 0, end: options.viewportEnd || Number.MAX_SAFE_INTEGER }, 0);
  return {
    core: core.getSnapshot(),
    scheduler: scheduler.getMetrics(),
    scheduled: scheduled ? {
      viewport: scheduled.viewport,
      adaptiveDensityScale: scheduled.adaptiveDensityScale,
      frameSkippingPolicy: scheduled.frameSkippingPolicy,
      interpolationThrottle: scheduled.interpolationThrottle,
      deterministicRenderOrder: scheduled.deterministicRenderOrder
    } : null
  };
};

const buildSpectatorSimulationSummary = (replaySession, options = {}) => {
  if (!replaySession) return null;
  const simulation = createDeterministicSpectatorSimulation(replaySession, { viewport: options.viewport || {}, syncWindowMs: options.syncWindowMs, boundedWindow: options.boundedWindow });
  const packet = createRemoteSpectatorPacket({
    sequence: 0,
    replayHash: simulation.getReplayHash(),
    viewport: options.viewport || {},
    latencyMs: options.latencyMs || 0
  });
  const projection = simulation.ingestPacket(packet);
  return {
    projection,
    audit: simulation.getAudit(),
    checkpoints: simulation.getCheckpoints(),
    replayHash: simulation.getReplayHash()
  };
};

const buildReplayIntegritySummary = (replaySession, options = {}) => {
  if (!replaySession) return null;
  return createReplayIntegrityTooling(replaySession, {
    expectedReplayHash: options.expectedReplayHash,
    spectatorSimulation: options.spectatorSimulation || null,
    viewport: options.viewport || {}
  });
};

const buildSynchronizationAudit = (replaySession, options = {}) => {
  const summary = buildSpectatorSimulationSummary(replaySession, options);
  return summary ? {
    replayHash: summary.replayHash,
    audit: summary.audit,
    checkpoints: summary.checkpoints
  } : null;
};

const buildVisualizationSchedulerMetrics = (replaySession, options = {}) => {
  const summary = buildReplayVisualizationSummary(replaySession, options);
  return summary?.scheduler || null;
};

const buildMergeValidationSummary = (payload, options = {}) => {
  const replays = Array.isArray(options.replays) ? options.replays : Array.isArray(payload?.replays) ? payload.replays : [];
  return replays.length > 0 ? createMultiplayerSimulationContracts(replays, options) : null;
};

const buildDesyncClassificationSummary = (replaySession, options = {}) => {
  const summary = buildSpectatorSimulationSummary(replaySession, options);
  if (!summary) return null;
  const packet = createRemoteSpectatorPacket({ sequence: 1, replayHash: options.expectedReplayHash || "", viewport: options.viewport || {} });
  const simulation = createDeterministicSpectatorSimulation(replaySession, { viewport: options.viewport || {} });
  return simulation.classifyDesync(packet);
};

const normalizeReplaySession = (replaySession) => {
  if (!replaySession || typeof replaySession !== "object") {
    return null;
  }

  return {
    id: typeof replaySession.id === "string" ? replaySession.id : null,
    meta: safeObject(replaySession.meta),
    events: Array.isArray(replaySession.events) ? replaySession.events : [],
    flushedBatches: Array.isArray(replaySession.flushedBatches) ? replaySession.flushedBatches : [],
    metrics: safeObject(replaySession.metrics),
    config: safeObject(replaySession.config)
  };
};

const normalizeTelemetrySession = (telemetrySession) => {
  if (!telemetrySession || typeof telemetrySession !== "object") {
    return null;
  }

  return {
    enabled: Boolean(telemetrySession.enabled),
    startedAt: hasOwn(telemetrySession, "startedAt") ? telemetrySession.startedAt : null,
    endedAt: hasOwn(telemetrySession, "endedAt") ? telemetrySession.endedAt : null,
    inputLatencySum: Number(telemetrySession.inputLatencySum) || 0,
    inputLatencyCount: Number(telemetrySession.inputLatencyCount) || 0,
    inputLatencyMax: Number(telemetrySession.inputLatencyMax) || 0,
    commitCount: Number(telemetrySession.commitCount) || 0,
    renderMarkerCount: Number(telemetrySession.renderMarkerCount) || 0,
    frameDropCount: Number(telemetrySession.frameDropCount) || 0,
    heapSnapshotCount: Number(telemetrySession.heapSnapshotCount) || 0,
    replayBufferMax: Number(telemetrySession.replayBufferMax) || 0,
    peakHeapSize: Number(telemetrySession.peakHeapSize) || 0,
    samples: Array.isArray(telemetrySession.samples) ? telemetrySession.samples : []
  };
};

const normalizeHistoryRecords = (history) => {
  if (!Array.isArray(history)) return [];
  return history.filter((entry) => entry && typeof entry === "object");
};

const buildAnalysisBundle = ({ history = [], challenge = null, replayExport = null, telemetryExport = null, exportedAt = null } = {}) => {
  const normalizedHistory = normalizeHistoryRecords(history);
  const behavior = normalizedHistory.length > 0 ? summarizePlayerBehaviorHistory(normalizedHistory) : null;
  const progression = normalizedHistory.length > 0 ? summarizeProgressionIntelligence(normalizedHistory, challenge) : null;
  const challengeBalance = challenge ? analyzeChallengeBalancing(challenge, {
    history: normalizedHistory,
    behavior,
    replay: replayExport,
    telemetry: telemetryExport,
    wpm: behavior?.improvement?.averageWpm || 0,
    accuracy: behavior?.improvement?.averageAccuracy || 0,
    durationSeconds: telemetryExport?.durationMs ? telemetryExport.durationMs / 1000 : 0,
    timeUsed: telemetryExport?.durationMs ? telemetryExport.durationMs / 1000 : 0
  }) : progression?.challengeBalance || null;
  const seasonReference = exportedAt ?? normalizedHistory.at(-1)?.exportedAt ?? 0;
  const seasonalWindow = getSeasonWindow(seasonReference, 28, 0);
  const seasonChallenges = normalizedHistory.map((entry) => entry?.challenge || entry?.result?.challenge || null).filter(Boolean);
  const engagement = normalizedHistory.length > 0 || challenge
    ? {
        ranked: normalizedHistory.length > 0 ? summarizeRankedProgression(normalizedHistory) : null,
        seasonal: normalizedHistory.length > 0
          ? {
              window: seasonalWindow,
              milestones: summarizeSeasonMilestones(normalizedHistory),
              carryover: summarizeProgressionCarryover(normalizedHistory, null, null),
              rewardPacing: recommendRewardPacing(normalizedHistory),
              challengeGroups: groupSeasonChallenges(seasonChallenges)
            }
          : null,
        retention: normalizedHistory.length > 0 ? summarizeRetentionAnalysis(normalizedHistory) : null,
        mastery: normalizedHistory.length > 0 ? analyzeMasteryTracking(normalizedHistory) : null,
        progressionMomentum: normalizedHistory.length > 0 ? summarizeRankedProgression(normalizedHistory).momentum : null
      }
    : null;

  const analysis = {};
  if (behavior) analysis.behavior = sortDeep(behavior);
  if (progression) analysis.progression = sortDeep(progression);
  if (challengeBalance) analysis.challengeBalance = sortDeep(challengeBalance);
  if (telemetryExport) analysis.performance = sortDeep(summarizePerformanceSignals({ replay: replayExport, telemetry: telemetryExport }));
  if (engagement) analysis.engagement = sortDeep(engagement);
  return Object.keys(analysis).length > 0 ? analysis : null;
};

export const isDebugExportEnabled = () => {
  try {
    return Boolean(import.meta?.env?.DEV) || String(import.meta?.env?.VITE_DEBUG_EXPORTS ?? "").toLowerCase() === "true";
  } catch (error) {
    return false;
  }
};

export const createDebugExportMetadata = ({ exportedAt = null, label = null, source = "gotype", notes = null } = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  exportedAt,
  exportedAtIso: nowIso(exportedAt),
  source,
  label,
  notes
});

export const exportReplayBundle = (replaySession, options = {}) => {
  const normalizedReplay = normalizeReplaySession(replaySession);
  const exportedReplay = normalizedReplay
    ? (() => {
        try {
          return exportReplaySession(normalizedReplay);
        } catch (error) {
          return {
            id: normalizedReplay.id,
            meta: normalizedReplay.meta,
            config: { maxEvents: normalizedReplay.config.maxEvents || 0 },
            events: safeSliceArray(normalizedReplay.events, normalizedReplay.config.maxEvents || normalizedReplay.events.length),
            flushedBatches: safeSliceArray(normalizedReplay.flushedBatches, normalizedReplay.flushedBatches.length),
            metrics: { ...normalizedReplay.metrics }
          };
        }
      })()
    : {
        id: null,
        meta: {},
        config: { maxEvents: 0 },
        events: [],
        flushedBatches: [],
        metrics: {
          eventCount: 0,
          keyCount: 0,
          correctionCount: 0,
          pauseCount: 0,
          renderMarkerCount: 0,
          durationMs: 0,
          startTs: null,
          endTs: null
        }
      };
  return {
    ...exportedReplay,
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    exportedAt: options.exportedAt ?? null,
    exportedAtIso: nowIso(options.exportedAt ?? null),
    metadata: sortDeep(safeObject(options.metadata)),
    replay: {
      pauseDistribution: getPauseDistribution(exportedReplay),
      correctionFrequency: getCorrectionFrequency(exportedReplay),
      burstSpeed: estimateBurstSpeed(exportedReplay),
      consistency: scoreConsistency(exportedReplay),
      weakKeys: getWeakKeyAggregation(exportedReplay),
      density: analyzeReplayDensity(exportedReplay)
    }
  };
};

export const exportTelemetryBundle = (telemetrySession, options = {}) => {
  const normalizedTelemetry = normalizeTelemetrySession(telemetrySession);
  const exportedTelemetry = normalizedTelemetry
    ? (() => {
        try {
          return exportTelemetrySession(normalizedTelemetry);
        } catch (error) {
          return {
            enabled: normalizedTelemetry.enabled,
            startedAt: normalizedTelemetry.startedAt,
            endedAt: normalizedTelemetry.endedAt,
            durationMs: normalizedTelemetry.startedAt !== null && normalizedTelemetry.endedAt !== null ? Math.max(0, normalizedTelemetry.endedAt - normalizedTelemetry.startedAt) : 0,
            averageInputLatencyMs: normalizedTelemetry.inputLatencyCount > 0 ? normalizedTelemetry.inputLatencySum / normalizedTelemetry.inputLatencyCount : 0,
            inputLatencyMax: normalizedTelemetry.inputLatencyMax,
            commitCount: normalizedTelemetry.commitCount,
            renderMarkerCount: normalizedTelemetry.renderMarkerCount,
            frameDropCount: normalizedTelemetry.frameDropCount,
            heapSnapshotCount: normalizedTelemetry.heapSnapshotCount,
            replayBufferMax: normalizedTelemetry.replayBufferMax,
            peakHeapSize: normalizedTelemetry.peakHeapSize,
            samples: safeSliceArray(normalizedTelemetry.samples, normalizedTelemetry.samples.length)
          };
        }
      })()
    : null;
  return exportedTelemetry
    ? {
        ...exportedTelemetry,
        schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
        exportedAt: options.exportedAt ?? null,
        exportedAtIso: nowIso(options.exportedAt ?? null),
        metadata: sortDeep(safeObject(options.metadata)),
        replayBufferUsage: exportedTelemetry.replayBufferMax,
        performance: summarizePerformanceSignals({ replay: options.replayExport, telemetry: exportedTelemetry })
      }
    : {
        schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
        exportedAt: options.exportedAt ?? null,
        exportedAtIso: nowIso(options.exportedAt ?? null),
        metadata: sortDeep(safeObject(options.metadata)),
        enabled: false,
        samples: [],
        performance: summarizePerformanceSignals({ replay: options.replayExport, telemetry: null })
      };
};

export const exportTypingSession = (result, replaySession, metadata = {}, telemetrySession = null, options = {}) => {
  const replayExport = exportReplayBundle(replaySession, {
    exportedAt: options.exportedAt ?? null,
    metadata
  });
  const telemetryExport = exportTelemetryBundle(telemetrySession, {
    exportedAt: options.exportedAt ?? null,
    metadata,
    replayExport
  });

  // optional: attach deterministic consumer/ghost summaries if requested
  const includeConsumer = Boolean(options.includeReplayConsumerSummaries)
  const consumerSummary = includeConsumer && replaySession ? (()=>{ try { const c = createReplayConsumer(replaySession); return { verification: c.getVerification(), checkpoints: c.getCheckpoints() } } catch(e){ return null } })() : null
  const ghostSummary = includeConsumer && replaySession ? (()=>{ try { return computeGhostProjection(replaySession) } catch(e){ return null } })() : null
  const replayExecution = options.replayExecutionProfile ? sortDeep(safeObject(options.replayExecutionProfile)) : null
  const replayRender = options.replayRenderProfile ? sortDeep(safeObject(options.replayRenderProfile)) : null
  const replaySync = options.replaySyncContract ? sortDeep(safeObject(options.replaySyncContract)) : null
  const replayVisualizationSummary = options.includeReplayVisualizationSummary ? buildReplayVisualizationSummary(replaySession, options) : null
  const spectatorSimulationSummary = options.includeSpectatorSimulationSummary ? buildSpectatorSimulationSummary(replaySession, options) : null
  const replayIntegritySummary = options.includeReplayIntegritySummary ? buildReplayIntegritySummary(replaySession, options) : null
  const synchronizationAudit = options.includeSynchronizationAudit ? buildSynchronizationAudit(replaySession, options) : null
  const visualizationSchedulerMetrics = options.includeVisualizationSchedulerMetrics ? buildVisualizationSchedulerMetrics(replaySession, options) : null
  const mergeValidationSummary = options.includeMergeValidationSummary ? buildMergeValidationSummary({ replay: replaySession, replays: options.replays }, options) : null
  const desyncClassificationSummary = options.includeDesyncClassificationSummary ? buildDesyncClassificationSummary(replaySession, options) : null

  return {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    exportedAt: options.exportedAt ?? null,
    exportedAtIso: nowIso(options.exportedAt ?? null),
    metadata: sortDeep(safeObject(metadata)),
    result: result ? sortDeep(result) : null,
    replay: replayExport,
    telemetry: telemetryExport,
    analysis: buildAnalysisBundle({
      history: Array.isArray(options.history) ? options.history : [
        {
          result,
          replay: replayExport,
          telemetry: telemetryExport,
          exportedAt: options.exportedAt ?? null
        }
      ],
      challenge: options.challenge || result?.challenge || null,
      replayExport,
      telemetryExport,
      exportedAt: options.exportedAt ?? null
    }),
    arena: {
      validation: options.arenaValidation ? sortDeep(options.arenaValidation) : null,
      metadata: sortDeep(safeObject(options.arenaMetadata))
    }
    ,
    replayConsumer: consumerSummary ?? null,
    ghost: ghostSummary ?? null,
    replayExecution,
    replayRender,
    replaySync,
    replayVisualizationSummary,
    spectatorSimulationSummary,
    replayIntegritySummary,
    synchronizationAudit,
    visualizationSchedulerMetrics,
    mergeValidationSummary,
    desyncClassificationSummary
  };
};

export const exportDebugBundle = (payload, options = {}) => {
  const replay = payload?.replay ? exportReplayBundle(payload.replay, options) : null;
  const telemetry = payload?.telemetry ? exportTelemetryBundle(payload.telemetry, options) : null;
  const includeConsumer = Boolean(options.includeReplayConsumerSummaries)
  const consumerSummary = includeConsumer && payload?.replay ? (() => { try { const c = createReplayConsumer(payload.replay); return { verification: c.getVerification(), checkpoints: c.getCheckpoints() } } catch(e){ return null } })() : null
  const ghostSummary = includeConsumer && payload?.replay ? (() => { try { return computeGhostProjection(payload.replay) } catch(e){ return null } })() : null
  const replayRender = options.replayRenderProfile ? sortDeep(safeObject(options.replayRenderProfile)) : null
  const replaySync = options.replaySyncContract ? sortDeep(safeObject(options.replaySyncContract)) : null
  const replayVisualizationSummary = options.includeReplayVisualizationSummary ? buildReplayVisualizationSummary(payload?.replay, options) : null
  const spectatorSimulationSummary = options.includeSpectatorSimulationSummary ? buildSpectatorSimulationSummary(payload?.replay, options) : null
  const replayIntegritySummary = options.includeReplayIntegritySummary ? buildReplayIntegritySummary(payload?.replay, options) : null
  const synchronizationAudit = options.includeSynchronizationAudit ? buildSynchronizationAudit(payload?.replay, options) : null
  const visualizationSchedulerMetrics = options.includeVisualizationSchedulerMetrics ? buildVisualizationSchedulerMetrics(payload?.replay, options) : null
  const mergeValidationSummary = options.includeMergeValidationSummary ? buildMergeValidationSummary(payload, options) : null
  const desyncClassificationSummary = options.includeDesyncClassificationSummary ? buildDesyncClassificationSummary(payload?.replay, options) : null
  const bundle = {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    exportedAt: options.exportedAt ?? null,
    exportedAtIso: nowIso(options.exportedAt ?? null),
    metadata: sortDeep(safeObject(options.metadata)),
    replay,
    telemetry,
    result: payload?.result ? sortDeep(payload.result) : null,
    arena: payload?.arena ? sortDeep(payload.arena) : null,
    analysis: buildAnalysisBundle({
      history: Array.isArray(options.history) ? options.history : payload?.history || (payload?.result || payload?.replay || payload?.telemetry ? [payload] : []),
      challenge: options.challenge || payload?.challenge || payload?.arena?.challenge || payload?.result?.challenge || null,
      replayExport: replay,
      telemetryExport: telemetry,
      exportedAt: options.exportedAt ?? null
    }),
    replayConsumer: consumerSummary,
    ghost: ghostSummary,
    replayExecution: options.replayExecutionProfile ? sortDeep(safeObject(options.replayExecutionProfile)) : null,
    replayRender,
    replaySync,
    replayVisualizationSummary,
    spectatorSimulationSummary,
    replayIntegritySummary,
    synchronizationAudit,
    visualizationSchedulerMetrics,
    mergeValidationSummary,
    desyncClassificationSummary
  };

  return bundle;
};

export const serializeDebugBundle = (bundle, options = {}) => {
  const maxLength = Number.isFinite(Number(options.maxReplayEvents)) ? Number(options.maxReplayEvents) : 0;
  const normalizedBundle = sortDeep(bundle);

  try {
    if (maxLength > 0 && hasOwn(normalizedBundle, "replay") && Array.isArray(normalizedBundle.replay?.events)) {
      normalizedBundle.replay.events = safeSliceArray(normalizedBundle.replay.events, maxLength);
    }
    return JSON.stringify(normalizedBundle);
  } catch (error) {
    return JSON.stringify({
      schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
      exportedAt: options.exportedAt ?? null,
      exportedAtIso: nowIso(options.exportedAt ?? null),
      metadata: sortDeep(safeObject(options.metadata)),
      error: "serialize_failed"
    });
  }
};

export const serializeTypingSession = (result, replaySession, metadata = {}, telemetrySession = null, options = {}) =>
  serializeDebugBundle(exportTypingSession(result, replaySession, metadata, telemetrySession, options), options);

const guardDebug = (fn) => (...args) => {
  if (!isDebugExportEnabled()) return null;
  return fn(...args);
};

export const printReplaySummary = guardDebug((replaySession, metadata = {}) => {
  const replay = exportReplayBundle(replaySession, { metadata });
  const summary = {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    type: "replay-summary",
    exportedAt: null,
    metrics: replay.metrics,
    replay: replay.replay,
    metadata: replay.metadata
  };
  console.info("[GoType] Replay Summary", summary);
  return summary;
});

export const printTelemetrySummary = guardDebug((telemetrySession, replaySession = null, metadata = {}) => {
  const replayExport = replaySession ? exportReplayBundle(replaySession, { metadata }) : null;
  const telemetry = exportTelemetryBundle(telemetrySession, { metadata, replayExport });
  const summary = {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    type: "telemetry-summary",
    metrics: telemetry,
    metadata: telemetry.metadata
  };
  console.info("[GoType] Telemetry Summary", summary);
  return summary;
});

export const summarizeSessionPerformance = guardDebug((replaySession, telemetrySession = null, metadata = {}) => {
  const replay = exportReplayBundle(replaySession, { metadata });
  const telemetry = telemetrySession ? exportTelemetryBundle(telemetrySession, { metadata, replayExport: replay }) : null;
  const summary = {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    type: "session-performance",
    replay: replay.replay,
    telemetry: telemetry?.performance || summarizePerformanceSignals({ replay, telemetry: null }),
    metadata: sortDeep(safeObject(metadata))
  };
  console.info("[GoType] Session Performance", summary);
  return summary;
});

export const summarizeArenaValidation = guardDebug((result, challenge, metadata = {}) => {
  const summary = {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    type: "arena-validation",
    challengeId: challenge?.id || null,
    challengeFamily: challenge?.family || null,
    challengeTitle: challenge?.title || null,
    completed: Boolean(result?.challengeCompleted),
    failed: Boolean(result?.challengeFailed),
    badgeAwarded: Boolean(result?.challengeEarnedCount),
    metadata: sortDeep(safeObject(metadata))
  };
  console.info("[GoType] Arena Validation", summary);
  return summary;
});

export const summarizeReplayRenderOrchestration = guardDebug((replaySession, viewport = {}, metadata = {}) => {
  if (!replaySession || !Array.isArray(replaySession.events)) return null;

  const orchestrator = createReplayRenderOrchestrator({
    viewport,
    maxEvents: replaySession.events.length
  });
  orchestrator.ingest({ seq: 0, events: replaySession.events });
  const render = orchestrator.render(viewport);
  const summary = {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    type: "replay-render-orchestration",
    metadata: sortDeep(safeObject(metadata)),
    viewport: sortDeep(safeObject(viewport)),
    render,
    performance: orchestrator.getPerformance(),
    sync: orchestrator.getSyncContract(),
    validation: orchestrator.validateSync()
  };
  console.info("[GoType] Replay Render Orchestration", summary);
  return summary;
});

export const summarizeReplayVisualizationInfrastructure = guardDebug((replaySession, options = {}, metadata = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  type: "replay-visualization-summary",
  metadata: sortDeep(safeObject(metadata)),
  visualization: buildReplayVisualizationSummary(replaySession, options)
}));

export const summarizeSpectatorSimulation = guardDebug((replaySession, options = {}, metadata = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  type: "spectator-simulation-summary",
  metadata: sortDeep(safeObject(metadata)),
  spectator: buildSpectatorSimulationSummary(replaySession, options)
}));

export const summarizeReplayIntegrity = guardDebug((replaySession, options = {}, metadata = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  type: "replay-integrity-summary",
  metadata: sortDeep(safeObject(metadata)),
  integrity: buildReplayIntegritySummary(replaySession, options)
}));

export const summarizeSynchronizationAudit = guardDebug((replaySession, options = {}, metadata = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  type: "synchronization-audit",
  metadata: sortDeep(safeObject(metadata)),
  audit: buildSynchronizationAudit(replaySession, options)
}));

export const summarizeVisualizationSchedulerMetrics = guardDebug((replaySession, options = {}, metadata = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  type: "visualization-scheduler-metrics",
  metadata: sortDeep(safeObject(metadata)),
  metrics: buildVisualizationSchedulerMetrics(replaySession, options)
}));

export const summarizeMergeValidation = guardDebug((payload, options = {}, metadata = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  type: "merge-validation-summary",
  metadata: sortDeep(safeObject(metadata)),
  mergeValidation: buildMergeValidationSummary(payload, options)
}));

export const summarizeDesyncClassification = guardDebug((replaySession, options = {}, metadata = {}) => ({
  schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
  type: "desync-classification-summary",
  metadata: sortDeep(safeObject(metadata)),
  desync: buildDesyncClassificationSummary(replaySession, options)
}));

export const summarizeReplayDiagnostics = (replaySession) => {
  const replay = exportReplayBundle(replaySession, {});
  return {
    schemaVersion: DEBUG_EXPORT_SCHEMA_VERSION,
    replay: replay.replay,
    metrics: replay.metrics,
    metadata: replay.metadata
  };
};

export default {
  DEBUG_EXPORT_SCHEMA_VERSION,
  isDebugExportEnabled,
  createDebugExportMetadata,
  exportReplayBundle,
  exportTelemetryBundle,
  exportTypingSession,
  exportDebugBundle,
  serializeDebugBundle,
  serializeTypingSession,
  printReplaySummary,
  printTelemetrySummary,
  summarizeSessionPerformance,
  summarizeArenaValidation,
  summarizeReplayRenderOrchestration,
  summarizeReplayVisualizationInfrastructure,
  summarizeSpectatorSimulation,
  summarizeReplayIntegrity,
  summarizeSynchronizationAudit,
  summarizeVisualizationSchedulerMetrics,
  summarizeMergeValidation,
  summarizeDesyncClassification,
  summarizeReplayDiagnostics
};
