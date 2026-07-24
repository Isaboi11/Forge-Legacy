# W9-Amendment-001 — Workout Builder / Active Workout Integration
## June 2026

**Status:** LOCKED

**Type:** Amendment (closure/administrative — not a new design)

**Target:** Active-Workout-Flow-Spec-W9-W16.md

**Authority:** Workout-Builder-Wireframe-Spec-W24.md (LOCKED) §22 ("W9-A1 — Pre-Loaded Exercise List and Reference Prescription in W-9"); Active-Workout-Flow-Spec-W9-W16.md (LOCKED) §2.3, §4.1, §5.7, §6.2, §6.3, §9.1, §17, Change Log v1.1; ExercisePrescription-Amendment-001.md (LOCKED); Exercise-002-Exercise-Substitution-Architecture.md (LOCKED); Architecture-Amendment-001-Import.md (LOCKED)

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Amendment Scope

W-24 §22 names **W9-A1** as a required amendment to W-9, with two specific asks: (1) entry-point pre-population of the exercise list from a program slot's `sections[]`, organized WARM_UP → MAIN → COOL_DOWN; (2) a reference-only prescription line in the Set Input Sheet.

**Audit finding, verified directly: W9-A1 has already been completed — and unlike W3-A1, it never even had a checklist gap.** W-9's own Change Log records it by name: *"v1.1 — June 2026: WS-A2 (Workout Structure Amendment 001) + W9-A1: §2.3 — Program Workout Entry: exercise list now sourced from `sections[]`..."* Both halves of W-24 §22's ask are present in body text and in the formal Validation Checklist (Section 3).

**This document does not redesign W-9, W-24, or any program/import/prescription architecture.** Its scope is narrower than W3-Amendment-001's: confirm W9-A1 is satisfied with zero diff required (Sections 3–8), and **separately surface two additional findings discovered during the required broader audit** (Section 1.1) — one cosmetic, one a genuine real gap — without attempting to design a fix for either here.

### 1.1 Two Additional Findings (Not W9-A1 — Reported, Not Solved Here)

**Finding A (cosmetic):** ExercisePrescription-Amendment-001.md (EP-A1) required a small cross-reference note be added to W-9's Rest State section (§7) — *"add note that restSeconds may be displayed as reference context when non-null."* Verified: never added (zero mentions of `restSeconds`/`distanceValue`/`distanceUnit`/"EP-A1" anywhere in W-9). **Not a behavioral gap** — EP-A1's own text makes the display explicitly optional (*"Display is optional — implementations may choose to omit the reference display without violating this spec"*). W-9's Rest State section is fully spec-compliant as written. Flagged for the existing documentation-lag cleanup backlog, not performed here — it originates from EP-A1, not from W-24 §22, and addressing it is out of this amendment's named scope.

**Finding B (real, genuine gap):** Exercise-002-Exercise-Substitution-Architecture.md's own "Downstream Document Updates Required" table states W-9 *"must implement: 'Replace Exercise' action trigger on exercise cards; persistence choice UI (session / template / program); prescription quantity carry-forward to substitute; `ExerciseSessionData` enrichment with `prescribedExerciseId`/`prescribedExerciseName`; `SubstitutionRecord` creation on confirmation."* Exercise-002 §7.1: *"Substitution is initiated from the active exercise card in W-9. The specific affordance... is defined in the W-9 spec."* Verified exhaustively: **no such affordance exists anywhere in W-9's current document.** The only per-exercise interaction is long-press-to-reorder (§5.4); the only overflow/options menu anywhere is workout-level, not per-exercise. This is a real, unimplemented design requirement — not something already decided-and-undocumented like W9-A1 turned out to be. Per this amendment's "smallest amendment possible" constraint, **this is not designed here.** It is named and recommended as a dedicated follow-up — **W9-A2** — addressed separately, immediately following this document's lock.

---

## Section 2 — Existing Authority Audit

**How workouts currently enter W-9:** Three entry points — W-1 Program Card, W-3 Active state "Start Next Workout," H-1 "Continue Program" — all pre-load from a program slot's `sections[]` per §2.3/§9.1. A fourth path, the free-form W-9 entry with no program slot, opens with an empty exercise list and "Add Exercise" → W-23, entirely unaffected by W9-A1.

**Whether builder-created workouts already flow correctly into W-9:** Yes. A W-24-built slot's `sections[].exercises[]` (`ExercisePrescription` records) is read generically by W-9's §2.3/§9.1/§5.7 population logic — no W-24-specific branching exists or is needed.

**Whether imported workouts already flow correctly into W-9:** Yes, identically — confirmed by the same finding already established in W3-Amendment-001: an imported slot (Architecture-Amendment-001-Import.md, *"Import section mapping"*) produces the same `ProgramSlot.sections[].exercises[]` shape as a builder-created slot (MAIN-section-only, `originTemplateId: null`). W-9 has no origin-based logic anywhere — it reads `sections[]` the same way regardless of whether the slot was populated by W-24, by import, or left empty for free-form building.

**What W-24 §22 actually requires of W-9:** Exactly the two items quoted in Section 1 — pre-population and reference-only prescription display. Nothing else. W-24 §22 does not mention exercise substitution, rest/distance reference fields, or any other behavior — those originate from separate amendments (EP-A1, Exercise-002), audited above as Findings A and B, not as part of W9-A1 itself.

**Whether any validation coverage is missing for W9-A1 specifically:** No. See Section 8.

**Whether any behavioral gap genuinely exists:** Yes — but not within W9-A1's own scope. See Finding B (Section 1.1), addressed by W9-A2.

---

## Section 3 — W-24 → W-9 Integration Review

| W-24 §22 Requirement | W-9 Implementation | Status |
|---|---|---|
| Pre-populate exercise list from `sections[]`, organized WARM_UP → MAIN → COOL_DOWN, when starting from any valid entry point | §2.3, §9.1: *"exercise list now sourced from `sections[]`"*; §5.7 Section Rendering Rules table | Satisfied |
| Section headers rendered only for sections with ≥1 exercise; empty sections produce no header | §5.7, §4.1 (*"section headers are display-only in W-9"*) | Satisfied |
| Free-form path (no exercises built) unaffected | §9.1, confirmed unchanged | Satisfied |
| Reference-only prescription line in Set Input Sheet when `ExercisePrescription` fields are non-null | §6.2 *"Program target line — present only for program-driven workouts"* | Satisfied |
| Reference text does not gate, block, or flag deviations | §6.3 (used only as a pre-population default, freely overridable); §6.6; checklist line *"Deviating from targets: no warning, no shame state, no flag"* | Satisfied |
| W-9 never writes to `ExercisePrescription` | Not contradicted anywhere; execution and plan layers remain independent per W-24 W24-D11/D14 | Satisfied |

No row requires a change.

---

## Section 4 — Builder-Created Workout Flow Review

A slot built via W-24 starts as `sections: [{ type: 'MAIN', exercises: [] }]` and is populated with `ExercisePrescription` records as the athlete adds exercises (Copy-Semantics, W-4 Decision 2 — already reused without modification by W3-Amendment-001). When the athlete starts that workout, W-9 reads the slot's `sections[]` generically — sorted by section, then by `order` within each section — with no awareness of, or dependency on, the fact that W-24 was the tool that built it. No special-casing exists or is required.

---

## Section 5 — Imported Workout Flow Review

An imported slot (Architecture-Amendment-001-Import.md) starts pre-populated, MAIN-section-only, with `originTemplateId: null` — structurally identical to a builder-created slot once exercises exist. W-9's population logic is keyed entirely on the `sections[]` shape, never on `originTemplateId` or any other provenance field. An athlete who starts a freshly-imported workout (never touched in W-24) sees the same pre-loaded, section-organized exercise list as one built natively — confirmed, not assumed, by the absence of any origin-conditional logic anywhere in W-9's spec.

---

## Section 6 — Required W-9 Changes

**None, for W9-A1.** Sections 3–5 confirm full satisfaction with zero diff required. Finding A (Section 1.1) is cosmetic and out of scope. Finding B (Section 1.1) is a real, separate gap, explicitly not addressed in this document — see W9-Amendment-002.

---

## Section 7 — Navigation Review

All three program-entry paths into W-9 (W-1, W-3 Active "Start Next Workout," H-1) are unchanged by this audit — each already correctly triggers the `sections[]`-based pre-population per §2.3/§9.1. No navigation edge is added, removed, or retargeted.

---

## Section 8 — Validation Updates

**None needed.** Unlike Program-Detail-Wireframe-Spec-W3.md (which had body text fully specifying its W3-A1 behavior but no corresponding checklist items), W-9's §17 Validation Checklist already has explicit, direct coverage for both W9-A1 requirements:

- *"Pending set rows show '—' + program target in secondary text if applicable"* (Exercise List block)
- *"Set Input Sheet content: exercise name + set number + program target (if applicable)..."* (Set Logging block)
- *"Weight pre-populated: in-session last → prior session last → program target"* / *"Reps pre-populated: program target → in-session last → prior session last"* (Set Logging block)
- *"Exercise list pre-loaded from program on program-entry"* / *"Program targets visible on exercise cards and in Set Input Sheet"* / *"Program targets labeled 'program target' — not 'required' or 'goal'"* / *"Deviating from targets: no warning, no shame state, no flag"* (Program Workout Behavior block)
- The entire "Workout Sections (W-9)" block (added at v1.1, alongside W9-A1) covers section-header rendering directly

No item is added, removed, or modified.

---

## Section 9 — Non-Behaviors

- **No redesign of W-9, W-24, Program Architecture, Import Architecture, or Exercise Library Architecture.**
- **No change to Active-Workout-Flow-Spec-W9-W16.md** — this amendment produces zero diff to its target document (Section 10).
- **No attempt to design Finding B's substitution integration here** — explicitly deferred to W9-Amendment-002, consistent with "smallest amendment possible."
- **No edit to EP-A1's missing cross-reference note (Finding A)** — flagged for the existing documentation-lag cleanup backlog, not performed.
- **No new validation checklist items** — none were needed, unlike W3-Amendment-001.

---

## Section 10 — Amendment Diff Summary

| Document | Diff |
|---|---|
| Active-Workout-Flow-Spec-W9-W16.md | **None.** W9-A1 was already fully satisfied at v1.1; no body text, checklist, layout, navigation, or state-model change. |
| Workout-Builder-Wireframe-Spec-W24.md | None performed. Its §22 framing of W9-A1 as a forward-looking requirement is mildly stale (the requirement has been met since W-9 v1.1) but not actively misleading the way its W-3 v1.2 citation was — flagged for the cleanup backlog at low priority. |
| ExercisePrescription-Amendment-001.md | None — Finding A is reported, not resolved here. |
| Exercise-002-Exercise-Substitution-Architecture.md | None — Finding B is reported, not resolved here; addressed by W9-Amendment-002. |

---

## Section 11 — Validation Checklist

- [x] Confirmed W-24 §22's two W9-A1 requirements are both implemented in W-9 (Section 3)
- [x] Confirmed builder-created and imported workouts flow into W-9 identically, with no origin-based branching (Sections 4–5)
- [x] Confirmed W-9's existing Validation Checklist already covers both W9-A1 requirements — no additions needed (Section 8)
- [x] Confirmed zero diff required to any document for W9-A1 itself (Section 10)
- [x] Identified and correctly scoped Finding A (cosmetic, EP-A1-sourced, not performed) as distinct from W9-A1
- [x] Identified and correctly scoped Finding B (real gap, Exercise-002-sourced, not performed) as distinct from W9-A1, recommended as W9-A2

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Confirms W9-A1 was already fully satisfied at Active-Workout-Flow-Spec-W9-W16.md v1.1, with no checklist gap (unlike W3-A1). Surfaces two additional findings discovered during the required broader audit — Finding A (cosmetic, EP-A1's missing restSeconds note) and Finding B (real, Exercise-002's unimplemented substitution-trigger requirement) — both explicitly out of scope here. Recommends W9-Amendment-002 to address Finding B. |

---

*W9-Amendment-001 — Workout Builder / Active Workout Integration*
*June 2026*
*Authority: Workout-Builder-Wireframe-Spec-W24.md (LOCKED), Active-Workout-Flow-Spec-W9-W16.md (LOCKED), ExercisePrescription-Amendment-001.md (LOCKED), Exercise-002-Exercise-Substitution-Architecture.md (LOCKED), Architecture-Amendment-001-Import.md (LOCKED)*
*Status: LOCKED*
