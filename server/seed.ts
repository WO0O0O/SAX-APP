import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './db.ts';

// [title, concert key, status]. Concert keys from the charts in sheet-music/; null = not confirmed yet.
const TUNES: [string, string | null, 'active' | 'queued'][] = [
  ['Autumn Leaves', 'G minor', 'active'],
  ['Naima', null, 'active'],
  ['Smooth Operator', 'F minor', 'active'],
  ['So What', 'D Dorian', 'queued'],
  ['In a Sentimental Mood', null, 'queued'],
  ['12-bar blues', 'F', 'queued'],
];

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
