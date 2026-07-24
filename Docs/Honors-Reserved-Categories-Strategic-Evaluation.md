# Honors Reserved Categories — Strategic Evaluation

## v1.0 | June 2026

**Status:** STRATEGIC EVALUATION — no honors authored, no honor IDs created, no amendments drafted, no architecture redesigned. This document answers one question: which reserved categories belong in Forge Legacy, and what (if anything) would have to be true before each could be unlocked.

**Type:** Strategic Evaluation Document

**Predecessor:** `Honors-Expansion-Plan-v1.0.md` → `...-Pre-Authoring-Audit.md` → `Honors-Taxonomy-Reconciliation-v1.0.md` → `Honors-Catalog-Expansion-Pass-1.md` → `Honors-Catalog-Expansion-Pass-2.md` (catalog now at 81; six approved categories saturated)

**Newly read for this pass** (per Rule 2/3 — not relied on as fragments from earlier turns): `Squad-Detail-Wireframe-Spec-S2.md` v1.4 (full), `Squads-Hub-Wireframe-Spec-S1.md` v1.2 (full), `FORGE_LEGACY_PRODUCT_DNA.md` (already read in full in an earlier pass this session, re-applied here).

**Scope:** Community, Consistency, Comebacks & Resilience, Prestige. Endurance & Conditioning is excluded from this pass per the user's framing (blocked by missing product capability, not a product-identity question — already settled).

---

## Section 1 — Community Evaluation

### 1.1 What the architecture actually says

S-1 and S-2 are not silent on this question — they are the most explicit, most repeatedly-stated philosophy in the entire repository on the subject of measuring social/squad behavior:

- *"A squad is not a social group. It is not a community. It is not a feed."* (S-1 Preamble)
- *"S-1 must never become... A feed of what teammates did and didn't do... A leaderboard where members are compared... An engagement system where activity generates notifications or reactions."* (S-1 §0)
- *"S-2 must never become... An activity stream of what squadmates logged... A comparison surface where members are ranked by training frequency... A record of how long anyone has been absent."* (S-2 Preamble)
- The "Presence vs. Performance" line is described as categorical: *"This line does not move. It is not contextual. It is not overridden for premium users, coaches, or squad admins."* (S-1 §10.3)

The **only** quantifiable squad-adjacent signal anywhere in the locked architecture is the WSR-001 Check-ins integration — and even that is explicitly bounded (max 5 cards, 48-hour TTL, no infinite scroll, "the one explicit exception authorized by WSR-D16" per S-2's own validation checklist). Reactions exist only on that ephemeral surface and are explicitly excluded from ever appearing on external shares (`Honor-Catalog`-adjacent finding from `WSR-001` via the Share Card Renderer audit: *"reactions never appear on external shares or public content... bounded to the private squad check-in context"*).

### 1.2 What this means for Community honors specifically

Every intuitive "Community" honor concept maps onto something the architecture has already, deliberately, repeatedly refused to track or surface:

| Candidate honor concept | Why it's blocked |
|--------------------------|-------------------|
| "Most encouraging squad member" / reaction-given counts | Reactions exist only on an intentionally ephemeral, low-visibility surface (5 cards, 48h). Counting them turns a deliberately minor feature into a tracked metric — exactly the "engagement system where activity generates notifications" S-1 names as something it must never become. |
| "X check-ins posted" | Same objection — would require new tracking on top of a feature whose entire design intent is to stay bounded and quiet. |
| "Trained with N different squadmates" | This already exists — it's the Community category's existing WwF ladder (`first_workout_with_friend`, `workout_with_friend_10/50`), not a new opportunity. |
| "Invited N people to a squad" | Risks reading as a referral/growth metric — adjacent to "productivity gamification," explicitly named in Product DNA §4 as something Forge Legacy is not. |
| "Most active squad" / any cross-member comparison | Directly forbidden — this is the exact thing the Presence/Performance line exists to prevent. |

### 1.3 What survives

Two concepts pass cleanly because they require no new tracking and touch no comparison surface at all:

- **Squad tenure** — "been a member of a squad for 1 year" — uses only a join-date timestamp, identical in shape to the existing Longevity category's account-anniversary pattern.
- **Squad creation** — "created your first squad" — a one-time existence check, identical in shape to every other "first X" honor already in the catalog.

Both are real, but neither is a *new kind* of honor — they are the Longevity/Programs "first-and-tenure" pattern reapplied to a different entity. They do not constitute a distinct "Community" identity; they are thin extensions of patterns the catalog already has.

### Opportunities
- Squad tenure (time-based, reuses the Longevity pattern exactly)
- Squad creation (one-time, reuses the "first X" pattern exactly)

### Risks
- Almost every other intuitive Community concept requires building a tracked, comparable statistic on top of a system whose explicit, repeated design intent is to avoid exactly that.
- The risk is not hypothetical or borderline — it is named directly, multiple times, in the two most relevant locked specs (S-1, S-2), with explicit rationale for why ("Competition changes the relationship... Neither serves training. Neither serves legacy.").
- Real danger of "Forge Legacy becomes a social network" is not abstract: S-1's own Preamble lists "feed," "community," "social group" as the three things a squad must never become — the same three words Product DNA's §4 uses to describe what Forge Legacy itself is not. Community honors built around any engagement metric would be pulling against the product's own stated identity, not a gray area.

### Architecture Dependencies
- Squad tenure / creation: **none.** Buildable today with existing data (squad membership join date, squad existence).
- Any reaction-, check-in-, or invite-count-based honor: **would require new statistics tracking that does not exist anywhere today**, and — more importantly — would require *overturning*, not just extending, S-1/S-2's explicit design philosophy. This is not a missing-architecture problem like Endurance & Conditioning; it is a product-identity conflict.

---

## Section 2 — Consistency Evaluation

### 2.1 The single most important piece of evidence in this entire evaluation

`Squad-Detail-Wireframe-Spec-S2.md` §6.3 states, verbatim and without qualification:

> *"There is no streak counter. The presence indicator resets to 'Not yet this week' for all members at the start of each new 7-day window... A streak counter converts presence into a performance metric by assigning value to the length of the streak. A long streak creates pressure to maintain it. A broken streak creates visible failure. **Forge Legacy does not do streaks.** The window is the accountability unit — not the streak."*

This is not a Product DNA inference or a judgment call — it is a direct, locked, already-shipped architecture decision stating "Forge Legacy does not do streaks" as a flat product rule, with the exact rationale (pressure to maintain, visible failure on break) that a Consistency honor family would need to design around.

### 2.2 The critical distinction this evidence forces

The S-2 objection is specifically about a **live, visible, breakable** streak — a running counter that exists in present tense and can fail. It is not an objection to an athlete's *own, private, retrospective* record of how consistently they trained, the same way `longevity_*` honors already retrospectively recognize how long an account has existed without ever showing a "your account will expire if you don't log in" countdown.

This produces two genuinely different honor concepts that must not be evaluated as one:

| Concept | Mechanism | Compatible? |
|---------|-----------|-------------|
| **Live/consecutive streak** ("12 weeks in a row") | Requires a running counter that is "active" and can break; the entire mechanic S-2 explicitly names and rejects | **No — direct conflict with a locked decision, not a gray area.** |
| **Cumulative active-period count** ("trained in 50 total weeks," not necessarily consecutive) | Identical mechanism to the existing Workout Count / Hours Forged families — just bucketed by calendar week/month/year instead of by session. No "currently active" state. Nothing to break. | **Yes — same risk profile as honors already in the catalog.** |

### 2.3 Validation against the four named principles

| Principle | Live Streak | Cumulative Active-Period |
|-----------|-------------|---------------------------|
| Accountability Without Shame | Fails — same mechanism S-2 explicitly rejected for the same reason (visible failure on break) | Passes — there is no "broken" state, only a backward-looking count that only ever goes up |
| Story Before Data | Fails — a live ticking number is data-first by construction | Passes — reads the same way "1,000 Workouts Logged" already does: a fact about the journey, not a pressure to maintain anything |
| Legacy First | Neutral-to-fails — a streak is about the present moment, not the legacy | Passes — "Active in 50 distinct weeks across your legacy" is a legacy statement |
| Transformation Over Activity | Fails — rewards showing up for its own sake, exactly what this principle warns against | Borderline-passes, with a caveat: thresholds must be set high enough that they reward sustained pattern, not just frequent logging (same filler-avoidance discipline already applied to Workout Count in Pass 1/2) |

### Opportunities
- **Active Weeks / Active Months / Active Years, cumulative (not consecutive)** — a ladder family structurally identical to Workout Count, just bucketed differently. Reuses existing session-date data with no new state machine.
- This is real, meaningful catalog depth — a genuinely new dimension (breadth of calendar engagement) that the existing Workout Count family (raw session count) does not currently capture at all. An athlete who trains lightly but consistently for years currently has no honor that recognizes that specific shape of dedication; Workout Count rewards volume, not spread.

### Risks
- The live/consecutive streak framing must be rejected outright, not deferred — this is the one finding in this whole evaluation backed by a direct, explicit, already-shipped "we do not do this" statement rather than an inference from general principles.
- Even the safe cumulative version needs deliberate, conservative threshold-setting (same discipline as Pass 1/2) to avoid rewarding "activity for activity's sake."

### Required Architecture
- A new statistic: count of distinct calendar weeks/months/years with at least one logged session. This is a derived aggregate over existing session-date data — no new trigger source, no new evaluator family in the architectural sense (would run under `TrainingEvaluator`, the same way Workout Count and Hours Forged already do). Small, scoped, additive — not a redesign.

**Verdict: split.** The live-streak variant: reject. The cumulative active-period variant: approve with the threshold-discipline restriction above.

---

## Section 3 — Comebacks & Resilience Evaluation

### 3.1 Why the S-2 evidence does *not* block this the way it blocks Consistency

This is the most important distinction this pass surfaces. S-1/S-2's "no absence history" rule (*"There is no 'last trained [date]' field. There is no training history."* — S-2 §6.3) is scoped specifically to **squad-facing visibility** — it exists to prevent one athlete from seeing or judging another athlete's gaps. Honors are never squad-visible. L-10/L-11 are private, athlete-only surfaces (`Honors-Spec-L10.md`: "the athlete sees only what they have actually earned" — no other athlete ever sees anyone else's honor list). A Comebacks honor that exists purely inside the athlete's own private record does not touch the squad-surveillance rule at all — it is categorically a different surface than the one S-2 is protecting.

### 3.2 What remains is the general Product DNA question, and it cuts both ways

`FORGE_LEGACY_PRODUCT_DNA.md` §2's "Accountability Without Shame" principle states the athlete should never feel punished for *"Missing a workout, Taking time off... Starting over."* A well-designed Comebacks honor is not a violation of this principle — it could be its most direct expression. The principle protects the athlete who stops; a calm, positive, after-the-fact recognition that they returned is not surveillance, it is the product *living up to* its own stated value rather than staying silent about it.

The risk is entirely in *mechanism*, not *intent*:

| Design choice | Compatible? |
|---------------|-------------|
| Honor fires retroactively, after a return, never displayed until earned | Compatible — same pattern as every other honor in the catalog |
| Honor is private, never visible to squadmates or anyone but the athlete | Compatible — confirmed by L-10's own "never shown to anyone else" architecture |
| No visible "days since your last session" counter anywhere, ever, even to the athlete, before the honor fires | **Required.** This is the one place the S-2 rationale does generalize — a counter that could be seen mid-gap (even privately) risks becoming exactly the "backward-looking accumulation that grows over time, implying increasing failure" S-2 explicitly rejects. The honor must be evaluated silently and revealed only as a completed, positive fact. |
| Copy frames the return itself as the achievement, never frames the gap as a failure | Required — consistent with M-2's existing "calm, not effusive" tone and the explicit rule that no existing or future honor copy may use absence-shaming language. |

### Opportunities
- A small family recognizing a meaningful, defined return after a defined absence — e.g., "resumed training after an extended period away." Genuinely on-brand: it directly serves "Legacy First" (the legacy continues, gaps and all) and is one of the only honor concepts in this entire evaluation that has a *positive textual anchor already written into Product DNA* rather than just an absence of objection.

### Risks
- The only real risk is implementation discipline: if the underlying "time since last session" tracking is ever exposed anywhere the athlete can see it *before* the honor fires (e.g., a "you've been away for 47 days" indicator), it becomes exactly the shame mechanic the principle protects against. The honor must be a one-shot, retroactive reveal, never a live-tracked state.

### Required Architecture
- A new statistic: gap-length tracking (days since previous logged session, evaluated silently at the next session save). This is new — no existing evaluator family currently computes this — but it is a single derived value, evaluated once per session save, with no live/visible state. Comparable in scope to the Chapter Duration family Pass 2 already built (a derived elapsed-time computation feeding an existing trigger), not a new trigger source or new system.

**Verdict: approve with restrictions** — restricted specifically to retroactive-only evaluation with zero live-visible gap tracking, ever.

---

## Section 4 — Prestige Evaluation

### 4.1 Reframing the question after Pass 2

The original objection to Prestige (Reconciliation pass) was that multi-condition (AND) qualification logic had no precedent beyond Club's PR-sum, and vague criteria blocked any duplicate-check. Pass 2's saturation finding changes the calculus: the catalog now has **81 honors across six fully-built categories** — a large, stable pool of already-validated, already-meaningful single-axis achievements. This means Prestige no longer needs to invent a new *axis* of achievement at all. It can be redefined entirely as a **combination layer over honors that already exist** — checking whether an athlete holds several specific, already-earned `HonorInstance` records simultaneously, never computing any new raw statistic.

### 4.2 Can Prestige exist without becoming arbitrary?

Only if every Prestige honor is a **named, concrete combination of specific existing honors** — never a vague "exceptional achievement" criterion. "Exceptional commitment" is not auditable. "Holds `bench_milestone_4`, `squat_milestone_4`, and `deadlift_milestone_4` simultaneously" is — it is checkable, non-arbitrary, and trivially passes the duplicate/threshold-conflict review the Honor Catalog's own closure process requires, because each constituent honor has already passed that review individually.

### 4.3 Can Prestige be built from combinations of existing achievements?

Yes — and this is the most architecturally favorable property of any reserved category evaluated in this pass. The evaluation logic required is **simpler** than several honors already in the catalog: instead of summing PRs (Club) or computing elapsed time (Chapter Duration), a Prestige honor only needs to check "does this athlete already hold HonorInstance records X, Y, and Z." No new raw statistic, no new trigger source — it would run as a lightweight check triggered whenever any constituent evaluator family completes (since the combination could be completed by whichever honor is earned last).

### 4.4 Does Prestige fit Forge Legacy's identity?

Better than any other reserved category evaluated here. It directly serves "Legacy First" — a Prestige honor is literally a recognition of a *whole legacy*, not a single dimension of it (e.g., "built genuine strength, showed up for a decade, and stayed in chapters long enough to matter" — combining a Strength tier, a Longevity tier, and a Chapter Duration tier). This is closer to the product's own North Star ("helping athletes become someone they are proud of ten years from now") than any single-axis honor can be, because it is the only category whose entire premise is cross-domain breadth rather than depth in one lane.

### Opportunities
- A combination layer over already-existing, already-validated honors — e.g., naming specific cross-category triads (one from Strength + one from Longevity + one from Chapters) as concrete future candidates, without inventing any new statistic.
- The existing 81-honor pool is large enough to support a meaningful number of named, non-arbitrary combinations without strain.

### Risks
- The only way this goes wrong is reverting to vague criteria ("rare and memorable") instead of named combinations. That single discipline failure is the entire risk surface — there is no statistics risk, no Product DNA conflict risk, and no architecture risk if the restriction is honored.
- Combination honors will, by construction, almost always co-fire with at least one of their constituent honors in the same evaluation transaction. This is not a duplicate reward — it is the same "award all qualifying honors, no suppression" behavior (ES-3) Pass 1 already relied on for Program Family Mastery — but it should be named explicitly when this category is eventually authored, not assumed.

### Required Architecture
- A lightweight "PrestigeEvaluator" (or equivalent) that checks combinations of existing `HonorInstance` records. This is genuinely the smallest architecture lift of the four reserved categories — smaller than the Consistency or Comebacks additions, despite being the one with the most cautious history.

**Verdict: approve with restrictions** — restricted to named, concrete, already-earned-honor combinations only; no vague criteria, ever.

---

## Section 5 — Catalog Potential Analysis

| Category | Realistic Honor Capacity | Long-Term Value | Product Alignment | Recommendation |
|----------|--------------------------|------------------|--------------------|-----------------|
| **Community** | **Low** (roughly 3–6 honors — squad tenure and squad creation, structurally identical to patterns already in the catalog) | Low — does not add a genuinely new dimension of recognition, just reapplies existing patterns to a new entity | **Weak.** Most intuitive concepts directly oppose S-1/S-2's explicit, repeated, locked design philosophy | **Reject as a major category.** Approve only the narrow tenure/creation slice, as low priority. |
| **Consistency** | **Moderate** (roughly 10–15 honors for the cumulative active-period ladders across weeks/months/years) | Real — captures a dimension (breadth of engagement) the catalog genuinely lacks today | **Split.** Live-streak framing directly contradicts a locked decision (S-2 §6.3); cumulative framing is fully aligned | **Approve with restrictions** — cumulative only, live-streak variant rejected outright, not deferred. |
| **Comebacks & Resilience** | **Moderate** (roughly 5–8 honors) | Real — one of the few honor concepts that actively reinforces a named Product DNA value rather than merely avoiding conflict with it | **Strong**, conditional on retroactive-only evaluation | **Approve with restrictions** — retroactive evaluation only, zero live-visible gap tracking. |
| **Prestige** | **Moderate-to-high** (depends entirely on how many named combinations are defined; the 81-honor pool supports many) | High — the only category structurally aligned with "whole legacy" recognition rather than single-axis depth | **Strong**, and the smallest architecture lift of the four | **Approve with restrictions** — named combinations only, never vague criteria. |

---

## Section 6 — Roadmap Recommendation

**Recommended next workstream: Prestige**, followed by Consistency's cumulative variant, then Comebacks & Resilience. Community is recommended last and at low priority.

**Why Prestige first, against the order implied by the original Expansion Plan:**

1. It requires the least new architecture of the four — a combination check over data that already exists, not a new statistic.
2. It carries no Product DNA risk that this pass identified — unlike Consistency and Comebacks, it does not require navigating the "Accountability Without Shame" / "not a streak app" boundary at all.
3. It directly capitalizes on the work already done in Pass 1 and Pass 2 — the 81-honor pool is the raw material, and it would otherwise sit unused as a combination substrate.
4. It is the one category that most directly serves the explicit Product Decision Test in Product DNA §11 ("Does this strengthen legacy? Does this strengthen identity?") without requiring a borderline call on any of the seven questions.

**Why not Consistency or Comebacks first:** both are approvable, but both require a named, deliberate design discipline (cumulative-not-streak; retroactive-not-live) that should be explicitly ratified — likely via the same kind of formal review Product DNA §10 itself calls for — before any honors are authored. Prestige requires no equivalent ratification step; its one restriction (named combinations only) is a content discipline, not a product-identity judgment call.

**Why Community last:** its realistic capacity is small enough, and its alignment risk large enough, that further investment here has the lowest return of the four. The two honors that do survive (tenure, creation) are not urgent — they can be picked up cheaply whenever convenient, including alongside whichever category is tackled next, rather than warranting a dedicated workstream of their own.

**What "unlocking" each category actually requires, stated plainly:**

| Category | What must happen before authoring can begin |
|----------|-----------------------------------------------|
| Prestige | Name concrete combinations (content decision) + scope the lightweight combination-check evaluator (small architecture note) |
| Consistency | Formally ratify the cumulative-not-streak restriction (a decision record, not a redesign) + scope the new active-period statistic |
| Comebacks & Resilience | Formally ratify the retroactive-only / zero-live-visibility restriction + scope the gap-length statistic |
| Community | Decide whether the tenure/creation slice alone is worth a dedicated pass, or folds into whichever other workstream is next |

None of these are amendments drafted by this pass, and none are honors authored by this pass — they are the named, specific prerequisites the next workstream would need to clear, exactly as the user's objective requested.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial strategic evaluation of the four reserved categories, grounded in a full read of S-1 and S-2 (not previously read in full this session). Key finding: S-2 §6.3 contains a direct, locked "Forge Legacy does not do streaks" statement that resolves the Consistency question more sharply than prior passes could. Reframed Prestige as a combination layer over the now-81-honor pool rather than a new achievement axis, finding it the lowest-risk of the four reserved categories. Recommended Prestige as the next workstream, ahead of Consistency and Comebacks, with Community deprioritized. No honors authored; no amendments drafted. |

---

*Honors Reserved Categories — Strategic Evaluation — v1.0*
*Forge Legacy | June 2026*
