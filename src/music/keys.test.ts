import { describe, expect, it } from 'vitest';
import { keyAccidentals, keySigFor } from './keys.ts';
import { scaleSpellings } from './build.ts';

const sig = (tonic: string, degrees: string[]) => keySigFor(scaleSpellings(tonic, degrees));
const MAJOR = ['1', '2', '3', '4', '5', '6', '7'];
const DORIAN = ['1', '2', 'b3', '4', '5', '6', 'b7'];
const MINOR = ['1', '2', 'b3', '4', '5', 'b6', 'b7'];

describe('keyAccidentals', () => {
  it('lists the accidentals of a key', () => {
    expect(keyAccidentals('G')[3]).toBe(1); // F♯
    expect(keyAccidentals('Bb')[6]).toBe(-1);
    expect(keyAccidentals('Bb')[2]).toBe(-1);
    expect(keyAccidentals('C')).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('keySigFor', () => {
  it('finds the key signature of a major scale', () => {
    expect(sig('C', MAJOR)).toBe('C');
    expect(sig('E', MAJOR)).toBe('E');
    expect(sig('Eb', MAJOR)).toBe('Eb');
  });
  it('finds the signature of modes and minors', () => {
    expect(sig('D', DORIAN)).toBe('C');
    expect(sig('A', MINOR)).toBe('C');
    expect(sig('E', MINOR)).toBe('G');
    expect(sig('D', MINOR)).toBe('F');
  });
  it('has none when the scale needs accidentals beyond a key (harmonic minor, blues)', () => {
    expect(sig('A', ['1', '2', 'b3', '4', '5', 'b6', '7'])).toBeUndefined();
    expect(sig('C', ['1', 'b3', '4', 'b5|#4', '5', 'b7'])).toBeUndefined();
  });
  it('works for pentatonic subsets', () => {
    expect(sig('G', ['1', '2', '3', '5', '6'])).toBe('G');
  });
});
