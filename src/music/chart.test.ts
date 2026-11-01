import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beatsOf, parseChart, parseItem, type ChartFile } from './chart.ts';

describe('chart tokens', () => {
  it('parses notes, rests, dots, ties and triplets', () => {
    expect(parseItem('B5/8~')).toMatchObject({ duration: '8', tie: true, note: { midi: 83 } });
    expect(beatsOf(parseItem('r/q.'))).toBe(1.5);
    expect(beatsOf(parseItem('C5/q3'))).toBeCloseTo(2 / 3);
    expect(parseItem('Ab5/8').note?.midi).toBe(80);
  });
});

// The charts are local-only (git-ignored), so these run only where they exist.
for (const slug of ['autumn-leaves', 'smooth-operator', 'naima', 'happy-birthday', 'is-it-a-crime']) {
  const file = new URL(`../../sheet-music/${slug}.tune.json`, import.meta.url);
  describe.skipIf(!existsSync(file))(`${slug} chart`, () => {
    it('every bar fills the time signature and every note is on the horn', () => {
      const chart = parseChart(JSON.parse(readFileSync(file, 'utf8')) as ChartFile);
      const [num, den] = (chart.timeSig ?? '4/4').split('/').map(Number);
      const beats = (num * 4) / den; // in quarter notes
      chart.bars.forEach((bar, i) => {
        const wholeBarRest = bar.length === 1 && !bar[0].note && bar[0].duration === 'w';
        if (!wholeBarRest) expect(bar.reduce((s, it) => s + beatsOf(it), 0), `bar ${i + 1}`).toBeCloseTo(beats);
        for (const it of bar) if (it.note) expect(it.note.midi).toBeGreaterThanOrEqual(58);
      });
    });
  });
}
