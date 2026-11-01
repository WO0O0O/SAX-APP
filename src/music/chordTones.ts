import { parseChord, roleOf, type Chord, type ToneRole } from '../../shared/chords.ts';
import { atMidi, nameOf, pcOf, type Note } from '../../shared/theory.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { beatsOf, type Chart } from './chart.ts';
import { CIRCLE } from './scales.ts';

/** Colours for the "colour chord tones" view (readable on the paper background). */
export const ROLE_COLORS: Record<ToneRole, string> = {
  root: '#a0701a',
  third: '#b3261e',
  fifth: '#2f7a4f',
  seventh: '#2c5aa0',
  sixth: '#2c5aa0',
  extension: '#7a3e9d',
};
export const ROLE_NAMES: Record<ToneRole, string> = {
  root: 'Root',
  third: '3rd',
  fifth: '5th',
  seventh: '7th',
  sixth: '6th',
  extension: '9th / 11th / 13th',
};

/** The chord sounding under every item of the chart (index = item index across all bars), or null before the first chord. */
export function chordPerItem(chart: Pick<Chart, 'bars' | 'chords'>): (Chord | null)[] {
  const out: (Chord | null)[] = [];
  let current: Chord | null = null;
  chart.bars.forEach((bar, b) => {
    const chords = chart.chords[b] ?? [];
    let beat = 0;
    for (const it of bar) {
      const c = pickChord(chords, beat);
      if (c) current = parseChord(c.name);
      out.push(current);
      beat += beatsOf(it);
    }
  });
  return out;
}

/** The latest chord in the bar that starts at or before `beat`. */
function pickChord(chords: { name: string; beat: number }[], beat: number) {
  return chords.filter((c) => c.beat <= beat + 0.01).at(-1);
}

/** Colour per item index by its role over the chord under it; non-chord tones stay black. */
export function toneColors(chart: Pick<Chart, 'bars' | 'chords'>): Record<number, string> {
  const per = chordPerItem(chart);
  const colors: Record<number, string> = {};
  chart.bars.flat().forEach((it, i) => {
    const chord = per[i];
    if (!it.note || !chord) return;
    const role = roleOf(chord, it.note.midi % 12);
    if (role) colors[i] = ROLE_COLORS[role];
  });
  return colors;
}

/** One octave of the chord rising from its root, in written pitch (root at or above `low`). */
export function arpeggio(chord: Chord, low = 60): Note[] {
  const out: Note[] = [];
  let prev = low - 1;
  for (const t of chord.tones) {
    let midi = prev + 1;
    while (midi % 12 !== pcOf(t.spelling)) midi++;
    out.push(atMidi(t.spelling, midi));
    prev = midi;
  }
  return [...out, atMidi(chord.tones[0].spelling, out[0].midi + 12)];
}

/** Every chord tone in the student's range, low to high. */
export function chordToneRange(chord: Chord, low = STUDENT_RANGE.low, high = STUDENT_RANGE.high): Note[] {
  const out: Note[] = [];
  for (let m = low; m <= high; m++) {
    const t = chord.tones.find((x) => pcOf(x.spelling) === m % 12);
    if (t) out.push(atMidi(t.spelling, m));
  }
  return out;
}

/** The circle-of-fifths position (and spelling) for a scale tonic, falling back to an enharmonic key. */
export function pickerFor(tonic: { letter: number; acc: number }): { pos: number; alt: boolean } {
  const name = nameOf(tonic).replace('♯', '#').replace('♭', 'b');
  for (let pos = 0; pos < CIRCLE.length; pos++) {
    if (CIRCLE[pos][0] === name) return { pos, alt: false };
    if (CIRCLE[pos][1] === name) return { pos, alt: true };
  }
  const pc = pcOf(tonic);
  const pos = CIRCLE.findIndex(([n]) => pcOf({ letter: 'CDEFGAB'.indexOf(n[0]), acc: n.includes('#') ? 1 : n.includes('b') ? -1 : 0 }) === pc);
  return { pos: Math.max(pos, 0), alt: false };
}

/** Opens the Scales screen on a given tonic and scale. */
export function openInScales(tonic: { letter: number; acc: number }, scaleId: string) {
  try {
    localStorage.setItem('sax.picker.v1', JSON.stringify({ ...pickerFor(tonic), scaleId }));
  } catch {
    // the screen opens on its last choice
  }
  location.hash = '#scales';
}
