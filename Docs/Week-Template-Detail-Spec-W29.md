# Forge Legacy — W-29 Week Template Detail
## Wireframe Specification v1.0 | August 2026

**Spec ID:** W-29
**Status:** 🔒 LOCKED
**Date:** 2026-08-13
**Route:** `/week-template/[id]`
**Authority:** `Program-Architecture-Amendment-002` · `W26-Amendment-002` ·
`Rank-Computation-Model-Amendment-003` (D-RCM-30) · `Monetization-Architecture-Amendment-004`
**Sibling:** `Workout-Template-Detail-Spec-W27.md` — the one-session version of this screen
**Design authority:** ⚠ **None.** See §7.

---

## Section 1 — Purpose

One saved week: what is in it, and the decision to run it.

A **week template** is a `ProgramStructure` pinned to one week (migration 0157). Running it creates a
one-week program and starts it, after which every existing program surface takes over — the sessions cue
in order, the log fills in, and it seals as `finished` when the last one lands.

### W29-D1 — This screen is about a SHAPE; its siblings are about RECORDS

W-27 shows a workout template's usage history, because a session logged from one carries `template_id`.

**W-29 has no history section, deliberately.** A week template's history is the *programs* it produced,
and each of those already has a Program Detail screen with its own log, its own stats and its own sealed
record. Listing them here would be a thinner copy of a screen that exists. Running a week takes the
athlete to that screen, which is where the history of that run lives.

The absence is a decision. The alternative considered — a "Times run" counter — would have been a second
fact to keep in step with the programs table for no meaning the athlete cannot already get.

---

## Section 2 — Anatomy

```
┌────────────────────────────────────────────┐
│ ‹   Deload Week                       ••• │  ← AppBar; ••• holds Delete only
├────────────────────────────────────────────┤
│ WEEK TEMPLATE                              │  ← eyebrow, bronze
│ Deload Week                                │  ← display serif
│ 3 sessions · Push, Pull, Legs              │  ← weekSummary()
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Starting this creates a one-week       │ │  ← the two facts that
│ │ program that cues each session as you  │ │    cannot be inferred
│ │ finish the last. It won't count toward │ │
│ │ your rank — everything you log still   │ │
│ │ does.                                  │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌ Push ─────────────────────────────────┐  │
│ │ Barbell Bench Press          3 × 8–12 │  │
│ │ Incline DB Press             3 × 10   │  │
│ └───────────────────────────────────────┘  │
│ ┌ Pull ─────────────────────────────────┐  │
│ │ …                                     │  │
├────────────────────────────────────────────┤
│  ▸  Start This Week                        │  ← one bronze primary
│  [ Edit ]            [ Duplicate ]         │  ← quiet peers
└────────────────────────────────────────────┘
```

### W29-D2 — One bronze thing on the screen

**Start This Week** is the primary and the only filled control. Edit and Duplicate are outlined peers.

**Delete is behind the ••• overflow**, per W-27's own rule that a destructive action must never be one
tap from the primary one — and here the primary one is directly above it.

---

## Section 3 — The note, and why it is a note

### W29-D3 — Two facts stated once, plainly, and never as a warning

An athlete cannot infer either of these from the contents:

1. **Running it creates a program that cues its own sessions.** Otherwise a week template reads like a
   workout template — start it and you are in a session — and the athlete would not know the second day
   is waiting for them.
2. **It earns no rank credit** (D-RCM-30). A rule discovered *after* finishing is the product having
   withheld something.

The second sentence ends *"everything you log still counts"*, because it does: every session feeds
volume, consistency, honors and self-directed blocks. Stating the exclusion without the inclusion would
be true and misleading.

**Register: descriptive, not evaluative.** A one-week block is a legitimate thing to run — a deload, a
travel week, a test week — and the screen must not read as talking the athlete out of it. No warning
icon, no amber, no dismissal, no confirmation.

---

## Section 4 — Starting it

### W29-D4 — Ask by name whenever there is something to lose

Starting ends the athlete's active program — one Active at a time, no exceptions (Program Amendment 001
§2), enforced inside `start_program`.

So Start opens a confirmation **naming the program that will end**, and only when one is active. With no
active program it starts immediately: a confirmation with nothing to confirm is a tax.

The sheet says the ending cannot be undone and that the record will show *ended early*, because both are
true and both are permanent.

**This must not be softer than the Program Detail version merely because a week feels smaller.** An
athlete six weeks into a twelve-week block would otherwise lose it to a deload week they assumed was
additive.

### W29-D5 — A failed start leaves nothing behind

Creating the program and starting it are two round trips. If the second fails, the first is rolled back
by deleting the created row — otherwise the athlete has an invisible `future` program they did not ask
for, which has already spent a cap unit.

This is the only place in the codebase that deletes a program, and it is safe precisely here: the row is
`future`, untrained, seconds old, and the delete policy permits exactly that state.

---

## Section 5 — Editing and deleting

### W29-D6 — Edit opens the Program Builder in week mode

`/program-builder?mode=week&o=edit&id=…`. The same Day Builder, exercise picker and template-into-day
sheet the program path uses; length and per-week structure are hidden because a week has neither.

### W29-D7 — Deleting the shape never touches the training

`week_templates` rows are deletable. The programs they produced are not (PA2-D7), and
`on delete set null` on the provenance column keeps them whole.

The confirmation says so — *"Any programs you already ran from it, and everything you logged, stay
exactly as they are"* — because a delete dialog that does not mention the training reads as a threat to
it. Never Charge For History, applied to a confirmation string.

---

## Section 6 — Not-found, loading, error

Identical to W-27, including its rule that **a broken id is not-found, never a fallback to some other
week**. Silently showing a different week than the link named is worse than the not-found state.

---

## Section 7 — ⚠ No `.dc.html` exists for this screen

PD-7 holds that the design governs. **There is no design for a week template hub or detail** — the
concept postdates the design pass.

This screen therefore reuses, rather than invents: W-27's page structure and action hierarchy, the
Templates hub's card and shelf styles, and `buildLog`'s existing day/exercise rendering. Where a decision
had no precedent to copy, it is recorded above with its reasoning.

**Flagged for design sign-off**, not treated as permission. The precedent is the notification feed, which
also shipped without a `.dc` and was recorded the same way.

---

## Section 8 — Verification checklist

- [ ] Hero reads "1 week · N sessions"; every built day and its exercises render
- [ ] The note states both facts and contains no warning affordance
- [ ] Start with **no** active program → starts immediately
- [ ] Start **with** an active program → confirmation naming it; cancel leaves everything untouched
- [ ] Confirming lands on the new program's detail screen, and session 1 cues session 2 when finished
- [ ] A failed start leaves no orphan `future` program
- [ ] Edit round-trips through the builder and saves back to the same week
- [ ] Duplicate lands on the copy, not the original
- [ ] Delete is behind ••• only; its confirmation mentions that logged training survives
- [ ] A deleted week's previously-run programs are still present and intact
- [ ] An unknown id renders not-found, never another week

---

## Section 9 — Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Records the no-history decision (W29-D1), the action hierarchy (W29-D2), the two-fact note and its register (W29-D3), the name-the-program confirmation (W29-D4), orphan cleanup on a failed start (W29-D5), edit routing (W29-D6), and the delete-the-shape-not-the-training rule (W29-D7). Flags the absent `.dc` for design sign-off (§7). |

---

*W-29 Week Template Detail — Wireframe Specification v1.0*
