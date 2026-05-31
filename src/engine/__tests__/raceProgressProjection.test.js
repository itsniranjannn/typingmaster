import { describe, expect, it } from "vitest"
import { projectRaceProgress } from "../raceProgressProjection"

describe("raceProgressProjection", () => {
  it("derives placement, leader distance, and completion probability", () => {
    const projection = projectRaceProgress({
      state: "RUNNING",
      participants: [
        { id: "p1", state: { wordsCompleted: 40, totalWords: 50, wpm: 95, accuracy: 98 } },
        { id: "p2", state: { wordsCompleted: 32, totalWords: 50, wpm: 86, accuracy: 94 } },
        { id: "p3", state: { wordsCompleted: 45, totalWords: 50, wpm: 102, accuracy: 97 } }
      ]
    })

    expect(projection.leaderId).toBe("p3")
    expect(projection.placements[0].placement).toBe(1)
    expect(projection.placements[1].distanceFromLeader).toBeGreaterThanOrEqual(0)
    expect(projection.placements[2].completionProbability).toBeGreaterThanOrEqual(0)
    expect(Object.isFrozen(projection)).toBe(true)
  })
})