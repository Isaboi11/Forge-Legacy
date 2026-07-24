# Forge Legacy — Challenge Architecture Amendment 002
## Per-Type Scores & Champions; Co-Winner Full Credit
### June 2026

**Status:** LOCKED

**Type:** Architecture Amendment (ratifies three definitions surfaced during C-5–C-7 wireframe authoring. Clarifies existing decisions; introduces **no** new feature, entity, type, or screen.)

**Target documents:** `Challenge-System-Architecture-v1.1.md` (→ v1.2), `Honor-Catalog-Amendment-001-Challenge-Honors.md`, `Squad-Records-Wireframe-Spec-C6.md`, `Current-Champions-Wireframe-Spec-C7.md`.

**Authority:** `Challenge-System-Architecture-v1.1.md` — CS-D15 (tie-breakers/co-winners), CS-D16 (Defending Champion projection), CS-D19 (Squad Records), CS-D20 (Current Champions), CS-D24 (Honors); `Honor-Catalog-Amendment-001` (HC-D2 win counters); `Comparison-Philosophy-Amendment-001` (CC-D3 positive-only). Gaps documented in C-6 §11 and C-7 §11.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Purpose

C-5–C-7 wireframe authoring surfaced three points the architecture left underspecified. Each was resolved provisionally in the wireframes and flagged for ratification. This amendment ratifies all three so C-6 and C-7 reach full lock. It is deliberately minimal: three clarifications, no feature change.

---

## Decision CA2-D1 — Highest Challenge Score is tracked per Challenge Type

### Statement
**Locked:** "Highest Challenge Score" (CS-D19 Squad Records) is tracked and displayed **per `ChallengeType`**, not as a single global record.

### Rationale
Scores are type-specific units — workout count, cumulative tonnage, single-lift weight (lbs/kg), duration, PR count — which are not comparable across types. A single "highest score" is meaningless; a per-type peak is the only well-defined form.

### Rules
1. `SquadChallengeRecord` maintains one highest-`finalScore` holder **per `ChallengeType`** present in the squad's archived history.
2. A type with no completed challenge has no highest-score record (absent, not zero — C-6 §5).
3. `MAX_LIFT` keeps a single per-type holder regardless of `targetExerciseId`; a per-exercise refinement remains deferred (no change here).

---

## Decision CA2-D2 — Co-winners receive full credit

### Statement
**Locked:** When `Challenge.winnerAthleteIds` contains multiple co-winners (CS-D15), **each** co-winner receives **full** credit — for wins, win streaks, Squad Records, and Honors. A co-win is never fractional and never penalized.

### Rules
1. **Wins:** each co-winner's `challenges_won_count` increments by 1 (HC-D3 counter).
2. **Win streaks:** a co-win counts as a win for **each** co-winner toward "Most Consecutive Wins" (CS-D19) and any future win-streak signal.
3. **Squad Records:** co-winners are co-holders where applicable; ties on a record name all co-holders (C-6 §3.2) — positive shared recognition.
4. **Honors:** each co-winner is independently eligible for Win-family honors (Honor-Catalog-Amendment-001 types 54–56) on the Challenge Completion event.
5. Consistent with CC-D3: shared victory is celebrated; no co-winner is demoted, and ties never manufacture a sole winner or a loser.

---

## Decision CA2-D3 — Current Champions are tracked per Challenge Type

### Statement
**Locked:** Current Champions (CS-D20) are tracked **per `ChallengeType`** — one standing champion per category — never as a single overall champion. This operationalizes CS-D16's "comparable identity" as **same `ChallengeType`**.

### Rules
1. A category's current champion = the winner(s) of the **most recently completed challenge of that `ChallengeType`** in the squad.
2. The **Defending Champion** projection (CS-D16) is therefore scoped to the same `ChallengeType`; "comparable identity" = type-equality.
3. Categories map 1:1 to the five shipping types (Consistency/Volume/Max Lift/Duration/PR). `RANK_XP` remains deferred (no XP champion, CS-D11).
4. Co-winners → co-champions for that category (C-7 §6.1), per CA2-D2.
5. `MAX_LIFT` champion is per-type (one tile) regardless of `targetExerciseId`; per-exercise refinement deferred.

---

## Affected Architecture References (updated)

| Document | Change | Status |
|---|---|---|
| `Challenge-System-Architecture-v1.1.md` → **v1.2** | CS-D15 (co-winner full credit note), CS-D16 ("comparable identity" = same type), CS-D19 (Highest Score = per type), CS-D20 (per-type, not overall), CS-D24 (co-winner honor credit) | **Applied this session** |
| `Honor-Catalog-Amendment-001-Challenge-Honors.md` | HC-D2: co-winner credit clarified (each co-winner +1 win, independently honor-eligible) | **Applied this session** |
| `Squad-Records-Wireframe-Spec-C6.md` | §11 Gap 1 & Gap 2 ratified — status caveat lifted | **Applied this session** |
| `Current-Champions-Wireframe-Spec-C7.md` | §11 Clarifications A ratified — status caveat lifted | **Applied this session** |

**Not changed:** no new entity, type, screen, scoring metric, or permission. The open SA-D2/Firewall ruling for a *squad-surface* Current-Champions entry (C-7 §11 item C) is **out of scope** for this amendment and remains open.

---

## Downstream Impacts

1. C-6 and C-7 reach **full lock** (their flagged gaps are now ratified).
2. The `MAX_LIFT` per-target-exercise refinement remains a **deferred future enhancement** (unchanged).
3. The squad-surface Current-Champions Firewall ruling (C-7 §11 C) is still **open** — tracked separately, not resolved here.
4. No impact to Rank (CS-D4/CC-D5 unchanged), Squads governance, or Notifications.

---

## Non-Behaviors

- No new challenge type, entity, screen, or permission.
- No change to scoring formulas — only the *partitioning* of the highest-score record and the *crediting* of co-winners.
- No change to the deferred `RANK_XP` status.
- No resolution of the open squad-surface Current-Champions/Firewall ruling.

---

## Validation Checklist

- [ ] CA2-D1 — Highest Score is per `ChallengeType`; absent for types with no history; one `MAX_LIFT` holder
- [ ] CA2-D2 — each co-winner gets full win credit: `challenges_won_count` +1, win-streak credit, co-holder records, independent Win honors
- [ ] CA2-D3 — Current Champions per type; Defending Champion "comparable identity" = same type; no overall champion; no XP tile
- [ ] Architecture v1.2 edits applied (CS-D15/D16/D19/D20/D24)
- [ ] Honor-Catalog-Amendment-001 HC-D2 co-winner clarification applied
- [ ] C-6 / C-7 status caveats lifted
- [ ] No new feature introduced; squad-surface Firewall ruling left open

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Ratifies three definitions from C-5–C-7 authoring: Highest Challenge Score tracked per `ChallengeType` (CA2-D1); co-winners receive full credit for wins/streaks/records/honors (CA2-D2); Current Champions tracked per `ChallengeType`, operationalizing CS-D16 "comparable identity" as same-type (CA2-D3). Minimal — no new feature. Architecture → v1.2; Honor-Catalog-Amendment-001 HC-D2 clarified; C-6/C-7 caveats lifted. |

---

*Forge Legacy — Challenge Architecture Amendment 002 (Per-Type Scores & Champions; Co-Winner Full Credit)*
*v1.0 — June 2026*
*Authority: Challenge-System-Architecture-v1.1 (CS-D15/D16/D19/D20/D24), Honor-Catalog-Amendment-001 (HC-D2)*
*Status: LOCKED*
