import { describe, expect, it } from 'vitest';
import { parseChord } from '../../shared/chords.ts';
import { BASS_HIGH, BASS_LOW, bandEvents, chordSegments, type BandStyle, type Segment } from './band.ts';

// Written Am7 | D7 | Gmaj7 | Gmaj7 (a ii-V-I). Written A = concert C, so these sound as Cm7 | F7 | B♭maj7.
const names = ['Am7', 'D7', 'Gmaj7', 'Gmaj7'];
const segments: Segment[] = names.map((n, i) => ({ start: i * 4, end: i * 4 + 4, chord: parseChord(n)! }));
const opts = (style: BandStyle, seed = 1, extra: Partial<Parameters<typeof bandEvents>[0]> = {}) =>
  bandEvents({ segments, range: [0, 16], beatsPerBar: 4, style, swing: 2 / 3, seed, ...extra });
const of = (events: ReturnType<typeof opts>, kind: string) => events.filter((e) => e.kind === kind);

describe('chordSegments', () => {
  it('lasts each chord until the next, across bars with no symbol', () => {
    const chords = [[{ name: 'Am7', beat: 0 }, { name: 'D7', beat: 2 }], [], [{ name: 'Gmaj7', beat: 0 }]];
    const segs = chordSegments(chords, parseChord, [0, 4, 8], 12);
    expect(segs.map((s) => [s.chord.name, s.start, s.end])).toEqual([['Am7', 0, 2], ['D7', 2, 8], ['Gmaj7', 8, 12]]);
  });
});

describe('walking bass', () => {
  const bass = of(opts('swing'), 'bass');
  it('plays one note on every beat', () => {
    expect(bass.map((e) => e.start)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });
  it('starts each chord on its root (in concert pitch) and stays in the bass register', () => {
    // concert roots: Cm7 -> C, F7 -> F, B♭maj7 -> B♭
    expect([bass[0], bass[4], bass[8], bass[12]].map((e) => e.midi! % 12)).toEqual([0, 5, 10, 10]);
    for (const e of bass) {
      expect(e.midi).toBeGreaterThanOrEqual(BASS_LOW);
      expect(e.midi).toBeLessThanOrEqual(BASS_HIGH);
    }
  });
  it('plays chord tones in the middle of the bar and approaches the next root by a half step', () => {
    const cm7 = new Set([0, 3, 7, 10]);
    expect(cm7.has(bass[1].midi! % 12)).toBe(true);
    expect(cm7.has(bass[2].midi! % 12)).toBe(true);
    const gap = (bass[3].midi! - bass[4].midi!) % 12;
    expect([1, -1, 11, -11].includes(gap)).toBe(true);
  });
  it('is the same for the same seed and different for another', () => {
    expect(opts('swing', 5)).toEqual(opts('swing', 5));
    expect(of(opts('swing', 5), 'bass').map((e) => e.midi)).not.toEqual(of(opts('swing', 99), 'bass').map((e) => e.midi));
  });
  it('leads the last bar back into the first chord so a loop turns round smoothly', () => {
    const last = bass[15].midi!;
    const gap = (last - bass[0].midi!) % 12;
    expect([1, -1, 11, -11].includes(gap)).toBe(true);
  });
});

describe('piano', () => {
  const comp = of(opts('swing'), 'comp');
  it('plays the 3rd and 7th of the chord, with no root', () => {
    const first = comp.filter((e) => e.start < 4);
    const pcs = new Set(first.map((e) => e.midi! % 12));
    expect(pcs.has(3)).toBe(true); // E♭ = third of Cm7
    expect(pcs.has(10)).toBe(true); // B♭ = seventh
    expect(pcs.has(0)).toBe(false); // the bass has the root
  });
  it('announces each chord where it changes', () => {
    for (const s of segments) expect(comp.some((e) => Math.abs(e.start - s.start) < 0.01)).toBe(true);
  });
});

describe('drums', () => {
  it('swing: ride on every beat plus the swung skip note, hi-hat on 2 and 4', () => {
    const drums = of(opts('swing'), 'drum').filter((e) => e.start < 4);
    const at = (drum: string) => drums.filter((e) => e.drum === drum).map((e) => +e.start.toFixed(3));
    expect(at('ride')).toEqual([0, 1, 1.667, 2, 3, 3.667].sort((a, b) => a - b));
    expect(at('hat')).toEqual([1, 3]);
  });
  it('every style produces bass, piano and drums', () => {
    for (const style of ['swing', 'ballad', 'bossa', 'straight8'] as const) {
      const e = opts(style);
      expect(of(e, 'bass').length, style).toBeGreaterThan(0);
      expect(of(e, 'comp').length, style).toBeGreaterThan(0);
      expect(of(e, 'drum').length, style).toBeGreaterThan(0);
      expect(e.every((x) => x.start >= 0 && x.start < 16 + 1)).toBe(true);
    }
  });
  it('only plays inside the requested range', () => {
    const e = opts('swing', 1, { range: [4, 8] });
    expect(e.every((x) => x.start >= 4 - 1e-6 && x.start < 8)).toBe(true);
  });
});
