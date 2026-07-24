# Forge Legacy — Monetization Architecture Amendment 002
## Community Membership Limit
### June 2026

**Status:** Locked — MVP Approved Assumption

**Authority:** `Community-System-Architecture-v1.0.md` (LOCKED) COM-D4 — "Free: 1 community. Premium: unlimited community memberships. No member limit per community." `Monetization-Architecture-Amendment-001.md` (LOCKED) — the document amended.

**Amends:** `Monetization-Architecture-Amendment-001.md` — Section 3 (Free Tier Definition), Section 4 (Premium Tier Definition), and adds a new Section (Community Limit Behavior), following the exact shape already used for Programs (§6) and Squads (§7).

**Supersedes:** Nothing. Adds one new row to the existing limit table; no existing limit (programs/photos/squads/imports) changes.

---

## Purpose

`Community-System-Architecture-v1.0` COM-D4 locks a new free-tier limit — community membership — under the existing Monetization framework's established category: "creation/participation beyond the free tier" (Monetization §9). This amendment performs the same mechanical addition already performed for Squads (Critical Decisions Amendment 001) and registers it in the Monetization document's tables.

---

## MA2-D1 — Free Tier Addition

**Add to Monetization-Architecture-Amendment-001 §3's limit table:**

| Feature | Free Tier Limit | Notes |
|---|---|---|
| Community memberships | 1 | Athlete may **join** 1 community. No limit on the **size** of any community (`Community-System-Architecture-v1.0` COM-D4 — the cap is on the joining athlete, never on the community). Ownership of a community (max 1, all tiers, COM-D3) is a separate, non-monetized counter — see MA2-D3. |

**Flagged, consistent with every other MVP numeric limit in the amended document: Initial MVP Assumption — Subject to Future Revision.** The *principle* (free tier includes meaningful participation; premium removes the cap) is locked.

---

## MA2-D2 — Premium Tier Addition

**Add to Monetization-Architecture-Amendment-001 §4's premium feature list:**

- Unlimited community memberships.

---

## MA2-D3 — Community Limit Behavior (new section, mirrors §6/§7 shape)

| Scenario | Behavior |
|---|---|
| Free user in 1 community attempts to join a second | M-7 Premium Upsell Sheet fires |
| Free user upgrades, joins more communities, then downgrades | Remains a member of all of them. Cannot join an additional community while at or above 1. No removal on downgrade (Never Charge For History, §2). |
| Community invitation/approval received by a free user already in 1 community | Visible (a Private community's pending-request state, or a Public community's join CTA) but cannot be completed until the athlete upgrades or leaves their current community |
| Free user who leaves their one community | Free slot restored. May join another until reaching the 1-community limit again. |
| Community ownership (COM-D3, max 1, **all tiers**) | **Not a monetization gate.** Owning a community is capped at 1 for every tier, including Premium — this is a product-design constraint (the same category as "one Active program," Program-Architecture-Amendment-001), not a paywall. Premium does not unlock additional ownership slots. |
| Member count within a community an athlete owns or has joined | **No limit at any tier** — `Community-System-Architecture-v1.0` COM-D4 is explicit that no community has a member cap regardless of who owns it or which tier members are on. |

**Flagged as Initial MVP Assumption — Subject to Future Revision** (the "1" figure only; the behaviors are locked).

---

## Non-Behaviors

- No change to the Program (3), Photo (50), Squad (2), or Import (1 lifetime) limits.
- No monetization of community **ownership** — capped at 1 for every tier as a product constraint, not a premium unlock (MA2-D3).
- No monetization of community **size** — no community, at any tier, has a member cap.
- No deletion of existing community memberships on downgrade (Never Charge For History, §2, unchanged).

---

## Validation Checklist

- [ ] MA2-D1 — Free tier gains "Community memberships: 1" row, flagged provisional
- [ ] MA2-D2 — Premium tier gains "unlimited community memberships"
- [ ] MA2-D3 — full limit-behavior table present; ownership (max 1, all tiers) explicitly stated as a non-monetized product constraint, not a paywall; no member-count cap at any tier; downgrade preserves existing memberships
- [ ] No existing Monetization-Architecture-Amendment-001 limit altered

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Adds the Community membership limit (Free = 1, Premium = unlimited, flagged provisional) to the existing Monetization framework's Free/Premium tier tables (MA2-D1/D2); adds the Community Limit Behavior table, explicitly distinguishing the non-monetized 1-per-tier ownership cap from the monetized membership-count limit, and confirming no community has a member-count cap at any tier (MA2-D3). No existing limit (programs/photos/squads/imports) changed. |

---

*Forge Legacy — Monetization Architecture Amendment 002 (Community Membership Limit)*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); Monetization-Architecture-Amendment-001 (LOCKED, the document amended)*
*Status: Locked — MVP Approved Assumption*
