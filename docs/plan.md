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
- SQL migration from `app-spec.md`; seed data: profile range C4-D#6, unlocked notes (R1 of the fingering ladder: G4, A4, B4), curriculum stages from `curriculum.md`.
- `data/` git-ignored, with a one-command backup/export of the database.
- Repo README with run instructions.
- **Acceptance:** `npm start` runs; migration applies; seed loads.

## Phase 0.5: Design system (done, revised)
- `docs/design.md`. First pass used an illustrated band; the student rejected the figures and oversized UI, so the scene is now abstract (ribbons of light, bokeh, smoke) and the UI uses normal sizes.
- Notation always sits on a high-contrast cream card; no decoration over staves.
- **Acceptance:** student signs off the prototype; animations use only transform/opacity and honour reduced-motion.

## Phase 1 (re-planned 2026-10-24): free practice areas
Timed sessions were dropped at the student's request. Areas are used freely, no timers.
- **1a Scales + fingerings: built.** Circle of fifths, 21 scales with descriptions, one octave + whole-horn notation, fingering cards; All notes screen. Unit tests: transposition, spelling, scale building, fingering coverage B♭3–F♯6.
- **1b Reading: built (first version).** Scale-based generator, check fingering (logged), mark fumbled. Next: save attempts and fumbles, weight toward looked-up notes.
- **1c Progress + export:** lookups per note over time, tune milestones, export for the Claude tutor project.

**Checkpoint:** student uses the app for a couple of weeks; fix friction first.

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
The student can open the app on a laptop, look up any scale in any key with every fingering across the whole horn, read fresh exercises in notation, and see progress, without needing to ask the tutor to design the lesson.

## Handoff to the Claude tutor
The app generates the plan. The Claude project (`tutor-instructions.md`) does diagnosis, explanation, theory teaching, and planning across weeks, reading the exported log. They share the same curriculum file as the source of truth.
