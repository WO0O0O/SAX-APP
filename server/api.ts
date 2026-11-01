import { Hono } from 'hono';
import type { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromMidi } from '../shared/theory.ts';
import { DATA_DIR, transaction } from './db.ts';
import { buildSummary } from './summary.ts';

// Local-only tune charts (git-ignored), see src/music/chart.ts.
const CHARTS_DIR = process.env.SAX_CHARTS_DIR ?? join(import.meta.dirname, '..', 'sheet-music');

export function api(db: DatabaseSync, dataDir: string = DATA_DIR): Hono {
  const app = new Hono();

  // The server only listens on 127.0.0.1, but a web page you visit could still try to reach it:
  // - DNS rebinding: a site whose domain points at 127.0.0.1. Refuse any Host but our own.
  // - Cross-site form posts: a "simple" request skips the browser's CORS check, so writes must be JSON.
  app.use('*', async (c, next) => {
    const host = (c.req.header('host') ?? '').replace(/:\d+$/, '');
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return c.json({ error: 'forbidden host' }, 403);
    if (c.req.method !== 'GET' && !c.req.header('content-type')?.startsWith('application/json')) {
      return c.json({ error: 'expected JSON' }, 415);
    }
    await next();
  });

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/notes', (c) => c.json(db.prepare('SELECT * FROM notes_progress ORDER BY midi').all()));

  app.get('/tunes', (c) =>
    c.json(
      db
        .prepare(
          `SELECT t.id, t.title, t.key_concert, t.status, p.stage, p.tempo, p.no_chart
           FROM tunes t JOIN tune_progress p ON p.tune_id = t.id ORDER BY t.id`,
        )
        .all(),
    ),
  );

  app.get('/charts/:slug', (c) => {
    const slug = c.req.param('slug');
    const file = join(CHARTS_DIR, `${slug}.tune.json`);
    if (!/^[a-z0-9-]+$/.test(slug) || !existsSync(file)) return c.json({ error: 'no chart' }, 404);
    return c.json(JSON.parse(readFileSync(file, 'utf8')));
  });

  // The original PDFs in sheet-music/, for viewing in the app.
  app.get('/files/:name', (c) => {
    const name = c.req.param('name');
    const file = join(CHARTS_DIR, name);
    if (!/^[\w.-]+\.pdf$/.test(name) || !existsSync(file)) return c.json({ error: 'no file' }, 404);
    return c.body(readFileSync(file), 200, { 'content-type': 'application/pdf' });
  });

  // Tune milestone (0-5), best tempo, and whether it's played without a finger chart.
  app.patch('/tunes/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json<{ stage?: number; tempo?: number | null; no_chart?: boolean }>();
    const row = db.prepare('SELECT stage, tempo, no_chart FROM tune_progress WHERE tune_id = ?').get(id) as
      | { stage: number; tempo: number | null; no_chart: number }
      | undefined;
    if (!row) return c.json({ error: 'unknown tune' }, 404);
    const stage = body.stage ?? row.stage;
    if (!Number.isInteger(stage) || stage < 0 || stage > 5) return c.json({ error: 'stage must be 0-5' }, 400);
    const tempo = body.tempo === undefined ? row.tempo : body.tempo;
    const noChart = body.no_chart === undefined ? row.no_chart : body.no_chart ? 1 : 0;
    db.prepare('UPDATE tune_progress SET stage = ?, tempo = ?, no_chart = ?, updated_at = ? WHERE tune_id = ?').run(
      stage,
      tempo,
      noChart,
      new Date().toISOString(),
      id,
    );
    return c.json({ ok: true });
  });

  // A "check fingering" tap while sight-reading.
  app.post('/lookup', async (c) => {
    const { midi } = await c.req.json<{ midi: number }>();
    if (!Number.isInteger(midi) || midi < 58 || midi > 90) return c.json({ error: 'midi out of range' }, 400);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO notes_progress (pitch, midi, lookups, first_seen, last_seen) VALUES (?, ?, 1, ?, ?)
       ON CONFLICT (pitch) DO UPDATE SET lookups = lookups + 1, last_seen = excluded.last_seen,
         first_seen = coalesce(first_seen, excluded.first_seen)`,
    ).run(fromMidi(midi), midi, now.slice(0, 10), now);
    return c.json({ ok: true });
  });

  // Fingering quiz: one row per answer; stats per note for weighting and the Progress screen.
  app.post('/quiz', async (c) => {
    const { midi, mode, correct } = await c.req.json<{ midi: number; mode: string; correct: boolean }>();
    if (!Number.isInteger(midi) || midi < 58 || midi > 90) return c.json({ error: 'midi out of range' }, 400);
    if (mode !== 'note-keys' && mode !== 'keys-note') return c.json({ error: 'bad mode' }, 400);
    db.prepare('INSERT INTO quiz_answers (midi, mode, correct, answered_at) VALUES (?, ?, ?, ?)').run(
      midi,
      mode,
      correct ? 1 : 0,
      new Date().toISOString(),
    );
    return c.json({ ok: true });
  });

  app.get('/quiz/stats', (c) =>
    c.json(
      db
        .prepare(
          `SELECT midi, count(*) AS answered, sum(correct) AS correct, max(answered_at) AS last_at
           FROM quiz_answers GROUP BY midi ORDER BY midi`,
        )
        .all(),
    ),
  );

  // Ear training: one row per answer; stats per kind and item decide what gets introduced next.
  app.post('/ear', async (c) => {
    const { kind, item, correct } = await c.req.json<{ kind: string; item: string; correct: boolean }>();
    if (!['interval', 'chord', 'phrase', 'tune'].includes(kind)) return c.json({ error: 'bad kind' }, 400);
    if (typeof item !== 'string' || item.length === 0 || item.length > 60) return c.json({ error: 'bad item' }, 400);
    db.prepare('INSERT INTO ear_answers (kind, item, correct, answered_at) VALUES (?, ?, ?, ?)').run(kind, item, correct ? 1 : 0, new Date().toISOString());
    return c.json({ ok: true });
  });

  app.get('/ear/stats', (c) =>
    c.json(
      db
        .prepare('SELECT kind, item, count(*) AS answered, sum(correct) AS correct FROM ear_answers GROUP BY kind, item ORDER BY kind, item')
        .all(),
    ),
  );

  // Tuner: how sharp or flat each note is played, summed up so only totals are stored.
  app.post('/intonation', async (c) => {
    const { samples } = await c.req.json<{ samples: { midi: number; n: number; sum: number }[] }>();
    if (!Array.isArray(samples) || samples.length > 64) return c.json({ error: 'bad samples' }, 400);
    for (const s of samples)
      if (!Number.isInteger(s.midi) || s.midi < 58 || s.midi > 90 || !Number.isInteger(s.n) || s.n < 1 || s.n > 100000 || !Number.isFinite(s.sum))
        return c.json({ error: 'bad sample' }, 400);
    const now = new Date().toISOString();
    transaction(db, () => {
      const up = db.prepare(
        `INSERT INTO intonation (midi, samples, sum_cents, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (midi) DO UPDATE SET samples = samples + excluded.samples, sum_cents = sum_cents + excluded.sum_cents, updated_at = excluded.updated_at`,
      );
      for (const s of samples) up.run(s.midi, s.n, s.sum, now);
    });
    return c.json({ ok: true });
  });

  app.get('/intonation', (c) =>
    c.json(db.prepare('SELECT midi, samples, sum_cents / samples AS avg_cents FROM intonation WHERE samples > 0 ORDER BY midi').all()),
  );

  // Long tones: keep the best hold per note.
  app.post('/longtone', async (c) => {
    const { midi, seconds } = await c.req.json<{ midi: number; seconds: number }>();
    if (!Number.isInteger(midi) || midi < 58 || midi > 90) return c.json({ error: 'midi out of range' }, 400);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) return c.json({ error: 'bad seconds' }, 400);
    db.prepare(
      `INSERT INTO long_tone_best (midi, seconds, achieved_at) VALUES (?, ?, ?)
       ON CONFLICT (midi) DO UPDATE SET seconds = excluded.seconds, achieved_at = excluded.achieved_at WHERE excluded.seconds > seconds`,
    ).run(midi, seconds, new Date().toISOString());
    return c.json({ ok: true });
  });

  app.get('/longtone', (c) => c.json(db.prepare('SELECT midi, seconds, achieved_at FROM long_tone_best ORDER BY midi').all()));

  // Sight-reading results per note.
  app.post('/reading', async (c) => {
    const { attempts } = await c.req.json<{ attempts: { midi: number; outcome: string }[] }>();
    if (!Array.isArray(attempts) || attempts.length > 200) return c.json({ error: 'bad attempts' }, 400);
    for (const a of attempts)
      if (!Number.isInteger(a.midi) || a.midi < 58 || a.midi > 90 || !['clean', 'lookup', 'fumbled'].includes(a.outcome)) return c.json({ error: 'bad attempt' }, 400);
    const now = new Date().toISOString();
    transaction(db, () => {
      const ins = db.prepare('INSERT INTO reading_attempts (midi, outcome, at) VALUES (?, ?, ?)');
      for (const a of attempts) ins.run(a.midi, a.outcome, now);
    });
    return c.json({ ok: true });
  });

  app.get('/reading/stats', (c) =>
    c.json(
      db
        .prepare(
          `SELECT midi, count(*) AS attempts, sum(outcome = 'fumbled') AS fumbled, sum(outcome = 'lookup') AS lookups
           FROM reading_attempts GROUP BY midi ORDER BY midi`,
        )
        .all(),
    ),
  );

  // A markdown practice summary for the Claude tutor.
  app.get('/export', (c) => {
    const days = Math.min(90, Math.max(1, Number(c.req.query('days')) || 7));
    return c.text(buildSummary(db, days), 200, { 'content-type': 'text/markdown; charset=utf-8' });
  });

  // Recorded takes: the audio arrives base64 inside JSON (so the JSON-only write rule still protects it) and is stored as a file.
  const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' };
  const RECORDINGS = join(dataDir, 'recordings');
  const MAX_BYTES = 25 * 1024 * 1024;

  app.post('/recordings', async (c) => {
    const body = await c.req.json<{ label: string; mime: string; data: string; seconds: number; answers?: unknown }>();
    const mime = String(body.mime ?? '').split(';')[0];
    if (!EXT[mime]) return c.json({ error: 'unsupported audio type' }, 400);
    if (typeof body.label !== 'string' || body.label.length > 120) return c.json({ error: 'bad label' }, 400);
    if (!Number.isFinite(body.seconds) || body.seconds <= 0 || body.seconds > 3600) return c.json({ error: 'bad length' }, 400);
    if (typeof body.data !== 'string' || body.data.length > (MAX_BYTES * 4) / 3 || !/^[A-Za-z0-9+/=]+$/.test(body.data)) return c.json({ error: 'bad audio' }, 400);
    const answers = JSON.stringify(body.answers && typeof body.answers === 'object' ? body.answers : {});
    if (answers.length > 4000) return c.json({ error: 'answers too long' }, 400);
    const now = new Date().toISOString();
    const { lastInsertRowid } = db.prepare('INSERT INTO recordings (created_at, label, file, mime, seconds, answers) VALUES (?, ?, ?, ?, ?, ?)').run(now, body.label, '', mime, body.seconds, answers);
    const id = Number(lastInsertRowid);
    const file = `${id}.${EXT[mime]}`;
    try {
      mkdirSync(RECORDINGS, { recursive: true });
      writeFileSync(join(RECORDINGS, file), Buffer.from(body.data, 'base64'));
    } catch {
      db.prepare('DELETE FROM recordings WHERE id = ?').run(id); // no row for audio that never reached the disk
      return c.json({ error: 'could not save the audio' }, 500);
    }
    db.prepare('UPDATE recordings SET file = ? WHERE id = ?').run(file, id);
    return c.json({ ok: true, id });
  });

  app.get('/recordings', (c) =>
    c.json(
      (db.prepare('SELECT id, created_at, label, mime, seconds, answers FROM recordings ORDER BY id DESC').all() as { answers: string }[]).map((r) => ({ ...r, answers: JSON.parse(r.answers) })),
    ),
  );

  app.get('/recordings/:id/audio', (c) => {
    const row = db.prepare('SELECT file, mime FROM recordings WHERE id = ?').get(Number(c.req.param('id'))) as { file: string; mime: string } | undefined;
    const path = row && join(RECORDINGS, row.file);
    if (!row || !/^\d+\.(webm|m4a|ogg)$/.test(row.file) || !path || !existsSync(path)) return c.json({ error: 'no recording' }, 404);
    return c.body(readFileSync(path), 200, { 'content-type': row.mime });
  });

  app.delete('/recordings/:id', (c) => {
    const id = Number(c.req.param('id'));
    const row = db.prepare('SELECT file FROM recordings WHERE id = ?').get(id) as { file: string } | undefined;
    if (!row) return c.json({ error: 'no recording' }, 404);
    if (/^\d+\.(webm|m4a|ogg)$/.test(row.file)) rmSync(join(RECORDINGS, row.file), { force: true });
    db.prepare('DELETE FROM recordings WHERE id = ?').run(id);
    return c.json({ ok: true });
  });

  return app;
}
