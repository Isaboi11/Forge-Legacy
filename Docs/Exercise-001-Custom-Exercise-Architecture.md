# Forge Legacy — Exercise-001: Custom Exercise Architecture
## Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise-Library-Architecture-v1.0.md, ExercisePrescription-Amendment-001.md, Architecture-Amendment-001-Import.md
**Downstream impact:** W-21 (My Exercises surface), W-22 (Edit action), W-23 (Custom label, creation entry point), W-24 (future creation/edit screen), W-27 (tombstone behavior extension), Architecture-Amendment-001-Import.md (import gap resolved)

---

## Section 1 — Purpose

### 1.1 What a Custom Exercise Is

A Custom Exercise is an `ExerciseDefinition` record with `source: 'CUSTOM'`. It is authored by an athlete, stored in the same schema as Forge-managed exercises, and governed by the same `ExercisePrescription` model used throughout workout logging, templates, and programs.

Custom Exercises share the `ExerciseDefinition` entity with FORGE exercises. They are not a separate entity. They are a different source classification within the same schema.

### 1.2 What a Custom Exercise Is Not

- Not a Forge exercise. `source: 'FORGE'` is Forge-team-authored exclusively.
- Not a community submission. Custom Exercises have no public visibility in MVP.
- Not a shared library item. Custom Exercises are private to their author in MVP.
- Not an editorial resource. FORGE exercises carry educational content (instructions, coaching cues, common mistakes). Custom Exercises carry only what the athlete chooses to record.

### 1.3 Why It Exists

The Forge exercise library ships with 200–225 exercises covering the primary training modalities. This is sufficient for the majority of training — but not all training.

Athletes encounter exercises the library does not contain:

- Specialty machine variations (belt squat machine, hip thrust machine)
- Equipment unique to their gym
- Physical therapy and rehabilitation movements
- Coach-prescribed drills
- Sport-specific conditioning exercises
- Personal exercise variations (athlete's modified form of a standard movement)
- Exercise names imported from other tracking platforms (Garmin, Strava, Strong, etc.)

Without a Custom Exercise system, athletes face a friction point every time they need to log real-world training that does not match the Forge library. They are forced to approximate — logging a standard movement instead of the actual movement they performed. This degrades the accuracy of their historical record.

Custom Exercises remove that friction. An athlete can log exactly what they did, name it as they know it, and maintain an honest record of their training.

The Custom Exercise system must support this without degrading library quality, search clarity, or historical integrity for any athlete — including athletes who never create a single Custom Exercise.

---

## Section 2 — Ownership Model

### 2.1 Ownership Rule

**Decision EX-001-D1: Custom Exercises are athlete-owned exclusively in MVP.**

Every Custom Exercise is owned by exactly one athlete. Ownership is expressed as `authorId`, which is set to the creating athlete's uuid at creation time and is immutable thereafter (EL-D1 applies to Custom Exercises as it does to all ExerciseDefinition records).

There is no squad ownership, coach ownership, or shared ownership in MVP. One exercise, one owner.

### 2.2 Permissions Derived from Ownership

All permissions on a Custom Exercise derive from a single check: `authorId = requesting athlete`.

| Action | Permitted When |
|--------|---------------|
| View | `authorId = viewer` |
| Edit | `authorId = viewer` |
| Delete (soft) | `authorId = viewer` |
| Restore | `authorId = viewer` |
| Favorite | `authorId = viewer` |

No other athlete, coach, or squad member can perform any of these actions on a Custom Exercise they do not own in MVP.

### 2.3 Future Compatibility

The ownership model is designed for post-MVP expansion without schema migration:

- **Coach-created exercises:** `authorId` is set to the coach's userId. A `visibility` field controls which coached athletes can access it. No schema change required.
- **Squad exercise libraries:** A new `SquadExercise` join table (`exerciseId → squadId`) maps exercises to squads. `ExerciseDefinition` itself does not change.

These are not MVP features. They are documented here to confirm that the current model does not foreclose them.

---

## Section 3 — Visibility Architecture

### 3.1 Visibility Rule

**Decision EX-001-D2: Custom Exercises are private to their author in MVP.**

This rule is already established in Exercise Library Architecture EL-D11. No Custom Exercise is ever visible to another athlete in MVP — not in search results, not in browse, not in any picker.

### 3.2 The Tombstone Exception

The cross-athlete tombstone (Section 8) is not an exception to visibility. When Athlete B sees `[Custom Exercise]` in a forked program, they are not seeing Athlete A's exercise data — they are seeing a placeholder that communicates "an exercise was here that you cannot access." The exercise name, category, and all other fields remain invisible to Athlete B.

### 3.3 Future Visibility States

Post-MVP visibility states are additive via a `visibility` field on `ExerciseDefinition`. Absence of the field implies `PRIVATE`. States under consideration for future:

| State | Description |
|-------|-------------|
| `PRIVATE` | Default. Visible to author only. |
| `SQUAD` | Visible to members of a specific squad. |
| `PUBLIC` | Visible to all athletes; subject to moderation. |
| `FORGE_APPROVED` | Promoted to full FORGE status via a new FORGE record. |

**Forge approval pathway:** `FORGE_APPROVED` creates a new `ExerciseDefinition` with `source: 'FORGE'`. The athlete's original CUSTOM record is unchanged. EL-D1 (source immutable) is preserved. The FORGE record and the CUSTOM record are separate entities.

---

## Section 4 — Creation Rules

### 4.1 Required Fields

**Decision EX-001-D3: `name` is the only required field.**

| Field | Rule |
|-------|------|
| `name` | Required. Min 1 character, max 60 characters, trimmed whitespace. |

All other fields are optional at creation. This enables friction-free creation from W-23 without breaking the athlete's flow.

### 4.2 Validation Rules

**Decision EX-001-D4: Name uniqueness is a soft warning, not a block.**

Name uniqueness check within athlete's own CUSTOM library: case-insensitive comparison, trimmed. If a match exists, the creation UI surfaces a warning ("You already have an exercise with this name"). The athlete may proceed anyway. The duplicate is permitted.

Name conflict against FORGE library: no check. An athlete's "Leg Press (Plate Loaded)" and the Forge library's "Leg Press" coexist without issue. Athletes name exercises as they know them.

### 4.3 Volume Limit

**Decision EX-001-D5: 500-exercise soft limit per athlete.**

| Threshold | Behavior |
|-----------|----------|
| 480 exercises | UI warning in My Exercises: "You're approaching the exercise limit." |
| 500 exercises | Creation blocked via W-23 inline sheet and W-24. Warning surfaced. |
| Import beyond 500 | Import completes. Exercises beyond the limit have their name snapshotted directly onto `ExerciseLog.exerciseName` without creating an `ExerciseDefinition` record. Post-import warning informs the athlete. |

The 500 limit prevents import-triggered bloat while covering realistic import scenarios (3+ years of training from a major platform typically contains fewer than 200 distinct exercise names).

### 4.4 Creation Surfaces

| Surface | Behavior |
|---------|----------|
| Inline W-23 | Sheet overlay above W-23. Name only. Auto-selects on save. (Locked in Exercise Library Architecture.) |
| W-21 My Exercises | `[+ New Exercise]` in section header. Launches same inline creation sheet. |
| W-24 (future) | Full-creation screen with rich metadata. Not defined in this document. |
| Import auto-creation | Silent, automatic. See Section 13. |

---

## Section 5 — Metadata Architecture

Custom Exercises use the same `ExerciseDefinition` schema as FORGE exercises. The field rules differ by source.

### 5.1 Field Rules for `source: 'CUSTOM'`

| Field | CUSTOM Rule |
|-------|-------------|
| `name` | Required. Min 1, max 60 chars. |
| `source` | Always `'CUSTOM'`. Immutable after creation. |
| `authorId` | Required. Set to creating athlete's uuid. Immutable. |
| `category` | Optional. If set, must be a valid ExerciseCategory (PUSH, PULL, LEGS_AND_GLUTES, CORE, FULL_BODY, MOBILITY). |
| `movementPattern` | Optional. 21-value MovementPattern enum. Not displayed to athletes — internal use only. |
| `primaryMuscles` | Optional. MuscleGroup[]. 0 entries permitted. |
| `secondaryMuscles` | Optional. MuscleGroup[]. 0 entries permitted. |
| `difficulty` | Always `null`. Difficulty is editorial — not athlete-assigned. |
| `equipment` | Optional. EquipmentTag[]. 0 entries permitted. |
| `environmentTags` | Optional. EnvironmentTag[]. 0 entries permitted. |
| `description` | Optional. Free text, 0–300 characters. Athlete coaching notes — not editorial copy. |
| `whyItMatters` | Always `null`. Editorial field. |
| `instructions` | Always `[]`. Editorial field. |
| `tips` | Always `[]`. Editorial field. |
| `commonMistakes` | Always `[]`. Editorial field. |
| `gifUrl` | Optional. Athlete-supplied media. Null at inline MVP creation. |
| `gifThumbnailUrl` | Optional. Derived from gifUrl if provided. |
| `videoUrl` | Optional. Athlete-supplied media. |
| `imageUrl` | Optional. Athlete-supplied media. |
| `alternativeExerciseIds` | Always `[]`. Relationships are editorial. |
| `progressionExerciseIds` | Always `[]`. (EL-D12 locked.) |
| `regressionExerciseIds` | Always `[]`. (EL-D12 locked.) |
| `isActive` | `true` on creation. `false` on soft-delete. `true` on restore. |
| `createdAt` | Set at creation time. Immutable. |
| `updatedAt` | Updated on every edit. |

### 5.2 Non-MVP Metadata

Media upload (gifUrl, videoUrl, imageUrl) and coaching notes text field (description) are reserved for W-24. Inline W-23 creation and the My Exercises `[+ New Exercise]` entry point remain name-only at MVP. The schema supports these fields; the creation UI defers them.

---

## Section 6 — Editing Architecture

### 6.1 Edit Permissions

Only the `authorId` athlete can edit a Custom Exercise. No other athlete can edit — not squad members, not admins in MVP.

### 6.2 Editable Fields

All fields except `source` and `authorId` may be changed. `source` and `authorId` are immutable after creation (EL-D1). `name` may be changed. `category`, `movementPattern`, all muscle/equipment/environment fields, and `description` may be set, changed, or cleared. `isActive` is controlled via delete and restore, not direct edit.

`updatedAt` is updated on every successful save.

No version history is maintained in MVP. The current state of the exercise is the state.

### 6.3 How Edits Affect References

**Decision EX-001-D6: Edits to Custom Exercises propagate to forward-looking surfaces via live `exerciseId` reference. Historical logs are protected by `exerciseName` snapshotting.**

| Reference Type | Behavior on Rename | Behavior on Other Field Edit |
|---------------|-------------------|----------------------------|
| `ExerciseLog.exerciseName` | Unchanged. Snapshotted at write time. | N/A — snapshotted at write. |
| `ExercisePrescription.exerciseId` (templates, programs) | Display name updates at next render. | Display updates at next render. |
| W-23 picker | New name appears immediately. | Updated metadata available. |
| W-21 My Exercises | New name appears immediately. | Updated metadata available. |

A rename does not create a tombstone. Tombstones are the consequence of deletion or foreign ownership only. A renamed exercise is the same exercise with a new name — all references remain valid.

No version branching occurs on edit. There is no "exercise v1 / exercise v2" split. The exercise has one current state, and forward-looking surfaces reflect it. History is protected by snapshotting, not versioning.

---

## Section 7 — Deletion Architecture

### 7.1 Delete Rule

**Decision EX-001-D7: Soft-delete with restore capability.**

Deleting a Custom Exercise sets `isActive: false`. There is no hard delete in MVP. Only the `authorId` athlete can delete.

### 7.2 Cascade Behavior on Delete

| Surface | Behavior |
|---------|----------|
| `ExerciseLog` records | Unaffected. `exerciseName` is snapshotted and never touched. History is immutable. |
| `WorkoutTemplate` ExercisePrescriptions | `[Deleted Exercise]` tombstone. Prescription data (sets/reps/weight) retained read-only. |
| `ProgramSlot` ExercisePrescriptions | Same tombstone rule. |
| `UserFavoriteExercise` | Favorite row removed silently. |
| W-23 picker | Deleted exercise excluded from all search and browse results. |
| W-21 My Exercises | Deleted exercise excluded. My Exercises shows active exercises only. |

### 7.3 Restore Rule

Restoring a Custom Exercise sets `isActive: true`. Only the `authorId` athlete can restore.

**Restore is initiated from the `[Deleted Exercise]` tombstone** — wherever it appears (W-27 Template Detail, program edit surfaces). The athlete encounters the problem and the solution in the same place. There is no separate "Deleted Exercises" section in W-21.

**Why restore works automatically:** `exerciseId` was never removed from any `ExercisePrescription` record on delete. The tombstone is a display-time check: `if !isActive → show tombstone`. When `isActive` returns to `true`, the check resolves. Every tombstone across every template and program recovers without any record repair. The prescription data that was retained read-only becomes live again.

---

## Section 8 — Tombstone System

### 8.1 Two Tombstone Types

**Decision EX-001-D15: Two tombstone types govern all Custom Exercise placeholder states.**

| Tombstone | Trigger Condition | Available Actions |
|-----------|------------------|-------------------|
| `[Deleted Exercise]` | `source: 'CUSTOM'` AND `authorId = viewing athlete` AND `isActive = false` | **Restore** \| **Replace** \| **Remove** |
| `[Custom Exercise]` | `source: 'CUSTOM'` AND `authorId ≠ viewing athlete` (regardless of `isActive`) | **Replace** \| **Remove** |

### 8.2 `[Deleted Exercise]` — Own Exercise, Soft-Deleted

The athlete sees this when they have deleted one of their own Custom Exercises and it was referenced by a template or program.

**Restore:** Sets `isActive: true`. All references auto-recover. The tombstone disappears everywhere simultaneously.

**Replace:** Opens W-23 in REPLACEMENT context. Athlete selects any FORGE or own CUSTOM exercise. `exercisePrescription.exerciseId` is updated. All prescription quantities are preserved (see §8.4).

**Remove:** Deletes the `ExercisePrescription` from the slot. If it was the only prescription in the slot, the slot is removed.

### 8.3 `[Custom Exercise]` — Foreign Author (Cross-Fork)

The athlete sees this when they have forked a program from another athlete (Athlete A) and that program contained one of Athlete A's Custom Exercises. Athlete A's exercise is invisible to Athlete B — the tombstone communicates that an exercise occupied this slot but is not accessible.

Restore is not available. Athlete B cannot restore Athlete A's exercise.

**Replace:** Opens W-23 in REPLACEMENT context. Athlete selects any FORGE or own CUSTOM exercise. `exercisePrescription.exerciseId` is updated. All prescription quantities are preserved.

**Remove:** Same behavior as `[Deleted Exercise]` Remove.

### 8.4 Prescription Preservation on Replace

When Replace is executed on either tombstone type, only `exercisePrescription.exerciseId` changes. All other fields are preserved:

- `setsTarget`
- `repsTarget`
- `weightTarget`
- `restSeconds`
- `distanceValue`
- `distanceUnit`
- Section membership (WARM_UP / MAIN / COOL_DOWN)
- Slot position

The training intent belongs to the slot, not the exercise. The replacement exercise fulfills the same training prescription. Discarding prescription data on replacement would require the athlete to reconstruct all set/rep/weight targets — busywork that discards the program design.

### 8.5 FORGE Exercise Tombstone Behavior

FORGE exercises have `isActive` permanently `true` — they are never deleted. The `[Deleted Exercise]` tombstone condition cannot trigger for a FORGE exercise in MVP. W-27 §4.3's tombstone rule remains a valid safety net for the data model but will not fire in practice.

---

## Section 9 — Exercise Library Integration

### 9.1 W-21 My Exercises — Full Definition

**Decision EX-001-D16: Exercise-001 fully defines the My Exercises browse surface in W-21. No W-21 amendment or W-24 action is required for Custom Exercise browse behavior. When W-21's full wireframe spec is written, it must implement these rules.**

#### Distinction from Existing MY EXERCISES Section

The Exercise Library Architecture defines a "MY EXERCISES" section in W-21 that shows Favorites and Recently Used (all exercise sources). My Exercises is a separate section for Custom Exercise browse:

| Section | Sources | Purpose |
|---------|---------|---------|
| MY EXERCISES (existing) | All (FORGE + CUSTOM) | Quick access — Favorites and Recently Used |
| My Exercises (Exercise-001 owns) | CUSTOM only | Browse — athlete's full custom exercise library |

#### My Exercises Browse Rules

| Rule | Definition |
|------|-----------|
| Scope | `source: 'CUSTOM'` AND `authorId = requesting athlete` AND `isActive = true` |
| Default sort | Alphabetical by `name`; secondary: `createdAt` descending |
| Empty state | Section absent when 0 active CUSTOM exercises. No placeholder text. Consistent with product-wide empty-section rule. |
| Section title | "My Exercises" |
| Create entry point | `[+ New Exercise]` action in section header. Visible at all times — when section has exercises and when section is otherwise empty (exception to the absent-section rule: a section with only a create button and no content rows is permitted). Launches inline creation sheet (name only) at MVP. |
| View exercise | Tap exercise row → W-22 (Exercise Detail, minimal display for CUSTOM) |
| Edit exercise | From W-22 for CUSTOM exercises only: Edit action in sticky header (pen icon) → launches edit flow |
| Delete exercise | Swipe-left or long-press on row → confirmation dialog → soft-delete (`isActive: false`) |
| Scoped search | Search input within My Exercises context returns athlete's CUSTOM exercises only |
| Global search | W-21 header search bar returns FORGE + athlete's CUSTOM exercises (Section 14) |
| Browse isolation | CUSTOM exercises with `category` set do NOT appear in the 6 FORGE category browse tiles (EX-001-D9 preserved) |

#### Restore from W-21

Deleted exercises do not appear in My Exercises (active-only scope). Restore is not available from W-21. It is available only from the `[Deleted Exercise]` tombstone in template or program edit surfaces. This is intentional — W-21 is a planning surface, not a trash manager.

### 9.2 W-22 Exercise Detail

- CUSTOM exercises use W-22 minimal display (locked in Exercise Library Architecture): only populated fields are shown; absent sections have no placeholder
- Hero media: shown if `gifUrl`, `videoUrl`, or `imageUrl` is populated; absent if all null
- Educational content sections (`whyItMatters`, `instructions`, `tips`, `commonMistakes`): always null for CUSTOM → always absent
- `description` field: shown as athlete notes if non-null; section absent if null
- **Edit action:** present for CUSTOM exercises only. Pen icon in sticky header. Tapping navigates to edit flow (inline edit sheet at MVP; W-24 when built). This action is not shown for FORGE exercises.
- Alternatives section: absent (CUSTOM `alternativeExerciseIds` always `[]`)
- Difficulty chip: absent (CUSTOM `difficulty` always null)

### 9.3 W-23 Exercise Picker

The following rules apply to CUSTOM exercises in W-23. Foundational behavior (locked in Exercise Library Architecture) is noted where it applies:

- CUSTOM exercises from the owning athlete are included in all search queries (EL-D11 — locked)
- "Custom" label chip shown below exercise name in search results (locked)
- CUSTOM exercises appear in the "My Exercises" quick-access section at the top of W-23 default view, alongside Favorites and Recently Used
- FORGE category browse tiles show FORGE-only content; CUSTOM exercises are not injected into category browse regardless of their `category` field (EX-001-D9)
- MOBILITY/YOGA context filter: CUSTOM exercises with `movementPattern: null` are included (locked in Exercise Library Architecture)
- Inline creation: "Create Custom Exercise" at bottom of W-23 default view → opens creation sheet above W-23 (locked)

---

## Section 10 — Workout Logging Integration

**Decision EX-001-D8: CUSTOM exercises use the same `ExercisePrescription` model as FORGE exercises. No special prescription handling.**

Custom Exercises are first-class citizens in all workout contexts:

- Free workouts (W-25 builder, W-9 live session)
- Template workouts (W-9 launched from template)
- Program workouts (W-9 launched from program slot)

Adding a Custom Exercise mid-workout via W-9 `[+ Add Exercise]` → W-23 is identical to adding a FORGE exercise.

`ExerciseLog.exerciseName` is snapshotted at write time for CUSTOM exercises identically to FORGE exercises (EX-001-D14). Once a set is logged, the exercise name in that log record is permanent regardless of any future rename, deletion, or restore.

**Historical surfaces (W-18/W-19):** Custom Exercise logs appear with the original snapshotted name. No "[Custom]" label is appended in history — the name is the name. A workout logged as "Belt Squat Machine" shows "Belt Squat Machine" in history, indefinitely.

**Legacy Timeline:** Custom Exercise workout records appear identically to FORGE exercise records. No differentiation after completion.

**Carry-forward rule (EL-D8):** Applies to Custom Exercises identically to FORGE exercises. If the same Custom Exercise (`exerciseId` match) was logged in the prior session of the same activity type, prior logged values (weight × reps) are the defaults for the new session.

---

## Section 11 — Template Integration

Custom Exercises can be used in WorkoutTemplates. `ExercisePrescription.exerciseId` stores a live reference — same model as FORGE exercises.

**Decision EX-001-D10: Template prescriptions use live `exerciseId` reference. Rename propagates. Deletion tombstones. Restore auto-recovers.**

| Event | Template Behavior |
|-------|------------------|
| Exercise renamed | Template displays updated name at next render. No action required. |
| Exercise deleted | `[Deleted Exercise]` tombstone appears. Prescription data retained read-only. Restore or Replace available. |
| Exercise restored | Tombstone clears automatically. Template displays exercise name. Prescription is live again. |
| Template duplicated | Duplicate retains the same `exerciseId` references. All deletion/restore rules apply identically to the duplicate. |

**Template sharing (post-MVP consideration):** Templates are personal and not shared in MVP. If template sharing is introduced post-MVP, the recipient sees any CUSTOM exercises from the original author as `[Custom Exercise]` tombstones. The foreign author tombstone rule (EX-001-D15) applies. The recipient must Replace or Remove those slots.

---

## Section 12 — Program Integration

Custom Exercises can be used in `ATHLETE_CREATED` programs. They cannot be used in `FORGE` source programs — Forge programs are Forge-team-authored, and athlete exercises have no role in them.

`ProgramSlot` ExercisePrescription stores `exerciseId` (live reference). All rename, delete, tombstone, and restore rules from Section 11 apply identically.

### 12.1 Cross-Athlete Fork Workflow

**Decision EX-001-D11 (R1-2 Revised): Full replacement workflow for foreign CUSTOM exercise references.**

**Trigger:** Athlete B forks Athlete A's `ATHLETE_CREATED` program. The program contains a ProgramSlot with an ExercisePrescription referencing one of Athlete A's Custom Exercises (`authorId = A`).

**Display:** At render time, the check `authorId = A ≠ viewer B` triggers the `[Custom Exercise]` tombstone (EX-001-D15) regardless of whether Athlete A's exercise is still active.

**Replacement workflow:**

1. Athlete B opens the forked program in program edit context (W-5 or equivalent)
2. The `[Custom Exercise]` tombstone shows **Replace** and **Remove** actions
3. Athlete taps **Replace** → W-23 opens in REPLACEMENT context, full catalog (FORGE + Athlete B's own CUSTOM)
4. Athlete selects a replacement exercise
5. `exercisePrescription.exerciseId` is updated to the selected exercise
6. All other prescription fields are preserved unchanged (`setsTarget`, `repsTarget`, `weightTarget`, `restSeconds`, `distanceValue`, `distanceUnit`)
7. Slot position and section membership (WARM_UP / MAIN / COOL_DOWN) are unchanged
8. Replacement is permanent. No undo.

Athlete taps **Remove** → ExercisePrescription is deleted from the slot. If the slot contained only this prescription, the slot is removed.

**Prescription preservation rationale:** The training quantities (sets × reps × weight) represent the intent of the program design. Athlete B is choosing a different exercise to fulfill the same training prescription. Discarding the prescription on replacement forces Athlete B to re-enter all targets — this is busywork that discards the original program design.

---

## Section 13 — Import Integration

### 13.1 The Import Gap

Architecture-Amendment-001-Import.md defines the import flow for Forge Legacy but does not specify what happens when an imported workout contains an exercise name that does not match any exercise in the Forge library. This section resolves that gap.

Exercise-001 is the authority for this behavior. Architecture-Amendment-001-Import.md does not need to be amended — it defers to Exercise-001 on unmatched exercise names.

### 13.2 Auto-Creation Rule

**Decision EX-001-D12: Import auto-creates Custom Exercises for unmatched exercise names.**

Requiring per-exercise confirmation for unmatched names would break the import UX. A 3-year training history import from a major platform can contain hundreds of workout sessions with dozens of distinct exercise names. A confirmation prompt for each unmatched name turns a bulk import into an interactive exercise-matching session — the wrong experience.

The athlete has already approved the import as an action. Auto-creating Custom Exercises for unmatched names is consistent with that approval.

Auto-created exercises can be reviewed, enriched, or deleted post-import via W-21 My Exercises.

### 13.3 Deduplication Rules

Applied in order during import processing:

1. **FORGE exact match:** Case-insensitive, trimmed. If the imported exercise name matches a FORGE exercise name → use the FORGE `exerciseId`. No new record created.
2. **CUSTOM exact match:** Case-insensitive, trimmed. If the imported exercise name matches one of the athlete's existing CUSTOM exercises → use the existing CUSTOM `exerciseId`. No new record created.
3. **No match:** Auto-create a new CUSTOM exercise. Name = imported string, trimmed, max 60 chars.

### 13.4 Auto-Created Exercise Properties

| Field | Value |
|-------|-------|
| `source` | `'CUSTOM'` |
| `authorId` | Importing athlete's uuid |
| `isActive` | `true` |
| `name` | Imported string, trimmed, max 60 chars |
| All metadata fields | `null` / `[]` |
| `createdAt` | Import batch timestamp |

Names over 60 characters are truncated to 57 characters + "…" — preserving searchability for the athlete.

### 13.5 Batch Deduplication

**Decision EX-001-D13: Batch deduplication within a single import. Silent auto-creation. Post-import count surfaced.**

Within a single import batch: if the same unmatched name appears in multiple workouts, exactly **one** CUSTOM exercise is created. All workouts in the batch that reference that name receive the same new `exerciseId`.

The deduplication check in step 2 of §13.3 applies across the entire batch as exercises are created — a name auto-created earlier in the same import batch is found in step 2 for subsequent workouts referencing that name.

No per-exercise confirmation prompt is shown during import.

**Post-import summary:** The import completion screen surfaces a count — "5 exercises added to My Exercises" — with a navigation shortcut to W-21 My Exercises. The athlete can review, enrich, or delete auto-created exercises at their discretion.

### 13.6 Volume Limit Interaction

If an import would push the athlete past the 500-exercise limit, the import still completes. Exercises that would have exceeded the limit have their name snapshotted directly onto `ExerciseLog.exerciseName` without creating an `ExerciseDefinition` record. The `ExerciseLog.exerciseId` field is null for these records. A post-import warning informs the athlete of the overflow.

---

## Section 14 — Search Architecture

**Decision EX-001-D9: Custom Exercises are excluded from FORGE category browse. They are discoverable via search and My Exercises only.**

### 14.1 Global Search (W-21, W-23)

Global search returns FORGE exercises plus the requesting athlete's CUSTOM exercises together. The ranking algorithm is identical for both sources:

```
exact name match → prefix match → contains match → muscle match → equipment match
```

Within the same tier: Favorites rank first; Recently Used rank second. Custom Exercises participate in both Favorites and Recently Used.

The "Custom" label on exercise rows (W-23) differentiates Custom Exercise results visually without requiring separate sections.

### 14.2 Browse (W-21, W-23 Category Tiles)

The 6 FORGE category browse tiles (PUSH, PULL, LEGS_AND_GLUTES, CORE, FULL_BODY, MOBILITY) display FORGE exercises only. A Custom Exercise with `category: 'PULL'` does not appear in the PULL browse tile. The browse surface is a curated Forge library, not a mixed catalog.

Custom Exercises with a populated `category` are available in scoped search within My Exercises.

### 14.3 Beginner Athlete Behavior

An athlete who has never created a Custom Exercise and has no import history sees an identical library to the current design. Custom Exercises are additive — they only appear for athletes who have created them. Library quality, search result clarity, and browse purity are unaffected for the majority case.

---

## Section 15 — Historical Integrity

### 15.1 The Principle

"History Cannot Be Rewritten." Every action taken against a Custom Exercise must leave the athlete's completed workout history fully intact and accurate.

### 15.2 Event Behavior Matrix

| Event | `ExerciseLog` (History) | Template Prescriptions | Program Prescriptions |
|-------|------------------------|----------------------|---------------------|
| Exercise renamed | Snapshotted name unchanged ✓ | Updated name (live ref) | Updated name (live ref) |
| Exercise edited (non-name) | Unaffected ✓ | Updated metadata | Updated metadata |
| Exercise deleted (`isActive: false`) | Snapshotted name unchanged ✓ | `[Deleted Exercise]` tombstone | `[Deleted Exercise]` tombstone |
| Exercise restored (`isActive: true`) | Unaffected (snapshot unchanged) ✓ | Tombstone clears, name restored | Tombstone clears, name restored |
| Foreign fork (non-author views) | N/A — not in their history | `[Custom Exercise]` tombstone | `[Custom Exercise]` tombstone |
| Author account deleted | Snapshotted name unchanged ✓ | TBD post-MVP | TBD post-MVP |

### 15.3 Core Rules

**Decision EX-001-D14: `exerciseName` MUST be snapshotted onto `ExerciseLog` at write time for all exercise sources (FORGE and CUSTOM). The snapshotted name is the display authority for completed session history.**

1. `ExerciseLog.exerciseName` is written once at log time. It is never modified.
2. `ExerciseLog.exerciseId` is retained even after the exercise is soft-deleted. An orphaned reference is valid — the snapshotted name provides the display value; the exerciseId is retained for analytics.
3. No cascade-delete of `ExerciseLog` records on exercise deletion.
4. No cascade-update of `ExerciseLog` records on exercise rename.
5. Template and program prescriptions use live `exerciseId`. This is intentional — they are forward-looking planning surfaces. They should reflect the current state of the exercise.

---

## Section 16 — Future Compatibility

The following systems are not designed here. Compatibility is confirmed; design is deferred.

| Future System | Compatibility Confirmation |
|--------------|---------------------------|
| Coaches | `authorId` = coach userId. A `visibility: 'COACHED_ATHLETES'` state routes the exercise to coached athletes. No schema change to `ExerciseDefinition`. |
| Shared exercise libraries | A new `SquadExercise` join table (`exerciseId → squadId`) maps exercises to squad contexts. `ExerciseDefinition` is unchanged. |
| Team training | Same model as shared libraries. |
| Program creators / creator economy | `ATHLETE_CREATED` programs with CUSTOM exercises are already supported. Creator economy expansion requires visibility change, not schema change. |
| AI recommendations | `category`, `movementPattern`, `primaryMuscles` are optional but present in the schema. Sufficient signal for recommendation without completeness requirement. |
| Public exercise marketplace | New `visibility: 'PUBLIC'` state + moderation pipeline. `source` remains `'CUSTOM'` — public custom exercises are not auto-promoted to FORGE. Forge approval is a separate, team-authored action. |

---

## Section 17 — Non-Behaviors

This architecture does not and will never include:

| Non-Behavior | Reason |
|-------------|--------|
| Editing FORGE exercises | EL-D1: source immutable. FORGE authorship is Forge-team only. |
| Community voting or ratings on Custom Exercises | Popularity mechanics conflict with the personal nature of the exercise library. |
| Exercise popularity rankings | Same reason. |
| Automatic promotion of CUSTOM to FORGE | Forge exercises are Forge-team-authored and reviewed. Promotion is a deliberate team action creating a new FORGE record. |
| Public exercise marketplace | Forge Legacy is not a content platform. |
| Cross-athlete visibility of CUSTOM exercises in MVP | EL-D11. |
| Hard delete of any exercise | Soft-delete only. Preserves historical orphan references. |
| Per-exercise import confirmation prompts | Would break the import UX for large import sets. Auto-creation with post-import review is the correct model. |
| AI-inferred metadata at creation | Athlete supplies all enrichment. Inference without athlete review creates unverified metadata. |
| Difficulty field for CUSTOM exercises | Difficulty is editorial. An athlete assigning their own difficulty to an exercise adds noise without reliability. |
| Educational content fields for CUSTOM (whyItMatters, instructions, tips, commonMistakes) | These are FORGE-editorial fields. The CUSTOM `description` field serves as athlete notes. |
| "Deleted Exercises" trash section in W-21 | Restore is initiated from the tombstone. A trash section adds surface area without improving the recovery UX. |
| Restore of foreign CUSTOM exercises | An athlete cannot restore another athlete's exercise. Ownership gates all lifecycle actions. |

---

## Section 18 — Architecture Decisions

| Decision | Rule |
|----------|------|
| **EX-001-D1** | Custom Exercises are athlete-owned exclusively in MVP. `authorId` is immutable. Coach/squad ownership is additive post-MVP via visibility layer and join tables — no schema migration required. |
| **EX-001-D2** | Private visibility in MVP (EL-D11 already locked). Future visibility states (`SQUAD`, `PUBLIC`, `FORGE_APPROVED`) are additive via a `visibility` field. Absence = PRIVATE. |
| **EX-001-D3** | `name` is the only required field. All metadata is optional. This enables friction-free creation from W-23 without interrupting the athlete's flow. |
| **EX-001-D4** | Name uniqueness within athlete's own CUSTOM library is a soft warning, not a block. No check against FORGE names. Athletes name exercises as they know them. |
| **EX-001-D5** | 500-exercise soft limit per athlete. Warning at 480. Block at 500 for manual creation. Import beyond 500 snapshots the name directly to `ExerciseLog.exerciseName` without creating an `ExerciseDefinition`. Post-import warning surfaced. |
| **EX-001-D6** | Edits propagate to forward-looking surfaces via live `exerciseId` reference. History is protected by `exerciseName` snapshotting at write time. No version branching in MVP. |
| **EX-001-D7** *(R1-1)* | Soft-delete sets `isActive: false`. Restore sets `isActive: true`. Both actions are available only to the `authorId` athlete. Restore is initiated from the `[Deleted Exercise]` tombstone. All references auto-recover on restore — no record repair. No "Deleted Exercises" section in W-21. |
| **EX-001-D8** | Custom Exercises use the same `ExercisePrescription` model as FORGE exercises. No special prescription handling by source type. |
| **EX-001-D9** | Custom Exercises are excluded from the 6 FORGE category browse tiles in W-21 and W-23. Discoverable via global search (labeled "Custom") and My Exercises browse only. |
| **EX-001-D10** | Template and program prescriptions use live `exerciseId`. Rename propagates. Deletion tombstones. Restore auto-recovers. Same reference model as FORGE exercises. |
| **EX-001-D11** *(R1-2)* | Foreign CUSTOM exercise (authorId ≠ viewer) shows `[Custom Exercise]` tombstone regardless of `isActive`. Replace opens W-23 in REPLACEMENT context; only `exerciseId` changes; all prescription quantities preserved. Remove deletes the prescription/slot. This workflow is locked here, not deferred to W-5. |
| **EX-001-D12** | Import auto-creates Custom Exercises for unmatched exercise names. No per-exercise confirmation prompt. The import is an athlete-approved action; auto-creation is consistent with that approval. |
| **EX-001-D13** | Import deduplication order: FORGE exact match → existing CUSTOM exact match → create new. Batch-level deduplication within a single import. Post-import count surfaced on completion screen with navigation to W-21 My Exercises. |
| **EX-001-D14** | `exerciseName` MUST be snapshotted onto `ExerciseLog` at write time for all exercise sources (FORGE and CUSTOM). The snapshotted name is the display authority for completed session history. The `exerciseId` is retained as a reference but the snapshot is what appears in W-18, W-19, and the Legacy Timeline. |
| **EX-001-D15** *(NEW — R1-1+R1-2)* | Two tombstone types govern all Custom Exercise placeholder states. `[Deleted Exercise]`: own CUSTOM, soft-deleted; actions Restore \| Replace \| Remove. `[Custom Exercise]`: foreign author; actions Replace \| Remove. Prescription quantities are preserved on Replace for both types — only `exerciseId` changes. |
| **EX-001-D16** *(NEW — R1-3)* | Exercise-001 fully defines the My Exercises browse surface in W-21. No standalone W-21 wireframe spec exists at lock time; Exercise-001 is the authority. When W-21's full wireframe spec is written, it must implement these rules. No W-21 amendment or W-24 action is required for Custom Exercise browse behavior. |

---

## Section 19 — Validation Checklist

### Data Model
- [ ] `source: 'CUSTOM'` — immutable after creation
- [ ] `authorId` — required for CUSTOM; set to creating athleteId; immutable
- [ ] `name` — only required field; min 1, max 60 chars; trimmed
- [ ] `difficulty` — always `null` for CUSTOM
- [ ] `whyItMatters`, `instructions`, `tips`, `commonMistakes` — always `null` / `[]` for CUSTOM
- [ ] `alternativeExerciseIds`, `progressionExerciseIds`, `regressionExerciseIds` — always `[]`
- [ ] `isActive: true` on creation; `false` on soft-delete; `true` on restore
- [ ] `updatedAt` updates on every edit

### Ownership and Visibility
- [ ] Only `authorId` athlete can view, edit, delete, and restore own CUSTOM exercise
- [ ] No CUSTOM exercise data is visible to another athlete in MVP (EL-D11)
- [ ] Cross-athlete CUSTOM reference shows tombstone placeholder only — no exercise data

### Creation
- [ ] Name uniqueness within athlete's CUSTOM library: soft warning, not a block
- [ ] No name conflict check against FORGE library
- [ ] 500-exercise limit: warning at 480; creation blocked at 500 (import exception applies)
- [ ] Inline creation from W-23: name only; auto-selects on save
- [ ] W-21 My Exercises `[+ New Exercise]` → same inline creation sheet
- [ ] Import auto-creation: name from imported string; all metadata null

### Editing
- [ ] Only `authorId` athlete can edit
- [ ] `source` and `authorId` immutable; all other fields editable
- [ ] `updatedAt` updates on save
- [ ] Rename propagates to templates, programs, W-23, W-21 via live `exerciseId`
- [ ] Rename does NOT affect `ExerciseLog.exerciseName` (snapshotted at write)

### Deletion and Restore (EX-001-D7)
- [ ] Soft-delete sets `isActive: false`; only `authorId` athlete can delete
- [ ] No hard delete
- [ ] `ExerciseLog` records: unaffected on delete
- [ ] Template/program prescriptions: `[Deleted Exercise]` tombstone; prescription data retained read-only
- [ ] `UserFavoriteExercise`: silently removed on delete
- [ ] W-23 picker: deleted exercise excluded
- [ ] W-21 My Exercises: deleted exercise excluded (active-only scope)
- [ ] Restore sets `isActive: true`; only `authorId` athlete can restore
- [ ] Restore initiated from `[Deleted Exercise]` tombstone only — not from W-21
- [ ] All prescription references auto-recover on restore; no record repair needed

### Tombstone System (EX-001-D15)
- [ ] `[Deleted Exercise]` condition: `authorId = viewer` AND `isActive = false` → Restore | Replace | Remove
- [ ] `[Custom Exercise]` condition: `authorId ≠ viewer` (any `isActive`) → Replace | Remove
- [ ] Replace: W-23 opens in REPLACEMENT context; only `exerciseId` changes; all prescription quantities preserved
- [ ] Remove: ExercisePrescription deleted; slot removed if it contained only this prescription
- [ ] FORGE exercises never produce either tombstone (`isActive` permanently `true`)

### My Exercises in W-21 (EX-001-D16)
- [ ] Scope: `source: 'CUSTOM'` AND `authorId = viewer` AND `isActive = true`
- [ ] Sort: alphabetical by name; secondary `createdAt` descending
- [ ] Empty state: section absent when 0 active CUSTOM exercises
- [ ] `[+ New Exercise]` always visible in section header
- [ ] Tap row → W-22 minimal display for CUSTOM
- [ ] Edit action in W-22 for CUSTOM only; absent for FORGE
- [ ] Swipe-left / long-press → delete confirmation → soft-delete
- [ ] Scoped search returns CUSTOM-only results
- [ ] CUSTOM exercises NOT in FORGE category browse tiles (EX-001-D9)
- [ ] Deleted exercises not shown in My Exercises; restore only via tombstone

### W-22 and W-23
- [ ] W-22 CUSTOM: only populated fields shown; absent sections have no placeholder
- [ ] W-22 CUSTOM: Edit action in sticky header; absent for FORGE
- [ ] W-22 CUSTOM: difficulty chip absent; educational content sections absent
- [ ] W-23: "Custom" label chip on CUSTOM exercise rows
- [ ] W-23: CUSTOM included in search results; excluded from category browse tiles
- [ ] W-23: MOBILITY context filter includes CUSTOM with `movementPattern: null`
- [ ] W-23: "Create Custom Exercise" entry point at bottom of default view

### Workout Logging
- [ ] CUSTOM exercises selectable in all workout contexts (free, template, program)
- [ ] `ExerciseLog.exerciseName` snapshotted at write time for CUSTOM (EX-001-D14)
- [ ] Carry-forward rule (EL-D8) applies to CUSTOM identically to FORGE
- [ ] Historical W-18/W-19: snapshotted name displayed; no "[Custom]" suffix in history
- [ ] Legacy Timeline: CUSTOM workout records identical to FORGE records post-completion

### Template Integration (EX-001-D10)
- [ ] CUSTOM exercises allowed in WorkoutTemplates
- [ ] Live `exerciseId` reference in ExercisePrescription
- [ ] Delete → `[Deleted Exercise]` tombstone; prescription data retained read-only
- [ ] Restore → tombstone clears automatically; prescription live again
- [ ] Template duplicate: references preserved; deletion/restore rules apply identically

### Program Integration (EX-001-D11)
- [ ] CUSTOM allowed in ATHLETE_CREATED programs; not in FORGE programs
- [ ] Cross-athlete fork: foreign CUSTOM → `[Custom Exercise]` tombstone
- [ ] Replace workflow available from program edit context; W-23 opens; prescription quantities preserved
- [ ] Remove workflow: prescription/slot deleted

### Import Integration (EX-001-D12, D13)
- [ ] FORGE exact match (case-insensitive, trimmed) → use FORGE `exerciseId`
- [ ] CUSTOM exact match (case-insensitive, trimmed) → use existing CUSTOM `exerciseId`
- [ ] No match → auto-create CUSTOM; name from import string; all metadata null
- [ ] Batch deduplication: same name within batch → one CUSTOM exercise created
- [ ] No per-exercise confirmation prompt
- [ ] Names over 60 chars: truncated to 57 + "…"
- [ ] Post-import count shown: "N exercises added to My Exercises" with W-21 navigation
- [ ] Import beyond 500-exercise limit: name snapshotted to ExerciseLog only; no ExerciseDefinition created; post-import warning

### Historical Integrity (EX-001-D14)
- [ ] `ExerciseLog.exerciseName` never modified after write
- [ ] `ExerciseLog.exerciseId` retained after exercise deletion (orphan reference permitted)
- [ ] No cascade-delete of ExerciseLog on exercise deletion
- [ ] No cascade-update of ExerciseLog on exercise rename

---

## Section 20 — Downstream Impact

| Document | Impact |
|----------|--------|
| `Architecture-Amendment-001-Import.md` | Import gap (unmatched exercise names) resolved by EX-001-D12 and EX-001-D13. Exercise-001 is the authority. No edits to the import document are required. |
| `Exercise-Library-Architecture-v1.0.md` | No edits. Exercise-001 extends and specializes the CUSTOM source classification. Does not modify the foundational schema or locked decisions. |
| `Exercise-Library-Hub-Wireframe-Spec-W21.md` | Does not exist at lock time. When written, must implement EX-001-D16 My Exercises browse rules. |
| W-22 wireframe spec | No edits required. CUSTOM minimal display behavior is already locked. Edit action and absence of educational content sections are additive rules consistent with existing spec. |
| W-23 wireframe spec | No edits required. CUSTOM label, search inclusion, inline creation, and My Exercises quick-access section are consistent with or already defined by the existing spec. |
| W-24 (future) | Will implement full CUSTOM exercise creation and edit flows. Must honor creation rules from Section 4 and metadata rules from Section 5. |
| W-27 wireframe spec | No edits required. EX-001-D15 two-tombstone system extends and clarifies W-27 §4.3 behavior. Additive. |

---

## Section 21 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Defines Custom Exercise ownership, visibility, creation, editing, deletion with restore, tombstone system (two types), My Exercises browse surface in W-21, workout logging integration, template integration, program integration with cross-fork replacement workflow, import auto-creation and deduplication, search architecture, and historical integrity rules. Sixteen architecture decisions (EX-001-D1 through EX-001-D16). Refinement Pass R1 applied: restore capability (R1-1), foreign exercise replacement workflow (R1-2), W-21 My Exercises full definition (R1-3). |

---

*Forge Legacy — Exercise-001: Custom Exercise Architecture — v1.0*
*June 2026*
*Authority for all Custom Exercise lifecycle, ownership, visibility, integration, and historical integrity decisions.*
