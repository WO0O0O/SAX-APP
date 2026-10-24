# Design System: "The Late Set"

A jazz club after dark, suggested rather than drawn: warm lamp light out of focus, ribbons of red and amber light drifting like smoke, a little grain. **No figures or instruments**: hand-coded figurative SVG looked cheap ("AI-generated") and was rejected on 2026-10-24. If figurative art comes back, it should be a real illustration asset, not hand-written paths.

Notation always sits on a cream "paper" card.

## Principles
1. **Normal sizes.** Body 16px, compact controls. (The first pass used arm's-length sizing and was rejected as oversized.)
2. **Content first.** The backdrop is dimmed (~50%) behind every screen; panels are near-opaque.
3. **One accent per job.** Oxblood/wine = fumbled or destructive. Amber = pressed keys, selection, light. Brass = links and focus.
4. **Motion is ambient.** Slow drifts (25-45s), `transform`/`opacity` only, off for reduced motion, paused when the tab is hidden.

## Colour tokens
Defined in `src/index.css` (`@theme`), used as Tailwind colours (`bg-night`, `text-smoke`, ...).

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0b0706` | Deepest shadow, foreground silhouettes |
| `night` | `#140c09` | Page background |
| `mahogany` | `#2a1810` | Panels on dark |
| `walnut` | `#4a2c1c` | Panel borders, wood |
| `leather` | `#6b3e26` | Secondary surfaces |
| `oxblood` | `#6e0f14` | Curtains, fatigue button, destructive |
| `wine` | `#8f1d22` | Oxblood hover, fumbled notes on paper |
| `ember` | `#e0863a` | Lamp glow, cigar ember, pressed keys, current-block marker |
| `brass` | `#c9a25b` | Primary buttons, focus rings, links |
| `smoke` | `#efe6da` | Text on dark (≈15:1 on `night`) |
| `smoke-dim` | `#a89d91` | Secondary text on dark (≈7:1) |
| `paper` | `#f3e9d6` | Chart card |
| `paper-ink` | `#1a1210` | Notation and text on paper (≈16:1) |
| `lookup` | `#9a5410` | Looked-up notes on paper (≥ 4.5:1) |

## Type
Self-hosted via `@fontsource` (no network at runtime).
- **Display:** DM Serif Display for headings and note names. It has no ♯/♭ glyphs, so `NoteText` sets accidentals in Figtree.
- **UI:** Figtree (variable).
- Caps labels: `caps` (0.75rem) and `caps-xs` (0.68rem) utilities.

## The backdrop (`src/scene/BarScene.tsx`)
One inline SVG, `xMidYMid slice`: room gradient, out-of-focus lamp lights (some pulse), four flowing ribbons (wide soft stroke + narrow core + thin brass highlight) drifting slowly, rising smoke puffs, a static grain filter, a vignette. A `dim` overlay sits on top.

## Components
- **Paper card:** `paper` class. VexFlow notation in ink; tappable notes highlight amber; note names under scale notes; grey = outside his range.
- **Fingering card:** note name (written), concert note it sounds, compact key diagram (pressed keys amber), alternates as small pills, plain-language summary.
- **Fingering diagram:** schematic layout modelled on the reference chart: pearls centre, palm + octave keys top left, left-pinky table right of the left hand, side keys right of the right hand, right-pinky keys bottom left.
- **Circle of fifths dial:** selected key amber; centre shows the key and its major key signature; enharmonic spelling toggle for black-key positions.

## Copy voice
Short, direct, a little dry. No motivational filler (see `overview.md` principles). The club flavour lives in the illustration, not in jokes.
