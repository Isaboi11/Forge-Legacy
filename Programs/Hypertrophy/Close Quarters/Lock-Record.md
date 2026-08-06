# Close Quarters (6-Day) — Lock Record

**Program:** Close Quarters (6-Day)
**Version:** 1.0
**Shape:** 12 weeks · 6 days per week · 72 sessions · Intermediate · Muscle Building · `ppl`
**Environment:** **Home — dumbbells and an adjustable bench**
**Catalog position:** outside the locked 24 (no slot exists for a 6-day intermediate dumbbell program)
**Status:** ✅ **LOCKED** — product-owner Lock Approval granted 2026-08-06
**Date authored:** 2026-08-06
**Design Record:** `Design-Record.md`
**Implementation:** `src/domain/training/programs/close-quarters-6day.json`

---

## Workflow completion

| Phase | Deliverable | Status |
|---|---|---|
| 1 — Research | Research & Benchmark | ✅ Design Record §1 (provenance) |
| 2 — Blueprint | Blueprint | ⚠️ **none exists** — this program is outside the locked 24, so there is no Stage-1 Blueprint to author against. Its shape is argued in Design Record §2–3 instead. |
| 3 — Exercise Selection Architecture | Selection Architecture | ✅ Design Record §4 |
| 4 — Authoring | Authoring Draft | ✅ 6 blocks, **36 workouts / 72 sessions** |
| 5 — Coaching Audit | Audit Report | ✅ Design Record §6 — 6 findings |
| 6 — Revision | Revised Draft | ✅ 5 accepted with reasons, 1 closed by PAS Amendment 003 |
| 7 — PAS Compliance | Compliance Review | ✅ Design Record §7 — **10 of 10 met** |
| 8 — Lock Recommendation | Recommendation | ⚠️ Design Record §8 recommended **HOLD** on three items |
| 9 — **Lock Approval** | **PO signature** | ✅ **GRANTED 2026-08-06** |

---

## The blocking item was CLOSED before signing, not accepted

Design Record §8 held on three things. Unlike Body Recomposition Foundation, **the one that actually
blocked was fixed rather than recorded.**

### ✅ Closed — the athlete is now told before they start

*As written:* "an athlete browsing the Program Catalog sees name, duration and frequency — **not
`environment`** — so a home athlete with no bench can adopt this and find out on day 1. That is a
catalog-surface gap, not a program defect, and it is the reason this recommendation is a hold."

*Closed the same day, in two passes:*

1. **The gear model learned "and."** `bench` had been in the home-gym inventory and in the ten-item
   onboarding quick-pick the whole time while unlocking nothing. Requirements could only say OR, and a
   press needs dumbbells **AND** a bench — `['dumbbells','bench']` would have read as *either*, showing
   Dumbbell Bench Press to a bench owner with no dumbbells. `GearRequirement` now carries
   `{ all: [...] }`; **41 exercises require a bench and 12 require a bench or a plyo box**, hand-checked.
2. **The Program screen now shows coverage before Start.** `programGymCoverage` existed, was tested, and
   was called in exactly one place — an onboarding card. The screen where an athlete actually taps Start
   never called it. It does now, keyed off `sourceDefId` so an already-adopted program is covered too,
   and suppressed unless a real profile exists and something is genuinely missing.

**The result, asserted:** a dumbbells-only athlete opening this program reads *"Your gym covers 27 of 40
movements"* and what to swap. With a bench, 40 of 40 and no message.

### ⚠ Accepted, not resolved

**1. Nobody has trained it.** No athlete has run a session. Design Record §6 findings 1 (six days a week
is a large adherence ask) and 4 (week 12 raises reps and sets together) are the ones to watch.

**2. It is the third program shipped outside the locked 24 in one day** — after Frame by Frame and
alongside Iron & Engine and Full Frame. **The locked catalog is still 3 of 24**, and Muscle Building
Intermediate (Sort 6) is still unbuilt. Shipping outside the 24 does not close the 24. That is a
catalog-shape question, not a defect in this program, and it is recorded rather than resolved.

**3. No Stage-1 Blueprint exists for this program.** Every locked program before it was authored against
one, or is one of the two `.docx` conversions. This one is argued in its own Design Record.

---

## What the lock certifies

- **Every exercise is trainable at home** — all 40 keys are `equipmentId: 'dumbbell'`, held to
  `HOME_EQUIPMENT`, which is deliberately narrower than `equipment.json`'s "Home Gym".
- **It is a dumbbell program, not merely a home-legal one** — a band or kettlebell would pass the first
  check; a second test asserts the stricter rule.
- **Two deloads, weeks 4 and 11, peak week 12** — PAS-D7 for an 11–14 week program. The source has none.
- **Every session inside PAS-D11** (5–8 exercises, 18–30 sets), deloads included.
- **Progression is in the numbers the app draws**: 182 → 138 → 220 → 338 → 144 → 420.
- **12 acceptance tests, each verified by mutation** — a cable row, a barbell, a kettlebell, a dropped
  "bench", a removed deload and a flat transcription all turn the suite red.

---

## Documentation Requirements

| Required | Present |
|---|---|
| Program Source Document | ⚠️ none — no Blueprint exists (see above); Design Record stands in |
| Design Record | ✅ `Design-Record.md` |
| Lock Record | ✅ this file |

## Catalog Index — the PO's edit, not an automated one

`Programs/Program-Catalog-Index.docx` has **not** been edited — data-protected, append/annotate only.

This program is **outside the locked 24**, so the "Locked Programs: N of 24" counter should **not** move
for it. If the index tracks shipped-but-unplanned programs separately, that is where it belongs.

---

## Signature

| | |
|---|---|
| **Authored by** | Claude (agent), 2026-08-06 |
| **Coaching audit** | self-audit, Design Record §6 — **not an independent human review** |
| **Lock recommendation** | ⚠️ **HOLD** (Design Record §8) — the blocking item was then closed; two accepted |
| **Lock approved by** | ☑ **Isaiah Altamirano (Product Owner)** — Date: **2026-08-06** |

**Approval as given:** "perfect. So it's ready to lock in", 2026-08-06 — followed by "close the gap, then
lock" when told the Program screen still did not warn a benchless athlete. The gap was closed first.
