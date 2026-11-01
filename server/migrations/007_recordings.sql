-- 2026-11-01: recorded takes and the self-listen answers about them. The audio itself is a file in data/recordings/.
CREATE TABLE recordings (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  label TEXT NOT NULL,
  file TEXT NOT NULL,
  mime TEXT NOT NULL,
  seconds REAL NOT NULL,
  -- self-listen ratings 1-5 (tone, transitions, articulation, dynamics) and a note on each, as JSON
  answers TEXT NOT NULL DEFAULT '{}'
);
