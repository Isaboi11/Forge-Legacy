# Forge Legacy — Community Roles and Moderation
## v1.0 | June 2026

**Status:** **LOCKED** (June 2026) — subordinate architecture under `Community-System-Architecture-v1.0`. Product-owner-approved; ready for the Architecture Freeze.

**Type:** System Architecture (permissions/moderation layer)

**Authority:**
- `Community-System-Architecture-v1.0.md` (LOCKED) — COM-D2 (Community types — Official Communities are moderated by Forge staff, §6), COM-D10 (Competitions — creation is role-gated, §5), COM-D19 (Community Health / ownership succession, owned by the System Architecture, enforced here, §6.4).
- `Community-Feed-Specification-v1.0.md` (LOCKED) — CF-D3 (Report routes to the queue this document defines, §7), CF-D4 (Pin is a moderator-tier action, owned here, §5).
- `Squad-Management-Permissions-Spec-S3.md` (LOCKED) — the precedent for a role-based permission table (§4.2 below states explicitly why Communities depart from S-3's two-tier model).

**Downstream dependents:** none yet (no Community wireframe workstream exists).

---

## Section 1 — Purpose & Scope

This document defines the four community roles, their permission matrix, and the moderation actions available within a community. It is the governance layer beneath `Community-System-Architecture-v1.0`.

**In scope:** the Owner/Admin/Moderator/Member role hierarchy and permission matrix; role assignment and succession; the moderation action set (Report, Remove post/comment, Mute, Kick, Ban, Pin, membership approval); Official Community moderation; the explicitly acknowledged gaps (platform-level escalation, AI moderation).

**Out of scope:** pixel layout; feed content rules (`Community-Feed-Specification-v1.0`); discovery/search (`Community-Discovery-and-Search-v1.0`).

---

## Section 2 — CRM-D1 — Roles

**Locked.** Four roles, strictly ordered by authority: **Owner > Admin > Moderator > Member.**

| Role | How assigned | Count per community |
|---|---|---|
| **Owner** | The athlete who created the community (or the successor from §6.4); Forge staff for Official Communities | Exactly one |
| **Admin** | Promoted by the Owner | Zero or more |
| **Moderator** | Promoted by the Owner or an Admin | Zero or more |
| **Member** | Default state on joining (§7 of `Community-System-Architecture-v1.0`) | Everyone else |

**No custom permissions in V1.** Locked, binding: there is no per-role permission editor, no custom role, no ad-hoc grant of a single capability to a Member. The four roles and the matrix in §3 are the complete, closed permission model — the same closed-catalog discipline already used for the Honor Catalog and the Community Feed's `postType` enum.

---

## Section 3 — CRM-D2 — Permission Matrix

**Locked.**

| Action | Owner | Admin | Moderator | Member |
|---|---|---|---|---|
| Edit community branding (banner/icon/name/description/rules, COM-D14) | Yes | Yes | No | No |
| Change category | Yes | Yes | No | No |
| Promote/demote Admin | Yes | No | No | No |
| Promote/demote Moderator | Yes | Yes | No | No |
| Delete community | Yes | No | No | No |
| Transfer ownership (manual) | Yes | No | No | No |
| Approve/decline membership requests (Private communities) | Yes | Yes | Yes | No |
| Post / comment / react | Yes | Yes | Yes | Yes |
| Author `OFFICIAL_ANNOUNCEMENT` posts (`Community-Feed-Specification-v1.0` CF-D2) | Yes | Yes | No | No |
| Pin / unpin a post | Yes | Yes | Yes | No |
| Remove a post | Yes | Yes | Yes | No |
| Remove a comment | Yes | Yes | Yes | No |
| Mute a member | Yes | Yes | Yes | No |
| Kick a member | Yes | Yes | Yes | No |
| Ban a member | Yes | Yes | Yes | No |
| Create a competition (`Community-System-Architecture-v1.0` COM-D10) | Yes | Yes | Yes | No |
| Create an event (`Community-System-Architecture-v1.0` §10) | Yes | Yes | Yes | No |
| Review reports (§7) | Yes | Yes | Yes | No |
| Leave the community | No¹ | Yes | Yes | Yes |

¹ The Owner cannot simply leave — they must first transfer ownership or delete the community (§6.2), the same constraint already locked for Squad ownership (S-3 §5.5).

**Mute/Kick/Ban are available to Moderators, not just Admin/Owner.** This is a deliberate departure from the table's otherwise-stricter rows (branding/role/deletion are Owner/Admin-only) because moderation is the Moderator role's entire purpose — gating it above Moderator would make the role meaningless.

---

## Section 4 — CRM-D3 — Why Four Tiers, Not Two

### 4.1 The Squad precedent
`Squad-Management-Permissions-Spec-S3.md` §4.2 locks a **two-tier** model (Owner/Member) for Squads and explicitly rejects a third tier, reasoning that a small, trusted training group has no need for delegated moderation — the Owner can personally handle the rare conflict.

### 4.2 Why Communities depart from that precedent
**Locked.** A Squad is capped at a small membership and entirely private to its members. A Community is **explicitly unbounded in membership** (`Community-System-Architecture-v1.0` COM-D4 — "no member limit per community") and, for Public communities, open to anyone who chooses to join. At that scale, a single Owner personally reviewing every report and every borderline post is not a realistic operating model — the same way a 500-person space cannot be moderated the way a 6-person squad is. Four tiers exist because Communities are the one Forge Legacy surface explicitly designed to scale past the size where direct, single-owner moderation works.

This is not "more roles because more features" — it is the same judgment-driven, evidence-based reasoning S-3 used to justify *fewer* tiers for Squads, applied to a structurally different scale.

---

## Section 5 — CRM-D4 — Moderation Actions

**Locked.** The complete moderation action set:

| Action | Effect | Visibility to the affected member |
|---|---|---|
| **Report** | Flags a post/comment into the role-holders' queue (§7) | Silent — no notification to the reported author (consistent with the product's anti-shame precedent, Comparison-Philosophy-Amendment-001 CC-D3) |
| **Remove post** | Deletes the post from the feed | The author sees their post is gone; no public "removed by moderator" marker is shown to other members |
| **Remove comment** | Deletes the comment | Same as above |
| **Mute** | The member retains membership and read access but cannot post/comment/react for a moderator-set duration | Not publicly visible to other members; the muted member sees their own posting ability is restricted |
| **Kick** | Removes membership immediately; the athlete may re-request to join (Private) or re-join (Public) at any time | No public marker; silent, mirroring Squad removal's no-record precedent |
| **Ban** | Removes membership and **blocks re-joining** | No public marker |
| **Pin posts** | Surfaces a post at the top of the feed (`Community-Feed-Specification-v1.0` CF-D4) | Visible to all members (the point of pinning) |
| **Membership approval** | Grants or declines a pending join request on a Private community (`Community-System-Architecture-v1.0` §7) | Decline is silent, no record retained |

**Anti-shame consistency:** every moderation action above follows the same pattern already locked across the product (Challenge withdrawal, Friend decline, Squad removal) — the *acted-upon* member is told plainly what happened to them, but no public marker, count, or "moderation history" is ever shown to other members. Moderation is corrective, not punitive theater.

---

## Section 6 — CRM-D5 — Ownership Lifecycle

### 6.1 Initial ownership
The creating athlete becomes Owner at community creation, subject to the eligibility gate (`Community-System-Architecture-v1.0` COM-D2).

### 6.2 Manual transfer
**Locked.** The Owner may transfer ownership to any current Admin at any time (mirrors S-3 §5.3's manual squad-transfer flow). The Owner may not transfer directly to a Moderator or Member — ownership transfer requires the recipient already hold the Admin tier, ensuring the new Owner has already demonstrated the next-highest level of trust in that specific community.

### 6.3 Owner leaving
**Locked.** An Owner who wishes to leave must first either (a) transfer ownership to an Admin (§6.2), or (b) delete the community. There is no "Owner leaves, community becomes ownerless" state — mirrors S-3 §5.5/§5.6's squad-ownership-continuity rule exactly.

### 6.4 Automatic succession on inactivity
**Locked.** Per `Community-System-Architecture-v1.0` COM-D19: an Owner inactive for 90 consecutive days (flagged provisional, per the Monetization Amendment 001 precedent) triggers automatic succession:

```
Owner inactive ≥ 90 days
   ↓
Longest-tenured Admin offered ownership (72h to accept)
   ↓ declines or none exists
Longest-tenured Moderator offered ownership (72h to accept)
   ↓ declines or none exists
Community → ARCHIVED (read-only; Never Charge For History applies —
no content is deleted; Community-System-Architecture-v1.0 §15.6)
```

"Longest-tenured" = earliest `promotedAt` timestamp for that role. The 72-hour acceptance window is flagged, consistent with every other numeric value in this section, as an **Initial MVP Assumption — Subject to Future Revision.**

### 6.5 Official Communities
**Locked.** Official Communities have **no athlete Owner.** Forge staff hold the Owner/Admin roles operationally (outside this document's athlete-facing permission model — staff tooling is not specified here, consistent with the project's standing deferral of internal/admin tooling, the same deferral already noted for administrative notifications in `P-5-Notifications-Architecture` §1). §6.4's inactivity-succession chain does not apply to Official Communities.

---

## Section 7 — CRM-D6 — Report Queue & Acknowledged Gaps

**Locked, scope-honest.** A Report (`Community-Feed-Specification-v1.0` CF-D3 §4.4) routes to a queue visible to that community's Owner/Admin/Moderator role-holders. This is a **self-moderation model** — the community's own elevated members review and act on reports within their community.

**What this document does not build (acknowledged, not silently omitted):**
1. **No platform-wide trust-and-safety escalation path.** If a community's own moderators are unresponsive, complicit, or are themselves the problem, there is no described path to a Forge-staff-level appeal in V1. This mirrors `Social-System-Architecture-v1.0`'s own acknowledged gap ("Comment moderation/safety… acknowledged as a net-new surface and flagged for a dedicated future decision; out of v1.0 scope") — the same honesty standard applied here rather than inventing an escalation system unprompted.
2. **No AI moderation** (explicit V1 exclusion, `Community-System-Architecture-v1.0` §"Non-Behaviors"). All moderation actions in §5 are human-role-initiated only.

These two items are carried forward as open items for a future Communities revision, not resolved here.

---

## Non-Behaviors

- **No custom or per-role-granular permissions** — exactly four fixed roles, exactly the matrix in §3 (CRM-D1).
- **No public moderation history or "X was banned" marker visible to other members** (§5).
- **No Owner-to-Member or Owner-to-Moderator direct transfer** — transfer target must already be Admin (§6.2).
- **No ownerless community state** — transfer or delete only (§6.3).
- **No AI-driven moderation decision of any kind** (§7).
- **No platform-level (Forge staff) appeal path for non-Official communities** in V1 — acknowledged gap (§7).

---

## Validation Checklist

- [ ] CRM-D1 — four fixed roles (Owner/Admin/Moderator/Member); exactly one Owner; no custom permissions
- [ ] CRM-D2 — full permission matrix present; Owner cannot leave without transfer/delete; Mute/Kick/Ban available at Moderator tier
- [ ] CRM-D3 — four-tier rationale explicitly reconciled against the Squad two-tier precedent (S-3 §4.2); justified by unbounded-membership scale, not feature creep
- [ ] CRM-D4 — Report/Remove post/Remove comment/Mute/Kick/Ban/Pin/Membership-approval all defined with anti-shame-consistent visibility rules
- [ ] CRM-D5 — manual transfer (Admin-only recipient); Owner-leaving constraint; 90-day-inactivity succession chain (Admin → Moderator → Archive, flagged provisional) mirroring Community-System-Architecture-v1.0 COM-D19; Official Communities have no athlete Owner and are exempt from succession
- [ ] CRM-D6 — Report queue is self-moderation (community role-holders only); platform-wide escalation and AI moderation explicitly acknowledged as not built, not silently omitted
- [ ] No contradiction with Community-System-Architecture-v1.0, Community-Feed-Specification-v1.0, or Squad-Management-Permissions-Spec-S3

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Defines the four-tier Owner/Admin/Moderator/Member role hierarchy with no custom permissions (CRM-D1); the full permission matrix (CRM-D2); the explicit rationale for departing from the Squad system's locked two-tier model, grounded in Communities' unbounded membership scale (CRM-D3); the complete moderation action set with anti-shame-consistent visibility rules (CRM-D4); the ownership lifecycle including manual transfer, the no-ownerless-state rule, the 90-day-inactivity succession chain, and the Official Community exemption (CRM-D5); and the self-moderation Report queue model with two explicitly acknowledged, unresolved gaps — platform-wide escalation and AI moderation (CRM-D6). |

---

*Forge Legacy — Community Roles and Moderation*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); Community-Feed-Specification-v1.0 (LOCKED); Squad-Management-Permissions-Spec-S3 (LOCKED)*
*Status: LOCKED (June 2026) — PO-approved; ready for the Architecture Freeze.*
