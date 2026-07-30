# Forge Legacy — Challenge Results Wireframe Specification
## C-4 | Challenge System | v1.1 — June 2026

**Status:** Lock-ready

**Type:** Screen Wireframe Specification

**Authority:** `Challenge-System-Architecture-v1.3.md` — CS-D5 (COMPLETED/ARCHIVED), CS-D14 (final standings, immutable `ChallengeResult`), CS-D15 (tie-break/co-winners), CS-D16 (badges), CS-D17–D20 (archive, Hall, Records, Current Champions), CS-D22 (Firewall), CS-D24 (Honors), CS-D27 (participation streak); `Challenge-Architecture-Amendment-003` v1.1 (CA3-D8/D10 — roster-scoped; friend results participant-visible + honor-bearing); `Comparison-Philosophy-Amendment-001` (CC-D3 anti-shame, CC-D4 badges); `Honor-Catalog-Amendment-001` (challenge honors surface in-app, not pushed).

**Amendment Log:** v1.1 — "squad-scoped legacy" framing generalized to **roster-scoped**; friend-challenge results are permanent + participant-visible + honor-bearing but feed **no** squad-legacy surfaces (CA3-D8/D10). v1.0 initial.

> **v1.1 reconciliation note (CA3-D8/D10):** C-4 renders the immutable `ChallengeResult` for both `context = SQUAD` and `context = FRIENDS`. The winner crown, standings, badges, and generic Honors note are identical. **For SQUAD context**, C-4 links into squad legacy (Hall of Champions / Squad Records / Current Champions) as written. **For FRIENDS context**, those squad-legacy links are **absent** — friend challenges do not populate squad-legacy surfaces (CA3-D8) — but the result is still **permanent and visible to its participants** (via the participant-scoped Challenge Hub, C-1) and **still feeds account-level Honors** (Wins/Participation; participation streak excluded, CA3-D9). Read "squad-scoped legacy" as **roster-scoped result**. No layout change beyond the conditional presence of the squad-legacy links.

---

## Preamble: What C-4 Is For

C-4 is the permanent record of a finished challenge. It answers: **"Who won, and where did everyone land?"**

C-4 renders the immutable `ChallengeResult` (CS-D14): the winner(s) crowned, the final standings, and the badges that follow. It is **read-only and permanent** — challenge results "remain permanently accessible" as squad legacy (CS-D17). It is positive by construction: it celebrates a winner and records participation; it never dramatizes a loser (CC-D3).

C-4 is also the hinge into the squad's competitive legacy — it feeds and links to Hall of Champions (C-5), Squad Records (C-6), and Current Champions (C-7).

---

## Section 1 — C-4 Goals

1. **Crown the winner(s)** — single winner or co-winners (CS-D15).
2. **Show final standings** — every (non-withdrawn) participant, ranked, positive-framed.
3. **Surface resulting recognition** — challenge badges (CC-D4) and a note that any earned Honors are on the athlete's record (in-app, not pushed).
4. **Link to legacy** — Hall of Champions (C-5).

**What C-4 does NOT do:**
- Label, color, or single out a "loser" / "last place."
- Show withdrawn participants or anyone who didn't join.
- Mutate — results are frozen at completion; later imported history never alters them (CS-D17 / edge 15.8).

---

## Section 2 — Information Hierarchy

**TIER 1 — Winner crown** (winner or co-winners) → **TIER 2 — Final standings** (ranked participants) → **TIER 3 — Recognition** (badges + honors note) → **TIER 4 — Legacy links** (Hall of Champions).

---

## Section 3 — Full Scroll Order

Navigation-stack screen entered from C-3 (COMPLETED) or C-1/C-5. Top App Bar: back + name.

```
┌─────────────────────────────────────────────────────────┐
│  [←]  Spring Shred · Final Standings                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│            🏆                                           │
│         Winner: John                                    │
│         Most Volume · Monthly · Ended Jun 1             │
│                                                         │
│  FINAL STANDINGS                                        │
│  1  🏆 John          184,200 lb                         │
│  2     Maya          171,050 lb                         │
│  3     You           160,400 lb       ← neutral highlight
│  4     Sam           142,900 lb                         │
│                                                         │
│  RECOGNITION                                            │
│  🏅 John — Defending Champion (Volume)                  │
│  Honors from this challenge appear on each              │
│  athlete's record.                                      │
│                                                         │
│  [  Hall of Champions  › ]                              │  → C-5
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Section 4 — Winner Crown

- **Single winner:** "🏆 Winner: [Name]" with type/duration/end-date subline.
- **Co-winners (tie, CS-D15):** "🏆 Co-Winners: [A] & [B]" — shared first place, equal treatment. No tiebreak invents a sole winner.
- **Zero-winner edge** (e.g., all withdrew before completion → auto-cancel, so this rarely reaches C-4; if a completed challenge had all-zero scores, co-winner/tie rules apply per CS-D15). C-4 never shows "no winner / everybody failed."

---

## Section 5 — Final Standings

- Renders `ChallengeResult` standings (CS-D14): every non-withdrawn participant, ranked, with `finalScore` in the metric's unit.
- **Winner row** carries the 🏆; **the athlete's own row** carries a neutral highlight.
- **Lowest row** shows its rank and score with **no "last," no deficit, no alarm color** (CC-D3). Finishing 4th of 4 is stated as "4 · [Name] · [score]" — a placement, not a failure.
- **Withdrawn participants and non-joiners do not appear** (CS-D3 / CS-D14). Standings reflect the locked roster minus silent withdrawals.
- Row tap → S-2 Limited Athlete Profile (read-only, performance-free), consistent with C-3.

---

## Section 6 — Recognition

### 6.1 Badges (derived, CC-D4)
- Shows resulting derived badges (e.g., "Defending Champion (Volume)", "Multi-Time Winner"). Squad-scoped, positive only. No "runner-up" or negative badge.

### 6.2 Honors note (CS-D24 / Honor-Catalog-Amendment-001)
- A neutral line: "Honors from this challenge appear on each athlete's record." Challenge honors (First Victory, Wins, Participation, Participation Streak) are awarded to the individual's permanent record and **surface in-app (L-10 / M-2 rules), never as a push.** C-4 does not enumerate another athlete's honors (that would cross into their record).

### 6.3 Participation streak (CS-D27)
- ~~The challenge's completion does not itself display streaks here; participation streaks are personal stats feeding honors. No squad-surface streak comparison (Firewall).~~ **AMENDED by CA7-D2 (`Challenge-Architecture-Amendment-007-Runners-Up-And-Streak.md`, PD-7 ruling).** Longest Streak ships as a derived badge, defined within the season's own window: a day counts when the athlete saved at least one workout on it in the challenge's timezone; a streak is a maximal run of consecutive counting days; streaks of 1 are not reported. An all-time streak remains out of scope for CS-D19's record book, for a different reason — no stable cross-history definition exists — so the two decisions do not conflict. The Firewall's roster-scoping is unweakened: this stays on the Challenge surface and is never echoed to S-1/S-2/Limited Profile/check-ins.

---

## Section 7 — Navigation Paths

| Action | Destination |
|---|---|
| Back [←] | Origin (C-3 COMPLETED, C-1, or C-5) — restores scroll |
| Tap standings row | S-2 Limited Athlete Profile modal (read-only) |
| "Hall of Champions ›" | C-5 Hall of Champions |
| Tab Bar | H-1 / L-1 / W-1 / Profile |

C-4 is reachable from C-3 (View Final Standings), C-1 (Past Challenges), and C-5 (tap an archived challenge).

---

## Section 8 — State Rules

| Condition | Behavior |
|---|---|
| `ChallengeResult` exists (COMPLETED/ARCHIVED) | C-4 renders frozen standings + winner(s) |
| Single winner | One 🏆 row |
| Co-winners | Multiple shared-1st rows, equal styling |
| Later imported history | Does **not** alter the displayed result (immutability, CS-D17) |
| CANCELLED challenge | Has no `ChallengeResult` → C-4 is never shown for it |

---

## Section 9 — Empty / Error / Edge States

| # | Case | Behavior |
|---|---|---|
| 9.1 | Tie for 1st | Co-winners, shared crown (CS-D15) |
| 9.2 | All participants scored 0 | Tie rules → co-winners (or all-tied); never "no winner / all failed" copy |
| 9.3 | A participant withdrew before completion | Absent from standings; no "withdrew" marker |
| 9.4 | Athlete viewing finished last | Neutral placement row; no shame styling, no deficit |
| 9.5 | Non-participant opens C-4 | Sees standings (squad-scoped legacy); not in them; no "you didn't join" note |
| 9.6 | Squad deleted | Result removed per squad-deletion data rules; otherwise permanent |
| 9.7 | Honors still evaluating | Honors note is generic ("appear on each athlete's record"); C-4 doesn't block on honor evaluation |

---

## Section 10 — Firewall & Anti-Shame Compliance

- [ ] Standings/winner/badges appear only on this Challenge surface; never echoed to S-1/S-2 member list/Limited Profile/check-ins (CS-D22).
- [ ] Lowest finisher framed as a placement; no "last," deficit, or alarm styling (CC-D3).
- [ ] Withdrawn participants and non-joiners absent; no decline/quit markers.
- [ ] Co-winners on ties; never a manufactured sole loser.
- [ ] Badges positive-only (CC-D4); no runner-up/negative badge.
- [ ] Honors note is generic; C-4 never enumerates another athlete's honor record.
- [ ] Results immutable; later data never rewrites them.

---

## Section 11 — Mobile UX

- Portrait only; navigation-stack; Tab Bar visible.
- Winner crown is calm/premium, not confetti-loud (DNA brand personality: not flashy).
- Tap targets ≥ 44dp; standings rows ≥ 56dp; "Hall of Champions" row ≥ 44dp.
- Own row: neutral highlight (consistent with C-3 / S-2 calm treatment).
- Accessibility: standings row = "[Rank], [Name], [score]. Double-tap for profile." Winner announced first.

---

## Section 12 — Validation Checklist

- [ ] Renders immutable `ChallengeResult`: winner(s) + full standings (non-withdrawn participants only)
- [ ] Single winner and co-winner (tie) layouts; never a manufactured sole loser
- [ ] Lowest finisher = neutral placement; no "last"/deficit/alarm
- [ ] Withdrawn / non-joiners absent; no markers
- [ ] Badges positive-only (CC-D4); honors note generic, in-app (no push), never enumerates others' records *(Longest Streak added by CA7-D2 — still positive-only.)*
- [ ] Standings row → performance-free Limited Profile
- [ ] "Hall of Champions ›" → C-5; reachable from C-3/C-1/C-5
- [ ] Immutable — later imported history doesn't alter results
- [ ] CANCELLED challenges never reach C-4
- [ ] Firewall + anti-shame items (§10) satisfied
- [ ] Portrait; calm winner treatment; tap targets ≥ 44dp

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | Participant-based reconciliation (CA3-D8/D10): "squad-scoped legacy" generalized to **roster-scoped result**; serves SQUAD + FRIENDS identically (winner/standings/badges/Honors note). Squad-legacy links (Hall/Records/Champions) present for SQUAD only; FRIENDS results permanent + participant-visible + honor-bearing (streak excluded). Authority updated to v1.3. |
| 1.0 | June 2026 | Initial. Permanent, read-only final-standings screen: winner/co-winner crown, positive-framed full standings (withdrawn/non-joiners absent, lowest = neutral placement), derived badges (CC-D4), generic in-app honors note (no push), → Hall of Champions (C-5). Immutable per CS-D17; full Firewall + anti-shame compliance. |

---

*Forge Legacy — Challenge Results Wireframe Specification — C-4*
*v1.1 — June 2026 (roster-scoped: SQUAD + FRIENDS)*
*Authority: Challenge-System-Architecture-v1.0.md (v1.5), Challenge-Architecture-Amendment-003 v1.1 (and governing Challenge amendments)*
*Status: Lock-ready*
