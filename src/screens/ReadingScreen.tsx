import { useCallback, useEffect, useMemo, useState } from 'react';
import { nameOf, noteName, parseSpelling } from '../../shared/theory.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { Score } from '../notation/Score.tsx';
import { FingeringDiagram } from '../fingering/FingeringDiagram.tsx';
import { FINGERINGS, describe } from '../fingering/fingerings.ts';
import { scaleSpellings } from '../music/build.ts';
import { generateExercise } from '../music/exercise.ts';
import { ScalePicker } from '../music/ScalePicker.tsx';
import { usePicker } from '../music/usePicker.ts';
import { NoteText } from '../ui/NoteText.tsx';
import { logLookup } from '../api.ts';
import '../notation/score.css';

type Mode = 'check' | 'fumble';
const LOOKUP = '#9a5410';
const FUMBLED = '#8f1d22';

const newSeed = () => Math.floor(Math.random() * 1e9);

export default function ReadingScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const picker = usePicker();
  const { tonic, scale } = picker;
  const [seed, setSeed] = useState(newSeed);
  const [bars, setBars] = useState(4);
  const [mode, setMode] = useState<Mode>('check');
  const [marks, setMarks] = useState<Record<number, 'lookup' | 'fumbled'>>({});
  const [selected, setSelected] = useState<number | undefined>();

  useEffect(() => onSceneDim(0.55), [onSceneDim]);

  const exercise = useMemo(
    () => generateExercise({ spellings: scaleSpellings(tonic, scale.degrees), low: STUDENT_RANGE.low, high: STUDENT_RANGE.high, bars, seed }),
    [tonic, scale, bars, seed],
  );
  const notes = useMemo(() => exercise.flat().map((it) => it.note!), [exercise]);

  // A fresh exercise resets the marks.
  useEffect(() => {
    setMarks({});
    setSelected(undefined);
  }, [exercise]);

  const colors = useMemo(
    () => Object.fromEntries(Object.entries(marks).map(([i, m]) => [i, m === 'lookup' ? LOOKUP : FUMBLED])),
    [marks],
  );

  const onTap = useCallback(
    (i: number) => {
      if (mode === 'check') {
        setSelected(i);
        if (!marks[i]) {
          setMarks((m) => ({ ...m, [i]: 'lookup' }));
          logLookup(notes[i].midi);
        }
      } else {
        setMarks((m) => {
          const next = { ...m };
          if (next[i] === 'fumbled') delete next[i];
          else next[i] = 'fumbled';
          return next;
        });
      }
    },
    [mode, marks, notes],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'n' && !(e.target instanceof HTMLInputElement)) setSeed(newSeed());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const lookups = Object.values(marks).filter((m) => m === 'lookup').length;
  const fumbled = Object.values(marks).filter((m) => m === 'fumbled').length;
  const note = selected !== undefined ? notes[selected] : undefined;
  const fingering = note ? FINGERINGS[note.midi]?.[0] : undefined;

  return (
    <div className="mx-auto grid w-full max-w-[1400px] items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[14px]">
        <ScalePicker picker={picker} />
      </aside>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <article className="paper px-6 pt-5 pb-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="caps text-lookup">Sight-reading</p>
              <h1 className="font-display text-3xl">
                <NoteText text={nameOf(parseSpelling(tonic))} /> {scale.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-paper-ink/20 p-0.5 text-sm" role="radiogroup" aria-label="Tap mode">
                {(['check', 'fumble'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-full px-3 py-1.5 font-semibold ${
                      mode === m ? (m === 'check' ? 'bg-lookup text-paper' : 'bg-wine text-paper') : 'text-paper-ink/70 hover:bg-paper-ink/5'
                    }`}
                  >
                    {m === 'check' ? 'Check fingering' : 'Mark fumbled'}
                  </button>
                ))}
              </div>
              <select
                value={bars}
                onChange={(e) => setBars(Number(e.target.value))}
                aria-label="Bars"
                className="rounded-full border border-paper-ink/20 bg-transparent px-3 py-1.5 text-sm font-semibold"
              >
                {[4, 8, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} bars
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setSeed(newSeed())} className="rounded-full bg-paper-ink px-4 py-1.5 text-sm font-semibold text-paper hover:bg-walnut">
                New exercise <kbd className="ml-1 opacity-60">N</kbd>
              </button>
            </div>
          </header>

          <div className="mt-3">
            <Score bars={exercise} barsPerLine={2} timeSig="4/4" colors={colors} selected={selected} onTap={onTap} />
          </div>

          <footer className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-paper-ink/80">
            <span>
              <strong className="text-lookup">{lookups}</strong> {lookups === 1 ? 'lookup' : 'lookups'}
            </span>
            <span>
              <strong className="text-wine">{fumbled}</strong> fumbled
            </span>
            <span className="text-paper-ink/55">
              {mode === 'check' ? 'Play it first. Tap a note only if you need its fingering.' : 'Tap the notes you fumbled.'} Stays within{' '}
              {STUDENT_RANGE.lowName}–{STUDENT_RANGE.highName}.
            </span>
          </footer>
        </article>

        <aside className="panel flex flex-col items-center p-5 text-center">
          {note && fingering ? (
            <>
              <p className="caps-xs text-smoke-dim">Fingering</p>
              <p className="mt-1 font-display text-4xl"><NoteText text={noteName(note)} /></p>
              <div className="my-3 w-full max-w-[170px]">
                <FingeringDiagram pressed={fingering.keys} />
              </div>
              <ul className="space-y-0.5 text-sm">
                {describe(fingering.keys).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <button type="button" className="mt-3 text-sm text-brass hover:underline" onClick={() => setSelected(undefined)}>
                Hide again
              </button>
            </>
          ) : (
            <div className="py-10">
              <p className="caps-xs text-smoke-dim">Fingering</p>
              <p className="mt-3 font-display text-3xl text-smoke/80">Hidden</p>
              <p className="mt-3 text-sm text-smoke-dim">Play from the staff first. Tapping a note shows its keys and counts as a lookup.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
