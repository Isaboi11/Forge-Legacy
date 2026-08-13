# Rank Computation Model Amendment 003 — A Graduation Has a Minimum Length
## Amendment to Rank-Computation-Model.md
### August 2026

**Amendment ID:** Rank-Computation-Model-Amendment-003
**Status:** LOCKED
**Type:** Substantive Amendment — narrows the evidence admitted by one threshold row; changes no threshold value
**Date:** 2026-08-13
**Amends:** `Rank-Computation-Model.md` §14.7, §14.7.1 · `Rank-Computation-Model-Amendment-002` D-RCM-29
**Supersedes:** Nothing. D-RCM-29 stands; this qualifies what counts as a graduation for its purposes.
**Authority Chain:**
- `Rank-System-Architecture.md` (LOCKED — architectural authority)
- `Rank-Calibration-Decisions.md` (LOCKED — numeric calibration)
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED)
**Applies to:** RCM §14.7, §14.7.1 · `src/domain/rank/thresholds.ts` · `src/domain/program/progress-core.ts` ·
`honor_metrics()` · migrations 0104 · 0123
**New decision:** **D-RCM-30**
**Related:** `Program-Architecture-Amendment-002-Short-Programs-And-Completion.md` (PA2-D5)
**Origin:** PO direction, 2026-08-13 — *"only 4 and above actually go towards the ranks."*

---

## Section 1 — The Problem

**The rule this amendment writes down is one the product already believed it enforced.**

Amendment 002 §Discussion said so out loud, while arguing that blocks do not over-credit:

> After D-RCM-29 the only remaining acceleration is that **a graduation credits instantly at completion
> with no minimum weekly density**, where a block needs six qualifying weeks.

That sentence names the asymmetry accurately and treats it as bounded. It is bounded — but only by an
accident. Nothing in the RCM, the Program Authoring Standard, or `Program-Architecture-Amendment-001`
sets a minimum program length. The engine counts graduated rows; `honor_metrics()` counts the same rows;
neither reads `weeks`. What has kept the asymmetry small is a **user-interface clamp** — the Program
Builder's stepper would not go below 4 — whose only authority is a line in a design HTML.

`Program-Architecture-Amendment-002` opens program length to one week, because athletes asked for a week
they could build and run. The moment it does, an accident stops holding a rank rule up. A one-week deload
would credit a family promotion and fire five never-revocable honors.

**This amendment converts the accident into a decision.**

---

## Section 2 — Decision D-RCM-30 — A graduation credits only from four designed weeks

### Statement

> **D-RCM-30:** A program graduation earns a structured-development credit **only if the program is
> designed for at least four weeks**. A program below that length completes into the `Finished` state
> (`Program-Architecture-Amendment-002` PA2-D2): it is a permanent record, it earns no credit toward the
> Program Progression row, and it is never counted by the Programs Graduated honor metric. **Threshold
> values at every transition are unchanged.**

### Rules

**R1 — Designed, not elapsed.** The test reads the program's **declared** length — the number the athlete
chose before logging anything — not the calendar time the program occupied and not its walked schedule.
An eight-week program finished over nine months is a graduation. `Program-Architecture-Amendment-001` §4
forbids judging an athlete for taking longer, and **D-RCM-30 does not touch that**; see PA2-D6.

**R2 — Evaluated once, at the seal.** The verdict is computed when the program reaches its terminal
state, from the structure as it stood then, and is never re-derived. This is sound because the structure
is frozen by then (migration 0123 forbids an Active program changing its session count). A rule
re-evaluated on every read could change an athlete's rank retroactively if the threshold ever moved;
this one cannot.

**R3 — Both completion doors.** A program's final session can be **logged** or **skipped**. Both seal the
program and both are subject to R1. A rule applied to only one door is not a rule.

**R4 — Unreadable is not credited.** A structure whose length cannot be read as a number earns no credit.
This follows migration 0104's existing principle that a null session total means *do not graduate* rather
than *graduate at zero*: the product never fails open on a claim it cannot revoke.

**R5 — Honors and rank agree by construction.** Both read `state = 'graduated'`, and a sub-threshold
program never reaches that state. There is no second predicate to keep in step, which is the whole
reason PA2-D2 adds a state rather than a filter.

---

## Section 3 — The number, and the parity question it raises

### Why four

Four is the **shortest length the shipped catalogue contains** — Mobility Foundation is a 4-week block —
so the floor is exactly non-binding on Forge's own programs. It is also the point at which the Program
Authoring Standard's periodisation rules begin: PAS-D7's deload table opens at "4–6 weeks", meaning four
weeks is where the Standard starts describing a program rather than a week of training.

And it is the number that has been in force in practice since the Builder shipped. **D-RCM-30 changes no
athlete's rank**, present or historical: no program below four weeks has ever been creatable, so no
graduated row exists that this would now exclude. It is a rule written to hold a line, not to move one.

### ⚠ The parity gap, stated rather than left to be discovered

`SELF_DIRECTED_BLOCK` requires **six** qualifying weeks. D-RCM-29 says the two forms of evidence are
*"additive at parity"*, and RCM §14.7.1 justifies the six by calibration to the catalogue:

> Credits are additive at full parity: one block satisfies exactly as much of the requirement as one
> graduation. `weeks` and `minDaysPerWeek` are calibrated to the shipped catalogue — both authored
> programs are 6 weeks at 3–4 sessions per week — so parity is measured against what a graduation
> actually is in this product.

**A program floor of four against a block floor of six is not parity.** A 4-week program earns a credit
that four weeks of self-directed training does not.

Three options were weighed:

| | Effect | Verdict |
|---|---|---|
| **(a) Accept the gap, stated** | A program is *authored and adhered to*; a block is *inferred from behaviour*. Different evidence classes carry different bars. | **CHOSEN** |
| (b) Raise the program floor to 6 | True parity — and it strips credit from Mobility Foundation, a shipped 4-week program, and from every 4- and 5-week program an athlete builds | Rejected |
| (c) Lower the block floor to 4 | True parity — and it moves rank arithmetic for **every existing athlete**, retroactively | Rejected |

**Chosen: (a).** A program graduation is evidence of a commitment made in advance and carried out — the
athlete declared the shape before they knew whether they could finish it. A self-directed block is
evidence reconstructed afterwards from what happened. Those are honestly different claims, and the
six-week bar on the inferred one is what keeps it from reading as a participation trophy (Amendment 002
§R2's own argument). Requiring the same number of both would either devalue the block or over-tax the
program.

**The gap is not new.** Every buildable program has cleared four weeks since the Builder shipped, so this
asymmetry has been live since D-RCM-29 was written. `Program-Architecture-Amendment-002` makes it
*visible* by permitting programs below the line; it does not create it.

It is recorded here because an unstated inconsistency in a rank model is the kind of thing an athlete
finds first.

---

## Section 4 — What is unchanged

Recorded so absence reads as decision.

- **Every threshold value in §14.11.** No family transition asks for more or fewer graduations.
- **D-RCM-29 in full.** Blocks still credit at parity with graduations; the block rule is untouched.
- **`selfDirectedBlocks` and its derivation.** Not read, not changed.
- **`distinctProgramGraduations` (CAL Q14).** A sub-threshold program never becomes a graduated row, so it
  never enters the distinct count either — no separate rule needed.
- **Amendment 001 §4's "regardless of how long it took."** About elapsed time; see R1 and PA2-D6.
- **The Ended Early path.** A short program abandoned partway is Ended Early, exactly as a long one is.

---

## Section 5 — Implementation contract

**One number, one home.** `STRUCTURED_DEVELOPMENT_MIN_WEEKS = 4` lives in
`src/domain/rank/thresholds.ts`, beside `SELF_DIRECTED_BLOCK` — the same question asked of the other
evidence form, in the file that has no runtime imports and can therefore be read from anywhere.

**The predicate is an SQL/TypeScript twin**, following the precedent `program_total_sessions(jsonb)` and
`totalSessions()` already set: the SQL copy exists because the server must decide credit **without
trusting the client**, since what a graduation buys is a rank family and five permanent honors. Both
copies carry golden vectors, and the SQL copy asserts them at apply time so the two cannot drift silently.

**It must be total.** It runs inside the workout-save commit. It never raises, whatever JSON it is handed
— typed reads, never a bare cast — because a throw there would cost the athlete a logged session.

**Applied at exactly two write sites** (R3): the graduation block inside `save_workout`, and the terminal
write inside `skip_program_session`.

---

## Section 6 — Verification checklist

- [ ] 4 weeks → credited. 3 weeks → not credited. The boundary is asserted in both the SQL and TS vectors
- [ ] A program whose final session is **skipped** reaches the same verdict as one whose final session is logged
- [ ] `honor_metrics()->>'programs_graduated'` is unchanged by a sub-threshold completion
- [ ] The rank engine's graduation count is unchanged by a sub-threshold completion
- [ ] `distinctProgramGraduations` is unchanged by a sub-threshold completion
- [ ] A malformed structure (`{"weeks":"four"}`, `null`) returns *not credited* and raises nothing
- [ ] Pre-flight: no existing `programs` row is below 4 weeks. If any exists, its verdict is decided explicitly — **a graduated row is never rewritten**

---

## Section 7 — Amendment log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Adds **D-RCM-30**: a graduation credits only from four designed weeks. Records that this changes no athlete's rank because the floor has been in force as a UI clamp since the Builder shipped. Confronts the parity gap against `SELF_DIRECTED_BLOCK`'s six weeks and accepts it in writing, with the authored-vs-inferred distinction as the stated reason. Defines the designed-not-elapsed rule (R1), the evaluated-once rule (R2), the both-doors rule (R3), and the fail-closed rule (R4). |

---

*Rank Computation Model Amendment 003 — A Graduation Has a Minimum Length*
