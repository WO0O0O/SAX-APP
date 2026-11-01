import type { Reading } from './analysis.ts';

// "Reading that listens": follow the notes of an exercise as they are played, moving on when the right note is
// heard and marking fumbles on its own. A note must be steady for a moment to count, and a repeated note needs a
// gap (or a different note) in between so one held note doesn't tick through several.

export type ListenEvent =
  | { type: 'hit'; index: number; clean: boolean }
  | { type: 'wrong'; index: number; heard: number };

export type ListenOptions = {
  /** How long a note must be steady to count, in seconds. */
  steady?: number;
  /** How long a wrong note must be steady before the expected note is marked as fumbled. */
  wrongAfter?: number;
  /** Cents either side of the note that count as played (generous: this checks the note, not the intonation). */
  window?: number;
};

export class ListenTracker {
  private index = 0;
  private candidate: { midi: number; since: number } | null = null;
  private armed = true;
  private fumbled = false;
  private flaggedWrong = false;
  private last: number | null = null;
  private opts: Required<ListenOptions>;
  private notes: number[];

  /** `notes` is the exercise as written midi numbers, in order. */
  constructor(notes: number[], opts: ListenOptions = {}) {
    this.notes = notes;
    this.opts = { steady: 0.12, wrongAfter: 0.3, window: 35, ...opts };
  }

  get position() {
    return this.index;
  }
  get done() {
    return this.index >= this.notes.length;
  }

  /** One frame: `t` in seconds, reading null when nothing clear is sounding. */
  update(t: number, reading: Reading | null): ListenEvent[] {
    if (this.done) return [];
    const events: ListenEvent[] = [];
    const heard = reading && Math.abs(reading.cents) <= this.opts.window ? reading.midi : null;

    if (heard === null) {
      // A gap re-arms the same note.
      this.candidate = null;
      if (reading === null) this.armed = true;
      return events;
    }
    if (!this.candidate || this.candidate.midi !== heard) {
      this.candidate = { midi: heard, since: t };
      if (heard !== this.last) this.armed = true;
      this.flaggedWrong = false;
      return events;
    }
    const steady = t - this.candidate.since;
    const expected = this.notes[this.index];

    if (heard === expected) {
      if (steady >= this.opts.steady && this.armed) {
        events.push({ type: 'hit', index: this.index, clean: !this.fumbled });
        this.last = heard;
        this.index++;
        this.fumbled = false;
        this.flaggedWrong = false;
        this.armed = false;
        this.candidate = null;
      }
    } else if (steady >= this.opts.wrongAfter && !this.flaggedWrong && this.armed) {
      this.flaggedWrong = true;
      this.fumbled = true;
      events.push({ type: 'wrong', index: this.index, heard });
    }
    return events;
  }

  reset() {
    this.index = 0;
    this.candidate = null;
    this.armed = true;
    this.fumbled = false;
    this.flaggedWrong = false;
    this.last = null;
  }
}
