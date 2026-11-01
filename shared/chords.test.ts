import { describe, expect, it } from 'vitest';
import { guideLine, guideMoves, guideTones, parseChord, scaleFor, transposeChordName, type Chord } from './chords.ts';
import { nameOf } from './theory.ts';

const spell = (name: string) => parseChord(name)!.tones.map((t) => nameOf(t.spelling));
const c = (name: string): Chord => parseChord(name)!;

describe('parseChord', () => {
  it('spells the common qualities', () => {
    expect(spell('Am7')).toEqual(['A', 'C', 'E', 'G']);
    expect(spell('D7')).toEqual(['D', 'F♯', 'A', 'C']);
    expect(spell('Gmaj7')).toEqual(['G', 'B', 'D', 'F♯']);
    expect(spell('Em')).toEqual(['E', 'G', 'B']);
    expect(spell('F#ø7')).toEqual(['F♯', 'A', 'C', 'E']);
    expect(spell('F#m7b5')).toEqual(['F♯', 'A', 'C', 'E']);
    expect(spell('A')).toEqual(['A', 'C♯', 'E']);
  });
  it('handles alterations and extensions', () => {
    expect(spell('B7(♭9)')).toEqual(['B', 'D♯', 'F♯', 'A', 'C']);
    expect(spell('E7♭9')).toEqual(['E', 'G♯', 'B', 'D', 'F']);
    expect(spell('E7#5♭9')).toEqual(['E', 'G♯', 'B♯', 'D', 'F']);
  });
  it('spells sharps and flats on the root', () => {
    expect(spell('Bbmaj7')).toEqual(['B♭', 'D', 'F', 'A']);
    expect(spell('C#m9')).toEqual(['C♯', 'E', 'G♯', 'B', 'D♯']);
    expect(spell('D#m7♭5')).toEqual(['D♯', 'F♯', 'A', 'C♯']);
    expect(spell('Bm6')).toEqual(['B', 'D', 'F♯', 'G♯']);
    expect(spell('A6')).toEqual(['A', 'C♯', 'E', 'F♯']);
    expect(spell('DMaj7')).toEqual(['D', 'F♯', 'A', 'C♯']);
    expect(spell('G#7')).toEqual(['G♯', 'B♯', 'D♯', 'F♯']);
  });
  it('reads a slash bass and stacked alternatives', () => {
    expect(nameOf(c('Bm7/E').bass!)).toBe('E');
    expect(nameOf(c('C#m9/B#').bass!)).toBe('B♯');
    expect(c('D (F#m)').quality).toBe('major');
    expect(nameOf(c('D (F#m)').root)).toBe('D');
  });
  it('returns null for text that is not a chord', () => {
    expect(parseChord('Fine')).toBeNull();
    expect(parseChord('Swing')).toBeNull();
  });
  it('parses every chord used in the tunes', () => {
    const names = ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'F#ø7', 'B7(♭9)', 'Em', 'Bm7', 'E7', 'C#m', 'F#m', 'DMaj7', 'D6', 'B7', 'C#m7', 'A', 'E9', 'Bm6', 'E7♭9', 'D#m7♭5', 'G#7', 'C#m9', 'C#m9/B#', 'D#m7', 'F#9', 'Bm7/E', 'E7#5♭9', 'A6', 'D (F#m)'];
    for (const n of names) expect(parseChord(n), n).not.toBeNull();
  });
});

describe('guide tones and movement', () => {
  it('finds the 3rd and 7th', () => {
    expect(guideTones(c('Am7')).map((t) => nameOf(t.spelling))).toEqual(['C', 'G']);
    expect(guideTones(c('A6')).map((t) => nameOf(t.spelling))).toEqual(['C♯', 'F♯']);
  });
  it('keeps the common tone and resolves the 7th of Am7 down a half step to the 3rd of D7', () => {
    const moves = guideMoves(c('Am7'), c('D7')).map((m) => [nameOf(m.from.spelling), nameOf(m.to.spelling), m.direction, m.semitones]);
    expect(moves).toEqual([['C', 'C', 'same', 0], ['G', 'F♯', 'down', 1]]);
  });
  it('builds a smooth line through a ii-V-I', () => {
    const line = guideLine([c('Am7'), c('D7'), c('Gmaj7')]);
    expect(line.map((n) => nameOf(n))).toEqual(['C', 'C', 'B']);
    for (let i = 1; i < line.length; i++) expect(Math.abs(line[i].midi - line[i - 1].midi)).toBeLessThanOrEqual(2);
  });
});

describe('scaleFor', () => {
  it('matches the roadmap table', () => {
    expect(scaleFor(c('Am7'))[0].id).toBe('dorian');
    expect(scaleFor(c('D7'))[0].id).toBe('mixolydian');
    expect(scaleFor(c('Gmaj7'))[0].id).toBe('major');
    expect(scaleFor(c('F#ø7'))[0].id).toBe('locrian');
    expect(scaleFor(c('B7(♭9)'))[0].id).toBe('dim-half-whole');
    expect(scaleFor(c('E7#5♭9'))[0].id).toBe('altered');
  });
});

describe('transposeChordName', () => {
  it('moves roots and slash basses, keeping the rest', () => {
    expect(transposeChordName('Am7', 1, 2)).toBe('Bm7');
    expect(transposeChordName('F#ø7', 2, 3)).toBe('Aø7');
    expect(transposeChordName('Bm7/E', 3, 5)).toBe('Em7/A');
    expect(transposeChordName('D (F#m)', 1, 2)).toBe('E (G#m)');
    expect(transposeChordName('B7(♭9)', 1, 1)).toBe('C7(♭9)');
    expect(transposeChordName('Gmaj7', 4, 7)).toBe('Dmaj7');
  });
});
