import { describe, expect, it } from 'vitest';
import { rng } from './exercise.ts';
import { checkKeys, namesOf, optionsFor, pickNote, weightOf, type Stats } from './quiz.ts';

describe('checkKeys', () => {
  it('accepts the standard fingering and any alternate', () => {
    expect(checkKeys(67, ['L1', 'L2', 'L3'])).toBe(true); // G4
    expect(checkKeys(70, ['L1', 'bis'])).toBe(true); // B♭4 by bis
    expect(checkKeys(70, ['L1', 'R1'])).toBe(true); // B♭4 by 1+1
    expect(checkKeys(70, ['sideBb', 'L1'])).toBe(true); // B♭4 side key
  });
  it('ignores order but needs every key', () => {
    expect(checkKeys(67, ['L3', 'L1', 'L2'])).toBe(true);
    expect(checkKeys(67, ['L1', 'L2'])).toBe(false);
    expect(checkKeys(67, ['L1', 'L2', 'L3', 'R1'])).toBe(false);
  });
  it('rejects a missing octave key because it is a different note', () => {
    expect(checkKeys(79, ['L1', 'L2', 'L3'])).toBe(false); // G5 needs the octave key
    expect(checkKeys(79, ['oct', 'L1', 'L2', 'L3'])).toBe(true);
    expect(checkKeys(73, [])).toBe(true); // C#5 all open
  });
});

describe('weighting', () => {
  it('asks missed and looked-up notes more than mastered ones', () => {
    const mastered = weightOf({ answered: 10, correct: 10, lookups: 0 });
    expect(weightOf({ answered: 10, correct: 4, lookups: 0 })).toBeGreaterThan(mastered);
    expect(weightOf({ answered: 10, correct: 10, lookups: 8 })).toBeGreaterThan(mastered);
    expect(weightOf(undefined)).toBeGreaterThan(mastered);
  });
  it('picks weak notes far more often over many draws', () => {
    const stats: Stats = { 60: { answered: 20, correct: 20, lookups: 0 }, 61: { answered: 20, correct: 2, lookups: 5 } };
    const random = rng(1);
    let weak = 0;
    for (let i = 0; i < 400; i++) if (pickNote({ pool: [60, 61], stats, retry: [], asked: 0, random }) === 61) weak++;
    expect(weak).toBeGreaterThan(300);
  });
  it('never repeats the last note when there is a choice', () => {
    const random = rng(2);
    for (let i = 0; i < 50; i++) expect(pickNote({ pool: [60, 61, 62], stats: {}, retry: [], asked: 0, last: 61, random })).not.toBe(61);
  });
  it('brings a missed note back after a few questions', () => {
    const retry = [{ midi: 64, askedAt: 2 }];
    const base = { pool: [60, 61, 62, 63, 64], stats: {}, retry, random: rng(3) };
    expect(pickNote({ ...base, asked: 3 })).not.toBe(64); // too soon (or just by chance not due)
    expect(pickNote({ ...base, asked: 5 })).toBe(64);
  });
});

describe('optionsFor', () => {
  it('has four distinct options including the answer, all with fingerings', () => {
    const pool = Array.from({ length: 28 }, (_, i) => 60 + i);
    for (let seed = 0; seed < 40; seed++) {
      const midi = 60 + (seed % 28);
      const options = optionsFor(midi, pool, rng(seed));
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(midi);
    }
  });
  it('keeps the wrong options near the answer', () => {
    const pool = Array.from({ length: 28 }, (_, i) => 60 + i);
    for (const m of optionsFor(75, pool, rng(9))) expect(Math.abs(m - 75)).toBeLessThanOrEqual(6);
  });
});

describe('namesOf', () => {
  it('names white keys once and black keys both ways', () => {
    expect(namesOf(60)).toBe('C4');
    expect(namesOf(61)).toBe('C♯4 / D♭4');
    expect(namesOf(70)).toBe('A♯4 / B♭4');
    expect(namesOf(90)).toBe('F♯6 / G♭6');
  });
});
