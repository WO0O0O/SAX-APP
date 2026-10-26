import { describe, expect, it } from 'vitest';
import { openDb } from './db.ts';
import { seed } from './seed.ts';
import { TUNES } from '../shared/tunes.ts';

const tables = (db: ReturnType<typeof openDb>) =>
  db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);

describe('database', () => {
  it('migrates to just the tables the app uses', () => {
    const db = openDb(':memory:');
    expect(tables(db)).toEqual(['notes_progress', 'schema_migrations', 'tune_progress', 'tunes']);
    const cols = db.prepare('PRAGMA table_info(notes_progress)').all().map((c) => c.name);
    expect(cols).toEqual(['pitch', 'midi', 'first_seen', 'lookups', 'last_seen']);
  });

  it('seeds the tune list once', () => {
    const db = openDb(':memory:');
    seed(db);
    seed(db);
    expect(db.prepare('SELECT count(*) AS n FROM tunes').get()).toEqual({ n: TUNES.length });
    expect(db.prepare('SELECT count(*) AS n FROM tune_progress WHERE stage = 0').get()).toEqual({ n: TUNES.length });
  });
});
