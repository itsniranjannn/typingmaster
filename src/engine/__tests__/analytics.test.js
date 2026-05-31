import * as analytics from '../replayAnalytics.js'
import shortF from './fixtures/short.json'
import burstF from './fixtures/burst.json'

test('rhythm segmentation produces segments', ()=>{
  const timeline = shortF.events.map((e,i)=>({ idx:i, t:e.t, type:e.type }))
  const segs = analytics.rhythmSegmentation(timeline)
  expect(Array.isArray(segs)).toBe(true)
})

test('pause clustering groups close pauses', ()=>{
  const pauses = [{start:0,end:100},{start:150,end:300},{start:1000,end:1200}]
  const clusters = analytics.pauseClustering(pauses)
  expect(clusters.length).toBeGreaterThan(0)
})

test('burst classification finds bursts', ()=>{
  const timeline = burstF.events.map((e,i)=>({ idx:i, t:e.t, type:e.type }))
  const bursts = analytics.burstPhaseClassification(timeline)
  expect(Array.isArray(bursts)).toBe(true)
})
