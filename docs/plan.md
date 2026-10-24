# Build Plan

For the coding agent. Build in phases; each phase is usable on its own. Read `overview.md`, `app-spec.md`, `curriculum.md` first. Do not start a phase until the previous one is signed off by the student.

## Ground rules
- Single user, laptop-first, large type, high contrast.
- Written alto pitch everywhere in the UI. Concert pitch only in the data layer and clearly labelled.
- Local-only: localhost, SQLite file, no auth, no cloud services, no accounts. Ask the student before adding anything that costs money or leaves the machine.
- Surface the open questions in `status.md` before building anything that depends on them.
- Keep it simple: no extra features beyond the spec.
- Update `docs/status.md` at the end of every working session.

---

## Phase 0: Setup
- Vite + React + TS + Tailwind scaffold, plus a small local Node server with `node:sqlite`. `npm start` serves everything on localhost.
- SQL migration from `app-spec.md`; seed data: profile range C4-D#6, unlocked notes (C major middle octave plus whatever the student confirms), curriculum stages from `curriculum.md`.
- `data/` git-ignored, with a one-command backup/export of the database.
- Repo README with run instructions.
- **Acceptance:** `npm start` runs; migration applies; seed loads.

## Phase 0.5: Design system (Opus)
- Produces `docs/design.md`: palette tokens, type scale, SVG scene layers, animation inventory, component rules. Then a static prototype of two screens (session/rest timer and sight-reading card) for the student to approve before the app is themed.
- Notation always sits on a high-contrast cream card; no decoration over staves.
- **Acceptance:** student signs off the prototype; animations use only transform/opacity and honour reduced-motion.

## Phase 1a: Reference + transposition
- Concert <-> alto converter for notes, keys, and chord symbols.
- Scales/modes/chords in written alto notation with fingering shown on demand.
- Circle of fifths view with unlocked keys highlighted.
- **Acceptance:** unit tests for the three transposition checks in `app-spec.md` plus a table test over all 12 keys; fingering lookup covers the entire alto written range.

## Phase 1b: Sight-reading generator
- Note-pool constrained generator with seed, key, rhythm, length, max leap.
- VexFlow rendering at large size, with chord symbols optional.
- Finger chart hidden; "Check fingering" per note logs a lookup. Tap-to-mark-fumbled after the take.
- Weighted selection toward high-lookup notes; ladder unlock logic from `curriculum.md` Track A.
- Silent-fingering mode.
- **Acceptance:** generator never produces a note outside the pool or the student's written range (property test). Lookup counts persist. Next exercise measurably favours looked-up notes.

## Phase 1c: Session planner + timers
- Builds a session from stage, log, and lip budget. Block timers, forced rest countdown, fatigue button -> off-horn switch.
- Weekly ramp rules from `curriculum.md`.
- **Acceptance:** planner never exceeds the block/rest limits; fatigue event ends the playing portion and logs time-into-session.

## Phase 1d: Log + progress + checklist
- End-of-session checklist (tone, transitions, articulation, dynamics) required to close.
- Progress charts: unlocked notes, lookup rate trend, playing minutes/week, fatigue onset time.
- Weekly summary (rule-based), export log to markdown/JSON for pasting into the Claude tutor project.
- **Acceptance:** a full simulated week renders correct charts; export output matches the template in `tutor-instructions.md`.

**Checkpoint:** student uses Phase 1 for two weeks before Phase 2 begins. Fix friction first.

## Phase 2a: Backing tracks
- Tone.js engine: comping, walking bass, swing drums, count-in, tempo, loop, speed trainer.
- Presets: Autumn Leaves (concert G minor / Bb major), Smooth Operator (concert F minor), 12-bar blues, So What, minor ii-V-I, Naima-style pedal.
- Chord display transposed to written alto.
- **Acceptance:** presets play in all 12 keys with correct transposed display; tempo changes without audio glitches.

## Phase 2b: Record + self-listen (stretch goal)
- MediaRecorder capture, saved to local disk, playback with timestamped self-listen questions, A/B compare.
- **Acceptance:** record, save, replay, answer questions, answers stored in the log.

## Phase 3: Tunes + improvisation
- Tune library with chord charts and a short analysis panel per tune. Seed with Autumn Leaves and Smooth Operator from the charts in `docs/` (Smooth Operator needs chord symbols added).
- Drills: chord-tone arpeggios per chord, guide-tone lines, ii-V-I in 12 keys, call-and-response (app plays a phrase, student replies).
- Optional MusicXML import via OSMD.

---

## Definition of done (whole project)
The student can open the app on a laptop, get a lip-safe session with timers, read a fresh exercise in notation, log the session, and see progress, without needing to ask the tutor to design the lesson.

## Handoff to the Claude tutor
The app generates the plan. The Claude project (`tutor-instructions.md`) does diagnosis, explanation, theory teaching, and planning across weeks, reading the exported log. They share the same curriculum file as the source of truth.
