import { useEffect, useState } from 'react';
import { namesOf } from '../music/quiz.ts';
import { getEarStats, getIntonation, getJson, getLongTones, getQuizStats, getReadingStats, getTunes, type EarStat, type IntonationRow, type LongToneRow, type NoteRow, type QuizStat, type ReadingStat, type Tune } from '../api.ts';
import { TuneProgress } from '../tunes/TuneProgress.tsx';

// Tune milestones (editable here or on the Tunes screen) and fingering lookups per note.
export function ProgressScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const [tunes, setTunes] = useState<Tune[] | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [quiz, setQuiz] = useState<QuizStat[]>([]);
  const [reading, setReading] = useState<ReadingStat[]>([]);
  const [long, setLong] = useState<LongToneRow[]>([]);
  const [into, setInto] = useState<IntonationRow[]>([]);
  const [ear, setEar] = useState<EarStat[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onSceneDim(0.5), [onSceneDim]);

  useEffect(() => {
    Promise.all([getTunes(), getJson<NoteRow[]>('/api/notes'), getQuizStats(), getReadingStats(), getLongTones(), getIntonation(), getEarStats()])
      .then(([t, n, q, r, l, i, e]) => {
        setTunes(t);
        setNotes(n);
        setQuiz(q);
        setReading(r);
        setLong(l);
        setInto(i);
        setEar(e);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="panel mx-auto mt-10 p-8">Can't reach the app server: {error}</p>;
  if (!tunes) return null;

  const looked = notes.filter((n) => n.lookups > 0).sort((a, b) => b.lookups - a.lookups);
  const max = Math.max(1, ...looked.map((n) => n.lookups));
  const total = looked.reduce((s, n) => s + n.lookups, 0);

  return (
    <div className="mx-auto grid w-full max-w-[1400px] items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="panel p-6">
        <h1 className="font-display text-3xl">Tunes</h1>
        <p className="mt-1 text-sm text-smoke-dim">Set where you are with each tune. Changes save straight away.</p>
        <ul className="mt-5 divide-y divide-walnut/70">
          {tunes.map((t) => (
            <li key={t.id} className="py-4">
              <p className="mb-2 font-semibold">
                {t.title}
                {t.status !== 'active' && <span className="ml-2 text-xs font-normal text-smoke-dim">later</span>}
              </p>
              <TuneProgress tune={t} />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-3xl">Fingering lookups</h2>
        <p className="mt-1 text-sm text-smoke-dim">
          Counted when you tap a note to check its fingering (Reading and Tunes). The notes at the top are the ones to drill.
        </p>
        {looked.length === 0 ? (
          <p className="mt-6 text-smoke-dim">No lookups yet.</p>
        ) : (
          <>
            <p className="caps-xs mt-5 text-smoke-dim">
              {total} lookups across {looked.length} notes
            </p>
            <ul className="mt-3 space-y-1.5">
              {looked.map((n) => (
                <li key={n.pitch} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="font-semibold">{namesOf(n.midi).split(' / ')[0]}</span>
                  <span className="h-2.5 rounded-full bg-ink/60">
                    <span className="block h-full rounded-full bg-ember" style={{ width: `${(n.lookups / max) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-smoke-dim">{n.lookups}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel p-6 lg:col-span-2">
        <h2 className="font-display text-3xl">Quiz accuracy</h2>
        <p className="mt-1 text-sm text-smoke-dim">Fingering quiz answers per note. The weakest notes are asked most often.</p>
        {quiz.length === 0 ? (
          <p className="mt-6 text-smoke-dim">No quiz answers yet.</p>
        ) : (
          <ul className="mt-4 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {[...quiz]
              .sort((a, b) => a.correct / a.answered - b.correct / b.answered || b.answered - a.answered)
              .map((q) => {
                const pct = Math.round((q.correct / q.answered) * 100);
                return (
                  <li key={q.midi} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                    <span className="font-semibold">{namesOf(q.midi).split(' / ')[0]}</span>
                    <span className="h-2.5 rounded-full bg-ink/60">
                      <span className={`block h-full rounded-full ${pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-ember' : 'bg-wine'}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-smoke-dim">
                      {pct}% · {q.answered}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-3xl">Sight-reading</h2>
        <p className="mt-1 text-sm text-smoke-dim">Notes you fumble come up more often in new exercises.</p>
        {reading.length === 0 ? (
          <p className="mt-6 text-smoke-dim">No saved exercises yet. Use "Played it: save" or Listen mode.</p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {[...reading]
              .sort((a, b) => b.fumbled / b.attempts - a.fumbled / a.attempts || b.attempts - a.attempts)
              .slice(0, 12)
              .map((r) => (
                <li key={r.midi} className="grid grid-cols-[3.5rem_1fr_6rem] items-center gap-3 text-sm">
                  <span className="font-semibold">{namesOf(r.midi).split(' / ')[0]}</span>
                  <span className="h-2.5 rounded-full bg-ink/60">
                    <span className="block h-full rounded-full bg-wine" style={{ width: `${(r.fumbled / r.attempts) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-smoke-dim">
                    {r.fumbled} of {r.attempts}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-3xl">Long tones and intonation</h2>
        {long.length === 0 && into.length === 0 ? (
          <p className="mt-6 text-smoke-dim">Nothing from the tuner yet.</p>
        ) : (
          <>
            {long.length > 0 && (
              <>
                <p className="caps-xs mt-4 text-smoke-dim">Best in-tune hold</p>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                  {long.map((l) => (
                    <li key={l.midi} className="rounded-lg border border-walnut bg-ink/40 px-2.5 py-1">
                      {namesOf(l.midi).split(' / ')[0]} <span className="text-smoke-dim">{l.seconds.toFixed(1)}s</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {into.length > 0 && (
              <>
                <p className="caps-xs mt-5 text-smoke-dim">Average cents sharp (+) or flat (−)</p>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                  {into.map((r) => (
                    <li key={r.midi} className={`rounded-lg border px-2.5 py-1 ${Math.abs(r.avg_cents) >= 12 ? 'border-ember' : 'border-walnut'} bg-ink/40`}>
                      {namesOf(r.midi).split(' / ')[0]} <span className="text-smoke-dim">{r.avg_cents > 0 ? '+' : ''}{Math.round(r.avg_cents)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-3xl">Ear training</h2>
        {ear.length === 0 ? (
          <p className="mt-6 text-smoke-dim">No answers yet.</p>
        ) : (
          <ul className="mt-4 space-y-1 text-sm">
            {Object.entries(
              ear.reduce<Record<string, { n: number; ok: number }>>((acc, e) => {
                const a = (acc[e.kind] ??= { n: 0, ok: 0 });
                a.n += e.answered;
                a.ok += e.correct;
                return acc;
              }, {}),
            ).map(([kind, v]) => (
              <li key={kind} className="flex justify-between">
                <span className="capitalize">{kind === 'phrase' ? 'call and response' : kind === 'tune' ? 'tune by ear' : kind}</span>
                <span className="text-smoke-dim">
                  {Math.round((v.ok / v.n) * 100)}% of {v.n}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-6 lg:col-span-2">
        <h2 className="font-display text-3xl">For your tutor</h2>
        <p className="mt-1 text-sm text-smoke-dim">A markdown summary of recent practice, ready to paste into the Claude tutor chat.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period" className="rounded-full border border-smoke/25 bg-ink/60 px-3 py-1.5 font-semibold">
            {[7, 14, 30].map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-full bg-ember px-4 py-1.5 font-semibold text-ink hover:bg-ember/85"
            onClick={async () => {
              const text = await (await fetch(`/api/export?days=${days}`)).text();
              setSummary(text);
              try {
                await navigator.clipboard.writeText(text);
              } catch {
                // the text is shown below to copy by hand
              }
            }}
          >
            Copy summary
          </button>
        </div>
        {summary && <textarea readOnly value={summary} rows={14} className="mt-3 w-full rounded-lg border border-walnut bg-ink/60 p-3 font-mono text-xs" aria-label="Practice summary" />}
      </section>
    </div>
  );
}
