// Note spelling and transposition. Everything here is pitch-class / letter maths;
// whether a pitch is "written" or "concert" is up to the caller.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

/** A spelled pitch class, e.g. F# = { letter: 3, acc: 1 }. */
export type Spelling = { letter: number; acc: number };
/** A spelled pitch with octave, e.g. F#4. */
export type Note = Spelling & { octave: number; midi: number };

/** Alto sax written range (instrument), from the reference chart: low Bb to high F#. */
export const ALTO_RANGE = { low: 58, high: 90 };

export const pcOf = (s: Spelling) => (((NATURAL_PC[s.letter] + s.acc) % 12) + 12) % 12;

export function parseSpelling(name: string): Spelling {
  const m = /^([A-G])(#{1,2}|b{1,2})?$/.exec(name);
  if (!m) throw new Error(`Bad note name: ${name}`);
  const acc = !m[2] ? 0 : m[2][0] === '#' ? m[2].length : -m[2].length;
  return { letter: LETTERS.indexOf(m[1] as Letter), acc };
}

/** Moves a spelling by a number of letter steps and semitones (both may be negative). */
export function transpose(s: Spelling, letterSteps: number, semitones: number): Spelling {
  const letter = (((s.letter + letterSteps) % 7) + 7) % 7;
  const target = (((pcOf(s) + semitones) % 12) + 12) % 12;
  let acc = target - NATURAL_PC[letter];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  return { letter, acc };
}

/** Written alto -> concert: down a major 6th (5 letters, 9 semitones). */
export const writtenToConcert = (s: Spelling) => transpose(s, -5, -9);
/** Concert -> written alto: up a major 6th. */
export const concertToWritten = (s: Spelling) => transpose(s, 5, 9);

/** Degree like '1', 'b3', '#4' -> spelling above a tonic. */
export function spellDegree(tonic: Spelling, degree: string): Spelling {
  const m = /^(b{1,2}|#{1,2})?(\d)$/.exec(degree);
  if (!m) throw new Error(`Bad degree: ${degree}`);
  const n = Number(m[2]) - 1;
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const shift = !m[1] ? 0 : m[1][0] === '#' ? m[1].length : -m[1].length;
  return transpose(tonic, n, MAJOR[n] + shift);
}

/** Places a spelled pitch class at a midi number (which must match its pitch class). */
export function atMidi(s: Spelling, midi: number): Note {
  return { ...s, midi, octave: (midi - NATURAL_PC[s.letter] - s.acc) / 12 - 1 };
}

const ACC_TEXT: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
const ACC_ASCII: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' };

/** 'F♯' (display). */
export const nameOf = (s: Spelling) => LETTERS[s.letter] + ACC_TEXT[s.acc];
/** 'F#' (ascii, for keys and VexFlow). */
export const asciiOf = (s: Spelling) => LETTERS[s.letter] + ACC_ASCII[s.acc];
/** 'F♯4'. */
export const noteName = (n: Note) => `${nameOf(n)}${n.octave}`;
