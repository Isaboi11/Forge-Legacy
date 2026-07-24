# Forge Legacy — Challenge Architecture Amendment 004
## Community Competitions (Third Roster Context)
### June 2026

**Status:** LOCKED

**Type:** Architecture Amendment (extends the Challenge System's existing participant-based model with a third roster context; introduces no new competition engine)

**Authority:** `Community-System-Architecture-v1.0.md` (LOCKED) COM-D10 — "Communities may create competitions using the existing Competition engine. No separate competition architecture." `Challenge-System-Architecture-v1.3.md` (LOCKED) — the document amended, specifically its v1.3 generalization from a single `squadId` to a `context` enum (CA3-D3), which this amendment extends a second time.

**Amends:** `Challenge-System-Architecture-v1.3.md` → `Challenge-System-Architecture-v1.4.md` — CS-D1, §3.1 (`Challenge` entity), CS-D6 (permissions), CS-D7 (enrollment eligibility), CS-D22 (Firewall scoping), CS-D23/CS-D24 (integration), §16 (downstream wireframes).

**Supersedes:** Nothing. `COMMUNITY` is additive to the existing `{ SQUAD, FRIENDS }` context enum; no `SQUAD` or `FRIENDS` behavior changes.

---

## Purpose

`Community-System-Architecture-v1.0` COM-D10 is explicit: Communities reuse the Challenge engine rather than getting a parallel competition architecture. The Challenge System already generalized once, from a single squad-bound model to a two-context (`SQUAD`/`FRIENDS`) participant-based model, via Challenge-Architecture-Amendment-003. This amendment performs the **same generalization a second time**, adding `COMMUNITY` as a third context, following the identical shape CA3 already established.

---

## CC4-D1 — `Challenge.context` gains a third value

**Before (v1.3):** `context` enum **{ `SQUAD`, `FRIENDS` }**, with `squadId` required iff `SQUAD`.

**After (locked):** `context` enum **{ `SQUAD`, `FRIENDS`, `COMMUNITY` }**, with:

| Field | Required when |
|---|---|
| `squadId` | `context = SQUAD` (unchanged) |
| `communityId` (new) | `context = COMMUNITY` — required, immutable, FK → Community |

`squadId` and `communityId` are mutually exclusive with each other and with a `FRIENDS` context having neither — exactly the existing `squadId`-nullability pattern CA3-D3 established, extended by one value.

---

## CC4-D2 — Roster source & eligibility (mirrors CS-D7/CA3-D4)

**Locked.** For `context = COMMUNITY`: the roster is drawn from the **community's membership** at enrollment time — any current member of `Challenge.communityId` may opt in. Unlike `FRIENDS` (which requires an *invitation* from the creator before a Friend can opt in), `COMMUNITY` behaves like `SQUAD`: **any member may see the open enrollment and opt in directly**, no individual invitation step, because community membership (like squad membership) is itself the qualifying relationship.

**Eligibility is checked at enrollment time only**; a member who leaves the community after `startAt` does not alter the already-locked roster (mirrors the existing FR-D6/CA3-D4 unfriend-after-start precedent).

---

## CC4-D3 — Who may create a Community challenge (departs from SQUAD's "any member" rule)

**Locked, binding departure.** Per `Community-Roles-and-Moderation-v1.0` §3 (CRM-D2), creating a competition within a community is gated to **Owner / Admin / Moderator** — **not** "any member," unlike `SQUAD` context (CS-D6, "any member may create"). This is a deliberate, justified divergence: a Squad is small and trusted enough that any member creating a challenge is low-risk; a Community can be large and partly public, where unrestricted challenge creation by any member would be the same scale-mismatch problem `Community-Roles-and-Moderation-v1.0` §4.2 already identifies for posting moderation. Challenge creation in a community is therefore a **role-gated** action, consistent with that document's existing permission matrix, not a new philosophy invented here.

---

## CC4-D4 — Squad-legacy surfaces remain SQUAD-only; no Community-legacy parallel

**Locked.** Per CA3-D8 (carried forward unchanged): Hall of Champions, Squad Records, Current Champions, and the participation-streak honor input remain **SQUAD-context only**. `COMMUNITY`-context results are **permanent and member-visible** via the Community's own Competitions tab (`Community-System-Architecture-v1.0` COM-D7) — exactly as `FRIENDS`-context results are participant-visible via the participant-scoped Challenge Hub (CA3-D10) — but **no parallel "Hall of Champions" or "Community Records" surface is built.** This keeps Communities aligned with `Community-System-Architecture-v1.0` §15.3's binding "no engagement analytics, no leaderboard beyond the four counters" rule, which a Community-scoped Hall of Champions would violate.

---

## CC4-D5 — Firewall scoping (generalizes CS-D22/CA3-D6 a second time)

**Locked.** The Firewall's roster-scoping principle (CS-D22, already generalized from "squad" to "roster set" by CA3-D6) generalizes once more without weakening: for `COMMUNITY` context, the viewer scope is the community's membership (mirroring `SQUAD`'s squad-membership scope). No always-on Community surface (the feed, the Community Page header stats) may read or render challenge performance data — the same correctness test CS-D22 already states applies identically here: it must be impossible for the Community feed or page to render a challenge score, standing, rank, or badge outside the C-series Challenge surface.

---

## CC4-D6 — Honors (mirrors CA3-D9 exactly)

**Locked.** `COMMUNITY`-context challenges emit the **same** events as `SQUAD`/`FRIENDS` to the Honor Evaluation Service (Challenge Completion, Challenge Enrollment Finalized) and count identically toward account-cumulative `challenges_won_count` / `challenges_entered_count`. The **participation-streak** honor input remains the lone carve-out and stays **SQUAD-context only** (CS-D27/CA3-D9, unchanged) — `COMMUNITY` challenges do not contribute to it, the same exclusion `FRIENDS` challenges already have.

---

## CC4-D7 — Notifications

**Locked.** Routes through the existing P-5 Challenges category (CS-D21/P-5-Amendment-001) unchanged — context-agnostic, default OFF, neutral/positive copy only, fires only to opted-in participants. No new toggle; `COMMUNITY` joins `SQUAD`/`FRIENDS` under the existing single "Challenge Updates" row, the same way `FRIENDS` joined without inventing a second toggle (P-5 §3.2a).

---

## Downstream Wireframe Note (§16 of Challenge-System-Architecture)

C-1 (Challenge Hub) and C-2 (Create Challenge) gain a third Context option ("Community") alongside Squad/Friends; for Community, C-2's roster step is **a community picker scoped to communities the athlete is a member of and holds Owner/Admin/Moderator in** (CC4-D3), rather than a roster picker. No other C-series screen changes.

---

## Non-Behaviors

- No new competition engine, scoring model, or leaderboard mechanic — every CS-D8–D20 rule (types, scoring, tie-breaks, badges) applies identically across all three contexts.
- No Community-scoped Hall of Champions / Squad Records / Current Champions parallel (CC4-D4).
- No unrestricted ("any member") challenge creation in Community context — role-gated (CC4-D3).
- No participation-streak contribution from Community challenges (CC4-D6).
- No new notification toggle (CC4-D7).

---

## Validation Checklist

- [ ] CC4-D1 — `context` enum gains `COMMUNITY`; `communityId` required+immutable when set; mutually exclusive with `squadId`
- [ ] CC4-D2 — roster = community membership at enrollment; open opt-in (no invitation step, unlike FRIENDS); eligibility checked at enrollment only
- [ ] CC4-D3 — creation gated to Owner/Admin/Moderator (CRM-D2), not "any member"; rationale tied to Community-Roles-and-Moderation-v1.0 §4.2 scale argument
- [ ] CC4-D4 — Hall of Champions/Squad Records/Current Champions remain SQUAD-only; no Community-legacy parallel; Community results permanent + member-visible via Competitions tab only
- [ ] CC4-D5 — Firewall roster-scope generalized to community membership; correctness test holds for the Community feed/page
- [ ] CC4-D6 — Honors: Wins/Participation account-cumulative across all three contexts; participation-streak stays SQUAD-only
- [ ] CC4-D7 — no new notification toggle; existing Challenge Updates row covers all three contexts
- [ ] No SQUAD or FRIENDS behavior altered

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Adds `COMMUNITY` as a third `Challenge.context` value (CC4-D1); defines open community-membership-based enrollment (CC4-D2); gates Community challenge creation to Owner/Admin/Moderator, departing from SQUAD's any-member rule (CC4-D3); confirms no Community-legacy-surface parallel to Hall of Champions/Squad Records/Current Champions (CC4-D4); generalizes the Firewall roster-scope a second time (CC4-D5); extends Honors Wins/Participation crediting while excluding participation-streak (CC4-D6); confirms no new notification toggle (CC4-D7). |

---

*Forge Legacy — Challenge Architecture Amendment 004 (Community Competitions)*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); Challenge-System-Architecture-v1.3 (LOCKED, the document amended to v1.4); Community-Roles-and-Moderation-v1.0 (LOCKED)*
*Status: LOCKED*
