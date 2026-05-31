import { computeGhostProjection } from '../ghostProjectionEngine.js'
import shortF from './fixtures/short.json'
import memoryF from './fixtures/memory.json'

test('ghost projection structure and immutability', ()=>{
  const p = computeGhostProjection(shortF)
  expect(p.progress).toBeDefined()
  expect(p.wpm).toBeDefined()
  expect(Object.isFrozen(p)).toBe(true)
})

test('ghost computes pacing and confidence', ()=>{
  const p = computeGhostProjection(memoryF)
  expect(p.pacing.length).toBeGreaterThan(0)
  expect(p.confidence.length).toBeGreaterThan(0)
})
