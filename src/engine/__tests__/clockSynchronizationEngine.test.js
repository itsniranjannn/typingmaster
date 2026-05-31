import { describe, expect, it } from "vitest"
import { createClockSynchronizationEngine } from "../clockSynchronizationEngine"

describe("clockSynchronizationEngine", () => {
  it("estimates offset, latency, RTT, and corrected countdown deterministically", () => {
    const clock = createClockSynchronizationEngine({ maxSamples: 8, smoothing: 0.5, driftToleranceMs: 16 })

    const a = clock.observe({ serverTs: 1000, clientTs: 950, rttMs: 80 })
    const b = clock.observe({ serverTs: 1400, clientTs: 1355, rttMs: 90 })
    const countdown = clock.synchronizeCountdown({ remainingMs: 3000 }, { serverTs: 1800, clientTs: 1760, rttMs: 100 })

    expect(a.offsetMs).toBeGreaterThan(0)
    expect(b.sampleCount).toBe(2)
    expect(countdown.remainingMs).toBeLessThan(3000)
    expect(clock.getSnapshot().estimate.sampleCount).toBe(3)
    expect(Object.isFrozen(clock.getSnapshot())).toBe(true)
  })
})