import { describe, expect, it } from 'vitest';
import { scaleSpellings } from './build.ts';
import { generateExercise } from './exercise.ts';
import { SCALES } from './scales.ts';

const BEATS = { w: 4, h: 2, q: 1, '8': 0.5 };

describe('exercise generator', () => {
  for (const scale of SCALES) {
    it(`${scale.id}: stays in range, in the scale, 4 beats a bar, ends on the tonic`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const spellings = scaleSpellings('Eb', scale.degrees);
        const bars = generateExercise({ spellings, low: 60, high: 87, bars: 4, seed });
        expect(bars).toHaveLength(4);
        for (const bar of bars) {
          expect(bar.reduce((sum, it) => sum + BEATS[it.duration], 0)).toBe(4);
          for (const { note } of bar) {
            expect(note.midi).toBeGreaterThanOrEqual(60);
            expect(note.midi).toBeLessThanOrEqual(87);
            expect(spellings.some((s) => s.letter === note.letter && s.acc === note.acc)).toBe(true);
          }
        }
        expect(bars.at(-1)!.at(-1)!.note.midi % 12).toBe(3); // Eb
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
