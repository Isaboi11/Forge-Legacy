# HonorInstance Architecture
## v1.0 — LOCKED | June 2026

**Status:** LOCKED
**Type:** Architecture Note
**Authority:** Honor-Catalog-v1.0-LOCKED.md, L-10 Honors Hub Spec v1.1, L-11 Honor Detail Sheet Spec v1.1, M-2 Honor Earned Modal Spec v1.1, Master PRD § 13, Product DNA

---

## 1. Purpose

This note defines the complete architecture for `HonorInstance` — the data record created when an athlete earns an honor.

`HonorInstance` is the source of truth for:

- What honor was earned
- When it was earned vs. when the record was written
- Which chapter context it belongs to (if any)
- All context data required to display the honor without querying external entities

This architecture is the prerequisite for honor evaluation service design, L-10 list rendering, L-11 detail display, FLM event references, and future sharing systems.

---

## 2. Complete Field Definition

| Field | Type | Nullable | Definition |
|-------|------|----------|-----------|
| `id` | UUID | No | System-generated unique identifier for this honor instance |
| `athleteId` | string | No | References Athlete |
| `honorType` | string | No | Locked catalog identifier (e.g. `bench_milestone_1`) — from Honor-Catalog-v1.0-LOCKED.md |
| `displayName` | string | No | Snapshotted display name at earn time (e.g. "Bench 135", "First Chapter Sealed") — see AD-58 |
| `dateEarned` | date (ISO 8601) | No | Qualification date — displayed to athlete — see AD-33 |
| `awardedAt` | timestamp (ISO 8601 with tz) | No | Timestamp the record was written — see AD-33 |
| `chapterId` | string | Yes | References Chapter; `null` for all non-chapter-scoped honors — see AD-55 |
| `source` | enum | No | How the honor was awarded — see AD-54 |
| `schemaVersion` | number | No | `1` for all MVP records — see AD-57 |
| `metadata` | object | No | Sparse, type-specific contextual fields — see AD-51; empty object `{}` when no type-specific fields apply |

### 2.1 source Values

| Value | Meaning |
|-------|---------|
| `live_session` | Awarded during a live (online) session save |
| `offline_sync` | Awarded when an offline session synced to the server |
| `import` | Awarded during retroactive evaluation of imported historical data |

`source` is internal only. It is never surfaced to the athlete or displayed in any UI surface.

### 2.2 What Is NOT Stored

| Field | Reason |
|-------|--------|
| `category` | Derivable from `honorType` via the locked catalog at runtime |
| `family` | Derivable from `honorType` via the locked catalog at runtime |
| `sessionId` | The triggering session is not an honor concern; honor records are independent of session records |

No derived fields are stored on `HonorInstance`. See AD-50.

---

## 3. displayName

`displayName` is a top-level field on `HonorInstance`. It is not in `metadata`.

**Rationale:** `displayName` is universal — present on every one of the 53 honor types. It is an identity-adjacent field, not type-specific contextual data. Placing a universal field inside a sparse metadata object would contradict the sparse metadata principle (AD-51) and would force L-10 to dig into a nested object to render every row. As a top-level field, L-10 renders from `displayName` directly without a metadata lookup or catalog lookup.

**Snapshotting:** `displayName` is snapshotted at earn time by the evaluation service. For unit-adaptive strength honors, it captures the unit-specific name at the time of earning:

| Athlete unit system | bench_milestone_1 displayName |
|---------------------|-------------------------------|
| lbs | `"Bench 135"` |
| kg | `"Bench 60kg"` |

If the athlete later changes their unit preference, existing honors retain their earn-time display name. Historical accuracy is preserved.

For all non-unit-adaptive honor types, `displayName` equals the catalog display name and is the same for all athletes.

See AD-58.

---

## 4. Metadata Specification

`metadata` is a sparse object. Only fields required by the `honorType` are present. No null fields appear for fields that don't apply. An honor type with no type-specific contextual requirements stores `metadata: {}`.

`displayName` is NOT in `metadata`. See Section 3.

### 4.1 Metadata by Category

---

#### STRENGTH — Bench / Squat / Deadlift Milestones (12 types)

Applies to: `bench_milestone_1/2/3/4`, `squat_milestone_1/2/3/4`, `deadlift_milestone_1/2/3/4`

| Field | Type | Definition |
|-------|------|-----------|
| `weightDisplay` | string | Pre-formatted weight at earn time (e.g. `"135 lbs"` or `"60 kg"`) |
| `unitSystem` | `'lbs'` \| `'kg'` | Athlete's account unit system at earn time |

`weightDisplay` is pre-formatted by the evaluation service at earn time. The L-11 description template substitutes it directly: "Earned when your bench press personal record reached [metadata.weightDisplay]."

---

#### STRENGTH — Club Honors (6 types)

Applies to: `club_1000`, `club_1200`, `club_1500`, `club_400kg`, `club_500kg`, `club_600kg`

| Field | Type | Definition |
|-------|------|-----------|
| `unitSystem` | `'lbs'` \| `'kg'` | Which club system (lbs clubs and kg clubs are separate honor types) |
| `benchPR` | number | Bench press all-time PR at earn time, in the athlete's unit |
| `squatPR` | number | Squat all-time PR at earn time, in the athlete's unit |
| `deadliftPR` | number | Deadlift all-time PR at earn time, in the athlete's unit |

Individual PRs are stored as numeric values (not pre-formatted strings). Rendering formats them as needed. The L-11 template for club honors references only the threshold total (e.g. "1,000 pounds"), not the individual PRs — but the individual PRs are preserved for future sharing systems (HS-6).

---

#### CHAPTERS — Count Family (4 types)

Applies to: `first_chapter_sealed`, `chapters_sealed_5`, `chapters_sealed_10`, `chapters_sealed_25`

| Field | Type | Definition |
|-------|------|-----------|
| `chapterName` | string | Name of the chapter that triggered reaching this milestone, snapshotted at earn time |

`chapterId` (top-level) is the ID of the triggering chapter. `metadata.chapterName` is the snapshot. The L-11 template for `first_chapter_sealed` references `[metadata.chapterName]`. For `chapters_sealed_5/10/25`, the template does not reference the chapter name, but it is snapshotted regardless per AD-56 (for future sharing and audit).

---

#### CHAPTERS — Depth Family (4 types)

Applies to: `workouts_in_chapter_10`, `workouts_in_chapter_25`, `workouts_in_chapter_50`, `workouts_in_chapter_100`

| Field | Type | Definition |
|-------|------|-----------|
| `chapterName` | string | Name of the chapter in which the session count threshold was reached, snapshotted at earn time |

`chapterId` (top-level) is the chapter in which the honor was earned. The L-11 template references `[metadata.chapterName]`.

---

#### GOALS — first_goal_achieved (1 type)

| Field | Type | Definition |
|-------|------|-----------|
| `goalId` | string | References Goal — for future navigation only |
| `goalName` | string | Snapshotted goal name at earn time |

The L-11 template references `[metadata.goalName]`. `goalId` is stored for optional navigation. If the goal is later deleted, `goalName` still displays correctly.

---

#### GOALS — Volume Milestones (3 types)

Applies to: `goals_achieved_10`, `goals_achieved_25`, `goals_achieved_50`

```
metadata: {}
```

The L-11 templates are self-contained ("Earned after achieving your 10th goal."). No type-specific context is required.

---

#### PROGRAMS — first_program_graduated (1 type)

| Field | Type | Definition |
|-------|------|-----------|
| `programId` | string | References Program — for future navigation only |
| `programName` | string | Snapshotted program name at earn time |

The L-11 template references `[metadata.programName]`. `programId` is stored for optional navigation.

---

#### PROGRAMS — Volume Milestones (3 types)

Applies to: `programs_graduated_5`, `programs_graduated_10`, `programs_graduated_25`

```
metadata: {}
```

---

#### COMMUNITY — first_workout_with_friend (1 type)

| Field | Type | Definition |
|-------|------|-----------|
| `partnerId` | string | References Athlete (the training partner) — for future navigation only |
| `partnerDisplayName` | string | Snapshotted partner display name at earn time |

The L-11 template references `[metadata.partnerDisplayName]`. `partnerId` is stored for optional navigation. If the partner later changes their display name or deletes their account, `partnerDisplayName` still displays correctly.

---

#### COMMUNITY — Volume Milestones (2 types)

Applies to: `workout_with_friend_10`, `workout_with_friend_50`

```
metadata: {}
```

The WwF count is cumulative across all partners. No single partner is attributed at the volume milestone level.

---

#### TRAINING — All Types (12 types)

Applies to: `first_workout_logged`, `workouts_logged_50/100/250/500/1000`, `hours_forged_100/250/500/1000/2500/5000`

```
metadata: {}
```

All training honor templates are self-contained. No type-specific context is required.

---

#### LONGEVITY — All Types (4 types)

Applies to: `longevity_1_year`, `longevity_3_years`, `longevity_5_years`, `longevity_10_years`

```
metadata: {}
```

The anniversary date is the `dateEarned` field (top-level, per AD-33). All longevity templates are self-contained ("Earned one year after beginning your Forge Legacy."). No type-specific context is required.

---

### 4.2 Metadata Summary Table

| Honor Types | metadata fields |
|-------------|----------------|
| Bench/squat/deadlift milestones (12) | `weightDisplay`, `unitSystem` |
| Club honors (6) | `unitSystem`, `benchPR`, `squatPR`, `deadliftPR` |
| Chapter count honors (4) | `chapterName` |
| Chapter depth honors (4) | `chapterName` |
| `first_goal_achieved` | `goalId`, `goalName` |
| `first_program_graduated` | `programId`, `programName` |
| `first_workout_with_friend` | `partnerId`, `partnerDisplayName` |
| All remaining 24 types | `{}` |

---

## 5. Snapshot Philosophy

**Rule:** Any human-readable string that appears in an L-11 description template, or that would be needed for accurate display if the source entity is renamed, deleted, or becomes inaccessible, must be snapshotted in `metadata` at earn time.

The display layer (`L-11`) never queries external entity records to render a description. `HonorInstance` is fully self-describing for display purposes.

### 5.1 What Changes After Earn Time

| Entity change | Risk | Resolution |
|---------------|------|-----------|
| Chapter renamed | L-11 attribution would show wrong name | Snapshot `chapterName` |
| Goal name edited or goal deleted | Description would break or show wrong name | Snapshot `goalName` |
| Program renamed or archived | Description would show wrong name | Snapshot `programName` |
| Partner changes display name | Description would show wrong name | Snapshot `partnerDisplayName` |
| Partner deletes account | `partnerId` becomes invalid | `partnerDisplayName` still displays |
| Athlete switches unit system | `displayName` and weight description would change | Snapshot `displayName` + `weightDisplay` + `unitSystem` |
| Strength PRs exceeded later | Club honor context would become inaccurate | Snapshot `benchPR`, `squatPR`, `deadliftPR` at earn time |

### 5.2 What Does NOT Need Snapshotting

Entity IDs (`goalId`, `programId`, `partnerId`) are immutable — IDs do not change even when the entity's content changes. They are stored for optional navigation. If the navigation target is later inaccessible, the navigation degrades gracefully; the description continues to display correctly from the snapshotted name.

`honorType`, `athleteId`, `dateEarned`, and `awardedAt` are immutable after write. They require no snapshot protection.

`chapterId` (top-level) is immutable — chapter IDs do not change when chapters are renamed. It is stored for attribution navigation (L-11 tap → L-3/L-4). `metadata.chapterName` is the snapshot for display.

---

## 6. Uniqueness Model

### 6.1 One-Time Honors (49 types)

An honor is earned at most once per athlete, across the athlete's entire legacy.

**Uniqueness key:** `(athleteId, honorType)`

The `chapterId` is `null` for all one-time honors.

### 6.2 Repeatable Honors (4 types)

The chapter depth family (`workouts_in_chapter_10/25/50/100`) is earned at most once per chapter per athlete. The same honor can be re-earned when the athlete begins a new chapter and reaches the same session count.

**Uniqueness key:** `(athleteId, honorType, chapterId)`

`chapterId` is never `null` for repeatable honors.

### 6.3 Enforcement

**Evaluation layer (primary):** The evaluation service checks uniqueness before awarding. It maintains an earned-honor lookup structure per athlete enabling pre-award checks without a database query per honor type per session. The evaluation service is responsible for deduplication — confirmed by M-2 §10 E-4.

**Database constraint (secondary):** A unique constraint on the appropriate composite key per honor category provides belt-and-suspenders protection. Implementation detail — database schema design is deferred.

---

## 7. Historical Integrity Rules

1. `HonorInstance` is a permanent record. No field is editable after write. No honor is deletable by the athlete.

2. L-11 never queries live entity records (Chapters, Goals, Programs, Athletes) to render a description. All display data is present in `HonorInstance`.

3. Entity IDs in `metadata` (`goalId`, `programId`, `partnerId`) are for optional navigation only. Inaccessible navigation targets degrade gracefully; descriptions remain accurate.

4. `metadata.chapterName`, `metadata.goalName`, `metadata.programName`, and `metadata.partnerDisplayName` represent the entity's name at earn time. Subsequent renames do not alter the honor record.

5. `metadata.benchPR`, `metadata.squatPR`, `metadata.deadliftPR` in club honors represent all-time PRs at the moment the club total crossed the threshold — not the athlete's current PRs. These are historical facts.

6. `dateEarned` is immutable after write. It cannot be corrected or adjusted.

---

## 8. Timeline Relationship

**Architecture:** Timeline Events reference `HonorInstance` by `id`. `HonorInstance` has no awareness of Timeline and stores no `timelineEventId` or equivalent.

**Rationale:**
- The honor is the source of truth; the timeline event is a consequence of the honor being awarded
- Navigation flows (L-1 FLM Honor Earned card → L-11, L-10 row → L-11) originate from surfaces that hold `honorId`; they pass it to L-11
- If a timeline event is removed, the honor survives independently
- Confirmed by existing FLM architecture: L-1 FLM stores `honorId` in the event record and passes it to L-11

See AD-53.

---

## 9. Offline and Import Behavior

| Scenario | dateEarned | awardedAt | source | M-2 |
|----------|-----------|-----------|--------|-----|
| Live session (online) | Session date | ~Session date | `live_session` | Fires |
| Offline session | Original offline session date | Sync timestamp | `offline_sync` | Does not fire |
| Import (retroactive) | Historical date when threshold was crossed | Import completion timestamp | `import` | Does not fire |

**L-10 sort order:** L-10 sorts by `dateEarned` descending. An honor awarded via sync or import appears in the correct chronological position in the list, regardless of the `awardedAt` gap. An imported honor from 2022 appears in the list as if it were always there — because it was earned then.

The `dateEarned` / `awardedAt` dual-field design (AD-33) is the complete and sufficient mechanism for all offline and import scenarios. No additional fields are required.

---

## 10. Schema Version Governance

`schemaVersion` governs the top-level field structure of `HonorInstance` — the named fields and their types defined in Section 2. It does NOT govern the metadata payload shape.

Metadata shape is keyed by `honorType`. The combination of `(honorType, schemaVersion)` fully describes any record's shape. No separate metadata version field is required.

**Increment rules:**
- `schemaVersion` increments when the top-level field structure changes: adding, removing, or retyping a top-level field
- Adding new honor types to the catalog (catalog expansion in V1.1+) does NOT require incrementing `schemaVersion`. The core structure is unchanged; only the set of valid `honorType` values grows
- Adding optional metadata fields to new honor types does NOT require a `schemaVersion` bump

All MVP records are written with `schemaVersion: 1`.

---

## 11. Architecture Decisions

| Decision | Summary |
|----------|---------|
| AD-33 (existing) | Dual date fields: `dateEarned` (qualification date, displayed) and `awardedAt` (record write timestamp) |
| AD-50 (new) | HonorInstance stores no derived fields — `category` and `family` are computed from `honorType` at runtime |
| AD-51 (new) | `metadata` is a sparse object — only fields required by the `honorType` are present; no null placeholder fields |
| AD-52 (new) | All display strings referenced by L-11 templates must be snapshotted at earn time; the display layer never queries live entities |
| AD-53 (new) | Timeline Events reference `HonorInstance` by `id`; `HonorInstance` has no back-reference to Timeline |
| AD-54 (new) | `source` field (`live_session` \| `offline_sync` \| `import`) — internal audit field; never displayed to the athlete |
| AD-55 (new) | `chapterId` (top-level) is the second uniqueness key component for repeatable honors; `null` for all one-time honors |
| AD-56 (new) | `metadata.chapterName` is always snapshotted when `chapterId` is set, regardless of whether the L-11 template references it |
| AD-57 (new) | `schemaVersion` field (`= 1` for all MVP records) enables future migration scripts to identify record format; governs top-level structure only |
| AD-58 (new) | `displayName` is a top-level field — not in `metadata`; snapshotted at earn time; L-10 renders from it directly without catalog or metadata lookup |

---

## 12. Open Items

The following are out of scope for this architecture note and are deferred:

- **Evaluation service architecture** — concrete trigger mapping, evaluation pipeline, and earned-honor lookup data structure per honor type
- **Database schema** — physical tables, indexes, composite unique constraints
- **API contracts** — how `HonorInstance` records are served to clients and synced to local storage
- **L-11 description generation service** — how templates are resolved at render time using `metadata` values

---

## 13. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial lock |

---

*HonorInstance Architecture — v1.0 — LOCKED*
*Forge Legacy | June 2026*
