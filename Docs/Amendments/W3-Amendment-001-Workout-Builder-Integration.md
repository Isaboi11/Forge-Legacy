# W3-Amendment-001 — Workout Builder Integration
## June 2026

**Status:** LOCKED

**Type:** Amendment (closure/administrative — not a new design)

**Target:** Program-Detail-Wireframe-Spec-W3.md

**Authority:** Workout-Builder-Wireframe-Spec-W24.md (LOCKED) §22 ("W3-A1 — 'Build Workout' / 'Edit Workout' Entry in W-3"); Program-Detail-Wireframe-Spec-W3.md (LOCKED) §10.4 and Change Log v1.3; Program-Creation-Wireframe-Spec-W4.md (LOCKED) Decision 2 (Copy-Semantics); Architecture-Amendment-001-Import.md (LOCKED) (import slot mapping)

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Amendment Scope

W-24 Workout Builder's §22 ("Upstream Amendments Required") names **W3-A1** as a required amendment to W-3, citing "W-3 Program Detail Wireframe Spec v1.2" as its target — written at a time when W-3 did not yet expose a way to reach W-24.

**Audit finding, verified directly: W3-A1 has already been completed.** W-3's own Change Log records it by name:

> *"v1.3 — June 2026: **W3-A1:** Workout slot rows in Future state now tap → W-24 (Workout Builder). 'Build Workout' entry when slot has no exercises; 'Edit Workout' entry when slot has exercises. Active state upcoming rows also tap → W-24 for pre-session editing. Ended Early not-reached rows tap → W-24. Preview state rows remain no-action..."*

W-3 has since advanced two further versions — v1.4 (W3-A2, "What's Next" on the Graduated state) and v1.5 (W3-A3, "Share to Squad") — both unrelated to workout building. W-24's own header still cites *"W-3 v1.2 (LOCKED)"* as its authority and §22 still frames W3-A1 as *"Required"* — both stale, written before the amendment that resolved them.

**This document does not redesign W-3, W-24, or any program/import architecture.** Its scope is: (1) confirm, by direct row-for-row comparison, that W-24 §22's requirements are fully satisfied by W-3's existing locked content; (2) close one narrow, real gap found during that comparison — W-3's formal Validation Checklist never gained explicit checkbox coverage for the row-tap behavior its own body text already specifies, closed here as v1.6; (3) flag (not edit) the stale references in W-24 for the project's existing documentation-lag cleanup backlog.

---

## Section 2 — Existing Authority Audit

**Where a coach/athlete currently creates workouts within a program:** Exclusively via W-3 row taps into W-24 — confirmed directly, §10.4:

| State | Row Type | Tap Behavior |
|---|---|---|
| Future | No exercises | → W-24, "Build Workout" |
| Future | Has exercises | → W-24, "Edit Workout" |
| Active | Upcoming, not next | → W-24, "Edit Workout" |
| Ended Early | Not reached | → W-24, "Edit Workout" |
| Preview | Any | No action — Forge Programs are edited only via W-5 Fork, never directly |

**How builder-created workouts differ from imported workouts:** They don't, structurally — verified directly against both sources. A W-4-created slot starts as `sections: [{ type: 'MAIN', exercises: [] }]`. An imported slot (Architecture-Amendment-001-Import.md, "Import section mapping") starts as `sections: [{ type: 'MAIN', exercises: [...all parsed exercises...] }]` — pre-populated, MAIN-section-only, no WARM_UP/COOL_DOWN inferred. Both share the identical `ProgramSlot` shape and the identical `originTemplateId: null` (Program-Creation-Wireframe-Spec-W4.md, "Slot ownership note": *"Both paths produce programs whose slots own their own data... No template lookup, matching, or linking occurs during import"*). **W-3's existing Build/Edit distinction is keyed purely on exercise count, not on origin** (§10.4: *"'Build Workout' — slot has no exercises... 'Edit Workout' — slot has at least one exercise"*) — so an imported slot with parsed exercises automatically and correctly presents as "Edit Workout," with no special-casing required, exactly as a manually-built slot with exercises already does.

**What W-3 currently assumes about workout ownership:** Copy-Semantics (W-4 Decision 2, LOCKED) — every slot owns its own data from the moment of creation; there are no live template references anywhere in the program data model; `originTemplateId` is lineage metadata only. Forge Program slots (Preview state) are not directly editable — W-5 Fork must first copy the structure into an athlete-owned program, preserving `originTemplateId` on each copied slot. W-24 itself reuses this exact model (W24-D11: *"Copy-Semantics: slot owns its data... There is no separate 'Workout Template' entity in MVP"*).

**Which navigation paths are missing:** None. Every path W-24 §22 names — Future (any slot), Active (any slot, via "upcoming, not next"), Ended Early (not-reached only), Preview (excluded) — is already present in W-3 §10.4 and its navigation table.

**Which validation rules W-24 already established:** W-24 owns its own complete validation checklist (push navigation, auto-save, no Save/Cancel, W-9 sort order and reference-only prescriptions, etc.) — these govern W-24's own internal behavior and are not duplicated into W-3. W-3's responsibility is limited to entry/exit, which is what this audit checked.

---

## Section 3 — Required W-3 Changes

**None.** W-3's row-tap behavior (§10.4), Build/Edit Workout distinction, per-state accessibility, and navigation table already fully satisfy W-24 §22's stated requirement, as shown by the row-for-row comparison in Section 2. No new CTA, no new overflow item, no new state, and no behavioral change is introduced by this amendment.

---

## Section 4 — Navigation Updates

**None.** W-3 §10.4 and its navigation table already list every edge W-24 §22 requires: Future (Build/Edit Workout, any row), Active (Edit Workout, upcoming-not-next row), Ended Early (Edit Workout, not-reached row), Preview (no action). No edge is added, removed, or retargeted by this amendment.

---

## Section 5 — Validation Updates

**One narrow, genuine addition — applied directly to Program-Detail-Wireframe-Spec-W3.md as v1.6.** W-3's body text (§10.4) and navigation table fully specify the Build/Edit Workout row-tap behavior, but the document's formal checkbox Validation Checklist never gained explicit coverage for it — confirmed by direct search, the only checklist hits were unrelated ("NEXT" label exclusivity, tap-target sizing). This is a checklist/QA coverage gap, not a design gap, and is small and purely additive — consistent with this project's precedent of applying narrow, non-design downstream edits directly as part of an amendment (e.g., Critical-Decisions-Amendment-001.md's direct edits to several documents) rather than only recommending them. Added a new subsection, "Workout Schedule — Build/Edit Workout Entry," to W-3's existing Validation Checklist:

- [ ] Future state: any row with zero exercises taps → W-24 "Build Workout" entry
- [ ] Future state: any row with ≥1 exercise taps → W-24 "Edit Workout" entry, existing exercises loaded
- [ ] Active state: upcoming (not-next) row taps → W-24 "Edit Workout" entry
- [ ] Active state: next row still initiates the workout (W-24 entry does not override "Start Next Workout")
- [ ] Ended Early state: not-reached row taps → W-24 "Edit Workout" entry
- [ ] Preview state: rows remain no-action; W-24 is unreachable from a Forge Program's own W-3 (only via W-5 Fork first)
- [ ] Secondary row text reflects exercise count and action hint ("0 exercises · Build Workout" / "[N] exercises · Tap to edit")

---

## Section 6 — Non-Behaviors

- **No redesign of W-24** — its push-navigation model, auto-save, prescription model, and validation rules are unchanged and uncited beyond confirming W-3's entry points match what it expects.
- **No redesign of Program Architecture, Slot Architecture, or Import Architecture** — Copy-Semantics, `originTemplateId` lineage tracking, and the import section-mapping rule are all reused verbatim, not modified.
- **No change to W-3's CTAs, overflow menus, or state model** — Preview/Future/Active/Graduated/Ended Early behavior outside the Workout Schedule section is untouched.
- **No new visual distinction between imported and builder-created workouts** — confirmed none is needed; both are identical `ProgramSlot` records, distinguished only by exercise count, which W-3 already handles.
- **No edit to W-24's stale "Authority: W-3 v1.2" citation or its §22 "Required" framing** — flagged in Section 7, not performed here, consistent with this project's established documentation-lag-citation discipline (flag, don't silently edit a different locked document).

---

## Section 7 — Amendment Diff Summary

| Document | Diff |
|---|---|
| Program-Detail-Wireframe-Spec-W3.md | **Applied — now v1.6.** Additive only: seven new Validation Checklist items under a new "Workout Schedule — Build/Edit Workout Entry" subsection, plus a Change Log v1.6 entry and updated header/footer version number. No body text, layout, navigation, or state-model change. |
| Workout-Builder-Wireframe-Spec-W24.md | **None performed.** Its header ("Authority: ... W-3 v1.2 (LOCKED)...") and §22 ("Required: Each workout slot card in W-3... needs a mechanism to enter W-24") are now stale — W-3 is at v1.6 and the mechanism has existed since v1.3. Flagged for the project's existing consolidated cosmetic-cleanup backlog (Global-Architecture-Status-Audit.md §7), same treatment already given to comparable stale references elsewhere in this project. |
| Any other document | None. |

---

## Section 8 — Validation Checklist

- [x] Confirmed W-24 §22's four required navigation edges (Future any-row, Active upcoming-row, Ended-Early not-reached-row, Preview excluded) all exist in W-3 §10.4 prior to this amendment
- [x] Confirmed the Build/Edit Workout distinction is keyed on exercise count, not origin (import vs. builder), and requires no new logic
- [x] Confirmed Copy-Semantics (W-4 Decision 2) and import slot mapping (Import Amendment 001) are unchanged
- [x] Applied the seven new Validation Checklist items to Program-Detail-Wireframe-Spec-W3.md as v1.6 — additive, not corrective of any existing wrong statement
- [x] Confirmed no behavioral, layout, or navigation change is introduced anywhere
- [ ] W-24's stale "Authority: W-3 v1.2" citation and §22 "Required" framing remain unedited — flagged for the cleanup backlog, not performed here

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Closes W3-A1 administratively — confirms it was already satisfied by Program-Detail-Wireframe-Spec-W3.md v1.3, applies seven missing Validation Checklist items directly to W-3 (now v1.6), flags (does not edit) W-24's stale authority citation and §22 framing. |

---

*W3-Amendment-001 — Workout Builder Integration*
*June 2026*
*Authority: Workout-Builder-Wireframe-Spec-W24.md (LOCKED), Program-Detail-Wireframe-Spec-W3.md (LOCKED), Program-Creation-Wireframe-Spec-W4.md (LOCKED), Architecture-Amendment-001-Import.md (LOCKED)*
*Status: LOCKED*
