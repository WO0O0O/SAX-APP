# Status (living file: update every session)

**Last updated:** 2026-10-26
**State:** in daily use; development paused (2026-10-24). Online at https://sax.wo0.dev (Vercel, any device, nothing saved); progress saved only on the Mac via `sax`. How it's built: [architecture.md](architecture.md).

## What the app is
Free practice areas, no timers. Fingerings for every written note are the core, plus scales from the circle of fifths across the whole horn, his tune charts, and generated sight-reading. Two ways to run it: the online copy at sax.wo0.dev (static, sheet music encrypted, nothing saved) and `sax` on the Mac (local server + SQLite, the only place progress is saved).

## Decisions
- Progress data stays on the Mac only: 127.0.0.1 + SQLite file, no auth, no cloud database. Other devices use the online copy without saving. (2026-10-24)
- Node's built-in `node:sqlite`; server TypeScript runs directly on Node; Hono for the API. (2026-10-24)
- Launch with the `sax` alias in `~/.zshrc` → `bin/sax`. (2026-10-24)
- Written range C4–D♯6 (`shared/student.ts`). The full horn (B♭3–F♯6) is still shown, greyed as "stretch". (2026-10-24)
- Third tune: Smooth Operator. (2026-10-24)
- **No timed sessions** (planner, timers, forced rests, fatigue button removed); he practises freely. (2026-10-24)
- Fingerings from the TamingTheSaxophone chart (`sheet-music/FingeringChart.pdf`), with alternates. (2026-10-24)
- Abstract backdrop (light ribbons, bokeh, smoke). The illustrated band was rejected as looking AI-generated. Normal UI sizes. (2026-10-24)
- `sheet-music/` (PDFs + transcribed `*.tune.json` charts) is git-ignored: other people's arrangements. (2026-10-24)
- Schema trimmed to tunes, tune_progress, notes_progress (migration 003); timed-session tables dropped. `app-spec.md` and `plan.md` retired; their live content is here and in `architecture.md`. (2026-10-24)
- Online copy (static, no server, Progress hidden); sheet music published encrypted with a passphrase (`npm run seal`). Phone: dropdown scale picker, fewer bars per line. (2026-10-24)
- Hosted on Vercel at **sax.wo0.dev** (CNAME on name.com); GitHub Pages copy retired. Deploy via `vercel.json` (tests run before build, security headers). Online mode is detected from the address (not localhost = online), so no host settings are needed. (2026-10-24)
- Pitch detection is now in scope (tuner, Reading that listens), reversing the original "no pitch detection" non-goal. The iOS Blue Note Tuner showed it works for single notes. (2026-10-25)
- Earlier iOS app: `1. DEV/music-tuner-app` (Swift/AudioKit "Blue Note Tuner": tuner, long tones, drone, metronome, intonation stats, listening sight-reading; GitHub `sax-app`). `1. DEV/music-teach` is an older 3-commit draft of it. Features are being ported to this web app (roadmap phases 5 and 7). (2026-10-25)
- Local API hardened against DNS rebinding (Host check) and cross-site posts (JSON-only writes). (2026-10-24)

## Built
- **Scales:** circle of fifths, 21 scales with sound / use / songs, one octave + whole horn in notation, a fingering card per note.
- **All notes:** every note B♭3–F♯6 with alternates.
- **Tunes:** Autumn Leaves (pickup + 32 bars, chords) and Smooth Operator (9 bars) from the Online Sax Academy PDFs; Naima (40 bars, no chords, from a PNG lead sheet converted to `naima.pdf`). Tap for fingering, note names toggle, fingering card for every note in the tune, editable milestone.
- **Reading:** generated exercises in the chosen key + scale within his range; check fingering (saved as a lookup) or mark fumbled.
- **Progress:** editable milestone / best tempo / no-chart per tune; lookups per note.
- Tests: transposition, spelling, scales, generator, charts, fingerings, DB, API.

## Open questions
- Plain copies of `autumn-leaves-easy.pdf` and `smooth-operator-sade.pdf` remain in the first commit's history. The student chose to leave them; a history rewrite + force push would remove them.
- Passphrase strength decides how well the sealed sheet music is protected (see architecture.md §7.6).
- In a Sentimental Mood: no chart yet (add a PDF to `sheet-music/`). Naima's chart has no chord symbols.
- Scale songs/descriptions: he'll flag any that feel wrong.
- The chart shows low B♭/B with the right-pinky C key held; check on his horn.

## Roadmap
Full plans: [roadmap.md](roadmap.md). Build order (agreed 2026-10-25):
1. Fingering quiz
2. Chord tones from tunes
3. Sound (Tone.js: notes, scales, tune playback with cursor)
4. Backing tracks
5. Drone and metronome (ported from the iOS Blue Note Tuner)
6. Ear training
7. Tuner: browser port of Blue Note Tuner, plus long tones, intonation stats, Reading that listens

Any time: transpose tunes, fade note names, finish Reading. Stretch: phone app (PWA, offline), record and self-listen, tutor export.

## Rules that must not break
- Everything shown is **written alto pitch**. Concert pitch only when labelled. Written = concert + major 6th (concert C = written A, B♭ = G, G minor = E minor).
- Never generate notes outside `shared/student.ts`'s range in Reading.
