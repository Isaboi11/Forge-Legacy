# L-12 / L-13 / L-14 Accomplishments — Wireframe Specification
## Screen Specifications: Accomplishments List, Detail, Add/Edit
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification (three screen codes, one document — same pairing convention as Chapter-Detail-Wireframe-Spec-L3-L4.md)

**Date:** June 2026

**Implements:** L-12-Accomplishments-Management-Architecture.md (LOCKED) — closes Legacy-Hub-Wireframe-Spec-L1.md's Risk 4 ("L-12 Accomplishments Detail Unspecced") and the L-12/L-13/L-14 navigation targets named individually by Profile-Wireframe-Spec-P1.md §8.

**Authority Chain:**
- L-12-Accomplishments-Management-Architecture.md (LOCKED) — ownership model, information architecture, create/edit/delete rules, Featured-toggle mechanism, AD-52 snapshot rule
- Accomplishments-Architecture-Note.md (LOCKED) — two-context data model, unified display order
- Legacy-Hub-Wireframe-Spec-L1.md (LOCKED) §10 — preview row format, navigation entry
- Profile-Wireframe-Spec-P1.md (LOCKED) §8 — second navigation entry, empty-state copy precedent, "+ Add Accomplishment" CTA
- Featured-Legacy-Moment-Standards.md (LOCKED) §3 — name + date requirement
- HonorInstance-Architecture-v1.0.md (LOCKED) §5 — AD-52 snapshot rule, governing delete behavior

**Downstream Dependents:** None. No screen is unspecced because of this document.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Screen Purpose

Three screens implement the full athlete-facing lifecycle for Accomplishments, per L-12-Accomplishments-Management-Architecture.md:

- **L-12 (List)** — every accomplishment the athlete owns, in one unified, undifferentiated list.
- **L-13 (Detail)** — a single accomplishment's full record, plus its management actions (Featured toggle, Edit, Delete).
- **L-14 (Add/Edit)** — one form, two modes, for creating a new accomplishment or editing an existing one.

This is the CRUD counterpart to L-2 Legacy Timeline's read-only Major Accomplishment entries — L-2 shows accomplishments as one of many event types in chronological context; these three screens are the only place an accomplishment can be created, edited, or deleted.

---

## Section 2 — Navigation Entry

| From | Action | To |
|---|---|---|
| L-1 | "View All [N] Accomplishments ›" | L-12 |
| P-1 | "View all →" (Accomplishments) | L-12 |
| P-1 | "+ Add Accomplishment" | L-14 (create mode) |
| L-12 | Tap a row | L-13 |
| L-12 | "+" (app bar) | L-14 (create mode) |
| L-13 | "Edit" | L-14 (edit mode, pre-filled) |
| L-13 | "Delete" → confirm | L-12 |
| L-14 | "Save" | L-12 (from create) or L-13 (from edit) |
| L-14 | "Cancel" | Returns to caller, no changes |

L-12 is a standard tab-stack push (system app bar, back chevron) when reached from L-1; when reached from P-1, it opens within the Profile modal's existing navigation context (per P-1 §8.6's already-locked precedent — not redesigned here). L-13 and L-14 are both standard pushes from L-12.

---

## Section 3 — L-12 Accomplishments List

```
┌─────────────────────────────────────────┐
│  ‹ Accomplishments                    + │
│                                           │
│  ★ Marathon Finisher                  › │
│  315 lb Barbell Bench Press           › │
│  Spartan Race Finisher                › │
│  Ran first 5K                         › │
│  Qualified for regionals              › │
│  First sub-hour open-water swim       › │
│  Completed my first marathon          › │
│                                           │
└─────────────────────────────────────────┘
```

- **App bar:** back chevron (left), title "Accomplishments," "+" icon button (right) → L-14 create mode.
- **Rows:** accomplishment name only (truncated at ~60 chars, same convention as L-1's preview row), chevron (›) right-aligned, full row tappable → L-13.
- **Featured indicator:** a small "★" prefix on rows currently marked Featured (max 3 at any time, per the architecture's Featured-toggle mechanism). This is the only visual marker on this screen — it is **not** a violation of the account/chapter "no visual differentiation" rule (Accomplishments-Architecture-Note.md), which governs source-context display only. Account-level and chapter-level rows remain visually identical to each other.
- **Sort order:** most recent first, by Forge Legacy creation date — reused exactly from the locked Display Behavior rule. Not user-sortable; no sort control.
- **No section headers, no grouping** — a single flat list, consistent with the "no visual differentiation" rule.

---

## Section 4 — L-12 Empty State

A new athlete with zero accomplishments (onboarding skipped, no chapter-level accomplishments added yet):

```
┌─────────────────────────────────────────┐
│  ‹ Accomplishments                    + │
│                                           │
│                                           │
│      Add your first accomplishment.      │
│                                           │
│      [  + Add Accomplishment  ]          │
│                                           │
└─────────────────────────────────────────┘
```

Single centered line + CTA — same empty-state convention this project already uses (L-2 §8, P-1 §8.5). No illustration.

---

## Section 5 — L-13 Accomplishment Detail

```
┌─────────────────────────────────────────┐
│  ‹                              Edit     │
│                                           │
│  Marathon Finisher                       │
│  Jun 2026                                │
│  From: Road to 405                       │
│                                           │
│  Featured on Profile            [ ◉ ]   │
│                                           │
│                                           │
│  [        Delete Accomplishment       ]  │
└─────────────────────────────────────────┘
```

- **App bar:** back chevron (left) → L-12, "Edit" text button (right) → L-14 edit mode.
- **Name:** primary text, full (not truncated — this is the detail view).
- **Date:** secondary text, "MMM YYYY" or full date — this is the field P-1 §8.3 explicitly defers to L-13 ("the date is available in L-13 Accomplishment Detail").
- **Chapter context line ("From: [Chapter Name]"):** shown **only if `chapterId` is set.** If the accomplishment is account-level (`chapterId: null`), this line is **omitted entirely** — no "No Chapter" placeholder is shown. This follows the same "silence is the correct empty state" convention already established elsewhere in this project (L-2 §5's "no empty chapter sections," S-2's "no accomplishments yet" omission).
- **Featured toggle:** a switch row, "Featured on Profile." Toggling on:
  - If fewer than 3 are currently Featured: toggles on immediately.
  - If 3 are already Featured: a sheet appears — *"You can feature up to 3 on your Profile. Replace one?"* — listing the current 3 by name, each with a "Replace" action; tapping one swaps it out and features this one instead. "Cancel" dismisses with no change.
- **Delete:** destructive full-width button at the bottom. Tapping opens a confirmation dialog: *"Delete this accomplishment? This can't be undone."* — "Delete" (destructive) / "Cancel." On confirm, the record is permanently removed and the screen returns to L-12. Per L-12-Accomplishments-Management-Architecture.md §8 (AD-52 snapshot rule), this has no effect on the accomplishment's existing L-2 timeline entry, if one exists.

---

## Section 6 — L-14 Add/Edit Accomplishment

One form, two modes (same single-code precedent as Goal-Create-Edit-Wireframe-Spec-G3.md).

```
┌─────────────────────────────────────────┐
│  Cancel        Add Accomplishment  Save │
│                                           │
│  Name                                    │
│  ┌─────────────────────────────────────┐ │
│  │ Marathon Finisher                  │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Date                                    │
│  ┌─────────────────────────────────────┐ │
│  │ June 19, 2026                    📅 │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Chapter (optional)                      │
│  ┌─────────────────────────────────────┐ │
│  │ No Chapter                         ›│ │
│  └─────────────────────────────────────┘ │
│                                           │
└─────────────────────────────────────────┘
```

- **App bar:** "Cancel" (left) → discards, returns to caller. Title: "Add Accomplishment" (create) or "Edit Accomplishment" (edit). "Save" (right) — disabled until Name is non-empty and Date is set.
- **Name:** required, freeform text input, no character-type restriction (matches O-2e's existing "freeform text entries" precedent).
- **Date:** required, opens a native date picker. Defaults to today in create mode; pre-filled with the existing value in edit mode.
- **Chapter:** optional. **This field is omitted entirely** if the athlete has never created any chapter (active or archived) — the accomplishment is automatically account-level with no picker shown. If the athlete has at least one chapter, the row shows the current selection ("No Chapter" by default in create mode; the accomplishment's current chapter, or "No Chapter," in edit mode) and opens a picker sheet on tap: "No Chapter" listed first, then active chapter(s), then archived chapters — same ordering convention L-2 uses for its chapter sections.
- **No photo field.** Photo attachments remain V1.1+ and are not introduced.
- **Edit mode** pre-fills all three fields with the accomplishment's current values, including its current chapter assignment — changing the Chapter field here is how an athlete moves an accomplishment between account-level and chapter-level, or between two chapters, per L-12-Accomplishments-Management-Architecture.md §7. No separate "move" action exists.

On Save:
- Create mode: a new accomplishment record is created; the screen returns to L-12. The new record is automatically Major-Accomplishment-FLM-eligible (Featured-Legacy-Moment-Standards.md §3) — no athlete action marks it as such.
- Edit mode: the existing record is updated in place; the screen returns to L-13, reflecting the new values. Per AD-52 (Section 5), any existing L-2 timeline entry for this accomplishment retains its original snapshotted name/date and is unaffected by this edit.

---

## Section 7 — Accessibility Requirements

| Element | accessibilityLabel | Notes |
|---|---|---|
| L-12 back chevron | "Back" | Returns to caller |
| L-12 "+" button | "Add accomplishment" | Opens L-14 create mode |
| L-12 row | "[Accomplishment name][, Featured]" | `accessibilityHint`: "Opens accomplishment detail" |
| L-13 "Edit" | "Edit accomplishment" | Opens L-14 edit mode |
| L-13 Featured toggle | "Featured on Profile" | Announces on/off state |
| L-13 "Delete" | "Delete accomplishment" | `accessibilityHint`: "Opens delete confirmation" |
| L-14 Name field | "Accomplishment name" | Required |
| L-14 Date field | "Date" | Required; opens date picker |
| L-14 Chapter field | "Chapter, optional" | Opens chapter picker if any chapters exist |
| L-14 "Save" | "Save accomplishment" | Disabled state announced when Name or Date missing |
| L-14 "Cancel" | "Cancel" | Discards changes |

**Focus order:** top to bottom, matching visual order, on all three screens.

---

## Section 8 — Navigation Table

(See Section 2 — consolidated there to avoid duplication.)

---

## Section 9 — Non-Behaviors

- **No visual differentiation between account-level and chapter-level rows on L-12** — reused exactly from Accomplishments-Architecture-Note.md.
- **No accomplishment-type picker or taxonomy** — every accomplishment remains freeform, untyped text.
- **No photo attachment field anywhere in these three screens** — V1.1+, not introduced.
- **No archive state** — only Delete exists as a removal action.
- **No drag-and-drop reordering** — the Featured toggle (max 3) is the only ordering mechanism.
- **No per-accomplishment privacy/visibility toggle** — none exists; squad visibility is unchanged (Limited Athlete Profile top-3, per S-2 §5.5.4).
- **No "No Chapter" placeholder text shown on L-13** for account-level accomplishments — the chapter line is omitted entirely, not shown empty.
- **No retroactive effect on L-2 timeline entries** from editing or deleting an accomplishment — per the AD-52 snapshot rule.
- **No tombstone/restore on delete** — deletion is permanent.

---

## Section 10 — Validation Checklist

### Navigation
- [ ] L-12 reachable from both L-1 and P-1, exactly as already locked
- [ ] L-13 reachable only via an L-12 row tap
- [ ] L-14 reachable from P-1's CTA, L-12's "+", and L-13's "Edit"
- [ ] L-14 returns to L-12 (create) or L-13 (edit) on Save; returns to caller unchanged on Cancel

### L-12 List
- [ ] Rows sorted most-recent-first by Forge Legacy creation date
- [ ] No section headers or grouping
- [ ] Featured rows show "★" prefix; non-Featured rows show no marker
- [ ] Empty state: single centered line + CTA, no illustration

### L-13 Detail
- [ ] Name and date always shown
- [ ] Chapter line shown only when `chapterId` is set; omitted (not placeholder) otherwise
- [ ] Featured toggle enforces max-3 with a replace-prompt sheet when already at the limit
- [ ] Delete requires confirmation; confirmation copy matches Section 5 exactly

### L-14 Add/Edit
- [ ] Name and Date required; Save disabled until both are present
- [ ] Chapter field omitted entirely when athlete has zero chapters
- [ ] Chapter field defaults to "No Chapter" in create mode
- [ ] Edit mode pre-fills all three fields including current chapter assignment
- [ ] No photo field present

### Data Integrity
- [ ] Deleting an accomplishment does not alter or remove its existing L-2 timeline entry
- [ ] Editing an accomplishment's name/date does not alter its existing L-2 timeline entry's snapshotted values

### Accessibility
- [ ] All interactive elements have accessibilityLabel per Section 7
- [ ] Focus order matches visual top-to-bottom order on all three screens

---

## Section 11 — Open Issues

**None blocking.** L-12-Accomplishments-Management-Architecture.md resolved every structural question before this spec was written; this document is layout work against a fixed contract.

Carried forward, not blocking (inherited from the architecture document's Section 14, now resolved at the layout level by this spec):
- Featured-toggle UX is implemented here as a switch row + replace-prompt sheet — a layout choice, not a re-opening of the architecture's decision to use a boolean flag.
- L-13 and L-14 are specified here as full-screen pushes (not modals) — a layout choice consistent with L-2's and W-21's existing push-based navigation conventions in this project; no locked document required this specific presentation form, but no document suggested a modal either, so the more common pattern in this project's existing Legacy/Profile screens was used.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. |

---

*L-12 / L-13 / L-14 Accomplishments — Wireframe Specification*
*Screen Specifications: Accomplishments List, Detail, Add/Edit*
*June 2026*
*Authority: L-12-Accomplishments-Management-Architecture.md (LOCKED), Accomplishments-Architecture-Note.md (LOCKED), Legacy-Hub-Wireframe-Spec-L1.md (LOCKED), Profile-Wireframe-Spec-P1.md (LOCKED), Featured-Legacy-Moment-Standards.md (LOCKED), HonorInstance-Architecture-v1.0.md (LOCKED)*
*Status: LOCKED*
