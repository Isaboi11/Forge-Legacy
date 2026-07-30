# Forge Legacy — Hall of Champions Wireframe Specification
## C-5 | Challenge System | v1.0 — June 2026

**Status:** Lock-ready

**Type:** Screen Wireframe Specification

**Authority:** `Challenge-System-Architecture-v1.0.md (v1.5)` — CS-D17 (archive permanence), CS-D18 (Hall of Champions), CS-D14/D15 (immutable results, co-winners), CS-D22 (Firewall); `Comparison-Philosophy-Amendment-001` (CC-D3 anti-shame, CC-D4 badges); C-4 (result detail target).

**Amendment Log:** Initial. v1.0.

---

## 1. Screen Purpose

C-5 is the squad's permanent competitive history. It answers: **"What has our squad competed in, and who won?"**

It is a read-only, squad-scoped, chronological roll of every **ARCHIVED** challenge with its winner(s) — the squad's legacy of competition (CS-D17/D18). It celebrates winners; it records no losers. It is a **Challenge surface** (CS-D22): it may display challenge results because it is reached through the Challenge context, never echoed onto S-1/S-2.

---

## 2. Layout

Navigation-stack screen entered from C-1 (or C-4). Top App Bar: back + title. Tab Bar visible.

```
┌─────────────────────────────────────────────────────────┐
│  [←]  Hall of Champions · [Squad Name]                  │
├─────────────────────────────────────────────────────────┤
│  2026                                                   │  ← year group label
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏆 Spring Shred            Most Volume           │   │  ← result row
│  │ Winner: John · Ended Jun 1                  [ → ]│   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏆 Bench Wars              Max Lift · Bench       │   │
│  │ Co-Winners: Sam & Maya · Ended May 12       [ → ]│   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏆 No Excuses January      Most Workouts         │   │
│  │ Winner: Isaiah · Ended Jan 31               [ → ]│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**Above the fold (375×812):** the most recent result row fully visible.

---

## 3. Sections

### 3.1 Result row
| Element | Rule |
|---|---|
| 🏆 + Name | Challenge name, primary. Wraps to 2 lines. |
| Type label | "[Type] · [target exercise if Max Lift]" |
| Winner line | "Winner: [Name]" or **"Co-Winners: [A] & [B]"** for ties (CS-D15). 3+ co-winners: "Co-Winners: [A], [B], +N". |
| End date | "Ended [date]" |
| Affordance | Whole row tappable → C-4 Final Standings |

### 3.2 Grouping
- Chronological, **most recent first**, grouped by **year** (lightweight label). No type filters in MVP.

### 3.3 Positive-only
- ~~Only winners are named. No "runner-up," no per-challenge loser, no "X never won" (CC-D3).~~ **AMENDED by CA7-D1 (`Challenge-Architecture-Amendment-007-Runners-Up-And-Streak.md`, PD-7 ruling).** Each card names 2nd and 3rd in a podium strip, bounded at the top three so no card ever shows a last place. "X never won" copy remains barred, as does any deficit framing.

---

## 4. Navigation

| Action | Destination |
|---|---|
| Back [←] | C-1 Challenge Hub (restores scroll) |
| Tap result row | C-4 Challenge Results for that challenge |
| Tab Bar | H-1 / L-1 / W-1 / Profile |

Entry to C-5: from C-1 ("Hall of Champions ›") and from C-4 ("Hall of Champions ›").

---

## 5. Empty States

**No archived challenges yet:**
```
        [muted trophy icon ~48dp]
        No champions yet
        Completed challenges and their winners
        will live here.
```
- Invitational, not shaming. No "your squad has never competed." No CTA here (creation lives on C-1).

---

## 6. Edge States

| # | Case | Behavior |
|---|---|---|
| 6.1 | Co-winners | "Co-Winners: A & B"; row → C-4 shared crown |
| 6.2 | Cancelled challenge | Never appears (no `ChallengeResult`, CS-D5) |
| 6.3 | Winner later left the squad | Name retained — results are immutable legacy (CS-D17). No de-emphasis, no removal. |
| 6.4 | All-zero-score completion | Resolved by co-winner/tie rules; shown as a normal won challenge, never "no winner" |
| 6.5 | Very long history | Lazy-load/paginate on scroll (implementation); no cap on legacy depth |
| 6.6 | Squad deleted | Hall removed with the squad per squad-deletion data rules; otherwise permanent |

---

## 7. Data Sources

- **`ChallengeResult`** (immutable) filtered by `squadId`, state ARCHIVED, ordered by end date desc.
- Winner(s) from `Challenge.winnerAthleteIds`.
- No live scoring read; results are frozen snapshots (CS-D14).

---

## 8. Permission Rules

- **Any member of the squad may view** (squad-scoped visibility). Non-members have no access path (no public/cross-squad route).
- **Read-only for everyone** — no edit, delete, or re-open of historical results, including for the squad Owner or original creator. History is immutable.

---

## 9. Firewall Compliance

- [ ] C-5 is a Challenge surface; its result rows never appear on S-1 cards, S-2 member list, Limited Profile, or check-ins (CS-D22).
- [ ] Squad-scoped query (`squadId` + membership gate); no public/cross-squad path.
- [x] ~~Winners only; no loser/runner-up/"never won" surfaced (CC-D3).~~ **AMENDED by CA7-D1** — 2nd and 3rd are named; nothing beyond the podium, and no "never won" copy.
- [ ] Row tap routes to C-4 (also a Challenge surface); identity taps there use the performance-free Limited Profile.

---

## 10. Downstream Impacts

- **Feeds nothing new** — C-5 is a terminal read surface over `ChallengeResult`.
- **Depends on C-4** as its row destination; on C-1 and C-4 as its entry points.
- Shares the **immutable-result** contract with C-4 (later imports never rewrite history, CS-D17).

---

## Mobile UX
Portrait only; navigation-stack; Tab Bar visible. Rows ≥ 72dp, tap targets ≥ 44dp. Calm/premium treatment (not flashy). Accessibility: row = "[Challenge], [type], won by [name(s)], ended [date]. Double-tap for standings."

## Validation Checklist
- [ ] Chronological (newest first), year-grouped list of ARCHIVED results
- [ ] Row: name, type (Max Lift target), winner/co-winners, end date; → C-4
- [ ] Co-winner display supported
- [ ] Cancelled challenges absent; departed winners retained (immutable)
- [ ] Empty state invitational; no shame copy
- [ ] Squad-scoped, read-only for all (incl. Owner)
- [ ] Firewall items (§9) satisfied
- [ ] Portrait; tap targets ≥ 44dp

## Change Log
| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Squad-scoped, read-only, chronological Hall of Champions over immutable `ChallengeResult`; winners/co-winners only; rows → C-4; entered from C-1/C-4. Firewall + anti-shame compliant. |

---
*Forge Legacy — Hall of Champions Wireframe Specification — C-5*
*v1.0 — June 2026 · Authority: Challenge-System-Architecture-v1.0.md (v1.5) (and governing Challenge amendments)*
*Status: Lock-ready*
