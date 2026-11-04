# Status (living file: update every session)

**Last updated:** 2026-11-01
**State:** in daily use. The whole 2026-10-25 roadmap is built (2026-11-01): quiz, chord tones, sound, backing band, drone and metronome, ear training, tuner, plus transposing, fading names, finished Reading, recording, offline/home-screen install and the tutor summary. It lives on branch `roadmap`/`main` locally and is **not pushed or deployed until Dan pushes**. Online at https://sax.wo0.dev (Vercel, any device, nothing saved); progress saved only on the Mac via `sax`. How it's built: [architecture.md](architecture.md); how to use it: [guide.md](guide.md).

## What the app is
Free practice areas, no practice-session timers. Fingerings for every written note are the core, plus scales from the circle of fifths across the whole horn, his tune charts (with sound, a band and chord tones), generated sight-reading that can listen, a fingering quiz, ear training and a tuner. Two ways to run it: the online copy at sax.wo0.dev (static, sheet music encrypted, nothing saved) and `sax` on the Mac (local server + SQLite, the only place progress is saved).

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
- **Built with the Web Audio API directly, not Tone.js:** a ~120-line look-ahead scheduler gives the same sample-accurate timing, is fully testable on a fake clock, and adds no dependency. The pitch detector (McLeod method) is written in the repo, not `pitchy`, and uses an `AnalyserNode` instead of an AudioWorklet. The offline copy is one small hand-written service worker, not `vite-plugin-pwa`. No new npm packages were added. (2026-11-01)
- Sound is synthesised (reed, piano, bass, drums, click): no sample files. If the band ever sounds too thin, a small CC0 sample kit is the fallback. (2026-11-01)
- The long-tone timer measures a hold, not a practice session, so it doesn't break "no timed sessions". (2026-11-01)
- Everything that is *saved* stays Mac-only (migrations 004–007, `data/recordings/`); online, the same features work for the visit. Microphone audio is analysed in the browser and never sent anywhere; `vercel.json` now allows the mic for the site itself (`microphone=(self)`). (2026-11-01)
- Earlier iOS app: `1. DEV/music-tuner-app` (Swift/AudioKit "Blue Note Tuner": tuner, long tones, drone, metronome, intonation stats, listening sight-reading; GitHub `sax-app`). `1. DEV/music-teach` is an older 3-commit draft of it. Features are being ported to this web app (roadmap phases 5 and 7). (2026-10-25)
- Local API hardened against DNS rebinding (Host check) and cross-site posts (JSON-only writes). (2026-10-24)

## Built
- **Scales:** circle of fifths, 21 scales with sound / use / songs, one octave + whole horn in notation, a fingering card per note, **play up and down** with a moving cursor.
- **All notes:** every note B♭3–F♯6 with alternates; click to hear.
- **Tunes:** six charts (Autumn Leaves, Smooth Operator, Naima, Happy Birthday in 3/4, Is It a Crime in 12/8, My One and Only Love) as interactive notation. Tap a note for its fingering (counts as a lookup); **tap a chord** for its notes, guide tones, arpeggio, fingerings, fitting scales and the move to the next chord, plus a whole-tune **guide-tone line**; **colour chord tones**; **transpose** to 12 keys; **play** with tempo, swing, count-in, click, loop, speed trainer, silent follow-along, play-from-here; a **band** (swing, ballad, bossa, straight eights, new take, melody on/off) for tunes with chord symbols, and a **Backing** tab with six practice grooves (blues, minor blues, ii–V–I, ii–V–i, turnaround, So What) in any key; fade the names of notes already known.
- **Reading:** generated exercises weighted to the weak notes, optional key signatures; check fingering, mark fumbled, **Listen** (microphone follows the playing, marks fumbles itself), Play / Silent; results saved.
- **Quiz:** note → keys, keys → note, mixed; pools (range, whole horn, scale, tune); missed notes return; accuracy per note saved.
- **Ear:** intervals and chord quality (a few at first, more as they are learned), call and response, tune by ear.
- **Tuner:** casual ±12¢ / pro ±5¢, A4 438–445, Fletcher mode (opt-in), long-tone endurance, intonation tendencies.
- **Record:** takes, self-listen ratings, compare two; saved on the Mac.
- **Tools:** drone (concert pitch of a written note, optional fifth) and metronome (tap tempo, subdivisions, swing) that keep running across tabs.
- **Progress (Mac):** milestones, lookups, quiz, reading, long tones, intonation, ear, and a **tutor summary** (markdown, last 7/14/30 days).
- **Online copy:** installable on a phone, works offline after the first visit.
- **Tests:** 194, including the pitch detector on synthetic tones across the whole horn, the scheduler on a fake clock, the band, the chord parser and every endpoint. Browser-checked: voices (offline render), playback + cursor, the tuner with a fake microphone playing a recorded tone, Listen, recording and saving, the service worker reloading the app with the server off.

## Open questions
- **Not yet tried on the real horn.** The tuner, Listen and recording were checked with synthetic and recorded tones. First things to check in a room: the Sensitivity slider, whether Pro (±5¢) feels too strict, and that Listen doesn't pick up the speakers (use headphones).
- **Kingdom of Predators:** a solo alto line (13 bars) transcribed from the Soprano 2 melody in two screenshots of an ensemble score (bars 33-45), moved down a 4th into alto pitch. Only those bars exist; send the rest of the melody for the full tune. No chord symbols.
- **In a Sentimental Mood, So What:** added as original-page-only entries (the PNGs converted to PDFs, empty charts), so the Tunes tab shows the page via "Original PDF" but has no interactive notation, playback or fingerings for them yet.
- **Chord symbols:** only Autumn Leaves and My One and Only Love came with chords. **Happy Birthday's are my guess at the usual harmonisation** (correct them if your teacher plays something else). Smooth Operator, Naima and Is It a Crime have none, so the chord panel, colours and band don't appear for them; send a lead sheet and they get added.
- iPhone: the silent switch can mute web audio on older iOS (16.4+ is fine); worth a quick check, along with Add to Home Screen.
- Plain copies of `autumn-leaves-easy.pdf` and `smooth-operator-sade.pdf` remain in the first commit's history. The student chose to leave them; a history rewrite + force push would remove them.
- Passphrase strength decides how well the sealed sheet music is protected (see architecture.md §7.6).
- In a Sentimental Mood: no chart yet (add a PDF to `sheet-music/`). The PNGs for the newer tunes stay local; only PDFs and charts are sealed. **Run `npm run seal` and push to publish the tempo/swing fields and any chord changes.**
- Scale songs/descriptions: he'll flag any that feel wrong.
- The chart shows low B♭/B with the right-pinky C key held; check on his horn.

## Roadmap
[roadmap.md](roadmap.md) has the plan for each phase and how the build differed. All seven phases and the quick wins and stretch items are built. Ideas for later, none agreed: chord symbols for the remaining tunes; more grooves (rhythm changes, a bossa form); a real sample kit if the band sounds thin; rhythm checking in Listen; a published tutor export format.

## Rules that must not break
- Everything shown is **written alto pitch**. Concert pitch only when labelled. Written = concert + major 6th (concert C = written A, B♭ = G, G minor = E minor).
- Never generate notes outside `shared/student.ts`'s range in Reading.
- Sound is always **concert pitch** (written − 9 semitones); the tuner converts back (+9). Nothing the microphone hears leaves the device.
