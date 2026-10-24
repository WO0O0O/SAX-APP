import { describe, expect, it } from 'vitest';
import { nameOf, noteName } from '../../shared/theory.ts';
import { fullRange, oneOctave, scaleSpellings } from './build.ts';
import { SCALES } from './scales.ts';

describe('scale building', () => {
  it('one octave of G major starts on G4', () => {
    const notes = oneOctave(scaleSpellings('G', SCALES[0].degrees)).map(noteName);
    expect(notes).toEqual(['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F♯5', 'G5']);
  });

  it('full range of C major runs from B3 to F6', () => {
    const notes = fullRange(scaleSpellings('C', SCALES[0].degrees)).map(noteName);
    expect(notes[0]).toBe('B3');
    expect(notes.at(-1)).toBe('F6');
    expect(notes).toHaveLength(19);
  });

  it('blues uses b5 but avoids F-flat', () => {
    const blues = SCALES.find((s) => s.id === 'blues')!;
    expect(scaleSpellings('A', blues.degrees).map(nameOf)).toEqual(['A', 'C', 'D', 'E♭', 'E', 'G']);
    expect(scaleSpellings('Bb', blues.degrees).map(nameOf)).toEqual(['B♭', 'D♭', 'E♭', 'E', 'F', 'A♭']);
  });

  it('full range never leaves low Bb to high F#', () => {
    for (const scale of SCALES) {
      for (const tonic of ['C', 'F#', 'Db', 'A#']) {
        for (const n of fullRange(scaleSpellings(tonic, scale.degrees))) {
          expect(n.midi).toBeGreaterThanOrEqual(58);
          expect(n.midi).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  it('every scale degree spells to a distinct pitch class', () => {
    for (const scale of SCALES) {
      const pcs = new Set(oneOctave(scaleSpellings('C', scale.degrees)).slice(0, -1).map((n) => n.midi % 12));
      expect(pcs.size, scale.id).toBe(scale.degrees.length);
    }
  });
});
