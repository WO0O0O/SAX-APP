import type { Reading } from './analysis.ts';

/** Collects how sharp or flat each written note is played, skipping the wobbly first moments of each note. */
export class IntonationLog {
  private totals = new Map<number, { n: number; sum: number }>();
  private current: { midi: number; since: number } | null = null;
  settle: number;

  constructor(settle = 0.2) {
    this.settle = settle;
  }

  add(t: number, reading: Reading | null) {
    if (!reading) {
      this.current = null;
      return;
    }
    if (reading.midi < 58 || reading.midi > 90) {
      this.current = null; // not a note on the horn: a hum, breath noise or an octave glitch
      return;
    }
    if (!this.current || this.current.midi !== reading.midi) {
      this.current = { midi: reading.midi, since: t };
      return;
    }
    if (t - this.current.since < this.settle || Math.abs(reading.cents) > 49) return;
    const cur = this.totals.get(reading.midi) ?? { n: 0, sum: 0 };
    cur.n++;
    cur.sum += reading.cents;
    this.totals.set(reading.midi, cur);
  }

  /** Everything collected so far, and starts a fresh batch (for sending to the Mac in chunks). */
  take(): { midi: number; n: number; sum: number }[] {
    const out = [...this.totals].map(([midi, v]) => ({ midi, n: v.n, sum: +v.sum.toFixed(2) }));
    this.totals.clear();
    return out;
  }
}
