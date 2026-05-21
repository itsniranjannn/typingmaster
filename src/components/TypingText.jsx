import { memo, useEffect, useMemo, useRef } from "react";

function TypingText({
  paragraph = "",
  characterStates = [],
  activeIndex = -1,
  caretSessionKey,
  currentWordIndex = 0,
  className = "",
  isDark = true,
  fontScale = 1
}) {
  const containerRef = useRef(null);
  const characterRefs = useRef([]);

  const stateClasses = isDark
    ? {
        default: "text-slate-500",
        correct: "text-emerald-300",
        incorrect: "text-rose-400"
      }
    : {
        default: "text-slate-600",
        correct: "text-emerald-700",
        incorrect: "text-rose-600"
      };

  const wordRanges = useMemo(() => {
    const ranges = [];
    let index = 0;

    paragraph.split(" ").forEach((word) => {
      const start = index;
      const end = index + word.length - 1;
      ranges.push([start, end]);
      index = end + 2;
    });

    return ranges;
  }, [paragraph]);

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
      className={`typing-area relative rounded-2xl p-8 font-mono text-[calc(1.875rem*var(--typing-scale))] md:text-[calc(2.25rem*var(--typing-scale))] leading-loose tracking-wide cursor-text focus:outline-none overflow-x-auto whitespace-pre-wrap ${className}`}
      tabIndex={0}
      role="textbox"
      aria-readonly="true"
    >
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
        {paragraph.split(" ").map((word, wordIndex) => {
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
              className={`inline-flex items-center rounded-xl border px-2.5 py-1.5 transition-all duration-150 ${
                currentWordIndex === wordIndex ? "scale-[1.03]" : "scale-100"
              } ${
                wordState === "correct"
                  ? isDark
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                    : "border-emerald-500/15 bg-emerald-100/80 text-emerald-900"
                  : wordState === "incorrect"
                    ? isDark
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                      : "border-rose-500/15 bg-rose-100/80 text-rose-900"
                    : isDark
                      ? "border-slate-700/40 bg-slate-900/20 text-slate-300"
                      : "border-slate-300/70 bg-white/70 text-slate-700"
              } ${currentWordIndex === wordIndex ? "shadow-lg" : ""} ${
                currentWordIndex === wordIndex
                  ? (isDark ? "bg-yellow-500/30 rounded px-1" : "bg-yellow-500/20 rounded px-1")
                  : ""
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

              {wordIndex < paragraph.split(" ").length - 1 ? (
                <span
                  ref={(node) => {
                    characterRefs.current[end + 1] = node;
                  }}
                  className={`${stateClasses[characterStates[end + 1]] || stateClasses.default} inline-block w-[0.6ch]`}
                >
                  {" "}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TypingText);
