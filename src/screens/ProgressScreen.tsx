import { useEffect, useState } from 'react';

// Phase 0 data check, styled. Real progress views arrive in Phase 1d.

type Profile = { written_range_low: string; written_range_high: string };
type Note = { pitch: string; unlocked: number };
type Progress = {
  tracks: { track: string; stage: string }[];
  tunes: { id: number; title: string; status: string; stage: number }[];
};
type Data = { profile: Profile; notes: Note[]; progress: Progress };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function ProgressScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onSceneDim(0.5), [onSceneDim]);

  useEffect(() => {
    Promise.all([getJson<Profile>('/api/profile'), getJson<Note[]>('/api/notes'), getJson<Progress>('/api/progress')])
      .then(([profile, notes, progress]) => setData({ profile, notes, progress }))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="panel mx-auto mt-10 p-8">Can't reach the app server: {error}</p>;
  if (!data) return null;

  const { profile, notes, progress } = data;

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 md:grid-cols-2">
      <section className="panel p-8 md:col-span-2">
        <p className="caps text-smoke-dim">
          Fingerings unlocked · {notes.filter((n) => n.unlocked).length} of {notes.length} · written {profile.written_range_low} to{' '}
          {profile.written_range_high}
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {notes.map((n) => (
            <li
              key={n.pitch}
              className={`min-w-12 rounded-lg border px-2 py-1 text-sm text-center font-semibold ${
                n.unlocked ? 'border-ember bg-ember/15 text-smoke' : 'border-smoke/15 text-smoke-dim/60'
              }`}
            >
              {n.pitch}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-8">
        <p className="caps text-smoke-dim">Current stages</p>
        <ul className="mt-4 space-y-2 text-base">
          {progress.tracks.map((t) => (
            <li key={t.track} className="flex justify-between">
              <span className="capitalize">{t.track}</span>
              <span className="font-display text-xl text-ember">{t.stage}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-8">
        <p className="caps text-smoke-dim">Tunes</p>
        <ul className="mt-4 space-y-2 text-base">
          {progress.tunes.map((t) => (
            <li key={t.id} className={`flex justify-between ${t.status === 'active' ? '' : 'text-smoke-dim'}`}>
              <span>{t.title}</span>
              <span className="text-sm text-smoke-dim">
                {t.status === 'active' ? `milestone ${t.stage}/5` : 'later'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
