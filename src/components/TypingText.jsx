import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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

  const words = useMemo(() => paragraph.split(" "), [paragraph]);

  const stateClasses = isDark
    ? {
        default: "text-slate-200",
        correct: "text-emerald-300",
        incorrect: "text-rose-300"
      }
    : {
        default: "text-slate-800",
        correct: "text-emerald-700",
        incorrect: "text-rose-700"
      };

  const wordRanges = useMemo(() => {
    const ranges = [];
    let index = 0;
    words.forEach((word) => {
      const start = index;
      const end = index + word.length - 1;
      ranges.push([start, end]);
      index = end + 2; // account for space
    });
    return ranges;
  }, [words]);

  const getCurrentWordNode = () => {
    const firstIndex = wordRanges[currentWordIndex]?.[0] ?? activeIndex;
    return characterRefs.current[firstIndex] || characterRefs.current[activeIndex] || null;
  };

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
    } catch (e) {
      const targetTop = Math.max(0, currentTop - container.clientHeight * 0.36 + currentHeight / 2);
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollTop = Math.min(targetTop, maxScrollTop);
    }
  }, [activeIndex, currentWordIndex]);

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

  const [caret, setCaret] = useState({ left: 0, top: 0, height: 18, visible: false });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    appendScrollHeightRef.current = container.scrollHeight;

    // Hide caret when unfocused
    if (!focused) {
      setCaret((c) => (c.visible ? { ...c, visible: false } : c));
      return;
    }

    // Show caret only before typing (activeIndex <= 0)
    if (activeIndex > 0) {
      setCaret((c) => (c.visible ? { ...c, visible: false } : c));
      return;
    }

    // Anchor caret to the start of the current word
    const currentRange = wordRanges[currentWordIndex] || null;
    let wnode = wordRefs.current[currentWordIndex] || null;
    if (!wnode && currentRange) {
      const [wStart] = currentRange;
      wnode = characterRefs.current[wStart] || null;
    }

    if (wnode) {
      try {
        const left = wnode.offsetLeft + 2;
        const top = wnode.offsetTop;
        const height = wnode.offsetHeight || parseFloat(getComputedStyle(container).fontSize) * 1.1;
        setCaret({ left, top, height, visible: true });
      } catch (e) {
        const wRect = wnode.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const left = wRect.left - cRect.left + container.scrollLeft + 2;
        const top = wRect.top - cRect.top + container.scrollTop;
        const height = wRect.height || parseFloat(getComputedStyle(container).fontSize) * 1.1;
        setCaret({ left, top, height, visible: true });
      }
    } else {
      const fallbackHeight = parseFloat(getComputedStyle(container).fontSize) * 1.1;
      setCaret({ left: 6, top: 6, height: fallbackHeight, visible: true });
    }
  }, [activeIndex, focused, paragraph, fontScale, currentWordIndex, wordRanges]);

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

        {words.map((word, wordIndex) => {
          const [start, end] = wordRanges[wordIndex] || [0, -1];
          let wordState = "default";
          if (end >= start) {
            let allCorrect = true;
            let anyIncorrect = false;
            for (let index = start; index <= end; index += 1) {
              if (characterStates[index] === "incorrect") anyIncorrect = true;
              if (characterStates[index] !== "correct") allCorrect = false;
            }
            if (allCorrect) wordState = "correct";
            else if (anyIncorrect) wordState = "incorrect";
          }

          return (
            <span
              key={`${word}-${wordIndex}`}
              ref={(node) => {
                wordRefs.current[wordIndex] = node;
              }}
              className={`inline-block align-top mr-3 mb-2 transition-all duration-150 ${
                currentWordIndex === wordIndex ? "scale-[1.01]" : "scale-100"
              } ${
                wordState === "correct"
                  ? isDark
                    ? "text-emerald-200"
                    : "text-emerald-900"
                  : wordState === "incorrect"
                  ? isDark
                    ? "text-rose-300"
                    : "text-rose-900"
                  : isDark
                  ? "text-slate-200"
                  : "text-slate-800"
              }`}
            >
              {word.split("").map((character, characterIndex) => {
                const index = start + characterIndex;
                return (
                  <span
                    key={`${character}-${index}`}
                    ref={(node) => {
                      characterRefs.current[index] = node;
                    }}
                    className={`${stateClasses[characterStates[index]] || stateClasses.default} transition-colors duration-150`}
                  >
                    {character}
                  </span>
                );
              })}

              {wordIndex < words.length - 1 ? (
                <span
                  ref={(node) => {
                    characterRefs.current[end + 1] = node;
                  }}
                  className={`${stateClasses[characterStates[end + 1]] || stateClasses.default} inline-block w-[0.6ch]`}
                >
                  {" "}
                </span>
              ) : null}

              {null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TypingText);
