// Ear-training material and question logic (pure, with an injected random source).

export type EarItem = { id: string; label: string; semitones: number };

/** In the order they are introduced: wide and distinct first, close and confusable last. */
export const INTERVALS: EarItem[] = [
  { id: 'P5', label: 'Perfect 5th', semitones: 7 },
  { id: 'P4', label: 'Perfect 4th', semitones: 5 },
  { id: 'P8', label: 'Octave', semitones: 12 },
  { id: 'M3', label: 'Major 3rd', semitones: 4 },
  { id: 'm3', label: 'Minor 3rd', semitones: 3 },
  { id: 'M6', label: 'Major 6th', semitones: 9 },
  { id: 'm6', label: 'Minor 6th', semitones: 8 },
  { id: 'M2', label: 'Major 2nd', semitones: 2 },
  { id: 'm2', label: 'Minor 2nd', semitones: 1 },
  { id: 'm7', label: 'Minor 7th', semitones: 10 },
  { id: 'M7', label: 'Major 7th', semitones: 11 },
  { id: 'TT', label: 'Tritone', semitones: 6 },
];

export type ChordKind = { id: string; label: string; intervals: number[] };
export const CHORDS: ChordKind[] = [
  { id: 'major', label: 'Major', intervals: [0, 4, 7] },
  { id: 'minor', label: 'Minor', intervals: [0, 3, 7] },
  { id: 'dom7', label: 'Dominant 7', intervals: [0, 4, 7, 10] },
  { id: 'min7', label: 'Minor 7', intervals: [0, 3, 7, 10] },
  { id: 'maj7', label: 'Major 7', intervals: [0, 4, 7, 11] },
  { id: 'm7b5', label: 'Half-diminished', intervals: [0, 3, 6, 10] },
  { id: 'dim7', label: 'Diminished 7', intervals: [0, 3, 6, 9] },
  { id: 'aug', label: 'Augmented', intervals: [0, 4, 8] },
];

export type Stat = { answered: number; correct: number };
export const MIN_UNLOCKED = 3;

/** An item counts as learned after a handful of answers at 80% or better. */
export const learned = (s: Stat | undefined) => Boolean(s && s.answered >= 6 && s.correct / s.answered >= 0.8);

/** How many items (from the start of the list) are in play: a few to begin, one more for each learned. */
export function unlockedCount(order: { id: string }[], stats: Record<string, Stat>, start = MIN_UNLOCKED): number {
  const known = order.filter((o) => learned(stats[o.id])).length;
  return Math.min(order.length, start + known);
}

/** The pool for a round, with the newest items and the weakest ones asked more often. */
export function pickItem<T extends { id: string }>(pool: T[], stats: Record<string, Stat>, random: () => number, last?: string): T {
  const choices = pool.length > 1 ? pool.filter((p) => p.id !== last) : pool;
  const weights = choices.map((c) => {
    const s = stats[c.id];
    if (!s || s.answered === 0) return 2;
    return 0.5 + (1 - s.correct / s.answered) * 3;
  });
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < choices.length; i++) {
    r -= weights[i];
    if (r <= 0) return choices[i];
  }
  return choices[choices.length - 1];
}

export type IntervalQuestion = { item: EarItem; low: number; direction: 'up' | 'down' | 'together' };

/** Written midi numbers for the notes of an interval question, chosen inside the student's range. */
export function intervalNotes(q: IntervalQuestion): [number, number] {
  return q.direction === 'down' ? [q.low + q.item.semitones, q.low] : [q.low, q.low + q.item.semitones];
}

export function makeInterval(pool: EarItem[], stats: Record<string, Stat>, random: () => number, range: { low: number; high: number }, last?: string): IntervalQuestion {
  const item = pickItem(pool, stats, random, last);
  const roll = random();
  const direction = roll < 0.45 ? 'up' : roll < 0.9 ? 'down' : 'together';
  const span = range.high - range.low - item.semitones;
  const low = range.low + Math.floor(random() * (span + 1));
  return { item, low, direction };
}

export function makeChord(pool: ChordKind[], stats: Record<string, Stat>, random: () => number, range: { low: number; high: number }, last?: string): { kind: ChordKind; notes: number[] } {
  const kind = pickItem(pool, stats, random, last);
  const top = Math.max(...kind.intervals);
  const root = range.low + Math.floor(random() * (range.high - top - range.low + 1));
  return { kind, notes: kind.intervals.map((i) => root + i) };
}

/** Four answer choices for an interval or chord: the right one plus others from the unlocked pool (or the next few in the list). */
export function choicesFor<T extends { id: string }>(answer: T, pool: T[], all: T[], random: () => number, count = 4): T[] {
  const others = pool.filter((p) => p.id !== answer.id);
  for (const a of all) if (others.length < count - 1 && a.id !== answer.id && !others.some((o) => o.id === a.id)) others.push(a);
  const picked: T[] = [];
  const bag = [...others];
  while (picked.length < Math.min(count - 1, others.length)) picked.push(bag.splice(Math.floor(random() * bag.length), 1)[0]);
  const all4 = [answer, ...picked];
  for (let i = all4.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all4[i], all4[j]] = [all4[j], all4[i]];
  }
  return all4;
}
