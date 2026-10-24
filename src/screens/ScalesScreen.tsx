import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nameOf, parseSpelling, writtenToConcert, type Note } from '../../shared/theory.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { Score, type ScoreItem } from '../notation/Score.tsx';
import { FingeringCard } from '../fingering/FingeringCard.tsx';
import { fullRange, oneOctave, scaleSpellings } from '../music/build.ts';
import { ScalePicker } from '../music/ScalePicker.tsx';
import { usePicker } from '../music/usePicker.ts';
import { NoteText } from '../ui/NoteText.tsx';
import { useNarrow } from '../ui/useNarrow.ts';
import '../notation/score.css';

const outsideRange = (n: Note) => n.midi < STUDENT_RANGE.low || n.midi > STUDENT_RANGE.high;
const asWhole = (notes: Note[]): ScoreItem[] => notes.map((note) => ({ note, duration: 'w' }));
const degreeLabel = (d: string) => d.split('|')[0].replace(/b/g, '♭').replace(/#/g, '♯');

/** Splits notes into lines of roughly equal length, at most `max` per line. */
function toLines(notes: Note[], max: number): ScoreItem[][] {
  const lines = Math.ceil(notes.length / max);
  const per = Math.ceil(notes.length / lines);
  const out: ScoreItem[][] = [];
  for (let i = 0; i < notes.length; i += per) out.push(asWhole(notes.slice(i, i + per)));
  return out;
}

export default function ScalesScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const picker = usePicker();
  const { tonic, scale } = picker;
  const [selected, setSelected] = useState<number | null>(null);
  const cards = useRef(new Map<number, HTMLElement>());

  useEffect(() => onSceneDim(0.5), [onSceneDim]);

  const spellings = useMemo(() => scaleSpellings(tonic, scale.degrees), [tonic, scale]);
  const octave = useMemo(() => oneOctave(spellings), [spellings]);
  const full = useMemo(() => fullRange(spellings), [spellings]);
  const narrow = useNarrow();
  const fullBars = useMemo(() => toLines(full, narrow ? 6 : 11), [full, narrow]);
  const octaveBars = useMemo(() => (narrow ? toLines(octave, 5) : [asWhole(octave)]), [octave, narrow]);
  const concert = nameOf(writtenToConcert(parseSpelling(tonic)));

  useEffect(() => setSelected(null), [tonic, scale]);

  const select = useCallback((midi: number) => {
    setSelected(midi);
    cards.current.get(midi)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);
  const tapOctave = useCallback((i: number) => select(octave[i].midi), [octave, select]);
  const tapFull = useCallback((i: number) => select(full[i].midi), [full, select]);

  const octaveSel = octave.findIndex((n) => n.midi === selected);
  const fullSel = full.findIndex((n) => n.midi === selected);

  return (
    <div className="mx-auto grid w-full max-w-[1400px] items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[14px]">
        <ScalePicker picker={picker} />
      </aside>

      <div className="min-w-0 space-y-5">
        <section className="panel p-6">
          <p className="caps text-ember">{scale.group}</p>
          <h1 className="mt-1 font-display text-4xl">
            <NoteText text={nameOf(parseSpelling(tonic))} /> {scale.name}
            {scale.aka && <span className="text-2xl text-smoke-dim"> · {scale.aka}</span>}
          </h1>
          <p className="mt-1 text-smoke-dim">
            Written for alto. Sounds as <span className="text-smoke">{concert} {scale.name.toLowerCase()}</span> in concert pitch.
          </p>
          <ol className="mt-4 flex flex-wrap gap-2">
            {spellings.map((s, i) => (
              <li key={i} className="rounded-lg border border-walnut bg-ink/40 px-2.5 py-1 text-center">
                <span className="block text-xs text-smoke-dim">{degreeLabel(scale.degrees[i])}</span>
                <span className="font-semibold">{nameOf(s)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 grid gap-5 text-[0.95rem] leading-relaxed md:grid-cols-3">
            <div>
              <h2 className="caps-xs mb-1 text-smoke-dim">Sound</h2>
              <p>{scale.sound}</p>
            </div>
            <div>
              <h2 className="caps-xs mb-1 text-smoke-dim">Where it's used</h2>
              <p>{scale.use}</p>
            </div>
            <div>
              <h2 className="caps-xs mb-1 text-smoke-dim">Hear it in</h2>
              {scale.songs.length ? (
                <ul className="list-disc space-y-1 pl-4 marker:text-ember">
                  {scale.songs.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-smoke-dim">A technical scale rather than a tune sound.</p>
              )}
            </div>
          </div>
        </section>

        <section className="paper px-6 pt-5 pb-3">
          <h2 className="caps text-lookup">One octave</h2>
          <Score bars={octaveBars} barsPerLine={1} labels selected={octaveSel} onTap={tapOctave} width={760} />
        </section>

        <section className="paper px-6 pt-5 pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="caps text-lookup">Whole horn · low B♭ to high F♯</h2>
            <p className="text-sm text-paper-ink/60">
              Grey notes are outside your current range ({STUDENT_RANGE.lowName}–{STUDENT_RANGE.highName}). Tap a note for its fingering.
            </p>
          </div>
          <Score bars={fullBars} barsPerLine={1} labels faded={outsideRange} selected={fullSel} onTap={tapFull} />
        </section>

        <section>
          <h2 className="caps mb-3 text-smoke-dim">Fingerings, low to high</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {full.map((n) => (
              <FingeringCard
                key={`${tonic}-${scale.id}-${n.midi}`}
                ref={(el) => {
                  if (el) cards.current.set(n.midi, el);
                  else cards.current.delete(n.midi);
                }}
                note={n}
                selected={n.midi === selected}
                onSelect={() => setSelected(n.midi)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
