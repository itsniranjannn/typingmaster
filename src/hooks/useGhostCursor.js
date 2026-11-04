import { useEffect, useState } from "react";

const TICK_MS = 100;

/**
 * Interpolates where the personal-best run was `t` seconds in.
 * `charSamples[i]` is the cumulative correct characters after second i + 1.
 */
export const getGhostIndexAt = (charSamples, seconds) => {
  if (!Array.isArray(charSamples) || charSamples.length === 0 || seconds <= 0) return 0;
  const lastIndex = charSamples.length - 1;
  if (seconds >= charSamples.length) return charSamples[lastIndex];
  const whole = Math.floor(seconds);
  const previous = whole === 0 ? 0 : charSamples[whole - 1];
  const next = charSamples[whole];
  return Math.round(previous + (next - previous) * (seconds - whole));
};

/** Returns the ghost's current character index, or -1 when no ghost should be shown. */
export const useGhostCursor = ({ charSamples, enabled, hasStarted, isFinished }) => {
  const [ghostIndex, setGhostIndex] = useState(-1);

  useEffect(() => {
    if (!enabled || !charSamples?.length || !hasStarted || isFinished) {
      setGhostIndex(hasStarted && !isFinished && enabled && charSamples?.length ? 0 : -1);
      return undefined;
    }

    const startedAt = performance.now();
    const tick = () => {
      const seconds = (performance.now() - startedAt) / 1000;
      setGhostIndex((current) => {
        const next = getGhostIndexAt(charSamples, seconds);
        return next === current ? current : next;
      });
    };

    tick();
    const timer = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(timer);
  }, [charSamples, enabled, hasStarted, isFinished]);

  return ghostIndex;
};
