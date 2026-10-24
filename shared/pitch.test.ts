import { describe, expect, it } from 'vitest';
import { chromaticRange, fromMidi, toMidi } from './pitch.ts';

describe('pitch', () => {
  it('parses sharps and flats to the same midi number', () => {
    expect(toMidi('C4')).toBe(60);
    expect(toMidi('D#6')).toBe(87);
    expect(toMidi('Eb6')).toBe(87);
    expect(toMidi('Bb3')).toBe(58);
  });

  it('round-trips with canonical spelling', () => {
    expect(fromMidi(87)).toBe('Eb6');
    expect(fromMidi(66)).toBe('F#4');
    expect(fromMidi(toMidi('A#4'))).toBe('Bb4');
  });

  it('builds the student range C4 to D#6 (28 notes)', () => {
    const r = chromaticRange('C4', 'D#6');
    expect(r).toHaveLength(28);
    expect(r[0]).toBe('C4');
    expect(r.at(-1)).toBe('Eb6');
  });

  it('rejects junk', () => {
    expect(() => toMidi('H2')).toThrow();
  });
});
