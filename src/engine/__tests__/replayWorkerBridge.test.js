import { createReplayWorkerBridge } from "../replayWorkerBridge"
import { executeReplayTask } from "../replayWorkerRuntime"
import { makeLongSession, makeBurstHeavySession, makeCorrectionHeavySession } from "./stressFixtures"

test("worker runtime project task deterministic", () => {
  const replay = makeBurstHeavySession(200)
  const m1 = executeReplayTask({ taskId: "a", op: "project", payload: { replay } })
  const m2 = executeReplayTask({ taskId: "b", op: "project", payload: { replay } })
  expect(m1.replayHash).toBe(m2.replayHash)
  expect(m1.consumer.timelineLength).toBe(m2.consumer.timelineLength)
})

test("bridge sync fallback works when workers unavailable", async () => {
  const bridge = createReplayWorkerBridge({ forceSync: true })
  const replay = makeCorrectionHeavySession(120)
  const { promise } = bridge.submit({ op: "project", payload: { replay } })
  const result = await promise
  expect(result.ok).toBe(true)
  expect(bridge.isSyncFallback()).toBe(true)
})

test("bounded queue and cancellation", async () => {
  const bridge = createReplayWorkerBridge({ forceSync: true, maxQueue: 2 })
  const replay = makeBurstHeavySession(50)
  const t1 = bridge.submit({ taskId: "t1", op: "project", payload: { replay } })
  const t2 = bridge.submit({ taskId: "t2", op: "project", payload: { replay } })
  const t3 = bridge.submit({ taskId: "t3", op: "project", payload: { replay } })
  bridge.cancel("t2")
  const r1 = await t1.promise
  expect(r1.ok).toBe(true)
  await expect(t2.promise).rejects.toThrow()
  const r3 = await t3.promise
  expect(r3.ok).toBe(true)
})

test("large session stress task returns profiling", async () => {
  const bridge = createReplayWorkerBridge({ forceSync: true })
  const replay = makeLongSession(4000)
  const { promise } = bridge.submit({ op: "project", payload: { replay } })
  const result = await promise
  expect(result.profile.workerMs).toBeGreaterThanOrEqual(0)
  expect(result.profile.estimatedMemoryBytes).toBeGreaterThan(0)
  expect(result.consumer.timelineLength).toBeGreaterThan(1000)
})
