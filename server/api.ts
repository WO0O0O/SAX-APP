import { Hono } from 'hono';
import type { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromMidi } from '../shared/theory.ts';

// Local-only tune charts (git-ignored), see src/music/chart.ts.
const CHARTS_DIR = process.env.SAX_CHARTS_DIR ?? join(import.meta.dirname, '..', 'sheet-music');

export function api(db: DatabaseSync): Hono {
  const app = new Hono();

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

  return app;
}
