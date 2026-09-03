# Forge Legacy — Landing Page V5 · implementation handoff

Source of truth: `Forge Legacy Landing v5.dc.html` (1,201 lines). This document describes it
line region by line region so it can be rebuilt in the real web stack without opening the design.

**What this is.** A public marketing page — the thing someone lands on when a friend texts them the
link or they search "best workout apps". Not an app screen. One responsive page, designed at 390px
first, breathing out to a 1,180px max content width.

**Word budget: 997 words, ~4.5 minutes.** This was cut from 1,222 deliberately (see § 12). Do not
add explanatory sub-lines back under the § 5 bullets or § 7 cards — they were removed because every
claim on this page is now stated exactly once, and duplication was the page's main weakness.

---

## 1 · Head, tokens, and the responsive contract

Lines 10–78 (`<helmet>`).

**Stylesheets, in this order:**

```
Playfair Display 500;600   (Google Fonts)
tokens/foundation.css      (the --fl-* foundation)
styles.css                 (design-system component styles)
_ds_bundle.js              (design-system components)
```

Every colour on the page is a `--fl-*` token or one of the workout screen's literal foundation
values (§ 8). There are 39 `var(--fl-*)` references and no unresolved ones. Do not introduce new
hex values.

**Type.** Two faces only. `--fl-font-display` (Playfair Display) for every headline, every figure,
and every pull-quote. `--fl-font-sans` for body copy, labels and chrome. This contrast is what makes
the phone mocks read as records rather than forms — it is not decorative.

**The responsive contract** is four custom properties, and it is the whole reason the page works on
a phone. Do not replace these with media-query-per-component CSS:

```css
:root { --gut:20px; --shotw:100vw; --shotml:calc(-1 * var(--gut)); --bz:0px; --bzr:0px; }
@media (min-width: 760px)  { :root { --gut:40px; --shotw:390px; --shotml:auto; --bz:8px; --bzr:40px; } }
@media (min-width: 1100px) { :root { --gut:60px; } }
```

- `--gut` — every section's horizontal padding.
- `--shotw` / `--shotml` — a phone frame is `width:var(--shotw); margin-left/right:var(--shotml)`.
  Below 760px that is `100vw` with a negative gutter margin, so **the phone breaks out of the section
  padding and goes edge to edge**. Above 760px it is a fixed 390px, centred.
- `--bz` / `--bzr` — the bezel border and its radius. **Zero below 760px.**

**Why the bezel disappears on a phone.** V2 rendered a bezelled 390px frame inside a 390px viewport,
which scaled the screenshot to 277px — app text landed at ~10px and became unreadable decoration.
Edge-to-edge at 100vw renders app text slightly *larger* than life. If you keep one thing from this
document, keep this.

**`--pcols`** (1 / 2 / 4 at 560px and 1040px) pins § 7's promise grid. `auto-fit` was producing
3 + 1 under a headline that says "four things".

**`<noscript>`** block forces every animated element to its end state. Animation is enhancement.

**13 `@keyframes` blocks** live here: `flLegacyScroll`, `flFeedScroll`, and eleven `flw*` for the
workout sequence. Details in § 8.

**One `::part` rule** — `image-slot::part(ring)` — because inline styles cannot cross a shadow
boundary. No other CSS classes exist on this page; everything else is an inline style.

---

## 2 · Section map

| § | Lines | Job | Words |
|---|---|---|---|
| 1 | 84–336 | Hook + the Legacy hub phone | 72 |
| 2 | 337–392 | The difference, in four labelled rows | 103 |
| 3 | 393–446 | Chapters + the chapter-card mock | 98 |
| 4 | 447–485 | Sealing ceremony | 65 |
| 5 | 486–745 | Squads + the active-squad phone | 91 |
| 6 | 746–793 | Rank ladder | 96 |
| 7 | 794–821 | Four things this app will never do | 57 |
| 8 | 822–1022 | The training app + the Active Workout phone | 148 |
| 9 | 1023–1058 | FAQ | 214 |
| 10 | 1059–1089 | Final CTA | 38 |
| — | 1079–1089 | Footer | 15 |
| — | 1090–1101 | Sticky CTA bar | — |

Sections alternate ground: `--fl-charcoal-900` (page) and `--fl-base` for §§ 2, 4, 6, 8, 10. Never
more than those two. Every section is separated by `1px solid var(--fl-charcoal-600)`.

---

## 3 · § 1 · The hook

Lines 84–336.

**Order on a phone, top to bottom:** wordmark → H1 → lede → CTA → free-to-start line → three-proof
strip → the Legacy phone.

- **H1** (line ~96) — `clamp(42px,11vw,70px)`, display face, weight 500, `line-height:1.03`,
  `letter-spacing:-0.018em`. Two lines: "Build your story." then "Forge your Legacy." in
  `--fl-bronze-primary` as a `display:block` span.
- **Lede** — "A serious iPhone training app, built around chapters you seal and keep, a squad of a
  few real people, and a rank that never goes down." The H1 is abstract, so **this line carries the
  what-is-it job and names the platform in its first clause.** Do not cut it.
- **CTA** — 54px tall, `max-width:340px`, full width below that. `--fl-bronze-metallic` fill,
  `--fl-bronze-metal-border`, `--fl-bronze-metal-top-rim` shadow, `#100B04` label. Bottom lands at
  **456px** at 390px width — inside the first screen. Verify this after any hero change.
- **Free-to-start line** — `--fl-gray-400`, 13px. Every meaning-carrying small text on this page is
  `--fl-gray-400` (7.03:1), never `--fl-text-tertiary` (3.26:1). Tertiary is for decorative row tags
  only.
- **Three-proof strip** — above a `--fl-charcoal-600` top rule, three lines each with a 5px bronze
  diamond (`transform:rotate(45deg)`). Copy: "No streaks. No leaderboards. No feed." / "Log a set in
  under two seconds" / "Bring the program you already run". These are deliberately *not* the privacy
  and history claims — §§ 2 and 7 make those, and repeating them here was cut.

**Beat timings** (`data-beat`, ms): H1 0 · lede 300 · CTA 480 · proofs 620 · phone 760.

---

## 4 · § 2 · The difference

Lines 337–392. The page's only comparison, and it survives review because **the claim is about
shape, not retention** — every tracker keeps your history; they present it as a list.

Headline: "Most training apps are a very good list of workouts." No lede (cut — the table says it).

**Four rows**, each `border-top:1px solid var(--fl-charcoal-600)`, the last also `border-bottom`.
Each row is three parts:

1. A full-width category label — 10.5px, uppercase, `letter-spacing:1.6px`, `--fl-gray-400`.
2. A `flex:1 1 240px` column tagged **"MOST APPS"** (`--fl-gray-400`, 9.5px, 600) over its value in
   `--fl-gray-400` prefixed with an em-dash glyph.
3. A `flex:1 1 240px` column tagged **"FORGE LEGACY"** (`--fl-bronze-primary`) over its value in
   `--fl-bronze-primary` prefixed with a bronze diamond.

| Category | Most apps | Forge Legacy |
|---|---|---|
| Your history | A list of sessions, newest first | Chapters you name, seal and keep |
| What keeps you going | A streak you can break | A rank that never goes down |
| The people | A public feed, or a group that punishes you | A private squad of a few people you know |
| What it costs to look back | Your past sits behind a subscription | History is free forever, by design |

**Both tags must stay equally legible.** They were `--fl-text-tertiary` at 3.26:1 while the bronze
side sat at 6.94:1, which meant a scanner saw only the bronze column and the grey one read as
unlabelled. Grey-vs-bronze is the *secondary* cue; the tags are the primary one. At 390px the two
columns stack, so each tag must sit directly above its own value.

Closer: "The tracker is the engine. The Legacy is the product."

No competitor is named anywhere on this page. Keep it that way.

---

## 5 · §§ 3, 4, 6 · Chapters, sealing, rank

**§ 3 Chapters** (393–446). Eyebrow "Difference one · the organizing unit", headline "A chapter is a
real season of your life.", body, then a **hand-built chapter card** in a `374/640` frame (a
ceremony screen, not a screenshot) beside a five-row composition list (Workout · Honor · Record ·
Photo · Goal), each row `--fl-surface-card` with a glowing bronze dot. The card's beats: label 0 ·
rule 400 · name 600 · athlete 900 · date 1100 · glow 1300; the list staggers 1900–2380.

**§ 4 Sealing** (447–485). The page's ceremony moment, in a `374/620` frame. A modal reading "Seal
Chapter I?" holds until 1100ms, then **cross-fades out as the wax seal scales in from 1.35** and a
`max-width` wipe reveals "Sealed · March 14, 2027". Closes on "History can be added. It cannot be
rewritten." The seal glyph keeps its own stroke weights — it is a **brand mark**, and the blueprint
exempts logo, rank insignia and honor artwork from the icon rules.

**§ 6 Rank** (746–793). Headline "A streak punishes you for living. Rank just describes who you've
become." Seven rows, each: real insignia `.webp` at 38–50px with `object-fit:contain` (the art is
portrait; without `contain` it stretches), a 92px uppercase family name, and the first-person line.
Legend and Legacy get larger art and brighter bronze. Closes with "Legacy takes seven years. And it
never goes down." Beats 0 → 3900 at ~450ms intervals.

---

## 6 · § 5 · Squads

Lines 486–745. The page's headline differentiator, and the section a cold visitor uses to decide
whether squads are for serious training or a group chat.

Eyebrow "Difference two · the people". Headline "A squad is a handful of people, not an audience."
Body names the two poles the category actually offers — a public feed of strangers, or a group that
punishes you — without naming anyone.

**Four claims, bold lines only**, 17px/600, `line-height:1.35`, each with a bronze diamond:

1. It shows what people did, never what they missed.
2. Nothing posts on its own.
3. No followers. No like counts. No leaderboard.
4. A finish line, only if you want one.

Their explanatory sub-lines were cut. The bold lines are complete thoughts and were the only part
being read.

**The row is `align-items:flex-start`, not `center`.** The column is 268px against a 799px phone;
centring parked it in the middle with ~318px of dead space above and below. The section closer
("The people who already know what you're working on.") lives **inside the column**, not below the
row, so the text side carries some weight beside the frame.

`data-flip="1"` reverses the row above 940px.

---

## 7 · The three phone mocks

**All three are mockups built in markup, not screenshots.** No real photograph of a person appears
anywhere on this page. Two earlier screenshots were pulled for exactly that reason — see § 11.

Each mock lives in a `container-type:inline-size` frame at a fixed `aspect-ratio`, and **every
interior size is in `cqw`** (1cqw = 3.74px at the 374px content width). That is what lets the whole
screen scale as one piece from 100vw down to 390px. Do not convert these to px.

### 7.1 Legacy hub — § 1, lines 125–336, 44s loop

`aspect-ratio:374/766`. Background: `bg-legacy.jpg` at **opacity 0.375** under a flat
`rgba(0,0,0,0.30)`. Content scrolls `translateY(0 → -352cqw)` (max travel is 360.6cqw — do not
exceed it or a gap opens at the end of the loop), `ease-in-out`, `infinite alternate`.

Nine sections in spec order: hero (initials portrait inside the decorative seal — two concentric
circles and a 45°-rotated square — name, `Foundation · II` with its bronze diamond, the fixed
subtitle, and the Progress badge) · My Standard · Current Chapter (primary goal at 64%, Day 61) ·
Pinned Legacy (two pin cards with kind chips and glyph medallions, terminated by the dashed
"Pin an item" tile) · Featured Moment · My Story · Timeline · What Endures · Accomplishments ·
Honors · the closing inscription.

**Rank badge is the real `badge-foundation.webp`** — the same file § 6's ladder renders, so the
insignia is identical in both places.

**Honors are six of the eight real artworks** in `assets/artwork/honors/` at full opacity. An
opacity ladder was rejected: fading honors reads as "these count less", against the page's own claim
that they are permanent.

### 7.2 Active squad (S-2) — § 5, lines 527–745, 46s loop

`aspect-ratio:374/766`. Background: `bg-squad.jpg` (the **tall** 853×3688 variant, not the 2:1
`squad-detail-bg.png`, which crops badly here) at **opacity 0.5625** under `DetailBg`'s two radial
gradients. Scrolls to `-274cqw` (max 277).

App bar: **back chevron in the leading slot**, overflow dots trailing. "The only action is the
overflow menu" describes the trailing slot only.

Scroll order: hero (92pt crest with bronze ring and glow; name at 34pt uppercase display with a
heavy text shadow because it sits over artwork; motto; meta row where the member count is
underlined as a link and the trained-today readout takes a **green** dot rather than bronze, because
it is a readout and not a tap target) · Current Goal (62% metallic fill, "312 / 500 workouts",
"19 days left"; the pencil sits beside the section label so editing stays distinct from opening) ·
Active Competition (swords emblem, two stat columns each with a left hairline, and a
**positive-framed** footer — "3 workouts to catch second", never a deficit) · Hall of Champions
(metallic bronze tile, near-black stroked trophy) · Squad Records · Check-ins ("Video · disappears
in 24h"; discs are bronze-ringed with a glow when unwatched, charcoal-ringed with the avatar at 45%
once seen, play badge notched bottom-right) · Squad Feed · End of the ledger.

**The feed is a ledger, not a feed.** Rows are separated only by the hairline each one carries at
its foot — `gap: 0` — because a gap on top of that would put a gutter between rows and they would
read as cards again. There is no bronze icon column. The scroll terminates in a closing mark rather
than running forever. This is what lets § 5 show social proof without a visitor pattern-matching
"feed app" against copy that argues the opposite.

Four entries: a PR with its previous best · a shared session with unit-converted stats · a
discussion carrying **no attribution line** (the body *is* the post) · the generated Weekly Summary,
which is the only entry that keeps a card, because it is the squad talking rather than a person.

**No progress post.** It is the type the S-2 spec cares most about, but every version needs a
photograph of a person.

Roster is verbatim from `Squads Hub.dc.html`'s `SQUADS` (lines 249–253): Iron Vigil (swords, owner,
5 members, 3 trained, 2 pending) · Dawn Patrol (mountain, 6/6, so the "+2" chip shows since avatars
cap at four) · The Proving (shield, 4/0, the zero state — numerator grey, all segments unlit) ·
Home Forge (flame, 1/1, singular "1 member").

### 7.3 Active Workout — § 8, lines 830–1022, 6s loop

`aspect-ratio:374/766`. Background: `bg-slate.jpg` at **full opacity** under a flat
`rgba(5,5,5,0.32)` — the slate treatment the workout spec names exactly.

Eight zones: app bar ("Push Day", back, camera with a bronze dot, ⋮) · progress band ("3 / 16 Done",
numerator bronze, rest chip, 6px bar) · hero card (the demo slot at 30.8×40cqw, "Bench Press", Main
lift, Strength pill, How To) · insight row (Last 185 × 8 · Goal 4×8 with its pencil · Best 225 × 3) ·
set table · **nav dots** · coach coin · action bar.

**Set table.** Columns `8.5cqw 20cqw 1fr 1fr`, rows `min-height:13.9cqw` (52px). Three states:

| State | Row | Set disc | Actual |
|---|---|---|---|
| Done | border `rgba(90,158,104,.35)`, fill `.06` | 1.5px `#5A9E68`, numeral `#5A9E68` | value cream, 26px green ring holding a tick |
| Current | border `rgba(181,138,97,.40)`, fill `.05` | 1.5px `#BA8654`, numeral `#C99767` | value `#BA8654` in a bronze-tinted box, 34px bronze ring with the screen's only `0 0 20px rgba(181,138,97,0.14)` |
| Pending | transparent, no fill | 1.5px `#2E2E35`, numeral `#666060` | em dash `#666060`, empty ring spacer |

Sets 1–2 done (135, 185), set 3 current, set 4 pending. **The em dash on set 4 means "nothing was
said" — never render it as 0.**

**The animated beat**, one 6s loop shared by 14 elements so they stay in phase:

| % | ms | What |
|---|---|---|
| 12 → 13.7 | 720 → 822 | Row border/fill, set disc, tick, ring swap and ink all cross to green (~100ms; the source is an instant re-render, "keep it under 120ms") |
| 12 → 32 | 720 → 1920 | **The fuse.** Two stacked `<rect rx="10" pathLength="100">` — a `#5A9E68` 2px trail with `dasharray="100"` animating offset 100 → 0, and a `#8FE6A6` 3px head with `dasharray="10 90"` animating 0 → −100. `ease-in-out`. Opacity holds to 72% of the span then falls, so it fades while still travelling. **Starts at the top-left corner.** |
| 12 → 13.7 | — | Counter cross-fades 3 → 4; the bar animates 18.75% → 25%. It counts **sets**, not exercises. |
| 15 → 18, out at 53 | 900 → 1080, 3180 | "Set logged" toast — opacity plus an 8px rise, then gone. No exit animation in the source. |
| 53 → 56 | 3180 → 3360 | Coach coin reveals: "Strong. Next set, go up to 195 lb." |

**The toast and the coach coin share the strip above the action bar, so they are mutually
exclusive.** The coin holds at 0 until the toast clears. The workout spec's own rule — the coin
"hides behind every overlay this screen owns" — is what makes that correct rather than a hack. Note
the toast is still positioned at a hardcoded `bottom:20cqw`; if you change this layout, re-derive it.

**The demo slot** holds `bench-demo-frame.jpg`, cropped from the real shipped
`exercise-media/male/barbell-bench-press.webp` render. **It is a still.** The animated WebP lives in
Supabase storage; wire it in and the figure presses while the screen sequence runs around it, which
is what the spec recommends. Resolve the URL from the catalog id via `domain/exercise-detail/media.ts`
— never look it up — and fall back to the male variant when sex is unanswered.

**Nav dots**, between the table and the coach coin: five dots with a chevron either side, the current
one filled `#BA8654` and the rest hollow `#2E2E35`, over "View Plan · 1 / 5". No done or skipped dot
appears because bench press is exercise 1, so the ember `#E0913F` state has no occasion here.

**The primary button sits LEFT** ("Next Exercise", `flex:1.15`), secondary "Add Exercise" right.
Deliberately backwards from the rest of the app: the athlete is mid-set and reaches for the footer
without reading it, so the frequent action takes the reachable slot. Keep the order.

**Four states the mock deliberately omits**, all from the spec's constraints: the rest chip reads
"Off" with no overlay (the timer is off by default, so a countdown would imply behaviour the athlete
has not enabled) · no PR card (a record needs a prior mark, and 185 × 8 does not beat a standing
225 × 3) · no hero collapse (it fires once per exercise on the first set resolved; sets 1–2 are
already done) · no exercise seal (set 3 of 4 is not the last).

**Every logged figure is in the display serif** — weight, reps, target, goal, the insight row, the
band counter. The sans is only chrome around it. Per the workout spec this is "the single most
important thing to carry into the landing page."

---

## 8 · Icon rendering

`forge-symbols.js` declares the canonical attributes:

```js
ICON_ATTRS = { strokeWidth: 2, strokeLinecap: 'square', strokeLinejoin: 'miter', strokeMiterlimit: 8 }
// "Canonical render attributes — the forged DNA. Never override per icon."
```

All 43 glyph attribute runs on this page carry that DNA. Square caps and mitered joins are the forged
characteristic; round caps soften it and are wrong.

Every symbol that exists in the registry is lifted verbatim: `swords`, `mountain`, `shield`, `flame`,
`book`, `medal`, `trophy`, `dumbbell`, `camera`, `scale`, `stopwatch`. Wire these to the real
component rather than re-pasting paths. Micro-glyphs with no registry entry — tick, chevron, play,
pencil, comment, overflow — are authored, and drawn with the same DNA.

**Three deliberate exceptions:** the fuse head keeps `stroke-linecap="round"` (the workout spec
specifies a round cap, and it is a motion element rather than an icon) · the § 4 wax seal keeps its
own weights (brand mark) · the overflow ⋮ is filled circles with no stroke.

---

## 9 · Animation engine

Logic class, lines ~1104–1201. Three concerns:

**`data-rev` — single-element reveals.** Settle with an 70ms stagger within their nearest section.

**`data-scene` + `data-beat` — multi-beat sequences.** Play once on entry, in authored order.
`data-settle` lets an element declare its own end state (`opacity:0` for the sealing modal,
`opacity:0.55` for the forge glow, a `max-width` for the wipe); everything else resolves to
opacity 1 and identity transform.

**The sweep, not `IntersectionObserver`.** Reveals are a repeated sweep over whatever is in the DOM
*now* — on scroll, on resize, and on a 250ms interval for the first 20 seconds. The template streams
in, and a visitor can jump past a section before it exists; one-shot registration left those
sections permanently invisible. Anything at or above the fold settles immediately.

**Reduced motion** collapses everything to end state and disables the three mock loops.

**Sticky CTA bar.** Appears once the hero clears 40% of the viewport, hides again within 85% of the
final CTA. 44px tall button, `env(safe-area-inset-bottom)` padding.

---

## 10 · Wiring checklist

**The App Store URL is one string in three places** — hero CTA, sticky bar, final CTA — each marked
`data-analytics="cta-hero" | "cta-sticky" | "cta-final"` and currently `href="#"`. Swap all three.

**`[SUPPLY]` items:**

- Contact email — must be on this domain (App Store Connect requires it).
- `/privacy` and `/terms` must be **real pages at stable URLs on this domain**, not anchors.

**Claims to re-verify on publish day:**

- "161 database migrations … 2,362 automated tests" (FAQ) — measured 2026-08-14. Re-measure.
- "Free while we're testing" (§ 10) — true until Phase F of the launch checklist. This block and any
  JSON-LD `offers` both become false claims after that.
- No exercise-count figure appears anywhere. **Do not add one** until 721 / 794 / 797 is reconciled.
- No Apple Watch claim. We do not have it, and it is a named strength of a competitor.

**`data-analytics="faq-open"`** on all seven `<details>`.

---

## 11 · Rules this page encodes

Breaking one of these is a regression, not a style choice.

1. **No real photograph of a person.** Two screenshots were pulled for this: the hero showed real
   faces in the avatar and both pinned tiles plus a personal "My Standard" line, and the squads shot
   showed a squad named "Da Bois" with real member faces. Avatars are initials discs everywhere.
2. **No fabricated app screens presented as captures.** The three mocks are built from each screen's
   line-by-line spec, with real registry glyphs and real insignia artwork.
3. **No competitor named.** § 2 compares shapes, not products.
4. **Every claim once.** Duplication was the page's main weakness at 1,222 words.
5. **Meaning-carrying small text is `--fl-gray-400`** (7.03:1), never `--fl-text-tertiary` (3.26:1).
6. **Never encode meaning in hue alone.** § 2's columns carry text tags; the workout table's states
   carry fill and border weight as well as colour.
7. **Positive framing.** The competition footer states ground to make up, never a deficit. Empty days
   are empty, never red.
8. **The em dash means "nothing was said"**, never zero.
9. **Unbuilt things say so.** "Android has no builds yet, and we'd rather say so."

---

## 12 · What was cut, and why it should stay cut

Between V4 and V5, 225 words came out:

- § 7's four card bodies (134 → 57 words). The titles carry it.
- § 5's four sub-explanations (169 → 91). The bold lines were the only part being read.
- § 2's lede (132 → 103). The table states it.
- § 8's capability card bodies shortened (192 → 148).
- The hero proof strip's privacy and history lines, swapped for the logging and program-import
  claims, because §§ 2 and 7 both already make the originals.

The FAQ is the longest section at 214 words and was left alone on purpose: it is collapsed, so it
costs no scroll, and it is the one place a skeptical visitor wants detail.

---

## 13 · Verified measurements

Re-check these after any change to the hero or the mocks.

| Measure | Value |
|---|---|
| Page height at 390px | ~10,970px |
| Hero CTA bottom at 390px | 456px (inside the first screen) |
| Phone frame width at 390px | 390px, no bezel |
| Phone frame at ≥760px | 390px content + 8px bezel each side |
| Legacy scroll travel / max | −352cqw / 360.6cqw |
| Squad scroll travel / max | −274cqw / 277cqw |
| Workout content vs frame | 8px slack |
| Horizontal overflow | 0 |
| Broken images | 0 |
| Unresolved `var(--fl-*)` | 0 of 39 |
