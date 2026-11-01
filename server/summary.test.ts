import { describe, expect, it } from 'vitest';
import { openDb } from './db.ts';
import { seed } from './seed.ts';
import { buildSummary } from './summary.ts';

const NOW = new Date('2026-11-01T12:00:00Z');

function fixture() {
  const db = openDb(':memory:');
  seed(db);
  db.prepare('UPDATE tune_progress SET stage = 2, tempo = 96 WHERE tune_id = 1').run();
  const quiz = db.prepare('INSERT INTO quiz_answers (midi, mode, correct, answered_at) VALUES (?, ?, ?, ?)');
  for (let i = 0; i < 4; i++) quiz.run(70, 'note-keys', i === 0 ? 1 : 0, '2026-10-30T10:00:00Z');
  quiz.run(67, 'note-keys', 1, '2026-10-30T10:00:00Z');
  quiz.run(60, 'note-keys', 0, '2026-09-01T10:00:00Z'); // too old to count
  db.prepare("INSERT INTO notes_progress (pitch, midi, lookups, first_seen, last_seen) VALUES ('F#5', 78, 9, '2026-10-24', '2026-10-31')").run();
  const rd = db.prepare('INSERT INTO reading_attempts (midi, outcome, at) VALUES (?, ?, ?)');
  rd.run(72, 'clean', '2026-10-31T10:00:00Z');
  rd.run(73, 'fumbled', '2026-10-31T10:00:00Z');
  db.prepare("INSERT INTO long_tone_best (midi, seconds, achieved_at) VALUES (67, 14.2, '2026-10-31')").run();
  db.prepare("INSERT INTO intonation (midi, samples, sum_cents, updated_at) VALUES (75, 100, 1800, '2026-10-31')").run();
  db.prepare("INSERT INTO ear_answers (kind, item, correct, answered_at) VALUES ('interval', 'P5', 1, '2026-10-31T10:00:00Z')").run();
  return db;
}

describe('buildSummary', () => {
  const text = buildSummary(fixture(), 7, NOW);
  it('lists tune milestones and tempo', () => {
    expect(text).toContain('Autumn Leaves: milestone 2/5 (Head from memory at tempo), best tempo 96 bpm');
  });
  it('summarises recent quiz answers only, with the weak notes', () => {
    expect(text).toContain('5 answers, 40% correct.');
    expect(text).toContain('Bb4 (25% of 4)');
  });
  it('shows lookups, reading, long tones, intonation and ear training', () => {
    expect(text).toContain('F#5 9');
    expect(text).toContain('2 notes read: 1 clean, 0 needed a lookup, 1 fumbled.');
    expect(text).toContain('G4 14.2s');
    expect(text).toContain('Eb5 +18');
    expect(text).toContain('interval: 100% of 1');
  });
  it('says so when there is nothing', () => {
    const empty = buildSummary(openDb(':memory:'), 7, NOW);
    expect(empty).toContain('No quiz answers this period.');
    expect(empty).toContain('No tuner data yet.');
  });
});
