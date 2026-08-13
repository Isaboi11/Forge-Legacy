# W-4 Amendment 001 — A Program Can Be One Week
## Forge Legacy | Version 1.0 — August 2026

**Amendment ID:** W4-Amendment-001
**Status:** 🔒 LOCKED
**Date:** 2026-08-13
**Amends:** `Program-Creation-Wireframe-Spec-W4.md` v1.1 §5.1 (Duration), §8 (Duration semantics),
§Checklist
**Related:** `Program-Architecture-Amendment-002-Short-Programs-And-Completion.md` (PA2-D1)
**Supersedes:** Nothing.

---

## Section 1 — The duration floor

### W4-A1-D1 — 1 to 52 weeks

W-4 §5.1 offers duration as a single-select chip row beginning at **4 Weeks**. The floor moves to **1**.
The ceiling is 52 (`PA2-D1`).

W-4 §8 already establishes that duration is **a label, not a calendar constraint** — *"the system does not
enforce completion within the designed duration"* — and W4-A1-D2 below narrows that. Nothing else in §8
changes.

### W4-A1-D2 — Duration is no longer only a label

§8's rule was written when duration was metadata printed on a card. It no longer is: the declared week
count **is** the structure the athlete builds into, it determines how many sessions the program
prescribes, and since D-RCM-30 it determines whether the program earns rank credit.

**What §8 got right and keeps:** duration does not constrain *elapsed* time. An athlete may take nine
months over an eight-week program, and the product neither hurries them nor withholds a graduation for it
(`Program-Architecture-Amendment-001` §4).

**What is now also true:** duration is a designed quantity with consequences, and the athlete must be
able to see the one that matters. See W4-A1-D4.

---

## Section 2 — Reconciliation: the shipped screen is not the specced screen

### W4-A1-D3 — The build uses a stepper; the six chips never shipped

W-4 §5.1 specifies a chip row — 4 / 6 / 8 / 10 / 12 / 16 Weeks — with §5.1's own rationale that *"free
text invites inconsistent values"* and predefined chips *"produce clean, consistent metadata."*

**The shipped Program Builder uses a numeric stepper**, 4–52, with the hint *"4–52 weeks — supports
multi-month blocks."* The chips do not exist in the app and never did.

The stepper honours the rationale — a stepper cannot produce "~8wks" any more than a chip can — while
covering a range six chips cannot. §5.1's *Post-MVP* note already anticipated this: *"Custom duration
option for programs outside the standard set."* The build arrived there directly.

**The stepper is correct and stands.** §5.1's chip row is recorded as superseded rather than outstanding,
so a future audit does not log it as an unbuilt requirement. The hint text becomes **"1–52 weeks — a
single week, or a multi-month block."**

This reconciliation is recorded because the discrepancy was found while planning this amendment, not
because it caused a defect. It is exactly the "spec says one thing, build does another, nobody wrote it
down" pattern the repository keeps having to unwind.

---

## Section 3 — What the athlete must be told

### W4-A1-D4 — The rank consequence is visible at the point of choice, once

An athlete setting length below 4 is making a choice with a consequence they cannot otherwise know:
the program will not count toward rank progression or the Programs Graduated honors (D-RCM-30).

**A quiet inline line beneath the stepper**, present only while length is 1–3, stating the fact plainly.
Not a warning, not a confirmation, not a modal, and not a thing to dismiss.

**Why it must be there:** a rule the athlete discovers *after* finishing is the product having withheld
something. **Why it must be small:** a one-week block is a legitimate, useful thing to build — a deload,
a travel week, a test week — and the screen must not lecture someone for building one. The register is
the same as the Ended Early record's: state the fact, pass no judgement.

**It never blocks.** There is no confirmation step and no "are you sure". The athlete chose a week
because they wanted a week.

---

## Section 4 — Verification checklist

- [ ] The Builder's length control accepts 1 and clamps below it to 1, not to 4
- [ ] A pasted/imported program of 1 week is no longer stretched to 4, and the "shortest a program can be" toast no longer fires
- [ ] The hint reads "1–52 weeks — a single week, or a multi-month block"
- [ ] The rank-credit line appears at 1–3 weeks and disappears at 4
- [ ] The line never blocks saving and has no dismiss affordance
- [ ] A 1-week program saves, starts, and cues its second session

---

## Section 5 — Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Duration floor 4 → 1 (W4-A1-D1). Narrows §8's "duration is only a label" — it constrains no elapsed time, but it is a designed quantity with a rank consequence (W4-A1-D2). Records that the shipped stepper supersedes §5.1's six chips, which never shipped (W4-A1-D3). Requires the rank consequence be stated inline at 1–3 weeks, without blocking (W4-A1-D4). |

---

*W-4 Amendment 001 — A Program Can Be One Week*
