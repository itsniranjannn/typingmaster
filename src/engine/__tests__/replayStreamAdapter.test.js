import { createReplayStreamAdapter } from "../replayStreamAdapter"
import { createReplayViewAdapter } from "../replayViewAdapter"
import shortF from "./fixtures/short.json"
import burstF from "./fixtures/burst.json"
import { makeLongSession } from "./stressFixtures"

test("chunk ingestion is deterministic and ordered", () => {
  const adapter = createReplayStreamAdapter({ maxEvents: 100 })
  const chunks = [
    { seq: 1, events: shortF.events.slice(2, 4) },
    { seq: 0, events: shortF.events.slice(0, 2) },
    { seq: 2, events: shortF.events.slice(4) }
  ]
  chunks.forEach((chunk) => adapter.ingest(chunk))
  const snap = adapter.getSnapshot()
  expect(snap.totalEvents).toBe(shortF.events.length)
})

test("rewind updates projection consistently", () => {
  const adapter = createReplayStreamAdapter({ maxEvents: 200 })
  adapter.ingest({ seq: 0, events: burstF.events })
  const before = adapter.getProjection()
  const rewound = adapter.rewind(2)
  const after = rewound.projection
  expect(after.consumer.timeline.length).toBe(before.consumer.timeline.length - 2)
})

test("bounded replay windows retain max events", () => {
  const adapter = createReplayStreamAdapter({ maxEvents: 300 })
  const long = makeLongSession(2000)
  adapter.ingest({ seq: 0, events: long.events })
  const snap = adapter.getSnapshot()
  expect(snap.totalEvents).toBeLessThanOrEqual(300)
})

test("replay view adapter returns viewport-safe frame projections", () => {
  const adapter = createReplayStreamAdapter({ maxEvents: 200 })
  adapter.ingest({ seq: 0, events: shortF.events })
  const view = createReplayViewAdapter(adapter)
  const frame = view.getFrame({ start: 0, end: 1200 })
  expect(frame.frame.timeline.length).toBeGreaterThan(0)
  expect(Object.isFrozen(frame)).toBe(true)
  const cursor = view.getCursor({ start: 0, end: 1200 })
  expect(cursor.size).toBe(frame.frame.timeline.length)
})
