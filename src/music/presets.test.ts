import { describe, expect, it } from 'vitest';
import { parseChord } from '../../shared/chords.ts';
import { nameOf } from '../../shared/theory.ts';
import { beatsOf, parseChart } from './chart.ts';
import { BACKING_KEYS, PRESETS, presetChart } from './presets.ts';
import { SCALES } from './scales.ts';

describe('practice grooves', () => {
  it('every groove in every key parses: chords are real, bars are 4 beats, scales exist', () => {
    for (const preset of PRESETS) {
      for (const key of BACKING_KEYS) {
        const chart = parseChart(presetChart(preset, key));
        expect(chart.bars).toHaveLength(preset.bars.length);
        for (const bar of chart.bars) expect(bar.reduce((s, it) => s + beatsOf(it), 0) || 4).toBe(4);
        for (const c of chart.chords.flat()) expect(parseChord(c.name), `${preset.id} in ${key}: ${c.name}`).not.toBeNull();
      }
      for (const id of preset.scales) expect(SCALES.some((s) => s.id === id), id).toBe(true);
    }
  });
  it('spells the 12-bar blues correctly', () => {
    const f = parseChart(presetChart(PRESETS.find((p) => p.id === 'blues')!, 'F'));
    expect(f.chords.map((b) => b.map((c) => c.name).join(' '))).toEqual(['F7', 'F7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'F7', 'C7', 'Bb7', 'F7', 'F7 C7']);
    const bb = parseChart(presetChart(PRESETS.find((p) => p.id === 'blues')!, 'Bb'));
    expect(bb.chords[4][0].name).toBe('Eb7'); // IV of B♭ is E♭, never D♯
  });
  it('has the So What form: 16 + 8 + 8, shifting up a half step', () => {
    const p = parseChart(presetChart(PRESETS.find((x) => x.id === 'so-what')!, 'B')); // written B = concert D
    expect(p.chords).toHaveLength(32);
    expect(p.chords[0][0].name).toBe('Bm7');
    expect(p.chords[16][0].name).toBe('Cm7');
    expect(p.chords[24][0].name).toBe('Bm7');
  });
  it('moves a ii-V-I to any key', () => {
    const g = presetChart(PRESETS.find((p) => p.id === 'ii-v-i')!, 'G');
    expect(g.bars.map((b) => b.chords![0])).toEqual(['Am7', 'D7', 'Gmaj7', 'Gmaj7']);
    expect(nameOf(parseChord(g.bars[0].chords![0])!.root)).toBe('A');
  });
});
