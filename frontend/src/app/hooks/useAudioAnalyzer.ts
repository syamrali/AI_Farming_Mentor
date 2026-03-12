"use client";

import { useRef, useCallback } from "react";

/**
 * useAudioAnalyzer
 * Decodes raw WAV bytes, plays them, and continuously measures the audio
 * amplitude.  The mouthOpen ref (0-1) is updated every animation frame so
 * the Three.js avatar can read it synchronously without React re-renders.
 */
export function useAudioAnalyzer() {
  const mouthOpenRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  /** Stop any currently playing audio and reset amplitude. */
  const stopAudio = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    mouthOpenRef.current = 0;
  }, []);

  /**
   * Play a raw audio ArrayBuffer (WAV/MP3 etc.) and drive mouthOpen
   * from its amplitude in real time.
   *
   * @returns Promise that resolves when playback finishes.
   */
  const playAudio = useCallback((arrayBuffer: ArrayBuffer): Promise<void> => {
    return new Promise(async (resolve) => {
      stopAudio();

      // Re-use or create AudioContext
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      } catch (err) {
        console.error("Failed to decode audio:", err);
        resolve();
        return;
      }

      // Create analyzer
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.6;
      analyzerRef.current = analyzer;
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount) as Uint8Array<ArrayBuffer>;

      // Create & connect source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyzer);
      analyzer.connect(ctx.destination);
      sourceRef.current = source;

      source.onended = () => {
        mouthOpenRef.current = 0;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        resolve();
      };

      source.start(0);

      // RAF loop to measure amplitude
      const tick = () => {
        if (!analyzerRef.current || !dataArrayRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArrayRef.current);

        // Use the lower-frequency bins (speech fundamentals 80-3000 Hz)
        const binCount = Math.floor(dataArrayRef.current.length * 0.35);
        let sum = 0;
        for (let i = 0; i < binCount; i++) {
          sum += dataArrayRef.current[i];
        }
        const avg = sum / binCount;
        // Normalise to 0-1, clamp speech silence floor
        const normalised = Math.min(1, Math.max(0, (avg - 10) / 120));
        mouthOpenRef.current = normalised;

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }, [stopAudio]);

  return { mouthOpenRef, playAudio, stopAudio };
}
