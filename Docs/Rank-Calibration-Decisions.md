# Rank Calibration Decisions
## June 2026

**Status:** LOCKED v1.0
**Type:** Calibration and Operational Decision Record
**Date:** June 2026

**Authority Chain:**
- Rank-System-Architecture.md v1.0 (LOCKED — architectural authority)
- Rank-Computation-Model.md Sessions 1–5 (LOCKED v1.0 — computational authority)

**Purpose:**
This document resolves the remaining calibration and operational decisions required before engineering implementation of the Rank System can begin. Each decision is self-contained: it defines the question, evaluates viable options, identifies tradeoffs, provides a recommendation, and identifies implementation impacts.

This document does NOT:
- Redesign the rank system or modify its architecture
- Modify Rank-System-Architecture.md
- Modify Rank-Computation-Model.md
- Create new rank categories, promotion paths, or architecture

When locked, these decisions fill the open Q1–Q14 placeholders in Rank-Computation-Model.md by reference and make that document engineering-ready.

**Questions Resolved in This Document:**

| Question | Topic | Priority |
|----------|-------|----------|
| Q1 | Meaningful Work duration floor | Critical |
| Q2 | Active Month week-count threshold | High |
| Q7 | Recent engagement: import eligibility | High |
| Q8 | Athlete type declaration mechanism | Critical |
| Q9 | Recent engagement lookback window and minimum AW count | Critical |
| Q10 | Scaled vs. uniform recent engagement per prestige rank | High |
| Q11 | Import partial credit rate for training signals | High |
| Q12 | Forge-native volume floor for prestige ranks | Medium |
| Q13 | Improvement pattern quantitative thresholds | Critical |
| Q14 | Distinct development phases definition (Legend milestone) | Low |

---

## Q1 — Meaningful Work Duration Floor

### Decision Required

What is the minimum elapsed session duration for a saved session to qualify as meaningful work?

### Context

Meaningful work is defined in Rank-Computation-Model.md §3 as a saved, completed session of any canonical activity type that meets a minimum duration threshold. The structure of the definition is locked. Only the numeric value is open.

This value is the single most load-bearing calibration decision in the system. It controls:

- Whether a given session counts toward Training Volume accumulation
- Whether a given week qualifies as an Active Week (via the TBD-6/TBD-7 link)
- Whether a given week feeds into the recent engagement lookback window
- Whether session records from the import pipeline are recognized as training evidence

All family promotion thresholds in Section 14 of the RCM assume sessions that meet this floor. If the floor is calibrated incorrectly, the threshold table becomes systematically miscalibrated.

### Options Evaluated

| Option | Value | Description |
|--------|-------|-------------|
| A | 5 minutes | Floor is minimal. Nearly any completed session counts. |
| B | 10 minutes | A light floor. Short sessions (warm-up, recovery work, brief cardio) qualify; truly trivial logs do not. |
| C | 15 minutes | Moderate floor. Most genuine training blocks qualify. Very short supplementary sessions (5–10 min foam rolling, brief walk) do not. |
| D | 20 minutes | Demanding floor. Only substantive training blocks qualify. Excludes short accessory work, cool-down mobility sessions, brief recovery days. |

### Tradeoffs

**Option A (5 min):** Maximally inclusive. Ensures no genuine training effort is excluded. However, the word "meaningful" loses force — a 5-minute log is trivially achievable and not meaningfully different from not training. Volume thresholds calibrated at 9 sessions/month would be substantially easier to satisfy, requiring the threshold table to implicitly account for session quality that it does not directly check.

**Option B (10 min):** Low friction, honest floor. Excludes accidental or trivial logs while capturing supplementary work athletes genuinely value — a 10-minute mobility session, a brief warm-up, or a short cardio block. All nine canonical activity types can produce 10-minute sessions that are legitimate training events.

**Option C (15 min):** The natural "standard training block" floor. A 15-minute session is a real, deliberate training event by most definitions. Short supplementary sessions (brief recovery work, accessory mobility) would not qualify. The tradeoff is that Mobility and Yoga athletes who favor shorter, frequent sessions — a legitimate and common practice — may find their active week computation understated relative to their genuine training behavior.

**Option D (20 min):** Too demanding. Excludes classes, structured supplementary sessions, and intentional short recovery modalities. The product explicitly declares all nine activity types are equally valid (D-RCM-4). A 20-minute floor creates a de facto hierarchy where high-duration activity types (Run, Strength, Bike) have an easier path to meaningful work than short-duration types (Mobility, HIIT rounds, brief Yoga flows). This contradicts D-RCM-4.

### Recommendation: **Option B — 10 minutes**

**Rationale:**

1. **10 minutes is the honest minimum for a deliberate training event.** An athlete who opens the app, completes any session, and saves it after 10 minutes has done something. An athlete who saves after 3 minutes has probably not.

2. **Type inclusivity is preserved.** A 10-minute HIIT round, Mobility session, or Yoga flow is a genuine training event. A 10-minute Strength session is a brief but real session. No canonical activity type is systematically excluded by a 10-minute floor.

3. **Volume thresholds remain meaningful.** The RCM baseline athlete profile assumes 9 sessions/month. At a 10-minute floor, those 9 sessions represent at minimum 90 minutes of real training per month — a modest but non-trivial commitment. If the floor were 5 minutes, 9 sessions could represent just 45 minutes of monthly training, which is a very thin basis for rank evaluation.

4. **Import pipeline behavior.** Imported sessions without recoverable duration cannot meet the floor and are correctly excluded from meaningful work classification. A 10-minute floor is low enough that most legitimate imported records with duration will qualify, while still excluding likely data quality gaps (0-duration imports, misclassified events).

### Implementation Impacts

- **Session classification logic:** Save event handler checks `session.durationMinutes >= 10` before classifying as meaningful work.
- **MeaningfulWorkSessionSaved event:** Only fires when the 10-minute floor is met. All downstream rank signals (AW, volume, longevity, personal best) are gated on this event.
- **Import pipeline:** Duration field is required on import records. Sessions without recoverable duration do not fire MeaningfulWorkSessionSaved. The import spec must document this explicitly.
- **Active Week computation (TBD-6):** A week is Active if it contains at least one session meeting the 10-minute floor. This is the operational definition that makes TBD-6 computable.
- **Volume thresholds (RCM §14.8):** The 12 → 36 → 90 → 200 → 400 → 700 session progression assumes sessions of genuine training quality. At 10 minutes, this assumption holds.

---

## Q2 — Active Month Week-Count Threshold

### Decision Required

How many Active Weeks within a calendar month must exist for the month to qualify as an Active Month?

### Context

Active Month is defined structurally in Rank-Computation-Model.md §2 as a function of Active Week density within the calendar month. The definition structure is locked: Active Month = a calendar month where the Active Week count meets or exceeds a threshold. The threshold itself is Q2.

Active Month is not directly used in any family promotion threshold (which use cumulative Active Weeks). Its primary uses are:

1. Training Consistency category signal and P-2 What's Next guidance language ("your consistency needs development" at the monthly level)
2. No Hidden Blockers surfacing (monthly pattern communication to athletes approaching prestige ranks)
3. Potential secondary signal input in evaluation layers (distinct from the AW count itself)

### Options Evaluated

| Option | Threshold | Description |
|--------|-----------|-------------|
| A | ≥ 1 AW per month | Any month with at least one meaningful-work session = Active Month. Very permissive. |
| B | ≥ 2 AW per month | A month needs at least two active weeks. Achievable for an athlete training 2+ days/week across multiple weeks. |
| C | ≥ 3 AW per month | A month needs three active weeks. For a 4–5 week month, this represents meaningful but not perfect consistency. |

### Tradeoffs

**Option A (≥ 1 AW):** Nearly every month an athlete trains at all would qualify. An athlete who trains 3 consecutive weeks in a month, takes 1–2 weeks off, and trains 1 more week has still had an active month. This is extremely permissive — so permissive that Active Month becomes nearly synonymous with "athlete was not completely dormant this month." The signal provides minimal differentiation.

**Option B (≥ 2 AW):** Meaningful without being demanding. Two active weeks in a month means the athlete trained in at least two distinct calendar weeks. This requires distribution, not a training cluster. An athlete who trains intensively for 7 consecutive days crossing one week boundary, then takes 3 weeks off, would have 1 active week and NOT have an active month. This is the correct behavior — an active month should reflect consistent presence, not periodic bursts.

**Option C (≥ 3 AW):** High bar. At baseline athlete pace (3 AW/month), 3 AW is effectively the mean — a month with exactly the athlete's average participation would qualify, but any month with slightly below-average participation would not. This creates an Active Month signal that tracks the athlete's normal pace rather than signaling genuine month-level consistency. Additionally, months with 4 calendar weeks have a natural ceiling of 4 possible AW; requiring 3 means a 75% active week rate even in a short month.

### Recommendation: **Option B — ≥ 2 Active Weeks per month**

**Rationale:**

1. **Two active weeks requires distribution.** The athlete must have trained in at least two distinct calendar weeks, not just trained intensively in a cluster. This is the minimum requirement for the word "consistent" to apply at the monthly level.

2. **Achievable for genuinely engaged athletes.** The baseline athlete at 3 AW/month easily satisfies this threshold in every month they are engaged. Even a reduced-engagement month with 2 AW still qualifies. The signal correctly identifies months where the athlete meaningfully participated from months where they were absent.

3. **Appropriate sensitivity for P-2 guidance.** The Active Month signal is primarily used for consistency guidance in P-2 What's Next. A threshold of ≥ 2 AW produces a useful signal: athletes who are training regularly will see consistent active months; athletes in low-engagement periods will see this signal drop, providing actionable guidance.

4. **Not redundant with cumulative AW.** The family promotion thresholds use cumulative AW counts, which already capture total participation intensity. Active Month adds a distribution signal — "were you present at multiple points during the month?" — that cumulative AW alone does not provide.

### Implementation Impacts

- **Active Month classification:** At month boundary evaluation, count Active Weeks (Mon–Sun) that contain at least one MeaningfulWorkSessionSaved event within the calendar month. If count ≥ 2, month is Active.
- **P-2 consistency guidance:** "Your monthly consistency" indicator can now be computed. Athlete-facing language: "You've had X active months in the last Y months" — communicable, actionable.
- **Evaluation service:** No Active Month count is required in the family promotion threshold table (RCM §14 uses cumulative AW, not Active Month count). Active Month is a Training Consistency signal used for guidance, not a hard gate. Implementation can defer Active Month tracking until P-2 guidance implementation is scheduled.

---

## Q7 — Recent Engagement: Import Eligibility

### Decision Required

Can imported sessions satisfy the recent engagement requirement for prestige rank promotions?

### Context

Recent engagement (TBD-10) requires active weeks within a lookback window at the moment of promotion evaluation for Architect and above. The structural definition (active weeks within a lookback window) is locked. The question is whether imported session records — brought in via Architecture Amendment 001 — count toward satisfying that window.

Two competing principles apply:

- **R-D46 (Forge-native confirmation):** Prestige ranks require Forge-native confirmation. Imported history cannot independently grant prestige ranks.
- **R-D46 (partial credit):** Imported history may contribute to Training Consistency, of which recent engagement is a direct expression.

The tension: recent engagement is built on the Active Week definition, which itself accepts imported sessions under R-D46. But recent engagement specifically tests whether the athlete is currently active in their development — and import is a one-time event, not ongoing development.

### Options Evaluated

**Option A — Native sessions only**
Imported sessions cannot satisfy recent engagement, regardless of session date within the lookback window. Only Forge-native logged sessions count.

**Option B — Import-eligible, consistent with TBD-6**
Imported sessions that fall within the lookback window and meet the meaningful work criteria count toward the recent engagement active week count. Treatment is identical to how imported sessions contribute to cumulative active weeks.

**Option C — Import-eligible for historical periods, native-only for recent window**
Imported sessions from more than 90 days before import date count toward cumulative AW (Training Consistency). Imported sessions within the recent engagement lookback window do not count — native activity must fill the recent window.

### Tradeoffs

**Option A (native-only):** Cleanest alignment with the Identity Credibility Principle. Prestige rank promotion requires current Forge Legacy engagement. An athlete who imports a recent training history from another app and then immediately seeks Architect promotion has not demonstrated current Forge Legacy development — they have demonstrated current engagement with another platform. Recent engagement should test Forge Legacy development.

However: this creates a case where an athlete's imported sessions within the lookback window — sessions that are genuine recent training — are treated as non-existent for this specific purpose, while simultaneously counting toward their cumulative active week total. This inconsistency in how the same imported records are treated is a source of engineering complexity and potential confusion.

**Option B (import-eligible):** Internally consistent. Imported sessions that qualify as active weeks everywhere else qualify here too. This avoids a two-tier treatment of the same imported session records. However, it creates the exploit path: an athlete could import recent data from another app, receive recent engagement credit from those imports, and satisfy the prestige rank gate without having trained in Forge Legacy recently.

**Option C (90-day distinction):** A middle path that separates "import of historical training" (eligible for cumulative AW credit) from "import of recent training" (not eligible for recent engagement). Reasonable in principle, but complex to implement: the evaluation service must check the session date against a 90-day pre-import cutoff, creating a special-case rule that applies only to recent engagement.

### Recommendation: **Option A — Native sessions only**

**Rationale:**

1. **Recent engagement tests current Forge Legacy posture.** The Identity Credibility Principle (RSA §4) requires that prestige rank promotion reflect who the athlete is now, not only who they were. "I'm intentionally shaping my development" (Architect) implies current, active intention within Forge Legacy. An athlete satisfying recent engagement through imported sessions is not demonstrating current Forge Legacy development — they are presenting prior engagement with a different system.

2. **Import is a point-in-time event, not ongoing development.** The import pipeline is a one-time transfer of historical data. It does not represent a current training posture — it represents a past one. Recent engagement should require active use of Forge Legacy's logging flows in the recent window, not evidence that training occurred before import.

3. **The Forge-native AW floor already establishes this principle.** For cumulative AW, prestige ranks require that 50% of active weeks be Forge-native (D-RCM-12). Recent engagement is the sharpest expression of this principle: the entire recent window must be satisfied by native sessions.

4. **Engineering implementation is clean.** The evaluation service simply checks: for the recent engagement lookback window, count only sessions where `session.source === 'native'`. No special date math, no pre-import cutoff, no two-tier import treatment within the same signal.

### Implementation Impacts

- **Recent engagement evaluation:** Filter active weeks in the lookback window to native sessions only. `session.source` or equivalent field must be tracked on every session record.
- **Import pipeline:** No change to how imports are processed. The native/imported flag already required for Forge-native AW floor tracking (D-RCM-12) serves this purpose.
- **P-2 No Hidden Blockers:** Athletes approaching Architect who have no recent native active weeks must see guidance that explicitly addresses recent native training. Guidance language: "Your recent training in Forge Legacy is a development area" — specifically referencing Forge activity, not historical data.
- **Athlete messaging at import completion:** If the import pipeline presents promotion news post-import, it should clarify that prestige rank promotions (Architect and above) also require recent native Forge training before promotion can fire.

---

## Q8 — Athlete Type Declaration Mechanism

### Decision Required

When and how does the athlete declare their athlete type? How are type changes handled over time?

### Context

The Personal Improvement model (TBD-8, RCM §9) evaluates improvement using per-type signal definitions. Each athlete type has a different primary performance signal, secondary fallback, and evaluation logic. The model cannot run without knowing the athlete's type.

Four types are supported at MVP: **Strength**, **Running**, **Boxing**, and **Hybrid**.

Three declaration mechanisms exist in the product:
- **Onboarding (O-2 First-Time Setup):** Type is declared before the athlete logs any session.
- **Profile screen (P-1):** Type is set or updated on the athlete's profile, accessible at any time.
- **Inference from session history:** The system determines type from the distribution of activity types in the athlete's session history.

Type change behavior is a distinct sub-question: what happens to historical improvement evaluation if an athlete switches type.

### Options Evaluated

**Option A — Declaration at onboarding (O-2), editable via P-1**
The athlete declares type during first-time setup. The declared type can be updated via Profile at any time. Historical improvement data from prior sessions is re-evaluated against the new type when type changes.

**Option B — Declaration via P-1 only (post-onboarding)**
No type collection in onboarding. The athlete may set their type on Profile at any time. Until type is set, Personal Improvement is marked as "type not declared — evaluation pending."

**Option C — Inferred from session history, athlete-confirmable**
The system determines the athlete's type by evaluating session distribution. Inference runs after each session save. The athlete can override or confirm via P-1. If no inference is possible (insufficient history), type remains undeclared.

**Option D — Inferred only, not editable**
System-determined type from session history. Athlete cannot override. Type is re-inferred periodically as history grows.

### Tradeoffs

**Option A (onboarding + P-1):**
- Pro: Type is known before the first session. Improvement evaluation can begin with session one. No inference logic required. Athlete-declared type is the most intentional and accurate source.
- Pro: Editable via P-1 accommodates athletes who transition modalities (a runner who becomes a strength-focused athlete).
- Con: Adds a decision to onboarding. Onboarding friction must be managed carefully (this is one question, not a lengthy process).
- Con: Athletes who don't know what "type" means may not select correctly. The onboarding screen must make type selection clear and consequence-aware.

**Option B (P-1 only):**
- Pro: No onboarding friction. Athletes start training first, declare type later.
- Con: Personal Improvement is blocked for all athletes until they navigate to Profile and declare. New athletes who never visit Profile have permanently blocked improvement evaluation. This is a silent failure mode — the rank system appears to work but Personal Improvement data accumulates without being attributed.
- Con: First sessions (when improvement data is richest — earliest baseline measurements) may not be attributed correctly.

**Option C (inferred + confirmable):**
- Pro: Athletes who don't engage with the type declaration flow still get a type assigned. No silent failure.
- Pro: Inference from session history may be more accurate than self-declaration for athletes who don't have a clear primary modality.
- Con: Inference requires a minimum session threshold before any type can be assigned. Early sessions have no type attribution. Early personal best data is unattributed — the most critical baseline data.
- Con: Inference algorithm must be specified and maintained. What counts as "primarily Strength"? What session ratio tips an athlete to Hybrid? These thresholds are not currently defined.
- Con: Athletes in the early transition from one type to another may receive an incorrect inferred type that affects their improvement history.

**Option D (inferred only):**
- Rejected. Athletes who knowingly train across multiple types would have their type overridden by inference, which may misclassify intentional Hybrid athletes. No athlete override is a product trust violation.

### Recommendation: **Option A — Declaration at onboarding (O-2), editable via P-1**

**Rationale:**

1. **Personal Improvement baseline starts at session one.** The first session an athlete logs establishes their earliest personal best data — the foundation from which improvement is measured. If type is unknown at session one, that baseline is unattributed. Onboarding declaration ensures the evaluation service can correctly attribute every session from the beginning.

2. **Self-declaration is more accurate than inference for intentional athletes.** A Hybrid athlete who deliberately trains Strength and Running will declare Hybrid and receive the OR-logic evaluation. An inference system might misclassify this athlete as Strength if they happen to log more Strength sessions early. Self-declaration respects athlete intentionality.

3. **Onboarding friction is manageable.** Type selection is a single binary-ish question with 4 options. It can be presented with brief, illustrated descriptions of each type that make the choice clear for athletes who are uncertain. The existing O-2 specification can accommodate this as one additional step.

4. **P-1 editability handles type transitions gracefully.** Athletes who transition from Running to Strength, or from single-modality to Hybrid, can update their type on Profile. Historical improvement data from prior sessions is retained but re-attributed to the new type on update.

**Type change policy:** When an athlete updates their type via P-1:
- **Historical sessions are re-attributed to the new type.** Improvement evaluation re-runs against the updated type definition using existing session history.
- **Personal best records from the old type remain in the session record** but are re-evaluated against the new type's primary signal. If the new type uses a different primary signal (e.g., switching from Running to Strength), old personal bests on running-specific signals become part of the session history but no longer serve as the active primary signal.
- **No improvement data is deleted.** Type changes are non-destructive. If the athlete switches back to their original type, historical data is re-attributed again.
- **Type change is logged with a timestamp** on the athlete data model (for audit purposes and to correctly anchor improvement pattern detection across type transitions).

### Implementation Impacts

- **O-2 First-Time Setup:** Add athlete type selection step. Four options with illustrations or brief descriptions: Strength, Running, Boxing, Hybrid. Require selection before completing setup (cannot skip to the same degree as optional profile fields — type is load-bearing).
- **P-1 Profile screen:** Add athlete type field, editable. Show current type. On change: trigger improvement re-evaluation job.
- **TBD-12 data model (RCM §23):** Athlete entity must include `athleteType` field (enum: STRENGTH, RUNNING, BOXING, HYBRID) and `typeHistory` array (list of {type, effectiveDate} for audit).
- **Rank Evaluation Service:** Personal Improvement evaluation reads `athleteType` from the athlete entity. Re-evaluation job runs on type change.
- **Import pipeline:** Imported sessions do not carry athlete type. The declared type at import time applies to the full history.

---

## Q9 — Recent Engagement Lookback Window and Minimum Active Week Count

### Decision Required

How long is the lookback window for recent engagement? How many active weeks are required within that window?

### Context

Recent engagement (TBD-10) is a binary gate for prestige rank promotions (Architect and above). It requires active weeks within a lookback window, evaluated at queue-firing time. The structural model is locked; the numeric values make it operational.

Two parameters define the gate:
1. **Lookback window duration** (e.g., 12 weeks, 16 weeks, 6 months)
2. **Minimum active week count** within that window (e.g., 6, 8, 10 active weeks)

These two parameters interact: a shorter window with a lower count can represent the same density requirement as a longer window with a higher count. The design intent is to test whether the athlete is currently training in an ongoing pattern — not whether they trained intensively once.

At baseline athlete pace (3 AW/month ≈ 0.75 AW/week):
- 12-week window × 8 required AW = 67% active rate
- 16-week window × 10 required AW = 63% active rate
- 16-week window × 8 required AW = 50% active rate
- 12-week window × 6 required AW = 50% active rate

The RSA Identity Credibility Principle governs the upper bound: "I'm intentionally shaping my development" (Architect) requires genuine current engagement. The recent engagement gate should be satisfiable by athletes who are actively training, while excluding athletes who have been dormant.

### Options Evaluated

| Option | Window | Min AW | Active Rate Required | Description |
|--------|--------|--------|----------------------|-------------|
| A | 8 weeks | 4 AW | 50% | Permissive. One month of consistent training qualifies. |
| B | 12 weeks | 6 AW | 50% | Moderate. Three months, training at 50% week density. |
| C | 12 weeks | 8 AW | 67% | Moderate-demanding. Three months at roughly 2 active weeks every 3. |
| D | 16 weeks | 8 AW | 50% | Four months at 50% density. More window, same density. |
| E | 16 weeks | 10 AW | 63% | Four months, moderate-demanding density. |

### Tradeoffs

**Option A (8 weeks, 4 AW):** Too permissive. An athlete who trains for 4 weeks, stops for 4 weeks, and then trains for 0 more weeks would qualify (4 AW in an 8-week window). This does not reflect "current training pattern."

**Option B (12 weeks, 6 AW):** Reasonable floor. Training in 6 of 12 weeks over the last 3 months is consistent enough to claim current engagement. An athlete who took 4–6 weeks off (common — vacation, illness, life events) but is otherwise consistently training would typically qualify. The 50% density requirement is not punishing.

**Option C (12 weeks, 8 AW):** More demanding. 8 of 12 weeks at roughly 67% density is meaningful current engagement. An athlete who took a 2-week break would qualify; a 3-week break reduces to 9 qualifying weeks. This is a tighter gate but still attainable by genuinely active athletes.

**Option D (16 weeks, 8 AW):** Extends the window to 4 months. A longer window is more forgiving of short breaks (an athlete who took 4 weeks off and then returned still has 12 remaining weeks to fill 8 AW). But the 4-month lookback means recent engagement is checked against a wider period, which is more lenient in practice.

**Option E (16 weeks, 10 AW):** Longer window with a proportional requirement. The density (63%) is similar to Option C. A 4-month window with 10 required AW tests consistent engagement over a longer period without requiring near-perfect density.

### Recommendation: **Option C — 12-week window, 8 active weeks required**

**Rationale:**

1. **12 weeks (3 months) is the right "recent" horizon.** Three months is genuinely recent for a rank system that operates on years-long timescales. Six months would be too generous — an athlete who trained intensively 5 months ago but has been absent since does not reflect "current" development. Eight weeks would be too narrow — a single productive month.

2. **8 of 12 active weeks (67%) requires a genuine training pattern.** An athlete missing 4 weeks in 3 months (a roughly 2-week vacation + occasional off-weeks) still qualifies. An athlete who trained for one month, stopped for 6 weeks, and then logged one session does not. This correctly distinguishes active athletes from returning athletes who have not yet re-established their pattern.

3. **Calibrated against the Identity Credibility Principle.** "I'm intentionally shaping my development" (Architect) requires active intention — not historical intention. 8 of 12 recent weeks is a credible evidence threshold for current intentionality.

4. **Consistent with baseline athlete expectations.** The baseline athlete at 3 AW/month satisfies this requirement in every 12-week window during which they are normally engaged. Only a significant break (4+ consecutive weeks of absence) would cause a failure. This is the correct behavior — a significant break should cause recent engagement to not be satisfied; a normal off-week or two should not.

### Implementation Impacts

- **Recent engagement evaluation:** At prestige rank promotion queue-processing, calculate active weeks in the 84-day window ending at evaluation date, counting only native sessions (per Q7 decision). If count ≥ 8, recent engagement is satisfied.
- **Data model:** `recentEngagementWindow = 84 days`. `recentEngagementMinAW = 8`. Store as constants on the evaluation service configuration.
- **P-2 No Hidden Blockers:** Athletes approaching Architect with fewer than 8 AW in their trailing 12 weeks should receive proactive guidance. Suggested language: "Your recent training consistency (last 12 weeks) is developing — consistently active weeks strengthen your path to Architect."
- **Queue behavior:** If recent engagement is not satisfied at queue-firing time, the prestige-rank promotion is held in queue. Re-evaluated each time an app-open event triggers queue processing. Fires as soon as recent engagement condition is met.

---

## Q10 — Scaled vs. Uniform Recent Engagement Thresholds per Prestige Rank

### Decision Required

Should Architect, Established, Legend, and Legacy have the same recent engagement threshold (12 weeks / 8 AW), or should the requirement scale with rank?

### Context

The Q9 decision establishes a baseline recent engagement threshold: 12-week window, 8 required active weeks. This question asks whether that threshold is uniform across all four prestige ranks or whether it increases for higher ranks.

The case for scaling: Legacy's identity — "I repeatedly become the person I intend to become" — implies ongoing, repeated fulfillment. A higher recent engagement bar for the highest identities is philosophically consistent. An athlete attempting Legacy promotion after 3 months of above-average training may technically satisfy a uniform 12-week threshold, but the Legacy identity arguably requires demonstrated sustained engagement over a longer recent window.

The case for uniform: simplicity, predictability, and communication clarity. Athletes approaching any prestige rank understand one standard. Varying it per rank requires athletes to know which threshold applies at their current rank level — and requires P-2 to surface the right threshold in the No Hidden Blockers surface. Uniform thresholds reduce engineering complexity and athlete confusion.

### Options Evaluated

**Option A — Uniform (12-week window, 8 AW for all prestige ranks)**
All four prestige rank promotions use the same recent engagement gate established in Q9.

**Option B — Scaled (increasing thresholds per prestige rank)**
Example scaling:
- Architect: 12 weeks / 8 AW (Q9 baseline)
- Established: 16 weeks / 10 AW
- Legend: 20 weeks / 12 AW
- Legacy: 24 weeks / 14 AW

**Option C — Two-tier (Architect/Established uniform, Legend/Legacy elevated)**
- Architect + Established: 12 weeks / 8 AW
- Legend + Legacy: 20 weeks / 12 AW

### Tradeoffs

**Option A (uniform):** Simple to implement, communicate, and display in P-2. Athletes who reach Architect, Established, Legend, and Legacy all understand one standard: "training consistently in the last 12 weeks." The existing Q9 threshold is already appropriately demanding — it requires a genuine training pattern, not a burst. At the upper ranks, the time gates and category thresholds are so demanding that recent engagement is rarely the binding constraint. Making it stricter at upper ranks adds complexity without meaningfully changing who reaches those ranks.

**Option B (scaled):** Philosophically defensible. "I repeatedly become the person I intend to become" (Legacy) requires more recent evidence of becoming than "I'm intentionally shaping my development" (Architect). However: athletes at Legend and Legacy are by definition athletes who have been training for 5–8+ years. An athlete attempting Legacy promotion has already satisfied the 288 AW cumulative threshold, 7-year time gate, 10 programs, 5 chapters, and multi-phase improvement. Their recent engagement status is almost certainly already satisfied by their ongoing training pattern. Scaling the recent engagement threshold for athletes at this stage is answering a problem that does not exist in practice.

**Option C (two-tier):** A compromise, but adds complexity without clear benefit over the uniform option. If scaling is desired, two tiers still require separate documentation, separate evaluation logic, and separate P-2 guidance copy for each tier.

### Recommendation: **Option A — Uniform threshold (12 weeks / 8 AW) for all prestige ranks**

**Rationale:**

1. **Upper-rank athletes are already deeply engaged.** An athlete approaching Established (72 cumulative AW), Legend (210 cumulative AW), or Legacy (288 cumulative AW) has a training history of years. They are extremely unlikely to have a recent engagement failure — their pattern of training is what enabled them to reach these thresholds. Scaling the threshold would address a problem that almost never occurs in practice.

2. **The time gates and category thresholds provide the real protection.** The 4-year minimum (E→L) and 7-year minimum (L→I) time gates are the genuine identity-credibility protection at upper ranks. Recent engagement's role is to catch the edge case of a returning athlete who has been dormant for months. The uniform threshold accomplishes this at every prestige rank.

3. **Communication simplicity is a product value.** Guided Transparency (RSA §17) requires that athletes understand their development direction. One uniform standard for recent engagement is a communication win: athletes at any prestige rank understand the same recent engagement signal. Scaling would require tailored messaging per rank in P-2, adding UX complexity with no corresponding product benefit.

4. **Engineering simplicity.** The evaluation service uses one constant for `recentEngagementMinAW` applied to all prestige rank queue-firing events. No per-rank conditional logic.

### Implementation Impacts

- **Evaluation service:** Single `recentEngagementConfig = { windowDays: 84, minActiveWeeks: 8 }` constant applied at all prestige rank promotion events.
- **P-2 guidance copy:** One set of recent engagement guidance copy applies at Architect, Established, Legend, and Legacy approach. No rank-specific variations needed.
- **Threshold table (RCM §14.11):** The "Recent Engagement" row can be annotated as "Required: 12 weeks / 8 AW (uniform)" rather than showing per-rank values.

---

## Q11 — Import Partial Credit Rate for Training Signals

### Decision Required

At prestige rank thresholds, what is the specific partial credit rate applied to imported active weeks and imported sessions?

### Context

Rank-Computation-Model.md §14.4 establishes that for prestige rank transitions (Craftsman→Architect and above), imported active weeks contribute at a partial credit rate (with a Forge-native floor at 50% of the total AW threshold). The partial credit rate determines how much of the remaining 50% imported history can contribute.

The Forge-native AW floor is structural: it requires 50% of cumulative AW to be native. If total AW threshold is 36 (C→A), then 18 must be native. The question is: how many imported AW are needed to satisfy the remaining 18? At 100% credit (no discount), 18 imported AW fills the gap. At 50% credit, 36 imported AW are needed. At 25% credit, 72 imported AW are needed.

### Options Evaluated

**Option A — 100% credit (no discount)**
Imported AW count the same as native AW toward the total threshold (above the native floor). The native floor ensures 50% native; imported history fills the rest at face value.

**Option B — 50% credit**
Imported AW count as 0.5 toward the cumulative total. An athlete needs twice as many imported AW to fill the remaining 50% of the threshold.

**Option C — 25% credit**
Imported AW count as 0.25. An athlete needs four times as many imported AW to fill the remaining 50% — in practice, a large imported history is needed.

**Option D — Import-eligible for AW, native-only for volume sessions**
Active weeks from imported sessions receive partial credit (50% rate), but volume (meaningful work session count) must be entirely Forge-native for prestige ranks.

### Tradeoffs

**Option A (100%):** Functionally, any imported active week fills the threshold gap dollar-for-dollar above the native floor. An athlete with 18 native AW and 18 imported AW exactly satisfies the C→A threshold. This is the most permissive treatment of imported history consistent with R-D46. The Forge-native floor still ensures that half the evidence is native — 100% credit on the imported portion does not undermine this.

**Option B (50%):** The imported portion of threshold accumulation is discounted. An athlete with 18 native AW and 36 imported AW satisfies C→A. This reflects that imported sessions represent training done outside Forge Legacy's context — real training, but without the ecosystem-specific development (chapters, goals, programs) that native training enables. A 50% discount honors the history while acknowledging the difference.

**Option C (25%):** Heavily discounted. An athlete with 18 native AW and 72 imported AW satisfies C→A — which means an athlete needs approximately 2 years of imported history above their native floor to meet the imported contribution. This is likely too punishing for athletes with genuine pre-Forge training history who are not trying to game the system.

**Option D (split approach):** Volume and AW get different treatment. This adds complexity to the evaluation service without clear product rationale — both signals represent training done outside Forge Legacy, and there is no principled reason to treat them differently.

### Recommendation: **Option B — 50% partial credit rate**

**Rationale:**

1. **50% is internally consistent with the Forge-native floor logic.** The native floor requires 50% of AW be native. The partial credit rate of 50% means the imported portion also contributes at half-value. Structurally: the system values Forge-native training at 1.0 and imported training at 0.5. This is a clean, symmetric model.

2. **50% is generous enough to honor genuine long training histories.** An athlete who has been training for 5 years before joining Forge, with consistent imported history (e.g., 150 imported AW), would contribute 75 imported AW (at 50% credit) toward prestige rank thresholds. Combined with their Forge-native accumulation, their imported history meaningfully accelerates their progression through the early prestige ranks. This respects the "Never Charge For History" principle.

3. **50% is not so generous that import gaming is viable.** An athlete who imports a brief training history specifically to satisfy thresholds would need 2× the imported AW to fill the remaining threshold gap. This makes targeted manipulation of the system less rewarding than simply training natively.

4. **Applied uniformly across AW and volume.** Both active weeks (consistency signal) and meaningful work sessions (volume signal) receive the same 50% discount. The same imported session that counts as 0.5 AW credit counts as 0.5 session credit toward the volume threshold. Symmetric treatment, single implementation pattern.

### Implementation Impacts

- **Signal computation:** `importedAWCredit = importedAW × 0.50`. `importedSessionCredit = importedSessions × 0.50`. Both applied when computing total AW and total sessions at prestige rank evaluation.
- **Evaluation service:** Track `nativeAW`, `importedAW`, `nativeSessions`, `importedSessions` as separate counters. Compute weighted totals: `totalAW = nativeAW + (importedAW × 0.50)`. Same pattern for sessions.
- **Forge-native floor check:** Evaluated separately: `nativeAW >= nativeFloor` must be true before any partial credit math is relevant.
- **Lower-rank thresholds (F→B, B→C):** Full credit (1.0) for both native and imported sessions, consistent with RCM §14.4 (full credit for Foundation and Builder thresholds). The 50% credit rate applies only at prestige rank transitions (C→A and above).
- **Athlete-facing messaging:** Athletes using the import pipeline should be informed that imported sessions contribute at 50% toward prestige rank thresholds — not as a penalty, but as a transparency commitment under Guided Transparency (RSA §17).

---

## Q12 — Forge-Native Volume Floor for Prestige Ranks

### Decision Required

Should Training Volume (meaningful work session count) have a Forge-native floor analogous to the Forge-native AW floor, or does the Q11 partial credit rate (50%) handle this sufficiently?

### Context

The Forge-native AW floor (D-RCM-12, RCM §14.4) requires that 50% of cumulative active weeks at each prestige rank transition be Forge-native. This is a structural floor — it must be satisfied regardless of how many imported AW exist.

Training Volume (meaningful work sessions) uses the same partial credit rate (Q11 decision: 50%). The question is whether a symmetric native floor should exist for volume: must 50% of the total session count also be Forge-native?

The two signals measure different things:
- **AW (active weeks):** Measures training pattern distribution — how consistently the athlete showed up across time.
- **Session count (volume):** Measures accumulated effort — how much total training work the athlete has done.

The Forge-native AW floor protects against an athlete whose imported history contains dense early activity patterns (many AW) but whose native Forge training pattern is thin. The question is whether volume needs the same protection.

### Options Evaluated

**Option A — Symmetric floor (50% of sessions must be Forge-native)**
Mirror the AW native floor structure. At C→A (90 sessions required), at least 45 must be Forge-native. At L→I (700 sessions required), at least 350 must be Forge-native.

**Option B — No floor (Q11 partial credit rate sufficient)**
The 50% partial credit rate on imported sessions (Q11) already provides meaningful structural protection. No additional native floor. An athlete could satisfy the full volume threshold using partial credit from imported sessions, as long as the AW native floor is met.

**Option C — No floor for lower prestige ranks (C→A, A→E), floor for upper prestige ranks (E→L, L→I)**
Volume native floor applies only at Legend and Legacy thresholds (where the volume requirements are 400 and 700 sessions respectively), reflecting the depth of Forge-native development expected at those identities.

### Tradeoffs

**Option A (symmetric floor):** Consistent with the AW floor philosophy. But volume and AW are not equivalent signals — volume measures total accumulated work (how much), while AW measures pattern distribution (how often across time). The AW floor exists primarily to enforce current Forge Legacy engagement. Volume at lower prestige ranks (C→A: 90 sessions) can be met with a mix of native and imported sessions without undermining identity credibility. Requiring 45 native sessions for C→A is achievable — but adds a check that the AW floor largely already captures (an athlete with 18 native AW will have accumulated many more than 45 native sessions at 3 sessions/active week).

**Option B (no floor):** The 50% partial credit rate means an athlete cannot satisfy the volume threshold entirely through imports — they need twice as many imported sessions as the threshold value requires. In practice, the AW native floor is the more binding constraint, and native AW accumulation will always produce native session accumulation in parallel. An athlete who has 18 native AW (C→A floor) has at minimum 54 native sessions (3 sessions/AW minimum), already meeting any reasonable native volume floor.

**Option C (tiered):** Adds complexity for marginal benefit. The rationale for a floor at Legend/Legacy but not at lower prestige ranks would need independent justification.

### Recommendation: **Option B — No separate Forge-native volume floor**

**Rationale:**

1. **The AW native floor already produces native session accumulation.** An athlete who meets the Forge-native AW floor will have accumulated Forge-native sessions in proportional quantities. The AW floor is the binding structural protection; a volume floor would be redundant in practice.

2. **Volume is a confirming signal, not a primary gate.** RCM §14.8 notes that "volume confirms accumulated work but doesn't independently govern prestige promotions." The AW threshold and time gates are the primary binding constraints. Volume is a supporting confirmation. Adding a native floor to a confirming signal adds governance complexity without changing who promotes.

3. **The 50% partial credit rate (Q11) is sufficient protection.** An athlete who imports 400 sessions contributes only 200 session-credit toward the E→L threshold (400 required). They still need at least 200 native sessions to satisfy the remaining threshold — and with 105 native AW required (E→L floor), they will have far more than 200 native sessions already.

4. **Simplicity in the evaluation model.** Two floors (AW + volume) are harder to communicate to athletes than one (AW). The No Hidden Blockers principle (RSA §18) requires that athletes can understand what they need. Adding a volume floor that mostly doesn't bind adds unnecessary surfacing complexity.

### Implementation Impacts

- **Evaluation service:** Volume check is: `(nativeSessions + importedSessions × 0.50) >= volumeThreshold`. No separate native floor check on sessions.
- **P-2 guidance:** Volume guidance communicates total accumulated volume (weighted), not native vs. imported split. Athletes see "you've accumulated X meaningful training sessions" — a cumulative signal.
- **Threshold table (RCM §14.11):** The Forge-native AW floor column is the only native floor tracked. No native session floor column needed.

---

## Q13 — Improvement Pattern Quantitative Thresholds

### Decision Required

The family promotion table (RCM §14.6) defines Personal Improvement requirements qualitatively: "first event," "multi-period pattern," "repeated," "multi-year," "multi-phase." What specific event counts and time distributions make these operational?

### Context

The Personal Best Progression model (TBD-8) evaluates improvement by counting new personal bests on the athlete's primary signal within evaluation windows. The qualitative descriptions in the threshold table must be translated to specific minimum counts and minimum time distributions for the evaluation service to run.

RCM §17 (Session 4 Open Questions) provides a proposed framework:
- "First event" (B→C): ≥1 personal best at any time
- "Multi-period pattern" (C→A): ≥3 personal bests, at least 2 separated by 30+ days
- "Repeated" (A→E): ≥6 personal bests, spread across at least 6 months of training history
- "Multi-year" (E→L): ≥10 personal bests, with at least 1 in each of 2 separate calendar years
- "Multi-phase" (L→I): ≥15 personal bests, with advancements in at least 3 separate calendar years

These are the proposed starting values requiring confirmation or revision.

### Context for Each Tier

**B→C ("first event"):** The athlete is transitioning to Craftsman — "I know how to train." The personal improvement requirement is the first evidence of meaningful progress, not a pattern. One personal best is the right threshold: low enough to be accessible within the Builder period, high enough to confirm the athlete has progressed beyond their initial baseline.

**C→A ("multi-period pattern"):** The athlete is approaching Architect — "I'm intentionally shaping my development." The athlete must have demonstrated that their improvement is not a one-time result but a pattern. Multiple personal bests across multiple sessions over multiple time periods confirms this.

**A→E ("repeated"):** The athlete is approaching Established — "I've built something real." Repeated improvement means a clear, sustained pattern — not a burst. The evidence must span enough history to distinguish genuine progressive development from a training peak.

**E→L ("multi-year"):** The athlete is approaching Legend — "My journey has become a meaningful story." Multi-year improvement requires that the athlete's personal best history crosses calendar year boundaries, confirming the story has unfolded over real time.

**L→I ("multi-phase"):** The athlete is approaching Legacy — "I repeatedly become the person I intend to become." Multi-phase improvement requires a record of improvement distributed across multiple distinct phases of the journey, spanning multiple years.

### Options and Analysis by Tier

**B→C — First event:**
No alternatives needed. The framework's "≥1 personal best at any time" is correct. One personal best is the binary evidence that improvement has begun.
→ **Decision: ≥1 personal best on the primary signal at any point in training history.**

**C→A — Multi-period pattern:**
The proposed framework (≥3 personal bests, ≥2 separated by 30+ days) is reasonable. Three personal bests ensure a pattern, not a streak in a single training block. The 30-day separation requirement means at least two bests were achieved in distinct calendar months — genuinely across time periods.

Alternative: ≥2 personal bests, separated by 60+ days. More permissive on count, stricter on distribution. An athlete who set two personal bests separated by 2 months has demonstrated more "pattern" than one who set three bests in the same 4 weeks.

The 30-day version is preferable: both the count (3) and the distribution (2 separated by 30+ days) contribute information. Three bests with the constraint is more robust than two bests with a longer gap.
→ **Decision: ≥3 personal bests on the primary signal; at least 2 of the 3 separated by ≥ 30 days.**

**A→E — Repeated:**
The proposed framework (≥6 personal bests across ≥6 months of training history) means improvement distributed over at least half a year. This is appropriate for "I've built something real" — building something real takes time.

Alternative: ≥5 personal bests across ≥4 months. Slightly less demanding but still demonstrates a multi-month pattern.

The 6/6-month version reflects better identity alignment. Established is not reached in under 18 months at baseline pace; 6 months of documented improvement evidence is modest in that context.
→ **Decision: ≥6 personal bests on the primary signal; first and most recent separated by ≥ 6 calendar months.**

**E→L — Multi-year:**
The proposed framework (≥10 personal bests, ≥1 in each of 2 separate calendar years) requires real multi-year evidence. This is appropriate for "my journey has become a meaningful story" — the story spans years.

The threshold is realistic: Legend is not reached until 5+ years at baseline. By that point, an athlete with a genuine improvement history will have well more than 10 personal bests distributed across multiple years.

Alternative: ≥8 personal bests across ≥2 calendar years. Slightly lighter count but same distribution requirement. The additional count (10 vs. 8) is not meaningfully more demanding and provides better evidence of a genuine multi-year pattern.
→ **Decision: ≥10 personal bests on the primary signal; with at least 1 personal best registered in each of ≥ 2 distinct calendar years.**

**L→I — Multi-phase:**
The proposed framework (≥15 personal bests across ≥3 calendar years) requires a multi-year improvement arc spanning at least 3 distinct years. This is appropriate for "I repeatedly become the person I intend to become" — the "repeatedly" implies multiple distinct phases, not a single long improvement arc.

Legacy is a 7-year minimum journey. An athlete with 15 personal bests across 3 calendar years has a genuine multi-phase improvement record. This is not a trivial achievement — consistently improving on primary signals over 7+ years and 15 documented advances is meaningful.
→ **Decision: ≥15 personal bests on the primary signal; with at least 1 personal best registered in each of ≥ 3 distinct calendar years.**

### Consolidated Q13 Decision Table

| Transition | Qualitative Label | Min Personal Bests | Distribution Requirement |
|-----------|-------------------|-------------------|--------------------------|
| B → C | First event | ≥ 1 | Any time — no distribution required |
| C → A | Multi-period pattern | ≥ 3 | At least 2 of the 3 separated by ≥ 30 days |
| A → E | Repeated | ≥ 6 | First and most recent separated by ≥ 6 calendar months |
| E → L | Multi-year | ≥ 10 | At least 1 personal best in each of ≥ 2 distinct calendar years |
| L → I | Multi-phase | ≥ 15 | At least 1 personal best in each of ≥ 3 distinct calendar years |

### Notes on Application

**Evaluation window for personal best detection:** A personal best is registered when the athlete's logged performance on their primary signal (exercise-level for Strength, pace/distance for Running, HIIT rounds or Strength for Boxing, any modality for Hybrid using OR logic) exceeds their prior maximum. Personal bests must be logged in meaningful-work sessions (10-minute floor, Q1) to count.

**Import treatment for personal bests:** Imported performance data (weight, reps, distance, time) establishes the historical personal best floor. Improvement is evaluated relative to trajectory — not against the absolute imported maximum. However, a native-Forge personal best that genuinely exceeds any prior record (native or imported) is still a valid personal best event. The specific evaluation logic for improvement relative to imported baselines is determined by the Rank Evaluation Service (TBD-16).

**Hybrid athletes:** OR logic applies. Personal bests across any of the athlete's actively trained modalities count toward the above thresholds. A Hybrid athlete's total personal best count aggregates across modalities.

### Implementation Impacts

- **Personal best tracking:** Evaluation service must maintain a per-athlete, per-exercise (Strength) or per-modality (Running, Boxing, Hybrid) personal best registry with timestamps. The date of each personal best is required for distribution requirement checking.
- **Improvement module:** New evaluation module within the Rank Evaluation Service: `ImprovementModule.evaluate(athleteId) → { personalBestCount, personalBestDates, satisfiedTier }`.
- **C→A and above:** Separation requirement calculations require comparing timestamps of personal best events. Simple date arithmetic.
- **Calendar year check (E→L, L→I):** Extract the calendar year from each personal best date. Check distinct year count meets the minimum.

---

## Q14 — Distinct Development Phases Definition (Legend Milestone)

### Decision Required

How is "distinct development phases" operationalized for the Legend program graduation milestone?

### Context

The Legend signature milestone (RCM §14.7) requires 6 program graduations "spanning at least 3 of the 6 from different program categories or significantly different program designs." The intent is to prevent an athlete from satisfying the Legend milestone by graduating the same program 6 times in succession, without engaging with meaningfully diverse structured development.

The Legend identity — "My journey has become a meaningful story" — requires that the story includes narrative variety, not a single repeated chapter. The program graduation component of the Legend milestone captures this: multiple programs representing distinct development phases.

Three operationalization approaches are available:
- (a) Program category tag — requires 3+ distinct program categories from a labeled taxonomy
- (b) Time-separation rule — at least 12 months between graduations from the same program
- (c) Program Authoring Standard activity type — 3+ different activity types among the 6 programs

### Options Evaluated

**Option A — Program category tag (distinct taxonomic categories)**
Programs in the FORGE catalog and athlete-created programs carry a category label (e.g., "Strength Hypertrophy," "Endurance Base," "Conditioning," "Mobility"). Legend milestone requires that at least 3 of the 6 graduated programs belong to distinct categories.

- Pro: Clean, boolean check per graduation. Directly operationalizes "distinct" as taxonomically different.
- Con: Requires a program category taxonomy to exist and be consistently applied to all programs in the catalog. This taxonomy is not currently defined in the Program Authoring Standard. Adding it requires a PAS amendment.
- Con: FORGE-authored programs may not have consistent category labels at MVP catalog completion.

**Option B — Time-separation rule (minimum 12 months between same-program graduations)**
The Legend milestone counts each program graduation once per 12-month window. Graduating the same program twice within 12 months counts as one graduation for Legend milestone purposes. This prevents 6 consecutive graduations of the same program while accommodating athletes who genuinely repeat a program after meaningful time has passed.

- Pro: Simple rule with no taxonomy required. Program identity is already tracked (program ID).
- Pro: Allows repeat programs if the athlete waited 12 months — which reflects genuine periodic reassessment rather than gaming.
- Con: Does not directly operationalize "distinct development phases." An athlete could graduate 6 different strength hypertrophy programs (all similar in design) spread across years and satisfy the rule while having no genuine variety.

**Option C — Activity type diversity (≥ 3 distinct activity types among the 6 programs)**
The Program Authoring Standard v1.0 defines a primary activity type for each program. Legend milestone requires that among the 6 graduated programs, at least 3 different activity types are represented.

- Pro: PAS already requires a primary activity type field on every program. No taxonomy amendment required.
- Pro: Activity type variety directly captures "different development phases" — a Strength program and a Mobility program represent genuinely different phases of development, even at MVP.
- Con: 9 canonical activity types exist, but many athletes specialize. A Strength athlete's 6 programs may all be STRENGTH type — not because they lacked variety but because Strength training is their domain. Requiring 3 activity types could penalize specialists without good reason.

### Hybrid Option (Recommended)

**Option B + C combined:** An athlete satisfies the "distinct development phases" requirement if EITHER:
1. No single program contributes more than 2 graduations to the 6-graduation count (maximum 2 repeat graduations from the same program across the entire Legend milestone period), **OR**
2. At least 2 of the 6 graduations are from programs of a different primary activity type than the other 4.

This hybrid avoids requiring a full category taxonomy (Option A), allows specialists (avoids penalizing Option C exclusively), and prevents the pure-repeat scenario (addresses Option B's weakness).

However, the hybrid creates two evaluation branches where one would suffice. This increases evaluation service complexity.

### Recommendation: **Distinct program IDs rule**

**Rule:** For the Legend milestone graduation count, each program ID may contribute at most 1 graduation credit toward the 6-graduation requirement. An athlete must have graduated at least 6 programs with distinct program IDs. Additional graduations of an already-credited program accumulate normally toward Program Progression (#3 category) but do not increment the Legend milestone count.

*Revised from initial 18-month separation rule (Final Lock Review, June 2026). See rationale below.*

**Rationale:**

1. **Directly implements the RCM's own language.** RCM §14.7 states "6 program graduations, spanning at least 2 different programs (not 6 repetitions of the same program)." The phrase "not 6 repetitions" points to program identity (distinct IDs), not to a time-based separation rule. The distinct IDs rule is the minimal, direct implementation of this intent.

2. **The structural timeline prevents the abuse case without an additional rule.** Legend requires 210 cumulative AW (~70 months at baseline). An athlete genuinely repeating the same program 6 times in rapid succession would need to complete ~9 months of consecutive cycles during a 70-month journey. The remaining ~61 months would, in virtually any realistic case, include other program engagements. The pure gaming scenario is structurally implausible at Legend territory.

3. **Simpler to implement.** `COUNT(DISTINCT programId) >= 6` is a single aggregation requiring no date math, no per-program-pair comparison, and no special-case logic. The 18-month rule required: retrieve all prior graduations of the same program ID, sort by date, check gap — per program, per athlete, at E→L evaluation time.

4. **Specialists are not penalized.** A Strength athlete who graduates 6 different strength programs of different designs and durations satisfies the rule freely. Structural variety within a modality (6 distinct programs) represents genuine "distinct development phases" within that type.

5. **No taxonomy or PAS amendment required.** Program ID tracking already exists. No new metadata is needed.

**Implementation note:** "Distinct program" = distinct program ID. A program authored by an athlete has its own ID distinct from any FORGE catalog program. Multiple runs of the exact same program share a program ID. Re-running a previously graduated program still contributes to Program Progression (#3 category) — it simply does not increment the Legend milestone graduation count beyond 1.

### Implementation Impacts

- **Legend milestone evaluation:** `qualifyingGraduations = COUNT(DISTINCT programId) FROM ProgramGraduationRecord WHERE athleteId = X`. Threshold: ≥ 6.
- **Data model:** `ProgramGraduationRecord` entity must store `programId` and `graduationDate`. `programId` is the only field required for the milestone check; `graduationDate` is already required for Program Progression ordering and RCM Section 14.7's "at least 3 across different categories" context check.
- **Engineering impact is minimal.** Single distinct-count query. Simpler than the prior 18-month date-comparison approach.

---

## Summary of Decisions

| Question | Decision | Status |
|----------|----------|--------|
| Q1 | Meaningful Work duration floor = **10 minutes** | Recommended |
| Q2 | Active Month threshold = **≥ 2 Active Weeks per calendar month** | Recommended |
| Q7 | Recent engagement: **native sessions only** (imported sessions ineligible) | Recommended |
| Q8 | Athlete type: **declared at onboarding (O-2), editable via P-1**; type changes re-attribute history, non-destructive | Recommended |
| Q9 | Recent engagement: **12-week lookback window, ≥ 8 native active weeks required** | Recommended |
| Q10 | Recent engagement thresholds: **uniform across all prestige ranks** (12 weeks / 8 AW) | Recommended |
| Q11 | Import partial credit rate: **50% for both active weeks and sessions** at prestige rank thresholds | Recommended |
| Q12 | Forge-native volume floor: **none** — AW native floor sufficient; 50% partial credit on sessions is adequate protection | Recommended |
| Q13 | Improvement pattern thresholds: ≥1 (B→C), ≥3 / 30d separation (C→A), ≥6 / 6-month span (A→E), ≥10 / 2 calendar years (E→L), ≥15 / 3 calendar years (L→I) | Recommended |
| Q14 | Legend milestone "distinct phases": **distinct program IDs rule** — each program ID contributes ≤ 1 graduation credit to the Legend milestone count | Recommended |

---

## Remaining Decisions Before Engineering Begins

With Q1–Q14 resolved, the following items from the Rank Implementation Readiness Review (Docs/Rank-Implementation-Readiness-Review.md) remain before full engineering implementation can proceed:

### Inherited Open Questions (Not In Scope Here — Already Carried Forward)

| Item | Status | Notes |
|------|--------|-------|
| Q3 — Imported session duration handling | Open | Policy for durationless imported sessions. Low-impact; can be resolved in import pipeline spec. |
| Q4 — Goal Participation import treatment | Open | Whether goal records are importable. Resolved in import pipeline spec or declared native-only. |
| Q5 — Achievement amplification | Open | Scoring layer decision. Not a promotion gate. Low priority; does not block evaluation service implementation. |
| Q6 — Longevity signal unit | Open | Months vs. years for display. Display-only; does not block evaluation. |

**These four open questions do not block engineering implementation of the rank evaluation service.** Q3 and Q4 are import pipeline policy decisions; Q5 and Q6 are display and scoring layer decisions. None are gates for the core evaluation path.

### Documents Still Required Before Full Implementation

| Document | Priority | Notes |
|----------|----------|-------|
| Rank Data Model Spec (TBD-12) | CRITICAL — already authored in RCM Session 5 (§23) | Review and confirm completeness |
| Rank Evaluation Trigger Spec (TBD-1) | CRITICAL — already authored in RCM Session 4 (§19) | Review and confirm completeness |
| Rank Evaluation Service Architecture (TBD-16) | CRITICAL — already authored in RCM Session 4 (§20) | Review and confirm completeness |
| O-2 First-Time Setup amendment | HIGH — required per Q8 decision | Add athlete type declaration step |
| P-1 Profile screen amendment | HIGH — required per Q8 decision | Add athlete type field, editable |
| Sub-tier Surfacing Mechanism Spec (TBD-2) | MEDIUM — required before P-2 sub-tier display | Deferred to P-2 workstream |
| P-3 Rank Detail Screen Spec | MEDIUM — can begin now (TBD-12 complete) | Blocked only until after P-2 finalization |

**Note:** Sessions 4 and 5 of the Rank-Computation-Model.md have resolved TBD-1, TBD-12, and TBD-16 — the three highest-priority blockers identified in the Readiness Review. Confirm those sections are complete and reflect final decisions before treating them as unblocked.

---

## Recommendation: Lock Rank-Computation-Model.md

**Recommendation: LOCK the Rank-Computation-Model.md, with Q1–Q14 decisions incorporated.**

### Basis for LOCK Recommendation

**What is now resolved:**
- All 15 TBDs from RSA are resolved across Sessions 1–5 of the RCM (including TBD-1, TBD-12, and TBD-16 in later sessions)
- All critical open questions (Q1, Q8, Q9, Q13) are resolved in this document
- All high-priority open questions (Q2, Q7, Q10, Q11) are resolved in this document
- Medium-priority questions (Q12, Q14) are resolved in this document

**What remains open (non-blocking):**
- Q3, Q4, Q5, Q6 — import policy and display/scoring layer decisions that do not block the evaluation service

**Conditions for LOCK:**

1. **Update Section 17 (Open Questions for Session 4)** in RCM to indicate Q1–Q14 status: Q1, Q2, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14 are resolved in this document (Rank-Calibration-Decisions.md). Q3, Q4, Q5, Q6 carried forward as non-blocking.

2. **Update the Amendment Log** in RCM to record the lock date, locking authority, and the fact that Q1–Q14 resolution is provided by this document.

3. **Re-label the document status** from DRAFT to LOCKED.

4. **Session-specific TBD status table** in the header (Sessions 1–5) should be updated to confirm all TBDs are in a RESOLVED state.

**What LOCK implies:**
The computational decisions made across Sessions 1–5, calibrated by Q1–Q14 decisions in this document, are authoritative and stable. Engineering can implement the rank evaluation pipeline against these values. Changes to locked decisions require a formal amendment.

**What LOCK does not imply:**
Lock does not mean all downstream specifications are complete. O-2 and P-1 still require amendments for athlete type declaration. TBD-2 (sub-tier surfacing) is still open for P-2. Q3, Q4, Q5, Q6 are still open. Lock means the core computational model is ready for engineering.

---

*Rank Calibration Decisions*
*June 2026*
*Resolves: Q1, Q2, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14 from Rank-Computation-Model.md*
*Final Lock Review completed June 2026. Q14 revised from 18-month separation rule to distinct program IDs rule.*
*Locked v1.0 — June 2026*
