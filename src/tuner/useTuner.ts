import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchSmoother, type Reading } from './analysis.ts';
import { detectPitch, rms } from './detect.ts';
import { MIC_WINDOW, MicError, openMic, type Mic } from './mic.ts';

export type TunerFrame = {
  /** Seconds since the tuner started. */
  t: number;
  dt: number;
  /** Steadied reading, or null when nothing clear is sounding. */
  reading: Reading | null;
  level: number;
  sounding: boolean;
};

type Options = {
  /** A4 reference frequency (concert). */
  a4: number;
  /** Quietest level (RMS) that counts as playing. */
  gate: number;
  onFrame?: (f: TunerFrame) => void;
};

const CLARITY = 0.88;
const INTERVAL_MS = 30;

/** Opens the mic and turns it into readings about 30 times a second. */
export function useTuner({ a4, gate, onFrame }: Options) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState<TunerFrame | null>(null);
  const mic = useRef<Mic | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const generation = useRef(0); // bumped by stop(), so a start still waiting for permission can see it was cancelled
  const starting = useRef(false);
  const live = useRef({ a4, gate, onFrame });
  live.current = { a4, gate, onFrame };

  const stop = useCallback(() => {
    generation.current++;
    clearInterval(timer.current);
    mic.current?.close();
    mic.current = null;
    setActive(false);
    setFrame(null);
  }, []);

  const start = useCallback(async () => {
    if (mic.current || starting.current) return;
    starting.current = true;
    const mine = ++generation.current;
    setError(null);
    try {
      const m = await openMic();
      if (generation.current !== mine) {
        m.close(); // stopped while waiting for the microphone permission
        return;
      }
      mic.current = m;
      const buf = new Float32Array(MIC_WINDOW);
      const smoother = new PitchSmoother(5);
      const t0 = performance.now();
      let prev = t0;
      timer.current = setInterval(() => {
        const now = performance.now();
        m.read(buf);
        const level = rms(buf);
        const sounding = level >= live.current.gate;
        let hz: number | null = null;
        if (sounding) {
          const d = detectPitch(buf, m.sampleRate);
          if (d && d.clarity >= CLARITY && d.hz > 90 && d.hz < 1500) hz = d.hz;
        }
        const raw = smoother.push(hz, live.current.a4);
        const reading = sounding ? raw : null;
        const f: TunerFrame = { t: (now - t0) / 1000, dt: (now - prev) / 1000, reading, level, sounding };
        prev = now;
        setFrame(f);
        live.current.onFrame?.(f);
      }, INTERVAL_MS);
      setActive(true);
    } catch (e) {
      setError(e instanceof MicError ? e.message : 'Could not start the microphone.');
      setActive(false);
    } finally {
      starting.current = false;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { active, error, frame, start, stop };
}
