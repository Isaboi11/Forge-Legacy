# Forge Legacy — Challenge Detail Wireframe Specification
## C-3 | Challenge System | v1.1 — June 2026

**Status:** Lock-ready

**Type:** Screen Wireframe Specification

**Authority:** `Challenge-System-Architecture-v1.3.md` — CS-D5 (lifecycle), CS-D7 (enrollment/withdraw), CS-D8–D12 (scoring/leaderboard), CS-D13 (Rules), CS-D15 (tie-break/co-winners), CS-D16 (badges), CS-D21 (feed/notifications), CS-D22 (Firewall), CS-D27 (participation streak); `Challenge-Architecture-Amendment-003` v1.1 (CA3-D6/D10 — roster-scoped); `Comparison-Philosophy-Amendment-001` (CC-D1–D4); `P-5-Amendment-001` (Challenge notifications); S-2 §5.5 (Limited Athlete Profile, reused for member taps).

**Amendment Log:** v1.1 — "squad-scoped" framing generalized to **roster-scoped** for both SQUAD and FRIENDS contexts (CA3-D6/D10). v1.0 initial.

> **v1.1 reconciliation note (CA3-D6/D10):** C-3 serves both `context = SQUAD` and `context = FRIENDS` challenges identically. Everywhere this spec says "squad-scoped," read **roster-scoped**: the leaderboard, Rules, feed, Join/Leave, and Limited-Athlete-Profile row-tap behave the same; only the **roster source** differs (squad members vs. the creator's invited accepted Friends). The same Firewall, the same positive framing, and the same anti-shame guardrails apply. For FRIENDS challenges the visibility scope is the invited/participant set (there are no non-participant squad viewers); a friend challenge has **no always-on surface**. No layout change.

---

## Preamble: What C-3 Is For

C-3 is the heart of a single challenge. It answers: **"How is this competition going, and how do I take part?"**

C-3 is a **Challenge surface** — the place where the leaderboard, standings, and feed legitimately live (CS-D22). It is one screen with three faces, driven by challenge state: **ENROLLMENT** (join/leave, roster forming), **ACTIVE** (live leaderboard + feed), **COMPLETED** (frozen standings → C-4). Every face holds the line: squad-scoped, positive-framed, non-participation invisible, no failure surfaced.

---

## Section 1 — C-1 Goals

1. **Identify the challenge** — name, type, duration, participant count.
2. **Show the system Rules** — scoring, eligibility, tie-breaker (CS-D13).
3. **Enable opt-in / opt-out** — Join (ENROLLMENT) and Leave (ENROLLMENT or ACTIVE), the latter silent (CS-D3).
4. **Show the live leaderboard** (ACTIVE) — participants only, positive framing.
5. **Show the bounded Challenge Feed** — in-app, squad-scoped activity log (CS-D21).
6. **Route to final results** (COMPLETED) → C-4.

**What C-3 does NOT do:**
- Show any non-participant's standing, or that anyone declined.
- Surface any member's training performance outside this challenge.
- Provide any cross-squad or public view.

---

## Section 2 — Information Hierarchy

**TIER 1 — Header** (name, type, state/countdown, participant count) → **TIER 2 — Primary action** (Join / Leave / View Results, state-dependent) → **TIER 3 — Rules** (collapsible, system-generated) → **TIER 4 — Leaderboard** (ACTIVE/COMPLETED) → **TIER 5 — Challenge Feed** (bounded).

---

## Section 3 — Full Scroll Order (by state)

### 3.1 ACTIVE
```
┌─────────────────────────────────────────────────────────┐
│  [←]  No Excuses June                            [⋯]    │
├─────────────────────────────────────────────────────────┤
│  Most Workouts · Weekly                                 │
│  Ends in 4 days · 5 competing                           │
│  [Current Leader: Maya 🏅]                              │
│                                                         │
│  RULES  ▸ (tap to expand)                               │
│                                                         │
│  LEADERBOARD                                            │
│  1  Maya            12 workouts                         │
│  2  You             10 workouts        ← neutral highlight
│  3  Sam              9 workouts                         │
│  4  Jordan           7 workouts                         │
│  5  Riley            5 workouts                         │
│                                                         │
│  CHALLENGE FEED                                         │
│  · Maya took the lead · 2h ago                          │
│  · Sam logged a new PR · 5h ago                         │
│  · Challenge started · 3 days ago                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 ENROLLMENT
```
┌─────────────────────────────────────────────────────────┐
│  [←]  Bench Wars                                 [⋯]    │
├─────────────────────────────────────────────────────────┤
│  Max Lift · Barbell Bench Press · Monthly                │
│  Starts in 2 days · 3 joined                            │
│                                                         │
│  [            Join Challenge            ]   ← Primary    │
│                                                         │
│  RULES  ▸                                               │
│                                                         │
│  WHO'S IN  (3)                                          │
│  [👤] Sam   [👤] Maya   [👤] Jordan                     │
│                                                         │
│  CHALLENGE FEED                                         │
│  · Jordan joined · 1h ago                               │
│  · Challenge created by Sam · 1 day ago                 │
└─────────────────────────────────────────────────────────┘
```

### 3.3 COMPLETED (summary; full standings on C-4)
```
┌─────────────────────────────────────────────────────────┐
│  [←]  Spring Shred                               [⋯]    │
├─────────────────────────────────────────────────────────┤
│  Most Volume · Monthly · Ended Jun 1                    │
│  🏆 Winner: John                                        │
│                                                         │
│  [          View Final Standings          ]  → C-4      │
│                                                         │
│  RULES  ▸                                               │
│  CHALLENGE FEED  (final)                                │
│  · Challenge completed · Jun 1                          │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:** back [←] → C-1; title = challenge name; [⋯] options (§7.3).

---

## Section 4 — Header

- Name (22–24sp), type line ("[Type] · [target exercise if Max Lift] · [duration]"), state/countdown line, participant count ("[X] competing" ACTIVE / "[X] joined" ENROLLMENT).
- ACTIVE: optional **Current Leader** chip (derived badge, CC-D4).
- COMPLETED: **🏆 Winner: [Name]** (or "Co-winners: [A], [B]" for ties, CS-D15).

---

## Section 5 — Primary Action (state-dependent)

| State | Action | Behavior |
|---|---|---|
| ENROLLMENT, not joined | **Join Challenge** (Primary) | Creates `ChallengeParticipant`; CTA → "Leave Challenge" (secondary/destructive-neutral) |
| ENROLLMENT, joined | **Leave Challenge** | Silent withdrawal (CS-D3); confirmation "Leave this challenge?"; no marker left |
| ACTIVE, participant | **Leave Challenge** ([⋯] or inline) | Silent withdrawal; removed from leaderboard, no "quit" marker; cannot rejoin (roster locked) |
| ACTIVE, non-participant | (none) | Roster locked at start — cannot join. No "you missed it" copy; just no Join affordance |
| COMPLETED | **View Final Standings** → C-4 | — |

**Join confirmation copy (neutral):** "Join [name]? You'll appear on the leaderboard for this challenge." **Leave copy:** "Leave [name]? You'll be removed from the standings." — no penalty language.

---

## Section 6 — Rules, Leaderboard, Feed

### 6.1 Rules (collapsible, system-generated — CS-D13)
Collapsed by default ("RULES ▸"). Expands to Scoring Method / Eligibility / Tie-breaker, generated from `type`. Read-only.

### 6.2 Leaderboard (ACTIVE & COMPLETED)
- **Participants only**, ordered by `score` desc (CS-D12). Row: rank, name, score (in the metric's unit — workouts / volume / lbs·kg for Max Lift / duration / PR count).
- **Athlete's own row** gets a neutral highlight (not celebratory, not alarming). The lowest row shows its rank and score with **no "last," no deficit, no alarm color** (CC-D3 / CS-D12).
- **Non-participants** viewing ACTIVE see the leaderboard (squad-scoped data) but are **not** in it and see no "join" pressure or "you're not here" note.
- Tapping a leaderboard row opens the **S-2 Limited Athlete Profile** modal (reused; performance-free) — identity only, never challenge or training stats beyond the leaderboard score already shown in-context.
- Accuracy as-of load (MVP; CS-D12).

### 6.3 Challenge Feed (bounded — CS-D21)
- In-app, squad-scoped activity log on this surface only. Events: Created, Joined, Started, New Leader, New PR, Completed.
- **Bounded** — chronological, capped/most-recent (no infinite scroll, no algorithm), consistent with the DNA "no feeds" exception logic. It never leaves this Challenge surface (Firewall) and is not a product-wide feed.
- Feed entries are neutral ("Maya took the lead"), never failure-framed ("you fell behind").

---

## Section 7 — Navigation Paths

| Action | Destination |
|---|---|
| Back [←] | C-1 Challenge Hub (restores scroll) |
| Join / Leave | Confirmation → applies → stays on C-3 (state/CTA refresh) |
| Tap leaderboard row | S-2 Limited Athlete Profile modal (read-only, performance-free) |
| View Final Standings (COMPLETED) | C-4 Challenge Results |
| [⋯] options | Leave Challenge (if participant); Cancel Challenge (creator/Owner, pre-COMPLETED); §7.3 |
| Tab Bar | H-1 / L-1 / W-1 / Profile |

### 7.3 [⋯] Options
- **Leave Challenge** — participant only (silent).
- **Cancel Challenge** — creator or squad Owner only, pre-COMPLETED (CS-D6); destructive confirmation; cancelling produces no result/winner/marker (CS-D5).
- No "remove participant" action exists for anyone (CS-D6).

---

## Section 8 — State Rules

| Transition | C-3 behavior |
|---|---|
| ENROLLMENT → ACTIVE (at `startAt`) | Roster locks; Join affordance disappears for non-participants; leaderboard appears |
| ACTIVE → COMPLETED (at `endAt`) | Scoring freezes; header shows Winner/Co-winners; primary action → View Final Standings |
| Participant withdraws | Removed from leaderboard immediately; no marker; their feed "joined" entry remains factual but no "left" entry is added |
| <2 participants at start, or all withdraw | Auto-CANCEL (CS-D5); C-3 resolves to C-1 with challenge gone (silent) |
| Co-winner tie | Header lists all co-winners; C-4 shows shared 1st (CS-D15) |

---

## Section 9 — Empty / Error / Edge States

| # | Case | Behavior |
|---|---|---|
| 9.1 | ENROLLMENT, only creator-era, 0 joined | "WHO'S IN (0)" with gentle "Be the first to join." No shame. |
| 9.2 | ACTIVE, no qualifying activity yet | Leaderboard shows all participants at 0, tie order by enrollment; no "nobody trained" banner (CS-D3) |
| 9.3 | Non-participant opens ACTIVE challenge | Sees leaderboard + feed; no Join (roster locked); no standing; no decline marker |
| 9.4 | Participant who withdrew reopens C-3 | Sees challenge as a non-participant; no "you left" banner |
| 9.5 | Challenge cancelled while viewing | Resolve to C-1; challenge absent; no tombstone |
| 9.6 | Tie at completion | Co-winners shown; never a tiebreak that manufactures a single loser |
| 9.7 | Member leaves squad mid-challenge | Silently withdrawn (CS-D23); their row drops from leaderboard, no marker |
| 9.8 | Push toggle OFF | C-3 still shows full leaderboard/feed in-app (toggles control push only, P-5 §4) |

---

## Section 10 — Firewall & Anti-Shame Compliance

- [ ] Leaderboard, standings, feed appear only on this Challenge surface; never echoed to S-1/S-2 member list/Limited Profile/check-ins (CS-D22).
- [ ] Leaderboard row tap opens the performance-free Limited Athlete Profile — no training/challenge stats injected into it.
- [ ] No "last," deficit, or alarm styling on any standing; lowest participant framed neutrally.
- [ ] Non-participation invisible: no Join pressure for locked-out members, no decline marker, no "you left."
- [ ] Withdrawal silent; no "quit/DNF" entry.
- [ ] Co-winners on ties; no manufactured single loser.
- [ ] Feed bounded, neutral, squad-scoped, never product-wide.

---

## Section 11 — Mobile UX

- Portrait only; navigation-stack; Tab Bar visible.
- Tap targets ≥ 44dp; Join/Leave/View CTAs full-width ≥ 56dp; leaderboard rows ≥ 56dp; Rules expand row ≥ 44dp.
- Own leaderboard row: neutral accent (not the alarm/positive extremes), matching S-2's calm treatment of presence states.
- Accessibility: leaderboard row = "[Rank], [Name], [Score]. Double-tap for profile." CTA labels explicit. Feed entries read in order.

---

## Section 12 — Validation Checklist

- [ ] Three state faces: ENROLLMENT (Join/Who's-in), ACTIVE (leaderboard/feed), COMPLETED (winner + View Final Standings → C-4)
- [ ] Header shows name, type (Max Lift target exercise), duration, countdown, participant count; winner/co-winners on completion
- [ ] Join (enrollment) / Leave (enrollment or active, silent) per CS-D7; roster locks at start; no rejoin
- [ ] Non-participant: leaderboard visible, no Join when locked, no standing, no decline marker
- [ ] Rules collapsible, system-generated, read-only
- [ ] Leaderboard participants-only, positive-framed, own-row neutral highlight, row → Limited Profile
- [ ] Challenge Feed bounded/neutral/squad-scoped
- [ ] [⋯]: Leave (participant); Cancel (creator/Owner, pre-completion); no remove-participant
- [ ] Co-winners on ties; auto-cancel <2 participants resolves silently to C-1
- [ ] Firewall + anti-shame items (§10) satisfied
- [ ] Push-OFF still shows in-app leaderboard/feed
- [ ] Portrait; tap targets ≥ 44dp

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | Participant-based reconciliation (CA3-D6/D10): "squad-scoped" framing generalized to **roster-scoped**; C-3 serves SQUAD and FRIENDS challenges identically (same leaderboard/Rules/feed/Join-Leave/Firewall; roster source differs). Cancel is creator-only for FRIENDS (no squad Owner). Authority updated to v1.3. No layout change. |
| 1.0 | June 2026 | Initial. Single state-driven detail screen (ENROLLMENT/ACTIVE/COMPLETED): header, system Rules, participants-only positive-framed live leaderboard (row→Limited Profile), bounded Challenge Feed, opt-in Join / silent Leave, roster-lock behavior, co-winner handling, creator/Owner Cancel, COMPLETED→C-4. Full Firewall + anti-shame compliance. |

---

*Forge Legacy — Challenge Detail Wireframe Specification — C-3*
*v1.1 — June 2026 (roster-scoped: SQUAD + FRIENDS)*
*Authority: Challenge-System-Architecture-v1.0.md (v1.5), Challenge-Architecture-Amendment-003 v1.1 (and governing Challenge amendments)*
*Status: Lock-ready*
