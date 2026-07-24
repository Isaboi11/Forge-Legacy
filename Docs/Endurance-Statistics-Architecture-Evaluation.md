# Endurance Statistics Architecture Evaluation

## v1.0 | June 2026

**Status:** ARCHITECTURE EVALUATION — no honors, amendments, schemas, or implementation authored; no redesign of Rank, Progress, Goals, or Activity History performed. This evaluation determines whether Forge Legacy should evolve from tracking individual endurance sessions to tracking lifetime endurance journeys — per-activity-type cumulative distance, session count, and duration — before any architecture or content work begins.

**Type:** Architecture Evaluation

**Predecessors:** `Endurance-Multi-Activity-Architecture-Evaluation.md` v1.0, `Pace-Speed-Definition-Architecture-Note.md` v1.0, `ActivityType-Expansion-Evaluation-Hiking-Rowing.md` v1.0, `External-Activity-Import-Architecture-Evaluation.md` v1.0, `External-Activity-Import-Ownership-Deduplication-Note.md` v1.0, `Honors-Catalog-Expansion-Pass-3-Endurance.md` v1.0 — specifically its Section 6 finding that per-activity-type lifetime statistics are the single largest blocked Honors opportunity.

**Read in full for this pass:** all documents above, plus `Rank-Computation-Model.md`, `P-2-Progress-Hub-Architecture.md`, `Activity-History-Wireframe-Spec-W18.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `Amendments/Critical-Decisions-Amendment-001.md`, `FORGE_LEGACY_PRODUCT_DNA.md`.

---

## Section 1 — Current State Audit

### 1.1 What endurance statistics already exist

| Statistic | Exists? | Where | Scope |
|---|---|---|---|
| Per-session distance/duration | **Yes** | `distanceValue`/`distanceUnit` (`Program-Authoring-Standard-v1.0.md` §2.3), session timer (`Active-Workout-Flow-Spec-W9-W16.md` §4.3) | One session at a time |
| Lifetime session count, all types combined | **Yes** | `workoutCount` — Athlete Statistics Record, incremented at Session Save (`Honor-Evaluation-Service-Architecture-v1.0.md` §9.1) | Type-blind — sums every `ActivityType` together |
| Lifetime hours, all types combined | **Yes** | `hoursForged` — same record, same trigger | Type-blind |
| Lifetime "meaningful work" volume | **Yes** | Rank's Training Volume (#4 primary category), accumulated per `Rank-Computation-Model.md` §3.7 | Type-blind by deliberate design — D-RCM-4: "No activity type is excluded... must not be reversed by future threshold-setting" |
| Best-ever pace, single value | **Yes**, for one signal only | RCM's `bestPace` (Personal Improvement / Endurance umbrella signal, `O-2-Amendment-001-Athlete-Type-Declaration.md` §7.1, formalized by `Pace-Speed-Definition-Architecture-Note.md` §4.4) | A single best-ever scalar — not cumulative, not a running total |
| "Cumulative distance by rolling period" | **Named, not defined** | `P-2-Progress-Hub-Architecture.md` §7.3 (ENDURANCE_PROFILE display content) | Direct quote: "The 4–6 most relevant endurance metrics... Dominant endurance type (RUN, WALK, BIKE, SWIM — whichever has the most sessions) determines metric selection. Metrics may include: longest session distance, most recent pace, cumulative distance by rolling period." |

### 1.2 What does not exist

**Nothing in the locked architecture maintains a per-activity-type lifetime distance, lifetime session count, or lifetime duration, for any of RUN, WALK, HIKE, BIKE, SWIM, or ROW.** Every cumulative counter found in Section 1.1 is either type-blind (`workoutCount`, `hoursForged`, Training Volume) or a single best-ever scalar for one signal (`bestPace`) — none is a running total sliced by activity type.

**A previously unflagged gap, parallel in shape to the one the Pace & Speed Note resolved:** P-2's own "cumulative distance by rolling period" is named as Endurance Profile content but defined nowhere — no document states whether it is stored or derived, what "rolling period" means (a fixed window? which length?), or how it would extend to a type other than whichever single type happens to be dominant for a given athlete. This is a real, load-bearing undefined term sitting in already-locked architecture, exactly the kind of gap `Pace-Speed-Definition-Architecture-Note.md` previously closed for per-session pace/speed — except this one concerns cumulative distance, and it remains open.

### 1.3 What systems currently consume endurance data, and at what granularity

| System | Granularity | Per-activity-type? |
|---|---|---|
| Activity History (W-18) | Per-session only | N/A — no aggregation of any kind |
| Activity Detail (W-19) | Per-session only | N/A |
| Progress (P-2) | Per-session ("longest session distance"), undefined-rolling-window ("cumulative distance by rolling period"), and lifetime-but-type-blind (Consistency/Training metrics, §12.1) | Only for one dominant type at a time, and only via the undefined metric above |
| Rank | Lifetime, type-blind (Training Volume/Consistency) plus one best-ever scalar (`bestPace`, Personal Improvement) | No |
| Goals | Per-goal accumulation against a target, generically across "logged run distances" or similar (`Critical-Decisions-Amendment-001.md` Decision 1) | Per-goal, not account-wide; not a persistent lifetime statistic in its own right |
| Honors (Pass 3) | Per-session threshold only | No cumulative honor of any kind exists yet |

**Verdict:** every system that touches endurance data today operates at the session level or the type-blind-lifetime level. The per-activity-type lifetime layer this evaluation is asked to assess does not exist anywhere in the architecture, confirmed by direct re-reading rather than assumed from Pass 3's own framing.

---

## Section 2 — Product Vision Evaluation

### 2.1 Product value, by metric

**Lifetime Distance — high value.** Distance is each endurance activity's own primary, already-culturally-meaningful metric (`Pace-Speed-Definition-Architecture-Note.md` §3) and the metric the just-completed Honors Pass 3 already built single-session milestones around. A lifetime distance figure is the natural, expected companion to those milestones — exactly the relationship Strength's single-lift PR milestones already have to its lifetime "Club" honors (combined-PR totals). Forge Legacy has never treated cumulative lifetime numbers as foreign to its identity — `hoursForged` and `workoutCount` are exactly this, already, just type-blind.

**Lifetime Sessions (count) — moderate value.** Real, but its value is mostly in finer granularity of an existing concept ("how many of my workouts were runs, specifically") rather than new territory. It is the path *to* lifetime distance, not an independently strong identity claim on its own.

**Lifetime Time (duration) — lower value.** `hoursForged` already serves this identity role generically. A per-type time breakdown is the least differentiated of the three candidates, and for continuous endurance activities, a long-duration session is — by the same correlation Pass 3 already found for single-session Duration versus Distance — almost always also a long-distance session. Tracking both risks recognizing the same underlying effort twice.

### 2.2 Long-term athlete motivation

Cumulative lifetime distance has an unusually strong external precedent specifically for endurance athletes: the `External-Activity-Import-Architecture-Evaluation.md`'s own Section 1.2 already found that device-equipped endurance athletes arrive at Forge Legacy with an existing habit of tracking exactly this number elsewhere. This is not a novel motivator Forge Legacy would be inventing — it is the single most commonly tracked number across the entire endurance-fitness-app category, and Forge Legacy currently has no answer to it at all for any activity type.

### 2.3 Legacy alignment

Strong. A multi-year lifetime distance figure is, almost by definition, a measure of a sustained journey — directly aligned with `FORGE_LEGACY_PRODUCT_DNA.md`'s North Star ("helping athletes become someone they are proud of ten years from now") and Legacy First principle. An athlete who has logged 3,000 lifetime running miles over five years has a legacy narrative the product's entire mission already exists to honor; today, that number simply isn't visible anywhere in the product.

**Verdict:** distance is the clear, strong candidate; session count and duration are real but secondary, riding on distance's value rather than carrying independent weight of their own.

---

## Section 3 — Architecture Impact

No schema or implementation is designed here, per the objective's explicit instruction — this section evaluates shape and complexity only.

### 3.1 Complexity

**Moderate, and well-precedented in kind, not novel in kind.** `Honor-Evaluation-Service-Architecture-v1.0.md` §9.1 already maintains type-blind lifetime counters (`workoutCount`, `hoursForged`) on an Athlete Statistics Record, incremented at the existing Session Save trigger. Per-activity-type lifetime distance is the same *mechanism* — an incrementing counter, updated at the same existing trigger — multiplied across activity types rather than collapsed into one. This is structurally the same move Pass 1 already made when it added two new PR-record slots (Overhead Press, Pull-Up) to an existing PR-storage pattern, scaled up: roughly six new counters (one per activity type) for distance, versus that pass's two.

### 3.2 Data ownership implications

The ownership question here is not "who owns the counter" (the athlete, trivially, same as every existing counter) — it is **how a counter stays correct when its underlying sessions are edited, deleted, or recognized as duplicates after the fact.** Every existing type-blind counter already faces this question implicitly (`Honor-Evaluation-Service-Architecture-v1.0.md` §9.5's invariant assumes counters stay synchronized without specifying how) — but a narrower, type-sliced counter makes any single error *more visible*, because deleting one duplicate run swings a smaller, more specific number by a larger relative amount than it would swing the broad, type-blind `hoursForged`. This is the central new complexity this section surfaces: not the counter itself, but the correctness bar it raises on session edit/delete handling that today's broader counters could tolerate being slightly looser about.

### 3.3 Import compatibility implications

This directly engages principles `External-Activity-Import-Ownership-Deduplication-Note.md` already established, rather than introducing new ones. That note's Section 6 guarantee — "source-blindness for counting... once a record exists, no downstream system's behavior should differ by source" — would need to hold for lifetime distance counters exactly as it already must hold for Goals' auto-update and Honors' single-session thresholds. The risk is one of *stakes*, not *kind*: that note's "exactly-once counting per real-world session" guarantee becomes more load-bearing once a lifetime, type-sliced number depends on it, because a duplicate import now visibly inflates a specific, personally meaningful figure rather than a broad, type-blind one. This reinforces, rather than contradicts, that note's own existing risk framing (Section 9) — it does not require revising any principle in it.

**Complexity ordering, lowest to highest:** building this only after de-duplication is genuinely implemented (not just documented) is materially simpler than building it concurrently, because every inflation risk in Section 3.2/3.3 above is already named and pre-solved at the principle level — implementation order, not new design work, is the main lever available here.

---

## Section 4 — Existing System Impact

| System | Benefits? | Why / why not |
|---|---|---|
| **Progress** | **Yes, most directly** | P-2's own "cumulative distance by rolling period" (Section 1.2) is currently a named-but-undefined metric — per-activity-type lifetime distance would finally give it a real foundation, and could extend it from "rolling window, one dominant type only" to "lifetime, every qualifying type" — a strict superset of its current, never-fully-specified scope. This is the same kind of "supply the missing computation a locked document already assumed existed" resolution `Pace-Speed-Definition-Architecture-Note.md` already performed once, for a different metric. |
| **Goals** | **No — remains unchanged (Rule 11)** | `Critical-Decisions-Amendment-001.md`'s auto-update model already accumulates "logged run distances" against a specific goal target independently of whether a separate, account-wide lifetime statistic exists. A goal's own accumulation and an account-wide lifetime figure are parallel concepts serving different purposes, not dependent on each other. Goals requires no read or write access to any new counter to keep functioning exactly as it does today. |
| **Rank** | **No — remains unchanged (Rule 9)** | Training Volume and Consistency are deliberately type-blind (D-RCM-4) and were never meant to become type-specific; nothing here changes that design intent. The separately-named pace/speed PR integration gap (Pass 3, Section 2/6) is adjacent but distinct, and is not reopened by this evaluation. |
| **Honors** | **Yes — the most direct beneficiary, though no honors are authored here (Rule 7)** | `Honors-Catalog-Expansion-Pass-3-Endurance.md` Section 6 already named "per-activity-type lifetime volume honors" as the single largest blocked opportunity in the entire Endurance catalog, gated exactly on this counter gap. If this evaluation's recommendation is later built, it is the direct unlock for that named, already-identified opportunity. |
| **Activity History** | **No — remains unchanged (Rule 12)** | W-18 is a per-session log; a lifetime statistic belongs to a different surface (most naturally Progress) and requires no change to History's existing per-session rendering. |

---

## Section 5 — Endurance Identity Evaluation

### 5.1 Does cumulative distance matter?

**Yes, strongly — the clearest fit of the three candidates against Product DNA.** A "Lifetime Runner" or "Lifetime Cyclist" framing built on accumulated distance is squarely within Identity Over Performance done correctly: it reinforces "who the athlete is... what they are building" (`FORGE_LEGACY_PRODUCT_DNA.md` §2) without any of the comparison, status, or vanity-metric mechanics the Prohibited Patterns list bars (§10) — it is a personal, accumulated record, not a leaderboard position. This is the same shape Strength's existing "Club" honors already occupy ("1,000 Pound Club" is a personal lifetime total, never a comparison to anyone else's).

### 5.2 Does cumulative time matter?

Real, but secondary. `hoursForged` already fulfills this identity role generically today ("how much have I put into this, across everything I do") — a per-activity-type time breakdown adds precision, not new identity territory.

### 5.3 Does cumulative session count matter?

The weakest of the three standalone. "200 runs logged" carries most of its meaning as the *path to* a lifetime distance figure, not as an independent identity claim — the same redundancy relationship Pass 3 already found between single-session Duration and Distance, recurring here one level up, between lifetime Count and lifetime Distance.

**Verdict:** cumulative distance is the one metric in this evaluation with genuine, strong, standalone identity value; time and session count are real but secondary, deriving most of their meaning from distance rather than standing independently.

---

## Section 6 — Honors Unlock Analysis

No honors are authored here — this section evaluates what becomes *possible*, per the objective's instruction.

| Opportunity | Assessment |
|---|---|
| **Lifetime Mileage ladders, per activity type** (e.g., 100/500/1,000/2,500 lifetime running miles) | The cleanest, highest-value unlock. Directly parallel to Strength's existing Club honors (lifetime combined-PR total) and Training's Hours Forged ladder (lifetime hours) — the same already-proven shape, sliced by activity type instead of left type-blind. This is the opportunity Pass 3 Section 6 already named explicitly. |
| **"Lifetime Runner" / "Lifetime Cyclist" identity-recognition honors** | Plausible, but needs careful scoping against the Lifetime Mileage ladder's own entry tier to avoid recognizing the same threshold-crossing twice — the same "two honors, one achievement" risk Pass 3 flagged for Duration vs. Distance, recurring at the cumulative layer. |
| **Cross-activity combined lifetime distance** (e.g., running + cycling + swimming miles summed into one number) | An open question, not a clear unlock. Strength's Club honors combine bench + squat + deadlift specifically because all three measure the same underlying thing (weight moved). Distance across mechanically different activities (a swum meter and a cycled mile) is not obviously additive in the same meaningful sense — this would need its own deliberate evaluation, not an assumption that "more lifetime miles, summed across anything, is automatically more meaningful." |
| **Per-activity-type lifetime session-count milestones** (e.g., "100th run") | Possible, but lower priority — consistent with Section 5.3's finding that count rides along on distance's value rather than carrying its own. |

---

## Section 7 — Risks

- **Data inflation.** A direct, amplified version of the risk `External-Activity-Import-Ownership-Deduplication-Note.md` already named: a duplicate import or an uncorrected erroneous entry has a visibly larger relative impact on a narrow, type-sliced lifetime number than on today's broad, type-blind counters. **Mitigation:** treat that note's de-duplication principles as a hard prerequisite to building any per-type lifetime counter — not a parallel-track nice-to-have, but a strict ordering dependency.
- **Import risk.** An athlete batch-importing years of historical activity could see a lifetime counter jump instantly — a legitimate, desired outcome under Legacy First, but also a vector for the same "favorable curated import" gaming concern the Import Evaluation already named for pace PRs, now applicable to volume. **Mitigation:** the same source-blind-counting-plus-de-duplication posture already recommended for imports generally; no new principle is needed, just consistent application.
- **Maintenance risk.** Up to six activity types, each with its own counter, is a materially larger surface than any single prior counter addition (Pass 1's two PR slots) — more state to keep synchronized correctly across session create/edit/delete/import paths. **Mitigation:** phase by value. Section 2.1/5 already found distance is the one metric with clear, strong, standalone value — recommend building distance-only first and treating time/count as deferred, demand-gated follow-ons, rather than building all three simultaneously.
- **Product complexity risk.** Six new per-type numbers is real new UI surface area that does not exist today, and risks working against Story Before Data's restraint ("data exists to support the story... never the reverse") if surfaced indiscriminately. **Mitigation:** reuse Progress's own existing dominance-ratio gating logic (PH-D7) to surface lifetime distance only for an athlete's qualifying endurance type(s), rather than inventing a new display rule that shows all six numbers to every athlete regardless of relevance.

---

## Section 8 — Final Recommendation

### 8.1 Should endurance statistics exist?

Yes — specifically lifetime distance, per activity type. Session count and duration are secondary and lower-priority, per Sections 2 and 5.

### 8.2 Which statistics should exist

**Per-activity-type lifetime distance**, for RUN, WALK, HIKE, BIKE, SWIM, and ROW — the one metric with clear, strong, standalone product value, motivational precedent, and Legacy alignment, and the direct, named prerequisite for Pass 3's largest identified remaining Honors opportunity.

### 8.3 Which should not exist, or not yet

Per-activity-type lifetime **duration** (redundant with distance for continuous endurance activities, lower distinct value, Section 2.1/5.2); per-activity-type lifetime **session count** (secondary, rides on distance's value, Section 2.1/5.3); **cross-activity combined lifetime totals** (open question, not clearly additive in meaning, Section 6); and all of the above **before** the Ownership & De-Duplication Note's principles are actually implemented, not merely documented (Section 3.3, Section 7 — a hard prerequisite, not a parallel track).

### 8.4 Architecture complexity assessment

Moderate. The same kind of mechanism the architecture already uses for `workoutCount`/`hoursForged` (an incrementing counter on the Athlete Statistics Record, updated at the existing Session Save trigger), multiplied across activity types rather than introducing a new mechanism — real but bounded complexity, well within the precedent Pass 1 already set when it extended PR storage.

### 8.5 Long-term value assessment

High, specifically for lifetime distance: strong existing athlete expectation (already named by the Import Evaluation), strong Product DNA fit (Identity Over Performance, Legacy First), and a direct, already-named unlock for Honors' single largest remaining opportunity (Pass 3, Section 6).

### 8.6 Final verdict

**B — Endurance statistics, specifically per-activity-type lifetime distance, are justified and should become a future architecture workstream.**

Not A: Section 1's direct re-reading of Rank, Progress, and the Honor Evaluation Service confirms the gap is real, not assumed — no per-activity-type lifetime counter exists anywhere today, and Progress's own "cumulative distance by rolling period" is a named-but-undefined placeholder, not a working feature. Not C: every predecessor evaluation in this workstream has already found that Goals, Progress, Rank, and Honors all function correctly for endurance athletes today at the single-session level — this is a meaningful enhancement to a system that already works, not a foundational gap the product's long-term vision depends on. Not D: the value case (Section 2, 5, 8.5) is clear and the architecture path (Section 3, 8.4) is well-precedented and bounded — nothing found here justifies rejecting the idea outright.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Endurance Statistics Architecture Evaluation. Confirmed, by direct re-reading of Rank, Progress, and the Honor Evaluation Service, that no per-activity-type lifetime distance, session count, or duration counter exists anywhere in the architecture today. Found a previously unflagged gap parallel to the one `Pace-Speed-Definition-Architecture-Note.md` already resolved once: P-2's "cumulative distance by rolling period" is named as Endurance Profile content but defined nowhere. Evaluated product value, motivation, and identity fit across Lifetime Distance, Sessions, and Time; found Distance the clear, strong candidate and the other two secondary. Found architecture complexity moderate and well-precedented (the same counter mechanism already used for `workoutCount`/`hoursForged`, multiplied by activity type). Found import/de-duplication risk amplified, not new in kind, relative to risks `External-Activity-Import-Ownership-Deduplication-Note.md` already named — recommended treating that note's principles as a hard prerequisite rather than a parallel track. Evaluated (without authoring) the Honors unlocks this would enable, the clearest being Lifetime Mileage ladders directly parallel to Strength's existing Club honors. Final verdict: B — justified, future workstream; not currently essential (C) and not architecture-sufficient already (A). No honors, amendments, schemas, or implementation authored; no redesign of Rank, Progress, Goals, or Activity History performed — per Rules 6–12. |

---

*Endurance Statistics Architecture Evaluation — v1.0*
*Forge Legacy | June 2026*
