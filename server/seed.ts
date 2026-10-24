import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './db.ts';
import { TUNES } from '../shared/tunes.ts';

/** Fills a fresh database with the tune list. No-op once tunes exist. */
export function seed(db: DatabaseSync): void {
  if (db.prepare('SELECT 1 FROM tunes').get()) return;
  const now = new Date().toISOString();
  transaction(db, () => {
    const tune = db.prepare('INSERT INTO tunes (title, key_concert, status) VALUES (?, ?, ?)');
    const progress = db.prepare('INSERT INTO tune_progress (tune_id, updated_at) VALUES (?, ?)');
    for (const [title, key, status] of TUNES) {
      const { lastInsertRowid } = tune.run(title, key, status);
      progress.run(lastInsertRowid, now);
    }
  });
}
