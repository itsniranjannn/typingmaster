import { computeEngineSnapshot } from "./runtimeSnapshotEngine";

const cloneWords = (value) => (Array.isArray(value) ? value.slice() : []);

export function createPlaybackState({ paragraph = "", targetWords = [] } = {}) {
  return {
    paragraph,
    targetWords: cloneWords(targetWords),
    typedText: "",
    correctCharacters: 0,
    incorrectCharacters: 0,
    completedWords: 0,
    currentWord: "",
    currentWordIndex: 0,
    currentIndex: 0,
    typedWords: [],
    wordCorrectness: [],
    mistypedCharacters: [],
    correctCompletedWords: 0,
    pauseCount: 0,
    eventCount: 0,
    lastTs: null,
    startTs: null,
    endTs: null,
    lastEventType: null,
    lastMarker: null
  };
}

const applyAppend = (state, event) => {
  const key = typeof event.key === "string" ? event.key : "";
  state.typedText += key;
  state.currentIndex += 1;

  if (event.correct) {
    state.correctCharacters += 1;
  } else {
    state.incorrectCharacters += 1;
    state.mistypedCharacters.push(key);
  }

  if (key === " ") {
    const completedWord = state.currentWord;
    const targetWord = state.targetWords[state.currentWordIndex] || "";
    const isCorrectWord = completedWord === targetWord;
    state.typedWords.push(completedWord);
    state.wordCorrectness.push(isCorrectWord);
    if (isCorrectWord) {
      state.correctCompletedWords += 1;
    }
    state.completedWords += 1;
    state.currentWordIndex += 1;
    state.currentWord = "";
  } else {
    state.currentWord += key;
  }
};

const applyBackspace = (state, event) => {
  if (state.typedText.length === 0) return;

  const removedChar = typeof event.key === "string" ? event.key : "";
  state.typedText = state.typedText.slice(0, -1);
  state.currentIndex = Math.max(0, state.currentIndex - 1);

  if (event.correct) {
    state.correctCharacters = Math.max(0, state.correctCharacters - 1);
  } else {
    state.incorrectCharacters = Math.max(0, state.incorrectCharacters - 1);
    state.mistypedCharacters.pop();
  }

  if (removedChar === " ") {
    state.currentWordIndex = Math.max(0, state.currentWordIndex - 1);
    state.completedWords = Math.max(0, state.completedWords - 1);
    const lastTypedWord = state.typedWords.pop() || "";
    const lastWordCorrect = state.wordCorrectness.pop();
    if (lastWordCorrect) {
      state.correctCompletedWords = Math.max(0, state.correctCompletedWords - 1);
    }
    state.currentWord = lastTypedWord;
  } else {
    state.currentWord = state.currentWord.slice(0, -1);
  }
};

export function stepPlaybackEvent(state, event) {
  if (!state || !event) return state;

  state.eventCount += 1;
  state.lastEventType = event.type;

  switch (event.type) {
    case "start":
      state.startTs = event.ts ?? state.startTs;
      state.lastTs = event.ts ?? state.lastTs;
      break;
    case "pause":
      state.pauseCount += 1;
      state.lastTs = typeof event.ts === "number" && typeof event.duration === "number"
        ? event.ts + event.duration
        : state.lastTs;
      break;
    case "marker":
      state.lastMarker = typeof event.name === "string" ? event.name : null;
      break;
    case "end":
      state.endTs = event.ts ?? state.endTs;
      state.lastTs = event.ts ?? state.lastTs;
      break;
    case "key":
      if (event.backspace) {
        applyBackspace(state, event);
      } else {
        applyAppend(state, event);
      }
      state.lastTs = event.ts ?? state.lastTs;
      break;
    default:
      break;
  }

  return state;
}

export function createPlaybackSnapshot(state) {
  const snapshot = computeEngineSnapshot({
    targetWords: state.targetWords,
    paragraph: state.paragraph,
    correctCharacters: state.correctCharacters,
    incorrectCharacters: state.incorrectCharacters,
    completedWords: state.completedWords,
    currentWord: state.currentWord,
    currentWordIndex: state.currentWordIndex,
    currentIndex: state.currentIndex
  });

  return Object.freeze({
    ...snapshot,
    currentIndex: state.currentIndex,
    typedText: state.typedText,
    eventCount: state.eventCount,
    pauseCount: state.pauseCount,
    lastEventType: state.lastEventType,
    startTs: state.startTs,
    endTs: state.endTs,
    lastMarker: state.lastMarker
  });
}
