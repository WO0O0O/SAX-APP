import { ALTO_RANGE, atMidi, parseSpelling, pcOf, spellDegree, type Note, type Spelling } from '../../shared/theory.ts';

// Spellings players avoid when an enharmonic is available.
const AWKWARD = (s: Spelling) => Math.abs(s.acc) > 1 || (s.acc === -1 && (s.letter === 0 || s.letter === 3)) || (s.acc === 1 && (s.letter === 2 || s.letter === 6));

/**
 * Spelled pitch classes of a scale on a tonic, e.g. ('E', ['1','b3',...]).
 * A degree like 'b5|#4' uses the first option unless it gives an awkward name (F♭, C♭, E♯, B♯, doubles).
 */
export function scaleSpellings(tonic: string, degrees: string[]): Spelling[] {
  const t = parseSpelling(tonic);
  return degrees.map((d) => {
    const options = d.split('|').map((o) => spellDegree(t, o));
    return options.find((s) => !AWKWARD(s)) ?? options[0];
  });
}

/** One octave up from the tonic, tonic placed between C4 and B4. */
export function oneOctave(spellings: Spelling[]): Note[] {
  const tonicMidi = 60 + pcOf(spellings[0]);
  const notes = spellings.map((s) => {
    let midi = 60 + pcOf(s);
    if (midi < tonicMidi) midi += 12;
    return atMidi(s, midi);
  });
  return [...notes, atMidi(spellings[0], tonicMidi + 12)];
}

/** Every note of the scale across the whole horn, low Bb to high F#. */
export function fullRange(spellings: Spelling[], low = ALTO_RANGE.low, high = ALTO_RANGE.high): Note[] {
  const byPc = new Map(spellings.map((s) => [pcOf(s), s]));
  const out: Note[] = [];
  for (let m = low; m <= high; m++) {
    const s = byPc.get(m % 12);
    if (s) out.push(atMidi(s, m));
  }
  return out;
}
