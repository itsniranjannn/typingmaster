export function makeLongSession(count = 12000) {
  const events = []
  let t = 0
  for (let i = 0; i < count; i += 1) {
    if (i % 180 === 0 && i > 0) {
      events.push({ type: "pause", t, payload: { duration: 1200 } })
      t += 1200
    }
    if (i % 41 === 0 && i > 0) {
      events.push({ type: "correction", t, payload: { index: i } })
    } else {
      events.push({ type: "input", t })
    }
    t += 45
  }
  return { events }
}

export function makeBurstHeavySession(count = 5000) {
  const events = []
  let t = 0
  for (let i = 0; i < count; i += 1) {
    events.push({ type: "input", t })
    t += (i % 7 < 4) ? 20 : 180
  }
  return { events }
}

export function makeCorrectionHeavySession(count = 3000) {
  const events = []
  let t = 0
  for (let i = 0; i < count; i += 1) {
    events.push({ type: "input", t })
    if (i % 3 === 0) events.push({ type: "correction", t: t + 15, payload: { index: i } })
    t += 90
  }
  return { events }
}

export function makeHugeSession(count = 50000) {
  const events = []
  let t = 0
  for (let i = 0; i < count; i += 1) {
    events.push({ type: i % 17 === 0 ? "correction" : i % 29 === 0 ? "marker" : "input", t, payload: { index: i, label: `event-${i}` } })
    t += i % 11 === 0 ? 12 : 24
  }
  return { events }
}
