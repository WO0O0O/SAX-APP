import type { SchedEvent } from './transport.ts';

export type Subdivision = 'none' | 'eighths' | 'triplets';

/** One bar of clicks (a loop). Beats are quarter notes; the accent is beat 1. Swing delays the off-beat eighth. */
export function metronomeBar(beats: number, sub: Subdivision, swing: boolean): SchedEvent[] {
  const events: SchedEvent[] = [];
  for (let b = 0; b < beats; b++) {
    events.push({ start: b, dur: 0.1, kind: 'click', accent: b === 0, item: b });
    if (sub === 'eighths') events.push({ start: b + (swing ? 2 / 3 : 0.5), dur: 0.1, kind: 'click', gain: 0.5 });
    if (sub === 'triplets') {
      events.push({ start: b + 1 / 3, dur: 0.1, kind: 'click', gain: 0.5 });
      events.push({ start: b + 2 / 3, dur: 0.1, kind: 'click', gain: 0.5 });
    }
  }
  return events;
}

/** Tap tempo: the average gap between the last few taps, as bpm. Taps more than 2 seconds apart start over. */
export function tapTempo(taps: number[]): number | undefined {
  const recent: number[] = [];
  for (let i = taps.length - 1; i >= 0; i--) {
    if (recent.length && recent[0] - taps[i] > 2000) break;
    recent.unshift(taps[i]);
  }
  const use = recent.slice(-5);
  if (use.length < 2) return undefined;
  const gap = (use[use.length - 1] - use[0]) / (use.length - 1);
  return Math.max(40, Math.min(220, Math.round(60000 / gap)));
}
