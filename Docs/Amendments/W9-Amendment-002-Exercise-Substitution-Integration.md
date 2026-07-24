# W9-Amendment-002 — Exercise Substitution Integration in W-9
## June 2026

**Status:** LOCKED

**Type:** Amendment (design — closes a real, confirmed gap; the underlying data model and flow are already locked elsewhere and are not redesigned)

**Target:** Active-Workout-Flow-Spec-W9-W16.md

**Authority:** Exercise-002-Exercise-Substitution-Architecture.md (LOCKED) §7.1–§8.3 (the substitution flow, persistence model, and `SubstitutionRecord`/`ExerciseSessionData` schema — all reused verbatim); W9-Amendment-001-Workout-Builder-Active-Workout-Integration.md (LOCKED) Finding B (the audit that confirmed this gap); Active-Workout-Flow-Spec-W9-W16.md (LOCKED) §5.1 (exercise card states), §5.4, §5.6 (existing card-level affordances this amendment is consistent with); Exercise-Picker-Wireframe-Spec-W23.md (LOCKED) (REPLACEMENT context, reused without modification)

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Amendment Scope

W9-Amendment-001 confirmed, by exhaustive direct search, that W-9's spec has no per-exercise affordance of any kind — no overflow menu, no "Replace Exercise" action — despite Exercise-002-Exercise-Substitution-Architecture.md explicitly requiring one and explicitly delegating the choice of *"the specific affordance — overflow menu, swipe action, or dedicated button"* to W-9's own spec (§7.1).

**This amendment designs that one delegated decision — the affordance and its surrounding UI — and nothing else.** The substitution flow itself (W-23 REPLACEMENT context, persistence choice options and availability rules, `SubstitutionRecord` creation, `ExerciseSessionData` enrichment, carry-forward of prescription quantities) is already fully specified by Exercise-002 §7.1–§8.3 and is reused verbatim throughout this document — none of it is redesigned, re-decided, or restated as new.

---

## Section 2 — What Is Reused Verbatim (Not Redesigned)

- **Entry mechanism after the affordance is tapped:** W-23 opens in REPLACEMENT context with `replacingExerciseId` set (Exercise-002 §7.2 step 2) — already locked, unchanged.
- **Persistence Choice options and availability:** "This session only" (always available) / "Update my template" (personal template only) / "Update my program" (ATHLETE_CREATED or IMPORTED only) / FORGE programs restricted to session-only — the exact table in Exercise-002 §7.3, reused without modification.
- **Data outcomes:** `SubstitutionRecord` creation with the correct `scope`/`persistedToId`; `ExerciseSessionData` enrichment with `prescribedExerciseId`/`prescribedExerciseName`; prescription quantities (sets, reps, weight, duration, distance, rest, notes) carrying forward unchanged to the substitute — all per Exercise-002 §7.4–§7.6, reused without modification.
- **No automatic substitution** (§7.7) and **no undo after persistence** (§8.2) — reused verbatim as non-behaviors.

---

## Section 3 — The One New Decision: Affordance Placement

**Decision: a per-exercise "⋯" overflow icon, added to the exercise card header, available in the Active and Upcoming states only — not in the Completed state.**

**Why "⋯" overflow, not a swipe action or dedicated button:** W-24's own exercise card already uses a per-exercise "⋯" overflow for its contextual actions (move-to-section, etc.) — reusing the same interaction pattern for W-9's first per-exercise action is the smallest, most consistent choice among the three options Exercise-002 explicitly left open. A dedicated always-visible "Replace" button would compete for header space with the existing Notes icon (§5.1) for a less-frequent action; a swipe gesture would be undiscoverable and inconsistent with this project's established overflow-menu convention elsewhere in W-9 (the workout-level "⋯ Options," §4.2).

**Why Active and Upcoming only, not Completed:** Exercise-002 does not explicitly forbid substituting a fully-logged exercise, but its own framing throughout (§7.2 step 1, *"prescribed exercise"*; §7.4, *"sets already logged... remain... the substitute... logged from that point forward"*) describes substitution as acting on **remaining, not-yet-logged sets**. A Completed exercise card (§5.1: *"collapses automatically when the last set is logged"*) has no remaining sets to redirect. This is a new, reasoned restriction — not asserted as already-locked elsewhere — and is the smallest interpretation consistent with Exercise-002's own framing rather than an arbitrary product opinion.

**Menu content:** Exactly one item, "Replace Exercise." No other action is added — W-9 has never had per-exercise overflow before this amendment, and nothing else is evidenced as needed.

---

## Section 4 — Designed Flow (New Content for W-9)

```
┌───────────────────────────────────────────────────────────┐
│  Barbell Bench Press                  [Notes ○] [⋯]      │  ← New: overflow icon
│  5 × 95 lb  (program target)                              │
├───────────────────────────────────────────────────────────┤
│  Set 1   95 lb × 5    ✓                                   │
│  Set 2   95 lb × 5    ✓                                   │
│  Set 3 → [           Log Set           ]                  │
│  Set 4   —           Last: 95 lb × 5                      │
│  Set 5   —           Last: 95 lb × 5                      │
└───────────────────────────────────────────────────────────┘
```

1. Athlete taps "⋯" on an Active or Upcoming exercise card → action sheet opens with a single item: **"Replace Exercise."**
2. Tapping "Replace Exercise" opens W-23 in REPLACEMENT context, `replacingExerciseId` set to this exercise's `id` (Exercise-002 §7.2, unchanged).
3. Athlete selects a substitute in W-23, which dismisses back to W-9.
4. **Persistence Choice sheet** appears (new UI, reusing Exercise-002 §7.3's options/availability verbatim):

```
┌───────────────────────────────────────────────────────────┐
│  Replace Barbell Bench Press with Incline Press?          │
│                                                             │
│  ◉  This session only                                     │
│  ○  Update my template            ← shown only if eligible│
│  ○  Update my program              ← shown only if eligible│
│                                                             │
│  [              Confirm              ]                    │
│  [               Cancel              ]                    │
└───────────────────────────────────────────────────────────┘
```

5. "This session only" is pre-selected by default (Exercise-002 §7.3). Only the rows the athlete's current workout source actually qualifies for are shown — a FORGE program workout shows only "This session only," with no other rows rendered (not shown-but-disabled; absent entirely, consistent with this project's established "silence is the correct state" convention for unavailable options).
6. "Confirm" applies the substitution exactly per Exercise-002 §7.4–§7.6 (reused, not redesigned). "Cancel" at any point — in W-23 or on this sheet — returns to W-9 with the original exercise card completely unchanged.

**Card-level result after confirmation:**
- **If zero sets were logged for the original exercise yet:** the card is replaced in place — same position in the list, new exercise name, same prescription quantities, no leftover entry for the original.
- **If some sets were already logged (mid-exercise substitution):** the original card collapses to its completed-style summary showing only the sets logged under it (e.g., *"Barbell Bench Press ✓ 2 sets · 95 lb × 5"*) and remains in the list at its original position; a new Active card for the substitute exercise appears immediately after it, inheriting the remaining unlogged sets and their carried-forward prescription. This matches Exercise-002 §7.4's *"the session may contain both exercises"* framing exactly — both appear in the session summary and W-19 Activity Detail, unchanged from what Exercise-002 already specifies.

---

## Section 5 — Required W-9 Changes (Applied Directly)

Added as new §5.8 "Exercise Substitution" within Section 5 (Exercise List Structure), immediately after §5.7 (Section Rendering Rules) — applied directly to Active-Workout-Flow-Spec-W9-W16.md as v1.2, consistent with the precedent set by W3-Amendment-001 for small, additive, already-authorized changes. This is larger than that precedent in content, but identical in kind: every behavioral decision below traces to Exercise-002, already locked; only the affordance and its placement (Section 3) is new.

A cross-reference is also added to §5.1's exercise card anatomy (the "⋯" icon shown in the Active/Upcoming wireframes) and a new "Exercise Substitution" block is added to §17's Validation Checklist.

---

## Section 6 — Non-Behaviors

- **No redesign of Exercise-002's substitution model, persistence options, or data schema** — all reused verbatim.
- **No redesign of W-23** — REPLACEMENT context, Suggested Substitutes, and the full catalog are unchanged.
- **No substitution affordance on Completed exercise cards** — restricted per Section 3's reasoning.
- **No automatic substitution** — every substitution requires explicit athlete action (Exercise-002 §7.7).
- **No undo after persisting to a template or program** — consistent with Exercise-002 §8.2's MVP scope.
- **No change to FORGE program immutability** — FORGE workouts always show "This session only," with no other option ever rendered.
- **No new screen code** — the entire flow reuses W-9's existing screen and W-23's existing modal; the Persistence Choice sheet is a bottom sheet within W-9, the same presentation pattern as the existing Set Input Sheet and Notes sheet.

---

## Section 7 — Validation Checklist

- [x] Affordance is a per-exercise "⋯" overflow, consistent with W-24's existing per-exercise overflow pattern
- [x] Affordance present on Active and Upcoming cards only; absent on Completed cards
- [x] Tapping "Replace Exercise" opens W-23 in REPLACEMENT context with `replacingExerciseId` set — unmodified from Exercise-002 §7.2
- [x] Persistence Choice sheet options and availability match Exercise-002 §7.3's table exactly, including the FORGE-programs-session-only-only restriction
- [x] Mid-exercise substitution (some sets already logged) produces the two-card outcome described in Exercise-002 §7.4, both visible in session summary and W-19
- [x] Cancel at any step leaves the original exercise card completely unchanged
- [x] No new screen code introduced; no redesign of W-23 or Exercise-002

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Designs the one decision Exercise-002 explicitly delegated to W-9 (the substitution-trigger affordance) and applies it directly to Active-Workout-Flow-Spec-W9-W16.md as v1.2. All flow, persistence, and data-model behavior reused verbatim from Exercise-002 — not redesigned. |

---

*W9-Amendment-002 — Exercise Substitution Integration in W-9*
*June 2026*
*Authority: Exercise-002-Exercise-Substitution-Architecture.md (LOCKED), W9-Amendment-001-Workout-Builder-Active-Workout-Integration.md (LOCKED), Active-Workout-Flow-Spec-W9-W16.md (LOCKED), Exercise-Picker-Wireframe-Spec-W23.md (LOCKED)*
*Status: LOCKED*
