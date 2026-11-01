-- 2026-11-01: tuner and reading results.
-- intonation: running totals of how many cents sharp (+) or flat (-) each written note is played.
CREATE TABLE intonation (
  midi INTEGER PRIMARY KEY,
  samples INTEGER NOT NULL DEFAULT 0,
  sum_cents REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- long_tone_best: the longest in-tune hold per written note, in seconds.
CREATE TABLE long_tone_best (
  midi INTEGER PRIMARY KEY,
  seconds REAL NOT NULL,
  achieved_at TEXT NOT NULL
);

-- reading_attempts: how each note went in sight-reading (played cleanly, looked up, or fumbled).
CREATE TABLE reading_attempts (
  id INTEGER PRIMARY KEY,
  midi INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('clean', 'lookup', 'fumbled')),
  at TEXT NOT NULL
);
CREATE INDEX reading_attempts_midi ON reading_attempts (midi);
