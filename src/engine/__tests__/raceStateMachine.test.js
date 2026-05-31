import { describe, expect, it } from "vitest"
import { createRaceStateMachine, RACE_STATES, transitionRaceState } from "../raceStateMachine"

describe("raceStateMachine", () => {
  it("applies deterministic pure transitions", () => {
    const machine = createRaceStateMachine({ state: RACE_STATES.CREATED })

    expect(machine.transition({ type: "room-open" }, {}).state).toBe(RACE_STATES.WAITING)
    expect(machine.transition({ type: "participants-ready" }, { participantCount: 3, minimumParticipants: 2 }).state).toBe(RACE_STATES.READY)
    expect(machine.transition({ type: "countdown-start" }, { countdownReady: true }).state).toBe(RACE_STATES.COUNTDOWN)
    expect(machine.transition({ type: "race-start" }, {}).state).toBe(RACE_STATES.RUNNING)
    expect(machine.transition({ type: "race-finish" }, { raceComplete: true }).state).toBe(RACE_STATES.FINISHED)
    expect(machine.transition({ type: "expire" }, { expired: true }).state).toBe(RACE_STATES.EXPIRED)
  })

  it("enforces guard validation", () => {
    const result = transitionRaceState(RACE_STATES.WAITING, { type: "participants-ready" }, { participantCount: 1, minimumParticipants: 2 })
    expect(result.nextState).toBe(RACE_STATES.WAITING)
    expect(result.guard.valid).toBe(false)
    expect(result.guard.reason).toBe("insufficient_participants")
  })
})