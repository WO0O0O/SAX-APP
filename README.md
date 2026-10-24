# Sax Tutor

A personal alto sax practice app: every fingering on the horn, scales from the circle of fifths across the whole range, my tune charts, and generated sight-reading. All notation is in **written alto pitch**.

**Open it:** https://wo0o0o.github.io/SAX-APP/ (any browser: laptop, work laptop, phone)

![Scales: circle of fifths, scale description and notation](docs/images/scales.jpg)

![All notes: a fingering chart for every written note](docs/images/all-notes.jpg)

## What's in it

| Tab | What it does |
|---|---|
| **Scales** | Pick a key on the circle of fifths and one of 21 scales (major and modes, minors, pentatonics, blues, bebop, symmetric). Shows how it sounds, where it's used, songs that use it, the notes on the staff for one octave and the whole horn (low B♭ to high F♯), and a fingering for every note. |
| **All notes** | Every written note from low B♭ to high F♯, with alternate fingerings. |
| **Tunes** | My charts (Autumn Leaves, Smooth Operator) with chord symbols. Tap any note for its fingering, see every fingering the tune uses, open the original PDF. |
| **Reading** | Endless sight-reading exercises in the chosen key and scale. Play first; tap a note only if you need its fingering. |
| **Progress** | Tune milestones and which notes I look up most. *Mac only (see below).* |

## Two ways to run it

| | Online copy | On my Mac (`sax`) |
|---|---|---|
| Where | https://wo0o0o.github.io/SAX-APP/ | http://127.0.0.1:5757 |
| Needs | A browser | Node 23.6+ |
| Scales, All notes, Reading | ✓ | ✓ |
| Tunes | ✓ after entering the passphrase once per device | ✓ |
| Saves progress and lookups | ✗ | ✓ in `data/sax.db` |

The online copy is static files on GitHub Pages, rebuilt automatically on every push to `main`. It has no server or database, so it never saves anything. The Mac version runs a small local server with a SQLite database, and that's where progress is kept.

### Sheet music in the online copy
The charts and PDFs are other people's arrangements, so they're not in the repo in readable form. They're published **encrypted**, and the site asks for a passphrase on the Tunes tab (once per device). To update them after adding or changing a chart:

```bash
npm run seal          # encrypts sheet-music/ into public/sealed/ (asks for the passphrase)
git add public/sealed && git commit -m "Update sheet music" && git push
```

## Running it on the Mac

```bash
sax
```

This installs and rebuilds if needed, starts the server and opens the browser. Ctrl+C stops it. It's an alias in `~/.zshrc`:

```bash
alias sax='"/Users/danwooster/1. DEV/SAX_APP/bin/sax"'
```

On a fresh Mac: `brew install node`, clone the repo, add the alias. Then put the PDFs and `*.tune.json` charts in `sheet-music/` (they're not in git).

## Development

| Command | What it does |
|---|---|
| `npm run dev` | API server (auto-restart) + Vite with hot reload at http://localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm start` | Build, then serve on port 5757 |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run seal` | Encrypt sheet music for the online copy |
| `npm run backup` | Copy the database to `data/backups/` (safe while running) |

Environment: `SAX_PORT` (default 5757), `SAX_DATA_DIR` (default `./data`).

## Layout

- `src/`: the React app (everything you see, plus the music theory and fingerings).
- `shared/`: code used by both browser and server (note spelling, transposition, encryption, tune list).
- `server/`: the Mac-only API and SQLite database.
- `public/sealed/`: encrypted sheet music for the online copy.
- `docs/`: start with [status.md](docs/status.md); [architecture.md](docs/architecture.md) explains how it all works.

Not in git: `data/` (my progress), `sheet-music/` (PDFs and charts), `node_modules/`, `dist/`.
