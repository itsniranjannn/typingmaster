import { stableHash } from "./replayConsumerValidation"
import { INTEGRITY_CLASSIFICATIONS, createIntegrityEvent } from "./integrityEventModel"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const levelOrder = Object.freeze({
  [INTEGRITY_CLASSIFICATIONS.VALID]: 0,
  [INTEGRITY_CLASSIFICATIONS.WARNING]: 1,
  [INTEGRITY_CLASSIFICATIONS.SUSPICIOUS]: 2,
  [INTEGRITY_CLASSIFICATIONS.INVALID]: 3
})

const maxLevel = (left, right) => (levelOrder[left] >= levelOrder[right] ? left : right)

const pushReason = (reasons, classification, code) => reasons.push(freezeDeep({ classification, code }))

const classifyBurst = (events, windowMs, burstLimit) => {
  let worst = INTEGRITY_CLASSIFICATIONS.VALID
  for (let index = 0; index < events.length; index += 1) {
    const startTs = Number(events[index].ts) || 0
    let count = 1
    for (let cursor = index + 1; cursor < events.length; cursor += 1) {
      if ((Number(events[cursor].ts) || 0) - startTs <= windowMs) count += 1
      else break
    }
    if (count >= burstLimit * 2) return INTEGRITY_CLASSIFICATIONS.INVALID
    if (count >= burstLimit) worst = maxLevel(worst, INTEGRITY_CLASSIFICATIONS.SUSPICIOUS)
    else if (count >= Math.max(2, Math.floor(burstLimit / 2))) worst = maxLevel(worst, INTEGRITY_CLASSIFICATIONS.WARNING)
  }
  return worst
}

const normalizeInput = (input = {}, index = 0) => freezeDeep({
  sequence: Math.max(0, Number(input.sequence) || index + 1),
  ts: Math.max(0, Number(input.ts) || 0),
  type: typeof input.type === "string" ? input.type : "key",
  key: typeof input.key === "string" ? input.key : "",
  backspace: Boolean(input.backspace),
  correct: input.correct !== false,
  wordsCompleted: Math.max(0, Number(input.wordsCompleted ?? input.progress?.wordsCompleted) || 0),
  totalWords: Math.max(1, Number(input.totalWords ?? input.progress?.totalWords) || 1),
  correctionCount: Math.max(0, Number(input.correctionCount) || 0),
  packetId: typeof input.packetId === "string" ? input.packetId : null,
  checkpointId: typeof input.checkpointId === "string" ? input.checkpointId : null,
  payloadHash: stableHash({
    sequence: Math.max(0, Number(input.sequence) || index + 1),
    ts: Math.max(0, Number(input.ts) || 0),
    type: typeof input.type === "string" ? input.type : "key",
    key: typeof input.key === "string" ? input.key : "",
    backspace: Boolean(input.backspace),
    correct: input.correct !== false,
    wordsCompleted: Math.max(0, Number(input.wordsCompleted ?? input.progress?.wordsCompleted) || 0),
    totalWords: Math.max(1, Number(input.totalWords ?? input.progress?.totalWords) || 1),
    correctionCount: Math.max(0, Number(input.correctionCount) || 0),
    packetId: typeof input.packetId === "string" ? input.packetId : null,
    checkpointId: typeof input.checkpointId === "string" ? input.checkpointId : null
  })
})

export function verifyInputStream(inputs = [], options = {}) {
  const normalized = (Array.isArray(inputs) ? inputs : []).map(normalizeInput).sort((left, right) => left.sequence - right.sequence || left.ts - right.ts || left.payloadHash.localeCompare(right.payloadHash))
  const reasons = []
  let classification = INTEGRITY_CLASSIFICATIONS.VALID
  const reasonSet = new Set()

  let previousSequence = -1
  let previousTs = -1
  let typedCount = 0
  let backspaceCount = 0
  let correctionCount = 0
  let duplicateSubmitCount = 0
  let malformedCheckpointCount = 0
  let invalidProgressJumpCount = 0
  let invalidOrderingCount = 0
  const seenPacketIds = new Set()
  const seenPayloadHashes = new Set()

  normalized.forEach((input, index) => {
    if (input.sequence <= previousSequence) {
      invalidOrderingCount += 1
      reasonSet.add("invalid_packet_ordering")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.INVALID)
    }
    if (input.ts < previousTs) {
      reasonSet.add("impossible_timing_sequence")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.INVALID)
    }
    if (input.packetId && seenPacketIds.has(input.packetId)) {
      duplicateSubmitCount += 1
      reasonSet.add("duplicate_submission")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.INVALID)
    }
    if (seenPayloadHashes.has(input.payloadHash)) {
      duplicateSubmitCount += 1
      reasonSet.add("duplicate_submission")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.SUSPICIOUS)
    }
    seenPacketIds.add(input.packetId || `packet-${index}`)
    seenPayloadHashes.add(input.payloadHash)

    typedCount += input.type === "key" && !input.backspace ? 1 : 0
    backspaceCount += input.backspace ? 1 : 0
    correctionCount += input.backspace || input.correct === false ? 1 : 0

    if (input.checkpointId && (!Number.isFinite(Number(input.wordsCompleted)) || input.wordsCompleted > input.totalWords)) {
      malformedCheckpointCount += 1
      reasonSet.add("malformed_checkpoint")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.INVALID)
    }

    const previousWords = index > 0 ? normalized[index - 1].wordsCompleted : 0
    const jump = input.wordsCompleted - previousWords
    if (jump > Math.max(3, Number(options.maxProgressJump) || 8)) {
      invalidProgressJumpCount += 1
      reasonSet.add("invalid_progress_jump")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.SUSPICIOUS)
    }

    if (input.backspace && typedCount === 0) {
      reasonSet.add("impossible_correction_pattern")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.SUSPICIOUS)
    }

    if (input.ts - previousTs < 12 && index > 0) {
      reasonSet.add("impossible_timing_sequence")
      classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.WARNING)
    }

    previousSequence = input.sequence
    previousTs = input.ts
  })

  const burstClassification = classifyBurst(normalized, Math.max(120, Number(options.burstWindowMs) || 250), Math.max(6, Number(options.burstLimit) || 12))
  classification = maxLevel(classification, burstClassification)
  if (burstClassification !== INTEGRITY_CLASSIFICATIONS.VALID) reasonSet.add("impossible_typing_burst")

  if (backspaceCount > typedCount * 2 && typedCount > 0) {
    reasonSet.add("impossible_correction_pattern")
    classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.SUSPICIOUS)
  }

  if (malformedCheckpointCount > 0 || invalidOrderingCount > 0 || duplicateSubmitCount > 0) {
    classification = maxLevel(classification, INTEGRITY_CLASSIFICATIONS.INVALID)
  }

  const reasonsArray = [...reasonSet].sort().map((code) => freezeDeep({ code }))
  const score = Math.max(0, 100 - invalidOrderingCount * 35 - duplicateSubmitCount * 20 - malformedCheckpointCount * 30 - invalidProgressJumpCount * 10 - backspaceCount * 2)
  const integrityEvent = createIntegrityEvent({
    type: "INPUT_VERIFICATION",
    classification,
    reasonCodes: reasonsArray.map((entry) => entry.code),
    payload: { count: normalized.length, typedCount, backspaceCount, correctionCount }
  })

  return freezeDeep({
    classification,
    reasons: reasonsArray,
    score: Math.min(100, score),
    typedCount,
    backspaceCount,
    correctionCount,
    duplicateSubmitCount,
    malformedCheckpointCount,
    invalidProgressJumpCount,
    invalidOrderingCount,
    normalizedInputs: normalized,
    integrityEvent,
    verificationHash: stableHash({ classification, reasons: reasonsArray, score: Math.min(100, score), normalized })
  })
}

export function createInputVerificationEngine(options = {}) {
  let lastReport = freezeDeep({ classification: INTEGRITY_CLASSIFICATIONS.VALID, reasons: [], score: 100, verificationHash: stableHash([]) })

  function verify(inputs = []) {
    lastReport = verifyInputStream(inputs, options)
    return lastReport
  }

  function getSnapshot() {
    return lastReport
  }

  return Object.freeze({
    verify,
    getSnapshot
  })
}

export default { createInputVerificationEngine, verifyInputStream }
