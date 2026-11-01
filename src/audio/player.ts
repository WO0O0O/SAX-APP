import { newBus, sound, engine } from './engine.ts';
import { eventAt, type NoteEvent } from './events.ts';
import { Transport, type SchedEvent, type TransportOptions } from './transport.ts';
import type { Voice } from './voices.ts';

// Plays a list of events with the Transport, drives a cursor callback, and stops cleanly.

export type PlayOptions = Omit<TransportOptions, 'events'> & {
  events: SchedEvent[];
  voice: Voice;
  /** Melody events with their chart items, for the cursor. */
  cursorEvents?: NoteEvent[];
  /** 1 = full. */
  levels?: { melody: number; band: number };
  onCursor?: (item: number | undefined, songBeat: number) => void;
  onEnd?: () => void;
  onLoop?: (completed: number) => void;
};

export function createPlayer() {
  let transport: Transport | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let raf = 0;
  let bus: ReturnType<typeof newBus> | null = null;
  let last: number | undefined | null = null;

  function stop() {
    clearInterval(timer);
    cancelAnimationFrame(raf);
    transport && (transport.playing = false);
    bus?.stop();
    bus = null;
    last = null;
  }

  function play(o: PlayOptions) {
    stop();
    const { ctx } = engine();
    bus = newBus();
    const mine = bus;
    const t = new Transport({
      now: () => ctx.currentTime,
      schedule: (e, at, dur) => sound(mine, e, at, dur, o.voice, o.levels),
    });
    transport = t;
    t.onEnd = () => {
      stop();
      o.onCursor?.(undefined, 0);
      o.onEnd?.();
    };
    t.onLoop = o.onLoop;
    t.start(o);
    timer = setInterval(() => t.tick(), 25);

    const cursorEvents = o.cursorEvents ?? [];
    const latency = ctx.outputLatency || ctx.baseLatency || 0;
    const frame = () => {
      if (!t.playing) return;
      const beat = t.songBeat() - (latency * t.bpmNow()) / 60;
      let item: number | undefined;
      if (t.position() >= 0) {
        const i = eventAt(cursorEvents, beat);
        const e = cursorEvents[i];
        if (e && beat < e.start + e.dur) item = e.item;
      }
      if (item !== last) {
        last = item;
        o.onCursor?.(item, beat);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return t;
  }

  return {
    play,
    stop,
    setBpm: (bpm: number) => transport?.setBpm(bpm),
    get playing() {
      return Boolean(transport?.playing);
    },
  };
}
export type Player = ReturnType<typeof createPlayer>;
