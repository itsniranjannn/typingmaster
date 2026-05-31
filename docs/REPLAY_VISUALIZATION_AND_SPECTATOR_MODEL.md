# Replay Visualization And Spectator Model

## Spectator Authority Model

- Gameplay authority remains local to the typing runtime.
- Spectator state is read-only and derived from replay exports, replay hashes, and frozen projections.
- Prediction is disabled in spectator mode; all updates are reconciliation-only.

## Replay Visualization Pipeline

- Replay events are normalized into deterministic timelines.
- Visualization core stages include virtualization, frame reconstruction, viewport diffing, marker clustering, correction heatmaps, pacing data, and density bucketing.
- Viewport summaries are adaptive, bounded, and fully immutable.

## Synchronization Lifecycle

- Remote spectator packets carry sequence, viewport, latency, and hash metadata only.
- Sync windows are bounded and replay-only.
- Snapshot reconciliation compares packet state to replay-derived frames and records desync classifications deterministically.

## Replay Merge Contracts

- Multi-replay composition is local-only and ordered by deterministic replay data.
- Merge boundaries expose hashes, counts, and latency metadata without leaking gameplay authority.
- Finish-order validation is derived from replay timestamps and stable hash ordering.

## Integrity Verification Model

- Fingerprints, checkpoint trees, mismatch summaries, and audit reports are derived from replay and spectator projections.
- Corruption classification is deterministic and bounded.
- Repair suggestions remain informational and never mutate authoritative state.

## Anti-Tamper Boundaries

- Anti-tamper hooks are verification-only.
- Replay hash validation is required for spectator synchronization.
- No hidden caches, no nondeterministic repair, and no prediction-based correction are allowed.

## Deterministic Scheduling Policy

- Visualization scheduling is viewport-priority first, then ghost overlay, then timeline chunk work.
- Frame budgets are bounded and degrade gracefully under high density.
- Render ordering is deterministic across repeated execution.

## Future Multiplayer Migration Path

- The current layer is multiplayer-ready only at the contract level.
- Real networking, live authority transfer, and speculative gameplay remain out of scope.
- This model is intended to make a future spectator UI and sync transport straightforward without rewriting replay semantics.
