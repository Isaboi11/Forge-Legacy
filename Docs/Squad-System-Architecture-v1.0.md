# Forge Legacy — Squad System Architecture
## Governing Architecture — Squad Goals, Missions, Streak, Momentum, Weekly Summary, Feed, Honors, Competition, Notifications, Analytics, Commitment
### v1.0 — June 2026

**Status:** LOCKED

**Type:** System Architecture (governing — parallel in authority to `Social-System-Architecture-v1.0` and `Community-System-Architecture-v1.0`. This document is the single source of truth for everything a Squad *does* beyond identity and membership, which remain governed by `Squads-Hub-Wireframe-Spec-S1.md`, `Squad-Detail-Wireframe-Spec-S2.md`, and `Squad-Management-Permissions-Spec-S3.md`.)

**Authority:**
- Product-owner-approved Squad decision set (June 2026) — the source brief for this document.
- Supersedes, for Squad-internal surfaces only: `Squad-Architecture-Amendment-001-Challenge-Surfaces.md` (SA-D1, SA-D2), `Squad-Architecture-Amendment-002-Current-Champions-Firewall-Ruling.md` (SA2-D1, SA2-D2, SA2-D3) — see SQ-D2.
- Supersedes, for Squad-internal surfaces only: `WSR-001-Workout-Share-Result-Architecture.md` §6.1–§6.4 (the bounded, share-triggered Check-ins model) — see SQ-D5.
- Unaffected and fully preserved: `Comparison-Philosophy-Amendment-001.md` (CC-D1/D2/D3) and the Firewall as applied to the **Friends Feed, Communities, and Calendar** — `Social-System-Architecture-v1.0` (SOC-D16), `Community-System-Architecture-v1.0`, `Calendar-System-Architecture-v1.0` (CAL-D11/D17) are **not** amended by this document.
- `Squads-Hub-Wireframe-Spec-S1.md` v1.5, `Squad-Detail-Wireframe-Spec-S2.md` v1.6, `Squad-Management-Permissions-Spec-S3.md` v1.3 (all LOCKED) — identity, membership, and governance remain as those documents define, reconciled here only where this document's decisions touch them.
- `Honor-Catalog-v1.0-LOCKED.md` v1.5 (LOCKED) — receives the new SQUAD category (see SQ-D10).
- `Challenge-System-Architecture-v1.0.md` v1.0 (v1.5) (LOCKED) — reused without a new engine (see SQ-D11); its Firewall (CS-D2, CS-D22) is narrowed for Squad surfaces by SQ-D2.
- `P-5-Notifications-Architecture.md` v1.4 (LOCKED) — receives the new Squad notification rows (see SQ-D12).

**Downstream Dependents:** `Squads-Hub-Wireframe-Spec-S1.md` (→ v1.4, pointer-only), `Squad-Detail-Wireframe-Spec-S2.md` (→ v1.6, major layout reconciliation), `Squad-Management-Permissions-Spec-S3.md` (→ v1.3, Commitment + Goal/Mission edit rights), `Honor-Catalog-v1.0-LOCKED.md` (→ v1.4), `P-5-Notifications-Architecture.md` + wireframe (→ v1.4), `Challenge-System-Architecture-v1.0.md` (→ v1.5, firewall language only), `WSR-001-Workout-Share-Result-Architecture.md` (superseded-banner only), `Squad-Architecture-Amendment-001`/`002` (superseded-banner only), `Forge-Legacy-Master-Status.md`.

> **Consuming-authority pointer — `Backend-Data-Model-Architecture-v1.0.md` (LOCK-CANDIDATE, June 2026).** `Squad`, `SquadMember`, `SquadGoal`, `SquadMission`, `SquadCheckIn`, `SquadStreak`, `SquadMomentum`, `SquadFeedEntry`, and `SquadAnalytics` are formalized as canonical entities in that document's Section 12.1, including the aggregate-only/no-per-member-breakdown rule for `SquadAnalytics`. SQ-D2's Firewall narrowing (standings inline on the owning squad's own S-2 only) is folded into the generalized Performance Firewall enforcement rule in Section 18.1 there. This document remains the sole authority on Squad behavior and decisions — the Backend doc only gives the entities a data-model home.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Preamble — Why Squads Change and Friends/Communities Don't

Forge Legacy has four social pillars, each answering a different question:

| Pillar | Question it answers |
|---|---|
| **Legacy** | What have I built? |
| **Friends** | Who do I know? |
| **Communities** | Who shares my interests? |
| **Squads** | Who do I train and stay accountable with? |

Every other social surface in Forge Legacy — the Friends Feed, Community pages, the Calendar — is built around a **Performance Firewall**: comparison data (scores, standings, streaks, goal completion, champion titles) is never shown on an always-on surface, because the relationship on those surfaces does not carry the consent or the trust to make comparison safe. That firewall is correct for those contexts and is **not changed by this document**.

A Squad is different by design. It is capped at 10 people. Every member has opted into training *with* these specific people and being seen by them. That is a different relationship than following a friend or browsing a community feed, and it can safely carry a different visibility model. This document's central decision (SQ-D2) is that the Squad is now the one place in Forge Legacy where shared progress, a shared streak, a shared feed, and visible competition results are appropriate — because the people seeing them chose this team, on purpose, at a maximum size that keeps it personal.

Everything in this document applies to Squad-internal surfaces (S-1 cards, S-2 Squad Detail) only. Nothing here changes the Friends Feed, a Community page, or the Calendar.

---

## Section 1 — Squad Size

### SQ-D1 — Maximum members (AMENDED → 50)

> **⚠ SUPERSEDED BY SQ-D1a (`Squad-Architecture-Amendment-003-Size-And-Joining.md`, LOCKED 2026-07-28).** The ceiling is **50**, not 10. The reasoning below — that small size is intentional rather than a temporary engineering constraint — is retained and still governs; only the number moved. 10 predates Discover, and the design's own public squads run 15–48. 50 remains an order of magnitude below a Community. Shipped: `member_cap` default 50, constraint 2–50 (migration 0053).

**Locked (as amended):** A Squad has a maximum of **50** members (SQ-D1a). Originally locked at 10 in `Squad-Management-Permissions-Spec-S3.md` §8.5 / §14 ("MVP limit, not permanent"); the durable part of that decision is the *principle* — small size is intentional and maximizes accountability, not a temporary engineering constraint awaiting expansion — and that principle is unchanged at 50.

**Consequence to watch (SQ-D2):** at 50 members, SQ-D2's justification for lifting the Performance Firewall inside a squad rests entirely on per-athlete approval, since members no longer plausibly all know each other. Reversing SQ-D16 (request-only joining) would therefore require re-examining SQ-D2.

This is a different axis from the **free-tier squad-membership cap** (max 2 squads joined/created, Premium unlimited — `Squads-Hub-Wireframe-Spec-S1.md` §5.2, Critical Decisions Amendment 001). Both caps stand unchanged and govern different things: SQ-D1 caps people *inside* one squad; S-1 §5.2 caps how many squads *one athlete* can belong to.

---

## Section 2 — Firewall Supersession

### SQ-D2 — The Performance Firewall is lifted for Squad-internal surfaces only

**Locked:** `Squad-Architecture-Amendment-001` (SA-D1, SA-D2) and `Squad-Architecture-Amendment-002` (SA2-D1, SA2-D2, SA2-D3) are **superseded** as applied to Squad-internal surfaces (S-1 squad cards, S-2 Squad Detail in its entirety, including the Limited Athlete Profile modal). On these surfaces, the following are now permitted inline, where they were previously barred:

- Squad Goal and Mission progress (previously barred by S-2 §9.3 "no squad-level goals")
- A shared Squad Streak (previously barred by S-2 §6.3 "no streak counter")
- Squad Momentum (a new concept; no prior rule barred or permitted it)
- A chronological Squad Feed including individual workout completions, PRs, and Honors (previously barred by S-1 §10/§14 "must never become a feed/activity stream" and S-2 §5.5.5/§14 "no Honors, no comparison")
- Challenge standings, scores, win/loss, and champion recognition for this squad's challenges, displayed directly in the Squad's Competitions section (previously barred by SA-D1, SA2-D1 to a neutral entry-affordance-only model)
- Squad-level Analytics (workouts, participation, streak, goal progress, mission completion, competition record)

### Rules

1. **Scope is Squad-internal surfaces only.** This decision does not touch the Friends Feed, any Community surface, or the Calendar. `Social-System-Architecture-v1.0` (SOC-D16) and `Comparison-Philosophy-Amendment-001` (CC-D2) remain in full force everywhere outside a Squad's own S-1 card and S-2 page.
2. **Squad-Architecture-Amendment-001 SA-D3 and SA2-D3 are not superseded — they are reinforced.** SA-D3 (challenge creator is a challenge-scoped role, never a squad governance tier) continues to govern exactly as written; nothing in this document grants the Owner or the challenge creator new authority over people. SA2-D3's self-owned-vs-relative distinction remains the correct test everywhere this document does not explicitly lift the bar (e.g., it still governs the Friends Feed and Communities, untouched).
3. **The Limited Athlete Profile modal (S-2 §5.5) is not expanded by this decision.** The fields it shows (rank name, accomplishments, athlete type, Forging-since date) are unchanged. Honors, Goal/Mission/Streak data, and challenge standings now surface through the Squad Feed, the Honors section, and the Competitions section of S-2 — not by adding fields to the per-member modal. This keeps the modal's existing scope intact while satisfying the new visibility decisions through dedicated, squad-level sections.
4. **`Challenge-System-Architecture-v1.0` CS-D2 / CS-D22 (the Firewall enforcement contract) is narrowed, not repealed.** The correctness test — "no always-on squad surface may render challenge performance data" — no longer holds for the Squad's own Competitions section on its own S-2 page (that section *is* now a permitted always-on rendering surface for this squad's challenge data, by this document's authority). It continues to hold everywhere else the original contract named: the Friends Feed, any Community surface, and any *other* squad's surfaces (an athlete's Squad B competitions never appear on Squad A's page).
5. **Anti-shame guardrails (CC-D3, SA-D4) are preserved within the new visibility.** Non-participation in a Goal, Mission, or Challenge is never shown as failure (see SQ-D3.4, SQ-D4.4, Section 11). Lifting the firewall expands *what* is visible; it does not relax *how* it is framed.

---

## Section 3 — Squad Goals

### SQ-D3 — One active Squad Goal at a time

**Locked:** A Squad may have exactly one active Squad Goal. Progress is shared and visible to all members. Examples: 500 workouts this month, 25,000 lbs lifted, 300 running miles, everyone completes Chapter 2.

### Rules

1. **One active Goal only (V1 Exclusion).** No second Goal may run concurrently. A new Goal cannot be set while one is active without first closing the current one (completing it, or a member with edit rights cancelling it — cancellation requires a confirmation step, consistent with other destructive/altering actions in S-2/S-3).
2. ⛔ **SUPERSEDED 2026-08-03 by `Squad-Architecture-Amendment-004-Goal-Detail-Screen.md` §4 (SQ-A4-D5) — setting, editing and clearing a Goal is the OWNER'S action.** A Goal is longer-lived and more consequential than a squad's name: one runs at a time (SQ-D3.1), and changing it mid-flight resets what everyone is working toward. Last-write-wins on a name is a shrug; on a Goal it is somebody's month. This also matches what the database has always enforced — `squads_update` (0029) is `owner_id = auth.uid()` — and keeps that policy at its narrowest, since opening it would also expose the squad's name, privacy and crest. *Superseded text: "any member, consistent with the existing Squad Identity model (S-3 §4.3 — squad identity belongs to the squad, not just the Owner). Last-write-wins on simultaneous edits, same as squad name/purpose."* **S-3 §4.3's identity model is unchanged for everything else it governs.**
3. **Goal types:** a target count of a defined metric (workouts logged, lbs/kg lifted, miles/km covered) accumulated across all members, **or** a completion-based goal (every current member reaches a defined milestone, e.g., "everyone completes Chapter 2"). Both are squad-aggregate — there is no per-member sub-target.
4. **Progress display is aggregate, never a per-member leaderboard.** The Goal card shows the squad's combined progress toward the target (e.g., "312 / 500 workouts this month"). For completion-based goals, it shows how many of the current members have completed the milestone (e.g., "6 of 8 completed Chapter 2") — this mirrors S-1's existing aggregate-presence pattern, now applied to goal completion instead of training presence.
5. **Goal completion is a positive, non-comparative event.** When the target is reached, the Goal closes, a Squad Feed entry announces it (SQ-D9), and the Squad Goal Completed honor/notification path fires (SQ-D10, SQ-D12). No member is singled out as having "carried" or "missed" the goal.
6. **Membership changes mid-goal:** a member who joins mid-Goal contributes from the moment they join; a member who leaves does not retroactively remove their contribution from the squad's aggregate. This mirrors the existing removal-doesn't-alter-training-records principle (S-3 §7.5).

---

## Section 4 — Squad Missions

### SQ-D4 — One active Squad Mission at a time, short-term

**Locked:** A Squad may have exactly one active Mission, distinct from the Goal. Missions are short-term (days to one week). Examples: everyone logs 4 workouts this week, PR Saturday, everyone completes mobility twice this week.

### Rules

1. **One active Mission only (V1 Exclusion).** Same governance pattern as Goals (SQ-D3.1) — no concurrent Missions.
2. **Goals and Missions are independent and may run simultaneously.** A squad may have one active Goal and one active Mission at the same time; they do not block each other. They are visually distinct cards on S-2 (Section 14).
3. **Who can set or edit the active Mission:** any member, same rule as Goals (SQ-D3.2).
4. **Mission completion is squad-wide and binary per member, never ranked.** A Mission tracks a simple per-member completion state against its stated bar (e.g., "logged 4 workouts this week: yes/no"). The Mission card shows aggregate completion ("5 of 7 completed this week's mission"), never a sorted list of who finished first.
5. **Mission expiry:** a Mission that reaches its end date without full completion simply ends — no "failed mission" framing, no shame language, no extension by default. The squad may immediately set a new Mission.

---

## Section 5 — Squad Check-ins

### SQ-D5 — Daily Trained / Rest Day / Missed check-in, with optional video; supersedes WSR-001's bounded Check-ins model for Squad surfaces

**Locked:** Each squad member has one daily accountability check-in with three states: **Trained**, **Rest Day**, **Missed**. Members may optionally attach a short (30–60 second) video check-in. The video is optional and supplements — never replaces — the daily check-in.

### Rules

1. **The "Today's Check-ins" card is a persistent, first-class accountability surface on S-2** — not part of the chronological Squad Feed. It shows every current member's status for the current day (Trained / Rest Day / Missed) and is visible at all times, regardless of Feed activity. This is the authoritative, at-a-glance daily status — the Feed is the narrative; the card is the record.
2. **Plain check-in status changes do not generate a Squad Feed event.** A member marking themselves "Trained" or "Rest Day" updates the card silently. This prevents the Feed from being flooded with routine status changes and keeps the card, not the Feed, as the source of daily truth.
3. **Optional video check-ins generate a Squad Feed event** (e.g., "Isaiah posted a video check-in") that links back to the corresponding entry on the Today's Check-ins card. The video itself plays from the Feed event or from the linked check-in; it is not stored as a separate, second accountability record.
4. **"Missed" is neutral, not punitive framing**, consistent with the product's existing no-shame language conventions (S-2 §6.2's "Not yet this week" precedent): "Missed" describes the day's status factually; it carries no streak-breaking alarm styling, no red/orange treatment, and no comparison to other members' day.
5. **Daily reset:** each member's check-in status resets at the start of a new calendar day (squad-local convention: the squad's primary timezone, or device-local for MVP — implementation detail, not a design blocker). The prior day's statuses are not retained as a visible history beyond what the Squad Streak (Section 6) and Weekly Summary (Section 7) compute from them.
6. **This supersedes WSR-001 §6.1–§6.4 for Squad surfaces.** WSR-001's bounded, share-triggered Check-ins section (max 5 cards, 48-hour TTL, populated only when an athlete explicitly shares a `WorkoutShare`) is replaced on S-2 by (a) the persistent Today's Check-ins card defined here, and (b) the Squad Feed (SQ-D9), which now carries workout-completion, PR, and Honor shares natively. WSR-001's other content — external share cards, Friends-level sharing, the `AthleteShareSettings` entity, and the share-configuration UI reachable from W-17/M-1–M-4/L-11 — is unaffected; only the squad-internal delivery surface changes. See `WSR-001` banner note.

---

## Section 6 — Squad Streak

### SQ-D6 — A shared streak based on consistent member participation

**Locked:** Forge Legacy tracks a shared Squad Streak reflecting consistent participation across the squad as a whole.

### Rules

1. **Definition:** a calendar day counts toward the Squad Streak when at least half of the squad's current members (rounded up) check in as **Trained** that day. The streak increments by 1 for each consecutive qualifying day and **resets to 0** on the first day that does not meet the bar.
2. **Rest Day does not break the streak by itself**, but it also does not count toward the "Trained" bar — a day where the majority mark "Rest Day" and the rest are silent does not qualify, consistent with the bar being about active training presence, not mere check-in activity.
3. **Display:** the current streak (e.g., "12-day Squad Streak") appears in the Squad Analytics section (Section 13) and may appear on the Squad Header. It is framed positively and without alarm styling on reset — a reset is a quiet return to zero, not a "streak broken" announcement (no negative push, see SQ-D12).
4. **Membership-size changes:** the "half of current members" bar recalculates against the squad's membership count at the time of each day's evaluation — a squad that grows or shrinks does not retroactively change past qualifying days.
5. **Relationship to the old individual 7-day presence window:** this is a **new, separate, squad-level metric.** It does not replace or alter the individual member presence states that may continue to exist elsewhere in the product (e.g., any remaining individual "trained this week" framing); SQ-D6 is squad-aggregate, not a renaming of an individual signal.

---

## Section 7 — Squad Momentum

### SQ-D7 — A lightweight, formula-hidden health indicator

**Locked:** Forge Legacy displays Squad Momentum as a lightweight indicator of squad health, derived from participation, consistency, goal progress, mission completion, and competition activity. The underlying formula is never exposed.

### Rules

1. **Display is qualitative, not numeric.** Momentum renders as a short label (e.g., "Building," "Steady," "Strong," "Surging," or "Quiet") paired with a simple, non-numeric visual treatment (e.g., a small icon or dot — exact visual token deferred to design implementation). It is never shown as a score, percentage, or point total.
2. **No formula, weighting, or component breakdown is ever surfaced to the athlete** — not in-app, not in any tooltip or help text. The five inputs named in SQ-D7's statement are the architecture's internal basis; they are not a displayed checklist.
3. **No cross-squad comparison.** An athlete in two squads sees each squad's own Momentum independently. There is no ranking of "your most active squad" or any squad-vs-squad momentum comparison anywhere in the product.
4. **Momentum is never negative-framed.** The lowest tier ("Quiet") describes a lull factually — it does not read as a failure grade, and it never triggers a push notification (SQ-D12 fires no "your squad's momentum dropped" alert).

---

## Section 8 — Weekly Summary

### SQ-D8 — A generated weekly recap

**Locked:** Forge Legacy generates a weekly Squad recap including workouts, PRs, participation, goal progress, and Honors earned.

### Rules

1. **Cadence:** generated once per calendar week (squad-local convention, consistent with SQ-D5.5), summarizing the prior 7-day window.
2. **Delivery:** the Weekly Summary posts as the first entry in the Squad Feed for the new week. It is a Feed entry like any other (SQ-D9) — not a separate modal, not a push-only notification, and not pinned indefinitely.
3. **Retention:** prior Weekly Summaries remain visible by scrolling back through the Feed's history; no separate "Weekly Summary archive" surface is introduced in V1.
4. **Content is squad-aggregate**, consistent with the rest of this document: total workouts logged, PRs achieved (named, by member, consistent with the Feed's existing individual-attribution model), participation rate, Goal progress delta for the week, and any Honors earned by squad members during the week. No member is ranked within the summary.

---

## Section 9 — Squad Feed

### SQ-D9 — A chronological, squad-internal feed

**Locked:** The Squad continues to use a feed surfacing workout completions, PRs, Honors, competition updates, goal progress, mission completion, check-ins, and optional video check-ins. No general chat feed is introduced.

### Rules

1. **Feed contents (permitted event types):** workout completions, PRs, Honors earned (squad or individual), competition/challenge updates for this squad's challenges, Goal progress milestones and completion, Mission completion, optional video check-in posts (SQ-D5.3), and the Weekly Summary (SQ-D8). **Plain Trained/Rest Day/Missed status changes are explicitly excluded** (SQ-D5.2) — the Feed narrates events and achievements; the Today's Check-ins card is the daily status record.
2. **One feed per squad (V1 Exclusion).** There is no second feed, no tabbed feed (e.g., "Highlights" vs. "All Activity"), and no per-member feed filter in V1.
3. **Not a general chat feed.** The Feed carries system-and-athlete-generated event entries (the list in Rule 1) and lightweight engagement on those entries (reactions, and comments scoped to the entry they're attached to) — it does not support freeform posts unrelated to a triggering event. There is no "start a post" composer on the Squad page.
4. **Engagement:** members may react to and comment on Feed entries, extending the reaction/comment model WSR-001 already established for shared check-in cards (WSR-D14) to the full Feed now that the Feed is the squad's primary content surface. An @-mention within a Feed comment notifies the mentioned member (SQ-D12).
5. **Ordering:** reverse-chronological, most recent first, standard infinite-scroll-within-squad-history (the anti-feed bounding that applied under the old WSR-001 model, e.g. max-5/48h-TTL, is lifted along with the rest of the Firewall for this surface — see SQ-D2 Rule 1's scope, SQ-D5 Rule 6).
6. **Anti-shame guardrails still apply.** Non-participation in a Goal, Mission, or Challenge never generates a Feed entry (there is no "Jordan didn't join this week's mission" post). Missed check-ins never generate a Feed entry (SQ-D5.2 already excludes all check-in status changes, missed included). The Feed only narrates positive or neutral events — completions, achievements, and milestones — never absence.
7. **Scope:** Squad Feed entries are visible only to this squad's current members, exactly as the rest of S-2 is squad-scoped. They never appear on the Friends Feed, a Community page, or any other squad's Feed.

---

## Section 10 — Squad Honors

### SQ-D10 — Integration with the existing Honors system

**Locked:** Squad-related achievements integrate with the existing Honors system via a new `SQUAD` category in the Honor Catalog (see `Honor-Catalog-v1.0-LOCKED.md` v1.5). Examples: Perfect Week, Squad Streak, Mission Complete, Team Player, Squad Founder, 100 Squad Workouts, Everyone Finished Program.

### Rules

1. **Honors remain account-based, never squad-scoped** — consistent with every existing category, including the structurally similar `COMMUNITIES` category. A squad-collective honor (e.g., Everyone Finished Program) is evaluated against the squad's current roster at the qualifying moment, and **each current member receives their own `HonorInstance`** — there is no shared, squad-owned honor record.
2. **Ceremonies are still not notifications.** Consistent with the standing rule established in `P-5-Notifications-Architecture.md` §1, a Squad Honor surfaces to its earner via the existing M-2 Honor Earned modal — it does not fire a push notification on its own (see SQ-D12's reconciliation note).
3. **No catalog visibility, no rank effect** (AD-7, AD-27, AD-33 apply unchanged to the new category).
4. **Squad Honors may now appear in the Squad Feed** as the qualifying event occurs (e.g., a Mission Complete moment is itself a Feed entry per SQ-D9; the resulting Honor is a separate, account-based artifact surfaced via M-2 to each qualifying member individually). This is not a contradiction of Rule 2 — the Feed narrates the *event*; M-2 still owns the *honor ceremony*.

---

## Section 11 — Competition Integration

### SQ-D11 — Squads continue using the existing Challenge System; no separate engine

**Locked:** Squads support Squad vs. Squad, private, and global competitions entirely through the existing Challenge System (`Challenge-System-Architecture-v1.0.md`). No new competition engine is introduced.

### Rules

1. **The Squad's Competitions section on S-2** (Section 14) now displays this squad's challenge standings, scores, and results directly — the neutral "Challenges ›" entry-point-only model (SA-D2, SA2-D2) is superseded for this squad's own page by SQ-D2. C-1/C-3/C-4/C-7 remain the canonical Challenge surfaces and are unchanged; the Competitions section on S-2 is a squad-scoped *view into* the same Challenge data, not a new data model.
2. **The challenge-creator role remains challenge-scoped, never a squad governance tier** (SA-D3, unchanged and reinforced — see SQ-D2 Rule 2). Any member may create a challenge; the Owner gains no special standing or scoring privilege from squad ownership.
3. **Anti-shame guardrails (CC-D3, SA-D4) are preserved.** Non-participation in a challenge is still never shown as failure, even though standings are now visible inline — a member who didn't join simply doesn't appear in the standings; there is no "didn't participate" row.
4. **Friend- and Community-context challenges are unaffected.** This decision concerns only `context = SQUAD` challenges as they relate to *this squad's own* S-2 page. Friend Challenges and Community Challenges continue to have no always-on surface on S-2 (CA3-D6/D8, unchanged).

---

## Section 12 — Notifications

### SQ-D12 — New and reconciled Squad notification triggers

**Locked:** `P-5-Notifications-Architecture.md` is extended (→ v1.4) to cover: Goal completed, Mission started, Mission ending soon, Everyone checked in, Competition started, Competition ending, Mentions, Honors earned.

### Disposition of each

| Trigger | Disposition |
|---|---|
| Goal completed | New toggle row, merged into a new "Squad Goal & Mission Updates" setting (default OFF) — see P-5 §3.1 |
| Mission started | Same merged toggle as above |
| Mission ending soon | Same merged toggle as above |
| Everyone checked in | Same merged toggle as above |
| Competition started | **Routes through the existing "Challenge Updates" toggle** (P-5 Section C) — context-agnostic, no new toggle, consistent with how Friend and Community challenges were added with zero new toggles |
| Competition ending | Same as above — existing "Challenge Updates" toggle |
| Mentions | New scope added to the existing "Squad Reactions" toggle, relabeled "Squad Reactions & Mentions" (default OFF) — covers @-mentions in Squad Feed comments, capped the same way reactions already are (1/24h per share) |
| Honors earned | **Not a push notification** — reconciled to the existing Ceremonies-are-not-notifications rule (P-5 §1); surfaces via M-2 only, per SQ-D10 Rule 2 |

The existing "Squad Check-ins" toggle is relabeled "Squad Feed Activity" (same backing field, `squadNotificationsEnabled` — no schema change) and its scope expands to cover workout completions, PRs, and video check-ins now natively carried by the Squad Feed (SQ-D9), superseding its prior WSR-001-only scope. Full toggle-level detail lives in `P-5-Notifications-Architecture.md` v1.4 §3.1.

---

## Section 13 — Analytics

### SQ-D13 — Display-only squad-level analytics

**Locked:** The Squad page displays workouts, participation, current streak, goal progress, mission completion, and competition record. No advanced analytics.

### Rules

1. **Squad-aggregate only.** Every figure in the Analytics section is a squad-level total, rate, or current value (e.g., total workouts logged this month, participation rate, current Squad Streak, active Goal progress, active Mission completion rate, win/loss record across this squad's challenges). There is no per-member breakdown, sort, or leaderboard within the Analytics section itself.
2. **No advanced analytics (V1 Exclusion):** no trend charts, no historical comparison across months, no predictive projection, no exportable report. The section is a small set of current-state figures, not a dashboard.
3. **Competition record detail (standings, individual challenge history) lives on the C-series Challenge surfaces**, reachable from the Competitions section (SQ-D11) — Analytics shows only the summary record (e.g., "3–1 this season"), not a full standings breakdown.

---

## Section 14 — Squad Commitment

### SQ-D14 — A short values statement, accepted at join

**Locked:** Each Squad has a short Commitment section — values accepted when joining. Examples: Show up, Encourage others, Stay respectful, Train consistently.

### Rules

1. **Editable like squad identity:** any member can edit the Commitment text, same governance as squad name/purpose (S-3 §4.3, §6.2). Last-write-wins on simultaneous edits.
2. **Format:** a short list or short paragraph (length cap deferred to S-3 implementation, consistent with the existing 60-character purpose-field pattern setting precedent for "short" fields in this product).
3. **Acceptance gate:** an athlete accepting a squad invitation is shown the current Commitment text and must acknowledge it before completing the join. This is a touch on the not-yet-defined Squad Invite flow (S-1/S-2 reference it as "S-XX, to be defined") — flagged here as a requirement that flow must satisfy when authored.
4. **No enforcement mechanism in V1.** The Commitment is a stated, accepted value set — there is no violation-reporting, scoring, or consequence system attached to it. It reinforces identity and expectation; it does not police behavior.

---

## Section 15 — Squad Page Layout

### SQ-D15 — The reconciled S-2 layout

**Locked:** The Squad Detail page (S-2) layout is: Banner, Squad name, Description, Members, Current Goal, Current Mission, Feed, Competitions, Members, Honors, Analytics.

### Reconciled scroll order (full detail in `Squad-Detail-Wireframe-Spec-S2.md` v1.6 §3/§14)

```
Banner / Squad Header  (name, icon, purpose/description, member avatar stack)
        ↓
Train Together  (existing Primary CTA — unaffected by this document, retained)
        ↓
Current Goal card  (SQ-D3)
        ↓
Current Mission card  (SQ-D4)
        ↓
Today's Check-ins card  (SQ-D5 — persistent, not part of the Feed)
        ↓
Squad Feed  (SQ-D9 — chronological)
        ↓
Competitions  (SQ-D11)
        ↓
Members  (existing roster — unaffected by this document, retained)
        ↓
Honors  (SQ-D10 — squad honor case)
        ↓
Analytics  (SQ-D13)
        ↓
+ Invite to Squad  (existing — unaffected, retained)
```

The two "Members" mentions in the source decision (member avatar stack in the Banner, and the full Members roster lower on the page) are the same existing element appearing at two altitudes, exactly as `Squad-Detail-Wireframe-Spec-S2.md` already does today (header avatar stack + full member list) — this document introduces no duplicate roster.

---

## Section 16 — V1 Exclusions

**Locked — explicitly out of scope for V1:**

- Group chat
- Voice chat
- Channels
- File sharing
- Polls
- Calendar management
- AI coach
- Marketplace
- Multiple simultaneous Goals (SQ-D3.1)
- Multiple simultaneous Missions (SQ-D4.1)
- Multiple feeds (SQ-D9.2)

**Also explicitly unaffected by this document** (carried forward, not re-decided here): the two-tier Owner/Member governance model (S-3 §4), the free-tier 2-squad membership cap (S-1 §5.2), Train Together / WwF integration (S-2 §8), the Limited Athlete Profile's existing field set (S-2 §5.5), and the squad icon system (S-3 §6.4).

---

## Section 17 — Reconciliation Ledger

| Document | Change | New Version |
|---|---|---|
| `Squads-Hub-Wireframe-Spec-S1.md` | Governing-authority pointer added; no content change — S-1 remains presence-only | v1.4 |
| `Squad-Detail-Wireframe-Spec-S2.md` | New sections: Current Goal, Current Mission, Today's Check-ins (replaces WSR-001 Check-ins), Squad Feed, Competitions (standings now inline), Honors, Analytics; firewall language in §5.5.5/§6.4/§14 updated | v1.6 |
| `Squad-Management-Permissions-Spec-S3.md` | Commitment field added to Squad Identity; Goal/Mission edit rights added to permission table | v1.3 |
| `Honor-Catalog-v1.0-LOCKED.md` | New `SQUAD` category, 15 types, 7 families | v1.4 |
| `P-5-Notifications-Architecture.md` + wireframe | Two toggles relabeled/expanded in scope; one new merged toggle added; two triggers reconciled to existing toggles with no new control; Honors-earned reconciled to M-2 (no push) | v1.4 |
| `Challenge-System-Architecture-v1.0.md` | CS-D2 / CS-D22 firewall language narrowed for Squad-internal surfaces, cross-referenced to this document | v1.5 |
| `WSR-001-Workout-Share-Result-Architecture.md` | Superseded-banner added to §6.1–§6.4 for Squad surfaces; rest of document unaffected | banner only |
| `Squad-Architecture-Amendment-001` / `-002` | Superseded-banner added, scoped to Squad-internal surfaces | banner only |
| `Forge-Legacy-Master-Status.md` | Freeze row 11 (Squads) note updated; Recently Completed entry added | — |

---

## Validation Checklist

- [x] SQ-D1 — cap **amended to 50** by SQ-D1a (`Squad-Architecture-Amendment-003-Size-And-Joining.md`); still distinct from the free-tier 2-squad-membership cap
- [ ] SQ-D2 — Firewall lift is scoped to Squad-internal surfaces only; Friends Feed/Communities/Calendar unaffected; SA-D3/SA2-D3 reinforced, not superseded
- [ ] SQ-D3 — exactly one active Goal; aggregate progress only; no per-member leaderboard
- [ ] SQ-D4 — exactly one active Mission; binary per-member completion, aggregate display only
- [ ] SQ-D5 — Today's Check-ins card persistent and separate from the Feed; plain status changes generate no Feed entry; video check-ins do
- [ ] SQ-D6 — Squad Streak defined (≥half of current members Trained that day); silent reset; no alarm styling
- [ ] SQ-D7 — Momentum is qualitative only; formula never exposed; no cross-squad comparison
- [ ] SQ-D8 — Weekly Summary posts as a Feed entry; squad-aggregate content only
- [ ] SQ-D9 — Feed contents match the locked list exactly; one feed only; no general chat; non-participation never narrated
- [ ] SQ-D10 — Squad Honors are account-based HonorInstances; M-2 ceremony rule preserved
- [ ] SQ-D11 — Competitions section is a view into existing Challenge data; no new engine; creator role still challenge-scoped
- [ ] SQ-D12 — every listed notification trigger has an explicit disposition (new toggle, merged toggle, routed to existing toggle, or routed to M-2)
- [ ] SQ-D13 — Analytics is squad-aggregate, display-only, no per-member leaderboard
- [ ] SQ-D14 — Commitment editable by all members; acceptance gate flagged for the Squad Invite flow
- [ ] SQ-D15 — S-2 scroll order matches the reconciled layout
- [ ] Section 16 — all eleven V1 exclusions hold; carried-forward items unaffected
- [ ] Every document in the Reconciliation Ledger has been updated to the listed version

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Locks Squad Goals, Missions, Check-ins (daily status + optional video, superseding WSR-001's bounded model for Squad surfaces), Streak, Momentum, Weekly Summary, Feed, Honors integration (new SQUAD category), Competition integration (existing Challenge System, no new engine), Notifications, Analytics, Commitment, and the reconciled S-2 page layout. Supersedes `Squad-Architecture-Amendment-001`/`002`'s Firewall provisions for Squad-internal surfaces only (SQ-D2); Friends Feed/Communities/Calendar Firewall fully preserved. |

---

*Forge Legacy — Squad System Architecture*
*v1.0 — June 2026*
*Authority: Product-owner-approved Squad decision set; Comparison-Philosophy-Amendment-001 (CC-D1/D2/D3, preserved outside Squad surfaces); Squad-Architecture-Amendment-001/002 (superseded for Squad surfaces); S-1 v1.5, S-2 v1.6, S-3 v1.3; Honor-Catalog-v1.0-LOCKED v1.5; Challenge-System-Architecture-v1.0 (v1.5); P-5-Notifications-Architecture v1.4; WSR-001 v1.2*
*Status: LOCKED*
