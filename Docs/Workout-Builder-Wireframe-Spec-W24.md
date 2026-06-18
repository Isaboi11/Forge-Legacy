# W-24 Workout Builder
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** W-4 v1.1 (LOCKED), W-23 v1.0 (LOCKED), Exercise Domain Architecture v1.0 + Amendment 001 (LOCKED), ED-1–ED-6 (LOCKED), W-9 v1.0 (LOCKED), W-3 v1.2 (LOCKED), Product DNA (LOCKED)
**Implements:** Copy-Semantics slot data model (W-4 Decision 2), PickerContext `WORKOUT_BUILDER` (W-23 § 4.2), ED-5 (GIF Autoplay Policy), ExercisePrescription data model (§ 7.6)
**Navigated from:** W-3 Program Detail (workout slot card)
**Navigates to:** W-3 (back), W-23 (exercise picker modal), W-22 (detail sheet)

---

## 1. Screen Purpose

W-24 Workout Builder is the pre-session planning surface for program workouts in Forge Legacy.

It answers one question: **What exercises am I doing in this workout, in what order, and what am I targeting?**

The athlete who opens W-24 has a program with named workout slots and wants to plan the exercise content before starting. W-24 allows them to build an ordered exercise sequence — which exercises, in what order, for how many sets and reps — before a single set is logged.

**W-24 is not W-9.** W-9 is live execution — athletes log what they actually do. W-24 is pre-session planning — athletes design what they intend to do.

**W-24 is not W-23.** W-23 is the exercise selection interface. W-24 is the workout structure surface. W-23 is opened from within W-24 to pick exercises, but W-23 itself carries no structural information.

**W-24 is not W-4.** W-4 creates the program skeleton: a name and an ordered list of workout slot names with optional types. W-24 populates the content of each slot with exercises and prescriptions.

**What W-24 is:**
- A sequential exercise planner for a named program workout slot
- An entry point to W-23 Exercise Picker for exercise selection
- A prescription tool for sets, reps, and weight targets
- A drag-to-reorder surface for exercise sequencing

**What W-24 is not:**
- A live workout logging surface (that is W-9)
- An exercise browsing or discovery surface (that is W-21)
- A program structure builder — naming workouts and ordering slots (that is W-4)
- A workout execution surface

**The governing question:** Does this help the athlete arrive at their workout prepared?

**Emotional tone:** Purposeful. Structured. Calm.

---

## 2. Entry Points

### 2.1 Current Entry Points (MVP)

| Source | Trigger | Context Passed |
|--------|---------|---------------|
| W-3 Program Detail (Future or Active state, workout slot card) | "Build Workout" — slot has no exercises | `programId`, `slotIndex`, `slotName`, `slotType` |
| W-3 Program Detail (Future or Active state, workout slot card) | "Edit Workout" via slot overflow (⋯) — slot has exercises | `programId`, `slotIndex`, `slotName`, `slotType` |

W-3 requires an amendment (§ 22) to expose these entry points. The exact W-3 UI treatment is defined in that amendment.

### 2.2 Future Entry Points (Noted — Not Specced)

| Source | Trigger | Notes |
|--------|---------|-------|
| W-4 Program Creation | Tap workout slot → "Add Exercises" | Inline during program creation — V1.1 |
| W-1 Workouts Hub | "Plan" from upcoming program slot strip | Quick pre-session planning path — V1.1 |

### 2.3 Presentation Mode

W-24 is presented as a **push navigation screen** — it extends the W-3 navigation stack. It is not a modal, not a sheet.

**Rationale:** The athlete is navigating deeper into their program's content hierarchy (W-2 → W-3 → W-24). This is a hierarchical destination relationship, not a task overlay. Back-arrow navigation to W-3 is the correct affordance.

This contrasts with W-23 (full-screen modal), which is a task overlay that temporarily interrupts a caller's context and always returns on completion. W-24 is a destination the athlete navigates to with intention.

---

## 3. Exit Points

| Destination | Trigger | What Happens |
|-------------|---------|-------------|
| W-3 | Back button (header) | Auto-save triggers on exit; W-3 restored at prior scroll position |
| W-23 | "Add Exercise" CTA | W-23 opens as full-screen modal above W-24; W-24 state fully preserved |
| W-22 | Per-exercise overflow → "View Exercise Detail" | W-22 opens as sheet above W-24; no selection CTA injected |

**No cancel / no save button:** W-24 uses auto-save (§ 13). Every action — adding an exercise, changing a prescription, reordering — is committed immediately. There is no unsaved-changes state. The back arrow is never a destructive action.

---

## 4. Context Architecture

W-24 is always opened with a `WorkoutBuilderContext` from the caller:

```
WorkoutBuilderContext {
  programId:    string            // which program this workout belongs to
  slotIndex:    number            // position in the program's workout sequence (0-indexed)
  slotName:     string            // display name of this workout ("Push A", "Leg Day")
  slotType:     ActivityType | null  // from the W-4 slot record; null if untyped
}
```

**`slotName`** appears as the W-24 header title.

**`slotType`** governs two behaviors:
1. Passed to W-23 as `activityType` in `PickerContext` — enables context-aware catalog (e.g., MOBILITY → mobility-filtered exercise set per W-23 § 4.3)
2. Governs prescription field behavior in W-24 — MOBILITY/YOGA slots show Duration instead of Reps, hide Weight (§ 7.5)

---

## 5. Screen Structure

### 5.1 Layout Regions

W-24 has three regions: Header, Sectioned Content Area (scrollable), and Footer Affordances.

```
┌────────────────────────────────────────────────────┐
│  HEADER                                            │
│  [←]           Push A                             │
├────────────────────────────────────────────────────┤
│                                                    │
│  WARM-UP                              [⋯]          │  ← Optional section header
│  1.  [img] Arm Circles                   [⋯] [≡]  │
│            Sets  [ 3 ]  Duration  [ 30s ]          │
│  [+ Add Exercise]                                  │  ← Section-scoped Add CTA
│                                                    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─        │
│                                                    │
│  MAIN WORKOUT                                      │  ← Required section, no overflow
│  1.  [img] Bench Press                   [⋯] [≡]  │
│            Sets  [ 3 ]  Reps  [ 8 ]  135 lbs       │
│  2.  [img] Incline Dumbbell Press        [⋯] [≡]  │
│            Sets  [ 3 ]  Reps  [10 ]  60 lbs        │
│  [+ Add Exercise]                                  │
│                                                    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─        │
│                                                    │
│  COOL-DOWN                            [⋯]          │  ← Optional section header
│  1.  [img] Pec Stretch                   [⋯] [≡]  │
│            Sets  [ 2 ]  Duration  [ 30s ]          │
│  [+ Add Exercise]                                  │
│                                                    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─        │
│                                                    │
│  (no footer — both optional sections created)      │  ← Footer affordances when absent
│                                                    │
└────────────────────────────────────────────────────┘
```

### 5.2 Header

```
[←]           Push A
```

- **Back button:** Left-aligned, 44pt touch target, navigates to W-3
- **Title:** `slotName` from context, centered, 17sp, primary weight
- **No overflow in header:** Actions are scoped to section headers and exercise cards
- **No Save button:** Auto-save model (§ 13)

### 5.3 Sectioned Content Area

Scrollable content area containing all sections in fixed order: Warm-Up → Main Workout → Cool-Down. Each section is a container with a labeled header and an ordered list of exercise cards.

Sections are separated by a muted divider. The scroll is continuous — the athlete does not "enter" a section separately.

### 5.4 Per-Section Add Exercise CTA

Each section has its own `[+ Add Exercise]` CTA immediately below its last exercise card (or as the primary element in an empty section state). Section-scoped: tapping this CTA opens W-23 with W-24 tracking which section called it.

### 5.5 Section Architecture

W-24 organizes exercises into up to three sections. Sections are defined by type, not by name — they cannot be renamed in MVP.

| Section | Type | Required? | Default |
|---------|------|-----------|---------|
| Warm-Up | `WARM_UP` | Optional | Absent until created |
| Main Workout | `MAIN` | Required | Always present |
| Cool-Down | `COOL_DOWN` | Optional | Absent until created |

**Creating optional sections:**
When `WARM_UP` or `COOL_DOWN` is absent, a footer affordance row appears below all existing sections:
```
  [Add Warm-Up]   [Add Cool-Down]
```
(Each affordance appears only for its absent section. When both are created, the footer row disappears.)

Tapping an affordance creates the `WorkoutSection` record immediately — even if the athlete subsequently cancels W-23 without selecting an exercise. The section persists as empty. See § 14.5 for empty section states.

**Section header appearance:**
```
WARM-UP                                         [⋯]
```
- 12sp, uppercase, muted secondary text
- Trailing [⋯] for optional sections (WARM-UP, COOL-DOWN) — opens section action sheet
- MAIN WORKOUT header has no [⋯] — it cannot be removed

**Section visual separation:** Muted hairline divider between sections.

**Cross-section exercise movement:**
Exercises cannot be dragged across sections (drag-to-reorder operates within a single section only). To move an exercise to a different section, use the per-exercise overflow (⋯) → "Move to [Section]". See § 6.3.

---

## 6. Exercise Slot Anatomy

### 6.1 The Exercise Card

Each exercise in W-24 is rendered as an exercise card:

```
┌────────────────────────────────────────────────────────┐
│  3.  [img ] Overhead Press                  [⋯]  [≡]  │
│             [Shoulders] [Triceps]                       │
│                                                         │
│             Sets         Reps        Weight             │
│             [−][ 4 ][+]  [−][ 5 ][+]  [−][ —— ][+]    │
│                                                         │
│             [+ Add note]                                │
└────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Spec |
|-----------|------|
| Position number | Left-aligned integer (1., 2., 3.), 15sp, muted secondary text |
| Thumbnail | 48pt × 48pt, static `gifThumbnailUrl` (ED-5: no autoplay in W-24) |
| Exercise name | 15sp, primary weight, 2-line max |
| Primary muscle chips | Max 2, 11sp, muted filled (same as W-23 row anatomy) |
| Overflow icon (⋯) | 24pt icon, 44pt × 44pt touch target |
| Drag handle (≡) | 24pt icon, 44pt × 44pt touch target |
| Prescription row | Sets / Reps / Weight steppers (§ 7) |
| Notes row | Collapsible freeform text field (§ 8) |
| Card height | ≥120pt (name + chips + prescription row + notes collapsed) |

### 6.2 Thumbnail and Exercise Identity

- Static `gifThumbnailUrl` per ED-5 — GIF autoplay only in W-22 hero
- Null thumbnail: dark placeholder with exercise name initial, 16sp, warm muted text
- Exercise name resolved from exercise catalog by `exerciseId` at render time

### 6.3 Per-Exercise Overflow (⋯)

Tapping ⋯ opens a bottom action sheet. The available "Move to" actions depend on which section the exercise is currently in:

**Exercise in WARM-UP:**
```
  Move to Main Workout
  Move to Cool-Down    ← only if COOL_DOWN section exists
  View Exercise Detail
  Remove from Workout
  ─────────────────
  Cancel
```

**Exercise in MAIN WORKOUT:**
```
  Move to Warm-Up      ← only if WARM_UP section exists
  Move to Cool-Down    ← only if COOL_DOWN section exists
  View Exercise Detail
  Remove from Workout
  ─────────────────
  Cancel
```

**Exercise in COOL-DOWN:**
```
  Move to Warm-Up      ← only if WARM_UP section exists
  Move to Main Workout
  View Exercise Detail
  Remove from Workout
  ─────────────────
  Cancel
```

- **Move to [Section]:** Moves the exercise to the target section. The exercise is appended to the bottom of the target section's exercise list. `order` fields are renumbered in both the source and target sections. Auto-save triggers.
- **View Exercise Detail:** Opens W-22 as a sheet above W-24 (§ 12)
- **Remove from Workout:** Removes the exercise from this section (§ 11)
- **Cancel:** Dismisses the sheet

"Move to" actions for sections that don't exist are omitted from the sheet. If only the MAIN section exists, no "Move to" actions appear.

### 6.4 Deleted Exercise in Slot

If an exercise in the slot has been deleted from the catalog after being added to W-24:

```
┌────────────────────────────────────────────────────────┐
│  2.  [░░░░] [Deleted Exercise]              [⋯]  [≡]  │
│             Sets  [ 3 ]  Reps  [ 8 ]  ——               │
│             (read-only)                                 │
└────────────────────────────────────────────────────────┘
```

- Name: "[Deleted Exercise]" in muted text
- Thumbnail: dark placeholder
- Prescription: shown, read-only (retained — History Cannot Be Rewritten applies to stored planning data)
- Overflow: "Remove from Workout" only — "View Exercise Detail" absent (no W-22 for a deleted exercise)
- No error alert, no warning banner — the card handles this gracefully

---

## 7. Set Prescription Model

### 7.1 Fields Per Exercise

Each exercise card has a prescription row with up to three stepper inputs:

| Field | Label | Required? | Type | Notes |
|-------|-------|-----------|------|-------|
| Sets | "Sets" | Recommended | Integer ≥ 1 | Number of planned sets |
| Reps | "Reps" | Optional | Integer ≥ 1 | Target reps per set; all sets share this target (MVP) |
| Weight | "Weight" | Optional | Decimal + unit | Target weight per set; blank for bodyweight |

All fields are **optional** — the athlete may leave any field empty. Empty fields display as "——" in the stepper.

**Rationale for optional fields:**
- Bodyweight exercises have no weight target
- Duration-based exercises (planks, holds) are better annotated via Notes (§ 8)
- Some athletes plan sets without committing to a specific rep count
- Forcing entry would block athletes who plan intuitively

### 7.2 Stepper Input Anatomy

Each prescription field is a compact stepper:

```
[−]  [  8  ]  [+]
```

- **− button:** Decrements by 1 (or smallest valid unit for weight). Minimum 44pt × 44pt touch target.
- **Value display:** Tap to type directly — opens numeric keyboard
- **+ button:** Increments. Minimum 44pt × 44pt touch target.
- Minimum value: 1 for Sets/Reps; 0.5 lbs / 0.25 kg for Weight
- No maximum enforced

### 7.3 Weight Unit

- **Unit:** lbs or kg, defaulting to athlete profile preference
- **Unit selector:** Adjacent to the weight stepper; tap to toggle between lbs/kg
- **Scope:** Unit is global across all exercises in the W-24 session (not per-exercise)
- **Storage:** Stored as `weightValue` + `weightUnit` enum on the `ExercisePrescription` record (§ 7.6)

### 7.4 MVP Prescription Scope

MVP: One prescription per exercise, applied uniformly to all sets.

Rationale: "3 sets × 8 reps × 135 lbs" covers the majority of real training protocols. Individual set-level prescription (warmup sets, pyramid loading) is a V1.1 enhancement.

### 7.5 Activity Type Adaptation

When `slotType` is MOBILITY or YOGA:

| Standard field | Adapted field |
|---------------|--------------|
| Reps | Duration (integer + unit: Seconds / Minutes) |
| Weight | **Hidden entirely** |
| Sets | Sets (unchanged) |

Mobility exercises are measured in time, not load. Displaying weight fields for a yoga pose creates incongruity.

When Duration is used, the value is stored in `durationSeconds` on the `ExercisePrescription` record. The `reps` field remains null. W-9 reads `durationSeconds` when present and displays the reference line accordingly.

### 7.6 Slot Data Model Extension

W-24 extends the W-4 program slot data model with a section-first architecture. The `ProgramSlot` record is extended as follows:

```
ProgramSlot {
  name:             string
  type:             ActivityType | null
  originTemplateId: string | null
  sections:         WorkoutSection[]         // replaces the former flat exercises[]; see WS-A1
}
```

Each element in `sections` is a `WorkoutSection`:

```
WorkoutSection {
  type:      'WARM_UP' | 'MAIN' | 'COOL_DOWN'
  exercises: ExercisePrescription[]          // ordered within the section by ExercisePrescription.order
}
```

Each element in `WorkoutSection.exercises` is an `ExercisePrescription`:

```
ExercisePrescription {
  exerciseId:       string        // references the exercise catalog record
  order:            number        // 1-indexed position within the section (not global)
  sets:             number | null // null = not set by athlete
  reps:             number | null // populated for non-MOBILITY/YOGA slots; null otherwise
  durationSeconds:  number | null // populated for MOBILITY/YOGA slots; null otherwise
  weightValue:      number | null // null for bodyweight or unset
  weightUnit:       'lbs' | 'kg' | null
  notes:            string | null // athlete planning notes; max 200 chars
}
```

**Section invariants:**
- A new slot is initialized with `sections: [{ type: 'MAIN', exercises: [] }]` — one MAIN section, no exercises.
- `WARM_UP` and `COOL_DOWN` sections are absent from `sections[]` until the athlete explicitly creates them. Absent is distinct from present-with-empty-exercises: absent means the section hasn't been created; present-with-empty means it was created but has no exercises yet.
- Section order in rendering is always WARM_UP → MAIN → COOL_DOWN, enforced by render sort. No `order` field on `WorkoutSection` is needed for MVP.
- The MAIN section cannot be removed. `WARM_UP` and `COOL_DOWN` sections can be removed by explicit athlete action (§ 11.4).

**ExercisePrescription invariants:**
- `reps` and `durationSeconds` are mutually exclusive. Only one is non-null for any given prescription. Which field is active is determined by `slotType` at write time.
- `ExercisePrescription.order` is per-section (1-indexed within the section, not global). Positions in Warm-Up are independent of positions in Main Workout.
- W-24 writes `ExercisePrescription` records. W-9 reads them as reference-only. W-9 never mutates these records.
- Prescriptions are part of the slot record — Copy-Semantics (W-4 Decision 2, LOCKED) applies. Slot data, including all sections and exercises, is self-contained and independent.

---

## 8. Notes Per Exercise

Each exercise card has a collapsible Notes field:

**Collapsed (default):**
```
[+ Add note]
```

**Expanded:**
```
[Drive elbows down, keep tight arch               ]
```

- Tap "Add note" → field expands, keyboard opens
- Freeform text, 200-character max
- Notes appear in W-9 as read-only reference text below the exercise card during live execution
- Notes persist with the slot record and are not cleared between planning sessions
- Collapsing: clearing the notes text and tapping outside re-collapses to "Add note"

---

## 9. Adding Exercises — W-23 Integration

### 9.1 The Add Exercise CTA

`[+ Add Exercise]` appears:
- Centered in the empty state (§ 14.1), primary-styled
- Below the last exercise card in the list (secondary-styled, full-width, 44pt height)

### 9.2 PickerContext Passed to W-23

On CTA tap, W-24 opens W-23 as a full-screen modal with:

```
PickerContext {
  source:               'WORKOUT_BUILDER'
  activityType:         slotType | null     // from WorkoutBuilderContext
  slotIndex:            slotIndex           // from WorkoutBuilderContext
  replacingExerciseId:  null                // always null — adding, not replacing
}
```

If `slotType` is MOBILITY or YOGA, W-23 applies the mobility-filtered catalog (W-23 § 4.3). This is handled entirely in W-23 — W-24 passes the type and receives a single `exerciseId` back.

### 9.3 On W-23 Exercise Selection

When the athlete selects an exercise in W-23:
1. W-23 dismisses (full-screen modal clears)
2. W-24 is back in view
3. Selected exercise is **appended to the bottom of the calling section's exercise list** — the section that opened W-23 (determined by which section's "[+ Add Exercise]" CTA was tapped)
4. New `ExercisePrescription` record is created with all fields null except `exerciseId` and `order` (order = section's current exercise count + 1)
5. New exercise card appears with all prescription steppers showing "——"
6. Brief warm background highlight on the new card (suppressed by Reduce Motion)
7. List scrolls to show the new card within its section

### 9.4 On W-23 Cancel

Cancel in W-23 → modal dismisses → W-24 unchanged. No exercise is added. The section that opened W-23 is unaffected.

### 9.5 No Duplicate Guard

The same exercise may appear multiple times in W-24. Some training protocols use the same movement as both an opener and a finisher. No deduplication is applied.

### 9.6 Per-Session Single Selection

Per W23-D13 (LOCKED), W-23 returns one `exerciseId` per picker session. To add multiple exercises, the athlete taps "+ Add Exercise" multiple times. Multi-selection is V1.1.

---

## 10. Reordering Exercises

### 10.1 Drag to Reorder

The drag handle (≡) activates reordering.

**Interaction:**
1. Touch and hold the drag handle
2. Card lifts — shadow elevation increases (Reduce Motion: no lift animation, shadow change only)
3. Drag up or down to new position
4. Other cards shift in real time to show the insertion point
5. Release to drop

### 10.2 Position Numbers Update

Position numbers (1., 2., 3.) update immediately on drop to reflect the new sequence within the section. The `order` field on each `ExercisePrescription` record in the section is renumbered accordingly. Position numbers are per-section — they restart at 1. for each section independently.

Drag-to-reorder operates within one section only. An exercise cannot be dragged across a section boundary.

### 10.3 Accessibility Reorder

Drag-to-reorder via a handle is inaccessible via VoiceOver and Switch Access. Alternative mechanism:
- In screen reader mode: each exercise card's rotor includes "Move Up" and "Move Down" actions
- These reposition the card by one step within the section and announce: "[Exercise Name] moved to position [N] in [Section Name]"
- "Move Up" disabled for the first exercise in its section; "Move Down" disabled for the last exercise in its section
- Cross-section movement via VoiceOver: use the per-exercise overflow "Move to [Section]" action (accessible via the ⋯ accessible element)

### 10.4 Reorder and W-9

The exercise order in W-24 is the order W-9 presents exercises within each section when the workout is started. Athletes sequence their workout in W-24 on a per-section basis; W-9 respects the `order` field on each `ExercisePrescription` record as the program prescription.

### 10.5 Cancelled Drag Behavior

If the athlete initiates drag-to-reorder but releases without completing a valid drop:
- The exercise card **returns to its original position**
- No reorder operation occurs
- **No save is triggered** — auto-save (§ 13) fires only on a completed drop
- Position numbers are not updated

This matches standard native drag behavior on iOS and Android.

---

## 11. Removing Exercises

### 11.1 Remove Entry Points

1. **Swipe left on exercise card** → "Remove" swipe action at trailing edge
2. **⋯ → "Remove from Workout"**

### 11.2 Remove Confirmation

**No prescription data (all fields null and no notes):** Remove immediately, no confirmation.

**Has prescription data (any field non-null, or notes present):** Confirmation sheet:

```
Remove Bench Press?

Prescription data will be deleted.

[Remove]     [Cancel]
```

- "Remove" uses destructive color
- "Cancel" dismisses the sheet, no action
- No undo after confirming
- The `ExercisePrescription` record is deleted from the section's `exercises` array

### 11.3 Position Numbers After Removal

Position numbers update immediately within the section. The gap is closed. The `order` field on remaining `ExercisePrescription` records in the section is renumbered starting from 1. Exercises in other sections are unaffected.

### 11.4 Section Removal

Optional sections (WARM-UP and COOL-DOWN) can be explicitly removed via the section header overflow (⋯). MAIN WORKOUT cannot be removed.

**Section header overflow (⋯) action sheet:**
```
  Remove Warm-Up     ← destructive text color
  ─────────────────
  Cancel
```

**Empty section removal (no exercises):**
Remove triggers immediately, no confirmation. No data is lost.

**Non-empty section removal (exercises present):**
Confirmation sheet before removing:

```
Remove Warm-Up?

All warm-up exercises and their
prescription data will be deleted.

[Remove Warm-Up]     [Cancel]
```

- "Remove Warm-Up" uses destructive color
- No undo after confirming
- All `ExercisePrescription` records in the section are permanently deleted
- The `WorkoutSection` record is removed from `ProgramSlot.sections[]`
- Auto-save triggers immediately
- The "Add Warm-Up" / "Add Cool-Down" footer affordance reappears — the section can be re-created

**MAIN WORKOUT cannot be removed:**
The MAIN section header has no overflow icon (⋯). No removal action exists. This is enforced in the UI (no overflow target) and enforced server-side (MAIN section delete operations are rejected).

---

## 12. W-22 Integration

### 12.1 Opening W-22 from W-24

Via ⋯ → "View Exercise Detail" on any exercise card.

W-22 opens as a **sheet above W-24** (covers W-24 entirely). W-24 state is fully preserved — scroll position, prescription values, notes content.

GIF autoplays in the W-22 sheet per ED-5: GIF autoplay in W-22 regardless of entry point.

### 12.2 No "Select This Exercise" CTA

The "Select This Exercise" CTA is **not injected** when W-22 is opened from W-24. That CTA is exclusively a W-23-context behavior (W23-D11, LOCKED). In W-24 context, the athlete is reviewing an already-added exercise — selection is not the action.

### 12.3 W-22 Alternatives (W-24 Context)

Alternatives in W-22 are fully functional for reference. Tapping an alternative opens W-22 for that alternative as a sheet above W-22 A.

Browsing alternatives does NOT replace the exercise in the W-24 slot — there is no "Replace with This Exercise" CTA. If the athlete wants to substitute an exercise, they return to W-24 and use the Remove + Add Exercise flow.

### 12.4 Dismissing W-22

Back gesture or back button in W-22 → sheet dismisses → W-24 restored at prior state.

---

## 13. Save Behavior

### 13.1 Auto-Save Model

W-24 uses **auto-save**. There is no Save button, no save confirmation, no unsaved-changes state.

Changes are saved immediately when:
- An exercise is added (W-23 returns `exerciseId` → `ExercisePrescription` created → saved)
- An exercise is removed (confirmed → `ExercisePrescription` deleted → saved)
- An exercise is reordered (drag successfully dropped → `order` fields updated → saved)
- A prescription field value is committed (field blur, stepper tap)
- Notes are changed (field blur)

A cancelled drag (§ 10.5) does not trigger a save.

### 13.2 Back Navigation

When the athlete taps the back button:
- If a prescription field is active (keyboard open): current value is committed, then navigation proceeds
- No "Discard changes?" dialog — there are no unsaved changes to discard

### 13.3 Offline Save

Changes are saved to local storage immediately and queued for sync when offline. A subtle "Changes pending sync" indicator appears below the header when unsynced local changes exist. It disappears when connectivity returns and sync completes.

The athlete can continue planning offline without interruption.

### 13.4 W-3 Reflects W-24 Immediately

After returning from W-24, the workout slot card in W-3 reflects the current exercise count (e.g., "3 exercises") immediately — W-3 reads from the same slot record that W-24 writes to.

---

## 14. States

### 14.1 Empty State (No Exercises Built — New Slot)

When a slot has only the MAIN section (created by default) with no exercises, and no optional sections have been added:

```
┌────────────────────────────────────────────────────┐
│  [←]    Push A                                     │
├────────────────────────────────────────────────────┤
│                                                    │
│  MAIN WORKOUT                                      │
│                                                    │
│    No exercises added yet.                         │
│    [+ Add Exercise]                                │
│                                                    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─        │
│                                                    │
│  [Add Warm-Up]   [Add Cool-Down]                   │  ← footer affordances
│                                                    │
└────────────────────────────────────────────────────┘
```

- MAIN WORKOUT section header is always present; it has no overflow icon
- Empty state copy: "No exercises added yet." — 13sp, muted
- "[+ Add Exercise]" — primary-styled within the section (Main Workout is the primary training surface)
- Footer affordances: tertiary [Add Warm-Up] and [Add Cool-Down] — appear when the respective sections don't exist yet
- This is an invitation, not an error — the structure is visible and ready

### 14.2 All Prescription Fields Empty (Exercises Present)

Valid state. Exercises exist in the slot but prescription fields are all null. The prescription row shows "——" for each field.

W-9 launched from a slot in this state: exercises are pre-loaded in order, but no reference targets appear in W-9's set input panel.

### 14.3 Exercise Catalog Unavailable (Offline, Uncached)

If the exercise catalog is not cached and the device is offline, tapping "+ Add Exercise" results in an inline message:

```
Exercise catalog unavailable offline.
Connect to add exercises.
```

Existing exercises in the slot remain viewable, reorderable, and removable.

### 14.4 Deleted Exercise in Slot

Covered in § 6.4. Gracefully degraded card — "[Deleted Exercise]", placeholder thumbnail, prescription retained read-only, Remove action available.

### 14.5 Empty Section State (Section Created, No Exercises)

When a `WARM_UP` or `COOL_DOWN` section has been created but has no exercises (`exercises: []`):

```
WARM-UP                                         [⋯]

  No exercises added yet.

  [+ Add Exercise]
```

- Section header: "WARM-UP" (or "COOL-DOWN"), 12sp, uppercase, muted
- Trailing [⋯] on section header: tap → "Remove Warm-Up" action sheet
- Empty state copy: "No exercises added yet." — 13sp, muted, not aspirational
- "[+ Add Exercise]" — secondary-styled (lower visual priority than MAIN WORKOUT's primary CTA)
- This is a valid, intentional state — the athlete created the section structure and has not yet added content

**Empty section in W-9:** An empty section in the plan (zero exercises) is invisible in W-9 execution. No section header is rendered for empty sections. Only sections with at least one exercise produce a section header in W-9 (§ WS-A2).

---

## 15. Loading States

### 15.1 Initial W-24 Open

When the slot has existing exercises (returning to a previously built workout):

```
[←]    Push A

  [skeleton card, 120pt]
  [skeleton card, 120pt]
  [skeleton card, 120pt]

[+ Add Exercise]
```

- Skeleton shimmer for exercise cards
- Header and "+ Add Exercise" CTA visible immediately (no data required)
- If data is cached: render instantly, suppress skeleton entirely

### 15.2 After W-23 Exercise Selection

The selected exercise card appears immediately — no loading state. Exercise catalog is typically fully cached; `exerciseId` resolves to a card without a network request.

### 15.3 Auto-Save is Silent

No loading indicator, no "Saving…" state. If a save fails (network error), the "Changes pending sync" indicator (§ 13.3) persists.

### 15.4 Reduce Motion

All skeleton shimmer animations replaced with static muted placeholders. No card entry animation. No card highlight flash on W-23 selection.

---

## 16. Offline Behavior

| Operation | Offline Behavior |
|-----------|-----------------|
| View existing exercises | Always available (local data) |
| Reorder exercises | Available (local operation, queued sync) |
| Remove exercises | Available (local operation, queued sync) |
| Edit prescription fields | Available (local operation, queued sync) |
| Edit notes | Available (local operation, queued sync) |
| Add exercises via W-23 | Requires cached exercise catalog; inline message if uncached |
| View exercise detail (W-22) | Per W-22 offline behavior: full if cached, degraded if not |
| Back to W-3 | Always available |

Offline changes sync automatically when connectivity returns. No manual sync action required.

---

## 17. Accessibility

### 17.1 Touch Targets

| Element | Minimum |
|---------|---------|
| Back button | 44pt |
| Exercise card region | 44pt height (card ≥120pt — exceeds minimum) |
| Overflow icon (⋯) | 44pt × 44pt |
| Drag handle (≡) | 44pt × 44pt |
| Stepper − button | 44pt × 44pt |
| Stepper value tap | 44pt × 44pt |
| Stepper + button | 44pt × 44pt |
| Notes "Add note" | 44pt height |
| Add Exercise CTA (per section) | 44pt height |
| Section header row | ≥44pt height |
| Section overflow icon (⋯) | 44pt × 44pt |
| Footer "Add Warm-Up" / "Add Cool-Down" | 44pt height |

### 17.2 Screen Reader Labels

| Element | Accessible Label |
|---------|----------------|
| Back button | "Back to [slotName]" |
| Exercise card | "[N]. [Exercise Name], [Primary Muscles]" |
| Overflow (⋯) | "More options for [Exercise Name]" |
| Drag handle (≡) | "[Exercise Name] drag handle, double-tap and hold to reorder" |
| Sets stepper − | "Decrease sets for [Exercise Name]" |
| Sets value | "Sets for [Exercise Name], [value]" |
| Sets stepper + | "Increase sets for [Exercise Name]" |
| Reps stepper − | "Decrease reps for [Exercise Name]" |
| Reps value | "Reps for [Exercise Name], [value]" |
| Reps stepper + | "Increase reps for [Exercise Name]" |
| Weight stepper − | "Decrease weight for [Exercise Name]" |
| Weight value | "Weight for [Exercise Name], [value] [unit]" |
| Weight stepper + | "Increase weight for [Exercise Name]" |
| Duration field (MOBILITY/YOGA) | "Duration for [Exercise Name]" |
| Notes collapsed | "Add note for [Exercise Name]" |
| Notes expanded | "Note for [Exercise Name]" |
| Add Exercise CTA (per section) | "Add an exercise to [Section Name]" |
| Section header (WARM-UP, MAIN WORKOUT, COOL-DOWN) | "[Section Name] section" |
| Section overflow (⋯) | "Options for [Section Name]" |
| Footer "Add Warm-Up" | "Add Warm-Up section" |
| Footer "Add Cool-Down" | "Add Cool-Down section" |
| "Changes pending sync" | "Changes pending sync" (announced once on appearance) |

### 17.3 VoiceOver Reorder Actions

VoiceOver rotor for each exercise card includes:
- "Move Up" — repositions card one position up within the section, announces "[Exercise Name] moved to position [N] in [Section Name]"
- "Move Down" — repositions card one position down within the section, announces "[Exercise Name] moved to position [N] in [Section Name]"
- "Move Up" disabled for the first exercise in its section; "Move Down" disabled for the last exercise in its section
- Cross-section movement: accessible via the exercise card's overflow (⋯) → "Move to [Section Name]"

### 17.4 Focus Order

1. Back button
2. For each section (Warm-Up → Main Workout → Cool-Down, present only):
   - Section header accessible element ("[Section Name] section")
   - Section overflow (⋯) if optional section (absent for MAIN WORKOUT)
   - For each exercise card in the section (top to bottom):
     - Card accessible element (name + muscles announcement)
     - Overflow icon (⋯) per exercise
     - Drag handle (≡)
     - Sets stepper: −, value, +
     - Reps stepper: −, value, + (hidden for MOBILITY/YOGA)
     - Duration field (MOBILITY/YOGA only)
     - Weight stepper: −, value, +, unit toggle (hidden for MOBILITY/YOGA)
     - Notes: "Add note" or notes field
   - Section "[+ Add Exercise]" CTA
3. Footer "Add Warm-Up" (if WARM-UP absent)
4. Footer "Add Cool-Down" (if COOL-DOWN absent)

### 17.5 Reduce Motion

- No skeleton shimmer — static muted placeholder cards
- No lift animation during drag — immediate repositioning
- No card highlight flash on exercise added
- Stepper increments: instant value change, no animation

---

## 18. Navigation Specification

### 18.1 Navigation Matrix

| Current State | Action | Result |
|---------------|--------|--------|
| W-24 | Back button | Auto-save completes; W-3 restored at prior position |
| W-24 | Section "[+ Add Exercise]" CTA | W-23 opens as full-screen modal; calling section tracked |
| W-23 (from W-24) | Select exercise | W-23 dismisses; exercise appended to calling section |
| W-23 (from W-24) | Cancel | W-23 dismisses; W-24 unchanged; calling section unaffected |
| W-24 exercise card | Tap ⋯ | Per-exercise action sheet opens (with section-aware "Move to" actions) |
| Action sheet | "Move to [Section]" | Exercise moved to target section; order fields renumbered; auto-save |
| Action sheet | "View Exercise Detail" | W-22 opens as sheet above W-24 |
| W-22 (from W-24 via ⋯) | Back / dismiss gesture | W-22 sheet dismisses; W-24 restored |
| W-22 (from W-24) | Alternative tap | W-22 B opens as sheet above W-22 A |
| W-22 B (from W-24 via alternatives) | Back | W-22 B dismisses; W-22 A visible |
| Action sheet | "Remove from Workout" | Confirmation (if prescription data); card removed on confirm |
| W-24 card | Swipe left | Remove swipe action revealed at trailing edge |
| W-24 | Drag handle held | Drag-to-reorder within section active; cannot cross section boundary |
| W-24 | Drag cancelled (no valid drop) | Card returns to original position; no save triggered |
| W-24 footer | "Add Warm-Up" tap | WARM_UP WorkoutSection created; W-23 opens to add first exercise |
| W-24 footer | "Add Cool-Down" tap | COOL_DOWN WorkoutSection created; W-23 opens to add first exercise |
| W-24 section header | Tap [⋯] (optional sections only) | Section action sheet opens |
| Section action sheet | "Remove [Section Name]" — empty section | Section removed immediately; footer affordance reappears |
| Section action sheet | "Remove [Section Name]" — non-empty section | Confirmation sheet shown |
| Section removal confirmation | "Remove [Section Name]" | All exercises deleted; section record removed; footer affordance reappears |

### 18.2 Header State

W-24 has one header state at all times:

| Header Left | Header Title | Header Right |
|-------------|-------------|-------------|
| ← (back arrow) | [slotName] | — (none) |

### 18.3 Tab Bar

The bottom tab bar remains visible in W-24. W-24 is push navigation within the Workouts tab screen hierarchy — it does not suppress the tab bar.

### 18.4 Starting Workouts from W-3, Not W-24

Workout execution is initiated from W-3 "Start Next Workout," not from within W-24. After building the workout in W-24, the athlete navigates back to W-3, where "Start Next Workout" launches W-9 with the pre-built exercise list.

W-24 is a planning surface. W-3 is the dispatch point. W-9 is the execution surface.

---

## 19. W-9 Integration

### 19.1 Pre-Loaded Exercise List

When a program slot's `sections` array contains exercises (any section has at least one `ExercisePrescription`), starting that workout from any valid entry point (W-1 Program Card, W-3 Active state "Start Next Workout," H-1 "Continue Program") launches W-9 with those exercises pre-loaded and organized by section.

W-9 receives from the program slot:
- `sections[]` array sorted in WARM_UP → MAIN → COOL_DOWN order
- Within each section: `ExercisePrescription` records sorted by `order` field
- Per-exercise: `sets`, `reps` or `durationSeconds`, `weightValue`, `weightUnit`, `notes`
- W-9 renders section headers (12sp, uppercase, muted) between exercise groups for sections with at least one exercise. Empty sections produce no section header in W-9.

### 19.2 Prescription as Reference Only

In W-9, W-24 prescriptions appear as **muted reference text** in the set input panel:

```
Bench Press
Set 1 of 3
──────────────────────────────────
  Target: 8 reps × 135 lbs       ← 13sp, muted secondary text

  Weight  [    ]  lbs
  Reps    [    ]
```

- Reference text is 13sp, muted secondary — visible below the input fields
- Athletes log actual values freely; any deviation from prescription is valid and untracked
- W-9 never flags, blocks, or comments on deviations
- If no prescription exists for an exercise (all fields null), the reference line is absent

### 19.3 Free-Form W-9 Path Unaffected

Athletes can start a W-9 session from a program slot where the MAIN section has no exercises (all sections empty). W-9 opens with an empty exercise list and "Add Exercise" → W-23 for live building. This path is entirely unchanged.

W-24 enhances W-9 for athletes who want to plan ahead — it does not gate the existing W-9 flow.

---

## 20. Non-Behaviors

W-24 does not and will never:

| Non-Behavior |
|-------------|
| Log sets, reps, or weights as actual session data (that is W-9) |
| Autoplay GIF animations on exercise thumbnails (ED-5: GIF autoplay only in W-22 hero) |
| Browse or search exercises independently (that is W-21 and W-23) |
| Be presented as a modal (it is always push navigation within a screen stack) |
| Display a Save button (auto-save model — no save state to manage) |
| Display a Cancel button (no unsaved-changes state exists) |
| Display a "Start Workout" CTA — workout starts from W-3 "Start Next Workout" |
| Create timeline entries, honors, chapter events, or legacy data |
| Display workout history, PRs, or performance trends for any exercise |
| Add per-set level prescriptions with different rep/weight targets per set (V1.1) |
| Auto-suggest prescriptions from past session history (V1.1 candidate) |
| Prevent the athlete from adding the same exercise multiple times |
| Enforce a minimum exercise count — a 0-exercise slot (empty `exercises` array) is valid |
| Create a reusable "template library" entity — the slot owns its data via Copy-Semantics |
| Show which other program slots contain the same exercises |
| Support multi-exercise selection from W-23 in a single picker session (V1.1 per W23-D13) |
| Display program-level information (program name, total workout count — that is W-3) |
| Inject "Select This Exercise" or "Replace with This Exercise" into W-22 |
| Allow the athlete to lock or protect prescription fields after logging against them |
| Access slots in Graduated or Ended Early programs (sealed legacy records — not editable) |
| Write W-9 logged (actual) values back to W-24 slot prescriptions — execution records and plan prescriptions are always independent. `ExercisePrescription` fields are written only by W-24 and are never mutated by W-9. |
| Display a "Custom" label on exercise cards — custom exercises are visually identical to system exercises in W-24. Source labeling is a W-23 selection-context behavior. In the planning context of W-24, the athlete knows what they added; the distinction adds no value. |
| Allow exercises to be dragged across section boundaries — cross-section movement uses the per-exercise overflow "Move to [Section]" action; drag handles operate within one section only. |
| Allow sections to be reordered — sections are always rendered in fixed order (WARM_UP → MAIN → COOL_DOWN); this order is not configurable in MVP. |
| Support custom section names or additional section types — MVP supports exactly three section types (WARM_UP, MAIN, COOL_DOWN); custom naming and additional types are V1.1. |
| Remove the MAIN WORKOUT section — MAIN is the required section; it cannot be removed, renamed, or reordered. |
| Automatically remove a WARM_UP or COOL_DOWN section when its last exercise is deleted — sections persist until explicitly removed by the athlete. Removing the last exercise produces an empty section state (§ 14.5), not a deleted section. |

---

## 21. Validation Checklist

### Navigation and Presentation
- [ ] W-24 is push navigation (not a modal, not a sheet)
- [ ] Tab bar remains visible in W-24
- [ ] Back button returns to W-3 (auto-save on exit)
- [ ] No Save button in header
- [ ] No Cancel button
- [ ] Header title = `slotName` from context, 17sp, centered

### Context Architecture
- [ ] `slotName` displayed as header title
- [ ] `slotType` passed to W-23 as `activityType` in PickerContext
- [ ] MOBILITY/YOGA `slotType` → Reps label becomes "Duration", Weight hidden, `durationSeconds` used in storage
- [ ] Strength/other `slotType` → Sets, Reps, Weight all visible, `reps` used in storage

### Data Model
- [ ] `ProgramSlot.sections` is a `WorkoutSection[]` (default: one MAIN section, empty exercises[])
- [ ] `WorkoutSection` contains: `type` ('WARM_UP' | 'MAIN' | 'COOL_DOWN'), `exercises: ExercisePrescription[]`
- [ ] `ExercisePrescription` contains: `exerciseId`, `order` (per-section), `sets`, `reps`, `durationSeconds`, `weightValue`, `weightUnit`, `notes`
- [ ] `reps` and `durationSeconds` are mutually exclusive on any given prescription
- [ ] `ExercisePrescription.order` is per-section; numbering restarts at 1 for each section
- [ ] W-9 reads `ExercisePrescription` records; never writes to them

### Exercise Cards
- [ ] Exercises in slot order per `order` field, position numbers 1., 2., 3.
- [ ] Thumbnails static, not animated (ED-5)
- [ ] Exercise name: 15sp, primary weight
- [ ] Primary muscle chips: max 2, 11sp, muted filled
- [ ] No "Custom" label on cards — custom and system exercises are visually identical
- [ ] ⋯ overflow: 44pt × 44pt touch target
- [ ] Drag handle ≡: 44pt × 44pt touch target
- [ ] Deleted exercise: "[Deleted Exercise]" name, placeholder thumbnail, prescription read-only, overflow shows Remove only

### Prescription
- [ ] Sets stepper: integer ≥ 1, optional (empty shown as "——")
- [ ] Reps stepper: integer ≥ 1, optional (empty shown as "——")
- [ ] Reps label → "Duration" for MOBILITY/YOGA slots; stores to `durationSeconds`
- [ ] Weight stepper + unit toggle: decimal, optional, hidden for MOBILITY/YOGA
- [ ] Empty field shown as "——" (not 0, not null displayed)
- [ ] Weight unit from athlete profile default, global across all exercises in session
- [ ] Stepper: −, value tap, + all ≥ 44pt × 44pt touch targets
- [ ] Notes: collapsible, 200-char max, persists with slot

### W-23 Integration
- [ ] "+ Add Exercise" CTA opens W-23 as full-screen modal
- [ ] PickerContext source = 'WORKOUT_BUILDER'
- [ ] PickerContext slotIndex from WorkoutBuilderContext
- [ ] PickerContext activityType = slotType (null if untyped)
- [ ] On selection: `ExercisePrescription` created with null prescription fields, appended to list
- [ ] On W-23 cancel: W-24 unchanged
- [ ] No duplicate guard — same exercise may appear multiple times
- [ ] Single selection per W-23 session (W23-D13 LOCKED)

### Reordering
- [ ] Drag handle activates drag-to-reorder
- [ ] Other cards shift in real time during drag
- [ ] Position numbers update immediately on successful drop; `order` fields updated and saved
- [ ] Cancelled drag: card returns to original position, no save triggered
- [ ] VoiceOver: Move Up / Move Down rotor actions per card
- [ ] Move Up disabled for first card; Move Down disabled for last card

### Removing Exercises
- [ ] Swipe left → Remove swipe action at trailing edge
- [ ] ⋯ → "Remove from Workout"
- [ ] No prescription data and no notes: remove immediately
- [ ] Has prescription data or notes: confirmation sheet before removing
- [ ] Confirmation: destructive "Remove" + "Cancel"
- [ ] `ExercisePrescription` record deleted on confirm; `order` fields renumbered

### W-22 Integration
- [ ] ⋯ → "View Exercise Detail" opens W-22 as sheet above W-24
- [ ] W-24 state fully preserved when W-22 is open
- [ ] GIF autoplays in W-22 sheet (ED-5)
- [ ] No "Select This Exercise" CTA in this W-22 context
- [ ] Alternatives in W-22: functional for reference, no Replace CTA
- [ ] Back from W-22 → W-24 fully restored

### W-9 Integration
- [ ] Pre-built exercises passed to W-9 from all valid program-start entry points (W-1, W-3, H-1)
- [ ] W-9 sorts exercises by `order` field from `ExercisePrescription`
- [ ] W-9 shows prescriptions as muted reference text (13sp, secondary, not editable in W-9)
- [ ] W-9 does not block or flag deviations from prescription
- [ ] W-9 never writes to `ExercisePrescription` records
- [ ] Free-form W-9 path (empty `exercises` array) unaffected

### Save Behavior
- [ ] Auto-save on: exercise add, remove, successful reorder drop, prescription field blur, notes blur
- [ ] Cancelled drag does not trigger auto-save
- [ ] No Save button
- [ ] Offline: changes queued locally; "Changes pending sync" indicator appears
- [ ] Sync indicator clears when sync completes

### Sections
- [ ] MAIN WORKOUT section always present; no overflow icon; cannot be removed
- [ ] WARM_UP and COOL_DOWN sections absent by default; appear only when created
- [ ] Footer "Add Warm-Up" / "Add Cool-Down" affordances visible for absent sections only
- [ ] Tapping "Add Warm-Up" creates section record immediately, even if W-23 cancelled
- [ ] WARM-UP / COOL-DOWN section header has trailing [⋯] overflow
- [ ] Section [⋯] → "Remove [Section]" — immediate for empty, confirmation for non-empty
- [ ] MAIN WORKOUT has no [⋯] in header
- [ ] Exercise numbering restarts at 1. within each section
- [ ] Drag-to-reorder operates within section only; cannot cross section boundary
- [ ] Per-exercise overflow includes "Move to [Section]" for each present alternate section
- [ ] Move to Section: exercise appended to bottom of target section; order renumbered both sections
- [ ] Empty section (created, no exercises) shows "No exercises added yet." + "[+ Add Exercise]"

### States
- [ ] New slot: MAIN WORKOUT section, empty ("No exercises added yet."), footer affordances shown
- [ ] All prescription fields null (exercises present): valid, "——" shown, no reference in W-9
- [ ] Empty optional section: section header + empty state copy + "[+ Add Exercise]" (§ 14.5)
- [ ] Catalog unavailable offline: inline message; existing exercises still accessible
- [ ] Deleted exercise: gracefully degraded card (§ 6.4)

### Loading States
- [ ] Skeleton cards while existing exercises load
- [ ] Header and "+ Add Exercise" CTA visible immediately
- [ ] Cached data: suppress skeleton, render instantly
- [ ] Reduce Motion: static placeholders, no shimmer or entry animation

### Offline Behavior
- [ ] View/reorder/remove/edit prescription/edit notes: all available offline
- [ ] Add exercises: requires cached catalog; inline message if uncached
- [ ] W-22 from W-24: per W-22 offline behavior

### Accessibility
- [ ] All touch targets ≥ 44pt (§ 17.1)
- [ ] All elements have accessible labels (§ 17.2)
- [ ] VoiceOver reorder: Move Up / Move Down per card
- [ ] Reduce Motion: no animations

---

## 22. Upstream Amendments Required

### W3-A1 — "Build Workout" / "Edit Workout" Entry in W-3

**Target:** W-3 Program Detail Wireframe Spec v1.2
**Required:** Each workout slot card in W-3 (Future and Active states) needs a mechanism to enter W-24.

**Proposed treatment (exact UI to be confirmed in W-3 amendment):**

*Slot with no exercises built (MAIN section `exercises: []`, no other sections have exercises):*
The slot card shows a secondary "Build Workout" CTA below the slot name.

*Slot with exercises built (any section has exercises):*
The slot card shows "[N] exercises" as a secondary detail line (total across all sections). The slot card's overflow (⋯) includes "Edit Workout" → W-24.

**States where W-24 is accessible from W-3:**
- Future state: any slot (athlete is building the program before starting)
- Active state: any slot (athlete can modify the upcoming exercise plan)

**States where W-24 is NOT accessible from W-3:**
- Graduated state: sealed legacy record — no editing
- Ended Early state: sealed legacy record — no editing
- Preview state (Forge Program): athlete does not own the content

### W9-A1 — Pre-Loaded Exercise List and Reference Prescription in W-9

**Target:** W-9 Active Workout Flow Spec v1.0

Two additive amendments:

1. **W-9 Section 2 (Entry Points):** When a program slot's `sections[]` array contains at least one exercise, any workout start from that slot — via W-1 Program Card, W-3 Active state "Start Next Workout," or H-1 "Continue Program" — pre-populates W-9's exercise list organized by section (WARM_UP → MAIN → COOL_DOWN). W-9 renders section headers for sections with at least one exercise. Empty sections produce no section header in W-9. This behavior is additive — the free-form path in W-9 (for slots with no built exercises) is unchanged.

2. **W-9 Section 5 (Set Input Sheet):** When `ExercisePrescription` fields are non-null for an exercise, a muted reference line appears in the set input panel: "Target: [N] reps × [W] lbs" (or duration variant for MOBILITY/YOGA). This reference text is informational only — it does not gate logging, it does not track deviations, and it does not influence the session record. W-9 never writes to `ExercisePrescription` records.

---

## 23. Decisions Record

| Decision | Value |
|----------|-------|
| W24-D1 — Push navigation (not modal) | W-24 is a hierarchical destination within the program detail navigation stack (W-3 → W-24). Modal presentation would imply a temporary task overlay. W-24 is where the athlete's workout plan lives — it should feel like a place, not an interruption. |
| W24-D2 — Auto-save (no Save button) | W-24 writes every change immediately. There is no "draft" state, no unsaved-changes dialog, no Save button. The athlete is building a plan that should always reflect what they've decided. Save buttons introduce decision fatigue that doesn't belong on a builder surface. |
| W24-D3 — Simple prescription model: sets × reps × weight, uniform across sets | One prescription per exercise, applied uniformly to all sets. Individual set-level prescription (pyramid sets, warmup/working/backdown) is V1.1. The uniform model covers ~80% of real training protocols and is significantly simpler to build and display in W-9. |
| W24-D4 — Reps and Weight are optional | Not all exercises have rep targets or weight targets. Bodyweight exercises have no load. Duration-based exercises are annotated via Notes. Some athletes plan intuitively. Forcing entry would block athletes who plan by feel or use duration-based movements. |
| W24-D5 — MOBILITY/YOGA field adaptation | When `slotType` is MOBILITY or YOGA, Reps label → "Duration" and Weight is hidden. The value stores to `durationSeconds` on `ExercisePrescription`. Displaying weight fields for a yoga sequence is incongruous. Duration is the correct metric. |
| W24-D6 — No duplicate exercise guard | The same exercise may appear multiple times in a W-24 slot. Some training protocols use a movement as both a warmup opener and a working set finisher. Preventing duplicates would block valid training patterns. |
| W24-D7 — No "Start Workout" CTA in W-24 | Workout execution is initiated from W-3 "Start Next Workout." W-24 is the planning surface; W-3 is the dispatch point. Mixing planning and dispatch in W-24 would conflate two distinct intents and require W-24 to know which slot is "next" in the program sequence — a concern belonging to W-3. |
| W24-D8 — Auto-prescription deferred to V1.1 | MVP does not pre-fill prescription fields from past sessions. Last-used prescription lookup requires querying W-9 session history from the builder context, creating a data dependency and increasing complexity without clear V1.0 benefit. |
| W24-D9 — No "Select This Exercise" in W-22 from W-24 | The "Select This Exercise" CTA is exclusively a W-23-context behavior (W23-D11, LOCKED). In W-24 context, the athlete is reviewing an already-added exercise — there is no selection action needed. W-24 is not W-23. |
| W24-D10 — W-24 prescription is reference only in W-9 | W-9 displays W-24 prescriptions as muted reference text. Athletes log their actual values freely. W-9 never blocks on plan compliance and never flags deviations. The plan is a guide, not a contract. Progress over Perfection principle. |
| W24-D11 — Copy-Semantics: slot owns its data | `ExercisePrescription` records live within `WorkoutSection.exercises[]` which is nested in `ProgramSlot.sections[]` (W-4 Decision 2, LOCKED, updated by WS-A5). There is no separate "Workout Template" entity in MVP. The slot is self-contained. The `originTemplateId` field enables future Post-MVP template linking without schema migration. |
| W24-D12 — Multi-exercise add deferred to V1.1 | Per W23-D13 (LOCKED), W-23 returns one `exerciseId` per picker session. Multi-add (selecting several exercises in one W-23 session) is V1.1, dependent on W-23 V1.1 multi-selection. |
| W24-D13 — W-3 amendment required for entry | W-24 is new infrastructure. W-3 v1.2 requires amendment W3-A1 to expose "Build Workout" / "Edit Workout" slot entry points. W-24 specifies the context it receives from W-3; W-3 defines the visual entry treatment. |
| W24-D14 — Deleted exercise: retained, read-only | If an exercise is deleted from the catalog after being added to a W-24 slot, the `ExercisePrescription` record remains with its fields intact and read-only. The prescription is the athlete's plan — removing it automatically would silently destroy planning data. The athlete removes manually via ⋯ → Remove if desired. |
| W24-D15 — Free-form W-9 path unaffected | Athletes who never use W-24 retain the full free-form W-9 experience (MAIN section with no exercises, "Add Exercise" → W-23 during live session). W-24 is additive — it enhances W-9 for athletes who plan ahead without modifying any existing behavior. |
| W24-D16 — Workout sections adopted (WS-A1) | Workouts are organized into up to three fixed sections: Warm-Up (optional), Main Workout (required), Cool-Down (optional). Sections are created intentionally and persist until explicitly removed. The data model changes from `ProgramSlot.exercises: ExercisePrescription[]` to `ProgramSlot.sections: WorkoutSection[]` where each `WorkoutSection { type, exercises: ExercisePrescription[] }`. This decision was made before program catalog architecture began to avoid costly retrofitting. Fixed sections cover ≥90% of real structured workouts. Custom sections are V1.1. |

---

## 24. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Workout Builder for program workout slots. Push navigation, auto-save, simple prescription model (sets × reps × weight — uniform across sets), optional fields, MOBILITY/YOGA adaptation (Duration field / Weight hidden). W-23 integration with PickerContext WORKOUT_BUILDER. W-22 opened in reference mode (no Select CTA). W-9 pre-loaded exercise list and muted reference prescription display. Two upstream amendments: W3-A1 (entry point) and W9-A1 (pre-loaded list + reference prescription). 15 decisions (W24-D1 through W24-D15). |
| v1.0 (Final Lock) | June 2026 | R1–R5 amendments applied. § 7.6 added: `ExercisePrescription` and `ProgramSlot.exercises[]` data model formalized; `reps` / `durationSeconds` mutually exclusive fields defined. § 10.5 added: cancelled drag snaps back to original position, no save triggered. § 20 expanded: (1) W-9 logged values never write back to W-24 `ExercisePrescription` records — plan and execution are permanently independent; (2) "Custom" label absent from W-24 exercise cards — source labeling is W-23's concern. § 22 W9-A1 scope expanded: pre-loaded exercise behavior applies from all valid program-start entry points (W-1 Program Card, W-3 "Start Next Workout," H-1 "Continue Program"), not W-3 only. Status: LOCKED. |
| v1.1 (WS-A1) | June 2026 | Workout Structure Amendment 001 applied. **Core data model change:** `ProgramSlot.exercises: ExercisePrescription[]` replaced by `ProgramSlot.sections: WorkoutSection[]` where `WorkoutSection { type: 'WARM_UP' \| 'MAIN' \| 'COOL_DOWN', exercises: ExercisePrescription[] }`. Three fixed sections: Warm-Up (optional), Main Workout (required), Cool-Down (optional). `ExercisePrescription.order` is now per-section. § 5.1 updated: layout diagram with section headers. § 5.3–5.5 updated: section architecture, per-section Add CTA, section creation/removal model. § 6.3 updated: per-exercise overflow gains "Move to [Section]" options. § 9.3 updated: exercise appended to calling section. § 10.2–10.3 updated: reorder is within-section only; accessibility announces section. § 11.4 added: section removal via header overflow — immediate for empty, confirmation for non-empty; MAIN cannot be removed. § 14.1 updated: empty state is section-aware (MAIN header + "No exercises added yet."). § 14.5 added: empty section state for optional sections. § 17, § 18.1, § 19, § 20, § 21, § 22, § 23 updated accordingly. Decision W24-D16 added. WS-R1 persistence rule applied: optional sections persist when created; removed only by explicit athlete action. |

---

*W-24 Workout Builder — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
