import { describe, expect, it } from 'vitest';
import { openDb } from './db.ts';
import { seed } from './seed.ts';

describe('database', () => {
  it('migrates and seeds a fresh database', () => {
    const db = openDb(':memory:');
    seed(db);

    const profile = db.prepare('SELECT * FROM profile').get();
    expect(profile).toMatchObject({ written_range_low: 'C4', written_range_high: 'D#6' });

    const notes = db.prepare('SELECT pitch, unlocked FROM notes_progress ORDER BY midi').all();
    expect(notes).toHaveLength(28);
    expect(notes.filter((n) => n.unlocked).map((n) => n.pitch)).toEqual([
      'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5',
    ]);

    expect(db.prepare('SELECT stage FROM track_progress ORDER BY track').all().map((r) => r.stage))
      .toEqual(['J1', 'R1', 'T1']);
    expect(db.prepare("SELECT count(*) AS n FROM tunes WHERE status = 'active'").get()).toEqual({ n: 3 });
  });

  it('seed is idempotent', () => {
    const db = openDb(':memory:');
    seed(db);
    seed(db);
    expect(db.prepare('SELECT count(*) AS n FROM notes_progress').get()).toEqual({ n: 28 });
  });
});
