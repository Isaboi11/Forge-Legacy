# Coach Holt v2 — style spec

Source of truth: `Coach Holt Chat v2.dc.html`. Every value below is literal from that file.
Design system: **Forge Legacy Visual Foundation** (`ForgeLegacyVisualFoundation_5368b2`), tokens at
`_ds/forge-legacy-use-this-5368b220-9e78-4104-bd8b-969c39e84346/tokens/foundation.css`.

Two rules that govern everything else:

1. Bronze is **accent only** — eyebrows, icons, rims, tints, one forged fill (the send button). Never a large flat fill.
2. Holt's speech is **open on the background**. It never gets a bubble. Only the athlete's own turns get a container.

---

## 0 · Literal values referenced

| Name | Value |
| --- | --- |
| `--fl-bronze-primary` | `#BF8F4F` |
| `--fl-bronze-bright` | `#CDA063` |
| `--fl-bronze-mid` | `#7A6040` |
| `--fl-bronze-border` | `rgba(186,146,92,0.40)` |
| `--fl-bronze-border-subtle` | `rgba(186,146,92,0.19)` |
| `--fl-charcoal-600` | `#24242A` |
| `--fl-charcoal-500` | `#2E2E35` |
| `--fl-surface-modal` | `linear-gradient(180deg, #232329 0%, #1E1E23 100%)` |
| `--fl-surface-elevated` | `linear-gradient(180deg, #1F2024 0%, var(--fl-charcoal-700) 100%)` |
| `--fl-surface-recessed` | `linear-gradient(180deg, var(--fl-base) 0%, #0C0C0E 100%)` |
| `--fl-surface-panel` | `#131517` |
| `--fl-text-primary` | `#F0EDE8` |
| `--fl-text-secondary` | `#A09A94` (gray-400) |
| `--fl-text-tertiary` | `#666060` |
| `--fl-green-muted` | `#5A9E68` |
| `--fl-font-display` | `"Playfair Display", Georgia, serif` |
| `--fl-font-sans` | system sans stack |

Recurring literals that are **not** tokens (use these exact values):

- Unselected control surface: `rgba(255,255,255,0.032)` fill, `rgba(255,255,255,0.075)` border.
- Selected control surface: `rgba(186,146,92,0.13)` fill, `var(--fl-bronze-border)` border.
- Capability-card wash (BUILD only): `rgba(198,156,100,0.045)`, hover `rgba(198,156,100,0.08)`.
- Generic card hover: fill `rgba(198,156,100,0.055)–0.06`, border `var(--fl-bronze-border-subtle)`.

---

## 1 · Sheet

- Presented over the app: scrim `rgba(3,5,7,0.72)`, no blur.
- Sheet inset from the top of the device by `50px`; flush left/right/bottom.
- `border-radius: 22px 22px 0 0`.
- Background `var(--fl-surface-modal)`. Top border `1px solid var(--fl-bronze-border-subtle)`.
- Shadow: `0 -18px 44px rgba(0,0,0,0.7), inset 0 1px 0 rgba(198,156,100,0.22)`.
- `overflow: hidden`. Column flex: grabber → header → scroll body → composer.
- **Warm wash** (behind the top third only, non-interactive, `position:absolute; top:0; height:300px`):
  `radial-gradient(105% 100% at 14% 0%, rgba(198,156,100,0.06) 0%, rgba(198,156,100,0.024) 40%, rgba(198,156,100,0) 76%)`.
  Nothing below 300px is warmed. This is the only atmospheric layer.
- Grabber: `38 × 4`, radius `2`, `var(--fl-charcoal-500)`, padding `8px 0 2px`, centered.
- Horizontal padding for the scroll body and all content: **16px**. Composer uses 14px.

## 2 · Header

Row: `padding: 8px 16px 16px`, `gap: 14px`, `align-items: center`.

- **Medallion** — `52 × 52`, `border-radius: 50%`, `overflow:hidden`, `1px solid var(--fl-bronze-border)`,
  `box-shadow: var(--fl-glow-badge)` (= `0 0 16px rgba(186,146,92,0.28)`). Image `assets/coach-holt-mark.png`, `object-fit: cover`.
- **Name** — `COACH HOLT`, `var(--fl-font-display)`, `21px / 600`, `letter-spacing: 1.4px`, color `var(--fl-bronze-primary)`. Set in caps as authored text.
- **Status line** — `9.5px / 700`, `letter-spacing: 2.2px`, `var(--fl-text-tertiary)`, `gap: 7px`:
  `YOUR COACH` · dot · `READY`. Dot is `5 × 5`, `50%`, `var(--fl-green-muted)`, `box-shadow: 0 0 6px rgba(90,158,104,0.55)`.
  Green is used **only** here, as a liveness indicator.
- Name/status stack `gap: 5px`.
- **Two header actions**, each a vertical stack (`gap: 5px`) of a `20 × 20` `1.7`-weight stroke icon over an
  `8px / 700 / letter-spacing 1.4px / nowrap` caption: `+ NEW CHAT` and `× CLOSE`. Both `var(--fl-text-tertiary)`;
  NEW CHAT goes `var(--fl-bronze-bright)` while its menu is open. CLOSE has `padding-left: 12px`.
- **No divider under the header.** Separation is spacing plus the warm wash. Do not add a rule.
- **NEW CHAT popover** — absolute, `right: 52px; top: 66px`, width `224`, radius `var(--fl-radius-lg)` (12),
  `var(--fl-surface-elevated)`, `1px solid var(--fl-charcoal-500)`, `var(--fl-shadow-modal)`, `overflow:hidden`.
  Three rows at `padding: 13px 15px`, `14px` text, `1px solid var(--fl-charcoal-600)` between: New conversation ·
  Build a program · Training question. Hover `var(--fl-hover-wash)`. Enter with `fl-rise` 180ms.
  It must **not** destroy the thread.

## 3 · Coach Home (always at the top of the scroll)

Home is not a screen you leave. It stays pinned above the conversation and scrolls away with it.
Block: `flex-column`, `gap: 16px`, `padding-bottom: 20px`.

**Greeting stack** (`gap: 4px`)

- Greeting: `var(--fl-font-display)`, `25px / 600`, `line-height 1.2`, `var(--fl-text-primary)`.
- Line: `16px`, `line-height 1.45`, `var(--fl-text-secondary)`.
- Optional third line: `14px`, `line-height 1.5`, `var(--fl-text-tertiary)`, `margin-top: 2px`.

**Contextual actions** (only when the state has them) — row, `gap: 9px`, wraps.
Each: `height 46`, `padding 0 18px`, `radius 13`, `14.5px`, `white-space: nowrap`.
First action is the recommendation: fill `rgba(186,146,92,0.11)`, border `var(--fl-bronze-border)`,
`var(--fl-text-primary)`, `600`. Others: fill `rgba(255,255,255,0.032)`, border `rgba(255,255,255,0.07)`,
`var(--fl-text-secondary)`, `500`.

**Three capability cards** — `display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px`.
Each card `padding: 13px 12px 11px`, `radius 14`, `flex-column`, `gap: 9px`:

1. Icon `22 × 22`, stroke `1.8–1.9`, `var(--fl-bronze-primary)` (BUILD dumbbell · TODAY calendar · ADJUST sliders).
2. Tag `8.5px / 700`, `letter-spacing 1.8px`, `var(--fl-bronze-primary)` — `BUILD` / `TODAY` / `ADJUST`.
3. Title `13.5px / 600`, `line-height 1.3`, `var(--fl-text-primary)`, `text-wrap: pretty`.
4. Sub `11px`, `line-height 1.4`, `var(--fl-text-tertiary)`, `text-wrap: pretty`.
5. Arrow `15 × 15` at `align-self: flex-end` with `margin-top: auto; padding-top: 8px`, `var(--fl-bronze-primary)`.
   `margin-top:auto` is what keeps the three arrows on a common baseline when the subs are different lengths — keep it.

BUILD is the primary: fill `rgba(198,156,100,0.045)`, border `1px solid var(--fl-bronze-border-subtle)`,
`box-shadow: var(--fl-shadow-card-soft)`. The other two: fill `rgba(255,255,255,0.028)`,
border `1px solid rgba(255,255,255,0.07)`, no shadow.

Copy is fixed:

- BUILD · Build a program · "Training built around your goals and schedule."
- TODAY · What should I train? · "I'll work around your program and recent training."
- ADJUST · Change my program · "Modify your split, volume, exercises or schedule."

**Two quiet rows** — a stacked pair, not cards. `padding: 14px 2px`, `gap: 13px`,
`border-top: 1px solid var(--fl-charcoal-600)` on both, `border-bottom` on the second only.
Leading glyph is a `26 × 26` outlined container, `1px solid var(--fl-bronze-border-subtle)`,
`var(--fl-bronze-primary)` `13–14px` icon: **radius `var(--fl-radius-sm)` (8) for the document row**,
**`50%` for the question row**. Label `14.5px` `var(--fl-text-primary)`. Trailing chevron `16px`
`var(--fl-text-tertiary)`. Hover `var(--fl-hover-wash)`.
Rows: `I already have a program` · `Ask Holt something`.

## 4 · Conversation divider

Row, `gap: 10px`, `padding: 2px 0 4px`.
`CONVERSATION` at `9px / 700`, `letter-spacing 2.4px`, `var(--fl-bronze-primary)`, flanked by `1px` rules that
fade outward: left `linear-gradient(90deg, rgba(186,146,92,0) 0%, rgba(186,146,92,0.28) 100%)`, right mirrored.

## 5 · Turns

Thread column `gap: 20px`.

**Holt turn** — row, `gap: 12px`.

- Gutter: `width 40`, `flex:none`, centered column, `gap: 6px`.
  Avatar `40 × 40`, `50%`, `overflow:hidden`; border `var(--fl-bronze-border-subtle)` for past turns,
  `var(--fl-bronze-border)` for the live turn. Timestamp under it: `9px`, `var(--fl-text-tertiary)`, `nowrap`.
- Content column `gap: 7–8px`:
  - Eyebrow `HOLT` — `9.5px / 700`, `letter-spacing 2.4px`, `var(--fl-bronze-primary)`.
  - Live question: `16.5px`, `line-height 1.45`, `var(--fl-text-primary)`.
  - Past questions: `15.5px`, `line-height 1.45`, `var(--fl-text-secondary)` — same structure, lower contrast.
  - Optional secondary line: `13.5px`, `line-height 1.5`, `var(--fl-text-tertiary)`.
  - `text-wrap: pretty` on all of it.
- Controls live **inside the content column**, `padding-top: 6px`, column `gap: 12px`, so they align to Holt's text
  and not to the gutter. When identity is `eyebrow` the gutter is dropped and everything sits flush left.
- One question per turn. The secondary line replaces long parenthetical copy; never write a paragraph question.

**Athlete turn** — column, `align-items: flex-end`, `gap: 5px`.

- Eyebrow `YOU` — `9px / 700`, `letter-spacing 2.2px`, `var(--fl-bronze-primary)`.
- Bubble: `max-width 78%`, `padding: 11px 15px`, `border-radius: 14px 14px 4px 14px`
  (the 4px corner is bottom-right — it points at the sender), fill `rgba(186,146,92,0.10)`,
  border `1px solid rgba(186,146,92,0.28)`, `14.5px`, `line-height 1.4`, `var(--fl-text-primary)`.
- Meta row: `9.5px` `var(--fl-text-tertiary)` timestamp + `13px` double-tick in `var(--fl-bronze-mid)`, `gap: 5px`.
- The athlete's turn is quieter than Holt's and quieter than any control. It is history, not a CTA.

## 6 · Controls — one per question type

All share the selection model: **unselected** `rgba(255,255,255,0.032)` / `rgba(255,255,255,0.075)` border /
weight 400; **selected** `rgba(186,146,92,0.13)` / `var(--fl-bronze-border)` / weight 600.
Transition `all 150ms var(--fl-ease-out)`. Radius is 13 (12 for row chips), never a full pill.
Indicator shape carries the rule: **round = pick one, square = pick many.**

| Question | Control | Geometry |
| --- | --- | --- |
| Goal | Icon chips, 2-col grid, `gap 8` | `height 48`, `padding 0 12px`, `radius 13`, `13.5px` |
| Days / week | Row chips, equal width, `gap 7` | `height 48`, `radius 12`, `13px`, label `"4 days"` |
| Session length | Row chips, same as days | label `"45 min"`, options `30 / 45 / 60 / 75+` |
| Experience | Stacked cards, `gap 8` | `padding 13px 14px`, `radius 13`, round indicator |
| Equipment | 2-col grid, `gap 8` | `height 52`, `radius 13`, `13px`, square indicator |
| Injuries | Icon-less chips, 2-col + text field | chips as goal; field below |
| Import a program | Action rows, `gap 8` | `padding 14`, `radius 13`, chevron, no selected state |
| Exercise preference | Stacked cards, multi | square indicator |
| Final plan | Program artifact | §7 |

Details:

- **Chip internals** — `gap 9`, optional `15 × 15` bronze icon (stroke `1.9`), label
  `flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis`, then a `13 × 13`
  `var(--fl-bronze-bright)` check (stroke 3) **only when selected**. Fixed-height controls must never wrap.
- **Goal icons** — Strength shield · Muscle dumbbell · Fat loss flame · Fitness heart · Movement runner · Race flag.
- **Row chips** — `flex: 1; min-width: 0`, centered, `nowrap`; selected text goes `var(--fl-bronze-bright)`.
- **Card internals** — title `14.5px` (weight 500 → 600 when selected), sub `12px / line-height 1.45`
  `var(--fl-text-tertiary)`, indicator `18 × 18` circle: border `rgba(255,255,255,0.16)` → `var(--fl-bronze-border)`,
  fill `transparent` → `rgba(186,146,92,0.18)`, `10px` check in `var(--fl-bronze-bright)`.
- **Grid internals** — indicator `17 × 17`, `border-radius: 5px` (square), same border/fill/check treatment.
- **Text field** — `min-height 72`, `padding 13px 14px`, `radius 13`, `var(--fl-surface-recessed)`,
  `1px solid rgba(255,255,255,0.07)`, `14px` placeholder in `var(--fl-text-tertiary)`, `2 × 16` bronze caret
  blinking on `fl-caret` 900ms steps(1).
- **Action rows** — title `14.5px / 600`, sub `12px` tertiary, `16px` chevron; hover
  `rgba(198,156,100,0.06)` + `var(--fl-bronze-border-subtle)`.

## 7 · Program artifact

Card: `radius var(--fl-radius-xl)` (16), `var(--fl-surface-elevated)`, `1px solid var(--fl-charcoal-500)`,
`box-shadow: var(--fl-shadow-card-hero)`, `overflow: hidden`. Four bands, top to bottom:

1. **Draft strip** — `padding 9px 15px`, fill `rgba(186,146,92,0.07)`,
   `border-bottom: 1px dashed var(--fl-bronze-border-subtle)`,
   `DRAFT — NOT SAVED YET` at `9.5px / 700`, `letter-spacing 2.2px`, `var(--fl-bronze-primary)`.
   Dashed, because the object is provisional. Mandatory on anything Holt has not saved.
2. **Title block** — `padding 16px 15px 6px`, background `var(--fl-card-hero-wash)`.
   Name `var(--fl-font-display)`, `24px / 600`, `letter-spacing 0.4px` (`FOUNDATION 4`).
   Subtitle `12.5px` `var(--fl-text-secondary)` (`4 days · 8 weeks · Movement + Strength`).
3. **Day rows** — `padding 14px 15px 0`; each row `padding: 11px 0`,
   `border-top: 1px solid var(--fl-charcoal-600)`, `gap 14`: day marker `width 32`, `9.5px / 700`,
   `letter-spacing 1.8px`, `var(--fl-bronze-primary)`; title `14px` `var(--fl-text-primary)`.
   Closing row `45–60 min sessions` at `12.5px` tertiary, `padding: 11px 0 13px`, own top border.
4. **Preview row** — inside the card, `padding 13px 15px`, `border-top: 1px solid var(--fl-charcoal-600)`,
   fill `rgba(255,255,255,0.02)`, hover `rgba(198,156,100,0.06)`. `Preview program` `14px / 600` + bronze chevron.

Below the card, `gap 10`: DS `Button` `variant="primary"` **Start program** and `variant="text"` **Adjust it**.
Reading the object happens inside the card; deciding about it happens outside.

## 8 · Composer

`padding: 10px 14px 20px`, `background: var(--fl-surface-panel)`,
`border-top: 1px solid var(--fl-charcoal-600)`, `gap: 10px`.

- Field: `height 52`, `padding 0 18px`, `border-radius: var(--fl-radius-pill)`, `var(--fl-surface-recessed)`,
  `1px solid var(--fl-charcoal-600)`, `14.5px` placeholder `var(--fl-text-tertiary)` —
  `Ask Coach Holt anything...`.
- Send: `46 × 46` circle, `background: var(--fl-bronze-fill)` (the one sanctioned forged fill),
  `1px solid var(--fl-bronze-metal-border)`,
  `box-shadow: var(--fl-bronze-metal-top-rim), var(--fl-glow-forge)`, `20px` arrow in `var(--fl-bronze-bright)`.
- Typing is always available. Chips are the fast path, never the only path.

## 9 · Motion

- `--fl-ease-out: cubic-bezier(0.16, 1, 0.3, 1)` everywhere.
- New turn / popover: `fl-rise` — `opacity 0 → 1`, `translateY(8px) → 0`, 260ms (180ms for the popover).
- Control hover/selection: `150ms`. Nothing bounces, nothing pulses except the composer caret.
- Under Reduce Motion, drop `fl-rise` and the caret blink; keep the state changes.

## 10 · States shipped

Home: cold start · evening/scheduled tomorrow · missed a day · Week 4 · Day 2.
The three contextual variants change the greeting and add two actions **above** the capability cards; they never
replace them.

Turns: goal · days · experience · equipment · duration · injuries · import · preference · artifact.

## 11 · Do not

- No bubble around Holt's speech.
- No full-pill radius on selection controls, and no `overflow: hidden` on a fixed-height control that holds text.
- No bronze as a large flat fill (the send button is the only exception, via `--fl-bronze-fill`).
- No warm wash below the top 300px of the sheet.
- No hard rule under the header.
- No red anywhere in this surface — refusals and failures are specified separately in the v1 handoff.
- No emoji. Icons are `1.7–1.9` stroke line art in bronze.
