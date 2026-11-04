import { useCallback, useEffect, useRef } from "react";
import { calculateWpm } from "../utils/typingStats";

const MAX_SAMPLES = 300;

/**
 * Records one sample per elapsed second while a run is in progress:
 * the WPM at that moment and the cumulative correct characters (used to replay a ghost).
 */
export const useRunRecorder = ({ elapsedSeconds, correctCharacters, hasStarted, isFinished }) => {
  const samplesRef = useRef([]);
  const lastSecondRef = useRef(0);
  const latestCharsRef = useRef(0);
  const startedAtRef = useRef(null);

  latestCharsRef.current = correctCharacters;

  useEffect(() => {
    if (!hasStarted) {
      samplesRef.current = [];
      lastSecondRef.current = 0;
      startedAtRef.current = null;
    } else if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted || isFinished) return;
    if (elapsedSeconds <= lastSecondRef.current || samplesRef.current.length >= MAX_SAMPLES) return;
    lastSecondRef.current = elapsedSeconds;
    // Wall-clock time keeps samples honest even if the timer tick is throttled (background tabs).
    const wallSeconds = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : elapsedSeconds;
    samplesRef.current.push({
      wpm: Math.round(calculateWpm(latestCharsRef.current, Math.max(wallSeconds, 1))),
      chars: latestCharsRef.current
    });
  }, [elapsedSeconds, hasStarted, isFinished]);

  const getSamples = useCallback(() => samplesRef.current.slice(), []);

  return { getSamples };
};
