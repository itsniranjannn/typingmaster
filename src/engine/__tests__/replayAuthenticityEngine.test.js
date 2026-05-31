import { describe, expect, it } from "vitest"
import { createMultiplayerReplayEnvelope, buildParticipantTimelines, buildSpectatorTimelines } from "../multiplayerReplayContracts"
import { verifyReplayAuthenticity } from "../replayAuthenticityEngine"

describe("replayAuthenticityEngine", () => {
  it("verifies replay exports with matching chain integrity and envelope metadata", () => {
    const replay = createMultiplayerReplayEnvelope({
      id: "replay-1",
      meta: { source: "unit" },
      config: { mode: "ranked" },
      metrics: { eventCount: 2 },
      flushedBatches: [],
      events: [
        { sequence: 1, ts: 10, type: "key", payload: { key: "a" } },
        { sequence: 2, ts: 20, type: "key", payload: { key: "b" } }
      ]
    }, {
      roomId: "room-1",
      raceState: "RUNNING",
      participantTimelines: buildParticipantTimelines([{ id: "p-1", sequence: 1, serverTs: 10, state: { finished: false } }]),
      spectatorTimelines: buildSpectatorTimelines([{ id: "s-1", sequence: 1, serverTs: 10, focusParticipantId: "p-1" }]),
      raceCheckpoints: [{ sequence: 1, participantId: "p-1", ts: 10, checkpointHash: "cp-1" }],
      transportMetadata: { transportId: "authority-server" }
    })

    const report = verifyReplayAuthenticity({
      replay,
      participants: [{ id: "p-1" }],
      checkpoints: [{ sequence: 1, participantId: "p-1", ts: 10, checkpointHash: "cp-1" }],
      synchronization: [{ sequence: 1, ts: 10 }, { sequence: 2, ts: 20 }]
    })

    expect(report.valid).toBe(true)
    expect(report.authenticityScore).toBeGreaterThan(80)
    expect(report.verificationReport.packetChainIntegrity.valid).toBe(true)
    expect(Object.isFrozen(report)).toBe(true)
  })

  it("flags broken sequence continuity and participant inconsistency", () => {
    const report = verifyReplayAuthenticity({
      replay: {
        id: "replay-2",
        meta: {},
        config: {},
        metrics: {},
        flushedBatches: [],
        events: [
          { sequence: 1, ts: 30, type: "key", payload: {} },
          { sequence: 3, ts: 25, type: "key", payload: {} }
        ]
      },
      participants: [{ id: "p-1" }, { id: "p-1" }],
      checkpoints: [{ sequence: 1, participantId: "p-1", ts: 10, checkpointHash: "cp-1" }]
    })

    expect(report.valid).toBe(false)
    expect(report.verificationReport.packetChainIntegrity.valid).toBe(false)
    expect(report.verificationReport.participantConsistency).toBe(false)
  })
})
