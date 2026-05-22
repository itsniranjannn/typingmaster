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
      className={`typing-area relative mx-auto min-h-[180px] w-full max-w-[76rem] rounded-2xl p-6 sm:p-8 font-mono text-[calc(1.6rem*var(--typing-scale))] sm:text-[calc(2.1rem*var(--typing-scale))] md:text-[calc(2.35rem*var(--typing-scale))] leading-[1.72] tracking-[0.01em] cursor-text outline-none overflow-x-auto whitespace-pre-wrap ${focused ? (isDark ? "ring-1 ring-cyan-300/40 shadow-[0_0_0_1px_rgba(103,232,249,0.12),inset_0_0_55px_rgba(34,211,238,0.08)]" : "ring-1 ring-cyan-500/35 shadow-[0_0_0_1px_rgba(14,165,233,0.08),inset_0_0_55px_rgba(14,165,233,0.06)]") : ""} ${className}`}
      tabIndex={0}
      role="textbox"
      aria-label="Typing area"
      aria-readonly="true"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 items-center text-center">
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
              className={`inline-flex items-center px-0.5 py-0 transition-all duration-150 ${
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
