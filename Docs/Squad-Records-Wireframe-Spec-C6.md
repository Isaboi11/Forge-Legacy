# Forge Legacy — Squad Records Wireframe Specification
## C-6 | Challenge System | v1.0 — June 2026

**Status:** Lock-ready (§11 gaps 1 & 2 ratified by Challenge-Architecture-Amendment-002 CA2-D1/CA2-D2)

**Type:** Screen Wireframe Specification

**Authority:** `Challenge-System-Architecture-v1.0.md (v1.5)` — CS-D19 (Squad Records, positive-only), CS-D5/D14 (results), CS-D15 (co-winners), CS-D22 (Firewall); `Comparison-Philosophy-Amendment-001` (CC-D3 anti-shame).

**Amendment Log:** Initial. v1.0.

---

## 1. Screen Purpose

C-6 is the squad's permanent record book. It answers: **"What are the standout marks in our squad's competitive history?"**

> **SQUAD-context only (CA3-D8 / Challenge-System-Architecture v1.3):** Squad Records is a **squad-legacy** surface and aggregates **`context = SQUAD` challenges only**. Friend Challenges (`context = FRIENDS`) are **explicitly excluded** — they have no squad to host squad-legacy. Friend results remain permanent and participant-visible (via the participant-scoped Challenge Hub, C-1) and still feed account-level Honors, but they never appear in C-6. C-6 itself is therefore unchanged by the participant-based reconciliation.

It surfaces materialized, **positive-only** aggregates over the squad's archived **SQUAD-context** challenges (CS-D19): most wins, most consecutive wins, most entered, highest score, most PR-challenge victories. There are no "worst" records. Each record names a holder and a value — recognition, never ranking of the whole squad. It is a **Challenge surface** (CS-D22).

---

## 2. Layout

Navigation-stack screen entered from C-1. Top App Bar: back + title. Tab Bar visible.

```
┌─────────────────────────────────────────────────────────┐
│  [←]  Squad Records · [Squad Name]                      │
├─────────────────────────────────────────────────────────┤
│  RECORDS                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏆 Most Challenge Wins         John · 7          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🔥 Most Consecutive Wins       Maya · 4          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🎯 Most Challenges Entered     Sam · 19          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🏅 Most PR-Challenge Wins      Maya · 3          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ HIGHEST SCORE  (by type)                         │   │
│  │  Most Workouts     John · 14                     │   │  ← per-type (see §11 gap)
│  │  Most Volume       Sam · 184,200 lb              │   │
│  │  Max Lift          Maya · 245 lb (Bench)         │   │
│  │  Most Duration     Riley · 9h 40m                │   │
│  │  Most PRs          Maya · 6                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Sections

### 3.1 Record rows (CS-D19, positive-only)
| Record | Value | Holder |
|---|---|---|
| Most Challenge Wins | `challenges_won` within squad | athlete |
| Most Consecutive Wins | longest win streak in the squad's challenge sequence | athlete |
| Most Challenges Entered | enrollment count within squad | athlete |
| Most PR-Challenge Wins | wins in `MOST_PRS`-type challenges | athlete |
| **Highest Score — by type** | per-`ChallengeType` peak `finalScore` | athlete (one per type) |

### 3.2 Holder display
- Each record: label + holder name + value, in the metric's unit (Max Lift shows the target exercise).
- **Co-holders (ties):** if two athletes tie a record, both are named ("John & Maya · 7") — positive shared recognition, consistent with co-winners (CS-D15). No tiebreak invents a sole holder.
- Rows are **non-tappable** in MVP (records are summary recognition; no drill-down defined). Optional future: tap → the challenge that set the mark.

### 3.3 Positive-only enforcement
- Only "most/highest" records exist. No "fewest," "lowest," "longest losing streak," or any negative mark (CS-D19 / CC-D3).

---

## 4. Navigation

| Action | Destination |
|---|---|
| Back [←] | C-1 Challenge Hub (restores scroll) |
| Tab Bar | H-1 / L-1 / W-1 / Profile |

Entry: from C-1 ("Squad Records ›"). No outbound drill-down in MVP.

---

## 5. Empty States

**No completed challenges yet:**
```
        [muted medal icon ~48dp]
        No records yet
        Your squad's records will appear once
        challenges are completed.
```
- Partial population: if the squad has completed challenges but never a `MOST_PRS` one, the "Most PR-Challenge Wins" row and the "Most PRs" highest-score row are **absent** (no placeholder), rather than showing "—". Records only render once they have a holder.

---

## 6. Edge States

| # | Case | Behavior |
|---|---|---|
| 6.1 | Record tie | Co-holders named; positive (§3.2) |
| 6.2 | Holder left the squad | Name retained (legacy permanence, CS-D17); record persists |
| 6.3 | Single completed challenge | Records render from the one result; "Most Consecutive Wins" = 1 if applicable |
| 6.4 | Co-win effect on win records | A co-win counts as a **win for each co-winner** (toward Most Wins and Consecutive Wins) — positive, never penalized (resolves a gap, §11.2) |
| 6.5 | Cancelled challenge | Contributes nothing (no result) |
| 6.6 | Squad deleted | Records removed with the squad; otherwise permanent |

---

## 7. Data Sources

- **`SquadChallengeRecord`** (materialized per squad, recomputed on each challenge completion — CS-D19), derived from `ChallengeResult` history.
- Win/streak/entry counts derive from `ChallengeResult` + `ChallengeParticipant`.
- Highest-score-by-type derives from `ChallengeResult.finalScore` partitioned by `ChallengeType`.

---

## 8. Permission Rules

- **Any squad member may view** (squad-scoped). No public/cross-squad access.
- **Read-only for all**, including Owner/creator. Records are system-computed; not editable.

---

## 9. Firewall Compliance

- [ ] C-6 is a Challenge surface; records never appear on S-1/S-2 member list/Limited Profile/check-ins (CS-D22).
- [ ] Squad-scoped query + membership gate; no public path.
- [ ] Positive-only — no negative/"worst" record exists (CC-D3).
- [ ] Holder names are squad-scoped recognition, not a cross-member training-performance exposure outside the challenge context.

---

## 10. Downstream Impacts

- Terminal read surface over `SquadChallengeRecord`; introduces no new write path.
- Recompute is triggered by C-3/C-4 challenge completion (CS-D19).
- Shares legacy-permanence with C-4/C-5.

---

## 11. Architecture Gaps Discovered (require a scoring-model amendment)

**Gap 1 — "Highest Challenge Score" is not cross-type comparable (material). RATIFIED — CA2-D1.**
CS-D19 listed a single "Highest Challenge Score" record, but scores are type-specific units (workout count vs. tonnage vs. lbs/kg vs. duration vs. PR count) that cannot be ranked against each other. **Ratified:** Highest Score is tracked **per `ChallengeType`** (Challenge-Architecture-Amendment-002 CA2-D1; CS-D19 updated v1.2).

**Gap 2 — Co-winner effect on win-based records was undefined. RATIFIED — CA2-D2.**
**Ratified:** a co-win counts as a full win for **each** co-winner toward Most Wins and Most Consecutive Wins, and co-holders are named on tied records (Challenge-Architecture-Amendment-002 CA2-D2; CS-D15/D19 updated v1.2).

**Minor — Max Lift "Highest Score" across different target exercises** is conflated within the `MAX_LIFT` type (a 245 lb bench and a 405 lb deadlift are the same "Max Lift" record bucket). MVP keeps one `MAX_LIFT` highest-score holder; a per-exercise refinement is deferred (same nuance flagged for C-7).

---

## Mobile UX
Portrait only; navigation-stack; Tab Bar visible. Record rows ≥ 56dp, tap targets ≥ 44dp (rows non-interactive in MVP). Calm/premium. Accessibility: row = "[Record label]: [holder(s)], [value]."

## Validation Checklist
- [ ] Records: Most Wins, Most Consecutive Wins, Most Entered, Most PR-Challenge Wins, Highest Score (per type)
- [ ] Positive-only; no negative/"worst" record
- [ ] Co-holder ties named; co-wins count for each co-winner
- [ ] Records render only when they have a holder; partial categories absent (no placeholder)
- [ ] Departed holders retained (immutable legacy)
- [ ] Squad-scoped, read-only for all
- [ ] Firewall items (§9) satisfied
- [ ] §11 gaps flagged for a scoring-model amendment (Highest Score per-type; co-win counting)
- [ ] Portrait; tap targets ≥ 44dp

## Change Log
| Version | Date | Change |
|---|---|---|
| 1.0.1 | June 2026 | Participant-based reconciliation (CA3-D8): clarified Squad Records is **SQUAD-context only** — Friend Challenges are explicitly excluded (no squad to host squad-legacy); friend results stay permanent/participant-visible/honor-bearing elsewhere. No structural change; C-6 was already squad-scoped. |
| 1.0 | June 2026 | Initial. Squad-scoped, read-only, positive-only records over materialized `SquadChallengeRecord`; co-holder ties; departed-holder retention. Renders Highest Score **per type** and counts **co-wins for each co-winner** — both flagged as CS-D19 architecture gaps needing ratification (§11). |

---
*Forge Legacy — Squad Records Wireframe Specification — C-6*
*v1.0 — June 2026 · Authority: Challenge-System-Architecture-v1.0.md (v1.5) (and governing Challenge amendments)*
*Status: Lock-ready (§11 gaps ratified by Challenge-Architecture-Amendment-002)*
