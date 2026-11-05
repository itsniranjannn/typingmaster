import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import KeyboardGuide from "../../components/KeyboardGuide";
import LoksewaVerdict from "../../components/LoksewaVerdict";
import { physicalFromKey } from "../keyboardLayouts";
import { getBestWpmModeKey, getGeneratedTextForMode } from "../../utils/typingModeHelpers";
import { TYPING_MODES } from "../../constants/typingModes";
import { LAYOUTS } from "../keyboardLayouts";

describe("Nepali text generation", () => {
  it("returns typeable Nepali text for every classic mode", () => {
    [TYPING_MODES.TIME, TYPING_MODES.WORDS, TYPING_MODES.QUOTE, TYPING_MODES.NUMBERS, TYPING_MODES.GOAL].forEach((mode) => {
      const text = getGeneratedTextForMode(mode, 25, "ne");
      expect(text.length).toBeGreaterThan(0);
      expect([...text].every((c) => LAYOUTS.ne.chars.has(c))).toBe(true);
    });
  });

  it("generates exactly N words in words mode", () => {
    expect(getGeneratedTextForMode(TYPING_MODES.WORDS, 50, "ne").split(" ")).toHaveLength(50);
  });

  it("keeps Nepali personal bests separate from English ones", () => {
    expect(getBestWpmModeKey({ mode: TYPING_MODES.TIME, language: "ne" })).toBe("ne_time");
    expect(getBestWpmModeKey({ mode: TYPING_MODES.TIME })).toBe("time");
    expect(getBestWpmModeKey({ mode: TYPING_MODES.WORDS, wordCount: 50, language: "ne" })).toBe("ne_words50");
  });
});

describe("KeyboardGuide", () => {
  it("tells the learner which key and finger to use, including Shift", () => {
    render(<KeyboardGuide language="ne" upcomingText="क्त" />);
    expect(screen.getByText(/Hold Shift with your right pinky, press S with your left ring finger/i)).toBeTruthy();
  });

  it("describes plain keys and the space bar", () => {
    const { rerender } = render(<KeyboardGuide language="ne" upcomingText="कमल" />);
    expect(screen.getByText(/Press S with your left ring finger/i)).toBeTruthy();
    rerender(<KeyboardGuide language="ne" upcomingText=" " />);
    expect(screen.getByText(/Space bar/i)).toBeTruthy();
  });

  it("renders nothing when both the keyboard and hints are off", () => {
    const { container } = render(<KeyboardGuide language="ne" upcomingText="क" showKeyboard={false} showFingerHints={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("explains conjunct keys, composed vowels and the Alt layer", () => {
    const { rerender } = render(<KeyboardGuide language="ne" upcomingText="ज्ञान" />);
    expect(screen.getByText(/Press 1 with your left pinky/i)).toBeTruthy();
    rerender(<KeyboardGuide language="ne" upcomingText="ाेक" nextCharacter="ो" />);
    expect(screen.getByText(/Press F with your left index finger/i)).toBeTruthy();
    expect(screen.getByText(/is typed as/i)).toBeTruthy();
    rerender(<KeyboardGuide language="ne" upcomingText="फल" />);
    expect(screen.getByText(/Hold Alt with your left thumb, press K/i)).toBeTruthy();
  });

  it("works for English too", () => {
    render(<KeyboardGuide language="en" upcomingText="A" />);
    expect(screen.getByText(/Hold Shift with your right pinky, press A with your left pinky/i)).toBeTruthy();
  });
});

describe("Loksewa verdict card", () => {
  const base = { targetWpm: 30, minAccuracy: 95, durationSeconds: 300 };

  it("shows a pass with both checks green", () => {
    render(<LoksewaVerdict result={{ loksewa: { ...base, netWpm: 34, accuracy: 97, speedOk: true, accuracyOk: true, passed: true } }} />);
    expect(screen.getByText("Passed")).toBeTruthy();
    expect(screen.getByText(/target 30 WPM/)).toBeTruthy();
  });

  it("shows what is missing when the test is not passed", () => {
    render(<LoksewaVerdict result={{ loksewa: { ...base, netWpm: 22, accuracy: 96, speedOk: false, accuracyOk: true, passed: false } }} />);
    expect(screen.getByText("Not yet")).toBeTruthy();
    expect(screen.getByText(/Speed \(need 30\)/)).toBeTruthy();
  });

  it("renders nothing for ordinary results", () => {
    const { container } = render(<LoksewaVerdict result={{ loksewa: null }} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("physicalFromKey (events without a code)", () => {
  it("finds the physical key from the character", () => {
    expect(physicalFromKey("[")).toEqual({ code: "BracketLeft", shift: false });
    expect(physicalFromKey("}")).toEqual({ code: "BracketRight", shift: true });
    expect(physicalFromKey("k")).toEqual({ code: "KeyK", shift: false });
    expect(physicalFromKey("K")).toEqual({ code: "KeyK", shift: true });
    expect(physicalFromKey("Shift")).toBeNull();
  });
});
