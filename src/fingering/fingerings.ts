// Alto sax fingerings, keyed by written pitch (canonical spelling from shared/pitch.ts).
// Standard fingerings only; alternates (side Bb, side C, ...) arrive with R9.
// Missing: C#4 (low C#) until it's checked against a reference chart in Phase 1a.

export type KeyId =
  | 'oct' | 'L1' | 'bis' | 'L2' | 'L3'
  | 'palmD' | 'palmEb' | 'palmF'
  | 'gs' | 'lowCs' | 'lowB' | 'lowBb'
  | 'R1' | 'R2' | 'R3'
  | 'sideE' | 'sideC' | 'sideBb'
  | 'eb' | 'lowC';

const LOW: Record<string, KeyId[]> = {
  C4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lowC'],
  D4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
  Eb4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'eb'],
  E4: ['L1', 'L2', 'L3', 'R1', 'R2'],
  F4: ['L1', 'L2', 'L3', 'R1'],
  'F#4': ['L1', 'L2', 'L3', 'R2'],
  G4: ['L1', 'L2', 'L3'],
  'G#4': ['L1', 'L2', 'L3', 'gs'],
  A4: ['L1', 'L2'],
  Bb4: ['L1', 'bis'],
  B4: ['L1'],
  C5: ['L2'],
  'C#5': [],
};

/** Second octave: same fingering plus the octave key. */
function withOctave(): Record<string, KeyId[]> {
  const out: Record<string, KeyId[]> = {};
  for (const [pitch, keys] of Object.entries(LOW)) {
    if (pitch === 'C4') continue;
    const up = pitch.replace(/(\d)$/, (d) => String(Number(d) + 1));
    out[up] = ['oct', ...keys];
  }
  return out;
}

export const FINGERINGS: Record<string, KeyId[]> = {
  ...LOW,
  ...withOctave(),
  D6: ['oct', 'palmD'],
  Eb6: ['oct', 'palmD', 'palmEb'],
};

const HAND_NAMES: Partial<Record<KeyId, string>> = {
  oct: 'octave key (left thumb)',
  bis: 'bis key (left 1 + the small key below it)',
  palmD: 'palm D',
  palmEb: 'palm Eb',
  gs: 'G# key (left pinky)',
  eb: 'Eb key (right pinky)',
  lowC: 'low C key (right pinky)',
};

/** Plain-language description, e.g. "Left hand 1, 2, 3 · Right hand 1". */
export function describe(keys: KeyId[]): string[] {
  const left = (['L1', 'L2', 'L3'] as const).filter((k) => keys.includes(k)).map((k) => k[1]);
  const right = (['R1', 'R2', 'R3'] as const).filter((k) => keys.includes(k)).map((k) => k[1]);
  const lines: string[] = [];
  if (left.length) lines.push(`Left hand ${left.join(', ')}`);
  if (right.length) lines.push(`Right hand ${right.join(', ')}`);
  for (const k of keys) if (HAND_NAMES[k]) lines.push(`+ ${HAND_NAMES[k]}`);
  return lines.length ? lines : ['No keys pressed (open)'];
}
