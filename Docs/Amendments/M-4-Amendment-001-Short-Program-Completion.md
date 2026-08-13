# M-4 Amendment 001 — A Week That Finishes Is Not a Graduation
## Forge Legacy | Version 1.0 — August 2026

**Amendment ID:** M-4-Amendment-001
**Status:** 🔒 LOCKED
**Date:** 2026-08-13
**Amends:** `M-4-Program-Graduated-Spec.md` v1.1 §2 (Trigger Sources), §6.1 (Priority Position),
§8 (Edge Cases) · `Workout-Summary-Spec-W17.md` (graduation state)
**Related:** `Program-Architecture-Amendment-002-Short-Programs-And-Completion.md` (PA2-D2, PA2-D7) ·
`Rank-Computation-Model-Amendment-003-Minimum-Block-Length.md` (D-RCM-30)
**Supersedes:** Nothing. M-4 v1.1 stands; this adds one exclusion and one non-ceremony beside it.

---

## Section 1 — Why

`Program-Architecture-Amendment-002` permits programs shorter than four weeks, and D-RCM-30 rules that
they earn no rank credit and no Programs Graduated honors. Something still has to happen when the athlete
logs the last session of a one-week block.

M-4 is the wrong thing. It is a full-screen ceremony whose copy congratulates a graduation, whose queue
position sits above M-2, and whose subject is an act that buys five permanent honors and progress toward
a rank family. Firing it for a week that buys none of that would have the product celebrate something it
does not itself count — and the athlete would find out later, on the What's Next screen, that the
ceremony was overstating.

Nothing is the wrong thing too. A week the athlete planned and finished is a real record, it is written
to the timeline, and it is permanent (PA2-D7). A completion with no acknowledgement at all reads as a
plan that fizzled out.

---

## Section 2 — Decisions

### M4-A1-D1 — M-4 fires only on `Graduated`

§2's trigger table is unchanged in shape. Its "M-4 does not fire when" list gains one row:

> - **The program completed below the structured-development threshold** (D-RCM-30). It seals as
>   `Finished`, not `Graduated`, and `Finished` is not a trigger source.

This needs no predicate of its own. §2 already requires the program to have reached `Graduated`, and a
sub-threshold program never does. **The exclusion is a consequence of PA2-D2, and is written here only so
that a reader of M-4 alone can see it.**

### M4-A1-D2 — A short completion is a non-ceremony, not a fifth ceremony

The acknowledgement is **an inline state on W-17**, not a modal.

It is deliberately **not** a new `CeremonyKind`. The ceremony queue's priority order (M-1 → M-3 → M-4 →
M-2) is locked, its atomicity rules are locked, and its deferred-delivery behaviour is locked. Adding a
fifth kind would mean reopening all three to place it — and placing it would mean deciding whether a week
outranks an honor, which is a question worth not having.

**Consequences, stated so they are not rediscovered as bugs:**

- No queue entry, no deferral, no persistence. If the app dies before W-17 loads, the record is intact
  (the state transition is atomic with the session save) and no acknowledgement is owed.
- It never competes with, defers, or suppresses M-1, M-2 or M-3. A week that finishes on the same session
  as a rank advancement shows the rank ceremony; the week is stated on the summary beneath it.
- §6.4's secondary-link suppression rule does not apply, because there is no ceremony to suppress links in.

### M4-A1-D3 — The copy states what happened and claims nothing else

The W-17 state names the week, names the sessions completed, and offers the same onward action a sealed
program offers: run it again, or pick what's next.

**It does not say "graduated", "complete", or "congratulations" in ceremony register**, and it does not
gesture at rank or honors — not to hide anything, but because the honest sentence is small and inflating
it is precisely the failure this amendment exists to avoid. A week you planned and finished is worth
saying plainly and worth saying once.

Nor does it apologise, explain the four-week rule, or tell the athlete what they *would* have earned.
Product DNA: the record is descriptive, not evaluative. An athlete who wants the rule can find it on
What's Next, where the requirement is already stated in full.

### M4-A1-D4 — Timeline yes, share deferred

A short completion **writes a timeline entry** — it is a permanent record (PA2-D7) and the timeline is
where permanent records live. Its copy differs from a graduation's, exactly as Ended Early's already does
(`Program-Architecture-Amendment-001` §6).

**Sharing is deliberately not built.** §7.4's "Share this graduation" belongs to the ceremony, and there
is no ceremony here. Whether a finished week is worth a share card is a real question and a separate one;
it is recorded as unresolved rather than answered by default in either direction.

---

## Section 3 — What is unchanged

- **§4 Anatomy, §5 States, §6 Queue Behavior, §7 Navigation** — untouched. M-4 for a real graduation is
  bit-for-bit what it was.
- **M4-D1** (state transition at session save, atomic with the log) — unchanged, and it is what makes
  M4-A1-D2's "no ceremony owed after a crash" safe.
- **§8.1 offline / §8.8 imported** — unchanged; both already fire no ceremony.
- **The queue priority order** — unchanged, and deliberately so (M4-A1-D2).

---

## Section 4 — Verification checklist

- [ ] A ≥4-week program completing → M-4 fires exactly as v1.1 specifies, with every context row intact
- [ ] A <4-week program completing → **no** M-4, no queue entry, W-17 shows the inline state
- [ ] A <4-week program completing on the same session as a rank advancement → M-1 fires; the week is stated on the summary, not queued behind it
- [ ] The inline state's copy contains no rank or honor claim
- [ ] A timeline entry is written, with copy distinct from a graduation's
- [ ] Killing the app before W-17 loads leaves the record sealed and owes no ceremony

---

## Section 5 — Open, and recorded as open

| # | Question |
|---|---|
| 1 | Whether a finished week should be shareable, and on what card (M4-A1-D4). Not answered here. |

---

## Section 6 — Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Adds the sub-threshold exclusion to §2's does-not-fire list (M4-A1-D1). Rules that a short completion is an inline W-17 state rather than a fifth ceremony, keeping the locked queue order and atomicity closed (M4-A1-D2). Sets the copy register (M4-A1-D3). Writes a timeline entry, defers sharing (M4-A1-D4). |

---

*M-4 Amendment 001 — A Week That Finishes Is Not a Graduation*
