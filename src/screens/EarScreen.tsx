import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEarStats, getTunes, loadChart, logEar, slugOf, type Tune } from '../api.ts';
import { useAudioSettings } from '../audio/settings.ts';
import { usePlayer } from '../audio/usePlayer.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { CHORDS, INTERVALS, choicesFor, intervalNotes, makeChord, makeInterval, unlockedCount, type ChordKind, type EarItem, type IntervalQuestion, type Stat } from '../music/ear.ts';
import { parseChart, type Chart, type ChartFile } from '../music/chart.ts';
import { scaleSpellings } from '../music/build.ts';
import { generateExercise, rng } from '../music/exercise.ts';
import { ScalePicker } from '../music/ScalePicker.tsx';
import { usePicker } from '../music/usePicker.ts';
import { Score } from '../notation/Score.tsx';
import { PlaybackBar } from '../tunes/PlaybackBar.tsx';
import { useTunePlayback } from '../tunes/useTunePlayback.ts';
import { NoteText } from '../ui/NoteText.tsx';
import { LockedError } from '../sealed.ts';
import '../notation/score.css';

type Mode = 'interval' | 'chord' | 'phrase' | 'tune';
const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'interval', label: 'Intervals', hint: 'Two notes: name the distance.' },
  { id: 'chord', label: 'Chord quality', hint: 'A chord: name its type.' },
  { id: 'phrase', label: 'Call and response', hint: 'Hear a short phrase in your scale, play it back on the horn, then check the notation.' },
  { id: 'tune', label: 'Tune by ear', hint: 'Hear the start of one of your tunes with the notation hidden. Work it out, then reveal.' },
];
const ROUND = 10;

const seg = (on: boolean) => `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${on ? 'bg-smoke text-ink' : 'text-smoke-dim hover:text-smoke'}`;
const btn = 'rounded-full border border-smoke/25 px-3.5 py-1.5 text-sm font-semibold text-smoke hover:border-smoke/60 disabled:opacity-40';
const btnMain = 'rounded-full bg-ember px-4 py-1.5 text-sm font-semibold text-ink hover:bg-ember/85';

export default function EarScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  useEffect(() => onSceneDim(0.6), [onSceneDim]);
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const m = localStorage.getItem('sax.ear.v1') as Mode | null;
      return m && MODES.some((x) => x.id === m) ? m : 'interval';
    } catch {
      return 'interval';
    }
  });
  const pick = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem('sax.ear.v1', m);
    } catch {
      // not critical
    }
  };
  const [stats, setStats] = useState<Record<string, Record<string, Stat>>>({ interval: {}, chord: {} });
  useEffect(() => {
    getEarStats().then((rows) => {
      const s: Record<string, Record<string, Stat>> = { interval: {}, chord: {} };
      for (const r of rows) (s[r.kind] ??= {})[r.item] = { answered: r.answered, correct: r.correct };
      setStats(s);
    });
  }, []);
  const bump = useCallback((kind: 'interval' | 'chord', item: string, correct: boolean) => {
    setStats((s) => {
      const cur = s[kind][item] ?? { answered: 0, correct: 0 };
      return { ...s, [kind]: { ...s[kind], [item]: { answered: cur.answered + 1, correct: cur.correct + (correct ? 1 : 0) } } };
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-5">
      <section className="panel p-6">
        <h1 className="font-display text-4xl">Ear training</h1>
        <div className="mt-4 flex flex-wrap gap-1 rounded-full bg-ink/60 p-1" role="radiogroup" aria-label="Exercise">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className={seg(mode === m.id)} onClick={() => pick(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-smoke-dim">{MODES.find((m) => m.id === mode)?.hint}</p>
      </section>
      {(mode === 'interval' || mode === 'chord') && <Quiz key={mode} kind={mode} stats={stats[mode]} bump={bump} />}
      {mode === 'phrase' && <Phrase />}
      {mode === 'tune' && <TuneByEar />}
    </div>
  );
}

// -------------------------------------------------- intervals and chord quality
function Quiz({ kind, stats, bump }: { kind: 'interval' | 'chord'; stats: Record<string, Stat>; bump: (k: 'interval' | 'chord', item: string, ok: boolean) => void }) {
  const { voice } = useAudioSettings();
  const player = usePlayer();
  const random = useRef(rng(Date.now()));
  const order: { id: string; label: string }[] = kind === 'interval' ? INTERVALS : CHORDS;
  const open = unlockedCount(order, stats);
  const pool = useMemo(() => order.slice(0, open), [order, open]);

  type Q = { item: EarItem | ChordKind; notes: number[]; direction?: IntervalQuestion['direction']; choices: { id: string; label: string }[] };
  const [round, setRound] = useState<{ done: number; right: number } | null>(null);
  const [q, setQ] = useState<Q | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const last = useRef<string | undefined>(undefined);

  const sound = useCallback(
    (notes: number[], direction?: IntervalQuestion['direction'], arpeggio = false) => {
      const seq = direction === 'together' || (kind === 'chord' && !arpeggio);
      const events = notes.map((midi, i) => ({ start: seq ? 0 : i * 1.2, dur: seq ? 2.4 : 1.1, kind: 'melody' as const, midi, gain: seq && notes.length > 1 ? 0.3 : 0.5 }));
      player.play({ events, bpm: 60, range: [0, seq ? 3 : notes.length * 1.2 + 0.5], loop: false, countIn: 0, beatsPerBar: 4, voice: voice === 'reed' ? 'piano' : voice });
    },
    [player, voice, kind],
  );

  const next = useCallback(() => {
    const range = { low: STUDENT_RANGE.low, high: STUDENT_RANGE.high };
    let nq: Q;
    if (kind === 'interval') {
      const iq = makeInterval(INTERVALS.slice(0, open), stats, random.current, range, last.current);
      const notes = intervalNotes(iq);
      nq = { item: iq.item, notes, direction: iq.direction, choices: choicesFor(iq.item, INTERVALS.slice(0, open), INTERVALS, random.current) };
    } else {
      const cq = makeChord(CHORDS.slice(0, open), stats, random.current, range, last.current);
      nq = { item: cq.kind, notes: cq.notes, choices: choicesFor(cq.kind, CHORDS.slice(0, open), CHORDS, random.current) };
    }
    last.current = nq.item.id;
    setQ(nq);
    setAnswer(null);
    sound(nq.notes, nq.direction);
  }, [kind, open, stats, sound]);

  const start = () => {
    random.current = rng(Date.now());
    setRound({ done: 0, right: 0 });
    setFinished(false);
    next();
  };
  const choose = (id: string) => {
    if (!q || answer) return;
    const ok = id === q.item.id;
    setAnswer(id);
    logEar(kind, q.item.id, ok);
    bump(kind, q.item.id, ok);
    setRound((r) => r && { done: r.done + 1, right: r.right + (ok ? 1 : 0) });
  };

  if (!round)
    return (
      <section className="panel space-y-3 p-6">
        <p className="text-smoke-dim">
          Round of {ROUND}. {open} of {order.length} {kind === 'interval' ? 'intervals' : 'chord types'} in play: {pool.map((p) => p.label).join(', ')}. A new one joins for each you learn (6+ answers at 80%).
        </p>
        <button type="button" className={btnMain} onClick={start}>
          Start round
        </button>
      </section>
    );

  if (finished)
    return (
      <section className="panel space-y-3 p-6">
        <h2 className="font-display text-4xl">
          {round.right} / {ROUND}
        </h2>
        <p className="text-smoke-dim">{round.right >= 8 ? 'Strong round. Something new joins when an item has 6 answers at 80%.' : 'Keep going: the weak ones come up more often.'}</p>
        <button type="button" className={btnMain} onClick={start}>
          Another round
        </button>
      </section>
    );

  return (
    <section className="panel space-y-4 p-6">
      <div className="flex items-baseline justify-between">
        <p className="caps text-ember">
          Question {Math.min(round.done + (answer ? 0 : 1), ROUND)} of {ROUND}
        </p>
        <p className="text-sm text-smoke-dim">{round.right} right</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={btn} onClick={() => q && sound(q.notes, q.direction)}>
          Hear again
        </button>
        {kind === 'chord' && (
          <button type="button" className={btn} onClick={() => q && sound(q.notes, undefined, true)}>
            Hear as arpeggio
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {q?.choices.map((c) => {
          const right = answer && c.id === q.item.id;
          const wrong = answer === c.id && c.id !== q.item.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={Boolean(answer)}
              onClick={() => choose(c.id)}
              className={`rounded-xl border px-3 py-3 text-lg font-semibold ${right ? 'border-emerald-400 bg-emerald-400/15' : wrong ? 'border-wine bg-wine/25' : 'border-smoke/25 hover:border-smoke/60'} ${answer && !right && !wrong ? 'opacity-50' : ''}`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {answer && q && (
        <div className="space-y-2" role="status">
          <p className={`font-display text-3xl ${answer === q.item.id ? 'text-emerald-300' : 'text-wine'}`}>
            {answer === q.item.id ? 'Correct' : `Not quite: it was a ${q.item.label.toLowerCase()}`}
          </p>
          {q.direction && <p className="text-sm text-smoke-dim">{q.direction === 'together' ? 'Played together' : q.direction === 'up' ? 'Going up' : 'Going down'}.</p>}
          <button type="button" className={btnMain} onClick={() => (round.done >= ROUND ? setFinished(true) : next())} autoFocus>
            {round.done >= ROUND ? 'See result' : 'Next'}
          </button>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------ phrase and tune
function Reveal({ chart, logKind, item }: { chart: Chart; logKind: 'phrase' | 'tune'; item: string }) {
  const pb = useTunePlayback(chart);
  const [shown, setShown] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => {
    setShown(false);
    setResult(null);
  }, [chart]);
  const mark = (ok: boolean) => {
    setResult(ok);
    logEar(logKind, item, ok);
  };
  return (
    <div className="space-y-4">
      <div className="paper px-5 pt-3 pb-2">
        <PlaybackBar pb={pb} canPlayFrom={false} onPlayFrom={() => {}} />
        {shown && (
          <div className="mt-3">
            <Score bars={chart.bars} barsPerLine={2} timeSig={chart.timeSig ?? '4/4'} keySig={chart.keySig} cursor={pb.playing ? pb.cursor : undefined} width={900} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!shown ? (
          <button type="button" className={btn} onClick={() => setShown(true)}>
            Reveal notation
          </button>
        ) : result === null ? (
          <>
            <span className="text-smoke-dim">Did you get it?</span>
            <button type="button" className={btnMain} onClick={() => mark(true)}>
              Got it
            </button>
            <button type="button" className={btn} onClick={() => mark(false)}>
              Missed it
            </button>
          </>
        ) : (
          <span className="text-smoke-dim">{result ? 'Logged as got it.' : 'Logged as missed. Play it back from the notation.'}</span>
        )}
      </div>
    </div>
  );
}

function Phrase() {
  const picker = usePicker();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [bars, setBars] = useState(2);
  const chart = useMemo<Chart>(
    () => ({
      title: `phrase-${seed}`,
      arranger: '',
      writtenKey: '',
      concertKey: '',
      keySig: 'C',
      tempo: 70,
      bars: generateExercise({ spellings: scaleSpellings(picker.tonic, picker.scale.degrees), low: STUDENT_RANGE.low, high: STUDENT_RANGE.high, bars, seed }),
      chords: Array.from({ length: bars }, () => []),
    }),
    [picker.tonic, picker.scale, bars, seed],
  );
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
      <ScalePicker picker={picker} />
      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-3xl">
            <NoteText text={picker.tonic.replace('#', '♯').replace(/b$/, '♭')} /> {picker.scale.name}
          </h2>
          <select value={bars} onChange={(e) => setBars(Number(e.target.value))} aria-label="Bars" className="rounded-full border border-smoke/25 bg-ink/60 px-3 py-1.5 text-sm font-semibold">
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} bars
              </option>
            ))}
          </select>
          <button type="button" className={btn} onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
            New phrase
          </button>
        </div>
        <p className="text-sm text-smoke-dim">Play, listen as often as you like, play it back on the horn, then reveal.</p>
        <Reveal chart={chart} logKind="phrase" item={`${picker.tonic} ${picker.scale.id}`} />
      </section>
    </div>
  );
}

function TuneByEar() {
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [id, setId] = useState<number | null>(null);
  const [bars, setBars] = useState(4);
  const [file, setFile] = useState<Chart | 'locked' | 'missing' | null>(null);
  useEffect(() => {
    getTunes().then((t) => {
      setTunes(t);
      setId(t[0]?.id ?? null);
    });
  }, []);
  const tune = tunes.find((t) => t.id === id);
  useEffect(() => {
    if (!tune) return;
    setFile(null);
    loadChart<ChartFile>(slugOf(tune.title))
      .then((f) => setFile(parseChart(f)))
      .catch((e) => setFile(e instanceof LockedError ? 'locked' : 'missing'));
  }, [tune?.id]);
  const chart = useMemo<Chart | null>(
    () => (file && typeof file === 'object' ? { ...file, title: `${file.title}-${bars}`, bars: file.bars.slice(0, bars), chords: file.chords.slice(0, bars) } : null),
    [file, bars],
  );
  return (
    <section className="panel space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <select value={id ?? ''} onChange={(e) => setId(Number(e.target.value))} aria-label="Tune" className="rounded-full border border-smoke/25 bg-ink/60 px-3 py-1.5 text-sm font-semibold">
          {tunes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <select value={bars} onChange={(e) => setBars(Number(e.target.value))} aria-label="Bars" className="rounded-full border border-smoke/25 bg-ink/60 px-3 py-1.5 text-sm font-semibold">
          {[2, 4, 8].map((n) => (
            <option key={n} value={n}>
              first {n} bars
            </option>
          ))}
        </select>
      </div>
      {file === 'locked' && <p className="text-smoke-dim">Unlock the sheet music on the Tunes tab first.</p>}
      {file === 'missing' && <p className="text-smoke-dim">No chart for this tune yet.</p>}
      {chart && tune && <Reveal chart={chart} logKind="tune" item={`${tune.title} ${bars}`} />}
    </section>
  );
}
