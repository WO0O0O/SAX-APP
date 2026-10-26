import { parseNote } from '../../shared/theory.ts';
import type { ChordSymbol, ScoreItem } from '../notation/Score.tsx';

// Tune charts live in sheet-music/<slug>.tune.json (git-ignored: transcriptions of other people's
// arrangements). Each bar is a string of tokens:
//   E5/q    note, quarter        r/q.   dotted quarter rest
//   B5/8~   eighth, tied to next C5/q3  quarter-note triplet member
// Chords are "Name" (beat 0) or "Name@beat".

export type ChartFile = {
  title: string;
  arranger: string;
  writtenKey: string;
  concertKey: string;
  keySig: string; // VexFlow key spec, e.g. 'G', 'F'
  timeSig?: string; // default '4/4'
  pdf?: string; // original PDF in sheet-music/
  bars: { notes: string; chords?: string[] }[];
};

export type Chord = ChordSymbol;
export type Chart = Omit<ChartFile, 'bars'> & { bars: ScoreItem[][]; chords: Chord[][] };

const TOKEN = /^(r|[A-G](?:#{1,2}|b{1,2})?-?\d)\/(w|h|q|8)(\.?)(~?)(3?)$/;

export function parseItem(token: string): ScoreItem {
  const m = TOKEN.exec(token);
  if (!m) throw new Error(`Bad chart token: ${token}`);
  return {
    note: m[1] === 'r' ? undefined : parseNote(m[1]),
    duration: m[2] as ScoreItem['duration'],
    dots: m[3] ? 1 : 0,
    tie: Boolean(m[4]),
    triplet: Boolean(m[5]),
  };
}

const BEATS = { w: 4, h: 2, q: 1, '8': 0.5 };

/** Length in beats, counting dots and triplets. */
export function beatsOf(it: ScoreItem): number {
  const base = BEATS[it.duration] * (it.dots ? 1.5 : 1);
  return it.triplet ? (base * 2) / 3 : base;
}

export function parseChart(file: ChartFile): Chart {
  return {
    ...file,
    bars: file.bars.map((b) => b.notes.trim().split(/\s+/).map(parseItem)),
    chords: file.bars.map((b) =>
      (b.chords ?? []).map((c) => {
        const [name, beat] = c.split('@');
        return { name, beat: beat ? Number(beat) : 0 };
      }),
    ),
  };
}
