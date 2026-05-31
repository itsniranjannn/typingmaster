# Replay Render Runtime

## Replay Render Runtime

- The render runtime turns deterministic replay timelines into frozen render frames.
- It owns frame reconstruction, viewport diffs, cache boundaries, interpolation, batching, and density-aware degradation.
- It never mutates typing authority or live gameplay state.

## Scene Graph Model

- Each frame is represented as a replay scene graph with ordered layers.
- The default layer order is background, viewport, timeline, ghost, correction, pacing, density, and metrics.
- Scene graph nodes are immutable and deterministic for repeated execution.

## Canvas / WebGL Abstraction

- The canvas adapter projects render frames into deterministic draw commands.
- WebGL support is treated as a compatibility boundary, not a gameplay dependency.
- Adapter contracts remain rendering-agnostic so future backends can reuse the same frame model.

## Spectator Presentation Lifecycle

- Spectator presentation composes multi-ghost replay projections, ranking overlays, race progress, split markers, and correction comparisons.
- Presentation is read-only, local-only, and aligned to replay hashes.
- Prediction is disabled; reconciliation is bounded and deterministic.

## Replay Interaction Runtime

- Scrub, seek, rewind, fast-forward, marker navigation, and bookmarks are deterministic state transitions.
- Playback speed projections are observational only.
- Bounded interpolation windows keep seeking frame-stable.

## Render Determinism Guarantees

- Frame hashes, draw ordering, and render invalidation are deterministic across repeated execution.
- Frame caches are bounded and evicted deterministically.
- Rendering output is frozen before it leaves the runtime.

## Render Integrity Verification

- Render parity checks compare frame hashes, viewport reconstruction, command ordering, and frame snapshots.
- Corruption classification remains bounded and informational.
- Repair suggestions are non-authoritative and never mutate gameplay state.

## Future Multiplayer Spectator Path

- Multiplayer support is contract-driven first, transport later.
- Replay merge boundaries, synchronized ghost playback, and spectator-safe projections are already isolated from gameplay authority.
- A future live spectator UI can consume these outputs without reworking the replay model.
