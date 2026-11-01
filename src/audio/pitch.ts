// Written alto pitch -> sounding (concert) pitch -> Hz. The app shows written notes; it plays concert pitch.

export const A4 = 440;

/** Alto sax sounds a major 6th below written pitch. */
export const concertMidi = (written: number) => written - 9;

/** Frequency of a midi note number (A4 = 69). */
export const midiToHz = (midi: number, a4 = A4) => a4 * 2 ** ((midi - 69) / 12);

/** Frequency a written alto note sounds at. Written C5 -> concert E♭4 = 311.13 Hz. */
export const writtenToHz = (written: number, a4 = A4) => midiToHz(concertMidi(written), a4);

/** Nearest midi note and how many cents the frequency is above it. */
export function hzToMidi(hz: number, a4 = A4): { midi: number; cents: number } {
  const exact = 69 + 12 * Math.log2(hz / a4);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}
