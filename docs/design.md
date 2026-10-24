# Design System: "The Late Set"

The app is a small jazz club after dark. A band plays under one warm spotlight; tables of people with drinks and cigars lean in to listen; smoke hangs in the light. Illustration is **stylised, flat and fluid** (elongated mid-century figures, curved shapes, no realism). Colours are the room's: black, brown, oxblood red, lamp amber, brass, and smoke white.

The room is the frame; the work happens on paper. **Notation always sits on a cream "chart" card** that reads like sheet music on a music stand, with nothing decorative on or over it.

## Principles
1. **Readable at arm's length.** Laptop on a stand ~70-80 cm away. Body text ≥ 20px, staff spaces ≥ 18px, timer ≥ 160px, buttons ≥ 56px tall.
2. **The scene breathes with the session.** Rest and idle screens: scene full. Work screens: scene dimmed and slowed behind the content.
3. **One accent per job.** Oxblood = stop / fatigue / fumbled. Amber = light, attention, "pressed key". Brass = interactive focus and primary actions.
4. **Motion is ambient, never busy.** Slow loops (6-30s), `transform` and `opacity` only. Off for `prefers-reduced-motion`, paused when the tab is hidden.

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
- **Display:** DM Serif Display. Headings, timer numerals, block names. Club-sign elegance.
- **UI:** Figtree (variable). Body, labels, buttons.
- Scale: 20 / 24 / 32 / 44 / 64 / 180 (timer). Caps labels: Figtree 600, tracking 0.18em, 16-18px.
- Timer digits sit in fixed-width cells so they don't jitter.

## The scene (`src/scene/BarScene.tsx`)
One inline SVG, `viewBox 0 0 1600 900`, `xMidYMax slice` so it fills any window. Layers back to front:

1. **Wall:** near-black brown radial gradient, two wall sconces with amber glow.
2. **Stage:** oxblood curtain with fluid folds, a low riser.
3. **Spotlight:** cream cone at very low opacity, slow flicker.
4. **Band** (rim-lit silhouettes): pianist at a grand, upright bassist, drummer with cymbals, saxophonist front and centre. Each sways on its own slow loop.
5. **Tables:** two or three tables, each with a red-shaded lamp, glasses and seated figures seen from behind, facing the stage. One figure with a cigar (pulsing ember, rising smoke); one pair leaning in to laugh.
6. **Smoke:** soft cream ellipses drifting upward through the light.
7. **Foreground:** dark chair backs and a shoulder along the bottom edge, plus a vignette.

Modes: `full` (rest / idle) and `dim` (work screens: dark overlay ~70%, ambient loops slowed). Animations pause via `html[data-hidden]` when the tab is hidden; reduced motion disables them.

Budget: scene SVG under ~25 KB source, no filters on animated elements, no raster images.

## Components
- **Chart card:** `paper` background, soft drop shadow, 12px radius, generous padding. Title in DM Serif, stage label in caps. VexFlow renders in `paper-ink`, scaled so staff spaces are ~20px. Two bars per line.
- **Notes on the card** are tap targets. Tap = "check fingering" (logs a lookup, note turns `lookup` amber). In "mark fumbled" mode, tap turns the note `wine`.
- **Fingering diagram:** dark mahogany panel, schematic alto key layout with every key labelled. Pressed keys fill `ember` with a faint glow; open keys are thin smoke outlines.
- **Timer:** huge DM Serif numerals, block name above, lip-load chip (low / med / high), block rail below showing done / current / upcoming.
- **Buttons:** pill shape, ≥ 56px tall. Primary = brass fill + ink text. Secondary = smoke outline. **Fatigue** = oxblood fill, always visible during playing blocks.
- **Focus:** 3px brass ring, offset 3px. Every action has a keyboard shortcut shown as a small keycap.

## Copy voice
Short, direct, a little dry. No motivational filler (see `overview.md` principles). The club flavour lives in the illustration, not in jokes.
