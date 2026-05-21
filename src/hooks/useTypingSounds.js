import { useCallback, useRef, useState } from "react";
import { getSoundVolume, setSoundVolume } from "../utils/storage";

const MIN_INTERVAL_MS = 35;

export const useTypingSounds = (enabled) => {
  const audioContextRef = useRef(null);
  const lastCorrectPlayRef = useRef(0);
  const wordsWithErrorRef = useRef(new Set());
  const [volume, setVolumeState] = useState(getSoundVolume());

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (frequency, durationSeconds, gainValue, throttleRef = null) => {
      if (!enabled) return;

      if (throttleRef) {
        const now = performance.now();
        if (now - throttleRef.current < MIN_INTERVAL_MS) return;
        throttleRef.current = now;
      }

      const audioContext = getAudioContext();
      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      const effectiveGain = Math.max(0, Math.min(1, gainValue * volume));
      gainNode.gain.setValueAtTime(effectiveGain, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + durationSeconds);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + durationSeconds);
    },
    [enabled, getAudioContext, volume]
  );

  const playCorrectKey = useCallback(() => {
    playTone(500, 0.035, 0.012, lastCorrectPlayRef);
  }, [playTone]);

  const playMilestoneSound = useCallback(() => {
    if (!enabled) return;

    const audioContext = getAudioContext();
    if (!audioContext) return;

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const notes = [784, 988, 1175];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.09);
      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.08)), now + index * 0.09);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.08);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.1);
    });
  }, [enabled, getAudioContext, volume]);

  const playMilestoneChime = playMilestoneSound;

  const playIncorrectKeyForWord = useCallback(
    (wordIndex) => {
      const normalizedWordIndex = Number.isFinite(wordIndex) ? Math.max(0, Math.floor(wordIndex)) : 0;
      if (wordsWithErrorRef.current.has(normalizedWordIndex)) return;

      wordsWithErrorRef.current.add(normalizedWordIndex);
      playTone(180, 0.06, 0.018);
    },
    [playTone]
  );

  const resetWordsWithError = useCallback(() => {
    wordsWithErrorRef.current.clear();
  }, []);

  const setVolume = useCallback((nextVolume) => {
    const normalizedVolume = Math.min(Math.max(Number(nextVolume) || 0, 0), 1);
    setVolumeState(normalizedVolume);
    setSoundVolume(normalizedVolume);
  }, []);

  return {
    playCorrectKey,
    playMilestoneSound,
    playMilestoneChime,
    playIncorrectKeyForWord,
    volume,
    setVolume,
    resetWordsWithError
  };
};
