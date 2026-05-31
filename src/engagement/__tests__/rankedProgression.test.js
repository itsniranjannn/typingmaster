import { describe, expect, it } from "vitest";
import * as ranked from "../rankedProgression";

const history = [
  { result: { wpm: 34, accuracy: 88, completedWords: 20 } },
  { result: { wpm: 48, accuracy: 92, completedWords: 24 } },
  { result: { wpm: 59, accuracy: 95, completedWords: 26 } },
  { result: { wpm: 67, accuracy: 96, completedWords: 29 } }
];

describe("rankedProgression", () => {
  it("produces deterministic ranking outputs", () => {
    const first = ranked.summarizeRankedProgression(history);
    const second = ranked.summarizeRankedProgression(history);

    expect(first).toEqual(second);
    expect(first.league).toBeDefined();
    expect(first.division).toBeGreaterThanOrEqual(1);
    expect(first.division).toBeLessThanOrEqual(4);
  });

  it("estimates placement and confidence within bounds", () => {
    const placement = ranked.estimatePlacement(history);
    const confidence = ranked.scoreConfidence(history);

    expect(placement.placementEstimate).toBeGreaterThanOrEqual(0);
    expect(placement.placementEstimate).toBeLessThanOrEqual(1);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("returns bounded promotion safety windows for malformed input", () => {
    const safety = ranked.getPromotionSafetyWindow([null, {}, { result: { wpm: 12, accuracy: 80 } }]);

    expect(safety.safetyWindow).toBeGreaterThanOrEqual(1);
    expect(safety.confidence).toBeGreaterThanOrEqual(0);
  });
});
