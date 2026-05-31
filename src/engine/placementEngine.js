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

export function validateFinish(participant, finish = {}) {
  const reasons = []
  const participantId = typeof finish.participantId === "string" ? finish.participantId : typeof participant?.id === "string" ? participant.id : null
  const finishTs = Math.max(0, Number(finish.finishTs) || 0)
  const elapsedMs = Math.max(0, Number(finish.elapsedMs) || 0)
  const wordsCompleted = Math.max(0, Number(finish.wordsCompleted ?? participant?.state?.wordsCompleted) || 0)
  const totalWords = Math.max(1, Number(finish.totalWords ?? participant?.state?.totalWords) || 1)
  const accuracy = Math.max(0, Math.min(100, safeNumber(finish.accuracy ?? participant?.state?.accuracy, 0)))
  const wpm = Math.max(0, safeNumber(finish.wpm ?? participant?.state?.wpm, 0))
  const checkpointSeq = Math.max(0, Number(finish.checkpointSeq ?? participant?.state?.checkpointSeq) || 0)

  if (!participant || typeof participant !== "object") reasons.push("missing_participant")
  if (!participantId) reasons.push("missing_participant_id")
  if (!Number.isFinite(Number(finish.finishTs)) || finishTs < 0) reasons.push("bad_finish_ts")
  if (!Number.isFinite(Number(finish.elapsedMs)) || elapsedMs < 0) reasons.push("bad_elapsed_ms")
  if (wordsCompleted > totalWords) reasons.push("words_exceed_total")
  if (participant?.state?.finished) reasons.push("already_finished")
  if (participant?.leftAt !== null && participant?.leftAt !== undefined) reasons.push("participant_left")

  return freezeDeep({
    valid: reasons.length === 0,
    reasons,
    finish: freezeDeep({ participantId, finishTs, elapsedMs, wordsCompleted, totalWords, accuracy, wpm, checkpointSeq })
  })
}

const normalizeParticipant = (participant = {}, index = 0) => {
  const state = participant.state && typeof participant.state === "object" ? participant.state : {}
  const participantId = typeof participant.id === "string" ? participant.id : typeof participant.participantId === "string" ? participant.participantId : `participant-${index}`
  const joinOrder = Math.max(0, Number(participant.joinOrder) || index)
  const finished = Boolean(state.finished ?? participant.finished)
  const finishTs = Number.isFinite(Number(state.finishTs ?? participant.finishTs)) ? Number(state.finishTs ?? participant.finishTs) : null
  const elapsedMs = Math.max(0, safeNumber(state.elapsedMs ?? participant.elapsedMs, finishTs ?? 0))
  const totalWords = Math.max(1, safeNumber(state.totalWords ?? participant.totalWords, 1))
  const wordsCompleted = Math.max(0, safeNumber(state.wordsCompleted ?? participant.wordsCompleted, 0))
  const progressRatio = Number(Math.min(1, wordsCompleted / totalWords).toFixed(4))
  const accuracy = Math.max(0, Math.min(100, safeNumber(state.accuracy ?? participant.accuracy, 0)))
  const wpm = Math.max(0, safeNumber(state.wpm ?? participant.wpm, 0))
  const checkpointSeq = Math.max(0, safeNumber(state.checkpointSeq ?? participant.checkpointSeq, 0))
  const validation = validateFinish(participant, { participantId, finishTs: finished ? finishTs ?? 0 : 0, elapsedMs, wordsCompleted, totalWords, accuracy, wpm, checkpointSeq })

  return freezeDeep({
    participantId,
    roomId: typeof participant.roomId === "string" ? participant.roomId : null,
    joinOrder,
    finished,
    finishTs: finished ? finishTs ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY,
    elapsedMs,
    wordsCompleted,
    totalWords,
    progressRatio,
    accuracy,
    wpm,
    checkpointSeq,
    leftAt: participant.leftAt !== null && participant.leftAt !== undefined ? Number(participant.leftAt) : null,
    validation,
    tieBreakKey: stableHash({ participantId, joinOrder, finished, finishTs, elapsedMs, wordsCompleted, totalWords, progressRatio, accuracy, wpm, checkpointSeq })
  })
}

export function calculatePlacements(participants = [], options = {}) {
  const normalized = (Array.isArray(participants) ? participants : []).map((participant, index) => normalizeParticipant(participant, index))
  const filtered = typeof options.roomId === "string"
    ? normalized.filter((participant) => participant.roomId === null || participant.roomId === options.roomId)
    : normalized
  const ordered = filtered.slice().sort((left, right) => {
    if (left.finished !== right.finished) return left.finished ? -1 : 1
    if (left.finished && right.finished) {
      return left.finishTs - right.finishTs || left.elapsedMs - right.elapsedMs || left.checkpointSeq - right.checkpointSeq || left.joinOrder - right.joinOrder || left.participantId.localeCompare(right.participantId)
    }
    return right.progressRatio - left.progressRatio || right.wordsCompleted - left.wordsCompleted || right.wpm - left.wpm || left.joinOrder - right.joinOrder || left.participantId.localeCompare(right.participantId)
  })

  const placements = ordered.map((participant, index) => freezeDeep({
    placementIndex: index + 1,
    rank: index + 1,
    participantId: participant.participantId,
    roomId: participant.roomId,
    finished: participant.finished,
    finishTs: participant.finished && Number.isFinite(participant.finishTs) ? participant.finishTs : null,
    elapsedMs: participant.elapsedMs,
    wordsCompleted: participant.wordsCompleted,
    totalWords: participant.totalWords,
    progressRatio: participant.progressRatio,
    accuracy: participant.accuracy,
    wpm: participant.wpm,
    checkpointSeq: participant.checkpointSeq,
    validation: participant.validation,
    tieBreakKey: participant.tieBreakKey,
    tied: false
  }))

  const groups = placements.reduce((map, placement) => {
    const key = placement.finished
      ? `finish:${placement.finishTs}:${placement.elapsedMs}:${placement.checkpointSeq}`
      : `progress:${placement.progressRatio}:${placement.wordsCompleted}:${placement.wpm}`
    const list = map.get(key) || []
    list.push(placement)
    map.set(key, list)
    return map
  }, new Map())

  const withTies = placements.map((placement) => {
    const key = placement.finished
      ? `finish:${placement.finishTs}:${placement.elapsedMs}:${placement.checkpointSeq}`
      : `progress:${placement.progressRatio}:${placement.wordsCompleted}:${placement.wpm}`
    const tied = (groups.get(key) || []).length > 1
    return freezeDeep({ ...placement, tied })
  })

  return freezeDeep({
    placements: withTies,
    leaderId: withTies[0]?.participantId || null,
    participantCount: withTies.length,
    placementHash: stableHash(withTies)
  })
}

export function createPlacementEngine() {
  let snapshot = freezeDeep({ placements: [], leaderId: null, participantCount: 0, placementHash: stableHash([]) })

  function calculate(input = {}) {
    snapshot = calculatePlacements(input.participants || [], input)
    return snapshot
  }

  function getSnapshot() {
    return snapshot
  }

  return Object.freeze({
    calculatePlacements: calculate,
    validateFinish,
    getSnapshot
  })
}

export default { createPlacementEngine, calculatePlacements, validateFinish }
