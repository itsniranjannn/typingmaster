import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const completionProbability = (progressRatio, wpm, accuracy) => {
  const normalizedWpm = Math.min(1, Math.max(0, safeNumber(wpm) / 180))
  const normalizedAccuracy = Math.min(1, Math.max(0, safeNumber(accuracy) / 100))
  return Number(Math.min(1, Math.max(0, progressRatio * 0.55 + normalizedWpm * 0.25 + normalizedAccuracy * 0.2)).toFixed(3))
}

export function projectRaceProgress(snapshot = {}) {
  const participants = Array.isArray(snapshot.participants) ? snapshot.participants : []
  const normalized = participants.map((participant) => {
    const totalWords = Math.max(1, Number(participant?.state?.totalWords) || 1)
    const wordsCompleted = Math.max(0, Number(participant?.state?.wordsCompleted) || 0)
    const progressRatio = Number(Math.min(1, wordsCompleted / totalWords).toFixed(4))
    const wpm = Math.max(0, safeNumber(participant?.state?.wpm, 0))
    const accuracy = Math.max(0, Math.min(100, safeNumber(participant?.state?.accuracy, 0)))
    const remainingWords = Math.max(0, totalWords - wordsCompleted)
    return freezeDeep({
      participantId: participant?.id || null,
      wordsCompleted,
      totalWords,
      progressRatio,
      wpm,
      accuracy,
      remainingWords,
      finishTs: Number.isFinite(Number(participant?.state?.finishTs)) ? Number(participant.state.finishTs) : Number.POSITIVE_INFINITY,
      completionProbability: completionProbability(progressRatio, wpm, accuracy)
    })
  })

  const ordered = normalized.slice().sort((left, right) => right.progressRatio - left.progressRatio || left.remainingWords - right.remainingWords || right.wpm - left.wpm || left.participantId.localeCompare(right.participantId))
  const leaderProgress = ordered[0]?.progressRatio || 0
  const projected = ordered.map((entry, index) => freezeDeep({
    ...entry,
    placement: index + 1,
    distanceFromLeader: Number((leaderProgress - entry.progressRatio).toFixed(4)),
    gapAnalysis: freezeDeep({
      behindByWords: Math.max(0, entry.remainingWords - (ordered[0]?.remainingWords || 0)),
      leaderDeltaWpm: Number(((ordered[0]?.wpm || 0) - entry.wpm).toFixed(3))
    })
  }))

  return freezeDeep({
    raceState: typeof snapshot.state === "string" ? snapshot.state : "CREATED",
    participantCount: projected.length,
    leaderId: projected[0]?.participantId || null,
    placements: projected,
    projectionHash: stableHash(projected)
  })
}

export default { projectRaceProgress }