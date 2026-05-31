import { describe, it, expect } from "vitest";
import * as replay from "../replayEngine";

describe("replayEngine", () => {
  it("records start, key, end in order with monotonic timestamps", () => {
    const s = replay.createSession();
    replay.markStart(s, 1000);
    replay.recordKey(s, { key: "a", correct: true, wordIndex: 0, charIndex: 0, ts: 1100 });
    replay.recordKey(s, { key: "b", correct: false, wordIndex: 0, charIndex: 1, ts: 1150 });
    replay.markEnd(s, 2000);

    const events = replay.getEvents(s);
    expect(events.length).toBe(4);
    expect(events[0].type).toBe("start");
    expect(events[1].type).toBe("key");
    expect(events[2].type).toBe("key");
    expect(events[3].type).toBe("end");
    for (let i = 1; i < events.length; i++) {
      expect(events[i].ts).toBeGreaterThanOrEqual(events[i - 1].ts);
    }
  });

  it("records backspace events", () => {
    const s = replay.createSession();
    replay.markStart(s, 0);
    replay.recordKey(s, { key: "x", correct: true, wordIndex: 0, charIndex: 0, ts: 10 });
    replay.recordKey(s, { key: "x", correct: true, wordIndex: 0, charIndex: 0, backspace: true, ts: 20 });
    const events = replay.getEvents(s);
    const bs = events.find((e) => e.type === "key" && e.backspace === true);
    expect(bs).toBeDefined();
  });

  it("inserts a pause event when gap >= threshold", () => {
    const s = replay.createSession();
    replay.recordKey(s, { key: "a", ts: 1000 });
    replay.recordKey(s, { key: "b", ts: 4000 });
    const events = replay.getEvents(s);
    // expect a pause event inserted between
    const types = events.map((e) => e.type);
    expect(types).toContain("pause");
    const pause = events.find((e) => e.type === "pause");
    expect(pause.duration).toBeGreaterThanOrEqual(2000);
  });

  it("serializeSession returns JSON with events and metrics", () => {
    const s = replay.createSession({ foo: "bar" });
    replay.recordKey(s, { key: "a", ts: 1 });
    const json = replay.serializeSession(s);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(s.id);
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.metrics.eventCount).toBeGreaterThan(0);
  });

  it("bounds retained events and invokes flush strategy", () => {
    const flushed = [];
    const s = replay.createSession({}, {
      maxEvents: 3,
      flushStrategy: (events) => flushed.push(events.map((event) => event.type))
    });

    replay.recordKey(s, { key: "a", ts: 1 });
    replay.recordKey(s, { key: "b", ts: 2 });
    replay.recordKey(s, { key: "c", ts: 3 });
    replay.recordKey(s, { key: "d", ts: 4 });

    expect(s.events.length).toBeLessThanOrEqual(3);
    expect(flushed.length).toBe(1);
    expect(flushed[0].length).toBeGreaterThan(0);
  });

  it("exports replay and typing sessions deterministically", () => {
    const s = replay.createSession({ mode: "time" }, { maxEvents: 8 });
    replay.markStart(s, 100);
    replay.recordKey(s, { key: "a", correct: true, wordIndex: 0, charIndex: 0, ts: 150 });
    replay.markEnd(s, 300);

    const replayExport = replay.exportReplaySession(s);
    const parsed = JSON.parse(replay.serializeSession(s));
    expect(parsed).toEqual(replayExport);

    const typingExport = replay.exportTypingSession(
      { wpm: 80, accuracy: 95 },
      s,
      { source: "unit-test" }
    );
    expect(typingExport.result).toEqual({ wpm: 80, accuracy: 95 });
    expect(typingExport.replay).toEqual(replayExport);
    expect(typingExport.metadata).toEqual({ source: "unit-test" });
  });
});
