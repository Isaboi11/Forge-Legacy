# Forge Legacy — Friend Relationship Architecture Amendment 001
## Persistent Mutual Friend Relationship
### June 2026

**Status:** LOCKED

**Type:** Architecture Amendment (introduces one new core relationship primitive at minimum-viable level. Powers Friends Feed, Workout With Friend outside Squads, and Friend Challenges. Privacy-first; not a social network.)

**Authority:** Product-owner correction (June 2026) — a persistent Friend relationship is required and is not optional. `FORGE_LEGACY_PRODUCT_DNA.md` §2 (High-Trust Relationships — "not followers"), §10 (no follower systems / social graphs); `Workout-With-Friend-Spec-WwF.md` §15 (the standing-relationship gap — squad was previously the *only* standing relationship); `Identity-Amendment-001` (athlete search / discoverability toggle); `WSR-001` (presence-not-performance, opt-in, bounded sharing — the model the Friends Feed must follow); `Comparison-Philosophy-Amendment-001` (CC-D2 Firewall).

**Supersedes:** `Challenge-Architecture-Amendment-003` **CA3-D1** (which determined no persistent Friend entity was needed). CA3 is corrected by this amendment (§10).

**Amendment Log:** v1.0 LOCKED (initial). **v1.1 (June 2026): FR-D4 (Friends Feed clause) marked SUPERSEDED by `Social-System-Architecture-v1.0` SOC-D9** — reconciliation note only; no other decision changed.

---

## Purpose

CA3-D1 determined a persistent Friend entity was unnecessary and built friend-challenge rosters from per-challenge invite acceptance. The product owner has corrected this: **Forge Legacy requires a standing Friend relationship** so athletes can connect outside Squads — Friends Feed, Workout With Friend, and Friend Challenges all depend on it. This amendment defines that relationship at the minimum-viable level and the privacy guardrails that keep it utility-based, not a social network. It does **not** redesign any feature; it adds the primitive and corrects CA3-D1.

---

## Decision FR-D1 — The Friend relationship (minimum-viable entity)

### Statement
**Locked:** A **Friend** is a **mutual, accepted, private relationship between exactly two athletes.** It is symmetric (no direction once accepted), consented by both parties, and visible only to the two athletes in it.

### Entity
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `athleteAId` / `athleteBId` | uuid (FK → Athlete) | The unordered pair. Unique per pair (one relationship per two athletes). |
| `requestedByAthleteId` | uuid | Who initiated the request. |
| `status` | enum **{ `PENDING`, `ACCEPTED` }** | `PENDING` = request sent, awaiting the other athlete; `ACCEPTED` = mutual. |
| `requestedAt` / `acceptedAt` | timestamp | |

### Lifecycle
```
(search → request)  PENDING ──accept──▶ ACCEPTED ──unfriend (either party)──▶ removed
                       └──decline / cancel──▶ removed
```
1. **Request:** athlete A finds athlete B via existing search (Identity-Amendment-001) and sends a friend request → `PENDING`.
2. **Accept:** B accepts → `ACCEPTED` (mutual). B declines, or A cancels → relationship removed (no record retained, no "declined" marker — consistent with the product's no-shame stance).
3. **Unfriend:** either party may remove the relationship at any time → removed. Silent; no notification of a sad event beyond what is necessary. Removal is symmetric.
4. **One relationship per pair.** No duplicates, no asymmetric states.

There is **no other state, role, tier, or metadata.** This is the whole primitive.

---

## Decision FR-D2 — Why this is NOT a follower system or social graph (DNA §10 compliance)

| Banned pattern | Why the Friend relationship is categorically different |
|---|---|
| **Followers** | Followers are **asymmetric and unconsented** (you can be followed without agreeing). A Friend is **mutual and doubly-consented** — both athletes accept. This is the *same category as squad membership*, which the DNA already endorses under "High-Trust Relationships." |
| **Follower counts / popularity metrics** | **None exist.** No count is computed, stored for display, or shown. There is no number attached to an athlete. |
| **Public social graph** | The relationship is **private to its two members.** No third party can read it. There is no public or squad-visible friend list. |
| **Rankings / comparison** | The relationship carries **no score, rank, standing, or comparison** of any kind. It is a boolean connection. |
| **Friend suggestions / PYMK** | **Not introduced.** Discovery is only the existing intentional search (Identity-Amendment-001), gated by the existing discoverability toggle. No algorithmic suggestion surface. |

**Governing principle:** a Friend is a mutual private accountability connection — *a squad of two without the squad container* — not an audience relationship. It adds utility (Feed presence, WwF, Challenges) without adding any of the banned social-network surfaces.

---

## Decision FR-D3 — Privacy guardrails (the binding never-list)

**Locked, binding.** The Friend system must never introduce:
- Followers or any asymmetric relationship.
- Follower counts, friend counts shown as a metric, or popularity scores.
- A public or squad-visible friend list.
- Rankings, standings, or comparison between friends.
- A comparison feed or any performance leaderboard among friends.
- Always-on performance exposure of any kind.
- Friend-suggestion / people-you-may-know surfaces.

**Friendship alone never exposes performance.** Being someone's Friend grants no view of their workout content, scores, challenge standings, goals, or metrics. Performance remains behind the Performance Firewall (CC-D2) and is exposed only inside an opted-in challenge context, exactly as for squads.

---

## Decision FR-D4 — Friends Feed support (architecture level)

> **⚠ SUPERSEDED (June 2026) by `Social-System-Architecture-v1.0` §10 (SOC-D9).** FR-D4's **presence-only** Friends-Feed framing (clause 1 below) is **replaced**: the Friends Feed is now an **intentional-sharing feed** of manual Posts (photos/videos/PR media/progress photos/captions) plus **milestone-only automatic posts** (Honor earned / Program completed / Chapter completed / major milestones) — not a presence/check-in surface. FR-D4's *other* intent (opt-in, private, bounded, mutual, non-comparison, not the DNA-banned "workout feed") is **preserved and generalized** by SOC-D9. Lightweight presence/check-ins remain a **distinct, coexisting** primitive owned by WSR-001 (SOC-D9 coexistence note). **The Friend entity (FR-D1) and all other FR decisions (FR-D2/D3/D5/D6/D7) are unchanged.** The original text is retained below for history.

**Locked:** The Friend relationship is the substrate for a **Friends Feed**, confirmed supported at the architecture level. The Feed's own wireframe/spec is a separate future workstream; this amendment fixes the privacy contract it must obey:

1. **Presence, not performance.** The Feed surfaces only **opt-in, presence-level** signals — the friend-scoped analogue of WSR-001 squad check-ins (athlete *chose* to share a check-in; "trained today" style presence). It never shows sets/reps/weights/volume/scores/rankings.
2. **Opt-in and bounded.** Same WSR-D16 discipline as squad check-ins — opt-in shares, bounded/ephemeral, no infinite algorithmic feed, no comparison.
3. **Private and mutual.** Visible only between accepted Friends.
4. This keeps the Friends Feed within the product's sanctioned "bounded presence surface" exception — it is **not** the banned "workout feed / public workout statistics" (DNA §10), because it is presence-only, opt-in, private, and non-algorithmic.

---

## Decision FR-D5 — Workout With Friend support (architecture level)

**Locked:** An accepted Friend relationship provides the **standing consent** that WwF previously derived only from squad membership (WwF §15: squad was the only standing relationship). Confirmed supported:
1. WwF tags between accepted Friends may follow the **squad-equivalent auto-accept path** (M-8-style) rather than the non-squad approval path (M-9), because a mutual Friend has already consented to a standing relationship.
2. This enables "Workout With Friend outside of Squad membership."
3. **The exact WwF routing change (M-8 vs M-9 for Friends) is a downstream WwF amendment** — this amendment confirms the relationship makes it coherent and identifies the dependency; it does not rewrite the WwF spec.
4. WwF's non-performance rule is unchanged: a WwF reference entry remains presence-only.

---

## Decision FR-D6 — Friend Challenge support & eligibility (corrects CA3-D1)

**Locked:** Friend Challenges (Challenge-Architecture-Amendment-003, `context = FRIENDS`) use the Friend relationship as their eligibility source:
1. **Eligibility = an existing `ACCEPTED` Friend relationship** with the creator. "Accepted Friend" means a standing mutual Friend — **not** merely someone who accepted a challenge invite.
2. **Explicit challenge opt-in still required.** Friendship alone never enrolls anyone — an invited Friend must explicitly opt into the challenge (preserves CC-D1 gate 2). Two gates: *be a Friend* **and** *opt in*.
3. **`ChallengeParticipant` remains the roster of record once the challenge begins** (roster locks at `startAt`, CS-D5). Unfriending **after** the challenge starts does **not** alter the locked roster; eligibility is checked at invitation/enrollment time only.
4. **Friendship alone never exposes challenge performance** — standings are visible only inside the opted-in challenge context (Firewall intact).

---

## Decision FR-D7 — Notifications & discovery (minimal, downstream)

**Locked:** Friend request / friend accepted are **Requests-class** notifications (the same category as squad invitations — a direct request awaiting response, default ON). This is a **downstream P-5 addition** (a "Friend Requests" row under the existing Requests group); identified here, authored when P-5 is next revised. Discovery uses the **existing** athlete search and the existing "Let non-squad athletes find me in search" toggle (Identity-Amendment-001) — no new discovery surface.

---

## Confirmations (required outputs 5–8)

- **Friends Feed:** supported (FR-D4) — presence-only, opt-in, bounded, private; never performance/comparison.
- **Workout With Friend outside Squads:** supported (FR-D5) — Friend = standing consent; routing change is downstream WwF.
- **Friend Challenges:** supported (FR-D6) — eligibility = existing mutual Friend + explicit challenge opt-in; `ChallengeParticipant` is roster of record.
- **No rankings / standings / follower counts / popularity metrics / public friend lists:** guaranteed (FR-D2, FR-D3) — none are introduced; all are explicitly barred.

---

## Section 10 — Corrections to Challenge-Architecture-Amendment-003

CA3 is updated (it is part of this workstream and the product owner directed the correction). Exact section changes:

| CA3 location | Before (incorrect) | After (corrected) |
|---|---|---|
| **CA3-D1 (Determination)** | "A persistent Friends list / friend-graph entity is **not required**… roster built per-challenge via search+invite+accept." | "A persistent **mutual Friend relationship is required** (Friend-Relationship-Architecture-Amendment-001). **'Accepted Friend' = an existing `ACCEPTED` Friend relationship**, not a per-challenge invite acceptance. Friend Challenge rosters are drawn from the creator's accepted Friends; each still explicitly opts into the challenge." |
| **CA3-D1 (rationale)** | Argued *against* a persistent entity (reuse-nothing, avoid social graph). | Replaced: the persistent Friend relationship is mutual/private/utility-based and does not create a follower system or social graph (FR-D2); it is the required substrate for Feed/WwF/Challenges. |
| **CA3-D4 (FRIENDS enrollment)** | "the creator invites athletes **via search**; each invitee accepts." | "the creator invites from their **existing accepted Friends**; each invited Friend **explicitly opts into the challenge** (friendship alone never enrolls). Roster locks at `startAt`." |
| **CA3 Non-Behaviors** | "**No persistent Friend entity** / friends list / social graph (CA3-D1)." | "A persistent **mutual, private Friend relationship exists** (FR-001). No social graph, no followers, no counts, no public friend lists, no rankings." |
| **CA3-D1 validation item** | "friend roster built per-challenge via search+invite+accept; no persistent friend entity" | "friend roster drawn from existing accepted Friends (FR-001) + explicit challenge opt-in" |

These corrections are applied to CA3 v1.1 (this session). All other CA3 decisions (CA3-D2…D11) are unchanged and remain valid — they were never dependent on the *absence* of a Friend entity, only on the participant-based model, which this strengthens.

---

## Non-Behaviors

- No followers, follower counts, popularity metrics, public/squad-visible friend lists, rankings, comparison feed, friend suggestions, or always-on performance exposure (FR-D2/D3).
- No friend-graph beyond the private mutual pair relationship.
- No performance exposure from friendship alone (FR-D3/D6).
- No Friends Feed UI designed here (substrate + privacy contract only, FR-D4).
- No WwF routing rewrite here (dependency identified, FR-D5).
- No locked-spec rewrite — amendment format only.

---

## Validation Checklist

- [ ] FR-D1 — Friend = mutual, accepted, private, two-athlete relationship; states PENDING/ACCEPTED only; one per pair; unfriend symmetric
- [ ] FR-D2 — mutual+consented (not follower); same category as squad membership; no DNA §10 violation
- [ ] FR-D3 — never-list enforced: no counts/popularity/public list/rankings/comparison/always-on exposure
- [ ] FR-D4 — Friends Feed supported as presence-only, opt-in, bounded, private (WSR-001 model); not a workout feed
- [ ] FR-D5 — WwF outside squads supported; Friend = standing consent; routing change downstream
- [ ] FR-D6 — Friend Challenge eligibility = existing ACCEPTED Friend + explicit opt-in; ChallengeParticipant = roster of record; unfriend post-start doesn't alter roster
- [ ] FR-D7 — friend request/accept = Requests-class (downstream P-5); discovery = existing search only
- [ ] §10 — CA3-D1/D4/Non-Behaviors/validation corrected
- [ ] Firewall intact; friendship never exposes performance

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Defines the persistent mutual Friend relationship primitive (FR-D1) per product-owner correction; establishes why it is not a follower system / social graph (FR-D2) and the binding privacy never-list (FR-D3); confirms architecture-level support for Friends Feed (FR-D4, presence-only/opt-in/bounded), Workout With Friend outside Squads (FR-D5), and Friend Challenges (FR-D6, eligibility = existing mutual Friend + explicit opt-in); Requests-class notifications + existing-search discovery (FR-D7). Supersedes and corrects CA3-D1/D4 (§10). Amendment format only; no locked-spec rewrite. |
| 1.1 | June 2026 | Reconciliation pass for `Social-System-Architecture-v1.0`. **FR-D4 (Friends Feed clause) marked SUPERSEDED by SOC-D9** — the Friends Feed is now an intentional-sharing feed (manual Posts + milestone-only automatic posts), not presence-only; lightweight presence/check-ins remain a distinct coexisting WSR-001 primitive. Original FR-D4 text retained for history. **No other decision changed; FR-D1/D2/D3/D5/D6/D7 remain intact and are cited by Social-System-Architecture-v1.0.** |

---

*Forge Legacy — Friend Relationship Architecture Amendment 001 (Persistent Mutual Friend Relationship)*
*v1.0 — June 2026*
*Authority: Product-owner correction (June 2026); DNA §2/§10; WwF §15; Identity-Amendment-001; WSR-001; CC-D2*
*Status: LOCKED*
