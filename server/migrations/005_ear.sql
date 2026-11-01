-- 2026-11-01: ear-training answers (intervals, chord qualities, phrases, tunes by ear), one row per answer.
CREATE TABLE ear_answers (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('interval', 'chord', 'phrase', 'tune')),
  item TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  answered_at TEXT NOT NULL
);
CREATE INDEX ear_answers_kind_item ON ear_answers (kind, item);
