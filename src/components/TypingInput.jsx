import { memo, useEffect, useRef } from "react";

function TypingInput({ typedText, onType, disabled, focusTrigger, maxLength, className = "", fontScale = 1, describedById = "" }) {
  const inputRef = useRef(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusTrigger]);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    onType(nextValue, {
      skipEngine: isComposingRef.current,
      composing: isComposingRef.current
    });
  };

  return (
    <div className="space-y-2 ">
      <textarea 
        ref={inputRef}
        value={typedText}
        onChange={handleChange}
        onCompositionStart={() => {
          isComposingRef.current = true;
          onType(typedText, { skipEngine: true, composing: true });
        }}
        onCompositionEnd={(event) => {
          isComposingRef.current = false;
          onType(event.target.value, { forceRecalc: true, composing: false });
        }}
        onPaste={(event) => event.preventDefault()}
        disabled={disabled}
        style={{ fontSize: `${Math.max(1.1, fontScale) * 1.2}rem` }}
        className="w-full p-4 bg-transparent font-mono leading-snug text-slate-100 outline-none placeholder:text-slate-500 border-b-2 border-slate-600/50 px-0 py-3 pb-2 resize-none focus:border-brand-400/80 focus:ring-2 focus:ring-brand-400/40 focus:ring-offset-0 focus:shadow-[0_1px_0_0_rgba(56,189,248,0.6)] focus:shadow-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 m-2"
        placeholder="Start typing here..."
        autoComplete="off"
        spellCheck={false}
        aria-label="Typing input"
        aria-describedby={describedById || undefined}
        rows={3}
      />
    </div>
  );
}

export default memo(TypingInput);
