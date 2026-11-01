import { useEffect, useRef, useState } from 'react';
import { deleteRecording, getRecordings, getTunes, recordingUrl, saveRecording, type Answers, type SavedTake, type Tune } from '../api.ts';
import { HOSTED } from '../mode.ts';

// Record a take, listen back, answer a few questions about it, and compare with an earlier one.
// Online the takes stay in this tab; on the Mac they are saved to disk with your answers.

const QUESTIONS = [
  { id: 'tone', label: 'Tone quality', hint: 'pitch stable or sagging? thin at the top?' },
  { id: 'transitions', label: 'Note transitions', hint: 'smooth or clunky?' },
  { id: 'articulation', label: 'Articulation', hint: 'tonguing and slurring' },
  { id: 'dynamics', label: 'Dynamics', hint: 'any shape, or flat?' },
] as const;

type Take = { key: string; label: string; url: string; seconds: number; answers: Answers; savedId?: number; blob?: Blob; at: string };

const MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
const btn = 'rounded-full border border-smoke/25 px-3.5 py-1.5 text-sm font-semibold text-smoke hover:border-smoke/60 disabled:opacity-40';
const btnMain = 'rounded-full bg-ember px-4 py-1.5 text-sm font-semibold text-ink hover:bg-ember/85 disabled:opacity-40';
const field = 'rounded-md border border-smoke/25 bg-ink/60 px-2 py-1 text-sm';
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function RecordScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  useEffect(() => onSceneDim(0.6), [onSceneDim]);
  const [takes, setTakes] = useState<Take[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [tune, setTune] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const latest = useRef(takes);
  latest.current = takes;
  const rec = useRef<{ recorder: MediaRecorder; stream: MediaStream; started: number; chunks: Blob[] } | null>(null);

  useEffect(() => {
    getTunes().then(setTunes);
    getRecordings().then((saved: SavedTake[]) =>
      setTakes((cur) => [
        ...cur.filter((t) => !t.savedId), // replaced below, so a second load can't duplicate them
        ...saved.map((s) => ({ key: `s${s.id}`, label: s.label, url: recordingUrl(s.id), seconds: s.seconds, answers: s.answers, savedId: s.id, at: s.created_at })),
      ]),
    );
  }, []);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => rec.current && setElapsed((performance.now() - rec.current.started) / 1000), 200);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(
    () => () => {
      rec.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setError('This browser cannot record audio.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const mimeType = MIMES.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const seconds = (performance.now() - (rec.current?.started ?? performance.now())) / 1000;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const now = new Date();
        const label = `${tune || 'Take'}, ${now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
        const take: Take = { key: `n${Date.now()}`, label, url: URL.createObjectURL(blob), seconds, answers: {}, blob, at: now.toISOString() };
        setTakes((t) => [take, ...t]);
        setOpen(take.key);
        rec.current = null;
        setRecording(false);
      };
      rec.current = { recorder, stream, started: performance.now(), chunks };
      recorder.start();
      setElapsed(0);
      setRecording(true);
    } catch (e) {
      const name = (e as DOMException).name;
      setError(name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it for this site, then try again.' : name === 'NotFoundError' ? 'No microphone found.' : 'Could not start recording.');
    }
  };

  const update = (key: string, patch: Partial<Take>) => setTakes((all) => all.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  const save = async (shown: Take) => {
    const t = latest.current.find((x) => x.key === shown.key) ?? shown; // the newest answers, even if they were just typed
    if (!t.blob) return;
    try {
      const id = await saveRecording({ label: t.label, blob: t.blob, seconds: t.seconds, answers: t.answers });
      update(t.key, { savedId: id, url: recordingUrl(id), blob: undefined, key: `s${id}` });
      setCompare((c) => c.map((k) => (k === t.key ? `s${id}` : k)));
      setOpen(null);
    } catch {
      setError('Could not save this take on the Mac.');
    }
  };
  const remove = async (t: Take) => {
    if (t.savedId) await deleteRecording(t.savedId).catch(() => {});
    setTakes((all) => all.filter((x) => x.key !== t.key));
    setCompare((c) => c.filter((k) => k !== t.key));
  };
  const toggleCompare = (key: string) => setCompare((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key].slice(-2)));

  const pair = compare.map((k) => takes.find((t) => t.key === k)).filter((t): t is Take => Boolean(t)).sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-5">
      <section className="panel space-y-4 p-6">
        <h1 className="font-display text-4xl">Record and listen back</h1>
        <p className="text-sm text-smoke-dim">
          Record a take, listen back, and answer four questions about it. Compare with an earlier take to hear what changed.{' '}
          {HOSTED ? 'Online, takes stay in this tab (use Download to keep one); on your Mac they are saved with your answers.' : 'Takes are saved on this Mac in data/recordings/. Nothing is uploaded.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={recording ? btn : btnMain} onClick={recording ? () => rec.current?.recorder.stop() : () => void start()}>
            {recording ? 'Stop recording' : 'Record'}
          </button>
          {recording && (
            <span className="flex items-center gap-2 text-sm" role="status">
              <span className="size-2.5 animate-pulse rounded-full bg-wine" />
              {clock(elapsed)}
            </span>
          )}
          {!recording && (
            <select value={tune} onChange={(e) => setTune(e.target.value)} aria-label="Tune being recorded" className={field}>
              <option value="">Any tune</option>
              {tunes.map((t) => (
                <option key={t.id} value={t.title}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>
        {error && (
          <p className="rounded-lg border border-wine/60 bg-wine/15 p-3 text-sm" role="alert">
            {error}
          </p>
        )}
      </section>

      {pair.length === 2 && (
        <section className="panel space-y-3 p-6">
          <h2 className="font-display text-3xl">Compare</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pair.map((t, i) => (
              <div key={t.key}>
                <p className="caps-xs text-smoke-dim">{i === 0 ? 'Earlier' : 'Later'}</p>
                <p className="mb-1 text-sm">{t.label}</p>
                <audio controls src={t.url} className="w-full" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        {takes.length === 0 && <p className="panel p-6 text-smoke-dim">No takes yet.</p>}
        {takes.map((t) => (
          <article key={t.key} className="panel space-y-3 p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{t.label}</h3>
                <p className="text-xs text-smoke-dim">
                  {clock(t.seconds)} · {t.savedId ? 'saved on this Mac' : HOSTED ? 'in this tab only' : 'not saved yet'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={compare.includes(t.key)} onChange={() => toggleCompare(t.key)} className="size-4 accent-ember" />
                  Compare
                </label>
                <button type="button" className={btn} onClick={() => setOpen(open === t.key ? null : t.key)}>
                  {open === t.key ? 'Hide questions' : 'Questions'}
                </button>
                {t.blob && !HOSTED && (
                  <button type="button" className={btnMain} onClick={() => void save(t)}>
                    Save
                  </button>
                )}
                {t.blob && (
                  <a className={btn} href={t.url} download={`${t.label.replace(/[^\w]+/g, '-')}.${t.blob.type.includes('mp4') ? 'm4a' : 'webm'}`}>
                    Download
                  </a>
                )}
                <button type="button" className={btn} onClick={() => void remove(t)}>
                  Delete
                </button>
              </div>
            </header>
            <audio controls src={t.url} className="w-full" />
            {open === t.key && (
              <div className="space-y-2 border-t border-walnut/70 pt-3">
                {QUESTIONS.map((q) => {
                  const a = t.answers[q.id] ?? { rating: 0, note: '' };
                  const set = (patch: Partial<typeof a>) => update(t.key, { answers: { ...t.answers, [q.id]: { ...a, ...patch } } });
                  return (
                    <div key={q.id} className="grid items-center gap-2 md:grid-cols-[9rem_auto_1fr]">
                      <span className="text-sm font-semibold">{q.label}</span>
                      <span className="flex gap-1" role="radiogroup" aria-label={`${q.label} rating`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" role="radio" aria-checked={a.rating === n} onClick={() => set({ rating: n })} className={`size-8 rounded-full border text-sm font-semibold ${a.rating === n ? 'border-ember bg-ember text-ink' : 'border-smoke/25 text-smoke-dim hover:text-smoke'}`}>
                            {n}
                          </button>
                        ))}
                      </span>
                      <input type="text" value={a.note} maxLength={160} onChange={(e) => set({ note: e.target.value })} placeholder={q.hint} className={`${field} w-full`} aria-label={`${q.label} note`} />
                    </div>
                  );
                })}
                {t.savedId && <p className="text-xs text-smoke-dim">Answers on a saved take can only be set before saving.</p>}
              </div>
            )}
            {t.savedId && Object.keys(t.answers).length > 0 && open !== t.key && (
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-smoke-dim">
                {QUESTIONS.filter((q) => t.answers[q.id]?.rating).map((q) => (
                  <li key={q.id}>
                    {q.label}: <strong className="text-smoke">{t.answers[q.id]!.rating}/5</strong>
                    {t.answers[q.id]!.note ? ` (${t.answers[q.id]!.note})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
