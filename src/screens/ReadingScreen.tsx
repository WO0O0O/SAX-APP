import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nameOf, noteName, parseSpelling } from '../../shared/theory.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { getNotes, getReadingStats, logLookup, logReading } from '../api.ts';
import { previewNote } from '../audio/engine.ts';
import { getSettings } from '../audio/settings.ts';
import { Score } from '../notation/Score.tsx';
import { FingeringDiagram } from '../fingering/FingeringDiagram.tsx';
import { FINGERINGS, describe } from '../fingering/fingerings.ts';
import { scaleSpellings } from '../music/build.ts';
import type { Chart } from '../music/chart.ts';
import { generateExercise } from '../music/exercise.ts';
import { keySigFor } from '../music/keys.ts';
import { ScalePicker } from '../music/ScalePicker.tsx';
import { usePicker } from '../music/usePicker.ts';
import { PlaybackBar } from '../tunes/PlaybackBar.tsx';
import { useTunePlayback } from '../tunes/useTunePlayback.ts';
import { ListenTracker } from '../tuner/listen.ts';
import { loadTunerPrefs } from '../tuner/prefs.ts';
import { useTuner, type TunerFrame } from '../tuner/useTuner.ts';
import { NoteText } from '../ui/NoteText.tsx';
import '../notation/score.css';

type Mode = 'check' | 'fumble';
type Mark = 'lookup' | 'fumbled' | 'clean';
const COLORS: Record<Mark, string> = { lookup: '#9a5410', fumbled: '#8f1d22', clean: '#2f7a4f' };

const newSeed = () => Math.floor(Math.random() * 1e9);

export default function ReadingScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const picker = usePicker();
  const { tonic, scale } = picker;
  const [seed, setSeed] = useState(newSeed);
  const [bars, setBars] = useState(4);
  const [mode, setMode] = useState<Mode>('check');
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [selected, setSelected] = useState<number | undefined>();
  const [useKeySig, setUseKeySig] = useState(true);
  const [listen, setListen] = useState(false);
  const [listenPos, setListenPos] = useState(0);
  const [logged, setLogged] = useState(false);
  const [weights, setWeights] = useState<Record<number, number> | null>(null);

  useEffect(() => onSceneDim(0.55), [onSceneDim]);

  // Notes you fumble or look up come up more often (Mac only; online every note is even).
  useEffect(() => {
    Promise.all([getReadingStats(), getNotes()]).then(([reading, notes]) => {
      const w: Record<number, number> = {};
      for (const n of notes) w[n.midi] = 1 + Math.min(n.lookups, 10) * 0.25;
      for (const r of reading) {
        const rate = r.attempts >= 2 ? r.fumbled / r.attempts : 0;
        w[r.midi] = (w[r.midi] ?? 1) + rate * 3;
      }
      setWeights(w);
    });
  }, []);

  const spellings = useMemo(() => scaleSpellings(tonic, scale.degrees), [tonic, scale]);
  const keySig = useMemo(() => keySigFor(spellings), [spellings]);

  const exercise = useMemo(
    () =>
      weights === null
        ? []
        : generateExercise({ spellings, low: STUDENT_RANGE.low, high: STUDENT_RANGE.high, bars, seed, weight: Object.keys(weights).length ? (m) => weights[m] ?? 1 : undefined }),
    [spellings, bars, seed, weights],
  );
  const notes = useMemo(() => exercise.flat().map((it) => it.note!), [exercise]);

  // Hear the exercise (after you've tried it), or follow it silently with its fingerings.
  const asChart = useMemo<Chart>(
    () => ({ title: `reading-${seed}`, arranger: '', writtenKey: '', concertKey: '', keySig: keySig ?? 'C', tempo: 80, bars: exercise, chords: exercise.map(() => []) }),
    [exercise, seed, keySig],
  );
  const pb = useTunePlayback(asChart);

  // A fresh exercise resets the marks.
  useEffect(() => {
    setMarks({});
    setSelected(undefined);
    setListenPos(0);
    setLogged(false);
  }, [exercise]);

  /** Saves how each note went (Mac), then moves on to a new exercise. */
  const finish = useCallback(
    (marksNow: Record<number, Mark>) => {
      if (logged || !notes.length) return;
      setLogged(true);
      logReading(notes.map((n, i) => ({ midi: n.midi, outcome: marksNow[i] === 'fumbled' ? 'fumbled' : marksNow[i] === 'lookup' ? 'lookup' : 'clean' })));
    },
    [logged, notes],
  );

  // ---- Listen mode
  const tracker = useRef<ListenTracker | null>(null);
  const marksRef = useRef(marks);
  marksRef.current = marks;
  useEffect(() => {
    tracker.current = new ListenTracker(notes.map((n) => n.midi));
  }, [notes, listen]);
  const prefs = useMemo(loadTunerPrefs, []);
  const onFrame = useCallback(
    (f: TunerFrame) => {
      const t = tracker.current;
      if (!t || t.done) return;
      for (const e of t.update(f.t, f.reading)) {
        if (e.type === 'wrong') setMarks((m) => (m[e.index] === 'lookup' ? m : { ...m, [e.index]: 'fumbled' }));
        else {
          setMarks((m) => (m[e.index] ? m : { ...m, [e.index]: 'clean' }));
          setListenPos(e.index + 1);
        }
      }
      if (t.done) finish({ ...marksRef.current });
    },
    [finish],
  );
  const tuner = useTuner({ a4: prefs.a4, gate: prefs.gate, onFrame });
  useEffect(() => {
    if (listen && !tuner.active) void tuner.start();
    if (!listen && tuner.active) tuner.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen]);

  const colors = useMemo(() => Object.fromEntries(Object.entries(marks).map(([i, m]) => [i, COLORS[m]])), [marks]);

  const onTap = useCallback(
    (i: number) => {
      if (getSettings().tapSounds && !pb.playing) previewNote(notes[i].midi);
      if (mode === 'check') {
        setSelected(i);
        setMarks((m) => {
          if (m[i] === 'lookup') return m;
          logLookup(notes[i].midi);
          return { ...m, [i]: 'lookup' };
        });
      } else {
        setMarks((m) => {
          const next = { ...m };
          if (next[i] === 'fumbled') delete next[i];
          else next[i] = 'fumbled';
          return next;
        });
      }
    },
    [mode, notes, pb.playing],
  );

  const next = () => setSeed(newSeed());
  const playedIt = () => {
    finish(marks);
    next();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'n' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const values = Object.values(marks);
  const lookups = values.filter((m) => m === 'lookup').length;
  const fumbled = values.filter((m) => m === 'fumbled').length;
  const followIndex = pb.playing && pb.cursor !== undefined ? pb.cursor : undefined;
  const shownIndex = followIndex ?? selected;
  const note = shownIndex !== undefined ? notes[shownIndex] : undefined;
  const fingering = note ? FINGERINGS[note.midi]?.[0] : undefined;
  const done = listen && listenPos >= notes.length && notes.length > 0;

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
                    className={`rounded-full px-3 py-1.5 font-semibold ${mode === m ? (m === 'check' ? 'bg-lookup text-paper' : 'bg-wine text-paper') : 'text-paper-ink/70 hover:bg-paper-ink/5'}`}
                  >
                    {m === 'check' ? 'Check fingering' : 'Mark fumbled'}
                  </button>
                ))}
              </div>
              <select value={bars} onChange={(e) => setBars(Number(e.target.value))} aria-label="Bars" className="rounded-full border border-paper-ink/20 bg-transparent px-3 py-1.5 text-sm font-semibold">
                {[4, 8, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} bars
                  </option>
                ))}
              </select>
              <button type="button" onClick={next} className="rounded-full bg-paper-ink px-4 py-1.5 text-sm font-semibold text-paper hover:bg-walnut">
                New exercise <kbd className="ml-1 opacity-60">N</kbd>
              </button>
            </div>
          </header>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <label className="flex items-center gap-1.5" title="Your microphone hears each note: the exercise moves on when you play the right one, and marks fumbles itself">
              <input type="checkbox" checked={listen} onChange={(e) => setListen(e.target.checked)} className="size-4 accent-lookup" />
              Listen
            </label>
            {keySig && (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={useKeySig} onChange={(e) => setUseKeySig(e.target.checked)} className="size-4 accent-lookup" />
                Key signature
              </label>
            )}
            {listen && tuner.error && <span className="text-wine">{tuner.error}</span>}
            {listen && tuner.active && !done && <span className="text-paper-ink/65">Listening. Play the note under the marker.</span>}
            {done && <span className="font-semibold text-[#2f7a4f]">Done. Saved. Press N for the next one.</span>}
          </div>

          <PlaybackBar pb={pb} canPlayFrom={false} onPlayFrom={() => {}} />
          <div className="mt-3 min-h-[200px]">
            {exercise.length > 0 && (
            <Score
              bars={exercise}
              barsPerLine={2}
              timeSig="4/4"
              keySig={useKeySig ? keySig : undefined}
              colors={colors}
              selected={selected}
              onTap={onTap}
              cursor={pb.playing ? pb.cursor : listen && !done ? listenPos : undefined}
            />
            )}
          </div>

          <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-paper-ink/80">
            <span>
              <strong className="text-lookup">{lookups}</strong> {lookups === 1 ? 'lookup' : 'lookups'}
            </span>
            <span>
              <strong className="text-wine">{fumbled}</strong> fumbled
            </span>
            {!listen && (
              <button type="button" onClick={playedIt} className="rounded-full border border-paper-ink/25 px-3 py-1 font-semibold hover:bg-paper-ink/5" title="Saves this one (unmarked notes count as played cleanly) and moves on">
                Played it: save
              </button>
            )}
            <span className="text-paper-ink/55">
              {mode === 'check' ? 'Play it first. Tap a note only if you need its fingering.' : 'Tap the notes you fumbled.'} Stays within {STUDENT_RANGE.lowName}–{STUDENT_RANGE.highName}.
            </span>
          </footer>
        </article>

        <aside className="panel flex flex-col items-center p-5 text-center">
          {note && fingering ? (
            <>
              <p className="caps-xs text-smoke-dim">Fingering</p>
              <p className="mt-1 font-display text-4xl">
                <NoteText text={noteName(note)} />
              </p>
              <div className="my-3 w-full max-w-[170px]">
                <FingeringDiagram pressed={fingering.keys} />
              </div>
              <ul className="space-y-0.5 text-sm">
                {describe(fingering.keys).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {!pb.playing && (
                <button type="button" className="mt-3 text-sm text-brass hover:underline" onClick={() => setSelected(undefined)}>
                  Hide again
                </button>
              )}
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
