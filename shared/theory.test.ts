import { describe, expect, it } from 'vitest';
import { atMidi, concertToWritten, nameOf, noteName, parseSpelling, spellDegree, writtenToConcert } from './theory.ts';

const spell = (tonic: string, degrees: string[]) => degrees.map((d) => nameOf(spellDegree(parseSpelling(tonic), d)));

describe('transposition (alto = concert + major 6th)', () => {
  it.each([
    ['C', 'A'],
    ['Bb', 'G'],
    ['G', 'E'],
    ['F', 'D'],
    ['Eb', 'C'],
    ['Db', 'Bb'],
    ['F#', 'D#'],
  ])('concert %s -> written %s', (concert, written) => {
    expect(nameOf(concertToWritten(parseSpelling(concert)))).toBe(nameOf(parseSpelling(written)));
    expect(nameOf(writtenToConcert(parseSpelling(written)))).toBe(nameOf(parseSpelling(concert)));
  });
});

describe('spelling', () => {
  const MAJOR = ['1', '2', '3', '4', '5', '6', '7'];
  it('uses one letter per degree', () => {
    expect(spell('F#', MAJOR)).toEqual(['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯']);
    expect(spell('Gb', MAJOR)).toEqual(['G♭', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F']);
  });
  it('spells minor and blues degrees', () => {
    expect(spell('E', ['1', '2', 'b3', '4', '5', 'b6', '7'])).toEqual(['E', 'F♯', 'G', 'A', 'B', 'C', 'D♯']);
    expect(spell('A', ['1', 'b3', '4', 'b5', '5', 'b7'])).toEqual(['A', 'C', 'D', 'E♭', 'E', 'G']);
  });
  it('places notes in the right octave across C/B boundaries', () => {
    expect(noteName(atMidi(parseSpelling('B#'), 60))).toBe('B♯3');
    expect(noteName(atMidi(parseSpelling('Cb'), 59))).toBe('C♭4');
  });
});
