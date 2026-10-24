import { useEffect, useState } from 'react';

type Profile = { display_name: string; written_range_low: string; written_range_high: string };
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

// Phase 0 shell: proves the server, database and seed are wired up. Real screens come in Phase 1.
export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getJson<Profile>('/api/profile'),
      getJson<Note[]>('/api/notes'),
      getJson<Progress>('/api/progress'),
    ])
      .then(([profile, notes, progress]) => setData({ profile, notes, progress }))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <main className="p-10 text-2xl">Can't reach the app server: {error}</main>;
  if (!data) return <main className="p-10 text-2xl">Loading…</main>;

  const { profile, notes, progress } = data;
  const unlocked = notes.filter((n) => n.unlocked);

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-10 text-xl">
      <h1 className="text-5xl font-bold text-bar-red">Sax Tutor</h1>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Range (written)</h2>
        <p>
          {profile.written_range_low} to {profile.written_range_high}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">
          Unlocked notes ({unlocked.length} of {notes.length})
        </h2>
        <p className="font-mono">{unlocked.map((n) => n.pitch).join('  ')}</p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Current stages</h2>
        <ul>
          {progress.tracks.map((t) => (
            <li key={t.track}>
              {t.track}: {t.stage}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Tunes</h2>
        <ul>
          {progress.tunes.map((t) => (
            <li key={t.id}>
              {t.title} <span className="opacity-60">({t.status}, milestone {t.stage}/5)</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
