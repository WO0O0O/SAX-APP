// Small client for the local API (server/api.ts).

export type Tune = { id: number; title: string; key_concert: string | null; status: string; stage: number; tempo: number | null; no_chart: number };
export type NoteRow = { pitch: string; midi: number; lookups: number; last_seen: string | null };

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function send(method: string, path: string, body: unknown) {
  const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
}

export const getTunes = () => getJson<{ tunes: Tune[] }>('/api/progress').then((r) => r.tunes);
export const updateTune = (id: number, patch: Partial<{ stage: number; tempo: number | null; no_chart: boolean }>) =>
  send('PATCH', `/api/tunes/${id}`, patch);
/** Fire-and-forget: a "check fingering" tap. */
export const logLookup = (midi: number) => send('POST', '/api/lookup', { midi }).catch(() => {});

export const slugOf = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// docs/curriculum.md, Track D milestones.
export const MILESTONES = [
  'Not started',
  'Head from the staff, no finger chart, slow',
  'Head from memory at tempo',
  'Chord changes spelled, chord tones played',
  '1 chorus improvised over a backing track',
  '2+ choruses with motifs and a blues colour',
];
