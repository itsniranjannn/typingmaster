function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

export const RACE_STATES = Object.freeze({
  CREATED: "CREATED",
  WAITING: "WAITING",
  READY: "READY",
  COUNTDOWN: "COUNTDOWN",
  RUNNING: "RUNNING",
  FINISHED: "FINISHED",
  ABORTED: "ABORTED",
  EXPIRED: "EXPIRED"
})

const ALLOWED_TRANSITIONS = Object.freeze({
  [RACE_STATES.CREATED]: [RACE_STATES.WAITING, RACE_STATES.EXPIRED, RACE_STATES.ABORTED],
  [RACE_STATES.WAITING]: [RACE_STATES.READY, RACE_STATES.ABORTED, RACE_STATES.EXPIRED],
  [RACE_STATES.READY]: [RACE_STATES.COUNTDOWN, RACE_STATES.ABORTED, RACE_STATES.EXPIRED],
  [RACE_STATES.COUNTDOWN]: [RACE_STATES.RUNNING, RACE_STATES.ABORTED, RACE_STATES.EXPIRED],
  [RACE_STATES.RUNNING]: [RACE_STATES.FINISHED, RACE_STATES.ABORTED, RACE_STATES.EXPIRED],
  [RACE_STATES.FINISHED]: [RACE_STATES.EXPIRED],
  [RACE_STATES.ABORTED]: [RACE_STATES.EXPIRED],
  [RACE_STATES.EXPIRED]: []
})

const normalizeState = (state) => Object.values(RACE_STATES).includes(state) ? state : RACE_STATES.CREATED

const buildGuardContext = (context = {}) => ({
  participantCount: Math.max(0, Number(context.participantCount) || 0),
  minimumParticipants: Math.max(1, Number(context.minimumParticipants) || 2),
  countdownReady: Boolean(context.countdownReady),
  raceComplete: Boolean(context.raceComplete),
  aborted: Boolean(context.aborted),
  expired: Boolean(context.expired)
})

const guardTransition = (fromState, toState, context) => {
  if (!(ALLOWED_TRANSITIONS[fromState] || []).includes(toState)) {
    return freezeDeep({ valid: false, reason: "transition_not_allowed" })
  }
  if (toState === RACE_STATES.READY && context.participantCount < context.minimumParticipants) {
    return freezeDeep({ valid: false, reason: "insufficient_participants" })
  }
  if (toState === RACE_STATES.COUNTDOWN && !context.countdownReady) {
    return freezeDeep({ valid: false, reason: "countdown_not_ready" })
  }
  if (toState === RACE_STATES.FINISHED && !context.raceComplete) {
    return freezeDeep({ valid: false, reason: "race_not_complete" })
  }
  if (toState === RACE_STATES.ABORTED && !context.aborted) {
    return freezeDeep({ valid: false, reason: "abort_not_requested" })
  }
  if (toState === RACE_STATES.EXPIRED && !context.expired) {
    return freezeDeep({ valid: false, reason: "not_expired" })
  }
  return freezeDeep({ valid: true, reason: null })
}

export const transitionRaceState = (currentState, event = {}, context = {}) => {
  const fromState = normalizeState(currentState)
  const guardContext = buildGuardContext(context)
  const eventType = typeof event.type === "string" ? event.type : "noop"

  let requestedState = fromState
  if (eventType === "room-open") requestedState = RACE_STATES.WAITING
  if (eventType === "participants-ready") requestedState = RACE_STATES.READY
  if (eventType === "countdown-start") requestedState = RACE_STATES.COUNTDOWN
  if (eventType === "race-start") requestedState = RACE_STATES.RUNNING
  if (eventType === "race-finish") requestedState = RACE_STATES.FINISHED
  if (eventType === "abort") requestedState = RACE_STATES.ABORTED
  if (eventType === "expire") requestedState = RACE_STATES.EXPIRED

  const guard = guardTransition(fromState, requestedState, guardContext)
  const nextState = guard.valid ? requestedState : fromState
  return freezeDeep({
    fromState,
    eventType,
    requestedState,
    nextState,
    changed: nextState !== fromState,
    guard
  })
}

export const createRaceStateMachine = (initial = {}) => {
  let snapshot = freezeDeep({
    state: normalizeState(initial.state),
    revision: Math.max(0, Number(initial.revision) || 0),
    lastEvent: "init"
  })

  function transition(event = {}, context = {}) {
    const result = transitionRaceState(snapshot.state, event, context)
    snapshot = freezeDeep({
      state: result.nextState,
      revision: snapshot.revision + 1,
      lastEvent: result.eventType,
      transition: result
    })
    return snapshot
  }

  function canTransition(nextState, context = {}) {
    return guardTransition(snapshot.state, normalizeState(nextState), buildGuardContext(context))
  }

  return Object.freeze({
    transition,
    snapshot: () => snapshot,
    canTransition
  })
}

export default { RACE_STATES, transitionRaceState, createRaceStateMachine }