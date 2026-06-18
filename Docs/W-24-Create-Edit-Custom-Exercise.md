# Forge Legacy — W-24: Create / Edit Custom Exercise
## Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise-001-Custom-Exercise-Architecture.md (LOCKED), Exercise-Library-Architecture-v1.0.md (LOCKED), FORGE_LEGACY_PRODUCT_DNA.md (LOCKED), M-6-Destructive-Action-Confirmation-Spec.md (LOCKED)
**Downstream impact:** W-21 (entry path: [+ New Exercise] navigates to W-24 CREATE mode), W-22 (pen icon edit destination confirmed as W-24), W-23 (post-creation "Add Details" CTA opens W-24 EDIT mode)

> **Screen Numbering:** W-24 = Create / Edit Custom Exercise (this document). Program Slot Builder = W-28. Resolved June 2026.

---

## Section 1 — Screen Purpose

### 1.1 What W-24 Is

W-24 is the full-screen creation and editing experience for Custom Exercises. It is the rich counterpart to the lightweight inline creation sheet used in W-23 and W-21. W-24 exists so that athletes who want to record more than just a name have a dedicated, unhurried space to do so.

W-24 serves two modes within a single screen architecture:

| Mode | Trigger | State |
|------|---------|-------|
| CREATE | Accessed from W-21 [+ New Exercise] | Empty form, name field auto-focused |
| EDIT | Accessed from W-22 Edit action, or post-W-23 creation | Fields pre-populated from existing ExerciseDefinition |

Both modes share the same layout, field structure, and validation rules. They differ only in initialization state, navigation bar title, and the presence of the Delete action (EDIT only).

### 1.2 What W-24 Is Not

- **Not a replacement for the W-23 inline creation sheet.** The inline sheet (name-only, appears over W-23 mid-workout) remains the fastest creation path. W-24 is the intentional, deliberate path for athletes who want to add context at creation time or enrich existing exercises.
- **Not an editor for Forge exercises.** `source: 'FORGE'` exercises are Forge-team-authored. W-24 operates exclusively on `source: 'CUSTOM'` exercises. FORGE exercises never show an Edit action.
- **Not a discovery surface.** W-24 is reached through an explicit action; it is never browsed to.
- **Not a media studio.** Media upload (GIF, video, image) is deferred to post-MVP per the decision in Section 7.
- **Not a restore surface.** Exercise restoration is available only from the `[Deleted Exercise]` tombstone in template and program edit surfaces (EX-001-D7). W-24 has no restore capability.

### 1.3 Relationship to W-21

W-21 (Exercise Library Hub, My Exercises section) is the entry point to W-24 CREATE mode. When an athlete creates an exercise in W-24, the result appears in their My Exercises list in W-21. W-21 is also the destination after a successful delete action in W-24 EDIT mode.

### 1.4 Relationship to W-22

W-22 (Exercise Detail) is the entry point to W-24 EDIT mode. The pen icon in W-22's sticky header — visible only for CUSTOM exercises viewed by their author — navigates to W-24 pre-populated with the exercise's current data. After a successful save in W-24 EDIT mode, the athlete returns to W-22 with updated data displayed.

### 1.5 Relationship to W-23

W-23 (Exercise Picker) contains an inline creation sheet for name-only exercise creation. After saving via the inline sheet, an optional "Add Details" CTA within the post-save confirmation opens W-24 in EDIT mode for the newly created exercise. This is the enrichment path for athletes who create an exercise mid-workout and want to add detail afterward.

---

## Section 2 — Entry Paths

### 2.1 From W-21 My Exercises — [+ New Exercise]

The `[+ New Exercise]` action in the My Exercises section header navigates to W-24 in CREATE mode.

**Context passed:** None. W-24 opens with a blank form.

**Behavior at 500-exercise limit:** The `[+ New Exercise]` action is disabled and shows a static tooltip: "Exercise limit reached (500). Delete unused exercises to create new ones." W-24 is not opened. See Section 8.3.

**Behavior at 480–499 exercises:** W-24 opens normally. A warning banner is shown at the top of the form: "You're approaching the exercise limit (X/500)."

### 2.2 From W-22 Exercise Detail — Edit Action (Pen Icon)

The pen icon in W-22's sticky header navigates to W-24 in EDIT mode. This action is visible only when:
- `source: 'CUSTOM'`
- `authorId = viewing athlete`

FORGE exercises never show this action. Other athletes' CUSTOM exercises never show this action.

**Context passed:** `{ exerciseId: uuid }`. W-24 fetches and pre-populates all fields from the ExerciseDefinition record.

### 2.3 From W-23 Inline Creation Sheet — "Add Details" CTA

After an athlete creates a Custom Exercise via the W-23 inline creation sheet (name-only), a post-save confirmation state appears momentarily. This state includes:

```
┌──────────────────────────────────────────────────────┐
│  ✓ "[Exercise Name]" added to your library           │
│                          [Add Details →]             │
└──────────────────────────────────────────────────────┘
```

Tapping "Add Details" navigates to W-24 in EDIT mode for the newly created exercise. The exercise is pre-populated with only its name (all metadata still null). The athlete continues their workout or returns to their prior context after W-24 is dismissed.

This CTA is optional. Dismissing the confirmation (via timeout or swipe) proceeds without opening W-24.

### 2.4 Post-Import Enrichment

Import auto-creates Custom Exercises for unmatched exercise names (EX-001-D12). These exercises appear in W-21 My Exercises with name only (all metadata null). The enrichment path is:

`W-21 → tap imported exercise → W-22 (minimal display) → pen icon → W-24 EDIT mode`

There is no dedicated "enrichment flow" specifically for imported exercises. The standard edit path handles all enrichment.

---

## Section 3 — Create vs. Edit Modes

### 3.1 Single Screen, Two Modes

W-24 is one screen with two initialization states. The layout, field structure, scroll behavior, validation, and save mechanics are identical. What differs:

| Element | CREATE mode | EDIT mode |
|---------|------------|-----------|
| Nav bar title | "New Exercise" | "Edit Exercise" |
| Name field | Empty, auto-focused | Pre-populated |
| All metadata fields | Empty / unselected | Pre-populated from ExerciseDefinition |
| Save button label | "Save" | "Save" |
| Delete action | Absent | Present in footer |
| Back behavior (no changes) | Navigate to W-21, no prompt | Navigate to W-22, no prompt |
| Back behavior (unsaved changes) | Discard confirmation prompt | Discard confirmation prompt |
| Save success destination | W-21, new exercise highlighted | W-22, updated data shown |

### 3.2 Context Resolution

The screen determines its mode by the presence or absence of an `exerciseId` in its navigation context:

- `exerciseId: null` → CREATE mode
- `exerciseId: uuid` → EDIT mode → fetch ExerciseDefinition → pre-populate

In EDIT mode, if the fetch fails or the exercise is not found, the screen shows an error state with a "Go Back" button. No form is shown until data is loaded.

### 3.3 Shared Keyboard Behavior

In CREATE mode: the keyboard appears automatically when the screen opens, with the name field focused.

In EDIT mode: the keyboard does not appear automatically. The athlete taps a field to begin editing.

---

## Section 4 — Information Architecture

### 4.1 Screen Layout

W-24 is a scrollable form. The navigation bar is fixed (does not scroll). The Delete action (EDIT mode only) is anchored at the bottom of the scrollable content, below all fields and above the safe area.

```
┌───────────────────────────────────────────────────────┐
│ [← Back]          New Exercise              [Save]    │  ← fixed nav bar; Save disabled until name valid
├───────────────────────────────────────────────────────┤
│                                                       │
│  [LIMIT WARNING BANNER — shown at 480+]              │
│                                                       │
│  [DUPLICATE WARNING BANNER — shown when name matches] │
│                                                       │
│  ── Required ──────────────────────────────────────  │
│                                                       │
│  Exercise Name                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │ e.g. Belt Squat Machine                         │ │
│  └─────────────────────────────────────────────────┘ │
│  0 / 60                                              │
│                                                       │
│  ── Optional Details ──────────────────────────────  │
│                                                       │
│  Category                                             │
│  [Push] [Pull] [Legs & Glutes] [Core & Stability]    │
│  [Carry & Full Body] [Mobility & Flexibility]         │
│                                                       │
│  Equipment                                            │
│  [Tap to select ▸]                "3 selected"       │
│                                                       │
│  Primary Muscles                                      │
│  [Tap to select ▸]                "Chest, Triceps"   │
│                                                       │
│  Secondary Muscles                                    │
│  [Tap to select ▸]                "Shoulders"        │
│                                                       │
│  Environment                                          │
│  [Gym] [Home] [Outdoor]                              │
│                                                       │
│  Notes                                                │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Form cues, setup notes, coaching reminders...   │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
│  0 / 300                                             │
│                                                       │
│  ─────────────────────────────────────────────────── │
│                                                       │
│  [Delete Exercise]    ← EDIT mode only, destructive  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 4.2 Field Order and Rationale

| Order | Field | Type | Required |
|-------|-------|------|----------|
| 1 | Exercise Name | Text input | Required |
| 2 | Category | Single-select chips | Optional |
| 3 | Equipment | Multi-select (via sheet) | Optional |
| 4 | Primary Muscles | Multi-select (via sheet) | Optional |
| 5 | Secondary Muscles | Multi-select (via sheet) | Optional |
| 6 | Environment | Multi-select chips | Optional |
| 7 | Notes | Text area | Optional |

**Order rationale:**
- Name first — it is required and must be filled before anything else
- Category second — the most useful organizational field; athletes think "what type of movement is this?" before "what equipment does it use?"
- Equipment before muscles — equipment is a practical "what do I need" question; muscles are a "what does it train" question that requires more thought
- Primary before secondary muscles — logical hierarchy
- Environment low — athletes primarily care about this for program planning, not exercise creation
- Notes last — free text is open-ended; placing it last prevents it from anchoring the visual hierarchy

### 4.3 Section Dividers

The form uses two visual section dividers:

**"Required" divider:** A 1pt horizontal rule with the label "Required" in secondary muted text. Appears before the name field.

**"Optional Details" divider:** A 1pt horizontal rule with the label "Optional Details" in secondary muted text. Appears between the name field and the Category field.

**Danger zone divider:** A 1pt horizontal rule without a label. Appears between the Notes field and the Delete action in EDIT mode.

---

## Section 5 — Required Fields

### 5.1 Name is the Only Required Field

Per EX-001-D3: `name` is the only required field for a Custom Exercise. All other fields are optional.

W-24 enforces this by disabling the Save button until the name field contains at least one non-whitespace character. The form does NOT require any other field before saving. An athlete may enter a name and immediately save — W-24 is "fast enough to create in seconds."

### 5.2 Name Field Specifications

| Attribute | Rule |
|-----------|------|
| Input type | Single-line text field |
| Max length | 60 characters |
| Min length | 1 non-whitespace character (trimmed) |
| Placeholder | "e.g. Belt Squat Machine" |
| Character counter | "X / 60" displayed below field at all times |
| Auto-focus | Yes — on screen open in CREATE mode |
| Auto-capitalize | Words (iOS/Android behavior) |
| Trim on save | Leading and trailing whitespace stripped before persistence |
| Return key | "Done" — dismisses keyboard, does not trigger save |

### 5.3 Optional Field Completion Communication

Optional fields use a consistent visual pattern:
- **Label:** Field name in primary text
- **Unset state:** Row shows a secondary prompt ("Tap to select" for sheet-based fields; unselected chips for inline chip fields)
- **Set state:** Selected values shown inline
- **Clear affordance:** A "Clear" link appears beside the field label when the field has a value

No "required" asterisk or "optional" label is added to individual optional fields. The "Optional Details" section divider communicates optionality for the group.

---

## Section 6 — Metadata Editing

### 6.1 Category

**Field:** `ExerciseCategory` — single-select.
**Options:** 6 values from the ExerciseCategory enum.
**UI:** Inline chip grid, 2 columns.

```
 [Push (Upper Body)]    [Pull (Upper Body)]
 [Legs & Glutes]        [Core & Stability]
 [Carry & Full Body]    [Mobility & Flexibility]
```

- Selected chip: filled/highlighted state; Unselected chip: outlined state
- Tapping a selected chip deselects it (clears the category)
- Single-select only; only one chip may be selected at a time
- Category is optional — the athlete may not select any chip

**Per EX-001-D9:** Setting a category on a Custom Exercise does NOT cause it to appear in the FORGE category browse tiles in W-21 or W-23. Category is metadata for the athlete's own organization; it does not inject the exercise into the shared browse taxonomy.

### 6.2 Equipment

**Field:** `EquipmentTag[]` — multi-select.
**Options:** 18 values from the EquipmentTag enum.
**UI:** Tap-to-open selection sheet.

**Row appearance on W-24 main form:**
```
Equipment                                 [3 selected  ›]
```
- Unset state: "None" in muted secondary text with chevron
- Set state: count of selections; always with chevron
- Tapping the row opens the Equipment Selection Sheet

**Equipment Selection Sheet:**

```
┌──────────────────────────────────────────────────┐
│  ──────                                          │
│  Equipment              [Clear All]              │
│  Select all that apply                           │
│                                                  │
│  FREE WEIGHTS                                    │
│  [Barbell] [Dumbbell] [Kettlebell] [Weight Plate]│
│                                                  │
│  SUPPORT                                         │
│  [Squat Rack] [Bench] [Pull-Up Bar] [Dip Bar]   │
│  [Resistance Band] [TRX]                         │
│                                                  │
│  CONDITIONING                                    │
│  [Rowing Machine] [Sled] [Battle Ropes]          │
│                                                  │
│  MACHINES                                        │
│  [Cable Machine] [Machine]                       │
│                                                  │
│  RECOVERY                                        │
│  [Foam Roller] [Lacrosse Ball]                   │
│                                                  │
│  NO EQUIPMENT                                    │
│  [Bodyweight]                                    │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                   Done                     │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- "Clear All" resets selection
- "Done" dismisses sheet; selected items reflected in Equipment row
- Section headers (FREE WEIGHTS, SUPPORT, etc.) use muted secondary text for scannability

### 6.3 Primary Muscles

**Field:** `MuscleGroup[]` — multi-select.
**Options:** 14 values from the MuscleGroup enum.
**UI:** Tap-to-open selection sheet.

**Row appearance:**
```
Primary Muscles                         [Chest, Triceps  ›]
```

**Primary Muscles Selection Sheet:**

```
┌──────────────────────────────────────────────────┐
│  ──────                                          │
│  Primary Muscles            [Clear All]          │
│  Select the muscles this exercise trains most    │
│                                                  │
│  UPPER BODY                                      │
│  [Chest] [Back] [Shoulders] [Biceps] [Triceps]  │
│  [Forearms]                                      │
│                                                  │
│  CORE & TRUNK                                    │
│  [Core] [Lower Back]                             │
│                                                  │
│  LOWER BODY                                      │
│  [Glutes] [Quads] [Hamstrings] [Calves]         │
│  [Hip Flexors]                                   │
│                                                  │
│  FULL                                            │
│  [Full Body]                                     │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                   Done                     │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 6.4 Secondary Muscles

**Field:** `MuscleGroup[]` — multi-select.
**Options:** Same 14 MuscleGroup values as Primary Muscles.
**UI:** Tap-to-open selection sheet, identical layout to Primary Muscles but titled "Secondary Muscles."

An athlete may select the same muscle in both Primary and Secondary fields. The system does not validate or block this.

### 6.5 Environment

**Field:** `EnvironmentTag[]` — multi-select.
**Options:** 3 values: GYM, HOME, OUTDOOR.
**UI:** Inline chip row (3 options fits inline cleanly).

```
Environment
[Gym] [Home] [Outdoor]
```

- Multi-select: multiple chips may be selected simultaneously
- Tapping a selected chip deselects it
- "Clear" link appears beside field label when any chip is selected
- Display names: "Gym", "Home", "Outdoor" (matching EL display name mapping)

### 6.6 Notes

**Field:** `description` (string, 0–300 characters) — free text athlete coaching notes.
**UI:** Multi-line text area, auto-expanding.

```
Notes
┌──────────────────────────────────────────────────┐
│ Form cues, setup notes, coaching reminders...    │
│                                                  │
└──────────────────────────────────────────────────┘
0 / 300
```

- Placeholder: "Form cues, setup notes, coaching reminders..."
- Character counter: "X / 300" below field, always visible
- Expands vertically as the athlete types; returns permitted (multi-line)
- Notes are private to the athlete — appear in W-22's description section for CUSTOM exercises (when non-null)
- Labeled "Notes" — not "Description," "Instructions," or "About." Communicates personal, not public-facing.

**What Notes is not:** The editorial fields `whyItMatters`, `instructions`, `tips`, and `commonMistakes` are always null/[] for CUSTOM exercises (EX-001 §5.1). W-24 does not present these fields. Notes is the single free-text field available to athletes.

---

## Section 7 — Media

### 7.1 Decision: Media Deferred to Post-MVP

**W24-D7: Media upload (gifUrl, videoUrl, imageUrl) is deferred to post-MVP. W-24 MVP does not include any media capture or upload functionality.**

**Rationale:**

The media fields are reserved in the schema and confirmed accessible via Exercise-001 §5.1. The schema is ready. The UI is not.

Media upload requires camera/photo library permissions, platform-specific file handling, an upload pipeline, and preview/crop UX — significant implementation scope. An athlete creating a custom exercise — especially mid-workout — wants to record a name and possibly some notes. Media enrichment is a refinement, not a creation-time need. Deferring media keeps W-24 focused on the naming and organization tasks that deliver immediate value.

### 7.2 Post-MVP Media Addition

When media is added in a future version:
- A "Photo" or "Media" section is added below Notes
- Single image (imageUrl) ships first — simpler capture
- Video/GIF (videoUrl, gifUrl) follow in a subsequent iteration
- No schema changes required

### 7.3 MVP Media Preservation Rule

If an exercise record already has media (populated post-MVP and then viewed in MVP), W-24 EDIT mode does not display or allow editing of that media. The save action passes only the fields W-24 controls — media fields are excluded from the PATCH payload. Existing media is preserved on the record.

---

## Section 8 — Validation

### 8.1 Name Validation

| Condition | Behavior |
|-----------|----------|
| Empty or whitespace-only | Save button disabled. No error shown proactively. |
| 1–60 non-whitespace characters | Save button enabled. |
| Over 60 characters | Input blocked at 60 characters. Counter shows "60 / 60" in warning color. |
| Leading/trailing whitespace | Trimmed silently on save. Not flagged to the athlete. |

### 8.2 Duplicate Name Warning

Per EX-001-D4: name uniqueness within the athlete's own CUSTOM library is a **soft warning, not a block**.

**Trigger:** The athlete exits the name field (blur event) and the trimmed name matches an existing `isActive: true` CUSTOM exercise by the same athlete (case-insensitive comparison).

**Warning display:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠  You already have an exercise named "[Name]"                  │
│     You can still save — this will create a second exercise      │
│     with the same name.                                          │
└──────────────────────────────────────────────────────────────────┘
```

- Warning appears as a banner between the name field and the "Optional Details" divider
- Does NOT disable the Save button
- In EDIT mode: check excludes the exercise currently being edited
- No check against FORGE exercise names (per EX-001-D4)

### 8.3 Volume Limit Behavior

| State | Behavior |
|-------|----------|
| Under 480 exercises | No message shown |
| 480–499 exercises | Warning banner at top of W-24 CREATE mode form only |
| 500 exercises | CREATE mode blocked at entry point; [+ New Exercise] shows tooltip; W-24 not opened. EDIT mode unaffected. |

### 8.4 Field-Level Validation

All metadata fields have no validation failures. The only constraints are:
- Notes: 300-character max. Counter turns warning at 280 characters. Input blocked at 300 characters.
- No cross-field validation (e.g., selecting MACHINE equipment does not require selecting muscles).

### 8.5 Save Button State Machine

| State | Condition |
|-------|-----------|
| Disabled | Name field is empty or whitespace-only |
| Enabled | Name has ≥ 1 non-whitespace character |
| Loading | Save tapped; API request in flight; activity indicator shown; re-tap blocked |
| Error | API failure; button returns to enabled; error toast shown |

---

## Section 9 — Save Behavior

### 9.1 No Draft Persistence

W-24 does not auto-save or maintain a draft. If the athlete backgrounds the app before saving, changes are lost. Unsaved changes are protected only by the discard confirmation prompt.

**Rationale:** Custom Exercises are simple records. Draft persistence adds complexity without proportional benefit — unlike workout sessions or program structures where partial state has inherent value, an unsaved exercise name is trivially re-entered.

### 9.2 Save Action

Tapping "Save":
1. Trims whitespace from the name field
2. Validates name length and non-empty requirement
3. If valid: initiates API call
4. On success: navigate per Section 12 navigation rules
5. On failure: return to enabled state; show error toast ("Couldn't save. Try again.")

**CREATE mode payload:**
```
POST /exercises
{
  name: string (trimmed),
  source: 'CUSTOM',
  authorId: <current athlete uuid>,
  category: ExerciseCategory | null,
  equipment: EquipmentTag[],
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[],
  environmentTags: EnvironmentTag[],
  description: string | null,
  isActive: true
}
```

**EDIT mode payload:**
```
PATCH /exercises/:exerciseId
{
  name: string (trimmed),
  category: ExerciseCategory | null,
  equipment: EquipmentTag[],
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[],
  environmentTags: EnvironmentTag[],
  description: string | null
}
```

**Fields never sent by W-24:**
- `source` — immutable (EX-001-D1)
- `authorId` — immutable (EX-001-D1)
- `movementPattern` — not athlete-editable in W-24 (W24-D9)
- `difficulty` — always null for CUSTOM (EX-001 §5.1)
- `gifUrl`, `videoUrl`, `imageUrl` — deferred to post-MVP (W24-D7)
- `isActive` — controlled only by delete/restore, not the edit form

### 9.3 Cancel Behavior

Tapping the Back arrow or system back gesture:

**No changes made:** Navigate back without prompt. CREATE → W-21. EDIT → W-22.

**Changes made:** Show confirmation sheet:

```
┌──────────────────────────────────────┐
│  Discard changes?                    │
│  Any edits you've made will be lost. │
│                                      │
│  [Discard Changes]  ← destructive    │
│  [Keep Editing]     ← default        │
└──────────────────────────────────────┘
```

**Change detection:**
- CREATE mode: any non-empty field = change
- EDIT mode: any field value differing from loaded state = change
- Whitespace-only changes where trimmed value matches original = no change detected

---

## Section 10 — Delete Workflow

### 10.1 Where Delete Appears

Delete appears exclusively in **EDIT mode**, below the Notes field, separated by a horizontal divider. Full-width row, destructive color (red). Never shown in CREATE mode.

### 10.2 Confirmation Flow

Tapping "Delete Exercise" opens a confirmation sheet (per M-6 Destructive Action Confirmation pattern):

```
┌──────────────────────────────────────────────────────┐
│  Delete "[Exercise Name]"?                           │
│                                                      │
│  This exercise will be removed from your library.   │
│                                                      │
│  If it's used in any of your programs or templates, │
│  it will appear as "[Deleted Exercise]" until you   │
│  restore or replace it.                             │
│                                                      │
│  Your workout history will not be affected.         │
│                                                      │
│  [Delete]        ← destructive, full-width          │
│  [Cancel]        ← secondary                        │
└──────────────────────────────────────────────────────┘
```

- Static copy — no pre-check for active references required
- "Delete" always present regardless of whether the exercise is currently referenced
- Loading state shown on "Delete" during API call

### 10.3 On Delete Confirmed

1. `PATCH /exercises/:exerciseId { isActive: false }` (soft-delete per EX-001-D7)
2. On success: Navigate to W-21. Deleted exercise is absent from My Exercises (active-only scope). No success toast — absence is the feedback.
3. On failure: Toast "Couldn't delete. Try again." Return to W-24 EDIT mode.

### 10.4 Cascade Behavior After Deletion

Per EX-001 §7.2:
- `ExerciseLog` records: unaffected. Historical sessions show the snapshotted exercise name permanently.
- `WorkoutTemplate` / `ProgramSlot` ExercisePrescriptions: `[Deleted Exercise]` tombstone. Prescription data (sets/reps/weight) retained read-only.
- `UserFavoriteExercise`: silently removed.
- W-23 picker: exercise excluded from all search results.
- W-21 My Exercises: exercise excluded (active-only scope).

---

## Section 11 — Restore Workflow

### 11.1 W-24 Does Not Surface Restore

Per EX-001-D7: Restore is initiated from the `[Deleted Exercise]` tombstone — wherever it appears (W-27 Template Detail, program edit surfaces). There is no restore surface in W-24, W-21, or W-22.

W-24 is a creation and editing surface, not a lifecycle manager. Restore at the tombstone is the correct UX because the athlete encounters the problem and the solution in the same place.

### 11.2 Restore Is Not Reachable From W-24

- W-24 CREATE mode: Exercise being created is not yet deleted; no restore surface exists.
- W-24 EDIT mode: The Edit action in W-22 is shown only for `isActive: true` exercises. A deleted exercise does not surface an Edit action; therefore W-24 EDIT mode is never reached for a deleted exercise.

### 11.3 How an Athlete Restores a Deleted Exercise

The only restore path (per EX-001-D7):
1. Athlete encounters a `[Deleted Exercise]` tombstone in a template (W-27) or program edit context
2. Tombstone shows: **Restore** | Replace | Remove
3. Athlete taps Restore → `isActive: true` → tombstone clears everywhere simultaneously

### 11.4 Acknowledged Limitation: No Restore Path for Free-Workout-Only Exercises

An athlete who deletes a Custom Exercise that was used **only in free workouts** (never added to a saved template or program) will have no tombstone anywhere in the product. Without a tombstone, there is no restore path.

This is an intentional tradeoff, not an oversight:

- EX-001 §17 explicitly prohibits a "Deleted Exercises" section in W-21. That decision is locked. Adding a recovery surface would contradict it.
- The athlete confirmed the deletion through the M-6 confirmation dialog.
- The practical loss is **metadata re-entry only**, not history loss. `ExerciseLog.exerciseName` is snapshotted at write time and is permanent. The athlete's completed workout history shows the exercise name correctly, regardless of deletion.
- If the athlete regrets the deletion: they can recreate the exercise with the same name in seconds (name-only is the creation floor). Any category, equipment, muscle, or notes metadata must be re-entered — this is the actual cost.

W-24 does not attempt to solve this gap. Doing so would require a "Deleted Exercises" recovery surface that Exercise-001 explicitly rejected. The tradeoff is documented here so the decision is clear to all implementers and reviewers. See W24-D11 for the architecture decision record.

---

## Section 12 — Navigation

### 12.1 Complete Navigation Matrix

| Entry Path | Mode | Action | Destination |
|-----------|------|--------|-------------|
| W-21 [+ New Exercise] | CREATE | Save (success) | W-21, new exercise highlighted in My Exercises |
| W-21 [+ New Exercise] | CREATE | Cancel / Back (no changes) | W-21 |
| W-21 [+ New Exercise] | CREATE | Cancel / Back (unsaved changes) | Discard prompt → W-21 |
| W-22 pen icon | EDIT | Save (success) | W-22, updated data shown |
| W-22 pen icon | EDIT | Cancel / Back (no changes) | W-22 |
| W-22 pen icon | EDIT | Cancel / Back (unsaved changes) | Discard prompt → W-22 |
| W-22 pen icon | EDIT | Delete (confirmed) | W-21, exercise absent from My Exercises |
| W-23 "Add Details" | EDIT | Save (success) | Returns to prior surface (W-23 context) |
| W-23 "Add Details" | EDIT | Cancel / Back (no changes) | Returns to prior surface |
| W-23 "Add Details" | EDIT | Cancel / Back (unsaved changes) | Discard prompt → prior surface |

### 12.2 "New Exercise Highlighted" Behavior

After a successful save in CREATE mode, the newly created exercise row in W-21 My Exercises briefly appears with a highlighted background animation (1.5s) to confirm which exercise was just created. This feedback confirms successful creation without a toast.

### 12.3 Stack Behavior

W-24 is a full-screen push on the navigation stack — not a modal or bottom sheet. This ensures system back gestures (iOS swipe-from-edge, Android back button) work naturally and deep stacks (W-21 → W-22 → W-24) have a clear hierarchical return path.

---

## Section 13 — Empty States

### 13.1 No Metadata Entered (CREATE mode default)

The form shows all field labels with their unset states. No placeholder text, "fill this in" prompts, or "enrich later" banners are shown beyond field-level placeholders defined in Section 6. The form's natural appearance at default state communicates that optional fields are simply optional.

### 13.2 Notes Field Empty

Placeholder text: "Form cues, setup notes, coaching reminders..." Disappears when the athlete taps the field. No persistent "Add notes" prompt.

### 13.3 No Media Section (MVP)

Media upload is deferred. W-24 has no media section and therefore no media empty state in MVP.

### 13.4 EDIT Mode — Imported or Inline-Created Exercises

Exercises created via import or W-23 inline creation have name-only data. Opening W-24 EDIT mode shows the name pre-populated and all other fields empty/unselected. No special "enrichment opportunity" message — the optional fields are already visible.

---

## Section 14 — Non-Behaviors

W-24 does not and will not:

| Non-Behavior | Reason |
|-------------|--------|
| Edit FORGE exercises | EL-D1: source immutable; FORGE authorship is Forge-team only. Pen icon in W-22 is never shown for FORGE exercises. |
| Expose movementPattern for athlete selection | EL-D3 and W22-D5: MovementPattern is internal taxonomy; never displayed to athletes in W-24 or any current surface. The UI restriction is scoped to W-24 only. Post-MVP systems (coach tooling, AI enrichment, exercise intelligence services) may write movementPattern to Custom Exercise records; that is not restricted here. (W24-D9.) |
| Expose difficulty for athlete assignment | EX-001 §5.1: difficulty is always null for CUSTOM. Difficulty is editorial metadata. |
| Surface whyItMatters, instructions, tips, or commonMistakes fields | FORGE editorial fields; always null/[] for CUSTOM. Notes (description) is the single free-text field available to athletes. |
| Expose alternativeExerciseIds, progressionExerciseIds, regressionExerciseIds | FORGE-editorial relationships; CUSTOM exercises always have empty arrays. |
| Auto-infer metadata from name | AI-inferred metadata without athlete review creates unverified data. Athlete supplies all enrichment. (EX-001 §17.) |
| Public sharing or visibility controls | Custom Exercises are private to their author in MVP. No sharing, no visibility toggle. (EX-001-D2.) |
| Publish to FORGE catalog | FORGE promotion is a deliberate Forge-team action. An athlete cannot publish their exercise to the shared library. |
| Hard delete | Soft-delete only (isActive: false). No permanent deletion. (EX-001-D7.) |
| Restore a deleted exercise from W-24 | Restore is tombstone-only (EX-001-D7). W-24 has no restore capability. If an athlete deleted an exercise with no remaining template or program references, the tombstone never appears and no restore path exists. The workaround is exercise recreation. See W24-D11 and Section 11.4 for full tradeoff analysis. |
| "Deleted Exercises" or "Recently Deleted" surface | EX-001 §17 non-behavior. A trash section adds surface area without improving recovery UX; restore belongs at the tombstone. |
| Batch edit or bulk delete | W-24 operates on a single exercise at a time. |
| Draft persistence or auto-save | Form is in-memory only. Changes are protected by the discard confirmation prompt. |
| Rate or review an exercise | Social proof mechanics conflict with the personal nature of the exercise library. |
| Display exercise usage count | Not MVP. No "Used in 3 workouts" data shown. |
| Show workout history for the exercise | History belongs in W-18/W-19; W-24 is the editing surface. |
| Media upload or capture | Deferred to post-MVP (W24-D7). |

---

## Section 15 — Architecture Decisions

| Decision | Rule |
|----------|------|
| **W24-D1 — Single screen, two modes** | CREATE and EDIT are the same screen with two initialization states. A split implementation would duplicate field definitions, validation logic, and save mechanics. The only meaningful differences are initialization state, nav title, and delete affordance — all manageable with a single mode flag. |
| **W24-D2 — Approach B: Name-first, all-optional single form** | W-24 uses a single scrollable form with name required and all other fields optional and immediately visible. A wizard (progressive step-by-step) was evaluated and rejected: it forces athletes through unnecessary screens even when they want to save name-only. A collapsed "Add Details" accordion was evaluated and rejected: it hides available fields behind an expand action, creating a false impression that enrichment is obscured. The single open form communicates: "here is everything you can add; add only what you want." The floor is name-only; the ceiling is all metadata. This aligns with EX-001-D3 and Product DNA's low-friction principle. |
| **W24-D3 — Full-screen push, not a sheet** | W-24 is a full-screen push on the navigation stack, not a bottom sheet or modal. The form may be long when all optional fields are expanded; a sheet creates awkward scrolling behavior. Full-screen navigation is consistent with other edit experiences in the app (W-22, W-5). The inline creation sheet (W-23) remains separate — it is specifically designed for mid-workout name-only creation where a full-screen context switch is undesirable. |
| **W24-D4 — No draft persistence** | Custom Exercises are simple records. The creation effort is trivially re-doable if state is lost. Draft persistence adds complexity without meaningful benefit for this use case. Unsaved changes are protected by the discard confirmation prompt. |
| **W24-D5 — Soft delete from W-24, not hard delete** | Consistent with EX-001-D7. W-24 surfaces the delete action because it is the natural editing home for a Custom Exercise. The delete action initiates a soft-delete (isActive: false). Hard delete is not available anywhere in the system. |
| **W24-D6 — Static delete confirmation copy** | The confirmation dialog uses static copy describing the general consequence without a pre-check API call to determine if the exercise is currently referenced. A pre-check adds a round-trip for what feels like a simple action. The static copy is accurate for all cases: if no references exist, the note is harmless; if references exist, the note is informative. |
| **W24-D7 — Media deferred to post-MVP** | GIF, video, and image upload capabilities are not included in MVP W-24. The schema is ready. The upload pipeline and media UX are not MVP scope. Media is a "someday enrichment" — valuable, not blocking. When added, a "Photo" field appears below Notes; imageUrl ships first. |
| **W24-D8 — Equipment and Muscles use selection sheets** | Equipment (18 options) and Muscles (14 options each) exceed the count where inline chip grids remain scannable on a form. A selection sheet allows the full option list to breathe with grouping headers. Category (6 options) and Environment (3 options) use inline chips because their option counts are small. |
| **W24-D9 — movementPattern is never athlete-editable in W-24** | Per EL-D3 and W22-D5: MovementPattern is internal taxonomy, never displayed to athletes in any current surface. W-24 does not expose movementPattern for athlete selection — the restriction is scoped to W-24, not to the system. Assignment of movementPattern on Custom Exercises by internal tooling, coach systems, AI-assisted enrichment, or future exercise intelligence services is explicitly preserved as a post-MVP concern. Nothing in this spec prevents those systems from writing movementPattern to a CUSTOM ExerciseDefinition record. The field schema already supports it (EX-001 §5.1: `movementPattern: Optional`). |
| **W24-D10 — Notes labeled "Notes," not "Description"** | "Description" carries connotations of public-facing editorial copy (as it is for FORGE exercises). For Custom Exercises, this field is personal coaching notes. The label "Notes" accurately communicates the informal, personal nature of the field. |
| **W24-D11 — Restore not surfaced in W-24; tombstone-only gap acknowledged** | EX-001-D7 establishes that restore is tombstone-initiated. Surfacing restore in W-24 would require a "Deleted Exercises" section or a separate recovery flow — both non-behaviors per EX-001 §17. The tombstone model is superior for the primary use case: the athlete encounters the problem and the solution in the same place. There is a known gap: an athlete who deletes a Custom Exercise with no remaining template or program references has no tombstone to trigger restore from. This is an accepted tradeoff — the practical loss is metadata re-entry only, not history loss; the workaround is to recreate the exercise; and adding a recovery surface would contradict a locked Exercise-001 decision. See Section 11.4 for full analysis. |
| **W24-D12 — EDIT mode unreachable for deleted exercises** | The Edit action (pen icon) in W-22 is shown only for exercises where `isActive: true`. A deleted exercise does not surface the edit action; therefore W-24 EDIT mode will never receive a deleted exercise as input. No defensive handling of this edge case is required. |

---

## Section 16 — Validation Checklist

### Screen Architecture
- [ ] W-24 is a full-screen push on the navigation stack (not a sheet or modal)
- [ ] Two modes: CREATE (no exerciseId context) and EDIT (exerciseId context)
- [ ] CREATE mode: form opens with empty state, name field auto-focused, keyboard visible
- [ ] EDIT mode: form opens with all fields pre-populated from ExerciseDefinition fetch; keyboard not auto-shown
- [ ] EDIT mode load failure: error state with "Go Back" button; no form rendered until data loads

### Navigation Bar
- [ ] CREATE mode: nav title "New Exercise"; Back arrow; Save button (disabled initially)
- [ ] EDIT mode: nav title "Edit Exercise"; Back arrow; Save button (enabled if name valid)
- [ ] Save button: disabled when name is empty/whitespace-only; enabled when ≥ 1 non-whitespace char
- [ ] Save button: loading state during API call; re-enabled on failure

### Required Field — Name
- [ ] Single-line text, max 60 chars, input blocked at 60
- [ ] Placeholder: "e.g. Belt Squat Machine"
- [ ] Character counter: "X / 60" always visible below field
- [ ] Auto-capitalize: Words (platform default)
- [ ] Return key: "Done" (dismisses keyboard; does not save)
- [ ] Whitespace trimmed on save (silent)

### Validation Behaviors
- [ ] Duplicate name warning (soft warning only, not a block): triggered on blur when trimmed name matches any isActive CUSTOM exercise by same athlete (case-insensitive); EDIT mode excludes current exercise from check
- [ ] 480–499 exercises: warning banner at top of form in CREATE mode
- [ ] 500 exercises: CREATE mode blocked at entry ([+ New Exercise] shows tooltip; W-24 not opened); EDIT mode unaffected
- [ ] Notes: 300-char max; counter turns warning at 280; input blocked at 300

### Section Dividers
- [ ] "Required" divider: before name field
- [ ] "Optional Details" divider: between name field and Category field
- [ ] Danger zone divider (unlabeled): before Delete action in EDIT mode; absent in CREATE mode

### Category Field
- [ ] 6 inline chips (2-column grid): Push (Upper Body), Pull (Upper Body), Legs & Glutes, Core & Stability, Carry & Full Body, Mobility & Flexibility
- [ ] Single-select only; tapping selected chip clears selection
- [ ] "Clear" link appears when chip selected
- [ ] Setting category does NOT inject exercise into FORGE browse tiles (EX-001-D9)

### Equipment Field
- [ ] Tap row opens Equipment Selection Sheet
- [ ] Sheet: 18 EquipmentTag options, grouped (Free Weights, Support, Conditioning, Machines, Recovery, No Equipment)
- [ ] Multi-select chips; "Clear All" resets; "Done" closes
- [ ] Unset state: "None" in secondary muted text; Set state: selection summary with chevron

### Primary Muscles Field
- [ ] Tap row opens Primary Muscles Selection Sheet
- [ ] Sheet: 14 MuscleGroup options, grouped (Upper Body, Core & Trunk, Lower Body, Full)
- [ ] Multi-select chips; "Clear All" resets; "Done" closes

### Secondary Muscles Field
- [ ] Tap row opens Secondary Muscles Selection Sheet (identical layout, different title)
- [ ] Multi-select; same 14 MuscleGroup options
- [ ] Independent from Primary Muscles; duplicate selection across both fields permitted

### Environment Field
- [ ] 3 inline chips: Gym, Home, Outdoor
- [ ] Multi-select: multiple chips may be selected simultaneously
- [ ] "Clear" link appears when any chip selected

### Notes Field
- [ ] Multi-line text area, auto-expanding
- [ ] Placeholder: "Form cues, setup notes, coaching reminders..."
- [ ] Character counter: "X / 300" always visible
- [ ] Labeled "Notes" (not "Description")

### Media
- [ ] No media UI in MVP (W24-D7)
- [ ] EDIT mode save does NOT overwrite existing media fields (gifUrl, videoUrl, imageUrl)

### Save Behavior
- [ ] Name trimmed before persistence
- [ ] CREATE: POST /exercises with correct payload; source, authorId, movementPattern, difficulty, media fields excluded from client control
- [ ] EDIT: PATCH /exercises/:exerciseId with correct payload; immutable and deferred fields excluded
- [ ] On success: navigate per navigation matrix (Section 12)
- [ ] On failure: toast "Couldn't save. Try again."; Save button re-enabled

### Unsaved Changes
- [ ] Back/Cancel with no changes: navigate without prompt
- [ ] Back/Cancel with changes: discard confirmation sheet ("Discard Changes" / "Keep Editing")

### Delete Workflow (EDIT mode only)
- [ ] "Delete Exercise" row visible only in EDIT mode; absent in CREATE mode
- [ ] Confirmation sheet follows M-6 pattern: exercise name in title, three-line static consequence copy
- [ ] "Delete": PATCH /exercises/:exerciseId { isActive: false }; navigate to W-21 on success
- [ ] "Cancel": closes sheet; returns to W-24 EDIT mode
- [ ] On delete API failure: toast "Couldn't delete. Try again."; return to W-24

### Post-Delete Cascade (verified by spec, not UI)
- [ ] ExerciseLog records: unaffected (snapshotted name permanent)
- [ ] Template/Program ExercisePrescriptions: [Deleted Exercise] tombstone
- [ ] UserFavoriteExercise: silently removed
- [ ] W-23 picker: exercise excluded
- [ ] W-21 My Exercises: exercise excluded (active-only scope)

### Restore
- [ ] W-24 has NO restore affordance (W24-D11)
- [ ] W-24 EDIT mode is unreachable for isActive: false exercises
- [ ] Restore remains tombstone-initiated only (EX-001-D7)
- [ ] Acknowledged gap: exercises deleted with no template/program references have no restore path (Section 11.4); this is an accepted tradeoff, not an implementation error
- [ ] No "Deleted Exercises" section added to W-21 or any other surface (EX-001 §17 non-behavior)

### Entry Paths
- [ ] W-21 [+ New Exercise] → W-24 CREATE mode
- [ ] W-21 [+ New Exercise] disabled at 500-exercise limit (tooltip shown; W-24 not opened)
- [ ] W-22 pen icon (CUSTOM, authorId = viewer, isActive: true) → W-24 EDIT mode
- [ ] W-22 pen icon absent for FORGE exercises
- [ ] W-23 inline creation post-save "Add Details" CTA → W-24 EDIT mode for new exercise
- [ ] Post-import enrichment path: W-21 → W-22 → pen icon → W-24 EDIT mode

### Non-Behaviors Confirmed
- [ ] movementPattern not athlete-editable in W-24 (restriction scoped to W-24 only; future system enrichment via coach/AI/tooling not restricted — W24-D9)
- [ ] difficulty not exposed in W-24 UI
- [ ] FORGE exercises inaccessible in W-24
- [ ] No media upload UI in MVP
- [ ] No public sharing or visibility controls
- [ ] No restore affordance in W-24
- [ ] No draft persistence
- [ ] No batch edit or bulk delete

---

## Section 17 — Downstream Impact

| Document | Impact |
|----------|--------|
| `Exercise-001-Custom-Exercise-Architecture.md` | W-24 is now specified. The "future" reference in §4.4 and §20 is resolved. No edits to Exercise-001 required — W-24 honors all locked decisions. |
| `Exercise-Library-Architecture-v1.0.md` | Screen numbering collision noted (see top of document). Confirm whether Program Slot Builder retains W-24 designation or is renumbered. No behavioral changes to Exercise Library Architecture. |
| `Exercise-Library-Hub-Wireframe-Spec-W21.md` | When W-21 is written: [+ New Exercise] entry point in My Exercises section navigates to W-24 CREATE mode. |
| `Exercise-Detail-Wireframe-Spec-W22.md` | No edits required. The pen icon edit action already points to "edit flow" — W-24 is now that destination. |
| `Exercise-Picker-Wireframe-Spec-W23.md` | Minor addition: post-inline-creation confirmation state should include optional "Add Details" CTA that opens W-24 EDIT mode for the newly created exercise. |
| `M-6-Destructive-Action-Confirmation-Spec.md` | W-24's delete confirmation implements the M-6 pattern. No edits to M-6 required. |

---

## Section 18 — Future Backlog

### EX-R2 — Bulk Custom Exercise Management

Future evaluation may include:
- Multi-select actions on My Exercises in W-21
- Bulk archive (soft-delete multiple)
- Bulk restore
- Duplicate name cleanup tools
- Merge workflows for athletes with large imported exercise libraries

**MVP impact:** None. No architecture changes required now. No behavior in W-24 changes. This is a future operational enhancement intended for athletes who accumulate large custom exercise libraries via repeated imports. It is recorded here so future W-21 and exercise management workstreams have awareness of the planned enhancement.

---

## Section 19 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Defines W-24 as the full-screen Create / Edit Custom Exercise experience. Two modes (CREATE/EDIT) on a single screen. Approach B (name-first, all-optional single form) selected. Full-screen push navigation. 12 architecture decisions (W24-D1 through W24-D12). Media deferred to post-MVP (W24-D7). Delete workflow aligned to M-6 and EX-001-D7. Restore explicitly absent from W-24. All Exercise-001 rules honored. Screen numbering conflict with Program Slot Builder noted for resolution. |
| v1.0 R1 | June 2026 | Refinement pass R1 applied. R1-1 (Restore Accessibility): tombstone-only restore confirmed; restore gap for free-workout-only exercises explicitly acknowledged and documented as an intentional tradeoff (Section 11.4, W24-D11 updated). No new recovery surface added — EX-001 §17 non-behavior preserved. R1-2 (Movement Pattern Future Compatibility): W24-D9 reworded to scope the restriction to W-24 only; future movementPattern enrichment by coach systems, AI, or internal tooling explicitly preserved. Non-behaviors and validation checklist updated for both items. EX-R2 future backlog recorded. Screen numbering conflict resolved: W-24 confirmed as Create / Edit Custom Exercise; Program Slot Builder renumbered to W-28. |

---

*Forge Legacy — W-24: Create / Edit Custom Exercise — v1.0*
*June 2026*
*Implements Exercise-001-Custom-Exercise-Architecture.md.*
*Authority for all Custom Exercise creation and editing UX decisions.*
