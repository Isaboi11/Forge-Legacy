# Program Ecosystem Amendment 001 — Powerbuilding Intermediate Retirement

## Amendment to Program-Ecosystem-Architecture, Program-Authoring-Standard, and Program-Catalog-Architecture

### June 2026

**Status:** LOCKED

**Type:** Catalog Correction Amendment (removes one program; redirects one successor link; renumbers downstream sort order)

**Date:** June 2026

**Amends:**
- `Program-Ecosystem-Architecture-v1.0.md` v1.2 → v1.3
- `Program-Authoring-Standard-v1.0.md` v1.1 → v1.2
- `Program-Catalog-Architecture-v1.0.md` v1.2 → v1.3

**Origin:** A four-document Blueprint sequence tested the Strength family against `Strength-Family-Research-v1.0.md`'s governance rule ("a program must not exist solely because it occupies a rung in a ladder"):

1. `Strength-Family-Research-v1.0.md` (Stage 0A) named Strength Foundation II ↔ Powerbuilding Intermediate as the family's highest-risk convergence pair.
2. `Powerbuilding-Foundations-Blueprint-v1.0.md` (Stage 1) — **APPROVE**. Found genuine distinguishing axes versus Strength Foundation I.
3. `Strength-Foundation-III-Blueprint-v1.0.md` (Stage 1) — **APPROVE**, on a narrower basis. Found a genuine architectural distinction (Block Periodization) versus Strength Foundation II.
4. `Powerbuilding-Intermediate-Blueprint-v1.0.md` (Stage 1) — **REVISE**. Found that Powerbuilding Intermediate shares every training-content axis with Strength Foundation II (level, environment, frequency, goal alignment, progression model) and that its only locked differences — duration (12 vs. 10 weeks), total workouts (48 vs. 40), deload count (2 vs. 1) — are an unexplained, catalog-wide outlier: Powerbuilding Intermediate was the only INTERMEDIATE-level program in the entire 25-program launch catalog that did not run 10 weeks. That Blueprint presented three non-prescriptive remediation paths and selected none.

The product owner selected **Option C** of those three paths: retire Powerbuilding Intermediate as a separately catalogued program, and redirect Powerbuilding Foundation's successor to Strength Foundation II directly. This is the branch `Program-Ecosystem-Architecture-v1.0.md` §3.1 itself already named as a plausible alternative ("from Powerbuilding Foundation, athlete could go to either Powerbuilding Intermediate or Strength Foundation II") but never locked.

**Authority Chain (not reopened by this amendment):**
- `Strength-Family-Research-v1.0.md` (governance rule)
- `Powerbuilding-Foundations-Blueprint-v1.0.md`, `Strength-Foundation-III-Blueprint-v1.0.md`, `Powerbuilding-Intermediate-Blueprint-v1.0.md` (the evidentiary record)

**Amendment Log:** None at v1.0. Initial and final — no open questions.

---

## Section 1 — Purpose

This amendment makes one product decision — retire Powerbuilding Intermediate — and applies its full mechanical consequences across the three architecture documents that independently maintain a copy of the 25-program launch catalog. It does not reopen the Strength family's identity, the Powerbuilding Foundation program's own justification (already settled, APPROVE), or the Strength Foundation III program's own justification (already settled, APPROVE).

## Section 2 — What This Amendment Applies

| # | Change | Applied To |
|---|---|---|
| 1 | Remove the Powerbuilding Intermediate row from every catalog table | `Program-Ecosystem-Architecture-v1.0.md` §5.2; `Program-Authoring-Standard-v1.0.md` §13; `Program-Catalog-Architecture-v1.0.md` §5.2 |
| 2 | Redirect Powerbuilding Foundation's `successorProgramName`/successor cell from Powerbuilding Intermediate to Strength Foundation II | All three §5.2/§13 tables; `Program-Ecosystem-Architecture-v1.0.md` §3.1, §3.3 |
| 3 | Renumber `sortOrder` for every program previously at old Sort 6 or later, shifting down by one (new roster is 24 programs, Sort 1–24) | All three §5.2/§13 tables; `Program-Authoring-Standard-v1.0.md` §17.2; `Program-Catalog-Architecture-v1.0.md` §5.3 |
| 4 | Remove Powerbuilding Intermediate from the terminal-programs list and the Model 2 (Double Progression) program list | `Program-Ecosystem-Architecture-v1.0.md` §3.3; `Program-Authoring-Standard-v1.0.md` §7.1, §13, §14, §17.2 |
| 5 | Update catalog-wide counts: Total programs 25→24; Terminal programs 12→11; Programs with successors unchanged at 13 | `Program-Ecosystem-Architecture-v1.0.md` §5.1; `Program-Catalog-Architecture-v1.0.md` §5.1 |
| 6 | Update the Strength family's program list and athlete-type coverage entries to drop "/Intermediate" | `Program-Ecosystem-Architecture-v1.0.md` §2.1, §5.4 |
| 7 | Replace the now-resolved hypothetical branching example with a worked statement of what was actually decided | `Program-Ecosystem-Architecture-v1.0.md` §3.1 |

**Full renumbered roster (24 programs):**

| New Sort | Program | Old Sort | New Successor |
|---|---|---|---|
| 1 | Strength Foundation I | 1 | → 2 |
| 2 | Strength Foundation II | 2 | → 3 |
| 3 | Strength Foundation III | 3 | — |
| 4 | Powerbuilding Foundation | 4 | **→ 2 (Strength Foundation II)** |
| 5 | Hypertrophy Foundation | 6 | → 6 |
| 6 | Hypertrophy Intermediate | 7 | → 7 |
| 7 | Hypertrophy Advanced | 8 | — |
| 8 | Lower Body Foundation | 9 | → 9 |
| 9 | Lower Body Intermediate | 10 | — |
| 10 | Running Base I | 11 | → 11 |
| 11 | Running Base II | 12 | — |
| 12 | Athletic Conditioning Foundation | 13 | → 14 |
| 13 | Body Recomposition Foundation | 14 | → 15 |
| 14 | Conditioning Intermediate | 15 | — |
| 15 | Body Recomposition Intermediate | 16 | — |
| 16 | Hybrid Foundation | 17 | → 17 |
| 17 | Hybrid Intermediate | 18 | — |
| 18 | Bodyweight Foundation | 19 | → 19 |
| 19 | Bodyweight Strength | 20 | → 20 |
| 20 | Bodyweight Performance | 21 | — |
| 21 | Home Conditioning | 22 | — |
| 22 | Home Strength Foundation | 23 | — |
| 23 | Mobility Foundation | 24 | → 24 |
| 24 | Mobility Intermediate | 25 | — |

## Section 3 — Reconciliation Note

The Strength family changes from 5 programs to 4: Strength Foundation I, II, III, and Powerbuilding Foundation. Powerbuilding Foundation is no longer the entry point to a separate 2-program sub-ladder — it becomes an alternate BEGINNER entry point into the single Strength Foundation ladder, converging with Strength Foundation II at the INTERMEDIATE rung. An athlete who began at Powerbuilding Foundation and an athlete who began at Strength Foundation I arrive at the same Strength Foundation II, III chain.

This also resolves, by elimination rather than by argument, the two over-claimed differentiators `Strength-Family-Research-v1.0.md` Deliverable 7 had asserted for the retired program ("accessory-weighted volume composition," "ladder terminus") — both findings the Powerbuilding Intermediate Blueprint had already shown did not hold up under scrutiny. `Strength-Family-Research-v1.0.md` is updated separately (DRAFT, not LOCKED, so no separate amendment document governs it) to remove the now-nonexistent program from its roster and distinction table.

## Section 4 — What This Amendment Does Not Change

- Strength Foundation I, II, III's own metadata, progression models, and goal alignments are unchanged.
- Powerbuilding Foundation's own metadata (level, environment, duration, frequency, goal alignment, progression model) is unchanged — only its successor link changes.
- No other family's roster, succession chains, or counts are affected, apart from the mechanical sortOrder renumbering required because Powerbuilding Intermediate's removal shifts every subsequent program's position.
- The five approved progression models (PAS-D6) and their category/level applicability rules are unchanged — only program *membership* in the Double Progression list changes.
- No wireframe spec (W-2, W-3, W-4, W-5) requires edits: none names Powerbuilding Intermediate or any other program by name, and none hardcodes the catalog's total program count. They render off `successorProgramId`/`sortOrder`, which remain the same field types.
- `Powerbuilding-Intermediate-Blueprint-v1.0.md`'s analytical content is not deleted or rewritten — it is the evidentiary record for this decision and is marked RETIRED, not removed.

## Section 5 — Validation Checklist

- [x] Powerbuilding Intermediate removed from all three locked catalog tables (`Program-Ecosystem-Architecture-v1.0.md` §5.2, `Program-Authoring-Standard-v1.0.md` §13, `Program-Catalog-Architecture-v1.0.md` §5.2)
- [x] Powerbuilding Foundation's successor field reads "Strength Foundation II" / "→ Sort 2" in all three tables
- [x] Every program at old Sort 6+ renumbered down by one, consistently across all three tables and all places sortOrder is referenced (§17.2 import order, §5.3 featured-program sortOrder)
- [x] Total programs (25→24) and terminal programs (12→11) counts updated in both `Program-Ecosystem-Architecture-v1.0.md` §5.1 and `Program-Catalog-Architecture-v1.0.md` §5.1
- [x] Powerbuilding Intermediate removed from the terminal-programs list and the Double Progression (Model 2) program list
- [x] No wireframe spec (W-2/W-3/W-4/W-5) required changes — confirmed by direct search, not assumed
- [x] `Strength-Family-Research-v1.0.md`, `Powerbuilding-Foundations-Blueprint-v1.0.md`, `Strength-Foundation-III-Blueprint-v1.0.md` updated for consistency; `Powerbuilding-Intermediate-Blueprint-v1.0.md` marked RETIRED, content preserved

---

*Program Ecosystem Amendment 001 — Powerbuilding Intermediate Retirement*
*Amends Program-Ecosystem-Architecture-v1.0.md (v1.2→v1.3), Program-Authoring-Standard-v1.0.md (v1.1→v1.2), Program-Catalog-Architecture-v1.0.md (v1.2→v1.3)*
*June 2026*
*Authority: Strength-Family-Research-v1.0.md (governance rule); Powerbuilding-Foundations-Blueprint-v1.0.md, Strength-Foundation-III-Blueprint-v1.0.md, Powerbuilding-Intermediate-Blueprint-v1.0.md (evidentiary record)*
*Status: LOCKED*
