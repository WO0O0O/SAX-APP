# Status (living file: update every session)

**Last updated:** 2026-10-24
**Current phase:** Phase 0 built, awaiting student sign-off. Next: Phase 0.5 (design with Opus).

## Decisions
- Local-only app: localhost (127.0.0.1) + SQLite file, no auth, no cloud. (2026-10-24)
- SQLite via Node's built-in `node:sqlite`, server TS run directly by Node (no build step for the server). Hono for the API. (2026-10-24)
- Launch with the `sax` alias in `~/.zshrc` -> `bin/sax`. (2026-10-24)
- Student range: written C4 to D#6. (2026-10-24)
- Third tune: Smooth Operator. (2026-10-24)
- Recording/self-listen is a stretch goal, local disk only. (2026-10-24)
- Reading track reframed as a staff-to-fingers ladder: he reads notation fine, fingerings are treated as unknown. Starts at R1 = G4, A4, B4. (2026-10-24)
- Sheet music PDFs live in `sheet-music/` (git-ignored, not ours to publish). (2026-10-24)
- Design: jazz-bar illustrated theme, notation on a cream card. Designed by Opus in Phase 0.5.

## Phase 0 delivered
- Scaffold: Vite + React 19 + TS + Tailwind 4; server in `server/`, shared pitch maths in `shared/`.
- Migration `001_init.sql` (schema in `app-spec.md`, plus `track_progress`; `recordings` deferred).
- Seed: profile (range C4-D#6), 28 notes with R1 (G4, A4, B4) unlocked, tracks at R1/T1/J1, 6 tunes (3 active).
- `npm run backup`, README, tests for pitch maths and migrate/seed.

## Open questions
- Naima and In a Sentimental Mood concert keys: not set until we have charts.
- Does the in-app assessment need to cover Bb3/B3/C#4 (outside range today)?

## Next
1. Student signs off Phase 0 (`sax` opens the app and shows seeded data).
2. Phase 0.5 design with Opus -> `docs/design.md` + two-screen prototype.
3. Phase 1a: transposition + reference.

## Notes
- Smooth Operator chart (Online Sax Academy) is written D minor for alto = concert F minor, melody only, no chord symbols.
- Autumn Leaves chart is written E minor / G major for alto = concert G minor / Bb major.
