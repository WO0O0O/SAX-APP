import { useEffect, useState } from 'react';
import { fromMidi } from '../../shared/theory.ts';
import { getJson, getTunes, type NoteRow, type Tune } from '../api.ts';
import { TuneProgress } from '../tunes/TuneProgress.tsx';

// Tune milestones (editable here or on the Tunes screen) and fingering lookups per note.
export function ProgressScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const [tunes, setTunes] = useState<Tune[] | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onSceneDim(0.5), [onSceneDim]);

  useEffect(() => {
    Promise.all([getTunes(), getJson<NoteRow[]>('/api/notes')])
      .then(([t, n]) => {
        setTunes(t);
        setNotes(n);
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
                  <span className="font-semibold">{fromMidi(n.midi).replace('#', '♯').replace(/b(?=\d)/, '♭')}</span>
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
    </div>
  );
}
