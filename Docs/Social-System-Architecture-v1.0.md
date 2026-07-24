# Forge Legacy — Social System Architecture
## v1.1 | June 2026

**Status:** **LOCKED** (June 2026) — foundational system architecture; the governing authority for all social behavior in Forge Legacy. Consolidates and formalizes the already-approved social philosophy. Product-owner-approved; ready for the Architecture Freeze. Downstream specs are reconciled to reference it in the post-freeze reconciliation pass.

**Type:** Foundational System Architecture — the **governing authority for all social behavior in Forge Legacy.** Future social work inherits from this document; downstream specs will be reconciled to reference it.

**Authority:**
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED) — §2 (High-Trust Relationships, Identity Over Performance, Accountability Without Shame), §4 (what Forge is not), §5/§8 (brand/UX philosophy), §10 (Explicitly Prohibited Patterns — this document is the **formal architecture review** §10 requires for private reactions/comments and a private feed), §11 (Product Decision Test).
- `Comparison-Philosophy-Amendment-001.md` v1.1 (LOCKED) — CC-D1 (Consenting Competition Context; the §10-narrowing precedent this document mirrors), CC-D2 (Performance Firewall, binding), CC-D3 (anti-shame guardrails).
- `Friend-Relationship-Architecture-Amendment-001.md` (LOCKED) — FR-D1 (the persistent mutual Friend entity), FR-D2/D3 (not-a-follower-system / binding privacy never-list), FR-D5 (WwF standing consent), FR-D6 (Friend Challenge eligibility), FR-D7 (friend-request notifications).
- `Challenge-Architecture-Amendment-003` v1.1 (LOCKED) + `Challenge-System-Architecture-v1.0.md` (v1.5) — participant-based challenges (SQUAD / FRIENDS / COMMUNITY); roster-scoped Firewall.
- `Squads-Hub-Spec-S1`, `Squad-Detail-Spec-S2`, `Squad-Management-Permissions-S3` (LOCKED) — squad relationship + always-on-surface Firewall.
- `Workout-With-Friend-Spec-WwF` v1.2 (LOCKED) — presence-not-performance attribution; FR-D5 standing-consent routing.
- `Honor-Catalog-v1.2`, `Honor-Evaluation-Service-Arch`, `HonorInstance-Architecture` (LOCKED) — account-based honors; milestone source events.
- `P-5-Notifications-Architecture` v1.2 (LOCKED) — notification grouping; Friend Requests (Section D).
- `WSR-001-Workout-Share-Result-Architecture` (LOCKED) — the **coexisting** lightweight presence/check-in channel (distinct primitive; never a media system).
- `Community-System-Architecture-v1.0.md` (LOCKED, **v1.1**) — establishes Communities as the fourth relationship pillar; the authority for the Social Hierarchy and Post-audience edits applied in this revision (§2A, §8, §10).

**Supersedes:** `Friend-Relationship-Architecture-Amendment-001` **FR-D4 (Friends Feed clause only)**. FR-D4's presence-only Friends-Feed framing is replaced by §10 of this document. **All other FR decisions (FR-D1/D2/D3/D5/D6/D7) remain intact and are cited, not changed.**

> **Consuming-authority pointer — `Backend-Data-Model-Architecture-v1.0.md` (LOCK-CANDIDATE, June 2026).** `Friend`, `Post` (incl. the audience enum and COMMUNITY-mutual-exclusivity rule), `Reaction`, and `Comment` are formalized as canonical entities in that document's Section 12. The Performance Firewall this document establishes is generalized into a server-side, query-layer enforcement rule in Section 18.1 there (API Philosophy principle 6, Section 6). This document remains the sole authority on social *philosophy* and behavior — the Backend doc only gives that philosophy a data-model and enforcement home.

**Amendment Log:** v1.0 — **LOCKED June 2026** (PO-approved; ready for the Architecture Freeze). **v1.1 (June 2026): `Social-Architecture-Amendment-001-Communities.md` merged** — Communities added as a peer layer to Squads in the Social Hierarchy (SOC-D1A); `Post.audience` extended with `COMMUNITY` + required/immutable `communityId` (SOC-D7/D8); Friends Feed audience-scoping restated for the new value (SOC-D9). No other decision changed.

**Downstream dependents (reconciled in a later pass, after lock):** DNA §10 (pointer to SOC-D4 narrowing); FR-Amendment-001 (FR-D4 marked superseded); WSR-001 (coexistence note); P-1 Profile spec; L-12 Accomplishments; P-5 v1.2 (Post Comments / optional Post Reactions rows); Honor Catalog / Honor-Evaluation-Service (milestone → optional auto-post hook, no schema change); Challenge/Squad specs (Friend-Challenge entry from the social surface; feed Firewall); **Community-System-Architecture-v1.0 / Community-Feed-Specification-v1.0 (v1.1 — Communities pillar + Post audience extension).**

> **Consuming-authority pointer — `Calendar-System-Architecture-v1.0` (LOCKED, June 2026).** The Calendar may render an **optional, off-by-default** Friends layer (CAL-D14) governed by **SOC-D2** (relationships grant interaction, not visibility): it surfaces, at most, the **existence/date** of an intentional friend-audience moment the friend already chose to share, and **never** a friend's workout history, performance, scores, goal progress, or body metrics — **friendship grants no visibility**, and the Privacy Firewall (CC-D2) is unchanged. The Calendar layer is a read-through that renders nothing the Social surfaces would not already render, links back into them (CAL-D17), and is never a comparison view. No social action originates from, and no progression flows through, the Calendar (SOC-D13 / CAL-D21). This document is unchanged; the Calendar consumes it.

---

## Section 1 — Purpose & Scope

Forge Legacy's social behavior was, until now, defined piecemeal across the Friend, Challenge, Squad, WwF, WSR-001, Honors, and Notifications documents. This document consolidates that work into a single governing authority and formalizes the product owner's social design philosophy. It does **not** rewrite existing architecture; it states the principles the social layer obeys, defines the net-new Profiles / Posts / Feed / Engagement primitives at the architecture level, performs the DNA §10 formal architecture review, and identifies downstream reconciliation work.

**In scope:** the social philosophy; the binding relationship-vs-visibility rule; the DNA §10 narrowing for private reactions/comments/feed; Friend relationships (consolidated); Profiles; Posts; audience selection; the Friends Feed; feed ordering; engagement (reactions/comments); automatic sharing; the posts-never-progress rule; friend navigation; friend discovery; integration with all existing systems; the Privacy Firewall's preservation; guiding principles.

**Out of scope (explicitly):** pixel/wireframe layout of any social screen (future C-/P-/social wireframes); backend field names, enums, and schema (deferred per the P-5/P-8 concept-level precedent); comment moderation/safety tooling (report/block) — acknowledged as a net-new surface and flagged as future work (§Non-Behaviors), not designed here; any change to the Friend entity (FR-001 owns it), the Challenge/Squad/Honor/WSR-001 entities, Rank, or the Privacy Firewall.

**House rule for this document:** field names are architecture-level (concept). Backend may rename. Types are indicative.

---

## Section 2 — SOC-D1 — Social Philosophy (why the social layer exists)

**Locked.** Forge Legacy's social layer exists to encourage **accountability, encouragement, and long-term relationships** around fitness. It is **not** a social-media platform, and it intentionally avoids traditional social-media mechanics.

Every social decision reinforces:
- **Identity over popularity.**
- **Legacy over attention.**
- **Encouragement over comparison.**
- **Community over engagement metrics.**

**The social layer is optimized for** — accountability, encouragement, community, identity, legacy.

**The social layer is never optimized for** — attention, popularity, virality, engagement farming, or content creation for its own sake.

> The social layer exists to **strengthen fitness — not replace it.** When a social mechanic and a fitness/legacy value conflict, the fitness/legacy value wins (DNA §11 Product Decision Test, Q5/Q6 in particular).

---

## Section 2A — SOC-D1A — Social Hierarchy

**Locked.** *(v1.1 — Communities added as a peer layer to Squads, `Social-Architecture-Amendment-001-Communities.md`.)* The social layer is a stack of layers, each building on the one before it:

1. **Identity** → every athlete (the base layer; who the athlete is).
2. **Friends** → persistent, mutual relationships between two athletes.
3. **Squads** → long-term training groups.
3a. **Communities** *(v1.1, new)* → interest-based, often-public groups organized around shared topic rather than a direct training relationship (`Community-System-Architecture-v1.0`). Peer to Squads, not nested under it.
4. **Challenges** → temporary, opt-in competitive contexts (drawable from a Squad, a Friend set, or — v1.1 — a Community, per `Challenge-Architecture-Amendment-004-Community-Competitions.md`).
5. **Posts** → intentional sharing across approved audiences (v1.1 — now including a Community audience, §8/§9).

**Each layer builds upon the previous one without replacing it.** Every relationship and audience presupposes **Identity** (the base layer); Friends, Squads, and Communities are independent standing relationships an athlete may hold in any combination; Challenges are temporary contexts drawn from those relationships; and Posts share across the audiences those relationships define (§9). A higher layer never supersedes or absorbs a lower one — Posts do not replace Squads, Communities, or Challenges, Challenges do not replace Friends, Squads, or Communities, and nothing replaces Identity. (Friends, Squads, and Communities are *peer* standing relationships, not a dependency chain — membership in one never requires membership in another.) This ordering is why the rules that follow attach interaction and visibility to the correct layer.

---

## Section 3 — SOC-D2 — Relationships grant interaction, not visibility (primary governing rule)

**Locked, binding. This is the load-bearing rule from which most future social features inherit.**

A **relationship type** — Friend, Squad, or Challenge participant — primarily grants **interaction capabilities**, not **visibility**. Visibility is governed **independently**, by:

1. **Public profile settings** (what the owner has chosen to make public).
2. **Private profile settings** (what the owner keeps private).
3. **The Privacy Firewall** (CC-D2 — protected performance data).
4. **Explicit feature permissions** (a feature the owner opted into — e.g., joining a challenge exposes that challenge's standings *within that challenge context only*).

### Worked examples
- **Friendship grants interaction:** Workout With Friend, Friend Challenges, the Friends Feed, commenting, reactions, and other collaboration/communication privileges.
- **Friendship does NOT grant visibility:** being someone's Friend never automatically exposes their workout history, challenge performance, private analytics, or any protected performance information. Those remain governed by the four visibility mechanisms above — never by the existence of a relationship.

### Why this is binding
This rule is the general form of FR-D3 ("friendship alone never exposes performance"), CC-D2 (the Firewall), and SA2-D3 (self-owned vs. peer-comparative). Stating it once, here, means every future relationship type and every future feature is tested against it: *does this grant interaction, or does it leak visibility the owner did not choose?* Granting visibility requires one of the four independent mechanisms — never a relationship by itself.

---

## Section 4 — SOC-D3 — Profiles communicate identity; Posts communicate moments (governing philosophy)

**Locked.** Two surfaces, two purposes, one ordering:

- **Profiles communicate identity.** A profile answers: **"Who is this athlete?"**
- **Posts communicate moments.** A post answers: **"What meaningful moments has this athlete chosen to share?"**
- **Identity always comes before content.** Profiles are **never** content-first pages. The athlete's identity (rank, legacy, journey, recognition) is primary; posts are secondary and supportive.

This philosophy governs §6 (Profiles), §7 (Posts), and §9 (Friends Feed): wherever identity and content compete for primacy, identity wins.

---

## Section 5 — SOC-D4 — DNA §10 formal architecture review (binding narrowing)

DNA §10 prohibits, among other patterns, **"Like systems," "Comment systems,"** and **"Workout feeds"** — but qualifies the entire list with **"Without a formal architecture review."** **This section is that review,** scoped as narrowly as possible, mirroring the precedent set when `Comparison-Philosophy-Amendment-001` (CC-D1) narrowed §10's leaderboard prohibition.

### Statement (Locked, binding)
Private, mutually-consented, **audience-scoped** reactions and comments, and a **private intentional-sharing feed**, are permitted. Their public / engagement-driven forms remain prohibited.

### Narrowing table (what changes, what does not)
| DNA §10 pattern | Before | After (narrowed) |
|---|---|---|
| "Like systems" | Read as: all reaction mechanics prohibited | **Public** like systems / like-counts-as-popularity prohibited; **private, audience-scoped reactions** that produce no popularity score, no ranking, and no feed-bump are permitted (§11). |
| "Comment systems" | Read as: all comments prohibited | **Public** comment systems prohibited; **private, audience-scoped comments** visible only to a post's audience, encouragement-oriented, non-ranking, non-bumping, are permitted (§11). |
| "Workout feeds" | Read as: all feeds prohibited | The **public / automatic / comparison-driven workout feed** stays prohibited; a **private, opt-in, intentional-sharing Friends Feed** (manual posts + meaningful milestone posts; never an auto workout log) is permitted (§9). |
| "Follower systems," "Public workout statistics," "Public goal progress," "Public body metrics," "Rank comparisons," "Streak pressure systems" | Prohibited | **Unchanged — still prohibited.** This review does not touch them. |

### Why no violation
The protected property in §10 was never "reactions" or "comments" as such — it was *public engagement mechanics that manufacture popularity, comparison, and attention-seeking*. Audience-scoped, consented, non-ranking reactions/comments and a private intentional feed carry none of those properties: no follower counts, no popularity score, no engagement ranking, no algorithmic distribution, no feed manipulation. The Performance Firewall (CC-D2) and every anti-shame guardrail (CC-D3) are untouched. Outside these narrow, consented surfaces, every §10 prohibition stands in full.

---

## Section 6 — SOC-D5 — Friend Relationships (consolidated)

**Locked.** This section consolidates the Friend relationship governance. **The Friend entity itself is owned by `Friend-Relationship-Architecture-Amendment-001` (FR-D1) — no schema is redefined here.**

| Concept | Rule |
|---|---|
| **Friend Request** | An athlete sends a request to another athlete (found via intentional discovery, §12). State `PENDING`. |
| **Accepted Friend** | The recipient accepts → a **mutual, private, doubly-consented** relationship (`ACCEPTED`). Symmetric; visible only to the two athletes (FR-D1/D2). |
| **Friend List** | The athlete's own private list of accepted Friends. **Private to the owner — never public, never squad-visible** (FR-D3). |
| **Removing Friends** | Either party may unfriend at any time. **Silent and symmetric** — no notification of the removal, no marker (FR-D1/D7). |
| **Standing relationship** | An accepted Friend is a **standing consent relationship** outside Squads (FR-D5) — the substrate for WwF (M-8 path), Friend Challenges, the Friends Feed, comments, and reactions. |
| **Friend permissions** | Friendship grants **interaction privileges** (per SOC-D2) — WwF, Friend Challenges, Friends Feed, comment, react. It grants **no visibility privileges.** |

### Binding prohibit-list (consolidates FR-D2/D3)
The Friend system must never introduce: **followers** or any asymmetric/unconsented relationship; **public friend lists**; **popularity systems** (friend counts as a metric, popularity scores); **suggested friends** / People-You-May-Know; **public social graphs**; **engagement rankings** of any kind. None of these exist; all are barred.

---

## Section 7 — SOC-D6 — Profiles

**Locked.** Profiles are governed by SOC-D2 and SOC-D3.

### The governing rule
**Friendship does NOT change profile visibility.** A profile contains **public information** and **private information**, and **the owner controls what is public.** Friends gain **interaction privileges, not visibility privileges.** A non-friend and a friend see the *same* public profile; friendship adds the ability to *interact* (WwF, challenge, comment, react), never to *see more*.

### What a profile emphasizes (identity-first)
A profile is built to answer "Who is this athlete?" and emphasizes:
- **Rank** (self-owned legacy depth — non-relative; SA2-D3).
- **Legacy progress.**
- **Current journey** (active chapter / program at the owner's discretion).
- **Top Honors** (account-based recognition; Honor visibility per the owner's public/private settings).
- **Pinned accomplishments.**
- **Pinned Posts** (see below).
- **Bio.**
- **Identity** (name/username/avatar per Identity-Amendment-001).

Profiles are **not** content-first pages. Posts are reachable from a profile but never dominate it. **Posts exist to support an athlete's identity, never to replace it.**

### Pinned Posts (generalized)
**Pinning is not limited to PR videos.** The athlete may **pin any intentional post**, including: PR videos, PR photos, a favorite workout, major accomplishments, progress photos, and milestone posts. **Pinned content exists to reinforce identity — not to maximize engagement.** (Pin count / ordering is a wireframe-level detail; reconciled with the P-1 profile spec and L-12 accomplishments downstream.)

---

## Section 8 — SOC-D7 — Posts

**Locked.** A **Post** is an athlete's **intentional** share of a moment. Identity remains primary (SOC-D3); posts are secondary.

### Entity (architecture-level)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `authorAthleteId` | uuid (FK → Athlete) | The owner. |
| `media` | media[] | Photos and/or videos (see supported content). |
| `caption` | string? | Optional. |
| `audience` | enum **{ `FRIENDS`, `SQUAD`, `BOTH`, `COMMUNITY` }** *(v1.1 adds `COMMUNITY`)* | §9 audience selection. No public option exists. `COMMUNITY` is never combined with `FRIENDS`/`SQUAD`/`BOTH` on the same post (§9). |
| `communityId` | uuid? (FK → Community) *(v1.1, new)* | **Required and immutable** when `audience = COMMUNITY`; null otherwise. Owned at the entity level here; the Community-scoped feed, content types, and engagement rules are owned by `Community-Feed-Specification-v1.0`. |
| `source` | enum **{ `MANUAL`, `MILESTONE_AUTO` }** | Manual share vs. system-generated milestone post (§9/§13). |
| `milestoneType` | enum? | Set only when `source = MILESTONE_AUTO` (Honor earned / Program completed / Chapter completed / major milestone). |
| `createdAt` | timestamp | |
| `archivedAt` / `deletedAt` | timestamp? | Archive (hidden from feed, retained) / delete (removed). |

### Supported content
Workout photos, workout videos, **PR photos, PR videos**, progress photos, and captions.

### Lifecycle
Posts are **permanent, archivable, and deletable**:
- **Permanent** — a post persists until the owner acts on it (no auto-expiry).
- **Archivable** — the owner may archive a post (removed from the feed, retained on/for the owner).
- **Deletable** — the owner may delete a post (removed entirely).
- **No Stories** — there is no ephemeral, disappearing-content format. Posts are deliberate and durable.

---

## Section 9 — SOC-D8 — Audience Selection

**Locked.** Every post is shared to one of:
- **Friends** — the author's accepted Friends.
- **Squad** — the author's squad member(s).
- **Both** — Friends and Squad.
- **Community** *(v1.1, new)* — exactly one community the author is a member of (`communityId`).

**One upload → one post → multiple audiences if selected — except Community.** The athlete uploads once; a single Post object carries the chosen `audience`; it surfaces to exactly the selected audience(s). `Friends`/`Squad`/`Both` remain combinable as before. **`Community` is never combined with the other three values** — a Community post belongs to exactly one community and is never simultaneously a Friends/Squad post (`Community-System-Architecture-v1.0` COM-D8 "no cross-posting"). This is the structural reason Community is not folded into `BOTH`'s fan-out model: `BOTH` shares the same post across two audiences the author already owns; `Community` scopes the post into a space with its own independent membership and moderation (`Community-Roles-and-Moderation-v1.0`), which the author does not own merely by posting.

**There is no public audience option** for `FRIENDS`/`SQUAD`/`BOTH` — their maximum reach is the union of the author's own Friends and Squad. A `Community` post's reach is the community's membership, which may itself be Public or Private (`Community-System-Architecture-v1.0` COM-D5) — this is the one audience value whose reach is not solely defined by the author's own relationships, and it is bounded instead by that community's own visibility tier and posting rules. Visibility is always the selected audience's defined scope, nothing wider (SOC-D2 / the Firewall).

---

## Section 10 — SOC-D9 — Friends Feed (supersedes FR-D4)

**Locked. This section is the Friends Feed authority and supersedes FR-D4's presence-only clause.** (FR-D4's other intent — opt-in, private, bounded, non-comparison — is preserved and generalized here.)

The Friends Feed is **NOT an automatic workout log.** It is a **private, intentional-sharing feed** of two kinds of content:

**Manual posts** (athlete-initiated, §7): photos, videos, PR media, progress photos, captions.

**Automatic milestone posts** (system-generated, governed by §12): **Honors earned, Program completed, Chapter completed, and other major milestones** only.

The Friends Feed **never** automatically posts: completed "[muscle group] day," started workout, finished workout, daily workout logs, sets, reps, weight, pace, scores, rankings, or any performance comparison.

> **The Friends Feed exists to celebrate meaningful moments — not every workout.** Once an athlete has dozens of Friends, automatic workout-completion posts would become noise; Forge surfaces meaningful accomplishments and intentional sharing instead. This is precisely why it is **not** the DNA-banned "workout feed" (SOC-D4): it is private, opt-in, intentional, milestone-only for automatic content, and non-algorithmic.

### Coexistence with WSR-001 (distinct primitives)
WSR-001 squad check-ins and the Friends Feed are **different systems serving different intents and remain distinct:**
- **WSR-001** = the **lightweight presence / check-in** channel — accountability and live workout awareness. It **never becomes a media system.**
- **Posts / Friends Feed** = the **intentional media-sharing** channel — photos, videos, PRs, captions, milestone sharing. It **never replaces lightweight check-ins.**
Both may appear in the appropriate feed/surface while remaining separate primitives. Neither is reconciled into the other.

### Isolation from Communities (v1.1, binding — `Community-System-Architecture-v1.0` COM-D13)
**Community-audience posts (`audience = COMMUNITY`) are never eligible for Friends Feed inclusion.** This is not a new restriction — it is the same audience-scoping mechanism that already keeps a `SQUAD`-only post out of a Friends-only view, applied to the new `COMMUNITY` value. Standard community activity (posts, comments, reactions, membership) remains fully isolated within Communities. The sole, pre-existing exception is unchanged by Communities: an Honor earned *through* Community participation (e.g., "Mentor," "Community Builder," `Honor-Catalog-Amendment-002-Community-Honors.md`) may, like any other Honor, become a milestone-auto Post under §13's Automatically-Share-Milestones setting — that post is a Friends/Squad-audience Post about an Honor the athlete earned, never a republication of Community content.

---

## Section 11 — SOC-D10 — Feed Ordering

**Locked.** Feed ordering is **reverse chronological.**

**Exception (milestone surfacing):** **major milestone posts are temporarily surfaced near the top of the feed before naturally returning to chronological ordering.** This is a brief, time-decaying surfacing of *meaningful* events — explicitly **not** an engagement algorithm and **not** a permanent ranking. A milestone post settles back into its true chronological position as it ages.

**Never used:** engagement algorithms, trending, suggested content, interaction-based ranking. Nothing about who reacted, who commented, or how much, affects ordering.

**Future-proofing:** additional feed filters or categories may be introduced in future versions provided they preserve the governing philosophy established by this document — reverse-chronological by default, no engagement-based ranking, no algorithmic distribution, no manipulation of ordering by interaction.

---

## Section 12 — SOC-D11 — Engagement (reactions + comments)

**Locked** (permitted by the SOC-D4 §10 narrowing).

- **Reactions** and **comments** are supported, **audience-scoped** — only athletes who can see the post (its `audience`) can react or comment.
- **Reactions are lightweight acknowledgements intended to encourage athletes, not to express popularity.** They carry no count-as-status, no ranking, and no feed effect.
- **Comments generate notifications** (to the post author; new P-5 row, §13).
- **Comments are ordered chronologically within each post** — no engagement-based or ranked comment ordering.
- **Comments do NOT bump posts** back to the top. Ordering stays reverse-chronological (SOC-D10); engagement never manipulates the feed.
- **No popularity metric** — reaction/comment counts are not surfaced as a popularity score, are never aggregated into a ranking, and never appear on a profile as a status number. Engagement exists to **encourage conversation**, not to manufacture attention.
- **Encouragement-oriented** — reactions and comments inherit the product's Accountability-Without-Shame stance (CC-D3). (Comment moderation/safety — report/block — is acknowledged as a net-new surface and deferred to future work; see Non-Behaviors.)
- **Reaction notifications** mirror WSR-001's optional squad-reaction model (default OFF), deferred to P-5 reconciliation (§13).

---

## Section 13 — SOC-D12 — Automatic Sharing (default locked)

**Locked.** An account-level setting governs automatic milestone posting:

**Automatically Share Milestones — default = ON.**

- **ON** (default): qualifying milestones (Honor earned, Program completed, Chapter completed, major milestones) generate an automatic milestone post.
- **OFF:** **no** automatic milestone posts are generated. The athlete may still **manually** post at any time.
- The athlete may change this setting at any time.

**Why default ON:** milestones are relatively **infrequent**; **celebration is a core part of Forge**; and the setting is a single, always-available off-switch, so the default does not trap anyone into sharing.

**Audience of automatic posts:** automatic milestone posts follow the **existing audience-selection philosophy** (§9) — they are published to the athlete's configured **default post audience** (`FRIENDS` / `SQUAD` / `BOTH`), changeable by the athlete, never wider than that union. Automatic posting introduces no audience beyond what §9 already permits.

---

## Section 14 — SOC-D13 — Separation of Progression and Social

**Locked, binding.** **All social activity is purely social.** **No** social action of any kind — posts, comments, reactions, or friendships (sending/accepting/removing) — **ever affects** any of:
- **Legacy progression.**
- **Rank.**
- **Honors.**
- **Competitions / Challenge standings.**
- **Any progression system** of any kind.

The entire social layer emits **no** progression-contributing event and writes **no** progression signal. Creating/reacting-to/commenting-on/archiving/deleting a post, and forming or ending a friendship, all have **zero** effect on Rank computation, Honor evaluation, goal/chapter progress, challenge scoring, or legacy depth. **Social activity never becomes progression**, and **progression never depends on social activity** — having more friends, more posts, more reactions, or more comments never advances Rank, Honors, or Legacy. (This parallels CS-D26's Rank non-integration and is the general rule for the entire social layer: the engine produces progression; the social layer reflects and celebrates it, never feeds it.)

> **Boundary clarification (WwF / training acts):** this principle governs **social-layer actions** — the social relationship itself (send/accept/remove a friend) and the engagement primitives (posts, comments, reactions). It does **not** reclassify a **training act that happens to involve a friend.** A Workout-With-Friend *reference entry* is a **training-presence record in the Legacy Engine** (W-18 history), not a social-layer post; it retains its existing eligibility for Community/Longevity honors exactly as defined by `Honor-Evaluation-Service` — because the honor is earned by the **training/presence act**, never by the friendship connection or by any post about it. Friendship as a *relationship* still earns nothing.

---

## Section 15 — SOC-D14 — Friend Navigation

**Locked.** The Friends page is **centered on the Feed.** **Friends** and **Requests** are **elegant entry points in the page header** — not persistent sections, not large cards.

- Selecting **Friends** → opens the **searchable Friend List**.
- Selecting **Requests** → opens **pending Friend Requests**.
- **The Feed remains the primary destination.** Navigation chrome stays minimal so identity-and-moments content — not relationship management — is what the athlete lands on.

---

## Section 16 — SOC-D15 — Friend Discovery

**Locked.** **Friend discovery is intentional.** A connection forms only through:
**Search → Friend Request → Acceptance** (Identity-Amendment-001 search + discoverability toggle).

**Future-proofing:** future **profile-sharing methods** (such as **QR codes** or **profile links**) are **consistent with intentional discovery** and are permitted under this principle — they are deliberate, athlete-initiated ways to hand someone a profile to request from. They **do not** introduce recommendation algorithms.

**Never introduced:** **Suggested Friends**, **"People You May Know,"** mutual-friend recommendations, or any **discovery algorithm.** Discovery is always an act the athlete chooses, never a surface the system populates.

---

## Section 17 — SOC-D16 — Integration & the Privacy Firewall

**Locked.** How the social layer integrates with existing systems. **No existing system is redesigned; the Privacy Firewall is unchanged.**

| System | Integration |
|---|---|
| **Workout With Friend** (WwF v1.2) | An accepted Friend is the standing-consent relationship (FR-D5) → WwF M-8 path. WwF remains presence-not-performance; it creates reference entries, not Posts. WwF is interaction, governed by SOC-D2. |
| **Friend Challenges** (CA3 / Challenge-System v1.3) | Eligibility = accepted Friend + explicit challenge opt-in (FR-D6). The Friend relationship is the roster source for `context = FRIENDS`. **Challenge standings never appear in the Friends Feed or on a profile** — they live only on the opted-in Challenge surface (roster-scoped Firewall, CA3-D6). |
| **Squad Challenges** (CA3 / Challenge-System v1.3) | Unchanged; SQUAD context. Squad-legacy surfaces remain SQUAD-only (CA3-D8). Posts with `audience = SQUAD/BOTH` are intentional shares, never challenge data. |
| **Honors** (Catalog v1.2 / Eval / HonorInstance) | An earned Honor is a **milestone trigger** for an optional automatic post (§12/§13), gated by the Automatically-Share-Milestones setting. **Honors remain account-based; no honor schema change**; posting an honor does not alter the HonorInstance and never affects Honor evaluation (SOC-D13). |
| **Notifications** (P-5 v1.2) | Friend Requests already exist (P-5 Section D, FR-D7). **New downstream P-5 additions:** **Post Comments** (notify the author; Requests/activity-class) and **optional Post Reactions** (mirror WSR-001 squad reactions; default OFF). Push-only; in-app surfaces always show regardless of toggle (P-5 §4). |
| **WSR-001** | Coexists as the distinct lightweight presence/check-in channel (§9). Never a media system; Posts never replace check-ins. |
| **Privacy Firewall (CC-D2)** | **Completely unchanged.** **Friendship never exposes protected performance.** Profiles show only owner-public information; PR media in posts are owner-chosen intentional shares (not automatic performance exposure); rank/legacy on profiles are self-owned and non-relative (SA2-D3). No always-on surface exposes challenge or workout performance. |

---

## Section 18 — Guiding Principles (governing)

These are governing principles; future social features are tested against them.

1. **Profiles communicate identity. Posts communicate moments.**
2. **Friendship grants interaction — not visibility.**
3. **Social exists to strengthen accountability.**
4. **Community over popularity.**
5. **Legacy over engagement.**
6. **Meaningful moments over constant activity.**
7. **Encourage fitness — not content creation.**
8. **Social supports the Legacy Engine. The Legacy Engine never depends on Social.**

Reinforcing stance (SOC-D1): Forge **optimizes for** accountability, encouragement, community, identity, legacy — and **never optimizes for** attention, popularity, virality, engagement farming, or content creation for its own sake. The social layer strengthens fitness; it never replaces it.

---

## Non-Behaviors

- **No public social graph, followers, follower/friend counts as metrics, popularity scores, engagement rankings, or public friend lists** (SOC-D5/SOC-D1).
- **No suggested friends / PYMK / discovery algorithm** — discovery is intentional only; QR codes / profile links are permitted as intentional methods, not recommendations (SOC-D15).
- **No Stories / ephemeral content** (SOC-D7).
- **No automatic workout-log posts** — automatic posts are milestone-only (SOC-D9).
- **No engagement-based feed ordering, trending, or interaction-based ranking; comments never bump posts** (SOC-D10/SOC-D11).
- **No visibility granted by relationship** — visibility is governed only by public/private profile settings, the Firewall, and explicit feature permissions (SOC-D2).
- **No progression effect from any social action** (SOC-D13).
- **No change to the Friend entity, Challenge/Squad/Honor/WSR-001 entities, Rank, or the Privacy Firewall** — this document governs and integrates; it does not redesign.
- **Comment moderation/safety (report/block, who-can-comment beyond audience) is not designed here** — acknowledged as a net-new free-text surface and flagged for a dedicated future decision; out of v1.0 scope.

---

## Validation Checklist

- [ ] SOC-D1 — social philosophy stated; optimize-for / never-optimize-for lists present
- [ ] SOC-D1A — Social Hierarchy (Identity → Friends → Squads/**Communities (v1.1, peer)** → Challenges → Posts); each layer builds on the previous without replacing it
- [ ] SOC-D2 — relationships grant interaction, not visibility; the four independent visibility mechanisms named; binding
- [ ] SOC-D3 — profiles = identity, posts = moments; identity before content
- [ ] SOC-D4 — DNA §10 formal review performed; private reactions/comments/feed narrowed in; public forms still barred; Firewall/anti-shame untouched
- [ ] SOC-D5 — Friend requests/accepted/list/removal/standing/permissions consolidated; prohibit-list binding; FR-001 entity not redefined
- [ ] SOC-D6 — friendship does not change profile visibility; owner-controlled public/private; identity-first fields; **Pinned Posts generalized** (any intentional post)
- [ ] SOC-D7 — Post entity; supported media; permanent/archivable/deletable; no Stories
- [ ] SOC-D8 — audience Friends/Squad/Both; one upload → one post; no public audience
- [ ] SOC-D9 — Friends Feed supersedes FR-D4; manual + milestone-only auto; never-auto list; WSR-001 coexistence; **Community-audience posts isolated from the Friends Feed (v1.1)**
- [ ] SOC-D10 — reverse chronological; milestone posts **temporarily surfaced then return** to chronological; no engagement algorithm
- [ ] SOC-D11 — reactions + comments audience-scoped; comments notify; comments don't bump; no popularity metric
- [ ] SOC-D12 — Automatically Share Milestones **default ON (locked)**; audience follows §9; off-switch always available
- [ ] SOC-D13 — Separation of Progression and Social: no social action (posts/comments/reactions/friendships) affects Legacy/Rank/Honors/Competitions/Challenge standings/any progression, and progression never depends on social
- [ ] SOC-D14 — feed-centric Friends page; Friends/Requests as header entry points
- [ ] SOC-D15 — intentional discovery; QR/profile links consistent; no recommendations
- [ ] SOC-D16 — integration with WwF/Challenges/Honors/Notifications/WSR-001 stated; **Privacy Firewall unchanged; friendship never exposes performance**
- [ ] §18 — eight guiding principles present (incl. "Social supports the Legacy Engine; the Legacy Engine never depends on Social")
- [ ] No contradiction with DNA, Comparison Philosophy, FR-001, CA3, Challenge-System v1.3, Squads, WwF v1.2, Honors, P-5, WSR-001

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | `Social-Architecture-Amendment-001-Communities.md` merged. Communities added as a peer layer to Squads in the Social Hierarchy (SOC-D1A §2A); `Post.audience` extended with `COMMUNITY` + required/immutable `communityId`, binding never-combined-with-other-audiences constraint stated (SOC-D7 §8, SOC-D8 §9); Friends Feed isolation from Community-audience posts restated as a clarifying note (SOC-D9 §10). No existing decision (D1–D6, D10–D16) altered; FR/Challenge/Squad/Honor/P-5/WSR-001 integration unchanged. |
| 1.0 | June 2026 | Initial. Establishes the Social System as Forge Legacy's governing social authority. Defines: social philosophy + optimize-for/never lists (SOC-D1); the **Social Hierarchy** Identity→Friends→Squads→Challenges→Posts, each layer building on the previous (SOC-D1A); the binding relationships-grant-interaction-not-visibility rule (SOC-D2); profiles-are-identity / posts-are-moments (SOC-D3); the DNA §10 formal architecture review narrowing private reactions/comments/feed in while keeping public forms barred (SOC-D4); consolidated Friend relationships + prohibit-list (SOC-D5); profiles with owner-controlled visibility, identity-first fields, and generalized Pinned Posts (SOC-D6); the Post entity — permanent/archivable/deletable, no Stories (SOC-D7); audience selection Friends/Squad/Both (SOC-D8); the Friends Feed, superseding FR-D4, milestone-only auto + manual, coexisting with WSR-001 (SOC-D9); reverse-chronological ordering with temporary milestone surfacing (SOC-D10); audience-scoped reactions/comments (reactions = lightweight acknowledgements; comments chronological within a post), comments notify, no bump, no popularity metric (SOC-D11); Automatically-Share-Milestones default ON (SOC-D12); **Separation of Progression and Social** — no social action (posts/comments/reactions/friendships) affects progression and progression never depends on social (SOC-D13); feed-centric friend navigation (SOC-D14); intentional discovery future-proofed for QR/profile links (SOC-D15); integration + unchanged Privacy Firewall (SOC-D16); feed-ordering future-proofing (future filters/categories must preserve the governing philosophy, §11); "Posts support identity, never replace it" (§7); eight guiding principles incl. "Social supports the Legacy Engine; the Legacy Engine never depends on Social" (§18). Supersedes FR-D4 (Friends Feed clause only); all other FR decisions intact. No existing entity redesigned. |

---

*Forge Legacy — Social System Architecture*
*v1.1 — June 2026*
*Authority: FORGE_LEGACY_PRODUCT_DNA.md; Comparison-Philosophy-Amendment-001 v1.1; Friend-Relationship-Architecture-Amendment-001; Challenge-Architecture-Amendment-003 v1.1; Challenge-System-Architecture-v1.0 (v1.5); Squads S1 v1.5/S2 v1.6/S3 v1.3; Workout-With-Friend v1.2; Honor Catalog v1.5 / Honor-Evaluation-Service / HonorInstance; P-5-Notifications v1.4; WSR-001 v1.2 (coexisting); Community-System-Architecture-v1.0 / Community-Feed-Specification-v1.0 (v1.1) — all LOCKED/lock-ready*
*Supersedes: Friend-Relationship-Architecture-Amendment-001 FR-D4 (Friends Feed clause only)*
*Status: LOCKED (June 2026) — PO-approved; ready for the Architecture Freeze.*
