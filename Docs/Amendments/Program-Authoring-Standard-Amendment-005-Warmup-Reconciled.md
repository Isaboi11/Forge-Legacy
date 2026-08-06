# Program Authoring Standard — Amendment 005: The Warm-Up Standard, Reconciled to What the App Can Show

**Amends:** `Program-Authoring-Standard-v1.0.md` §9.1 (PAS-D9, WARM_UP column), §9.2 (PAS-D10), §9.3,
§20 (PAS-D9 and PAS-D10 rows), §16 Group B checklist
**Status:** 🔒 LOCKED
**Date:** 2026-08-06
**Decided by:** Product Owner — *"make sure that only workouts that we have in our exercise list are
actually in the programs. Also, anything like the empty barbell bench just get rid of, people will warm
up properly on their own."*
**Related:** Amendment 003 (Cool-Down Not Required) · `src/domain/training/programs/__tests__/programs.test.mjs`
· commit `9440b30`

---

## The problem this closes

The product owner's instruction was carried out on 2026-08-06: **244 of 405 authored warm-up items were
retired**, on two rules — every prescribed movement must exist in the **visible** catalogue (721 rows,
not `exercises.json`'s 797), and no ramp sets of the working lift.

It was the right instruction and it was carried out correctly. **Nobody updated §9.**

Measured against the shipped catalog today, over the **244 non-MOBILITY sessions**:

| | Sessions | Against §9 |
|---|---:|---|
| No warm-up at all | **19** | ⛔ violates PAS-D9 "**Required**" |
| 1–2 items | **95** | ⛔ below §9.3's "3–6 exercises" |
| 3–6 items | 130 | ✅ |

**114 of 244 sessions — 47% of the catalog — are out of compliance with a LOCKED standard, as the direct
result of a decision the product owner made and this document never absorbed.**

This is the failure mode this project keeps rediscovering, in its purest form: not an amendment authored
and left unmerged, but a *decision* made, implemented in code, guarded by tests — and never written back
into the rulebook that governs it. Left alone, the next author reads §9.3, writes six warm-up items, and
is *more* wrong than the ones who wrote none.

## Why the old numbers cannot simply be restored

The 19 empty sessions are concentrated in **Deadlift on the Measure (11 of 20)** and **Strength
Foundation II (8 of 12)**, and the reason is specific: their entire prep was *a bike, an empty bar, and
"Build-up sets"*. Not one of those three is authorable any more.

- **"Bike or brisk walk"** ×60, **"Build-up sets"** ×60, **"Empty bar squats"** ×25 — 232 items resolved
  to **nothing**. A warm-up is matched back to the catalogue **by name**
  (`structureFromDefinition` → `itemByName`), so each entered the athlete's session as a row with no
  demo, no coaching and no logging identity. Prose wearing an exercise's clothes.
- A further **12 resolved perfectly and were still ramp sets** — *"Barbell Bench Press — empty bar, 8
  reps"*, the product owner's own example.

§9.3's floor of three was written when a warm-up could contain a general cardio piece, pattern prep, and
a rehearsal of the day's lift. **Two of those three elements are exactly what was removed.** What
survives is the pattern prep — the part that was catalogue-backed all along — and three-to-six pieces of
pattern prep is not a warm-up, it is a session.

## What replaces it

**PAS-A5-D1 — WARM_UP is required *where one can be authored*.**

A session may open directly on `MAIN` when every candidate prep movement for it either resolves to
nothing in the visible catalogue or would be a ramp set of the day's work. This is **not** a licence to
omit: the burden is on the author to show there was nothing showable, and `programs.test.mjs` still fails
any authored item that resolves to no visible exercise.

The athlete is not left unprepared. They are left to warm up the way people actually do, which is the
product owner's stated position and a defensible coaching one.

**PAS-A5-D2 — §9.3's count becomes 1–4, and every item must be a real, visible exercise.**

The binding constraint moved from *how many* to *whether the app can show it*. A single Band Pull-Apart
that the athlete can open, watch and read coaching for is worth more than six lines of prose that
resolve to nothing — which is what the old floor was being met with.

**PAS-A5-D3 — A warm-up item is prose, not a prescription, and PAS-D10 is reconciled to that.**

PAS-D10 requires warm-ups to be "`ExercisePrescription` rows in a `WARM_UP` section". The in-repo model
is `WarmupItem` — `{ name, detail, text }`, **deliberately not catalog-linked**, resolved by name at
adoption. So PAS-D10 is satisfied in **intent** (a real section the logger renders, never notes smuggled
onto a MAIN row) and violated in **letter** (they are not prescriptions) by every in-repo authored
program, which is now most of the catalog.

The intent is what mattered and it stands. The letter is corrected: **a warm-up item is a `WarmupItem`
whose `name` resolves to a visible exercise.** The `.docx` import path, which does produce
`ExercisePrescription` rows, is unaffected.

**PAS-A5-D4 — No ramp sets. This is a rule, not a preference.**

An item whose `detail` describes working up to the first working weight — an empty bar, build-up sets, a
percentage ramp — is not prep and is not authorable. It is guarded:
`assert.doesNotMatch(item.detail, /empty[\s-]bar/i)`.

Note that **PAS-A5-D4 catches what PAS-A5-D2 cannot.** "Barbell Bench Press — empty bar, 8 reps"
resolves perfectly to a real, visible exercise; only a rule about *what a warm-up is for* rejects it.
Two rules, because they catch different things.

## What this changes in the catalog, today

| | Before | After |
|---|---|---|
| Sessions with no warm-up | 19 ⛔ | **19 ✅ — compliant under PAS-A5-D1** |
| Sessions with 1–2 items | 95 ⛔ | **95 ✅ — compliant under PAS-A5-D2** |
| Sessions with 3–6 items | 130 ✅ | 130 ✅ |

**No program content changes. No JSON is re-authored. Nothing an athlete sees is different.** As with
Amendment 003, this moves a line in a document to match what the software and the product owner have
already decided.

## What it does not change

- **The visible-catalogue rule.** Every authored warm-up item must resolve to one of the 721, and the
  test enforces it. That rule is *strengthened* here, not relaxed.
- **MOBILITY.** Already `MAIN`-only under PAS-D9, and Mobility Foundation (Sort 23) is authored that way
  — `warmup: []` on all 20 sessions as a specification, not an omission.
- **§9.1's COOL_DOWN column.** Governed by Amendment 003.
- **Iron & Engine's own rule.** Its acceptance test holds it to 2–4 warm-up items per session, tighter
  than this amendment requires. A program may bind itself more strictly than the Standard.

## ⚠ Data-protected document not edited

`Programs/Forge-Program-Production-Standard.docx` §warm-up specifies *1 general + 1–2 pattern prep + 1
rehearsal*. The general (a two-minute bike) and the rehearsal (an empty-bar set) are precisely what the
product owner removed, so that section is now stale in the same way §9.3 was.

It is **flagged, not edited** — `.docx` sources are append/annotate-only and never changed without
confirmation. **It needs the product owner's annotation.** This has now been outstanding since
2026-08-06 and is recorded here so it stops living only in a test comment.

## Traceability

- §9.1 WARM_UP column — "Required" → "Required where authorable (PAS-A5-D1)", with a banner citing this file
- §9.2 (PAS-D10) — banner reconciling the rule to `WarmupItem`
- §9.3 — exercise count 3–6 → 1–4; a "must resolve to a visible exercise" row added
- §20 — PAS-D9 and PAS-D10 rows updated
- §16 Group B — the warm-up checklist line rewritten
- `programs.test.mjs` — already enforces all four decisions; no test change needed

---

*Forge Legacy — Program Authoring Standard Amendment 005 — 2026-08-06*
