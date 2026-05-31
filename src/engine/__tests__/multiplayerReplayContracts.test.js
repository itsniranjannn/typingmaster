import { describe, expect, it } from "vitest"
import { buildParticipantTimelines, buildSpectatorTimelines, createMultiplayerReplayEnvelope, isBackwardCompatibleReplayEnvelope } from "../multiplayerReplayContracts"

describe("multiplayerReplayContracts", () => {
  it("extends replay export while preserving backward compatibility", () => {
    const replay = {
      id: "session-1",
      meta: { mode: "time" },
      config: { maxEvents: 2048 },
      metrics: { eventCount: 10 },
      flushedBatches: [],
      events: [{ type: "input", t: 1 }]
    }
    const envelope = createMultiplayerReplayEnvelope(replay, {
      roomId: "room-1",
      raceState: "RUNNING",
      participantTimelines: buildParticipantTimelines([{ id: "p1", sequence: 1, serverTs: 100 }]),
      spectatorTimelines: buildSpectatorTimelines([{ id: "s1", sequence: 1, serverTs: 110, lagMs: 20 }]),
      raceCheckpoints: [{ sequence: 1, participantId: "p1", ts: 100 }]
    })

    const compatibility = isBackwardCompatibleReplayEnvelope(envelope)
    expect(compatibility.compatible).toBe(true)
    expect(envelope.multiplayer.roomId).toBe("room-1")
    expect(Object.isFrozen(envelope)).toBe(true)
  })
})