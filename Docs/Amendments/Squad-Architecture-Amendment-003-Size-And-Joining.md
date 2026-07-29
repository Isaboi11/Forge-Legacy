# Squad Architecture — Amendment 003: Size Ceiling and Joining Model

**Status:** LOCKED
**Date:** 2026-07-28
**Amends:** `Squad-System-Architecture-v1.0.md` — SQ-D1 (maximum members)
**Introduces:** SQ-D1a (size ceiling 50), SQ-D16 (request-only joining)
**Applied in code:** migration `0053_squad_request_only.sql`; Discover Squads, Squad Preview, Create Squad, Squad Settings

---

## 1 · Why this exists

`Discover Squads` shipped 2026-07-28 with a two-door joining model taken from the design: a public squad
was either **open** (a stranger self-admits instantly) or **approval** (the owner reviews). Building it
surfaced two problems that only became visible once discovery was real.

**Problem 1 — the ceiling and the doors contradicted each other.** SQ-D1 locked squads at 10 members.
At 10 seats, an open squad fills almost immediately and then falls back to approval anyway, so "open"
described a state lasting hours. The design's own seed squads run 15–48 members with caps of 15/25/40 —
it was drawn against a much larger squad than the architecture describes.

**Problem 2 — open joining had no use case that the invite code didn't already serve.** Migration 0040
gives every squad a shareable code that works even on a **private** squad. "Let my training partners in
without approving each one" is therefore already solved, better, without exposure to strangers. That
leaves open joining serving exactly one scenario: wanting strangers *and* not wanting to review them.

## 2 · SQ-D1a — The size ceiling is 50 members

**Locked:** A squad holds up to **50** members, amending SQ-D1's 10.

1. SQ-D1's reasoning — that small size is intentional and maximises accountability — is **retained**.
   50 is still a bounded, personal group, and still an order of magnitude below a Community.
2. The 10-member figure predates the Discover surface and was never exercised against a real
   discovery flow. The design's public squads are the better evidence of intended scale.
3. `member_cap` is a per-squad column (0050), constrained to 2–50, defaulting to 50. Nothing in the
   product sets it per-squad yet; a Settings control can expose it later without further amendment.
4. **Unchanged:** the free-tier cap of 2 squads *joined or created* per athlete
   (`Squads-Hub-Wireframe-Spec-S1.md` §5.2, Critical Decisions Amendment 001). That governs a
   different axis and is not touched here.

### Consequence to watch

SQ-D2 lifts the Performance Firewall inside a squad on the grounds that "the people seeing them chose
this team, on purpose, at a maximum size that keeps it personal." At 50 that justification is weaker
than at 10. SQ-D16 below is what keeps it standing: every one of those 50 was individually admitted by
the owner. **If request-only joining is ever reversed, SQ-D2 must be re-examined at the same time.**

## 3 · SQ-D16 — Public squads are request-to-join only

**Locked:** Open (instant, unreviewed) joining is **removed**. Every public squad admits new members
through the request queue, which the owner approves or declines.

There are now exactly three ways into a squad:

| Door | Squad visibility | Owner action required |
|---|---|---|
| **Invite code** (0040) | Private or public | None — the code is the gate |
| **Request → approval** (0050/0052) | Public only | Yes, per athlete |
| ~~Open join~~ | ~~Public~~ | ~~None~~ — **retired** |

Rationale:

1. **The invite code already covers the friction case**, including on a private squad. Choosing
   public+open to avoid approving your own friends traded exposure for nothing.
2. **It contradicts SQ-D2.** The Firewall is lifted inside a squad because members chose each other.
   A stranger self-admitting into shared progress, streak, feed, and competition standings with zero
   owner action is precisely the case that justification does not cover.
3. **Recourse was backwards.** With open joining the owner's only remedy was removal *after* the
   person had already seen everything. Approval moves the decision before the disclosure.

### What this retires

- `squads.join_mode` (column) and `join_public_squad()` (RPC) — **dropped**, not left inert. A column
  nothing reads is a trap for whoever reads the schema next.
- Design surface: the green **Open** pill and the bronze-fill **Join Squad** CTA on `Discover Squads`;
  the **Open** pill and its two "open squad" join-note variants on `Squad Preview`; the **Joining**
  segmented control on `Create Squad` and `Squad Settings`.
- On Discover, **Request to Join** inherits the primary (filled) button weight that Join Squad carried.
  `Squad Preview` already gave the request CTA that weight, so the two surfaces now agree.

To restore open joining, re-run 0050's `join_mode` column block and its `join_public_squad` function.

## 4 · Design-vs-doc reconciliation (PD-7)

PD-7 holds that where the design project and the docs disagree, the design governs. This amendment
**departs from that in one place, deliberately**: `Discover Squads.dc.html` and `Squad Preview.dc.html`
both treat Open as a first-class state, and it is being cut anyway.

The departure is recorded rather than silent because PD-7 exists to stop docs drifting *behind* a design
that already shipped — not to prevent a product decision that supersedes the design. The design was
authored before the invite-code mechanism (0040) existed to compare it against. Where the design's
evidence was better than the docs' — squad *size* — the design won (SQ-D1a). Where the docs' reasoning
was better — the Firewall justification in SQ-D2 — the docs won (SQ-D16).

## 5 · Documents needing edits

This amendment is the governing record; the following still carry the superseded values and should be
reconciled when next touched:

- [ ] `Squad-System-Architecture-v1.0.md` — SQ-D1 (10 → 50, pointer to SQ-D1a); SQ-D2 consequence note
- [ ] `Squad-Management-Permissions-Spec-S3.md` §8.5 / §14 — the 10-member MVP limit
- [ ] `Squads-Hub-Wireframe-Spec-S1.md` §14 — "No public visibility — squads are private and only
      visible to members" is false since Discover shipped
- [x] ~~`Squad-Management-Permissions-Spec-S3.md` §4.3 / §6.2 / §12 — "all members can edit squad
      identity"~~ — **RESOLVED 2026-07-28.** Product owner confirmed owner-only as the intent; locked
      as SM-D1 in `Squad-Management-Amendment-001-Identity-Governance.md`, and the eight affected
      locations in S-3 have been corrected. The build was already conformant, so no code changed.

## 6 · Validation

- [x] SQ-D1a — ceiling 50; `member_cap` default 50, constraint 2–50
- [x] SQ-D16 — `join_mode` and `join_public_squad` dropped; no client path performs an unreviewed join
- [x] Invite-code joining (0040) unaffected — still the private-squad door
- [x] Approval enforces the ceiling (`approve_squad_join_request` refuses at cap; request stays pending)
- [x] Free-tier 2-squad membership cap untouched

---

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-28 | Initial. Amends SQ-D1 (10 → 50) as SQ-D1a; locks SQ-D16 (request-only joining); retires `join_mode` / `join_public_squad` and the Open surface across four screens. |
