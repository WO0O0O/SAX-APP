import type { DatabaseSync } from 'node:sqlite';
import { fromMidi } from '../shared/theory.ts';

// A markdown summary of recent practice, in the shape the Claude tutor reads (docs/tutor-instructions.md).

const MILESTONES = [
  'Not started',
  'Head from the staff, no finger chart, slow',
  'Head from memory at tempo',
  'Chord changes spelled, chord tones played',
  '1 chorus improvised over a backing track',
  '2+ choruses with motifs and a blues colour',
];

type Row = Record<string, string | number | null>;
const all = (db: DatabaseSync, sql: string, ...args: (string | number)[]) => db.prepare(sql).all(...args) as Row[];
const name = (midi: number) => fromMidi(midi);
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : 'n/a');

export function buildSummary(db: DatabaseSync, days = 7, now = new Date()): string {
  const since = new Date(now.getTime() - days * 86400000).toISOString();
  const out: string[] = [`# Practice summary: last ${days} days, to ${now.toISOString().slice(0, 10)}`, '', 'Notes are WRITTEN alto pitch.', ''];

  const tunes = all(db, 'SELECT t.title, p.stage, p.tempo, p.no_chart FROM tunes t JOIN tune_progress p ON p.tune_id = t.id WHERE t.status = \'active\' OR p.stage > 0 ORDER BY t.id');
  out.push('## Tunes');
  for (const t of tunes) out.push(`- ${t.title}: milestone ${t.stage}/5 (${MILESTONES[Number(t.stage)]})${t.tempo ? `, best tempo ${t.tempo} bpm` : ''}${t.no_chart ? ', played without a finger chart' : ''}`);
  out.push('');

  const quiz = all(db, 'SELECT midi, count(*) AS n, sum(correct) AS ok FROM quiz_answers WHERE answered_at >= ? GROUP BY midi', since);
  out.push('## Fingering quiz');
  if (!quiz.length) out.push('No quiz answers this period.');
  else {
    const n = quiz.reduce((s, q) => s + Number(q.n), 0);
    const ok = quiz.reduce((s, q) => s + Number(q.ok), 0);
    out.push(`${n} answers, ${pct(ok, n)} correct.`);
    const weak = quiz.filter((q) => Number(q.n) >= 2 && Number(q.ok) / Number(q.n) < 0.7).sort((a, b) => Number(a.ok) / Number(a.n) - Number(b.ok) / Number(b.n)).slice(0, 8);
    if (weak.length) out.push(`Weakest notes: ${weak.map((q) => `${name(Number(q.midi))} (${pct(Number(q.ok), Number(q.n))} of ${q.n})`).join(', ')}.`);
  }
  out.push('');

  const looked = all(db, 'SELECT midi, lookups, last_seen FROM notes_progress WHERE lookups > 0 ORDER BY lookups DESC LIMIT 8');
  out.push('## Fingering lookups (all time, most looked up)');
  out.push(looked.length ? looked.map((l) => `${name(Number(l.midi))} ${l.lookups}`).join(', ') + '.' : 'None yet.');
  out.push('');

  const reading = all(db, `SELECT midi, count(*) AS n, sum(outcome = 'fumbled') AS fumbled, sum(outcome = 'lookup') AS lookups FROM reading_attempts WHERE at >= ? GROUP BY midi`, since);
  out.push('## Sight-reading');
  if (!reading.length) out.push('No saved reading exercises this period.');
  else {
    const n = reading.reduce((s, r) => s + Number(r.n), 0);
    const f = reading.reduce((s, r) => s + Number(r.fumbled), 0);
    const l = reading.reduce((s, r) => s + Number(r.lookups), 0);
    out.push(`${n} notes read: ${n - f - l} clean, ${l} needed a lookup, ${f} fumbled.`);
    const bad = reading.filter((r) => Number(r.fumbled) > 0).sort((a, b) => Number(b.fumbled) - Number(a.fumbled)).slice(0, 8);
    if (bad.length) out.push(`Fumbled most: ${bad.map((r) => `${name(Number(r.midi))} (${r.fumbled})`).join(', ')}.`);
  }
  out.push('');

  const long = all(db, 'SELECT midi, seconds FROM long_tone_best ORDER BY seconds DESC LIMIT 6');
  out.push('## Long tones (best in-tune holds, all time)');
  out.push(long.length ? long.map((l) => `${name(Number(l.midi))} ${Number(l.seconds).toFixed(1)}s`).join(', ') + '.' : 'None recorded.');
  out.push('');

  const into = all(db, 'SELECT midi, samples, sum_cents / samples AS avg FROM intonation WHERE samples >= 30');
  const off = into.filter((r) => Math.abs(Number(r.avg)) >= 10).sort((a, b) => Math.abs(Number(b.avg)) - Math.abs(Number(a.avg))).slice(0, 8);
  out.push('## Intonation (average cents off, all time, notes 10+ cents out)');
  out.push(off.length ? off.map((r) => `${name(Number(r.midi))} ${Number(r.avg) > 0 ? '+' : ''}${Math.round(Number(r.avg))}`).join(', ') + '.' : into.length ? 'Every measured note averages within 10 cents.' : 'No tuner data yet.');
  out.push('');

  const takes = all(db, 'SELECT label, seconds, answers FROM recordings WHERE created_at >= ? ORDER BY id', since);
  out.push('## Recorded takes and self-listen answers');
  if (!takes.length) out.push('No takes recorded this period.');
  for (const t of takes) {
    const a = JSON.parse(String(t.answers)) as Record<string, { rating?: number; note?: string }>;
    const parts = Object.entries(a).filter(([, v]) => v?.rating).map(([k, v]) => `${k} ${v.rating}/5${v.note ? ` (${v.note})` : ''}`);
    out.push(`- ${t.label} (${Math.round(Number(t.seconds))}s)${parts.length ? ': ' + parts.join('; ') : ''}`);
  }
  out.push('');

  const ear = all(db, 'SELECT kind, count(*) AS n, sum(correct) AS ok FROM ear_answers WHERE answered_at >= ? GROUP BY kind ORDER BY kind', since);
  out.push('## Ear training');
  out.push(ear.length ? ear.map((e) => `${e.kind}: ${pct(Number(e.ok), Number(e.n))} of ${e.n}`).join('; ') + '.' : 'None this period.');
  out.push('');
  return out.join('\n');
}
