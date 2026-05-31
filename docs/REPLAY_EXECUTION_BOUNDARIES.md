# Replay Execution Boundaries

## Ownership

- Authoritative runtime ownership: typing authority remains in `useTypingTest` and existing gameplay engines.
- Playback ownership: deterministic event reconstruction in playback engines only.
- Replay consumer ownership: read-only immutable selectors over replay/projection state.
- Ghost ownership: derived timeline projections only, no gameplay authority.
- Replay stream ownership: chunk assembly and bounded window maintenance for replay data only.

## Worker Boundaries

- Worker execution computes replay consumer + ghost projections off-thread via deterministic task contract.
- Task queue is bounded and cancellable.
- If workers are unavailable or fail, bridge falls back to sync runtime deterministically.
- Worker outputs are immutable and hash-verified.

## Deterministic Guarantees

- Stable replay hashing (`stableHash`) and deterministic key ordering (`stableStringify`).
- Frozen outputs for consumer snapshots, ghost projections, and viewport frames.
- Bounded memory windows in chunk assembler and stream adapters.
- No mutation of authoritative gameplay state.

## Replay-View Adapter Boundaries

- Provides viewport-only slices and frame projections.
- No rendering dependencies.
- No React state mutation.
- No gameplay-thread mutation.

## Replay Rendering Boundaries

- Deterministic render orchestration composes stream, view, sync, and profiling layers only.
- Frame-budget scheduling is observational and local to replay rendering state.
- Spectator synchronization contracts are derived from replay hashes, viewport bounds, and frozen projections.
- Render orchestration does not change typing authority, timing authority, focus behavior, or network state.

## Future Integration

- Replay UI may consume only replay-view adapter outputs.
- Spectator/multiplayer layers should ingest deterministic replay streams without modifying gameplay authority.
- Networking and real-time sync are out of scope for this layer.
