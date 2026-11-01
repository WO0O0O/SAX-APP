import { hzToMidi } from '../audio/pitch.ts';

// From a detected frequency to "what written note, how many cents off".

export type TuningMode = 'casual' | 'pro';
/** Cents either side of the note that count as in tune (the same numbers as the iOS app). */
export const TOLERANCE: Record<TuningMode, number> = { casual: 12, pro: 5 };

export type Reading = {
  /** Written alto midi note. */
  midi: number;
  /** Cents above (+) or below (-) that note. */
  cents: number;
  /** Detected frequency, for display. */
  hz: number;
};

export const inTune = (cents: number, mode: TuningMode) => Math.abs(cents) <= TOLERANCE[mode];

/** Concert frequency -> written alto note (written = concert + 9 semitones). */
export function readingFromHz(hz: number, a4 = 440): Reading {
  const { midi, cents } = hzToMidi(hz, a4);
  return { midi: midi + 9, cents, hz };
}

/**
 * Steadies the readings: the median of the last few frames throws out octave jumps and single bad frames,
 * and the displayed note only changes once the pitch is clearly closer to another note (no flicker at the boundary).
 */
export class PitchSmoother {
  private history: number[] = []; // exact (fractional) concert midi numbers
  private misses = 0;
  private note: number | null = null;
  private size: number;

  constructor(size = 5) {
    this.size = size;
  }

  /** Feed a frequency, or null for "no clear pitch this frame". Returns the steadied reading, or null. */
  push(hz: number | null, a4 = 440): Reading | null {
    if (hz === null) {
      if (++this.misses >= 4) {
        this.history = [];
        this.note = null;
      }
      return this.history.length >= 3 ? this.read(a4) : null;
    }
    this.misses = 0;
    this.history.push(69 + 12 * Math.log2(hz / a4));
    if (this.history.length > this.size) this.history.shift();
    return this.history.length >= 3 ? this.read(a4) : null;
  }

  private read(a4: number): Reading {
    const sorted = [...this.history].sort((a, b) => a - b);
    const exact = sorted[sorted.length >> 1];
    if (this.note === null || Math.abs(exact - this.note) > 0.62) this.note = Math.round(exact);
    return { midi: this.note + 9, cents: (exact - this.note) * 100, hz: a4 * 2 ** ((exact - 69) / 12) };
  }

  reset() {
    this.history = [];
    this.misses = 0;
    this.note = null;
  }
}
