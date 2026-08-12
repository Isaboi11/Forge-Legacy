# Weekly Review — Revision Notes, Round 1

**For:** the design session holding `Weekly Review Card.dc.html` and `Your Week.dc.html`
(project `b029488a`). **Companion to:** `Docs/Weekly-Review-Design-Brief-v1.0.md`.

---

## The instruction that governs this round

**Do not restructure either screen.** Both already exist and ship today. This round is styling and
correctness — same blocks, same order, same content. Where a change below says "restore", it means put
the shipped structure back, not design a new version of it.

You got the hard rules right — no comparison, no ring, no grade, no streak anywhere. None of that
changes. Everything below is smaller than that.

---

## A · Fix in both files

### A1 · Holt's sentences are in the display serif. They must be sans.

Both files set his 2–3 sentences in `--fl-font-display` (Playfair) — the card at 20px/600, the screen at
19px. `tokens/foundation.css` states the rule in its own comment:

> *"Sans carries labels, stats, and body. The display serif is reserved for hero names, screen titles,
> and the legacy statement."*

A 180-character paragraph in 20px Playfair is a pull quote. It makes a quiet weekly read look like a
landing page, and it fights the "no celebration" rule in the brief.

**Change to:** `--fl-font-sans`, **14px**, `line-height: 1.5`, `color: var(--fl-text-secondary)`.
Both files. The display face stays where it belongs — the screen title, the stat numbers.

### A2 · Holt is being drawn as an honor medal. He needs his own mark.

Both files render him with `Insignia variant="honor"`. On **Your Week** this is worse than it sounds:
his 52px "honor" insignia sits directly above an Honors section that renders **the same component** at
40px. The coach and an award become the same object.

**Change to:** the real mark, already in this project at **`assets/coach-holt-mark.png`**. Same asset the
Coach Holt Chat handoff uses. Never render Holt with the honor insignia.

---

## B · Fix on the card

### B1 · The title is the dimmest token in the system

`Holt looked at your week` is currently **13px `--fl-text-tertiary`** (#666060) — roughly 3:1 against the
card surface, under the 4.5:1 floor, and *smaller and dimmer than the bronze eyebrow above it*. The
header currently reads: bronze label → nearly invisible byline → giant serif quote.

**Change to:** title at **18px `--fl-font-display`, `--fl-text-primary`** (display is correct here — it
is a title). And drop the duplicated words: the eyebrow becomes **the date range only** (`3 – 9 AUGUST`),
since "Your week" currently appears twice in the same four lines.

### B2 · `bodyColor` is dead code, and the upsell is wearing Holt's typography

`renderVals` computes `bodyColor` (tertiary when locked) and the markup never uses it — the body is
hardcoded `--fl-text-primary`. So in the **locked** state, the sales line *"Holt's read on it comes with
the paid tier"* renders in the same 20px cream serif as his actual coaching.

**Change to:** delete the unused `bodyColor`, and let A1 apply to both states — sans 14px
`--fl-text-secondary`. The locked line is a product statement, not the coach speaking, and must never
look like it.

### B3 · Skip is stacked as a full-width button 2px under the primary

Two stacked full-width buttons read as two equal choices, and 2px between a 46px primary and a 40px
dismiss is a mis-tap on an action that hides the card.

**Change to:** the shipped arrangement — primary pill on the left, **Skip as bare text beside it**, not
full width, not stacked, with at least 12px between them.

### B4 · Small

- The stat strip puts `border-right` on **every** column, including the last. Drop it on the final one.

### B5 · Keep, unchanged

The boxed, divided, **labelled** stat strip with units — this fixes the bare `24,180` and gives volume
its `lb`. Keep it exactly as you have it. Also keep the date on the card, and keep the card positioned
below the in-progress hero in the Home mock. That placement is correct.

---

## C · Your Week — put the structure back

### C1 · Restore the four-stat strip

Currently: a **58px hero "Sessions"** number, Days demoted to a caption (*"across 3 days"*), and Volume /
Under iron in a 2-up beneath.

Shipped and correct: **four stats of equal weight — Sessions · Days · Volume · Under iron.**

Two reasons this is not a taste call:

1. **It breaks on the plain week**, which is what most athletes see. Your own `plainest` state renders a
   giant **2** beside a **0 lb** — a legitimate bodyweight-and-cardio week. Four equal stats absorb a
   zero; a promoted number broadcasts it.
2. **It broke the family backwards.** The squad recap next door uses a boxed, divided strip. Your *card*
   now matches it and the *screen* — the surface that is supposed to rhyme with squad recap — does not.

**Change to:** the four-stat boxed divided strip, using the same treatment you built for the card. Keep
the units and labels. Delete the 58px number and the "across N days" caption.

### C2 · Heaviest goes back to a row

Currently a hero card: 34px number, radial glow, the loudest block on the screen after the sessions
number. But per §4 of the brief, **heaviest is the fallback fact** — the thing Holt names only when there
is no honor and no PR. It is the most ordinary line on the screen and it is getting the biggest
treatment.

**Change to:** a plain row in a section card — name on the left, `315 lb × 5` on the right. Same row
treatment as the PR and Honor rows.

### C3 · PR rows draw a doubled top border

Every PR row carries `border-top`, including the first, inside an already-bordered container — so the
first row doubles the card's own top edge.

**Change to:** divider from the second row onward only.

### C4 · Drop the ★ on PR rows

A star already means *favourited* elsewhere in this app (Exercise Library), and honors have their own
medal language. A third meaning for a third symbol is one too many.

### C5 · Keep, unchanged

- **The real date format** — `3 – 9 August 2026` instead of the raw ISO the app currently prints. This
  was an open question in the brief and you answered it well. Keep the small bronze rule beside it.
- **The loading skeletons.** Better than the centred spinner that ships today, and correct in reasoning:
  the frame and app bar are already true, only the contents wait.
- **The `HOLT · YOUR COACH` byline** above his sentence.
- **The empty state**, exactly as-is.
- **Volume = 0 as a real, unremarkable state.** You handled it; keep handling it.

---

## D · How to check the result

**Show the plainest week first, in both files.** 2 sessions, 0 volume, no heaviest, no PRs, no honors,
a two-sentence note. If it looks composed and unremarkable at that state, it is right. If it looks empty
or looks like a bad week, something is still being promoted that should not be.

---

## E · One note for implementation, not design

Weight units. The design shows `lb` throughout, which is correct as the canonical unit — but the app has
an athlete-level kg setting, and today the card converts nothing while the screen converts only Holt's
sentence. That is a code fix on our side, not yours. **Just leave room for the unit to be two characters
wide either way** — do not tuck `lb` where `kg` would not also fit.
