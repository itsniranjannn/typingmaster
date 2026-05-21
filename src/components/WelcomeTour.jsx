import { memo, useMemo } from "react";

const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT = 150;

function WelcomeTour({ isOpen, stepIndex, steps, highlightRect, onNext, onSkip }) {
  const isLastStep = stepIndex >= steps.length - 1;

  const tooltipStyle = useMemo(() => {
    if (!highlightRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const preferredTop = highlightRect.top + highlightRect.height + 14;
    const fallbackTop = highlightRect.top - TOOLTIP_HEIGHT - 14;
    const top = preferredTop + TOOLTIP_HEIGHT <= viewportHeight - 12 ? preferredTop : Math.max(12, fallbackTop);
    const left = Math.min(
      Math.max(12, highlightRect.left),
      Math.max(12, viewportWidth - TOOLTIP_WIDTH - 12)
    );

    return {
      top,
      left,
      width: TOOLTIP_WIDTH
    };
  }, [highlightRect]);

  if (!isOpen) return null;

  const step = steps[stepIndex];

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite" aria-label="Welcome tour">
      <div className="absolute inset-0 bg-slate-950/65" />

      {highlightRect && (
        <div
          className="absolute rounded-xl border-2 border-sky-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)] pointer-events-none"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16
          }}
        />
      )}

      <div
        className="absolute rounded-xl border border-slate-600/60 bg-slate-900/95 p-4 text-slate-100 shadow-2xl"
        style={tooltipStyle}
        role="dialog"
        aria-modal="true"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Welcome Tour {stepIndex + 1}/{steps.length}
        </p>
        <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
        <p className="mt-1 text-sm text-slate-300">{step.description}</p>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onSkip}>
            Skip
          </button>
          <button type="button" className="btn-primary" onClick={onNext}>
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(WelcomeTour);
