import { LETTERS, atMidi, nameOf, parseSpelling, pcOf, spellDegree, transpose, type Note, type Spelling } from './theory.ts';

// Chord symbols as written in the charts ('Am7', 'F#ø7', 'B7(♭9)', 'C#m9/B#', 'D (F#m)') -> spelled chord tones.
// All spelling is in whatever pitch the symbol is in (the charts use written alto pitch).

export type ToneRole = 'root' | 'third' | 'fifth' | 'seventh' | 'sixth' | 'extension';
export type ChordTone = { degree: string; spelling: Spelling; role: ToneRole };
export type Chord = {
  name: string;
  root: Spelling;
  bass?: Spelling;
  quality: Quality;
  tones: ChordTone[];
};

export type Quality =
  | 'major' | 'maj7' | 'maj9' | 'six' | 'minor' | 'min6' | 'min7' | 'min9' | 'minMaj7' | 'm7b5' | 'dim' | 'dim7'
  | 'dom7' | 'dom9' | 'dom13' | 'dom7alt' | 'sus' | 'aug';

const DEGREES: Record<Quality, string[]> = {
  major: ['1', '3', '5'],
  maj7: ['1', '3', '5', '7'],
  maj9: ['1', '3', '5', '7', '9'],
  six: ['1', '3', '5', '6'],
  minor: ['1', 'b3', '5'],
  min6: ['1', 'b3', '5', '6'],
  min7: ['1', 'b3', '5', 'b7'],
  min9: ['1', 'b3', '5', 'b7', '9'],
  minMaj7: ['1', 'b3', '5', '7'],
  m7b5: ['1', 'b3', 'b5', 'b7'],
  dim: ['1', 'b3', 'b5'],
  dim7: ['1', 'b3', 'b5', 'bb7'],
  dom7: ['1', '3', '5', 'b7'],
  dom9: ['1', '3', '5', 'b7', '9'],
  dom13: ['1', '3', '5', 'b7', '13'],
  dom7alt: ['1', '3', '5', 'b7'],
  sus: ['1', '4', '5', 'b7'],
  aug: ['1', '3', '#5'],
};

/** Base quality from the text after the root, before any alterations. Longest/most specific first. */
const BASES: [RegExp, Quality][] = [
  [/^(m\(?maj7\)?|mM7|minMaj7|-maj7)/, 'minMaj7'],
  [/^(m7b5|min7b5|-7b5|ø7?)/, 'm7b5'],
  [/^(dim7|°7|o7)/, 'dim7'],
  [/^(dim|°)/, 'dim'],
  [/^(maj13|Maj13|maj9|Maj9|M9|Δ9)/, 'maj9'],
  [/^(maj7|Maj7|M7|Δ7?|maj|Maj)/, 'maj7'],
  [/^(m6|min6|-6)/, 'min6'],
  [/^(m9|min9|-9|m11|m13)/, 'min9'],
  [/^(m7|min7|-7)/, 'min7'],
  [/^(m|min|-)/, 'minor'],
  [/^(sus4?|7sus4?)/, 'sus'],
  [/^(aug7?|\+7?)/, 'aug'],
  [/^13/, 'dom13'],
  [/^9/, 'dom9'],
  [/^69/, 'six'],
  [/^6/, 'six'],
  [/^7/, 'dom7'],
  [/^$/, 'major'],
];

const ROLE_OF = (degree: string): ToneRole => {
  const n = Number(degree.replace(/[#b]/g, ''));
  if (n === 1) return 'root';
  if (n === 3) return 'third';
  if (n === 5) return 'fifth';
  if (n === 7) return 'seventh';
  if (n === 6) return 'sixth';
  return 'extension';
};

/** Spells a degree such as 'b3', '9', '#11' above a root (compound degrees reduce to their simple form). */
export function spellTone(root: Spelling, degree: string): Spelling {
  const m = /^(b{1,2}|#{1,2})?(\d+)$/.exec(degree)!;
  const simple = ((Number(m[2]) - 1) % 7) + 1;
  return spellDegree(root, `${m[1] ?? ''}${simple}`);
}

const normalise = (s: string) => s.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/[()\s]/g, '');

/** Parses the first chord in a symbol. 'D (F#m)' (two alternatives) reads as D. Returns null if it isn't a chord. */
export function parseChord(name: string): Chord | null {
  const first = name.replace(/\s*\(.*$/, (m) => (/^\s+\(/.test(m) ? '' : m)); // 'D (F#m)' -> 'D'; 'B7(♭9)' keeps its alteration
  const text = normalise(first);
  const m = /^([A-G])(#{1,2}|b{1,2})?([^/]*)(?:\/([A-G])(#{1,2}|b{1,2})?)?$/.exec(text);
  if (!m) return null;
  const root = parseSpelling(`${m[1]}${m[2] ?? ''}`);
  const bass = m[4] ? parseSpelling(`${m[4]}${m[5] ?? ''}`) : undefined;
  let rest = m[3];

  let quality: Quality | undefined;
  for (const [re, q] of BASES) {
    const hit = re.exec(rest);
    if (hit) {
      quality = q;
      rest = rest.slice(hit[0].length);
      break;
    }
  }
  if (!quality) return null;

  let degrees = [...DEGREES[quality]];
  // A bare 7 / 9 / 13 left after a quality like 'sus' or 'aug' (e.g. 'aug7'): already covered.
  const alt = [...rest.matchAll(/(#|b)(5|9|11|13)|add(9|11|13)/g)];
  rest = rest.replace(/(#|b)(5|9|11|13)|add(9|11|13)/g, '');
  if (/^(7|9|13)?$/.test(rest) === false && !/^(7|9|13)?$/.test(rest.replace(/^7/, ''))) return null; // unknown leftovers
  for (const [, acc, num, add] of alt) {
    if (add) degrees.push(add);
    else if (num === '5') degrees = degrees.map((d) => (/^[b#]?5$/.test(d) ? `${acc}5` : d));
    else {
      degrees = degrees.filter((d) => d !== num);
      degrees.push(`${acc}${num}`);
    }
  }
  if (quality === 'dom7' && alt.some(([, , num]) => num === '5' || num === '9' || num === '13') && alt.length >= 2) quality = 'dom7alt';

  const order = (d: string) => {
    const n = Number(d.replace(/[#b]/g, ''));
    return n > 7 ? n - 7 + 0.5 : n; // extensions after the seventh, in order
  };
  degrees.sort((a, b) => Number(a.replace(/[#b]/g, '')) - Number(b.replace(/[#b]/g, '')) || order(a) - order(b));

  return {
    name,
    root,
    bass,
    quality,
    tones: degrees.map((degree) => ({ degree, spelling: spellTone(root, degree), role: ROLE_OF(degree) })),
  };
}

/** The 3rd and the 7th (or the 6th on a 6 chord): the notes that define the chord. */
export const guideTones = (chord: Chord): ChordTone[] =>
  chord.tones.filter((t) => t.role === 'third' || t.role === 'seventh' || (t.role === 'sixth' && !chord.tones.some((x) => x.role === 'seventh')));

/** 'b3' -> '♭3' */
export const degreeLabel = (d: string) => d.replace(/b/g, '♭').replace(/#/g, '♯');

/** Pitch classes of the chord tones, to tell chord tones from passing notes. */
export const chordPcs = (chord: Chord): Set<number> => new Set(chord.tones.map((t) => pcOf(t.spelling)));

/** Role of a melody pitch class over a chord ('extension' for 9/11/13, undefined if it isn't a chord tone). */
export function roleOf(chord: Chord, pc: number): ToneRole | undefined {
  return chord.tones.find((t) => pcOf(t.spelling) === pc)?.role;
}

/** The note for a chord tone nearest to `near` within [low, high]. */
export function nearestNote(spelling: Spelling, near: number, low: number, high: number): Note {
  const pc = pcOf(spelling);
  let best = -1;
  for (let m = low; m <= high; m++) if (m % 12 === pc && (best < 0 || Math.abs(m - near) < Math.abs(best - near))) best = m;
  if (best < 0) best = Math.max(low, Math.min(high, near));
  return atMidi(spelling, best);
}

/** One guide tone per chord, always moving to the nearest 3rd or 7th of the next chord. */
export function guideLine(chords: Chord[], start = 70, low = 60, high = 84): Note[] {
  const line: Note[] = [];
  let near = start;
  for (const chord of chords) {
    const candidates = guideTones(chord).map((t) => nearestNote(t.spelling, near, low, high));
    if (!candidates.length) continue;
    const pick = candidates.reduce((a, b) => (Math.abs(b.midi - near) < Math.abs(a.midi - near) ? b : a));
    line.push(pick);
    near = pick.midi;
  }
  return line;
}

export type GuideMove = { from: ChordTone; to: ChordTone; semitones: number; direction: 'up' | 'down' | 'same' };

/** For each guide tone of `from`, the nearest guide tone of `to`, e.g. Am7 -> D7: C stays, G falls to F♯. */
export function guideMoves(from: Chord, to: Chord): GuideMove[] {
  return guideTones(from).map((a) => {
    let best: GuideMove | null = null;
    for (const b of guideTones(to)) {
      const up = (((pcOf(b.spelling) - pcOf(a.spelling)) % 12) + 12) % 12;
      const signed = up > 6 ? up - 12 : up;
      if (!best || Math.abs(signed) < best.semitones) best = { from: a, to: b, semitones: Math.abs(signed), direction: signed > 0 ? 'up' : signed < 0 ? 'down' : 'same' };
    }
    return best!;
  });
}

/** Scales that fit a chord, best first, as [scale id (src/music/scales.ts), why]. The tonic is the chord root. */
export function scaleFor(chord: Chord): { id: string; why: string }[] {
  switch (chord.quality) {
    case 'maj7': case 'maj9': case 'major': case 'six':
      return [{ id: 'major', why: 'The home scale of a major chord' }, { id: 'lydian', why: 'Its ♯4 never clashes with the chord' }];
    case 'min7': case 'min9':
      return [{ id: 'dorian', why: 'The standard sound over m7, especially as the ii chord' }, { id: 'aeolian', why: 'Darker: natural minor' }];
    case 'minor':
      return [{ id: 'aeolian', why: 'Natural minor' }, { id: 'dorian', why: 'Brighter, with a major 6th' }];
    case 'min6': case 'minMaj7':
      return [{ id: 'melodic-minor', why: 'Its major 6th and 7th match the chord' }];
    case 'm7b5':
      return [{ id: 'locrian', why: 'The ii chord of a minor ii–V–i' }];
    case 'dim7': case 'dim':
      return [{ id: 'dim-whole-half', why: 'Whole–half diminished matches the chord' }];
    case 'dom7alt':
      return [{ id: 'altered', why: 'Every tension (♭9, ♯9, ♭5, ♯5) pulls to the next chord' }, { id: 'dim-half-whole', why: 'Half–whole diminished has the ♭9 and ♯9' }];
    case 'aug':
      return [{ id: 'whole-tone', why: 'The whole-tone scale has the ♯5' }];
    case 'sus':
      return [{ id: 'mixolydian', why: 'Mixolydian without leaning on the 3rd' }];
    default: {
      const tones = chord.tones.map((t) => t.degree);
      if (tones.includes('b9') || tones.includes('#9'))
        return [{ id: 'dim-half-whole', why: 'The ♭9 and ♯9 sit in the half–whole diminished scale' }, { id: 'mixolydian', why: 'The plain dominant sound, tension aside' }];
      if (tones.includes('#11')) return [{ id: 'lydian-dominant', why: 'The ♯11 is built into it' }];
      return [{ id: 'mixolydian', why: 'The dominant scale: major with a ♭7' }, { id: 'bebop-dominant', why: 'Adds a passing note so chord tones land on the beat' }];
    }
  }
}

/** Moves the roots in a chord symbol by an interval: 'Am7/G' by (1, 2) -> 'Bm7/A'. Other text is kept. */
export function transposeChordName(name: string, letterSteps: number, semitones: number): string {
  return name.replace(/(^|[/(\s])([A-G])(#{1,2}|b{1,2}|♯{1,2}|♭{1,2})?/g, (_, lead: string, letter: string, acc?: string) => {
    const a = (acc ?? '').replace(/♯/g, '#').replace(/♭/g, 'b');
    const s = transpose(parseSpelling(`${letter}${a}`), letterSteps, semitones);
    return `${lead}${nameOf(s).replace('♯', '#').replace('♭', 'b')}`;
  });
}

export const LETTER_NAMES = LETTERS;
