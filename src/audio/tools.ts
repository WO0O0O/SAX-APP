import { useSyncExternalStore } from 'react';
import { engine } from './engine.ts';
import { metronomeBar, tapTempo, type Subdivision } from './metronome.ts';
import { writtenToHz } from './pitch.ts';
import { createPlayer } from './player.ts';

// Drone and metronome (ported from the iOS app's DroneConductor and MetronomeConductor).
// They live outside React so they keep sounding while you switch tabs.

export type ToolsState = {
  open: boolean;
  droneOn: boolean;
  /** Written pitch class 0-11 and octave. The drone sounds at the concert pitch of that written note. */
  dronePc: number;
  droneOctave: number;
  droneFifth: boolean;
  droneVolume: number;
  metroOn: boolean;
  bpm: number;
  beats: number;
  sub: Subdivision;
  swing: boolean;
  /** The beat that just sounded, for the flash. */
  beat: number | undefined;
};

const STORE = 'sax.tools.v1';
const DEFAULTS: ToolsState = { open: false, droneOn: false, dronePc: 7, droneOctave: 4, droneFifth: false, droneVolume: 0.5, metroOn: false, bpm: 80, beats: 4, sub: 'none', swing: false, beat: undefined };

function load(): ToolsState {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<ToolsState> | null;
    if (v) return { ...DEFAULTS, dronePc: v.dronePc ?? DEFAULTS.dronePc, droneOctave: v.droneOctave ?? DEFAULTS.droneOctave, droneFifth: Boolean(v.droneFifth), droneVolume: v.droneVolume ?? DEFAULTS.droneVolume, bpm: v.bpm ?? DEFAULTS.bpm, beats: v.beats ?? DEFAULTS.beats, sub: v.sub ?? DEFAULTS.sub, swing: Boolean(v.swing) };
  } catch {
    // defaults
  }
  return DEFAULTS;
}

let state = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(patch: Partial<ToolsState>) {
  state = { ...state, ...patch };
  const { open, droneOn, metroOn, beat, ...saved } = state;
  void open; void droneOn; void metroOn; void beat;
  try {
    localStorage.setItem(STORE, JSON.stringify(saved));
  } catch {
    // not critical
  }
  emit();
}

export const useTools = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );

/** Written midi of the drone's note. */
export const droneMidi = (pc: number, octave: number) => (octave + 1) * 12 + pc;

// ----------------------------------------------------------------- drone
let drone: { oscs: OscillatorNode[]; gain: GainNode; fifth: OscillatorNode } | null = null;

function droneFreqs() {
  const hz = writtenToHz(droneMidi(state.dronePc, state.droneOctave));
  return { root: hz, fifth: hz * 2 ** (7 / 12) };
}

function startDrone() {
  const { ctx, master } = engine();
  stopDrone(true);
  const f = droneFreqs();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(state.droneVolume * 0.35, ctx.currentTime + 0.6);
  gain.connect(master);
  const make = (hz: number, level: number) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; // sawtooth through a 600 Hz low-pass: the iOS drone's sound
    osc.frequency.value = hz;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.value = level;
    osc.connect(lp).connect(g).connect(gain);
    osc.start();
    return { osc, g };
  };
  const root = make(f.root, 1);
  const fifth = make(f.fifth, state.droneFifth ? 0.55 : 0);
  drone = { oscs: [root.osc, fifth.osc], gain, fifth: fifth.osc };
  fifthGain = fifth.g;
}
let fifthGain: GainNode | null = null;

function stopDrone(quick = false) {
  if (!drone) return;
  const { ctx } = engine();
  const d = drone;
  d.gain.gain.cancelScheduledValues(ctx.currentTime);
  d.gain.gain.setTargetAtTime(0, ctx.currentTime, quick ? 0.01 : 0.15);
  setTimeout(() => {
    d.oscs.forEach((o) => o.stop());
    d.gain.disconnect();
  }, quick ? 80 : 900);
  drone = null;
  fifthGain = null;
}

function retuneDrone() {
  if (!drone) return;
  const { ctx } = engine();
  const f = droneFreqs();
  drone.oscs[0].frequency.setTargetAtTime(f.root, ctx.currentTime, 0.05);
  drone.oscs[1].frequency.setTargetAtTime(f.fifth, ctx.currentTime, 0.05);
  fifthGain?.gain.setTargetAtTime(state.droneFifth ? 0.55 : 0, ctx.currentTime, 0.05);
  drone.gain.gain.setTargetAtTime(state.droneVolume * 0.35, ctx.currentTime, 0.05);
}

// ------------------------------------------------------------- metronome
const metro = createPlayer();
let taps: number[] = [];

function startMetro() {
  const bar = metronomeBar(state.beats, state.sub, state.swing);
  metro.play({
    events: bar,
    bpm: state.bpm,
    range: [0, state.beats],
    loop: true,
    countIn: 0,
    beatsPerBar: state.beats,
    voice: 'reed',
    cursorEvents: bar.filter((e) => e.item !== undefined).map((e) => ({ start: e.start, dur: 0.2, midi: 0, item: e.item!, bar: 0 })),
    onCursor: (item) => set({ beat: item }),
  });
}

export const tools = {
  open: (open: boolean) => set({ open }),
  toggleOpen: () => set({ open: !state.open }),
  set: (patch: Partial<ToolsState>) => {
    set(patch);
    if (state.droneOn && ('dronePc' in patch || 'droneOctave' in patch || 'droneFifth' in patch || 'droneVolume' in patch)) retuneDrone();
    if (state.metroOn) {
      if ('bpm' in patch) metro.setBpm(state.bpm);
      if ('beats' in patch || 'sub' in patch || 'swing' in patch) startMetro();
    }
  },
  toggleDrone: () => {
    if (state.droneOn) {
      stopDrone();
      set({ droneOn: false });
    } else {
      startDrone();
      set({ droneOn: true });
    }
  },
  toggleMetro: () => {
    if (state.metroOn) {
      metro.stop();
      set({ metroOn: false, beat: undefined });
    } else {
      startMetro();
      set({ metroOn: true });
    }
  },
  tap: () => {
    taps.push(performance.now());
    taps = taps.slice(-8);
    const bpm = tapTempo(taps);
    if (bpm) tools.set({ bpm });
  },
};
