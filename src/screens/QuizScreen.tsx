import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fromMidi, parseNote, type Note } from '../../shared/theory.ts';
import { ALTO_RANGE } from '../../shared/theory.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { getNotes, getQuizStats, getTunes, loadChart, logQuiz, slugOf, type Tune } from '../api.ts';
import { FingeringCard } from '../fingering/FingeringCard.tsx';
import { FingeringDiagram } from '../fingering/FingeringDiagram.tsx';
import { FINGERINGS, describe, type KeyId } from '../fingering/fingerings.ts';
import { fullRange, scaleSpellings } from '../music/build.ts';
import { rng } from '../music/exercise.ts';
import { parseChart, type ChartFile } from '../music/chart.ts';
import { checkKeys, namesOf, optionsFor, pickNote, ROUND_LENGTH, type QuizMode, type Stats } from '../music/quiz.ts';
import { usePicker } from '../music/usePicker.ts';
import { Score } from '../notation/Score.tsx';
import { NoteText } from '../ui/NoteText.tsx';
import '../notation/score.css';

type ModeChoice = QuizMode | 'mixed';
type PoolChoice = 'range' | 'horn' | 'scale' | 'tune';
type Question = { midi: number; mode: QuizMode; options: number[]; shown: number };
type Result = { midi: number; correct: boolean };

const STORE = 'sax.quiz.v1';
const MODES: { id: ModeChoice; label: string; hint: string }[] = [
  { id: 'note-keys', label: 'Note → keys', hint: 'See a note, press the keys' },
  { id: 'keys-note', label: 'Keys → note', hint: 'See the keys, name the note' },
  { id: 'mixed', label: 'Mixed', hint: 'Both, alternating' },
];
const POOLS: { id: PoolChoice; label: string }[] = [
  { id: 'range', label: `My range (${STUDENT_RANGE.lowName}–${STUDENT_RANGE.highName})` },
  { id: 'horn', label: 'Whole horn' },
  { id: 'scale', label: 'Current scale' },
  { id: 'tune', label: 'A tune' },
];

const seg = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${on ? 'bg-smoke text-ink' : 'text-smoke-dim hover:text-smoke'}`;
const btn = 'rounded-full border border-smoke/25 px-3.5 py-1.5 text-sm font-semibold text-smoke hover:border-smoke/60';
const btnMain = 'rounded-full bg-ember px-4 py-1.5 text-sm font-semibold text-ink hover:bg-ember/85';

function load(): { mode: ModeChoice; pool: PoolChoice } {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (v && MODES.some((m) => m.id === v.mode) && POOLS.some((p) => p.id === v.pool)) return v;
  } catch {
    // defaults
  }
  return { mode: 'mixed', pool: 'range' };
}

export default function QuizScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  useEffect(() => onSceneDim(0.6), [onSceneDim]);
  const picker = usePicker();
  const [choice, setChoice] = useState(load);
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [tuneId, setTuneId] = useState<number | null>(null);
  const [tuneNotes, setTuneNotes] = useState<Map<number, Note> | 'locked' | null>(null);
  const [saved, setSaved] = useState<Stats>({});
  const [phase, setPhase] = useState<'setup' | 'round' | 'summary'>('setup');
  const [customPool, setCustomPool] = useState<number[] | null>(null); // "practise missed"

  // Round state.
  const [results, setResults] = useState<Result[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [pressed, setPressed] = useState<KeyId[]>([]);
  const [answer, setAnswer] = useState<{ correct: boolean; picked?: number } | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const retry = useRef<{ midi: number; askedAt: number }[]>([]);
  const random = useRef(rng(Date.now()));

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(choice));
    } catch {
      // not critical
    }
  }, [choice]);

  useEffect(() => {
    getTunes().then((t) => {
      setTunes(t);
      setTuneId((id) => id ?? t[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    Promise.all([getQuizStats(), getNotes()]).then(([quiz, notes]) => {
      const s: Stats = {};
      for (const n of notes) s[n.midi] = { answered: 0, correct: 0, lookups: n.lookups };
      for (const q of quiz) s[q.midi] = { ...(s[q.midi] ?? { lookups: 0 }), answered: q.answered, correct: q.correct };
      setSaved(s);
    });
  }, []);

  const tune = tunes.find((t) => t.id === tuneId);
  useEffect(() => {
    if (choice.pool !== 'tune' || !tune) return;
    setTuneNotes(null);
    loadChart<ChartFile>(slugOf(tune.title))
      .then((file) => {
        const notes = new Map<number, Note>();
        for (const it of parseChart(file).bars.flat()) if (it.note) notes.set(it.note.midi, it.note);
        setTuneNotes(notes);
      })
      .catch(() => setTuneNotes('locked'));
  }, [choice.pool, tune?.id]);

  const spelled = useMemo(() => (tuneNotes instanceof Map ? tuneNotes : new Map<number, Note>()), [tuneNotes]);

  const pool = useMemo(() => {
    const has = (m: number) => Boolean(FINGERINGS[m]);
    if (customPool) return customPool;
    if (choice.pool === 'horn') return Array.from({ length: ALTO_RANGE.high - ALTO_RANGE.low + 1 }, (_, i) => ALTO_RANGE.low + i).filter(has);
    if (choice.pool === 'scale')
      return fullRange(scaleSpellings(picker.tonic, picker.scale.degrees), STUDENT_RANGE.low, STUDENT_RANGE.high).map((n) => n.midi);
    if (choice.pool === 'tune') return [...spelled.keys()].sort((a, b) => a - b);
    return Array.from({ length: STUDENT_RANGE.high - STUDENT_RANGE.low + 1 }, (_, i) => STUDENT_RANGE.low + i).filter(has);
  }, [choice.pool, customPool, picker.tonic, picker.scale, spelled]);

  /** Saved history plus this session's answers. */
  const stats = useMemo(() => {
    const s: Stats = Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, { ...v }]));
    for (const r of results) {
      const cur = (s[r.midi] ??= { answered: 0, correct: 0, lookups: 0 });
      cur.answered++;
      if (r.correct) cur.correct++;
    }
    return s;
  }, [saved, results]);

  const ask = useCallback(
    (done: Result[]) => {
      const midi = pickNote({ pool, stats, retry: retry.current, asked: done.length, last: done.at(-1)?.midi, random: random.current });
      retry.current = retry.current.filter((r) => r.midi !== midi);
      const mode: QuizMode = choice.mode === 'mixed' ? (done.length % 2 === 0 ? 'note-keys' : 'keys-note') : choice.mode;
      const fingerings = FINGERINGS[midi];
      setQuestion({
        midi,
        mode,
        options: mode === 'keys-note' ? optionsFor(midi, pool.length >= 4 ? pool : Object.keys(FINGERINGS).map(Number), random.current) : [],
        shown: Math.floor(random.current() * fingerings.length),
      });
      setPressed([]);
      setAnswer(null);
    },
    [pool, stats, choice.mode],
  );

  const start = (custom: number[] | null) => {
    setCustomPool(custom);
    setResults([]);
    setStreak(0);
    setBest(0);
    retry.current = [];
    random.current = rng(Date.now());
    setPhase('round');
  };
  // Ask the first question once a round has begun (pool is final by then).
  useEffect(() => {
    if (phase === 'round' && results.length === 0 && !question) ask([]);
  }, [phase, results.length, question, ask]);

  const finish = (correct: boolean, picked?: number) => {
    if (!question || answer) return;
    setAnswer({ correct, picked });
    logQuiz(question.midi, question.mode, correct);
    const next = [...results, { midi: question.midi, correct }];
    setResults(next);
    setStreak((s) => (correct ? s + 1 : 0));
    setBest((b) => (correct ? Math.max(b, streak + 1) : b));
    if (!correct) retry.current.push({ midi: question.midi, askedAt: next.length });
  };

  const next = useCallback(() => {
    if (results.length >= ROUND_LENGTH) {
      setPhase('summary');
      setQuestion(null);
    } else ask(results);
  }, [results, ask]);

  const toggle = (id: KeyId) => !answer && setPressed((p) => (p.includes(id) ? p.filter((k) => k !== id) : [...p, id]));

  useEffect(() => {
    if (phase !== 'round' || !question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
      if (answer) next();
      else if (question.mode === 'note-keys') finish(checkKeys(question.midi, pressed));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const noteFor = (midi: number): Note => spelled.get(midi) ?? parseNote(fromMidi(midi));

  // ---------------------------------------------------------------- setup
  if (phase === 'setup')
    return (
      <div className="mx-auto w-full max-w-[760px]">
        <section className="panel space-y-6 p-6">
          <div>
            <h1 className="font-display text-4xl">Fingering quiz</h1>
            <p className="mt-1 text-smoke-dim">
              Rounds of {ROUND_LENGTH}. Notes you miss come back a few questions later, and the ones you look up most are asked more often.
            </p>
          </div>
          <div>
            <p className="caps-xs mb-2 text-smoke-dim">Mode</p>
            <div className="flex flex-wrap gap-1 rounded-full bg-ink/60 p-1" role="radiogroup" aria-label="Mode">
              {MODES.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={choice.mode === m.id} className={seg(choice.mode === m.id)} onClick={() => setChoice((c) => ({ ...c, mode: m.id }))}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-smoke-dim">{MODES.find((m) => m.id === choice.mode)?.hint}</p>
          </div>
          <div>
            <p className="caps-xs mb-2 text-smoke-dim">Notes</p>
            <div className="flex flex-wrap gap-1 rounded-full bg-ink/60 p-1" role="radiogroup" aria-label="Notes">
              {POOLS.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={choice.pool === p.id} className={seg(choice.pool === p.id)} onClick={() => setChoice((c) => ({ ...c, pool: p.id }))}>
                  {p.label}
                </button>
              ))}
            </div>
            {choice.pool === 'scale' && (
              <p className="mt-2 text-sm text-smoke-dim">
                Using <NoteText text={picker.tonic.replace('#', '♯').replace(/b$/, '♭')} /> {picker.scale.name} from the Scales tab.
              </p>
            )}
            {choice.pool === 'tune' && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <select value={tuneId ?? ''} onChange={(e) => setTuneId(Number(e.target.value))} aria-label="Tune" className="rounded-full border border-smoke/25 bg-ink/60 px-3 py-1.5 font-semibold">
                  {tunes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <span className="text-smoke-dim">
                  {tuneNotes === 'locked' ? 'No chart available (unlock sheet music on the Tunes tab).' : tuneNotes ? `${tuneNotes.size} different notes` : 'Loading…'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button type="button" className={btnMain} disabled={pool.length < 2} onClick={() => start(null)}>
              Start round
            </button>
            <span className="text-sm text-smoke-dim">{pool.length} notes in this pool</span>
          </div>
        </section>
      </div>
    );

  // -------------------------------------------------------------- summary
  if (phase === 'summary') {
    const right = results.filter((r) => r.correct).length;
    const missed = [...new Set(results.filter((r) => !r.correct).map((r) => r.midi))].sort((a, b) => a - b);
    return (
      <div className="mx-auto w-full max-w-[1000px] space-y-5">
        <section className="panel p-6">
          <h1 className="font-display text-4xl">
            {right} / {results.length}
          </h1>
          <p className="mt-1 text-smoke-dim">
            {Math.round((right / Math.max(1, results.length)) * 100)}% correct · best streak {best}
            {missed.length === 0 ? ' · a clean round' : ` · ${missed.length} ${missed.length === 1 ? 'note' : 'notes'} to revisit`}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {missed.length >= 2 && (
              <button type="button" className={btnMain} onClick={() => start(missed)}>
                Practise the missed notes
              </button>
            )}
            <button type="button" className={missed.length >= 2 ? btn : btnMain} onClick={() => start(null)}>
              New round
            </button>
            <button type="button" className={btn} onClick={() => setPhase('setup')}>
              Change settings
            </button>
          </div>
        </section>
        {missed.length > 0 && (
          <section>
            <h2 className="caps mb-3 text-smoke-dim">Missed this round</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {missed.map((m) => (
                <FingeringCard key={m} note={noteFor(m)} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- round
  if (!question) return null;
  const fingerings = FINGERINGS[question.midi];
  const shownKeys = fingerings[question.shown].keys;
  const asked = results.length + (answer ? 0 : 1);
  const qNote = noteFor(question.midi);

  return (
    <div className="mx-auto grid w-full max-w-[1000px] items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="panel p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="caps text-ember">
            Question {Math.min(asked, ROUND_LENGTH)} of {ROUND_LENGTH}
          </p>
          <p className="text-sm text-smoke-dim">streak {streak}</p>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-ink/60">
          <div className="h-full rounded-full bg-ember" style={{ width: `${(results.length / ROUND_LENGTH) * 100}%` }} />
        </div>

        {question.mode === 'note-keys' ? (
          <>
            <p className="mt-5 text-smoke-dim">Press the keys for this note, then Check.</p>
            <div className="paper mt-3 px-4 pt-2 pb-1">
              <Score bars={[[{ note: qNote, duration: 'w' }]]} barsPerLine={1} width={300} />
            </div>
            <p className="mt-2 text-center font-display text-3xl">
              <NoteText text={namesOf(question.midi)} />
            </p>
            {!answer && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className={btnMain} onClick={() => finish(checkKeys(question.midi, pressed))}>
                  Check <kbd className="ml-1 opacity-60">⏎</kbd>
                </button>
                <button type="button" className={btn} onClick={() => setPressed([])} disabled={pressed.length === 0}>
                  Clear
                </button>
                <button type="button" className={btn} onClick={() => finish(false)}>
                  Not sure
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-5 text-smoke-dim">Which note is this fingering?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {question.options.map((m) => {
                const isRight = m === question.midi;
                const state = !answer ? '' : isRight ? 'border-emerald-400 bg-emerald-400/15' : answer.picked === m ? 'border-wine bg-wine/25' : 'opacity-50';
                return (
                  <button key={m} type="button" disabled={Boolean(answer)} onClick={() => finish(isRight, m)} className={`rounded-xl border border-smoke/25 px-3 py-3 font-display text-2xl hover:border-smoke/60 ${state}`}>
                    <NoteText text={namesOf(m)} />
                  </button>
                );
              })}
            </div>
            {!answer && (
              <div className="mt-4">
                <button type="button" className={btn} onClick={() => finish(false)}>
                  Not sure
                </button>
              </div>
            )}
          </>
        )}

        {answer && (
          <div className="mt-5 space-y-3" role="status">
            <p className={`font-display text-3xl ${answer.correct ? 'text-emerald-300' : 'text-wine'}`}>{answer.correct ? 'Correct' : 'Not quite'}</p>
            {!answer.correct && question.mode === 'note-keys' && (
              <p className="text-sm text-smoke-dim">
                {namesOf(question.midi)} needs: {fingerings.map((f) => `${f.name ?? 'standard'}: ${describe(f.keys).join(' ')}`).join(' · ')}
              </p>
            )}
            {fingerings.length > 1 && answer.correct && <p className="text-sm text-smoke-dim">Alternates also count: {fingerings.map((f) => f.name ?? 'standard').join(', ')}.</p>}
            <button type="button" className={btnMain} onClick={next} autoFocus>
              {results.length >= ROUND_LENGTH ? 'Finish' : 'Next'} <kbd className="ml-1 opacity-60">⏎</kbd>
            </button>
          </div>
        )}
      </section>

      <section className="panel flex flex-col items-center p-6 text-center">
        {question.mode === 'note-keys' ? (
          <>
            <p className="caps-xs text-smoke-dim">{answer && !answer.correct ? 'You pressed' : 'Your fingering'}</p>
            <div className="my-3 w-full max-w-[200px]">
              <FingeringDiagram pressed={pressed} onToggle={answer ? undefined : toggle} />
            </div>
            {answer && !answer.correct && (
              <>
                <p className="caps-xs text-smoke-dim">Correct</p>
                <div className="my-3 w-full max-w-[200px]">
                  <FingeringDiagram pressed={fingerings[0].keys} />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <p className="caps-xs text-smoke-dim">Fingering</p>
            <div className="my-3 w-full max-w-[220px]">
              <FingeringDiagram pressed={shownKeys} />
            </div>
            <p className="text-sm text-smoke-dim">{describe(shownKeys).join(' · ')}</p>
          </>
        )}
      </section>
    </div>
  );
}
