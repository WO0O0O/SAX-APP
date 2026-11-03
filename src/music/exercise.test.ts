import { describe, expect, it } from 'vitest';
import { scaleSpellings } from './build.ts';
import { generateExercise } from './exercise.ts';
import { SCALES } from './scales.ts';

const BEATS = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };

describe('exercise generator', () => {
  for (const scale of SCALES) {
    it(`${scale.id}: stays in range, in the scale, 4 beats a bar, ends on the tonic`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const spellings = scaleSpellings('Eb', scale.degrees);
        const bars = generateExercise({ spellings, low: 60, high: 87, bars: 4, seed });
        expect(bars).toHaveLength(4);
        for (const bar of bars) {
          expect(bar.reduce((sum, it) => sum + BEATS[it.duration], 0)).toBe(4);
          for (const it of bar) {
            const note = it.note!;
            expect(note.midi).toBeGreaterThanOrEqual(60);
            expect(note.midi).toBeLessThanOrEqual(87);
            expect(spellings.some((s) => s.letter === note.letter && s.acc === note.acc)).toBe(true);
          }
        }
        expect(bars.at(-1)!.at(-1)!.note!.midi % 12).toBe(3); // Eb
      }
    });
  }

  it('is reproducible from its seed', () => {
    const spellings = scaleSpellings('G', SCALES[0].degrees);
    const a = generateExercise({ spellings, low: 60, high: 87, bars: 4, seed: 42 });
    const b = generateExercise({ spellings, low: 60, high: 87, bars: 4, seed: 42 });
    expect(a).toEqual(b);
  });
});

describe('weighted exercises', () => {
  const spellings = scaleSpellings('C', ['1', '2', '3', '4', '5', '6', '7']);
  const base = { spellings, low: 60, high: 84, bars: 8 };
  it('lands on a favoured note more often and still stays in range and in the scale', () => {
    const count = (weight?: (m: number) => number) => {
      let hits = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const notes = generateExercise({ ...base, seed, weight }).flat().map((it) => it.note!);
        for (const n of notes) {
          expect(n.midi).toBeGreaterThanOrEqual(60);
          expect(n.midi).toBeLessThanOrEqual(84);
          expect([0, 2, 4, 5, 7, 9, 11]).toContain(n.midi % 12);
        }
        hits += notes.filter((n) => n.midi % 12 === 9).length; // A
      }
      return hits;
    };
    expect(count((m) => (m % 12 === 9 ? 8 : 1))).toBeGreaterThan(count() * 1.4);
  });
  it('is repeatable from its seed', () => {
    const w = (m: number) => (m % 12 === 4 ? 5 : 1);
    expect(generateExercise({ ...base, seed: 5, weight: w })).toEqual(generateExercise({ ...base, seed: 5, weight: w }));
  });
});
