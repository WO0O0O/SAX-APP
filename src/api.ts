// Small client for the local API (server/api.ts). In the online copy there is no server:
// the tune list is static, nothing is saved, and sheet music is decrypted in the browser.
import { TUNES } from '../shared/tunes.ts';
import { HOSTED } from './mode.ts';
import { LockedError, openSealed } from './sealed.ts';

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

export const getTunes = (): Promise<Tune[]> =>
  HOSTED
    ? Promise.resolve(TUNES.map(([title, key_concert, status], i) => ({ id: i + 1, title, key_concert, status, stage: 0, tempo: null, no_chart: 0 })))
    : getJson<Tune[]>('/api/tunes');
export const updateTune = (id: number, patch: Partial<{ stage: number; tempo: number | null; no_chart: boolean }>) =>
  send('PATCH', `/api/tunes/${id}`, patch);
/** Fire-and-forget: a "check fingering" tap. */
export const logLookup = (midi: number) => {
  if (!HOSTED) send('POST', '/api/lookup', { midi }).catch(() => {});
};

/** A transcribed chart, sheet-music/<slug>.tune.json. */
export async function loadChart<T>(slug: string): Promise<T> {
  if (!HOSTED) return getJson<T>(`/api/charts/${slug}`);
  return JSON.parse(new TextDecoder().decode(await openSealed(`${slug}.tune.json`))) as T;
}

/** A URL for one of the PDFs in sheet-music/. Online, it's decrypted into a temporary blob URL. */
export async function pdfUrl(name: string): Promise<string> {
  if (!HOSTED) return `/api/files/${encodeURIComponent(name)}`;
  const bytes = await openSealed(name);
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
}

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

/** Opens a PDF in a new tab. The tab is opened first so the browser doesn't block it as a pop-up. */
export function openPdf(name: string) {
  const tab = window.open('', '_blank');
  pdfUrl(name)
    .then((url) => {
      if (tab) tab.location.href = url;
      else window.location.href = url;
    })
    .catch((e) => {
      tab?.close();
      alert(e instanceof LockedError ? 'Unlock the sheet music on the Tunes tab first.' : `Could not open ${name}.`);
    });
}
