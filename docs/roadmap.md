# Roadmap

**Everything below was built on 2026-11-01.** The plans are kept as written, and each phase ends with an **As built** note saying what was delivered and where it differs from the plan. Where each part lives: [architecture.md](architecture.md); how it works: [sound-and-tuner.md](sound-and-tuner.md); how to use it: [guide.md](guide.md).

| Order | Phase | In one line | Status |
|---|---|---|---|
| 1 | [Fingering quiz](#1-fingering-quiz) | See a note → press the keys (and the reverse) | Built |
| 2 | [Chord tones from your tunes](#2-chord-tones-from-your-tunes) | Tap a chord symbol → its arpeggio, guide tones and fingerings | Built |
| 3 | [Sound](#3-sound) | Hear notes, scales and whole tunes, with a moving cursor | Built |
| 4 | [Backing tracks](#4-backing-tracks) | Chords, bass and drums for your tunes, any key and tempo | Built |
| 5 | [Drone and metronome](#5-drone-and-metronome) | Held reference note and click, ported from Blue Note Tuner | Built |
| 6 | [Ear training](#6-ear-training) | Hear it, name it, play it back | Built |
| 7 | [Tuner](#7-tuner) | Browser port of your iOS Blue Note Tuner, plus long tones, intonation stats, and Reading that listens | Built |
| Any time | [Quick wins](#quick-wins) | Transpose tunes, fade note names, finish Reading | Built |
| Stretch | [Phone app and later](#stretch) | Install on your phone, record and self-listen, tutor export | Built |

**Ground rules for every phase**
- Everything shown is **written alto pitch**. Anything that makes sound or listens converts to **concert pitch** under the hood (written − 9 semitones).
- Every feature must work in the **online copy** (no server). Anything that saves data saves on the **Mac only**; online it lasts for the visit.
- New database tables go in a new numbered migration. Tests for the logic, a screenshot check for the UI.

---

## 1. Fingering quiz

**Why:** fingerings are the main gap. Tapping to look one up is passive; recalling one under a little pressure is what makes it stick. It also works away from the horn: on your phone, in a lunch break.

**What you'll see:** a new **Quiz** tab with three modes:
- **Note → keys:** a note appears on the staff. You tap the keys on the fingering diagram, then **Check**. Any valid fingering counts, alternates included (e.g. B♭ by bis, 1+1 or side).
- **Keys → note:** a fingering diagram appears; pick the note from four buttons.
- **Mixed:** alternates between the two.

A round is 20 questions. You get instant right/wrong feedback, the correct fingering if you missed, a streak counter, and at the end a summary: your accuracy and the notes you missed, each with its fingering card.

**Which notes:** pick a pool:
- my range (C4–D♯6);
- the whole horn;
- the current scale from the Scales picker;
- every note in a tune.

The quiz **leans toward your weak notes**: ones you've missed recently, and on the Mac, the ones with the most lookups. A missed note comes back within the next few questions (light spaced repetition).

**How it works**
- `FingeringDiagram` gets an interactive mode: each key becomes a toggle button (keyboard- and screen-reader-friendly).
- Checking an answer: the keys you pressed must exactly match one of that note's fingerings in `FINGERINGS`. A missing octave key is a wrong answer, because it's a different note.
- New `src/music/quiz.ts`: picks questions (weighted random, seeded so it's testable) and builds the four wrong options for keys → note from nearby notes, so it isn't trivially easy.
- Saving (Mac): migration `004_quiz.sql` adds `quiz_answers (midi, mode, correct, answered_at)` and `POST /api/quiz`. Progress gets an "accuracy per note" view next to lookups. Online: kept in memory for the visit.

**Tests:** answer checking (exact match, alternates accepted, a missing octave key rejected); weighting favours missed notes; wrong options are never the right answer; the API stores results.

**Done when:** a 20-question round works in both modes on laptop and phone, missed notes come back, and on the Mac, Progress shows quiz accuracy per note.

**As built:** all as planned. Quiz tab with the three modes, four note pools, 20-question rounds, weighting by misses and lookups, misses return after three questions, "practise the missed notes", saved accuracy (migration `004_quiz.sql`, `POST /api/quiz`, Progress). The fingering diagram's keys are real buttons (keyboard-friendly). Tests: [quiz.test.ts](../src/music/quiz.test.ts).

---

## 2. Chord tones from your tunes

**Why:** improvising over changes starts with knowing each chord's notes, especially the 3rd and 7th (the guide tones that define the chord). Theory you learn on the tunes you're actually playing sticks.

**What you'll see:** on the Tunes chart, chord symbols become tappable. Tap `Am7` and a panel opens with:
- the chord's **notes, spelled and labelled**: A (root), C (♭3), E (5), G (♭7). The **guide tones (3rd and 7th) are highlighted**;
- the **arpeggio on the staff**, one octave, plus across your range, with the note names;
- a **fingering card** for each chord tone;
- **which scale fits**, with a link that opens it in Scales: m7 → Dorian, 7 → Mixolydian, maj7 → Major or Lydian, ø7 → Locrian, 7(♭9) → half-whole diminished or harmonic minor of the next chord;
- the **guide-tone line to the next chord**: the nearest 3rd or 7th to move to (e.g. Am7's G → D7's F♯). Smooth voice leading is the backbone of improvised lines.

A **"Colour chord tones"** toggle on the chart colours each melody note by its role over the current chord (root, 3rd, 5th, 7th, or not a chord tone). It shows how the melody of Autumn Leaves is built.

**How it works**
- New `shared/chords.ts`: parses chord symbols as written in the charts (`Am7`, `D7`, `Gmaj7`, `F♯ø7`, `B7(♭9)`, `Em`, `A7`, `Dm7`, `G7`, `Cmaj7`, plus `6`, `m6`, `dim7`, `sus4`, `7(♯9)`, `7(♯11)`) into root + chord degrees. It reuses `spellDegree`, so spellings are right (F♯ø7 = F♯ A C E).
- Guide-tone line: for each chord pair, choose the 3rd or 7th of the next chord closest to the current one, within your range.
- The "which scale" map lives next to the chord qualities, so Scales and Chords stay consistent.
- **Smooth Operator needs chord symbols added to its chart first.** The PDF has none; add them from a lead sheet.

**Tests:** every chord symbol in both charts parses and spells correctly; guide-tone lines are the smallest moves; colouring is right over a few known bars.

**Done when:** every chord in Autumn Leaves opens a correct panel, the guide-tone line plays through the whole tune, and colouring works.

**As built:** the chord panel (spelled tones, guide tones, arpeggio and range on the staff, fingerings, fitting scales with "Open in Scales", the move to the next chord, and **play arpeggio / chord**), "Colour chord tones" with a legend, and `shared/chords.ts` with a test that parses every chord in the tunes. The whole-tune **guide-tone line** has its own panel under the chart (staff, a chip per chord, and "Play the line"). Smooth Operator, Naima and Is It a Crime still have no chord symbols (needs lead sheets).

---

## 3. Sound

**Why:** it's the foundation for everything after it: learning tunes by ear, checking your reading, the drone, backing tracks and ear training.

**What you'll see**
- **Tap to hear:** any note on a staff or fingering card plays (a short tap plays and still shows the fingering).
- **Scales:** a **Play** button (up and down) with a tempo slider.
- **Chords:** play the arpeggio, or the chord held.
- **Tunes:** **Play** the chart at any tempo (40–220 bpm) with a **cursor moving through the notes**, a count-in, a **loop** for any bars you select, and a **swing** toggle for eighth notes. Plus "play from here" on any note.
- A **voice** choice: a warm reedy synth (like your Blue Note Tuner drone) or a soft piano tone, which is clearer for theory and ear work.

**How it works**
- **[Tone.js](https://tonejs.github.io)**, lazy-loaded like VexFlow so it doesn't slow the first page load. It gives sample-accurate timing (a clock that runs in the audio engine, not `setTimeout`), a transport with tempo, loop and swing, and synths. The backing tracks in phase 4 need all of that, so it's worth adding now.
- **Voices** are synthesised, with no sample files to host: sawtooth → low-pass filter (~600 Hz, the same recipe as `DroneConductor.swift`) with a soft attack for the reed; a mellow piano-ish tone for the other. Real sampled sax or piano can come later if wanted.
- **Pitch:** always concert. Written midi − 9 → frequency (A4 = 440 Hz). Written C5 sounds as concert E♭4 = 311.13 Hz.
- **Chart → sound:** turn `ScoreItem`s into timed events using `beatsOf` (dots and triplets included). **Tied notes become one held note.** Rests are gaps. The same event list drives the cursor, so sound and highlight can't drift apart.
- New files: `src/audio/engine.ts` (start/resume, master volume), `voices.ts`, `player.ts` (chart/scale → events → Tone transport).
- **Browser rules:** audio can only start after a tap, so the first Play unlocks it. **On iPhone, the silent switch mutes web audio**; the app shows a hint the first time.

**Tests:** written → concert → Hz; chart → events (ties merged, triplets timed, total length = bars × 4 beats); the cursor index at a given time.

**Done when:** tapping notes plays them, any scale plays, and Autumn Leaves plays at any tempo with a cursor, loop and swing, on laptop and iPhone.

**As built:** tap-to-hear on the staff and fingering cards, Play on scales (up and down), on every tune and on Reading exercises, with tempo 40–220, count-in, click, loop bars, light/full swing, reed or piano, play-from-selected-note, a cursor that moves without redrawing, and a Silent follow-along mode. **Differences:** built on the Web Audio API with a small look-ahead scheduler instead of Tone.js (same timing, no dependency, testable on a fake clock); the first sound is unlocked by the first tap, and `navigator.audioSession` is set so the iPhone silent switch doesn't mute it (Safari 16.4+). Not yet heard on an iPhone.

---

## 4. Backing tracks

**What you'll see:** a **Play along** mode on Tunes, and a **Backing** tab for practice grooves:
- **Tune presets:** Autumn Leaves (swing), Smooth Operator (once its chords exist; straight-8 groove), 12-bar blues in any key, So What (modal vamp), minor ii–V–i loops.
- **Controls:** tempo, key (transposes everything), loop, count-in, melody on/off (hear it first, then play it yourself), and a **speed trainer** that adds 4 bpm after every N clean loops.
- **Chord symbols in written pitch**, highlighted in time as the band plays.

**How it works**
- **Chords** come from the chart (written), converted to concert pitch for playback.
- **Bass:** a walking line generated from chord tones: root on beat 1, chord tones, then a chromatic or scale approach note into the next chord. It's seeded, so a loop is the same each time unless you re-roll.
- **Comping:** shell voicings (root + 3rd + 7th) on beats 2 and 4, with a little rhythmic variation.
- **Drums:** synthesised (filtered noise for ride and hi-hat, a low thump for kick). A swing ride pattern; straight-8 and bossa patterns for other styles. If synthesis sounds too thin, a small CC0 sample kit is the fallback.
- **Loudness balance** so you can hear yourself over it: band at about −12 dB, melody at about −18 dB.

**Done when:** you can play Autumn Leaves and a blues over a believable band, in any key and tempo, with the speed trainer.

**As built:** a band for any tune with chord symbols (swing, ballad, bossa, straight eights; walking bass, shell-voicing piano, synthesised drums), Melody on/off, New take, loop and the **speed trainer** (+4 bpm every N loops). A **Backing** tab with six practice grooves in any key (12-bar blues, minor blues, ii–V–I, ii–V–i, I–vi–ii–V turnaround, So What form), links to the scales to play over each, and the sounding bar highlighted. Differences: the band sits at 75% of the melody's level rather than fixed dB figures; a sample kit was not needed.

---

## 5. Drone and metronome

Ported from Blue Note Tuner (`DroneConductor.swift`, `MetronomeConductor.swift`). A **Tools** panel available from any tab:

- **Drone:** choose a written root note (the app plays its concert pitch). Same sound as the iOS app (sawtooth through a 600 Hz low-pass), with an optional fifth above and a volume control. For long tones, intonation and hearing scales against a tonic.
- **Metronome:** tap tempo, accent on beat 1, subdivisions (eighths, triplets), swing, a visual flash and keyboard shortcuts (space to start/stop). The click is synthesised the same way as the iOS app (a short decaying sine: 1800 Hz on the downbeat, 900 Hz otherwise).
- Both keep running while you switch tabs, so you can read a tune with the drone on.

**Done when:** both work together and alongside tune playback, on laptop and phone.

**As built:** the **Tools** panel from the top bar: drone (written note and octave, shows what sounds, optional fifth, volume) and metronome (tap tempo, 2–7 beats, quarters/eighths/triplets, swing, flashing beat, space to start/stop), kept in a module outside React so they run across tabs. Same sounds as the iOS app (sawtooth through a 600 Hz low-pass; 1800/900 Hz click).

---

## 6. Ear training

Your ear is a strength, so this plays to it.

- **Intervals:** the app plays two notes; you name the interval (2nds to octave, up/down/together). Starts with a few, adds more as you get them right.
- **Call and response:** the app plays a short phrase (2–4 bars, from the current scale, using the Reading generator). You play it back on the horn, then reveal the notation to check. Once the tuner exists (phase 7), it can check you automatically.
- **Chord quality:** major, minor, dominant 7, minor 7, half-diminished: hear it, name it.
- **Tune by ear:** play the first bars of one of your tunes with the notation hidden; you work it out on the horn, then reveal.

**Done when:** each mode runs a 10-question round with feedback; call-and-response uses any scale.

**As built:** the Ear tab with all four modes. Intervals and chord quality start with three items and add one per item learned (6+ answers at 80%); answers are saved on the Mac (`005_ear.sql`). Call and response and tune by ear use the playback controls, then "Reveal notation" and a self-check. The Reading tab's Listen mode (below) can check call-and-response-style playing automatically; the Ear tab's own phrase check is still by self-report.

---

## 7. Tuner

### Can a browser do a good tuner? Yes.
Your iOS app uses AudioKit's `PitchTap` (YIN algorithm) on the mic. Browsers can do the same thing just as well:

| iOS Blue Note Tuner | Browser version |
|---|---|
| `AVAudioSession` mode `.measurement` (turns off Apple's voice processing) | `getUserMedia` with `echoCancellation`, `noiseSuppression` and `autoGainControl` all **off**: the same idea |
| AudioKit `PitchTap` (YIN) | An `AudioWorklet` feeding a pitch detector: **McLeod Pitch Method** (the `pitchy` library, ~5 KB, MIT) or a direct port of YIN |
| Amplitude gate `amp > 0.05` | The same, on the signal's RMS level |
| Hz → MIDI → cents, + alto offset | The same maths, then spelled by the app's own theory code |

- **Accuracy:** a sax's fundamental is concert D♭3–A5 (about 138–880 Hz). A ~2048-sample window at 48 kHz (about 43 ms) resolves that to within a cent or two on a steady tone, with about 50 ms of latency, which feels instant.
- **Where it works:** Chrome, Safari and Firefox on Mac, the work laptop (if IT allows mic access) and iPhone Safari. It needs HTTPS, which sax.wo0.dev and localhost both provide.
- **Privacy:** the audio is analysed in the browser and never leaves the device; nothing is recorded or uploaded.
- **Sax-specific care:**
  - the sax's strong overtones can trick detectors into octave errors. Use MPM's clarity threshold plus a short median filter over recent readings;
  - smooth the needle so it doesn't jitter;
  - make A4 reference adjustable (438–445 Hz, default 440).

### What you'll see (a Tuner tab, ported from Blue Note Tuner)
- **Tuner:** big written note name (with the concert note small underneath), a cents gauge (−50 to +50) with an in-tune zone. **Casual ±12 / Pro ±5 cents**, as in the iOS app.
- **Fletcher mode:** your *Whiplash* feedback lines, as an opt-in toggle, of course.
- **Long-tone endurance** (from `LongToneView.swift`): a timer runs while you hold a note in tune and resets if you drift out of tolerance for more than 0.3 s. A pressure bar fills over 30 s. Your best time per note is saved on the Mac.
- **Intonation tendencies** (from `StatsConductor.swift`): average cents sharp or flat per written note, built up as you play, so you can see e.g. that your palm keys run sharp. Saved on the Mac (migration adds an `intonation` table); session-only online.
- **Reading that listens** (from `SightReadingConductor.swift`'s call and response): in Reading, an optional **Listen** mode hears each note you play. It moves on when you hit the right one and marks fumbles automatically, so you no longer have to tap them. Ear training's call and response can use it too.

> This deliberately reverses the original spec's "no pitch detection" rule. Your iOS app shows it works well for single notes, and it's the most useful practice feedback the app could give.

**Tests:** the detector is a pure function on a buffer, so it's tested with synthetic signals: sine and harmonic-rich sawtooth tones at known frequencies across the range, including low B♭ (concert D♭3, 138.59 Hz) and high F♯ (concert A5, 880 Hz), plus detuned ones (±10 cents). Hz → written note and cents. The gate rejects silence and noise.

**Done when:** a steady sax tone reads within ±2 cents without octave jumps, all four features work, and it runs on the Mac, the work laptop and iPhone.

**As built:** the Tuner tab (written note, concert note and Hz, ±50¢ gauge, casual ±12¢ / pro ±5¢, A4 438–445, sensitivity, Fletcher mode as an opt-in), **long tones** (0.3 s grace, 30 s bar, best per note saved), **intonation tendencies** (saved as sums; shown in the tuner and Progress), and **Reading that listens** (marks fumbles itself, saves the result, weights later exercises). Migration `006_tuner_reading.sql`. **Differences:** the McLeod detector is written in the repo (`src/tuner/detect.ts`) instead of the `pitchy` library, and an `AnalyserNode` replaces the AudioWorklet; `vercel.json` now allows the microphone for the site (`microphone=(self)`). **Verified** with synthetic tones across the whole horn (within 1–2 cents, no octave errors even when the 2nd harmonic is louder) and end to end in a browser with a fake microphone playing a recording. **Not yet verified on a real horn, the work laptop or iPhone.**

---

## Quick wins

Small, independent, any time:

- **Transpose a tune:** a key picker on Tunes plays and shows Autumn Leaves in all 12 keys. It reuses the spelling and transposition code and the key signatures. Notes that land outside your range are flagged.
- **Fade the note names:** on the Mac, each note name under the chart gets fainter as your lookups for that note drop and your quiz accuracy rises. Online, a slider controls the fade by hand.
- **Finish Reading:** save attempts and fumbles (Mac), weight new exercises toward weak notes, a silent-fingering mode, optional key signatures instead of written-out accidentals.

**As built:** all three. Transpose is the "Key" menu on Tunes (−6 to +5 semitones, spelling and chords follow, notes outside your range greyed). Names fade on the Mac by quiz accuracy and lookups, and by a slider online. Reading saves results, weights toward fumbled and looked-up notes, has Silent follow-along and a Key signature option, and Listen.

---

## Stretch

- **Phone app (PWA):** add sax.wo0.dev to the home screen and it opens full-screen like an app and **works offline**, including the unlocked sheet music. It needs a web app manifest, icons and a service worker (`vite-plugin-pwa`). Mic, sound and the tuner all work in an installed web app on iPhone, so there's no App Store and no Xcode. The earlier phases already make the layout phone-friendly; this step adds install and offline.
- **Record and self-listen:** record a take in the browser, play it back next to an earlier one, and answer a few self-listen questions. Kept on the device; on the Mac, saved to disk.
- **Practice export for the Claude tutor:** a markdown summary of the last week (tunes, lookups, quiz accuracy, intonation) in the format from `tutor-instructions.md`, ready to paste.

**As built:** all three. **Phone app:** a manifest, icons and a small hand-written service worker (instead of `vite-plugin-pwa`) that downloads the whole build, sealed sheet music included, so the online copy works offline after the first visit and can be added to the home screen. **Record:** the Record tab: takes, the four self-listen questions with 1–5 ratings and a line each, compare two takes; saved on the Mac in `data/recordings/` (`007_recordings.sql`), kept in the tab online with a Download button. **Tutor export:** Progress → "For your tutor" (7, 14 or 30 days, copies to the clipboard); it includes quiz weak spots, lookups, reading fumbles, long tones, intonation outliers, ear results and the self-listen ratings.
