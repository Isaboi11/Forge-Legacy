# Forge Legacy — Program Catalog Governance Review (Cross-Family)

## v1.0 | June 2026

**Status:** DRAFT — pending product-team review. Not yet LOCKED.
**Type:** Cross-Family Governance Review — ecosystem-level findings. Not a Blueprint, not architecture, not an amendment.

**Authority Chain:**
- `Program-Ecosystem-Architecture-v1.0.md` §2.1–2.2 (family floor/cap), §5 (launch catalog), §7.1 (roadmap candidates + gate)
- `Program-Catalog-Architecture-v1.0.md` PC-D4 (curated-catalog philosophy), §3 (taxonomy)
- `Program-Authoring-Standard-v1.0.md` §13 (catalog table), §14 (deload), §17.2 (terminal programs), §18.4 (PAS-R1)
- Completed governance work: `Strength-Family-Research-v1.0.md`; `Muscle-Building-Family-Research-v1.0.md`, `Muscle-Building-Family-Stage-1-Review-v1.0.md`, `Muscle-Building-Stage1-Lock-Review-v1.0.md`; `Running-Family-Research-v1.0.md`, `Running-Advanced-Catalog-Evaluation-v1.0.md`; the Strength/Muscle Building Stage 1 Blueprints; `Program-Ecosystem-Amendment-001-Powerbuilding-Intermediate-Retirement.md`; `Muscle-Building-Rename-Amendment-001.md`
- `Program-Catalog-Production-Standard-v1.0.md` §1 (naming/positioning conflict), §7 (stage pipeline)
- Adjacent context (different layer): `Endurance-Multi-Activity-Architecture-Evaluation.md`

**Scope:** Determines whether the 24-program catalog is evolving coherently *across* families after Strength, Muscle Building, and Running governance work, and identifies the highest-value future governance targets. **Findings only** — no architecture proposed, no programs authored, no amendments, no catalog change.

---

## Section 1 — Catalog Snapshot (verified against PEA §5)

| Family | Cat enum | # | Levels | Governance status |
|---|---|---|---|---|
| Strength | STRENGTH | 4 | BEG·INT·ADV + BEG entry | **Governed** (Stage 0A+1; 1 retirement) |
| Muscle Building | HYPERTROPHY | 5 | BEG·INT·ADV + BEG·INT | **Governed** (Stage 0A+1+Lock Review; 0 retirements) |
| Running | RUNNING | 2 | BEG·INT | **Governed** (Stage 0A + Advanced eval; expansion deferred) |
| Conditioning | CONDITIONING | 6 | BEG·INT ×3 sub-ladders | **Ungoverned** (over the 5-cap; approved exception) |
| Full Body & Home | FULL_BODY | 5 | BEG·INT·ADV + 2 BEG-terminal | **Ungoverned** (at cap) |
| Mobility | MOBILITY | 2 | BEG·INT | **Ungoverned** (at floor) |

**Totals (sum to 24):** STRENGTH 4 · HYPERTROPHY 5 · RUNNING 2 · CONDITIONING 6 · FULL_BODY 5 · MOBILITY 2.

- **Level distribution: 12 BEGINNER / 9 INTERMEDIATE / 3 ADVANCED** — deliberately beginner-weighted.
- **Environment: 13 GYM / 7 HOME / 2 OUTDOOR / 2 MIXED.**
- **Goal alignments: 8 of 10** (IMPROVE_CYCLING, SPORT_PERFORMANCE deferred). **2 category enums unused** (CYCLING, COMBAT_SPORTS — deferred to creator marketplace).
- **11 terminal programs** (PAS §17.2). **Governed: 3 of 6 families** (12 of 24 programs); **ungoverned: Conditioning, Full Body & Home, Mobility** (12 of 24 programs).

---

## Section 2 — (A) Family Completeness

| Bucket | Families / ladders | Notes |
|---|---|---|
| **Launch-complete (warranted capstone reached)** | Strength (→ SF III ADV), Muscle Building general (→ MB Advanced ADV), Full Body Bodyweight (→ Bodyweight Performance ADV) | Each reaches ADVANCED with a structurally distinct top end. |
| **Complete-by-design (no ADVANCED warranted)** | Mobility (INT-terminal), Conditioning sub-ladders (INT-terminal), Home single-rung programs | The goal does not require an advanced rung; INT-terminal is a deliberate endpoint, not a gap. |
| **Incomplete — relying on a roadmap successor** | **Running** (Running Advanced roadmapped) and **Lower Body** sub-ladder (Lower Body Advanced roadmapped) | The two genuine journey gaps. Structurally identical: INT-terminal *by absence of an unbuilt successor*, both already evaluated and accepted as defer-for-launch. |

**Finding A:** only **two** ladders are incomplete in the "unbuilt-successor" sense (Running, Lower Body), and they are mirror images — the catalog is not riddled with gaps; it has exactly two, both known and both roadmap-tracked.

---

## Section 3 — (B) Ladder Consistency

- **Level transitions are coherent.** No ladder skips a level (no BEGINNER→ADVANCED jump). Powerbuilding Foundation's BEGINNER→(Strength Foundation II)INTERMEDIATE merge is level-coherent — an alternate entry, not a skip.
- **ADVANCED is used consistently and sparingly** — it is always the terminal capstone of a family that warrants it (Strength, Muscle Building, Bodyweight), always carrying a distinct top-end mechanism (Block Periodization for Strength/Muscle Building). It is never a mid-ladder rung and never appears in families whose goal does not warrant it.
- **"Terminal" is overloaded — the one real consistency risk.** The 11 terminal programs are three different things wearing one flag:
  1. **True capstone** — SF III, Muscle Building Advanced, Bodyweight Performance (journey genuinely complete).
  2. **Terminal-by-unbuilt-successor** — Running Base II, Lower Body Intermediate (journey *incomplete*; terminal only because the next rung is roadmap-only).
  3. **Standalone single-rung** — Home Conditioning, Home Strength Foundation (intentionally no ladder).

  **A journey gap can therefore masquerade as completeness** if "terminal" is read as "done." This is exactly the Running Finding B lesson, and it generalizes: **Lower Body Intermediate carries the identical latent ambiguity.** Recommend (do not action) that catalog reviews always distinguish *terminal-capstone* from *terminal-by-absence*. Flag only — no edit.

---

## Section 4 — (C) Expansion Pressure

Roadmap candidates (PEA §7.1), ranked by justification strength:

| Candidate | Cat / Level | Type | Justification |
|---|---|---|---|
| **Lower Body Advanced** | HYPERTROPHY / ADV | Successor-completion | **Strongest** — closes the Lower Body journey gap on a live ladder; serves existing graduates. |
| **Running Advanced** | RUNNING / ADV | Successor-completion | **Strong** — closes the Running journey gap; already designated first-priority Running expansion (`Running-Advanced-Catalog-Evaluation-v1.0.md`). |
| **Home Strength Intermediate** | FULL_BODY / INT | Successor-completion | **Moderate** — gives the currently BEG-terminal Home Strength Foundation an INT successor. |
| **5K Starter** | RUNNING / BEG | Net-new branch | **Weakest** — adds breadth, not journey-completion; pulls SPORT_PERFORMANCE (deferred) + race-distance specialization. |

**Finding C:** the three **successor-completion** candidates solve genuine "ladder stops short" gaps and share a clean shape (one rung on an existing ladder serving existing graduates). The single **net-new-branch** candidate (5K Starter) is the weakest and the only one introducing a deferred goal alignment. All four remain behind the §7.1 demand-signal/expansion gate; none is launch-justified.

---

## Section 5 — (D) Governance Outcomes & Lessons

**Pattern that caused retirement risk:** justification resting on **catalog topology** (ladder position, "terminal" status, "it's the next rung") rather than training content. The one retirement — Powerbuilding Intermediate — failed because it shared *every* training-content axis with Strength Foundation II once the family's distinguishing levers (goal alignment, progression model) were inert, leaving only topology.

**Pattern that consistently justified existence:** a genuine **training-content differentiator** —
- progression model (Block Periodization at the ADVANCED capstones),
- frequency (Lower Body Foundation's load-bearing 3-day),
- body-region volume distribution (Muscle Building whole-physique vs lower-body, ~70/30),
- level + volume + frequency (Running Base I vs II).

**The cross-family meta-lesson:** *when a family's goal alignment and progression model are uniform (inert), the distinguishing work must be carried by athlete / frequency / volume / body-region — never by topology.* Muscle Building (uniform BUILD_MUSCLE) and Running (uniform goals + uniform Block Periodization) both proved this; both passed because real content axes carried the load.

**Lessons to carry into future families (esp. the ungoverned ones):**
1. Identify the family's *inert* axes first (uniform goal/model), then find the real differentiator.
2. Test convergence pairs with explicit **falsifiable** criteria (the 3-part test pattern).
3. "Terminal" / ladder position is never a justification.
4. Record **load-bearing single-axis distinctions** (e.g., a 3-day frequency) so a later "harmonization" edit cannot silently erase them.
5. Keep **per-program governance PASS** strictly separate from **family-coverage completeness** — they are different tests (the Running result proved a family can pass governance while remaining journey-incomplete).

---

## Section 6 — (E) Catalog Health & Emerging Risks

**Is the 24-program catalog balanced?** Yes, *given* its declared stance (beginner-first, intentionally curated, "not a content platform" — PC-D4). The beginner-weighting (12/9/3) and ADVANCED scarcity are intentional, not defects.

**Overrepresented:** CONDITIONING (6 — over the 5-cap, approved exception); the **GYM** environment (13/24); the **BEGINNER** level (12/24).

**Underrepresented:** **OUTDOOR** (2) and **MIXED** (2) environments; the **ADVANCED** level (3); endurance breadth (Running only). Two goal alignments (IMPROVE_CYCLING, SPORT_PERFORMANCE) and two categories (CYCLING, COMBAT_SPORTS) are entirely absent — deferred by design.

**Emerging structural risks (flagged, not actioned):**
1. **Thin endurance/outdoor footprint.** Running (2 programs) is the catalog's entire outdoor/endurance offering, against a much larger endurance ambition documented in `Endurance-Multi-Activity-Architecture-Evaluation.md` (a different, activity-tracking layer). Coverage thinness, not a governance defect.
2. **"Terminal" overloading** (Section 3) — a clarity risk that lets journey gaps read as completeness.
3. **The unresolved catalog naming/positioning conflict (Production Standard §1) still hangs over the *ungoverned* families.** Only Muscle Building's naming has been resolved (`Muscle-Building-Rename-Amendment-001.md`). The "current direction" names for other families (e.g., Strength Specialization, Home Gym Strength, 5K/10K Builder) remain unreconciled. **This is the single largest cross-cutting OPEN risk** — it could force renames or re-leveling of families that have not yet been governed, and it should be resolved before large-scale Stage 2 authoring (per Production Standard §7's own warning).

---

## Section 7 — Highest-Value Future Governance Targets (ranked)

1. **Conditioning family (6 programs, over cap, ungoverned) — #1 target.** The largest family, never taken through Stage 0A/Stage 1, and the catalog's most likely site of a Powerbuilding-Intermediate-style convergence: it contains **three INTERMEDIATE programs** (Conditioning Intermediate, Body Recomposition Intermediate, Hybrid Intermediate) whose distinctions rest on goal-alignment pairings that should be pressure-tested the way the resistance Intermediates were. Highest convergence likelihood + highest program count = highest governance value.
2. **Full Body & Home (5, at cap, ungoverned).** Potential convergence to test: Home Strength Foundation vs Bodyweight Strength (both BUILD_STRENGTH/GENERAL_FITNESS, HOME), and Home Conditioning vs the Bodyweight ladder. Mixed ladders + standalones warrant a coherence pass.
3. **Catalog naming/positioning reconciliation (Production Standard §1)** for the remaining families — a cross-cutting prerequisite before Stage 2 authoring, and the biggest open risk (Section 6.3).
4. **Mobility (2, at floor)** — lowest priority; small, low convergence risk, complete-by-design.

---

## Section 8 — Status Layers

- **Architecture:** LOCKED and unchanged by this review (PEA v1.4, PAS v1.3, PCA v1.4). No structural change is proposed; the roadmap, cap exceptions, and taxonomy are reported as-is.
- **Content Production:** **3 of 6 families governed** through Stage 0A (Strength, Muscle Building, Running); Strength and Muscle Building also through Stage 1. Conditioning, Full Body & Home, and Mobility are **ungoverned**. No Stage 2 authoring has begun for any family.
- **Implementation Readiness:** Not begun. Stage 2 remains gated (cross-family) on Exercise Library population and, before publish, the catalog-wide PAS-R1 Difficulty Calibration Audit (PAS §18.4).

**Ecosystem verdict:** the catalog **remains coherent at the ecosystem level** after three families' governance work — level transitions are consistent, ADVANCED and the cap are used deliberately, only two known journey gaps exist (both roadmap-tracked), and the one retirement was driven by a clear, repeatable anti-pattern (topology-only justification). The coherence risks that exist are clarity/scope risks (terminal overloading, naming reconciliation, endurance thinness), not structural breakdowns. The highest-value next move is to govern the **Conditioning family** before additional production begins.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial cross-family governance review after Strength, Muscle Building, and Running governance work. Verified the full 24-program catalog (PEA §5). Findings: catalog is ecosystem-coherent; 3 of 6 families governed; only two journey gaps (Running, Lower Body — both roadmap-tracked); ADVANCED used consistently/sparingly (3 programs); "terminal" is overloaded (3 meanings — a clarity risk); retirement anti-pattern = topology-only justification; consistent-justification pattern = real training-content differentiator. Catalog health: beginner-weighted by design, GYM-heavy, endurance/outdoor thin; biggest open risk = the unresolved naming/positioning conflict over the ungoverned families. **#1 future governance target: the Conditioning family** (6 programs, over cap, ungoverned, three convergent-looking INTERMEDIATE programs). Findings only; no architecture/program/amendment/catalog change. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Program Catalog Governance Review (Cross-Family) — v1.0*
*June 2026 — Ecosystem-level findings. No architecture, programs, amendments, or catalog changes. Pending product-team review before LOCK.*
