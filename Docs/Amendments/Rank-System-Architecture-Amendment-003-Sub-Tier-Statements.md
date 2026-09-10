# Rank System Architecture — Amendment 003: a sentence for every rung, without a second identity

**Amends:** `Rank-System-Architecture.md` §2.2 (Identity Statements) and §13.1 (Nature of Sub-Tiers), and
`Amendments/Rank-System-Architecture-Amendment-002-Sub-Tier-Ceremony.md` §3
**Status:** LOCKED
**Date:** 2026-09-07
**Decided by:** PO, in review of the rank-ascension post

---

## Section 1 — The decision

**RSA-A3-D1 — every one of the 28 rungs carries its own sentence. LOCKED.**

PO: *"I do want a different saying for all of them."*

A rank-up now says something specific to the rung it announces. Foundation II and Foundation IV no longer
say the same words, and neither do Builder I and Builder IV.

## Section 2 — Why this does not overturn §13.1

It would be easy to read D1 as deleting the clause it appears to contradict. It does not, and the
difference matters enough to be the reason this amendment exists rather than an edit to a table.

§13.1 says:

> Sub-tiers are NOT separate identities. Foundation · I and Foundation · IV share the identity "I've
> started." The progression from I to IV represents increasing depth of that identity — not a transition
> to a new one.

**That stands, in full.** There are still exactly seven identities, one per family, and `RANK_IDENTITY`
is unchanged.

What is added is a second, narrower thing: an **ascent statement** per rung, which is *the family's one
identity expressed at that depth*. §13.1 does not merely permit this — it describes it. "Increasing
depth of that identity" is a claim about how the four rungs differ, and until now nothing in the product
said what the difference was. Four sentences that deepen one identity are the clause made legible. Four
sentences that assert four identities would break it.

**Amendment 002 §3 is AMENDED.** It read:

> **Do not author per-sub-tier identity statements** — that would contradict §13.1

The instruction was right about identity statements and is superseded only for ascent statements, which
are a different field with a different rule. The ban on a second set of *identities* is restated below in
stronger terms than 002 gave it.

## Section 3 — RSA-A3-D2 — The rules an ascent statement must satisfy. LOCKED.

1. **First person, present tense.** §2.2's test is unchanged and applies to every one of the 28: *"self-
   descriptions the athlete should be able to say honestly when they reach the rank."* A line the athlete
   cannot say out loud about themselves is not an ascent statement — which is why the two lines proposed
   in third person ("The foundation is taking shape", "The work is becoming mastery") are recorded below
   in first person instead. Same meaning, sayable by the person it is about.
2. **Sub-tier I is the family identity, verbatim.** Every family's first rung repeats §2.2's sentence
   exactly. This is the structural guarantee that the four lines belong to one identity rather than four:
   the identity is where the family starts, and II–IV are the same claim held longer. It is machine-checked.
3. **II–IV deepen; they never redefine.** An ascent statement must be true of somebody who holds the
   family identity. "I know how to train" cannot be followed at IV by a claim that contradicts it.
4. **No performance claims, no comparison.** Nothing about numbers, other athletes, or rank as standing.
   These are statements about the athlete's relationship to their own training (DNA §10, SOC-D4).
5. **No new rank names.** The families and their names are §2.2's, and this amendment adds none.

## Section 4 — RSA-A3-D3 — The table. LOCKED.

Sub-tier I is §2.2's identity statement verbatim in every row group. Parsed directly by
`domain/rank/__tests__/identity.test.mjs`, so this document is the fixture and the app cannot drift from it.

| Family | Tier | Ascent statement |
| --- | --- | --- |
| Foundation | I | "I've started." |
| Foundation | II | "I keep coming back." |
| Foundation | III | "I've stopped waiting to feel ready." |
| Foundation | IV | "I don't have to talk myself into it." |
| Builder | I | "I'm building habits." |
| Builder | II | "I'm becoming consistent." |
| Builder | III | "I'm putting in the work." |
| Builder | IV | "I train whether or not I feel like it." |
| Craftsman | I | "I know how to train." |
| Craftsman | II | "I know why every session is there." |
| Craftsman | III | "I can change the plan without losing it." |
| Craftsman | IV | "I trust my own judgment under the bar." |
| Architect | I | "I'm intentionally shaping my development." |
| Architect | II | "I train toward something I chose." |
| Architect | III | "I plan in seasons, not sessions." |
| Architect | IV | "I know what the next year is for." |
| Established | I | "I've built something real." |
| Established | II | "What I've built holds under pressure." |
| Established | III | "My training has outlasted my excuses." |
| Established | IV | "This isn't something I'm trying any more." |
| Legend | I | "My journey has become a meaningful story." |
| Legend | II | "I've kept going long enough for it to mean something." |
| Legend | III | "What I've done is worth telling." |
| Legend | IV | "The work speaks before I do." |
| Legacy | I | "I repeatedly become the person I intend to become." |
| Legacy | II | "I change on purpose, and it holds." |
| Legacy | III | "Becoming is a habit I keep." |
| Legacy | IV | "This is who I am, and I chose it." |

**Provenance.** Builder II and Builder III are the PO's own words. The remaining 22 non-identity lines
were drafted against §3's rules and are the half of this table most worth re-reading — they are copy, not
architecture, and editing a row here is a one-line change that the test then enforces on the app.

## Section 5 — RSA-A3-D4 — Which surface says which. LOCKED.

The two fields are not interchangeable, and the split is by what the surface is showing.

| Surface | Says | Because |
| --- | --- | --- |
| M-1 rank-up ceremony | **ascent statement** | It announces one rung. Amendment 002 made it fire on all 28. |
| Rank ascension post (squad + friends feed, post detail) | **ascent statement** | It is the permanent record of that same rung, and must agree with the ceremony. |
| P-2 Progress Hub — rank hero | **identity statement** | It shows who the athlete is — the family. |
| P-2 Progress Hub — ladder | **ascent statement** (per rung) | ⚠ **Amended by RSA-A3-D5 (2026-09-10):** the ladder now shows all 28 RUNGS. |
| Rank Progression screen | **identity statement** | Same: seven families, seven meanings. |

A surface showing a family must never show an ascent statement — picking one of the four would claim that
rung stands for the whole family, which is the §13.1 error in the other direction.

## Section 6 — The final rank is unchanged

M-1 §6.5's terminal-rank line — *"Your legacy has been forged."* — still overrides everything above at
Legacy · IV. Legacy IV's ascent statement exists for the post and for any surface that is not the final
ceremony.

## Section 7 — What is deliberately NOT in this amendment

- **No per-sub-tier identity.** `RANK_IDENTITY` keeps seven entries and is not keyed by tier. Adding an
  eighth field that looks like an identity is the failure mode this document exists to prevent.
- **No change to §13.1.** It is quoted above because it is load-bearing, not because it moved.
- **No change to the ladder, the thresholds, or the badges.** This is copy.

## Section 8 — Decision log

| ID | Decision | Status |
| --- | --- | --- |
| RSA-A3-D1 | Every rung of the 28 carries its own ascent statement | LOCKED |
| RSA-A3-D2 | Five rules an ascent statement must satisfy; sub-tier I is the family identity verbatim | LOCKED |
| RSA-A3-D3 | The 28-row table in §4 | LOCKED |
| RSA-A3-D4 | Ceremony + post say the ascent statement; family surfaces say the identity | LOCKED |
| RSA-A3-D5 | The Progress Hub ladder shows all 28 rungs, each with its ascent statement; unreached rungs are named, not sealed | LOCKED (2026-09-10) |

## Section 9 — Addendum, 2026-09-10 — RSA-A3-D5: the Progress Hub ladder shows every rung

**PO, 2026-09-10,** on the Rank Journey: *"I want each sub division to be showing here too. With the sayings
underneath. That way it shows the entire progression."*

The ladder was seven FAMILY rows, so by D4 it said the identity — and every family past the athlete's own read
*"———— Sealed until earned"*. It now shows all **28 rungs**, each with its own badge and its own ascent
statement. D4's rule is unchanged — *the split is by what the surface is showing* — the ladder simply shows
rungs now, so it takes the rung field. Because sub-tier I is the family identity verbatim (D2), all seven
identities still appear on the ladder, at the head of each family.

- **The hero keeps the identity statement.** It answers *who am I*, which is the family.
- **Rank Progression is unchanged** — it shows families and requirements, and keeps the identity.
- **Unreached rungs are named and quoted, faded — not sealed.** Rank Progression already named every rank,
  so the seal hid nothing real; seeing the whole road is the point, and walking it is still the only way.

### RSA-A3-D5 follow-up, same day — every rung opens, and unreached rungs are grayed out

**PO:** *"Let's make them tapable, and then make sure the ones not earned yet are grayed out."*

- **Tapping a rung opens its sheet.** Earned: the day it was earned, what it took (workouts, active weeks,
  days on the path, PRs, programs/blocks, chapters — as of that day), what it asked (`rungStandards`), and
  the session that did it (→ activity detail). Current: the same, plus what the next rung asks and where the
  athlete stands. Unreached: what it asks and where the athlete stands today.
- **The dates are replayed, not stored.** There is no rank history table; rank is a pure function of dated
  training history, so `domain/rank/history.ts` runs the engine as of each day that can change its answer
  and notes the first day each rung is reached. `history.test.mjs` proves the fast replay equals the
  every-day walk, and that no earned rung can show an unmet row.
- **Unreached badges are desaturated** (a tinted silhouette over the faded art — `filter: grayscale()` is not
  honoured on every platform).
- ⚠ **OPEN DISCREPANCY, NOT RESOLVED HERE:** the engine gives Legacy **no sub-tiers** (`resolveSubTier`
  returns 1; rank levels stop at 25), while §4 and the ladder carry Legacy I–IV. Legacy II–IV can therefore
  never be earned, and their sheets say the steps are not defined. A PO decision: define Legacy II–IV in the
  engine, or show Legacy as one rung.
