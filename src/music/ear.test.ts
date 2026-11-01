import { describe, expect, it } from 'vitest';
import { CHORDS, INTERVALS, choicesFor, intervalNotes, learned, makeChord, makeInterval, pickItem, unlockedCount } from './ear.ts';
import { rng } from './exercise.ts';

const range = { low: 60, high: 84 };

describe('unlocking', () => {
  it('starts with three items and adds one for each learned', () => {
    expect(unlockedCount(INTERVALS, {})).toBe(3);
    const stats = { P5: { answered: 8, correct: 8 }, P4: { answered: 6, correct: 5 }, P8: { answered: 3, correct: 3 } };
    expect(unlockedCount(INTERVALS, stats)).toBe(5); // P5 and P4 learned, the octave not yet
  });
  it('needs enough answers at 80% or better to count as learned', () => {
    expect(learned({ answered: 5, correct: 5 })).toBe(false);
    expect(learned({ answered: 10, correct: 7 })).toBe(false);
    expect(learned({ answered: 10, correct: 8 })).toBe(true);
  });
  it('never unlocks more than exist', () => {
    const all = Object.fromEntries(INTERVALS.map((i) => [i.id, { answered: 10, correct: 10 }]));
    expect(unlockedCount(INTERVALS, all)).toBe(INTERVALS.length);
  });
});

describe('questions', () => {
  it('keeps interval notes inside the range and the right distance apart', () => {
    const random = rng(4);
    for (let n = 0; n < 200; n++) {
      const q = makeInterval(INTERVALS, {}, random, range);
      const [a, b] = intervalNotes(q);
      expect(Math.abs(b - a)).toBe(q.item.semitones);
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(range.low);
      expect(Math.max(a, b)).toBeLessThanOrEqual(range.high);
    }
  });
  it('builds chords with the right intervals inside the range', () => {
    const random = rng(7);
    for (let n = 0; n < 100; n++) {
      const { kind, notes } = makeChord(CHORDS, {}, random, range);
      expect(notes.map((m) => m - notes[0])).toEqual(kind.intervals);
      expect(notes.at(-1)!).toBeLessThanOrEqual(range.high);
    }
  });
  it('avoids repeating the last item and favours weak ones', () => {
    const random = rng(2);
    const pool = INTERVALS.slice(0, 3);
    for (let n = 0; n < 40; n++) expect(pickItem(pool, {}, random, 'P5').id).not.toBe('P5');
    const stats = { P5: { answered: 20, correct: 20 }, P4: { answered: 20, correct: 4 }, P8: { answered: 20, correct: 20 } };
    let weak = 0;
    for (let n = 0; n < 300; n++) if (pickItem(pool, stats, random).id === 'P4') weak++;
    expect(weak).toBeGreaterThan(150);
  });
  it('offers four distinct choices including the answer, topping up from the full list', () => {
    const random = rng(3);
    const pool = INTERVALS.slice(0, 3);
    const ch = choicesFor(pool[0], pool, INTERVALS, random);
    expect(ch).toHaveLength(4);
    expect(new Set(ch.map((c) => c.id)).size).toBe(4);
    expect(ch.map((c) => c.id)).toContain('P5');
  });
});
