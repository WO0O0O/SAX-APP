import { FINGERINGS, type KeyId } from '../fingering/fingerings.ts';

// Fingering quiz logic: answer checking, weighting toward weak notes, and wrong options.
// Pure functions with an injected random source so they can be tested.

export type QuizMode = 'note-keys' | 'keys-note';
export type NoteStat = { answered: number; correct: number; lookups: number };
export type Stats = Record<number, NoteStat>;

export const ROUND_LENGTH = 20;

/** True if exactly these keys are one of the note's fingerings (alternates count, a missing octave key does not). */
export function checkKeys(midi: number, pressed: KeyId[]): boolean {
  const set = new Set(pressed);
  return (FINGERINGS[midi] ?? []).some((f) => f.keys.length === set.size && f.keys.every((k) => set.has(k)));
}

/** How likely a note is to be asked: new notes, misses and lookups raise it. */
export function weightOf(stat: NoteStat | undefined): number {
  if (!stat || stat.answered === 0) return 1.5 + Math.min(stat?.lookups ?? 0, 10) * 0.3;
  const missRate = 1 - stat.correct / stat.answered;
  return 0.4 + missRate * 3 + Math.min(stat.lookups, 10) * 0.3;
}

export type PickInput = {
  pool: number[];
  stats: Stats;
  /** Notes missed this round, oldest first. They come back after a couple of other questions. */
  retry: { midi: number; askedAt: number }[];
  /** Questions asked so far this round. */
  asked: number;
  last?: number;
  random: () => number;
};

const RETRY_GAP = 3;

export function pickNote({ pool, stats, retry, asked, last, random }: PickInput): number {
  const due = retry.find((r) => asked - r.askedAt >= RETRY_GAP && r.midi !== last);
  if (due) return due.midi;
  const candidates = pool.filter((m) => m !== last);
  const list = candidates.length ? candidates : pool;
  const weights = list.map((m) => weightOf(stats[m]));
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

/** Three wrong notes near the right one (so it isn't trivially easy), shuffled with it. */
export function optionsFor(midi: number, pool: number[], random: () => number): number[] {
  const near = (range: number[]) =>
    range
      .filter((m) => m !== midi && FINGERINGS[m])
      .sort((a, b) => Math.abs(a - midi) - Math.abs(b - midi) || a - b);
  const wrong = near(pool).slice(0, 5);
  for (const m of near(Object.keys(FINGERINGS).map(Number))) {
    if (wrong.length >= 5) break;
    if (!wrong.includes(m)) wrong.push(m);
  }
  const chosen: number[] = [];
  while (chosen.length < 3 && wrong.length) chosen.push(wrong.splice(Math.floor(random() * Math.min(wrong.length, 5)), 1)[0]);
  const all = [midi, ...chosen];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

const BLACK: Record<number, [string, string]> = { 1: ['C♯', 'D♭'], 3: ['D♯', 'E♭'], 6: ['F♯', 'G♭'], 8: ['G♯', 'A♭'], 10: ['A♯', 'B♭'] };
const WHITE: Record<number, string> = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };

/** Display name(s) for a written midi note: 'G4', or 'G♯4 / A♭4' for a black key (same fingering). */
export function namesOf(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const pc = midi % 12;
  return BLACK[pc] ? `${BLACK[pc][0]}${octave} / ${BLACK[pc][1]}${octave}` : `${WHITE[pc]}${octave}`;
}
