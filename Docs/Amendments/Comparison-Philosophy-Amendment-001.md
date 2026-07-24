# Forge Legacy — Comparison Philosophy Amendment 001
## Consenting Competition Context
### June 2026

**Status:** LOCKED (v1.1 — CC-D1 gate 1 broadened to "opted-in bounded roster" per Challenge-Architecture-Amendment-003 CA3-D2 / Friend-Relationship-Architecture-Amendment-001)

**Type:** Product DNA Amendment (philosophy-level — narrows existing prohibitions; introduces one new governing principle and one binding architectural rule. Does not design the Challenge feature.)

**Authority:** Product-owner decision (June 2026) approving private, opt-in, squad-scoped, performance-ranked competition substantially matching the approved Challenge System vision; Challenge System Compatibility Determination (June 2026); `FORGE_LEGACY_PRODUCT_DNA.md` §2, §4, §5, §10, §11; the established narrowing precedents in `WSR-001-Workout-Share-Result-Architecture.md` (WSR-D6, WSR-D14, WSR-D15, WSR-D16).

**Amendment Log:** Initial. v1.0 LOCKED.

**Governs (cited as authority by):** Squad-Architecture-Amendment-001-Challenge-Surfaces.md, Honor-Catalog-Amendment-001-Challenge-Honors.md, P-5-Amendment-001-Challenge-Notifications.md, and the forthcoming net-new Challenge System architecture.

---

## Purpose

The Product DNA prohibits public leaderboards, social comparison, and shame-based motivation. A prior compatibility determination established that these prohibitions split into two kinds: *surface* constraints (publicity, automation, persistence) that consent legitimately releases — as the product has already done four times in WSR-001 — and *constitutive* constraints (performance comparison, relational shame) that consent does **not** reach and that the product has, until now, held absolute.

The product owner has decided to permit private, opt-in, squad-scoped, performance-ranked competition. This requires the second kind of constraint to be **suspended inside a bounded, consented context** rather than held absolute. That is a genuine philosophy change, scoped as narrowly as possible.

This amendment makes that change by (1) defining one new governing principle, the **Consenting Competition Context**; (2) establishing one **binding architectural rule**, the Performance Firewall, that confines the change to a walled garden; and (3) attaching **binding anti-shame guardrails** that preserve the DNA's named protections. It introduces no feature. It narrows existing prohibitions; it does not delete them.

---

## Decision CC-D1 — The Consenting Competition Context

### Statement

**Locked:** Performance comparison and ranked standings among members are permitted **if and only if** they occur within a *Consenting Competition Context* — a surface that is **all four** of:

1. **Private to an opted-in bounded roster** *(v1.1 — broadened from "Squad-scoped" by CA3-D2)* — visible only to the challenge's roster, drawn from a **Squad** *or* an explicitly-invited set of **accepted Friends** (Friend-Relationship-Architecture-Amendment-001 FR-D6); never public, never cross-context, never external. A friend roster is exactly the protected property gate 1 always required — *private, opted-in, bounded* — without a squad container.
2. **Opt-in** — every participant takes a deliberate action to join. Default state is non-participation.
3. **Roster-locked** — participants are fixed at challenge start; the set of compared athletes is closed and known.
4. **Bounded-duration** — the context has a defined start and end; it is not an always-on standing.

Outside such a context, every existing comparison and shame invariant in the Product DNA and Squad architecture remains unchanged and fully in force.

### Rules

1. A Consenting Competition Context is the **only** place in Forge Legacy where one member's performance may be displayed alongside or ranked against another's.
2. Consent is to the *context*, not perpetual: a participant may leave at any time (see CC-D3), and a context's permission expires when the context ends.
3. The four conditions are conjunctive. Failing **any one** returns the surface to the default prohibition. A public leaderboard, a cross-squad ranking, an always-on standing, or an auto-enrolled comparison is **not** a Consenting Competition Context and remains prohibited.

### What this narrows (not deletes) in the Product DNA

| DNA reference | Before | After |
|---|---|---|
| §10 "Public leaderboards" | Read as: all leaderboards prohibited | Public leaderboards prohibited; **roster-scoped (Squad or invited Friends), opt-in, roster-locked, bounded** leaderboards permitted within a Consenting Competition Context |
| §10 "Rank comparisons" | Read as: all member comparison prohibited | Refers to *involuntary, always-on* rank-tier comparison (still prohibited); opt-in challenge standings permitted in-context |
| §10 "Streak pressure systems" | Read as: all streaks prohibited | *Involuntary, always-on* streaks prohibited; opt-in challenge win/participation streaks permitted in-context |
| §4 "a challenge app / leaderboard platform" | Product identity excludes challenges | Challenges are a **bounded, opt-in squad feature**, not the product's center of gravity. Forge Legacy is still not *primarily* a challenge or leaderboard platform. |
| §2 "Identity Over Performance" / "Accountability Without Shame" | Comparison/shame invariants absolute | Suspended **only** inside a Consenting Competition Context, subject to CC-D3 guardrails. Unchanged everywhere else. |
| §5 "never hyper-competitive" / §11 Decision Test | Governs all surfaces | **Retained in full.** Challenges must remain calm and bounded; the §11 Q5/Q6 test continues to govern every non-consented surface without exception. |

---

## Decision CC-D2 — The Performance Firewall (binding architectural rule)

### Statement

**Locked, binding:** Performance comparison data exists **only** on dedicated Consenting Competition Context surfaces (the Challenge surfaces). It must **never** appear on any always-on squad surface.

### Rules

1. The following always-on surfaces remain **performance-free and behaviorally unchanged** by this amendment and by any Challenge feature built under it:
   - S-1 squad cards (presence aggregate only)
   - S-2 member list and presence states
   - S-2 Limited Athlete Profile modal
   - WSR-001 squad check-in cards
2. Challenge leaderboards, standings, scores, champions, and badges live on Challenge surfaces only. A member who is not viewing a Challenge surface encounters no performance comparison anywhere.
3. **Correctness test (the rule is only satisfied if this holds):** it must be *impossible* for any always-on squad surface to display challenge performance data. Any design that leaks standing, score, rank, or win/loss into S-1, the S-2 member list, the Limited Athlete Profile, or a check-in card violates this amendment.

### Why this rule is load-bearing

The Firewall is the mechanism that makes "permit ranked competition" and "preserve the anti-comparison principles" simultaneously true. It confines the entire philosophy change to a surface the athlete chooses to enter. Without it, the change would bleed across the product and the narrowing in CC-D1 could not be contained.

---

## Decision CC-D3 — Anti-Shame Guardrails (binding conditions)

### Statement

**Locked, binding:** A Consenting Competition Context is permitted only if it satisfies all of the following. These are conditions of the amendment, not optional feature choices.

### Rules

1. **Non-participation is invisible.** Declining or not joining a challenge produces no visible signal of any kind — no "did not join," no count, no absence marker. The DNA's protected cases (missing a workout, time off, injury, family, starting over) must never surface through a challenge.
2. **Exit leaves no trace.** A participant may leave a challenge at any time; leaving removes them from standings and creates no "quit," "dropped," or "DNF" marker.
3. **No failure framing.** Standings are presented positively (placement, progress). No surface labels any participant a "loser," "last," or equivalent. Final standings record who participated and who won; they do not dramatize who lost.
4. **No failure notifications.** Competitive notifications are neutral or positive only (CC referenced by P-5-Amendment-001). "Passed you" style alerts must be neutral-framed or separately opt-in; no notification is permitted to deliver in-the-moment failure.
5. **Squad-scoped, always.** No challenge data ever escapes the squad to a public, cross-squad, or external surface.

---

## Decision CC-D4 — Challenge Badges Are Not Honors

### Statement

**Locked:** Temporary challenge badges (e.g., Current Leader, Defending Champion, Challenge Creator) are **ephemeral, scoped status indicators** defined by the Challenge architecture. They are **not** Honors and are not part of the Honor Catalog.

### Rules

1. Challenge badges are transient (displayed during/around an active competition) and squad-scoped.
2. The DNA stance "Honors are recognition — not trophies, not collectibles" is **preserved**: it governs the Honor system, which challenge badges are explicitly outside of.
3. **Permanent** challenge milestones (First Victory, 10 Wins, Challenge Veteran, etc.) *are* Honors and are governed by Honor-Catalog-Amendment-001 — distinct from ephemeral badges.

---

## Decision CC-D5 — No Rank Impact (confirmation, no change required)

### Statement

**Locked / no amendment required:** Challenges do not contribute to or affect Rank progression. This is already consistent with `Rank-Computation-Model.md` and Honor Catalog **AD-27** (honors do not contribute to rank). No Rank document requires amendment. Recorded here only to make the invariant explicit for the Challenge workstream.

---

## The Permissibility Test (reusable, for all future competitive/social mechanics)

Any proposed competitive or social mechanic is evaluated against four gates:

1. **Public?** → must be private to an opted-in bounded roster (a Squad **or** an invited set of accepted Friends).
2. **Automatic?** → must be athlete-initiated (opt-in).
3. **Unbounded?** → must be bounded/ephemeral (and roster-locked for comparison).
4. **Does it rank members by performance, or surface anyone's failure?** → if yes, it is permitted **only** inside a Consenting Competition Context satisfying CC-D1–CC-D3, behind the CC-D2 Firewall.

Gates 1–3 are consent-resolvable. **Gate 4 is the hard wall:** outside a Consenting Competition Context, no amount of consent makes a performance-ranking or failure-surfacing mechanic permissible.

---

## Impacted Locked Documents (all identified)

| Document | Status | Required change | Carried by |
|---|---|---|---|
| `FORGE_LEGACY_PRODUCT_DNA.md` §2/§4/§5/§10/§11 | Pending pointer | Add amendment pointer referencing this document; §10/§4/§2 read in light of CC-D1's narrowing table | This amendment is the authority |
| `Squads-Hub-Wireframe-Spec-S1.md` | Pending | Permit challenge entry point / Current Champions surface; squad cards stay presence-only (Firewall) | Squad-Architecture-Amendment-001 |
| `Squad-Detail-Wireframe-Spec-S2.md` §6.4/§10.3 | Pending | Scoped exception to the "line does not move" clause: performance visible only on Challenge surfaces; member list + Limited Profile unchanged | Squad-Architecture-Amendment-001 |
| `Squad-Management-Permissions-Spec-S3.md` §4 | Pending | Add challenge-creator as a **challenge-scoped role**, not a squad governance tier; two-tier model preserved | Squad-Architecture-Amendment-001 |
| `Honor-Catalog-v1.0-LOCKED.md` | Pending | Add challenge honor family/category (catalog reopens via expansion governance) | Honor-Catalog-Amendment-001 |
| `Honor-Evaluation-Service-Architecture-v1.0.md` §3 | Pending | New trigger source (Challenge Completion) → ChallengeEvaluator; HonorInstance challenge source value | Honor-Catalog-Amendment-001 |
| `P-5-Notifications-Architecture.md` | Pending | New "Challenges" notification category, default OFF, neutral-framed | P-5-Amendment-001 |
| `Rank-Computation-Model.md` | No change | None — CC-D5 confirms consistency | — |

---

## Non-Behaviors

- **No feature designed.** Challenge entity, lifecycle, scoring, leaderboard computation, Hall of Champions, Squad Records, Current Champions, badges, and challenge screens are net-new architecture, built *under* this amendment, not by it.
- **No public, cross-squad, or external comparison permitted** — the four gates forbid it.
- **No change to any always-on squad surface** — the Firewall forbids it.
- **No relaxation of §5 / §11** outside a Consenting Competition Context.
- **No change to Rank** — CC-D5.

---

## Validation Checklist

- [ ] CC-D1 four gates (squad-scoped, opt-in, roster-locked, bounded) are all conjunctive
- [ ] CC-D1 narrowing table applied when reading DNA §10/§4/§2
- [ ] CC-D2 Firewall stated as binding; correctness test ("impossible for always-on surfaces to show challenge performance data") satisfiable by downstream designs
- [ ] CC-D3 guardrails 1–5 treated as binding conditions, not options
- [ ] CC-D4 badges classified as non-Honors; Honor "not collectibles" stance preserved
- [ ] CC-D5 no Rank document amended
- [ ] Permissibility Test gate 4 enforced as a hard wall outside a Consenting Competition Context
- [ ] All impacted locked documents identified with a carrier amendment or "no change"

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | **CC-D1 gate 1 broadened** from "Squad-scoped" to "**Private to an opted-in bounded roster**" — drawn from a Squad **or** an explicitly-invited set of accepted Friends (Challenge-Architecture-Amendment-003 CA3-D2; Friend-Relationship-Architecture-Amendment-001 FR-D6). Gates 2–4 (opt-in, roster-locked, bounded-duration) unchanged. §10 narrowing table and the Permissibility Test gate 1 updated to "roster-scoped (Squad or invited Friends)." The Performance Firewall (CC-D2), anti-shame guardrails (CC-D3), and gate-4 hard wall are untouched — the protected property was always *private, opted-in, bounded*, never "squad" per se. |
| 1.0 | June 2026 | Initial. Introduces the Consenting Competition Context principle (CC-D1) narrowing DNA §10/§4/§2 for squad-scoped, opt-in, roster-locked, bounded competition; establishes the Performance Firewall as a binding architectural rule (CC-D2); attaches binding anti-shame guardrails (CC-D3); classifies challenge badges as non-Honors (CC-D4); confirms no Rank impact (CC-D5). Defines the reusable four-gate Permissibility Test. Identifies all impacted locked documents and their carrier amendments. No feature designed. |

---

*Forge Legacy — Comparison Philosophy Amendment 001 (Consenting Competition Context)*
*v1.1 — June 2026 (CC-D1 gate 1 broadened to opted-in bounded roster; CA3-D2 / FR-001)*
*Authority: Product-owner decision (June 2026); Challenge System Compatibility Determination (June 2026); FORGE_LEGACY_PRODUCT_DNA.md; WSR-001 (WSR-D6/D14/D15/D16)*
*Status: LOCKED*
