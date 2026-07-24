# Forge Legacy — Community Feed Specification
## v1.0 | June 2026

**Status:** **LOCKED** (June 2026) — subordinate architecture under `Community-System-Architecture-v1.0` (COM-D7/D8/D9). Product-owner-approved; ready for the Architecture Freeze.

**Type:** System Architecture (feed/content/engagement layer)

**Authority:**
- `Community-System-Architecture-v1.0.md` (LOCKED) — COM-D7 (Community Page composition — the Feed is one element), COM-D8 (members-only posting; one community per post; no cross-posting), COM-D9 (workout-sharing integration).
- `Social-System-Architecture-v1.0.md` (LOCKED) — SOC-D4 (the DNA §10 formal architecture review precedent this document's own §6.1 mirrors), SOC-D7/D8 (the Post entity and audience model this document extends), SOC-D10 (feed-ordering precedent), SOC-D11 (engagement precedent).
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED) — §10 (this document performs a second, narrower formal architecture review, scoped to Communities only, §6.1).

**Supersedes:** Nothing. **Extends** `Social-System-Architecture-v1.0`'s `Post` entity (§3 below) with a `COMMUNITY` audience value; this is recorded as the binding edit in `Docs/Amendments/Social-Architecture-Amendment-001-Communities.md` and restated here for completeness.

**Downstream dependents:** `Community-Discovery-and-Search-v1.0` (reads `Community.category`/`memberCount`, not feed content); `Community-Roles-and-Moderation-v1.0` (owns who may Pin/Remove, consumed here as a permission check, §5/§7); a future Community wireframe workstream (pixel layout, out of scope here per `Community-System-Architecture-v1.0` §1).

---

## Section 1 — Purpose & Scope

This document defines what a Community's feed contains, how a post is structured, how the feed orders content, and how members engage with it (comments, replies, likes, save, report). It is the content layer beneath `Community-System-Architecture-v1.0`'s COM-D7 (Community Page), COM-D8 (posting rules), and COM-D9 (workout-sharing integration).

**In scope:** the `CommunityPost` content model (extending `Post`); the nine permitted feed content types; feed ordering and pinning; the `CommunityComment` entity (replies, likes, save, report); the DNA §10 formal architecture review for Community-scoped engagement counts; integration with workout sharing.

**Out of scope:** pixel layout; moderation actions themselves (who can remove/pin/ban — owned by `Community-Roles-and-Moderation-v1.0`); Discovery/search ranking (owned by `Community-Discovery-and-Search-v1.0`).

---

## Section 2 — CF-D1 — Relationship to the Social-System Post entity

**Locked.** Rather than invent a parallel post entity, a Community post **is** a `Post` (`Social-System-Architecture-v1.0` §8, SOC-D7) with `audience = COMMUNITY`. This preserves the existing Post lifecycle (permanent / archivable / deletable, no Stories) without duplication. Two fields are added, both **meaningful only when `audience = COMMUNITY`** (null/ignored otherwise):

| Field | Type | Notes |
|---|---|---|
| `communityId` | uuid (FK → Community) | **Required** when `audience = COMMUNITY`; null otherwise. Immutable after creation (COM-D8 — exactly one community, no cross-posting). |
| `postType` | enum (§3) | Required when `audience = COMMUNITY`; meaningless for `FRIENDS`/`SQUAD`/`BOTH`, where a post is implicitly a media share. |
| `pinnedToCommunityAt` | timestamp? | Set by a moderator action (`Community-Roles-and-Moderation-v1.0` §5); distinct from the athlete's own profile Pinned Posts (`Social-System-Architecture-v1.0` SOC-D6, an unrelated, author-controlled mechanism). Null = not pinned. |

**Why reuse, not reinvent:** Friends/Squad posts and Community posts share the same backbone — an author, a lifecycle, an audience scope, an engagement surface. Reinventing the entity would duplicate that backbone for no benefit and risk the two drifting out of sync (e.g., archival/deletion behaving differently for no reason). The *content* is where Communities genuinely differ, and that difference is fully captured by `postType` + the richer `CommunityComment` entity (§4) — not by a second Post table.

---

## Section 3 — CF-D2 — Feed Content Types

**Locked.** `postType` enum, valid only when `audience = COMMUNITY`:

| `postType` | Description | Source |
|---|---|---|
| `WORKOUT_SHARE` | A completed workout shared into the community (`Community-System-Architecture-v1.0` COM-D9) | Athlete-initiated share action |
| `PR` | A personal record shared into the community | Athlete-initiated; mirrors WSR-001's PR-via-Honor pattern — no separate PR-detection engine is built here |
| `QUESTION` | An open question to the community | Athlete-authored |
| `TECHNIQUE_VIDEO` | A form-check or technique-demonstration video | Athlete-authored |
| `DISCUSSION` | General topical discussion | Athlete-authored |
| `ADVICE` | Advice/guidance content | Athlete-authored |
| `COMMUNITY_CHALLENGE` | A system-generated post marking a Community-context competition's lifecycle event (created/started/completed) | System-generated, mirrors the existing Challenge Feed pattern (CS-D21) |
| `OFFICIAL_ANNOUNCEMENT` | A communication from the community's Owner/Admin | Owner/Admin-authored only (`Community-Roles-and-Moderation-v1.0` §5) |
| `ARTICLE_RESOURCE` | A shared article or resource (link + optional summary) | Athlete-authored |

These nine types are the **complete V1 set.** No other content type may be added without a formal architecture amendment — the same closed-catalog discipline the Honor Catalog already enforces ("No honor types may be added, removed, or modified without a formal architecture amendment").

**Training-focused, by design:** every type above is either training-adjacent (workout/PR/technique/advice/discussion-about-training) or structural (announcement/challenge-marker/resource). This is the enforcement mechanism for `Community-System-Architecture-v1.0` §2's "Communities remain training-focused" — there is no `postType` for off-topic content because the type enum is closed.

---

## Section 4 — CF-D3 — Comments (CommunityComment)

**Locked.** Community engagement is **richer** than the Friends/Squad engagement model (SOC-D11's flat, chronological comments) because Communities are discussion-shaped, not media-share-shaped. A separate `CommunityComment` entity is used rather than overloading the Social-System comment model:

```
CommunityComment {
  id:                 uuid
  communityPostId:    uuid (FK → Post, where audience = COMMUNITY)
  authorAthleteId:    uuid (FK → Athlete)
  parentCommentId:    uuid? (FK → CommunityComment)   // null = top-level
  body:               string
  likeCount:          int        // derived/cached; see CF-D4
                                  // (no savedByCount field — Save is private, never aggregated, §4.3)
  createdAt:          timestamp
  deletedAt:           timestamp?
}
```

### 4.1 Replies — one level deep
**Locked.** A `CommunityComment` may reply to a top-level comment (`parentCommentId` set) but **a reply to a reply is not supported in V1** — `parentCommentId` must always point to a top-level comment (one that itself has `parentCommentId = null`). This is a deliberate simplicity constraint (Product DNA "Simplicity Wins"): deep threading adds real UI and moderation complexity for a V1 discussion surface that does not yet need it.

### 4.2 Likes
**Locked, scoped exception — see §6.1 for the formal DNA §10 review.** A `CommunityComment` may be liked by any member who can see the post. Unlike Social-System reactions (SOC-D11, which show no aggregate count), Community comment likes **do show an aggregate count** (`likeCount`). This is a narrower, explicitly-justified exception — see §6.1.

### 4.3 Save
**Locked.** Any member may **Save** a post or comment to a private, per-athlete list. Save is never visible to anyone else, never aggregated into a count, and never feeds any ranking. It exists purely as a personal bookmarking utility — functionally identical in spirit to a private reading list, not an engagement signal.

### 4.4 Report
**Locked.** Any member may **Report** a post or comment. Reporting routes to the community's Owner/Admin/Moderator queue (`Community-Roles-and-Moderation-v1.0` §7) — there is no platform-wide trust-and-safety escalation path designed in V1 (flagged as an open gap, not a silent omission — see that document's §10).

---

## Section 5 — CF-D4 — Feed Ordering & Pinning

**Locked.** Mirrors `Social-System-Architecture-v1.0` SOC-D10 exactly, scoped to one community's feed:

1. **Reverse chronological**, by `createdAt`.
2. **Pinned posts remain on top**, ordered by `pinnedToCommunityAt` descending (most-recently-pinned first) above the chronological stream. Pinning/unpinning is a moderator-tier action (`Community-Roles-and-Moderation-v1.0` §5) — never athlete self-service, which is the key difference from the unrelated, author-controlled profile Pinned Posts (SOC-D6).
3. **No recommendation algorithm in V1.** No engagement-based ranking, no trending-sort *within* a feed (Discovery's cross-community Trending sort, `Community-Discovery-and-Search-v1.0` §5, is a different, narrower mechanism and does not reorder any individual feed).

---

## Section 6 — CF-D5 — DNA §10 Formal Architecture Review (Community engagement)

DNA §10 prohibits "Like systems" and "Comment systems" without a formal architecture review. `Social-System-Architecture-v1.0` SOC-D4 already performed that review once, for the Friends/Squad context, and narrowed it to **audience-scoped, non-aggregate-count** reactions/comments. **This section performs a second, separate review**, because §4.2 above makes a different, narrower choice for Communities: **visible aggregate like counts on comments.**

### 6.1 Statement (Locked, binding)
Within a Community's feed — a bounded, topic-scoped, **members-only** discussion surface — a **comment-level** like count is permitted. This is **narrower** than a public like system in three binding ways:

| Constraint | Why it avoids the banned pattern |
|---|---|
| **Comment-scoped only.** No like count exists on a *post*, on an *athlete*, or as an *aggregate-across-community* statistic (`Community-System-Architecture-v1.0` §15.3 — statistics are limited to Members/Posts/Events/Competitions; no leaderboard). | The banned pattern is a *popularity score attached to a person or to content as status* — a comment-like count is a signal about whether a specific piece of advice was useful, the same shape as a "helpful" marker, not a popularity ranking. |
| **Members-only audience.** Likes are visible only within the community, never on an external share, never on a profile. | No public engagement-farming surface exists; the count cannot be screenshotted into a follower-style metric outside the bounded community. |
| **No feed-ordering effect.** Likes never bump a post or comment (CF-D4); they are display-only. | The defining mechanic of an engagement-driven feed — likes changing what you see — is absent. |

### 6.2 Why this differs from SOC-D4's choice (no aggregate counts)
The Friends/Squad context is a **closed, small, relationship-bound** audience where even a small count can read as comparison between known peers ("Maya got more reactions than me"). A Community is a **larger, topic-bound, often-public-membership** audience where a comment-like count communicates "the group found this helpful" — closer to a forum's "helpful answer" signal than a social-media popularity metric. The product owner's locked decision (the `Locked Decisions → Comments` row specifying "Likes" without the SOC-D11 caveat) is treated here as the deliberate, narrower choice this section justifies — not as an oversight to be silently corrected back to SOC-D11's stricter rule.

### 6.3 What remains prohibited, unchanged
Public follower-style metrics, athlete-level popularity scores, community-wide "top poster" leaderboards, algorithmic feed ranking by engagement, and any cross-community aggregate are **all still barred** — this review narrows nothing beyond the single comment-like-count exception stated in §6.1.

---

## Section 7 — Non-Behaviors

- **No post type outside the closed nine-value enum** (§3) — off-topic content has nowhere to go.
- **No like count on posts, athletes, or community-wide aggregates** — only on comments (§6.1).
- **No deep comment threading** — replies are one level deep (§4.1).
- **No cross-posting** — a post belongs to exactly one community, enforced by the immutable, required `communityId` (`Community-System-Architecture-v1.0` COM-D8).
- **No recommendation algorithm reordering any feed** (§5).
- **No Save visibility to anyone but the saving athlete** (§4.3).
- **No platform-wide moderation escalation path** — Report routes to the community's own role-holders only (§4.4; acknowledged gap, owned by `Community-Roles-and-Moderation-v1.0`).

---

## Validation Checklist

- [ ] CF-D1 — Community posts extend the existing `Post` entity (`audience = COMMUNITY`); `communityId` required + immutable; `postType` defined; `pinnedToCommunityAt` distinct from profile Pinned Posts
- [ ] CF-D2 — exactly nine `postType` values; closed catalog; training-focused enforcement via closed enum
- [ ] CF-D3 — `CommunityComment` entity defined; replies one level deep; Likes show aggregate count (scoped exception); Save private; Report routes to community moderation queue
- [ ] CF-D4 — reverse-chronological ordering; pinned posts on top via `pinnedToCommunityAt`; pin/unpin is moderator-tier only; no recommendation algorithm
- [ ] CF-D5 — DNA §10 formal review performed and scoped narrowly to comment-level like counts; three binding constraints stated; distinction from SOC-D4 justified; all other §10 prohibitions remain in force
- [ ] No contradiction with Social-System-Architecture-v1.0, Community-System-Architecture-v1.0, or Product DNA §10

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Defines Community posts as an extension of the existing Social-System `Post` entity (`audience = COMMUNITY`, `communityId`, `postType`, `pinnedToCommunityAt`) rather than a parallel entity (CF-D1); the closed nine-value `postType` catalog enforcing training-focus (CF-D2); the `CommunityComment` entity with one-level-deep replies, aggregate-visible comment likes, private Save, and moderation-routed Report (CF-D3); reverse-chronological ordering with moderator-only pinning and no recommendation algorithm (CF-D4); and a second, narrowly-scoped DNA §10 formal architecture review permitting comment-level like counts within the bounded, members-only Community context while leaving every other §10 prohibition intact (CF-D5). |

---

*Forge Legacy — Community Feed Specification*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); Social-System-Architecture-v1.0 (LOCKED); FORGE_LEGACY_PRODUCT_DNA.md*
*Status: LOCKED (June 2026) — PO-approved; ready for the Architecture Freeze.*
