import { Hono } from 'hono';
import type { DatabaseSync } from 'node:sqlite';
import { fromMidi } from '../shared/pitch.ts';

export function api(db: DatabaseSync): Hono {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/profile', (c) => c.json(db.prepare('SELECT * FROM profile WHERE id = 1').get()));

  app.get('/notes', (c) => c.json(db.prepare('SELECT * FROM notes_progress ORDER BY midi').all()));

  app.get('/progress', (c) =>
    c.json({
      tracks: db.prepare('SELECT track, stage FROM track_progress').all(),
      tunes: db
        .prepare(
          `SELECT t.id, t.title, t.key_concert, t.status, p.stage, p.tempo, p.no_chart
           FROM tunes t LEFT JOIN tune_progress p ON p.tune_id = t.id ORDER BY t.id`,
        )
        .all(),
    }),
  );

  // A "check fingering" tap while sight-reading.
  app.post('/lookup', async (c) => {
    const { midi } = await c.req.json<{ midi: number }>();
    if (!Number.isInteger(midi) || midi < 58 || midi > 90) return c.json({ error: 'midi out of range' }, 400);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO notes_progress (pitch, midi, lookups, first_seen, last_seen) VALUES (?, ?, 1, ?, ?)
       ON CONFLICT (pitch) DO UPDATE SET lookups = lookups + 1, last_seen = excluded.last_seen`,
    ).run(fromMidi(midi), midi, now.slice(0, 10), now);
    return c.json({ ok: true });
  });

  return app;
}
