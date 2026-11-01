import { getSettings } from './settings.ts';
import { concertMidi, midiToHz } from './pitch.ts';
import type { SchedEvent } from './transport.ts';
import { playClick, playDrum, playTone, type Voice } from './voices.ts';

// The one AudioContext. Browsers only allow audio after a tap, so it is created on first use.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let busCount = 0;

export function engine(): { ctx: AudioContext; master: GainNode } {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    // A compressor keeps a full band from clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    master = ctx.createGain();
    master.gain.value = getSettings().volume;
    master.connect(comp).connect(ctx.destination);
    // iPhone: play through the media channel so the silent switch doesn't mute it (Safari 16.4+).
    try {
      (navigator as unknown as { audioSession?: { type: string } }).audioSession!.type = 'playback';
    } catch {
      // other browsers
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, master: master! };
}

export function setVolume(v: number) {
  if (master) master.gain.setTargetAtTime(v, master.context.currentTime, 0.02);
}

/** A group of sounds that can be silenced together (stop pressed) without clicks. */
export function newBus(): { input: GainNode; stop: () => void } {
  const { ctx, master } = engine();
  const input = ctx.createGain();
  input.connect(master);
  busCount++;
  return {
    input,
    stop: () => {
      input.gain.cancelScheduledValues(ctx.currentTime);
      input.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
      setTimeout(() => input.disconnect(), 200);
    },
  };
}

/** Plays one scheduled event on a bus. */
export function sound(bus: { input: GainNode }, e: SchedEvent, at: number, durSec: number, voice: Voice, levels = { melody: 1, band: 1 }) {
  const { ctx } = engine();
  if (e.kind === 'click') return playClick(ctx, bus.input, at, Boolean(e.accent), 0.4);
  if (e.kind === 'drum') return playDrum(ctx, bus.input, e.drum!, at, (e.gain ?? 0.5) * levels.band);
  const hz = midiToHz(e.kind === 'melody' ? concertMidi(e.midi!) : e.midi!);
  playTone(ctx, bus.input, e.kind, voice, hz, at, durSec, (e.gain ?? 0.5) * (e.kind === 'melody' ? levels.melody : levels.band));
}

/** One short note right now (tapping a note on the staff or a fingering card). `written` is a written midi number. */
export function previewNote(written: number, voice: Voice = getSettings().voice, seconds = 0.7) {
  const { ctx, master } = engine();
  playTone(ctx, master, 'melody', voice, midiToHz(concertMidi(written)), ctx.currentTime + 0.01, seconds, 0.5);
}

export const busesCreated = () => busCount;
