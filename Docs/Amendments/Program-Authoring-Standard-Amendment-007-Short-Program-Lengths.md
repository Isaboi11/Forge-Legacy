# Program Authoring Standard — Amendment 007: A Block Shorter Than a Mesocycle

**Amends:** `Program-Authoring-Standard-v1.0.md` §8.1 (PAS-D7), §20 (PAS-D7 row)
**Status:** 🔒 LOCKED
**Date:** 2026-08-13
**Related:** `Program-Architecture-Amendment-002-Short-Programs-And-Completion.md` (PA2-D1) ·
`Rank-Computation-Model-Amendment-003-Minimum-Block-Length.md` (D-RCM-30)

---

## The gap

PAS-D7's deload table opens at **4–6 weeks**. Nothing above it. The Standard's field spec is unbounded —
`durationWeeks` is only ever specified as "a positive integer" — so a 1-week program was always
*authorable* on paper and simply never *buildable* in the app.

`Program-Architecture-Amendment-002` makes it buildable, by Coach Holt as well as by hand. The table now
has to say something about the lengths beneath its first row, and one other rule turns out to need saying
with it.

---

## PAS-A7-D1 — The deload table starts at 1

| Program Duration | Deload Rule |
|-----------------|-------------|
| **1–6 weeks** | **No mandatory deload. Optional at the author's discretion.** |
| 7–10 weeks | *(unchanged)* |
| 11–14 weeks | *(unchanged)* |

A widening, not a new rule. The 4–6 band already said "no mandatory deload", and the reason applies with
more force the shorter the block gets: there is nothing to recover from inside a week, and a deload week
inside a two-week block would be half the program.

Nothing else in §8 changes. PAS-D8's encoding, PAS-D9's placement rules and Amendment 006's volume-floor
exemption all continue to apply wherever a deload is actually authored.

---

## PAS-A7-D2 — A short block is a REPRESENTATIVE week, not an opening week

This is the substantive half of the amendment, and it is a rule the Standard has never had to state
because it has never had a program short enough for it to matter.

**A periodised block ramps.** Week 1 sits at the bottom of its rep range and the later weeks climb it —
that is what double progression is, and it is why an opening week is deliberately the easiest week. The
Standard assumes this everywhere: PAS-D7's deload positions, the volume bands, the peak-or-test final
week all describe a shape with a beginning, a middle and an end.

**A 1–3 week block has no later weeks to climb into.** Authored by the ordinary rule, it ships the
introductory week of a mesocycle that does not exist — the easiest week of a program the athlete will
never see the rest of. That is not a truncated block. It is the wrong prescription.

**The rule:** for a program of **3 weeks or fewer**, the prescription anchors at the **midpoint** of each
rep range rather than its floor, and does not ramp across the weeks.

A short block is a week of training the athlete could run in isolation and be trained by. It is what a
deload week, a travel week or a test week actually is: a self-contained, representative piece of work —
not the first step of a staircase.

**Three weeks is the boundary** because it is where PAS-D7's own first band already declines to require
periodisation structure, and because four weeks is where the Standard begins describing a program rather
than a stretch of training (D-RCM-30 sets its rank threshold at the same line, for the same reason).

---

## PAS-A7-D3 — Endurance keeps its own, higher floors

The Endurance Programming Standard sets minimum lengths per race distance — 6 weeks for a 5K, up to 12
for a marathon — and refuses to author below them rather than compressing a plan that cannot honestly be
compressed.

**Those floors are untouched and they outrank PAS-A7-D1.** A 1-week program is a coherent strength or
mobility block; it is not a coherent marathon build, and the endurance rulebook is right to say so in
terms. Opening the general floor to 1 must not be read as overturning a stricter, well-reasoned rule
sitting underneath it.

---

## Verification checklist

- [ ] §8.1's first band reads 1–6 weeks
- [ ] A 1–3 week block prescribes mid-range reps, not bottom-of-range
- [ ] A 4+ week block's prescription is **bit-for-bit unchanged** — the new rule must not leak upward
- [ ] Coach Holt refuses an endurance plan below its distance's floor, with the existing copy
- [ ] No deload is emitted for a program of 6 weeks or fewer

---

## Amendment log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Widens PAS-D7's first band to 1–6 weeks (PAS-A7-D1). Adds the representative-week rule for blocks of 3 weeks or fewer, so a short block is not authored as the opening week of a mesocycle that does not exist (PAS-A7-D2). Records that the endurance minimums are stricter and stand (PAS-A7-D3). |

---

*Program Authoring Standard — Amendment 007*
