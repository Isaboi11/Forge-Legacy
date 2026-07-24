# Forge Legacy — Challenge Architecture Amendment 003
## Friend Challenges — Participant-Based Challenge Contexts
### June 2026 · v1.2

**Status:** LOCKED (v1.2 — Social-System-Architecture-v1.0 reconciliation: feed Firewall + social-surface entry note, CA3-D6; v1.1 — CA3-D1/D4 corrected per product-owner Friend-relationship correction; see Friend-Relationship-Architecture-Amendment-001)

**Type:** Architecture Amendment (makes the Challenge System participant-based with Squad as one optional context. Smallest change set; uses this amendment as the single authority rather than rewriting locked specs. Preserves all privacy principles.)

**Target documents (by reference, not inline rewrite):** `Comparison-Philosophy-Amendment-001` (CC-D1); `Challenge-System-Architecture-v1.2` (CS-D1/D5/D6/D7/D12/D19/D20/D22/D23/D24/D27 + entity); `Honor-Catalog-Amendment-001` (HC-D2/D3); `P-5-Amendment-001`; `Squad-Architecture-Amendment-001/002`; wireframes C-1–C-7.

**Authority:** Product-owner decision (June 2026) — Challenges are participant-based; a Squad is an optional organizational context. `Workout-With-Friend-Spec-WwF.md` §3/§5/§15 (the standing-relationship analysis); `FORGE_LEGACY_PRODUCT_DNA.md` §2 (High-Trust, "not followers"), §10 (no follower systems); Identity-Amendment-001 (athlete search). The Performance Firewall (CC-D2) and Consenting Competition Context (CC-D1) remain fully intact.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Purpose

The verification pass confirmed the Challenge System was unintentionally squad-only: a required immutable `squadId`, CC-D1 gate 1 literally "squad-scoped," and squad-membership-gated enrollment. The intended design is **participant-based** — a challenge runs among an opted-in roster that may be drawn from **a Squad** or **a set of accepted Friends** — with identical privacy behavior in both. This amendment makes the minimum changes to achieve that, backward-compatible with all existing squad challenges.

---

## Decision CA3-D1 — Accepted Friends prerequisite: a persistent mutual Friend relationship is REQUIRED *(corrected v1.1 — superseded by Friend-Relationship-Architecture-Amendment-001)*

### Determination
**Locked (corrected):** A persistent **mutual Friend relationship is required** and is defined in **Friend-Relationship-Architecture-Amendment-001** (FR-D1). **"Accepted Friend" = an existing `ACCEPTED` mutual Friend relationship**, *not* merely someone who accepted a challenge invite. A Friend Challenge's roster is drawn from the creator's **existing accepted Friends**; each invited Friend must still **explicitly opt into the challenge** (CC-D1 gate 2). Two gates: *be a Friend* **and** *opt in*.

> **History:** v1.0 of this amendment determined no persistent Friend entity was needed (per-challenge invite only). The product owner corrected this — a standing Friend relationship is core to Forge Legacy (Friends Feed, WwF outside Squads, Friend Challenges). FR-001 supplies the primitive; this decision is updated to depend on it.

### Why this does not violate governance
The Friend relationship is **mutual, consented, and private** — the same category as squad membership, which the DNA already endorses (High-Trust Relationships). It introduces **no** followers, counts, popularity metrics, public lists, rankings, or comparison (FR-D2/FR-D3). It is utility-based substrate, not a social network. Friendship alone never exposes performance — the Firewall (CC-D2) is intact.

---

## Decision CA3-D2 — CC-D1 governance language (broaden gate 1)

| Field | Value |
|---|---|
| **Document** | `Comparison-Philosophy-Amendment-001.md` |
| **Section** | CC-D1 (Consenting Competition Context), gate 1 |
| **Exact amendment** | Replace gate 1 "**squad-scoped**" with "**private to an opted-in bounded roster** — drawn from a Squad **or** an explicitly-invited set of accepted Friends; never public, never cross-context, never external." Gates 2 (opt-in), 3 (roster-locked), 4 (bounded-duration) unchanged. |
| **Why required** | Gate 1 is the governance root that made challenges squad-only; broadening it to "opted-in bounded roster" admits Friend Challenges while keeping the context private and consented. |
| **Why no violation** | The Firewall (CC-D2), opt-in, roster-lock, and bounded-duration are all preserved. The protected property was never "squad" per se — it was *private, opted-in, bounded*. A friend roster is exactly that. Public/cross-context/external remain prohibited. |

---

## Decision CA3-D3 — Challenge entity becomes participant-based

| Field | Value |
|---|---|
| **Document** | `Challenge-System-Architecture-v1.2.md` |
| **Section** | §2 CS-D1, §3.1 `Challenge` entity |
| **Exact amendment** | (a) Add `Challenge.context` enum **`SQUAD` \| `FRIENDS`** (immutable). (b) Make `squadId` **nullable** — required when `context = SQUAD`, **null** when `context = FRIENDS`. (c) CS-D1 restated: "A challenge exists only as a CC-D1 context bound to **an opted-in roster**; that roster is a Squad (context=SQUAD) or an invited Friend set (context=FRIENDS)." The roster of record is the `ChallengeParticipant` set in **both** contexts. |
| **Why required** | Removes the required-squad ownership; makes the Squad an optional organizing context. |
| **Why no violation** | Backward compatible: every existing challenge is `context=SQUAD` with `squadId` set — behavior unchanged. No privacy surface changes; the roster is still a bounded, opted-in set. |

---

## Decision CA3-D4 — Enrollment rules (two roster sources, one model)

| Field | Value |
|---|---|
| **Document** | `Challenge-System-Architecture-v1.2.md` |
| **Section** | §6 CS-D7, §3.2 `ChallengeParticipant` |
| **Exact amendment** | `ChallengeParticipant` is the roster in both contexts. **SQUAD:** any squad member may opt in (existing CS-D7, unchanged). **FRIENDS:** the creator invites from their **existing accepted Friends** (FR-001); each invited Friend **explicitly opts into the challenge** to become a participant (friendship alone never enrolls). Roster **locks at `startAt`** in both. Replace "must be a member of `Challenge.squadId`" / "only current members of `Challenge.squadId` may join" with "must be an eligible member of the challenge's roster source (squad membership for SQUAD; an **existing accepted Friend of the creator** for FRIENDS) **and** must explicitly opt in." Decline/non-acceptance is **invisible** (CC-D3), identical to squad non-participation. |
| **Why required** | "Squad membership is not required to participate" — friend participants join via invitation+acceptance instead. |
| **Why no violation** | Opt-in is preserved (acceptance *is* the opt-in). Roster-lock unchanged. Invisible non-participation (CC-D3) preserved identically. |

---

## Decision CA3-D5 — Permission model (no squad role required)

| Field | Value |
|---|---|
| **Document** | `Challenge-System-Architecture-v1.2.md` |
| **Section** | §5 CS-D6 |
| **Exact amendment** | Restate the permission model as **challenge-scoped, squad-independent**: **creator** (any athlete; challenge-scoped authority only — configure pre-lock, cancel pre-COMPLETED, invite for FRIENDS) and **participant** (join/leave). The **Squad Owner cancel hook applies only to SQUAD context** (squad cleanup); FRIENDS challenges have no squad Owner — the creator is the sole governance. "Remove participant" exists for no one in either context. |
| **Why required** | Friend challenges have no squad Owner/Member roles; permissions must work without them. |
| **Why no violation** | S-3's two-tier squad model is untouched (SA-D3 preserved). The creator role remains challenge-scoped with no power over people — no new squad tier, no squad-permission conflict. |

---

## Decision CA3-D6 — Query / filter model (Firewall generalized, not weakened)

| Field | Value |
|---|---|
| **Document** | `Challenge-System-Architecture-v1.2.md` |
| **Section** | §13 CS-D22 (Firewall), §8 CS-D12 (leaderboard), §10/§12 |
| **Exact amendment** | Replace "every challenge query is filtered by `squadId` and requires the requester to be a member of that squad" with "every challenge query is scoped to the challenge's **roster set** (participants, plus — for SQUAD context only — the squad's members as viewers); the requester must belong to that scope. No public, cross-context, or external read path exists." Visibility for FRIENDS = the invited/participant set; for SQUAD = squad members (existing). |
| **Why required** | The squadId filter was the mechanism, not the principle; friend challenges need roster-scoped access. |
| **Why no violation** | The Firewall principle — *challenge data visible only within the opted-in challenge context, never on always-on surfaces* — is **preserved and generalized**. CC-D2 / SA2-D1 (no champion data on S-1/S-2/Limited Profile/check-ins) are unaffected; friend challenges have no always-on surface at all. |

> **Reconciliation note — Social-System-Architecture-v1.0 (LOCKED, June 2026; governing social authority).** The Social System introduces the **Posts / Friends Feed / Profile** surfaces. These are **non-challenge surfaces** and the roster-scoped Firewall (this decision, plus CC-D2 / SA2-D1) extends to them without change: **challenge standings, scores, win/loss, and champion recognition NEVER appear in the Friends Feed or on any profile** — challenge data lives **only** on the opted-in Challenge surface (C-series). Posts with `audience = FRIENDS / SQUAD / BOTH` are **intentional shares, never challenge data** (SOC-D16). Separately, the **Friend Challenge entry point** (CA3-D11 friend entry) may also be reached **from the social surface**; eligibility is unchanged — an existing `ACCEPTED` Friend (FR-D6/CA3-D1) plus explicit challenge opt-in. No challenge decision, scope, or schema changes.

---

## Decision CA3-D7 — Challenge lifecycle (identical; squad coupling removed where context=FRIENDS)

| Field | Value |
|---|---|
| **Document** | `Challenge-System-Architecture-v1.2.md` |
| **Section** | §4 CS-D5, §14 CS-D23 |
| **Exact amendment** | Lifecycle states unchanged for both contexts (DRAFT→ENROLLMENT→ACTIVE→COMPLETED→ARCHIVED, +CANCELLED; <2 participants auto-CANCEL). The **squad-deletion** transition (CS-D23 r4) applies **only to SQUAD context**. FRIENDS challenges have no squad dependency and are unaffected by any squad's lifecycle. Member-leaves-squad silent withdrawal (CS-D23 r3) applies to SQUAD context; for FRIENDS, a participant may leave (silent withdrawal) the same way. |
| **Why required** | Friend challenges must not be coupled to squad deletion/membership. |
| **Why no violation** | All anti-shame lifecycle rules (silent withdrawal, no markers, auto-cancel) are preserved identically. |

---

## Decision CA3-D8 — Records / Hall of Champions / Current Champions: EXPLICITLY EXCLUDE Friend Challenges

| Field | Value |
|---|---|
| **Document** | `Challenge-System-Architecture-v1.2.md` (CS-D17–D20, CS-D27) + wireframes C-5/C-6/C-7 |
| **Section** | §11 CS-D17/D18/D19/D20, §16 CS-D27 |
| **Exact amendment** | **Squad Records (C-6), Hall of Champions (C-5), Current Champions (C-7), and the squad participation streak (CS-D27) are SQUAD-context only.** Friend Challenges **do not** populate them — there is no squad to host squad-legacy. **Friend Challenge results are still permanent** (`ChallengeResult` immutable) and **visible to their participants** via the participant-scoped Challenge Hub (CA3-D10); and they **still feed account-level Honors** (CA3-D9). This is an explicit inclusion/exclusion, not left ambiguous. |
| **Why required** | The squad-legacy surfaces are inherently squad-scoped; friend challenges have no squad. Inventing friend-legacy surfaces would exceed "smallest change set." |
| **Why no violation** | Nothing is weakened: squad surfaces stay squad-only; friend results remain permanent + honor-bearing. Privacy preserved (friend results visible only to that challenge's roster). |

---

## Decision CA3-D9 — Honors & Notifications (already participant-based — minimal touch)

| Field | Value |
|---|---|
| **Document** | `Honor-Catalog-Amendment-001` (HC-D2/D3); `P-5-Amendment-001` |
| **Section** | HC-D2 triggers / HC-D3 counters; P-5 §3.2a |
| **Exact amendment** | **Honors:** COMPETITION honors are already account-wide/participant-based (HC-D1, "never squad-scoped"). Friend Challenges emit the **same** `Challenge Completion` / `Challenge Enrollment Finalized` events → `ChallengeEvaluator`; they **count toward** `challenges_won_count` / `challenges_entered_count`. **Participation streak (`max_participation_streak`) remains SQUAD-context only** (CS-D27 is per-(athlete, squad)); friend challenges **do not** contribute to streak honors. **Notifications:** P-5 Section C "Challenge Updates" is already participant-based ("challenges the athlete joined") — no change; it covers friend challenges as-is. |
| **Why required** | Honors/Notifications must work for both; this confirms they already do, with the one streak carve-out stated explicitly. |
| **Why no violation** | No honor schema change; account-wide credit model unchanged; streak stays squad-scoped (no ambiguity). Notification tone/scope (CC-D3 neutral, opted-in only) preserved. |

---

## Decision CA3-D10 — Wireframes (context-aware, not redesigned)

| Field | Value |
|---|---|
| **Document** | `Challenge-Hub-Spec-C1`, `Create-Challenge-Spec-C2`, `Challenge-Detail-Spec-C3`, `Challenge-Results-Spec-C4` |
| **Section** | C-1 §1–§3/§7; C-2 §3–§5; C-3/C-4 preambles + "squad-scoped" language |
| **Exact amendment** | **C-1:** generalize to a **participant-scoped Challenge Hub** that lists the athlete's challenges across contexts; reachable from a squad surface (squad context, filtered to that squad) and from a participant-level entry (CA3-D11). **C-2:** add a **Context step — "Squad" or "Friends"**; Friends reveals a **roster picker** (athlete search → invite list); Squad keeps current behavior; relax "squad-scoped by construction" to "roster-scoped by construction." **C-3/C-4:** replace "squad-scoped" with "**roster-scoped**" (same Firewall, same positive framing, leaderboard = participants only). **C-5/C-6/C-7:** unchanged — squad-only (CA3-D8). |
| **Why required** | Entry/creation/detail must accommodate the friend roster; legacy screens stay squad-only. |
| **Why no violation** | No new privacy surface; "roster-scoped" is the Firewall generalized. Pixel layout deferred to a wireframe-version bump; no feature redesign. |

---

## Decision CA3-D11 — Entry points (Squad + Friend)

| Field | Value |
|---|---|
| **Document** | `Squad-Architecture-Amendment-001` (SA-D2); `Challenge-Hub-Spec-C1`; a participant-level host surface |
| **Section** | SA-D2; C-1 §7 |
| **Exact amendment** | **Squad entry point:** unchanged — neutral affordance from S-2 (SA-D2), now opening C-1 filtered to that squad's challenges. **Friend entry point:** add a participant-level neutral "Challenges" entry that opens C-1 in participant scope (squad + friend challenges). **Recommended minimal host: H-1 Home** (the athlete's personal launch surface); exact placement deferred to a wireframe amendment. The friend create flow is reachable from this participant-level hub. |
| **Why required** | Friend challenges cannot be entered only from a squad surface; a participant-level entry is needed. |
| **Why no violation** | The entry is a neutral navigation affordance (no challenge performance data inline) — SA2-D1/D2 fully preserved on always-on surfaces. |

---

## Reconciliation Pass — remaining squad-only assumptions

Verified every downstream document; resolution noted. **No remaining assumption that challenges are squad-only survives this amendment.**

| Document | Squad-only assumption | Resolved by |
|---|---|---|
| Comparison-Philosophy-Amendment-001 | CC-D1 gate 1 "squad-scoped" | CA3-D2 (broadened to opted-in bounded roster) |
| Challenge-System-Architecture §2/§3.1 | required immutable `squadId`; "cannot exist without a squad" | CA3-D3 (nullable squadId + `context`) |
| Challenge-System-Architecture §6/§3.2 | enrollment gated on squad membership | CA3-D4 (roster source: squad or accepted invite) |
| Challenge-System-Architecture §5 | Owner/Member permission matrix | CA3-D5 (challenge-scoped, squad-independent) |
| Challenge-System-Architecture §13/§8 | queries filtered by `squadId` | CA3-D6 (roster-scoped Firewall) |
| Challenge-System-Architecture §4/§14 | squad-deletion lifecycle coupling | CA3-D7 (SQUAD-context only) |
| Challenge-System-Architecture §11/§16 | Records/Hall/Champions/streak squad-scoped | CA3-D8 (explicitly squad-only; friend excluded) |
| Honor-Catalog-Amendment-001 | (none — account-wide already) | CA3-D9 (confirmed; streak carve-out stated) |
| P-5-Amendment-001 | (none — participant-based already) | CA3-D9 (confirmed) |
| C-1 Challenge Hub | entered from S-2 only | CA3-D10/D11 (participant-scoped hub + H-1 entry) |
| C-2 Create | binds current squad; "no visibility control" | CA3-D10 (Context step + Friends roster picker) |
| C-3 Challenge Detail | "squad-scoped" framing | CA3-D10 (roster-scoped) |
| C-4 Challenge Results | "squad-scoped legacy" framing | CA3-D10 (roster-scoped; friend results participant-visible) |
| C-5/C-6/C-7 | squad-legacy surfaces | CA3-D8 (intentionally squad-only — confirmed, not a gap) |
| S-1/S-2/S-3 + SA-001/002 | challenge entry/creator framed as squad | CA3-D5/D11 (creator squad-independent; squad entry unchanged; friend entry added) |
| DNA §10 pointer | reads challenges as squad-scoped | CA3-D2 (pointer's CC-D1 reference now reads "opted-in bounded roster") |

---

## Non-Behaviors

- **A persistent mutual, private Friend relationship exists** (FR-001) — but **no social graph, no followers, no counts, no public friend lists, no rankings** (FR-D2/D3). *(Corrected v1.1; v1.0 incorrectly stated no Friend entity.)*
- **No change to the Firewall principle** — only its *scoping mechanism* (squadId → roster) generalizes; always-on-surface bars (CC-D2/SA2-D1) are untouched.
- **No new squad permission tier**; S-3 two-tier model preserved.
- **No friend-legacy surfaces** — Records/Hall/Champions stay squad-only (CA3-D8).
- **No honor schema change**; **no notification model change**.
- **No change to existing squad challenges** — fully backward compatible (`context=SQUAD`).
- **No feature redesign** — same lifecycle, scoring, anti-shame, co-winner, and honors behavior.
- **No challenge data on social surfaces** — standings/scores/champion recognition never appear in the Friends Feed or on a profile (CA3-D6 reconciliation note; Social-System-Architecture-v1.0 SOC-D16). Posts are intentional shares, never challenge data.

---

## Validation Checklist

- [ ] CA3-D1 — friend roster drawn from existing **accepted Friends** (FR-001) + explicit challenge opt-in *(corrected v1.1)*
- [ ] CA3-D2 — CC-D1 gate 1 reads "opted-in bounded roster (Squad or Friend set)"; gates 2–4 intact
- [ ] CA3-D3 — `context` enum added; `squadId` nullable; roster = `ChallengeParticipant` in both; squad challenges unchanged
- [ ] CA3-D4 — friend enrollment = invite+accept (opt-in); roster locks at start; decline invisible
- [ ] CA3-D5 — permissions challenge-scoped/squad-independent; squad-Owner cancel = SQUAD only; S-3 untouched
- [ ] CA3-D6 — queries roster-scoped; Firewall preserved/generalized; always-on bars intact
- [ ] CA3-D7 — lifecycle identical; squad-deletion coupling = SQUAD only
- [ ] CA3-D8 — Records/Hall/Champions/streak = SQUAD only; friend results permanent + participant-visible + honor-bearing
- [ ] CA3-D9 — honors emit same events + count toward entered/won; streak excludes friend; notifications already participant-based
- [ ] CA3-D10 — C-1 participant hub; C-2 Context step + Friends picker; C-3/C-4 roster-scoped; C-5/6/7 squad-only
- [ ] CA3-D11 — squad entry (S-2) unchanged; friend entry at participant level (H-1 recommended)
- [ ] Reconciliation: no surviving squad-only assumption
- [ ] Backward compatible; smallest change set; amendment-doc authority (no locked-spec rewrite)

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.2 | June 2026 | Reconciliation pass for `Social-System-Architecture-v1.0`. Added a CA3-D6 reconciliation note + Non-Behavior: the new Posts/Friends-Feed/Profile social surfaces are non-challenge surfaces — challenge standings/scores/champion recognition never appear there (Firewall extends unchanged, SOC-D16); the Friend Challenge entry may also be reached from the social surface with unchanged eligibility. No challenge decision, scope, or schema changed. |
| 1.1 | June 2026 | **Correction (product-owner):** CA3-D1 reversed — a persistent mutual Friend relationship **is required** (Friend-Relationship-Architecture-Amendment-001 FR-D1). "Accepted Friend" = existing mutual Friend, not a per-challenge invite. CA3-D4 friend enrollment = invite from existing Friends + explicit opt-in. Non-Behaviors and validation updated. CA3-D2…D11 unchanged (participant-based model strengthened, not altered). |
| 1.0 | June 2026 | Initial. Makes the Challenge System participant-based with Squad as one optional context. Determines no persistent Friend entity is needed — friend rosters are built per-challenge via search+invite+accept (CA3-D1). Broadens CC-D1 gate 1 to "opted-in bounded roster" (CA3-D2); adds `context` enum + nullable `squadId` (CA3-D3); two roster sources under one enrollment model (CA3-D4); squad-independent permissions (CA3-D5); roster-scoped Firewall (CA3-D6); squad-decoupled lifecycle (CA3-D7); friend challenges explicitly EXCLUDED from squad Records/Hall/Champions/streak but permanent + honor-bearing (CA3-D8); honors/notifications confirmed participant-based (CA3-D9); context-aware wireframes (CA3-D10) and dual entry points (CA3-D11). Full reconciliation pass; backward compatible; all privacy principles preserved. |

---

*Forge Legacy — Challenge Architecture Amendment 003 (Friend Challenges — Participant-Based Challenge Contexts)*
*v1.1 — June 2026 (CA3-D1/D4 corrected; depends on Friend-Relationship-Architecture-Amendment-001)*
*Authority: Product-owner decision (June 2026); Comparison-Philosophy-Amendment-001 (CC-D1/D2); WwF §15; DNA §2/§10; Challenge-System-Architecture-v1.2*
*Status: LOCKED*
