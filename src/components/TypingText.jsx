import { memo, useEffect, useMemo, useRef } from "react";

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
      index = end + 2;
    });

    return ranges;
  }, [words]);

  useEffect(() => {
    const handleResize = () => {};
    const handleContainerScroll = () => {};

    window.addEventListener("resize", handleResize);
    const containerNode = containerRef.current;
    containerNode?.addEventListener("scroll", handleContainerScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      containerNode?.removeEventListener("scroll", handleContainerScroll);
    };
  }, []);

  useEffect(() => {
    if (activeIndex < 0) return;

    const currentWordNode = characterRefs.current[wordRanges[currentWordIndex]?.[0] ?? activeIndex] ||
      characterRefs.current[activeIndex];
    currentWordNode?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [activeIndex, currentWordIndex, wordRanges]);

  return (
    <div
      ref={containerRef}
      style={{ "--typing-scale": fontScale, lineHeight: 1.6 }}
      className={`typing-area relative min-h-[200px] rounded-2xl p-6 sm:p-8 font-mono text-[calc(1.5rem*var(--typing-scale))] sm:text-[calc(1.875rem*var(--typing-scale))] md:text-[calc(2.25rem*var(--typing-scale))] leading-loose tracking-wide cursor-text outline-none overflow-x-auto whitespace-pre-wrap ${focused ? (isDark ? "ring-2 ring-cyan-400/50" : "ring-2 ring-cyan-500/45") : ""} ${className}`}
      tabIndex={0}
      role="textbox"
      aria-label="Typing area"
      aria-readonly="true"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
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
              className={`inline-flex items-center px-0.5 py-0.5 transition-all duration-150 ${
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
                    {focused && activeIndex === index ? (
                      <span
                        className={`caret-blink mr-[1px] inline-block h-[1.1em] align-[-0.12em] border-l-2 ${isDark ? "border-cyan-300" : "border-cyan-600"}`}
                        aria-hidden="true"
                      />
                    ) : null}
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
                  {focused && activeIndex === end + 1 ? (
                    <span
                      className={`caret-blink mr-[1px] inline-block h-[1.1em] align-[-0.12em] border-l-2 ${isDark ? "border-cyan-300" : "border-cyan-600"}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  {" "}
                </span>
              ) : null}

              {focused && wordIndex === words.length - 1 && activeIndex === paragraph.length ? (
                <span
                  className={`caret-blink ml-[1px] inline-block h-[1.1em] align-[-0.12em] border-l-2 ${isDark ? "border-cyan-300" : "border-cyan-600"}`}
                  aria-hidden="true"
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TypingText);
