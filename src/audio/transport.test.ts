import { describe, expect, it } from 'vitest';
import { eventAt, pieceFromBars, pieceFromNotes, swingBeat } from './events.ts';
import { hzToMidi, midiToHz, writtenToHz } from './pitch.ts';
import { Transport, type SchedEvent } from './transport.ts';
import { parseChart, type ChartFile } from '../music/chart.ts';
import { parseNote } from '../../shared/theory.ts';

describe('pitch', () => {
  it('converts written alto pitch to the concert frequency it sounds at', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 5);
    expect(writtenToHz(72)).toBeCloseTo(311.13, 1); // written C5 sounds E♭4
    expect(writtenToHz(69)).toBeCloseTo(261.63, 1); // written A4 sounds C4 (concert C = written A)
    expect(writtenToHz(58)).toBeCloseTo(138.59, 1); // low B♭ sounds D♭3
    expect(writtenToHz(90)).toBeCloseTo(880, 0); // high F♯ sounds A5
  });
  it('turns a frequency back into a midi note and cents', () => {
    expect(hzToMidi(440)).toEqual({ midi: 69, cents: 0 });
    const r = hzToMidi(440 * 2 ** (10 / 1200));
    expect(r.midi).toBe(69);
    expect(r.cents).toBeCloseTo(10, 3);
  });
});

const chart = parseChart({
  title: 't', arranger: '', writtenKey: '', concertKey: '', keySig: 'C',
  bars: [{ notes: 'A4/h~ A4/q r/q' }, { notes: 'C5/q3 D5/q3 E5/q3 F5/q G5/q' }, { notes: 'r/w' }],
} as ChartFile);

describe('pieceFromBars', () => {
  const p = pieceFromBars(chart.bars);
  it('merges tied notes into one held note', () => {
    expect(p.events[0]).toMatchObject({ start: 0, dur: 3, midi: 69, item: 0, bar: 0 });
  });
  it('times triplets and keeps total length = bars x 4 beats', () => {
    expect(p.totalBeats).toBe(12);
    const trip = p.events.filter((e) => e.bar === 1).map((e) => e.start);
    expect(trip[0]).toBe(4);
    expect(trip[1]).toBeCloseTo(4 + 2 / 3);
    expect(trip[2]).toBeCloseTo(4 + 4 / 3);
    expect(trip[3]).toBeCloseTo(6);
    expect(p.barStarts).toEqual([0, 4, 8]);
  });
  it('leaves rests as gaps', () => {
    expect(p.events.some((e) => e.start >= 8)).toBe(false);
  });
});

describe('pieceFromNotes', () => {
  it('goes up and comes back down without repeating the top note', () => {
    const notes = ['C4', 'D4', 'E4'].map(parseNote);
    expect(pieceFromNotes(notes).events.map((e) => e.midi)).toEqual([60, 62, 64, 62, 60]);
    expect(pieceFromNotes(notes, false).events.map((e) => e.midi)).toEqual([60, 62, 64]);
  });
});

describe('swing', () => {
  it('delays off-beat eighths and leaves the beat and triplets alone', () => {
    expect(swingBeat(1, 2 / 3)).toBe(1);
    expect(swingBeat(1.5, 2 / 3)).toBeCloseTo(1 + 2 / 3);
    expect(swingBeat(1 + 1 / 3, 2 / 3)).toBeCloseTo(1 + 1 / 3);
    expect(swingBeat(1.5, 0.5)).toBe(1.5);
  });
});

describe('eventAt', () => {
  it('finds the sounding event for the cursor', () => {
    const p = pieceFromBars(chart.bars);
    expect(eventAt(p.events, 0)).toBe(0);
    expect(eventAt(p.events, 3.5)).toBe(0); // still the last event that started (a rest follows)
    expect(eventAt(p.events, 5)).toBe(2); // the second triplet note (D)
    expect(eventAt(p.events, -1)).toBe(-1);
  });
});

/** A fake clock and sink so the scheduler can be tested without audio. */
function rig(bpm = 120) {
  let now = 0;
  const log: { e: SchedEvent; at: number; dur: number }[] = [];
  const t = new Transport({ now: () => now, schedule: (e, at, dur) => log.push({ e, at, dur }) });
  const advance = (to: number) => {
    while (now < to) {
      now += 0.025;
      t.tick();
    }
  };
  return { t, log, advance, bpm };
}
const ev = (start: number, dur = 1, midi = 60): SchedEvent => ({ start, dur, kind: 'melody', midi });

describe('Transport', () => {
  it('schedules each event once, at the right audio time', () => {
    const { t, log, advance } = rig();
    t.start({ events: [ev(0), ev(1), ev(2)], bpm: 120, range: [0, 4], loop: false, countIn: 0, beatsPerBar: 4 });
    advance(3);
    expect(log.map((l) => l.e.start)).toEqual([0, 1, 2]);
    expect(log[1].at - log[0].at).toBeCloseTo(0.5); // 120 bpm = 0.5 s per beat
    expect(log[0].dur).toBeCloseTo(0.5);
  });
  it('plays a count-in of clicks first, accenting the first beat of the bar', () => {
    const { t, log, advance } = rig();
    t.start({ events: [ev(0)], bpm: 120, range: [0, 4], loop: false, countIn: 4, beatsPerBar: 4 });
    advance(3);
    const clicks = log.filter((l) => l.e.kind === 'click');
    expect(clicks).toHaveLength(4);
    expect(clicks.map((c) => c.e.accent)).toEqual([true, false, false, false]);
    expect(log.find((l) => l.e.kind === 'melody')!.at).toBeCloseTo(clicks[3].at + 0.5);
  });
  it('loops a bar range, repeating its events', () => {
    const { t, log, advance } = rig();
    t.start({ events: [ev(0), ev(1), ev(2), ev(3), ev(4)], bpm: 120, range: [1, 3], loop: true, countIn: 0, beatsPerBar: 4 });
    advance(3.2);
    const starts = log.map((l) => l.e.start);
    expect(starts.slice(0, 6)).toEqual([1, 2, 1, 2, 1, 2]);
    expect(starts).not.toContain(0);
    expect(starts).not.toContain(3);
  });
  it('clips a long note to the end of the loop', () => {
    const { t, log, advance } = rig();
    t.start({ events: [ev(0, 8)], bpm: 120, range: [0, 4], loop: true, countIn: 0, beatsPerBar: 4 });
    advance(0.5);
    expect(log[0].dur).toBeCloseTo(2); // 4 beats at 0.5 s
  });
  it('follows a tempo change from that moment on', () => {
    const { t, log, advance } = rig();
    t.start({ events: [ev(0), ev(2), ev(3), ev(4), ev(5)], bpm: 60, range: [0, 8], loop: false, countIn: 0, beatsPerBar: 4 });
    advance(0.5);
    t.setBpm(120);
    advance(6);
    const gap = log.find((l) => l.e.start === 4)!.at - log.find((l) => l.e.start === 3)!.at;
    expect(gap).toBeCloseTo(0.5);
  });
  it('reports the song beat and ends a non-looping piece', () => {
    const { t, advance } = rig();
    let ended = false;
    t.onEnd = () => (ended = true);
    t.start({ events: [ev(0), ev(1)], bpm: 120, range: [0, 2], loop: false, countIn: 0, beatsPerBar: 4 });
    advance(0.56);
    expect(t.songBeat()).toBeCloseTo(1, 0);
    advance(2);
    expect(ended).toBe(true);
    expect(t.playing).toBe(false);
  });
});

import { barRange, beatsPerBar, melodyEvents, swungCursor } from './tunePlan.ts';

describe('tunePlan', () => {
  const p = pieceFromBars(chart.bars);
  it('gives the beats per bar for each time signature', () => {
    expect([beatsPerBar('4/4'), beatsPerBar('3/4'), beatsPerBar('12/8'), beatsPerBar()]).toEqual([4, 3, 6, 4]);
  });
  it('picks a bar range in song beats', () => {
    expect(barRange(p, 1, 1)).toEqual([0, 4]);
    expect(barRange(p, 2, 3)).toEqual([4, 12]);
    expect(barRange(p, 2, 99)).toEqual([4, 12]);
  });
  it('swings the off-beat eighths of the melody and the cursor the same way', () => {
    const eights = pieceFromBars(parseChart({ title: '', arranger: '', writtenKey: '', concertKey: '', keySig: 'C', bars: [{ notes: 'C5/8 D5/8 E5/8 F5/8 G5/h' }] } as ChartFile).bars);
    const swung = melodyEvents(eights.events, 'full');
    expect(swung.map((e) => +e.start.toFixed(3))).toEqual([0, 0.667, 1, 1.667, 2]);
    expect(swung[0].dur).toBeCloseTo(0.667); // long first eighth
    expect(swung[1].dur).toBeCloseTo(0.333); // short second eighth
    expect(swungCursor(eights.events, 'full').map((e) => +e.start.toFixed(3))).toEqual([0, 0.667, 1, 1.667, 2]);
    expect(melodyEvents(eights.events, 'off').map((e) => e.start)).toEqual([0, 0.5, 1, 1.5, 2]);
  });
});
