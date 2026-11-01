import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIntonation, getLongTones, logIntonation, logLongTone, type IntonationRow } from '../api.ts';
import { HOSTED } from '../mode.ts';
import { namesOf } from '../music/quiz.ts';
import { inTune as isInTune, TOLERANCE } from '../tuner/analysis.ts';
import { dropMessage, feedback } from '../tuner/fletcher.ts';
import { IntonationLog } from '../tuner/intonation.ts';
import { FULL_BAR, LongTone, pressureColor } from '../tuner/longtone.ts';
import { loadTunerPrefs, saveTunerPrefs, type TunerPrefs } from '../tuner/prefs.ts';
import { useTuner, type TunerFrame } from '../tuner/useTuner.ts';
import { NoteText } from '../ui/NoteText.tsx';

type Tab = 'tuner' | 'long' | 'intonation';
const TABS: { id: Tab; label: string }[] = [
  { id: 'tuner', label: 'Tuner' },
  { id: 'long', label: 'Long tones' },
  { id: 'intonation', label: 'Intonation' },
];
const seg = (on: boolean) => `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${on ? 'bg-smoke text-ink' : 'text-smoke-dim hover:text-smoke'}`;
const btn = 'rounded-full border border-smoke/25 px-3.5 py-1.5 text-sm font-semibold text-smoke hover:border-smoke/60';
const btnMain = 'rounded-full bg-ember px-4 py-1.5 text-sm font-semibold text-ink hover:bg-ember/85';

/** Cents gauge: -50 to +50, the in-tune zone shaded. */
function Gauge({ cents, tolerance, live }: { cents: number | null; tolerance: number; live: boolean }) {
  const x = (c: number) => 200 + (Math.max(-50, Math.min(50, c)) / 50) * 180;
  const good = cents !== null && Math.abs(cents) <= tolerance;
  return (
    <svg viewBox="0 0 400 90" className="mx-auto block w-full max-w-[560px]" role="img" aria-label={cents === null ? 'No note' : `${Math.round(cents)} cents`}>
      <rect x={x(-tolerance)} y="14" width={x(tolerance) - x(-tolerance)} height="50" rx="6" fill="#38bdf8" opacity="0.2" />
      {[-50, -25, 0, 25, 50].map((c) => (
        <g key={c}>
          <line x1={x(c)} x2={x(c)} y1={c === 0 ? 10 : 22} y2="68" stroke="#efe6da" strokeOpacity={c === 0 ? 0.7 : 0.3} strokeWidth={c === 0 ? 2 : 1} />
          <text x={x(c)} y="84" textAnchor="middle" fontSize="11" fill="#a89d91">
            {c > 0 ? `+${c}` : c}
          </text>
        </g>
      ))}
      {cents !== null && live && (
        <g style={{ transform: `translateX(${x(cents) - 200}px)`, transition: 'transform 90ms linear' }}>
          <path d="M200,18 L192,2 L208,2 Z" fill={good ? '#38bdf8' : '#e0863a'} />
          <line x1="200" x2="200" y1="18" y2="64" stroke={good ? '#38bdf8' : '#e0863a'} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export default function TunerScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  useEffect(() => onSceneDim(0.6), [onSceneDim]);
  const [tab, setTab] = useState<Tab>('tuner');
  const [prefs, setPrefs] = useState(loadTunerPrefs);
  const patch = (p: Partial<TunerPrefs>) =>
    setPrefs((cur) => {
      const next = { ...cur, ...p };
      saveTunerPrefs(next);
      return next;
    });

  // ---- trackers fed by every frame
  const longTone = useRef(new LongTone());
  const log = useRef(new IntonationLog());
  const [hold, setHold] = useState({ seconds: 0, midi: null as number | null });
  const [message, setMessage] = useState('Play a note and hold it.');
  const [bests, setBests] = useState<Record<number, number>>({});
  const [session, setSession] = useState<Record<number, { n: number; sum: number }>>({});
  const [saved, setSaved] = useState<IntonationRow[]>([]);
  const flushAt = useRef(0);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    getLongTones().then((rows) => setBests(Object.fromEntries(rows.map((r) => [r.midi, r.seconds]))));
    getIntonation().then(setSaved);
  }, []);

  const flush = useCallback(() => {
    const batch = log.current.take();
    if (!batch.length) return;
    logIntonation(batch);
    setSession((s) => {
      const next = { ...s };
      for (const b of batch) next[b.midi] = { n: (next[b.midi]?.n ?? 0) + b.n, sum: (next[b.midi]?.sum ?? 0) + b.sum };
      return next;
    });
  }, []);

  const endHold = useCallback((drop: ReturnType<LongTone['update']>) => {
    if (!drop) return;
    if (drop.seconds >= 1 && drop.midi >= 58 && drop.midi <= 90) {
      setBests((b) => {
        if (drop.seconds <= (b[drop.midi] ?? 0)) return b;
        logLongTone(drop.midi, drop.seconds);
        return { ...b, [drop.midi]: drop.seconds };
      });
    }
    if (drop.seconds >= 0.5) setMessage(dropMessage(drop.reason, prefsRef.current.fletcher));
  }, []);

  const onFrame = useCallback(
    (f: TunerFrame) => {
      const { mode, fletcher } = prefsRef.current;
      endHold(longTone.current.update({ dt: f.dt, sounding: f.sounding, reading: f.reading, mode }));
      setHold({ seconds: longTone.current.duration, midi: longTone.current.midi });
      if (longTone.current.duration > 0.5 && longTone.current.duration < 0.7) setMessage(fletcher ? 'HOLD IT.' : 'Hold it.');
      if (longTone.current.duration > 20 && longTone.current.duration < 20.2) setMessage(fletcher ? "DON'T YOU DARE STOP!" : 'Nearly there.');
      log.current.add(f.t, f.reading);
      if (f.t - flushAt.current > 6) {
        flushAt.current = f.t;
        flush();
      }
    },
    [endHold, flush],
  );

  const tuner = useTuner({ a4: prefs.a4, gate: prefs.gate, onFrame });
  const { active, error, frame } = tuner;
  const stopAll = () => {
    endHold(longTone.current.finish());
    flush();
    tuner.stop();
  };
  useEffect(() => () => flush(), [flush]);

  const reading = frame?.reading ?? null;
  const tuned = reading ? isInTune(reading.cents, prefs.mode) : false;
  const [insult, setInsult] = useState('');
  const insultAt = useRef(0);
  useEffect(() => {
    if (!prefs.fletcher || !reading || !frame) return;
    if (frame.t - insultAt.current > 2.5) {
      insultAt.current = frame.t;
      setInsult(feedback(reading.cents, tuned));
    }
  }, [prefs.fletcher, reading, frame, tuned]);

  const best = hold.midi !== null ? bests[hold.midi] ?? 0 : 0;
  const rows = useMemo(() => {
    const byMidi = new Map<number, { n: number; sum: number }>();
    for (const r of saved) byMidi.set(r.midi, { n: r.samples, sum: r.avg_cents * r.samples });
    for (const [m, v] of Object.entries(session)) {
      const cur = byMidi.get(Number(m)) ?? { n: 0, sum: 0 };
      byMidi.set(Number(m), { n: cur.n + v.n, sum: cur.sum + v.sum });
    }
    return [...byMidi].map(([midi, v]) => ({ midi, n: v.n, avg: v.sum / v.n })).sort((a, b) => a.midi - b.midi);
  }, [saved, session]);

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-5">
      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl">Tuner</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-full bg-ink/60 p-1" role="radiogroup" aria-label="Mode">
              {(['casual', 'pro'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={prefs.mode === m} className={seg(prefs.mode === m)} onClick={() => patch({ mode: m })}>
                  {m === 'casual' ? 'Casual ±12¢' : 'Pro ±5¢'}
                </button>
              ))}
            </div>
            <button type="button" className={active ? btn : btnMain} onClick={active ? stopAll : () => void tuner.start()}>
              {active ? 'Stop listening' : 'Start listening'}
            </button>
          </div>
        </div>
        {error && (
          <p className="rounded-lg border border-wine/60 bg-wine/15 p-3 text-sm" role="alert">
            {error}
          </p>
        )}
        {!active && !error && (
          <p className="text-sm text-smoke-dim">
            Press start and allow the microphone. The sound is analysed on this device and is never recorded or uploaded. Use headphones if the drone is playing, or the mic will hear it.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-smoke-dim">A4 =</span>
            <input type="number" min={438} max={445} value={prefs.a4} onChange={(e) => patch({ a4: Math.min(445, Math.max(438, Number(e.target.value) || 440)) })} className="w-16 rounded-md border border-smoke/25 bg-ink/60 px-2 py-1" aria-label="A4 reference in Hz" />
            <span className="text-smoke-dim">Hz</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-smoke-dim">Sensitivity</span>
            <input type="range" min={0.002} max={0.05} step={0.001} value={0.052 - prefs.gate} onChange={(e) => patch({ gate: 0.052 - Number(e.target.value) })} className="w-28 accent-ember" aria-label="Sensitivity" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.fletcher} onChange={(e) => patch({ fletcher: e.target.checked })} className="size-4 accent-ember" />
            Fletcher mode
          </label>
          {frame && (
            <span className="flex items-center gap-2" title="Input level">
              <span className="text-smoke-dim">Level</span>
              <span className="h-2 w-24 rounded-full bg-ink/60">
                <span className="block h-full rounded-full bg-ember" style={{ width: `${Math.min(100, (frame.level / 0.15) * 100)}%` }} />
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-ink/60 p-1" role="tablist" aria-label="Tuner views">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={seg(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'tuner' && (
        <section className="panel space-y-4 p-8 text-center">
          <p className="caps-xs text-smoke-dim">Written note</p>
          <p className="font-display text-8xl leading-none" aria-live="polite">
            {reading ? <NoteText text={namesOf(reading.midi).split(' / ')[0].replace(/\d/, '')} /> : '–'}
          </p>
          <p className="text-smoke-dim">
            {reading ? (
              <>
                {namesOf(reading.midi)} · sounds <NoteText text={namesOf(reading.midi - 9).split(' / ')[0]} /> · {reading.hz.toFixed(1)} Hz
              </>
            ) : active ? 'Listening…' : 'Not listening'}
          </p>
          <Gauge cents={reading?.cents ?? null} tolerance={TOLERANCE[prefs.mode]} live={active} />
          <p className={`font-display text-4xl ${reading ? (tuned ? 'text-sky-300' : 'text-ember') : 'text-smoke-dim'}`}>
            {reading ? (tuned ? 'In tune' : reading.cents > 0 ? `Sharp ${Math.round(reading.cents)}¢` : `Flat ${Math.abs(Math.round(reading.cents))}¢`) : ' '}
          </p>
          {prefs.fletcher && reading && <p className="text-lg font-semibold italic text-ember">{insult}</p>}
        </section>
      )}

      {tab === 'long' && (
        <section className="panel space-y-5 p-8 text-center">
          <p className="caps-xs text-smoke-dim">Hold a note in tune</p>
          <p className="font-display text-8xl leading-none tabular-nums">{hold.seconds.toFixed(1)}</p>
          <p className="caps text-smoke-dim">seconds</p>
          <div className="flex justify-center gap-10">
            <div>
              <p className="caps-xs text-smoke-dim">Best{hold.midi !== null ? ' for this note' : ''}</p>
              <p className="text-3xl font-bold text-sky-300">{Math.max(best, hold.seconds).toFixed(1)}</p>
            </div>
            <div>
              <p className="caps-xs text-smoke-dim">Note</p>
              <p className="text-3xl font-bold">{hold.midi !== null ? <NoteText text={namesOf(hold.midi).split(' / ')[0]} /> : reading ? <NoteText text={namesOf(reading.midi).split(' / ')[0]} /> : '…'}</p>
            </div>
          </div>
          <div className="mx-auto h-9 max-w-[520px] rounded-xl bg-ink/60" role="progressbar" aria-valuemin={0} aria-valuemax={FULL_BAR} aria-valuenow={Math.min(hold.seconds, FULL_BAR)}>
            <div className="h-full rounded-xl transition-[width] duration-100 ease-linear" style={{ width: `${Math.min(100, (hold.seconds / FULL_BAR) * 100)}%`, background: pressureColor(hold.seconds) }} />
          </div>
          <p className={`text-lg font-semibold italic ${hold.seconds > 0 ? 'text-sky-300' : 'text-ember'}`}>{message}</p>
          <p className="text-xs text-smoke-dim">
            The timer restarts if you are out of tune ({prefs.mode === 'casual' ? '±12' : '±5'}¢), or silent, for more than 0.3 seconds.
            {HOSTED ? ' Your best times are saved on your Mac.' : ' Best times are saved per note.'}
          </p>
          {Object.keys(bests).length > 0 && (
            <ul className="mx-auto flex max-w-[520px] flex-wrap justify-center gap-2 text-sm">
              {Object.entries(bests)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([m, s]) => (
                  <li key={m} className="rounded-lg border border-walnut bg-ink/40 px-2.5 py-1">
                    <NoteText text={namesOf(Number(m)).split(' / ')[0]} /> <span className="text-smoke-dim">{s.toFixed(1)}s</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'intonation' && (
        <section className="panel space-y-4 p-6">
          <h2 className="font-display text-3xl">Intonation tendencies</h2>
          <p className="text-sm text-smoke-dim">
            How sharp (right) or flat (left) each written note tends to be, built up as you play with the tuner running.{' '}
            {HOSTED ? 'Online it lasts for this visit; on your Mac it is saved.' : 'Saved on this Mac.'}
          </p>
          {rows.length === 0 ? (
            <p className="text-smoke-dim">Nothing yet. Start listening and play some notes.</p>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((r) => (
                <li key={r.midi} className="grid grid-cols-[4rem_1fr_6rem] items-center gap-3 text-sm">
                  <span className="font-semibold">
                    <NoteText text={namesOf(r.midi).split(' / ')[0]} />
                  </span>
                  <span className="relative h-2.5 rounded-full bg-ink/60">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-smoke/40" />
                    <span
                      className={`absolute inset-y-0 rounded-full ${Math.abs(r.avg) <= TOLERANCE.casual ? 'bg-sky-400' : 'bg-ember'}`}
                      style={r.avg >= 0 ? { left: '50%', width: `${Math.min(50, (r.avg / 50) * 50)}%` } : { right: '50%', width: `${Math.min(50, (-r.avg / 50) * 50)}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-smoke-dim">
                    {r.avg > 0 ? '+' : ''}
                    {r.avg.toFixed(0)}¢ · {r.n}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
