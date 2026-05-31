# Transport Architecture

## Summary

The multiplayer stack now has two interchangeable transport backends:

- `createTransportAdapter(...)` for the existing deterministic local path.
- `createWebSocketTransport(...)` for the production WebSocket path.

Both expose the same adapter-style packet API, so the room manager, replay envelope, spectator bridge, integrity bridge, and sync engine do not need gameplay changes.

## Contract Surface

- Packet schema stays in `src/engine/transportContracts.js`.
- Frame serialization lives in `src/engine/transportCodec.js`.
- WebSocket lifecycle is handled by `src/engine/websocketTransport.js`.
- Session wiring chooses the WebSocket backend only when a transport URL or endpoint is provided.

Preserved guarantees:

- Deterministic packet ordering through the adapter queue and router.
- Frozen snapshots at every boundary.
- Backward-compatible replay and spectator envelopes.
- Local fallback when no WebSocket implementation or endpoint is available.

## Rollback Strategy

Rollback is low risk because the WebSocket layer is additive.

1. Remove the WebSocket transport from the runtime options.
2. The session runtime falls back to the existing deterministic local adapter.
3. No replay schema, spectator schema, or gameplay authority changes are required.

If a protocol issue appears in production, the packet codec can be disabled independently while leaving the room/session logic intact.

## Performance Implications

- Packet serialization adds a small JSON encoding cost on the wire path.
- Heartbeat and reconnect state add bounded metadata, not unbounded history.
- The local adapter queue still provides ordering and backpressure, so replay determinism remains stable under packet bursts.
- Duplicate packet checks and protocol validation are O(1) per frame.

The WebSocket path is intentionally thin: it transports packets and connection state, while deterministic simulation, replay reconstruction, and spectator sync still live in the existing engine layers.
