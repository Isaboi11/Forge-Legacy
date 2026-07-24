# Forge Legacy — Challenge System Architecture
## v1.5 | June 2026

> **v1.5 reconciliation banner (`Squad-System-Architecture-v1.0`, LOCKED, June 2026 — SQ-D2/SQ-D11):** for `SQUAD`-context challenges only, the Performance Firewall (CS-D2, CS-D22) is narrowed so that a squad's own challenge standings render inline on that squad's own S-2 Competitions section. See CS-D2 and CS-D22 below for the full, binding restatement. FRIENDS/COMMUNITY contexts and every other surface are unaffected.

**Status:** **LOCKED** (June 2026) — architecture-level; the governing authority for the Challenge System. Current version: v1.5 (see Amendment Log, §19). Architecture Freeze Row 12 ✅ Complete (2026-06-30). **Versioning note:** the `-v1.0` in this filename reflects the initial publication date, consistent with the project convention; the internal version header and Amendment Log track the current state. Downstream C-series specs and the locked-doc inline edits (§17) are handled in the post-freeze reconciliation pass.

> **v1.3 reconciliation banner (Challenge-Architecture-Amendment-003 v1.1 + Friend-Relationship-Architecture-Amendment-001, both LOCKED):** The Challenge System is **participant-based**. A challenge runs among an opted-in **roster** that is drawn from **a Squad** (`context = SQUAD`) **or** a set of the creator's **accepted Friends** (`context = FRIENDS`), with **identical** privacy behavior in both. "Accepted Friend" = an existing `ACCEPTED` mutual Friend relationship (FR-D1), not a per-challenge invite. Friendship alone never enrolls anyone — an invited Friend must still explicitly opt in (two gates). Squad-legacy surfaces (Hall of Champions, Squad Records, Current Champions, participation streak) stay **SQUAD-context only** (CA3-D8). The Performance Firewall is unchanged — only its *scoping mechanism* generalizes from `squadId` to the roster set. Existing squad challenges are unaffected (`context = SQUAD`, fully backward-compatible). Where this document below says "squad-scoped" / "squadId required," read it through this banner: SQUAD is one of two contexts.

> **v1.4 reconciliation banner (Challenge-Architecture-Amendment-004, LOCKED — `Community-System-Architecture-v1.0` COM-D10):** A third context, **`COMMUNITY`**, is added: a challenge may also run among the opted-in members of a **Community** (`context = COMMUNITY`, `communityId` required). Enrollment is **open to any community member** (no invitation step, like SQUAD) but **creation is gated to the community's Owner/Admin/Moderator roles** (`Community-Roles-and-Moderation-v1.0` CRM-D2) — unlike SQUAD's any-member creation rule. Hall of Champions / Squad Records / Current Champions remain **SQUAD-context only**; Community results are permanent and member-visible via the Community's own Competitions tab, with **no parallel Community-legacy surface** built. Honors Wins/Participation credit all three contexts; the participation-streak input remains SQUAD-only. The Firewall's roster-scoping generalizes a second time to community membership, unweakened. Full detail: `Challenge-Architecture-Amendment-004-Community-Competitions.md`.

**Type:** System Architecture

**Authority:**
- `Comparison-Philosophy-Amendment-001.md` (LOCKED) — CC-D1 (Consenting Competition Context), CC-D2 (Performance Firewall, binding), CC-D3 (anti-shame guardrails, binding), CC-D4 (badges ≠ honors), CC-D5 (no Rank impact). **This document is the feature built *under* that amendment and may not exceed its four gates.**
- `Squad-Architecture-Amendment-001-Challenge-Surfaces.md` (LOCKED) — SA-D1 (S-2 scoped exception), SA-D2 (S-1 entry without contamination), SA-D3 (challenge-creator is challenge-scoped, not a squad tier).
- `Honor-Catalog-Amendment-001-Challenge-Honors.md` (LOCKED) — COMPETITION category, ChallengeEvaluator triggers, counters.
- `P-5-Amendment-001-Challenge-Notifications.md` (LOCKED) — Challenges notification category.
- Locked specs referenced as integration surfaces: `Squad-Detail-Wireframe-Spec-S2.md`, `Squads-Hub-Wireframe-Spec-S1.md`, `Squad-Management-Permissions-Spec-S3.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `HonorInstance-Architecture-v1.0.md`, `Rank-Computation-Model.md`.

**Amendment Log:** v1.5 — **LOCKED June 2026** — `Squad-System-Architecture-v1.0` (LOCKED) SQ-D2/SQ-D11 narrows CS-D2/CS-D22 for SQUAD-context challenges only: standings now render inline on the owning squad's own S-2 Competitions section, superseding `Squad-Architecture-Amendment-001` SA-D1 and `Squad-Architecture-Amendment-002` SA2-D1/D2 for that one surface. FRIENDS/COMMUNITY contexts, every other squad's page, the Friends Feed, and Community surfaces are unaffected; SA-D3 (challenge creator is challenge-scoped) is reinforced, not superseded. v1.4 — **LOCKED June 2026** — applied Challenge-Architecture-Amendment-004 (third `COMMUNITY` context; community-membership roster; Owner/Admin/Moderator-gated creation; no Community-legacy-surface parallel; Firewall roster-scope generalized a second time). v1.3 — **LOCKED June 2026** (PO-approved; ready for the Architecture Freeze) — applied Challenge-Architecture-Amendment-003 v1.1 (participant-based contexts; `context` enum + nullable `squadId`; FRIENDS roster source; roster-scoped Firewall/permissions/lifecycle; squad-legacy surfaces SQUAD-only) and Friend-Relationship-Architecture-Amendment-001 (FRIENDS eligibility = existing accepted Friend + explicit opt-in). v1.2 / v1.1 / v1.0 prior.

**Governing authority added (v1.3):** `Challenge-Architecture-Amendment-003-Friend-Challenges.md` v1.1 (LOCKED) — CA3-D1…D11; `Friend-Relationship-Architecture-Amendment-001.md` (LOCKED) — FR-D1/D6.

**Governing authority added (v1.4):** `Community-System-Architecture-v1.0.md` (LOCKED) — COM-D10; `Challenge-Architecture-Amendment-004-Community-Competitions.md` (LOCKED) — CC4-D1…D7; `Community-Roles-and-Moderation-v1.0.md` (LOCKED) — CRM-D2 (creation gate).

**Downstream dependents:** Challenge System wireframe specs (C-series, §18); the Pending locked-doc inline edits enumerated by the four v1.3 authority amendments; Honor Catalog re-lock (v1.1); P-5 re-lock (v1.1) and P-5 wireframe; **Community-System-Architecture-v1.0 / Community-Roles-and-Moderation-v1.0 (v1.4 — Community context).**

> **Governing-authority pointer — `Calendar-System-Architecture-v1.0` (LOCKED, June 2026).** The Calendar renders **only the date envelope** of a challenge the athlete is enrolled in — its **start and end dates** as read-only event markers (CAL-D11). It **never** reads or renders scores, standings, ranks, win/loss, or badges: the **Performance Firewall (CS-D2) is unchanged**, and the Calendar is **not** an always-on exception to it. Anti-shame (CS-D3) is preserved — non-participation is invisible on the Calendar; a withdrawn/finished challenge simply stops appearing; there is no placement marker anywhere on the timeline. A competition marker links **into** the C-series surface, where this document's rules govern everything (CAL-D17). The Calendar emits no Rank signal (CS-D4 / CAL-D21). No change to this document is required.

---

## Section 1 — Purpose & Scope

The Challenge System adds private, opt-in, **roster-scoped** competition to Forge Legacy. An athlete creates a challenge in one of two contexts — **SQUAD** (open to squadmates) or **FRIENDS** (an invited set of the creator's accepted Friends) — those eligible choose to join; the app scores enrolled participants from training data already logged, ranks them on a live leaderboard, crowns a winner, and preserves the result. SQUAD-context results become squad legacy; FRIENDS-context results are permanent and visible to their participants and still feed account-level Honors (CA3-D8).

This document defines the entities, lifecycle, permissions, enrollment, scoring, leaderboards, notifications, archival, the Firewall enforcement contract, and the integration contracts with Squads, Honors, Notifications, and Rank.

**In scope:** custom challenge creation, opt-in participation, locked rosters, leaderboards, winners/final standings, challenge history, Hall of Champions, Squad Records, Current Champions, challenge notifications, challenge badges, Honors integration, squad-scoped visibility, no Rank impact.

**Out of scope (explicitly):** all C-series wireframe/pixel layout (§18); the inline edits to locked specs (carried as Pending by the four amendments); any public, cross-squad, or external competition; Rank-XP-based scoring beyond the deferral in §9.4.

---

## Section 2 — Core Principles (binding)

### CS-D1 — Every challenge is a Consenting Competition Context *(v1.3 — roster-scoped, CA3-D2/D3; v1.4 adds COMMUNITY, CC4-D1)*
A challenge exists only as a CC-D1 context bound to **an opted-in roster**: **roster-scoped, opt-in, roster-locked, bounded-duration**. That roster is a **Squad** (`context = SQUAD`), an **invited set of accepted Friends** (`context = FRIENDS`), or **the open membership of a Community** (`context = COMMUNITY`, v1.4); the roster of record is the `ChallengeParticipant` set in **all three**. The system must make it impossible to create a challenge that violates any of the four gates (no public, no cross-context, no always-on, no auto-enrollment). All competition mechanics in this document are permitted *solely* because they live inside this context.

### CS-D2 — The Performance Firewall is enforced in the data layer *(narrowed for Squad surfaces by `Squad-System-Architecture-v1.0` SQ-D2, June 2026 — see banner below)*
Per CC-D2, challenge performance data (scores, standings, ranks, win/loss, badges) is exposed **only** through C-series Challenge surfaces **and, for a `SQUAD`-context challenge, the Competitions section of that same squad's own S-2 page** (`Squad-Detail-Wireframe-Spec-S2.md` §19). No *other* always-on surface — S-1 cards, the S-2 member list, the S-2 Limited Athlete Profile, the Today's Check-ins card, any *other* squad's S-2 page, the Friends Feed, or a Community surface — may read or render challenge data. §15 defines the enforcement contract; its correctness test is binding, updated to reflect this narrowed scope.

> **v1.5 reconciliation banner (`Squad-System-Architecture-v1.0`, LOCKED, June 2026 — SQ-D2/SQ-D11):** for `SQUAD`-context challenges only, the Performance Firewall is narrowed (not repealed) so that a squad's own challenge standings, scores, win/loss, and champion recognition now render inline on that squad's own S-2 Competitions section — superseding `Squad-Architecture-Amendment-001` SA-D1 and `Squad-Architecture-Amendment-002` SA2-D1/D2's neutral-entry-affordance-only model for that one surface. **FRIENDS- and COMMUNITY-context challenges are unaffected** — they still have no always-on surface anywhere (CA3-D6/D8 unchanged). The Firewall remains fully enforced everywhere else this document already named: any *other* squad's page, the Friends Feed, and any Community surface. The challenge-creator role remains challenge-scoped only (SA-D3, reinforced, not superseded).

### CS-D3 — Anti-shame guardrails are structural, not cosmetic
Per CC-D3: non-participation is invisible; leaving leaves no trace; standings are positive-framed with no "loser/last/DNF" marker; no failure notifications; **roster-scoped always** (v1.3 — the roster is a Squad or a Friend set; never public, cross-context, or external). These are enforced by the data model (e.g., a withdrawn participant is *removed*, not flagged), not merely by copy.

### CS-D4 — No Rank impact
Per CC-D5, the Challenge System emits **no** rank-contributing events and writes **no** rank signal. §16.4 states this as an explicit non-integration.

---

## Section 3 — Entities & Schema

Field names are architecture-level (concept) per the project's deferral precedent (P-5/P-8); backend may rename. Types indicative.

### 3.1 `Challenge`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `context` | enum **{ `SQUAD`, `FRIENDS`, `COMMUNITY` }** | **(v1.3 CA3-D3; v1.4 adds `COMMUNITY`, CC4-D1)** Immutable. Determines the roster source. `SQUAD` = squad members may opt in; `FRIENDS` = the creator's invited accepted Friends opt in; `COMMUNITY` = any member of the named community may opt in (no invitation step). |
| `squadId` | uuid? (FK → Squad) | **(v1.3, CA3-D3)** **Required when `context = SQUAD`** (binds to exactly one squad, immutable); **null otherwise.** |
| `communityId` | uuid? (FK → Community) | **(v1.4, CC4-D1)** **Required when `context = COMMUNITY`** (binds to exactly one community, immutable); **null otherwise.** Mutually exclusive with `squadId`. |
| `creatorAthleteId` | uuid (FK → Athlete) | The challenge-scoped creator (SA-D3; CA3-D5). Any athlete; not a squad role. Sole governance for FRIENDS challenges. |
| `name` | string | Required. Athlete-authored. |
| `description` | string? | Optional. |
| `type` | enum `ChallengeType` | §9.1. Immutable after creation. |
| `targetExerciseId` | uuid? (FK → ExerciseDefinition) | Optional; **`MAX_LIFT` only** (CS-D8). Scopes a heaviest-lift contest to one canonical exercise. Ignored for other types. Immutable after creation. |
| `durationType` | enum {DAILY, WEEKLY, MONTHLY, CUSTOM} | |
| `startAt` | timestamp | Roster locks at this moment (§6.3). |
| `endAt` | timestamp | Derived from durationType or explicit for CUSTOM. |
| `enrollmentOpensAt` | timestamp | = createdAt (enrollment opens immediately). |
| `state` | enum `ChallengeState` | §4. |
| `winnerAthleteIds` | uuid[] | Populated at COMPLETED. Plural for ties (§11.3). |
| `createdAt` / `updatedAt` | timestamp | |

### 3.2 `ChallengeParticipant` (enrollment record)
| Field | Type | Notes |
|---|---|---|
| `challengeId` | uuid (FK) | |
| `athleteId` | uuid (FK) | **(v1.3, CA3-D4)** Must be eligible for the challenge's roster source at join time: a member of `Challenge.squadId` (SQUAD) **or** an existing `ACCEPTED` Friend of the creator who was invited (FRIENDS) — and must explicitly opt in. |
| `joinedAt` | timestamp | |
| `withdrawn` | bool | If a participant leaves (§6.5). Withdrawn rows are excluded from standings; **no visible marker** (CS-D3). |
| `finalRank` | int? | Snapshotted at COMPLETED for non-withdrawn participants. |
| `finalScore` | number? | Snapshotted at COMPLETED. |

Unique key: (`challengeId`, `athleteId`). Roster = non-withdrawn participants; **locked** at `startAt`.

### 3.3 `ChallengeScore` (live, materialized, internal)
A per-participant running score, recomputed on each qualifying session save during ACTIVE (§9.2). Materialized for leaderboard read performance; always derivable from workout data, so it is a cache, not a source of truth.
| Field | Type | Notes |
|---|---|---|
| `challengeId` / `athleteId` | uuid | |
| `score` | number | Current metric value (§9). |
| `lastQualifyingEventAt` | timestamp | Tie-break input (§11.4). |
| `updatedAt` | timestamp | |

### 3.4 `ChallengeResult` (immutable final standings)
Written once at COMPLETED. Ordered standings + winner(s). Never mutated thereafter (archive permanence, §13).

### 3.5 `SquadChallengeRecord` (Squad Records, materialized)
Per-squad derived aggregates (§13.3): most wins, most consecutive wins, most entered, highest score, etc. Derived from `ChallengeResult` history; recomputed on challenge completion.

### 3.6 Challenge Badges — **derived, not stored** (CC-D4)
Badges (Current Leader, Defending Champion, Challenge Creator, Multi-Time Winner) are **computed display states**, not persisted collectibles (§12). They have no table; they are projections over `ChallengeScore`, `ChallengeResult`, and `Challenge.creatorAthleteId`.

> **Honors are separate:** permanent challenge milestones are `HonorInstance` rows owned by the Honor system (Honor-Catalog-Amendment-001), never stored here.

---

## Section 4 — Lifecycle States

```
DRAFT ──▶ ENROLLMENT ──▶ ACTIVE ──▶ COMPLETED ──▶ ARCHIVED
   │           │            │
   └─────── CANCELLED ◀──────┘   (creator/owner; pre-COMPLETED only)
```

### CS-D5 — State definitions & transitions
| State | Meaning | Entry condition | Exit |
|---|---|---|---|
| **DRAFT** | Being configured by creator | Creation begins | Creator publishes → ENROLLMENT; or discards → (deleted) |
| **ENROLLMENT** | Open for opt-in; not yet scoring | Creator publishes | `startAt` reached → ACTIVE; or CANCELLED |
| **ACTIVE** | Roster locked; scoring live; leaderboard live | `startAt` reached | `endAt` reached → COMPLETED; or CANCELLED |
| **COMPLETED** | Scoring stopped; winner crowned; `ChallengeResult` written | `endAt` reached | Auto → ARCHIVED |
| **ARCHIVED** | Permanent, read-only history | Immediately after COMPLETED | Terminal |
| **CANCELLED** | Ended before completion; no winner, no result, no honors | Creator/owner action, pre-COMPLETED | Terminal |

**Rules:**
1. **Roster locks at the ENROLLMENT→ACTIVE transition** (`startAt`). No joins after (CS-D1 gate 3, §6.3).
2. A challenge with **fewer than 2 non-withdrawn participants at `startAt`** does not become a valid competition — it auto-CANCELs (§17.1). One person cannot compete.
3. COMPLETED→ARCHIVED is immediate and automatic; ARCHIVED is the steady terminal state for all finished challenges.
4. CANCELLED produces **no** `ChallengeResult`, **no** winner, **no** honor, and per CS-D3 no negative record for anyone.

---

## Section 5 — Permissions

### CS-D6 — Permission model (preserves S-3's two tiers)
"Commissioner" = **challenge-scoped creator** (SA-D3). No squad governance tier is created.

**(v1.3, CA3-D5) Context note:** The permission model is **challenge-scoped and squad-independent**. The table below is the SQUAD context. For **FRIENDS** challenges there is no squad and no Squad Owner: the **creator is the sole governance** (configure pre-lock, cancel pre-COMPLETED, invite from accepted Friends), and a **participant** may join/leave — nothing else. The "Squad Owner cancel" row applies **only to SQUAD context** (squad cleanup). "Remove another participant" exists for no one in either context. Eligibility to create is: any squad member (SQUAD) / any athlete with ≥1 accepted Friend to invite (FRIENDS). S-3's two-tier squad model is untouched.

**(v1.4, CC4-D3) COMMUNITY context note:** Unlike SQUAD, creation in a Community is **not** open to "any member" — it is gated to that community's **Owner, Admin, or Moderator** roles (`Community-Roles-and-Moderation-v1.0` CRM-D2), reflecting the larger, partly-public scale of a Community versus a Squad (`Community-Roles-and-Moderation-v1.0` §4.2). Once created, enrollment is open to any community member (CC4-D2) — the creation gate and the enrollment gate are independent. Cancellation pre-COMPLETED is available to the creator and to any Owner/Admin/Moderator of that community (mirrors the Squad Owner's cleanup authority, scoped to the community's elevated roles rather than a single owner).

| Action | Squad Owner | Challenge Creator | Participant | Squad Member (non-participant) |
|---|---|---|---|---|
| Create a challenge in the squad | Yes | (is the creator) | Yes (any member) | Yes (any member) |
| Configure challenge (DRAFT) | If creator | Yes | — | — |
| Cancel challenge (pre-COMPLETED) | Yes (squad-cleanup authority) | Yes | No | No |
| Join (during ENROLLMENT) | Yes | Yes (creator may opt in like anyone) | (is participant) | Yes |
| Leave (withdraw) | If participant | If participant | Yes | — |
| View challenge surfaces | Yes | Yes | Yes | Yes — squad-scoped visibility (viewing ≠ participating) |
| Remove another participant | No | No | No | No |

**Notes:**
1. **Any member may create** (mirrors S-3 §4.4 invite openness). Creator authority is scoped entirely to the challenge object — no power over people (SA-D3).
2. **Squad Owner cancellation** is the single squad-level hook: the Owner may cancel a challenge as squad cleanup (parallel to S-3's owner-only destructive actions), but gains no scoring/standing privilege.
3. **Viewing is squad-wide; competing is opt-in.** A non-participant squad member may view the leaderboard (it is squad-scoped data) but is never *in* it and is never shown as having declined (CS-D3).
4. Creator is **not** auto-enrolled — creating ≠ joining (preserves opt-in purity, CC-D1 gate 2).

---

## Section 6 — Enrollment Flow

### CS-D7 — Enrollment
```
Creator publishes challenge → ENROLLMENT
        ↓
Squad members see an opt-in invitation on the squad's Challenge surface
        ↓  member taps "Join"          member taps "Decline" / ignores
        ↓                                       ↓
ChallengeParticipant created            no record created (decline is invisible — CS-D3)
        ↓
startAt reached → roster locks → ACTIVE
```

**Rules:**
1. **Opt-in only.** No member is ever auto-enrolled. Default state is non-participation, which is invisible (CS-D3).
2. **Decline leaves no trace.** There is no "declined" record, count, or marker — declining and ignoring are indistinguishable by design.
3. **Roster lock at `startAt`.** During ENROLLMENT, members may join or leave freely. At `startAt` the roster is frozen; `ChallengeParticipant` set becomes immutable except for withdrawals (§6.5).
4. **Eligibility (v1.3, CA3-D4 — two roster sources, one model):** **SQUAD** — only current members of `Challenge.squadId` may join (a member who joins then leaves the *squad* is handled per §16.1). **FRIENDS** — the creator invites from their **existing accepted Friends** (FR-D6); each invited Friend must **explicitly opt into the challenge** to become a participant (friendship alone never enrolls — two gates: *be an accepted Friend* **and** *opt in*). Eligibility is checked at invitation/enrollment time only; **unfriending after `startAt` does not alter the locked roster** (FR-D6 r3). In both contexts the roster **locks at `startAt`** and decline/non-acceptance is **invisible** (CS-D3 / CC-D3), identical to squad non-participation.
5. **Withdrawal (§6.5):** a participant may leave a challenge at any time (ENROLLMENT or ACTIVE). Their `withdrawn` flag is set; they are removed from standings with no marker. Re-joining after `startAt` is not permitted (roster is locked).

---

## Section 7 — Scoring Model

### CS-D8 — Challenge types & metrics
| `ChallengeType` | Metric (`score`) | Source |
|---|---|---|
| `MOST_WORKOUTS` | Count of qualifying sessions in window | Session records |
| `MOST_VOLUME` | Σ (sets × reps × weight) across qualifying sessions | Logged set data |
| `MAX_LIFT` | Heaviest single qualifying set (max weight) in window | Logged set data |
| `MOST_DURATION` | Σ session duration in window | Session duration |
| `MOST_PRS` | Count of PR events recorded in window | PR records (per Honor/Strength PR model) |
| `RANK_XP` | **Deferred — see CS-D11 (§9.4)** | — |

**`MOST_VOLUME` vs `MAX_LIFT` (both restore the brief's two Volume metrics):** `MOST_VOLUME` is a *cumulative tonnage accumulator* ("most total weight moved"); `MAX_LIFT` is a *heaviest-single-lift max* ("most weight lifted at once"). They are distinct competition shapes and both ship.

**`MAX_LIFT` exercise scoping (`Challenge.targetExerciseId`, optional):** to keep a heaviest-lift contest fair, `MAX_LIFT` may set an optional `targetExerciseId` (a canonical library exercise). When set, the score is the heaviest single set **on that exercise only** (e.g., "heaviest Bench Press"). When unset, the score is the heaviest single set on **any** tracked lift. CUSTOM exercises are excluded from `MAX_LIFT` scoring (consistent with AD-28c). `targetExerciseId` applies only to `MAX_LIFT` and is ignored for other types.

### CS-D9 — Qualifying-event rules (reuse existing definitions)
1. Only sessions logged by a **non-withdrawn participant** count.
2. The session's effective time must fall within `[startAt, endAt]`.
3. **Partial sessions count; discarded sessions count nothing** — reused verbatim from AD-42 / S-2 §6.1 / Rank meaningful-work, not redefined here.
4. Data irrelevant to the metric contributes **0** (e.g., a mobility session contributes 0 volume to a `MOST_VOLUME` challenge). The creator chose the type; the system does not coerce cross-type equivalence.
5. **Imported/offline-synced sessions:** count toward a challenge only if their effective time falls within the window and they meet the meaningful-work criteria — same rule as native sessions.

### CS-D10 — Scoring computation
1. `ChallengeScore` is recomputed for a participant **immediately after their session save is finalized** during ACTIVE — reusing the post-event, finalized-state pattern from the Honor Evaluation Service (ES-2/ES-4). It is a synchronous projection over already-finalized workout statistics; the Challenge System never re-aggregates raw history mid-write.
2. Scores are monotonic within the window — accumulators (count/sum), event counts (PRs), or a non-decreasing maximum (`MAX_LIFT` keeps the highest single set seen). No decay, no negative scores.
3. `ChallengeScore` is a cache; the authoritative value is always re-derivable from the participant's logged sessions in `[startAt, endAt]`.

### CS-D11 — RANK_XP deferral (honest gap)
The brief's "Most Rank XP Earned" requires an athlete-facing, windowed XP quantity. `Rank-Computation-Model.md` exposes **no** such number (rank is guided-transparency directional signal only). `RANK_XP` is therefore **deferred from MVP** and requires a future Rank-side contract that exposes a windowed, comparison-safe metric — without that contract it cannot be built, and inventing one would breach CS-D4/CC-D5. All other types ship.

---

## Section 8 — Leaderboard Rules

### CS-D12 — Leaderboard
1. **Live during ACTIVE**, **roster-scoped** (v1.3, CA3-D6), ordered by `score` descending. Visible on the Challenge Detail surface only (Firewall, §15). Viewers = the challenge's roster scope: SQUAD = squad members; FRIENDS = the invited/participant set only.
2. **Participants only.** Non-participant viewers within scope (squad members in SQUAD context) may view it but never appear in it. A FRIENDS challenge has no non-participant viewers beyond its invited set.
3. **Positive framing (CS-D3):** ranks are shown as placement/progress. No row is labeled loser/last; no "behind by" deficit is the primary framing. The lowest-placed participant sees their placement, never a failure label.
4. **The athlete's own row is identifiable** but receives no special shame/celebration treatment beyond neutral highlight.
5. Leaderboard reads `ChallengeScore` (the materialized cache); MVP accuracy is as-of last qualifying event + screen load (real-time push out of scope, consistent with S-1 §9.4).

### CS-D13 — Rules block (system-generated)
Each challenge surfaces a system-generated Rules section: **Scoring Method** (from `type`), **Eligibility** (CS-D9), **Tie-Breakers** (§11.4). Authored by the system, not the creator — guarantees objective, consistent rules.

---

## Section 9 — Winners, Final Standings, Tie-Breakers

### CS-D14 — Completion
1. At `endAt`, state → COMPLETED. Scoring stops. `ChallengeScore` is frozen and snapshotted into `ChallengeParticipant.finalRank/finalScore` and an immutable `ChallengeResult`.
2. Winner(s) = highest `score` after tie-break resolution; written to `Challenge.winnerAthleteIds`.

### CS-D15 — Tie-breakers (deterministic chain)
Applied in order: (1) higher `score`; (2) **earlier** `lastQualifyingEventAt` to reach the final score (reached the result first); (3) earlier `joinedAt`. If still tied → **co-winners** (plural `winnerAthleteIds`). Ties are resolved positively (shared victory), never by a tiebreak that manufactures a loser. **Each co-winner receives full credit** for wins, win streaks, Squad Records, and Honors — never fractional (Challenge-Architecture-Amendment-002 CA2-D2).

---

## Section 10 — Challenge Badges (ephemeral, CC-D4)

### CS-D16 — Badges are derived display states, not collectibles
| Badge | Derivation | Lifetime |
|---|---|---|
| Current Leader | `ChallengeScore` rank 1 in an ACTIVE challenge | While leading |
| Challenge Creator | `Challenge.creatorAthleteId` | While challenge exists |
| Defending Champion | Winner of the most recent COMPLETED challenge of the **same `ChallengeType`** in the squad ("comparable identity" = type-equality, Challenge-Architecture-Amendment-002 CA2-D3) | Until superseded |
| Multi-Time Winner | Squad-scoped win count ≥ 2 (from `ChallengeResult` history) | Persistent display projection |

1. Badges are **squad-scoped** and shown only on Challenge surfaces / Current Champions (§13.4) — never on always-on squad surfaces (Firewall).
2. Badges are **not** Honors and are **not** stored as awards (CC-D4). They are computed at read time.
3. No "loser" or negative badge exists (CS-D3).

---

## Section 11 — Archive Behavior

> **(v1.3, CA3-D8) Context scope for §11:** Hall of Champions (CS-D18), Squad Records (CS-D19), and Current Champions (CS-D20) are **SQUAD-context only** — there is no squad to host squad-legacy for a friend challenge. **Friend Challenge results are still permanent** (`ChallengeResult` immutable) and **visible to their participants** via the participant-scoped Challenge Hub (CA3-D10), and they **still feed account-level Honors** (§14 / CA3-D9). They simply do not populate the squad-legacy surfaces.
>
> **(v1.4, CC4-D4) COMMUNITY extension:** the same exclusion applies to `COMMUNITY` context — **no parallel "Community Records" or "Community Hall of Champions" surface is built.** `COMMUNITY`-context results are permanent and member-visible via the Community's own Competitions tab (`Community-System-Architecture-v1.0` COM-D7), exactly as FRIENDS results are participant-visible, and they feed account-level Honors identically (§14 / CC4-D6). Building a Community-scoped legacy/records surface would violate `Community-System-Architecture-v1.0` §15.3's binding no-leaderboard-beyond-the-four-counters rule, so none exists.

### CS-D17 — Challenge history
COMPLETED challenges become ARCHIVED immediately. SQUAD-context results are permanently readable via the squad's Challenge surfaces (squad legacy); FRIENDS-context results are permanently readable by their participants via the participant-scoped Challenge Hub (CA3-D10). `ChallengeResult` is immutable (CS-D14) in both. Results "remain permanently accessible."

### CS-D18 — Hall of Champions *(SQUAD-context only, CA3-D8)*
A squad-scoped, chronological list of every ARCHIVED **SQUAD-context** challenge with its winner(s), derived from `ChallengeResult`. Read-only. Squad-scoped visibility only. Friend challenges are excluded (no squad to host them).

### CS-D19 — Squad Records *(SQUAD-context only, CA3-D8)*
Materialized per-squad aggregates over **SQUAD-context** `ChallengeResult` history (friend challenges excluded): Most Challenge Wins, Most Consecutive Wins, Most Challenges Entered, **Highest Challenge Score (tracked per `ChallengeType`, not globally — Challenge-Architecture-Amendment-002 CA2-D1)**, Most PR-Challenge Victories. Co-wins credit each co-winner fully toward wins/streaks/records (CA2-D2). Recomputed on each completion. **Positive records only** (CS-D3) — no "most losses."

### CS-D20 — Current Champions *(SQUAD-context only, CA3-D8)*
A squad-level surface showing standing champions **per `ChallengeType`** (Consistency / Volume / Max Lift / Duration / PR champion) — the most recent winner of each type, **never a single overall champion** (Challenge-Architecture-Amendment-002 CA2-D3). Co-winners → co-champions (CA2-D2). Squad-scoped, positive recognition, on a Challenge surface (SA-D2). Reflects the **Defending Champion** projection (§10). `RANK_XP` deferred → no XP champion (CS-D11).

---

## Section 12 — Notification Rules

### CS-D21 — Challenge notifications (per P-5-Amendment-001)
1. All challenge pushes route through P-5 **Section C — Challenges**, single toggle, **default OFF**.
2. Pushes fire **only to opted-in participants** for challenges they joined (non-participants get nothing — CS-D3 / CC-D1).
3. **Neutral/positive copy only** (P5-D2 / CC-D3): "You moved into 1st," "You entered the Top 3," "Challenge ends tomorrow," "Challenge complete — see standings." A "passed you" alert is permitted only if neutralized ("Standings updated") or behind a separate explicit opt-in; never a default failure push.
4. Push toggle controls delivery only; in-app Challenge surfaces show full feed/standings regardless of toggle (P-5 §4).
5. Challenge *honors* never push (Honor-Catalog-Amendment-001 / M-2 in-app only).

The Challenge Feed (Created / Joined / Started / New Leader / New PR / Completed) is an **in-app, roster-scoped, Challenge-surface-only** activity log (v1.3 — visible to the challenge's roster: squad members for SQUAD, the invited/participant set for FRIENDS) — it is not a product-wide feed and is bounded to the challenge context (Firewall + DNA "no workout feeds" preserved because it never leaves the opted-in challenge surface).

---

## Section 13 — Firewall Enforcement (binding contract)

### CS-D22 — Data-access contract *(narrowed for SQUAD-context Squad surfaces by `Squad-System-Architecture-v1.0` SQ-D2/SQ-D11, v1.5)*
1. Challenge entities (`Challenge`, `ChallengeParticipant`, `ChallengeScore`, `ChallengeResult`, `SquadChallengeRecord`) are readable **only** by C-series Challenge surfaces **and, for a SQUAD-context challenge, that squad's own S-2 Competitions section.**
2. The always-on read models that power **S-1 cards, the S-2 member list, the S-2 Limited Athlete Profile, and the Today's Check-ins card must not join to, embed, or expose any challenge field.** No challenge score, rank, standing, badge, win count, or participation flag may appear in those specific surfaces. **The S-2 Competitions section and the Analytics section's competition-record summary line are the one exception** — they may read this squad's own challenge data by design (SQ-D11).
3. The Limited Athlete Profile's hidden-fields list (S-2 §5.5.5) implicitly extends to all challenge data — no challenge field is added to that modal. This is unaffected by the new Competitions/Analytics exception.
4. **Correctness test (binding, restated):** it must be *impossible* for any surface **other than** the C-series, this squad's own Competitions section, and this squad's own Analytics summary line to render challenge performance data. Any schema or query path that lets challenge data reach S-1, the S-2 member list, the Limited Profile, the Today's Check-ins card, a *different* squad's S-2 page, the Friends Feed, or a Community surface is a defect, not a configuration.
5. **Roster-scoping (v1.3, CA3-D6 — Firewall generalized, not weakened; v1.4, CC4-D5 — generalized a second time; v1.5, SQ-D2 — narrowed for the owning squad's own page only):** every challenge query is scoped to the challenge's **roster set** — the participants, plus (for SQUAD context only) the squad's members as viewers on that squad's own page, plus (for COMMUNITY context, v1.4) the community's members as viewers — and the requester must belong to that scope. For FRIENDS context the scope is the invited/participant set; a friend challenge has **no always-on surface at all**. No cross-context, cross-squad, cross-community, public, or external read path exists. The community's feed and Community Page header stats (`Community-System-Architecture-v1.0` COM-D7) may never render challenge performance data — the same correctness test applies to them as to S-1/S-2/any other squad. The Firewall *principle* — challenge data visible only within the opted-in context, never on a surface outside that context — is preserved and generalized; CC-D2 / SA2-D1's bars are untouched for every surface this document does not name as the one new exception.

---

## Section 14 — Integration Contracts

### CS-D23 — Squads *(SQUAD-context coupling only, v1.3 CA3-D7)*
1. **For SQUAD context:** `Challenge.squadId` is a required FK and the challenge is bound to that squad (CS-D1). **For FRIENDS context:** `squadId` is null, the challenge has no squad dependency, and **none of the squad-coupling rules below apply** — a friend challenge is unaffected by any squad's membership or lifecycle.
2. **Roster (SQUAD)** is drawn from squad membership at join time; locked at `startAt`. (FRIENDS roster = invited accepted Friends who opted in, CS-D7/CA3-D4.)
3. **Member leaves/removed from squad:** the athlete is withdrawn from all of that squad's ACTIVE/ENROLLMENT challenges (`withdrawn = true`), removed from standings with no marker (CS-D3). Consistent with S-3 §7.5 (removal doesn't alter training records) — challenge withdrawal is squad-relationship-scoped, not a training-data change.
4. **Squad deleted (S-3 §11) — SQUAD context only:** all of that squad's challenges transition to CANCELLED (pre-COMPLETED) or remain ARCHIVED (already finished); ARCHIVED results are retained as long as the squad's records surface exists, and are removed with the squad per squad-deletion data rules. No orphan SQUAD challenge exists without a squad. **FRIENDS challenges are never affected by squad deletion** (they have no squad).
5. **Surfaces:** SQUAD challenge entry and Current Champions live on squad Challenge surfaces per SA-D2; squad cards (S-1) and member list (S-2) are untouched. FRIENDS challenges are entered from a **participant-level** surface (CA3-D11; H-1 recommended) and never appear on any squad surface.

### CS-D24 — Honors
1. On COMPLETED with a winner, the system emits a **Challenge Completion** event to the Honor Evaluation Service (`ChallengeEvaluator`, Honor-Catalog-Amendment-001 HC-D2).
2. On ENROLLMENT→ACTIVE roster lock, the system emits **Challenge Enrollment Finalized** for each participant (Participation family).
3. The system maintains account-cumulative `challenges_won_count` and `challenges_entered_count` (HC-D3) and the participation-streak inputs (CS-D27) and ensures they are finalized **before** the evaluator runs (ES-4 pattern).
4. Honors are awarded to the athlete's permanent record; they are **not** stored in challenge entities and are **not** squad-scoped. Challenge honors surface in-app (no push, M-2 rules). **(v1.3, CA3-D9; v1.4, CC4-D6)** All three contexts emit the **same** events: Friend and Community Challenges count toward `challenges_won_count` / `challenges_entered_count` exactly as squad challenges do — Wins and Participation honor families are account-cumulative across **all three** contexts. The **participation-streak** honor input (`max_participation_streak`) is the lone carve-out: it is **SQUAD-context only** (CS-D27 is per-(athlete, squad)); friend and community challenges do **not** contribute to streak honors.
5. **Co-winners (CA2-D2):** when `winnerAthleteIds` holds multiple co-winners, each receives full credit — `challenges_won_count` increments by 1 for **each**, and each is independently eligible for Win-family honors.

### CS-D27 — Participation streak (restores the brief's "Participation Streaks") *(SQUAD-context only, CA3-D9)*
1. **Definition:** a participation streak is **squad-scoped** and counts **SQUAD-context challenges only** (friend challenges never contribute) — within one squad, the count of consecutive challenges (ordered by `startAt`) the athlete enrolled in. The streak **resets to 0** when a challenge starts in that squad that the athlete did not join. Maintained as `current_participation_streak` per (athlete, squad).
2. **Anti-shame (CS-D3, binding):** the streak is a *positive* counter feeding the athlete's own record. A reset is **silent** — no "streak broken" notification, no marker, and non-participation that causes the reset is never displayed as another member's data on any surface. The streak value is never shown as a comparison axis on a squad surface (Firewall).
3. **Honor input:** the system maintains `max_participation_streak` (account-wide highest streak ever reached, across all squads) and finalizes it on each **Challenge Enrollment Finalized** event, before `ChallengeEvaluator` runs. This feeds the Participation Streak honor family (Honor-Catalog-Amendment-001 HC-D4).
4. Streaks are computed from enrollment records (`ChallengeParticipant`) and challenge ordering only — no training-performance data is involved, so there is no Firewall conflict.

### CS-D25 — Notifications
Per §12 / P-5-Amendment-001. The Challenge System emits neutral/positive events to the P-5 Challenges category; it never emits a failure push.

### CS-D26 — Rank (explicit NON-integration)
1. The Challenge System emits **no** rank-contributing event and writes **no** rank signal (CS-D4 / CC-D5).
2. Challenge participation, wins, scores, and badges have **zero** effect on Rank computation. `Rank-Computation-Model.md` requires no amendment.
3. `RANK_XP` as a challenge *metric* is deferred (CS-D11) and, even if later built, would *read* a rank-derived metric — never *write* to rank.

---

## Section 15 — Edge Cases

| # | Case | Behavior |
|---|---|---|
| 15.1 | Fewer than 2 participants at `startAt` | Auto-CANCEL; no result, no honor, no marker (CS-D5 r2) |
| 15.2 | All participants withdraw mid-challenge | Drops below 2 → auto-CANCEL at next evaluation; no winner |
| 15.3 | Tie at completion | Co-winners (plural `winnerAthleteIds`), positive shared victory (CS-D15) |
| 15.4 | Participant leaves squad mid-challenge | Withdrawn from challenge, no marker (CS-D23 r3) |
| 15.5 | Squad deleted during ACTIVE challenge | Challenge → CANCELLED (CS-D23 r4) |
| 15.6 | Creator leaves the squad | Challenge continues; creator badge persists or transfers per squad rules; squad Owner retains cancel authority |
| 15.7 | Zero qualifying activity from all participants | Leaderboard shows all at score 0; at completion, tie-break → co-winners or no-winner per rule; never a "nobody trained" shame banner (CS-D3) |
| 15.8 | Imported history backfilled after completion | Does **not** retroactively alter an ARCHIVED `ChallengeResult` (immutability, CS-D17) |
| 15.9 | Non-participant opens Challenge Detail | Sees leaderboard (squad-scoped view) but is not in it; no "you didn't join" prompt (CS-D3) |
| 15.10 | Member at free-tier squad limit | Unaffected — challenges are within an existing squad; no new squad-count gate |

---

## Section 16 — Downstream Wireframes (C-series, future specs)

Layout/pixel work is out of scope; these are the screens this architecture implies. Codes proposed; confirmed when authored.

| Code | Screen | Notes |
|---|---|---|
| C-1 | Challenge Hub | **(v1.3, CA3-D10/D11; v1.4)** A **participant-scoped** hub listing the athlete's challenges across contexts. Reachable from a squad surface (filtered to that squad, SQUAD context), from a participant-level entry (H-1 recommended) showing squad + friend + community challenges, **and from the Community Page's Competitions tab (COMMUNITY context).** Firewall: lives on a Challenge surface, not the S-2 member list or the Community feed. |
| C-2 | Create Challenge | **(v1.3, CA3-D10; v1.4)** Adds a **Context step — "Squad," "Friends," or "Community"**; Friends reveals a roster picker (athlete search → invite from accepted Friends); **Community reveals a community picker scoped to communities where the athlete holds Owner/Admin/Moderator (CC4-D3), with no roster picker — enrollment is open to all community members.** Then name, type, duration, optional description; publish → ENROLLMENT |
| C-3 | Challenge Detail | Overview + system Rules block + live Leaderboard + Challenge Feed; Join/Leave CTA |
| C-4 | Challenge Results | Final standings + winner(s); read-only |
| C-5 | Hall of Champions | Squad-scoped archived-challenge history (CS-D18) |
| C-6 | Squad Records | Materialized squad records (CS-D19) |
| C-7 | Current Champions | Standing champions by category (CS-D20); may render within C-1 or S-2 entry |

Each C-series spec must carry the Firewall (§15) and anti-shame (CS-D3) checklist items.

---

## Section 17 — Future Amendment Requirements

1. **Locked-doc inline edits (Pending):** apply the downstream-impact tables from the four authority amendments to DNA, S-1, S-2, S-3, Honor Catalog (re-lock v1.1), Honor Evaluation Service, HonorInstance, and P-5 (re-lock v1.1). Tracked, not done.
2. **Honor Catalog re-lock v1.1** with the COMPETITION category counts (HC-D1).
3. **P-5 re-lock v1.1 + P-5 wireframe** rendering three grouped sections.
4. **RANK_XP contract (if pursued):** a future Rank-side amendment exposing a windowed, comparison-safe metric (CS-D11). Until then, `RANK_XP` stays deferred.
5. **Future challenge types** (e.g., head-to-head pairings) require a scoring-model amendment, each re-tested against the four gates + Firewall. (Heaviest-single-lift was restored into v1.1 as `MAX_LIFT`; participation streaks restored as CS-D27.)
6. **Real-time leaderboard sync** (beyond MVP screen-load accuracy) is a future enhancement, not a v1.0 requirement.

---

## Section 18 — Validation Checklist

### Consenting Competition Context (CC-D1)
- [ ] Every challenge is **roster-scoped** (`context` SQUAD with `squadId` required, FRIENDS with both null, or COMMUNITY with `communityId` required), opt-in, roster-locked at `startAt`, bounded by `endAt`
- [ ] No path exists to create a public, cross-context, always-on, or auto-enrolled challenge
- [ ] Creating ≠ joining; creator is not auto-enrolled
- [ ] FRIENDS eligibility = existing `ACCEPTED` Friend of creator + explicit opt-in; unfriend after `startAt` doesn't alter locked roster (CA3-D4/FR-D6)
- [ ] COMMUNITY eligibility = current community member at enrollment time; open opt-in, no invitation step; creation gated to Owner/Admin/Moderator (CC4-D2/D3)
- [ ] Squad-legacy surfaces (Hall/Records/Champions/streak) SQUAD-context only; friend and community results permanent + visible to their scope + honor-bearing (CA3-D8/CC4-D4)

### Firewall (CC-D2 / CS-D22) — narrowed for SQUAD surfaces by `Squad-System-Architecture-v1.0` SQ-D2/SQ-D11
- [ ] Challenge entities readable only via C-series surfaces **and, for a SQUAD-context challenge, that squad's own S-2 Competitions section / Analytics summary line**
- [ ] S-1 cards, the S-2 member list, the Limited Athlete Profile, the Today's Check-ins card, **any other squad's S-2 page**, the Community feed, and the Community Page header stats expose zero challenge data
- [ ] Correctness test holds: impossible for any surface other than the C-series, the owning squad's own Competitions/Analytics, to render challenge performance data
- [ ] FRIENDS- and COMMUNITY-context challenges remain unaffected — still no always-on surface anywhere for those contexts
- [ ] Every challenge query is **roster-scope gated** (squad-membership for SQUAD; invited/participant set for FRIENDS; community-membership for COMMUNITY); no cross-context/public path (CA3-D6/CC4-D5)

### Anti-shame (CC-D3 / CS-D3)
- [ ] Declining/non-participation produces no record or marker
- [ ] Withdrawal removes from standings with no "quit/DNF" marker
- [ ] No surface labels any participant loser/last; standings positive-framed
- [ ] No failure-framed notification; "passed you" neutralized or separately opt-in
- [ ] No negative badge, no negative squad record

### Lifecycle & permissions
- [ ] States DRAFT→ENROLLMENT→ACTIVE→COMPLETED→ARCHIVED (+CANCELLED) per CS-D5
- [ ] Roster locks at `startAt`; <2 participants → auto-CANCEL
- [ ] Any member may create; creator authority is challenge-scoped only (no squad tier; S-3 two-tier model intact)
- [ ] Squad Owner may cancel (cleanup) but gains no scoring privilege

### Scoring, leaderboard, results
- [ ] Types: MOST_WORKOUTS, MOST_VOLUME, MAX_LIFT, MOST_DURATION, MOST_PRS ship; RANK_XP deferred (CS-D11)
- [ ] MAX_LIFT distinct from MOST_VOLUME; optional `targetExerciseId` scopes to one canonical exercise; CUSTOM excluded
- [ ] Partial sessions count, discarded don't (AD-42 reused); only in-window participant data scored
- [ ] Score recomputed post-finalized-session-save; cache re-derivable from logged data; MAX_LIFT held as non-decreasing max
- [ ] Tie-breaks deterministic; ties → co-winners (no manufactured loser)
- [ ] `ChallengeResult` immutable; archive permanent
- [ ] Participation streak (CS-D27): squad-scoped current streak, silent reset, account-wide max feeds streak honors; no Firewall conflict

### Integrations
- [ ] Squads: roster from membership; member-leave/removal → silent withdrawal; squad delete → cancel/retain per rules
- [ ] Communities: roster from membership at enrollment; creation gated to Owner/Admin/Moderator (CC4-D3); no Community-legacy surface parallel (CC4-D4)
- [ ] Honors: Challenge Completion + Enrollment-Finalized events → ChallengeEvaluator; counters finalized before eval; honors not stored in challenge entities; Wins/Participation credit SQUAD+FRIENDS+COMMUNITY; streak SQUAD-only
- [ ] Notifications: P-5 Challenges category, default OFF, opted-in only, neutral copy, context-agnostic across all three contexts
- [ ] Rank: no rank event emitted, no rank signal written (CS-D26)

---

## Section 19 — Change Log

| Version | Date | Change |
|---|---|---|
| 1.5 | June 2026 | **Squad System Architecture reconciliation — applied `Squad-System-Architecture-v1.0` (LOCKED) SQ-D2/SQ-D11.** Narrowed CS-D2 and CS-D22 for SQUAD-context challenges only: challenge entities are now readable by that squad's own S-2 Competitions section and Analytics summary line, in addition to the C-series surfaces — superseding `Squad-Architecture-Amendment-001` SA-D1 and `Squad-Architecture-Amendment-002` SA2-D1/D2 for that one surface. Every other surface this document already named — S-1 cards, the S-2 member list, the Limited Athlete Profile, the Today's Check-ins card, any *other* squad's page, the Friends Feed, and Community surfaces — remains fully barred; the binding correctness test (CS-D22.4) restated accordingly. FRIENDS- and COMMUNITY-context challenges are unaffected (still no always-on surface anywhere). The challenge-creator-is-challenge-scoped rule (SA-D3) is reinforced, not changed. No new entity, lifecycle, scoring, or notification change. |
| 1.4 | June 2026 | **Community Competitions — applied Challenge-Architecture-Amendment-004 (LOCKED) per `Community-System-Architecture-v1.0` COM-D10.** Added `Challenge.context = COMMUNITY` and `communityId` (CC4-D1/§3.1). Enrollment open to any community member, no invitation step (CC4-D2). Creation gated to community Owner/Admin/Moderator — a deliberate departure from SQUAD's any-member rule (CC4-D3/CS-D6). Confirmed no Community-legacy-surface parallel to Hall of Champions/Squad Records/Current Champions; Community results permanent + member-visible via the Community Competitions tab only (CC4-D4/§11 banner). Firewall roster-scope generalized a second time to community membership; Community feed/page barred from rendering challenge data, same correctness test (CC4-D5/CS-D22). Honors Wins/Participation now credit all three contexts; participation-streak remains SQUAD-only (CC4-D6/CS-D24). No new notification toggle (CC4-D7/CS-D21). Wireframes: C-1 gains Community Competitions-tab entry; C-2 gains a Context step third option with a community picker, not a roster picker (§16). Checklist updated. Backward compatible; no SQUAD/FRIENDS behavior changed. |
| 1.3 | June 2026 | **Participant-based reconciliation — applied Challenge-Architecture-Amendment-003 v1.1 + Friend-Relationship-Architecture-Amendment-001 (both LOCKED).** Added `Challenge.context` enum {SQUAD, FRIENDS} and made `squadId` nullable (CS-D1/§3.1, CA3-D3). FRIENDS enrollment = creator invites from existing **accepted Friends** + explicit opt-in; roster locks at start; unfriend-after-start doesn't alter roster (CS-D7/§3.2, CA3-D4/FR-D6). Permissions restated challenge-scoped/squad-independent; squad-Owner cancel = SQUAD only (CS-D6, CA3-D5). Leaderboard + Firewall generalized squadId→roster scope (CS-D12/CS-D22, CA3-D6). Squad-deletion/lifecycle coupling = SQUAD only (CS-D23, CA3-D7). Hall/Records/Champions/participation-streak = **SQUAD-context only**; friend results permanent + participant-visible + honor-bearing (CS-D17–D20/CS-D27/§11 banner, CA3-D8). Honors: friend challenges count toward won/entered, streak excludes friend (CS-D24, CA3-D9). Wireframes: C-1 participant-scoped hub, C-2 Context step + Friends roster picker (§16, CA3-D10/D11). Checklist updated. Backward compatible; Firewall principle unchanged. |
| 1.2 | June 2026 | Ratified three C-5–C-7 wireframe gaps via Challenge-Architecture-Amendment-002 (no feature change): Highest Challenge Score tracked **per `ChallengeType`** (CS-D19, CA2-D1); **co-winners receive full credit** for wins/streaks/records/honors (CS-D15, CS-D24, CA2-D2); Current Champions tracked **per `ChallengeType`** with "comparable identity" = same type (CS-D16, CS-D20, CA2-D3). Squad-surface Current-Champions Firewall ruling (C-7 §11 C) remains open. |
| 1.1 | June 2026 | Faithfulness-audit remediation (restores two scope items found weakened/removed vs. the approved vision). **Restored `MAX_LIFT`** as a distinct heaviest-single-lift challenge type alongside `MOST_VOLUME`, with optional `Challenge.targetExerciseId` exercise scoping (CUSTOM excluded, AD-28c) and non-decreasing-max scoring (CS-D8, CS-D10). **Restored participation streaks** (CS-D27): squad-scoped current streak with silent reset, account-wide max feeding the new Participation Streak honor family (Honor-Catalog-Amendment-001 HC-D4). MVP types now 5 (RANK_XP still deferred, CS-D11). Checklist and future-amendments updated. |
| 1.0 | June 2026 | Initial. Net-new Challenge System architecture authored under the approved amendment set. Defines entities (Challenge, ChallengeParticipant, ChallengeScore, ChallengeResult, SquadChallengeRecord; badges derived-not-stored), lifecycle (DRAFT→ENROLLMENT→ACTIVE→COMPLETED→ARCHIVED +CANCELLED), challenge-scoped permission model preserving S-3's two tiers, opt-in enrollment with invisible decline and roster lock, scoring model (4 MVP types; RANK_XP deferred), positive-framed leaderboards, deterministic tie-breaks with co-winners, ephemeral badges (CC-D4), archive/Hall of Champions/Squad Records/Current Champions, P-5-routed neutral notifications, the binding Firewall data-access contract, and integration contracts with Squads/Honors/Notifications/Rank (Rank = explicit non-integration). Identifies C-1–C-7 downstream wireframes and six future amendment requirements. |

---

*Forge Legacy — Challenge System Architecture*
*v1.5 — June 2026 (participant-based: SQUAD + FRIENDS + COMMUNITY contexts; SQUAD-context Firewall narrowed for the owning squad's own S-2 page)*
*Authority: Comparison-Philosophy-Amendment-001 (LOCKED), Challenge-Architecture-Amendment-003 v1.1 (LOCKED), Challenge-Architecture-Amendment-004 (LOCKED), Friend-Relationship-Architecture-Amendment-001 (LOCKED), Squad-Architecture-Amendment-001/002 (LOCKED, superseded for Squad surfaces), Honor-Catalog-Amendment-001 (LOCKED), P-5-Amendment-001 (LOCKED), Community-System-Architecture-v1.0 (LOCKED), Community-Roles-and-Moderation-v1.0 (LOCKED), Squad-System-Architecture-v1.0 (LOCKED)*
*Status: LOCKED (June 2026) — PO-approved; ready for the Architecture Freeze.*
