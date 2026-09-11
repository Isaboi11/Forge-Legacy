# W-26 Amendment 003 — The Athlete Puts Their Templates in Their Own Order
## Forge Legacy | Version 1.0 — September 2026

**Amendment ID:** W26-Amendment-003
**Status:** 🔒 LOCKED
**Date:** 2026-09-11
**Amends:** `Workout-Templates-Hub-Spec-W26.md` §3.5 and §7 (sort order), **W26-D1** ("single default
sort, no user controls"), and the §10 checklist line "No sort controls visible to athlete".
Also `W26-Amendment-001` W26-A1-D5's "Sort order is untouched" — superseded for the athlete's own templates.
**Related:** `Program-Fork-Edit-Amendment-002-Schedule-Adjustments.md` (the program-week drag this reuses) ·
migration `0201_template_order.sql`
**Supersedes:** W26-D1.

---

## Section 1 — Why

PO, 2026-09-11: *"In my template page, I should be able to rearrange my templates how I want. Same drag
and drop as the days in a program type of feel."*

W26-D1 chose one automatic sort (most recently used first) and no controls. That is the right default and
stays the default. It is the wrong ceiling: an athlete with a Push / Pull / Legs rotation wants them to sit
in that order, not in whatever order they were last trained.

---

## Section 2 — Decisions

### W26-A3-D1 — A manual order, set in a Reorder sheet

A **Reorder** text action sits at the right of a "Your Templates" label above the athlete's own templates,
shown only when there are two or more. It opens a sheet with one fixed-height row per template (name +
"N lifts · N sets"), a ≡ grip that drags, and ▲▼ chevrons for screen readers — the same hook, pitch and
haptics as the program week's reorder. Nothing is written until **Save**.

Not on the cards themselves: the cards are variable height and carry Start and Remove; a drag handle beside
those is three targets on one edge, and the drag needs a fixed pitch.

### W26-A3-D2 — Recency stays the default, and the fallback

Until an athlete saves an order, the list is exactly W26 §7's order. After they do, every template they had
is placed. A template saved **after** the last reorder is unplaced and sits **above** the placed ones (W26
§3's "a new template appears at the top" still holds); unplaced templates keep recency order among
themselves.

### W26-A3-D3 — One order, everywhere

The order is stored on the row (`workout_templates.position`, 0201) and applied by
`workout_templates_list()`, so the Workouts tab's "Your Templates", the program builder's "Use a template",
the train invite and the squad composer all show the athlete's order with no per-screen sorting.

### W26-A3-D4 — Copy

The lede no longer says "Recently used appear first."

---

## Section 3 — Out of scope

- The **From Forge** shelf and **Your Weeks** keep their own orders.
- No sort menu (name, date, etc.) — the athlete's order or the default, nothing else.
