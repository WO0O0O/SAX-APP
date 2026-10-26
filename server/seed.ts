import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './db.ts';
import { TUNES } from '../shared/tunes.ts';

/** Adds any tune from the list that isn't in the database yet (matched by title). Existing rows are never touched. */
export function seed(db: DatabaseSync): void {
  const have = new Set((db.prepare('SELECT title FROM tunes').all() as { title: string }[]).map((r) => r.title));
  const missing = TUNES.filter(([title]) => !have.has(title));
  if (!missing.length) return;
  const now = new Date().toISOString();
  transaction(db, () => {
    const tune = db.prepare('INSERT INTO tunes (title, key_concert, status) VALUES (?, ?, ?)');
    const progress = db.prepare('INSERT INTO tune_progress (tune_id, updated_at) VALUES (?, ?)');
    for (const [title, key, status] of missing) {
      const { lastInsertRowid } = tune.run(title, key, status);
      progress.run(lastInsertRowid, now);
    }
  });
}
