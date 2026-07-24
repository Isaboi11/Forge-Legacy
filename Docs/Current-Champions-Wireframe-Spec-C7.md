# Forge Legacy — Current Champions Wireframe Specification
## C-7 | Challenge System | v1.0 — June 2026

**Status:** Lock-ready (§11 Clarification A ratified by Challenge-Architecture-Amendment-002 CA2-D3; squad-surface ruling C resolved by Squad-Architecture-Amendment-002)

**Type:** Screen Wireframe Specification

**Authority:** `Challenge-System-Architecture-v1.0.md (v1.5)` — CS-D20 (Current Champions), CS-D16 (Defending Champion projection), CS-D8 (5 types), CS-D11 (RANK_XP deferred), CS-D22 (Firewall); `Comparison-Philosophy-Amendment-001` (CC-D3, CC-D4 badges); `Squad-Architecture-Amendment-001` (SA-D2 squad-level Current Champions surface).

**Amendment Log:** Initial. v1.0.

---

## 1. Screen Purpose

C-7 names the squad's **standing champions** — the most recent winner in each challenge category. It answers: **"Who currently holds each crown?"**

It is the live face of the **Defending Champion** projection (CS-D16/D20): for each category, the winner of the squad's most recent completed challenge of that category. Positive recognition only; squad-scoped; a **Challenge surface** (CS-D22). It is reached from C-1, and per SA-D2 a compact Current-Champions entry may also live on the squad surface (§10, with a Firewall constraint).

---

## 2. Layout

Navigation-stack screen entered from C-1. Top App Bar: back + title. Tab Bar visible.

```
┌─────────────────────────────────────────────────────────┐
│  [←]  Current Champions · [Squad Name]                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏅 Consistency Champion                          │   │
│  │    Maya — No Excuses June                   [ → ]│   │  → C-4
│  ├─────────────────────────────────────────────────┤   │
│  │ 🏅 Volume Champion                               │   │
│  │    Sam — Spring Shred                       [ → ]│   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🏅 Max Lift Champion                             │   │
│  │    Maya — Bench Wars                        [ → ]│   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🏅 Duration Champion                             │   │
│  │    Riley — Time Grind                       [ → ]│   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🏅 PR Champion                                   │   │
│  │    Maya — PR Hunt                           [ → ]│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**No XP Champion tile** — RANK_XP is deferred (CS-D11); the category does not appear until that contract exists.

---

## 3. Sections

### 3.1 Champion tile (one per category)
| Element | Rule |
|---|---|
| 🏅 + Category | Consistency / Volume / Max Lift / Duration / PR — mapped to the 5 shipping `ChallengeType`s |
| Holder | "[Name] — [winning challenge name]". **Co-champions** for ties: "[A] & [B]" |
| Affordance | Tappable → C-4 Final Standings of the challenge that crowned them |

### 3.2 Category → type mapping
| Tile | `ChallengeType` |
|---|---|
| Consistency Champion | `MOST_WORKOUTS` |
| Volume Champion | `MOST_VOLUME` |
| Max Lift Champion | `MAX_LIFT` |
| Duration Champion | `MOST_DURATION` |
| PR Champion | `MOST_PRS` |
| ~~XP Champion~~ | `RANK_XP` — **deferred, not rendered** |

### 3.3 "Standing" definition (resolves CS-D16 "comparable identity")
A category's current champion = the winner of the **most recently completed challenge of that `ChallengeType`** in the squad. This operationalizes CS-D16's vague "comparable identity" as **same type** (§11). No score is shown — recognition only (CC-D4); scores live on C-3/C-4.

---

## 4. Navigation

| Action | Destination |
|---|---|
| Back [←] | C-1 Challenge Hub (restores scroll) |
| Tap champion tile | C-4 Final Standings of the crowning challenge |
| Tab Bar | H-1 / L-1 / W-1 / Profile |

Entry: from C-1 ("View All" on the Current Champions preview); optionally from a squad-surface entry (SA-D2, §10).

---

## 5. Empty States

**No completed challenges in a category:** that category tile is **absent** (no "No champion yet" placeholder) — consistent with the project's absent-when-empty convention.

**No completed challenges at all:**
```
        [muted medal icon ~48dp]
        No champions yet
        Win a challenge to claim a crown.
```
- Invitational; no shame.

---

## 6. Edge States

| # | Case | Behavior |
|---|---|---|
| 6.1 | Co-winners of the crowning challenge | Co-champions named; tile → C-4 shared crown |
| 6.2 | Champion left the squad | Crown persists with their name until a newer challenge of that type completes (legacy permanence); see §11 note |
| 6.3 | New challenge of a category completes | Champion tile updates to the new winner on recompute (CS-D20) |
| 6.4 | Max Lift challenges with different target exercises | One Max Lift Champion = winner of the most recent `MAX_LIFT` challenge regardless of target exercise (§11 nuance) |
| 6.5 | Cancelled challenge | Never crowns anyone (no result) |
| 6.6 | Squad deleted | Champions removed with the squad |

---

## 7. Data Sources

- Most recent **`ChallengeResult`** per `ChallengeType` within `squadId` (the Defending Champion projection, CS-D16/D20).
- Winner(s) from `Challenge.winnerAthleteIds`; crowning challenge name from `Challenge`.
- No score read (recognition only).

---

## 8. Permission Rules

- **Any squad member may view** (squad-scoped). No public/cross-squad access.
- **Read-only for all.** Champions are system-derived; not editable.

---

## 9. Firewall Compliance

- [ ] C-7 is a Challenge surface; full champion list with crowning-challenge context lives here, never on S-1/S-2 member list/Limited Profile/check-ins (CS-D22).
- [ ] Squad-scoped query + membership gate.
- [ ] Recognition only (name + category + challenge) — **no scores, no ranks, no leaderboard** rendered here (those stay on C-3/C-4).
- [ ] Positive only; no "former champion dethroned" framing (CC-D3).

---

## 10. Downstream Impacts

- **SA-D2 squad-surface entry — RESOLVED (Squad-Architecture-Amendment-002).** Champion recognition (name/category/badge) is challenge-derived comparison data and **may not** be shown inline on always-on Squad surfaces (S-1 cards, S-2 list/header, Limited Profile, check-ins). S-1/S-2 may host only a **neutral, person-agnostic entry affordance** ("Champions ›") that names no member and shows no outcome, linking into C-7. C-7 ships reached from C-1 (and optionally that neutral S-1/S-2 affordance).
- Shares the Defending Champion projection with the badge system (CS-D16); a change to "standing" semantics affects both.
- Terminal read surface; no new write path.

---

## 11. Architecture Gaps / Clarifications Discovered

**Clarification A — "comparable identity" (CS-D16) operationalized as same `ChallengeType`. RATIFIED — CA2-D3.** A category's champion is the winner of the most recent completed challenge of that type; "comparable identity" = type-equality (Challenge-Architecture-Amendment-002 CA2-D3; CS-D16/D20 updated v1.2).

**Clarification B — Max Lift champion conflates target exercises.** One `MAX_LIFT` champion is crowned regardless of which exercise the challenge targeted (heaviest-bench winner and heaviest-deadlift winner compete for the same tile). MVP accepts this; a per-(type, targetExercise) refinement is a deferred enhancement (mirrors the C-6 Highest-Score nuance).

**Ruling C — squad-surface Current Champions vs. the Firewall. RESOLVED — Squad-Architecture-Amendment-002.** A champion title is challenge-derived win/comparison data (relative-by-construction, even without scores), so inline champion recognition is **barred** from all always-on Squad surfaces (SA2-D1). Only a neutral, person-agnostic entry affordance into C-7 is permitted (SA2-D2). The self-owned-vs-relative distinction is codified (SA2-D3): rank name/accomplishments are permitted on S-2 because they are non-relative; a champion title is not.

---

## Mobile UX
Portrait only; navigation-stack; Tab Bar visible. Champion tiles ≥ 64dp, tap targets ≥ 44dp. Calm/premium recognition (not flashy/confetti). Accessibility: tile = "[Category] Champion: [name(s)], from [challenge]. Double-tap for standings."

## Validation Checklist
- [ ] One tile per shipping category (Consistency/Volume/Max Lift/Duration/PR); no XP tile (deferred)
- [ ] Holder = most-recent winner of that type; co-champions on ties; tile → C-4
- [ ] Recognition only — no scores/ranks/leaderboard on C-7
- [ ] Empty category tiles absent; full-empty state invitational
- [ ] Departed champion retained until superseded
- [ ] Squad-scoped, read-only for all
- [ ] Firewall items (§9) satisfied; §11 squad-surface ruling left open and unbuilt
- [ ] Portrait; tap targets ≥ 44dp

## Change Log
| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Squad-scoped, read-only Current Champions: one tile per shipping `ChallengeType` (XP deferred), Defending Champion projection, co-champions, tiles → C-4, recognition-only (no scores). Operationalizes CS-D16 "comparable identity" as same-type (Clarification A); flags Max Lift target-exercise conflation (B) and the open SA-D2/Firewall ruling for any squad-surface entry (C). |

---
*Forge Legacy — Current Champions Wireframe Specification — C-7*
*v1.0 — June 2026 · Authority: Challenge-System-Architecture-v1.0.md (v1.5) (and governing Challenge amendments)*
*Status: Lock-ready (Clarification A ratified by Challenge-Architecture-Amendment-002; squad-surface Firewall ruling C resolved by Squad-Architecture-Amendment-002)*
