# Program Authoring Standard — Amendment 004: How a Set Counts Toward Weekly Volume

**Amends:** `Program-Authoring-Standard-v1.0.md` §11.2 (HYPERTROPHY volume target)
**Status:** 🔒 LOCKED
**Date:** 2026-08-06
**Decided by:** Product Owner
**Affects:** every Blueprint carrying a per-muscle weekly table — `Muscle-Building-Foundation`, `Muscle-Building-Intermediate`, `Muscle-Building-Advanced`, `Lower-Body-Foundation`, `Lower-Body-Intermediate`

---

## What §11.2 said

> **Volume target:** 10–20 sets per muscle group per week. Distribute across sessions; do not concentrate
> all sets for one muscle group into a single session.

## Why it was not usable

**It never said what counts as a set for a muscle**, and the answer changes the verdict completely.

A barbell bench press is `chest` Primary, `triceps` and `front_deltoids` Secondary. Five sets of it is
five chest sets — but is it five triceps sets, zero, or something between? The Standard does not say, so
"10–20 sets per muscle group per week" cannot be checked, only asserted.

Measured on the first Stage-2 program to be authored against it, Muscle Building Intermediate, the two
reasonable readings disagreed on **six of twelve** muscle groups:

| Reading | Result |
|---|---|
| **Direct only** (Primary role) | arms at 3 against a 10–20 band — unreachable without four isolation exercises per upper day, which breaks PAS-D11's 8-exercise ceiling |
| **Direct + indirect at full weight** | front delts absorb every press; the band is exceeded by any program that presses twice a week |

Neither is what the Standard meant, and both are defensible readings of what it wrote.

## What replaces it

**PAS-A4-D1 — A set counts 1.0 for the exercise's PRIMARY muscles and 0.5 for each SECONDARY.**

Roles come from `src/domain/exercise-relationships/source/exercise_muscles.json`, which is the same table
the Exercise Library and the muscle filters already read. No new data, no new judgement per program.

```
Barbell Bench Press × 5 sets
  → chest 5.0      (Primary)
  → triceps 2.5    (Secondary)
  → front_deltoids 2.5
```

Half is the convention in general hypertrophy practice, and — more importantly here — it is the only one
of the three candidates under which a normal, balanced 4-day program lands inside 10–20 on every major
group. That is the test of a counting rule: it should pass programs that are actually well built.

**PAS-A4-D2 — The delts are THREE muscle groups, not one.**
`front_deltoids`, `lateral_deltoids` and `rear_deltoids` are separate ids in the catalogue and respond to
separate work. A Blueprint row reading "Shoulders 10–16" is unsatisfiable by construction: pressing feeds
the front head whatever you do, and **nothing but direct work feeds the lateral or the rear.** Collapsing
them hides a genuinely under-trained rear delt behind a healthy-looking total — which is exactly what it
did in Muscle Building Intermediate's first draft, where rear delts sat at 5 while "shoulders" read 26.

**PAS-A4-D3 — The band applies to a program's WORKING blocks, not to every week.**
A Volume Accumulation program opens deliberately below its working dose and deloads deliberately below
it again. Weeks 1–2 and a deload week sitting under 10 is the model functioning, not a violation.
Applying the band to every week would force week 1 up to working volume and flatten the accumulation
arc the Standard itself prescribes at §11.2.

**PAS-A4-D4 — 10–20 is the governing band. A Blueprint may not narrow it without a stated reason.**
Muscle Building Intermediate's §4 table narrowed it to 10–16 and 12–18 per group with no rationale given,
and those narrower numbers — not the Standard's — were what the authored program failed. A Blueprint that
wants a tighter band must say why, subject to §10.1 deviation review.

## What this changes in the catalog, today

`muscle-building-intermediate` was rebalanced under the stated rule while this amendment was written:
direct rear-delt work restored to both upper days (they were at 5), and the week 3–4 and peak isolation
doses raised. **All twelve major groups now sit inside 10–20 across weeks 3–10**, asserted in
`muscle-building-intermediate.test.mjs`.

No other shipped program is affected: the other ten carry no per-muscle claim.

## Traceability

- §11.2 — volume-target paragraph rewritten, banner applied
- `Muscle-Building-Intermediate-Blueprint-v1.0.md` §4 — banner applied; its narrowed bands and its
  single "Shoulders" row are superseded by PAS-A4-D2 and PAS-A4-D4
- The four other Blueprints with per-muscle tables are **flagged, not edited** — they are Stage-1
  documents for unbuilt programs, and the reconciliation belongs to whoever authors them. Listed in the
  header above so the next author finds it.

---

*Forge Legacy — Program Authoring Standard Amendment 004 — 2026-08-06*
