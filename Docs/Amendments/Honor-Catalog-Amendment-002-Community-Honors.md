# Forge Legacy — Honor Catalog Amendment 002
## Community Honors + Category Naming Collision Fix
### June 2026

**Status:** LOCKED

**Type:** Architecture Amendment (adds 5 new honor types in a new category; renames one existing category label — no `honorType` ID, threshold, or qualification change to any existing honor)

**Authority:** `Community-System-Architecture-v1.0.md` (LOCKED) COM-D11 — "Community participation integrates with the existing Honors system… Examples include: First Community Joined, Community Builder, Helpful Contributor, Mentor, Event Organizer." `Honor-Catalog-v1.0-LOCKED.md` v1.2.1 (LOCKED) — the document amended.

**Amends:** `Honor-Catalog-v1.0-LOCKED.md` v1.2.1 → v1.3 — Category Summary, the existing `COMMUNITY` category (renamed), and a new category.

**Supersedes:** Nothing functional. The existing `COMMUNITY` category's **label only** is renamed; its three `honorType` IDs, thresholds, and qualification logic are byte-for-byte unchanged.

---

## Purpose — a naming collision found during reconciliation

While integrating the new Communities subsystem, this reconciliation pass found that `Honor-Catalog-v1.0-LOCKED.md` **already contains a category named `COMMUNITY`** (3 types: `first_workout_with_friend`, `workout_with_friend_10`, `workout_with_friend_50` — all Workout-With-Friend / training-partner honors, unrelated to the new Communities feature). Per `AGENTS.md`'s standing instruction to "identify the discrepancy rather than assuming either source is correct," this amendment resolves it explicitly rather than silently overloading one name with two meanings.

**Resolution:** the existing category is **renamed** `PARTNERSHIP` (it has always been about training partners, not interest-based groups — `PARTNERSHIP` is the more accurate label and was never accurate as `COMMUNITY` in the first place). The name `COMMUNITY` is freed for a **new** category covering the new Communities subsystem. No `honorType`, threshold, or qualification logic changes — this is a label-only correction, the same category of fix as the Muscle-Building rename (`Muscle-Building-Rename-Amendment-001.md`, which also relabeled without touching IDs).

---

## HC2-D1 — Rename: `COMMUNITY` → `PARTNERSHIP` (label only)

| Field | Before | After |
|---|---|---|
| Category label | `COMMUNITY` | `PARTNERSHIP` |
| `honorType` IDs | `first_workout_with_friend`, `workout_with_friend_10`, `workout_with_friend_50` | **Unchanged** |
| Display Names | First Workout With Friend, 10/50 Workouts With Friend | **Unchanged** |
| Qualification | `wwf_sessions_count` thresholds | **Unchanged** |
| Trigger | WwF Session Save | **Unchanged** |

---

## HC2-D2 — New category: `COMMUNITIES` (5 types)

**Locked.** Five new honor types, one new family, all **account-based, one-time, never community-scoped** (no honor is awarded *to* a community, and no community-leaderboard surfaces who has the most — consistent with `Community-System-Architecture-v1.0` §15.3's no-leaderboard rule and AD-27, honors do not contribute to rank):

| # | honorType | Display Name | Qualification | Trigger |
|---|---|---|---|---|
| 63 | `first_community_joined` | First Community Joined | `communities_joined_count ≥ 1` | Community membership granted (join or approval) |
| 64 | `community_builder` | Community Builder | Athlete has created and retained ownership of a community that reaches **50 members** (flagged, per the Monetization Amendment 001 precedent, as an **Initial MVP Assumption — Subject to Future Revision**) | Community member-count crosses threshold while athlete is Owner |
| 65 | `helpful_contributor` | Helpful Contributor | Cumulative comment-like count (`Community-Feed-Specification-v1.0` CF-D3 §4.2) across all communities ≥ **25** (flagged provisional) | Comment like recorded |
| 66 | `mentor` | Mentor | Athlete has authored **10** distinct top-level comments that each received ≥ 1 like, across at least **3** distinct communities (flagged provisional) — a breadth-of-helpfulness signal, not a raw count, to avoid rewarding volume in a single thread | Comment like recorded; evaluated against the distinct-community/distinct-comment criteria |
| 67 | `event_organizer` | Event Organizer | Athlete has created and hosted **1** Community Event (`Community-System-Architecture-v1.0` §10) that reached its scheduled end | Community Event reaches its end timestamp |

**Architecture notes:**
- Trigger sources are Community membership events, `CommunityComment` like events, and Community Event lifecycle events — all new milestone sources for the Honor Evaluation Service, integrated exactly as Challenge/WwF/Social-System milestones already are (no schema change to `HonorInstance` itself).
- All five are **one-time.**
- `community_builder`, `helpful_contributor`, and `mentor`'s numeric thresholds are explicitly flagged provisional — consistent with the catalog's own precedent of locking principles and qualification *shape* immediately while leaving specific numbers open to revision (the same posture `Monetization-Architecture-Amendment-001` takes with its program/photo/squad/import limits).
- **No honor rewards being a Moderator, Admin, or Owner directly** by role alone — every qualification above is an activity threshold (joining, building, helping, organizing), consistent with AD-27 and the product's standing "earn it through action, not title" pattern.

---

## Closure Record Update

| Dimension | Before (v1.2.1) | After (v1.3) |
|---|---|---|
| Total honor types | 62 | **67** |
| Categories | 8 | **9** |
| Families | 14 | **15** |
| One-time honors | 58 | **63** |

**Duplicate check:** all 67 `honorType` IDs unique (the 5 new IDs were checked against all existing 62 — no collision). **Category/family conflicts:** none — `PARTNERSHIP` and `COMMUNITIES` are now distinct, unambiguous labels.

---

## Non-Behaviors

- No honor awarded *to* a community — every honor in `COMMUNITIES` (and `PARTNERSHIP`) remains account-based (HC2-D2).
- No community-scoped honor leaderboard ("most honors in this community") — consistent with `Community-System-Architecture-v1.0` §15.3.
- No change to any existing `honorType`, threshold, qualification, or trigger outside the label rename in HC2-D1.
- No honor for role alone (Owner/Admin/Moderator) — every `COMMUNITIES` honor requires an activity threshold.

---

## Validation Checklist

- [ ] HC2-D1 — `COMMUNITY` category relabeled `PARTNERSHIP`; all 3 existing `honorType` IDs, names, thresholds, triggers byte-identical
- [ ] HC2-D2 — 5 new `COMMUNITIES`-category honors (63–67) defined; all account-based, one-time; no community-scoped leaderboard; provisional numeric thresholds flagged
- [ ] Closure record updated: 67 types / 9 categories / 15 families / 63 one-time
- [ ] No duplicate `honorType` IDs; no category/family conflicts
- [ ] Consistent with Community-System-Architecture-v1.0 COM-D11/§15.3 and AD-27 (no rank effect)

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Identifies and resolves a category-name collision discovered during Communities reconciliation: renames the existing `COMMUNITY` category (Workout-With-Friend honors) to `PARTNERSHIP`, label-only, no ID/threshold change (HC2-D1); adds a new `COMMUNITIES` category with 5 account-based, one-time honor types — First Community Joined, Community Builder, Helpful Contributor, Mentor, Event Organizer — with three numeric thresholds flagged provisional (HC2-D2). Catalog totals: 67 types / 9 categories / 15 families / 63 one-time. |

---

*Forge Legacy — Honor Catalog Amendment 002 (Community Honors + Naming Collision Fix)*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); Honor-Catalog-v1.0-LOCKED.md v1.2.1 (LOCKED, the document amended to v1.3)*
*Status: LOCKED*
