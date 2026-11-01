import { inTune, type Reading, type TuningMode } from './analysis.ts';

// Long-tone endurance (from LongToneView.swift): the timer runs while you hold a note in tune and starts over
// once you have been out of tune, or silent, for 0.3 seconds.

export const GRACE = 0.3;
/** The pressure bar fills over this many seconds. */
export const FULL_BAR = 30;

export type Drop = { midi: number; seconds: number; reason: 'sharp' | 'flat' | 'silence' | 'changed' };
export type Frame = { dt: number; sounding: boolean; reading: Reading | null; mode: TuningMode };

export class LongTone {
  duration = 0;
  midi: number | null = null;
  private out = 0;

  /** Advance by one frame. Returns a Drop when a hold ends. */
  update({ dt, sounding, reading, mode }: Frame): Drop | undefined {
    const good = sounding && reading !== null && inTune(reading.cents, mode);
    if (good) {
      if (this.midi !== null && reading!.midi !== this.midi) {
        const drop = this.finish('changed');
        this.midi = reading!.midi;
        this.duration = dt;
        this.out = 0;
        return drop;
      }
      this.midi = reading!.midi;
      this.out = 0;
      this.duration += dt;
      return undefined;
    }
    if (this.midi === null) return undefined;
    this.out += dt;
    if (this.out >= GRACE) return this.finish(!sounding || !reading ? 'silence' : reading.cents > 0 ? 'sharp' : 'flat');
    return undefined;
  }

  /** Ends the current hold, e.g. when the tuner is stopped. */
  finish(reason: Drop['reason'] = 'silence'): Drop | undefined {
    const drop = this.midi !== null && this.duration > 0 ? { midi: this.midi, seconds: this.duration, reason } : undefined;
    this.duration = 0;
    this.midi = null;
    this.out = 0;
    return drop;
  }
}

/** Colour of the pressure bar: it warms up as the hold goes on. */
export const pressureColor = (seconds: number) => (seconds < 10 ? '#38bdf8' : seconds < 20 ? '#facc15' : seconds < FULL_BAR ? '#f08c32' : '#ef4444');
