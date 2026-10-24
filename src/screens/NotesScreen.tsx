import { useEffect } from 'react';
import { ALTO_RANGE, atMidi, nameOf, parseSpelling } from '../../shared/theory.ts';
import { FingeringCard } from '../fingering/FingeringCard.tsx';
import { openPdf } from '../api.ts';

// Every written note on the alto, low Bb to high F#, grouped the way the horn works.
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_ALT: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
// Flats read more naturally for these on sax charts.
const PREFER_FLAT = new Set(['A#', 'D#']);

function noteFor(midi: number) {
  const sharp = SHARP[midi % 12];
  const flat = FLAT_ALT[sharp];
  const main = flat && PREFER_FLAT.has(sharp) ? flat : sharp;
  const other = flat ? (main === flat ? sharp : flat) : undefined;
  return { note: atMidi(parseSpelling(main), midi), alt: other ? nameOf(parseSpelling(other)) : undefined };
}

const SECTIONS = [
  { title: 'Low register · no octave key', from: ALTO_RANGE.low, to: 73 },
  { title: 'Octave key · left thumb', from: 74, to: 85 },
  { title: 'Palm keys and the top', from: 86, to: ALTO_RANGE.high },
];

export function NotesScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  useEffect(() => onSceneDim(0.5), [onSceneDim]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8">
      <header className="panel p-6">
        <h1 className="font-display text-4xl">Every note on the horn</h1>
        <p className="mt-1 text-smoke-dim">
          Written pitch, low B♭ to high F♯. Notes with more than one fingering show the alternates. Source:{' '}
          <button type="button" className="text-brass hover:underline" onClick={() => openPdf('FingeringChart.pdf')}>
            TamingTheSaxophone.com chart (PDF)
          </button>
          .
        </p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h2 className="caps mb-3 text-smoke-dim">{s.title}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {Array.from({ length: s.to - s.from + 1 }, (_, i) => {
              const { note, alt } = noteFor(s.from + i);
              return <FingeringCard key={note.midi} note={note} altName={alt} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
