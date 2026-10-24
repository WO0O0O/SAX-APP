# Status (living file: update every session)

**Last updated:** 2026-10-24
**Current phase:** Phase 1 re-planned as free practice areas. Scales, All notes and Reading built; awaiting student review.

## Decisions
- Local-only app: localhost (127.0.0.1) + SQLite file, no auth, no cloud. (2026-10-24)
- SQLite via Node's built-in `node:sqlite`, server TS run directly by Node (no build step for the server). Hono for the API. (2026-10-24)
- Launch with the `sax` alias in `~/.zshrc` -> `bin/sax`. (2026-10-24)
- Student range: written C4 to D#6. (2026-10-24)
- Third tune: Smooth Operator. (2026-10-24)
- Recording/self-listen is a stretch goal, local disk only. (2026-10-24)
- Reading track reframed as a staff-to-fingers ladder: he reads notation fine, fingerings are treated as unknown. Starts at R1 = G4, A4, B4. (2026-10-24)
- Sheet music PDFs live in `sheet-music/` (git-ignored, not ours to publish). (2026-10-24)
- Design system "The Late Set" in `docs/design.md`: illustrated jazz-club SVG scene, notation on a cream chart card. (2026-10-24)

## Phase 0 delivered
- Scaffold: Vite + React 19 + TS + Tailwind 4; server in `server/`, shared pitch maths in `shared/`.
- Migration `001_init.sql` (schema in `app-spec.md`, plus `track_progress`; `recordings` deferred).
- Seed: profile (range C4-D#6), 28 notes with R1 (G4, A4, B4) unlocked, tracks at R1/T1/J1, 6 tunes (3 active).
- `npm run backup`, README, tests for pitch maths and migrate/seed.

## Changed 2026-10-24 (student feedback on the prototype)
- Dropped timed sessions, block timers, rests and the fatigue button: he practises freely and wants to push.
- Illustrated band rejected (looked AI-generated). Backdrop is now abstract light ribbons + bokeh. UI back to normal sizes.
- Fingerings are the core. Data now covers the whole horn (B♭3–F♯6) with alternates, from `sheet-music/FingeringChart.pdf`.

## Added 2026-10-24 (second review)
- **Tunes** screen: Autumn Leaves (pickup + 32 bars, chords) and Smooth Operator (9 bars) transcribed from the Online Sax Academy PDFs into `sheet-music/*.tune.json` (git-ignored, served by `/api/charts/:slug`). Tap a note for its fingering; every note in the tune as fingering cards; note names toggle.
- **Progress** is editable: milestone 0-5, best tempo, "played without a finger chart" per tune (also on the Tunes screen). Lookups per note chart.
- Fixed: notes weren't tappable (VexFlow's invisible rects caught clicks). Sidebar scrolls on its own.
- To add a tune: put the PDF in `sheet-music/` and ask Claude to transcribe it to `<slug>.tune.json` (format in `src/music/chart.ts`).

## Built
- **Scales:** circle of fifths, 21 scales with sound / use / songs, one octave + whole-horn notation, fingering card per note.
- **All notes:** every note with alternates.
- **Reading:** generator from chosen key + scale, check fingering (logged to DB), mark fumbled.
- **Progress:** seeded data view.
- Tests: 46 (transposition, spelling, scales, generator, fingerings, DB).

## Open questions
- Naima and In a Sentimental Mood concert keys: not set until we have charts.
- Scale songs/descriptions: student to flag any that feel wrong or unhelpful.
- Reading: save fumbles/attempts and weight toward looked-up notes (next).
- Reading chunk is ~390 KB gzipped (VexFlow with embedded fonts). Fine locally; could trim to Bravura-only later.

## Next
1. Student reviews Scales / All notes / Reading.
2. Reading: persist attempts, weight toward looked-up notes, silent mode.
3. Tunes area with Autumn Leaves / Smooth Operator charts and their fingerings.

## Notes
- Smooth Operator chart (Online Sax Academy) is written D minor for alto = concert F minor, melody only, no chord symbols.
- Autumn Leaves chart is written E minor / G major for alto = concert G minor / Bb major.
