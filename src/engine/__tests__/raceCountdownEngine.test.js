import { describe, expect, it } from "vitest"
import { createRaceCountdownEngine } from "../raceCountdownEngine"

describe("raceCountdownEngine", () => {
  it("tracks countdown with deterministic drift correction", () => {
    const engine = createRaceCountdownEngine({ durationMs: 3000, checkpointEveryMs: 200, driftToleranceMs: 10 })
    engine.start(1000, 3000)

    const tickA = engine.tick({ serverTs: 1200, clientTs: 1230 })
    const tickB = engine.tick({ serverTs: 2200, clientTs: 2225 })

    expect(tickA.countdown.phase).toBe("running")
    expect(tickB.countdown.remainingMs).toBeLessThan(tickA.countdown.remainingMs)
    expect(engine.getReplayCompatibleSnapshot().spectatorCompatible).toBe(true)
    expect(Object.isFrozen(engine.getReplayCompatibleSnapshot())).toBe(true)
  })
})