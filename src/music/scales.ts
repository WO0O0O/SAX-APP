// Scale library. Degrees are relative to the tonic; spelling comes from shared/theory.ts.
// Song keys are CONCERT unless the text says "written" / "alto chart".

export type Scale = {
  id: string;
  name: string;
  aka?: string;
  group: 'Major & modes' | 'Minor' | 'Pentatonic & blues' | 'Jazz & bebop' | 'Symmetric';
  degrees: string[];
  sound: string;
  use: string;
  songs: string[];
};

export const SCALES: Scale[] = [
  {
    id: 'major', name: 'Major', aka: 'Ionian', group: 'Major & modes',
    degrees: ['1', '2', '3', '4', '5', '6', '7'],
    sound: 'Bright, settled, "home". The reference every other scale is measured against.',
    use: 'Major-key melodies and the I chord (maj7, 6). Learn it in all 12 keys first: the circle of fifths is built on it.',
    songs: ['Autumn Leaves: the Gmaj7 / Cmaj7 bars of your alto chart sit in written G major', 'Fly Me to the Moon', 'Most nursery tunes and Happy Birthday'],
  },
  {
    id: 'dorian', name: 'Dorian', group: 'Major & modes',
    degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'],
    sound: 'Minor with a raised 6th: dark but not sad. Cool and open.',
    use: 'm7 chords, especially the ii chord of a ii–V–I. The go-to jazz minor sound.',
    songs: ['So What (Miles Davis): concert D Dorian = written B Dorian on alto', 'Impressions (John Coltrane): same form as So What', 'Oye Como Va (Santana): concert A Dorian'],
  },
  {
    id: 'phrygian', name: 'Phrygian', group: 'Major & modes',
    degrees: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
    sound: 'Minor with a flat 2nd: Spanish, flamenco, tense.',
    use: 'sus(♭9) chords and Spanish-tinged modal jazz. Rare over standard changes.',
    songs: ['Flamenco music throughout', 'Miles Davis & Gil Evans, Sketches of Spain (the Spanish colour)'],
  },
  {
    id: 'lydian', name: 'Lydian', group: 'Major & modes',
    degrees: ['1', '2', '3', '#4', '5', '6', '7'],
    sound: 'Major with a raised 4th: bright, floating, dreamy.',
    use: 'maj7(♯11) chords. Many players prefer it to plain major over maj7 chords because the ♯4 never clashes.',
    songs: ['The Simpsons theme', 'Film scores whenever something flies or sparkles'],
  },
  {
    id: 'mixolydian', name: 'Mixolydian', group: 'Major & modes',
    degrees: ['1', '2', '3', '4', '5', '6', 'b7'],
    sound: 'Major with a flat 7th: bluesy, unfinished, wants to move.',
    use: 'Dominant 7 chords (the V of a ii–V–I) and blues or rock riffs.',
    songs: ['The D7 bars of your Autumn Leaves alto chart (D Mixolydian, written)', 'Norwegian Wood (The Beatles)', 'Every dominant 7 chord in a 12-bar blues'],
  },
  {
    id: 'aeolian', name: 'Natural minor', aka: 'Aeolian', group: 'Minor',
    degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
    sound: 'The plain minor scale: sad, dark, serious.',
    use: 'Minor-key melodies. Same notes as the major scale a minor 3rd up (E minor = G major).',
    songs: ['Smooth Operator: your alto chart is in written D minor', 'Autumn Leaves: the Em bars of your alto chart'],
  },
  {
    id: 'locrian', name: 'Locrian', group: 'Major & modes',
    degrees: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
    sound: 'The darkest mode: unstable, no real home.',
    use: 'Half-diminished chords (m7♭5), the ii of a minor ii–V–i.',
    songs: ['The F♯ø7 bars of your Autumn Leaves alto chart (F♯ Locrian, written)'],
  },
  {
    id: 'harmonic-minor', name: 'Harmonic minor', group: 'Minor',
    degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'],
    sound: 'Minor with a raised 7th: dramatic, exotic, a Middle-Eastern edge from the gap between ♭6 and 7.',
    use: 'The V7 chord in a minor key: play the harmonic minor of the chord you are resolving to.',
    songs: ['Autumn Leaves: the D♯ over B7 in your alto chart comes from E harmonic minor', 'Hava Nagila (its 5th mode, "Phrygian dominant")'],
  },
  {
    id: 'melodic-minor', name: 'Melodic minor', aka: 'Jazz minor', group: 'Minor',
    degrees: ['1', '2', 'b3', '4', '5', '6', '7'],
    sound: 'Minor with a major 6th and 7th: smooth, sophisticated, slightly mysterious.',
    use: 'Minor tonic chords (m6, m(maj7)). Its modes give two essential jazz sounds: Lydian dominant and the altered scale.',
    songs: ['Over the minor i chord in tunes like Blue Bossa and Autumn Leaves'],
  },
  {
    id: 'major-pentatonic', name: 'Major pentatonic', group: 'Pentatonic & blues',
    degrees: ['1', '2', '3', '5', '6'],
    sound: 'Five notes, no half steps: open and sweet. Very hard to sound wrong.',
    use: 'Major chords, and the melodies of country, gospel, soul and pop.',
    songs: ['Amazing Grace', 'My Girl (The Temptations), the guitar riff'],
  },
  {
    id: 'minor-pentatonic', name: 'Minor pentatonic', group: 'Pentatonic & blues',
    degrees: ['1', 'b3', '4', '5', 'b7'],
    sound: 'Five notes: bluesy and soulful. The first improvising scale for most players.',
    use: 'Minor chords, blues, funk and soul. A safe palette for first solos: E minor pentatonic over Autumn Leaves, D minor pentatonic over Smooth Operator (both written).',
    songs: ['Smooth Operator', 'Countless blues, soul and rock solos'],
  },
  {
    id: 'blues', name: 'Blues scale', group: 'Pentatonic & blues',
    degrees: ['1', 'b3', '4', 'b5|#4', '5', 'b7'],
    sound: 'Minor pentatonic plus the ♭5 "blue note": gritty, vocal, the sound of the blues.',
    use: '12-bar blues and minor tunes. Use the ♭5 as a passing note on the way to 4 or 5, not a note to sit on.',
    songs: ['Mr. P.C. (John Coltrane), a minor blues', 'Sonnymoon for Two (Sonny Rollins), a blues', 'The A♭ in your Smooth Operator alto chart is the blue note of D blues'],
  },
  {
    id: 'major-blues', name: 'Major blues', group: 'Pentatonic & blues',
    degrees: ['1', '2', 'b3', '3', '5', '6'],
    sound: 'Major pentatonic with a ♭3 passing note: happy, swinging, down-home.',
    use: 'Major blues and dominant chords. The classic move is sliding ♭3 up to 3.',
    songs: ['Swing and jump-blues solos, from Count Basie to early rock and roll'],
  },
  {
    id: 'bebop-dominant', name: 'Bebop dominant', group: 'Jazz & bebop',
    degrees: ['1', '2', '3', '4', '5', '6', 'b7', '7'],
    sound: 'Mixolydian plus a passing major 7th. Eight notes, so running eighth notes land chord tones on the beat.',
    use: 'Dominant 7 chords in bebop lines. Start on a chord tone on the beat and run down.',
    songs: ['The language of Charlie Parker and Sonny Stitt', "Parker blues heads: Now's the Time, Billie's Bounce"],
  },
  {
    id: 'bebop-major', name: 'Bebop major', group: 'Jazz & bebop',
    degrees: ['1', '2', '3', '4', '5', '#5', '6', '7'],
    sound: 'Major plus a passing ♯5: the same land-on-the-beat trick for major chords.',
    use: 'maj7 and 6 chords in bebop lines.',
    songs: ['Barry Harris’s teaching on the major 6th sound'],
  },
  {
    id: 'lydian-dominant', name: 'Lydian dominant', group: 'Jazz & bebop',
    degrees: ['1', '2', '3', '#4', '5', '6', 'b7'],
    sound: 'Mixolydian with a ♯4: a bright, open dominant.',
    use: '7(♯11) chords, and dominant chords that do not resolve down a fifth. 4th mode of melodic minor.',
    songs: ["Take the 'A' Train: the D7(♯11) in bar 3 (concert)"],
  },
  {
    id: 'altered', name: 'Altered', aka: 'Super Locrian', group: 'Jazz & bebop',
    degrees: ['1', 'b2', '#2', '3', 'b5', '#5', 'b7'],
    sound: 'Every tension at once (♭9, ♯9, ♭5, ♯5). Maximum pull back to the I chord.',
    use: 'V7alt chords just before they resolve. 7th mode of melodic minor: the melodic minor a half step above the root.',
    songs: ['The last V7 of a ii–V–I in modern jazz'],
  },
  {
    id: 'whole-tone', name: 'Whole tone', group: 'Symmetric',
    degrees: ['1', '2', '3', '#4', '#5', 'b7'],
    sound: 'Six whole steps: floating and dreamlike, with no home note.',
    use: 'Augmented dominant chords (7♯5). Only two whole-tone scales exist.',
    songs: ['Debussy, Voiles (the Clair de Lune composer: try it on piano)', "Thelonious Monk's whole-tone runs"],
  },
  {
    id: 'dim-half-whole', name: 'Diminished (half–whole)', group: 'Symmetric',
    degrees: ['1', 'b2', '#2', '3', '#4', '5', '6', 'b7'],
    sound: 'Alternating half and whole steps: tense, angular, modern.',
    use: 'Dominant 7♭9 chords. It repeats every minor 3rd, so only three exist.',
    songs: ['The B7(♭9) bars of your Autumn Leaves alto chart'],
  },
  {
    id: 'dim-whole-half', name: 'Diminished (whole–half)', group: 'Symmetric',
    degrees: ['1', '2', 'b3', '4', 'b5', '#5', '6', '7'],
    sound: 'Alternating whole and half steps: the "diminished chord" sound.',
    use: 'Diminished 7 chords, often used as passing chords between two chords a whole step apart.',
    songs: ['Passing dim7 chords in standards and ballads'],
  },
  {
    id: 'chromatic', name: 'Chromatic', group: 'Symmetric',
    degrees: ['1', '#1', '2', '#2', '3', '4', '#4', '5', '#5', '6', '#6', '7'],
    sound: 'All twelve notes. Not a sound to improvise in, but the best fingering workout there is.',
    use: 'Fingering drills across the whole horn, and chromatic approach notes into chord tones.',
    songs: [],
  },
];

export const GROUPS = ['Major & modes', 'Minor', 'Pentatonic & blues', 'Jazz & bebop', 'Symmetric'] as const;

/** Circle of fifths positions (written keys). The second name is the optional enharmonic spelling. */
export const CIRCLE: [string, string?][] = [
  ['C'], ['G'], ['D'], ['A'], ['E'], ['B'], ['F#', 'Gb'], ['Db', 'C#'], ['Ab', 'G#'], ['Eb', 'D#'], ['Bb', 'A#'], ['F'],
];
