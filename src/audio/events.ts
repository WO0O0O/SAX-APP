import type { Note } from '../../shared/theory.ts';
import { beatsOf } from '../music/chart.ts';
import type { ScoreItem } from '../notation/Score.tsx';

// Turns notation into timed events. Positions are in beats (quarter notes), so tempo is applied later.
// The same list drives the sound and the on-screen cursor, so they cannot drift apart.

export type NoteEvent = {
  start: number; // beats from the start of the piece
  dur: number; // beats
  midi: number; // WRITTEN midi (the player converts to concert pitch)
  item: number; // index of the first item (across all bars) the event came from
  bar: number;
};

export type Piece = { events: NoteEvent[]; totalBeats: number; barStarts: number[]; itemStarts: number[] };

/** Chart bars -> events. Tied notes of the same pitch become one held note; rests are gaps. */
export function pieceFromBars(bars: ScoreItem[][], beatsPerBar = 4): Piece {
  const events: NoteEvent[] = [];
  const barStarts: number[] = [];
  const itemStarts: number[] = [];
  let t = 0;
  let item = 0;
  let open: NoteEvent | null = null; // a note still tied to the next item
  bars.forEach((bar, b) => {
    barStarts.push(t);
    for (const it of bar) {
      // A bar holding one whole rest is a full bar of rest in any time signature (12/8 is 6 beats).
      const len = bar.length === 1 && !it.note && it.duration === 'w' ? beatsPerBar : beatsOf(it);
      itemStarts.push(t);
      if (it.note) {
        if (open && open.midi === it.note.midi) {
          open.dur += len;
        } else {
          open = { start: t, dur: len, midi: it.note.midi, item, bar: b };
          events.push(open);
        }
        if (!it.tie) open = null;
      } else {
        open = null;
      }
      t += len;
      item++;
    }
  });
  return { events, totalBeats: t, barStarts, itemStarts };
}

/** A scale or arpeggio as even notes, optionally coming back down. */
export function pieceFromNotes(notes: Note[], upAndDown = true, beatsPerNote = 1): Piece {
  const seq = upAndDown ? [...notes, ...notes.slice(0, -1).reverse()] : notes;
  const events = seq.map((n, i) => ({ start: i * beatsPerNote, dur: beatsPerNote, midi: n.midi, item: i, bar: 0 }));
  return { events, totalBeats: seq.length * beatsPerNote, barStarts: [0], itemStarts: seq.map((_, i) => i * beatsPerNote) };
}

/**
 * Swing: delays off-beat eighths. `first` is how much of each beat the first eighth takes
 * (0.5 = straight, 0.667 = triplet swing). Only positions on the eighth-note grid move.
 */
export function swingBeat(beat: number, first: number): number {
  if (first === 0.5) return beat;
  const whole = Math.floor(beat + 1e-9);
  const frac = beat - whole;
  const onGrid = Math.abs(frac * 2 - Math.round(frac * 2)) < 1e-6;
  if (!onGrid) return beat;
  if (frac < 0.25) return whole; // on the beat
  if (frac < 0.75) return whole + first; // the off-beat eighth
  return whole + 1;
}

/** Index of the event sounding at `beat` (or the last one that started), for the cursor. */
export function eventAt(events: NoteEvent[], beat: number): number {
  let lo = 0;
  let hi = events.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].start <= beat + 1e-9) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}
