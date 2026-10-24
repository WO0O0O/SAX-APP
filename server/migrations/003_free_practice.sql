-- 2026-10-24: timed sessions, the fingering ladder and the profile were dropped from the app.
-- Remove their tables and columns so the schema only holds what the app saves.
DROP TABLE IF EXISTS exercise_attempts;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS session_blocks;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS track_progress;
DROP TABLE IF EXISTS profile;

-- notes_progress becomes a plain lookup counter; rows are created on the first lookup.
DELETE FROM notes_progress WHERE lookups = 0;
ALTER TABLE notes_progress DROP COLUMN unlocked;
ALTER TABLE notes_progress DROP COLUMN attempts;
ALTER TABLE notes_progress DROP COLUMN confidence;
