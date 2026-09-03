# Handoff: Forge Legacy landing page — v6 restructure

## Overview

This is a **change order** against the landing page currently live at forgelegacy.app, not a
from-scratch rebuild. The visual language, section styling, imagery, and most copy are staying
exactly as they are. What changes is the **order of the sections**, **six pieces of copy**, one
**new section** (Coach Holt), one **new intro section**, and two **behavioral fixes**.

Work through the numbered items below in order. Every item is independent — if one is contentious,
skip it and do the rest.

## About the design files

`Forge Legacy Landing v6.dc.html` in this bundle is a **design reference built in HTML**. It is a
prototype showing the intended structure, copy, and behavior. Do not copy it into the codebase.
Recreate the changes in the existing production environment using its established components,
styling approach, and patterns.

`Forge Legacy Landing v5.dc.html` is the current shipped state, included so you can diff the two.

## Fidelity

**High-fidelity.** Colors, type, spacing, and copy are final. Every value below is a
`--fl-*` design token from the Forge Legacy Visual Foundation; use the codebase's existing token
definitions rather than the raw hex values.

---

# 1 · Section order

The page currently runs:

1. Hook
2. The difference, stated plainly
3. Chapters
4. Sealed
5. Squads
6. Rank
7. Principles
8. The tracker (workout app preview)
9. FAQ
10. Final CTA

Reorder to:

| # | Section | Change |
|---|---------|--------|
| 1 | Hook | copy change (item 3) |
| 2 | **What Forge Legacy actually is** | **NEW** (item 8) |
| 3 | The part you use every morning | **moved up from 8**; split (item 9) |
| 4 | Why it exists (was "The difference, stated plainly") | copy addition (item 4) |
| 5 | Chapters | unchanged, moved |
| 6 | Sealed | copy change (item 6) |
| 7 | Rank | copy change (item 7) |
| 8 | **Holt** | **NEW** (item 10) |
| 9 | Squads | demoted (item 5) |
| 10 | What we won't do (was "Principles") | eyebrow change (item 5c) |
| 11 | The rest of it | remainder of old section 8 (item 9) |
| 12 | FAQ | copy changes (item 11) |
| 13 | Final CTA | copy change (item 12) |

**Rationale:** a stranger should understand the product before being taught the philosophy. The
practical proof (a real tracker that works at the rack) now lands in the first two screens instead
of two thirds of the way down.

**Alternating backgrounds must be preserved.** Sections alternate `--fl-charcoal-900` (page default)
and `--fl-base`. After reordering, the `--fl-base` sections are: 3, 5, 7, 9, 11, 13. Every section
keeps its `border-top: 1px solid var(--fl-charcoal-600)`.

**Anchor IDs are unchanged and must keep working:** `#chapters` (now section 5), `#squads`
(now section 9), `#final` (now section 13). Any nav or in-page link pointing at these still resolves.

---

# 2 · Copy changes, line by line

Each item is **find this exact string → replace with this exact string**. Nothing else in the
element changes — same tag, same classes, same styles.

## Item 3 — Hero subhead

**Find:**
> A serious iPhone training app, built around chapters you seal and keep, a squad of a few real people, and a rank that never goes down.

**Replace:**
> Track your training. Keep the story of what it built.

**Why:** the old subhead introduced three proprietary concepts (chapters, squads, permanent rank)
before the visitor had seen anything or knew why to care. The new line states the outcome. The
concepts get explained in section 2, which is now directly beneath it.

**H1 is unchanged:** "Build your story. Forge your Legacy."

## Item 3b — Hero CTA label

Three CTAs share one App Store URL. Two of them change label:

| Location | `data-analytics` | Was | Now |
|---|---|---|---|
| Hero | `cta-hero` | Start Chapter One | **Download for iPhone** |
| Sticky bottom bar | `cta-sticky` | Start Chapter One | **Download for iPhone** |
| Final CTA | `cta-final` | Start Chapter One | *unchanged* |

**Why:** "Chapter" means nothing to a first-time visitor at the top of the page — it reads as
jargon on the primary conversion action. By the final CTA the visitor has read the Chapters and
Sealed sections, so it reads as intent rather than jargon. Keep it there.

The caption under both changed buttons is unchanged: "Free to start. On the App Store, for iPhone."

## Item 3c — Hero bullet, first of three

**Find:** No streaks. No leaderboards. No feed.
**Replace:** Private by default. Nothing posts on its own.

**Why:** stating what we don't have describes competitors. Stating what we do have describes us. The
other two hero bullets are unchanged.

## Item 4 — The turn after the "list of workouts" line

Section 4 opens with the H2 "Most training apps are a very good list of workouts." **Insert a new
paragraph directly after that H2**, before the comparison table:

> Forge is the record of what those workouts made you.

Styling:
- `font-family: var(--fl-font-display)`
- `font-size: clamp(20px, 5vw, 27px)`
- `font-weight: 500`
- `line-height: 1.24`
- `color: var(--fl-bronze-primary)`
- `max-width: 24em`
- `text-wrap: balance`
- `margin: 18px 0 0`
- scroll-reveal on (see item 13)

**Why:** the H2 sets up a contrast and then hands off to a table. The turn needs to land as a
sentence before the table proves it.

**The comparison table itself is unchanged.** It is the strongest section on the page — four rows
(Your history / What keeps you going / The people / The cost), each "Most apps → X, Forge → Y", and
it closes on "The tracker is the engine. The Legacy is the product." That closing line is protected;
do not touch it.

## Item 5 — Demote Squads

Squads currently reads as one of the load-bearing pillars of the product. It shouldn't — someone
who trains alone should never wonder whether the app is for them.

**5a. Eyebrow.** Find `Difference two · the people` → replace `Optional · the people`

**5b. Lede.** Find:
> The two things the rest of the category offers are a public feed of strangers' workouts, or a group that punishes you when you miss. Both are engagement mechanics. Neither is what training with people actually feels like.

Replace:
> Your training is private by default, and Forge is complete on your own. When you do want people in it, it stays a few people you know.

**5c. Second bullet.** Find `No followers. No like counts. No leaderboard.` → replace
`Nobody to outrank. Nothing to perform for.`

**5d. Mockup label.** The phone mockup inside this section labels the screen "Squad Feed". Change to
**"Squad"** — the copy says there is no feed, so the mockup was contradicting it.

**5e. Principles eyebrow.** In the following section, find `Difference four · what we're bound by`
→ replace `What we're bound by`. (It is no longer the fourth of a numbered series.)

**Note on numbering:** with Squads demoted out of the series and Holt added, the "Difference N"
eyebrows are now: Chapters = *Difference one*, Rank = *Difference two*, Holt = *Difference three*.
Squads and Principles are outside the series. Verify these read in order top to bottom.

## Item 6 — Sealed

**Find:**
> You close it, write down what it meant, and it locks. No other training app can do this, because no other training app thinks your past is worth protecting.

**Replace:**
> You close it, write down what it meant, and it locks.

**Why:** the mechanic is strong enough to state without prosecuting the category. Everything else in
this section stays, including "History can be added to. It cannot be rewritten." — protected line.

## Item 7 — "Seven years" stops being the headline

**Find** the bronze display line: `Legacy takes seven years. And it never goes down.`

**Replace with two elements.** First, in the same slot and same styling:

> Built to measure years, not streaks.

Then **add a supporting line directly beneath it**:

> Legacy isn't a badge you grind for. It is designed to take years to earn, and once earned it never goes down.

Supporting line styling:
- `font-size: 14.5px`
- `line-height: 1.6`
- `color: var(--fl-text-tertiary)`
- `max-width: 52ch`
- `text-wrap: pretty`
- `margin-top: 10px`
- reveals ~300ms after the line above it

**Why:** "seven years" as the headline can be heard as "the good part of this app is seven years
away." The horizon is still stated, just not as the hook. The intermediate rank ladder in this
section is unchanged.

---

# 3 · New sections

## Item 8 — NEW section 2: "What Forge Legacy actually is"

Sits between the hero and the app preview. Purpose: in one screen, tell a stranger the four things
the critique says they must learn in the first thirty seconds.

**Layout**
- `<section>`, page-default background (`--fl-charcoal-900`), `border-top: 1px solid var(--fl-charcoal-600)`
- padding `clamp(56px, 11vw, 100px) var(--gut)` — slightly tighter than the standard
  `clamp(64px, 13vw, 120px)`, because it is a bridge, not a destination
- inner wrapper `max-width: 1180px; margin: 0 auto`

**H2**, no eyebrow: "What Forge Legacy actually is."
- `font-family: var(--fl-font-display)`, `clamp(27px, 7vw, 42px)`, weight 500, `line-height: 1.1`

**Four cards**, CSS grid, `gap: 10px`, `margin-top: clamp(28px, 5vw, 44px)`.
Grid is `repeat(var(--pcols, 2), minmax(0, 1fr))` — the page already defines `--pcols` as 1 on
phones and 2 above; reuse it rather than adding a media query.

Each card:
- `padding: 20px 18px 22px`
- `border-radius: var(--fl-radius-md)`
- `background: var(--fl-surface-card)`
- `border: 1px solid var(--fl-charcoal-600)`
- `box-shadow: inset 0 1px 0 var(--fl-inner-highlight)` — the 1px top highlight; light falls from
  above and the card catches it. This is what keeps them from reading flat.

Card label: `font-size: 10px`, weight 600, `letter-spacing: 1.6px`, uppercase, `color: var(--fl-bronze-primary)`
Card body: `margin-top: 11px`, `font-size: 17px`, weight 600, `line-height: 1.3`

| Label | Body |
|---|---|
| The tracker | Log a set in under two seconds, one-handed, at the rack. |
| The chapters | Your training filed as seasons of your life you name, seal and keep. |
| The rank | It measures years, not weeks, and it never goes down. |
| The people | A private squad of a few people you know, only if you want one. |

**Closing line**, below the grid:

> Everything you'd expect from a serious training tracker. Plus something the others throw away: your story.

- `font-family: var(--fl-font-display)`, `clamp(21px, 5.2vw, 28px)`, weight 500, `line-height: 1.24`
- `max-width: 26em`, `text-wrap: balance`, `margin-top: clamp(26px, 5vw, 38px)`
- default text color (not bronze — the bronze emphasis in this stretch belongs to item 4)

## Item 9 — Split the old tracker section in two

The current section 8 contains a phone mockup, a feature grid, and a "What's real today" block. It
splits into two sections that land in different places.

**New section 3 — "The part you use every morning"** (takes the phone mockup, moves to position 3)

- background `var(--fl-base)`, standard section padding
- eyebrow: `Before any of the rest of it`
- H2: `First, the part you use every morning.`
- lede: `The tracker had to be good before anything else on this page could matter. Fast to log, reliable between sets, and it never loses a workout.`
- the existing active-workout phone mockup, unchanged, on the left
- **four new bullets** on the right, replacing the feature grid that used to sit there

Bullets use the page's existing pattern: a 6×6px `--fl-bronze-primary` square rotated 45°,
`margin-top: 8px`, `gap: 14px`, text at `font-size: 16.5px`, weight 600, `line-height: 1.35`.
Staggered reveal at 0 / 400 / 800 / 1200ms.

1. The rest timer keeps running when you leave the app.
2. Autosave survives losing signal mid-workout.
3. Records caught as you lift, not calculated later.
4. Holt suggests the next set. You decide.

**New section 11 — "The rest of it"** (takes the feature grid and the credibility block, stays low)

- background `var(--fl-base)`, standard section padding
- H2, no eyebrow: `The rest of what's in it.`
- the existing feature grid, unchanged, but now full-width instead of a right-hand column:
  `grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr))`, `gap: 10px`
- then the "What's real today" block, demoted (item 9b)

**9b. "What's real today" demotion.** It is currently a prominent card leading on
"161 database migrations … 2,362 automated tests". A gym user does not care. Rebuild it as a quiet
rule at the foot of the section:

- `margin-top: clamp(28px, 5vw, 44px)`, `padding-top: 20px`,
  `border-top: 1px solid var(--fl-charcoal-600)` — a rule, not a card
- eyebrow `What's real today` in `--fl-bronze-primary`, 11px, `letter-spacing: 1.8px`, uppercase
- body at `font-size: 14px`, `line-height: 1.6`, `color: var(--fl-text-tertiary)`, `max-width: 76ch`:

> Real app, real accounts, live backend. Every screen on this page is a real account — nothing you log is demo data and there is no reset before launch. Android has no builds yet, and we'd rather say so than take your email for a list.

The migration and test counts move to the FAQ only (item 11b).

## Item 10 — NEW section 8: Holt

The largest gap between the product being built and the product the site sells. Holt answers
"what do I do today?", which is a far easier problem for a visitor to understand than "why should
this matter in ten years." Placed after Rank and before Squads, so the page runs
today → training → progress → chapters → years → Legacy.

**Layout:** page-default background, standard section padding, `max-width: 1180px` wrapper.
Two columns, `flex-wrap: wrap`, `gap: clamp(28px, 5vw, 64px)`, `align-items: center`.

- eyebrow: `Difference three · what to do today`
- H2: `Holt answers the question every training day starts with.`
- lede: `Coach Holt reads what you actually logged — the sets, the stalls, the weeks you missed — and tells you what to do next. It suggests. You decide.`

**Left column — a chat card** (`flex: 1 1 380px`)
- `padding: 22px 20px 24px`, `border-radius: var(--fl-radius-lg)`
- `background: var(--fl-surface-card)`
- `border: 1px solid var(--fl-bronze-border-subtle)`
- `box-shadow: inset 0 1px 0 var(--fl-inner-highlight-md), 0 14px 36px rgba(0, 0, 0, 0.45)`

Card header, above a `1px solid var(--fl-charcoal-700)` divider:
- 34×34 circular avatar, `assets/coach-holt-mark.png`, `box-shadow: 0 0 0 1px var(--fl-bronze-border)`
- name "Coach Holt" — display serif, 15px, weight 600
- under it, "Read your last four weeks" — 11px, `letter-spacing: 1.4px`, uppercase, `--fl-text-tertiary`

Three stacked elements, `gap: 10px`, `margin-top: 16px`:

1. **User message**, right-aligned, `max-width: 82%`, `background: var(--fl-charcoal-700)`,
   `border-radius: var(--fl-radius-md) var(--fl-radius-md) 4px var(--fl-radius-md)`,
   `padding: 11px 14px`, 14.5px:
   > What am I doing today?

2. **Holt reply**, left-aligned, `max-width: 88%`, `background: var(--fl-surface-recessed)`,
   `border: 1px solid var(--fl-bronze-border-subtle)`,
   `border-radius: var(--fl-radius-md) var(--fl-radius-md) var(--fl-radius-md) 4px`,
   `padding: 12px 14px`, 14.5px, `line-height: 1.5`, `color: var(--fl-text-secondary)`:
   > Push day. Bench has held at 185 for three weeks, so we're dropping to 165 and adding a set — you'll clear 185 in two weeks instead of grinding at it.

3. **Footnote**, bronze square bullet, 12.5px, `--fl-text-tertiary`:
   > You can take it, change it, or ignore it.

Reveal order: card 0ms, user message 500ms, reply 900ms, footnote 1400ms.

**Right column** (`flex: 1 1 340px`) — three bullets in the same pattern as item 9, at
300 / 700 / 1100ms:

1. It reads your logged training, not a questionnaire.
2. It flags what stalled before it suggests anything.
3. It never sends, posts, or decides on your behalf.

Then a bronze display line at 1600ms — `font-family: var(--fl-font-display)`,
`clamp(21px, 5.2vw, 27px)`, weight 500, `line-height: 1.24`, `color: var(--fl-bronze-primary)`,
`max-width: 22em`:

> Holt helps you train today. Forge remembers what it became.

**⚠ Launch gate:** this section states Holt's behavior as shipped. If Coach Holt is not public when
this deploys, either add a "coming" qualifier or hold the section. Do not ship it as present tense
against an unreleased feature.

---

# 4 · Remaining copy

## Item 11 — FAQ

**11a.** Find:
> Comparison is rented motivation. It works until the streak breaks or the leaderboard demoralises you, and then the app gets deleted. We're not optimising for day-one usage; we're optimising for whether you still want this in year five.

Replace:
> Comparison is rented motivation. We're not optimising for day-one usage; we're optimising for whether you still want this in year five.

The contrarian claim stays. The paragraph defending it goes.

**11b.** Update the build numbers to current. Find:
> 161 database migrations, security policies on every table, 2,362 automated tests, and a live backend. A real application, not a prototype.

Replace:
> 167 database migrations, security policies on every table, 2,552 automated tests, and a live backend. A real application, not a prototype.

## Item 12 — Final CTA

Two lines, both display serif at `clamp(25px, 6.4vw, 38px)`. First is `--fl-text-secondary`,
second is default (brighter) — the contrast carries the turn.

| | Was | Now |
|---|---|---|
| Line 1 | Forge Legacy is not helping you win today. | **Holt is helping you win today.** |
| Line 2 | It's helping you become someone you're proud of ten years from now. | **Forge Legacy is keeping what all of those todays add up to.** |

**Why:** the old closing was strong but denied a benefit the product now actually delivers. Holt
*does* help you win today. The new pair keeps the ten-year frame while giving the visitor a reason
to download tomorrow morning.

The CTA button below (`cta-final`) keeps its "Start Chapter One" label and its caption.

---

# 5 · Behavior

## Item 13 — Animations must not start until on screen

Two classes of motion on this page:

**Staged reveals** (`data-scene` containers, `data-beat` children, and standalone `data-rev`
elements) are already driven by an `IntersectionObserver` that fires once per container at
`threshold: 0.25` and plays the child timing offsets. Every new element added above must be wired
into it — `data-rev="1"` for a single element, or `data-beat="<ms>"` inside a `data-scene="1"`
container. New elements without one of these attributes will render at `opacity: 0` forever.

**Looping CSS animations** were not gated and this is the bug. Two decorative phone-screen scrolls —
`flLegacyScroll` (44s) on `[data-legacyscroll]` and `flFeedScroll` (46s) on `[data-squadscroll]` —
started on page load, so by the time a visitor scrolled down they were arriving mid-loop at an
arbitrary frame.

Fix: declare both with `animation-play-state: paused` in the initial style, and in the
IntersectionObserver callback that marks a scene played, also set
`animationPlayState = 'running'` on any `[data-squadscroll], [data-legacyscroll]` inside that scene.
Each loop now starts from frame zero the first time its section is seen.

`prefers-reduced-motion: reduce` already disables both loops entirely; keep that.

## Item 14 — Center the hero CTA on phones

The page is phone-first, but the hero CTA stack was pinned `align-items: flex-start`.

- below 760px: `align-items: center; text-align: center`
- 760px and up: `align-items: flex-start; text-align: left`

Implemented as a `[data-cta]` attribute selector with one `min-width: 760px` media query, rather
than inline styles, since it is the one genuinely responsive rule.

**Do not center on desktop.** The headline and subhead are left-aligned there; a centered button
under left-aligned copy reads as a mistake. On a phone the copy is narrow enough that centered
reads as intentional. The final CTA section is centered at every width already — unchanged.

---

# 6 · Design tokens

Every value in this document is an existing token. No new tokens are introduced.

**Surface and canvas**
`--fl-charcoal-900` (page), `--fl-base` (alternating sections), `--fl-surface-card`,
`--fl-surface-recessed`, `--fl-charcoal-700`, `--fl-charcoal-600` (borders)

**Bronze**
`--fl-bronze-primary` `#BF8F4F`, `--fl-bronze-bright` `#CDA063`, `--fl-bronze-metallic` (button
fill), `--fl-bronze-metal-border`, `--fl-bronze-metal-top-rim`, `--fl-bronze-border`,
`--fl-bronze-border-subtle`

**Text**
default, `--fl-text-secondary`, `--fl-text-tertiary`, `--fl-gray-400` (captions)

**Type**
`--fl-font-display` (serif, all headings and pull-quotes, weight 500) and the sans default.
Section H2: `clamp(27px, 7vw, 42px)`. Pull-quote: `clamp(21px, 5.2vw, 28px)`.
Body lede: `clamp(16px, 4.2vw, 17px)`. Eyebrow: 11px / `letter-spacing: 1.8px` / uppercase.

**Radius** `--fl-radius-md`, `--fl-radius-lg`, `--fl-radius-pill`

**Elevation** `inset 0 1px 0 var(--fl-inner-highlight)` and `--fl-inner-highlight-md` for the top
highlight; `0 14px 36px rgba(0, 0, 0, 0.45)` for the Holt card's drop.

**Motion** `--fl-ease-out`. Reveals are 300–450ms. Stagger is 300–500ms between siblings.

**Layout** `var(--gut)` page gutter, `var(--pcols)` responsive column count,
`max-width: 1180px` content wrapper (900px for section 4, 820px for the FAQ, 760px for the CTA).

## Assets

Only one asset is new to the page: `assets/coach-holt-mark.png`, the Holt avatar in section 8. It
already exists in the project. Everything else — the workout mockup, badge artwork, photography — is
already on the live page and unchanged.

## Files in this bundle

- `Forge Legacy Landing v6.dc.html` — the target state, all changes applied
- `Forge Legacy Landing v5.dc.html` — current shipped state, for diffing

## Verification checklist

- [ ] Section order matches the table in item 1; `--fl-base` lands on 3, 5, 7, 9, 11, 13
- [ ] `#chapters`, `#squads`, `#final` all still resolve
- [ ] "Difference one / two / three" read in order (Chapters, Rank, Holt) top to bottom
- [ ] Hero and sticky CTA read "Download for iPhone"; final CTA still reads "Start Chapter One"
- [ ] All three CTAs point at the same App Store URL
- [ ] No element renders stuck at `opacity: 0` (every new element has `data-rev` or `data-beat`)
- [ ] Both phone scroll loops are paused until their section enters the viewport
- [ ] Hero CTA centers below 760px, left-aligns above it
- [ ] Holt section is gated on Coach Holt actually being public
