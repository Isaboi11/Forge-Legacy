# Body Recomposition Foundation — Lock Record

> # ⛔ LOCK WITHDRAWN — 2026-08-06, the same day it was granted
>
> **A coaching audit found the program working against its own goal, and the product owner withdrew the
> lock rather than ship it.** Everything below this banner is the record of the lock as it was signed. It
> is kept, not deleted: a lock granted and revoked is a thing that happened, and the next person to sign
> one should be able to read why this one did not hold.
>
> ## What the audit found
>
> The program shipped as **`3 × 10 @ 90s rest` in week 1 and `3 × 15 @ 60s rest` in week 8.**
>
> Rising reps with **shrinking rest** is a metabolic stimulus. This program exists to **retain muscle in a
> caloric deficit**, and retention is driven by *intensity* — you hold the load and can afford to trim the
> volume. It prescribed the opposite of its own stated purpose. It is the "high reps to tone" error, in
> the one program in the catalog whose entire justification is that it is *not* that.
>
> Compounding it: four sessions a week, rising lifting volume, and a finisher climbing to 22 minutes —
> **88 minutes of steady cardio a week on top, in a deficit, for a beginner.**
>
> ## Why nothing caught it
>
> Fourteen acceptance tests passed, plus the whole generic validator. **Every one of them measured the
> envelope rather than the training**: set counts inside PAS-D11, reps inside 8–15, rest inside 60–90,
> a deload in the right week. Each number was individually legal. What no test asked was which
> *direction* the numbers were moving, or whether the direction served the goal.
>
> ## What changed
>
> · **Rest is now constant** (90 s compound / 75 s isolation) and a test asserts it never falls.
> · **Every prescription is a rep range, 8–12** — the effort instruction, rendered by machinery that
>   already exists, with nothing added to the workout screen.
> · **Volume progresses through sets**, not reps: 15 → 20 → 24, deload 12, peak 24.
> · **The finisher is capped at 18 minutes** — 72 min/week instead of 88.
>
> `status` is back to `AUTHORED`. Re-locking is a fresh signature on a re-authored program, and the
> Design Record's §9 hold list applies again.

---

**Program:** Body Recomposition Foundation
**Version:** 1.0
**Shape:** 8 weeks · 4 days per week · 32 sessions · Beginner · CONDITIONING / GYM
**Catalog slot:** Sort 13 — the locked 24, Conditioning family, BEGINNER rung
**Status:** ✅ **LOCKED** — product-owner Lock Approval granted 2026-08-06
**Date authored:** 2026-08-06
**Design Record:** `Design-Record.md`
**Blueprint (LOCKED):** `Docs/Body-Recomposition-Foundation-Blueprint-v1.0.md`
**Implementation:** `src/domain/training/programs/body-recomposition-foundation.json`

---

## Workflow completion

| Phase | Deliverable | Status |
|---|---|---|
| 1 — Research | Research & Benchmark Analysis | ✅ superseded by the LOCKED Stage-1 Blueprint (June 2026); provenance at Design Record §1 |
| 2 — Blueprint | Blueprint v1.0 | ✅ `Docs/Body-Recomposition-Foundation-Blueprint-v1.0.md` — LOCKED before authoring began |
| 3 — Exercise Selection Architecture | Selection Architecture | ✅ Design Record §4 |
| 4 — Authoring | Authoring Draft | ✅ 5 blocks, **20 workouts / 32 sessions** (8 weeks × 4 days) |
| 5 — Coaching Audit | Coaching Audit Report | ✅ Design Record §7 — 6 findings |
| 6 — Revision | Revised Draft | ✅ 1 applied (finding 6), 4 accepted with reasons, **1 open (finding 1)** |
| 7 — PAS Compliance Review | Compliance Review | ✅ Design Record §8 — **11 of 11 met** as of 2026-08-06 (was 10 of 11; the cool-down requirement was removed by PAS Amendment 003, not satisfied) |
| 8 — Lock Recommendation | Recommendation | ⚠️ Design Record §9 recommended **HOLD** — see below |
| 9 — **Lock Approval** | **PO signature** | ✅ **GRANTED 2026-08-06** |

---

## ⚠ The lock overrode the author's recommendation

Design Record §9 recommended **hold**, on three items. The product owner approved the lock with all three
still open. They are **accepted, not resolved**, and this section is the record of that — a lock that
quietly absorbed its own open items would be worth less than no lock at all.

### What was accepted

**1. PAS-D9 cool-down — ✅ RESOLVED 2026-08-06, by amending the rule.**

*As accepted at lock:* nothing in this program prescribes a cool-down, because `ProgramWorkout` has no
cooldown field. Iron & Engine's finding 7 unchanged, and this was the **first LOCKED program** to carry
it — which is what turned a draft's known gap into a written contradiction between the Production
Standard and the locked catalog.

*Resolution, same day:* the product owner took the second of the two exits — **the rule changed, not the
program.** `Program-Authoring-Standard-Amendment-003-Cooldown-Not-Required.md` (LOCKED) sets COOL_DOWN to
**Optional for every category**, on the grounds that a requirement no author can satisfy is not a
standard. **No program content changed and nothing an athlete sees is different.** This program is now
**11 of 11 on PAS compliance**, and the contradiction is closed.

Recorded rather than deleted, because the sequence matters: this program is the reason the rule was
found, and it was locked in violation for the few hours between.

**2. Nobody has trained it.** No athlete has run a session of this program. The lock certifies the design
against the Blueprint and the Standard; it certifies nothing about how it feels in week 6.

**3. The Week-8 rest/rep pairing is unreviewed in practice.** Reps rise to 15 while rest falls to 60 s —
difficulty compounding on two axes in the same week. Design Record §7 finding 4 names it as the thing to
watch, and shortening rest as the first change to reverse. It follows a deload and the loads are
machine-based and self-selected, which is the mitigation; it is not evidence.

### What the lock does certify

- Metadata matches the LOCKED Blueprint exactly — 8 weeks, 4 sessions, 32 workouts, CONDITIONING /
  BEGINNER / GYM, `LOSE_FAT + BUILD_MUSCLE`, Week-7 deload.
- Volume, reps and rest sit inside PAS-D11, beginner hypertrophy and PAS §10.3 in **every one of the 20
  authored workouts**.
- All 23 catalog keys resolve against the **visible** catalogue (721 rows), not the 797 in the file.
- Progression is real and directional: volume 150 → 180 → 216, deload 96, peak 270.
- 14 acceptance tests, **each verified by mutation** rather than by passing.

---

## Documentation Requirements

| Required | Present |
|---|---|
| Program Source Document | ✅ the LOCKED Stage-1 Blueprint, `Docs/Body-Recomposition-Foundation-Blueprint-v1.0.md` |
| Design Record | ✅ `Design-Record.md` |
| Lock Record | ✅ this file |

---

## Catalog Index — the PO's edit, not an automated one

`Programs/Program-Catalog-Index.docx` has **not** been edited. It is an authoritative `.docx` under the
repository's data-protection rule (append/annotate only, never without confirmation).

**The edit it needs:**

- Under **Conditioning**, mark **Body Recomposition Foundation** (Sort 13) as `✓` locked
- **Locked Programs:** 2 → **3**
- **Catalog Completion:** 8% → **13%** (3 of 24)

Note the count is 3, not 8. Six other definitions ship and are adoptable — Iron & Engine, Squat Ascent,
Bench Approach, Deadlift Measure, Full Frame — but none carries a Lock Approval, and five of them are
outside the locked 24 entirely.

---

## What is true in the app today

The program **ships and is adoptable**: it appears in `getProgramDefinitions()`, so it is offered by
onboarding recommendation, listed on the Workouts tab, and can be started — writing a real `programs` row
through `adoptCatalogProgram`, exactly as the Foundation programs do. Its `upper` / `lower` splits and
`cutting` theme all resolve to registered Home artwork.

`body-recomp-foundation.test.mjs` asserts `status === 'LOCKED'` **and** that this file still exists and
still names the cool-down violation. Reverting the status to draft, or deleting this record, fails the
suite.

---

## Signature

| | |
|---|---|
| **Authored by** | Claude (agent), 2026-08-06 |
| **Coaching audit** | self-audit, recorded in full at Design Record §7 — **not an independent human review** |
| **Lock recommendation** | ⚠️ **HOLD** (Design Record §9) — overridden |
| **Lock approved by** | ☑ **Isaiah Altamirano (Product Owner)** — Date: **2026-08-06** |

**Approval as given:** "lock it", 2026-08-06, after the three open items above were put to the product
owner twice and restated before signing.
