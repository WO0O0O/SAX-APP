import { guideTones, type Chord } from '../../shared/chords.ts';
import { pcOf } from '../../shared/theory.ts';
import { rng } from '../music/exercise.ts';
import { swingBeat } from './events.ts';
import type { SchedEvent } from './transport.ts';

// A small rhythm section generated from a chart's chord symbols: walking bass, shell-voicing piano and drums.
// Chords arrive in WRITTEN pitch (that's how the charts spell them); everything produced here is CONCERT pitch.

export type BandStyle = 'swing' | 'ballad' | 'bossa' | 'straight8';
export const BAND_STYLES: { id: BandStyle; label: string }[] = [
  { id: 'swing', label: 'Swing' },
  { id: 'ballad', label: 'Ballad' },
  { id: 'bossa', label: 'Bossa nova' },
  { id: 'straight8', label: 'Straight eights' },
];

export type Segment = { start: number; end: number; chord: Chord };

export const BASS_LOW = 28; // E1
export const BASS_HIGH = 52; // E3
const COMP_LOW = 50;
const COMP_HIGH = 68;

/** Written pitch class -> sounding (concert) pitch class. */
const concertPc = (written: number) => (((written - 9) % 12) + 12) % 12;

/** The midi note with this pitch class nearest to `near`, within [low, high]. */
export function nearestPc(pc: number, near: number, low: number, high: number): number {
  let best = -1;
  for (let m = low; m <= high; m++) if (m % 12 === pc && (best < 0 || Math.abs(m - near) < Math.abs(best - near))) best = m;
  return best;
}

type Tones = { root: number; third: number | undefined; fifth: number; seventh: number | undefined; all: number[] };
function tonesOf(chord: Chord): Tones {
  const pcs = (role: string) => chord.tones.find((t) => t.role === role) && concertPc(pcOf(chord.tones.find((t) => t.role === role)!.spelling));
  const seventh = pcs('seventh') ?? pcs('sixth');
  const third = pcs('third') ?? concertPc(pcOf(chord.tones[1]?.spelling ?? chord.root));
  const fifth = pcs('fifth') ?? (concertPc(pcOf(chord.root)) + 7) % 12;
  const root = concertPc(pcOf(chord.bass ?? chord.root)); // slash chords put the bass note in the bass
  return { root, third, fifth, seventh, all: [...new Set([root, third, fifth, ...(seventh !== undefined ? [seventh] : [])])] };
}

/** Chord segments across the chart. A chord lasts until the next one (or the end); bars without a symbol keep the last chord. */
export function chordSegments(chords: { name: string; beat: number }[][], parse: (name: string) => Chord | null, barStarts: number[], total: number): Segment[] {
  const marks: { at: number; chord: Chord }[] = [];
  chords.forEach((bar, b) => {
    for (const c of bar) {
      const chord = parse(c.name);
      if (chord) marks.push({ at: (barStarts[b] ?? 0) + c.beat, chord });
    }
  });
  return marks.map((m, i) => ({ start: m.at, end: marks[i + 1]?.at ?? total, chord: m.chord }));
}

type Options = {
  segments: Segment[];
  /** Song beats to produce [start, end). */
  range: [number, number];
  beatsPerBar: number;
  style: BandStyle;
  /** How much of a beat the first eighth takes (0.5 straight). Only swing and ballad use it. */
  swing: number;
  seed: number;
};

/** The rhythm section for a stretch of the chart. */
export function bandEvents(o: Options): SchedEvent[] {
  const random = rng(o.seed);
  const out: SchedEvent[] = [];
  const segs = o.segments.filter((s) => s.end > o.range[0] && s.start < o.range[1]);
  if (!segs.length) return out;
  const sw = (b: number) => (o.style === 'swing' || o.style === 'ballad' ? swingBeat(b, o.swing) : b);
  const bpb = o.beatsPerBar;

  let prevBass = 40;
  let prevVoicing: number[] = [];

  segs.forEach((seg, si) => {
    const from = Math.max(seg.start, o.range[0]);
    const to = Math.min(seg.end, o.range[1]);
    const t = tonesOf(seg.chord);
    const next = segs[si + 1] ?? segs[0]; // wraps, so the loop point leads back into the first chord
    const nextRoot = tonesOf(next.chord).root;

    // ----- bass
    const bassNote = (pc: number, near: number) => nearestPc(pc, near, BASS_LOW, BASS_HIGH);
    const putBass = (start: number, dur: number, midi: number, gain = 0.5) => {
      if (start >= from - 1e-9 && start < to - 1e-9) out.push({ start: sw(start), dur, kind: 'bass', midi, gain });
      prevBass = midi;
    };
    if (o.style === 'swing') {
      // One note per beat: root first, chord tones in between, a half-step approach into the next chord on the last beat.
      for (let b = Math.ceil(from - 1e-9); b < to - 1e-9; b++) {
        const last = b === Math.ceil(to - 1e-9) - 1;
        if (b === Math.ceil(seg.start - 1e-9)) putBass(b, 0.95, bassNote(t.root, 40));
        else if (last && to === seg.end && segs.length > 0) {
          const target = bassNote(nextRoot, prevBass);
          const below = target - 1 >= BASS_LOW && (random() < 0.5 || target + 1 > BASS_HIGH);
          putBass(b, 0.95, below ? target - 1 : target + 1, 0.45);
        } else {
          const choices = t.all.filter((pc) => pc !== prevBass % 12);
          const weights = choices.map((pc) => 1 / (1 + Math.abs(bassNote(pc, prevBass) - prevBass)));
          let r = random() * weights.reduce((a, c) => a + c, 0);
          let pick = choices[0];
          for (let i = 0; i < choices.length; i++) {
            r -= weights[i];
            if (r <= 0) {
              pick = choices[i];
              break;
            }
          }
          putBass(b, 0.95, bassNote(pick, prevBass));
        }
      }
    } else if (o.style === 'ballad') {
      for (let b = Math.ceil(seg.start - 1e-9); b < seg.end - 1e-9; b += 2) putBass(b, Math.min(2, seg.end - b) * 0.95, bassNote(b === Math.ceil(seg.start - 1e-9) ? t.root : t.fifth, 40), 0.42);
    } else {
      const pattern = o.style === 'bossa' ? [[0, t.root, 1.4], [1.5, t.fifth, 0.5], [2, t.root, 1.4], [3.5, t.fifth, 0.5]] : [[0, t.root, 1], [1.5, t.root, 0.5], [2, t.root, 1], [3, t.fifth, 0.5], [3.5, t.root, 0.5]];
      for (let bar = Math.floor(seg.start / bpb) * bpb; bar < seg.end - 1e-9; bar += bpb)
        for (const [off, pc, dur] of pattern) if (off < bpb) putBass(bar + off, dur, bassNote(pc, 40), 0.48);
    }

    // ----- piano: shell voicings (3rd and 7th, sometimes the 5th), kept close to the last voicing
    const voice = (): number[] => {
      const pcs = [t.third, t.seventh ?? t.fifth, ...(random() < 0.35 ? [t.fifth] : [])].filter((x): x is number => x !== undefined);
      const near = prevVoicing.length ? prevVoicing.reduce((a, c) => a + c, 0) / prevVoicing.length : 58;
      const v = [...new Set(pcs)].map((pc) => nearestPc(pc, near, COMP_LOW, COMP_HIGH)).sort((a, b) => a - b);
      prevVoicing = v;
      return v;
    };
    const hit = (start: number, dur: number, gain = 0.34, roll = 0) => {
      if (start < from - 1e-9 || start >= to - 1e-9) return;
      voice().forEach((m, i) => out.push({ start: sw(start) + i * roll, dur, kind: 'comp', midi: m, gain }));
    };
    const barsIn = (cb: (barStart: number) => void) => {
      for (let bar = Math.floor(seg.start / bpb) * bpb; bar < seg.end - 1e-9; bar += bpb) cb(bar);
    };
    if (o.style === 'swing') {
      // The chord is announced where it arrives, then comped on 2 and 4 (or the "Charleston" 1, and-of-2).
      hit(seg.start, 0.9, 0.3);
      barsIn((bar) => {
        const spots = random() < 0.3 ? [0, 1.5] : bpb >= 4 ? [1, 3] : [1, 2];
        for (const s of spots) if (bar + s > seg.start + 0.49 && bar + s < seg.end - 1e-9) hit(bar + s, s === 1.5 ? 0.45 : 0.8);
      });
    } else if (o.style === 'ballad') {
      for (let b = Math.ceil(seg.start - 1e-9); b < seg.end - 1e-9; b += 2) hit(b, Math.min(2, seg.end - b) * 0.9, 0.3, 0.03);
    } else {
      const spots = o.style === 'bossa' ? [0, 1.5, 2.5, 3.5] : [0, 1.5, 2, 3.5];
      barsIn((bar) => spots.forEach((s) => s < bpb && bar + s >= seg.start - 1e-9 && hit(bar + s, 0.4, 0.3)));
    }
  });

  // ----- drums, bar by bar
  const first = Math.floor(o.range[0] / bpb) * bpb;
  for (let bar = first; bar < o.range[1] - 1e-9; bar += bpb) {
    const d = (start: number, drum: NonNullable<SchedEvent['drum']>, gain: number) => {
      const at = bar + start;
      if (at >= o.range[0] - 1e-9 && at < o.range[1] - 1e-9) out.push({ start: sw(at), dur: 0.25, kind: 'drum', drum, gain });
    };
    if (o.style === 'swing') {
      for (let b = 0; b < bpb; b++) d(b, 'ride', 0.55);
      for (let b = 1; b < bpb; b += 2) d(b + 0.5, 'ride', 0.4); // the skip note: beats 2 and 4 "and"
      for (let b = 1; b < bpb; b += 2) d(b, 'hat', 0.4);
      for (let b = 0; b < bpb; b++) d(b, 'kick', 0.1);
      if (random() < 0.4) d(2.5, 'snare', 0.12);
    } else if (o.style === 'ballad') {
      for (let b = 0; b < bpb; b++) d(b, 'ride', 0.3);
      d(0, 'kick', 0.18);
      for (let b = 1; b < bpb; b += 2) d(b, 'hat', 0.25);
    } else if (o.style === 'bossa') {
      for (let b = 0; b < bpb; b += 0.5) d(b, 'hat', b % 1 === 0 ? 0.3 : 0.2);
      for (const b of [0, 2]) d(b, 'kick', 0.4);
      for (const b of [0, 1.5, 3]) d(b, 'snare', 0.16);
    } else {
      for (let b = 0; b < bpb; b += 0.5) d(b, 'hat', b % 1 === 0 ? 0.4 : 0.26);
      for (const b of [0, 2.5]) d(b, 'kick', 0.5);
      for (const b of [1, 3]) d(b, 'snare', 0.4);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
