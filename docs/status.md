# Status (living file: update every session)

**Last updated:** 2026-10-24
**Current phase:** Phase 0 signed off. Phase 0.5 (design) built, awaiting student review.

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

## Phase 0.5 delivered (prototype, mock data)
- `src/scene/BarScene.tsx`: animated club scene (band, tables, smoke), dims on work screens, pauses when hidden, off for reduced motion.
- Session screen: block timer, rest screen with the band in view, fatigue button -> off-horn view. Space / N shortcuts.
- Reading screen: R1 exercise in VexFlow on a cream card, tap to check fingering (logs a lookup) or mark fumbled, schematic fingering diagram.
- Progress screen: seeded data, styled.
- Fingering table for the whole range except C#4 (`src/fingering/fingerings.ts`), tested.

## Open questions
- Naima and In a Sentimental Mood concert keys: not set until we have charts.
- Does the in-app assessment need to cover Bb3/B3 (outside range today)?
- Low C# (C#4) fingering: confirm against a reference chart before adding.
- Reading chunk is ~390 KB gzipped (VexFlow with embedded fonts). Fine locally; could trim to Bravura-only later.

## Next
1. Student reviews the prototype (`sax`, then the Session / Reading / Progress tabs) and lists changes.
2. Phase 1a: transposition + reference (scales, chords, circle of fifths, piano view).

## Notes
- Smooth Operator chart (Online Sax Academy) is written D minor for alto = concert F minor, melody only, no chord symbols.
- Autumn Leaves chart is written E minor / G major for alto = concert G minor / Bb major.
