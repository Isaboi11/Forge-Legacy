# Forge Legacy — Social System Architecture Amendment 001
## Communities Integration
### June 2026

**Status:** LOCKED

**Type:** Architecture Amendment (integrates the new Communities subsystem into the governing Social System Architecture; extends one entity field; adds no new behavior to Friends, Squads, Challenges, or Posts beyond the audience extension below)

**Authority:** `Community-System-Architecture-v1.0.md` (LOCKED) §16.1 — this amendment is the concrete edit that section identifies as required. `Social-System-Architecture-v1.0.md` (LOCKED) — the document amended.

**Amends:** `Social-System-Architecture-v1.0.md` — SOC-D1A (Social Hierarchy), SOC-D7/SOC-D8 (Post entity / audience selection), SOC-D9 (Friends Feed).

**Supersedes:** Nothing. No existing SOC decision is reversed; this amendment adds one new relationship layer and one new enum value.

---

## Purpose

`Community-System-Architecture-v1.0` establishes Communities as Forge Legacy's fourth relationship pillar (Legacy / Friends / Squads / Communities). The governing Social System Architecture was authored before Communities existed and its Social Hierarchy (SOC-D1A) and Post audience model (SOC-D8) need exactly two edits to account for it. This amendment makes those edits without reopening or rewriting any other SOC decision.

---

## Edit 1 — SOC-D1A — Social Hierarchy gains a peer layer

**Before:**
> 1. Identity → 2. Friends → 3. Squads → 4. Challenges → 5. Posts

**After (locked):**
> 1. **Identity** → every athlete (the base layer; who the athlete is).
> 2. **Friends** → persistent, mutual relationships between two athletes.
> 3. **Squads** → long-term training groups.
> 3a. **Communities** *(new, peer to Squads)* → interest-based, often-public groups, distinct from Squads in that membership is organized around shared topic rather than a direct training relationship. A Community membership grants posting/commenting interaction *within that community* (the same SOC-D2 shape as Friend/Squad interaction grants), never visibility into the member's other relationships or data.
> 4. **Challenges** → temporary, opt-in competitive contexts (now drawable from a Squad, a Friend set, **or a Community** — `Challenge-Architecture-Amendment-004-Community-Competitions.md`).
> 5. **Posts** → intentional sharing across approved audiences (now including **Community** as a fourth audience — Edit 2 below).

**Why peer to Squads, not nested under it:** Communities and Squads answer different questions (topic vs. training relationship, `Community-System-Architecture-v1.0` §1) and neither depends on the other — an athlete may belong to either, both, or neither, the same independence SOC-D1A already states for Friends/Squads. Communities slot into the hierarchy at the same standing-relationship level as Squads for exactly that reason.

**No change** to the binding rule SOC-D1A states ("each layer builds upon the previous one without replacing it... a higher layer never supersedes or absorbs a lower one") — Communities obey it identically to every existing layer.

---

## Edit 2 — SOC-D7/SOC-D8 — Post entity audience extension

**Before (`Post.audience`):** enum **{ `FRIENDS`, `SQUAD`, `BOTH` }**.

**After (locked):** enum **{ `FRIENDS`, `SQUAD`, `BOTH`, `COMMUNITY` }**, with one new conditional field:

| Field | Type | Notes |
|---|---|---|
| `communityId` | uuid (FK → Community) | **Required and immutable** when `audience = COMMUNITY`; null for every other audience value. |

**Binding constraint (new):** `COMMUNITY` is never combined with `FRIENDS`/`SQUAD`/`BOTH` on the same post — a Community post belongs to **exactly one community** and is never simultaneously a Friends/Squad post (`Community-System-Architecture-v1.0` COM-D8 — "no cross-posting"; `Community-Feed-Specification-v1.0` CF-D1). This is the one place the Community audience behaves differently from `BOTH`: `BOTH` fans the *same* post across two existing audiences the author already owns (their own Friends and their own Squad); `COMMUNITY` scopes the post into a third-party shared space the author does not own, governed by that community's own posting/moderation rules (`Community-Roles-and-Moderation-v1.0`) — fanning a post into a space with independent governance is a structurally different act and is therefore never combined with the self-owned audiences.

**Why extend `Post` rather than build a new entity:** `Community-Feed-Specification-v1.0` CF-D1 makes and justifies this choice in full; this amendment performs the corresponding edit at the Social-System-Architecture level (the entity's owning document) so the two documents stay consistent rather than one silently diverging from the other.

**No change** to Post lifecycle (permanent/archivable/deletable, no Stories, SOC-D7), to `BOTH`'s existing fan-out behavior, or to any FRIENDS/SQUAD posting rule.

---

## Edit 3 — SOC-D9 — Friends Feed isolation (clarifying note, no behavior change)

**Locked, binding, restated from `Community-System-Architecture-v1.0` COM-D13 for completeness in the Social-System-Architecture's own authority chain:** Community-audience posts are never eligible for Friends Feed inclusion — the Friends Feed is scoped to `FRIENDS`/`SQUAD`/`BOTH` audiences by the same audience-scoping logic SOC-D9 already uses to keep Squad-only posts out of a Friends-only view. This is not a new restriction; it is the same mechanism applied to a new audience value, stated explicitly so a future reader of SOC-D9 does not need to infer it.

---

## Non-Behaviors

- No change to Friend relationship governance (FR-D1 through FR-D7) — Communities do not touch Friends.
- No change to `BOTH`'s fan-out behavior or to any existing Post lifecycle rule.
- No new engagement mechanic introduced into the Friends/Squad context — `Community-Feed-Specification-v1.0`'s comment-like-count exception (CF-D5) is scoped to `audience = COMMUNITY` only and does not alter SOC-D11's stricter no-aggregate-count rule for Friends/Squad reactions and comments.
- No change to the Privacy Firewall (CC-D2) or to SOC-D2's relationships-grant-interaction-not-visibility rule — Community membership is governed by the identical principle.

---

## Validation Checklist

- [ ] SOC-D1A — Communities added as a peer layer to Squads (3a); hierarchy ordering rule unchanged; independence from Squads stated
- [ ] SOC-D7/D8 — `Post.audience` extended with `COMMUNITY`; `communityId` required+immutable when set; `COMMUNITY` never combined with `FRIENDS`/`SQUAD`/`BOTH` on the same post; rationale for extending vs. new entity cross-referenced to CF-D1
- [ ] SOC-D9 — Friends Feed isolation restated as a clarifying note, not a new restriction
- [ ] No other SOC decision (D1–D6, D10–D16) altered
- [ ] Consistent with Community-System-Architecture-v1.0 COM-D8/D9/D13 and Community-Feed-Specification-v1.0 CF-D1/D5

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Adds Communities as a peer layer to Squads in the Social Hierarchy (SOC-D1A); extends `Post.audience` with `COMMUNITY` + required/immutable `communityId`, with the binding never-combined-with-other-audiences constraint (SOC-D7/D8); restates Friends Feed audience-scoping as it applies to the new value (SOC-D9). No other Social-System-Architecture decision altered. |

---

*Forge Legacy — Social System Architecture Amendment 001 (Communities Integration)*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); Social-System-Architecture-v1.0 (LOCKED, the document amended)*
*Status: LOCKED*
