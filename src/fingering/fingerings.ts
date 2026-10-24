// Alto sax fingerings by WRITTEN midi number, low Bb (58) to high F# (90).
// Source: TamingTheSaxophone.com fingering chart (sheet-music/FingeringChart.pdf).
// The first fingering is the standard one; the rest are named alternates.

export type KeyId =
  | 'oct' | 'L1' | 'bis' | 'L2' | 'L3'
  | 'palmD' | 'palmEb' | 'palmF'
  | 'gs' | 'lowCs' | 'lowB' | 'lowBb'
  | 'R1' | 'R2' | 'R3' | 'altFs'
  | 'sideE' | 'sideC' | 'sideBb' | 'highFs'
  | 'eb' | 'lowC';

export type Fingering = { keys: KeyId[]; name?: string };

const L123: KeyId[] = ['L1', 'L2', 'L3'];
const R123: KeyId[] = ['R1', 'R2', 'R3'];

// First octave (no octave key), 58-73.
const LOW: Record<number, Fingering[]> = {
  58: [{ keys: [...L123, 'lowBb', ...R123, 'lowC'] }],
  59: [{ keys: [...L123, 'lowB', ...R123, 'lowC'] }],
  60: [{ keys: [...L123, ...R123, 'lowC'] }],
  61: [{ keys: [...L123, 'lowCs', ...R123, 'lowC'] }],
  62: [{ keys: [...L123, ...R123] }],
  63: [{ keys: [...L123, ...R123, 'eb'] }],
  64: [{ keys: [...L123, 'R1', 'R2'] }],
  65: [{ keys: [...L123, 'R1'] }],
  66: [{ keys: [...L123, 'R2'] }, { keys: [...L123, 'R1', 'altFs'], name: 'Alternate F♯ key' }],
  67: [{ keys: [...L123] }],
  68: [{ keys: [...L123, 'gs'] }],
  69: [{ keys: ['L1', 'L2'] }],
  70: [
    { keys: ['L1', 'bis'], name: 'Bis' },
    { keys: ['L1', 'R1'], name: '1 + 1' },
    { keys: ['L1', 'sideBb'], name: 'Side B♭' },
  ],
  71: [{ keys: ['L1'] }],
  72: [{ keys: ['L2'] }, { keys: ['L1', 'sideC'], name: 'Side C' }],
  73: [{ keys: [] }],
};

const PALMS: Record<number, KeyId[]> = {
  86: ['palmD'],
  87: ['palmD', 'palmEb'],
  88: ['palmD', 'palmEb', 'sideE'],
  89: ['palmD', 'palmEb', 'palmF', 'sideE'],
  90: ['palmD', 'palmEb', 'palmF', 'sideE', 'highFs'],
};

export const FINGERINGS: Record<number, Fingering[]> = (() => {
  const out: Record<number, Fingering[]> = { ...LOW };
  // Second octave (74-85): same as 62-73 plus the octave key.
  for (let m = 74; m <= 85; m++) {
    out[m] = LOW[m - 12].map((f) => ({ ...f, keys: ['oct', ...f.keys] }));
  }
  for (const [m, keys] of Object.entries(PALMS)) out[Number(m)] = [{ keys: ['oct', ...keys] }];
  return out;
})();

const KEY_NAMES: Partial<Record<KeyId, string>> = {
  oct: 'octave key',
  bis: 'bis key',
  palmD: 'palm D',
  palmEb: 'palm E♭',
  palmF: 'palm F',
  gs: 'G♯ key (L pinky)',
  lowCs: 'C♯ key (L pinky)',
  lowB: 'low B key (L pinky)',
  lowBb: 'low B♭ key (L pinky)',
  altFs: 'alt F♯ key (R3)',
  sideE: 'side E',
  sideC: 'side C',
  sideBb: 'side B♭',
  highFs: 'high F♯ key',
  eb: 'E♭ key (R pinky)',
  lowC: 'low C key (R pinky)',
};

/** Plain-language summary, e.g. ['L 1 2 3 · R 1', '+ octave key']. */
export function describe(keys: KeyId[]): string[] {
  const hand = (side: 'L' | 'R') =>
    ([1, 2, 3] as const).filter((n) => keys.includes(`${side}${n}` as KeyId)).join(' ') || '–';
  if (keys.length === 0) return ['All keys open'];
  const extras = keys.filter((k) => KEY_NAMES[k]).map((k) => KEY_NAMES[k]!);
  return [`L ${hand('L')} · R ${hand('R')}`, ...(extras.length ? [`+ ${extras.join(', ')}`] : [])];
}
