import { nameOf, parseSpelling, pcOf, spellDegree, type Spelling } from '../../shared/theory.ts';
import type { BandStyle } from '../audio/band.ts';
import type { ChartFile } from './chart.ts';

// Practice grooves: common progressions to play over in any key. They are written as scale degrees and suffixes,
// then realised in a written key (chord symbols are written pitch, like the charts'). No sheet music involved,
// so unlike the tunes they are fine to publish.

type Step = { degree: string; suffix: string; at?: number };
export type Preset = {
  id: string;
  name: string;
  blurb: string;
  style: BandStyle;
  swing: boolean;
  tempo: number;
  /** Scales worth playing over it, built on the key's root. */
  scales: string[];
  /** One entry per bar; two steps in a bar change chords at beat 0 and `at` (default 2). */
  bars: Step[][];
};

const one = (degree: string, suffix: string): Step[] => [{ degree, suffix }];
const rep = (steps: Step[], n: number): Step[][] => Array.from({ length: n }, () => steps);

export const PRESETS: Preset[] = [
  {
    id: 'blues',
    name: '12-bar blues',
    blurb: 'The basic form: I7 for four bars, IV7, back to I7, then V7 – IV7 – I7 and a turnaround. Blues scale and major pentatonic.',
    style: 'swing', swing: true, tempo: 120, scales: ['blues', 'major-pentatonic', 'mixolydian'],
    bars: [...rep(one('1', '7'), 4), ...rep(one('4', '7'), 2), ...rep(one('1', '7'), 2), one('5', '7'), one('4', '7'), one('1', '7'), [{ degree: '1', suffix: '7' }, { degree: '5', suffix: '7', at: 2 }]],
  },
  {
    id: 'minor-blues',
    name: 'Minor blues',
    blurb: 'A minor-key blues: Im7, IVm7, ♭VI7 – V7 – Im7. Minor pentatonic and blues scale, with the ♭6 on the ♭VI chord.',
    style: 'swing', swing: true, tempo: 110, scales: ['minor-pentatonic', 'blues', 'dorian'],
    bars: [...rep(one('1', 'm7'), 4), ...rep(one('4', 'm7'), 2), ...rep(one('1', 'm7'), 2), one('b6', '7'), one('5', '7'), one('1', 'm7'), [{ degree: '1', suffix: 'm7' }, { degree: '5', suffix: '7(b9)', at: 2 }]],
  },
  {
    id: 'ii-v-i',
    name: 'ii – V – I (major)',
    blurb: 'Four bars on repeat: IIm7, V7, Imaj7, Imaj7. The most common move in jazz: practise arpeggios and the 3rd-to-7th guide-tone line.',
    style: 'swing', swing: true, tempo: 110, scales: ['major'],
    bars: [one('2', 'm7'), one('5', '7'), one('1', 'maj7'), one('1', 'maj7')],
  },
  {
    id: 'ii-v-i-minor',
    name: 'ii – V – i (minor)',
    blurb: 'IIm7♭5, V7♭9, Im7, Im7. Locrian or Dorian ♭2 on the ii, half–whole diminished on the V, then the minor.',
    style: 'swing', swing: true, tempo: 100, scales: ['aeolian', 'melodic-minor', 'harmonic-minor'],
    bars: [one('2', 'm7b5'), one('5', '7(b9)'), one('1', 'm7'), one('1', 'm7')],
  },
  {
    id: 'turnaround',
    name: 'Turnaround (I – vi – ii – V)',
    blurb: 'One chord a bar: Imaj7, VIm7, IIm7, V7. Closes a chorus and leads straight back to the top.',
    style: 'swing', swing: true, tempo: 120, scales: ['major', 'major-pentatonic'],
    bars: [one('1', 'maj7'), one('6', 'm7'), one('2', 'm7'), one('5', '7')],
  },
  {
    id: 'so-what',
    name: 'Modal vamp (So What form)',
    blurb: 'Im7 for 16 bars, ♭IIm7 for 8, then Im7 for 8. One mode (Dorian) over the whole tune: the scale does the work, and the half-step shift is the colour.',
    style: 'swing', swing: true, tempo: 132, scales: ['dorian', 'minor-pentatonic'],
    bars: [...rep(one('1', 'm7'), 16), ...rep(one('b2', 'm7'), 8), ...rep(one('1', 'm7'), 8)],
  },
];

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A name a player expects: no double accidentals, no C♭ F♭ E♯ B♯ (the ♭VI of D♭ is B♮, not B𝄫). */
function friendly(s: Spelling): Spelling {
  const awkward = Math.abs(s.acc) > 1 || (s.acc === -1 && (s.letter === 0 || s.letter === 3)) || (s.acc === 1 && (s.letter === 2 || s.letter === 6));
  return awkward ? parseSpelling(KEYS[pcOf(s)]) : s;
}
export const BACKING_KEYS = KEYS;

/** The preset as a chart in a written key: empty bars (whole rests) with the chord symbols. */
export function presetChart(preset: Preset, key: string): ChartFile {
  const root = parseSpelling(key);
  const name = (s: Step) => `${nameOf(friendly(spellDegree(root, s.degree))).replace('♯', '#').replace('♭', 'b')}${s.suffix}`;
  return {
    title: `${preset.name} in ${key}`,
    arranger: 'practice groove',
    writtenKey: key,
    concertKey: '',
    keySig: key,
    tempo: preset.tempo,
    swing: preset.swing,
    band: preset.style,
    bars: preset.bars.map((steps) => ({
      notes: 'r/w',
      chords: steps.map((s, i) => (i === 0 ? name(s) : `${name(s)}@${s.at ?? 2}`)),
    })),
  };
}
