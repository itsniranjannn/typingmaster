import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getScrollMargin } from "../utils/storage";

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

const tokenIncludesIndex = (token, index) => index >= token.start && index <= token.end;

const areTokenPropsEqual = (previousProps, nextProps) => {
  const previousToken = previousProps.token;
  const nextToken = nextProps.token;

  if (previousProps.isDark !== nextProps.isDark) return false;
  if (previousProps.focused !== nextProps.focused) return false;
  if (previousProps.hideContent !== nextProps.hideContent) return false;

  const previousFadedSet = previousProps.fadedWordSet;
  const nextFadedSet = nextProps.fadedWordSet;
  const previousWordFaded = Boolean(previousFadedSet?.has(previousToken.wordIndex));
  const nextWordFaded = Boolean(nextFadedSet?.has(nextToken.wordIndex));

  if (previousWordFaded !== nextWordFaded) return false;

  if (previousToken.id !== nextToken.id) return false;
  if (previousToken.text !== nextToken.text) return false;
  if (previousToken.start !== nextToken.start || previousToken.end !== nextToken.end) return false;
  if (previousToken.isSpace !== nextToken.isSpace) return false;
  if (previousToken.wordIndex !== nextToken.wordIndex) return false;

  if (previousProps.activeIndex !== nextProps.activeIndex) {
    const activeChangedInToken =
      tokenIncludesIndex(previousToken, previousProps.activeIndex) ||
      tokenIncludesIndex(previousToken, nextProps.activeIndex);
    if (activeChangedInToken) return false;
  }

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
  activeIndex,
  isDark,
  hideContent,
  fadedWordSet,
  registerWordRef,
  registerCharacterRef,
  registerCharacterRangeRef
}) {
  const tokenState = getTokenState(characterStates, token.start, token.end);
  const tokenClass = isDark
    ? {
        default: "text-slate-200",
        correct: "text-emerald-400",
        incorrect: "text-rose-400"
      }
    : {
        default: "text-slate-800",
        correct: "text-emerald-700",
        incorrect: "text-rose-700"
      };
      const isFaded = Boolean(hideContent) || (typeof token.wordIndex === "number" && fadedWordSet?.has(token.wordIndex));
      const fadeStyle = isFaded ? { visibility: 'hidden', opacity: 0 } : { visibility: 'visible', opacity: 1 };

  if (token.isSpace) {
    return (
      <span
        ref={(node) => registerCharacterRangeRef(token.start, token.end, node)}
        className={`${tokenClass[characterStates[token.start]] || tokenClass.default} inline-block align-top whitespace-pre-wrap transition-[opacity,visibility] duration-500 ease-out ${isFaded ? "opacity-0" : "opacity-100"}`}
        style={fadeStyle}
      >
        {token.text}
      </span>
    );
  }

  return (
    <span
      ref={(node) => registerWordRef(token.wordIndex, node)}
      data-word-index={token.wordIndex}
      className={`inline-block align-top rounded-sm transition-[opacity,visibility,color,transform] duration-500 ease-out ${
        tokenState === "correct"
          ? isDark
            ? "text-emerald-400"
            : "text-emerald-700"
          : tokenState === "incorrect"
          ? isDark
            ? "text-rose-400"
            : "text-rose-700"
          : isDark
          ? "text-slate-200"
          : "text-slate-800"
      } ${isFaded ? "opacity-0" : "opacity-100"}`}
      style={fadeStyle}
    >
      {token.text.split("").map((character, characterIndex) => {
        const index = token.start + characterIndex;
        return (
          <span
            key={`${token.id}-${characterIndex}`}
            ref={(node) => registerCharacterRef(index, node)}
            className={`${tokenClass[characterStates[index]] || tokenClass.default} transition-colors duration-150 ${
              index === activeIndex
                ? isDark
                  ? "bg-yellow-500/60 text-white"
                  : "bg-yellow-300/80 text-black"
                : ""
            }`}
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
  style,
  isDark = true,
  fontScale = 1,
  focused = false,
  hideContent = false,
  fadedWords = [],
  challengePromptHidden = false,
  scrollSyncTick = 0,
  onPointerDown,
  onKeyDown,
  onFocus,
  onBlur
}) {
  const containerRef = useRef(null);
  const characterRefs = useRef([]);
  const wordRefs = useRef([]);
  const appendScrollHeightRef = useRef(0);
  const scrollRafRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  const manualScrollOverrideRef = useRef(false);
  const lastActiveIndexRef = useRef(-1);
  const [scrollMargin, setScrollMargin] = useState(() => getScrollMargin());
  const [caret, setCaret] = useState({ left: 0, top: 0, height: 18, visible: false });

  const { segments, wordTokens } = useMemo(() => tokenizeParagraph(paragraph), [paragraph]);
  const fadedWordSet = useMemo(() => new Set(Array.isArray(fadedWords) ? fadedWords : []), [fadedWords]);

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

  const scrollToActiveCharacter = useCallback(() => {
    const container = containerRef.current;
    if (!container || activeIndex < 0 || hideContent || challengePromptHidden) return;

    const currentWordToken = wordTokens[currentWordIndex] || null;
    if (currentWordToken && Array.isArray(fadedWords) && fadedWords.includes(currentWordToken.wordIndex)) return;

    const activeNode = characterRefs.current[activeIndex] || wordRefs.current[currentWordIndex] || getCurrentWordNode();
    if (!activeNode) return;

    const containerRect = container.getBoundingClientRect();
    const nodeRect = activeNode.getBoundingClientRect();
    const bottomMargin = Math.min(Math.max(Number(scrollMargin) || 50, 0), 150);
    const isFullyVisible = nodeRect.top >= containerRect.top && nodeRect.bottom <= containerRect.bottom;
    const isAboveBottomMargin = nodeRect.bottom <= containerRect.bottom - bottomMargin;

    if (isFullyVisible && isAboveBottomMargin) return;

    const currentScrollTop = container.scrollTop;
    const nodeBottomInContainer = nodeRect.bottom - containerRect.top + currentScrollTop;
    const targetScrollTop = nodeBottomInContainer - container.clientHeight + bottomMargin;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const newScrollTop = Math.min(Math.max(targetScrollTop, 0), maxScrollTop);

    if (Math.abs(newScrollTop - currentScrollTop) < 1) return;

    isProgrammaticScrollRef.current = true;
    container.scrollTo({ top: newScrollTop, behavior: "smooth" });

    if (scrollRafRef.current) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = window.requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
      scrollRafRef.current = 0;
    });
  }, [activeIndex, currentWordIndex, fadedWords, getCurrentWordNode, challengePromptHidden, hideContent, scrollMargin, wordTokens]);

  useEffect(() => {
    const handleStorageChange = () => {
      setScrollMargin(getScrollMargin());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const handleContainerScroll = () => {
      const containerNode = containerRef.current;
      if (!containerNode || isProgrammaticScrollRef.current) return;

      const distanceFromBottom = containerNode.scrollHeight - (containerNode.scrollTop + containerNode.clientHeight);
      if (distanceFromBottom > 140) {
        manualScrollOverrideRef.current = true;
      }
    };

    const containerNode = containerRef.current;
    containerNode?.addEventListener("scroll", handleContainerScroll, { passive: true });

    if (containerNode) {
      appendScrollHeightRef.current = containerNode.scrollHeight;
    }

    return () => {
      containerNode?.removeEventListener("scroll", handleContainerScroll);
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = 0;
      }
    };
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || activeIndex < 0) {
      return;
    }

    if (lastActiveIndexRef.current !== activeIndex) {
      manualScrollOverrideRef.current = false;
    }
    lastActiveIndexRef.current = activeIndex;

    if (manualScrollOverrideRef.current) {
      return;
    }

    if (scrollRafRef.current) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollToActiveCharacter();
    });
  }, [activeIndex, currentWordIndex, paragraph, fadedWords, challengePromptHidden, scrollSyncTick, scrollToActiveCharacter]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (hideContent || challengePromptHidden || manualScrollOverrideRef.current) {
      appendScrollHeightRef.current = container.scrollHeight;
      return;
    }

    const previousHeight = appendScrollHeightRef.current || container.scrollHeight;
    const currentHeight = container.scrollHeight;
    const delta = currentHeight - previousHeight;
    const bottomMargin = Math.min(Math.max(Number(scrollMargin) || 50, 0), 150);

    if (appendScrollHeightRef.current === 0) {
      appendScrollHeightRef.current = currentHeight;
      return;
    }

    if (delta > 0) {
      const bottomGapBefore = previousHeight - (container.scrollTop + container.clientHeight);
      const shouldKeepBottomAnchored = bottomGapBefore <= bottomMargin;

      if (shouldKeepBottomAnchored) {
        const maxScrollTop = Math.max(0, currentHeight - container.clientHeight);
        container.scrollTop = Math.min(container.scrollTop + delta, maxScrollTop);
      }
    }

    appendScrollHeightRef.current = currentHeight;
  }, [paragraph.length, scrollMargin, scrollSyncTick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    appendScrollHeightRef.current = container.scrollHeight;

    if (!focused) {
      setCaret((currentCaret) => (currentCaret.visible ? { ...currentCaret, visible: false } : currentCaret));
      return;
    }
    const currentWordToken = wordTokens[currentWordIndex] || null;
    // Prefer the exact active character node, fall back to current word start node
    let targetNode = characterRefs.current[activeIndex] || null;
    if (!targetNode) {
      targetNode = wordRefs.current[currentWordIndex] || (currentWordToken ? characterRefs.current[currentWordToken.start] : null) || null;
    }

    if (targetNode) {
      try {
        const left = targetNode.offsetLeft;
        const top = targetNode.offsetTop;
        const height = targetNode.offsetHeight || parseFloat(getComputedStyle(container).fontSize) * 1.1;
        setCaret({ left, top, height, visible: true });
      } catch (error) {
        const nodeRect = targetNode.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const left = nodeRect.left - containerRect.left + container.scrollLeft;
        const top = nodeRect.top - containerRect.top + container.scrollTop;
        const height = nodeRect.height || parseFloat(getComputedStyle(container).fontSize) * 1.1;
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
        ...style,
        "--typing-scale": fontScale,
        lineHeight: 1.4,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace",
        textAlignLast: 'justify',
        WebkitTextAlignLast: 'justify',
        textJustify: 'inter-word',
        WebkitTextJustify: 'inter-word',
        scrollBehavior: "smooth"
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
      <div className="w-full text-justify leading-relaxed relative">
        {caret.visible ? (
          <span
            aria-hidden="true"
            className={`caret-blink absolute z-20 border-l-[3px] ${isDark ? "border-cyan-300" : "border-cyan-700"}`}
            style={{ left: caret.left, top: caret.top, height: caret.height, pointerEvents: "none", boxShadow: isDark ? "0 0 0 1px rgba(103,232,249,0.25)" : "0 0 0 1px rgba(3,105,161,0.28)" }}
          />
        ) : null}

        <div className={hideContent ? "select-none" : ""}>
          {segments.map((token) => (
            <TypingToken
              key={token.id}
              token={token}
              characterStates={characterStates}
              activeIndex={activeIndex}
              isDark={isDark}
              hideContent={hideContent}
              fadedWordSet={fadedWordSet}
              registerWordRef={registerWordRef}
              registerCharacterRef={registerCharacterRef}
              registerCharacterRangeRef={registerCharacterRangeRef}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(TypingText);
