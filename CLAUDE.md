# SAX_APP

Personal alto sax practice app (single user, local-only). Read `docs/status.md` first, then `docs/architecture.md` for how the code works.

## Rules
- All notation in the UI is **written alto pitch** (concert + major 6th). Concert only in data, labelled. Checks: concert C = written A, concert Bb = written G, concert G minor = written E minor.
- Student's written range is C4 to D#6 (`shared/student.ts`). Never generate exercise notes outside it.
- Local only: localhost, SQLite, no auth, no cloud. Ask before adding anything that costs money or leaves the machine.
- Free practice areas, no timed sessions. Show changes to the student before building on them.
- New schema changes go in a new numbered migration; never edit one that has run.
- Keep docs current: update `docs/status.md` at the end of every session, and edit the spec/curriculum when a decision changes them.
