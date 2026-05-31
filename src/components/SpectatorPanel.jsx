import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Gauge, Radio, Camera, Users, TimerReset, Shuffle, Video, SatelliteDish, WifiOff } from "lucide-react";
import { createReplayConsumer } from "../engine/replayConsumer";
import { computeGhostProjection } from "../engine/ghostProjectionEngine";
import { createReplayVisualizationCore } from "../engine/replayVisualizationCore";
import { createReplayRenderOrchestrator } from "../engine/replayRenderOrchestrator";
import { createReplayTimelineStateMachine } from "../engine/replayTimelineStateMachine";
import { createSpectatorPresentationRuntime } from "../engine/spectatorPresentationRuntime";
import { createDeterministicSpectatorSimulation } from "../engine/spectatorSimulationLayer";
import { createReplayRenderingRuntime } from "../engine/replayRenderingRuntime";
import { projectViewportReplay } from "../engine/replayViewportProjection";
import { validateReplaySyncContract } from "../engine/replaySyncContracts";

const MAX_GHOST_REPLAYS = 8;
const MAX_VISIBLE_GHOST_LANES = 4;
const MAX_VISIBLE_EVENTS_PER_LANE = 28;
const MAX_VISIBLE_PRIMARY_EVENTS = 40;
const MAX_PACKET_HISTORY = 120;
const MAX_LATENCY_POINTS = 120;
const DEFAULT_VIEWPORT_MS = 3600;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const freezeCopy = (value) => {
  if (!value || typeof value !== "object") return value;
  return Object.freeze({ ...value });
};

const normalizeReplay = (replaySummary) => {
  if (!replaySummary || typeof replaySummary !== "object") return null;
  const events = Array.isArray(replaySummary.events) ? replaySummary.events : [];
  const id = typeof replaySummary.id === "string" ? replaySummary.id : `replay-${events.length}`;
  return Object.freeze({ ...replaySummary, id, events });
};

const getEventTime = (event, fallback = 0) => {
  if (Number.isFinite(Number(event?.t))) return Math.max(0, Number(event.t));
  if (Number.isFinite(Number(event?.ts))) return Math.max(0, Number(event.ts));
  return Math.max(0, fallback);
};

const getBounds = (events) => {
  const maxTime = events.reduce((max, event, index) => Math.max(max, getEventTime(event, index)), 0);
  const viewportMs = clamp(Math.round(maxTime * 0.25) || DEFAULT_VIEWPORT_MS, 1200, 6000);
  return { maxTime: Math.max(maxTime, viewportMs), viewportMs };
};

const boundedPush = (list, nextItem, limit) => {
  const next = [...list, freezeCopy(nextItem)];
  if (next.length <= limit) return next;
  return next.slice(next.length - limit);
};

const buildLaneProgress = (timeline, totalEvents) => {
  if (!totalEvents || totalEvents <= 0) return 0;
  return clamp(Math.round((timeline / totalEvents) * 100), 0, 100);
};

const toneForSeverity = (severity, isDark) => {
  if (severity >= 4) return isDark ? "border-rose-400/30 bg-rose-500/15 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700";
  if (severity >= 2) return isDark ? "border-amber-400/30 bg-amber-500/15 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-700";
  return isDark ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-700";
};

function StatBadge({ label, value, toneClass }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SpectatorPanel({ replaySummary, ghostReplays = [], isDark = true }) {
  const replay = useMemo(() => normalizeReplay(replaySummary), [replaySummary]);
  const ghosts = useMemo(() => {
    const normalized = (Array.isArray(ghostReplays) ? ghostReplays : []).map(normalizeReplay).filter(Boolean);
    const deduped = [];
    const seen = new Set([replay?.id]);
    normalized.forEach((candidate) => {
      if (!seen.has(candidate.id)) {
        deduped.push(candidate);
        seen.add(candidate.id);
      }
    });
    return deduped.slice(0, MAX_GHOST_REPLAYS);
  }, [ghostReplays, replay]);

  const primaryBounds = useMemo(() => getBounds(replay?.events || []), [replay]);
  const [viewportStart, setViewportStart] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(primaryBounds.viewportMs);
  const [cameraFocus, setCameraFocus] = useState("primary");
  const [ghostOffset, setGhostOffset] = useState(0);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonGhostId, setComparisonGhostId] = useState(() => ghosts[0]?.id || null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulateDesync, setSimulateDesync] = useState(false);
  const [packetHistory, setPacketHistory] = useState([]);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [bufferCursor, setBufferCursor] = useState(0);
  const timerRef = useRef(null);
  const packetSequenceRef = useRef(0);

  const viewport = useMemo(() => {
    const width = clamp(viewportWidth, 800, 8000);
    const start = clamp(viewportStart, 0, Math.max(0, primaryBounds.maxTime - 1));
    const end = clamp(start + width, start + 1, primaryBounds.maxTime);
    return freezeCopy({ start, end });
  }, [viewportStart, viewportWidth, primaryBounds.maxTime]);

  const spectatorTimelineState = useMemo(() => createReplayTimelineStateMachine({ phase: "idle", viewport, syncMode: "spectator" }), []);
  const consumer = useMemo(() => (replay ? createReplayConsumer(replay) : null), [replay]);
  const primaryGhostProjection = useMemo(() => (replay ? computeGhostProjection(replay) : null), [replay]);
  const visualizationCore = useMemo(() => (replay ? createReplayVisualizationCore(replay, { viewport, analysisEventLimit: 2000 }) : null), [replay]);
  const renderRuntime = useMemo(() => (replay ? createReplayRenderingRuntime(replay, { viewport, maxFrameCache: 8, analysisEventLimit: 2500 }) : null), [replay]);
  const orchestrator = useMemo(() => {
    if (!replay) return null;
    const instance = createReplayRenderOrchestrator({ viewport, maxEvents: replay.events.length, frameBudgetMs: 8 });
    instance.attachSpectator({ id: "local-spectator", mode: "spectator", connected: true, lagMs: 0 });
    instance.ingest({ seq: 0, events: replay.events });
    return instance;
  }, [replay]);
  const presentationRuntime = useMemo(() => {
    if (!replay) return null;
    return createSpectatorPresentationRuntime([replay, ...ghosts], { viewport, frameBudgetMs: 8, syncWindowMs: 5000, boundedWindow: 3 });
  }, [replay, ghosts]);
  const ghostSimulations = useMemo(() => ghosts.map((ghost) => ({
    id: ghost.id,
    replay: ghost,
    sim: createDeterministicSpectatorSimulation(ghost, { viewport, syncWindowMs: 5000, boundedWindow: 3 })
  })), [ghosts]);

  useEffect(() => {
    setViewportWidth(primaryBounds.viewportMs);
    setViewportStart(Math.max(0, primaryBounds.maxTime - primaryBounds.viewportMs));
  }, [primaryBounds.maxTime, primaryBounds.viewportMs]);

  useEffect(() => {
    if (!ghosts.length) {
      setComparisonGhostId(null);
      setGhostOffset(0);
      return;
    }
    if (!ghosts.some((ghost) => ghost.id === comparisonGhostId)) {
      setComparisonGhostId(ghosts[0].id);
    }
    setGhostOffset((prev) => clamp(prev, 0, Math.max(0, ghosts.length - MAX_VISIBLE_GHOST_LANES)));
  }, [ghosts, comparisonGhostId]);

  useEffect(() => {
    if (!isPlaying) return;
    const stepMs = clamp(Math.round((viewportWidth / 5) * playbackSpeed), 45, 900);
    timerRef.current = window.setInterval(() => {
      setViewportStart((current) => {
        const next = clamp(current + stepMs, 0, Math.max(0, primaryBounds.maxTime - 1));
        if (next >= Math.max(0, primaryBounds.maxTime - viewportWidth)) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 180);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, primaryBounds.maxTime, viewportWidth]);

  const projectedPrimary = useMemo(() => {
    if (!consumer || !primaryGhostProjection) return null;
    return projectViewportReplay(consumer.getSnapshot(), primaryGhostProjection, viewport);
  }, [consumer, primaryGhostProjection, viewport]);

  const visualCoreFrame = useMemo(() => (visualizationCore ? visualizationCore.getFrame(viewport) : null), [visualizationCore, viewport]);
  const renderedFrame = useMemo(() => (renderRuntime ? renderRuntime.renderFrame(viewport) : null), [renderRuntime, viewport]);
  const orchestratedFrame = useMemo(() => {
    if (!orchestrator) return null;
    orchestrator.setViewport(viewport);
    return orchestrator.render(viewport);
  }, [orchestrator, viewport]);
  const presentation = useMemo(() => (presentationRuntime ? presentationRuntime.render(viewport) : null), [presentationRuntime, viewport]);

  useEffect(() => {
    if (!orchestrator || !presentation || !ghostSimulations.length) return;

    spectatorTimelineState.transition({ type: "render", viewport, cursor: projectedPrimary?.frame?.timeline?.length || 0, syncMode: "spectator" });
    const sequenceBase = packetSequenceRef.current + 1;
    const packetProjections = ghostSimulations.map((entry, index) => {
      const deterministicLatency = 14 + ((sequenceBase + index + Math.round(viewport.start / 10)) % 160);
      const shouldDesync = simulateDesync && ((sequenceBase + index) % 5 === 0);
      const replayHash = shouldDesync ? `${entry.sim.getReplayHash()}-mismatch` : entry.sim.getReplayHash();
      const projection = entry.sim.ingestPacket({
        sequence: sequenceBase + index,
        replayHash,
        viewport,
        latencyMs: deterministicLatency,
        acknowledgedAt: viewport.end
      });
      return { id: entry.id, projection };
    });

    const averageLatency = packetProjections.length
      ? packetProjections.reduce((sum, packet) => sum + (packet.projection.packet.latencyMs || 0), 0) / packetProjections.length
      : 0;

    setPacketHistory((history) => {
      const nextBatch = packetProjections.map((entry) => ({
        ghostId: entry.id,
        sequence: entry.projection.packet.sequence,
        latencyMs: entry.projection.packet.latencyMs,
        desync: entry.projection.desync.kind,
        severity: entry.projection.desync.severity,
        repair: entry.projection.repair.action,
        immutable: Object.isFrozen(entry.projection)
      }));
      const merged = [...history, ...nextBatch];
      return merged.slice(Math.max(0, merged.length - MAX_PACKET_HISTORY));
    });

    setLatencyHistory((history) => boundedPush(history, { t: Math.round(viewport.end), value: Number(averageLatency.toFixed(2)) }, MAX_LATENCY_POINTS));
    setBufferCursor((cursor) => (cursor + 1) % 64);
    packetSequenceRef.current = sequenceBase + ghostSimulations.length;

    spectatorTimelineState.transition({
      type: "sync",
      viewport,
      cursor: projectedPrimary?.frame?.timeline?.length || 0,
      syncMode: "spectator",
      spectatorCount: ghostSimulations.length
    });
  }, [orchestrator, presentation, ghostSimulations, projectedPrimary, simulateDesync, spectatorTimelineState, viewport]);

  if (!replay) return null;

  const timelineState = spectatorTimelineState.snapshot();
  const syncContract = orchestrator?.getSyncContract?.() || null;
  const syncValidation = syncContract ? validateReplaySyncContract(syncContract) : { valid: false, reasons: ["missing_sync"] };
  const orchestratorSnapshot = orchestrator?.getSnapshot?.() || null;
  const streamSnapshot = orchestratorSnapshot?.snapshot || null;
  const scheduler = orchestratedFrame?.schedule || null;
  const renderSnapshot = renderRuntime?.getSnapshot?.() || null;
  const adapterContracts = renderSnapshot?.adapterContracts || {};
  const droppedEstimate = renderSnapshot?.droppedFrameEstimate || 0;
  const degraded = droppedEstimate > 0 || !scheduler?.withinBudget;
  const bufferUtilization = streamSnapshot?.totalEvents
    ? clamp(Math.round((streamSnapshot.totalEvents / Math.max(1, replay.events.length)) * 100), 0, 100)
    : 0;
  const laneStart = clamp(ghostOffset, 0, Math.max(0, ghosts.length - MAX_VISIBLE_GHOST_LANES));
  const visibleGhosts = ghosts.slice(laneStart, laneStart + MAX_VISIBLE_GHOST_LANES);
  const visiblePrimaryTimeline = (projectedPrimary?.frame?.timeline || []).slice(0, MAX_VISIBLE_PRIMARY_EVENTS);
  const selectedGhost = comparisonGhostId ? ghosts.find((ghost) => ghost.id === comparisonGhostId) || null : null;
  const selectedGhostSimulation = selectedGhost ? ghostSimulations.find((entry) => entry.id === selectedGhost.id) : null;
  const selectedGhostProjection = selectedGhostSimulation?.sim?.getProjection?.()?.latest?.frame || null;
  const compareDelta = comparisonMode && selectedGhostProjection
    ? {
        timeline: (projectedPrimary?.frame?.timeline?.length || 0) - (selectedGhostProjection?.visibleTimeline?.length || 0),
        corrections: (projectedPrimary?.frame?.corrections?.length || 0) - (selectedGhostProjection?.correctionHeatmap?.length || 0),
        markers: (projectedPrimary?.frame?.markers?.length || 0) - (selectedGhostProjection?.markerClusters?.length || 0)
      }
    : null;
  const severePackets = packetHistory.filter((packet) => packet.severity >= 4).length;
  const mediumPackets = packetHistory.filter((packet) => packet.severity >= 2 && packet.severity < 4).length;
  const averageLatency = latencyHistory.length ? latencyHistory.reduce((sum, point) => sum + point.value, 0) / latencyHistory.length : 0;
  const statusTone = severePackets > 0 ? "critical" : mediumPackets > 0 ? "degraded" : syncValidation.valid ? "healthy" : "warning";

  const textClass = isDark ? "text-slate-100" : "text-slate-900";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";
  const panelClass = isDark ? "border-slate-700/50 bg-slate-900/45" : "border-slate-200 bg-white";
  const healthyTone = isDark ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const warningTone = isDark ? "border-amber-400/25 bg-amber-500/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-700";
  const criticalTone = isDark ? "border-rose-400/30 bg-rose-500/15 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <section className={`rounded-3xl border p-5 shadow-lg ${panelClass}`} aria-label="Live spectator and ghost synchronization">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-sky-200" : "text-sky-700"}`}>Live Spectator Runtime</p>
          <h3 className={`mt-1 text-lg font-semibold ${textClass}`}>Observational ghost synchronization and sync telemetry</h3>
          <p className={`mt-1 text-xs ${mutedText}`}>Replay-safe only. No gameplay mutations. Deterministic, frozen spectator snapshots.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Ghost lanes" value={ghosts.length} toneClass={healthyTone} />
          <StatBadge label="Viewport" value={`${Math.round(viewport.start)} - ${Math.round(viewport.end)} ms`} toneClass={isDark ? "border-slate-700/60 bg-slate-900/60 text-slate-100" : "border-slate-200 bg-white text-slate-700"} />
          <StatBadge label="Sync token" value={syncContract?.syncToken ? syncContract.syncToken.slice(0, 8) : "none"} toneClass={syncValidation.valid ? healthyTone : warningTone} />
          <StatBadge label="Stream buffered" value={`${bufferUtilization}%`} toneClass={warningTone} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className={`rounded-2xl border p-3 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/80"}`}>
          <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] ${mutedText}`}><Camera size={14} /> Spectator viewport controls</div>
          <div className="mt-3 space-y-2">
            <label className="block text-xs">
              <span className={mutedText}>Viewport start</span>
              <input
                aria-label="Spectator viewport start"
                type="range"
                min={0}
                max={Math.max(1, primaryBounds.maxTime - 1)}
                step={Math.max(1, Math.round(primaryBounds.maxTime / 320))}
                value={Math.round(viewportStart)}
                onChange={(event) => setViewportStart(Number(event.target.value))}
                className="mt-1 w-full accent-sky-400"
              />
            </label>
            <label className="block text-xs">
              <span className={mutedText}>Viewport width</span>
              <input
                aria-label="Spectator viewport width"
                type="range"
                min={900}
                max={8000}
                step={100}
                value={Math.round(viewportWidth)}
                onChange={(event) => setViewportWidth(Number(event.target.value))}
                className="mt-1 w-full accent-cyan-400"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isDark ? "border-slate-700/60 bg-slate-900/50" : "border-slate-200 bg-white"}`} onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? "Pause feed" : "Play feed"}</button>
            <button type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isDark ? "border-slate-700/60 bg-slate-900/50" : "border-slate-200 bg-white"}`} onClick={() => setViewportStart(0)}><TimerReset size={12} className="inline mr-1" />Reset</button>
            {[0.5, 1, 2].map((speed) => (
              <button key={speed} type="button" onClick={() => setPlaybackSpeed(speed)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${playbackSpeed === speed ? (isDark ? "border-sky-400/40 bg-sky-500/15 text-sky-100" : "border-sky-300 bg-sky-50 text-sky-700") : (isDark ? "border-slate-700/60 bg-slate-900/50 text-slate-300" : "border-slate-200 bg-white text-slate-600")}`}>{speed}x</button>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-3 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/80"}`}>
          <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] ${mutedText}`}><Users size={14} /> Camera and focus controls</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCameraFocus("primary")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${cameraFocus === "primary" ? (isDark ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100" : "border-cyan-300 bg-cyan-50 text-cyan-700") : (isDark ? "border-slate-700/60 bg-slate-900/50 text-slate-300" : "border-slate-200 bg-white text-slate-600")}`}>Primary</button>
            {ghosts.map((ghost) => (
              <button key={ghost.id} type="button" onClick={() => setCameraFocus(ghost.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${cameraFocus === ghost.id ? (isDark ? "border-violet-400/40 bg-violet-500/15 text-violet-100" : "border-violet-300 bg-violet-50 text-violet-700") : (isDark ? "border-slate-700/60 bg-slate-900/50 text-slate-300" : "border-slate-200 bg-white text-slate-600")}`}>{ghost.id}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setComparisonMode((value) => !value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${comparisonMode ? (isDark ? "border-violet-400/40 bg-violet-500/15 text-violet-100" : "border-violet-300 bg-violet-50 text-violet-700") : (isDark ? "border-slate-700/60 bg-slate-900/50 text-slate-300" : "border-slate-200 bg-white text-slate-600")}`}><Shuffle size={12} className="mr-1 inline" />Ghost comparison</button>
            <button type="button" onClick={() => setSimulateDesync((value) => !value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${simulateDesync ? criticalTone : (isDark ? "border-slate-700/60 bg-slate-900/50 text-slate-300" : "border-slate-200 bg-white text-slate-600")}`}>{simulateDesync ? "Desync simulation on" : "Desync simulation off"}</button>
          </div>
          {comparisonMode && ghosts.length ? (
            <label className="mt-3 block text-xs">
              <span className={mutedText}>Comparison ghost</span>
              <select
                aria-label="Comparison ghost selector"
                className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-xs ${isDark ? "border-slate-700 bg-slate-900/60 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
                value={comparisonGhostId || ghosts[0].id}
                onChange={(event) => setComparisonGhostId(event.target.value)}
              >
                {ghosts.map((ghost) => <option key={ghost.id} value={ghost.id}>{ghost.id}</option>)}
              </select>
            </label>
          ) : null}
        </div>

        <div className={`rounded-2xl border p-3 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/80"}`}>
          <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] ${mutedText}`}><Gauge size={14} /> Synchronization status badges</div>
          <div className="mt-3 grid gap-2">
            <StatBadge label="Timeline phase" value={timelineState.phase} toneClass={statusTone === "critical" ? criticalTone : statusTone === "degraded" ? warningTone : healthyTone} />
            <StatBadge label="Sync validation" value={syncValidation.valid ? "valid" : syncValidation.reasons.join(", ")} toneClass={syncValidation.valid ? healthyTone : warningTone} />
            <StatBadge label="Frame budget" value={`${Math.round(scheduler?.consumedMs || 0)}/${Math.round(scheduler?.budgetMs || 0)} ms`} toneClass={scheduler?.withinBudget ? healthyTone : warningTone} />
            <StatBadge label="Degradation" value={degraded ? "active" : "none"} toneClass={degraded ? warningTone : healthyTone} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/60" : "border-slate-200 bg-white/90"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] uppercase tracking-[0.15em] ${mutedText}`}>Live ghost lanes (virtualized)</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setGhostOffset((value) => clamp(value - 1, 0, Math.max(0, ghosts.length - MAX_VISIBLE_GHOST_LANES)))} className={`rounded-full border px-2 py-1 text-xs ${isDark ? "border-slate-700/60" : "border-slate-200"}`}>Prev</button>
              <button type="button" onClick={() => setGhostOffset((value) => clamp(value + 1, 0, Math.max(0, ghosts.length - MAX_VISIBLE_GHOST_LANES)))} className={`rounded-full border px-2 py-1 text-xs ${isDark ? "border-slate-700/60" : "border-slate-200"}`}>Next</button>
            </div>
          </div>

          <div role="list" aria-label="Spectator ghost lanes" className="mt-3 space-y-3">
            {visibleGhosts.length === 0 ? <p className={`text-sm ${mutedText}`}>No ghost lanes available yet.</p> : visibleGhosts.map((ghost) => {
              const simulationEntry = ghostSimulations.find((entry) => entry.id === ghost.id);
              const latest = simulationEntry?.sim?.getProjection?.()?.latest || null;
              const timelineCount = latest?.frame?.visibleTimeline?.length || 0;
              const progress = buildLaneProgress(timelineCount, Math.max(1, ghost.events.length));
              const laneEvents = (latest?.frame?.visibleTimeline || []).slice(0, MAX_VISIBLE_EVENTS_PER_LANE);
              const laneTone = toneForSeverity(latest?.desync?.severity || 0, isDark);
              return (
                <div role="listitem" key={ghost.id} className={`rounded-xl border p-3 ${isDark ? "border-slate-700/50 bg-slate-900/55" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{ghost.id}</p>
                      <p className={`text-[11px] ${mutedText}`}>{timelineCount} events in viewport</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${laneTone}`}>{latest?.desync?.kind || "in-sync"}</span>
                  </div>
                  <div className={`mt-2 h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${progress}%` }} />
                  </div>
                  <div role="list" aria-label={`Lane events ${ghost.id}`} className="mt-2 space-y-1 text-[11px]">
                    {laneEvents.length === 0 ? <p className={mutedText}>No visible lane events.</p> : laneEvents.map((event, index) => (
                      <div role="listitem" key={`${ghost.id}-${event.index}-${index}`} className={`inline-flex items-center gap-2 rounded-full px-2 py-1 ${isDark ? "bg-slate-800/70 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                        <span className="font-semibold uppercase">{event.type}</span>
                        <span className="tabular-nums">{Math.round(getEventTime(event, index))}ms</span>
                      </div>
                    ))}
                    {(latest?.frame?.visibleTimeline?.length || 0) > MAX_VISIBLE_EVENTS_PER_LANE ? (
                      <p className={mutedText}>Virtualized {(latest.frame.visibleTimeline.length - MAX_VISIBLE_EVENTS_PER_LANE)} hidden events in this lane.</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {ghosts.length > MAX_VISIBLE_GHOST_LANES ? (
            <p className={`mt-2 text-xs ${mutedText}`}>Lane virtualization active: showing {visibleGhosts.length}/{ghosts.length} ghost lanes.</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/85"}`}>
            <p className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] ${mutedText}`}><Radio size={13} /> Packet, desync, and latency indicators</p>
            <div className="mt-3 grid gap-2">
              <StatBadge label="Packets" value={packetHistory.length} toneClass={healthyTone} />
              <StatBadge label="Severe desync" value={severePackets} toneClass={severePackets > 0 ? criticalTone : healthyTone} />
              <StatBadge label="Medium desync" value={mediumPackets} toneClass={mediumPackets > 0 ? warningTone : healthyTone} />
              <StatBadge label="Avg latency" value={`${averageLatency.toFixed(1)} ms`} toneClass={averageLatency > 120 ? warningTone : healthyTone} />
            </div>
            <div role="list" aria-label="Spectator packet history" className="mt-3 max-h-40 space-y-1 overflow-auto text-[11px]">
              {packetHistory.slice(-18).map((packet, index) => (
                <div role="listitem" key={`${packet.ghostId}-${packet.sequence}-${index}`} className={`flex items-center justify-between rounded-lg border px-2 py-1 ${toneForSeverity(packet.severity, isDark)}`}>
                  <span className="font-semibold">{packet.ghostId}</span>
                  <span>seq {packet.sequence}</span>
                  <span>{packet.latencyMs}ms</span>
                  <span>{packet.desync}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/85"}`}>
            <p className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] ${mutedText}`}><Video size={13} /> Stream and buffer indicators</p>
            <div className="mt-3 space-y-2 text-xs">
              <div className={`rounded-xl border px-3 py-2 ${isDark ? "border-slate-700/60 bg-slate-900/50" : "border-slate-200 bg-white"}`}>
                <p className={mutedText}>Replay stream state</p>
                <p className="mt-1 font-semibold">phase {timelineState.phase} / nextSeq {streamSnapshot?.nextSeq ?? 0}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${isDark ? "border-slate-700/60 bg-slate-900/50" : "border-slate-200 bg-white"}`}>
                <p className={mutedText}>Bounded replay buffering UI</p>
                <div className={`mt-1 h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-400" style={{ width: `${bufferUtilization}%` }} />
                </div>
                <p className="mt-1 font-semibold">{streamSnapshot?.totalEvents ?? 0}/{replay.events.length} events in stream buffer</p>
                <p className={`mt-1 ${mutedText}`}>Flushed chunks: {Array.isArray(replay.flushedBatches) ? replay.flushedBatches.length : 0} | Buffered chunk queue: {streamSnapshot?.bufferedChunks ?? 0}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${isDark ? "border-slate-700/60 bg-slate-900/50" : "border-slate-200 bg-white"}`}>
                <p className={mutedText}>Deterministic frame degradation indicators</p>
                <p className="mt-1 font-semibold">Dropped estimate {droppedEstimate} | over budget {Math.round(scheduler?.overBudgetMs || 0)}ms</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/85"}`}>
            <p className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] ${mutedText}`}>
              {syncValidation.valid ? <SatelliteDish size={13} /> : <WifiOff size={13} />} Worker-compatible render path
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <StatBadge label="Offscreen" value={adapterContracts?.offscreenSupported ? "supported" : "no"} toneClass={adapterContracts?.offscreenSupported ? healthyTone : warningTone} />
              <StatBadge label="WebGL boundary" value={adapterContracts?.webglCompatible ? "compatible" : "cpu-only"} toneClass={adapterContracts?.webglCompatible ? healthyTone : warningTone} />
              <StatBadge label="Frozen snapshots" value={Object.isFrozen(orchestratedFrame || {}) && Object.isFrozen(visualCoreFrame || {}) ? "yes" : "no"} toneClass={Object.isFrozen(orchestratedFrame || {}) ? healthyTone : criticalTone} />
              <StatBadge label="Buffer cursor" value={bufferCursor} toneClass={healthyTone} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/85"}`}>
          <p className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] ${mutedText}`}><Eye size={13} /> Multi-ghost overlay rendering</p>
          <p className={`mt-1 text-xs ${mutedText}`}>Presentation hash: {presentation?.deterministicSpectatorSummary?.presentationHash?.slice(0, 12) || "none"}</p>
          <div role="list" aria-label="Primary spectator events" className="mt-3 max-h-40 space-y-1 overflow-auto text-[11px]">
            {visiblePrimaryTimeline.map((event, index) => (
              <div role="listitem" key={`primary-${event.index}-${index}`} className={`inline-flex items-center gap-2 rounded-full px-2 py-1 ${isDark ? "bg-slate-800/70 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                <span className="font-semibold uppercase">{event.type}</span>
                <span className="tabular-nums">{Math.round(getEventTime(event, index))}ms</span>
              </div>
            ))}
            {(projectedPrimary?.frame?.timeline?.length || 0) > MAX_VISIBLE_PRIMARY_EVENTS ? (
              <p className={mutedText}>Virtualized {(projectedPrimary.frame.timeline.length - MAX_VISIBLE_PRIMARY_EVENTS)} hidden primary events.</p>
            ) : null}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/85"}`}>
          <p className={`text-[11px] uppercase tracking-[0.15em] ${mutedText}`}>Ghost comparison mode</p>
          {comparisonMode && compareDelta ? (
            <div className="mt-3 grid gap-2 text-sm">
              <StatBadge label="Timeline delta" value={compareDelta.timeline} toneClass={compareDelta.timeline === 0 ? healthyTone : warningTone} />
              <StatBadge label="Correction delta" value={compareDelta.corrections} toneClass={compareDelta.corrections === 0 ? healthyTone : warningTone} />
              <StatBadge label="Marker delta" value={compareDelta.markers} toneClass={compareDelta.markers === 0 ? healthyTone : warningTone} />
            </div>
          ) : (
            <p className={`mt-3 text-sm ${mutedText}`}>Enable comparison mode to inspect deterministic ghost deltas.</p>
          )}
          <div className="mt-3 grid gap-2 text-xs">
            <StatBadge label="Camera focus" value={cameraFocus} toneClass={healthyTone} />
            <StatBadge label="Replay-safe boundary" value="spectator-only" toneClass={healthyTone} />
            <StatBadge label="No gameplay refs" value="verified" toneClass={healthyTone} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(SpectatorPanel);