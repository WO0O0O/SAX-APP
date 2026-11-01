import { describe, expect, it } from 'vitest';
import { metronomeBar, tapTempo } from './metronome.ts';

describe('metronomeBar', () => {
  it('accents beat 1 only', () => {
    const bar = metronomeBar(4, 'none', false);
    expect(bar.map((e) => e.start)).toEqual([0, 1, 2, 3]);
    expect(bar.map((e) => e.accent)).toEqual([true, false, false, false]);
  });
  it('adds eighths, straight or swung', () => {
    expect(metronomeBar(2, 'eighths', false).map((e) => +e.start.toFixed(3)).sort((a, b) => a - b)).toEqual([0, 0.5, 1, 1.5]);
    expect(metronomeBar(2, 'eighths', true).map((e) => +e.start.toFixed(3)).sort((a, b) => a - b)).toEqual([0, 0.667, 1, 1.667]);
  });
  it('adds triplets', () => {
    expect(metronomeBar(1, 'triplets', false)).toHaveLength(3);
  });
});

describe('tapTempo', () => {
  it('needs two taps', () => {
    expect(tapTempo([0])).toBeUndefined();
  });
  it('averages the gaps', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 600, 1200])).toBe(100);
  });
  it('starts over after a long pause', () => {
    expect(tapTempo([0, 500, 10000, 10400, 10800])).toBe(150);
  });
  it('stays within 40-220', () => {
    expect(tapTempo([0, 100])).toBe(220);
    expect(tapTempo([0, 1900])).toBe(40);
  });
});
