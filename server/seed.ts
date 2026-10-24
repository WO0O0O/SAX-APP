import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './db.ts';
import { chromaticRange, toMidi } from '../shared/pitch.ts';

// Student's written range, stated 2026-10-24 (docs/overview.md).
export const STUDENT_RANGE = { low: 'C4', high: 'D#6' };

// R1: C major, middle octave. He reads these from the staff already.
const START_UNLOCKED = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

// [title, concert key, status]. Concert keys from the charts in docs/; null = not confirmed yet.
const TUNES: [string, string | null, 'active' | 'queued'][] = [
  ['Autumn Leaves', 'G minor', 'active'],
  ['Naima', null, 'active'],
  ['Smooth Operator', 'F minor', 'active'],
  ['So What', 'D Dorian', 'queued'],
  ['In a Sentimental Mood', null, 'queued'],
  ['12-bar blues', 'F', 'queued'],
];

/** Seeds a fresh database. No-op if the profile already exists. */
export function seed(db: DatabaseSync): void {
  if (db.prepare('SELECT 1 FROM profile').get()) return;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  transaction(db, () => {
    db.prepare(
      `INSERT INTO profile (id, display_name, written_range_low, written_range_high, reed, mouthpiece, created_at)
       VALUES (1, 'Dan', ?, ?, 'Size 2', 'Jupiter stock', ?)`,
    ).run(STUDENT_RANGE.low, STUDENT_RANGE.high, now);

    const note = db.prepare(
      'INSERT INTO notes_progress (pitch, midi, unlocked, first_seen) VALUES (?, ?, ?, ?)',
    );
    for (const pitch of chromaticRange(STUDENT_RANGE.low, STUDENT_RANGE.high)) {
      const unlocked = START_UNLOCKED.includes(pitch);
      note.run(pitch, toMidi(pitch), unlocked ? 1 : 0, unlocked ? today : null);
    }

    const track = db.prepare('INSERT INTO track_progress (track, stage, updated_at) VALUES (?, ?, ?)');
    track.run('reading', 'R1', now);
    track.run('theory', 'T1', now);
    track.run('jazz', 'J1', now);

    const tune = db.prepare('INSERT INTO tunes (title, key_concert, status) VALUES (?, ?, ?)');
    const progress = db.prepare('INSERT INTO tune_progress (tune_id, updated_at) VALUES (?, ?)');
    for (const [title, key, status] of TUNES) {
      const { lastInsertRowid } = tune.run(title, key, status);
      progress.run(lastInsertRowid, now);
    }
  });
}
