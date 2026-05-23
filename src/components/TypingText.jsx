import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const TOKEN_SPLIT_REGEX = /\S+|\s+/g;
const SPACE_REGEX = /^\s+$/;

const tokenizeParagraph = (paragraph) => {
  const segments = [];
  const wordTokens = [];
  let charIndex = 0;
  let wordIndex = 0;

  (paragraph.match(TOKEN_SPLIT_REGEX) || []).forEach((segment) => {
    const start = charIndex;
    const end = start + segment.length - 1;
    const isSpace = SPACE_REGEX.test(segment);
    const token = {
      id: `${isSpace ? "space" : "word"}-${start}-${segment.length}`,
      text: segment,
      start,
      end,
      isSpace,
      wordIndex: isSpace ? -1 : wordIndex
    };

    segments.push(token);
    if (!isSpace) {
      wordTokens.push(token);
      wordIndex += 1;
    }
    charIndex += segment.length;
  });

  return { segments, wordTokens };
};

const getTokenState = (characterStates, start, end) => {
  if (end < start) return "default";

  let allCorrect = true;
  let anyIncorrect = false;
  for (let index = start; index <= end; index += 1) {
    if (characterStates[index] === "incorrect") anyIncorrect = true;
    if (characterStates[index] !== "correct") allCorrect = false;
  }

  if (allCorrect) return "correct";
  if (anyIncorrect) return "incorrect";
  return "default";
};

const areTokenPropsEqual = (previousProps, nextProps) => {
  const previousToken = previousProps.token;
  const nextToken = nextProps.token;

  if (previousProps.isDark !== nextProps.isDark) return false;
  if (previousProps.fontScale !== nextProps.fontScale) return false;
  if (previousProps.focused !== nextProps.focused) return false;
  if (previousProps.currentWordIndex !== nextProps.currentWordIndex) return false;
  if (previousToken.id !== nextToken.id) return false;
  if (previousToken.text !== nextToken.text) return false;
  if (previousToken.start !== nextToken.start || previousToken.end !== nextToken.end) return false;
  if (previousToken.isSpace !== nextToken.isSpace) return false;
  if (previousToken.wordIndex !== nextToken.wordIndex) return false;

  for (let index = previousToken.start; index <= previousToken.end; index += 1) {
    if (previousProps.characterStates[index] !== nextProps.characterStates[index]) {
      return false;
    }
  }

  return true;
};

const TypingToken = memo(function TypingToken({
  token,
  characterStates,
  currentWordIndex,
  isDark,
  registerWordRef,
  registerCharacterRef,
  registerCharacterRangeRef
}) {
  const tokenState = getTokenState(characterStates, token.start, token.end);
  const tokenClass = isDark
    ? {
        default: "text-slate-200",
        correct: "text-emerald-200",
        incorrect: "text-rose-300"
      }
    : {
        default: "text-slate-800",
        correct: "text-emerald-900",
        incorrect: "text-rose-900"
      };

  if (token.isSpace) {
    return (
      <span
        ref={(node) => registerCharacterRangeRef(token.start, token.end, node)}
        className={`${tokenClass[characterStates[token.start]] || tokenClass.default} inline-block align-top whitespace-pre-wrap`}
      >
        {token.text}
      </span>
    );
  }

  return (
    <span
      ref={(node) => registerWordRef(token.wordIndex, node)}
      className={`inline-block align-top transition-transform duration-150 ${
        currentWordIndex === token.wordIndex ? "scale-[1.01]" : "scale-100"
      } ${
        tokenState === "correct"
          ? isDark
            ? "text-emerald-200"
            : "text-emerald-900"
          : tokenState === "incorrect"
          ? isDark
            ? "text-rose-300"
            : "text-rose-900"
          : isDark
          ? "text-slate-200"
          : "text-slate-800"
      }`}
    >
      {token.text.split("").map((character, characterIndex) => {
        const index = token.start + characterIndex;
        return (
          <span
            key={`${token.id}-${characterIndex}`}
            ref={(node) => registerCharacterRef(index, node)}
            className={`${tokenClass[characterStates[index]] || tokenClass.default} transition-colors duration-150`}
          >
            {character}
          </span>
        );
      })}
    </span>
  );
}, areTokenPropsEqual);

function TypingText({
  paragraph = "",
  characterStates = [],
  activeIndex = -1,
  currentWordIndex = 0,
  className = "",
  isDark = true,
  fontScale = 1,
  focused = false,
  onPointerDown,
  onKeyDown,
  onFocus,
  onBlur
}) {
  const containerRef = useRef(null);
  const characterRefs = useRef([]);
  const wordRefs = useRef([]);
  const appendScrollHeightRef = useRef(0);
  const lastScrollTargetRef = useRef("");
  const [caret, setCaret] = useState({ left: 0, top: 0, height: 18, visible: false });

  const { segments, wordTokens } = useMemo(() => tokenizeParagraph(paragraph), [paragraph]);

  const stateClasses = useMemo(
    () =>
      isDark
        ? {
            default: "text-slate-200",
            correct: "text-emerald-300",
            incorrect: "text-rose-300"
          }
        : {
            default: "text-slate-800",
            correct: "text-emerald-700",
            incorrect: "text-rose-700"
          },
    [isDark]
  );

  const registerWordRef = useCallback((wordTokenIndex, node) => {
    wordRefs.current[wordTokenIndex] = node;
  }, []);

  const registerCharacterRef = useCallback((characterIndex, node) => {
    characterRefs.current[characterIndex] = node;
  }, []);

  const registerCharacterRangeRef = useCallback((start, end, node) => {
    for (let index = start; index <= end; index += 1) {
      characterRefs.current[index] = node;
    }
  }, []);

  const getCurrentWordNode = useCallback(() => {
    const currentWordToken = wordTokens[currentWordIndex] || null;
    const firstIndex = currentWordToken?.start ?? activeIndex;
    return wordRefs.current[currentWordIndex] || characterRefs.current[firstIndex] || characterRefs.current[activeIndex] || null;
  }, [activeIndex, currentWordIndex, wordTokens]);

  useEffect(() => {
    const handleResize = () => {};
    const handleContainerScroll = () => {};

    window.addEventListener("resize", handleResize);
    const containerNode = containerRef.current;
    containerNode?.addEventListener("scroll", handleContainerScroll);

    if (containerNode) {
      appendScrollHeightRef.current = containerNode.scrollHeight;
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      containerNode?.removeEventListener("scroll", handleContainerScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || activeIndex < 0) {
      return;
    }

    const scrollTargetKey = `${currentWordIndex}:${activeIndex}`;
    if (lastScrollTargetRef.current === scrollTargetKey) {
      return;
    }
    lastScrollTargetRef.current = scrollTargetKey;

    const currentWordNode = getCurrentWordNode();
    if (!currentWordNode) return;

    const currentTop = currentWordNode.offsetTop;
    const currentHeight = currentWordNode.offsetHeight || 0;
    const currentBottom = currentTop + currentHeight;
    const visibleTop = container.scrollTop;
    const visibleBottom = visibleTop + container.clientHeight;
    const bottomPadding = 48;

    const needsScrollDown = currentBottom > visibleBottom - bottomPadding;
    if (!needsScrollDown) return;

    try {
      currentWordNode.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch (error) {
      const targetTop = Math.max(0, currentTop - container.clientHeight * 0.36 + currentHeight / 2);
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollTop = Math.min(targetTop, maxScrollTop);
    }
  }, [activeIndex, currentWordIndex, getCurrentWordNode]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousHeight = appendScrollHeightRef.current || container.scrollHeight;
    const currentHeight = container.scrollHeight;
    const delta = currentHeight - previousHeight;

    if (appendScrollHeightRef.current === 0) {
      appendScrollHeightRef.current = currentHeight;
      return;
    }

    if (delta > 0) {
      const bottomGapBefore = previousHeight - (container.scrollTop + container.clientHeight);
      const shouldKeepBottomAnchored = bottomGapBefore <= 80;

      if (shouldKeepBottomAnchored) {
        const maxScrollTop = Math.max(0, currentHeight - container.clientHeight);
        container.scrollTop = Math.min(container.scrollTop + delta, maxScrollTop);
      }
    }

    appendScrollHeightRef.current = currentHeight;
  }, [paragraph.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    appendScrollHeightRef.current = container.scrollHeight;

    if (!focused) {
      setCaret((currentCaret) => (currentCaret.visible ? { ...currentCaret, visible: false } : currentCaret));
      return;
    }

    if (activeIndex > 0) {
      setCaret((currentCaret) => (currentCaret.visible ? { ...currentCaret, visible: false } : currentCaret));
      return;
    }

    const currentWordToken = wordTokens[currentWordIndex] || null;
    let wordNode = wordRefs.current[currentWordIndex] || null;
    if (!wordNode && currentWordToken) {
      wordNode = characterRefs.current[currentWordToken.start] || null;
    }

    if (wordNode) {
      try {
        const left = wordNode.offsetLeft + 2;
        const top = wordNode.offsetTop;
        const height = wordNode.offsetHeight || parseFloat(getComputedStyle(container).fontSize) * 1.1;
        setCaret({ left, top, height, visible: true });
      } catch (error) {
        const wordRect = wordNode.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const left = wordRect.left - containerRect.left + container.scrollLeft + 2;
        const top = wordRect.top - containerRect.top + container.scrollTop;
        const height = wordRect.height || parseFloat(getComputedStyle(container).fontSize) * 1.1;
        setCaret({ left, top, height, visible: true });
      }
    } else {
      const fallbackHeight = parseFloat(getComputedStyle(container).fontSize) * 1.1;
      setCaret({ left: 6, top: 6, height: fallbackHeight, visible: true });
    }
  }, [activeIndex, focused, fontScale, currentWordIndex, wordTokens]);

  return (
    <div
      ref={containerRef}
      style={{
        "--typing-scale": fontScale,
        lineHeight: 1.4,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace"
      }}
      className={`typing-area relative mx-auto min-h-[140px] max-h-[55vh] w-full max-w-[76rem] rounded-2xl p-4 sm:p-6 font-mono text-[calc(1.2rem*var(--typing-scale))] sm:text-[calc(1.6rem*var(--typing-scale))] md:text-[calc(1.8rem*var(--typing-scale))] leading-[1.5] tracking-[0.01em] cursor-text outline-none overflow-x-hidden overflow-y-auto overscroll-contain whitespace-pre-wrap ${
        focused ? (isDark ? "ring-1 ring-cyan-300/40 shadow-[0_0_0_1px_rgba(103,232,249,0.12),inset_0_0_55px_rgba(34,211,238,0.08)]" : "ring-1 ring-cyan-500/35 shadow-[0_0_0_1px_rgba(14,165,233,0.08),inset_0_0_55px_rgba(14,165,233,0.06)]") : ""
      } ${className}`}
      tabIndex={0}
      role="textbox"
      aria-label="Typing area"
      aria-readonly="true"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="w-full text-left leading-relaxed relative">
        {caret.visible ? (
          <span
            aria-hidden="true"
            className={`caret-blink absolute z-20 border-l-2 ${isDark ? "border-cyan-300" : "border-cyan-600"}`}
            style={{ left: caret.left, top: caret.top, height: caret.height, pointerEvents: "none" }}
          />
        ) : null}

        {segments.map((token) => (
          <TypingToken
            key={token.id}
            token={token}
            characterStates={characterStates}
            currentWordIndex={currentWordIndex}
            isDark={isDark}
            registerWordRef={registerWordRef}
            registerCharacterRef={registerCharacterRef}
            registerCharacterRangeRef={registerCharacterRangeRef}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(TypingText);
