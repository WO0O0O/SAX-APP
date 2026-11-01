import { describe, expect, it } from 'vitest';
import { parseChord } from '../../shared/chords.ts';
import { nameOf, noteName } from '../../shared/theory.ts';
import { parseChart, type ChartFile } from './chart.ts';
import { arpeggio, chordPerItem, chordToneRange, pickerFor, ROLE_COLORS, toneColors } from './chordTones.ts';

const file: ChartFile = {
  title: 't', arranger: '', writtenKey: 'G', concertKey: 'F', keySig: 'G',
  bars: [
    { notes: 'E5/q G5/q B5/q D5/q', chords: ['Em7'] }, // all chord tones
    { notes: 'F#5/q A5/h r/q' }, // no chord here: Em7 carries over -> F# is the 9th, A is not a tone
    { notes: 'G5/h C5/h', chords: ['Am7', 'D7@2'] }, // G = 7th of Am7; C = 7th of D7
  ],
};
const chart = parseChart(file);

describe('chord tones in a chart', () => {
  it('finds the chord under each note, carrying it across bars and changing mid-bar', () => {
    const names = chordPerItem(chart).map((c) => c?.name);
    expect(names).toEqual(['Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Am7', 'D7']);
  });
  it('colours chord tones by role and leaves other notes uncoloured', () => {
    const c = toneColors(chart);
    expect(c[0]).toBe(ROLE_COLORS.root); // E over Em7
    expect(c[2]).toBe(ROLE_COLORS.fifth); // B
    expect(c[3]).toBe(ROLE_COLORS.seventh); // D
    expect(c[5]).toBeUndefined(); // A is not in Em7
    expect(c[7]).toBe(ROLE_COLORS.seventh); // G over Am7
    expect(c[8]).toBe(ROLE_COLORS.seventh); // C over D7
  });
  it('colours the 3rd', () => {
    expect(toneColors(chart)[1]).toBe(ROLE_COLORS.third); // G over Em7
  });
});

describe('arpeggio and range', () => {
  it('rises from the root and ends on the octave', () => {
    const notes = arpeggio(parseChord('Am7')!).map(noteName);
    expect(notes).toEqual(['A4', 'C5', 'E5', 'G5', 'A5']);
  });
  it('spells enharmonics from the chord', () => {
    expect(arpeggio(parseChord('F#7')!).map((n) => nameOf(n))).toEqual(['F♯', 'A♯', 'C♯', 'E', 'F♯']);
  });
  it('lists every chord tone in the student range, low to high', () => {
    const notes = chordToneRange(parseChord('Am7')!);
    expect(notes[0].midi).toBeGreaterThanOrEqual(60);
    expect(notes.at(-1)!.midi).toBeLessThanOrEqual(87);
    expect(notes.every((n, i) => i === 0 || n.midi > notes[i - 1].midi)).toBe(true);
  });
});

describe('pickerFor', () => {
  it('finds circle positions, including enharmonic spellings', () => {
    expect(pickerFor({ letter: 0, acc: 0 })).toEqual({ pos: 0, alt: false });
    expect(pickerFor({ letter: 6, acc: -1 })).toEqual({ pos: 10, alt: false }); // Bb
    expect(pickerFor({ letter: 3, acc: 1 })).toEqual({ pos: 6, alt: false }); // F#
    expect(pickerFor({ letter: 2, acc: 1 })).toEqual({ pos: 11, alt: false }); // E# = F
    expect(pickerFor({ letter: 4, acc: 1 })).toEqual({ pos: 8, alt: true }); // G#
  });
});
