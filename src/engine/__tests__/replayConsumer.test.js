import { createReplayConsumer } from '../replayConsumer.js'
import fixtures from './fixtures/short.json'
import longF from './fixtures/long.json'
import burstF from './fixtures/burst.json'
import corrF from './fixtures/correction-heavy.json'
import arenaF from './fixtures/arena.json'

test('consumer exposes snapshot and verification', ()=>{
  const c = createReplayConsumer(fixtures)
  const s = c.getSnapshot()
  expect(s.timeline.length).toBe(6)
  const v = c.getVerification()
  expect(v.length).toBe(6)
  expect(typeof v.hash).toBe('string')
})

test('repeated reads deterministic and frozen', ()=>{
  const c = createReplayConsumer(longF)
  const s1 = c.getSnapshot()
  const s2 = c.getSnapshot()
  expect(s1).toEqual(s2)
  expect(Object.isFrozen(s1)).toBe(true)
  expect(Object.isFrozen(s1.timeline)).toBe(true)
})

test('pause and correction spans available', ()=>{
  const c = createReplayConsumer(fixtures)
  expect(c.getPauseSpans().length).toBe(1)
  expect(c.getCorrectionSpans().length).toBe(1)
})

test('advance and reset behavior', ()=>{
  const c = createReplayConsumer(burstF)
  const p = c.advanceTo(2)
  expect(p).not.toBeNull()
  c.reset()
  expect(c.getTimelineProgress().length).toBe(7)
})

test('consumer supports bounded subscriptions', ()=>{
  const c = createReplayConsumer(corrF,{ maxListeners:2 })
  const a = ()=>{}; const b=()=>{}
  const u1 = c.subscribe(a)
  const u2 = c.subscribe(b)
  expect(()=>c.subscribe(()=>{})).toThrow()
  u1(); u2()
})

test('divergence summaries present', ()=>{
  const c = createReplayConsumer(arenaF)
  expect(c.getDivergenceSummaries().length).toBe(1)
})
