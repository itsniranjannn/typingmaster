import { calculateAccuracy, calculateWpm } from "../typingStats";

describe("calculateWpm", () => {
  it("returns 0 when elapsed time is zero", () => {
    expect(calculateWpm(60, 0)).toBe(0);
  });

  it("returns 0 when correct characters are zero", () => {
    expect(calculateWpm(0, 60)).toBe(0);
  });

  it("returns 0 for negative or invalid results", () => {
    expect(calculateWpm(-20, 60)).toBe(0);
    expect(calculateWpm(50, -10)).toBe(0);
  });

  it("calculates expected WPM for edge case 60 chars in 60 seconds", () => {
    expect(calculateWpm(60, 60)).toBe(12);
  });
});

describe("calculateAccuracy", () => {
  it("returns 0 for empty typed characters", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it("returns 100 for all correct characters", () => {
    expect(calculateAccuracy(25, 25)).toBe(100);
  });

  it("returns 0 for all wrong characters", () => {
    expect(calculateAccuracy(0, 25)).toBe(0);
  });

  it("returns percentage for mixed input", () => {
    expect(calculateAccuracy(8, 10)).toBe(80);
    expect(calculateAccuracy(7, 9)).toBe(77.78);
  });
});
