import { describe, expect, it } from 'vitest';
import { rng } from '../music/exercise.ts';
import { detectPitch, rms } from './detect.ts';
import { PitchSmoother, inTune, readingFromHz } from './analysis.ts';
import { midiToHz, writtenToHz } from '../audio/pitch.ts';

const N = 2048;

/** A tone with the given harmonic amplitudes (index 0 = fundamental), like a reed instrument. */
function tone(hz: number, sampleRate: number, harmonics: number[], noise = 0, seed = 1, n = N): Float32Array {
  const random = rng(seed);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    harmonics.forEach((a, k) => (v += a * Math.sin((2 * Math.PI * hz * (k + 1) * i) / sampleRate + k)));
    buf[i] = 0.3 * v + noise * (random() * 2 - 1);
  }
  return buf;
}
const centsBetween = (a: number, b: number) => 1200 * Math.log2(a / b);

const SINE = [1];
const SAX = [1, 0.8, 0.6, 0.45, 0.3, 0.2]; // strong upper harmonics
const SECOND_HEAVY = [0.7, 1, 0.5, 0.3]; // the 2nd harmonic louder than the fundamental: the classic octave trap

describe('detectPitch', () => {
  for (const sampleRate of [44100, 48000]) {
    describe(`at ${sampleRate} Hz`, () => {
      it('finds sine tones across the whole sax range within 1 cent', () => {
        for (let written = 58; written <= 90; written++) {
          const hz = writtenToHz(written);
          const d = detectPitch(tone(hz, sampleRate, SINE), sampleRate)!;
          expect(d, `written ${written}`).not.toBeNull();
          expect(Math.abs(centsBetween(d.hz, hz)), `written ${written} (${hz.toFixed(1)} Hz)`).toBeLessThan(1);
          expect(d.clarity).toBeGreaterThan(0.95);
        }
      });
      it('finds harmonic-rich sax-like tones without octave errors', () => {
        for (let written = 58; written <= 90; written++) {
          const hz = writtenToHz(written);
          for (const harmonics of [SAX, SECOND_HEAVY]) {
            const d = detectPitch(tone(hz, sampleRate, harmonics), sampleRate)!;
            expect(d, `written ${written}`).not.toBeNull();
            expect(Math.abs(centsBetween(d.hz, hz)), `written ${written}`).toBeLessThan(2);
          }
        }
      });
      it('reads a detuned note: +/-10 cents', () => {
        for (const offset of [-10, 10]) {
          const hz = writtenToHz(70) * 2 ** (offset / 1200); // written B♭4
          const d = detectPitch(tone(hz, sampleRate, SAX), sampleRate)!;
          const r = readingFromHz(d.hz);
          expect(r.midi).toBe(70);
          expect(r.cents).toBeGreaterThan(offset - 1.5);
          expect(r.cents).toBeLessThan(offset + 1.5);
        }
      });
    });
  }

  it('covers the extremes: low B♭ (138.59 Hz) and high F♯ (880 Hz)', () => {
    expect(detectPitch(tone(138.59, 48000, SAX), 48000)!.hz).toBeCloseTo(138.59, 0);
    expect(detectPitch(tone(880, 48000, SAX), 48000)!.hz).toBeCloseTo(880, 0);
  });
  it('is still accurate with some background noise', () => {
    const hz = writtenToHz(75);
    const d = detectPitch(tone(hz, 48000, SAX, 0.03), 48000)!;
    expect(Math.abs(centsBetween(d.hz, hz))).toBeLessThan(3);
  });
  it('returns null for silence and low clarity for noise', () => {
    expect(detectPitch(new Float32Array(N), 48000)).toBeNull();
    const noise = tone(100, 48000, [0], 0.5, 9);
    const d = detectPitch(noise, 48000);
    expect(d === null || d.clarity < 0.85).toBe(true);
  });
});

describe('rms', () => {
  it('is zero for silence and about 0.707 of the peak for a sine', () => {
    expect(rms(new Float32Array(100))).toBe(0);
    const buf = new Float32Array(4800);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);
    expect(rms(buf)).toBeCloseTo(0.7071, 2);
  });
});

describe('readingFromHz', () => {
  it('names the written note for what sounds: concert E♭4 is written C5', () => {
    expect(readingFromHz(midiToHz(63)).midi).toBe(72);
    expect(readingFromHz(440).midi).toBe(78); // concert A4 = written F♯5
  });
  it('follows the A4 reference', () => {
    const r = readingFromHz(442, 442);
    expect(r.cents).toBeCloseTo(0, 5);
    expect(readingFromHz(442, 440).cents).toBeGreaterThan(7);
  });
  it('applies the tolerance of each mode', () => {
    expect(inTune(11, 'casual')).toBe(true);
    expect(inTune(-13, 'casual')).toBe(false);
    expect(inTune(4, 'pro')).toBe(true);
    expect(inTune(6, 'pro')).toBe(false);
  });
});

describe('PitchSmoother', () => {
  it('throws out a single octave glitch', () => {
    const s = new PitchSmoother(5);
    const hz = writtenToHz(72);
    let r = null;
    for (const f of [hz, hz, hz * 2, hz, hz]) r = s.push(f);
    expect(r!.midi).toBe(72);
    expect(Math.abs(r!.cents)).toBeLessThan(1);
  });
  it('needs a few frames before it shows anything and forgets after silence', () => {
    const s = new PitchSmoother(5);
    const hz = writtenToHz(72);
    expect(s.push(hz)).toBeNull();
    expect(s.push(hz)).toBeNull();
    expect(s.push(hz)).not.toBeNull();
    for (let i = 0; i < 4; i++) s.push(null);
    expect(s.push(hz)).toBeNull();
  });
  it("doesn't flicker between two notes on the boundary", () => {
    const s = new PitchSmoother(3);
    const base = writtenToHz(72);
    const names: number[] = [];
    for (const off of [10, 49, 51, 49, 51, 49, 51, 49]) names.push(s.push(base * 2 ** (off / 1200))?.midi ?? 0);
    const stable = names.filter((n) => n !== 0);
    expect(new Set(stable).size).toBe(1);
  });
  it('switches once the next note is clearly closer', () => {
    const s = new PitchSmoother(3);
    const base = writtenToHz(72);
    for (let i = 0; i < 4; i++) s.push(base);
    let r = null;
    for (let i = 0; i < 4; i++) r = s.push(base * 2 ** (100 / 1200));
    expect(r!.midi).toBe(73);
  });
});
