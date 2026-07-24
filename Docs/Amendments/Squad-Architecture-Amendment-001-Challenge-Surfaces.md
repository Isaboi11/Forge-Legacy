# Forge Legacy — Squad Architecture Amendment 001
## Challenge Surfaces & the Performance Firewall in S-1 / S-2 / S-3
### June 2026

**Status:** LOCKED — **SUPERSEDED for Squad-internal surfaces (S-1, S-2) by `Squad-System-Architecture-v1.0.md` SQ-D2** (June 2026). SA-D1 and SA-D2 (the performance-line firewall as applied to S-2/S-1) no longer hold on a squad's own page — Goal/Mission progress, Squad Streak, the Squad Feed, and Challenge standings for that squad now display inline there. **SA-D3 (challenge creator is a challenge-scoped role, not a squad tier) is unaffected and reinforced**, not superseded. The Firewall remains in full force everywhere outside Squad-internal surfaces (Friends Feed, Communities, Calendar, and any *other* squad's page) — see `Squad-System-Architecture-v1.0.md` §2 for the exact scope.

**Type:** Architecture Amendment (cascade — applies the Comparison Philosophy Amendment's binding rules to the locked Squad specs. Introduces no Challenge feature; defines the boundary the feature must respect.)

**Target documents:** `Squads-Hub-Wireframe-Spec-S1.md` (v1.2), `Squad-Detail-Wireframe-Spec-S2.md` (v1.4), `Squad-Management-Permissions-Spec-S3.md` (v1.1)

**Authority:** Comparison-Philosophy-Amendment-001.md (LOCKED) — CC-D1 (Consenting Competition Context), CC-D2 (Performance Firewall), CC-D3 (anti-shame guardrails); S-1 §10 (Presence vs Performance), S-2 §6.4/§10.3 (the performance line), S-3 §4 (two-tier permission model).

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Purpose

The Squad specifications state the anti-comparison position in its strongest form: S-1 "must never become … a leaderboard"; S-2 §10.3 declares the performance line "does not move … not overridden for premium users, coaches, or squad admins." Comparison-Philosophy-Amendment-001 narrows that position for one bounded case. This amendment applies that narrowing to the three Squad specs **as a scoped exception only**, and — critically — preserves each spec's default behavior unchanged via the Performance Firewall (CC-D2).

The governing intent: the always-on squad experience is exactly what it was. Performance comparison appears only when a member deliberately enters a Challenge surface.

---

## Decision SA-D1 — S-2 Performance Line: Scoped Exception (the hard one)

### Statement

**Locked:** S-2 §6.4 / §10.3's rule that the performance line "does not move" is amended to add **one** bounded exception: within a Consenting Competition Context (CC-D1), performance standings are visible to participating members **on the Challenge surface only**. The S-2 member list, presence states, and Limited Athlete Profile modal remain performance-free and unchanged.

### Rules

1. The §10.3 clause "not overridden for premium users, coaches, or squad admins" stands. The exception is **not** an override granted by status or role — it is granted only by a member's own opt-in into a bounded, roster-locked context (CC-D1). Consent, not privilege, is the gate.
2. **No challenge data on the S-2 member list or Limited Athlete Profile** (CC-D2 Firewall). Presence states ("Trained today / this week / Not yet this week") are unchanged. The Limited Athlete Profile's hidden-fields list (S-2 §5.5.5) is unchanged — no standing, score, win count, or badge is added to it.
3. The Challenge surface is a **distinct surface**, navigated to deliberately — architecturally analogous to how WSR-001 Check-ins are a bounded section, not a change to the member list.
4. Member ordering on S-2 remains fixed-alphabetical (S-2 §5.2). Challenges never reorder the member list.

### Why this is the WSR pattern, not a new precedent

S-2 already hosts one bounded, opt-in, philosophy-compatible exception (Check-ins, WSR-D16). This adds a second bounded surface under the same logic — except the content is performance, permitted solely because CC-D1's four gates and CC-D2's Firewall hold. The default S-2 is untouched.

---

## Decision SA-D2 — S-1: Challenge Entry Without Card Contamination

### Statement

**Locked:** S-1 may host a challenge entry point and/or a "Current Champions" surface, **provided** S-1 squad cards remain presence-only (aggregate "X of Y trained this week"), with no standing, score, or ranking on the card itself.

### Rules

1. S-1's "must never become a leaderboard" (§10) is preserved for the **squad card list**. The card list is not a leaderboard and never becomes one.
2. Any challenge entry affordance routes the athlete *into* a Challenge surface (a Consenting Competition Context); it does not render comparison data inline on S-1.
3. Current Champions, if surfaced at the squad level, is squad-scoped, positive-framed (CC-D3), and is itself a Challenge surface — not a property of the always-on squad card.

---

## Decision SA-D3 — Challenge Creator Is a Challenge-Scoped Role, Not a Squad Tier

### Statement

**Locked:** The Challenge System's "commissioner" maps to a **challenge-scoped creator role**. It is **not** a third squad governance tier. S-3's two-tier model (Owner / Member) is preserved exactly.

### Rules

1. **Any squad member may create a challenge** — the same openness S-3 §4.4 grants to inviting members. Creation is not an Owner-only governance action.
2. The creator's authority is scoped **entirely to the challenge they created** (e.g., set parameters before roster lock, cancel the challenge per feature rules). It confers **no** squad-level permission — no member removal, no squad rename, no ownership powers.
3. S-3 §4's permission table and the "Why two tiers, not three" rationale (§4.2) are **unchanged**. A challenge-creator role is orthogonal to squad governance, the way "invite sender" is already orthogonal in S-3 §8.2.
4. Squad Owner retains no special challenge powers by virtue of ownership beyond those any creator has, except where the net-new Challenge architecture explicitly assigns squad-deletion-style cleanup (to be defined there, consistent with this boundary).

### Why this preserves S-3

S-3 §4.2 rejects a third tier specifically because it creates social hierarchy among members. A challenge-scoped creator role creates none: it is transient, self-selected (anyone can create), and carries no authority over people — only over the bounded challenge object. This is exactly the distinction S-3 already draws between shared identity actions and governance actions.

---

## Decision SA-D4 — Guardrails Applied to Squad Surfaces

### Statement

**Locked:** CC-D3's anti-shame guardrails apply to every squad-level challenge surface.

### Rules

1. **Non-participation is invisible on all squad surfaces.** S-1, S-2, and S-3 never show that a member declined or did not join a challenge.
2. Leaving a challenge produces no marker on S-2 or anywhere in the squad.
3. No challenge standing is ever expressed as failure on a squad surface.

---

## Impacted Locked Documents

| Document | Section | Required change | Status |
|---|---|---|---|
| `Squad-Detail-Wireframe-Spec-S2.md` | §6.4, §10.3, §5.5.5, §14 (Squad Philosophy Compliance) | Add scoped Challenge-surface exception (SA-D1); confirm member list, presence, Limited Profile unchanged; add Firewall note to Philosophy Compliance checklist | Pending (apply on next S-2 revision, → v1.5) |
| `Squads-Hub-Wireframe-Spec-S1.md` | §10, §11 (Navigation) | Permit challenge entry / Current Champions surface; cards stay presence-only (SA-D2) | Pending (→ v1.3) |
| `Squad-Management-Permissions-Spec-S3.md` | §4 (Permission Model), §1 (Goals) | Add challenge-scoped creator role; affirm two-tier model unchanged (SA-D3) | Pending (→ v1.2) |

These are identified per the carrier-amendment pattern: this document is the authority; the inline edits to each locked spec are applied when that spec is next revised, consistent with Critical-Decisions-Amendment-001's downstream-table convention.

---

## Non-Behaviors

- **No change to S-2 presence states, member ordering, or the Limited Athlete Profile.**
- **No challenge data on any S-1 card, S-2 member row, Limited Profile, or check-in card** (CC-D2).
- **No third squad governance tier** — the creator role is challenge-scoped only (SA-D3).
- **No visible non-participation, exit, or failure** on any squad surface (SA-D4).
- **No Challenge feature designed here** — only the boundary it must respect.

---

## Reconciliation note — Challenge-Architecture-Amendment-003 v1.1 (participant-based challenges)

Challenges are now **participant-based**: a challenge's roster is a **Squad** (`context = SQUAD`) **or** a set of accepted Friends (`context = FRIENDS`). This amendment (SA-001) governs **only the SQUAD context** — the squad surfaces, the Firewall on always-on squad surfaces, and the challenge-creator-as-challenge-scoped-role boundary. All of it remains valid and unchanged:

- **SA-D1/SA-D2/SA-D4** describe squad-surface behavior; **Friend Challenges have no always-on surface and never touch S-1/S-2/S-3** (CA3-D6/D8), so these decisions are untouched.
- **SA-D3** (challenge creator = challenge-scoped role, not a squad tier) is **reinforced** by CA3-D5: the creator role is now explicitly squad-independent (sole governance for FRIENDS challenges; Squad-Owner cancel applies to SQUAD context only). The two-tier squad model is preserved.
- Friend challenge **entry** is a participant-level surface (H-1 recommended, CA3-D11), outside this amendment's scope.

---

## Validation Checklist

- [ ] SA-D1 — S-2 performance line exception is scoped to opt-in Challenge surfaces only; granted by consent, not role/status
- [ ] SA-D1 — S-2 member list, presence states, and Limited Profile hidden-fields list unchanged
- [ ] SA-D2 — S-1 squad cards remain presence-only; challenge entry routes into a Challenge surface
- [ ] SA-D3 — challenge creator is challenge-scoped; S-3 two-tier model and §4.2 rationale unchanged
- [ ] SA-D3 — any member may create a challenge; creator gains no squad-governance power
- [ ] SA-D4 — non-participation, exit, and failure are invisible on all squad surfaces
- [ ] Firewall correctness test holds: no always-on squad surface can display challenge performance data

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | **Superseded** for Squad-internal surfaces by `Squad-System-Architecture-v1.0.md` SQ-D2: SA-D1/SA-D2 no longer bar inline Goal/Mission/Streak/Feed/Challenge-standing visibility on a squad's own S-1/S-2. SA-D3 unaffected and reinforced. No change to this document's text below — banner and changelog only. |
| 1.0 | June 2026 | Initial. Applies Comparison-Philosophy-Amendment-001 to the Squad specs: scoped performance-line exception on S-2 Challenge surfaces only with member list/Limited Profile unchanged (SA-D1); S-1 challenge entry without card contamination (SA-D2); challenge-creator as a challenge-scoped role preserving S-3's two-tier model (SA-D3); anti-shame guardrails on squad surfaces (SA-D4). Identifies S-1/S-2/S-3 downstream edits as pending per carrier-amendment convention. |

---

*Forge Legacy — Squad Architecture Amendment 001 (Challenge Surfaces & the Performance Firewall)*
*v1.0 — June 2026*
*Authority: Comparison-Philosophy-Amendment-001.md (LOCKED); S-1 v1.2, S-2 v1.4, S-3 v1.1 (all LOCKED)*
*Status: LOCKED*
