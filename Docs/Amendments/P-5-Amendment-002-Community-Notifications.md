# Forge Legacy — P-5 Amendment 002
## Community Notifications
### June 2026

**Status:** LOCKED

**Type:** Architecture Amendment (adds one new grouped notification section; no existing toggle changed)

**Authority:** `Community-System-Architecture-v1.0.md` (LOCKED) COM-D12 — "Notify for: replies, mentions, membership approval, pinned announcements, competition start, event reminders, moderator actions. Do not notify for every new post." `P-5-Notifications-Architecture.md` v1.2.1 (LOCKED) — the document amended.

**Amends:** `P-5-Notifications-Architecture.md` v1.2.1 → v1.3 — Section 2 (Notification Inventory), Section 3 (new Section E), Section 4 (State Matrix).

**Supersedes:** Nothing. Adds a fifth grouped section (E) alongside the existing A–D; no existing row changes.

---

## Purpose

`Community-System-Architecture-v1.0` COM-D12 fixes the Community notification inventory and the binding "no per-post push" rule, and explicitly defers the toggle shape to a P-5 amendment. This document is that amendment, following the exact grouping methodology P-5 already established (Section A — broadcast/ambient, default OFF; Section B/D — direct requests, default ON; Section C — ambient competition, default OFF).

---

## P5C-D1 — Notification Inventory Additions

| # | Notification | Trigger | Recipient | Default | Authority |
|---|---|---|---|---|---|
| 11 | Comment reply | A member replies to the athlete's comment | The replied-to comment's author | OFF | `Community-Feed-Specification-v1.0` CF-D3 |
| 12 | Mention | A member @-mentions the athlete in a post or comment | The mentioned athlete | OFF | `Community-Feed-Specification-v1.0` |
| 13 | Membership approval | A Private community's Owner/Admin/Moderator approves or declines the athlete's join request | The requester (approval only — decline is silent, `Community-System-Architecture-v1.0` §7) | **ON (locked)** | `Community-System-Architecture-v1.0` COM-D6 |
| 14 | Pinned announcement | A community Owner/Admin pins an `OFFICIAL_ANNOUNCEMENT` post | All members of that community | OFF | `Community-Feed-Specification-v1.0` CF-D2/CF-D4 |
| 15 | Competition start | A `COMMUNITY`-context challenge the athlete joined transitions to ACTIVE | Participant | OFF — routes through the **existing** Challenges category (item 8), not a new toggle | `Challenge-Architecture-Amendment-004-Community-Competitions.md` |
| 16 | Event reminder | A Community Event the athlete is attending is approaching | Attendee | OFF | `Community-System-Architecture-v1.0` §10 |
| 17 | Moderator action | The athlete is muted, kicked, or banned, or their post/comment is removed | The acted-upon member | **ON (locked)** — a direct, consequential action the athlete must be told about, same rationale as Requests-class items | `Community-Roles-and-Moderation-v1.0` CRM-D4 |

**Item 15 deliberately does not create a new toggle** — `COMMUNITY`-context challenges already route through the existing, context-agnostic Challenges category (Section 3.2a / item 8), exactly as `FRIENDS`-context challenges did when added (no new toggle was created for them either, per P-5 §3.2a's existing "context-agnostic" framing).

---

## P5C-D2 — New Section E — Communities

**Locked.** A fifth grouped section, following the same default-by-nature-of-notification logic as Sections A–D:

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Replies & Mentions | Toggle | OFF | Items 11–12, merged into one row — both are "someone addressed you directly in a community," the same merge logic already used for Workout Tags (§3.2) and Friend Requests (§3.2b) |
| Pinned Announcements | Toggle | OFF | Item 14 |
| Event Reminders | Toggle | OFF | Item 16 |

**Non-toggleable, always ON (consistent with the existing Squad Updates note, §3.3):**
- **Membership Approval** (item 13) and **Moderator Actions** (item 17) are **not** user-mutable — both are direct, consequential outcomes of an action the athlete took (requesting to join) or that was taken against them (a moderation action). This mirrors Section B/D's Requests-class rationale exactly: missing one defeats the purpose of knowing your status changed.

**Why Replies/Mentions/Pinned/Event default OFF, not ON:** these are **ambient community activity**, the same risk profile as Section A's Squad Activity and Section C's Challenge Updates — a member of an active community could otherwise receive frequent pushes, the exact noise problem COM-D12's "do not notify for every new post" rule already exists to prevent. Replies and mentions are *more* directed than a generic post, but still default OFF here because Community volume can be high (`Community-System-Architecture-v1.0` §4 — communities are explicitly unbounded in membership, unlike a Squad) — an athlete in a large, active community could otherwise be paged constantly. This is a deliberate, narrower default than Friend Requests/Workout Tags/Squad Invitations (all default ON) because those are 1:1 or small-group direct requests; community replies/mentions are correspondence inside a potentially large space.

**Binding "no per-post push" rule (COM-D12, restated):** there is no toggle, anywhere in Section E, that fires for a generic new post by another member. This is the one inventory category P-5 deliberately does **not** create, consistent with every other Forge Legacy feed (WSR-001 §1.2, Social-System SOC-D9) never broadcasting routine activity by default.

---

## P5C-D3 — State Matrix Additions

| State | Push Fires? | In-App Surface Still Shows? |
|---|---|---|
| Replies & Mentions ON/OFF | Yes/No | The comment thread / mention always shows in the community feed regardless of toggle |
| Pinned Announcements ON/OFF | Yes/No | Pinned post remains at the top of the feed regardless of toggle (`Community-Feed-Specification-v1.0` CF-D4) |
| Event Reminders ON/OFF | Yes/No | The event remains visible on the Community Page's Events tab regardless of toggle |
| Membership Approval (always on) | Always | The athlete's membership state (Member, vs. the prior Requested state) is visible in-app regardless of the notification |
| Moderator Actions (always on) | Always | No separate in-app surface beyond the notification and the immediate, visible effect of the action itself (e.g., the post is gone) |

**Principle carried through:** identical to every existing P-5 row — toggles control push delivery only, never the underlying in-app surface.

---

## Non-Behaviors

- No toggle fires for a generic new post (COM-D12, binding).
- No new toggle for Community competitions — routes through the existing Challenges category (P5C-D1, item 15).
- No change to Sections A, B, C, or D, or to the non-toggleable Squad Updates note.

---

## Validation Checklist

- [ ] P5C-D1 — seven inventory items added (11–17); item 15 explicitly routes through the existing Challenges toggle, no new toggle created
- [ ] P5C-D2 — Section E defined: Replies & Mentions (merged, default OFF), Pinned Announcements (OFF), Event Reminders (OFF); Membership Approval and Moderator Actions non-toggleable/always ON; binding no-per-post-push rule restated
- [ ] P5C-D3 — state matrix rows added; toggles control push only, never the in-app surface
- [ ] No existing Section A/B/C/D row altered

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Adds Community notification inventory items 11–17 (P5C-D1); adds Section E — Communities, with Replies & Mentions / Pinned Announcements / Event Reminders as default-OFF toggles and Membership Approval / Moderator Actions as non-toggleable always-ON rows, plus the binding no-per-post-push restatement (P5C-D2); adds the corresponding state-matrix rows (P5C-D3). Community competition-start notifications route through the existing Challenges category — no new toggle. No existing P-5 section altered. |

---

*Forge Legacy — P-5 Amendment 002 (Community Notifications)*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); P-5-Notifications-Architecture v1.2.1 (LOCKED, the document amended to v1.3)*
*Status: LOCKED*
