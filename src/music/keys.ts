import { parseSpelling, spellDegree, type Spelling } from '../../shared/theory.ts';

const MAJOR = ['1', '2', '3', '4', '5', '6', '7'];

/** Accidental on each letter (C..B) in a major key signature, e.g. 'G' -> F is +1. */
export function keyAccidentals(keySig?: string): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  if (!keySig) return out;
  const tonic = parseSpelling(keySig);
  for (const d of MAJOR) {
    const s = spellDegree(tonic, d);
    out[s.letter] = s.acc;
  }
  return out;
}

/** Major keys in order of fewest accidentals first. */
const KEYS = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab', 'B', 'Db', 'F#', 'Gb'];

/**
 * The key signature to print for a scale: one whose notes include every note of the scale, preferring a key the
 * scale's tonic belongs to (G pentatonic -> G, E minor -> G) and otherwise the fewest accidentals (D Dorian -> C).
 */
export function keySigFor(spellings: Spelling[]): string | undefined {
  const fits = KEYS.filter((k) => {
    const acc = keyAccidentals(k);
    return spellings.every((s) => acc[s.letter] === s.acc);
  });
  const tonic = spellings[0];
  const home = fits.find((k) => {
    const key = parseSpelling(k);
    const relativeMinor = spellDegree(key, '6');
    return (key.letter === tonic.letter && key.acc === tonic.acc) || (relativeMinor.letter === tonic.letter && relativeMinor.acc === tonic.acc);
  });
  return home ?? fits[0];
}
