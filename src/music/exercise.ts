import { pcOf, type Note, type Spelling } from '../../shared/theory.ts';
import type { ScoreItem } from '../notation/Score.tsx';
import { fullRange } from './build.ts';

// Sight-reading generator: a seeded random walk through a scale, in 4/4.

type Duration = ScoreItem['duration'];

const RHYTHMS: Duration[][] = [
  ['q', 'q', 'q', 'q'],
  ['h', 'q', 'q'],
  ['q', 'q', 'h'],
  ['8', '8', 'q', 'q', 'q'],
  ['q', '8', '8', 'q', 'q'],
  ['q', 'q', '8', '8', 'q'],
  ['8', '8', '8', '8', 'h'],
  ['q', '8', '8', '8', '8', 'q'],
];
const STEPS = [-2, -1, -1, -1, 1, 1, 1, 2, -3, 3];

/** Small deterministic PRNG so an exercise can be replayed from its seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Options = { spellings: Spelling[]; low: number; high: number; bars: number; seed: number; maxLeap?: number };

export function generateExercise({ spellings, low, high, bars, seed, maxLeap = 7 }: Options): ScoreItem[][] {
  const random = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(random() * xs.length)];
  const pool = fullRange(spellings, low, high);
  const tonicPc = pcOf(spellings[0]);
  const nearestTonic = (midi: number) =>
    pool.filter((n) => n.midi % 12 === tonicPc).reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));

  let i = pool.indexOf(nearestTonic(67));
  const out: ScoreItem[][] = [];
  for (let b = 0; b < bars; b++) {
    const last = b === bars - 1;
    const rhythm = last ? pick<Duration[]>([['w'], ['h', 'h'], ['q', 'q', 'h']]) : pick(RHYTHMS);
    const bar: ScoreItem[] = rhythm.map((duration, k) => {
      let note: Note;
      if (last && k === rhythm.length - 1) {
        note = nearestTonic(pool[i].midi);
      } else if (b === 0 && k === 0) {
        note = pool[i];
      } else {
        let next = i + pick(STEPS);
        if (next < 0 || next >= pool.length) next = i - Math.sign(next - i);
        if (Math.abs(pool[next].midi - pool[i].midi) > maxLeap) next = i + Math.sign(next - i);
        i = Math.max(0, Math.min(pool.length - 1, next));
        note = pool[i];
      }
      return { note, duration };
    });
    out.push(bar);
  }
  return out;
}
