# How Sax Tutor is built

A guide to the code: what each part does, how data is saved, and the parts that are interesting to read. Start with the big picture, then dip into whichever section you need.

---

## 1. The big picture

The same React app runs in two places. **Almost everything happens in the browser**: scales, spelling, transposition, fingerings, sight-reading and drawing the notation are all code in `src/` and `shared/`. The only differences are where the files come from and whether there's a database behind them.

```
 ONLINE COPY (any device)                      ON THE MAC (`sax`)
 https://sax.wo0.dev                           http://127.0.0.1:5757

 git push ─▶ Vercel                            bin/sax ─▶ builds dist/ if needed
            (npm test + build)                            │
                 │                                        ▼
                 ▼                             node server/index.ts (Hono)
          Vercel: static files                  ├─ serves dist/
          (dist/ + public/sealed/*.bin)         ├─ /api/* ─▶ data/sax.db (SQLite)
                 │                              └─ /api/charts, /api/files ─▶ sheet-music/
                 ▼                                        │
 ┌──────────────────────────────────┐          ┌──────────────────────────────────┐
 │ Browser: the React app           │          │ Browser: the same React app      │
 │ • no server: nothing is saved    │          │ • progress + lookups saved via   │
 │ • charts/PDFs decrypted here     │          │   /api to the SQLite file        │
 │   with your passphrase           │          │ • charts/PDFs read from disk     │
 └──────────────────────────────────┘          └──────────────────────────────────┘
```

| | Online copy | On the Mac (`sax`) |
|---|---|---|
| Who can open it | Anyone with the link (the sheet music needs the passphrase) | Only this Mac (the server listens on `127.0.0.1`) |
| Scales, All notes, Reading | ✓ | ✓ |
| Tunes | ✓ after entering the passphrase once per device | ✓ |
| Progress tab, saved milestones, lookup counts | ✗ hidden; nothing is saved | ✓ in `data/sax.db` |
| Updates | Automatically, about a minute after each push to `main` | Next time you run `sax` (it rebuilds if the code changed) |

**How one codebase does both.** [src/mode.ts](../src/mode.ts) sets `HOSTED` from the page's address: on `127.0.0.1` / `localhost` it's the Mac version, anywhere else it's the online copy. So no build settings are needed on any host. [src/api.ts](../src/api.ts) checks `HOSTED` in each function:
- the tune list comes from [shared/tunes.ts](../shared/tunes.ts) instead of the database;
- lookups aren't sent;
- charts and PDFs are fetched encrypted and decrypted in the browser (§7.6);
- the Progress tab and milestone editor are hidden.

**Deploying** is automatic: on every push to `main`, Vercel reads [vercel.json](../vercel.json), runs `npm ci`, then `npm test && npm run build`, and serves `dist/` at https://sax.wo0.dev with a few security headers. A failing test stops the deploy and the previous version stays live. Other branches get their own preview URLs. The domain is a CNAME for `sax` on name.com pointing at Vercel.

## 2. What happens when you type `sax`

`~/.zshrc` has `alias sax='".../SAX_APP/bin/sax"'`. [bin/sax](../bin/sax) is a short zsh script that:

1. **Checks if it's already running.** If something is listening on port 5757, it just opens the browser and exits.
2. **Installs dependencies if needed.** If `node_modules/` is missing, or `package-lock.json` is newer than the last install, it runs `npm ci`.
3. **Builds if needed.** If any file in `src/`, `shared/`, `index.html` or `vite.config.ts` is newer than `dist/index.html`, it runs `npm run build` (Vite bundles the React app into `dist/`).
4. **Opens the browser once the server answers.** A background loop polls `/api/health` every 0.1s, then runs `open`.
5. **Starts the server** with `exec node server/index.ts`. `exec` replaces the script with Node, so Ctrl+C stops the server directly.

Node runs the `.ts` files directly, with no compile step. Since Node 23.6, Node strips TypeScript types on load. Two rules make that work:
- imports use the `.ts` extension (`import { openDb } from './db.ts'`);
- only "erasable" TypeScript is allowed (no `enum`, no `namespace`). `tsconfig.json` enforces that with `erasableSyntaxOnly`.

## 3. Every file, and whether it's needed

All files in git are needed. Here's what each is for.

### Root
| File | Why it exists |
|---|---|
| `package.json` | Dependencies and the npm scripts (`dev`, `build`, `start`, `test`, `typecheck`, `backup`). |
| `package-lock.json` | Exact dependency versions, so `npm ci` installs the same thing every time. Generated; never edit by hand. It's 2,700 lines, which is why the repo looks bigger than it is. |
| `tsconfig.json` | TypeScript settings for both browser and server code. |
| `vite.config.ts` | The build tool config: React + Tailwind plugins, the dev proxy (`/api` → port 5757), and test settings. |
| `index.html` | The single HTML page. It contains just `<div id="root">` and loads `src/main.tsx`. Vite needs it as the entry point. |
| `bin/sax` | The launcher described above. |
| `scripts/backup.ts` | `npm run backup`: copies the database to `data/backups/`. |
| `scripts/seal.ts` | `npm run seal`: encrypts `sheet-music/` into `public/sealed/` for the online copy. |
| `public/sealed/` | The encrypted charts and PDFs (safe in a public repo) plus `manifest.json`. Vite copies `public/` into the build as-is. |
| `vercel.json` | Build settings and security headers for the online copy on Vercel. |
| `.gitignore` | Keeps `node_modules/`, `dist/`, `data/` and `sheet-music/` out of git. |
| `README.md` | How to run it. |
| `CLAUDE.md` | Rules for Claude when working in this repo (written pitch, your range, the two run modes). |

### Folders that aren't in git (generated or personal)
| Folder | What it is | Safe to delete? |
|---|---|---|
| `node_modules/` | Installed dependencies | Yes. `sax` reinstalls them. |
| `dist/` | The built app | Yes. `sax` rebuilds it. |
| `data/` | **Your saved progress** (`sax.db`) and backups | **No.** That's your data (see §5). |
| `sheet-music/` | Your PDFs and transcribed charts | No. Not in git because they're other people's arrangements. |

### `server/` (back end, about 180 lines plus tests)
| File | Role |
|---|---|
| `index.ts` | Starts the web server: opens the DB, mounts the API at `/api`, serves `dist/`, binds to 127.0.0.1. |
| `db.ts` | Opens SQLite and runs migrations. |
| `migrations/*.sql` | The database schema, as a history of changes (see §4). |
| `seed.ts` | Fills a brand-new database with your tune list. |
| `api.ts` | The JSON endpoints. |
| `*.test.ts` | Tests for the database and the API. |

### `shared/` (pure music maths, used by browser and server)
| File | Role |
|---|---|
| `theory.ts` | Note spelling, transposition, MIDI numbers. The most "music theory" file in the repo. |
| `seal.ts` | Encryption for the online copy's sheet music (used by the seal script and the browser). |
| `tunes.ts` | The tune list: seeds the Mac's database and is the online copy's read-only list. |
| `student.ts` | Your comfortable range (C4–D♯6). Change it here when it grows. |

### `src/` (front end)
| Folder / file | Role |
|---|---|
| `main.tsx`, `App.tsx` | Boot React; the top bar and tab switching. |
| `index.css` | Colour tokens, fonts, the `panel` / `caps` styles. |
| `api.ts` | The browser's side of the API: `getTunes`, `updateTune`, `logLookup`, `loadChart`, `openPdf`. Switches behaviour in the online copy. |
| `mode.ts`, `sealed.ts` | Online-copy detection; unlocking and decrypting sealed files. |
| `screens/` | One file per tab: Scales, All notes, Tunes, Reading, Progress. |
| `music/` | Scale library (`scales.ts`), building scales across the horn (`build.ts`), the sight-reading generator (`exercise.ts`), the tune chart format (`chart.ts`), the circle-of-fifths dial and scale picker. |
| `fingering/` | Fingering data for every note (`fingerings.ts`), the key diagram, the fingering card. |
| `notation/` | `Score.tsx` turns notes into sheet music with VexFlow. |
| `tunes/` | The milestone / tempo / no-chart editor. |
| `scene/` | The animated background. |
| `ui/NoteText.tsx` | Sets ♯/♭ in a font that has them (the serif heading font doesn't). |

### `docs/`
| File | For |
|---|---|
| `status.md` | **Start here.** Where things stand, decisions, what's next. |
| `architecture.md` | This file. |
| `sheet-music.md` | How a PDF becomes the interactive chart on the Tunes tab, with diagrams. |
| `roadmap.md` | Agreed future work, in build order, with a plan for each phase. |
| `overview.md` | Who it's for, goals, the 3-month test. |
| `curriculum.md` | The teaching plan the Claude tutor follows. The app doesn't enforce it. |
| `tutor-instructions.md` | Paste into the Claude tutor project. |
| `design.md` | Colours, fonts, the backdrop, component rules. |

---

## 4. The back end

### The web server ([server/index.ts](../server/index.ts))
[Hono](https://hono.dev) is a tiny web framework. The whole server is:

```ts
const db = openDb();      // open data/sax.db, run any new migrations
seed(db);                 // first run only: insert the tune list
const app = new Hono();
app.route('/api', api(db));                         // JSON endpoints
app.use('/*', serveStatic({ root: DIST }));          // the built app
app.get('*', serveStatic({ path: 'dist/index.html' })); // fallback: always serve the page
serve({ fetch: app.fetch, port: 5757, hostname: '127.0.0.1' });
```

In development (`npm run dev`) two processes run instead. Vite serves `src/` with hot reload on port 5173 and forwards `/api` to the Node server on 5757 (the `proxy` setting in `vite.config.ts`). `node --watch` restarts the server whenever a server file changes.

### The database ([server/db.ts](../server/db.ts))
- **SQLite**: the whole database is one file, `data/sax.db`. There's no database server to install or run. It uses Node's built-in `node:sqlite` module, so it needs no npm package and no native compile step.
- **WAL mode** (`PRAGMA journal_mode = WAL`): writes go to `sax.db-wal` first and are merged into `sax.db` later. That makes writes fast and crash-safe, and it's why you see three files in `data/`. Treat them as one unit.
- **Migrations**: the schema lives in numbered `.sql` files. On every start, `openDb()` checks the `schema_migrations` table and runs any file it hasn't run yet, in order, each inside a transaction:

  | File | What it did |
  |---|---|
  | `001_init.sql` | The original schema, including the timed-session tables. |
  | `002_fingering_ladder.sql` | Reset the "unlocked notes" for the old reading ladder. |
  | `003_free_practice.sql` | Dropped everything the timed-session design needed and left the three tables below. |

  **Never edit a migration that has already run.** Your database has recorded it as done and won't run it again. To change the schema, add `004_something.sql`.

### What's in the database
```
tunes            id, title, key_concert, form, status ('active' | 'queued' | 'done'), notes
tune_progress    tune_id → tunes.id, stage (0-5), tempo, no_chart (0/1), updated_at
notes_progress   pitch ('F#5'), midi (78), lookups, first_seen, last_seen
schema_migrations  which migration files have run
```

### The API ([server/api.ts](../server/api.ts))
| Method & path | Does | Used by |
|---|---|---|
| `GET /api/health` | `{ ok: true }` | `bin/sax`, to know when to open the browser |
| `GET /api/tunes` | Tunes joined with their progress | Tunes, Progress |
| `PATCH /api/tunes/:id` | Update `stage` / `tempo` / `no_chart` (validates stage 0–5) | Milestone editor |
| `POST /api/lookup` | `{ midi }`: add 1 to that note's lookup count | Tapping a note in Reading or Tunes |
| `GET /api/notes` | All lookup counts | Progress |
| `GET /api/charts/:slug` | Reads `sheet-music/<slug>.tune.json` | Tunes |
| `GET /api/files/:name` | Serves a PDF from `sheet-music/` | "Original PDF" links |

Two details worth noticing:
- **The lookup is an "upsert"** (insert or update in one statement), so a note's row is created on its first lookup:
  ```sql
  INSERT INTO notes_progress (pitch, midi, lookups, ...) VALUES (?, ?, 1, ...)
  ON CONFLICT (pitch) DO UPDATE SET lookups = lookups + 1, ...
  ```
- **The chart endpoint checks the slug** against `^[a-z0-9-]+$` before building a file path. Without that, a request like `/api/charts/..%2F..%2Fsomething` could read files outside `sheet-music/`. There's a test for it.
- **Guarding a local server from websites.** Listening on 127.0.0.1 stops other devices, but a web page open in your browser can still try to talk to `127.0.0.1:5757`. A middleware in `api.ts` blocks two tricks, both tested:
  - *DNS rebinding:* an attacker's domain that resolves to 127.0.0.1. The API only answers when the `Host` header is 127.0.0.1 or localhost.
  - *Cross-site form posts:* "simple" requests skip the browser's CORS check. Every write must be `application/json`, which forces that check.

---

## 5. How your data is saved

**Only the Mac version saves anything.** The online copy has no server or database: you can use everything there, but milestones and lookups aren't recorded, and the Progress tab is hidden. On the Mac there are three places, each for a different kind of thing.

| What | Where | Lifetime |
|---|---|---|
| Tune milestones, best tempo, "played without a chart", fingering lookups per note | **SQLite**, `data/sax.db` | Permanent; survives restarts, rebuilds and git pulls. |
| Last key + scale you picked; last tune you opened | **Browser localStorage** (`sax.picker.v1`, `sax.tune.v1`) | Convenience only. Clearing browser data just resets your picks. |
| Tune charts and PDFs | **Files**, `sheet-music/` (and encrypted copies in `public/sealed/`) | Read-only for the app; created by transcription. |
| Unlock key for the online copy | **Browser localStorage** on each device (`sax.key.v1`) | Until you clear site data; then enter the passphrase again. |

**Not saved yet:** notes marked "fumbled", and the exercises you've played. Both reset when you leave the page.

### Following one save from tap to disk
Tap a note in Reading or Tunes:
1. The screen's `onTap` colours the note amber and calls `logLookup(note.midi)` ([src/api.ts](../src/api.ts)).
2. That sends `POST /api/lookup {"midi": 78}` to the server. It's fire-and-forget: if the server is down, the tap still works, it just isn't counted.
3. [server/api.ts](../server/api.ts) checks 58 ≤ midi ≤ 90, turns 78 into `'F#5'` with `fromMidi`, and runs the upsert.
4. SQLite writes it to `sax.db-wal`. It's on disk before the response is sent.
5. The Progress tab reads it back via `GET /api/notes`.

Changing a milestone works the same way: [TuneProgress.tsx](../src/tunes/TuneProgress.tsx) updates the screen straight away, then `PATCH`es the server and shows "Saved" (or an error if the server isn't running).

### Backing up, inspecting, resetting
- **Backup:** `npm run backup` writes `data/backups/sax-YYYY-MM-DD-HH-MM.db`. It uses SQLite's `VACUUM INTO`, which makes a consistent copy even while the app is running. Copying the files by hand could catch it halfway through a write.
- **Look inside:** `sqlite3 data/sax.db 'SELECT * FROM tune_progress'`. The `sqlite3` command ships with macOS.
- **Start over:** quit the app and delete `data/`. The next `sax` creates a fresh database, runs the migrations and seeds the tune list.

---

## 6. The front end

- **Screens without a router library.** [App.tsx](../src/App.tsx) keeps the current tab in state and in the URL hash (`#scales`, `#tunes`), so refreshing keeps your place.
- **Lazy loading.** VexFlow, the notation library, is about 390 KB gzipped because it embeds its music fonts. Scales, Tunes and Reading load it with `React.lazy`, so All notes and Progress open without it.
- **The scene stays mounted.** `BarScene` renders once behind everything. Each screen calls `onSceneDim(0.5)` to set how dark the overlay is.
- **Styling** is Tailwind utility classes plus a few named styles in `index.css` (`panel`, `caps`) and the `paper` card in `notation/score.css`.

---

## 7. The interesting parts

### 7.1 Spelling notes properly ([shared/theory.ts](../shared/theory.ts))
A MIDI number (60 = middle C) can't tell F♯ from G♭; they're the same key on a piano. Sheet music needs the right name: F♯ major contains E♯, not F, because each scale step uses the next letter. So notes are stored as **letter + accidental**:

```ts
type Spelling = { letter: number; acc: number }   // F♯ = { letter: 3 (F), acc: +1 }
```

Everything is built on one function. `transpose(s, letterSteps, semitones)` moves the letter by N steps, then picks whatever accidental makes the semitone count come out right:

- **A scale degree** ('♭3', '♯4') is "move up (degree−1) letters and the matching number of semitones". So E harmonic minor's 7th comes out as D♯, never E♭.
- **Alto transposition** is a major 6th: 5 letters and 9 semitones. `writtenToConcert(s) = transpose(s, -5, -9)`. Tests check the rules from the spec: concert C → written A, B♭ → G, G minor → E minor.
- **Octave numbers** follow the letter, not the sound. B♯3 is the same key as C4. `atMidi` handles that with `octave = (midi − naturalPc(letter) − acc) / 12 − 1`.

Some correct spellings look wrong to players. B♭ blues spelled strictly has an F♭. So a degree can offer a fallback (`'b5|#4'`), and [build.ts](../src/music/build.ts) uses the second option when the first gives F♭, C♭, E♯, B♯ or a double accidental. B♭ blues then gets an E.

### 7.2 Fingerings ([src/fingering/fingerings.ts](../src/fingering/fingerings.ts))
- Keyed by **written MIDI number**, because the fingering depends only on which key you press, not on the note's name (C♯ and D♭ finger the same).
- Only the bottom octave (58–73) is typed out by hand. The second octave is generated: **"same fingering + octave key"**, which is also the rule you learn on the horn. The palm-key notes (86–90) are listed separately. That's 33 notes from about 40 lines of data.
- Each note is a list of fingerings: the first is standard, the rest are named alternates (Bis / 1+1 / Side B♭).
- The diagram ([FingeringDiagram.tsx](../src/fingering/FingeringDiagram.tsx)) is a fixed list of key shapes. Each key whose id is in the fingering gets filled amber.
- Source: the TamingTheSaxophone chart in `sheet-music/`. Tests check full coverage and spot-check notes against the chart.

### 7.3 Drawing sheet music ([src/notation/Score.tsx](../src/notation/Score.tsx))
VexFlow draws the notation as SVG. `Score` handles two jobs: scale lines (whole notes, no bars) and real music (time and key signatures, rests, dots, ties, triplets, chords). For each bar it:

1. Creates a `Stave`, adding the clef and key signature at the start of each line and the time signature on the first bar.
2. Turns each item into a `StaveNote`. **Accidentals follow the real notation rule:** a sharp lasts until the end of the bar, and the key signature sets the default. A `Map` tracks "current accidental for this letter in this octave" and only draws a ♯/♭/♮ when the note differs from it.
3. Wraps triplet groups in a `Tuplet` (they must exist before formatting, because they change note lengths), auto-beams eighth notes, and lets `Formatter` space everything.
4. Places chord symbols above the beat they land on, by adding up note lengths across the bar.

After all bars are drawn, **ties** are added. A tie across a line break becomes two half-ties, one at the end of the line and one at the start of the next.

**Tap targets and the bug you found.** Each note gets a transparent `<rect class="note-hit">` on top that calls `onTap`. VexFlow 5 also puts its own invisible rectangle with `pointer-events="auto"` over every note, and those were catching your clicks. My first test called the click handler directly, so it skipped the browser's hit-testing and missed the problem. The fix is two parts:
- CSS turns off pointer events for everything VexFlow draws (`.score svg * { pointer-events: none }`) and turns them back on for `.note-hit`;
- the tap targets are appended last, so they sit on top.

### 7.4 The sight-reading generator ([src/music/exercise.ts](../src/music/exercise.ts))
- **Seeded randomness.** `rng(seed)` is a small pseudo-random generator called mulberry32. The same seed always produces the same exercise, so an exercise can be reproduced (and tested).
- **A random walk through the scale.** It takes every note of the scale inside your range, starts on the tonic nearest G4, and steps up or down 1–3 scale notes at a time, mostly by step. It bounces off the range edges and refuses jumps bigger than a 5th.
- **Rhythm** comes from a list of one-bar patterns that each add up to 4 beats.
- The last note snaps to the nearest tonic, so every exercise ends at home.

Tests run every scale × 25 seeds and check that the notes stay in range, stay in the scale, make 4 beats per bar and end on the tonic.

### 7.5 The tune chart format ([src/music/chart.ts](../src/music/chart.ts))

> The full walkthrough, from PDF to transcription, encryption, rendering and tapping, with diagrams, is in [sheet-music.md](sheet-music.md).
Charts are plain text tokens, one string per bar, so they're easy to transcribe and to read in a diff:

```json
{ "notes": "r/q. D5/8 E5/q F#5/q", "chords": ["D7"] }
{ "notes": "B5/q. B5/8~ B5/h",     "chords": ["Em", "A7@2"] }
```

`r` = rest · `q`/`h`/`w`/`8` = length · `.` = dotted · `~` = tied to the next note · `3` = triplet · `A7@2` = chord starting on beat 2.

A test parses each chart and checks that every bar adds up to exactly 4 beats, which catches most transcription slips.

### 7.6 Sealed sheet music for a public site ([shared/seal.ts](../shared/seal.ts), [scripts/seal.ts](../scripts/seal.ts), [src/sealed.ts](../src/sealed.ts))
The site is public, and the charts are other people's arrangements, so only encrypted copies are published:

- **Key:** your passphrase goes through PBKDF2-SHA256 (250,000 rounds, random salt) to make an AES-256 key. The rounds make guessing passphrases slow.
- **Files:** each file is encrypted with AES-GCM and a fresh random IV. GCM also detects a wrong key or tampering, so decryption fails loudly rather than returning garbage.
- **Manifest:** `manifest.json` holds the salt, the list of files with their SHA-256, and a `check` value (the encrypted text `sax-tutor`). The browser can check a passphrase without downloading any charts, and `npm run seal` only re-encrypts files whose hash changed, which keeps git diffs small.
- **In the browser:** Web Crypto derives the key once, and the **derived key** (not your passphrase) is kept in localStorage. Charts are decrypted to JSON; PDFs to a temporary `blob:` URL opened in a new tab.
- **What's visible publicly:** file names and sizes, nothing else.

**How strong is it?**
- **What's protected:** only the sheet music. Scales, All notes and Reading are public by design.
- **The encryption can't be bypassed.** AES-256-GCM is the same standard used for banking and messaging. Without the key, the files are noise.
- **The passphrase is the weak point.** The sealed files are public, so anyone can download them and guess passphrases offline as fast as their hardware allows. No server is involved, so there's no lockout. The 250,000 PBKDF2 rounds make each guess slow: a high-end GPU manages roughly tens of thousands of guesses per second, not billions.

  | Passphrase | Rough time to guess on one fast GPU |
  |---|---|
  | A single dictionary word, a name, or a short common password | Seconds to minutes |
  | 8 random lowercase letters and digits | Around a year (less with rented GPUs) |
  | 4+ random words (e.g. `velvet-trumpet-orbit-lantern`) or 14+ random characters | Far beyond practical: centuries or more |

- **Other ways in:**
  - someone using a browser where you've already unlocked it (the key is stored there);
  - the **first commit in git history still contains the two original PDFs in plain form**, from before they moved to `sheet-music/`;
  - old sealed files stay in git history, so changing the passphrase doesn't protect copies made with the old one.

In practice this deters casual access to other people's arrangements. It isn't meant for anything truly secret.

### 7.7 The backdrop ([src/scene/BarScene.tsx](../src/scene/BarScene.tsx))
One SVG made of:
- a gradient room;
- soft "bokeh" lights (circles filled with a radial gradient that fades to transparent);
- four flowing ribbons, each a wave path drawn three times (wide and faint, narrow and brighter, a thin brass highlight);
- rising smoke puffs;
- a static grain texture.

It stays cheap to run because animations only change `transform` and `opacity`, which the browser hands to the GPU without recalculating layout. All animation stops when the tab is hidden (`html[data-hidden]`) or when macOS "reduce motion" is on.

---

## 8. Tests

`npm test` runs about 50 tests in under a second:

| File | Checks |
|---|---|
| `shared/theory.test.ts` | Transposition, spelling, octave edge cases, MIDI parsing |
| `src/music/build.test.ts` | Scales across the horn stay in range; blues spelling |
| `src/music/exercise.test.ts` | Every scale × 25 seeds: in range, in scale, 4 beats, ends on tonic |
| `src/music/chart.test.ts` | Chart tokens; every bar of your charts fills its time signature |
| `src/fingering/fingerings.test.ts` | Every note B♭3–F♯6 has a fingering; spot checks against the chart |
| `server/db.test.ts` | Migrations leave exactly the expected tables; seeding runs once |
| `server/api.test.ts` | Tune updates and validation, lookup counting, the path-escape guard |

`npm run typecheck` runs TypeScript over everything.

---

## 9. How to change things

| You want to… | Do this |
|---|---|
| Add a tune chart | Put the PNG or PDF in `sheet-music/` and ask Claude to transcribe it to `sheet-music/<slug>.tune.json`, where the slug is the title in lowercase with dashes. Run `npm test` to check the bar lengths. For the online copy: `npm run seal`, commit `public/sealed/`, push. |
| Add a tune to the list | Add a line to `shared/tunes.ts`. `sax` adds any tune missing from the database at startup (matched by title), so no migration is needed. |
| Add or edit a scale | Add an entry to `SCALES` in `src/music/scales.ts` (degrees + sound / use / songs). It appears everywhere automatically. |
| Widen your range | Change `shared/student.ts`. Grey "stretch" notes and the Reading generator follow it. |
| Save something new | Add a migration (`004_….sql`), an endpoint in `server/api.ts` with a test, and a function in `src/api.ts`. |
| Work on the code | `npm run dev` for hot reload; `npm test` and `npm run typecheck` before committing. |
