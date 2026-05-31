// Replay analytics: deterministic, pure, post-session analyses

export function rhythmSegmentation(timeline){
  // segment by inter-event time thresholds
  const segs = []
  let cur = null
  for (let i=0;i<timeline.length;i++){
    const e = timeline[i]
    const prev = timeline[i-1]
    const dt = prev ? e.t - prev.t : 0
    if (!cur || dt>1000){ cur = { start:e.t, events:[e] }; segs.push(cur) } else { cur.events.push(e) }
  }
  return segs.map(s=>({ start: s.start, length: s.events.length }))
}

export function pauseClustering(pauses){
  // cluster pauses within 500ms
  const clusters = []
  for (const p of pauses){
    const last = clusters[clusters.length-1]
    if (last && p.start - last.end <= 500){ last.end = p.start + p.duration; last.count++ } else { clusters.push({ start: p.start, end: p.start + p.duration, count:1 }) }
  }
  return clusters
}

export function burstPhaseClassification(timeline){
  // classify bursts where >3 inputs within 300ms
  const bursts = []
  for (let i=0;i<timeline.length;i++){
    const win = timeline.slice(i,i+3)
    if (win.length===3 && win[2].t - win[0].t <= 300 && win.every(e=>e.type==='input')) bursts.push({ start: win[0].t, end: win[2].t })
  }
  return bursts
}

export function recoveryAfterError(timeline){
  // find corrections followed by 3 inputs
  const recs = []
  for (let i=0;i<timeline.length;i++){
    if (timeline[i].type==='correction'){
      const next = timeline.slice(i+1,i+4)
      if (next.length>=3 && next.every(e=>e.type==='input')) recs.push({ t: timeline[i].t, recoveryTime: next[next.length-1].t - timeline[i].t })
    }
  }
  return recs
}

export function fatigueTrendWindows(timeline){
  // sliding windows of 10 events: average inter-event time
  const res = []
  for (let i=0;i+9<timeline.length;i+=5){
    const win = timeline.slice(i,i+10)
    const dts = []
    for (let j=1;j<win.length;j++) dts.push(win[j].t - win[j-1].t)
    const avg = dts.reduce((a,b)=>a+b,0)/Math.max(1,dts.length)
    res.push({ start: win[0].t, end: win[win.length-1].t, avgInter: avg })
  }
  return res
}

export function correctionCascades(timeline){
  const cascades = []
  for (let i=0;i<timeline.length;i++){
    if (timeline[i].type==='correction'){
      let len = 1
      for (let j=i+1;j<timeline.length && timeline[j].type==='correction' && timeline[j].t - timeline[j-1].t<500;j++) len++
      if (len>1) cascades.push({ t: timeline[i].t, length: len })
    }
  }
  return cascades
}

export function volatilityBands(timeline){
  // compute simple volatility as variance of inter-event times per 20-event band
  const bands = []
  for (let i=0;i+19<timeline.length;i+=10){
    const win = timeline.slice(i,i+20)
    const dts = []
    for (let j=1;j<win.length;j++) dts.push(win[j].t - win[j-1].t)
    const mean = dts.reduce((a,b)=>a+b,0)/dts.length
    const varr = dts.reduce((a,b)=>a+(b-mean)*(b-mean),0)/dts.length
    bands.push({ start: win[0].t, end: win[win.length-1].t, volatility: varr })
  }
  return bands
}

export function confidenceDecayEstimation(confidenceWindows){
  // estimate linear decay slope
  if (!confidenceWindows || confidenceWindows.length<2) return { slope: 0 }
  const n = confidenceWindows.length
  const xsum = confidenceWindows.reduce((a,b,i)=>a+i,0)
  const ysum = confidenceWindows.reduce((a,b)=>a+b.confidence,0)
  const xmean = xsum/n
  const ymean = ysum/n
  let num=0, den=0
  for (let i=0;i<n;i++){ num += (i-xmean)*(confidenceWindows[i].confidence-ymean); den += (i-xmean)*(i-xmean) }
  return { slope: den===0?0: num/den }
}

export default {
  rhythmSegmentation, pauseClustering, burstPhaseClassification, recoveryAfterError,
  fatigueTrendWindows, correctionCascades, volatilityBands, confidenceDecayEstimation
}
