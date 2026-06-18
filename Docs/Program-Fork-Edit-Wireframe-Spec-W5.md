# Forge Legacy — Program Fork/Edit Wireframe Specification
## W-5 | Phase 2B | Version 1.0 — June 2026

**Status:** Locked
**Authority:** Program-Architecture-Amendment-001-Active-Program-Rule.md | W-4 Program Creation Wireframe Specification v1.1
**PRD Authority:** Section 11 (Program System), Section 5 (MVP — W-5), Section 8 (Workout System)

---

## Preamble: What W-5 Is For

W-5 is the program evolution surface. It gives an athlete the ability to modify or duplicate a Future-state program — refining the plan before the commitment begins.

W-5 serves two operations:

**Edit** — in-place modification of an existing Future program. The program record is updated; no new record is created.

**Duplicate** — creation of a new, independent Future program from an existing Future program's structure. The original program is unchanged.

**The core principle:**

A program may evolve. History may not.

Future programs are entirely editable — they have no history yet. Active, Graduated, and Ended Early programs are sealed and cannot be modified through W-5. W-5 modifications never affect workout log records, because no workout logs exist against a Future program.

**W-5 is not:**
A version control system. Athletes must never encounter branches, merge states, version trees, or technical history. The experience must feel like editing a training plan on paper — clear, personal, immediate.

**W-5 is entered from:**
- W-3 Program Detail — Future state overflow (⋯) → "Edit Program" → Edit mode
- W-3 Program Detail — Future state overflow (⋯) → "Duplicate Program" → W-5 opens in Fork mode (ephemeral until saved)

**W-5 navigates to:**
- W-3 Future state of the edited program — on successful Edit save
- W-3 Future state of the new program — on successful Duplicate save
- W-3 Future state of original — on discard (Edit or Duplicate)

---

## Section 1 — W-5 Goals

W-5 exists to accomplish four things:

1. **Enable program refinement before commitment** — athletes iterate on a Future program's design without pressure; the commitment begins at "Start Program," not at creation
2. **Support non-destructive evolution** — Duplicate produces a new program without altering the original, enabling safe exploration of variants
3. **Enforce the data integrity boundary** — W-5 operates only on Future programs; all other states are inaccessible
4. **Share creation language with W-4** — W-5 uses identical form fields and interactions, making editing immediately familiar to any athlete who has used W-4

**What W-5 does NOT do:**
- Modify Active, Graduated, or Ended Early programs in any way
- Provide session-to-session undo history or version logs
- Create live template references in program slots (copy-semantics rule applies equally here)
- Import additional workout data into an existing program (Post-MVP)
- Display or store lineage attribution ("Duplicated From," "Based On")

---

## Section 2 — Architecture Decision Record

The following nine decisions are resolved in this specification and are locked upon approval.

### Decision 1 — State-Based Permissions

**Resolved: W-5 operates exclusively on Future-state programs.**

| Program State | Edit via W-5 | Duplicate via W-5 | Notes |
|--------------|-------------|-------------------|-------|
| **Future** | YES | YES | W-5 is the edit/duplicate surface |
| **Active** | NO | NO | Locked after first workout logged (PRD Section 11) |
| **Graduated** | NO | NO | Sealed record. Use "Run This Program Again" on W-3. |
| **Ended Early** | NO | NO | Sealed record. Use "Restart Program" on W-3. |

**Why Future only:**
Amendment 001 Section 9 states: "Active program cannot be edited (PRD Section 11: locked after first workout)." PRD Section 11 establishes that a program's structure locks after the first workout is logged. A Future program has no logged workouts — its structure belongs entirely to the athlete. An Active program's structure has begun writing history — changing it would rewrite history in progress. Graduated and Ended Early records are immutable by design.

**Detailed permission matrix:**

| Action | Future | Active | Graduated | Ended Early |
|--------|--------|--------|-----------|-------------|
| Edit program name | YES | NO | NO | NO |
| Edit program description | YES | NO | NO | NO |
| Edit duration setting | YES | NO | NO | NO |
| Edit type/focus setting | YES | NO | NO | NO |
| Add workout slot | YES | NO | NO | NO |
| Remove workout slot | YES | NO | NO | NO |
| Reorder workout slots | YES | NO | NO | NO |
| Edit workout slot name | YES | NO | NO | NO |
| Edit workout slot type | YES | NO | NO | NO |
| Duplicate program | YES | NO | NO | NO |

---

### Decision 2 — Edit vs Duplicate

**Resolved: Two distinct overflow entries on W-3 Future state. Edit modifies the existing record in place. Duplicate creates a new independent Future program.**

**Edit:**
- Modifies the existing Future program record
- Same `programId`; same version (v1.0 — unchanged, no bump)
- Entry: W-3 Future overflow → "Edit Program"

**Duplicate:**
- Creates a new independent Future program
- New `programId`; new creation timestamp; version v1.0
- Source program is unchanged
- Name pre-populated as "Copy of [Source Program Name]"
- Entry: W-3 Future overflow → "Duplicate Program" → W-5 opens in Fork mode (in-memory; record not created until "Save Program" is confirmed)
- On "Save Program": new Future program record written; navigate to W-3 Future state of new program
- On discard: no record created; navigate back to W-3 source program

**Why two distinct overflow entries (not a single W-5 flow with mode selection):**
The athlete must know before entering W-5 whether they are modifying their existing program or creating a new one. These have meaningfully different consequences:
- Edit: changes the program the athlete has been planning
- Duplicate: a new program appears in their collection; the original is untouched

Surfacing the distinction at the overflow level avoids a mode-selection screen inside W-5 and prevents the athlete from accidentally editing when they meant to duplicate (or vice versa).

**Duplicate and the free-tier program limit:**
If the athlete has reached the free-tier custom program limit (3 programs), tapping "Duplicate Program" fires M-7 Premium Upsell Sheet. No W-5 form opens; no record is created.

---

### Decision 3 — Ownership Rules

**Resolved: Only athlete-owned Future programs are accessible via W-5.**

| Program Source | Edit (W-5) | Duplicate (W-5) | Notes |
|---------------|-----------|-----------------|-------|
| Athlete-created (W-4) | YES (if Future) | YES (if Future) | Fully editable |
| Imported (W-IM-4) | YES (if Future) | YES (if Future) | Treated identically to athlete-created |
| Duplicated (W-5) | YES (if Future) | YES (if Future) | Duplicate is athlete-owned |
| "Run This Program Again" instance | YES (Future) | YES (Future) | Athlete-owned Future instance from W-3 |
| "Restart Program" instance | YES (Future) | YES (Future) | Athlete-owned Future instance from W-3 |
| Forge Program (system-curated) | NO | NO | System records — not editable |
| "Save to Upcoming" copy of Forge Program | YES | YES | Once saved, it is athlete-owned |

**Forge Program path to W-5:**
1. W-3 Preview → "Save to Upcoming" → creates athlete-owned Future copy
2. W-3 Future → overflow → "Edit Program" → W-5

W-5 sees only the athlete-owned copy. It is unaware the program originated from a Forge Program.

Access control is enforced at W-3: overflow items "Edit Program" and "Duplicate Program" are absent on Preview, Active, Graduated, and Ended Early states. W-5 assumes the incoming program is athlete-owned and Future.

**Server-side enforcement:** W-5 saves must be rejected server-side if the target program is not in Future state or is not owned by the requesting athlete.

---

### Decision 4 — Active Program Protection

**Resolved: Active programs cannot be modified through any W-5 path.**

PRD Section 11 and Amendment 001 Section 9 are clear. W-3 does not surface W-5 access for Active programs — "Edit Program" and "Duplicate Program" are absent from Active state overflow.

**What if an athlete wants a variant of their Active program?**
They have two paths:
1. Continue the Active program. When it Graduates or is Ended Early, "Run This Program Again" or "Restart Program" on W-3 produces a new Future instance editable via W-5.
2. End the Active program (via conflict sheet by starting a new program). The new program can be created via W-4 or derived from any other Future program.

Neither path allows modifying the currently Active program's structure.

**Why no rename-only exception:**
Even renaming an Active program produces an inconsistency mid-history. Workout logs reference the program name at log time; a rename after logging creates a divergence between the log record and the current program name. For MVP: no modifications to Active programs of any kind.

---

### Decision 5 — Fork (Duplicate) Behavior

**Resolved: Duplicate copies all structure and metadata. Name pre-populated as "Copy of [Source Name]." All slot data deeply copied with `originTemplateId` preserved. Record created on save, not on tap.**

**What is copied:**

| Element | Copied | Notes |
|---------|--------|-------|
| Program name | YES | Pre-populated as "Copy of [Source Name]" |
| Program description | YES | Copied as-is |
| Duration chip setting | YES | Copied as-is |
| Type/Focus chip setting | YES | Copied as-is |
| Environment tags (if set) | YES | Copied as-is |
| Workout slots — all | YES | Deep copy; independent records |
| Slot `name` | YES | Copied as-is |
| Slot `type` | YES | Copied as-is |
| Slot `originTemplateId` | YES | Preserved — records template lineage, not fork source lineage |
| Workout slot order | YES | Preserved exactly |

**What is not copied:**

| Element | Reason |
|---------|--------|
| `programId` | New program; new unique ID |
| Created date | New creation timestamp at save |
| Version | New program starts at v1.0 |
| Progress records | Future programs have none |
| Source program reference | No lineage stored at program level (see Decision 6) |

**`originTemplateId` in fork slots:**
Per W-4 Decision 2 and Section 20, item 8: slot `originTemplateId` values are preserved as-is. If Slot A in the source has `originTemplateId: "template-xyz"`, its copy in the fork also has `originTemplateId: "template-xyz"`. Both slots were composed from the same template — the lineage is accurate. `originTemplateId` records template origin, not fork source.

**Record creation timing:**
The fork program record is created only on "Save Program" confirmation — not when the athlete taps "Duplicate Program." W-5 fork mode operates on in-memory state until the athlete confirms save. This eliminates orphaned program records from interrupted sessions.

---

### Decision 6 — Lineage Philosophy

**Resolved: No visible lineage in MVP. No "Duplicated From," "Based On," or equivalent attribution in the athlete-facing UI.**

A program's identity is entirely its own — its name, its workout sequence, and the history the athlete builds with it. Source attribution is a technical detail, not a training detail.

**Why no visible lineage:**
1. **Simplicity Wins:** Lineage UI adds cognitive overhead to athletes who are training, not managing source code.
2. **Identity Over Performance:** The program belongs to the athlete. Where it came from is irrelevant to their legacy.
3. **Complexity cascade:** Lineage trees accumulate edge cases quickly — deleted source programs, multi-generation forks, cross-athlete lineage (post-MVP). MVP is not the time to build this.
4. **Product DNA:** Forge Legacy is explicitly not Git.

**`originTemplateId` is never displayed:**
This data-layer field records which Workout Template a slot was composed from, enabling future environment swapping. It is never surfaced in any athlete-facing UI in any state.

**No program-level source tracking:**
The forked program's record does not store a reference to the source program's `programId`. The fork is independent from the moment it is saved.

**Future:** If lineage display is added post-MVP, the data model can be extended with a `sourceProgramId` field at that time. Existing forks will simply have no lineage data — an acceptable MVP constraint.

---

### Decision 7 — Program Identity

**Resolved: Identity is defined by the program record itself — its name, its workouts, and the history the athlete builds with it — not by its origin.**

A duplicated program that is then heavily modified is its own program. The fact that it came from another program is invisible and irrelevant to Forge Legacy in MVP.

**Identity elements:**
- Program name (primary)
- Workout slot sequence (the training path itself)
- The athlete's accumulated history once the program begins

**Is lineage editable?**
No. Since no lineage is stored or displayed at the program level, there is nothing to edit. The athlete can rename the program and modify any aspect of its structure via W-5 — but this modifies the program's identity, not a separate lineage record.

---

### Decision 8 — Deletion Rules

**Resolved: Deletion is a W-3 operation. W-5 contains no delete action.**

Per Amendment 001 Section 6:

| State | Deletable | Mechanism |
|-------|----------|-----------|
| Future | YES | W-3 Future overflow → "Remove Program" → confirmation → deleted; navigate to W-2 |
| Active | NO | Cannot be deleted; can only be ended via conflict sheet |
| Graduated | NO | Permanent legacy record |
| Ended Early | NO | Permanent legacy record |

W-5 is the editing surface. Deletion is a consequential irreversible action with its own dedicated path on W-3. Placing deletion within an edit flow creates an asymmetric and confusing experience.

---

### Decision 9 — Restart / Run Again Consistency

**Confirmed: "Restart Program" (Ended Early) and "Run This Program Again" (Graduated) are W-3 operations that produce new Future program instances. Both are Amendment 001 compliant. Both produce Future programs editable via W-5.**

| | Restart Program | Run This Program Again |
|-|----------------|----------------------|
| Originating state | Ended Early | Graduated |
| Creates | New Future instance | New Future instance |
| Structure | Same as original | Same as original |
| Version | v1.0 | v1.0 |
| Original record | Unchanged | Unchanged |
| Conflict check at creation | No | No |
| New instance editable via W-5 | YES | YES |

**Distinction from W-5 Duplicate:**
- "Restart Program" and "Run This Program Again" operate on historical (Graduated/Ended Early) records via W-3
- "Duplicate Program" (W-5 path) operates on Future programs
- The result is structurally equivalent: a new Future program with the same workout sequence
- The intent differs: Restart/Run Again = "I want to do this program again"; Duplicate = "I want a variant of this Future plan"

---

## Section 3 — Screen Modes

W-5 has two modes. The form fields and interactions are identical in both modes.

| Mode | Entry | Operates On | Save Outcome | Top App Bar Title |
|------|-------|-------------|--------------|-------------------|
| **Edit** | W-3 Future overflow → "Edit Program" | Existing Future program record | Same record updated | "Edit Program" |
| **Fork** | W-3 Future overflow → "Duplicate Program" | In-memory copy; no DB record until save | New Future program created on save | "New Program" |

In both modes, the athlete sees the same form. The mode distinction is communicated through:
- Top App Bar title ("Edit Program" vs "New Program")
- CTA label ("Save Changes" vs "Save Program")
- Pre-populated name (existing name vs "Copy of [Source Name]")

---

## Section 4 — Information Hierarchy

Identical to W-4. Pre-populated with existing values.

**TIER 1 — Program Identity**
Program name (required). Pre-populated.

**TIER 2 — Program Metadata**
Duration chip, Type/Focus chip. Pre-populated selections.

**TIER 3 — Program Description**
Optional narrative. Pre-populated if one exists.

**TIER 4 — Workout List**
All existing slots, ordered. Add, edit, delete, reorder all available.

**TIER 5 — Save Action**
"Save Changes" (Edit) / "Save Program" (Fork). Enabled only when minimum requirements are met.

---

## Section 5 — Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ✕   [Edit Program | New Program]          [  Save  ]   │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Program Name                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  [Pre-populated program name]                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Duration (Optional)                                    │
│  [4 wks] [6 wks] [8 wks✓] [10 wks] [12 wks] [16 wks]  │  ← Pre-populated selection
│                                                         │
│  Type / Focus (Optional)                                │
│  [Strength✓] [Endurance] [Mobility] [Full Body] [Other] │  ← Pre-populated selection
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Description (Optional)                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  [Pre-populated description]                    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WORKOUTS                              [count]          │
│  ≡  1   [Workout Name]            [Type]           [✕]  │
│  ≡  2   [Workout Name]            [Type]           [✕]  │
│  ≡  3   [Workout Name]            [Type]           [✕]  │
│  ...                                                    │
│                                                         │
│  [  + Add Workout  ]                                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Save Changes  |  Save Program  ]                    │  ← Primary CTA (label by mode)
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:**
- Left: ✕ (discard) — fires discard confirmation if changes exist
- Center: "Edit Program" (Edit mode) / "New Program" (Fork mode)
- Right: "Save" text button — same behavior as primary CTA

---

## Section 6 — Edit Mode Rules

### 6.1 Pre-Population

All fields pre-populated with current program values on W-5 entry. No auto-focus on text fields — the athlete is reviewing an existing program, not starting from scratch. Cursor positioned at end of name field (not selected).

### 6.2 Editable Fields

All fields defined in W-4 Sections 5–10 are fully editable:
- Program name — same 60-character limit and validation
- Duration chip — tap to change selection or deselect
- Type/Focus chip — tap to change selection or deselect
- Description — same 500-character limit
- Workout slots — add, edit, delete, reorder per W-4 Section 9

### 6.3 Non-Editable Fields

| Field | Reason |
|-------|--------|
| Slot `originTemplateId` | Lineage metadata — not displayed, not editable |
| Version number | System-assigned; not displayed in W-5 |
| Created date | System-assigned |
| Program state | Controlled by Amendment 001 state transitions, not W-5 |

### 6.4 Version Behavior on Edit

Version stays at v1.0 after save. No bump occurs. Version bumping is not defined for MVP — a Future program has no history record anchoring the current version, so incrementing it carries no meaning.

### 6.5 Save Behavior (Edit Mode)

On "Save Changes" or "Save" (top bar):
1. Validate: name non-empty, non-whitespace; at least one named workout slot
2. Valid: update program record; navigate to W-3 Future state of the same program
3. Invalid: impossible — CTA is only enabled when requirements are met (preventive validation)

W-5 is removed from the back stack after save. Back from W-3 → W-2.

### 6.6 Discard Confirmation (Edit Mode)

Fires when ✕ is tapped and the athlete has made at least one change:

```
┌──────────────────────────────────────────────────────┐
│  Discard Changes?                                    │
│                                                      │
│  Your changes to [Program Name] won't be saved.      │
│                                                      │
│  [  Discard  ]                                       │  ← Destructive
│  [  Keep Editing  ]                                  │
└──────────────────────────────────────────────────────┘
```

- "Discard": changes lost; navigate to W-3 Future state — original program, unmodified
- "Keep Editing": sheet dismisses; W-5 form preserved with all changes

**No changes made:** ✕ tapped with no changes → W-5 dismisses directly to W-3. No confirmation fires.

Change detection: compare all current field values to original pre-populated values. If identical: no changes. If any difference: changed.

---

## Section 7 — Fork (Duplicate) Mode Rules

### 7.1 Duplicate Entry Flow

On "Duplicate Program" from W-3 Future overflow:

```
Athlete taps "Duplicate Program"
          ↓
System checks: athlete at free-tier program limit?
       ↙                         ↘
      NO                        YES
       ↓                         ↓
W-5 opens in Fork mode     M-7 Premium Upsell Sheet
(in-memory; no DB record)  No W-5 opened; no record created
```

### 7.2 Fork Mode Pre-Population

All fields populated from source program:
- Name: "Copy of [Source Program Name]" — full text selected on auto-focus
- Keyboard opens on Fork mode entry (name field auto-focused; athlete expected to rename)
- All other fields: identical to source
- Workout list: all source slots present in original order

**Why full text selected:**
The athlete's first action in Fork mode is almost always renaming the copy. Full text selection lets them type a new name immediately without manually clearing the field.

### 7.3 Save Behavior (Fork Mode)

On "Save Program" or "Save" (top bar):
1. Validate: name non-empty, non-whitespace; at least one named workout slot
2. Valid: **new Future program record created** with final form values; navigate to W-3 Future state of the new program
3. Source program: unchanged
4. New program appears in W-2 Upcoming

W-5 removed from back stack after save. Back from W-3 (new program) → W-2.

### 7.4 Discard Confirmation (Fork Mode)

Fires whenever ✕ is tapped in Fork mode — including when no changes were made to the defaults:

```
┌──────────────────────────────────────────────────────┐
│  Discard New Program?                                │
│                                                      │
│  Your new program won't be saved.                    │
│                                                      │
│  [  Discard  ]                                       │  ← Destructive
│  [  Keep Editing  ]                                  │
└──────────────────────────────────────────────────────┘
```

- "Discard": no record created; navigate to W-3 Future state of source program (unchanged)
- "Keep Editing": sheet dismisses; W-5 Fork mode preserved

**Why the confirmation always fires in Fork mode (even with no changes):**
The athlete initiated a new program creation flow. Even "no changes" means they were in the middle of creating something. Always confirming discard prevents accidental loss of work on a form the athlete intended to fill out.

This differs from Edit mode, where "no changes" exits without confirmation — the existing program remains exactly as it was.

### 7.5 Copy-Semantics in Fork

Per W-4 Decision 2 — Model C:
- All workout slots are deep-copied — independent data records, no shared slot IDs between source and fork
- `originTemplateId` preserved on each slot (template lineage, not fork lineage)
- Editing a slot in the fork does not modify the source program's slot
- Deleting a slot in the fork does not delete the source program's slot
- No live references exist between fork slots and source slots

Engineering must verify: no slot ID is shared between source and fork after save. This is a required test case.

---

## Section 8 — W-3 Future State Overflow: Required Amendment

W-3 currently specifies two overflow items for Future state:
- "Edit Program" → W-5
- "Remove Program" → confirmation sheet

This spec adds a third item:
- **"Duplicate Program"** → W-5 Fork mode

**Updated W-3 Future state overflow (⋯):**
1. "Edit Program" → W-5 Edit mode
2. "Duplicate Program" → W-5 Fork mode (program limit check first)
3. "Remove Program" → confirmation sheet (Section 5.1 of W-3)

This requires a W-3 v1.2 amendment. The change is additive — no existing behavior is modified.

---

## Section 9 — Navigation

### 9.1 Entry Points

| Entry | Mode | Pre-populated From |
|-------|------|-------------------|
| W-3 Future overflow → "Edit Program" | Edit | Existing Future program |
| W-3 Future overflow → "Duplicate Program" | Fork | In-memory copy of source program |

### 9.2 Exit Points

| Action | Destination |
|--------|------------|
| "Save Changes" (Edit, success) | W-3 Future — same program, updated |
| "Save Program" (Fork, success) | W-3 Future — new program |
| ✕ no changes (Edit mode) | W-3 Future — original program, unchanged |
| ✕ changes → "Discard" (Edit mode) | W-3 Future — original program, unchanged |
| ✕ → "Keep Editing" (either mode) | W-5 remains; all work preserved |
| ✕ → "Discard" (Fork mode) | W-3 Future — source program; no new record created |

### 9.3 Back Stack After Save

W-5 is removed from the back stack in both modes after save. The editing surface is gone; the result persists. Back from W-3 → W-2.

---

## Section 10 — Mobile UX

### 10.1 Screen Type

Navigation stack screen (not modal). ✕ close icon in Top App Bar — not ← back arrow — same convention as W-4. ✕ communicates "this is an edit/creation flow that can be abandoned," not "navigate back."

### 10.2 Keyboard Behavior

- **Edit mode:** Keyboard does NOT auto-open on entry. The athlete is reviewing a pre-populated form. Tapping any text field opens the keyboard for that field.
- **Fork mode:** Keyboard DOES open on entry. Name field is auto-focused; "Copy of [Source Name]" text is fully selected. Renaming is the expected first action.

### 10.3 Scroll Behavior

Single vertical scroll — identical to W-4. Top App Bar is sticky. Form body scrolls. No sticky elements within the form body.

### 10.4 Workout List Interactions

All W-4 workout list interactions apply identically in W-5:
- "+ Add Workout" → same bottom sheet (name required, type optional)
- Tap row → "Edit Workout" sheet, pre-populated
- ✕ icon → delete; last-entry confirmation before removing final slot
- ≡ drag handle → reorder with live number update

### 10.5 Orientation

Portrait only.

### 10.6 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| ✕ Close icon | 44×44dp |
| "Save" top bar text button | 44dp touch height |
| Duration / Type chip | 36dp height, 44dp horizontal padding |
| Workout entry row | Full width × 56dp minimum |
| Drag handle (≡) | 44×44dp touch area |
| Delete icon (✕) on workout row | 44×44dp touch area |
| "+ Add Workout" | Full width × 48dp |
| "Save Changes" / "Save Program" CTA | Full width × 48dp |
| Sheet buttons (Discard, Keep Editing, etc.) | Full width × 52dp |

### 10.7 Accessibility Labels

**Edit mode:**
- Name field: `accessibilityLabel` = "Program name — [current name]"
- "Save" top bar: `accessibilityLabel` = "Save changes to [Program Name]"
- "Save Changes" (enabled): `accessibilityLabel` = "Save changes to [Program Name]"
- "Save Changes" (disabled): `accessibilityLabel` = "Save — add a name and at least one workout to continue"

**Fork mode:**
- Name field: `accessibilityLabel` = "Program name — Copy of [Source Name]"
- "Save" top bar: `accessibilityLabel` = "Save new program"
- "Save Program" (enabled): `accessibilityLabel` = "Save new program"
- "Save Program" (disabled): `accessibilityLabel` = "Save — add a name and at least one workout to continue"

All workout row, chip, and sheet button labels follow W-4 Section 17.8.

---

## Section 11 — Edge Cases

### 11.1 Duplicate at Free-Tier Program Limit

Athlete has 3 custom programs. Taps "Duplicate Program" on W-3 overflow.
→ M-7 Premium Upsell Sheet fires immediately.
→ No W-5 opens. No in-memory copy created.
→ Dismiss M-7: return to W-3 source program, unchanged.

### 11.2 Edit Mode: Name Cleared

Athlete clears the name field entirely.
→ "Save" (top bar) and "Save Changes" (CTA) disable immediately.
→ No error state — preventive validation only.
→ Athlete must re-enter a valid name before saving.

### 11.3 Edit Mode: Last Workout Slot Deleted

Athlete deletes the final remaining workout slot.
→ "Remove Last Workout?" confirmation fires (identical to W-4 Section 9.5).
→ Confirmed: slot removed; Save disables.
→ Athlete must add at least one workout before saving.

### 11.4 Fork Mode: Name Not Changed (Saved as "Copy of...")

Athlete saves fork without changing the name.
→ Valid. Both programs appear in W-2 Upcoming:
   - "[Source Program Name]" (original)
   - "Copy of [Source Program Name]" (fork)
→ Duplicate names are allowed (per W-4 Section 6, no uniqueness enforcement).

### 11.5 Fork Mode: Source Name at 54+ Characters

If the source program name is 54+ characters, "Copy of [Source Name]" exceeds the 60-character limit.
→ Name field pre-populated with "Copy of [Source Name]" truncated to 60 characters.
→ Character counter displays (50+ character rule).
→ Athlete edits as needed.

### 11.6 Fork Mode: ✕ With No Changes Made

Athlete opens Fork mode, makes no changes to the pre-populated form, taps ✕.
→ "Discard New Program?" confirmation fires.
→ "Discard": no record created; navigate to W-3 source program.
→ This differs from Edit mode no-changes behavior (where ✕ exits without confirmation).

### 11.7 App Interruption — Edit Mode

Platform-standard lifecycle. If OS terminates the app: unsaved changes lost. Original program record is unchanged until "Save Changes" is confirmed. No explicit draft recovery.

### 11.8 App Interruption — Fork Mode

If OS terminates the app during Fork mode: no orphaned record (record created on save, not on tap). The athlete's in-memory work is lost. The source program is unaffected. Athlete can restart the duplicate flow from W-3 overflow.

### 11.9 Single-Workout Program in W-5

Valid in both modes. Same rules as W-4: one slot is the minimum. Deleting the only slot triggers the last-entry confirmation.

### 11.10 Very Long Workout List (30+ Slots)

Single scrollable list — no pagination for MVP. "+Add Workout" and the Save CTA remain at the bottom of the scroll below the full list.

---

## Section 12 — Conflicts With Existing Locked Documents

### Amendment 001 — No Conflicts

| Claim | W-5 Status |
|-------|-----------|
| "Active program cannot be edited" | Honored — W-5 inaccessible from Active state |
| "The fork produces a new Future program" | Honored — Duplicate creates a new Future record |
| "W-5 fork/edit operates on programs before any workouts are logged" | Honored — Future state only |
| "History Cannot Be Rewritten" | Honored — sealed states have no W-5 access |

### W-3 — One Additive Amendment Required

W-3 Future state overflow currently lists: "Edit Program" + "Remove Program."

This spec adds: "Duplicate Program" (between "Edit Program" and "Remove Program").

**W-3 Section 5 overflow must be updated to:**
1. "Edit Program" → W-5 Edit mode
2. "Duplicate Program" → W-5 Fork mode (program limit check first)
3. "Remove Program" → confirmation sheet

No existing W-3 behavior is modified. This is a W-3 v1.2 amendment (additive only).

### W-4 — No Conflicts

All nine requirements from W-4 Section 20 are satisfied:

| W-4 Requirement | W-5 Status |
|----------------|-----------|
| Support all W-4 form fields | Honored — all fields present, identical behavior |
| Distinguish Fork from Edit clearly | Honored — two distinct overflow entries, different titles and CTA labels |
| Future state programs only | Honored |
| In-place edit must not bump version | Honored — v1.0 unchanged |
| Fork creates v1.0 | Honored |
| Does not support import | Honored |
| Enforce W-4 minimum requirements on save | Honored |
| Fork copies all slot data including `originTemplateId` | Honored |
| Must never create live template references | Honored — copy-semantics rule applied |

---

## Section 13 — Architecture Risks

### Risk 1 — Copy-Semantics Enforcement in Fork

**Risk:** If fork implementation uses shared slot references rather than deep copies, editing a slot in the fork modifies the source program's slot, violating Model C and "History Cannot Be Rewritten."

**Impact:** High. Violates the core data integrity rule from W-4 Decision 2.

**Mitigation:** Fork must perform a deep copy of all workout slot records. No slot ID shared between source and fork. Engineering must include this as a specific test case: confirm that after fork save, editing any slot in the fork produces no change in the source program's slot data.

---

### Risk 2 — Active State Access Control Bypass

**Risk:** If a UI bug causes "Edit Program" or "Duplicate Program" to appear in W-3 Active state overflow, an Active program could be submitted to W-5 for modification — rewriting history in progress.

**Impact:** High. Would violate Amendment 001 and "History Cannot Be Rewritten."

**Mitigation:** Dual enforcement required.
1. W-3 must not render "Edit Program" or "Duplicate Program" on Active, Graduated, or Ended Early overflow (UI layer).
2. W-5 save endpoint must validate program state server-side and reject if state is not Future (data layer). UI enforcement is not sufficient alone.

---

### Risk 3 — Change Detection Accuracy (Edit Mode)

**Risk:** If the system over-detects changes (treating a form as dirty when no values changed), the discard confirmation fires unnecessarily when the athlete opens Edit mode and immediately taps ✕. If the system under-detects changes, it may allow silent loss of edits.

**Impact:** Low. Either direction is a UX friction issue, not a data integrity issue — the record is unchanged until "Save Changes" is confirmed.

**Mitigation:** Track dirty state by shallow-comparing all field values to original pre-populated values. Implement at the form level, not at the individual keystroke level. A chip deselect and reselect that returns to the original value should not mark the form as dirty.

---

### Risk 4 — Untyped Slot at Execution (Inherited from W-4)

**Risk:** W-5 allows setting or clearing the type on workout slots. An athlete who clears all type tags produces a program with fully untyped slots. When "Start Next Workout" is tapped on W-3 Active state, the execution layer must handle type-less slots. If the active workout flow assumes type is always set, untyped slots produce undefined behavior.

**Impact:** Medium. Inherited from W-4 Risk 1 — the active workout flow specification must explicitly address the no-type case for program-linked execution.

**Mitigation:** W-5 does not introduce new behavior here (W-4 already allows no-type slots). The active workout flow spec is responsible for handling this case. See W-4 Section 21, Risk 1.

---

## Section 14 — Remaining Program Architecture Gaps

The following are outside W-5's scope. Noted for future resolution.

1. **Chapter ↔ Program Archival Decision** — Still unresolved. If an Active Chapter is archived while a program is Active, behavior is undefined. (Amendment 001 Section 10.)

2. **Workout Template Architecture (W-6/W-7)** — Post-MVP. When implemented, W-5 will gain a "Select from Templates" path in the Add/Edit Workout sheet. The slot schema (`originTemplateId?`) already supports this without migration.

3. **Full Environment Architecture** — Post-MVP. Environment-specific workout variants will integrate with W-5's slot editing flow. Current MVP: Environment Tags are program-level metadata (Environment Tags Amendment v1.0).

4. **W-3 v1.2** — "Duplicate Program" must be added to Future state overflow. Low scope — additive amendment to W-3 Section 5 overflow and Section 16.2 exit points table.

---

## Section 15 — Edit vs Duplicate: Decision Architecture

This section is the engineering reference for the two W-5 operations. Use it to determine with certainty: "Should the system UPDATE an existing program record, or CREATE a new one?"

### 15.1 The Governing Rule

The operation type is determined entirely by the athlete's overflow selection on W-3 Future state. It is not determined by the content of the changes — not by how many fields changed, not by how many slots were added or removed.

| Athlete selects | System executes |
|-----------------|----------------|
| "Edit Program" | UPDATE existing record — `programId` unchanged |
| "Duplicate Program" | CREATE new record on "Save Program" confirmation |

Engineers must not compute "is this change significant enough to create a fork?" — the athlete expressed that intent through their overflow choice before W-5 opens. The system executes that intent exactly.

### 15.2 Edit: Field-by-Field Behavior

**Entry path:** W-3 Future overflow → "Edit Program" → W-5 Edit mode → "Save Changes"

| Field | Behavior on save |
|-------|-----------------|
| `programId` | **UNCHANGED** |
| `version` | **UNCHANGED** (v1.0 — no bump) |
| `created` timestamp | **UNCHANGED** |
| Program state | **UNCHANGED** (remains Future) |
| Program name | OVERWRITTEN with form value |
| Description | OVERWRITTEN with form value (cleared if emptied) |
| Duration chip | OVERWRITTEN with new selection (null if deselected) |
| Type/Focus chip | OVERWRITTEN with new selection (null if deselected) |
| Environment tags | OVERWRITTEN with new selection(s) |
| Workout slot list | REPLACED with submitted slot list in submitted order |
| Slot `name` | OVERWRITTEN with form value |
| Slot `type` | OVERWRITTEN with form value (null if cleared) |
| Slot `originTemplateId` | **UNCHANGED** — must not be reset, regenerated, or nulled by the save operation |

**Slot list replacement semantics:** After save, the slot list exactly matches what the athlete submitted — additions included, deletions removed, order preserved. The implementation method (full replacement or slot-level diff) is an implementation choice. The invariant is the result. No surviving slot's `originTemplateId` may be modified.

**Fields absent from the W-5 form (non-editable via any path):** `programId`, `version`, `created` timestamp, program state.

### 15.3 Duplicate (Fork): Field-by-Field Behavior

**Entry path:** W-3 Future overflow → "Duplicate Program" → W-5 Fork mode → "Save Program"

| Field | Behavior on save |
|-------|-----------------|
| `programId` | **GENERATED** — new unique ID |
| `version` | **SET** to v1.0 |
| `created` timestamp | **SET** to save timestamp |
| Program state | **SET** to Future |
| Program name | **SET** to form value (default: "Copy of [Source Name]") |
| Description | COPIED from source; editable in form before save |
| Duration chip | COPIED from source; editable in form before save |
| Type/Focus chip | COPIED from source; editable in form before save |
| Environment tags | COPIED from source; editable in form before save |
| Workout slot list | **DEEP COPIED** — each slot gets a new unique `slotId` |
| Slot `name` | COPIED from source slot |
| Slot `type` | COPIED from source slot |
| Slot `originTemplateId` | COPIED from source slot (records template lineage, not fork lineage) |
| Source program reference | **NOT STORED** — no `sourceProgramId` field at MVP |

**Deep copy requirement:** No `slotId` is shared between source and fork. Required test case before implementation ships: after fork save, modifying or deleting any slot in the fork must produce zero change in the source program's slot list.

**Source program after fork save:** All fields unchanged. State remains Future. Source does not reference the fork — no flag, link, or reference is written to the source record.

### 15.4 Naming Convention (Resolved)

**Adopted: "Copy of [Source Name]"** — pre-populated on fork mode entry, fully editable before save.

| Option | Verdict | Reason |
|--------|---------|--------|
| "Copy of [Source Name]" | ADOPTED | Unambiguous; signals it's a copy; standard convention |
| "[Source Name] v2" | REJECTED | Implies versioning Forge Legacy does not expose to athletes |
| Same name as source | REJECTED | Two identically named programs in W-2 Upcoming — no visual distinction |
| Require rename before entry | REJECTED | Adds friction; athlete sees the full form before deciding a name |

**Implementation:** Name field pre-populated with `"Copy of " + sourceProgramName`. Truncate to 60 characters if total exceeds limit. Full text selected on auto-focus; keyboard opens immediately. At save, the stored name is the athlete's final value — "Copy of [Source Name]" is a default, not a constraint.

### 15.5 Identity Rules

A program's identity is defined by which path was chosen, not by the quantity or significance of changes made.

**Same `programId` (Edit path):** The program retains its identity regardless of how many changes are applied.
**New `programId` (Duplicate path):** A new identity is created when the athlete saves the fork — regardless of how many changes were made.

| Entry path | Changes made | Outcome |
|-----------|-------------|---------|
| "Edit Program" | Reorder workouts | Same program |
| "Edit Program" | Add 5 workouts | Same program |
| "Edit Program" | Change name, duration, all slots | Same program |
| "Edit Program" | Zero changes | Same program (no-op re-save) |
| "Duplicate Program" | Zero changes | New program named "Copy of [Source Name]" |
| "Duplicate Program" | Any changes | New program |

**MVP decision framework — two cases, no third case:**

| Entry path | System must |
|-----------|------------|
| "Edit Program" initiated | UPDATE the existing record |
| "Duplicate Program" initiated | CREATE a new record on save |

There is no implicit fork threshold. There is no "this change is too large to be an edit" rule. There is no third case.

### 15.6 Historical Integrity Enforcement

W-5 Edit and Duplicate are both inaccessible from programs in any state other than Future.

**W-3 access control:**

| Program state | "Edit Program" in overflow | "Duplicate Program" in overflow |
|--------------|--------------------------|-------------------------------|
| Future (athlete-owned) | PRESENT | PRESENT |
| Active | ABSENT | ABSENT |
| Graduated | ABSENT | ABSENT |
| Ended Early | ABSENT | ABSENT |
| Preview (Forge Program) | ABSENT | ABSENT |

"Absent" means the item does not exist at that state — not disabled, not hidden, not present.

**Required server-side validation (W-5 save endpoints):**

1. Target `programId` is owned by the requesting athlete.
2. Program state is Future.
3. (Duplicate only) Athlete has not reached the free-tier program limit.

If any check fails: reject the save with an appropriate error. Do not apply partial changes.

**What cannot be modified through W-5 or any athlete-facing path:**

| Record | Protected by |
|--------|-------------|
| Active program structure | PRD Section 11 + Program Amendment 001 Section 9 |
| Graduated program record | Program Amendment 001 Section 6 |
| Ended Early program record | Program Amendment 001 Section 6 |
| Slot `originTemplateId` | Not displayed or editable on any athlete-facing surface |
| `version` | System-assigned; not athlete-editable |

**Compliance with locked principles:**

| Principle | W-5 enforcement |
|-----------|----------------|
| History Cannot Be Rewritten | W-5 cannot reach Active, Graduated, or Ended Early programs |
| Amendment 001 — Active program not editable | W-3 overflow absent + server-side validation |
| Amendment 001 — Graduated / Ended Early permanent | No W-5 access on sealed records |
| W-4 Copy-Semantics With Origin Tracking | Fork deep-copies all slots; `originTemplateId` preserved; no live references |

---

## Section 16 — Validation Checklist

### Screen Structure
- [ ] Navigation stack screen (not modal)
- [ ] Top App Bar: ✕ icon (not ←) + mode title + "Save" text button
- [ ] Mode title: "Edit Program" (Edit) / "New Program" (Fork)
- [ ] "Save" top bar text button: disabled until minimum requirements met
- [ ] Single vertical scroll — no tabs, no step indicators
- [ ] Tab Bar visible at bottom (Workouts tab active)
- [ ] All fields pre-populated on entry

### State Gating
- [ ] W-5 accessible only from Future state programs via W-3 overflow
- [ ] "Edit Program" and "Duplicate Program" absent from W-3 Active, Graduated, Ended Early, and Preview overflow
- [ ] Server-side: W-5 save rejected if program state is not Future
- [ ] Server-side: W-5 save rejected if program is not athlete-owned

### Edit Mode
- [ ] Mode title: "Edit Program"
- [ ] CTA label: "Save Changes"
- [ ] All fields pre-populated; cursor at end of name field (not selected; keyboard not auto-opened)
- [ ] Name: editable; max 60 characters; non-whitespace required; same validation as W-4
- [ ] Duration chip: pre-selected if set; tap to change or deselect
- [ ] Type/Focus chip: pre-selected if set; tap to change or deselect
- [ ] Description: pre-populated if exists; max 500 characters
- [ ] Workout list: all slots displayed; add/edit/delete/reorder functional (identical to W-4)
- [ ] "Save Changes" and "Save" top bar: disabled if name empty or no named workout entries
- [ ] Save: updates same record; v1.0 unchanged; navigate to W-3 Future state
- [ ] W-5 removed from back stack after save
- [ ] ✕ with no changes: direct dismiss to W-3 — no confirmation
- [ ] ✕ with changes: "Discard Changes?" fires; "Discard" → W-3 unchanged; "Keep Editing" → W-5 preserved

### Fork (Duplicate) Mode
- [ ] Entry: W-3 Future overflow → "Duplicate Program"
- [ ] Program limit check: M-7 fires if at free-tier limit (3 programs); no W-5 opened; no record created
- [ ] If under limit: W-5 opens in Fork mode (in-memory state; no DB record yet)
- [ ] Mode title: "New Program"
- [ ] CTA label: "Save Program"
- [ ] Name: pre-populated as "Copy of [Source Name]"; full text selected; keyboard opens
- [ ] All other fields: pre-populated from source
- [ ] All workout slots from source present in original order
- [ ] Save: creates new Future program record with form values; navigate to W-3 Future (new program)
- [ ] Source program: unchanged after fork save
- [ ] New program appears in W-2 Upcoming
- [ ] W-5 removed from back stack after save
- [ ] ✕ in fork mode: "Discard New Program?" confirmation ALWAYS fires (even if no changes made)
- [ ] "Discard" in fork mode: no record created; navigate to W-3 source program
- [ ] "Keep Editing": W-5 Fork mode preserved

### Copy-Semantics (Fork Save)
- [ ] All workout slots deeply copied — no shared slot IDs between source and fork
- [ ] Slot `originTemplateId` preserved as-is on each copied slot
- [ ] After fork save: editing a slot in the fork produces no change in source program's slot
- [ ] After fork save: deleting a slot in the fork does not delete source program's slot
- [ ] No live template references in fork slots

### Workout List (Both Modes)
- [ ] "+Add Workout": same bottom sheet as W-4; name required, type optional; appended to list
- [ ] Tap row: "Edit Workout" sheet, pre-populated; "Save" label (not "Add")
- [ ] Delete ✕: removes immediately; last-entry confirmation before removing final slot
- [ ] Reorder: drag handle; row numbers update live during drag

### Minimum Requirements (Identical to W-4)
- [ ] Program name: non-empty, non-whitespace, max 60 characters
- [ ] Workout list: at least 1 entry with non-empty, non-whitespace name
- [ ] Save CTA disabled until both requirements met
- [ ] No reactive error states — preventive validation only

### Ownership
- [ ] Edit and Duplicate available only for athlete-owned programs
- [ ] Imported programs (W-IM-4): editable via W-5 when Future — treated identically to athlete-created
- [ ] "Restart Program" and "Run This Program Again" Future instances: editable via W-5
- [ ] Forge Programs: no W-5 access; path is W-3 Preview → "Save to Upcoming" → edit copy via W-5

### Version Behavior
- [ ] Edit mode: v1.0 preserved after save — no bump
- [ ] Fork mode: new program at v1.0
- [ ] Version not displayed in W-5 (either mode)

### Navigation
- [ ] Entry from W-3 Future overflow → "Edit Program" → Edit mode
- [ ] Entry from W-3 Future overflow → "Duplicate Program" → Fork mode
- [ ] Edit save → W-3 Future (same program, updated)
- [ ] Fork save → W-3 Future (new program)
- [ ] Edit discard → W-3 Future (original, unchanged)
- [ ] Fork discard → W-3 Future (source, unchanged); no new record
- [ ] Back from W-3 post-save → W-2

### W-3 Amendment
- [ ] W-3 Section 5 Future overflow updated to include "Duplicate Program" (between "Edit Program" and "Remove Program")
- [ ] W-3 Section 16.2 exit points table updated to include "Duplicate Program" → W-5 Fork mode entry

### Mobile UX
- [ ] ✕ close icon (not ←) in top bar
- [ ] Edit mode: keyboard does NOT auto-open
- [ ] Fork mode: keyboard opens; name field auto-focused; full name text selected
- [ ] All tap targets meet minimums (Section 10.6)
- [ ] Portrait orientation only
- [ ] Accessibility labels per Section 10.7

### Architecture Risks
- [ ] Engineering confirms: fork performs deep slot copy — no shared slot IDs
- [ ] Engineering confirms: server-side state validation rejects non-Future programs
- [ ] Change detection: dirty state tracked by value comparison, not keystroke count
- [ ] Untyped slot handling: active workout flow specification addresses no-type case (W-4 Risk 1)

---

## Section 17 — Lock Recommendation

**W-5 Program Fork/Edit Wireframe Specification v1.0 is ready for lock.**

The specification:
- Resolves all 9 required architecture decisions
- Satisfies all 9 requirements from W-4 Section 20 (the W-5 dependency brief)
- Creates no conflicts with Amendment 001, W-3, or W-4
- Identifies one required additive amendment to W-3 (add "Duplicate Program" to Future state overflow — low scope)
- Enforces "History Cannot Be Rewritten" at the access control layer (Future state only) and at the data layer (copy-semantics, deep slot copy, record created on save not on tap)
- Keeps the athlete experience simple: two clearly labeled actions in W-3 overflow; editing a training plan, not managing source code
- Documents 4 architecture risks with mitigations; all are addressable at implementation time
- Defines the Edit vs Duplicate decision framework in Section 15 with zero ambiguity — engineers determine UPDATE vs CREATE from entry path alone; no content-based threshold exists

**Prerequisites before implementation can begin:**
1. W-5 specification lock (this document)
2. W-3 v1.2 amendment — "Duplicate Program" added to Future state overflow (additive; low scope)
3. Engineering confirmation: fork implementation performs deep slot copy — no shared slot IDs between source and fork
4. Engineering confirmation: server-side state validation rejects W-5 saves for non-Future or non-athlete-owned programs
5. Active workout flow specification — must address untyped slot at execution (Risk 4 / inherited from W-4 Risk 1)

---

*Forge Legacy Program Fork/Edit Wireframe Specification — W-5*
*v1.0 — June 2026*
*Authority: Program-Architecture-Amendment-001-Active-Program-Rule.md | W-4 v1.1*
*PRD: Section 11 (Program System), Section 5 (MVP), Section 8 (Workout System)*

---

## Change Log

### v1.0 — June 2026

Initial specification. W-5 created as part of Phase 2B wireframe documentation. Nine required architecture decisions resolved: Future-state-only access (Edit and Duplicate); two distinct overflow entries on W-3 (Edit in-place vs Duplicate for new program); athlete-owned programs only; Active program protection (no modifications via any W-5 path); fork deep-copies all slot data with `originTemplateId` preserved and record created on save; no visible lineage in MVP; program identity defined by record not origin; deletion is a W-3 operation not a W-5 operation; Restart Program and Run This Program Again confirmed consistent and compliant with Amendment 001. All nine W-4 Section 20 dependency requirements satisfied. One additive W-3 amendment required: "Duplicate Program" added to Future state overflow. Four architecture risks documented. Lock recommendation: ready.
