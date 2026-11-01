import { describe, expect, it } from 'vitest';
import { noteName } from '../../shared/theory.ts';
import { parseChart, type ChartFile } from './chart.ts';
import { keyChoices, transposeChart } from './transpose.ts';

// G major / E minor, like Autumn Leaves.
const chart = parseChart({
  title: 't', arranger: '', writtenKey: 'E minor / G major', concertKey: '', keySig: 'G',
  bars: [
    { notes: 'E5/q F#5/q G5/q B5/q', chords: ['Am7', 'D7@2'] },
    { notes: 'B5/q C#6/q D#6/q r/q', chords: ['F#ø7'] },
  ],
} as ChartFile);
const names = (c: ReturnType<typeof transposeChart>) => c.bars.flat().filter((i) => i.note).map((i) => noteName(i.note!));

describe('transposeChart', () => {
  it('returns the same chart for 0', () => {
    expect(transposeChart(chart, 0)).toBe(chart);
  });
  it('moves up a tone: G -> A, spelling follows the new key signature', () => {
    const up = transposeChart(chart, 2);
    expect(up.keySig).toBe('A');
    expect(names(up)).toEqual(['F♯5', 'G♯5', 'A5', 'C♯6', 'C♯6', 'D♯6', 'E♯6']);
    expect(up.chords[0].map((c) => c.name)).toEqual(['Bm7', 'E7']);
    expect(up.chords[1][0].name).toBe('G#ø7');
  });
  it('moves down: G -> F gives flats', () => {
    const down = transposeChart(chart, -2);
    expect(down.keySig).toBe('F');
    expect(names(down)[0]).toBe('D5');
    expect(down.chords[0].map((c) => c.name)).toEqual(['Gm7', 'C7']);
  });
  it('keeps every midi exactly semis away and rests untouched', () => {
    for (const semis of [-6, -3, 1, 5]) {
      const t = transposeChart(chart, semis);
      t.bars.flat().forEach((it, i) => {
        const orig = chart.bars.flat()[i];
        expect(Boolean(it.note)).toBe(Boolean(orig.note));
        if (it.note) expect(it.note.midi).toBe(orig.note!.midi + semis);
      });
    }
  });
  it('offers 12 key choices from a tritone down to a tritone up', () => {
    const choices = keyChoices('G');
    expect(choices).toHaveLength(12);
    expect(choices[0].semis).toBe(-6);
    expect(choices.find((c) => c.semis === 0)!.keySig).toBe('G');
    expect(choices.find((c) => c.semis === 2)!.keySig).toBe('A');
    expect(choices.find((c) => c.semis === -2)!.keySig).toBe('F');
  });
});
