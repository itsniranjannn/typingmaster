import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, SkipBack, SkipForward, ChevronsLeft, ChevronsRight, Layers3, Activity, Gauge, GitCompareArrows } from "lucide-react";
import { createReplayConsumer } from "../engine/replayConsumer";
import { computeGhostProjection } from "../engine/ghostProjectionEngine";
import { createReplayRenderingRuntime } from "../engine/replayRenderingRuntime";
import { createReplayRenderOrchestrator } from "../engine/replayRenderOrchestrator";
import { createReplayTimelineInteractionRuntime } from "../engine/replayTimelineInteractionRuntime";
import { createCanvasRenderingAdapter } from "../engine/canvasRenderingAdapter";
import { projectViewportReplay } from "../engine/replayViewportProjection";

const OVERLAY_DEFAULTS = Object.freeze({
  ghost: true,
  corrections: true,
  heatmap: true,
  pacing: true,
  density: true
});

const MAX_VISIBLE_EVENTS = 64;
const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 3];

const normalizeReplay = (replaySummary) => {
  if (!replaySummary || typeof replaySummary !== "object") return null;
  const events = Array.isArray(replaySummary.events) ? replaySummary.events : [];
  return { ...replaySummary, events };
};

const eventTime = (event, fallback = 0) => {
  const time = Number.isFinite(Number(event?.t)) ? Number(event.t) : Number.isFinite(Number(event?.ts)) ? Number(event.ts) : fallback;
  return Math.max(0, time);
};

const buildViewportRange = (events) => {
  const times = events.map((event, index) => eventTime(event, index));
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const windowSize = Math.max(1000, Math.min(5000, Math.round(maxTime * 0.35) || 1000));
  const start = Math.max(0, maxTime - windowSize);
  return { start, end: Math.max(start + 1, maxTime || windowSize), maxTime, windowSize };
};

const clampRange = (range, maxTime) => {
  const width = Math.max(1, Number(range.end - range.start) || 1);
  const start = Math.max(0, Math.min(Number(range.start) || 0, maxTime));
  const end = Math.max(start + 1, Math.min(Number(range.end) || start + width, maxTime || start + width));
  return { start, end };
};

const findEventIndexAtOrBefore = (events, targetTime) => {
  let index = 0;
  events.forEach((event, currentIndex) => {
    if (eventTime(event, currentIndex) <= targetTime) {
      index = currentIndex;
    }
  });
  return index;
};

const toneForType = (type) => {
  if (type === "correction") return "rose";
  if (type === "checkpoint" || type === "marker") return "amber";
  if (type === "pause") return "violet";
  if (type === "input") return "cyan";
  return "slate";
};

function Chip({ label, value, isDark = true }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${isDark ? "border-slate-700/60 bg-slate-900/50 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
      <div className={`text-[10px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ToggleButton({ label, active, onClick, isDark = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
        active
          ? isDark
            ? "border-sky-400/30 bg-sky-500/15 text-sky-100"
            : "border-sky-300 bg-sky-50 text-sky-700"
          : isDark
            ? "border-slate-700/60 bg-slate-900/40 text-slate-300 hover:bg-slate-900/60"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function OverlayRow({ label, count, tone = "cyan", isDark = true }) {
  const tones = {
    cyan: isDark ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100" : "border-cyan-200 bg-cyan-50 text-cyan-700",
    amber: isDark ? "border-amber-400/20 bg-amber-500/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-700",
    rose: isDark ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700",
    violet: isDark ? "border-violet-400/20 bg-violet-500/10 text-violet-100" : "border-violet-200 bg-violet-50 text-violet-700",
    slate: isDark ? "border-slate-400/20 bg-slate-500/10 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
  };

  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${tones[tone] || tones.cyan}`}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <span className="tabular-nums">{count}</span>
    </div>
  );
}

function TimelineBar({ event, index, total, isDark = true }) {
  const ratio = total > 0 ? index / total : 0;
  const tone = toneForType(event.type);
  const tones = {
    cyan: isDark ? "bg-cyan-400/85 text-slate-950" : "bg-cyan-500 text-white",
    amber: isDark ? "bg-amber-400/85 text-slate-950" : "bg-amber-500 text-white",
    rose: isDark ? "bg-rose-400/85 text-slate-950" : "bg-rose-500 text-white",
    violet: isDark ? "bg-violet-400/85 text-slate-950" : "bg-violet-500 text-white",
    slate: isDark ? "bg-slate-500/85 text-white" : "bg-slate-400 text-slate-950"
  };

  return (
    <div role="listitem" className="flex items-center gap-2 text-[11px]">
      <span className="w-10 shrink-0 tabular-nums opacity-70">{Math.round(ratio * 100)}%</span>
      <span className={`inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1 ${tones[tone]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-85" />
        <span className="truncate font-semibold">{event.type}</span>
        <span className="tabular-nums opacity-80">{Math.round(eventTime(event, index))}ms</span>
      </span>
    </div>
  );
}

function ReplayVisualizationPanel({ replaySummary, comparisonReplaySummary = null, isDark = true }) {
  const replay = useMemo(() => normalizeReplay(replaySummary), [replaySummary]);
  const comparisonReplay = useMemo(() => normalizeReplay(comparisonReplaySummary), [comparisonReplaySummary]);
  const viewportBounds = useMemo(() => buildViewportRange(replay?.events || []), [replay]);
  const [viewportRange, setViewportRange] = useState(() => ({ start: viewportBounds.start, end: viewportBounds.end }));
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(Boolean(comparisonReplay));
  const [overlays, setOverlays] = useState(OVERLAY_DEFAULTS);
  const [cursorIndex, setCursorIndex] = useState(0);
  const timerRef = useRef(null);

  const consumer = useMemo(() => (replay ? createReplayConsumer(replay) : null), [replay]);
  const comparisonConsumer = useMemo(() => (comparisonReplay ? createReplayConsumer(comparisonReplay) : null), [comparisonReplay]);
  const ghostProjection = useMemo(() => (replay ? computeGhostProjection(replay) : null), [replay]);
  const comparisonGhostProjection = useMemo(() => (comparisonReplay ? computeGhostProjection(comparisonReplay) : null), [comparisonReplay]);
  const renderRuntime = useMemo(() => (replay ? createReplayRenderingRuntime(replay, { maxFrameCache: 6, analysisEventLimit: 2000 }) : null), [replay]);
  const interactionRuntime = useMemo(() => (replay ? createReplayTimelineInteractionRuntime(replay, { viewport: viewportRange, renderRuntime }) : null), [replay, renderRuntime]);
  const orchestrator = useMemo(() => {
    if (!replay) return null;
    const instance = createReplayRenderOrchestrator({ viewport: viewportRange, maxEvents: replay.events.length, frameBudgetMs: 8 });
    instance.ingest({ seq: 0, events: replay.events });
    return instance;
  }, [replay, viewportRange]);
  const canvasAdapter = useMemo(() => createCanvasRenderingAdapter({ offscreenSupported: true, webglCompatible: true }), []);

  useEffect(() => {
    setViewportRange((previous) => clampRange(previous, viewportBounds.maxTime));
  }, [viewportBounds.maxTime, viewportBounds.start, viewportBounds.end]);

  useEffect(() => {
    if (!isPlaying || !replay) return;

    const stepMs = Math.max(50, Math.round(Math.max(500, viewportBounds.windowSize / 4) / Math.max(0.25, playbackSpeed)));
    timerRef.current = window.setInterval(() => {
      setViewportRange((previous) => {
        const nextStart = Math.min(viewportBounds.maxTime, previous.start + stepMs);
        const nextEnd = Math.min(viewportBounds.maxTime, nextStart + (previous.end - previous.start));
        if (nextEnd >= viewportBounds.maxTime) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
          setIsPlaying(false);
        }
        return clampRange({ start: nextStart, end: nextEnd }, viewportBounds.maxTime);
      });
    }, 160);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, replay, viewportBounds.maxTime, viewportBounds.windowSize]);

  const renderFrame = useMemo(() => {
    if (!renderRuntime) return null;
    return renderRuntime.renderFrame(viewportRange);
  }, [renderRuntime, viewportRange]);

  const renderedSnapshot = renderFrame?.renderTree ? renderFrame : null;
  const canvasProjection = useMemo(() => {
    if (!renderedSnapshot) return null;
    return canvasAdapter.createCanvasRenderer(renderedSnapshot, viewportRange);
  }, [canvasAdapter, renderedSnapshot, viewportRange]);

  const currentViewportProjection = useMemo(() => {
    if (!consumer || !ghostProjection) return null;
    return projectViewportReplay(consumer.getSnapshot(), ghostProjection, viewportRange);
  }, [consumer, ghostProjection, viewportRange]);

  const comparisonViewportProjection = useMemo(() => {
    if (!comparisonMode || !comparisonConsumer || !comparisonGhostProjection) return null;
    return projectViewportReplay(comparisonConsumer.getSnapshot(), comparisonGhostProjection, viewportRange);
  }, [comparisonConsumer, comparisonGhostProjection, comparisonMode, viewportRange]);

  const visibleEvents = useMemo(() => {
    const events = currentViewportProjection?.frame?.timeline || [];
    return events.slice(0, MAX_VISIBLE_EVENTS);
  }, [currentViewportProjection]);

  const comparisonVisibleEvents = useMemo(() => {
    if (!comparisonViewportProjection) return [];
    return (comparisonViewportProjection.frame?.timeline || []).slice(0, MAX_VISIBLE_EVENTS);
  }, [comparisonViewportProjection]);

  const currentFrameMetrics = renderRuntime?.getSnapshot() || null;
  const schedulerMetrics = orchestrator?.getSnapshot()?.schedule || null;
  const syncContract = orchestrator?.getSyncContract?.() || null;
  const comparisonDiff = useMemo(() => {
    if (!comparisonViewportProjection || !currentViewportProjection) return null;
    return {
      timelineDelta: (currentViewportProjection.frame?.timeline?.length || 0) - (comparisonViewportProjection.frame?.timeline?.length || 0),
      correctionDelta: (currentViewportProjection.frame?.corrections?.length || 0) - (comparisonViewportProjection.frame?.corrections?.length || 0),
      markerDelta: (currentViewportProjection.frame?.markers?.length || 0) - (comparisonViewportProjection.frame?.markers?.length || 0),
      pacingDelta: (currentViewportProjection.frame?.pacing?.length || 0) - (comparisonViewportProjection.frame?.pacing?.length || 0)
    };
  }, [comparisonViewportProjection, currentViewportProjection]);

  useEffect(() => {
    if (!interactionRuntime) return;
    setCursorIndex(interactionRuntime.getScrubberState().cursor || 0);
  }, [interactionRuntime, viewportRange]);

  if (!replay) {
    return null;
  }

  const maxTime = Math.max(viewportBounds.maxTime, 1);
  const viewportWidth = Math.max(1, viewportRange.end - viewportRange.start);
  const renderCommands = renderedSnapshot?.renderTree?.renderCommands || [];
  const frameBudgetMs = schedulerMetrics?.budgetMs ?? 0;
  const consumedMs = schedulerMetrics?.consumedMs ?? 0;
  const overlayCounts = {
    ghost: overlays.ghost ? ghostProjection?.markers?.length || 0 : 0,
    corrections: overlays.corrections ? currentViewportProjection?.frame?.corrections?.length || 0 : 0,
    heatmap: overlays.heatmap ? currentViewportProjection?.frame?.ghostOverlay?.confidence?.length || 0 : 0,
    pacing: overlays.pacing ? currentViewportProjection?.frame?.pacing?.length || 0 : 0,
    density: overlays.density ? currentFrameMetrics?.adaptiveDensityRendering?.eventCount || 0 : 0
  };

  const jumpToStart = () => {
    const nextViewport = { start: 0, end: Math.min(viewportWidth, maxTime) };
    setViewportRange(clampRange(nextViewport, maxTime));
    if (interactionRuntime) {
      const cursor = findEventIndexAtOrBefore(replay.events, nextViewport.end);
      interactionRuntime.seek(cursor, nextViewport);
      setCursorIndex(cursor);
    }
  };

  const stepViewport = (direction) => {
    const stepMs = Math.max(60, Math.round(viewportWidth / 6));
    const nextStart = Math.max(0, Math.min(maxTime, viewportRange.start + direction * stepMs));
    const nextEnd = Math.max(nextStart + 1, Math.min(maxTime, nextStart + viewportWidth));
    const nextViewport = clampRange({ start: nextStart, end: nextEnd }, maxTime);
    setViewportRange(nextViewport);
    if (interactionRuntime) {
      const cursor = findEventIndexAtOrBefore(replay.events, nextViewport.end);
      interactionRuntime.seek(cursor, nextViewport);
      setCursorIndex(cursor);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      interactionRuntime?.pause();
      return;
    }
    setIsPlaying(true);
    interactionRuntime?.resume();
  };

  const markerNavigation = (direction) => {
    if (!interactionRuntime) return;
    const next = interactionRuntime.navigateMarker(direction, viewportRange);
    setViewportRange(clampRange(next.viewport, maxTime));
    setCursorIndex(next.cursor);
  };

  const handleSeekChange = (event) => {
    const start = Number(event.target.value);
    const nextStart = Math.max(0, Math.min(start, maxTime));
    const nextEnd = Math.min(maxTime, nextStart + viewportWidth);
    const nextViewport = clampRange({ start: nextStart, end: nextEnd }, maxTime);
    setViewportRange(nextViewport);
    if (interactionRuntime) {
      const cursor = findEventIndexAtOrBefore(replay.events, nextViewport.end);
      interactionRuntime.seek(cursor, nextViewport);
      setCursorIndex(cursor);
    }
  };

  return (
    <section className={`rounded-3xl border p-5 shadow-lg ${isDark ? "border-slate-700/50 bg-slate-900/45 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`} aria-label="Replay visualization">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-cyan-200" : "text-cyan-700"}`}>Replay Visualization Runtime</p>
          <h3 className="mt-1 text-lg font-semibold">Deterministic replay playback and overlays</h3>
          <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Replay-only, bounded, frozen outputs from immutable session snapshots.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip label="Events" value={replay.events.length} isDark={isDark} />
          <Chip label="Viewport" value={`${Math.round(viewportRange.start)} - ${Math.round(viewportRange.end)} ms`} isDark={isDark} />
          <Chip label="Frame Budget" value={`${Math.round(frameBudgetMs)} ms`} isDark={isDark} />
          <Chip label="Cache" value={currentFrameMetrics?.frameCacheMetrics?.cacheSize ?? 0} isDark={isDark} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={jumpToStart} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "border-slate-700/70 bg-slate-900/60 hover:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <RotateCcw size={14} /> Reset
        </button>
        <button type="button" onClick={() => stepViewport(-1)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "border-slate-700/70 bg-slate-900/60 hover:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <SkipBack size={14} /> Rewind
        </button>
        <button type="button" onClick={togglePlay} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "border-slate-700/70 bg-slate-900/60 hover:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => stepViewport(1)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "border-slate-700/70 bg-slate-900/60 hover:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <SkipForward size={14} /> Forward
        </button>
        <button type="button" onClick={() => markerNavigation(-1)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "border-slate-700/70 bg-slate-900/60 hover:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <ChevronsLeft size={14} /> Prev Marker
        </button>
        <button type="button" onClick={() => markerNavigation(1)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? "border-slate-700/70 bg-slate-900/60 hover:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <ChevronsRight size={14} /> Next Marker
        </button>
        <button type="button" onClick={() => setComparisonMode((previous) => !previous)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${comparisonMode ? (isDark ? "border-violet-400/40 bg-violet-500/15 text-violet-100" : "border-violet-300 bg-violet-50 text-violet-700") : (isDark ? "border-slate-700/70 bg-slate-900/60 hover:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50")}`}>
          <GitCompareArrows size={14} /> Comparison
        </button>
        {SPEED_OPTIONS.map((speed) => (
          <button key={speed} type="button" onClick={() => setPlaybackSpeed(speed)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${playbackSpeed === speed ? (isDark ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100" : "border-cyan-300 bg-cyan-50 text-cyan-700") : (isDark ? "border-slate-700/70 bg-slate-900/40 text-slate-300" : "border-slate-200 bg-white text-slate-600")}`}>
            {speed}x
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>Viewport seeking</span>
          <span className="tabular-nums">{Math.round(viewportRange.start)} ms</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxTime}
          step={Math.max(1, Math.round(maxTime / 240) || 1)}
          value={Math.round(viewportRange.start)}
          onChange={handleSeekChange}
          className="w-full accent-sky-400"
          aria-label="Replay viewport scrubber"
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Chip label="Render Commands" value={renderCommands.length} isDark={isDark} />
        <Chip label="Timeline Events" value={currentViewportProjection?.frame?.timeline?.length || 0} isDark={isDark} />
        <Chip label="Invalidations" value={currentFrameMetrics?.invalidationCount || 0} isDark={isDark} />
        <Chip label="Dropped Estimate" value={currentFrameMetrics?.droppedFrameEstimate || 0} isDark={isDark} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ToggleButton label="Ghost" active={overlays.ghost} onClick={() => setOverlays((previous) => ({ ...previous, ghost: !previous.ghost }))} isDark={isDark} />
        <ToggleButton label="Corrections" active={overlays.corrections} onClick={() => setOverlays((previous) => ({ ...previous, corrections: !previous.corrections }))} isDark={isDark} />
        <ToggleButton label="Heatmap" active={overlays.heatmap} onClick={() => setOverlays((previous) => ({ ...previous, heatmap: !previous.heatmap }))} isDark={isDark} />
        <ToggleButton label="Pacing" active={overlays.pacing} onClick={() => setOverlays((previous) => ({ ...previous, pacing: !previous.pacing }))} isDark={isDark} />
        <ToggleButton label="Density" active={overlays.density} onClick={() => setOverlays((previous) => ({ ...previous, density: !previous.density }))} isDark={isDark} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/60" : "border-slate-200 bg-white/80"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={`text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Viewport Render Tree</div>
              <div className="mt-1 text-sm font-semibold">{renderCommands.length} deterministic draw commands</div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[11px] ${isDark ? "border-slate-700/60 text-slate-300" : "border-slate-200 text-slate-600"}`}>
              {canvasProjection?.frameHash ? canvasProjection.frameHash.slice(0, 8) : "no-frame"}
            </div>
          </div>

          <div className="mt-4 max-h-[340px] overflow-auto rounded-xl border border-slate-700/40 p-3">
            <div role="list" aria-label="Visible replay events" className="space-y-2">
              {visibleEvents.length === 0 ? (
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>No visible events in this viewport.</p>
              ) : visibleEvents.map((event, index) => (
                <TimelineBar key={`${event.type}-${event.t}-${index}`} event={event} index={index} total={visibleEvents.length} isDark={isDark} />
              ))}
              {currentViewportProjection?.frame?.timeline?.length > MAX_VISIBLE_EVENTS ? (
                <p className={`pt-2 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Virtualized {currentViewportProjection.frame.timeline.length - MAX_VISIBLE_EVENTS} additional events.</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className={`rounded-xl border p-3 ${isDark ? "border-slate-700/50 bg-slate-900/55" : "border-slate-200 bg-white"}`}>
              <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}><Layers3 size={14} /> Ghost Overlay</div>
              <div className="mt-2 space-y-2 text-sm">
                <OverlayRow label="Markers" count={overlays.ghost ? ghostProjection?.markers?.length || 0 : 0} tone="cyan" isDark={isDark} />
                <OverlayRow label="Clusters" count={overlays.ghost ? currentFrameMetrics?.coreSnapshot?.frame?.markerClusters?.length || 0 : 0} tone="violet" isDark={isDark} />
                <OverlayRow label="Pacing windows" count={overlays.pacing ? currentViewportProjection?.frame?.pacing?.length || 0 : 0} tone="amber" isDark={isDark} />
              </div>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? "border-slate-700/50 bg-slate-900/55" : "border-slate-200 bg-white"}`}>
              <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}><Gauge size={14} /> Render Metrics</div>
              <div className="mt-2 space-y-2 text-sm">
                <OverlayRow label="Frame Budget" count={`${Math.round(frameBudgetMs)} ms`} tone="cyan" isDark={isDark} />
                <OverlayRow label="Consumed" count={`${Math.round(consumedMs)} ms`} tone={consumedMs <= frameBudgetMs ? "emerald" : "rose"} isDark={isDark} />
                <OverlayRow label="Cache Size" count={currentFrameMetrics?.frameCacheMetrics?.cacheSize || 0} tone="amber" isDark={isDark} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/80"}`}>
            <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}><Activity size={14} /> Scrubber State</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Chip label="Cursor" value={cursorIndex} isDark={isDark} />
              <Chip label="Speed" value={`${playbackSpeed}x`} isDark={isDark} />
              <Chip label="Visible" value={currentViewportProjection?.frame?.timeline?.length || 0} isDark={isDark} />
              <Chip label="Budget OK" value={consumedMs <= frameBudgetMs ? "yes" : "no"} isDark={isDark} />
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <OverlayRow label="Seeking" count={`${Math.round(viewportRange.start)}ms`} tone="cyan" isDark={isDark} />
              <OverlayRow label="Comparison" count={comparisonMode ? "on" : "off"} tone={comparisonMode ? "violet" : "slate"} isDark={isDark} />
              <OverlayRow label="Worker path" count="compatible" tone="emerald" isDark={isDark} />
            </div>
          </div>

          {comparisonMode && comparisonReplay ? (
            <div className={`rounded-2xl border p-4 ${isDark ? "border-violet-400/20 bg-violet-500/5" : "border-violet-200 bg-violet-50/80"}`}>
              <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-violet-100" : "text-violet-700"}`}><GitCompareArrows size={14} /> Replay Comparison</div>
              <div className="mt-3 grid gap-2 text-sm">
                <OverlayRow label="Timeline delta" count={comparisonDiff?.timelineDelta || 0} tone="violet" isDark={isDark} />
                <OverlayRow label="Correction delta" count={comparisonDiff?.correctionDelta || 0} tone="rose" isDark={isDark} />
                <OverlayRow label="Marker delta" count={comparisonDiff?.markerDelta || 0} tone="amber" isDark={isDark} />
                <OverlayRow label="Pacing delta" count={comparisonDiff?.pacingDelta || 0} tone="cyan" isDark={isDark} />
              </div>
              <div className="mt-4 max-h-[180px] overflow-auto rounded-xl border border-violet-400/10 bg-black/5 p-3">
                <p className={`text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Comparison viewport</p>
                <div role="list" aria-label="Comparison replay events" className="mt-2 space-y-1.5">
                  {comparisonViewportProjection && comparisonVisibleEvents.length === 0 ? (
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>No comparison events visible.</p>
                  ) : comparisonVisibleEvents.map((event, index) => (
                    <TimelineBar key={`cmp-${event.type}-${event.t}-${index}`} event={event} index={index} total={comparisonVisibleEvents.length} isDark={isDark} />
                  ))}
                  {!comparisonViewportProjection ? (
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Comparison data is available, but no viewport projection was produced for the current slice.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/80"}`}>
            <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}><Layers3 size={14} /> Scheduler / Sync</div>
            <div className="mt-3 grid gap-2 text-sm">
              <OverlayRow label="Executed" count={schedulerMetrics?.executed?.length || 0} tone="cyan" isDark={isDark} />
              <OverlayRow label="Overflow" count={schedulerMetrics?.overflow?.length || 0} tone="amber" isDark={isDark} />
              <OverlayRow label="Frame hash" count={syncContract?.frameHash ? syncContract.frameHash.slice(0, 8) : "none"} tone="violet" isDark={isDark} />
              <OverlayRow label="Sync token" count={syncContract?.syncToken ? syncContract.syncToken.slice(0, 8) : "none"} tone="rose" isDark={isDark} />
            </div>
            <div className={`mt-3 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>All render outputs are frozen snapshots. Viewport changes only reproject immutable replay data.</div>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-700/60 bg-slate-950/55" : "border-slate-200 bg-white/80"}`}>
            <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}><Gauge size={14} /> Overlay Summary</div>
            <div className="mt-3 grid gap-2 text-sm">
              <OverlayRow label="Ghost" count={overlayCounts.ghost} tone="cyan" isDark={isDark} />
              <OverlayRow label="Corrections" count={overlayCounts.corrections} tone="rose" isDark={isDark} />
              <OverlayRow label="Heatmap" count={overlayCounts.heatmap} tone="amber" isDark={isDark} />
              <OverlayRow label="Pacing" count={overlayCounts.pacing} tone="violet" isDark={isDark} />
              <OverlayRow label="Density" count={overlayCounts.density} tone="slate" isDark={isDark} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ReplayVisualizationPanel);