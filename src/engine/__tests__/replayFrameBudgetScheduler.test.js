import { describe, expect, it } from "vitest"
import { createReplayFrameBudgetScheduler } from "../replayFrameBudgetScheduler"

describe("replayFrameBudgetScheduler", () => {
  it("runs tasks deterministically and records budget overflow", () => {
    const scheduler = createReplayFrameBudgetScheduler({ frameBudgetMs: 5 })
    const frame = scheduler.runFrame([
      { id: "b", label: "beta", priority: 1, costMs: 2, run: () => "beta" },
      { id: "a", label: "alpha", priority: 0, costMs: 3, run: () => "alpha" },
      { id: "c", label: "gamma", priority: 2, costMs: 2, run: () => "gamma" }
    ])

    expect(frame.executed.map((entry) => entry.id)).toEqual(["a", "b", "c"])
    expect(frame.withinBudget).toBe(false)
    expect(frame.overflow.length).toBe(1)
    expect(frame.overflow[0].id).toBe("c")
    expect(Object.isFrozen(frame)).toBe(true)
  })
})