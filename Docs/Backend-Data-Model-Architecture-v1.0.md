# Backend / Data-Model Architecture
## v1.0.1 — LOCKED | June 2026

**Status:** LOCKED
**Type:** Architecture Note (governing)
**Authority:** Synthesizes and reconciles ~20 locked specs into one canonical data-model authority, including: `Account-Auth-Architecture.md`, `Exercise-Library-Architecture-v1.0.md`, `Exercise-001/002/003`, `Program-Catalog-Architecture-v1.0.md`, `Program-Ecosystem-Architecture-v1.0.md`, `ExercisePrescription-Amendment-001.md`, `Active-Workout-Flow-Spec-W9-W16.md`, `L-5-Chapter-Creation-Spec.md`, Goal/Chapter/Accomplishment/Photo specs (G1-G3, L-3/L-4, L-12-L-16), `Honor-Catalog-v1.0-LOCKED.md`, `HonorInstance-Architecture-v1.0.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `Rank-System-Architecture.md`, `Rank-Computation-Model.md`, `Social-System-Architecture-v1.0.md`, `Squad-System-Architecture-v1.0.md`, Community-System/Feed/Discovery/Roles docs, `Challenge-System-Architecture` (v1.5) + C1-C7, `P-5/P-6 Notifications/Privacy`, `Architecture-Amendment-001-Import.md`, `Monetization-Architecture-Amendment-001.md` (+ Amendment 002), `Critical-Decisions-Amendment-001`.

> **This document does not write implementation code and does not resolve any numeric threshold or trigger-event TBD already tracked in `Rank-Computation-Model.md`.** It fixes entity shapes, relationships, and governing principles only. The Firebase stack recommendation (Section 1) is ratified as part of this lock. Remaining open questions are tracked in Section 20.

---

## 1. Backend Stack

### 1.1 Why a stack must be chosen now

`Account-Auth-Architecture.md` §8.2 explicitly deferred "backend authentication service (token issuance, validation, refresh, revocation)... not designed here — implementation-layer" and flagged it "for whichever document designs the backend auth service." `Honor-Evaluation-Service-Architecture-v1.0.md` states outright "this document does not define database schemas." No document in the repository has ever evaluated a stack. This is that document.

### 1.2 Comparative evaluation

Forge Legacy's actual requirements, derived from already-locked product behavior (not invented for this exercise):
- **Offline-first** is an explicit product requirement — athletes log sets mid-workout in gyms with unreliable signal, and the Honor Evaluation Service already has a first-class `offline_sync` provenance value baked into its trigger table (§3.1 of that doc).
- **Real-time feeds** — Squad Feed, Friends Feed, Community Feed, live Challenge standings, Squad Streak/Momentum all assume near-real-time propagation across members.
- **Heavy relational structure** — the entity graph reconciled in Section 3 below (Chapter → Goal/Photo/WorkoutSession; Athlete → Rank/HonorInstance; Squad → Member/Goal/Mission; the atomic 7-step Honor Evaluation pipeline) is deeply relational, not a flat document store's natural shape.
- **Photo + exercise-media storage** at scale (195 exercises × 5 media fields; uncapped-on-premium athlete photo libraries).
- **Pre-revenue, cost-sensitive** — Monetization Amendment 001 establishes a free tier; the project has zero current revenue funding infrastructure spend.
- **Expo / React Native** client (per AGENTS.md — Expo v56).
- **Server-authoritative evaluation** — Honors and Rank must never be client-computed (see Section 6, API Philosophy).

| Criterion | **Firebase** (Firestore + Auth + Storage + Functions) | **Supabase** (Postgres + Auth + Storage + Edge Functions) | **Custom** (Node/Postgres, self-hosted) |
|---|---|---|---|
| Offline-first | Built-in local cache + listener reconciliation; mature, first-party support on RN/Expo | Weaker offline story — Postgres-backed, no first-party offline cache comparable to Firestore's | Fully manual — highest engineering cost to replicate |
| Real-time feeds | Native real-time listeners; direct fit for squad/feed/streak/standings use cases | Realtime via Postgres logical replication — works, but more setup and operational surface | Manual (websockets/SSE) — most flexible, most cost |
| Relational integrity (Chapter/Goal/Honor/Rank graph) | Document model — relationships denormalized; requires discipline (see §4 Physical Storage Model) | Postgres = real relational integrity, foreign keys, multi-table transactions — best natural fit for this entity graph | Best possible fit, but full ownership cost |
| Free-tier cost (pre-revenue) | Generous free tier, scales with usage | Generous free tier, scales with usage | No managed free tier — hosting cost from day one |
| Server-authoritative evaluation logic (7-step Honor pipeline, Rank Service) | Cloud Functions support this, but cold-start latency and document-transaction limits (500 docs/txn) constrain very large multi-step batches | Edge Functions + Postgres transactions are a more natural fit for atomic multi-step pipelines | Most natural fit, highest engineering cost |
| Operational overhead | Lowest (fully managed, single vendor) | Low (managed, but more moving pieces: DB + Auth + Functions + Realtime as semi-distinct services) | Highest |

### 1.3 Recommendation

**Recommend Firebase** (Firestore + Firebase Auth + Cloud Storage + Cloud Functions), with **Supabase as the explicit runner-up**.

**Reasoning:** Offline-first is not a nice-to-have here — it is a stated, load-bearing product requirement, and Firestore's offline cache and listener-reconciliation model on React Native/Expo is materially more mature than Supabase's Postgres-backed offline story. This single criterion outweighs Postgres's stronger natural fit for the relational entity graph.

**The cost being knowingly accepted:** Firestore's document model is a weaker natural fit for the heavily relational graph in Section 3 than Postgres's relational integrity and transactions would be. This is mitigated, not ignored — Section 4 (Logical vs. Physical Storage Model) specifies denormalization and transaction-batching patterns explicitly rather than pretending the document model is relational.

**This recommendation is a LOCK-CANDIDATE position, not a final decision.** It does not unilaterally override `Account-Auth-Architecture`'s deferral — PO ratification is required (see Section 20, Open Questions/Blockers).

---

## 2. Runtime Services

Defines service boundaries and authoritative-writer responsibilities — not endpoints, not implementation.

> **Component display contracts:** All entity display components for the entities below are governed by [`Component-Library-Architecture-v1.0.md`](Component-Library-Architecture-v1.0.md) (Architecture Freeze Row 18). Data schema is defined here; how those entities render in UI components (variants, states, tokens, accessibility) is defined there.

| Service | Responsibility | Authoritative writer for |
|---|---|---|
| **Authentication Service** | `Account` / `AuthSession` / `Athlete` lifecycle; token issuance, validation, refresh, revocation; re-auth gate before account deletion; billing and entitlement state | `Account`, `AuthSession`, `Athlete`, `Profile`, `Subscription`, `EntitlementCounter`, `NotificationPreference`, `PrivacySettings`, `AthleteShareSettings` |
| **Workout Service** | `Chapter` and `Goal` lifecycle; `WorkoutSession` / `WorkoutTemplate` CRUD; `ProgramDefinition` (ATHLETE_CREATED) and `ProgramInstance` authoring; `ExerciseDefinition` (CUSTOM) authoring; `Accomplishment` CRUD; carry-forward resolution from prior `ExerciseLog` values (not prescriptions); maintains `Chapter.primaryGoalId` in sync with `Goal.isPrimary` (see Section 19) | `Chapter` (excluding `Chapter.honors[]`), `Goal`, `WorkoutSession`, `WorkoutTemplate`, `ExerciseLog`, `ProgramDefinition` (ATHLETE_CREATED), `ProgramInstance`, `ExerciseDefinition` (CUSTOM), `Accomplishment` |
| **Honor Evaluation Service** | The locked 7-step pipeline (`Honor-Evaluation-Service-Architecture-v1.0.md` §5); sole writer of awarded honors; maintains `AthleteStatistics` and `PRRecord` as precomputed pipeline inputs; creates `TimelineEvent` at step [6]; queues `CeremonyQueueItem` at step [7]; **appends to `Chapter.honors[]` at step [5]** — the only writer of that array | `HonorInstance`, `AthleteStatistics`, `PRRecord`, `TimelineEvent`, `CeremonyQueueItem`, `Chapter.honors[]` (append-only) |
| **Rank Service** | Consumes Chapter-Seal (and other TBD, per `Rank-Computation-Model.md`) trigger events; computes category evidence and promotion | `Rank`, `RankCategory` |
| **Social Service** | Friend relationship lifecycle; `Post` creation, archival, deletion; `Reaction` and `Comment` on Posts; milestone auto-post emission (`source = MILESTONE_AUTO`, triggered by events from Honor Evaluation Service and Rank Service) | `Friend`, `Post`, `Reaction`, `Comment` |
| **Challenge Service** | Challenge lifecycle from DRAFT through COMPLETED / ARCHIVED; participant enrollment and withdrawal; `ChallengeScore` materialization after each qualifying session save; `ChallengeResult` written once at COMPLETED | `Challenge`, `ChallengeParticipant`, `ChallengeScore`, `ChallengeResult`, `SquadChallengeRecord` |
| **Community Service** | Squad + Community membership, roles, moderation queue; enforces the Performance Firewall at the query layer | `Squad`, `SquadMember`, `SquadGoal`, `SquadMission`, `SquadCheckIn`, `SquadStreak`, `SquadMomentum`, `SquadFeedEntry`, `SquadAnalytics`, `Community`, `CommunityMember`, `CommunityJoinRequest`, `CommunityPost`, `CommunityComment`, `CommunityReport`, `CommunityHonor` |
| **Search Service** | Indexes Athlete/Exercise/Community fields per Section 14; does **not** implement the still-deferred Global Search UX (Freeze row 17) | search index projections only — never the system-of-record entities |
| **Notification Service** | Fan-out for push/in-app delivery per `NotificationPreference` toggles | `Notification` |
| **Sync Service** | Owns the offline conflict-resolution strategy (Section 17) and the `source` provenance marker on synced writes | reconciliation of provisional offline writes |
| **Import Service** | CSV/XLSX/paste ingestion → `ProgramDefinition(source = IMPORTED)` | `ProgramDefinition` (IMPORTED), `ProgramSlot` (imported) |
| **Media Service** | Cloud Storage path ownership and `Photo` record lifecycle for athlete photos; exercise media fields; `Post.media[]` | `Photo`, storage object lifecycle for all media |

**Governing rule:** only the named authoritative writer for an entity may write to it. E.g., only the Honor Evaluation Service may create `HonorInstance` rows or append to `Chapter.honors[]`; the Workout Service cannot award honors directly, even though session save is what triggers evaluation.

> **FORGE seed data:** `ExerciseDefinition(source = FORGE)` and `ProgramDefinition(source = FORGE)` are content-seeded at deployment time. No runtime service may alter FORGE-authored records at runtime.

---

## 3. Core Entity Model — Canonical Reconciliation

Three independent research passes over the locked specs surfaced overlapping but inconsistent field sets for several entities. This section is the single resolution point — every later section references these canonical names and shapes without re-deriving them.

### 3.1 Account vs. Athlete

**Conflict:** locked specs use "Account" and "Athlete" inconsistently — sometimes for the auth identity, sometimes for the in-app profile.

**Resolution — split into two entities:**
- **`Account`** (auth identity): `id`, `email` (unique), `passwordHash | authProvider`, `accountStatus` {Active, PendingDeletion, Deleted}, `deletedAt | null`, `accountCreationDate` (immutable, drives Longevity honors per AD-33)
- **`Athlete`** (1:1 in-app profile): `athleteId` (= `Account.id`), `displayName`, `username | null` (per Identity-Amendment-001), `athleteType` {Strength, Bodybuilding, Endurance, Hybrid}, `unitSystem` {lbs, kg}, `distanceUnit` {mi, km}, `profilePhotoRef | null`, `bio | null`

This matches the email-vs-username split already locked in `Account-Auth-Architecture.md` / Identity-Amendment-001 and keeps auth concerns separate from profile concerns.

### 3.2 AuthSession vs. WorkoutSession

**Conflict:** the auth-token construct and the workout-record construct were both informally called "Session" across different docs, colliding on name.

**Resolution:**
- **`AuthSession`** (renamed from the bare "Session" used for auth): `token`, `athleteId`, `createdAt`, `expiresAt`, `revokedAt | null`
- **`WorkoutSession`** retains the name for the workout/activity record (full schema in Section 5)

No locked doc ever formally named the auth construct "Session" — this is a normalization to remove an ambiguity, not a reversal of a locked decision.

### 3.3 WorkoutSession — merged

**Conflict:** one research pass over Exercise Library / Program docs surfaced program-integration fields (`programId`, `slotIndex`, `templateId`, `sessionOrigin`, `playlistUrl`, `trainingPartnerIds`); a separate pass over Honor Evaluation docs surfaced evaluation-relevant fields (`durationMinutes` computed via the AD-40 "trust model," `distanceValue`/`distanceUnit`, `source`). These are not two entities — the second pass only saw the evaluator-facing projection of the same record.

**Canonical `WorkoutSession`:** see Section 5.

### 3.4 Chapter — reconciled and spot-verified

**Conflict:** one pass surfaced a 3-value `state` enum (`ACTIVE | SEALED | ARCHIVED`); another surfaced a 2-value `activeStatus` (`ACTIVE | SEALED`) plus more complete fields.

**Resolution — spot-checked against source:** `L-5-Chapter-Creation-Spec.md` line 286 defines chapter creation as `{ name, athleteId, createdAt: now, status: Active }`, and the rest of that document and `M-5-Chapter-Sealing-Confirmation-Spec.md` only ever reference `Active` and `Sealed`. **No `ARCHIVED` state exists in any locked spec.** The 3-value enum is not grounded and is dropped.

**Canonical `Chapter`:** `id`, `athleteId`, `name`, `ordinal` (computed: count of sealed chapters + 1), `startedAt`, `status` {Active, Sealed}, `sealedAt | null`, `primaryGoalId | null`, `sessionCount` (incremented at session save; drives ChapterDepth honors), `honors[]` (denormalized `HonorInstance` ID references, not embedded), `photos[]` (denormalized `Photo` ID references, not embedded), `reflectionText | null` (locked once sealed), `memories[]` (post-sealing additions, array of `{text, addedAt}`, not locked), `createdAt`.

`endedAt` is renamed `sealedAt` to match the "Chapter Seal" terminology used consistently by the Rank and Honor trigger-event tables.

**`Chapter.honors[]` population rule:** this array is maintained exclusively by the Honor Evaluation Service (per Section 2 — the sole writer of `Chapter.honors[]`), as part of pipeline step [5]. When any `HonorInstance` is created — regardless of whether `HonorInstance.chapterId` is `null` (one-time honor) or non-null (repeatable honor) — the athlete's currently Active chapter's `honors[]` array receives the new `HonorInstance.id` as an atomic append in the same step-[5] transaction batch. The "currently Active chapter" is resolved at evaluation time as the single `Chapter` where `athleteId = X` and `status = Active`. This makes `Chapter.honors[]` the canonical source for "which chapter was the athlete in when they earned this honor" — independent of `HonorInstance.chapterId`, which tracks only repeatable-per-chapter eligibility, not chapter membership at award time.

### 3.5 Goal — reconciled

**Conflict:** one pass surfaced a lossy boolean shape (`isAchieved: boolean`, `type: PRIMARY | SECONDARY`); another surfaced a status-enum shape with lock-at-seal semantics that downstream Honor/Rank evaluation actually depends on.

**Resolution:** adopt the status-enum version.

**Canonical `Goal`:** `id`, `athleteId`, `chapterId` (non-nullable; a Goal cannot move between chapters), `goalName`, `isPrimary` (boolean; one Primary per active chapter), `targetValue | null`, `targetUnit | null` (only populated when `targetValue` is set), `currentValue | null`, `status` {IN_PROGRESS, ACHIEVED, NOT_ACHIEVED} (status locks at Chapter Seal), `achievedAt | null`, `associatedProgramId | null` (**FK → `ProgramInstance.id`**, not `ProgramDefinition.id`; display-only context linking the goal to the athlete's specific program run; must reference a `ProgramInstance` in `ACTIVE` state at the time of association).

### 3.6 HonorInstance — no real conflict

One pass surfaced the full schema; another surfaced a lighter view limited to categories relevant to Social/Squad/Community honors. These are not in conflict — the lighter view is a subset. The Squad/Competition/Communities categories it surfaced are additive entries already present in the 167-type, 13-category catalog (`Honor-Catalog-v1.0-LOCKED.md` v1.5).

**Canonical `HonorInstance`:** `id`, `athleteId`, `honorType` (catalog ID, FK into the 167-type catalog), `displayName` (snapshotted at earn time, unit-adaptive per AD-58), `dateEarned` (date, qualification date), `awardedAt` (timestamp, record-write time), `chapterId | null` (non-null only for the 9 repeatable-per-chapter families), `source` {live_session, offline_sync, import, challenge}, `schemaVersion` (= 1), `metadata` (sparse object; only fields the specific `honorType` requires, per AD-51 — no null placeholders).

**Uniqueness (AD-55):** one-time honors → unique on `(athleteId, honorType)`; repeatable honors → unique on `(athleteId, honorType, chapterId)`.

### 3.7 Profile and PinnedLegacyItem

Per `P-1-Amendment-004-Pinned-Legacy.md` (LOCKED, merged into `Profile-Wireframe-Spec-P1.md` v1.3). Authoritative writer: Authentication Service (account-level identity data, per Section 2).

```
Profile {
  athleteId: uuid                           // = Athlete.id, 1:1
  pinnedLegacyItems: PinnedLegacyItem[]     // max 6, athlete-curated, reorderable, display-only
}

PinnedLegacyItem {
  targetId: uuid
  targetType: 'HONOR' | 'RANK_UP' | 'PROGRAM_GRADUATION' | 'CHAPTER_COMPLETION' | 'CHALLENGE_VICTORY' | 'PR_POST' | 'ACCOMPLISHMENT'
  order: number                             // 0-based display order
}
```

`Profile` is the display-only composition surface for P-1. Pinning has zero effect on rank, progression, scoring, or eligibility.

---

## 4. Logical Data Model vs. Physical Storage Model

### 4.1 Logical Data Model

The entity/field/relationship definitions in Sections 3 and 5–10 are the **stack-agnostic logical model**. They are the system of record regardless of which backend ultimately implements them, and they are what survives if the stack recommendation in Section 1 is later revisited.

### 4.2 Physical Storage Model (Firestore mapping)

Given the Section 1 recommendation, the logical model maps onto Firestore as follows:

- **Top-level collections** for independently-queried entities: `accounts`, `athletes`, `chapters`, `goals`, `workoutSessions`, `workoutTemplates`, `programDefinitions`, `programInstances`, `exerciseDefinitions`, `honorInstances`, `ranks`, `squads`, `communities`, `challenges`, `posts`.
- **Reference arrays, not embedded documents**, for one-to-many relationships that could otherwise breach Firestore's per-document size limit: `Chapter.honors[]` and `Chapter.photos[]` store `HonorInstance`/`Photo` document IDs, never embedded copies. The same pattern applies to `ProgramDefinition.slots` (kept as a subcollection if `totalWorkouts` grows large, rather than an embedded array, to avoid hot-document write contention during authoring).
- **Subcollections** for entities that are always queried scoped to a parent and never independently: `squads/{squadId}/members`, `squads/{squadId}/feedEntries`, `communities/{communityId}/members`, `chapters/{chapterId}/memories`.
- **Transaction batching** for the Honor Evaluation Service's atomic steps [4]–[7] (`Honor-Evaluation-Service-Architecture-v1.0.md` §5) — implemented as a single Firestore transaction per evaluation run, respecting the 500-document-per-transaction limit; evaluation runs that would exceed this (none currently do, per the locked evaluator-family design) must be flagged as a design violation, not silently chunked.
- **Composite indexes** anticipated up front for: Exercise Library taxonomy filtering (`category` + `movementPattern` + `equipment`), Squad/Community membership lookups (`athleteId` + `squadId`/`communityId`), and Chapter-scoped queries (`athleteId` + `status`).

This separation is deliberate: if Firebase is ever replaced, Section 4.1 (the logical model) does not need to be rewritten — only Section 4.2.

---

## 5. Workout / Session Model

### 5.1 Canonical `WorkoutSession`

```
WorkoutSession {
  id: uuid
  athleteId: uuid
  chapterId: uuid                     // active chapter at session time
  programId: uuid | null              // FK → ProgramInstance.id (not ProgramDefinition.id); null for free workouts
  slotIndex: number | null            // null for free workouts; matches ProgramInstance.currentSlotIndex at session start
  templateId: uuid | null             // null for program/blank workouts
  sessionOrigin: 'TEMPLATE' | 'CARRY_FORWARD' | 'BLANK' | null   // free workouts only

  activityType: ActivityType
  slotName: string                    // snapshotted at creation; never updated
  startedAt: timestamp
  completedAt: timestamp | null
  durationMinutes: number             // computed per the AD-40 "trust model" — includes backgrounded/locked time
  isPartial: boolean                  // true = "Save & Exit" mid-session

  distanceValue: number | null        // RUN/WALK/BIKE/SWIM
  distanceUnit: 'mi' | 'km' | null

  exercises: ExerciseLog[]            // set-level logs
  notes: string | null
  playlistUrl: string | null
  trainingPartnerIds: uuid[]          // Workout-With-Friend

  source: 'live_session' | 'offline_sync' | 'import'
  createdAt: timestamp
  updatedAt: timestamp
}
```

`ActivityType` enum (9 values): `STRENGTH`, `RUN`, `WALK`, `BIKE`, `SWIM`, `HIIT`, `MOBILITY`, `YOGA`, `OTHER`.

### 5.2 ExerciseLog (set-level record, embedded in WorkoutSession.exercises[])

```
ExerciseLog {
  exerciseId: uuid                    // FK: ExerciseDefinition
  exerciseName: string                // snapshotted at log time; immutable
  sets: number
  reps: number | null
  durationSeconds: number | null
  weight: number | null
  distance: number | null
  rpe: number | null
  notes: string | null
}
```

### 5.3 Duration trust model (AD-40), stated once

`durationMinutes` is computed identically regardless of whether the device is foregrounded, backgrounded, or locked during the session — Forge Legacy trusts the athlete's stated start/end time rather than attempting activity detection. This single rule applies uniformly to live sessions and to sessions reconciled via offline sync.

---

## 6. API Philosophy

Governing principles, not endpoints:

1. **The client never computes authoritative progression.** Honors, Rank, and Streaks are always server-computed; the client only renders server-returned state.
2. **The server validates and awards every Honor.** No client-side honor-awarding code path exists, even for offline-originated sessions — `offline_sync` sessions are evaluated server-side once synced.
3. **The server owns Rank progression end-to-end.** The client cannot submit a rank value, a promotion, or a category-evidence score directly.
4. **Offline writes are provisional until synced.** `WorkoutSession.source = offline_sync` marks a write as unconfirmed until the Sync Service reconciles it (see Section 17).
5. **The client caches read models locally for offline display, but never treats the cache as the source of truth.** Local Firestore cache is a UX convenience, not an authority.
6. **Cross-athlete visibility is enforced server-side at the query layer**, never left to client-side filtering — this is the data-model enforcement point for the Performance Firewall (Section 18).

---

## 7. Scalability Assumptions

Documented assumptions for V1, not commitments:

- **Expected V1 users:** small — pre-launch/early-access scale, low hundreds to low thousands of athletes.
- **Expected growth:** organic; no paid-acquisition spike assumed for V1.
- **Horizontal scaling:** deferred entirely to the managed stack's native scaling (Firestore auto-scales within free/paid tiers); no custom sharding designed for V1.
- **Document/row size assumptions:** `Chapter` and `Squad` documents must stay within Firestore's per-document size limit by using reference arrays (`honors[]`, `photos[]`) rather than embedding full child records (see Section 4.2).
- **Indexing assumptions:** composite indexes anticipated for Exercise Library taxonomy filtering and Squad/Community membership lookups (Section 4.2); this is stated here so Section 14 (Search / Indexing Implications) does not need to re-derive it.

---

## 8. Data Relationship Map

| Parent | Relationship | Child | Cardinality / scope |
|---|---|---|---|
| `Account` | owns | `Athlete` | 1:1 |
| `Athlete` | owns | `Chapter` | 1:N, **one `Active` chapter max at any time** |
| `Chapter` | owns | `Goal`, `Photo`, `WorkoutSession`, `Accomplishment` (when chapter-scoped) | 1:N each, chapter-scoped |
| `Athlete` | owns | `Rank`, `Profile`, `AthleteStatistics`, `PRRecord[]` | 1:1 (or 1:N for PRRecord, one per lift) — account-level |
| `Athlete` | owns | `HonorInstance[]` | 1:N — account-level (chapter-scoped only for the 9 repeatable families) |
| `Athlete` | owns | `ProgramInstance` | 1:N, **one Active instance max** (not monetized — applies at all tiers) |
| `Athlete` | member of | `Squad` (via `SquadMember`) | N:M, free tier capped at 2 squads |
| `Athlete` | owns | at most one `Community` | 1:1 max — **not monetized**, capped at all tiers |
| `Athlete` | member of | `Community` (via `CommunityMember`) | N:M, free tier capped at 1 membership |
| `Squad` | owns | `SquadGoal`, `SquadMission` | 1:1 (one active each, independent of each other) |
| `Squad` | owns | `SquadCheckIn[]`, `SquadStreak`, `SquadMomentum`, `SquadFeedEntry[]`, `SquadAnalytics` | squad-scoped, aggregate-only — no per-member breakdown leaves the squad boundary |
| `Community` | owns | `CommunityPost[]`, `CommunityJoinRequest[]`, `CommunityReport[]` | community-scoped |
| `Challenge` | scoped to | exactly one of `Squad`, `{Friends roster}`, `Community` | via `context` enum, immutable after creation |

### Scope classification (used consistently across this document)

- **Account-level** (survives across chapters): `HonorInstance`, `PRRecord`, `Rank`, `AthleteStatistics`, `Profile`, `Subscription`, `EntitlementCounter`.
- **Chapter-scoped** (tied to one chapter, cannot move): `Goal`, `Photo`, `WorkoutSession` (references its active chapter), `Accomplishment` (when `chapterId` is set — `null` = account-level Accomplishment).
- **Squad-scoped**: `SquadGoal`, `SquadMission`, `SquadCheckIn`, `SquadStreak`, `SquadMomentum`, `SquadFeedEntry`, `SquadAnalytics`.
- **Community-scoped**: `CommunityPost`, `CommunityComment`, `CommunityReport`, `CommunityJoinRequest`.

### 8.1 Monetization entities

Per `Monetization-Architecture-Amendment-001.md` (+ Amendment 002). Authoritative writer: Authentication Service (per Section 2).

```
Subscription {
  athleteId: uuid
  tier: 'Free' | 'Premium'
  status: 'Active' | 'Cancelled' | 'Expired'
  startDate: date; endDate: date | null; renewalDate: date | null
}

EntitlementCounter {
  athleteId: uuid
  customPrograms: number        // ATHLETE_CREATED ProgramDefinitions; Free max: 3; Premium: unlimited
  photos: number                // Free max: 50; Premium: unlimited
  squadsJoined: number          // Free max: 2; Premium: unlimited
  importsCompleted: number      // Free max: 1 lifetime; Premium: unlimited
  communityMemberships: number  // Free max: 1; Premium: unlimited
  hasUsedFreeImport: boolean    // true after any import completes on a Free account
  updatedAt: timestamp
}
```

Per "Never Charge For History" (Monetization Amendment 001): reaching any cap blocks new creation/upload but never deletes existing records. See Section 9 for the `customPrograms` cap enforcement point in the Programs Model, and Section 15 for the `photos` cap.

---

## 9. Programs Model

```
ProgramDefinition {
  id: uuid
  name: string (max 60 chars)
  version: string
  source: 'FORGE' | 'ATHLETE_CREATED' | 'IMPORTED'
  authorId: uuid | null              // null for FORGE
  category: ProgramCategory | null   // null for IMPORTED
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
  environment: ProgramEnvironment | null
  goalAlignment: TrainingGoal[]       // empty for IMPORTED
  durationWeeks: number | null
  workoutsPerWeek: number | null
  totalWorkouts: number
  description: string | null
  slots: ProgramSlot[]                // section-first model
  isFeatured: boolean                 // FORGE only
  successorProgramId: uuid | null
  sortOrder: number
  publishedAt: timestamp | null
  createdAt: timestamp
  updatedAt: timestamp
}
```

- **`ProgramCategory`** (8): `STRENGTH`, `HYPERTROPHY`, `CONDITIONING`, `RUNNING`, `CYCLING`, `COMBAT_SPORTS`, `FULL_BODY`, `MOBILITY`
- **`ProgramEnvironment`**: `GYM`, `HOME`, `OUTDOOR`, `MIXED`
- **`TrainingGoal`** (11): `BUILD_STRENGTH`, `BUILD_MUSCLE`, `IMPROVE_ENDURANCE`, `IMPROVE_CONDITIONING`, `INCREASE_POWER`, `IMPROVE_MOBILITY`, `LOSE_FAT`, `BUILD_LEAN_MASS`, `IMPROVE_ATHLETIC_PERFORMANCE`, `GENERAL_FITNESS`, `RETURN_FROM_INJURY`

```
ProgramSlot {
  id: uuid; programId: uuid; slotIndex: number
  name: string; weekNumber: number | null; dayOfWeek: number | null
  sections: WorkoutSection[]          // WARM_UP | MAIN | COOL_DOWN — MAIN always present
}

ExercisePrescription {
  exerciseId: uuid; order: number
  sets: number | null; reps: number | null; durationSeconds: number | null   // reps/duration mutually exclusive
  weightValue: number | null; weightUnit: 'lbs' | 'kg' | null
  distanceValue: number | null; distanceUnit: 'm' | 'km' | 'mi' | null        // EP-A1
  restSeconds: number | null                                                  // reference only, count-up timer enforces nothing
  notes: string | null (max 200 chars)
}

WorkoutTemplate {
  id: uuid; athleteId: uuid; name: string (max 60); activityType: ActivityType | null
  sections: WorkoutSection[]; createdAt: timestamp; updatedAt: timestamp
  lastUsedAt: timestamp | null; useCount: number
}

ProgramInstance {
  id: uuid; athleteId: uuid; programDefinitionId: uuid
  state: 'ACTIVE' | 'FUTURE' | 'GRADUATED' | 'ENDED_EARLY'
  startedAt: timestamp | null; endedAt: timestamp | null
  workoutsCompleted: number; currentSlotIndex: number
  instanceName: string | null
  createdAt: timestamp; updatedAt: timestamp
}
```

**`customPrograms` cap:** creating a new `ProgramDefinition(source = ATHLETE_CREATED)` increments `EntitlementCounter.customPrograms`; the Workout Service must check this counter against the Free-tier limit (3) before creating the record. FORGE-authored definitions (`source = FORGE`) do not count against this cap.

**Copy-semantics rule (stated once, applies everywhere):** when a `ProgramSlot`'s exercises become a `WorkoutSession`, the prescription is **copied**, not referenced. Subsequent edits to the template or program definition never retroactively alter a logged session. This rule also governs `WorkoutTemplate` → `WorkoutSession` and the Import model (Section 13).

---

## 10. Exercise Library Model

```
ExerciseDefinition {
  id: uuid; name: string (max 60, unique per source)
  source: 'FORGE' | 'CUSTOM'                    // immutable
  authorId: uuid | null                         // null for FORGE

  category: ExerciseCategory | null              // required for FORGE
  movementPattern: MovementPattern | null
  primaryMuscles: MuscleGroup[]                  // 1-4 for FORGE
  secondaryMuscles: MuscleGroup[]                // 0-4
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
  equipment: EquipmentTag[]                      // min 1 for FORGE; BODYWEIGHT valid
  environmentTags: EnvironmentTag[]

  description, whyItMatters: string | null
  instructions, tips, commonMistakes: string[]   // required for FORGE before isActive; empty for CUSTOM

  gifUrl, gifThumbnailUrl, videoUrl, imageUrl, muscleTargetImageUrl: string | null

  alternativeExerciseIds, progressionExerciseIds, regressionExerciseIds: uuid[]   // FORGE only

  isActive: boolean                              // false = soft-deleted (CUSTOM only)
  createdAt: timestamp; updatedAt: timestamp
}
```

- **`ExerciseCategory`** (6): `PUSH`, `PULL`, `LEGS_AND_GLUTES`, `CORE`, `FULL_BODY`, `MOBILITY`
- **`MovementPattern`** (21): `PUSH_HORIZONTAL`, `PUSH_VERTICAL`, `PUSH_DIAGONAL`, `PULL_HORIZONTAL`, `PULL_VERTICAL`, `PULL_CURL`, `SQUAT`, `HINGE`, `KNEE_ISOLATION`, `PLYOMETRIC_LOWER`, `CORE_ANTI_EXTENSION`, `CORE_ANTI_ROTATION`, `CORE_FLEXION`, `CORE_ROTATION`, `CARRY`, `EXPLOSIVE_FULLBODY`, `STRETCH_STATIC`, `STRETCH_DYNAMIC`, `JOINT_MOBILITY`, `FOAM_ROLL`, `BREATHWORK`
- **`MuscleGroup`** (14): `CHEST`, `BACK`, `SHOULDERS`, `BICEPS`, `TRICEPS`, `FOREARMS`, `CORE`, `LOWER_BACK`, `GLUTES`, `QUADS`, `HAMSTRINGS`, `CALVES`, `HIP_FLEXORS`, `FULL_BODY`
- **`EquipmentTag`** (18): `BARBELL`, `DUMBBELL`, `KETTLEBELL`, `WEIGHT_PLATE`, `SQUAT_RACK`, `BENCH`, `PULL_UP_BAR`, `DIP_BAR`, `RESISTANCE_BAND`, `TRX`, `ROWING_MACHINE`, `SLED`, `BATTLE_ROPES`, `CABLE_MACHINE`, `MACHINE`, `FOAM_ROLLER`, `LACROSSE_BALL`, `BODYWEIGHT`
- **`EnvironmentTag`** (3): `GYM`, `HOME`, `OUTDOOR`

```
UserFavoriteExercise { athleteId: uuid; exerciseId: uuid; createdAt: timestamp }
```

**Carry-forward rule:** free workouts of the same `activityType` auto-populate from the **actual logged values** of the last completed session's `ExerciseLog` entries — never from `ExercisePrescription` targets.

---

## 11. Honors / Rank Evaluation Model

### 11.1 HonorType (catalog record — 167 types, 13 categories, 34 families; LOCKED in `Honor-Catalog-v1.0-LOCKED.md` v1.5)

Catalog fields: `honorType` (string ID), `displayName`, `category`, `family`, `qualification` (rule, varies by type), `repeatability` (boolean — 158 one-time, 9 repeatable per chapter).

### 11.2 HonorInstance — see Section 3.6 for the canonical schema.

### 11.3 Evaluation pipeline (7 steps, atomic for steps 4–7, per `Honor-Evaluation-Service-Architecture-v1.0.md` §5)

`[1] Persist source event → [2] Update AthleteStatistics → [3] Update PRRecord → [4] Run Evaluators → [4.5] Run Prestige Evaluator → [5] Create HonorInstance rows + append each new HonorInstance.id to Active Chapter.honors[] (atomic batch) → [6] Create TimelineEvent rows → [7] Queue M-2 ceremony.`

### 11.4 Supporting entities

```
AthleteStatistics {                  // precomputed, updated at step [2]
  athleteId: uuid
  workoutCount, hoursForged, chaptersSealed, goalsAchieved, programsGraduated, workoutsWithFriend: number
  lifetimeDistance: { RUN, WALK, BIKE, SWIM: number }
  cumulativeActiveWeeks: number       // mirrors Rank-Computation-Model's own computation
  challengesWonCount, challengesEnteredCount, maxParticipationStreak: number
  updatedAt: timestamp
}

PRRecord {
  athleteId: uuid
  lift: 'BENCH_PRESS' | 'SQUAT' | 'DEADLIFT' | 'OVERHEAD_PRESS' | 'PULL_UP'
  maxWeight: number; unitSystem: 'lbs' | 'kg'; achievedAt: date; updatedAt: timestamp
}
```

### 11.5 Rank — entity shape only

```
Rank {
  athleteId: uuid                      // 1:1
  currentFamily: 'Foundation'|'Builder'|'Craftsman'|'Architect'|'Established'|'Legend'|'Legacy'   // never decreases
  currentSubTier: number | null        // 1-4; null when currentFamily = Legacy
  promotionHistory: { family, subTier, dateEarned, awardedAt }[]   // immutable log
  lastSubTierPromotionDate: date
  schemaVersion: number
}

RankCategory {
  athleteId: uuid
  category: 'TrainingConsistency'|'PersonalImprovement'|'ProgramProgression'|'TrainingVolume'|'ChapterProgression'|'Longevity'|'GoalParticipation'
  evidenceValue: number
  lastEvaluatedAt: timestamp
}
```

> **This document fixes the shape of `Rank`/`RankCategory` only.** Numeric promotion thresholds, the confirmed-vs-candidate trigger-event question, sub-tier promotion spacing, and the other ~15 TBDs tracked in `Rank-Computation-Model.md` remain that document's own open authority — they are **not** resolved here (see Section 20, item 2).

**Confirmed Rank trigger:** Chapter Seal. **Candidate triggers pending `Rank-Computation-Model.md` TBD-1:** session save, program graduation, goal completion, periodic schedule, or some combination.

**Binding invariant (RS-D17):** Honors are not direct Rank inputs in MVP — the two systems are evaluated independently.

### 11.6 TimelineEvent and CeremonyQueueItem

Both entities are created by the Honor Evaluation Service (pipeline steps [6] and [7] respectively, per Section 2). Authoritative writer: Honor Evaluation Service.

```
TimelineEvent {
  id: uuid
  athleteId: uuid
  eventType: 'HONOR_EARNED' | 'RANK_UP' | 'GOAL_ACHIEVED' | 'PROGRAM_GRADUATED' | 'CHAPTER_SEALED' |
             'PHOTO_ADDED' | 'MEMORY_ADDED' | 'CHALLENGE_WON' | 'WORKOUT_WITH_FRIEND' | ...
  dateOccurred: date       // qualification date, immutable, displayed to athlete (per AD-33)
  createdAt: timestamp     // record-write time
  chapterId: uuid | null   // null for account-level events
  honorId: uuid | null     // FK → HonorInstance.id; set for HONOR_EARNED events (per AD-53)
  targetId: uuid | null    // navigation target (goalId, programId, photoId, etc.)
  displayText: string      // snapshotted narrative ("Honor Earned · First Chapter Sealed")
  metadata: object         // sparse, event-specific context; snapshotted at creation
}

CeremonyQueueItem {        // internal queue, not displayed to athlete
  id: uuid
  athleteId: uuid
  ceremonyType: 'RANK_UP' | 'GOAL_ACHIEVED' | 'PROGRAM_GRADUATED' | 'HONOR_EARNED'
  priority: number         // 1 = RANK_UP, 2 = GOAL_ACHIEVED, 3 = PROGRAM_GRADUATED, 4 = HONOR_EARNED
  payload: object          // ceremony-specific data (rank family, goal name, program name, honor list)
  status: 'PENDING' | 'CONSUMED' | 'FIRED' | 'ABANDONED'
  queuedAt: timestamp; consumedAt: timestamp | null; firedAt: timestamp | null
}
```

---

## 12. Social / Feed / Community Model

```
Friend { id: uuid; athleteId1, athleteId2: uuid; state: 'PENDING'|'ACCEPTED'; createdAt, acceptedAt: timestamp }

Post {
  id: uuid; authorAthleteId: uuid; media: string[]; caption: string | null
  audience: 'FRIENDS'|'SQUAD'|'BOTH'|'COMMUNITY'   // COMMUNITY never combined with the others
  communityId: uuid | null            // required + immutable when audience = COMMUNITY
  source: 'MANUAL'|'MILESTONE_AUTO'; milestoneType: string | null
  createdAt, archivedAt, deletedAt: timestamp | null
}

Reaction { postId: uuid; athleteId: uuid; createdAt: timestamp }   // no count surfaced as a popularity metric
Comment { id: uuid; postId: uuid; authorAthleteId: uuid; text: string; createdAt: timestamp; archivedAt: timestamp | null }
```

### 12.1 Squad family

```
Squad { id, ownerAthleteId: uuid; name: string; purpose: string | null (max 60); icon: enum (9 built-in) | null; commitment: string | null; maxMembers: number = 10; createdAt }
SquadMember { squadId, athleteId: uuid; joinedAt: timestamp; role: 'Owner'|'Member' }
SquadGoal { id, squadId: uuid; type: 'count'|'completion'; target, currentProgress: number; createdAt; completedAt: timestamp | null }   // one active max
SquadMission { id, squadId: uuid; bar: number; startDate, endDate: date; createdAt }                                                      // one active max, independent of SquadGoal
SquadCheckIn { squadId, athleteId: uuid; date: date; status: 'Trained'|'Rest Day'|'Missed'; videoUrl: string | null; createdAt, updatedAt }
SquadStreak { squadId: uuid; current: number; lastIncrementedAt: timestamp }   // ≥half of members Trained = +1; else reset to 0
SquadMomentum { squadId: uuid; status: 'Building'|'Steady'|'Strong'|'Surging'|'Quiet' }   // qualitative only, formula hidden
SquadFeedEntry { id, squadId: uuid; athleteId: uuid | null; type: enum (8 values); relatedId: uuid | null; createdAt }
SquadAnalytics { squadId: uuid; totalWorkouts, participationRate, currentStreak: number; goalProgress, missionCompletion, competitionRecord: object | null }   // squad-aggregate only, no per-member breakdown
```

### 12.2 Community family

```
Community { id, ownerAthleteId: uuid; name: string (unique, normalized); banner, icon, description, rules: string (required); category: enum (11 fixed); visibility: 'Public'|'Private'; createdAt; archivedAt: timestamp | null }   // one owned per athlete, all tiers
CommunityMember { communityId, athleteId: uuid; role: 'Owner'|'Admin'|'Moderator'|'Member'; joinedAt, promotedAt: timestamp | null; status: 'Active'|'Muted'|'Kicked'|'Banned' }
CommunityJoinRequest { communityId, athleteId: uuid; createdAt; approvedAt, declinedAt: timestamp | null }   // private communities only; decline is silent, no record retained
CommunityPost { id, communityId: uuid; authorAthleteId: uuid; type: enum (7 content types); title: string | null; content: string; createdAt; pinnedAt, removedAt: timestamp | null }
CommunityComment { postId: uuid; authorAthleteId: uuid; text: string; createdAt; removedAt: timestamp | null }
CommunityReport { id: uuid; postId | commentId: uuid; reporterId: uuid; reason: string; createdAt; reviewedAt: timestamp | null; reviewedBy: uuid | null }   // routes only to the community's own role-holders — self-moderation only, no platform escalation
CommunityHonor { communityId, athleteId: uuid; type: 'FirstJoined'|'CommunityBuilder'|'HelpfulContributor'|'Mentor'|'EventOrganizer' }   // realized as account-level HonorInstance rows, not a community-local leaderboard
```

### 12.3 Notifications

Per `P-5-Notifications-Architecture.md` v1.4 (LOCKED). Authoritative writer: Notification Service (per Section 2).

```
Notification {
  id: uuid
  athleteId: uuid
  type: string             // per P-5 categories: Squad Activity, Challenges, Friend Requests, Communities, etc.
  triggerId: uuid | null   // ID of the source event (honorId, challengeId, friendId, etc.)
  readAt: timestamp | null
  createdAt: timestamp
}

NotificationPreference {
  athleteId: uuid
  squadActivity: boolean           // default OFF (per P-5)
  reactions: boolean               // default OFF; capped at 1 delivery per 24h per share (per WSR-001)
  challengeUpdates: boolean        // default ON (per P-5)
  friendRequests: boolean          // non-toggleable — always ON (per P-5)
  communityActivity: boolean       // default OFF (per P-5)
}
```

Toggles control push delivery only — they never hide in-app surfaces (P-5 §4). Some categories are non-toggleable (always ON): Squad Membership Approval, Moderator Actions, Friend Requests.

### 12.4 Privacy settings — field-level reference (governance deferred to source docs)

These two entities are **not unified** in this document (see Section 18.3 and Section 20 item 3 for the acknowledged seam). Schemas are referenced here only to establish field names for implementers. Authoritative writer for both: Authentication Service (per Section 2).

```
// Governed by Identity-Amendment-001 (LOCKED):
PrivacySettings { athleteId: uuid; discoverableOutsideSquad: boolean (default ON); globalWorkoutVisibility: 'PRIVATE' | 'SQUAD_ONLY' (default PRIVATE) }

// Governed by WSR-001-Workout-Share-Result-Architecture.md (LOCKED):
AthleteShareSettings { athleteId: uuid; squadNotificationsEnabled: boolean (default OFF); reactionsNotificationEnabled: boolean (default OFF); globalVisibility: 'PRIVATE' | 'SQUAD_ONLY' }
```

---

## 13. Competitions / Challenges Model

```
Challenge {
  id: uuid; context: 'SQUAD'|'FRIENDS'|'COMMUNITY'   // immutable
  squadId: uuid | null; communityId: uuid | null      // exactly one set, matching context
  creatorAthleteId: uuid; name: string; description: string | null
  type: 'MOST_WORKOUTS'|'MOST_VOLUME'|'MAX_LIFT'|'MOST_DURATION'|'MOST_PRS'   // immutable
  targetExerciseId: uuid | null        // MAX_LIFT only
  durationType: string; startAt, endAt: timestamp
  state: 'DRAFT'|'ENROLLMENT'|'ACTIVE'|'COMPLETED'|'ARCHIVED'|'CANCELLED'
  winnerAthleteIds: uuid[]             // plural — co-ties are co-winners, full credit each
  createdAt: timestamp
}
ChallengeParticipant { challengeId, athleteId: uuid; joinedAt: timestamp; withdrawn: boolean; finalRank, finalScore: number | null }   // withdrawn rows excluded from standings, no visible marker
ChallengeScore { challengeId, athleteId: uuid; score: number; lastQualifyingEventAt, updatedAt: timestamp }   // materialized cache, re-derivable from WorkoutSession logs
ChallengeResult { id: uuid; challengeId: uuid; athleteIds: uuid[]; standings: { athleteId, finalScore, finalRank }[]; completedAt: timestamp }   // written once at COMPLETED, never mutated
SquadChallengeRecord { squadId: uuid; metric: 'MostWins'|'MostConsecutiveWins'|'MostEntered'|'HighestScorePerType'|'MostPRWins'; count: number }   // SQUAD-context only
```

**Binding rule:** the roster locks at `startAt` — no joins after a Challenge becomes ACTIVE.

---

## 14. Search / Indexing Implications

This document does not design Global Search (Architecture Freeze row 17 remains an open, separate workstream). It states only which fields must remain queryable/indexable so a future search spec is not precluded by a schema that cannot support it:

- **Athlete discovery:** `username`, `displayName` must remain indexable for friend search.
- **Exercise Library browse/filter:** `name`, `category`, `movementPattern`, `equipment` must remain composite-indexable (already anticipated in Section 4.2).
- **Community discovery:** `Community.name` (normalized, unique) must remain indexable; `Community.category` (11 fixed values) likewise.
- **Program discovery (Catalog Search):** `ProgramDefinition.name`, `category`, `goalAlignment` must remain indexable (per `Global-Search-Architecture-v1.0.md` §2/§4/§7).
- **Honor catalog discovery (Catalog Search):** `HonorType.name`, `category` must remain indexable (per `Global-Search-Architecture-v1.0.md` §2/§4/§7).
- A future Global Search spec may require a denormalized search-index projection (e.g., a Firestore-side Algolia/Typesense sidecar) rather than relying on Firestore's native query model alone — this document only flags the requirement, it does not select that tool.

---

## 15. Media / Storage Model

```
Photo { id: uuid; athleteId: uuid; chapterId: uuid; imageRef: string (storage path); dateAdded: timestamp; isMemoryAddition: boolean (derived: dateAdded > chapter.sealedAt, never stored) }
```

- **Exercise media** (on `ExerciseDefinition`): `gifUrl`, `gifThumbnailUrl`, `videoUrl`, `imageUrl`, `muscleTargetImageUrl` — all FORGE-required before `isActive: true`, CUSTOM-optional, per `Exercise-Media-Architecture-v1.0.md`.
- **Post media:** `Post.media[]` — array of storage references.
- **Storage path convention:** Cloud Storage objects keyed by `{athleteId}/{chapterId}/...` for athlete-owned media (Photos), and by a flat `exercises/{exerciseId}/...` namespace for the shared FORGE exercise library. Owned by the Media Service (Section 2); referencing entities store paths/URLs only, never binary content inline.
- **Monetization cap:** Free tier = 50 photos; Premium = unlimited (`EntitlementCounter.metric = photos`). Per "Never Charge For History" (Monetization Amendment 001), a downgrade never deletes photos already stored — it only blocks new uploads past the cap.

---

## 16. Import / Export Model

### 16.1 Import (per `Architecture-Amendment-001-Import.md`)

- Supported formats: CSV, XLSX, structured copy/paste.
- Output: `ProgramDefinition` with `source = 'IMPORTED'`.
- All `ExercisePrescription` EP-A1 fields (`restSeconds`, `distanceValue`, `distanceUnit`) arrive `null` — **no inference is performed.**
- Imported exercises are placed in the `MAIN` section only — the Import Service never synthesizes `WARM_UP`/`COOL_DOWN` sections.
- Import creates new, fully athlete-owned records — no external source reference is retained after ingestion.
- Free tier: 1 lifetime import; Premium: unlimited (`EntitlementCounter.metric = imports`, `hasUsedFreeImport` flag).

### 16.2 Export

Not designed in this document. `Account-Auth-Architecture.md`'s account-deletion contract references the athlete's right to their own data; a future "Export My Data" capability is a pointer from that contract, not specified here.

---

## 17. Offline / Sync Assumptions

- **Local-first writes.** All client writes (workout logging, check-ins, goal progress) commit to the local Firestore cache immediately and are queued for sync. This is consistent with the offline-first requirement that drove the Section 1 stack recommendation.
- **Provenance marker.** `WorkoutSession.source` carries `live_session | offline_sync | import` (3 values — no `challenge` value; Challenges produce `HonorInstance` rows via the evaluation pipeline, not new `WorkoutSession` rows). `HonorInstance.source` carries `live_session | offline_sync | import | challenge` (4 values, per Section 3.6). These are distinct enums on distinct entities — they are not interchangeable.
- **Trust model applies identically regardless of sync path** (Section 5.3) — `durationMinutes` is computed the same way whether the session synced live or after a connectivity gap.
- **Deferred evaluation for offline-originated honors.** Per the locked Honor Evaluation trigger table, `offline_sync` sessions run the same evaluator families as live sessions, but **M-2 does not fire** — honors are delivered silently to L-10 rather than via a live ceremony, since the athlete is not in an active session context when sync completes.
- **Sync conflict-resolution strategy — GENUINE GAP.** No locked document states what happens when the same entity is edited offline on two devices before either syncs (e.g., a `WorkoutTemplate` edited offline on a phone and a tablet). This document does not invent an answer — it is listed as an open blocker in Section 20 rather than silently assumed to be last-write-wins.

---

## 18. Security / Privacy Rules

### 18.1 Performance Firewall — generalized into a data-model enforcement rule

Per `Social-System-Architecture-v1.0.md` and `Squad-System-Architecture-v1.0.md`, certain data (scores, standings, ranks, win/loss records, badges, streaks-when-ranked) is **protected**: visible only on Challenge surfaces (C-series) and, for SQUAD-context challenges only, the owning squad's own S-2 Competitions section. It is barred from squad roster views, Limited Athlete Profile, Friends Feed, other squads' pages, and all Community surfaces.

**Data-model enforcement point (API Philosophy principle 6, Section 6):** this is enforced **server-side at the query layer** — the Community Service (Section 2) is the authoritative gate, never client-side filtering of an over-broad query result.

### 18.2 Anti-shame binding rules

Non-participation is invisible at the data-model level — there is no "did not finish," "missed," or "last place" field surfaced beyond what's needed for the owner's own private view. Co-ties in Challenges produce co-winners (`Challenge.winnerAthleteIds[]` plural) with full credit each, never a tiebreaker.

### 18.3 Two unreconciled privacy systems — flagged, not unified

`PrivacySettings` (`discoverableOutsideSquad`, `globalWorkoutVisibility`) is owned by the Identity system; `AthleteShareSettings` (`squadNotificationsEnabled`, `reactionsNotificationEnabled`, `globalVisibility`) is independently owned by `WSR-001-Workout-Share-Result-Architecture.md`. `P-6 Privacy` is presentation-layer only over both. **This document does not unify them** — it notes the seam as a real gap (Section 20, item 3) for a future Privacy-System-Reconciliation pass.

### 18.4 Account deletion

Re-authentication is required before account deletion (`Account-Auth-Architecture.md` §6.2). `Account.accountStatus` includes `PendingDeletion` to support either an immediate-delete or grace-period-recovery branch — this document's entity model supports both without forcing the policy choice (see Section 20, item 4).

---

## 19. Migration / Versioning Rules

- **`schemaVersion` is a Physical Storage Model requirement, not shown on every logical schema in this document.** Per the Logical/Physical split (Section 4), the logical entity schemas above omit `schemaVersion` for conciseness. `HonorInstance` (Section 3.6) and `Rank` (Section 11.5) illustrate the canonical pattern — `schemaVersion: number` (starting at `1`). At implementation, every Firestore document carries this field. Adding `schemaVersion` to an entity is additive/non-breaking and may be deferred to first-write rather than requiring a separate migration.
- **`Chapter.primaryGoalId` vs `Goal.isPrimary` — source of truth.** `Goal.isPrimary` is the authoritative field. `Chapter.primaryGoalId` is a denormalized read-convenience pointer. The Workout Service (sole writer of both entities, per Section 2) must update them atomically: when `Goal.isPrimary` changes, `Chapter.primaryGoalId` is updated in the same write batch. `Chapter.primaryGoalId` must never be updated in isolation.
- **Additive-only changes preferred.** New fields are added as optional/nullable; existing fields are never repurposed or removed without a major version bump and an explicit migration note — matching the precedent already set by `Exercise-Library-Architecture-v1.0.md`'s "R1-4 additive, non-breaking" revision pattern.
- **Document-level versioning.** This document follows the same convention as every other locked architecture doc in the repository: a version header, a Status line, and a Change Log (Section 21) recording every revision.

---

## 20. Open Questions / Blockers

These are genuine, unresolved tensions surfaced by reconciling ~20 locked specs — they are flagged honestly rather than resolved by invention.

1. **Backend stack is a recommendation, not a ratified decision.** Section 1 recommends Firebase with an explicit tradeoff analysis; PO ratification is required before this document graduates from LOCK-CANDIDATE to LOCKED.
2. ~~**`Rank-Computation-Model.md`'s ~15 open TBDs**~~ **RESOLVED — `Rank-Computation-Model.md` is now LOCKED v1.0 (Amendment 001 + v1.0.1).** All 16 TBDs are closed: 14 resolved in RCM Sessions 1–5, TBD-2 resolved by `P-2-Progress-Hub-Spec.md` (LOCKED), TBD-11 formally closed as non-blocking per RCM Amendment Log v1.0.1. Remaining Q-items (Q3–Q6, Q17, Q19–Q22) are explicitly non-blocking per RCM §25. This document's `Rank`/`RankCategory` entity shape (Section 11.5) is confirmed aligned with the locked RCM schema. Architecture Freeze row 15 (Rank) is ✅ Complete as of 2026-06-30.
3. **Two independently-owned, unreconciled privacy systems** (Identity's `PrivacySettings` vs. WSR-001's `AthleteShareSettings`) — noted as a seam (Section 18.3), not unified here. Recommend a future Privacy-System-Reconciliation pass.
4. **Grace-period vs. immediate account deletion** remains `Account-Auth-Architecture.md`'s own open Question 1 — this document's `Account.accountStatus` enum supports either branch without forcing the choice.
5. **`RANK_XP` challenge type is blocked** pending Rank-Computation-Model thresholds (per Challenge-System-Architecture's own deferral) — carried forward, not resolved here.
6. **Offline sync conflict-resolution strategy is undefined.** No locked document states last-write-wins vs. merge vs. queue-replay for concurrent offline edits to the same entity across devices (Section 17). This must be decided before implementation begins on any multi-device-capable entity (`WorkoutTemplate`, `Goal`, `Chapter`).
7. **Community moderation escalation gap** (`CommunityReport` routes only to a community's own self-moderation queue, no platform-level appeal path) — an already-acknowledged gap in `Community-Roles-and-Moderation-v1.0.md` (CRM-D6), carried forward here rather than re-solved.
8. **AI moderation is explicitly excluded** from V1 — noted as a deliberate scope cut, not a gap.

---

## 21. Change Log

- **v1.0.1 — 2026-06-30** — **LOCKED.** Targeted repair pass following internal audit, then locked by PO. Fixed: (1) `WorkoutSession.source` / `HonorInstance.source` enum conflation in Section 17 — clarified as distinct 3-value and 4-value enums; (2) Runtime Services (Section 2) expanded from 10 to 12 services — added Social Service (`Friend`/`Post`/`Reaction`/`Comment`) and Challenge Service, extended Workout Service and Honor Evaluation Service responsibility/writer lists to cover all previously-orphaned entities (`Chapter`, `Goal`, `AthleteStatistics`, `PRRecord`, `TimelineEvent`, `CeremonyQueueItem`, `Accomplishment`, `ProgramDefinition` ATHLETE_CREATED, `ProgramInstance`, `ExerciseDefinition` CUSTOM), added FORGE seed-data note; (3) Added minimal schemas for six previously-referenced-but-undefined entities: `Profile`/`PinnedLegacyItem` (Section 3.7), `Subscription`/`EntitlementCounter` (Section 8.1), `TimelineEvent`/`CeremonyQueueItem` (Section 11.6), `Notification`/`NotificationPreference` (Section 12.3), `PrivacySettings`/`AthleteShareSettings` (Section 12.4, field-reference only — governance explicitly deferred to source docs); (4) Fixed 7 broken internal cross-references (Sections 1, 6, 17, 18.3, 18.4); (5) Clarified FK targets: `WorkoutSession.programId` → `ProgramInstance.id`, `Goal.associatedProgramId` → `ProgramInstance.id`; (6) Added missing `customPrograms` metric to `EntitlementCounter` and enforcement note in Section 9; (7) Defined `Chapter.honors[]` population rule and writer (Honor Evaluation Service, step [5], covers one-time honors via active-chapter-at-award-time resolution); (8) Resolved `schemaVersion` inconsistency (Physical Storage Model requirement, Section 4 split applies) and declared `Goal.isPrimary` as source of truth over `Chapter.primaryGoalId` with atomic-update rule. Stack recommendation and all Open Questions unchanged.
- **v1.0 — 2026-06-30** — Initial authoring. Reconciles entity definitions from ~20 locked specs into one canonical Backend/Data-Model authority. Status: LOCK-CANDIDATE pending PO ratification of the Firebase stack recommendation (Section 1) and resolution of the 8 Open Questions (Section 20).
