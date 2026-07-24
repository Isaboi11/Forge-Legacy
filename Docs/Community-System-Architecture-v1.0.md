# Forge Legacy — Community System Architecture
## v1.1 | June 2026 (COM-D18 revised 2026-07-07)

**Status:** **LOCKED** (June 2026) — foundational system architecture; the governing authority for the Communities subsystem in Forge Legacy. Product-owner-approved; ready for the Architecture Freeze. Downstream specs and locked-doc inline edits are handled in the post-freeze reconciliation pass (§16). **COM-D18 (Navigation, §15.5) was revised 2026-07-07** — see `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` — Communities is now a 5th bottom-navigation tab; every other decision in this document is unchanged.

**Type:** Foundational System Architecture — the **governing authority for the Communities subsystem.** `Community-Feed-Specification-v1.0`, `Community-Discovery-and-Search-v1.0`, and `Community-Roles-and-Moderation-v1.0` are subordinate documents that implement specific sections of this architecture in depth; this document is the single entry point for "what is a Community."

**Authority:**
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED) — §2 (High-Trust Relationships, Identity Over Performance), §4 (what Forge is not — "not a social network"), §10 (Explicitly Prohibited Patterns — this document performs the formal architecture review §10 requires for community engagement, §6 / `Community-Feed-Specification-v1.0`), §11 (Product Decision Test).
- `Social-System-Architecture-v1.0.md` (LOCKED) — SOC-D1A (Social Hierarchy, amended by this document, §15.1), SOC-D2 (relationships grant interaction, not visibility), SOC-D9 (Friends Feed — isolated from Community activity, §10).
- `Squad-Architecture` (S-1/S-2/S-3, LOCKED) — the precedent for a standing membership group; Communities are deliberately **not** modeled identically (§3, §17.1).
- `Challenge-System-Architecture-v1.0.md` (v1.5, LOCKED) — the Competition engine Communities reuse without a parallel architecture (§11).
- `Honor-Catalog-v1.2.1` / `Honor-Evaluation-Service-Architecture-v1.0` / `HonorInstance-Architecture-v1.0` (LOCKED) — Communities integrate as a milestone source, no schema change (§12).
- `P-5-Notifications-Architecture` v1.2.1 (LOCKED) — Communities add a new grouped notification section (§13).
- `Monetization-Architecture-Amendment-001.md` (LOCKED) — Communities add a new free-tier limit (membership count) under the existing framework (§5).
- `Calendar-System-Architecture-v1.0.md` (LOCKED) — CAL-D2 (surface, not a tab — the precedent this document's navigation decision follows, §15.5); the Calendar may render Community event date-envelopes exactly as it does for Challenges/Goals (read-only, CAL-D3).
- `Identity-Amendment-001-Username.md` (LOCKED) — the search-architecture precedent `Community-Discovery-and-Search-v1.0` extends to community names.

**Amendment Log:** Initial. v1.0 — **LOCKED June 2026** (PO-approved; ready for the Architecture Freeze).

**Downstream dependents (reconciled in this pass, §16):** `Social-System-Architecture-v1.0` (Social Hierarchy amendment, Friends Feed isolation note); `Challenge-System-Architecture-v1.3` (new `COMMUNITY` context); `Honor-Catalog-v1.2.1` (category rename + new Community Engagement category); `P-5-Notifications-Architecture` (new grouped section); `Monetization-Architecture-Amendment-001` (membership limit); `Forge-Legacy-Master-PRD.md` §6 Navigation System (new entry point) and §19 Information Architecture; `Forge-Legacy-Master-Status.md` (Freeze checklist row added).

---

## Section 1 — Purpose & Scope

Communities are interest-based groups focused on learning, accountability, discussion, and improvement. They are the fourth pillar of Forge Legacy's relationship model, sitting alongside — and never replacing — the other three:

- **Legacy** = your personal journey.
- **Friends** = people you know.
- **Squads** = people you train with.
- **Communities** = people who share your interests.

Each pillar answers a different question. Legacy asks "what have I done?" Friends asks "who do I know?" Squads asks "who am I training with?" Communities ask **"who shares what I care about?"** — strength, a sport, a training philosophy, a lifestyle. Communities are not a generic social media platform, and this document treats that constraint as load-bearing, not aspirational.

**In scope:** community types and creation eligibility; ownership; membership and its monetization gate; visibility tiers; the join flow; the Community Page composition; the relationship between Communities, Posting, and Workout Sharing; roles (pointer); moderation (pointer); Official Communities; Events; Competitions; Honors integration; notifications (pointer); the Friends Feed isolation rule; branding; statistics; naming uniqueness; community health (ownership succession); navigation; the explicit V1 exclusion list.

**Out of scope (explicitly):** pixel/wireframe layout of any Community screen (a future C-series-style wireframe workstream); backend field names, enums, and schema beyond architecture-level concepts (deferred per the established P-5/P-8/Social-System precedent); a dedicated Community competition engine (§11 — none is built; the existing Challenge engine is reused); AI moderation (§14); any redesign of Squads, Friends, Challenges, or Honors — this document integrates with each, it does not rewrite any of them.

**House rule for this document:** field names are architecture-level (concept). Backend may rename. Types are indicative. This mirrors the deferral precedent already established by P-5, P-8, and Social-System-Architecture.

---

## Section 2 — COM-D1 — Why Communities Exist (governing philosophy)

**Locked.** Communities exist to connect athletes around **shared interest**, not shared relationship. A Friend is someone you chose individually. A Squad is a small group you train with directly. A Community is neither — it is a larger, often public, gathering organized around a topic (a discipline, a goal type, a lifestyle) rather than a personal connection.

This is why Communities tolerate properties Friends and Squads deliberately do not: **public discovery** (§9, `Community-Discovery-and-Search-v1.0`), **unbounded membership** (§5), and **richer content categories** — questions, technique discussion, advice, articles (`Community-Feed-Specification-v1.0`). These are not concessions to social-media gravity; they are the correct shape for an interest-based gathering, bounded by the same anti-engagement discipline (no recommendation algorithms, no popularity metrics beyond a narrowly-scoped exception, §6.1 of `Community-Feed-Specification-v1.0`) that governs every other Forge surface.

**Communities are optimized for** — learning, accountability, discussion, and improvement, within a shared interest.
**Communities are never optimized for** — attention, virality, engagement farming, content creation for its own sake, or becoming a destination unrelated to training and improvement.

---

## Section 3 — COM-D2 — Community Types

**Locked.** Two types:

| Type | Created by | Badge | Notes |
|---|---|---|---|
| **Official Community** | Forge (platform-authored) | **Official badge** (§11) | Forge-curated; moderated by Forge staff acting in the Owner/Admin roles (`Community-Roles-and-Moderation-v1.0` §6). |
| **User Community** | An eligible athlete | None | Subject to the account-maturity gate below. |

### Account maturity gate for User Community creation
**Locked.** Creating a User Community requires **account maturity and good standing**:
1. **Account age ≥ 30 days** from `account_creation_date` (mirrors the order-of-magnitude already used elsewhere in the product — e.g., username cooldown — and is flagged, consistent with the Monetization Amendment 001 precedent, as an **Initial MVP Assumption — Subject to Future Revision**).
2. **Good standing** = the account holds no active moderation sanction (no active community ban or mute anywhere on the platform at time of creation, per `Community-Roles-and-Moderation-v1.0` §7).
3. This gate exists for exactly one reason: a community is a public-facing, semi-permanent space. Letting a brand-new or sanctioned account spin one up invites abandonment (§14) and bad-faith communities. It is a **creation** gate only — it never restricts joining, posting, or participating in an existing community.

---

## Section 4 — COM-D3 — Ownership

**Locked.** **One owned community per athlete in V1.** An athlete may own at most one community (Official Communities are owned by Forge, not by any athlete, and do not count against this limit). Future expansion (multiple owned communities) is **explicitly deferred** — not designed here, not promised.

**Why one:** ownership carries real responsibility (§14, §17 of `Community-Roles-and-Moderation-v1.0`) — ownership of multiple communities at V1 would dilute accountability and is unnecessary for the V1 use case of "an athlete starts the one community they care about." This mirrors the deliberate restraint already used elsewhere in the product (one Active program per athlete, Program-Architecture-Amendment-001) — a locked simplicity constraint, not an oversight.

An athlete who already owns a community may still **join** any number of other communities, subject to the membership limit in §5. Ownership and membership are independent counters.

---

## Section 5 — COM-D4 — Membership

**Locked.**

| Tier | Communities an athlete may **join** | Member cap per community |
|---|---|---|
| **Free** | 1 | None |
| **Premium** | Unlimited | None |

**No community has a member limit**, regardless of who owns it or which tier members are on. The gate is on the **joining athlete's tier**, never on the community's size — a Community is meant to scale to its topic's audience; a Squad is the bounded, small-group primitive (S-1 §5.2's 2-squad-equivalent constraint does not apply here).

This is a new row in the existing Monetization framework, not a new philosophy: it is "creation/participation beyond the free tier" (`Monetization-Architecture-Amendment-001.md` §9), the same category as the existing program/photo/squad/import limits, and is amended into that document in §18 below. Like every other MVP numeric limit in that document, the "1 free community" figure is flagged **Initial MVP Assumption — Subject to Future Revision**; the **principle** (free tier includes meaningful participation, premium removes the cap) is locked.

**Downgrade behavior (consistent with Never Charge For History, Monetization §2):** a Premium athlete who joins multiple communities and then downgrades to Free **remains a member of all of them** — no removal, no data loss. They simply cannot **join** an additional community while over the Free limit, exactly as the existing squad-limit downgrade behavior works (Monetization §7).

Joining a community is **always free of the per-community-content gates** that don't exist here — there is no concept of a "premium community" or a paid community (explicitly excluded, §14).

---

## Section 6 — COM-D5 — Visibility

**Locked.** Two visibility tiers:

| Tier | Who can find it (§9) | Who can read the feed | Who can join |
|---|---|---|---|
| **Public** | Anyone (search, browse, categories) | Anyone (public visitors may browse, §8) | Immediate, on tapping Join |
| **Private** | Anyone (search, browse, categories — the community's *existence* is not hidden) | Members only | Requires approval (§7) |

**Hidden communities are explicitly excluded from V1** (§14). Private differs from Hidden: a Private community is **discoverable** (it appears in search/categories/browse with its name, icon, description, and member count) but its **feed and posting are gated** behind membership approval. This is a deliberate, narrow distinction — Private protects what is shared, not whether the community can be found at all. A community that cannot be found by anyone is a different product (an invite-only group chat) that this architecture does not build.

---

## Section 7 — COM-D6 — Joining

**Locked.** The join flow is identical in shape for Public and Private communities, differing only in the outcome:

```
Athlete opens Community Page → taps "Join"
        ↓
Community Rules are displayed (must be acknowledged before continuing)
        ↓
   Public community              Private community
        ↓                                ↓
Immediate membership          Join request created (PENDING)
        ↓                                ↓
Feed/posting access now       Owner/Admin/Moderator approves or
                               declines (Community-Roles-and-Moderation
                               §8) → membership granted, or request
                               removed (no "declined" record retained,
                               consistent with the product's no-shame
                               stance — Comparison-Philosophy-Amendment-001
                               CC-D3 precedent)
```

1. **Rules displayed before joining** — every community must have a Rules field (§15.4); the join flow displays it and requires acknowledgement before the join action (Public) or join request (Private) completes. This is a consent gate, not a content moderation tool — the platform does not validate rules content beyond requiring it to exist.
2. **Public = immediate membership.** No queue, no approval step.
3. **Private = approval workflow.** A pending request is visible to the requester (as "Requested") and to the community's Owner/Admin/Moderator roles (as a queue item). Declining is silent — same anti-shame precedent as Squad invitation decline.
4. **Leaving** is always immediate and self-service, for either visibility tier, and is always silent (no notification to the community, no "X left" post in the feed).

---

## Section 8 — COM-D7 — Community Page

**Locked.** Every community's page contains:

| Element | Notes |
|---|---|
| **Banner** | Required at creation (§15.4). |
| **Icon** | Required at creation. |
| **Name** | Unique after normalization (§15.1). |
| **Description** | Required. |
| **Category** | Exactly one, from the fixed list (§15.2; full taxonomy owned by `Community-Discovery-and-Search-v1.0` §3). |
| **Member count** | Live count; no engagement analytics beyond this (§15.6). |
| **Join button** | Or membership-state indicator (Member / Requested / Owner) if already joined or pending. |
| **Feed** | `Community-Feed-Specification-v1.0` owns the content model. |
| **About** | Description + Rules + Category + Official badge if applicable. |
| **Events** | §10. |
| **Competitions** | §11. |
| **Honors** | §12 — community-relevant Honors the *viewing athlete* has earned (account-based; never a community-scoped leaderboard of who has the most). |

**Public visitors** (non-members of a Public community) may browse the Community Page — including its feed — but cannot post, comment, or react (§9). A Private community's page is browsable by non-members down to About/Member-count/Join-request only; its feed and Events/Competitions detail are member-gated.

---

## Section 9 — COM-D8 — Posting

**Locked, binding.**

1. **Members only may post, comment, or react.** A non-member — including a public visitor browsing a Public community — has read access only (and only to Public communities, §6).
2. **Every post belongs to exactly one community.** There is no multi-community post.
3. **No cross-posting.** A post cannot be duplicated or forwarded into a second community. An athlete who wants to share the same content in two communities must author it twice, as two independent posts — this is a structural choice, not a missing feature, and it keeps each community's feed an honest record of *that* community's activity.
4. Full content-type, entity, and engagement rules are owned by `Community-Feed-Specification-v1.0`.

---

## Section 10 — COM-D9 — Workout Sharing (integration with WSR-001 / Social-System-Architecture)

**Locked.** A completed workout (or a qualifying milestone — honor earned, program graduated, etc.) may be shared to any of four visibility destinations:

| Destination | Mechanism | Owning architecture |
|---|---|---|
| **Legacy** | Automatic — every workout is part of the athlete's permanent Legacy record regardless of any sharing choice. Not a destination the athlete selects; named here only for completeness. | Legacy / L-series (unchanged) |
| **Friends** | Athlete selects `audience = FRIENDS` on a Post | `Social-System-Architecture-v1.0` SOC-D7/D8 (unchanged) |
| **Squad** | Athlete selects `audience = SQUAD` on a Post, **or** the lightweight WSR-001 squad check-in path | `Social-System-Architecture-v1.0` (Posts) / `WSR-001` (check-ins) — the two remain distinct, coexisting primitives exactly as SOC-D9 already establishes (unchanged) |
| **Community** | Athlete selects `audience = COMMUNITY` + exactly one `communityId` on a Post | **New** — `Social-System-Architecture-v1.0` extended (§16.1); the resulting post surfaces in `Community-Feed-Specification-v1.0`'s feed as a `WORKOUT_SHARE`-type `CommunityPost` |

**These are visibility destinations for a single workout record, not separate workout copies.** Sharing the same completed workout to Friends and to a Community (in two separate share actions) creates two independent Post records — exactly as sharing to Friends and Squad already does today (§9 of `Social-System-Architecture-v1.0`, "one upload → one post → multiple audiences if selected" — except Community is never combined with Friends/Squad in the *same* post, per §9 above: a Community post belongs to exactly one community and is never also a Friends/Squad post).

**Athlete must be a member to share to a community.** Sharing to a Community is a posting action and is therefore gated by §9 exactly like any other community post — a non-member cannot select a community as a share destination.

---

## Section 11 — COM-D10 — Competitions

**Locked.** Communities may create competitions using the **existing Challenge engine** (`Challenge-System-Architecture-v1.0.md`). **No separate competition architecture is built for Communities.**

This is implemented as a third roster context, `COMMUNITY`, alongside the existing `SQUAD` and `FRIENDS` contexts (full amendment in §16.2). At a glance:

| | SQUAD | FRIENDS | COMMUNITY (new) |
|---|---|---|---|
| Roster source | Squad members | Creator's accepted Friends, invited | Community members, opted in |
| Who may create | Any squad member | Any athlete with ≥1 accepted Friend | Community Owner/Admin/Moderator only (`Community-Roles-and-Moderation-v1.0` §5) |
| Squad-legacy surfaces (Hall of Champions etc.) | Yes | No (CA3-D8) | No — Communities get no parallel "Hall of Champions"; results are permanent and member-visible via the Community's own Competitions tab, not a new legacy surface |
| Honors | Account-cumulative, both contexts | Account-cumulative | Account-cumulative (same events, same evaluator, §12) |

The Performance Firewall, anti-shame guardrails, and roster-locking rules of the Challenge System apply identically to the `COMMUNITY` context — this document introduces no exception to CS-D1/D2/D3.

---

## Section 12 — COM-D11 — Honors

**Locked.** Community participation integrates with the **existing Honors system** — no new evaluation architecture, no new HonorInstance schema. Communities are a new **milestone source** for the Honor Evaluation Service, exactly as Challenges, WwF, and Social-System Honors-as-milestone-trigger already are.

Representative honors (full catalog amendment in §16.3): **First Community Joined, Community Builder, Helpful Contributor, Mentor, Event Organizer.** These are **account-based** — earned by the athlete, never by the community — and never surfaced as a community-scoped leaderboard ("most honors in this community"); that would be a comparison/ranking surface this architecture does not build (consistent with CC-D2 / the Performance Firewall principle generalized).

---

## Section 13 — COM-D12 — Notifications

**Locked.** Notify for: **replies, mentions, membership approval, pinned announcements, competition start, event reminders, moderator actions.** **Do not notify for every new post** — a Community can have far more posting volume than a Squad or a Friend's feed, and per-post notifications would be the exact "engagement loop" pattern the product avoids everywhere else (WSR-D1, SOC-D1).

Full toggle/grouping design is a `P-5-Notifications-Architecture` amendment (§16.4) — this document fixes the **inventory and the binding "no per-post push" rule**; P-5 owns the toggle shape.

---

## Section 14 — COM-D13 — Friends Feed Isolation

**Locked, binding.** **Community posts never appear in the Friends Feed.** The Friends Feed (`Social-System-Architecture-v1.0` SOC-D9) is an intentional-sharing surface scoped to Friends/Squad audiences; Community activity is structurally a different audience (`audience = COMMUNITY`) and is therefore never eligible for Friends Feed inclusion, by the same audience-scoping logic that already keeps Squad-only posts out of a Friends-only view.

**Future-proofing, not a current build:** only a **community-related accomplishment** (e.g., an Honor earned through Community participation — "Mentor," "Community Builder") may, like any other Honor, become a milestone-auto Post under the existing Automatically-Share-Milestones setting (`Social-System-Architecture-v1.0` SOC-D12) — and even then, that post is a Friends/Squad-audience Post about an Honor the athlete earned, not a republication of any Community post or activity. **No architecture is built here for this** — it is noted only because the existing Honor-to-milestone-post hook already covers it without any new design, exactly as it already covers every other Honor category. Standard community activity (posts, comments, reactions, membership) remains fully isolated within Communities.

---

## Section 15 — Supporting Decisions

### 15.1 COM-D14 — Branding (required fields)
**Locked.** Every community includes, at creation, all of: **Banner, Icon, Name, Description, Rules.** None are optional. This is a stricter requirement than Squads (which permit an optional icon/purpose, S-1 §4.3/§4.7) because a Community is public-facing and must present coherently to strangers browsing it — a Squad is only ever seen by people already inside it.

### 15.2 COM-D15 — Categories
**Locked.** Fixed taxonomy (full ownership and search behavior in `Community-Discovery-and-Search-v1.0` §3): **Strength, Hypertrophy, Cardio, Running, Combat Sports, Nutrition, Recovery, Mobility, Lifestyle, Outdoor, General.** Exactly one category per community. `General` exists as the deliberate catch-all so no community is ever forced into a poor-fit category — this avoids the "naming/positioning conflict" risk already flagged elsewhere in the project's cross-family catalog governance work.

### 15.3 COM-D16 — Statistics
**Locked.** Display: **Members, Posts, Events, Competitions.** **No engagement analytics in V1** — no average session time, no daily-active-member count, no per-member post-count leaderboard, no "most active" ranking. These four counters answer "is this community alive and what does it do," not "who is winning at participating."

### 15.4 COM-D17 — Naming
**Locked.** Community names must be **unique after normalization** (case-insensitive, whitespace-collapsed, and diacritic-folded comparison — the same normalization shape as `Identity-Amendment-001-Username.md` §1.2's username uniqueness check, reused here rather than re-derived) to prevent duplicate or near-duplicate communities that fragment a single interest into competing, confusing spaces. Normalization is checked at creation and at rename.

### 15.5 COM-D18 — Navigation
**Superseded 2026-07-07.** ~~Locked. Communities are not a 5th bottom-navigation tab...~~ That position held while Communities was expected to function as an occasional discovery/directory feature, following the precedent of `Calendar-System-Architecture-v1.0` CAL-D2 and `Social-System-Architecture-v1.0` SOC-D14. It no longer reflects governing product intent and is reversed below.

**Current (Locked, 2026-07-07): Communities is the 5th bottom-navigation tab.** Bottom navigation is: Home, Workouts, Legacy, Squads, **Communities** (in that order). Communities is designed as a high-frequency, checked-daily surface — a large-scale, interest-based feed with announcements and member posts (conceptually closer to a Facebook Group than a directory) — which meets the same "opened every session" bar that earned Home, Workouts, Legacy, and Squads their tabs. This is a materially different usage pattern than Calendar or the Friends relationship, neither of which is a comparably high-frequency destination on its own, so this document's promotion of Communities does not reopen CAL-D2 or SOC-D14. The Home "Explore Communities" module (Tier 6) and the Squads secondary "Explore Communities →" row — both introduced by `Community-Architecture-Amendment-001-Navigation-Entry-Points.md` — are retired as redundant now that Communities has its own tab. Full detail: `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`.

> **Amendment pointer (2026-07-02, superseded 2026-07-07) — `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md`.** That amendment supplied the concrete naming ("Explore Communities") for the Home and Squads entry points this section originally specified. Both entry points are retired by `Community-Architecture-Amendment-002-Fifth-Tab.md` (2026-07-07), which promotes Communities to a full bottom-navigation tab and reverses this section's original "not a 5th tab" position.

### 15.6 COM-D19 — Community Health (ownership succession)
**Locked.** An **inactive Owner** (no login for **90 consecutive days** — flagged, per the Monetization Amendment 001 precedent, as an **Initial MVP Assumption — Subject to Future Revision**; the *principle* is locked) makes their community eligible for ownership transfer:

```
Owner inactive ≥ 90 days
        ↓
Transfer offered to the longest-tenured Admin
        ↓ (none exists)
Transfer offered to the longest-tenured Moderator
        ↓ (none exists)
Community is ARCHIVED (read-only; feed/page remain visible; no new
posts, joins, events, or competitions; existing content is never deleted —
Never Charge For History applies to community content exactly as it
applies to every other historical record, Monetization §2)
```

This is a deliberate point of departure from Squads, which explicitly defer owner-inactivity handling in MVP (S-3 §5.7) — and that deferral is correct *for Squads*, because an abandoned 2–10 person squad with no owner-succession plan is a private, low-stakes inconvenience to its few members. A Community can carry hundreds or thousands of members and a public presence; an abandoned-but-populated Community left with no path forward is a materially different failure mode, and this document does not inherit the Squad deferral by default.

---

## Section 16 — Downstream Reconciliation (applied in this pass)

This section enumerates every downstream amendment performed alongside this document's lock, so the full blast radius of "Communities exist" is visible in one place.

| # | Document | Change | Detail |
|---|---|---|---|
| 16.1 | `Social-System-Architecture-v1.0.md` | Social Hierarchy (SOC-D1A) gains Communities as a peer relationship layer to Squads; `Post.audience` enum extended with `COMMUNITY`; Friends Feed isolation note (mirrors §14 above) | `Docs/Amendments/Social-Architecture-Amendment-001-Communities.md` |
| 16.2 | `Challenge-System-Architecture-v1.0.md` (was v1.3 at time of amendment; now v1.5) | New `COMMUNITY` roster context, alongside `SQUAD`/`FRIENDS` | `Docs/Amendments/Challenge-Architecture-Amendment-004-Community-Competitions.md` |
| 16.3 | `Honor-Catalog-v1.2.1` | Existing `COMMUNITY` category (WwF-partner honors) renamed `PARTNERSHIP` (label only, no `honorType`/threshold change) to free the name; new `COMMUNITIES` category added (5 types) | `Docs/Amendments/Honor-Catalog-Amendment-002-Community-Honors.md` |
| 16.4 | `P-5-Notifications-Architecture.md` | New grouped section — Communities | `Docs/Amendments/P-5-Amendment-002-Community-Notifications.md` |
| 16.5 | `Forge-Legacy-Master-PRD.md` §6 / §19 | New Home entry point; IA note | Inline edit, this pass |
| 16.6 | `Monetization-Architecture-Amendment-001.md` | New free-tier limit row (1 community membership) | `Docs/Amendments/Monetization-Architecture-Amendment-002-Communities.md` |
| 16.7 | `Forge-Legacy-Master-Status.md` | Freeze checklist row 20 (Communities); decision queue; recently completed | Inline edit, this pass |
| 16.8 | Navigation entry points named/finalized (Home "Explore Communities" Tier 6; Squads secondary "Explore Communities" Tier 3); tab-count drift corrected in `Home-Screen-Wireframe-Spec-H1.md` and `Global-Search-Architecture-v1.0.md` | Post-freeze amendment, 2026-07-02 | `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` |
| 16.9 | **COM-D18 reversed** — Communities promoted to a 5th bottom-navigation tab; Home Tier 6 and Squads Tier 3 "Explore Communities" entry points retired; TabBar component (CLA-C19), Master PRD §6/§19, Onboarding Non-Behaviors, Legacy L-1, Calendar CAL-D2 references, and Global Search §14 all updated to the 5-tab model | Post-freeze amendment, 2026-07-07 | `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` |

---

## Non-Behaviors

This list is the V1 exclusion set. Every item below is a deliberate scope boundary, not an oversight:

- **No Hidden communities** (§6) — discoverability of existence is always on; only feed/posting is gated.
- **No community chat rooms, voice channels, or livestreams** — Communities are a feed-and-events space, not a real-time communication platform.
- **No polls, file sharing, resource libraries, or wiki pages** — the feed content model (`Community-Feed-Specification-v1.0`) is fixed at the categories named in §9 of that document; these are not among them.
- **No paid communities, coaching marketplace, donations, or community stores** — Communities carry no commerce surface of any kind in V1.
- **No AI moderation** (`Community-Roles-and-Moderation-v1.0` §9) — moderation is human-role-based only.
- **No geographic communities** — Category is the only grouping axis; location is not a Community dimension in V1.
- **No custom themes** — branding is limited to §15.1's fixed fields; no per-community visual system.
- **No multiple feeds per community** — exactly one feed (§9 of `Community-Feed-Specification-v1.0`).
- **No cross-posting between communities** (§9).
- **No recommendation algorithms** — including in Discovery (`Community-Discovery-and-Search-v1.0` resolves the apparent Trending tension explicitly in its own §5).
- **No engagement analytics beyond the four counters in §15.3.**
- **No community-scoped leaderboards of any kind** (members, honors, posts) — the Performance Firewall principle generalizes here.
- **No multiple owned communities per athlete in V1** (§4) — explicitly deferred, not promised.

---

## Validation Checklist

- [ ] COM-D1 — four-pillar model (Legacy/Friends/Squads/Communities) stated; optimize-for / never-optimize-for lists present
- [ ] COM-D2 — Official vs User community types; Official badge; User-creation maturity gate (30-day account age + good standing, flagged provisional)
- [ ] COM-D3 — one owned community per athlete in V1; future multi-ownership explicitly deferred
- [ ] COM-D4 — Free = 1 joined community, Premium = unlimited; no per-community member cap; downgrade preserves existing memberships (Never Charge For History precedent)
- [ ] COM-D5 — Public/Private visibility; Hidden explicitly excluded; Private ≠ undiscoverable
- [ ] COM-D6 — join flow: rules-then-join; Public immediate, Private approval, decline silent
- [ ] COM-D7 — Community Page composition complete (Banner/Icon/Name/Description/Category/Member count/Join/Feed/About/Events/Competitions/Honors)
- [ ] COM-D8 — members-only posting; exactly one community per post; no cross-posting
- [ ] COM-D9 — workout-sharing integration: Legacy automatic, Friends/Squad via existing Social-System Post audience, Community via new `audience = COMMUNITY` + `communityId`; membership required to share to a community
- [ ] COM-D10 — Competitions reuse the existing Challenge engine via new `COMMUNITY` context; no parallel competition architecture; Firewall/anti-shame inherited unchanged
- [ ] COM-D11 — Honors integration via existing evaluation service; account-based; no community leaderboard
- [ ] COM-D12 — notification inventory fixed; binding "no per-post push" rule; toggle shape deferred to P-5
- [ ] COM-D13 — Friends Feed isolation binding; future Honor-as-milestone-post path acknowledged but not newly built
- [ ] §15.1–§15.6 — branding required fields; fixed category taxonomy; 4-counter statistics only; name uniqueness via normalization; **is** a 5th bottom-navigation tab (COM-D18 revised 2026-07-07 — see `Community-Architecture-Amendment-002-Fifth-Tab.md`); 90-day owner-inactivity succession chain (Admin → Moderator → Archive), explicitly departing from the Squad deferral
- [ ] §16 — all seven downstream reconciliation items identified with concrete target documents
- [ ] No contradiction with DNA, Social-System-Architecture, Squad architecture, Challenge-System v1.3, Honor Catalog, P-5, Monetization Amendment 001, Calendar-System-Architecture

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-07-07 | **COM-D18 (§15.5) reversed:** Communities is now the 5th bottom-navigation tab (Home, Workouts, Legacy, Squads, Communities), on the grounds that it is designed as a high-frequency, checked-daily feed (announcements + member posts, Facebook-Group-like) rather than an occasional directory. The Home Tier 6 "Explore Communities" module and the Squads Tier 3 secondary entry point are retired as redundant. No other decision in this document (COM-D1–D17, D19) is affected. Full detail: `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`. |
| 1.0 | June 2026 | Initial. Establishes the Community System as Forge Legacy's fourth relationship pillar (Legacy/Friends/Squads/Communities, COM-D1). Defines Official vs. User community types with a creation maturity gate (COM-D2); one-owned-community-per-athlete (COM-D3); Free=1/Premium=unlimited membership with no per-community cap (COM-D4); Public/Private visibility with Hidden excluded (COM-D5); the rules-then-join flow (COM-D6); the Community Page composition (COM-D7); members-only posting with no cross-posting (COM-D8); the four-destination workout-sharing model integrating with Social-System-Architecture's Post audience (COM-D9); Competitions via the existing Challenge engine through a new `COMMUNITY` context, no parallel architecture (COM-D10); Honors integration with no schema change (COM-D11); the notification inventory and binding no-per-post-push rule (COM-D12); the binding Friends Feed isolation rule (COM-D13); required branding fields, fixed category taxonomy, 4-counter statistics, normalized name uniqueness, the not-a-5th-tab navigation decision (superseded 2026-07-07, see v1.1), and the 90-day owner-inactivity succession chain that deliberately departs from the Squad MVP deferral (§15); and the full downstream reconciliation map across Social-System-Architecture, Challenge-System-Architecture, Honor Catalog, P-5, Master PRD, and Monetization Amendment 001 (§16). |

---

*Forge Legacy — Community System Architecture*
*v1.1 — June 2026 (COM-D18 revised 2026-07-07)*
*Authority: FORGE_LEGACY_PRODUCT_DNA.md; Social-System-Architecture-v1.0; Squad-Architecture (S-1/S-2/S-3); Challenge-System-Architecture-v1.0.md (v1.5); Honor-Catalog-v1.2.1 / Honor-Evaluation-Service-Architecture / HonorInstance-Architecture; P-5-Notifications-Architecture v1.2.1; Monetization-Architecture-Amendment-001; Calendar-System-Architecture-v1.0; Identity-Amendment-001-Username — all LOCKED; `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` (2026-07-07, navigation revision)*
*Status: LOCKED (June 2026) — PO-approved; ready for the Architecture Freeze. Navigation decision (COM-D18) amended 2026-07-07.*
