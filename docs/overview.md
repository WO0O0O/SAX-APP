# Alto Sax Tutor: Overview

## Purpose
A personal practice system for one student: a laptop web app (plus a Claude project acting as tutor) that structures practice, trains staff reading, teaches jazz/blues theory from zero, and tracks progress. Not a generic product.

## The student (current as of 2026-10-24)
- **Instrument:** Jupiter 767 alto sax (Eb), stock mouthpiece, size 2 reed. No gear changes planned yet.
- **Started:** March 2026. Played ~1 month straight, then **stopped 4+ months**, returned **~5 days ago**. Embouchure (bottom lip, orbicularis oris) is weak again; high notes late in a session are hard.
- **Known physical limiter:** lip fatigue leads to jaw biting, thin tone, squeaks. Historically failed around 45-60 min.
- **Range (stated 2026-10-24):** written **C4 (low C, right pinky) to D#6/Eb6 (palm keys)**. Low Bb, B and C# (left-pinky bell keys) are outside the current range. The app's first assessment can verify or extend it.
- **Reading:** can read the C major scale from the staff. For every other note, looks up a finger chart. Fast on notes already learned, slow on new ones, especially notes using side/palm keys. Sight-reading is the main gap.
- **Theory:** essentially **zero formal theory** (the old Gemini prompt wrongly said "intermediate"). Plays piano by ear/memory (e.g. Clair de Lune). Ear is a major asset. Start theory from scratch, bridged through piano.
- **Repertoire now:** easy Autumn Leaves (plays it, but from YouTube finger-chart videos), and Naima. Charts by Online Sax Academy: `docs/autumn-leaves-easy.pdf` (alto part is E minor / G major written) and `docs/smooth-operator-sade.pdf` (alto part is D minor written, concert F minor; melody only, no chord symbols).
- **Practice time:** aims for 3 days/week, wants to push higher.
- **Learning source today:** YouTube only (BetterSax etc.). No teacher.
- **Influences:** Coltrane, Rollins, Getz. Wants to play jazz, then blues. Dislikes sounding "classical" and dislikes classical-style scale practice. Wants to find his own sound while being able to emulate the greats.
- **Recording:** happy to record himself and listen back. Wants generated sheet music and exercises.

## Goals
1. **Read standard notation without finger charts** (the biggest change).
2. **Understand the theory behind the tunes**, not just play them.
3. **Improvise** over backing tracks at home.
4. **Play ideas from his head** (melodies he hears, tunes he wants to play).
5. Play for himself only, for now. No gigs.

### 3-month success criteria (the test of "this worked")
- Plays **Autumn Leaves, Naima and Smooth Operator (Sade)** with **no finger charts and no YouTube video**, from sheet music or memory.
- Plays the **full circle of fifths from sheet music only**, including the high and low extreme notes, with no chart lookups.
- Can improvise a few choruses over an Autumn Leaves backing track using chord tones and a blues/pentatonic palette, and explain what he played.
- Can pick out a simple melody by ear on sax in a key of his choosing.

(The old "6-month" goals — In a Sentimental Mood, So What, Naima — are not dropped, just resequenced. Naima is already in play. So What and In a Sentimental Mood are Month 3-6.)

## Principles
1. **Lip health first.** Rest is part of the program. Embouchure rebuild is gradual.
2. **Reading is trained as a skill.** Finger charts are a reference to check after an attempt, never the first move.
3. **Theory is earned through tunes he cares about**, explained via piano.
4. **Jazz and blues from week one.** Keep scale work short and swung, not classical drill.
5. **One priority fix per session.** Direct feedback, no motivational filler.
6. **Evidence over feelings:** recordings plus specific self-listen questions, since neither the tutor nor the app can hear him.

## Document index
| File | What it is |
|---|---|
| `status.md` | **Living file:** current phase, decisions, open questions. Update every session. |
| `overview.md` | This file. Context and goals. |
| `design.md` | (Planned, Phase 0.5) Visual design system for the jazz-bar theme. |
| `app-spec.md` | What the web app does, data model, tech stack. |
| `curriculum.md` | Stages: reading, theory, jazz/blues language, repertoire. |
| `plan.md` | Build phases for the agent, with acceptance criteria. |
| `tutor-instructions.md` | Claude project instructions (v2) for the tutor conversations. |

## Decisions (2026-10-24)
- Third tune: **Smooth Operator**.
- **Local-only app:** runs on the laptop on localhost, local database, no auth, no cloud, no accounts. Wifi is only needed to fetch dependencies and fonts at install time.
- Recording and self-listen is a **stretch goal**, saved to local disk (no cloud storage needed).
- Theme: stylised, fluid jazz-bar illustration (brown, black, deep red, smoke white). See `design.md` when it exists.

Live open questions are in `status.md`.
