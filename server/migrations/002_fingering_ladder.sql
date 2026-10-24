-- Reading track restarted as a staff-to-fingers ladder (docs/curriculum.md Track A).
-- Resets unlocked notes to R1 only on databases with no practice history yet.
UPDATE notes_progress
SET unlocked = CASE WHEN pitch IN ('G4', 'A4', 'B4') THEN 1 ELSE 0 END,
    first_seen = CASE WHEN pitch IN ('G4', 'A4', 'B4') THEN date('now') ELSE NULL END
WHERE NOT EXISTS (SELECT 1 FROM exercise_attempts);
