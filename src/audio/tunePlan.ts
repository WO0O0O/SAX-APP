import { swingBeat, type NoteEvent, type Piece } from './events.ts';
import type { SchedEvent } from './transport.ts';

export type Swing = 'off' | 'light' | 'full';
/** How much of each beat the first eighth takes. */
export const SWING_RATIO: Record<Swing, number> = { off: 0.5, light: 0.58, full: 2 / 3 };

/** Melody events with swing applied to both ends of each note. */
export function melodyEvents(events: NoteEvent[], swing: Swing, gain = 0.5): SchedEvent[] {
  const r = SWING_RATIO[swing];
  return events.map((e) => {
    const start = swingBeat(e.start, r);
    const end = swingBeat(e.start + e.dur, r);
    return { start, dur: Math.max(0.05, end - start), kind: 'melody', midi: e.midi, item: e.item, gain };
  });
}

/** Cursor events (swung the same way, so the highlight follows what you hear). */
export function swungCursor(events: NoteEvent[], swing: Swing): NoteEvent[] {
  const r = SWING_RATIO[swing];
  return events.map((e) => {
    const start = swingBeat(e.start, r);
    return { ...e, start, dur: Math.max(0.05, swingBeat(e.start + e.dur, r) - start) };
  });
}

/** Beats in a bar for a time signature, in quarter notes: 4/4 -> 4, 3/4 -> 3, 12/8 -> 6. */
export function beatsPerBar(timeSig = '4/4'): number {
  const [n, d] = timeSig.split('/').map(Number);
  return (n * 4) / d;
}

/** Song beats [start, end) for bars `from`..`to` (1-based, inclusive). */
export function barRange(piece: Piece, from: number, to: number): [number, number] {
  const a = Math.max(1, Math.min(from, piece.barStarts.length));
  const b = Math.max(a, Math.min(to, piece.barStarts.length));
  return [piece.barStarts[a - 1], b < piece.barStarts.length ? piece.barStarts[b] : piece.totalBeats];
}
