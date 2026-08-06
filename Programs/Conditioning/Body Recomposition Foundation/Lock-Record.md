# Body Recomposition Foundation — Lock Record

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
| 7 — PAS Compliance Review | Compliance Review | ⚠️ Design Record §8 — **10 of 11 met**, cool-down not met (schema gap) |
| 8 — Lock Recommendation | Recommendation | ⚠️ Design Record §9 recommended **HOLD** — see below |
| 9 — **Lock Approval** | **PO signature** | ✅ **GRANTED 2026-08-06** |

---

## ⚠ The lock overrode the author's recommendation

Design Record §9 recommended **hold**, on three items. The product owner approved the lock with all three
still open. They are **accepted, not resolved**, and this section is the record of that — a lock that
quietly absorbed its own open items would be worth less than no lock at all.

### What was accepted

**1. PAS-D9 cool-down — a standing violation, now locked in.**
Nothing in this program prescribes a cool-down, because `ProgramWorkout` has no cooldown field. This is
Iron & Engine's finding 7 unchanged, and Body Recomposition Foundation is the **second** CONDITIONING
program to break the same rule the same way — and the **first LOCKED one**. Before today the violation
lived only in un-locked drafts, where it read as a known gap awaiting a fix. It is now signed into the
catalog. Either `ProgramWorkout` grows the field and a surface that renders it, or PAS-D9 is amended to
say the catalog model cannot express one. **Until one of those happens, the Production Standard and the
locked catalog disagree in writing.**

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
