# Program Architecture Amendment 002 — Short Programs, and a Fifth State
## Forge Legacy | Version 1.0 — August 2026

**Amendment ID:** Program-Architecture-Amendment-002
**Status:** 🔒 LOCKED
**Date:** 2026-08-13
**Amends:** `Program-Architecture-Amendment-001-Active-Program-Rule.md` §1 (States), §4 (Graduation Rule),
§6 (Legacy Rules), §7 (Downstream Impact)
**Related:** `Rank-Computation-Model-Amendment-003-Minimum-Block-Length.md` (D-RCM-30) ·
`M-4-Amendment-001-Short-Program-Completion.md` · `W4-Amendment-001-Single-Week-Programs.md` ·
`Monetization-Architecture-Amendment-004-Short-Program-Cap.md`
**Supersedes:** Nothing. Amendment 001 stands in full except where narrowed below.

---

## Section 0 — Why

A tester asked for **a template for a full week** — not a program, just a week they could build once and
run. The natural implementation is a one-week program: the Program Builder already authors weeks, and
`scheduleSlots` already cues the next session inside one.

Auditing what stood in the way found something else. **The rule that "a program must be four weeks to
count" does not exist anywhere.** Graduation is `logged_sessions >= program_total_sessions(structure)`
(migration 0104); rank counts graduated rows; `honor_metrics()` counts the same rows. **None of the three
reads program length.** The reason only 4-week-and-longer programs count today is that nothing shorter
can be *created*: a UI clamp (`WEEKS_MIN = 4`) whose only authority is a line in a design HTML.

So the credit rule the product believes it enforces is an accident of a stepper's lower bound. Opening
program length to one week without writing that rule down would let a deload week earn a rank family
promotion and five never-revocable honors.

This amendment writes the rule down, and adds the state that lets a short program finish honestly.

---

## Section 1 — Program length

### PA2-D1 — A program is 1 to 52 weeks

Amendment 001 never constrained length; neither does `Program-Authoring-Standard` (`durationWeeks` is
specified only as "a positive integer"). The floor of 4 was a Builder clamp. **It is lowered to 1.** The
ceiling of 52 is unchanged.

This applies to every authoring path — the Program Builder, spreadsheet import, and Coach Holt. The
endurance rulebook's own, higher floors (6–12 weeks depending on race distance) are a **separate and
stricter** rule about what a race plan needs, and they stand untouched.

---

## Section 2 — A fifth state

### PA2-D2 — `Finished` joins the four states of §1

Amendment 001 §1 defines four mutually exclusive states. A fifth is added:

| State | Definition | Limit per Athlete |
|-------|-----------|------------------|
| **Finished** | A program **shorter than the structured-development threshold** reached its final scheduled session. | Unlimited |

Legal transitions gain exactly one:

```
Active → Finished        (final session of a program below the threshold)
```

**There are no other new transitions.** A Finished program cannot be reactivated, cannot be converted to
Graduated or Ended Early, and cannot be reached from Future without first becoming Active. History cannot
be rewritten.

### PA2-D3 — Graduated keeps meaning exactly one thing

This is the point of the state, and it is worth stating as a decision rather than leaving it as an
implementation note.

`honor_metrics()` computes `programs_graduated` as a live `count(*)` over `programs where state =
'graduated'`, and the rank engine's `programGraduations` is the same count. An honor is a **permanent
claim about a specific act**; "5 Programs Graduated" awarded to an athlete who graduated none would be a
false statement in a record this product promises cannot be rewritten.

By giving a short completion its own state rather than teaching every consumer to inspect program length,
the honors path and the rank path need **no change at all** — they already ask the only question that
matters. Any future query written against `state = 'graduated'` is correct by default rather than by
vigilance.

### PA2-D4 — The decision is made once, at the transition, and this is safe

Whether a program earns credit is evaluated **at the moment it seals**, from the structure as it stood
then — not re-derived on every read.

This is only sound because the structure is frozen by then, and it is: migration 0123 forbids an Active
program changing its session count, and a Future program cannot reach a terminal state. A Future
program's length may still be edited freely, which is correct — nothing has been claimed yet.

**Consequence for implementers:** migration 0123's guard must learn `Finished`, or a sealed short program
would be freely restructurable and §6's permanence rule would be violated in a state that rule does not
yet name.

---

## Section 3 — Credit

### PA2-D5 — Structured-development credit requires four designed weeks

A program contributes to rank progression and to the Programs Graduated honors **only if it is designed
for at least four weeks**. Below that it is Finished: recorded, permanent, visible, and worth nothing to
the ladder.

The threshold, its rationale, and its relationship to the self-directed-block rule are owned by
**D-RCM-30** in `Rank-Computation-Model-Amendment-003-Minimum-Block-Length.md`. This amendment defers to
it and does not restate the number as an independent authority — one number, one home.

The test reads the program's **declared** `weeks`, not its walked schedule. The two can differ (a week
with nothing built in it still occupies a week), and the declared number is what the athlete chose, what
the stepper showed, and what the record will say.

### PA2-D6 — §4's "regardless of how long it took" is NOT overturned

Amendment 001 §4 ends:

> A program that reaches its final workout and is completed through the standard workout logging flow is
> always Graduated — regardless of how long it took, whether the athlete took breaks, or any other
> circumstance.

**That sentence is about ELAPSED time and it stands in full.** An athlete who takes nine months over an
eight-week program graduates it. Nothing here permits the product to withhold a graduation because
someone was slow, ill, or interrupted — that reading would invert the sentence's purpose, which was to
forbid exactly that judgement.

PA2-D5 is about **designed length**: how much training the program prescribes, chosen before a single
session is logged. A one-week plan is not a graduation that took too long. It is a different size of
thing.

This distinction is written out because a later reader encountering PA2-D5 beside §4 would otherwise be
entitled to conclude the amendment reversed it.

---

## Section 4 — What a Finished program gets

### PA2-D7 — Recorded and permanent, with a lighter acknowledgement

| | Graduated | **Finished** | Ended Early |
|---|---|---|---|
| Can be deleted | No | **No** | No |
| Can be reactivated | No | **No** | No |
| Remains visible permanently | Yes | **Yes** | Yes |
| Timeline entry | Yes | **Yes** (own copy) | Yes |
| M-4 ceremony | Yes | **No** | No |
| Programs Graduated honors | Yes | **No** | No |
| Rank structured-development credit | Yes | **No** | No |

A Finished program is a **permanent legacy record** on the same footing as the other two sealed states.
It is undeletable and immutable for the same reason they are.

What it does not get is the ceremony. M-4 congratulates a graduation and the honors behind it are
permanent; firing it for a week the ladder does not count would be the product telling the athlete
something it does not itself believe. The acknowledgement is inline and quiet — the shape of it is owned
by `M-4-Amendment-001-Short-Program-Completion.md`.

### PA2-D8 — Re-running a Finished program is a new program

Identical to Graduated (§1). The sealed record stays sealed; "Run This Week Again" creates a new row.
This is what makes a week template worth having: the same week, run four times, is four honest records.

---

## Section 5 — What this amendment deliberately does NOT change

Recorded so that absence reads as decision rather than oversight.

- **One Active program at a time (§2) is untouched.** Starting a one-week program while another is active
  ends that program, through the existing Conflict Resolution Sheet and its existing warning. The
  non-destructive alternative — Add to Planned, a `Future` row — already exists. **No queue is
  introduced**, and none was asked for: the PO's "it cues the next one" referred to the next *session
  inside the week*, which `scheduleSlots`/`nextOpenSlot` already do for any structure.
- **Ended Early (§5) is untouched.** A short program abandoned partway is Ended Early, exactly as a long
  one is.
- **The graduation mechanism (§4 steps 1–5) is untouched** for programs at or above the threshold.

---

## Section 6 — Downstream impact

| Surface | Impact |
|---|---|
| **W-3** Program Detail | Fifth lifecycle state: pill "Week complete", CTA "Run This Week Again". ⚠ The state switch currently falls through to the *Planned* view, which would render a **Start Program** button on a sealed record |
| **W-4** Program Create | Duration floor 4 → 1 (`W4-Amendment-001`) |
| **W-17** Workout Summary | New inline completion state; no graduation flow |
| **M-4** | Fires only on Graduated (`M-4-Amendment-001`) |
| **Legacy Timeline** | New event type for a short completion |
| **Honors** | No change by construction (PA2-D3) |
| **Rank (RCM §14.7)** | No change by construction (PA2-D3); the threshold is D-RCM-30 |
| **Monetization** | Short programs charge a separate allowance (`MA-Amendment-004`) |
| **Coach Holt** | May author 1–52 weeks; short blocks need their own prescription rule (`PAS-Amendment-007`) |

---

## Section 7 — Verification checklist

- [ ] A program of ≥4 weeks completing its final session → `Graduated`, M-4 fires, honors count it, rank counts it
- [ ] A program of <4 weeks completing its final session → `Finished`, M-4 does **not** fire, `honor_metrics.programs_graduated` unchanged, rank graduation count unchanged
- [ ] The last session **skipped** rather than logged reaches the same verdict — skipping is a second completion door
- [ ] A `Finished` program cannot be deleted, restarted, or restructured
- [ ] A `Finished` program's structure cannot be edited (0123 guard knows the state)
- [ ] W-3 renders a `Finished` program without a Start button
- [ ] "Run This Week Again" produces a **new** row and leaves the original sealed
- [ ] No existing program row is below 4 weeks at the time the gate lands — and if any is, its verdict is decided explicitly rather than rewritten

---

## Section 8 — Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Opens program length to 1–52 weeks (PA2-D1). Adds the `Finished` state (PA2-D2) and the argument for a state over a derived predicate (PA2-D3, PA2-D4). Requires four designed weeks for structured-development credit, deferring the number to D-RCM-30 (PA2-D5). Records explicitly that Amendment 001 §4's "regardless of how long it took" is about elapsed time and is not overturned (PA2-D6). Defines what a Finished program keeps and what it gives up (PA2-D7, PA2-D8). Records that the one-Active-program rule is deliberately untouched and that no program queue is introduced (§5). |

---

*Program Architecture Amendment 002 — Short Programs, and a Fifth State*
