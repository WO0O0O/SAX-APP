import { Hono } from 'hono';
import type { DatabaseSync } from 'node:sqlite';

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

  return app;
}
