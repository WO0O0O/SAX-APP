// A look-ahead scheduler (the "two clocks" pattern): a timer runs every ~25 ms and schedules every event
// that falls in the next ~150 ms on the audio clock, which is sample-accurate. It never plays anything itself;
// the engine passes in `schedule`, and tests pass in a fake clock.

export type SchedEvent = {
  start: number; // beats (song position)
  dur: number; // beats
  kind: 'melody' | 'bass' | 'comp' | 'drum' | 'click';
  midi?: number; // WRITTEN midi for melody; CONCERT midi for bass and comp
  hz?: number; // drone-style fixed frequency (unused by the scheduler)
  drum?: 'kick' | 'snare' | 'hat' | 'ride';
  accent?: boolean;
  gain?: number;
  item?: number; // chart item for the cursor
};

export type TransportOptions = {
  events: SchedEvent[];
  bpm: number;
  /** Song beats [start, end) to repeat, or end of the events if not looping. */
  range: [number, number];
  loop: boolean;
  /** Beats of clicks before the music starts. */
  countIn: number;
  beatsPerBar: number;
};

export type Clock = { now: () => number; schedule: (e: SchedEvent, atSec: number, durSec: number) => void };

export const LOOKAHEAD = 0.15;

export class Transport {
  private opts!: TransportOptions;
  private events: SchedEvent[] = [];
  private anchorTime = 0;
  private anchorBeat = 0; // virtual beat at anchorTime
  private bpm = 100;
  private iter = 0;
  private index = 0;
  private countBeat = 0;
  playing = false;
  /** Called when a non-looping piece has finished sounding. */
  onEnd?: () => void;

  private clock: Clock;
  constructor(clock: Clock) {
    this.clock = clock;
  }

  bpmNow(): number {
    return this.bpm;
  }

  /** Virtual beat now: negative during the count-in, then counts up (and keeps counting through loops). */
  position(): number {
    return this.anchorBeat + ((this.clock.now() - this.anchorTime) * this.bpm) / 60;
  }

  /** Song beat now (loops folded back into the range). */
  songBeat(): number {
    const [a, b] = this.opts.range;
    const v = this.position();
    if (v < 0) return a + v; // count-in
    return this.opts.loop ? a + (v % (b - a)) : a + v;
  }

  start(opts: TransportOptions): void {
    this.opts = opts;
    const [a, b] = opts.range;
    this.events = opts.events.filter((e) => e.start >= a - 1e-9 && e.start < b - 1e-9).sort((x, y) => x.start - y.start);
    this.bpm = opts.bpm;
    this.anchorTime = this.clock.now() + 0.06;
    this.anchorBeat = -opts.countIn;
    this.iter = 0;
    this.index = 0;
    this.countBeat = 0;
    this.playing = true;
    this.tick();
  }

  setBpm(bpm: number): void {
    if (!this.playing) return;
    const v = this.position();
    this.anchorTime = this.clock.now();
    this.anchorBeat = v;
    this.bpm = bpm;
  }

  stop(): void {
    this.playing = false;
  }

  private timeOf(v: number): number {
    return this.anchorTime + ((v - this.anchorBeat) * 60) / this.bpm;
  }

  /** Schedules everything due within the look-ahead window. Call every ~25 ms. */
  tick(): void {
    if (!this.playing) return;
    const horizon = this.clock.now() + LOOKAHEAD;
    const [a, b] = this.opts.range;
    const len = b - a;
    const secPerBeat = 60 / this.bpm;

    // Count-in clicks.
    while (this.countBeat < this.opts.countIn && this.timeOf(-this.opts.countIn + this.countBeat) < horizon) {
      const beat = this.countBeat;
      this.clock.schedule({ start: beat, dur: 1, kind: 'click', accent: beat % this.opts.beatsPerBar === 0 }, this.timeOf(-this.opts.countIn + beat), 0.05);
      this.countBeat++;
    }

    for (;;) {
      if (this.index >= this.events.length) {
        if (!this.opts.loop) {
          // Finished when the last note has also finished.
          if (this.clock.now() >= this.timeOf(len) ) {
            this.playing = false;
            this.onEnd?.();
          }
          return;
        }
        this.iter++;
        this.index = 0;
        if (this.events.length === 0) return;
      }
      const e = this.events[this.index];
      const v = this.iter * len + (e.start - a);
      const at = this.timeOf(v);
      if (at >= horizon) return;
      const dur = Math.min(e.dur, b - e.start);
      this.clock.schedule(e, at, dur * secPerBeat);
      this.index++;
    }
  }
}
