import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import KeyboardGuide from "../../components/KeyboardGuide";
import { getBestWpmModeKey, getGeneratedTextForMode } from "../../utils/typingModeHelpers";
import { TYPING_MODES } from "../../constants/typingModes";
import { LAYOUTS } from "../keyboardLayouts";

describe("Nepali text generation", () => {
  it("returns typeable Nepali text for every classic mode", () => {
    [TYPING_MODES.TIME, TYPING_MODES.WORDS, TYPING_MODES.QUOTE, TYPING_MODES.NUMBERS, TYPING_MODES.GOAL].forEach((mode) => {
      const text = getGeneratedTextForMode(mode, 25, "ne");
      expect(text.length).toBeGreaterThan(0);
      expect([...text].every((c) => LAYOUTS.ne.byChar[c])).toBe(true);
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
    render(<KeyboardGuide language="ne" nextCharacter="ख" />);
    expect(screen.getByText(/Hold Shift with your left pinky, press K with your right middle finger/i)).toBeTruthy();
  });

  it("describes plain keys and the space bar", () => {
    const { rerender } = render(<KeyboardGuide language="ne" nextCharacter="क" />);
    expect(screen.getByText(/Press K with your right middle finger/i)).toBeTruthy();
    rerender(<KeyboardGuide language="ne" nextCharacter=" " />);
    expect(screen.getByText(/Space bar/i)).toBeTruthy();
  });

  it("renders nothing when both the keyboard and hints are off", () => {
    const { container } = render(<KeyboardGuide language="ne" nextCharacter="क" showKeyboard={false} showFingerHints={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("works for English too", () => {
    render(<KeyboardGuide language="en" nextCharacter="A" />);
    expect(screen.getByText(/Hold Shift with your right pinky, press A with your left pinky/i)).toBeTruthy();
  });
});
