-- 2026-11-01: fingering quiz answers (one row per answer), for accuracy per note on the Progress screen.
CREATE TABLE quiz_answers (
  id INTEGER PRIMARY KEY,
  midi INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('note-keys', 'keys-note')),
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  answered_at TEXT NOT NULL
);
CREATE INDEX quiz_answers_midi ON quiz_answers (midi);
