-- Initial schema. Single user, no auth. Dates are ISO-8601 TEXT, JSON columns are TEXT.
-- All pitches are written alto pitch.

CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL,
  written_range_low TEXT NOT NULL,
  written_range_high TEXT NOT NULL,
  reed TEXT,
  mouthpiece TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE notes_progress (
  pitch TEXT PRIMARY KEY,            -- canonical spelling, e.g. 'F#5', 'Bb4'
  midi INTEGER NOT NULL UNIQUE,
  first_seen TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lookups INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 0,
  unlocked INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT
);

-- Current stage per curriculum track (stage codes from docs/curriculum.md, e.g. 'R1').
CREATE TABLE track_progress (
  track TEXT PRIMARY KEY CHECK (track IN ('reading', 'theory', 'jazz')),
  stage TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('main', 'light', 'offhorn')),
  playing_minutes REAL NOT NULL DEFAULT 0,
  rest_minutes REAL NOT NULL DEFAULT 0,
  fatigue_at_minutes REAL,
  fatigue_note TEXT,
  self_tone INTEGER,
  self_transitions INTEGER,
  self_articulation INTEGER,
  self_dynamics INTEGER,
  notes TEXT
);
CREATE INDEX sessions_started_at ON sessions (started_at);

CREATE TABLE session_blocks (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('warmup', 'reading', 'technique', 'tune', 'cooldown')),
  planned_min INTEGER NOT NULL,
  actual_min REAL,
  lip_load TEXT NOT NULL CHECK (lip_load IN ('low', 'med', 'high')),
  completed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX session_blocks_session ON session_blocks (session_id);

CREATE TABLE exercises (
  id INTEGER PRIMARY KEY,
  seed TEXT NOT NULL,
  params TEXT NOT NULL,              -- JSON: key, pool, rhythm, bars
  created_at TEXT NOT NULL,
  best_tempo INTEGER
);

CREATE TABLE exercise_attempts (
  id INTEGER PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions (id) ON DELETE SET NULL,
  tempo INTEGER,
  fumbled_notes TEXT NOT NULL DEFAULT '[]',   -- JSON array of pitches
  lookups TEXT NOT NULL DEFAULT '[]',         -- JSON array of pitches
  created_at TEXT NOT NULL
);
CREATE INDEX exercise_attempts_created ON exercise_attempts (created_at);

CREATE TABLE tunes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  key_concert TEXT,                  -- concert pitch, labelled; UI shows written
  form TEXT,                         -- JSON chord chart (concert), added in Phase 3
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('active', 'queued', 'done')),
  notes TEXT
);

-- stage = tune milestone 0-5 from docs/curriculum.md Track D.
CREATE TABLE tune_progress (
  tune_id INTEGER PRIMARY KEY REFERENCES tunes (id) ON DELETE CASCADE,
  stage INTEGER NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 5),
  tempo INTEGER,
  no_chart INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- recordings table is deferred to the stretch goal.
