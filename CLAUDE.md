# SAX_APP

Personal alto sax practice app (single user, local-only). Read `docs/status.md` first, then `docs/overview.md`, `docs/app-spec.md`, `docs/plan.md`, `docs/curriculum.md`.

## Rules
- All notation in the UI is **written alto pitch** (concert + major 6th). Concert only in data, labelled. Checks: concert C = written A, concert Bb = written G, concert G minor = written E minor.
- Student's written range is C4 to D#6. Never generate notes outside it.
- Local only: localhost, SQLite, no auth, no cloud. Ask before adding anything that costs money or leaves the machine.
- Build phase by phase per `docs/plan.md`; the student signs off each phase.
- Keep docs current: update `docs/status.md` at the end of every session, and edit the spec/curriculum when a decision changes them.
