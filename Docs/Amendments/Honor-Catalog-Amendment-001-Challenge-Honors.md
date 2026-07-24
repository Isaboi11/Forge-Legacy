# Forge Legacy — Honor Catalog Amendment 001
## Challenge Honors & the Challenge Completion Trigger
### June 2026

**Status:** LOCKED (catalog additions); evaluation-pipeline extension defined

**Type:** Honor System Amendment (reopens the locked catalog to add one honor family and one new trigger source. Routed through the established Honors expansion governance. Does not change any existing honor type, threshold, or architecture decision.)

**Target documents:** `Honor-Catalog-v1.0-LOCKED.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `HonorInstance-Architecture-v1.0.md`

**Authority:** Comparison-Philosophy-Amendment-001.md (LOCKED) — CC-D1 (Consenting Competition Context), CC-D4 (badges ≠ honors), CC-D5 (no Rank impact); Honor Catalog AD-7 (no catalog visibility to athlete), AD-27 (honors do not contribute to rank); Honor Evaluation Service §2–§3 (event-specific, immediate, post-event evaluation against finalized state); the existing COMMUNITY category (types 47–49) as the structural precedent for a relationship-context honor family.

**Amendment Log:** v1.1 — added Participation Streak honor family (HC-D4) per faithfulness-audit remediation. v1.0 LOCKED initial.

---

## Purpose

The approved Challenge System requires "Honors integration" — permanent recognition for challenge milestones (First Victory, repeated wins, veteran participation). The Honor Catalog is LOCKED at 53 types across 7 categories and has no challenge-derived honors, and the Honor Evaluation Service has no challenge trigger (its trigger sources are Session Save, Goal Completion, Program Graduation, WwF, Import/Sync).

This amendment adds **one honor family** and **one new trigger source**, reusing the existing event-driven pipeline pattern verbatim. It changes no existing honor and introduces no rank effect. Per CC-D4, ephemeral challenge *badges* are explicitly **not** in scope here — they are status indicators owned by the Challenge architecture, not Honors.

---

## Decision HC-D1 — New Category: COMPETITION

### Statement

**Locked:** A new honor category, **COMPETITION**, is added. It recognizes durable, cumulative milestones from participating and succeeding in Consenting Competition Contexts. Honors are awarded to the **individual athlete's permanent record** (account-wide cumulative across all squads), consistent with every other catalog category — they are never squad-scoped leaderboard artifacts.

### Rules

1. COMPETITION honors are **permanent and account-cumulative** (like COMMUNITY's WwF counts), not per-challenge or per-squad.
2. They obey **AD-7** (catalog never surfaced to the athlete as a checklist), **AD-27 / CC-D5** (no contribution to Rank), and **AD-33** (dual date fields: `dateEarned` / `awardedAt`).
3. **CC-D4 boundary:** these permanent honors are distinct from ephemeral challenge badges. A badge ("Current Leader") is transient and squad-scoped; an honor ("First Victory") is permanent and recorded to the athlete's legacy.
4. **CC-D3 guardrail:** there are **no negative honors** — nothing is awarded or recorded for losing, placing last, or quitting. Participation-based honors (HC-D1 below) count *showing up*, never *outcomes failed*.

### Proposed COMPETITION honor types (initial family)

Numbered continuing from the locked catalog's final type (53). Final numbering confirmed at catalog re-lock.

| # | honorType | Display Name | Qualification | Family |
|---|-----------|-------------|---------------|--------|
| 54 | `first_challenge_won` | First Victory | `challenges_won_count` ≥ 1 | Wins |
| 55 | `challenges_won_10` | 10 Challenge Wins | `challenges_won_count` ≥ 10 | Wins |
| 56 | `challenges_won_25` | 25 Challenge Wins | `challenges_won_count` ≥ 25 | Wins |
| 57 | `first_challenge_joined` | First Challenge Entered | `challenges_entered_count` ≥ 1 | Participation |
| 58 | `challenges_entered_10` | 10 Challenges Entered | `challenges_entered_count` ≥ 10 | Participation |
| 59 | `challenges_entered_25` | Challenge Veteran | `challenges_entered_count` ≥ 25 | Participation |
| 60 | `challenge_streak_3` | 3-Challenge Streak | `max_participation_streak` ≥ 3 | Participation Streak |
| 61 | `challenge_streak_5` | 5-Challenge Streak | `max_participation_streak` ≥ 5 | Participation Streak |
| 62 | `challenge_streak_10` | 10-Challenge Streak | `max_participation_streak` ≥ 10 | Participation Streak |

**Family logic, mirroring existing catalog families:**
- **Wins** (54–56): one-time, cumulative across all squads. Trigger = Challenge Completion where the athlete is a winner.
- **Participation** (57–59): one-time, cumulative. Trigger = Challenge enrollment finalized (roster lock) — counts *entering*, which is consent-positive and never penalizes the outcome.
- **Participation Streak** (60–62) — see **HC-D4**. One-time, awarded against the account-wide highest streak ever reached. Restores the brief's "Participation Streak Milestones."

Thresholds (1 / 10 / 25 for counts; 3 / 5 / 10 for streaks) follow the catalog's established cadence (cf. Chapters, Goals, Community). Participation milestones intentionally reward engagement over victory, per the Challenge System's own "reward engagement, not just victory" intent and CC-D3.

---

## Decision HC-D2 — New Trigger Source: Challenge Completion → ChallengeEvaluator

### Statement

**Locked:** The Honor Evaluation Service gains one new active trigger source, **Challenge Completion**, invoking a new **`ChallengeEvaluator`** family (plus `Longevity` per the standard pattern). A secondary trigger, **Challenge Enrollment Finalized**, invokes `ChallengeEvaluator` for the Participation family only.

### Rules

1. **Reuses the locked pipeline verbatim** (Evaluation Service §2): event-specific, immediate post-event, evaluated against finalized state. `ChallengeEvaluator` reads finalized challenge-result statistics (`challenges_won_count`, `challenges_entered_count`) **after** those counters are updated — never mid-challenge, never from live standings.
2. **Trigger mapping addition** (Evaluation Service §3.1):

| Trigger Event | Evaluator Families Invoked | M-2 Fires? | Notes |
|---|---|---|---|
| Challenge Completion (athlete won) | `Challenge`, `Longevity` | No (silent to L-10) | Honors delivered silently; consistent with Goal Completion / Program Graduation standalone pattern |
| Challenge Enrollment Finalized (roster lock) | `Challenge` (Participation family only) | No (silent to L-10) | Counts entry, not outcome |

2a. **Co-winners (Challenge-Architecture-Amendment-002 CA2-D2):** when a challenge completes with multiple co-winners, `challenges_won_count` increments by 1 for **each** co-winner, and **each** is independently eligible for Win-family honors (54–56). A co-win is full credit, never fractional.
3. **M-2 (Honor Earned ceremony) does not fire as a push** — per P-5's "ceremonies never push" rule, unchanged. Challenge honors surface in-app at L-10 / next ceremony consumption, exactly like Goal and Program honors today.
4. **HonorInstance** gains a challenge `source` value (e.g., `challenge`), parallel to existing `import` / `offline_sync` sources. No other schema change; `dateEarned`/`awardedAt` semantics unchanged (AD-33).
5. Challenge Completion is added to Evaluation Service §3.2's trigger list; it does **not** invoke Strength/Training/Goal/Program evaluators (event-specific rule, ES-1).

---

## Decision HC-D3 — Statistics Inputs

### Statement

**Locked:** Three account-level statistics are required: cumulative counters `challenges_won_count` and `challenges_entered_count`, plus `max_participation_streak` (the highest squad participation streak ever reached, CS-D27), all maintained by the net-new Challenge architecture and finalized before `ChallengeEvaluator` runs (mirroring how statistics/PRs are finalized before their evaluators run, ES-4/ES-11).

### Rules

1. Both counters are **account-wide cumulative** across all squads — they are individual legacy statistics, not squad leaderboard values (no Firewall conflict: these feed the athlete's private honor record, never an always-on squad surface).
2. The Challenge architecture owns counter maintenance; this amendment owns only their consumption by the Honor system.
3. Imported/historical challenge data is out of scope for MVP (no retroactive challenge honors); consistent with the catalog's conservative MVP posture.

---

## Decision HC-D4 — Participation Streak honors (restores "Participation Streak Milestones")

### Statement

**Locked:** The COMPETITION category includes a **Participation Streak** family (types 60–62), awarded against `max_participation_streak` — the account-wide highest squad participation streak the athlete has ever reached, maintained by the Challenge architecture (CS-D27).

### Rules

1. **Trigger = Challenge Enrollment Finalized** (the same event as the Participation family). On that event, `max_participation_streak` is finalized first (CS-D27 r3), then `ChallengeEvaluator` evaluates the streak thresholds.
2. **Positive-only, silent reset (CC-D3):** the honor is earned on reaching a streak length; a streak *reset* (a missed challenge in a squad) produces **no** honor change, no notification, and no negative record. The honor, once earned, is permanent regardless of later resets — consistent with all one-time catalog honors.
3. **Account-wide max, not current:** the honor evaluates the *highest streak ever reached*, so it cannot be lost by a later reset. The squad-scoped *current* streak (CS-D27 r1) is the live counter; the account-wide *max* is the honor input.
4. Obeys AD-7 (no catalog visibility), AD-27/CC-D5 (no rank effect), AD-33 (dual dates). No `HonorInstance` schema change beyond the `challenge` source already added (HC-D2).

---

## Impacted Locked Documents

| Document | Required change | Status |
|---|---|---|
| `Honor-Catalog-v1.0-LOCKED.md` | Add COMPETITION category (types 54–62: Wins, Participation, Participation Streak); update category summary, total count, and Closure Record counts; re-lock as v1.1 | Pending (catalog re-lock via Honors expansion governance) |
| `Honor-Evaluation-Service-Architecture-v1.0.md` | Add Challenge Completion + Challenge Enrollment Finalized triggers and `ChallengeEvaluator` to §3.1/§3.2; document data source | Pending |
| `HonorInstance-Architecture-v1.0.md` | Add `challenge` to the `source` enum; no other schema change | Pending |

---

## Non-Behaviors

- **No ephemeral badges defined here** — challenge badges are non-Honors (CC-D4), owned by the Challenge architecture.
- **No negative or failure honors** — nothing for losing, last place, or quitting (CC-D3).
- **No Rank contribution** — AD-27 / CC-D5 unchanged.
- **No catalog visibility** — AD-7 unchanged; the athlete never sees challenge honors as a to-earn checklist.
- **No change to any existing honor type, threshold, family, or AD.**
- **No mid-challenge evaluation** — honors evaluate only on finalized completion/enrollment events.
- **No squad-scoped honors** — all COMPETITION honors are account-level legacy records.

---

## Validation Checklist

- [ ] HC-D1 — COMPETITION category added; honors are permanent + account-cumulative, obey AD-7/AD-27/AD-33
- [ ] HC-D1 — no negative/failure honor exists; participation family rewards entry, not outcome
- [ ] HC-D4 — Participation Streak family (60–62) evaluates account-wide `max_participation_streak`; permanent once earned; reset is silent (CC-D3)
- [ ] HC-D1 — permanent honors kept distinct from ephemeral badges (CC-D4)
- [ ] HC-D2 — Challenge Completion + Enrollment-Finalized triggers added; ChallengeEvaluator reads finalized counters only
- [ ] HC-D2 — M-2 does not push; challenge honors surface in-app like Goal/Program honors
- [ ] HC-D2 — HonorInstance `source` gains `challenge`; no other schema change
- [ ] HC-D3 — `challenges_won_count` / `challenges_entered_count` updated before evaluator runs; account-wide, not squad-scoped
- [ ] Catalog re-locked as v1.1 with updated counts via Honors expansion governance

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | Added the **Participation Streak** honor family (types 60–62) and HC-D4, restoring the brief's "Participation Streak Milestones" (paired with Challenge architecture CS-D27). Evaluates account-wide `max_participation_streak` on the Enrollment-Finalized trigger; permanent once earned; silent reset (CC-D3). HC-D3 statistics extended to three (added `max_participation_streak`). COMPETITION category now spans types 54–62. |
| 1.0 | June 2026 | Initial. Adds COMPETITION honor category (types 54–59: Wins + Participation families) per CC-D1/CC-D4; adds Challenge Completion + Challenge Enrollment Finalized triggers and ChallengeEvaluator to the evaluation pipeline (reusing the locked event-driven pattern); adds `challenge` HonorInstance source and two cumulative statistics counters. No existing honor changed; no negative honors; no rank effect (AD-27/CC-D5); no catalog visibility (AD-7). Catalog re-lock pending via Honors expansion governance. |

---

*Forge Legacy — Honor Catalog Amendment 001 (Challenge Honors & the Challenge Completion Trigger)*
*v1.1 — June 2026*
*Authority: Comparison-Philosophy-Amendment-001.md (LOCKED); Honor-Catalog-v1.0-LOCKED.md; Honor-Evaluation-Service-Architecture-v1.0.md; HonorInstance-Architecture-v1.0.md*
*Status: LOCKED*
