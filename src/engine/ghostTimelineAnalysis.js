// Ghost timeline analysis helpers — pure deterministic functions

export function normalizeTimeline(events){
  return (events||[]).map((e,i)=>({ idx:i, t: e.t==null?i:e.t, type:e.type, payload:e.payload||e }))
}

export function computeProgressCurve(timeline){
  const out = timeline.map((e,idx)=>({ t: e.t, progress: (idx+1)/timeline.length }))
  return out
}

export function computeWpmCurve(timeline){
  // naive: count 'input' events per 60s window
  const points = []
  for (let i=0;i<timeline.length;i++){
    const t = timeline[i].t
    const windowStart = t - 60000
    const count = timeline.filter(ev=>ev.type==='input' && ev.t>windowStart && ev.t<=t).length
    const wpm = Math.round((count/5) * (60000/Math.max(1, t - (timeline[0]?timeline[0].t:0))))
    points.push({ t, wpm })
  }
  return points
}

export function computePacingWindows(timeline){
  // windows of 5 events
  const w = 5
  const res = []
  for (let i=0;i<timeline.length;i+=w){
    const slice = timeline.slice(i,i+w)
    res.push({ start: slice[0]?slice[0].t:0, end: slice[slice.length-1]?slice[slice.length-1].t:0, count: slice.length })
  }
  return res
}

export function computeCorrectionDensity(timeline){
  const perWindow = computePacingWindows(timeline)
  return perWindow.map(w=>({ start:w.start, end:w.end, corrections: timeline.filter(ev=>ev.type==='correction' && ev.t>=w.start && ev.t<=w.end).length }))
}

export function computeConfidenceWindows(timeline){
  return timeline.map(e=>({ t:e.t, confidence: e.type==='input'?0.9:0.5 }))
}

export function computeCheckpoints(timeline){
  return timeline.filter(e=>e.type==='checkpoint').map(e=>({ t:e.t, label:e.payload.label }))
}

export function computeDeterministicMarkers(timeline){
  // deterministic sample markers every Nth event
  const step = Math.max(1, Math.floor(timeline.length/10))
  const markers = []
  for (let i=0;i<timeline.length;i+=step) markers.push({ idx:i, t:timeline[i].t })
  return markers
}

export default { normalizeTimeline }
