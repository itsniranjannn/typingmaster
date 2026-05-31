import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeViewport = (viewport = {}) => ({
  start: Math.max(0, Number(viewport.start) || 0),
  end: Math.max(Math.max(0, Number(viewport.start) || 0), Number(viewport.end) || 0)
})

const normalizeSpectator = (spectator = {}) => ({
  id: typeof spectator.id === "string" ? spectator.id : null,
  mode: typeof spectator.mode === "string" ? spectator.mode : "spectator",
  connected: Boolean(spectator.connected),
  lagMs: Math.max(0, Number(spectator.lagMs) || 0)
})

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function createReplaySyncContract(options = {}) {
  const viewport = normalizeViewport(options.viewport)
  const spectator = normalizeSpectator(options.spectator)
  const state = isPlainObject(options.state) ? options.state : {}
  const frame = isPlainObject(options.frame) ? options.frame : null
  const schedule = isPlainObject(options.schedule) ? options.schedule : null
  const counts = isPlainObject(options.counts) ? options.counts : {}
  const timelineCount = Math.max(0, Number(counts.timelineCount ?? frame?.frame?.timeline?.length ?? 0) || 0)
  const correctionCount = Math.max(0, Number(counts.correctionCount ?? frame?.frame?.corrections?.length ?? 0) || 0)
  const checkpointCount = Math.max(0, Number(counts.checkpointCount ?? frame?.frame?.checkpoints?.length ?? 0) || 0)
  const markerCount = Math.max(0, Number(counts.markerCount ?? frame?.frame?.markers?.length ?? 0) || 0)
  const budget = {
    frameBudgetMs: Math.max(0, safeNumber(options.frameBudgetMs ?? schedule?.budgetMs, 0)),
    consumedMs: Math.max(0, safeNumber(options.consumedMs ?? schedule?.consumedMs, 0)),
    overBudgetMs: Math.max(0, safeNumber(options.overBudgetMs ?? schedule?.overBudgetMs, 0)),
    withinBudget: Boolean(options.withinBudget ?? schedule?.withinBudget ?? true),
    executedCount: Math.max(0, Number(options.executedCount ?? schedule?.executed?.length ?? 0) || 0),
    overflowCount: Math.max(0, Number(options.overflowCount ?? schedule?.overflow?.length ?? 0) || 0)
  }
  const phase = typeof state.phase === "string" ? state.phase : "idle"
  const revision = Math.max(0, Number(state.revision) || 0)
  const cursor = Math.max(0, Number(options.cursor ?? state.cursor) || 0)
  const replayHash = typeof options.replayHash === "string" ? options.replayHash : null
  const syncTokenInput = {
    replayHash,
    viewport,
    phase,
    revision,
    cursor,
    spectator,
    budget,
    counts: {
      timelineCount,
      correctionCount,
      checkpointCount,
      markerCount
    }
  }
  const frameHash = stableHash({
    replayHash,
    viewport,
    phase,
    revision,
    cursor,
    counts: syncTokenInput.counts,
    spectator,
    budget
  })

  return freezeDeep({
    sessionId: typeof options.sessionId === "string" ? options.sessionId : null,
    spectatorId: spectator.id,
    replayHash,
    frameHash,
    syncToken: stableHash(syncTokenInput),
    viewport,
    phase,
    revision,
    cursor,
    spectator,
    budget,
    counts: syncTokenInput.counts,
    capabilities: {
      deterministic: true,
      spectatorSafe: true,
      networkless: true
    },
    boundary: {
      kind: "spectator",
      start: viewport.start,
      end: viewport.end
    }
  })
}

export function validateReplaySyncContract(contract) {
  const reasons = []

  if (!contract || typeof contract !== "object") {
    reasons.push("missing_contract")
  } else {
    if (typeof contract.replayHash !== "string" || contract.replayHash.length === 0) {
      reasons.push("missing_replay_hash")
    }
    if (!contract.viewport || typeof contract.viewport.start !== "number" || typeof contract.viewport.end !== "number") {
      reasons.push("invalid_viewport")
    } else if (contract.viewport.start > contract.viewport.end) {
      reasons.push("viewport_order")
    }
    if (!contract.capabilities?.spectatorSafe) {
      reasons.push("not_spectator_safe")
    }
    if (contract.budget && contract.budget.frameBudgetMs < 0) {
      reasons.push("invalid_budget")
    }
  }

  return freezeDeep({
    valid: reasons.length === 0,
    reasons,
    replayHash: contract?.replayHash ?? null,
    frameHash: contract?.frameHash ?? null,
    syncToken: contract?.syncToken ?? null
  })
}

export default { createReplaySyncContract, validateReplaySyncContract }