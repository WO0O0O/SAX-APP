# Status (living file: update every session)

**Last updated:** 2026-10-24
**State:** in daily use. Five areas built: Scales, All notes, Tunes, Reading, Progress. How it's built: [architecture.md](architecture.md).

## What the app is
Free practice areas, no timers. Fingerings for every written note are the core, plus scales from the circle of fifths across the whole horn, his tune charts, and generated sight-reading. Local only: `sax` starts a server on 127.0.0.1 with a SQLite file.

## Decisions
- Local-only: 127.0.0.1 + SQLite file, no auth, no cloud. (2026-10-24)
- Node's built-in `node:sqlite`; server TypeScript runs directly on Node; Hono for the API. (2026-10-24)
- Launch with the `sax` alias in `~/.zshrc` → `bin/sax`. (2026-10-24)
- Written range C4–D♯6 (`shared/student.ts`). The full horn (B♭3–F♯6) is still shown, greyed as "stretch". (2026-10-24)
- Third tune: Smooth Operator. (2026-10-24)
- **No timed sessions** (planner, timers, forced rests, fatigue button removed); he practises freely. (2026-10-24)
- Fingerings from the TamingTheSaxophone chart (`sheet-music/FingeringChart.pdf`), with alternates. (2026-10-24)
- Abstract backdrop (light ribbons, bokeh, smoke). The illustrated band was rejected as looking AI-generated. Normal UI sizes. (2026-10-24)
- `sheet-music/` (PDFs + transcribed `*.tune.json` charts) is git-ignored: other people's arrangements. (2026-10-24)
- Schema trimmed to tunes, tune_progress, notes_progress (migration 003); timed-session tables dropped. `app-spec.md` and `plan.md` retired; their live content is here and in `architecture.md`. (2026-10-24)

- Online copy on GitHub Pages (static, no server, Progress hidden); sheet music published encrypted with a passphrase (`npm run seal`). Phone: dropdown scale picker, fewer bars per line. (2026-10-24)

## Built
- **Scales:** circle of fifths, 21 scales with sound / use / songs, one octave + whole horn in notation, a fingering card per note.
- **All notes:** every note B♭3–F♯6 with alternates.
- **Tunes:** Autumn Leaves (pickup + 32 bars, chords) and Smooth Operator (9 bars) from the Online Sax Academy PDFs. Tap for fingering, note names toggle, fingering card for every note in the tune, editable milestone.
- **Reading:** generated exercises in the chosen key + scale within his range; check fingering (saved as a lookup) or mark fumbled.
- **Progress:** editable milestone / best tempo / no-chart per tune; lookups per note.
- Tests: transposition, spelling, scales, generator, charts, fingerings, DB, API.

## Open questions
- Naima and In a Sentimental Mood: no charts yet (add PDFs to `sheet-music/`).
- Scale songs/descriptions: he'll flag any that feel wrong.
- The chart shows low B♭/B with the right-pinky C key held; check on his horn.

## Roadmap
1. Reading: save fumbles and attempts; weight exercises toward high-lookup notes; silent-fingering mode; optional key signatures.
2. Tunes: Naima chart; chords for Smooth Operator; analysis panel (key centres, ii-V-Is) per tune.
3. Backing tracks in the browser (Tone.js): chords, walking bass, swing drums, any key and tempo; presets for Autumn Leaves, Smooth Operator, 12-bar blues, So What. Chord symbols shown in written pitch.
4. Export a practice log for the Claude tutor project (format in `tutor-instructions.md`).
5. Stretch: record and self-listen, saved to local disk.

## Rules that must not break
- Everything shown is **written alto pitch**. Concert pitch only when labelled. Written = concert + major 6th (concert C = written A, B♭ = G, G minor = E minor).
- Never generate notes outside `shared/student.ts`'s range in Reading.
