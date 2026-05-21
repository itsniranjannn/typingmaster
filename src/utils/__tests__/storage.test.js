import {
  addResult,
  getLastResults,
  loadResults,
  loadSettings,
  saveResult,
  saveSettings
} from "../storage";

const STORAGE_KEYS = {
  RESULTS: "typingMaster.results",
  THEME: "typingMaster.theme",
  MODE: "typingMaster.mode",
  SOUND: "typingMaster.soundEnabled",
  SOUND_VOLUME: "typingMaster.soundVolume",
  HAS_SEEN_TOUR: "typingMaster.hasSeenTour"
};

describe("storage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saveResult/loadResults persists and sanitizes result data", () => {
    const result = {
      id: Date.now(),
      mode: "words",
      wordCount: 50,
      wpm: 82,
      accuracy: 96.5,
      correctCharacters: 410,
      incorrectCharacters: 12,
      mistypedCharacters: ["a", "b", " "],
      timeUsed: 60,
      previousBest: 75,
      improvedBest: true
    };

    saveResult(result);

    const loadedResults = loadResults();
    expect(loadedResults).toHaveLength(1);
    expect(loadedResults[0].mode).toBe("words");
    expect(loadedResults[0].mistypedCharacters).toEqual(["a", "b", " "]);
  });

  it("addResult/getLastResults keeps only last 10 entries", () => {
    for (let index = 0; index < 12; index += 1) {
      addResult({
        id: Date.now() + index,
        mode: "time",
        wpm: 50 + index,
        accuracy: 90,
        correctCharacters: 100,
        incorrectCharacters: 5,
        timeUsed: 60,
        previousBest: 45,
        improvedBest: true
      });
    }

    const loadedResults = getLastResults();
    expect(loadedResults).toHaveLength(10);
  });

  it("loadResults falls back safely for corrupted results payload", () => {
    window.localStorage.setItem(STORAGE_KEYS.RESULTS, "not-json");
    expect(loadResults()).toEqual([]);
  });

  it("saveSettings/loadSettings persists settings with sanitization", () => {
    saveSettings({
      theme: "light",
      mode: "quote",
      soundEnabled: false,
      soundVolume: 0.7,
      hasSeenTour: true
    });

    const settings = loadSettings();
    expect(settings).toEqual({
      theme: "light",
      mode: "quote",
      soundEnabled: false,
      soundVolume: 0.7,
      hasSeenTour: true
    });
  });

  it("loadSettings uses defaults when storage values are corrupted", () => {
    window.localStorage.setItem(STORAGE_KEYS.THEME, '"bad-theme"');
    window.localStorage.setItem(STORAGE_KEYS.MODE, '"bad-mode"');
    window.localStorage.setItem(STORAGE_KEYS.SOUND, "bad-bool");
    window.localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, "bad-number");
    window.localStorage.setItem(STORAGE_KEYS.HAS_SEEN_TOUR, "bad-bool");

    const settings = loadSettings();
    expect(settings).toEqual({
      theme: "dark",
      mode: "time",
      soundEnabled: true,
      soundVolume: 0.5,
      hasSeenTour: false
    });
  });
});
