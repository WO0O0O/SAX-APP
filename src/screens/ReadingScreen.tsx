import { useCallback, useEffect, useState } from 'react';
import { Staff, type NoteMark, type ScoreNote } from '../notation/Staff.tsx';
import { FingeringDiagram } from '../fingering/FingeringDiagram.tsx';
import { FINGERINGS, describe } from '../fingering/fingerings.ts';
import { Button } from '../ui/controls.tsx';
import './reading.css';

// Design prototype: a fixed R1 exercise (G, A, B). Phase 1b replaces it with the seeded generator.
const EXERCISE: ScoreNote[][] = [
  [{ pitch: 'G4', duration: 'q' }, { pitch: 'A4', duration: 'q' }, { pitch: 'B4', duration: 'h' }],
  [{ pitch: 'A4', duration: '8' }, { pitch: 'B4', duration: '8' }, { pitch: 'A4', duration: 'q' }, { pitch: 'G4', duration: 'q' }, { pitch: 'A4', duration: 'q' }],
  [{ pitch: 'B4', duration: 'q' }, { pitch: 'A4', duration: '8' }, { pitch: 'G4', duration: '8' }, { pitch: 'A4', duration: 'h' }],
  [{ pitch: 'G4', duration: 'w' }],
];
const ALL_NOTES = EXERCISE.flat();

type Mode = 'check' | 'fumble';

export default function ReadingScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const [mode, setMode] = useState<Mode>('check');
  const [marks, setMarks] = useState<NoteMark[]>([]);
  const [selected, setSelected] = useState<number | undefined>();
  const [lookups, setLookups] = useState(0);

  useEffect(() => onSceneDim(0.8), [onSceneDim]);

  const onTap = useCallback(
    (i: number) => {
      if (mode === 'check') {
        setSelected(i);
        setLookups((n) => n + 1);
        setMarks((m) => Object.assign([...m], { [i]: m[i] === 'fumbled' ? 'fumbled' : 'lookup' }));
      } else {
        setMarks((m) => Object.assign([...m], { [i]: m[i] === 'fumbled' ? undefined : 'fumbled' }));
      }
    },
    [mode],
  );

  const pitch = selected !== undefined ? ALL_NOTES[selected].pitch : undefined;
  const fumbled = marks.filter((m) => m === 'fumbled').length;

  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-6 lg:grid-cols-[1fr_320px]">
      <article className="chart-card self-start rounded-xl bg-paper px-10 pt-8 pb-8 text-paper-ink">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="caps text-lookup">Reading · R1 · left hand only</p>
            <h1 className="mt-1 font-display text-5xl">G, A and B</h1>
            <p className="mt-2 text-lg text-paper-ink/70">♩ = 60 · 4 bars · C major · written pitch</p>
          </div>
          <div className="flex rounded-full border-2 border-paper-ink/20 p-1" role="radiogroup" aria-label="Tap mode">
            {(['check', 'fumble'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-12 rounded-full px-5 font-semibold transition-colors ${
                  mode === m ? (m === 'check' ? 'bg-lookup text-paper' : 'bg-wine text-paper') : 'text-paper-ink/70 hover:bg-paper-ink/5'
                }`}
              >
                {m === 'check' ? 'Check fingering' : 'Mark fumbled'}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-6">
          <Staff bars={EXERCISE} marks={marks} selected={selected} onTap={onTap} />
        </div>

        <footer className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-lg text-paper-ink/80">
          <span>
            <strong className="text-lookup">{lookups}</strong> {lookups === 1 ? 'lookup' : 'lookups'}
          </span>
          <span>
            <strong className="text-wine">{fumbled}</strong> fumbled
          </span>
          <span className="text-paper-ink/60">
            {mode === 'check' ? 'Play it first. Tap a note only if you need its fingering.' : 'Tap the notes you fumbled on that take.'}
          </span>
        </footer>
      </article>

      <aside className="panel flex flex-col items-center self-start p-6">
        {pitch ? (
          <>
            <p className="caps text-smoke-dim">Fingering · written</p>
            <p className="mt-1 font-display text-5xl">{pitch}</p>
            <div className="mt-3 w-full max-w-[220px]">
              <FingeringDiagram pressed={FINGERINGS[pitch] ?? []} />
            </div>
            <ul className="mt-3 space-y-1 text-center text-lg">
              {describe(FINGERINGS[pitch] ?? []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Button variant="ghost" className="mt-2" onClick={() => setSelected(undefined)}>
              Cover it again
            </Button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="caps text-smoke-dim">Fingering</p>
            <p className="mt-4 font-display text-4xl text-smoke/80">Hidden</p>
            <p className="mt-4 text-smoke-dim">Play from the staff first. Tapping a note shows its keys and counts as a lookup.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
