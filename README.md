# Sax Tutor

Personal alto sax practice app. Runs locally on a Mac: a small Node server plus a SQLite file, no accounts, no cloud. Bound to `127.0.0.1`, so nothing else on the network can reach it.

## Run it

```bash
sax
```

Installs dependencies and rebuilds if needed, starts the server, and opens the browser at http://127.0.0.1:5757. Ctrl+C stops it. Running `sax` again while it's running just opens the browser.

The alias lives in `~/.zshrc`:

```bash
alias sax='"/Users/danwooster/1. DEV/SAX_APP/bin/sax"'
```

On a fresh Mac: install Node 23.6+ (`brew install node`), clone the repo, and add the alias pointing at your clone.

## Development

| Command | What it does |
|---|---|
| `npm run dev` | API server (auto-restart) + Vite with hot reload at http://localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm start` | Build, then serve on port 5757 |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run backup` | Copy the database to `data/backups/` (safe while running) |

Environment: `SAX_PORT` (default 5757), `SAX_DATA_DIR` (default `./data`).

## Layout

- `server/`: Hono API, SQLite via Node's built-in `node:sqlite`, migrations in `server/migrations/` (applied automatically on start).
- `shared/`: music maths used by both server and browser.
- `src/`: React UI.
- `docs/`: start with `status.md`; `architecture.md` explains how it all works and how data is saved.

Your progress lives in `data/sax.db` (not in git). Tune charts and PDFs live in `sheet-music/` (not in git).
