// Synthesised instruments (no sample files to host). Everything takes a BaseAudioContext so the same code
// runs live and in an OfflineAudioContext for checking. Frequencies are CONCERT pitch.

export type Voice = 'reed' | 'piano';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

let noise: AudioBuffer | null = null;
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let seed = 12345; // deterministic noise
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = (seed / 2 ** 31) - 1;
    }
  }
  return noise;
}

/** A reed-like tone: sawtooth through a low-pass (the recipe of the iOS drone, ~600 Hz) with a gentle late vibrato. */
function reed(ctx: BaseAudioContext, out: AudioNode, hz: number, at: number, dur: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = hz;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = clamp(hz * 3.2, 600, 2600);
  filter.Q.value = 0.7;
  const env = ctx.createGain();
  const end = at + Math.max(dur, 0.06);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(gain * 0.5, at + 0.035);
  env.gain.setValueAtTime(gain * 0.5, Math.max(at + 0.04, end - 0.03));
  env.gain.exponentialRampToValueAtTime(0.0001, end + 0.09);
  // Vibrato that fades in after a moment, like a held note on a horn.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(5, at + 0.7);
  lfo.connect(depth).connect(osc.detune);
  osc.connect(filter).connect(env).connect(out);
  osc.start(at);
  lfo.start(at);
  osc.stop(end + 0.12);
  lfo.stop(end + 0.12);
}

/** A soft piano-like tone: a few partials that decay faster the higher the note. */
function piano(ctx: BaseAudioContext, out: AudioNode, hz: number, at: number, dur: number, gain: number, ring = 1) {
  const decay = clamp(2.6 - hz / 700, 0.5, 2.4) * ring;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(gain * 0.55, at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(decay, dur * 0.6));
  env.connect(out);
  [[1, 1], [2, 0.42], [3, 0.2], [4, 0.09]].forEach(([mult, amp], i) => {
    if (hz * mult > 9000) return;
    const osc = ctx.createOscillator();
    osc.type = i === 1 ? 'triangle' : 'sine';
    osc.frequency.value = hz * mult;
    const g = ctx.createGain();
    g.gain.value = amp;
    osc.connect(g).connect(env);
    osc.start(at);
    osc.stop(at + Math.max(decay, dur * 0.6) + 0.1);
  });
}

function bass(ctx: BaseAudioContext, out: AudioNode, hz: number, at: number, dur: number, gain: number) {
  const env = ctx.createGain();
  const end = at + Math.max(dur * 0.92, 0.08);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(gain * 0.5, at + 0.012);
  env.gain.exponentialRampToValueAtTime(gain * 0.3, at + 0.18);
  env.gain.setValueAtTime(gain * 0.28, end - 0.03);
  env.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  lp.connect(env).connect(out);
  for (const [type, mult, amp] of [['sine', 1, 1], ['triangle', 1, 0.45], ['sine', 2, 0.18]] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz * mult;
    const g = ctx.createGain();
    g.gain.value = amp;
    osc.connect(g).connect(lp);
    osc.start(at);
    osc.stop(end + 0.1);
  }
}

export function playTone(ctx: BaseAudioContext, out: AudioNode, kind: 'melody' | 'bass' | 'comp', voice: Voice, hz: number, at: number, dur: number, gain = 0.5) {
  if (kind === 'bass') return bass(ctx, out, hz, at, dur, gain);
  if (kind === 'comp') return piano(ctx, out, hz, at, dur, gain * 0.7, 0.55);
  return voice === 'reed' ? reed(ctx, out, hz, at, dur, gain) : piano(ctx, out, hz, at, dur, gain);
}

/** The iOS app's metronome click: a short decaying sine, 1800 Hz on the downbeat and 900 Hz on the others. */
export function playClick(ctx: BaseAudioContext, out: AudioNode, at: number, accent: boolean, gain = 0.5) {
  const osc = ctx.createOscillator();
  osc.frequency.value = accent ? 1800 : 900;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + 0.06);
}

function noiseHit(ctx: BaseAudioContext, out: AudioNode, at: number, dur: number, type: BiquadFilterType, freq: number, q: number, gain: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(env).connect(out);
  src.start(at, (at * 7.31) % 0.5);
  src.stop(at + dur + 0.02);
}

export function playDrum(ctx: BaseAudioContext, out: AudioNode, kind: 'kick' | 'snare' | 'hat' | 'ride', at: number, gain = 0.5) {
  if (kind === 'kick') {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(130, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain * 1.3, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + 0.32);
  } else if (kind === 'snare') {
    noiseHit(ctx, out, at, 0.16, 'bandpass', 2800, 0.7, gain * 0.7);
  } else if (kind === 'hat') {
    noiseHit(ctx, out, at, 0.05, 'highpass', 7500, 0.7, gain * 0.5);
  } else {
    noiseHit(ctx, out, at, 0.42, 'bandpass', 7200, 0.9, gain * 0.38);
    for (const f of [5200, 6900]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f;
      const env = ctx.createGain();
      env.gain.setValueAtTime(gain * 0.025, at);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      osc.connect(env).connect(out);
      osc.start(at);
      osc.stop(at + 0.4);
    }
  }
}
