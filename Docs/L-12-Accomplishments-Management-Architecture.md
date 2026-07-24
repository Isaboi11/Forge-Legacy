# L-12 Accomplishments Management — Architecture

## v1.0.1 — June 2026

**Status:** LOCKED

**Type:** Architecture Document (not a wireframe spec — parallel in role to Exercise-Library-Architecture-v1.0.md before W-21)

**Date:** June 2026

**Implements:** Legacy-Hub-Wireframe-Spec-L1.md §10's "View All [N] Accomplishments ›" destination (Risk 4: "L-12 Accomplishments Detail Unspecced") and Profile-Wireframe-Spec-P1.md §8's "View all →", "+ Add Accomplishment" destinations — three navigation targets (L-12, L-13, L-14) referenced by name in locked documents but never architected.

**Authority Chain:**
- Accomplishments-Architecture-Note.md (LOCKED) — the data model: nullable `chapterId`, two-context model, unified display order, explicit list of what it does not specify
- Legacy-Hub-Wireframe-Spec-L1.md (LOCKED) §10 — Accomplishments preview section, "before Honors" ordering rationale, Risk 4
- Profile-Wireframe-Spec-P1.md (LOCKED) §8 — Accomplishments Tier 5, the only locked source naming L-12/L-13/L-14 individually, "athlete controls ordering" requirement, §15.3 (no per-accomplishment privacy control)
- Featured-Legacy-Moment-Standards.md (LOCKED) §3 — Major Accomplishment FLM trigger (Tier 2, Priority 5, "name + date")
- HonorInstance-Architecture-v1.0.md (LOCKED) §5 — Snapshot Philosophy (AD-52), the governing precedent for Section 8's delete behavior
- Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED) §4, §6 — Major Accomplishment's existing timeline entry format and two-context grouping rule
- Squad-Detail-Wireframe-Spec-S2.md (LOCKED) §5.5.4 — Limited Athlete Profile's top-3 accomplishment display, confirms no per-accomplishment privacy control
- Forge-Legacy-Master-PRD.md §13 — "Honors are earned. Accomplishments are declared."

**Downstream Dependents:** Docs/Accomplishments-Wireframe-Spec-L12-L14.md (recommended next, not yet authored — see Section 15).

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Architecture Review

L-1 and P-1 both already treat L-12, L-13, and L-14 as live, named navigation destinations:

- L-1 §10.2: *"View All [N] Accomplishments ›"* → **L-12 (Accomplishments Detail, unspecced)** — flagged as Risk 4: *"L-12 has no wireframe spec. The creation flow for chapter-level accomplishments is also unspecced."*
- P-1 §8.1, §8.6: *"View all →"* → **L-12 Accomplishments List**
- P-1 §8.2: *"The athlete controls this ordering via their accomplishments settings (L-12 / L-14)"*
- P-1 §8.3: *"The date is available in L-13 Accomplishment Detail."*
- P-1 §8.4, validation checklist: *"+ Add Accomplishment"* → **L-14 Add Accomplishment**

These are three **distinct, already-named codes** — not one screen with internal states (the W-21 precedent does not transfer here; W-21's four states were never individually named by any locked document, whereas L-12/L-13/L-14 are named individually by P-1). This document treats all three as a single architecture problem because they share one data model and one set of ownership rules, but it does not collapse them into one screen.

**Naming correction (cosmetic, not a redesign):** Accomplishments-Architecture-Note.md itself labels L-12 *"(Accomplishments Detail)"* in two places (its "Created by" subsections). This is imprecise — L-1 and P-1 (both more specific, both locked) consistently call L-12 the **List**, and reserve "Detail" for L-13 individually. This document uses L-12 = List, L-13 = Detail, L-14 = Add/Edit, matching the more specific locked sources. The Architecture Note's older phrasing is a documentation-lag artifact, consistent with the pattern already found and logged elsewhere in this project (P-6, P-4, L-1's own stale references) — not corrected in-place here, since amending that document is out of this task's scope, but flagged for the Section 16-style cleanup backlog.

---

## Section 2 — Existing Authority Audit

Direct answers to the required pre-design audit:

| Question | Answer | Source |
|---|---|---|
| What accomplishment types already exist? | **None.** No typed taxonomy anywhere. Every accomplishment is freeform text. | Accomplishments-Architecture-Note.md (silent on types) |
| What metadata already exists? | `chapterId` (nullable), creation date (Forge Legacy timestamp, used for sort order). FLM Standards implies a `name` and a `date` field ("name + date" trigger) but the Architecture Note itself never lists these as confirmed fields — they are the minimum implied by the FLM trigger and P-1's display ("Marathon Finisher" as name; date shown only at L-13). | Architecture Note; FLM Standards §3; P-1 §8.3 |
| What creation rules already exist? | Only one confirmed creation path: O-2e (onboarding, Path B), freeform text, account-level only. Chapter-level creation is explicitly **"not yet finalized."** | Architecture Note |
| What chapter attribution rules already exist? | `chapterId: null` = account-level; `chapterId: [id]` = chapter-level. No rule for *how* a chapter gets assigned at creation, and no rule for reassignment afterward. | Architecture Note |
| What account-level rules already exist? | Account-level accomplishments represent "what the athlete has built before using Forge Legacy" — documented only as an onboarding-time concept. The Note does not state whether account-level creation is possible *after* onboarding has ended. | Architecture Note |
| What unresolved items remain? | Chapter-level creation UI; edit; delete; archive; multi-chapter association; post-creation chapter reassignment; privacy/visibility controls; the "top 3 ordering" mechanism implied by P-1 but never specified. | Architecture Note, "What This Note Does Not Specify"; P-1 §8.2 |

No accomplishment type is invented in this document — the freeform, untyped model is preserved exactly as locked.

---

## Section 3 — Accomplishment Ownership Model

Accomplishments are fully athlete-owned, declared content — distinct from Honors, which are system-awarded (*"Honors are earned. Accomplishments are declared."* — Master PRD §13). An accomplishment has exactly one owner (the authoring athlete) and is never co-owned, shared for editing, or system-generated.

**Ownership does not change based on chapter context.** Whether `chapterId` is `null` or set, the athlete who created the record is its sole owner with full CRUD rights. The two-context model (Architecture Note) governs *attribution*, not *ownership* — both contexts are "first-class," and this document extends that principle to mean both are equally editable, equally deletable, and equally reassignable.

**Account-level creation is not onboarding-exclusive.** The Architecture Note documents O-2e as the only *known* creation path, but does not state that account-level accomplishments can only be created during onboarding. P-1's "+ Add Accomplishment" CTA is permanent and unconditional (§8.4: *"always visible... the athlete who has 20 accomplishments and just earned a new belt rank can add it from here"*) — it is never gated to a first-run state. This document resolves the open question by stating: **L-14 is available at any time, post-onboarding included, and produces an account-level accomplishment (`chapterId: null`) whenever the athlete does not select a chapter.** This is the smallest reading consistent with P-1's existing, unconditional CTA — it requires no new gating logic.

---

## Section 4 — Information Architecture

Three screens, one shared data model:

- **L-12 — Accomplishments List**: every accomplishment the athlete owns, account-level and chapter-level **unified with no visual differentiation** (Architecture Note, "Display Behavior" — directly reused, not redesigned), sorted most-recent-first by Forge Legacy creation date. Each row is enough to identify the accomplishment (name + a "Featured" indicator if applicable, per Section 7) and navigate to L-13.
- **L-13 — Accomplishment Detail**: name, date (per P-1 §8.3, this is where the date lives), and chapter context if any (chapter name, or "No Chapter" if account-level). Showing chapter context here does **not** violate the "no visual differentiation" rule — that rule governs the unified *list* display (L-12, and the P-1/L-1 preview rows), not a single-item detail view. Entry point to Edit (→ L-14, edit mode) and Delete (confirmation, Section 8).
- **L-14 — Add/Edit Accomplishment**: one form, two modes, by the same precedent already established in this project for Goal-Create-Edit-Wireframe-Spec-G3.md (a single combined create/edit code). Fields: name (required), date (required), chapter (optional picker — see Section 6).

---

## Section 5 — Navigation Model

| From | Action | To |
|---|---|---|
| L-1 | "View All [N] Accomplishments ›" | L-12 |
| P-1 | "View all →" (Accomplishments) | L-12 |
| P-1 | "+ Add Accomplishment" | L-14 (create mode) |
| L-12 | Tap a row | L-13 |
| L-12 | "+" (new — added by this document, consistent with P-1's existing CTA) | L-14 (create mode) |
| L-13 | "Edit" | L-14 (edit mode, pre-filled) |
| L-13 | "Delete" | Confirmation dialog → on confirm, returns to L-12 |
| L-14 | Save (create or edit) | Returns to L-12 (create) or L-13 (edit) |
| L-14 | Cancel | Returns to caller with no changes |

No other screen links directly to L-13 or L-14 except through L-12 or P-1 — consistent with this project's established single-entry-point navigation convention (already used by L-2, W-21, and others).

---

## Section 6 — Create Accomplishment Flow (L-14, create mode)

**Fields:**
- **Name** — required, freeform text (matches O-2e's existing "freeform text entries" precedent — no new input pattern).
- **Date** — required. FLM Standards §3 names "name + date" as the triggering pair for Major Accomplishment eligibility; date is not optional.
- **Chapter** — optional picker. If the athlete has zero chapters (active or archived) ever created, this field is **omitted entirely** — the new accomplishment is automatically account-level. If the athlete has at least one chapter, the picker defaults to **"No Chapter"** (account-level) and lists active chapters first, then archived chapters, by the same ordering convention L-2 already uses for chapter sections.
- **No photo field.** Photo attachments are explicitly V1.1+ (Architecture Note, "What This Note Does Not Specify") — not introduced here.

On save, the new record is automatically a Major Accomplishment FLM candidate (Featured-Legacy-Moment-Standards.md §3, Tier 2, Priority 5) — this is automatic and universal; there is no "mark as major" toggle, because no sub-type distinction exists anywhere in the locked architecture (confirmed in Section 2's audit).

---

## Section 7 — Edit Behavior

Accomplishments are fully editable after creation: name, date, and chapter are all editable via L-14 in edit mode, pre-filled with current values.

**Editing the chapter field is how cross-chapter (and account-level ↔ chapter-level) movement is satisfied.** The Architecture Note flags "whether records can be moved between chapter contexts post-creation" as unresolved; this document resolves it as **yes**, by reusing the same chapter-picker field the create flow already needs — no separate mechanism, no separate screen. This is the smallest implementation: the edit form is identical in shape to the create form.

No locked document gives any reason to make accomplishments immutable (unlike, e.g., SubstitutionRecord, which is locked write-once for a documented reason). Full editability is the default absent evidence to the contrary.

---

## Section 8 — Archive/Delete Behavior

**Delete:** Permanent, confirmation-gated, available from L-13. No tombstone/restore pattern (the heavier Custom-Exercise-style tombstone exists specifically because `ExerciseLog` snapshots reference custom exercises by name across many historical log entries — no analogous many-to-one dependency exists for accomplishments).

**Deleting an accomplishment does not retroactively alter or remove its corresponding L-2 timeline entry.** This is not a new rule invented for this document — it is a direct application of an already-locked, generalized project principle: **HonorInstance-Architecture-v1.0.md §5, "Snapshot Philosophy" (AD-52)**:

> *"Any human-readable string that appears in an L-11 description template, or that would be needed for accurate display if the source entity is renamed, deleted, or becomes inaccessible, must be snapshotted... The display layer never queries external entity records to render a description."*

That document names the exact analogous case: *"Goal name edited or goal deleted → Description would break or show wrong name → Snapshot `goalName`."* This document applies the same principle: **the Major Accomplishment timeline event (L-2) snapshots the accomplishment's name and date at the moment the event is created.** Subsequent edits or deletion of the source Accomplishment record do not alter the historical timeline entry. This generalizes an existing locked rule rather than introducing a new one.

**Archive:** Not introduced. No locked document evidences a need for a state between "exists" and "deleted." Delete already satisfies "I don't want this anymore"; smallest-MVP omits archive.

---

## Section 9 — Visibility Rules

No per-accomplishment privacy control exists, and none is introduced here — confirmed directly: P-1 §15.3, *"No per-accomplishment privacy control currently exists."* Squad members see the athlete's top-3 featured accomplishments via the Limited Athlete Profile (Squad-Detail-Wireframe-Spec-S2.md §5.5.4), the same set surfaced on P-1 and L-1. There is no athlete-level toggle to hide an individual accomplishment from squad view, and no distinction in visibility between account-level and chapter-level records.

---

## Section 10 — Relationship to Legacy Timeline (L-2)

L-2 already specifies Major Accomplishment's entry format and grouping rule (§4, §6): chapter-section if chapter-attributed, standalone if account-level, per the two-context model. This document does not change that — it only adds the snapshot rule (Section 8) governing what happens to that timeline entry if the source record is later edited or deleted.

**L-12 vs. L-2:** L-2 is the *recency* surface — every legacy event type, interspersed chronologically, read-only. L-12 is the *accomplishments-only* management surface — exhaustive, single-type, full CRUD. An athlete cannot edit or delete anything from L-2 (per L-2 §11's "no per-entry tap-through" non-behavior); they can only do so from L-12/L-13/L-14.

---

## Section 11 — Relationship to FLM

Every accomplishment is automatically Major-Accomplishment-FLM-eligible at creation (Featured-Legacy-Moment-Standards.md §3, Tier 2, Priority 5, 30-day active window). No accomplishment is excluded from FLM eligibility, and no athlete action in L-12/L-13/L-14 affects FLM selection — FLM eligibility is fully owned by Featured-Legacy-Moment-Standards.md and is not redesigned here. Editing or deleting an accomplishment after its FLM window has already passed has no retroactive effect on a past FLM selection, by the same snapshot logic as Section 8 (FLM selection at the time it occurred is a historical fact, not a live query).

---

## Section 12 — Relationship to Honors

Architecturally parallel role (both appear on L-1, both feed FLM, both are "achievement records"), but opposite ownership model: Honors are system-awarded with zero athlete CRUD (HonorInstance records are created only by the Honor Evaluation Service); Accomplishments are 100% athlete-authored with full CRUD via L-12/L-13/L-14. This document does not alter Honors in any way — Honors are cited only as the architectural precedent for the snapshot rule in Section 8.

---

## Section 12A — Relationship to Social / Pinned Posts

> **Reconciliation note — Social-System-Architecture-v1.0 (LOCKED, June 2026; governing social authority).** `Social-System-Architecture-v1.0` SOC-D6 generalizes **Pinned Posts** so that an athlete may pin any intentional Post — **including a major accomplishment** — to reinforce identity on their profile. This is **distinct from L-12's "Featured" flag** and does not change it:
> - **L-12 "Featured" (max 3, Section 7)** governs *ordering/surfacing within the accomplishments surface* (P-1 Tier 5 / L-1 preview) — an accomplishment-management mechanism. It is unchanged.
> - **SOC-D6 "Pinned Posts"** governs *profile-level pinning of intentional Posts*. If a future surface lets an athlete pin an accomplishment **as a Post**, that pinning is owned by SOC-D6 (and the P-1 spec downstream), **not** by this document's Featured flag.
> - **No schema change, no new field, and no conflict:** the two mechanisms are independent. This document is not redesigned; SOC-D13 also confirms no social action (posting/pinning) ever affects the accomplishment record, FLM selection, Honors, Rank, or any progression.

---

## Section 13 — Relationship to Goals

No relationship exists, and none is introduced. Goals are chapter-bound, carry progress/target/achievement tracking, and may optionally link to a program (Goal-Hub/Detail/Create-Edit specs). Accomplishments have none of that — no progress tracking, no target, no program linkage, optional (not required) chapter association. They are sibling "athlete declares something that matters" systems with no conversion or cross-reference between them. This document does not propose one.

---

## Section 14 — Open Questions

Carried forward, non-blocking — explicitly deferred to the wireframe-spec stage (same deferral pattern Exercise-Library-Architecture-v1.0.md used before W-21):

1. **Featured-toggle UX.** This document resolves the *mechanism* (a boolean "Featured" flag, max 3 active, satisfying P-1's "athlete controls ordering" requirement with the smallest possible interaction) but not its exact visual treatment — toggle vs. swipe action vs. menu item is a layout decision for the wireframe spec.
2. **Presentation form of L-13/L-14.** Full-screen push vs. modal/bottom sheet is left open, consistent with how Exercise-Library-Architecture-v1.0.md left W-21's exact layout to its own wireframe spec.
3. **Accomplishments-Architecture-Note.md's stale "(Accomplishments Detail)" labeling of L-12** (Section 1) — a cosmetic, non-blocking documentation-lag finding, recommended for this project's existing consolidated cleanup backlog rather than a standalone amendment.

None of these block locking this architecture or authoring the next wireframe spec.

---

## Section 15 — Recommendation For Wireframe Spec

Author **Docs/Accomplishments-Wireframe-Spec-L12-L14.md** next, covering all three screen codes together under one document (consistent with how this project has paired tightly-coupled screens before — e.g., Chapter-Detail-Wireframe-Spec-L3-L4.md covers two codes in one file). The architecture in this document is sufficiently bounded — ownership, fields, navigation, edit/delete/archive behavior, and the FLM/Timeline/Honors/Goals boundaries are all resolved — that the wireframe spec is layout work against a fixed contract, not open design space.

This is **not** the final remaining Legacy gap. Per the Global Architecture Status Audit, **L-15 Photos** (and possibly L-16, pending confirmation of whether it folds into L-15) remains unspecced after this document locks — a separate workstream, not blocked by or blocking this one.

---

## Validation Checklist

### Ownership & Data Model
- [ ] No new accomplishment type introduced — freeform text model preserved exactly
- [ ] `chapterId` nullable model reused exactly as locked (Architecture Note)
- [ ] Account-level creation confirmed available post-onboarding (not gated to O-2e only)

### Navigation
- [ ] L-12 reachable from L-1 and P-1, exactly as already locked
- [ ] L-13 reachable only via L-12 row tap
- [ ] L-14 reachable via P-1's existing CTA, L-12's new "+" CTA, and L-13's "Edit"
- [ ] L-14 returns to L-12 (create) or L-13 (edit) on save

### Display
- [ ] L-12 list shows no visual differentiation between account-level and chapter-level rows
- [ ] L-13 may show chapter context (does not violate the list-level rule)
- [ ] L-12 sort order: most recent first, by Forge Legacy creation date

### Create/Edit
- [ ] Name + date required; chapter optional and omitted entirely if athlete has zero chapters
- [ ] No photo field
- [ ] Edit form identical in shape to create form; chapter field editable (satisfies cross-context movement)

### Delete
- [ ] Delete is permanent, confirmation-gated, no tombstone/restore
- [ ] Deleting an accomplishment does not alter its L-2 timeline entry (per AD-52 snapshot rule)

### Visibility
- [ ] No per-accomplishment privacy toggle introduced
- [ ] Squad visibility unchanged (Limited Athlete Profile top-3, per S-2 §5.5.4)

---

## Non-Behaviors

- **No accomplishment-type taxonomy** — every accomplishment remains untyped freeform text.
- **No photo attachments** — explicitly V1.1+, not introduced.
- **No archive state** — delete is sufficient.
- **No per-accomplishment privacy controls** — none exist today; none introduced.
- **No drag-and-drop reordering** — the Featured-toggle mechanism (max 3) satisfies the ordering requirement without it.
- **No live-query dependency from L-2 onto Accomplishment records** — the timeline entry is a snapshot, per AD-52.
- **No change to Honors, Goals, or FLM selection logic** — all three are cited as authority, never redesigned.

---

## Open Issues

**None blocking.** See Section 14 for non-blocking items explicitly deferred to the wireframe-spec stage.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. |
| 1.0.1 | June 2026 | Reconciliation pass for `Social-System-Architecture-v1.0`. Added Section 12A distinguishing L-12's "Featured" flag (accomplishment-surface ordering) from SOC-D6's generalized "Pinned Posts" (profile-level pinning of intentional Posts). Pointer only; no field, decision, or behavior changed. |

---

*L-12 Accomplishments Management — Architecture*
*June 2026*
*Authority: Accomplishments-Architecture-Note.md (LOCKED), Legacy-Hub-Wireframe-Spec-L1.md (LOCKED), Profile-Wireframe-Spec-P1.md (LOCKED), Featured-Legacy-Moment-Standards.md (LOCKED), HonorInstance-Architecture-v1.0.md (LOCKED), Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED)*
*Status: LOCKED*
