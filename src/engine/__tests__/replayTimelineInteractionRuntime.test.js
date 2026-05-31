import { describe, expect, it } from "vitest"
import { createReplayTimelineInteractionRuntime } from "../replayTimelineInteractionRuntime"
import shortF from "./fixtures/short.json"

describe("replayTimelineInteractionRuntime", () => {
  it("supports deterministic scrubber seek and bookmark state", () => {
    const runtime = createReplayTimelineInteractionRuntime(shortF)
    const seeked = runtime.seek(2, { start: 0, end: 1200 })
    const bookmark = runtime.bookmark("cp", 2, { start: 0, end: 1200 })

    expect(seeked.cursor).toBe(2)
    expect(bookmark.name).toBe("cp")
    expect(runtime.getScrubberState().seekCount).toBe(1)
  })

  it("orchestrates rewind and fast-forward without prediction", () => {
    const runtime = createReplayTimelineInteractionRuntime(shortF, { playbackSpeed: 1.25 })
    runtime.resume()
    runtime.fastForward(3)
    runtime.rewind(1)
    runtime.pause()

    const snapshot = runtime.getSnapshot()
    expect(snapshot.interaction.fastForwardCount).toBe(1)
    expect(snapshot.interaction.rewindCount).toBe(1)
    expect(snapshot.interaction.isPaused).toBe(true)
    expect(snapshot.frame.renderTree.renderCommands.length).toBeGreaterThan(0)
  })
})