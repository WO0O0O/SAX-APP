# App Spec

Single-user web app, used on a **laptop propped in front of the player**. Optimise for readability at arm's length (large notation, big type, high contrast), keyboard/mouse control with big targets. Phone is secondary, so keep it responsive but don't optimise for it.

## Direction (changed 2026-10-24, after the first prototype)
- **No timed sessions.** No session planner, block timers, forced rests or fatigue button. The app is a set of areas he opens whenever he wants, for as long as he wants.
- **Fingerings are the core.** Every written note has its fingering on screen, from the reference chart (`sheet-music/FingeringChart.pdf`, TamingTheSaxophone.com).
- Normal UI sizing (not "arm's length" huge).

| Area | What it does | Status |
|---|---|---|
| **Scales** | Circle of fifths picks the key; 21 scales (major + modes, minors, pentatonics, blues, bebop, symmetric) each with sound / where it's used / songs; one octave and the **whole horn (low B♭ to high F♯)** in notation; a fingering card for every note | Built |
| **All notes** | Every written note B♭3 to F♯6 with standard and alternate fingerings | Built |
| **Reading** | Sight-reading exercises generated from the chosen key + scale, within his range; tap to check fingering (logged as a lookup) or mark fumbled | Built (lookups saved; fumbles not yet) |
| **Progress** | Lookups per note, tune milestones | Basic |
| Backing tracks | Chords, bass, drums in any key and tempo | Later |
| Tunes | Charts + analysis for Autumn Leaves, Naima, Smooth Operator | Later |
| Record / self-listen | | Stretch |

## 1. Scales and fingerings
- Scale data in `src/music/scales.ts`; spelling rules in `shared/theory.ts` (one letter per degree; `b5|#4` style alternates avoid F♭/C♭ where players would not write them).
- Full range = every note of the scale between written B♭3 and F♯6. Notes outside his comfortable range (C4–D♯6) are shown grey and tagged "stretch", never hidden.
- Each fingering card shows the written note, the concert note it sounds, the key diagram and alternates.

## 2. Sight-reading (Reading area)
Goal: staff-to-fingers recall. He can name the notes; the exercise trains knowing the keys without a chart.
- Seeded random walk through the chosen scale, 4/4, 4/8/12 bars, within his range, ending on the tonic. "New exercise" (or N) re-rolls.
- Notation in written pitch (VexFlow); accidentals follow the bar rule.
- Fingering hidden by default. "Check fingering" on a note shows it and logs a lookup (`POST /api/lookup`). "Mark fumbled" colours notes he fumbled.
- Later: weight generation toward high-lookup notes, save fumbles and attempts, silent-fingering mode.

## 3. Practice log + progress (e)
- Auto-created from each session: date, blocks done, minutes playing vs resting, fatigue events, notes looked up, tempo reached, self-rating per checklist item.
- Manual notes field: "what felt wrong".
- Optional end-of-practice notes (tone, transitions, articulation, dynamics) for the tutor export. Never required.
- **Progress views:** unlocked notes over time, lookup rate trend, tempo per exercise, total playing minutes per week, fatigue onset time (the lip endurance chart), streak per week (target: 3/week).
- **Weekly summary** (rule-based, no AI required): what moved, what stalled, and the one priority for next week.
- **Export** the log as JSON/markdown so it can be pasted into the Claude tutor project.

## 4. Reference (f)
- **Concert <-> alto converter:** alto sounds a major 6th below written (written = concert up a major 6th). Pick a concert key or chord symbol and show written alto equivalents.
- Scales/modes/chords: major, natural/harmonic/melodic minor, Dorian, Mixolydian, minor pentatonic, **blues scale**, 7th chord types (maj7, m7, 7, m7b5), shown in notation (written alto) and as note names, with the finger chart on demand.
- Circle of fifths view that shows which keys are already unlocked.
- Quick lookup: tap any note on the staff to see its fingering and where it sits in a few common scales.
- "Piano view": the same scale or chord shown on a keyboard, since piano is the student's theory bridge.

## 5. Backing tracks (c, Phase 2)
- Generated in-browser (Web Audio / Tone.js): chord comping + walking bass + ride/hi-hat swing. No audio files to host.
- Input: chord chart (concert), tempo, key, loop count. Display charts in **written alto** with chord symbols transposed to match.
- Presets: Autumn Leaves, 12-bar blues (Bb and F, concert), So What (D Dorian / Eb Dorian), minor ii-V-I loops, Naima (pedal-point style), Smooth Operator (minor groove).
- Count-in, loop section, speed trainer (auto +4 bpm after N clean loops).

## 6. Record and self-listen (d, stretch goal)
- Browser MediaRecorder, save a take as a local file with metadata (exercise, tempo, date). Only built after Phases 1-3 are in use.
- After playback, show targeted questions, e.g. "Is the pitch stable on the held notes or does it sag?", "Does the high register go thin?", "Do the slurred pairs sound connected?". Student answers, answers feed the log.
- A/B compare two takes from different days.

## Data model (local SQLite)
Single user, no auth, no `user_id`. One database file (`data/sax.db`, git-ignored). Dates are ISO-8601 TEXT, JSON columns are TEXT. Schema lives in versioned migration files.

```sql
profile(id integer primary key check (id = 1), display_name, written_range_low, written_range_high, reed, mouthpiece, created_at)
-- seed: written_range_low 'C4', written_range_high 'D#6'

notes_progress(
  pitch text primary key,      -- written alto pitch e.g. 'F#5'
  first_seen text, attempts int, lookups int, confidence int,
  unlocked int, last_seen text
)

sessions(
  id, started_at, ended_at, kind text,   -- 'main' | 'light' | 'offhorn'
  playing_minutes real, rest_minutes real,
  fatigue_at_minutes real null, fatigue_note text,
  self_tone int, self_transitions int, self_articulation int, self_dynamics int,
  notes text
)

session_blocks(
  id, session_id, kind text,   -- 'warmup'|'reading'|'technique'|'tune'|'cooldown'
  planned_min int, actual_min real, lip_load text, completed int
)

exercises(id, seed text, params text,   -- JSON: key, pool, rhythm, bars
  created_at, best_tempo int)

exercise_attempts(id, exercise_id, session_id, tempo int,
  fumbled_notes text, lookups text, created_at)   -- JSON arrays

track_progress(track primary key, stage text, updated_at)   -- 'reading'|'theory'|'jazz' -> 'R1' etc.

tunes(id, title, key_concert text, form text, status text, notes text)
tune_progress(tune_id primary key, stage text, tempo int, no_chart int, updated_at)

recordings(id, session_id, file_path, exercise_id null, created_at, answers text)  -- stretch goal
```

## Tech stack
- **Frontend:** Vite + React + TypeScript, Tailwind. Single page, keyboard shortcuts (space = start/pause, n = next block).
- **Backend:** small local Node server (Hono) with Node's built-in `node:sqlite`, serving the built frontend and a JSON API on `localhost`. One command (`npm start`) runs everything. Why not browser storage: a SQLite file is durable (browsers can evict IndexedDB), trivially backed up, and lets the app export the log.
- **Optimisation targets:** small bundle, route-level code splitting (VexFlow and Tone.js load only on the screens that use them), self-hosted fonts and no network calls at runtime, SQLite WAL mode with indexes on date and pitch, SVG scene animated with `transform`/`opacity` only.
- **Notation:** VexFlow (generated exercises), consider OSMD for imported MusicXML tunes.
- **Audio:** Tone.js for backing tracks and a click/metronome.
- **Hosting:** none. Local only. `localhost` is a secure context, so MediaRecorder works for the stretch goal.
- **Tests:** unit tests for transposition, note-pool generation, lip-load planner.

## Correctness rules (do not get these wrong)
- Alto sax is an Eb instrument: **written pitch is a major 6th above concert pitch**. All notation shown to the student is written pitch. Chord charts for backing tracks are stored concert and displayed transposed. Test with: concert C is written A; concert Bb is written G; concert G minor is written E minor.
- Alto written range is Bb3 to F#6 (high F# with the front-F key), palm keys cover D6 to F6. The **student's** range is C4 to D#6; never generate notes outside the student's `written_range`.
- Never generate exercises that jump more than the allowed leap for the current stage.

## Non-goals
- No audio pitch detection or auto-grading (it adds complexity and is unreliable on sax). Self-report plus recording self-listen is the feedback loop.
- No social, gamification, or notifications beyond a simple weekly streak.
