# Handoff: Coach Holt — chat surface

## Overview

A conversational surface for Coach Holt. The athlete taps a bronze mark on any tab screen; it
grows into a sheet over that screen. Holt asks the locked programming questions one at a time,
typed out, and the athlete answers by tapping a chip or typing. The existing engine then
assembles a real program or day, which arrives as an actionable card.

The point of the feature is not that it builds programs — the free wizard already does that,
with the same engine. The point is that it feels like talking to a coach.

**v1 is not an LLM.** There is no free-form understanding. The model of the surface should be
built so a model could later drive the same message list, but v1 runs the locked question set
and calls `assemble()`.

## About the design files

`Coach Holt Chat.dc.html` in this bundle is a **design reference created in HTML** — a
prototype showing intended look and behaviour. It is not production code and should not be
copied into the app.

The task is to **recreate this design in the Forge Legacy codebase** using its existing
environment, components and patterns (`src/constants/tokens.ts`, the wizard's card/chip/button
components, the existing sheet primitives). The prototype's runtime, its state switcher, and
its right-hand notes column are review scaffolding and do not ship.

## Fidelity

**High fidelity.** Colours, type, spacing, radii, shadows and motion in the prototype are
final and are taken from the bound Forge Legacy Visual Foundation. Recreate them exactly,
using the token names the codebase already defines. `PROMPT.md` carries every value.

## Screens / views

There is one screen and one accessory, plus states.

### The bubble (accessory)

- **Purpose** — the entry point; lives on Home, Workouts, Legacy, Squads only.
- **Layout** — 52 × 52 circle, `right: 20px`, 18px above the tab bar. Optional teaser bubble
  above it, right-aligned, max-width 200px.
- **Style** — `coach-holt-mark.png` cover-filled; border `1px solid var(--fl-bronze-border)`;
  shadow `0 0 0 1px rgba(0,0,0,0.5), var(--fl-glow-badge), var(--fl-shadow-float)`.
- **Teaser** — padding `9px 13px`, radius `14px 14px 4px 14px`, `--fl-surface-elevated`,
  border `--fl-bronze-border-subtle`, 12.5px `--fl-text-secondary`. Only shown when there is a
  specific thing to say.

### The sheet (S-1, the main surface)

- **Purpose** — the conversation.
- **Container** — pinned left/right/bottom, top inset 64px so the app stays visible above it.
  Radius `24px 24px 0 0`. Material `--fl-surface-modal`, `border-top: 1px solid
  var(--fl-bronze-border-subtle)`, shadow `0 -18px 44px rgba(0,0,0,0.7), inset 0 1px 0
  rgba(198,156,100,0.22)`. Scrim behind: `rgba(3,5,7,0.66)` + 2px blur.
- **Structure** — grab handle (38 × 4, radius 2, `--fl-charcoal-500`) → header → thread
  (the only scrolling region) → composer.
- **Header** — 36px mark · `COACH HOLT` (11px / 700 / ls 2.4px / `--fl-bronze-primary`) with a
  12.5px `--fl-text-secondary` status line · 36px close. Padding `6px 18px 12px`,
  `border-bottom: 1px solid var(--fl-charcoal-600)`.
- **Thread** — padding `20px 18px 8px`, gap 18px between turns, gap 10px within a turn.

### Message components

| Component | Container | Type | Notes |
|---|---|---|---|
| Holt speaking | none — plain text | 15.5 / 1.55 `--fl-text-primary`, max-width 86% | types at ~42ms/char with an 8×17 bronze caret |
| Athlete message | radius `16 16 4 16`, `rgba(186,146,92,0.11)`, border `rgba(186,146,92,0.30)`, inset top highlight `rgba(198,156,100,0.14)` | 15 / 1.45 | max-width 78%, right-aligned |
| Quick-reply chip | pill, `--fl-charcoal-800`, border `--fl-bronze-border-subtle`, padding `9px 14px` | 13.5 / 500 | pressed → `--fl-bronze-tint` + `--fl-bronze-border` |
| Thinking | none | — | three 6px bronze dots, 1.1s, 0.18s stagger |
| Building | `--fl-surface-recessed`, radius 16, `--fl-shadow-card-soft`, padding `18 18 16` | label 10.5 / 700 / ls 2.2 bronze | four named engine steps + 3px `--fl-bronze-metallic` rail |
| Program card ⭐ | `--fl-surface-elevated`, radius 16, border `--fl-charcoal-500`, `--fl-shadow-card-hero` | title display serif 23 / 600 | dashed `DRAFT — NOT SAVED YET` strip; 3-col stat grid; real volume ribbon |
| Day card | same, `--fl-shadow-card-soft` | title display serif 22 / 600 | exercise rows with tabular-nums prescriptions |
| Edit card | `--fl-surface-elevated`, radius 16 | label 10 / 700 / ls 2.2 bronze | before → after panels + explicit scope choice |
| Refusal ⭐ | `--fl-surface-recessed`, border `--fl-bronze-border-subtle`, inset `rgba(198,156,100,0.16)` | label 10 / 700 / ls 2.4 bronze | bronze, never red; always carries the alternative |
| Exercise pointer | `--fl-surface-card`, radius 12, padding `14 16` | name 15 / 600 | 42px engraved tile + chevron; links out, never restates |
| The stop | `--fl-surface-recessed`, border `--fl-charcoal-500` | label 10 / 700 / ls 2.2 **tertiary** | no bronze, no action |
| App failure | `--fl-charcoal-800`, border `rgba(190,90,76,0.42)` | title 14 / 600 | the only red in the feature |
| Saved | `rgba(186,146,92,0.08)`, border `--fl-bronze-border-subtle` | 14px | written in on return from the Program Builder |

### The composer

Padding `12px 16px 22px`, `border-top: 1px solid var(--fl-charcoal-600)`, background
`--fl-surface-panel`. Pill field (`--fl-surface-recessed`, border `--fl-charcoal-600`, padding
`12px 16px`, 14.5px) + 44px round send. Four states — ready, typing, busy, offline — specified
line by line in `PROMPT.md` §12.

## Interactions & behaviour

- **Open** — bubble scales/fades out as the sheet translates up from 100%, 250ms
  `--fl-ease-out`. Close/collapse is the reverse at 200ms.
- **Drag** — the grab handle drags the sheet down; past ~120px or with velocity it collapses.
  The sheet has one open height; dragging up does nothing.
- **Typing** — Holt's lines type at ~42ms/char, one paragraph per beat with ~450ms between
  paragraphs. Tapping the thread completes the current line instantly.
- **Chips** — tapping a chip is identical to typing that answer: chip row is replaced by an
  athlete bubble, then Holt continues.
- **Scroll** — auto-scroll to bottom on new messages by setting `scrollTop` (never
  `scrollIntoView`). The last message always clears the composer, keyboard up or down.
- **Turn shape** — a Holt turn is text, or text then card. Never card then text; never two
  cards in one turn. Enforce in the message model.
- **Queueing** — messages sent while Holt is working are queued and delivered in order.
- **Reduced motion** — the sweep becomes a static ring, the heat pulse becomes
  `--fl-glow-subtle`, and lines appear complete with only the 280ms fade.
- **Accessibility** — streamed text is not an aria-live region; announce each completed line
  once via a visually-hidden live region. Every card action reachable by label. 44px targets.

## State management

`collapsed · firstRun · idle · composing · thinking · building · streaming · refusal ·
stopped · offline · modelError · rateLimited`

Data the surface holds: the rolling thread (one per athlete, persisted), the current wizard
question and its options, the collected constraint values, the engine's step progress, the
draft program or day returned by `assemble()`, and the server-side exchange count.

Guards: only one `assemble()` in flight; one active program is an invariant — if one is live
and a new build is requested, Holt asks whether to replace or edit rather than starting a
second silently.

The engine runs client-side; the surface must not assume the program arrives over the network.
Rate limiting is server-side; the client only displays it.

## Design tokens

All values come from `reference/foundation.css` (copied into this bundle) and originate in
`src/constants/tokens.ts`. **No new hex is permitted anywhere in this feature.**

- **Bronze** — `--fl-bronze-primary #BF8F4F` · `--fl-bronze-bright #CDA063` ·
  `--fl-bronze-mid #7A6040` · `--fl-bronze-deep #574029` · `--fl-bronze-metallic` (sweep) ·
  `--fl-bronze-fill` (the one sanctioned large fill, primary buttons only)
- **Surfaces** — `--fl-surface-card` · `--fl-surface-elevated` · `--fl-surface-recessed` ·
  `--fl-surface-panel` · `--fl-surface-modal` · `--fl-surface-nav`
- **Text** — `--fl-text-primary #F0EDE8` · `--fl-text-secondary #9E9890` ·
  `--fl-text-tertiary #666060` · `--fl-red-muted #BE5A4C`
- **Borders** — `--fl-charcoal-600 #24242A` · `--fl-charcoal-500 #2E2E35` ·
  `--fl-bronze-border rgba(186,146,92,0.40)` · `--fl-bronze-border-subtle rgba(186,146,92,0.19)`
- **Radius** — 6 / 8 / 10 / 12 / 16 / pill; the sheet's top corners are 24
- **Shadows** — `--fl-shadow-card-soft` · `--fl-shadow-card-hero` · `--fl-shadow-float` ·
  `--fl-glow-badge` · `--fl-glow-subtle` · `--fl-glow-forge`
- **Type** — `--fl-font-display` (Playfair Display) for card titles only;
  `--fl-font-sans` for everything else. Scale in use: 9.5 · 10 · 10.5 · 11 · 11.5 · 12.5 ·
  13.5 · 14 · 14.5 · 15 · 15.5 · 19 · 21 · 22 · 23 · 24
- **Motion** — `--fl-duration-standard 250ms` · `--fl-ease-out cubic-bezier(.16,1,.3,1)`

## Assets

- `assets/coach-holt-mark.png` — the Coach Holt mark, cropped from the PO's supplied artwork
  (the fully-bronze figure variant). Used at 62px (wall), 52px (bubble), 36px (header).
  **Ask the PO for the vector or a transparent-background export before shipping** — the file
  here is a raster crop with the dark plate baked in, adequate for review only.

## Files

- `PROMPT.md` — the line-by-line implementation prompt. Paste this into Claude Code.
- `Coach Holt Chat.dc.html` — the design reference, all 15 states in a switcher.
- `screenshots/` — one PNG per state, in flow order:
  `01-bubble` · `02-first-run` · `03-asking` · `04-composing` · `05-thinking` ·
  `06-building` · `07-program-card` · `08-day-card` · `09-edit-card` · `10-refusal` ·
  `11-explainer` · `12-the-stop` · `13-offline-error` · `14-upgrade-wall` · `15-coming-back`.
  Each frame shows the phone plus the review notes for that state; the notes column is
  documentation and does not ship.
- `assets/coach-holt-mark.png` — the mark.
- `reference/foundation.css` — the token file the design is built against.

## Open questions for the PO

1. The upgrade wall assumes **10 exchanges**. If v1 is only locked questions and not free-form
   conversation, that limit may need to count program builds instead — or not exist.
2. No voice input and no stop-generation control in v1; layout leaves room for a mic.
3. One rolling thread, no history screen. Revisit if conversations get long enough to matter.
