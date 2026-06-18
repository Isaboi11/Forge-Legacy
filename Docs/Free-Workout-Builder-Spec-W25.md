# Forge Legacy — Free Workout Builder
## W-25 Behavioral Specification
### Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise-Library-Architecture-v1.0.md (EL-D5, EL-D10), Workout-Builder-Wireframe-Spec-W24.md (WS-A5), Active-Workout-Flow-Spec-W9-W16.md, ExercisePrescription-Amendment-001.md (EP-A1)
**Downstream impact:** W-17 (Save as Template CTA), W-26 (Templates Hub entry point), W-27 (Duplicate and Edit entry points), Exercise-Library-Architecture-v1.0.md (WorkoutTemplate entity update)
**R1 refinements applied:** ExercisePrescription fields governed by EP-A1 (R1), dual-condition save eligibility (R2), weight unit locked to athlete preference (R3)

---

## Context

Forge Legacy's Exercise Library Architecture (locked June 2026) established `WorkoutTemplate` as a first-class entity (EL-D5) parallel to `ProgramSlot`. That architecture defines three free workout entry paths — one of which requires templates (EL-D10). W-25 is the screen where those templates are created and edited.

W-25 was explicitly called out as a new screen (not W-24 reuse, per EL-D10) to decouple template building from program-slot building. The W-24 spec (Program Workout Builder) is the structural sibling — same section-first model, same exercise management patterns, different target entity.

---

## Section 1 — Screen Purpose

### 1.1 What W-25 Is

W-25 is the **Workout Template Builder**. It is the primary surface where athletes create and edit `WorkoutTemplate` records — reusable workout structures that can be launched as free workouts from W-26 (Templates Hub).

W-25 produces a `WorkoutTemplate` entity. It does not produce a `WorkoutSession`. It does not produce a `ProgramSlot`. These are distinct entities.

### 1.2 What W-25 Is Not

W-25 is not a workout logging screen. No session is created when W-25 is open. No timer runs. No sets are logged. No performance data is recorded. W-25 is purely a planning and authoring tool.

W-25 is not a program builder. ProgramSlot authoring belongs to W-24. A template is not a slot, and W-25 does not accept a `programId` or `slotIndex` context parameter.

### 1.3 Relationship to W-24

W-24 (Program Workout Builder) and W-25 share the same section-first architecture (WS-A5), the same exercise management patterns (add, remove, reorder, duplicate, cross-section move), and the same prescription editing model (ExercisePrescription, as extended by EP-A1). They share UI component implementations.

The distinction is the target entity:
- **W-24** writes to `ProgramSlot.sections[]` and requires `programId` + `slotIndex` context
- **W-25** writes to `WorkoutTemplate.sections[]` and requires only `templateId` (edit) or no ID (create)

W-25 also adds a **template name field** and **activity type selector** that do not exist in W-24 (where the program provides name and the slot inherits context).

### 1.4 Relationship to WorkoutTemplate

Every successful save from W-25 produces or updates exactly one `WorkoutTemplate` record. The relationship is 1:1. W-25 never creates partial templates or fragments. A template either saves completely or not at all (transactional write).

```
WorkoutTemplate {
  id:           uuid
  athleteId:    uuid
  name:         string               // max 60 chars; required for save
  activityType: ActivityType | null  // optional; affects prescription display
  weightUnit:   'lbs' | 'kg'        // snapshot of athlete's global unit preference at creation time; not user-configurable per template (see W25-D2)
  sections:     WorkoutSection[]     // section-first model per WS-A5
  createdAt:    timestamp
  updatedAt:    timestamp
  lastUsedAt:   timestamp | null
  useCount:     number
}
```

---

## Section 2 — Entry Paths

W-25 accepts a context object at launch time that determines initial state:

```
W25LaunchContext {
  mode:              'CREATE_NEW' | 'DUPLICATE' | 'SAVE_AS_TEMPLATE' | 'EDIT'
  sourceTemplateId:  uuid | null   // for DUPLICATE and EDIT
  sourceSessionId:   uuid | null   // for SAVE_AS_TEMPLATE
}
```

### 2.1 CREATE_NEW — From W-26 (Templates Hub)

**Entry path:** W-26 → "New Template" CTA → W-25

**Context:** `{ mode: 'CREATE_NEW', sourceTemplateId: null, sourceSessionId: null }`

**Initial state:**
- Template name field: empty, focused immediately on load (keyboard opens automatically)
- Activity type: unset (null)
- Sections: one empty MAIN section
- Weight unit: athlete's global unit preference (set in Profile; defaults to 'lbs' if not configured)
- WARM_UP and COOL_DOWN: absent

**Header:** Back (← icon, no label) | centered name field with placeholder "Name your workout" | "Save" (disabled — name empty and MAIN empty)

**Behavior on entry:** Keyboard opens immediately over name field. Athlete names the template first, then builds the exercise list. A named template communicates intent; a nameless template is a draft artifact.

### 2.2 DUPLICATE — From W-27 (Template Detail)

**Entry path:** W-27 → overflow "Duplicate" → W-25

**Context:** `{ mode: 'DUPLICATE', sourceTemplateId: uuid, sourceSessionId: null }`

**Initial state:**
- Template name: "[Source Template Name] (Copy)" — pre-filled, not focused (keyboard does not auto-open)
- Activity type: copied from source template
- Weight unit: copied from source template (preserves the unit the source template was authored in)
- Sections: deep copy of all source template sections, including all exercises and all prescription values
- useCount: 0 (not inherited from source)
- lastUsedAt: null (not inherited)

**Behavior:** W-25 opens in an immediately usable state. The athlete sees the full copied exercise list. They may rename and edit before saving. A DUPLICATE context always creates a **new** `WorkoutTemplate` entity — it does not modify the source.

**Header:** Back (← icon) | name field pre-filled with "(Copy)" name | "Save" (enabled — name present and exercises present)

### 2.3 SAVE_AS_TEMPLATE — From W-17 (Workout Summary)

**Entry path:** W-17 → "Save as Template" secondary CTA → W-25

**Context:** `{ mode: 'SAVE_AS_TEMPLATE', sourceTemplateId: null, sourceSessionId: uuid }`

**Initial state:**
- Template name: "[Activity Type display name] Workout" as default (e.g., "Strength Workout") — pre-filled but auto-selected so athlete can immediately overtype
- Activity type: populated from the session's `activityType`
- Weight unit: athlete's global unit preference at the time W-25 opens
- Sections: derived from the session's `WorkoutSession.sections[]`, using **planned `ExercisePrescription` values** (the reference prescription values set before logging), not the logged `ExerciseLog` values. Per Exercise Library Architecture § 9.2.
- Per-exercise notes: NOT carried over (session notes are per-session; template notes are planning notes for future use)

**Behavior:** Athlete arrives on W-25 with a template that structurally matches what they just completed. They rename it and save. This is the fastest path to a reusable template because the hardest part — building the exercise list — is already done.

**Important:** If the session was a completely blank workout (PATH A — no template, no carry-forward structure), the prescriptions from the session represent whatever targets the athlete entered during W-9. These carry into the template as reference values.

**Header:** Back (← icon) | name field pre-filled and auto-selected | "Save" (enabled — name present and exercises derived from session)

### 2.4 EDIT — From W-27 (Template Detail)

**Entry path:** W-27 → "Edit" → W-25

**Context:** `{ mode: 'EDIT', sourceTemplateId: uuid, sourceSessionId: null }`

**Initial state:**
- Template name: existing name, in name field
- Activity type: existing value
- Weight unit: existing value from template record (the unit it was originally authored in)
- Sections: all sections and exercises loaded from existing `WorkoutTemplate`
- The template entity already exists; Save writes changes back to the same ID

**Behavior:** Athlete edits an existing template. Changes are tracked in local app state. Saving commits changes to the existing `WorkoutTemplate` record (updates `updatedAt`). Per EL-D6, template edits do **not** retroactively modify sessions that were previously launched from this template.

**Header:** Back (← icon) | name field with existing name | "Save" (state depends on MAIN exercise count — enabled if MAIN has ≥ 1 exercise)

---

## Section 3 — Layout Architecture

### 3.1 Screen Structure

```
┌─────────────────────────────────────────────┐
│ HEADER                                      │
│ [←]  [Template Name Field ············]  [Save] │
├─────────────────────────────────────────────┤
│ METADATA ROW                                │
│ [Activity Type ▾]                           │
├─────────────────────────────────────────────┤
│ SCROLL AREA                                 │
│                                             │
│ ── WARM-UP ──────────────────────── [⋯]    │  ← absent until created
│  [Exercise Row]                             │
│  [Exercise Row]                             │
│  [+ Add to Warm-Up]                         │
│                                             │
│ ── MAIN WORKOUT ─────────────────── [⋯]    │  ← always present
│  [Exercise Row]                             │
│  [Exercise Row]                             │
│  [+ Add Exercise]                           │
│                                             │
│ ── COOL-DOWN ────────────────────── [⋯]    │  ← absent until created
│  [Exercise Row]                             │
│  [+ Add to Cool-Down]                       │
│                                             │
│ [+ Add Warm-Up]  [+ Add Cool-Down]         │  ← only shown for absent sections
│                                             │
├─────────────────────────────────────────────┤
│ BOTTOM ACTION (EDIT mode only)              │
│ [Delete Template]                           │
└─────────────────────────────────────────────┘
```

### 3.2 Header

The header is fixed (does not scroll). It contains three elements:

**Back control (left):** Icon-only back arrow. Triggers unsaved-changes flow (see Section 9).

**Template Name Field (center):** Inline editable text field.
- Placeholder: "Name your workout" (when empty)
- Max 60 characters
- Font: primary weight, 17sp — matches template name prominence in W-26/W-27
- No external label ("Name" label not shown — the field is self-evident in context)
- Tapping focuses field; keyboard appears

**Save button (right):**
- Disabled state: when name is empty OR MAIN section has no exercises
- Enabled state: name is present AND MAIN section has at least one exercise
- Label: "Save" (same for all modes)
- Tapping triggers save flow (see Section 9.2)

### 3.3 Metadata Row

Below the header, a single-row metadata bar with one control:

**Activity Type Selector:**
- Tapping opens a bottom sheet with all 9 ActivityType options (STRENGTH, RUN, WALK, BIKE, SWIM, HIIT, MOBILITY, YOGA, OTHER)
- Current selection shown as display label with dropdown chevron
- Default state: "Activity Type" as placeholder label (no type selected)
- Selecting an activity type affects prescription field display (see Section 5)
- Activity type can be changed at any time; changing it applies new prescription display rules to ALL exercises in the template

**Weight unit:** There is no per-template weight unit toggle in W-25. Weight unit is the athlete's global unit preference (set in Profile) and is applied consistently across all templates. The unit label adjacent to each weight field is static display — it reflects the template's creation-time snapshot. Athletes who need to change their unit preference do so in Profile settings, not within the template builder. See W25-D2.

### 3.4 Section Containers

Each section (WARM_UP, MAIN, COOL_DOWN) renders as:

```
── [SECTION LABEL] ──────────────────── [⋯]
[Exercise Row 1]
[Exercise Row 2]
[+ Add to [Section]]
```

**Section label:** All-caps compact divider. "WARM-UP", "MAIN WORKOUT", "COOL-DOWN". Secondary muted text. Not tappable.

**Section overflow (⋯):** Three-dot overflow icon on the section header. Opens a menu:
- For WARM_UP and COOL_DOWN: "Remove [Warm-Up / Cool-Down]" — with confirmation if exercises are present
- For MAIN: no remove option (MAIN cannot be removed)

**Add exercise within section:** "[+ Add Exercise]" affordance at the bottom of each section's exercise list. Opens W-23 (Exercise Picker) with the section context pre-set.

### 3.5 Exercise Rows

Each exercise within a section renders as an exercise card:

```
┌────────────────────────────────────────────┐
│ [≡] [Thumb]  [Exercise Name]    [⋯ more]  │  ← drag handle, thumbnail, name, overflow
│                                            │
│  Sets   Reps    Weight          Rest       │
│  [  ]   [  ]   [      ] lbs    [  ] s     │
│                                            │
│  [Notes: Add a note for this exercise...]  │
└────────────────────────────────────────────┘
```

**Drag handle (≡):** Left edge. Initiates drag-to-reorder within the section (see Section 4).

**Thumbnail:** Static exercise GIF thumbnail, 44×44pt. Tapping opens W-22 (Exercise Detail) in a modal sheet — read-only reference, does not navigate away from W-25.

**Exercise Name:** Primary text, 16sp. Tapping opens W-22 modal sheet.

**Overflow (⋯):** Top-right of card. Options: "Duplicate", "Move to Warm-Up" (if WARM_UP exists), "Move to Cool-Down" (if COOL_DOWN exists), "Remove Exercise".

**Prescription fields:** See Section 5.

**Notes field:** Tappable text area below prescription fields. Placeholder: "Add a note for this exercise..." Max 200 characters. Expands on tap. Collapses when empty and not focused.

### 3.6 Section Add Affordances

When WARM_UP or COOL_DOWN is absent, a footer affordance row appears after the last section:

```
[+ Add Warm-Up]     [+ Add Cool-Down]
```

Only shows affordances for absent sections. If both are absent, both buttons show. If WARM_UP is present but COOL_DOWN is absent, only "[+ Add Cool-Down]" shows.

Tapping "Add Warm-Up" or "Add Cool-Down" creates the section (empty) and renders it in the correct position. An empty created section shows:

```
── WARM-UP ─────────────────────────── [⋯]
No exercises added. Tap below to add.
[+ Add to Warm-Up]
```

### 3.7 Bottom Action Area

Visible only in EDIT mode. Fixed at the screen bottom (above system nav bar), not scrolling.

**Delete Template:** Destructive-style text button. Tapping triggers delete confirmation (see Section 9.4).

Not shown in CREATE_NEW, DUPLICATE, or SAVE_AS_TEMPLATE modes (those modes have not yet committed the entity; there is nothing to delete).

---

## Section 4 — Exercise Management

### 4.1 Add Exercise

**Trigger:** Athlete taps "[+ Add Exercise]", "[+ Add to Warm-Up]", or "[+ Add to Cool-Down]" within any section.

**Behavior:** Opens W-23 (Exercise Picker) as a full-screen modal. W-23 receives the section context (`WARM_UP` | `MAIN` | `COOL_DOWN`) so the selected exercise is appended to the correct section.

W-23 filters the exercise catalog by activityType context when applicable (MOBILITY/YOGA templates → W-23 filters to MOBILITY/YOGA-appropriate movement patterns per the EL-D3 context filter rule).

**On selection in W-23:** W-23 dismisses; the selected exercise is appended to the end of the target section as a new exercise card with all prescription fields null. Position number (order) is assigned as the next integer within that section (1-based per-section numbering per WS-A5).

**Multiple add:** Athlete may add multiple exercises per W-23 session if W-23 supports multi-select. If W-23 is single-select, athlete returns to W-25 between each add.

### 4.2 Remove Exercise

**Trigger — Swipe left on exercise card:** Reveals a "Remove" destructive action. Confirming removes the exercise from the section. No second confirmation (the swipe is intentional; removal is reversible via re-adding).

**Trigger — Overflow (⋯) → "Remove Exercise":** Same outcome. Shown in overflow for discoverability.

**On remove:** Exercise card animates out. Remaining exercises in the section reindex (order values recalculated). If removing the last exercise from MAIN, MAIN becomes empty (empty state renders; Save disables if name was the only other satisfied condition). Empty WARM_UP or COOL_DOWN sections remain — their persistence is independent of exercise count.

### 4.3 Reorder Exercise

**Trigger:** Long-press on the drag handle (≡) initiates drag mode. Exercise card lifts (shadow elevation). Athlete drags up or down within the section.

**Constraint:** Drag operates **within a single section only**. Exercises cannot be dragged past a section boundary. The section header acts as a hard stop.

**On drop:** Exercises in the section re-order around the dropped card. Order values recalculated for all exercises in the section.

**Cross-section move:** Via overflow (⋯) → "Move to Warm-Up" / "Move to Cool-Down" / "Move to Main Workout". Options shown only for sections that exist. Moving an exercise appends it to the end of the target section with a new order value. The source section recalculates order after removal.

### 4.4 Duplicate Exercise

**Trigger:** Overflow (⋯) → "Duplicate"

**Behavior:** Creates a copy of the exercise card immediately below the original, within the same section. The copy inherits all prescription field values from the original (sets, reps/duration, weight, rest, distance, notes). The copy's order is the original's order + 1; all subsequent exercises in the section shift down.

---

## Section 5 — Prescription Editing

Each exercise card shows prescription fields. The fields displayed depend on the template's `activityType`.

### 5.1 ExercisePrescription Schema

The ExercisePrescription schema — including the EP-A1 additions (`restSeconds`, `distanceValue`, `distanceUnit`) — is governed by **ExercisePrescription-Amendment-001 (EP-A1)**. W-25 displays these fields per the display rules in Section 5.2 of this document. The canonical schema is:

```
ExercisePrescription {
  exerciseId:       string              // references ExerciseDefinition.id
  order:            number              // 1-based, per-section (WS-A5)
  sets:             number | null
  reps:             number | null       // mutually exclusive with durationSeconds
  durationSeconds:  number | null       // mutually exclusive with reps
  weightValue:      number | null
  weightUnit:       'lbs' | 'kg' | null // present for context; template-level unit governs display (W25-D2)
  distanceValue:    number | null       // EP-A1
  distanceUnit:     'm' | 'km' | 'mi' | null  // EP-A1; per-exercise
  restSeconds:      number | null       // EP-A1; reference value only
  notes:            string | null       // max 200 chars
}
```

### 5.2 Field Display Rules by Activity Type

| Field | STRENGTH / HIIT / OTHER | MOBILITY / YOGA | RUN / WALK / BIKE / SWIM |
|---|---|---|---|
| Sets | Shown | Hidden | Hidden |
| Reps | Shown | Hidden | Hidden |
| Duration | Hidden | Shown (replaces Reps) | Shown |
| Distance | Shown (optional per exercise) | Hidden | Shown |
| Weight | Shown | Hidden | Hidden |
| Rest | Shown | Shown | Hidden |
| Notes | Shown | Shown | Shown |

**Note on activityType null:** When no activity type is selected, prescription display defaults to STRENGTH rules (sets, reps, weight, rest, distance, notes visible). This is the most common template type and the most complete prescription set.

**Note on RUN/WALK/BIKE/SWIM templates:** These activity types do not use exercise lists in active logging (W-10 through W-13 are timer-based). However, interval training templates (e.g., "8 × 400m repeats with 90s rest") are valid W-25 use cases. Distance + duration + rest fields support them. Sets functions as an interval counter in this context.

### 5.3 Field Interaction Details

**Sets:** Numeric input. Tap opens a numeric keypad or stepper. Value: positive integer 1–99, or null. Display: "—" when null.

**Reps:** Numeric input. Same interaction as Sets. Value: positive integer 1–999, or null. Display: "—" when null.

**Duration:** Time input. Tap opens a time picker (mm:ss) or seconds input. Label: "Duration". Value stored as `durationSeconds`. Display: "1:30" for values ≥ 60s; "45s" for values < 60s. Null displays "—".

**Weight:** Numeric input with one decimal precision. Adjacent unit label shows 'lbs' or 'kg' from the template's `weightUnit` (static — not a toggle). Value: positive number, or null. Display: "—" when null.

**Distance:** Numeric input with one decimal precision. Adjacent per-exercise unit selector (m / km / mi). Value: positive number, or null. Display: "—" when null. Unit is per-exercise per EPA1-D1.

**Rest:** Time input. Same format as Duration. Value stored as `restSeconds`. Label: "Rest". Reference value — W-9 count-up timer is not constrained by it. Display: "1:30" / "45s" / "—".

**Notes:** Tappable text area, single-line collapsed. Expands on tap to multi-line. Keyboard pushes content up. Max 200 characters (character count shown when focused). Collapses when dismissed with no content.

### 5.4 Prescription Optional Rule

All prescription fields are optional. An exercise card with all fields null is valid — the exercise exists as a structural placeholder. A template where all prescriptions are null is still a valid template as long as name and MAIN section exercise count satisfy Section 8 conditions.

---

## Section 6 — Section Management

### 6.1 MAIN Section

MAIN section always exists. It is initialized when W-25 launches for all modes. It cannot be removed via any UI interaction.

**Empty state — name absent:**
```
── MAIN WORKOUT ─────────────────────── [⋯]
Start adding exercises to build your workout.
[+ Add Exercise]
```

**Empty state — name present (contextual save hint):**
```
── MAIN WORKOUT ─────────────────────── [⋯]
Add at least one exercise to save your template.
[+ Add Exercise]
```

The contextual hint appears when the athlete has entered a name but MAIN remains empty. It explains the disabled Save button without requiring a failed tap (per R2 decision). The hint disappears when the first exercise is added.

**MAIN section overflow (⋯):** No "Remove" option. The overflow icon may be omitted for MAIN if there are no applicable overflow actions in MVP.

### 6.2 WARM_UP Section

WARM_UP is absent by default. Created when athlete taps "[+ Add Warm-Up]."

**Creation:** Adds a WARM_UP section above MAIN. Section renders immediately with empty state:
```
── WARM-UP ──────────────────────────── [⋯]
No exercises added. Tap below to add.
[+ Add to Warm-Up]
```

**Removal:** Via section overflow (⋯) → "Remove Warm-Up."
- If WARM_UP has exercises: confirmation "Remove Warm-Up and its [N] exercise(s)?" with "Remove" (destructive) and "Cancel."
- If WARM_UP is empty: removes immediately, no confirmation.

On removal: section and all its exercises are deleted. Exercises are not migrated to MAIN.

### 6.3 COOL_DOWN Section

Same rules as WARM_UP, applied to COOL_DOWN. Created below MAIN. Removed via overflow.

### 6.4 Section Rendering Order

Fixed: WARM_UP → MAIN → COOL_DOWN. Not configurable per WS-A5.

---

## Section 7 — Draft Persistence

### 7.1 Local Draft Persistence

W-25 writes the current builder state to **local device storage** on every meaningful change:
- Exercise added or removed
- Exercise reordered
- Section created or deleted
- Any prescription field value changed
- Template name changed
- Activity type changed

This is crash recovery, not template storage. Drafts are not visible in W-26 — they are recovery artifacts only.

**What a draft contains:** All current builder state — name (even if empty), activity type, weight unit snapshot, all sections and exercises with all prescription values.

**Draft keying:**
- CREATE_NEW: `draft_new`
- DUPLICATE: `draft_duplicate_{sourceTemplateId}`
- SAVE_AS_TEMPLATE: `draft_save_as_{sourceSessionId}`
- EDIT: `draft_edit_{sourceTemplateId}`

One draft per key. Opening the same key replaces the previous draft.

### 7.2 Unsaved State Definition

A W-25 session has **unsaved changes** when local state differs from the last committed `WorkoutTemplate` record.

- **CREATE_NEW, DUPLICATE, SAVE_AS_TEMPLATE:** Always have unsaved changes from the moment any edit occurs (the entity does not yet exist in storage).
- **EDIT:** Has unsaved changes after any modification not yet committed via Save.

### 7.3 Draft Recovery

When the app launches and a W-25 draft is detected for the current athlete, the athlete must be offered the ability to resume or discard it. Exact recovery UX is implementation-level. Recovery is triggered by: app crash during W-25, app backgrounded and evicted, or explicit back navigation before saving.

### 7.4 Explicit Save vs. Draft

The draft is distinct from a saved template. The athlete **explicitly saves** via the "Save" button. Saving:
1. Validates (Section 8) — at save time, conditions must still be met
2. Writes to `WorkoutTemplate` store (API call)
3. On success: dismisses W-25, navigates to calling context, clears local draft
4. On API failure: remains on W-25 with transient error banner; draft preserved

---

## Section 8 — Validation Rules

### 8.1 Save Eligibility — Dual Condition

Save is enabled (button active) only when **both** conditions are satisfied simultaneously:

1. **Name is present:** `name` field is not empty and not whitespace-only. At least 1 character after trimming.
2. **MAIN section has at least one exercise:** `MAIN.exercises.length >= 1`

Save re-evaluates reactively on every name keystroke and exercise add/remove. The button state is always accurate — there are no cases where Save is enabled but the action would fail.

### 8.2 Save Button State by Condition

| Name | MAIN exercises | Save button |
|---|---|---|
| Empty | 0 | Disabled |
| Empty | ≥ 1 | Disabled |
| Present | 0 | Disabled (contextual hint shown in MAIN empty state) |
| Present | ≥ 1 | **Enabled** |

### 8.3 Empty Optional Sections

WARM_UP or COOL_DOWN may be present with zero exercises. This is valid and does not block save. Empty optional sections are created intentionally. No warning at save time.

In active workout execution (W-9), sections with no exercises are absent from the rendered list per WS-A5 section rendering rule — the athlete's empty optional section has no runtime footprint.

### 8.4 Prescription Validation

All prescription fields are optional. No blocking validation for unset fields. Numeric range validation:
- Values must be positive if set (no 0 or negative values)
- Weight and distance allow decimals; sets and reps are integers

No cross-field requirements (e.g., no rule that "reps must be set if weight is set").

---

## Section 9 — Navigation

### 9.1 Back Button Behavior

| Mode | No changes made | Changes made, not saved |
|---|---|---|
| CREATE_NEW | Dismiss — no confirmation (nothing to lose: name empty, MAIN empty) | "Discard workout?" → "Discard" (destructive) / "Keep Editing" |
| DUPLICATE | Dismiss — no confirmation (source unchanged) | "Discard template?" → "Discard" / "Keep Editing" |
| SAVE_AS_TEMPLATE | Dismiss — return to W-17 | "Discard template?" → "Discard" / "Keep Editing" |
| EDIT | Dismiss — return to W-27 | "Discard changes?" → "Discard Changes" (destructive) / "Keep Editing" |

**"No changes made" for CREATE_NEW:** Name is empty AND no exercises added. A typed name with no exercises, or exercises with no name — there ARE changes.

**On "Discard":** Local draft for this key is cleared. Navigation dismisses.
**On "Keep Editing":** Dialog dismisses; W-25 state unchanged.

### 9.2 Save Behavior

1. Athlete taps "Save" (only reachable when enabled — dual condition satisfied)
2. Write to `WorkoutTemplate` store:
   - CREATE_NEW, DUPLICATE, SAVE_AS_TEMPLATE: creates new `WorkoutTemplate`
   - EDIT: updates existing record (updates `updatedAt`; does not modify `createdAt`, `useCount`, `lastUsedAt`)
3. On success: dismiss W-25, navigate to calling context:
   - From W-26 (CREATE_NEW): return to W-26 — new template appears in list
   - From W-27 (DUPLICATE): return to W-27 — duplicate available
   - From W-17 (SAVE_AS_TEMPLATE): return to W-17 — athlete completes W-17 flow
   - From W-27 (EDIT): return to W-27 — updated template reflected
4. On API failure: transient error banner ("Couldn't save. Try again."). W-25 remains open. Local draft preserved.

### 9.3 Cancel Behavior

No explicit "Cancel" button. Back navigation (Section 9.1) is the dismissal path. "Save" is the only affirmative commit action.

### 9.4 Delete Behavior (EDIT mode only)

1. Athlete taps "Delete Template"
2. Confirmation sheet: "Delete [Template Name]? This cannot be undone. Sessions launched from this template are not affected."
   - "Delete" (destructive, red)
   - "Cancel"
3. On "Delete": delete `WorkoutTemplate` record. Navigate to W-26. W-26 refreshes list.
4. Per EL-D6: deleting a template does not modify any `WorkoutSession` records previously launched from it. Sessions retain their snapshotted `slotName` (EL-D7). No "template deleted" indicator in W-19 for MVP.

---

## Section 10 — Non-Behaviors

| Non-Behavior | Reason |
|---|---|
| Log sets or track active performance | W-25 is a builder. Execution happens in W-9 through W-16. |
| Start a workout session or timer | No `WorkoutSession` created during W-25. No elapsed timer. |
| Create a ProgramSlot or modify a program | ProgramSlot authoring belongs to W-24. |
| Mark a workout as complete or partial | Completion semantics belong to W-17. |
| Publish templates to other athletes | Templates are personal tools. No sharing surface in MVP. |
| Generate AI-suggested exercise lists | Post-MVP. |
| Import exercises from external sources | Import belongs to Architecture-Amendment-001-Import flow. |
| Display carry-forward values from prior sessions | Carry-forward is a W-9 runtime behavior; not shown in the builder. |
| Show personal records or prior performance data | W-25 has no session history context. |
| Link a template to a specific chapter or goal | Templates are standalone. Chapter attribution is session-level. |
| Reorder sections | Section order is fixed: WARM_UP → MAIN → COOL_DOWN (WS-A5). |
| Rename sections | Section names are fixed. Athletes do not author section names. |
| Move exercises across sections via drag | Cross-section movement is via overflow menu only (WS-A5). |
| Enforce prescriptions as required fields | All prescription fields are optional. |
| Show a preview of how the template will look in W-9 | Post-MVP. |
| Auto-suggest similar exercises | Post-MVP (recommendation layer). |
| Toggle weight unit per-template | Weight unit is athlete's global preference; no per-template toggle (W25-D2). |

---

## Section 11 — Architecture Decisions

**W25-D1 — W-25 is a distinct screen from W-24**
W-24 requires `programId` and `slotIndex` context and writes to `ProgramSlot`. W-25 requires `templateId` context (edit) or no ID (create) and writes to `WorkoutTemplate`. Mixing these into one screen creates a God Screen pattern and couples template editing to program-slot editing. Shared UI components (exercise card, prescription row, section header) are extracted into shared components, not shared screens.

**W25-D2 — weightUnit on WorkoutTemplate is a creation-time snapshot, not a toggle**
Weight unit is the athlete's global unit preference (configured in Profile). W-25 does not expose a per-template weight unit toggle. The `weightUnit` field on `WorkoutTemplate` records the unit the template was authored in — this snapshot enables future template sharing to convert displayed values for the viewer without data loss. Athletes who want to change their unit preference do so in Profile; new templates reflect the new preference; existing templates retain their creation-time unit and values. Rationale: a per-template toggle with no conversion creates data integrity failures (225 lbs relabeled as 225 kg). Automatic conversion introduces decimal noise that destroys meaningful round-number prescriptions. Global preference with snapshot storage is the correct architecture for both MVP and future sharing.

**W25-D3 — ExercisePrescription schema extensions governed by EP-A1**
The `restSeconds`, `distanceValue`, and `distanceUnit` fields used in W-25 are defined and governed by ExercisePrescription-Amendment-001 (EP-A1). These fields affect all ExercisePrescription consumers (W-24, W-25, import, W-9 execution, future AI systems) and require cross-cutting amendment authority. W-25 displays these fields per Section 5.2; behavioral rules for all consumers are in EP-A1.

**W25-D4 — SAVE_AS_TEMPLATE uses planned prescription values, not logged values**
When W-17 triggers "Save as Template," the template uses `ExercisePrescription` reference values from the session (the targets the athlete planned), not `ExerciseLog` values (what was executed). A template is a future-workout planning tool; it represents what the athlete intended to do — the better starting point for next time. Logged actuals inform carry-forward behavior in W-9 (EL-D8), not the template.

**W25-D5 — Empty optional sections do not block save**
An athlete may create a WARM_UP or COOL_DOWN section and save without adding exercises. The section persists in the template. In W-9 execution, empty sections are absent from the rendered list (WS-A5). No warning at save time for empty optional sections — the athlete created the section intentionally.

**W25-D6 — Delete does not affect prior sessions**
Deleting a `WorkoutTemplate` removes the template record. Sessions previously launched from the template retain their data (EL-D6). The `templateId` reference on those sessions becomes a dangling reference. Sessions display their snapshotted `slotName` (EL-D7); no "template deleted" indicator in W-19 for MVP.

**W25-D7 — Prescription display driven by template activityType, not per-exercise movement pattern**
The prescription field set shown on exercise cards is driven by the template's `activityType`, not each exercise's `movementPattern`. This keeps display rules consistent within a template. A STRENGTH template shows reps for all exercises — including core exercises that could theoretically use duration. If the athlete wants duration for a specific exercise in a STRENGTH template, they use the notes field. Post-MVP, a per-exercise duration toggle could be added, but it does not justify its complexity in MVP.

**W25-D8 — Changing activityType does not clear hidden prescription values**
When activityType changes (e.g., STRENGTH → MOBILITY), display rules change but stored values are not cleared. Reps values hidden by MOBILITY rules remain in the model — they reappear if the athlete switches back. This prevents data loss from accidental activityType changes and simplifies the mental model ("changing the type changes what I see, not what I've entered").

---

## Section 12 — Validation Checklist

### Screen Identity
- [ ] W-25 identified as the Free Workout Builder (template creation and editing)
- [ ] W-25 targets `WorkoutTemplate`, not `ProgramSlot` or `WorkoutSession`
- [ ] W-24 and W-25 are distinct screens sharing UI components

### Entry Paths
- [ ] CREATE_NEW: blank MAIN section, empty name field, keyboard opens on load
- [ ] DUPLICATE: deep copy of source template, "(Copy)" name suffix, useCount: 0, new entity ID
- [ ] SAVE_AS_TEMPLATE: pre-populated from session structure, uses planned prescription values (not logged), default name editable
- [ ] EDIT: loads existing template by templateId, Save commits to same ID

### Layout
- [ ] Header: back | name field | save button (dual-condition enabled state)
- [ ] Metadata row: activity type selector only; no weight unit toggle
- [ ] Sections: WARM_UP (absent by default) → MAIN (always present) → COOL_DOWN (absent by default)
- [ ] Section add affordances shown at scroll bottom for absent sections
- [ ] Exercise rows: drag handle | thumbnail | name | overflow | prescription fields | notes
- [ ] Delete Template bottom action shown only in EDIT mode

### Exercise Management
- [ ] Add via W-23 picker with section context
- [ ] Remove via swipe or overflow; no second confirmation
- [ ] Reorder via drag handle, within section only
- [ ] Duplicate via overflow; copy appended below original in same section
- [ ] Cross-section move via overflow; appended to target section end

### Prescription Fields
- [ ] Sets: STRENGTH/HIIT/OTHER (visible) | MOBILITY/YOGA (hidden) | RUN/WALK/BIKE/SWIM (hidden)
- [ ] Reps: STRENGTH/HIIT/OTHER (visible) | MOBILITY/YOGA (hidden, duration shown instead) | RUN/WALK/BIKE/SWIM (hidden)
- [ ] Duration: MOBILITY/YOGA (visible, replaces reps) | STRENGTH/HIIT/OTHER (hidden)
- [ ] Weight: STRENGTH/HIIT/OTHER (visible) | MOBILITY/YOGA (hidden) | RUN/WALK/BIKE/SWIM (hidden)
- [ ] Distance: STRENGTH/HIIT/OTHER/RUN/WALK/BIKE/SWIM (visible, optional) | MOBILITY/YOGA (hidden)
- [ ] Rest: STRENGTH/HIIT/OTHER/MOBILITY/YOGA (visible) | RUN/WALK/BIKE/SWIM (hidden)
- [ ] Notes: all activity types (visible); max 200 chars; collapses when empty
- [ ] All prescription fields are optional (null is valid)
- [ ] restSeconds, distanceValue, distanceUnit governed by EP-A1
- [ ] weightUnit on WorkoutTemplate (snapshot, not toggle); weight label is static display in exercise row
- [ ] Distance unit is per-exercise (EP-A1 EPA1-D1)

### Section Management
- [ ] MAIN: always present, cannot be removed
- [ ] WARM_UP: absent by default; created via affordance; removed via overflow with confirmation if exercises present
- [ ] COOL_DOWN: absent by default; same rules as WARM_UP
- [ ] Empty optional sections: valid; show empty state with add affordance; do not block save
- [ ] Section rendering order fixed: WARM_UP → MAIN → COOL_DOWN

### Draft Persistence
- [ ] Local draft written on every meaningful change (not weight unit — no toggle)
- [ ] Draft keyed by mode + sourceId
- [ ] Draft not visible in W-26
- [ ] Draft cleared on successful save
- [ ] Draft recovery offered on app re-launch if draft exists

### Save Eligibility (Dual Condition)
- [ ] Save disabled when name empty (regardless of MAIN state)
- [ ] Save disabled when MAIN has 0 exercises (regardless of name state)
- [ ] Save enabled only when name present AND MAIN ≥ 1 exercise
- [ ] Contextual hint shown in MAIN empty state when name is present
- [ ] No inline error on save-tap (button is disabled; failed-tap state eliminated)
- [ ] Empty optional sections do not block save

### Navigation
- [ ] Back with no changes: dismiss without confirmation
- [ ] Back with unsaved changes: discard dialog with Discard (destructive) + Keep Editing
- [ ] Save: writes → dismisses on success → error banner on API failure
- [ ] Delete (EDIT only): confirmation → delete template → navigate to W-26 → prior sessions unaffected

### Non-Behaviors Confirmed
- [ ] No WorkoutSession created in W-25
- [ ] No timer runs in W-25
- [ ] No ProgramSlot created or modified in W-25
- [ ] No weight unit toggle (no per-template unit configuration)
- [ ] No carry-forward values displayed in W-25
- [ ] No section renaming
- [ ] No cross-section drag (overflow only)
- [ ] No publish/share
- [ ] No AI suggestions (MVP)

### Architecture Decisions
- [ ] W25-D1: W-25 distinct from W-24 (different target entity, different context)
- [ ] W25-D2: weightUnit on WorkoutTemplate is creation-time athlete preference snapshot; no per-template toggle
- [ ] W25-D3: restSeconds, distanceValue, distanceUnit governed by EP-A1 (not defined in W-25)
- [ ] W25-D4: SAVE_AS_TEMPLATE uses planned values, not logged values (EL-D8 governs carry-forward, not templates)
- [ ] W25-D5: empty optional sections do not block save
- [ ] W25-D6: delete does not affect prior sessions (EL-D6, EL-D7)
- [ ] W25-D7: prescription display driven by template activityType, not per-exercise movement pattern
- [ ] W25-D8: changing activityType does not clear hidden prescription values

---

## Section 13 — Downstream Impact

| Document | Required Update |
|---|---|
| `Exercise-Library-Architecture-v1.0.md` | Update `WorkoutTemplate` entity: add `weightUnit: 'lbs' \| 'kg'` field with snapshot semantics. Update §11 three entry paths to reference W-25 as the template builder screen. |
| `Workout-Builder-Wireframe-Spec-W24.md` | Note: ExercisePrescription schema extended by EP-A1. W-24 prescriptions now include `restSeconds`, `distanceValue`, `distanceUnit`. |
| `ExercisePrescription-Amendment-001.md` | Authority document for the three new fields. No further update needed — EP-A1 already references W-25 as a consumer. |
| `Active-Workout-Flow-Spec-W9-W16.md` | W-9 rest overlay: add display rule for `restSeconds` as reference context when non-null (per EP-A1 §4.4). |
| `Workout-Summary-Spec-W17.md` | Document "Save as Template" secondary CTA as launching W-25 with `SAVE_AS_TEMPLATE` mode, `sourceSessionId` set. |
| Future `W-26-Workout-Templates-Hub.md` | W-26 is the primary entry point to W-25 (CREATE_NEW). W-26 lists templates and connects to W-27. |
| Future `W-27-Template-Detail.md` | W-27 provides DUPLICATE and EDIT entry points to W-25. |

---

## Section 14 — Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial locked specification. Defines W-25 as the Free Workout Builder targeting WorkoutTemplate. Specifies four entry paths (CREATE_NEW, DUPLICATE, SAVE_AS_TEMPLATE, EDIT). Defines section-first layout (WS-A5), exercise management, prescription editing (EP-A1 fields), section management, draft persistence, dual-condition save eligibility (R2), weight unit as athlete preference snapshot (R3). Eight architecture decisions (W25-D1 through W25-D8). ExercisePrescription extensions governed by EP-A1 (R1). |

---

*Forge Legacy W-25 Free Workout Builder — v1.0*
*June 2026*
*Authority for all template creation, editing, prescription, section management, and save eligibility behavior in the Free Workout Builder.*
