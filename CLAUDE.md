# SAX_APP

Personal alto sax practice app (single user). Online copy on GitHub Pages; progress saved only on the Mac. Read `docs/status.md` first, then `docs/architecture.md` for how the code works.

## Rules
- All notation in the UI is **written alto pitch** (concert + major 6th). Concert only in data, labelled. Checks: concert C = written A, concert Bb = written G, concert G minor = written E minor.
- Student's written range is C4 to D#6 (`shared/student.ts`). Never generate exercise notes outside it.
- Saved data is Mac-only (localhost + SQLite). The online copy (GitHub Pages, `VITE_HOSTED`) must work with no server: check both modes when changing `src/api.ts` or screens. Sheet music is only ever published encrypted (`npm run seal`). Ask before adding anything that costs money.
- Free practice areas, no timed sessions. Show changes to the student before building on them.
- New schema changes go in a new numbered migration; never edit one that has run.
- Keep docs current: update `docs/status.md` at the end of every session, and edit the spec/curriculum when a decision changes them.
