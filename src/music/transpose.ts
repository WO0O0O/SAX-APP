import { transposeChordName } from '../../shared/chords.ts';
import { atMidi, nameOf, parseSpelling, pcOf, transpose } from '../../shared/theory.ts';
import type { Chart } from './chart.ts';

// Moves a whole chart to another key: notes keep their spelling relative to the key, chord symbols move with them.

/** One conventional major key per pitch class, as used for key signatures. */
const KEY_BY_PC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Key signatures (of the chart's key family) reachable by moving up to a tritone either way, nearest first. */
export function keyChoices(keySig: string): { semis: number; keySig: string }[] {
  const src = parseSpelling(keySig);
  return Array.from({ length: 12 }, (_, i) => i - 6).map((semis) => ({
    semis,
    keySig: semis === 0 ? keySig : KEY_BY_PC[(((pcOf(src) + semis) % 12) + 12) % 12],
  }));
}

export function transposeChart(chart: Chart, semis: number): Chart {
  if (semis === 0) return chart;
  const src = parseSpelling(chart.keySig);
  const target = parseSpelling(KEY_BY_PC[(((pcOf(src) + semis) % 12) + 12) % 12]);
  const letterSteps = (((target.letter - src.letter) % 7) + 7) % 7;
  return {
    ...chart,
    keySig: nameOf(target).replace('♯', '#').replace('♭', 'b'),
    bars: chart.bars.map((bar) =>
      bar.map((it) => (it.note ? { ...it, note: atMidi(transpose(it.note, letterSteps, semis), it.note.midi + semis) } : it)),
    ),
    chords: chart.chords.map((bar) => bar.map((c) => ({ ...c, name: transposeChordName(c.name, letterSteps, semis) }))),
  };
}
