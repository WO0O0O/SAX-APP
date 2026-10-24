// Pitch helpers. All pitches in the app are WRITTEN alto pitch unless a name says "concert".
// Canonical spelling per pitch class, matching how sax charts usually spell them.
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] as const;
const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'C4' -> 60. Accepts sharps and flats ('D#6' and 'Eb6' both -> 87). */
export function toMidi(pitch: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(pitch);
  if (!m) throw new Error(`Bad pitch: ${pitch}`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + LETTER_SEMITONES[m[1]] + accidental;
}

/** 60 -> 'C4', using the canonical spelling. */
export function fromMidi(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Every chromatic pitch from low to high inclusive, canonical spelling. */
export function chromaticRange(low: string, high: string): string[] {
  const out: string[] = [];
  for (let m = toMidi(low); m <= toMidi(high); m++) out.push(fromMidi(m));
  return out;
}
