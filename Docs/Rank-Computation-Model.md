# Rank Computation Model
## Sessions 1–3 | DRAFT — June 2026

**Status:** DRAFT — Session 3
**Type:** Computational Authority Document
**Date:** June 2026

**Authority Chain:**
- Rank-System-Architecture.md v1.0 (LOCKED — architectural authority)
- FORGE_LEGACY_PRODUCT_DNA.md
- MVP-Architecture-Audit-v1.0.md

**Relationship to Rank-System-Architecture.md:**
This document is the computational authority for the rank system. It fills the TBD placeholders established in Rank-System-Architecture.md v1.0 without amending that document's architectural decisions. When decisions here are locked, they fill TBD references in the architecture document by reference — they do not overwrite it.

**Session 1 Scope:**
This session resolves the definitional layer for five TBD items:

| TBD | Item | Status |
|-----|------|--------|
| TBD-6 | Active Week / Active Month definitions | Resolved — see Section 2 |
| TBD-7 | Meaningful Work definition | Resolved — see Section 3 |
| TBD-13 | Chapter Progression category definition | Resolved — see Section 4 |
| TBD-14 | Longevity secondary category definition | Resolved — see Section 5 |
| TBD-15 | Goal Participation definition | Resolved — see Section 6 |

**Session 1 Explicitly Excludes:**
- Thresholds, numeric promotion requirements, or scoring values for any category
- Promotion formulas or weighting ratios
- Rank evaluation trigger events (TBD-1)
- Sub-tier or family-level promotion thresholds (TBD-3, TBD-4)
- Rank evaluation service architecture (TBD-16)
- Data model schema (TBD-12)
- Personal Improvement per-athlete-type metrics (TBD-8)
- Any TBD not listed in the scope table above

---

**Session 2 Scope:**
This session resolves the definitional layer for two TBD items:

| TBD | Item | Status |
|-----|------|--------|
| TBD-8 | Personal Improvement metrics by athlete type | Resolved — see Section 9 |
| TBD-10 | Recent engagement definition | Resolved — see Section 10 |

**Session 2 Explicitly Excludes:**
- Thresholds, numeric evaluation windows, or count values for any improvement signal
- Scoring formulas or weighting ratios for personal improvement
- Athlete type declaration UX or data model schema (TBD-12)
- Rank evaluation trigger events (TBD-1)
- Sub-tier or family-level promotion thresholds (TBD-3, TBD-4)
- Rank evaluation service architecture (TBD-16)
- Any TBD not listed in the Session 2 scope table above

**Remaining Open TBDs (carry to future sessions):**
TBD-1, TBD-2, TBD-3, TBD-4, TBD-5, TBD-11, TBD-12, TBD-16

---

**Session 3 Scope:**
This session resolves the threshold layer for three TBD items:

| TBD | Item | Status |
|-----|------|--------|
| TBD-3 | Sub-tier thresholds | Resolved — see Section 13 |
| TBD-4 | Family promotion thresholds | Resolved — see Section 14 |
| TBD-5 | Promotion spacing values | Resolved — see Section 15 |

**Session 3 Explicitly Excludes:**
- Rank evaluation trigger events (TBD-1)
- Sub-tier advancement surfacing mechanism (TBD-2)
- Icon display format (TBD-11)
- Rank data model schema (TBD-12)
- Rank Evaluation Service architecture (TBD-16)
- Partial credit rate for imported training signals (formula territory — deferred)
- Numeric threshold for Recent Engagement lookback window and active week count (Q9 — pending user decision)
- Meaningful Work duration floor value (Q1 — pending user decision)
- Active Month week-count threshold (Q2 — pending user decision)
- Athlete type declaration mechanism (Q8 — pending user decision)
- Any TBD not listed in the Session 3 scope table above

**Remaining Open TBDs (carry to future sessions):**
TBD-1, TBD-2, TBD-11, TBD-12, TBD-16

---

## 1. Foundational Definitions

Before resolving the individual TBDs, two foundational concepts require shared definitions. All five TBDs in this session either depend on or must be coherent with these concepts.

### 1.1 Session Record

A session record is a saved workout event created through Forge Legacy's logging flows (W-9 through W-16 for native sessions, or the Forge Content Import pipeline for pre-Forge history). A session record is:

- Typed: it carries one of the nine canonical activity types (STRENGTH, RUN, WALK, BIKE, SWIM, HIIT, MOBILITY, YOGA, OTHER) or an equivalent imported activity classification
- Timestamped: it has a start timestamp and a recorded duration
- Saved: it exists as a committed, persistent record — not an in-progress or abandoned logging state

Session records are the atomic unit from which all participation signals are derived. Active weeks, active months, meaningful work, longevity, and participation events all trace back to session records.

### 1.2 Native vs. Imported Sessions

Session records may be native (logged directly in Forge Legacy) or imported (brought in through the Forge Content Import pipeline via Architecture Amendment 001). Both types are session records. The distinctions between them are addressed in each TBD section where relevant.

The partial-credit framework governing imported history (R-D46, Rank-System-Architecture.md §8.3) establishes that imported history may contribute to Training Volume, Training Consistency, Historical Improvement, Timeline History, P-2 Progress Context, and Athlete Background. The specific credit calculations are threshold-level decisions deferred to a later session. The definitional question for each TBD is whether the underlying concept applies equivalently to native and imported records, or whether it requires different treatment.

---

## 2. TBD-6 — Active Week / Active Month Definitions

### 2.1 Problem

Training Consistency is the #1 primary rank category. Its primary signals are active weeks and active months. Neither term is defined anywhere in the locked architecture. Without these definitions, the Training Consistency category cannot be computed or evaluated for any athlete.

This TBD blocks: rank evaluation computation, P-2 Progress Hub rank progress display (R-D47), and any threshold-setting work in future sessions (TBD-3, TBD-4).

### 2.2 Structural Question

The definitional question for Active Week is a single axis: what is the minimum participation in a seven-day period for that period to count as "active"?

A secondary but non-trivial question is whether weeks should be defined as calendar weeks (Monday through Sunday) or as rolling seven-day windows.

### 2.3 Options Evaluated

**Option A — Any saved session**
Any calendar week containing at least one saved session record (of any type, any duration) = Active Week. Parallel definition for Active Month.

**Option B — Minimum session count per period**
A calendar week with at least N distinct sessions = Active Week. A calendar month with at least M distinct sessions = Active Month. N and M are numeric thresholds.

**Option C — Activity-type-dependent definitions**
Active Week criteria vary by the athlete's primary activity type. Strength athletes have one frequency norm; runners have another.

**Option D — Meaningful Work sessions as the floor**
A calendar week containing at least one session that qualifies as meaningful work (TBD-7) = Active Week. A calendar month containing at least one Active Week = Active Month (with the count of Active Weeks within the month being the density signal available to the evaluation layer).

**Rolling vs. Calendar:**
Either the Monday–Sunday calendar week or a rolling seven-day window can anchor the Active Week definition. Calendar weeks are simpler to communicate, reason about, and display. Rolling windows are more athlete-friendly (they don't penalize an athlete who trains Fri–Sat one week and Sun–Mon the next) but are more complex to compute and harder for athletes to intuit when viewing their progress.

### 2.4 Tradeoffs

| Option | Pro | Con |
|--------|-----|-----|
| A — Any session | Simplest, most inclusive. No ambiguity. | A two-minute log counts equally to a full workout. Easily inflated by trivial sessions. The word "active" loses meaning. |
| B — Session count | More precisely quantifies consistency. Harder to inflate. | N and M are thresholds — they cannot be defined in this session. Different athlete types have different natural frequencies; a universal N may be unfair to some. |
| C — Type-dependent | Adapts to the diversity of athlete types. | High complexity. Contradicts the principle that Training Consistency is type-agnostic — it is about showing up, not about what type of showing up. Personal Improvement is the type-adaptive category. |
| D — Meaningful Work floor | Quality floor via TBD-7 definition means trivial sessions don't count. Decouples from session count (doesn't require defining N). Clean separation: "active" is about quality of participation, not frequency. | Depends on TBD-7 being well-defined. If TBD-7 is set too high, Active Week becomes hard to achieve. |
| Calendar vs. Rolling | Calendar is simpler. Rolling is fairer. | Rolling windows create computation and display complexity. Calendar weeks are the natural unit for "I train Monday–Friday" mental models. |

### 2.5 Recommendation

**Active Week** = a calendar week (Monday through Sunday) containing at least one session that qualifies as meaningful work under the TBD-7 definition.

**Active Month** = a calendar month in which the number of Active Weeks meets or exceeds a count threshold. That threshold is a numeric value deferred to Session 2 (as part of threshold-setting work). The structure is: Active Month is a function of Active Week density within the month — not a separate, independent definition.

**Rationale:**
1. Tying Active Week to meaningful work (Option D) is the only option that makes "active" non-cosmetic without introducing a session count threshold (Option B) or type-specific complexity (Option C).
2. Calendar week anchoring is preferred over rolling windows. Athlete-facing transparency (Guided Transparency, Section 17 of RSA) requires that athletes can intuit their standing. "You had three active weeks this month" is communicable; a rolling-window equivalent is not.
3. Active Month defined as a function of Active Weeks (rather than as "any month with at least one session") means the density signal is available to the evaluation layer without requiring a separate definition. How many Active Weeks constitute an Active Month is a threshold — appropriate to Session 2.

**What this does not define:**
- The minimum session duration for meaningful work (TBD-7)
- The count of Active Weeks required to constitute an Active Month (threshold — Session 2)
- How many Active Weeks or Months trigger any promotion (threshold — Session 2)

### 2.6 Import Treatment

Imported session records contribute to Active Week and Active Month counts under the same definition as native sessions, provided they meet the meaningful work criteria (TBD-7). This is consistent with R-D46, which explicitly includes Training Consistency as a category to which imported history may contribute. The partial credit weighting that may apply to imported sessions relative to native sessions is a threshold/scoring question deferred to Session 2.

### 2.7 Downstream Impacts

- **TBD-7 (Meaningful Work)**: Active Week definition is directly dependent on TBD-7. These two TBDs must be locked together in the same session. Resolved below in Section 3.
- **TBD-3/TBD-4 (Thresholds)**: Active Week and Active Month counts feed directly into Training Consistency promotion thresholds. These are deferred but now have a clean, unambiguous input structure to threshold-set against.
- **P-2 Progress Hub (R-D47)**: The rank progress display requires both dimensions (sub-tier progress and major rank progress). Training Consistency progress visualization depends on Active Week and Active Month counts. P-2 implementation cannot finalize Training Consistency visualization until this definition is locked.
- **No Hidden Blockers (Section 18, RSA)**: P-2 What's Next must be able to surface "your consistency needs development" or "you are on track for another active month." This communication is only possible with a defined Active Week/Month structure.

---

## 3. TBD-7 — Meaningful Work Definition

### 3.1 Problem

Training Volume (#4 primary category) accumulates "meaningful work" across the athlete's Forge Legacy history. Without a definition of what constitutes meaningful work, Training Volume cannot be computed. Additionally, the Active Week definition (TBD-6) — as recommended above — depends directly on this definition.

This TBD blocks: Training Volume evaluation, Active Week computation (if the TBD-6 recommendation is adopted), and any threshold-setting for Training Volume in future sessions.

### 3.2 Structural Question

The definitional question is: what separates a session that constitutes real training from a session that should not count toward volume?

Four dimensions are relevant:
1. **Duration**: is there a minimum elapsed time?
2. **Activity type**: do all nine canonical activity types count equally?
3. **Completion state**: does a session need to be "finished" or does any save count?
4. **Import treatment**: does pre-Forge imported history count the same way?

### 3.3 Options Evaluated

**Option A — Any saved session**
Every saved session record constitutes meaningful work regardless of duration, type, or content.

**Option B — Duration floor (universal)**
A session constitutes meaningful work if its recorded duration meets a minimum elapsed time. The same floor applies to all nine activity types.

**Option C — Duration floor (type-differentiated)**
Different activity types have different duration floors. A Strength session requires more elapsed time to qualify than a HIIT session, which requires more than a Mobility session.

**Option D — Exercise content requirements**
For Strength sessions, meaningful work requires a minimum number of sets logged. For other types, duration-based qualification.

**Option E — Hybrid: universal duration floor plus session state requirement**
A session is meaningful work if it is a completed/saved session AND meets a universal duration floor.

### 3.4 Tradeoffs

| Option | Pro | Con |
|--------|-----|-----|
| A — Any session | Simplest. Maximally inclusive of all training styles. | "Meaningful" is cosmetic if any 30-second log qualifies. Creates a volume signal that can be inflated by trivial logs. Inconsistent with the ordinary meaning of "meaningful work." |
| B — Duration floor (universal) | One rule applies to all types. Easy to evaluate, explain, and audit. Respects that duration is the most honest cross-type proxy for real effort. | Specific value is a threshold (deferred). Does not distinguish between a very active Strength session and very light Mobility — but this is acceptable because the rank system explicitly does not judge training quality, only participation. |
| C — Duration floor (type-differentiated) | More precisely reflects that different activity types have different natural session lengths. | High complexity. Creates implicit hierarchies among activity types, which contradicts the product philosophy that all training is valid. Athletes who primarily practice Yoga or Mobility should not face a higher bar for "meaningful" relative to Strength athletes. |
| D — Exercise content | Captures that a Strength session with zero sets logged may be an error or setup event, not a training event. | Complex and inconsistent across types. Athletes logging outdoor activities (Run, Bike, Walk) do not log individual sets. Requires per-type content rules. |
| E — Hybrid (duration floor + completion state) | Addresses both the quality floor (duration) and the state problem (completed vs. abandoned). Clean, minimal rule. | Depends on the session completion state being reliably recorded — an engineering requirement, not a definitional problem. The duration floor value is still a threshold (deferred). |

### 3.5 Recommendation

A session constitutes **meaningful work** if it satisfies all three conditions:

1. **Completion state**: The session is a saved, completed session. In-progress sessions (not yet saved to the permanent record) and sessions that were begun but abandoned before any content was saved do not constitute meaningful work. A session "save" is a deliberate athlete action — it is not automatically triggered.

2. **Duration floor**: The session's recorded elapsed duration meets a minimum threshold. That threshold is a numeric value deferred to Session 2. The structural decision being made here is that duration is the universal quality floor for all nine activity types — no type is treated differently.

3. **Activity type**: The session carries one of the nine canonical activity types (STRENGTH, RUN, WALK, BIKE, SWIM, HIIT, MOBILITY, YOGA, OTHER). Custom-named "Other" sessions are included. No activity type is excluded from volume credit.

**Rationale:**
1. Duration as the universal floor avoids implicit hierarchy among activity types. A 20-minute Yoga session and a 20-minute Strength session both meet the same floor. The rank system does not judge the type of training — it judges showing up and doing real work.
2. Completion state as a requirement ensures that a session log that was never properly saved (an artifact of an interrupted session or a logging error) does not count. This is a data quality boundary.
3. Excluding no activity type preserves the product's inclusivity. Athletes who primarily practice Mobility, Yoga, or Walk-based training are not penalized relative to Strength athletes. Their work is equally meaningful.

**What this definition explicitly does NOT include:**
- Any requirement for exercise content (sets, reps, distance) — duration is the sole quality dimension
- Any distinction based on perceived effort or RPE
- Any distinction between native and imported sessions (addressed below)

### 3.6 Import Treatment

Imported session records are eligible for meaningful work classification if they meet the same criteria: completed session state and minimum duration. The import pipeline requires that imported sessions carry a duration value (or a sufficient proxy from which duration can be derived). Sessions in the imported history with no recoverable duration are not classified as meaningful work for volume purposes, as the quality floor cannot be verified.

This is consistent with R-D46: imported history may contribute to Training Volume. The definition does not discriminate against imported sessions by nature — it applies the same quality floor to both.

### 3.7 Downstream Impacts

- **TBD-6 (Active Week/Month)**: The Active Week definition recommended in Section 2 depends directly on this definition. Locking TBD-7 completes the dependency chain for TBD-6.
- **Training Volume evaluation**: The computation is now well-defined at the structural level. Accumulate the count (or total duration, or a combination — that is a scoring/weighting question for Session 2) of meaningful work sessions across the athlete's full history.
- **TBD-3/TBD-4 (Thresholds)**: Meaningful work sessions are the atomic unit for Training Volume threshold-setting in Session 2.
- **Import pipeline**: The import specification must ensure that session duration is captured for all imported records, or flag records where duration cannot be derived.

---

## 4. TBD-13 — Chapter Progression Category Definition

### 4.1 Problem

Chapter Progression is a secondary rank category capturing "the athlete's engagement with the chapter system — the primary narrative structure of Forge Legacy." The architecture (RSA §7.1) explicitly deferred whether this category counts sealed chapters only or all chapters (started and unsealed).

A strong precedent already exists in the architecture: signature milestones (RSA §14) explicitly require "completed and sealed" chapters for Architect and above. This section determines whether the secondary category definition is consistent with that precedent.

### 4.2 The Core Question

Does the act of starting a chapter contribute to Chapter Progression, or must a chapter be sealed before it contributes?

This is not a threshold question (how many sealed chapters triggers what rank). It is a definitional question about what the category measures.

### 4.3 Options Evaluated

**Option A — All chapters (started, active, sealed)**
Chapter Progression credits all chapters an athlete has engaged with: active chapters, sealed chapters, and any abandoned or otherwise non-sealed chapters.

**Option B — Sealed chapters only**
Chapter Progression counts only chapters that have been closed through the M-5 sealing transaction.

**Option C — Active chapter as a binary state, sealed chapters as the progression count**
The presence of an active chapter is a qualifying factor (athlete is currently engaged in the chapter system). The progression metric is the count of sealed chapters.

**Option D — Sealed chapters weighted primary, active chapter duration as secondary**
The sealed chapter count is the primary signal. Time spent in active chapters provides partial credit.

### 4.4 Tradeoffs

| Option | Pro | Con |
|--------|-----|-----|
| A — All chapters | Credits starting. Recognizes that long active chapters represent deep engagement even without sealing. | Conflicts with signature milestone precedent (sealed is the explicit bar for Architect+). Inflatable: an athlete can start and abandon many chapters without meaningful engagement. Starting a chapter is a low-friction action. |
| B — Sealed only | Consistent with signature milestone precedent. Measures completion, not initiation. Sealing is a deliberate ceremony (M-5) that cannot be triggered accidentally. Anti-gaming: sealing requires intent. Aligns with identity statements — "I've built something real" implies closed chapters. | An athlete with a very long active chapter (multi-year engagement) would not accumulate Chapter Progression despite genuine engagement. This is the single significant drawback. |
| C — Binary active + count sealed | Acknowledges active chapter presence without fully counting it. | The "has active chapter" signal is almost always satisfied for any engaged athlete. It adds minimal signal. Binary factors that are usually true are weak differentiation signals. |
| D — Sealed primary + active partial | More nuanced. Avoids the long-active-chapter edge case. | Introduces weighting between active and sealed contributions — a scoring formula, explicitly excluded from this session's scope. |

### 4.5 Recommendation

**Sealed chapters only.**

A chapter contributes to Chapter Progression when and only when it has been closed through the M-5 sealing transaction. An active chapter in progress does not contribute to the Chapter Progression count.

**Rationale:**

1. **Signature milestone precedent**: RSA §14 establishes that "completed and sealed Chapter" is the explicit bar for both the Architect and Established signature milestones. Defining the secondary category differently would create an inconsistency: the milestone (high-signal, explicit requirement) demands sealing while the category (accumulating, broader signal) would not. This inconsistency would be incoherent to reason about during threshold-setting.

2. **Anti-gaming and integrity**: Starting a chapter is a trivially accessible action — it requires minimal commitment. Sealing a chapter is a deliberate, ceremony-level transaction through M-5. Chapter Progression should measure completion, not initiation. The sealing event is the meaningful moment.

3. **Identity alignment**: The rank identities at mid-to-upper levels ("I've built something real," "My journey has become a meaningful story") imply closed stories. Sealed chapters are closed stories. Active chapters are open ones. The progression category should reflect accumulated, completed narrative units.

4. **No Hidden Blockers protection**: The drawback of this definition — that a long active chapter doesn't accumulate progression — is addressed by the No Hidden Blockers principle (RSA §18). If an athlete is approaching Architect and has not yet sealed a chapter, P-2 What's Next must proactively surface chapter sealing as a development area. The system guides them toward completion. The category definition is not wrong because the guidance system compensates.

**The long active chapter edge case:**
An athlete who has been in the same chapter for 18 months has genuine depth of engagement. That engagement is recognized in Training Consistency (active weeks accumulate), Training Volume (meaningful work accumulates), Program Progression (programs run within the chapter contribute), and Longevity (the span of their journey grows). Chapter Progression's definition as sealed-only means this athlete's chapter section score is low — but the other categories correctly recognize their development. This is an acceptable asymmetry. The remedy is not to weaken the Chapter Progression definition; it is to ensure the P-2 What's Next surface helps the athlete understand that sealing and beginning a new chapter would advance this specific area.

### 4.6 Downstream Impacts

- **Architect signature milestone**: Already consistent. The milestone requires a "first completed and sealed Chapter" — the category definition is now aligned.
- **Established signature milestone**: Already consistent. The milestone requires "multiple completed and sealed Chapters" — the category definition is aligned.
- **P-2 No Hidden Blockers guidance**: Athletes approaching Architect who have not sealed a chapter must receive proactive guidance. This is now a well-defined triggerable condition: athlete is approaching Architect rank threshold + sealed chapter count = 0 → surface chapter guidance in P-2 What's Next.
- **Chapter Reflection (L-6)**: L-6 is post-sealing enrichment. The reflection is not part of the sealing transaction. Chapter Progression credit fires at M-5 sealing, not at L-6 completion. Athletes who skip L-6 (the reflection) still receive Chapter Progression credit. This is correct — the reflection is optional; the sealing is the meaningful event.
- **Chapter creation (L-5) and import**: Imported chapters that arrive as pre-archived (per Import Amendment) are eligible for Chapter Progression credit if they are in the sealed state in the import record. An imported chapter that is not sealed does not contribute.

---

## 5. TBD-14 — Longevity Secondary Category Definition

### 5.1 Problem

Longevity is a secondary rank category capturing "evidence of sustained engagement over time, distinct from the density-of-participation signal provided by Training Consistency." The architecture flags two distinct concerns:

1. What does Longevity actually measure?
2. How does it avoid double-counting with Training Consistency's "active months" signal?

Both concerns must be resolved here. Without a definition, the Longevity signal would either be undefined or would duplicate Training Consistency — neither of which is acceptable.

### 5.2 The Fundamental Distinction

Training Consistency and Longevity measure different dimensions of the same underlying phenomenon (an athlete's training history over time). The distinction is:

- **Training Consistency**: *density* of participation — how reliably the athlete shows up within any given period. An athlete with 48 active weeks out of the last 52 weeks has high Training Consistency regardless of how long their total journey is.

- **Longevity**: *span* of the training journey — how long the journey has been running, independent of how densely it has been filled. An athlete who has been training (even inconsistently) for 5 years has more longevity than an athlete who has been training intensively for 6 months.

These are not the same thing. High density over a short period ≠ longevity. Long journey with low density ≠ high consistency. The rank system correctly treats these as different signals.

### 5.3 Options Evaluated

**Option A — Account creation date (account age)**
Longevity = elapsed time since the athlete's account was created in Forge Legacy.

**Option B — First session to most recent session (span)**
Longevity = the time elapsed between the athlete's earliest training record (native or imported) and their most recent meaningful-work session.

**Option C — Number of distinct calendar years with training activity**
Longevity = the count of distinct calendar years in which the athlete logged at least one meaningful-work session.

**Option D — Training journey start date only**
Longevity = the date of the athlete's first logged session. The elapsed time between that date and the evaluation date is the longevity signal. The "most recent session" is not an anchor — longevity grows with real-world time after the journey begins.

**Option E — Active years (rolling)**
Longevity = a complex function combining span and presence, with year-level granularity.

### 5.4 Tradeoffs

| Option | Pro | Con |
|--------|-----|-----|
| A — Account age | Simplest. Completely non-overlapping with Training Consistency (which measures session density, not account tenure). Immutable and ungameable. | Account creation is a trivial event. An athlete who created an account 3 years ago and logged 2 sessions has the same longevity signal as one who trained consistently for 3 years. Doesn't require any actual training. |
| B — First to most recent session (span) | Anchors to actual training activity, not account creation. Reflects the real span of the training journey. Non-overlapping with Training Consistency (which measures density within periods, not overall span). Import history extends it backward correctly. "Most recent session" anchor prevents a dormant athlete's longevity from growing indefinitely with no training. | A dormant athlete's span freezes at their last session — which means returning athletes resume longevity accumulation naturally. This is correct behavior, not a drawback. Requires identifying the athlete's earliest training record (native or imported). |
| C — Distinct active years | Requires real training engagement in each year counted. Aligns conceptually with the Honor System's Longevity honors (1-year, 3-year, 5-year, 10-year milestones). | Calendar year boundaries create artifacts (Dec 2023 + Jan 2024 = 2 years despite being one month apart). Coarser granularity than span-based options. |
| D — Journey start date only | Simpler than Option B. Longevity is purely about when you started — how long the commitment has existed. Grows naturally with time after starting. | Longevity grows whether the athlete trains or not. An athlete who trained once in 2021 and nothing since would have a 5-year longevity signal. This seems too disconnected from engagement. |
| E — Active years rolling | Nuanced, avoids year-boundary artifacts. | High complexity. Likely to require a scoring formula — excluded from this session's scope. |

### 5.5 Recommendation

**Longevity = the total span from the athlete's earliest training record to their most recent meaningful-work session.**

Defined precisely:
- **Earliest point**: the date of the athlete's earliest session record — either native (the first session ever logged in Forge Legacy) or imported (the earliest date in imported history, if import has been performed). Whichever is earlier.
- **Most recent point**: the date of the athlete's most recent session that qualifies as meaningful work (TBD-7).
- **Span**: the duration between these two dates, expressed in calendar months (or years — the unit is a threshold-level decision for Session 2).

**Why this option:**

1. **Non-overlapping with Training Consistency**: Training Consistency measures active-week and active-month density. Longevity measures the total span from earliest to most recent session. An athlete can have high density over a short span (short longevity, high consistency). An athlete can have a long span with low density (high longevity, low consistency). These are distinct signals that do not double-count.

2. **The "most recent session" anchor is correct**: Longevity should not grow indefinitely for a completely dormant athlete. The span "freezes" when training stops — it does not continue expanding just because time passes. When the athlete returns and logs another meaningful-work session, their longevity resumes accumulating. This is the natural behavior for a signal that represents "the length of the active journey."

3. **Import history extends longevity correctly**: Under R-D46, imported history may contribute to Training Consistency. The longevity span naturally extends backward to the earliest imported session date. An athlete with 10 years of pre-Forge history has a legitimate 10-year journey span — that span is their longevity. This is consistent with the "Never Charge For History" principle (Monetization Amendment 001).

4. **Simple, auditable, explainable**: The span between two dates is the most transparent possible longevity metric. There is nothing hidden in it. Guided Transparency (RSA §17) requires that athletes can understand their development direction — "your journey has been active for X years" is a communicable, athlete-facing signal.

**Non-overlap confirmation:**
- Training Consistency asks: "How many weeks/months did you actively train within the evaluation window?" (density signal)
- Longevity asks: "How long has your training journey been running?" (span signal)
- An athlete who started 6 years ago and has been training 90% of weeks since has both high consistency and high longevity. An athlete who started 6 years ago but only trains occasionally has high longevity and low consistency. An athlete who has trained intensively for 8 months has low longevity and high consistency. All three are distinct, meaningful states that the rank system should distinguish. This definition achieves that.

### 5.6 Import Treatment

The athlete's earliest imported session date extends the longevity span backward. This is the intended behavior under R-D46. An athlete who imports 5 years of training history does not "earn" rank based on longevity alone (prestige ranks require Forge-native confirmation) — but their longevity signal accurately reflects a genuine multi-year training journey. Longevity's partial contribution to rank evaluation, combined with the prestige rank Forge-native confirmation requirement, preserves the Identity Credibility Principle while honoring the athlete's real history.

### 5.7 Downstream Impacts

- **TBD-3/TBD-4 (Thresholds)**: Longevity span values will feed into secondary category threshold-setting in Session 2. The unit of measurement (months vs. years) and the minimum spans for each rank level are threshold decisions — deferred.
- **P-2 Progress Hub**: Longevity is surfaceable in P-2 as a directional signal: "Your training journey spans X months/years." This is an athlete-facing signal that requires only the span value — no formula exposure.
- **Import pipeline**: The import record must capture session dates accurately so that the earliest imported session date can be used as the longevity starting point. This is a data quality requirement for the import pipeline.
- **Honor System Longevity honors**: The Longevity family in the Honor System (1-year, 3-year, 5-year, 10-year Forging milestones) uses a different measurement framework — those honors are triggered by Honor Evaluation Service events, not by the rank Longevity category. RS-D17 (Honors are not direct rank inputs) ensures these remain separate systems. The conceptual alignment (both recognize time-based milestones) is not a conflict — it is an appropriate resonance between two separate recognition systems.

---

## 6. TBD-15 — Goal Participation Definition

### 6.1 Problem

Goal Participation is a secondary rank category capturing "intentional, goal-directed behavior." The architecture (RSA §7.3) defers whether participation means setting goals, completing goals, goal completion rate, or a combination.

This TBD is adjacent to — but must not conflict with — the Major Rank Identity Tests (RSA §15), which describe Goal Participation's role at specific rank levels: Architect requires "goal-directed behavior — intentional use of the goal system"; Established requires "goal fulfillment — goals set and achieved, not merely set."

The definition of Goal Participation as a category must be consistent with both the lower-rank description (intentional use) and the higher-rank description (fulfillment).

### 6.2 The Goal System Context

From the locked Goal Architecture (G-1, G-2, G-3):
- Every goal belongs to exactly one chapter
- A chapter can have one primary goal and unlimited secondary goals
- Goals have four states: In Progress (during active chapter), Achieved (athlete declared completion), Not Achieved (chapter sealed without completion), Archived (chapter sealed, goal achieved during chapter life)
- The only way to reach Not Achieved is through chapter sealing — there is no goal-level abandonment
- "Not Achieved" is neutral and factual. It is not a failure marker.
- Secondary goals contribute to chapters but are acknowledged at a lower level than primary goals
- Primary goal achievement triggers M-3 ceremony; secondary achievement does not

### 6.3 The Core Question

Goal Participation could be defined as:
1. The act of setting goals (creating goal records)
2. The act of achieving goals (Achieved outcomes)
3. The completion rate (Achieved / total resolved)
4. The full goal lifecycle: setting + resolution through chapter sealing

### 6.4 Options Evaluated

**Option A — Goal-setting only**
Goal Participation = total goals created (primary and secondary combined, across all chapters). A goal is counted the moment it is created, regardless of outcome.

**Option B — Goal achievement only**
Goal Participation = total goals that reached an Achieved outcome. Not Achieved goals do not contribute.

**Option C — Goal resolution (lifecycle completion)**
A goal participation event = a primary or secondary goal that has reached resolution — either Achieved or Not Achieved — through the chapter sealing transaction. Active goals in unsealed chapters are pending participation events, not counted participation.

**Option D — Completion rate**
Goal Participation = Achieved / (Achieved + Not Achieved) across all resolved goals. A percentage or ratio.

**Option E — Primary goals weighted heavily, secondary goals as multiplier**
Goal Participation = f(primary goal lifecycle events × weight_A + secondary goal lifecycle events × weight_B). Weighted combination.

### 6.5 Tradeoffs

| Option | Pro | Con |
|--------|-----|-----|
| A — Setting only | Rewards intentional planning. Simple to compute. | Low signal. Creating goals is a low-friction action. An athlete who creates dozens of secondary goals in an unsealed chapter accumulates participation without any meaningful commitment cycle. Inconsistent with Established identity test ("goals set AND achieved, not merely set"). |
| B — Achievement only | Aligns with Established identity test language. Rewards execution. | Punishes ambitious goal-setting. An athlete who attempts hard primary goals and misses some is more praiseworthy than one who sets easy goals and always achieves them. Conflicts with the product philosophy that "Not Achieved" is neutral. Also structurally weak: secondary goals that athletes don't bother achieving reduce participation score even when they were valid pursuits. |
| C — Resolution (lifecycle) | Captures the full commitment cycle. Achieving AND not achieving both count — neither is penalized. Prevents inflation by setting goals in unsealed chapters (they don't count until sealed). Consistent with chapter sealing as the meaningful lifecycle event. Aligned with TBD-13 (sealed chapters only for Chapter Progression) — parallel structure. | Achievement status is not reflected in the count. Two athletes with the same resolved goal count but different achievement rates appear equivalent. The identity test language "goals set and achieved, not merely set" suggests achievement matters. |
| D — Completion rate | Captures quality of follow-through. | This is a ratio/formula — explicitly excluded from this session's scope. Also penalizes ambitious goal-setting. An athlete who attempts 10 hard goals and achieves 7 would score 70% — potentially lower than one who set 3 easy goals and achieved all 3 (100%). This creates wrong incentives. |
| E — Weighted formula | Nuanced, rewards both participation and achievement. | Explicitly a formula — excluded from this session's scope. |

### 6.6 Recommendation

**Goal Participation is defined by the goal lifecycle: a goal participation event occurs when a primary or secondary goal reaches resolution through chapter sealing.**

Structural definition:

**Primary goal participation event**: A chapter that was sealed with a primary goal defined. Both Achieved and Not Achieved primary goal outcomes constitute primary participation events. The outcome (Achieved vs. Not Achieved) is a quality dimension within the event — it does not determine whether the event counts, but it may affect how the event is valued at threshold and scoring levels (deferred to Session 2).

**Secondary goal participation event**: A secondary goal that reached resolution (Achieved or Not Achieved) through chapter sealing. Secondary participation events carry less weight than primary events (weight is a Session 2 threshold question).

**Active (unsealed) goals**: An athlete with active goals in an active chapter has pending participation. These goals will become participation events when the chapter seals. They signal current engagement with the goal system but do not yet constitute counted participation events.

**What this does NOT count:**
- Goals created but not yet resolved (active chapter, unsealed goals) — pending, not counted
- The act of goal creation alone (without chapter sealing)
- Goals created and then existing in perpetually unsealed chapters

**Rationale:**

1. **Lifecycle over action**: The goal system is designed around the chapter lifecycle. Goals are chapter-scoped. Goal resolution happens at chapter sealing. Counting participation at the point of resolution rather than the point of creation is consistent with how the entire chapter system works — and consistent with the TBD-13 decision (Chapter Progression = sealed chapters only). These two secondary categories are now structurally aligned: both are triggered by the chapter sealing event.

2. **Not Achieved is valid participation**: The product explicitly frames "Not Achieved" as neutral — "I pursued this and my chapter closed; the goal wasn't completed; that is the full meaning." An athlete who pursued a hard primary goal and missed it should receive Goal Participation credit. Excluding Not Achieved outcomes would incentivize athletes to set only easy primary goals. That creates wrong behavior and conflicts with the product's Accountability Without Shame principle.

3. **Achievement as a quality signal, not a binary gate**: The identity tests for Established ("goals set and achieved, not merely set") and Icon ("repeated goal fulfillment over many years") introduce achievement as a higher-weight quality dimension at upper ranks. This is handled through threshold-setting and scoring (Session 2+), not through the category definition. The definition of participation is "did you engage in the goal lifecycle." The quality of that engagement (how many were achieved) is evaluated at the scoring layer.

4. **Preventing inflation**: Tying participation events to chapter sealing prevents an athlete from creating many secondary goals in a perpetually active chapter without ever completing the commitment cycle. The gate is sealing — a deliberate, ceremony-level transaction.

5. **Consistency with Architect identity test**: The Architect test requires "goal-directed behavior — intentional use of the goal system." Defining participation as goal lifecycle events (not just setting) means an athlete who has sealed chapters with primary goals has demonstrated intentional use at the level the test requires.

### 6.7 Downstream Impacts

- **Chapter sealing (M-5)**: Goal participation events are triggered at M-5. The rank evaluation system must read goal states (primary defined / primary outcome / secondary count and outcomes) from the sealing transaction. This is an integration point between Goal Architecture and Rank Evaluation Service — relevant to TBD-1 (trigger events) and TBD-16 (service architecture), both deferred.
- **Chapter Progression alignment**: Both Chapter Progression (TBD-13) and Goal Participation (TBD-15) are now anchored to chapter sealing events. This structural alignment simplifies the evaluation layer: the chapter seal is the single event that simultaneously advances both secondary categories.
- **P-2 No Hidden Blockers**: Athletes approaching ranks that require goal engagement (Architect: goal-directed behavior; Established: goal fulfillment) must see guidance before it becomes a promotion gate. The pending-participation concept (active goals in unsealed chapters = pending, not counted) means the system can correctly identify athletes who have set goals but not yet sealed chapters — and surface "sealing your chapter will advance your goal participation" as a P-2 guidance message.
- **Imported goals**: The import pipeline may or may not carry goal records from pre-Forge history. If it does, imported chapters with primary goals that were resolved (achieved or not) before import should be eligible for Goal Participation credit, consistent with R-D46's recognition of imported history in supporting categories. If the import pipeline does not carry goal data, Goal Participation is a Forge-native-only signal for imported athletes. This is an import architecture decision that affects Goal Participation's import treatment — flagged here, not resolved here.

---

## 7. Session 1 Refinement Report

### 7.1 What This Session Resolved

Five definitional TBDs have been resolved:

| TBD | Decision Summary |
|-----|-----------------|
| TBD-6 | Active Week = calendar week (Mon–Sun) with ≥ 1 meaningful-work session. Active Month = a function of Active Week density within the month (count threshold deferred to Session 2). |
| TBD-7 | Meaningful Work = saved, completed session with any of the 9 canonical activity types, meeting a minimum elapsed duration (duration floor value deferred to Session 2). |
| TBD-13 | Chapter Progression = sealed chapters only. Active or abandoned chapters do not contribute. Chapter Progression credit fires at M-5 sealing. |
| TBD-14 | Longevity = total span from athlete's earliest training record (native or imported) to their most recent meaningful-work session. Measured as a duration. |
| TBD-15 | Goal Participation = goal lifecycle events (primary and secondary) that reach resolution through chapter sealing. Both Achieved and Not Achieved outcomes constitute participation events. Achievement is a quality dimension within the event, not a binary gate. |

### 7.2 Structural Coherence Check

**TBD-6 and TBD-7 are mutually dependent and have been resolved as a pair.** Active Week's definition depends on the meaningful work definition. TBD-7 is now locked first, and TBD-6 uses it cleanly.

**TBD-13 and TBD-15 are architecturally aligned.** Both Chapter Progression and Goal Participation are now anchored to chapter sealing (M-5). This alignment simplifies the rank evaluation layer: one event (chapter seal) simultaneously produces contribution signals for two secondary categories. This was not an explicit requirement of the architecture but emerged from independent reasoning on each TBD — and the alignment is correct.

**TBD-14 (Longevity) is fully non-overlapping with TBD-6 (Active Week/Month).** Training Consistency measures density; Longevity measures span. The definitions do not overlap computationally. An athlete can have any combination of high/low density and long/short span — the signals are independent.

**No definition introduced a threshold.** All five TBDs were resolved at the conceptual/structural level. Numeric values (duration floor for TBD-7, Active Month week count for TBD-6, longevity spans for TBD-14, goal lifecycle event counts for TBD-15) are explicitly deferred to Session 2.

### 7.3 Decisions Made That Carry Architectural Weight

The following decisions in this session have implications beyond computation — they establish structural facts that downstream UX, data, and service specifications must honor:

**D-RCM-1: Chapter sealing is the trigger for both Chapter Progression and Goal Participation credits.**
The M-5 sealing transaction is now confirmed as the event that simultaneously advances two secondary rank categories. The rank evaluation layer (TBD-1, TBD-16) must process these signals at M-5 time. This reinforces M-5 as a critical integration point.

**D-RCM-2: Not Achieved goal outcomes count as Goal Participation events.**
This is a product philosophy decision embedded in the definition. Threshold-setting for Session 2 must not inadvertently negate this by treating Not Achieved outcomes as zero-weight. Achievement status may amplify the value of a participation event — it must not exclude it.

**D-RCM-3: Longevity is anchored to the athlete's most recent meaningful-work session, not to the current date.**
This means longevity does not grow during periods of complete training inactivity. The evaluation layer must track and use the most recent meaningful-work session date — not the evaluation date — as the longevity endpoint.

**D-RCM-4: All nine canonical activity types qualify for meaningful work and active week credit.**
No activity type is excluded. MOBILITY, YOGA, WALK, and OTHER sessions qualify on the same terms as STRENGTH, RUN, BIKE, SWIM, and HIIT sessions. This is an inclusivity commitment — it must not be reversed by future threshold-setting that effectively prices out certain activity types.

**D-RCM-5: Calendar week (Monday–Sunday) is the Active Week atomic unit.**
This is a display and computation commitment. P-2 rank progress visualization and the rank evaluation service must both anchor to calendar weeks. Rolling 7-day windows are not used.

### 7.4 Items This Session Did Not Resolve (Explicitly Out of Scope)

The following items were correctly excluded from this session and remain open for future sessions:

- Minimum session duration for meaningful work (numeric threshold — Session 2)
- Count of Active Weeks required to constitute an Active Month (numeric threshold — Session 2)
- How many Active Weeks or Active Months are required at each rank (promotion threshold — Session 2/3)
- Longevity span values at each rank level (promotion threshold — Session 2/3)
- How sealed chapter count and goal lifecycle event count map to promotion requirements (promotion threshold — Session 2/3)
- Achievement amplification factor for Goal Participation events (scoring/weighting — Session 2/3)
- Import treatment specifics for Goal Participation (flagged as an open question — see Section 8)
- All TBDs not in Session 1 scope (TBD-1, TBD-2, TBD-3, TBD-4, TBD-5, TBD-8, TBD-10, TBD-11, TBD-12, TBD-16)

---

## 8. Session 1 Open Questions (Carried Forward)

The following questions were raised at the end of Session 1. Q7 is resolved by Session 2 (TBD-8 addressed in Section 9). Q1–Q6 remain open and carry to Session 3 as threshold-level decisions.

| Question | Topic | Status |
|----------|-------|--------|
| Q1 | Meaningful Work duration floor (numeric threshold) | Open — Session 3 |
| Q2 | Active Month week-count threshold | Open — Session 3 |
| Q3 | Imported session duration handling | Open — Session 3 |
| Q4 | Goal Participation import treatment | Open — Session 3 |
| Q5 | Achievement amplification for Goal Participation | Open — Session 3 |
| Q6 | Longevity signal unit (months vs. years) | Open — Session 3 |
| Q7 | Personal Improvement metrics by athlete type (TBD-8) | **Resolved — see Section 9** |

---

## 9. TBD-8 — Personal Improvement Metrics by Athlete Type

### 9.1 Problem

Personal Improvement is the #2 primary rank category. It measures "adaptive progress within the athlete's identified training type" and is explicitly designed to be type-adaptive — what counts as improvement for a strength athlete differs from what counts for a runner or a boxer.

Without per-type improvement signal definitions, this category cannot be evaluated for any athlete. Because Personal Improvement is #2 in the weighted hierarchy, its absence from evaluation would make the rank system incomplete at a fundamental level.

Four athlete types are currently supported: Strength, Running, Boxing, Hybrid. Future athlete types must be accommodatable without restructuring the model.

**The governing constraints for this TBD (from the user brief):**
- Must not favor any athlete type
- Must support adaptive improvement
- Must remain extensible for future athlete types
- Must remain consistent with Rank-System-Architecture.md

### 9.2 What Session Data Each Activity Type Captures

Personal Improvement is evaluated from session records. Before defining improvement per athlete type, the available signal per activity type must be understood.

From the locked Active Workout Flow specification (W-9 through W-16):

| Activity Type | Screen | Data Captured |
|---------------|--------|---------------|
| STRENGTH | W-9 | Exercise name, sets, weight logged, reps logged, notes |
| RUN | W-10 | Elapsed time, distance (optional manual entry), notes |
| WALK | W-11 | Elapsed time, distance (optional manual entry), notes |
| BIKE | W-12 | Elapsed time, distance (optional manual entry), notes |
| SWIM | W-13 | Elapsed time, laps counted, distance (optional), notes |
| HIIT | W-14 | Rounds completed, elapsed time, notes |
| MOBILITY / YOGA | W-15 | Elapsed time, notes only |
| OTHER / CUSTOM | W-16 | Activity name, elapsed time, notes |

Critical observation: the richness of available signal varies sharply by activity type. STRENGTH sessions capture weight and reps per set — dense, structured performance data. YOGA and MOBILITY sessions capture elapsed time and freeform notes only. This asymmetry is not a design flaw — it reflects the actual nature of each activity. The Personal Improvement model must work within it without producing a system that penalizes athletes who primarily practice lower-data activity types.

### 9.3 The Athlete Type / Activity Type Relationship

Athlete type and activity type are not the same thing. Athlete type is a profile-level classification. Activity type is a per-session classification.

A **Strength athlete** primarily logs STRENGTH sessions but may also log MOBILITY, HIIT, or other sessions for supplementary work.

A **Running athlete** primarily logs RUN sessions but may also log STRENGTH sessions for cross-training or WALK sessions during recovery.

A **Boxing athlete** has no dedicated activity type in the current system. At MVP, boxing athletes log their training across a combination of: STRENGTH (gym work), HIIT (conditioning rounds), and OTHER/CUSTOM (sparring, bag work, pad work). There is no W-17-equivalent boxing screen.

A **Hybrid athlete** intentionally trains across multiple primary activity types and does not have a single dominant modality. Their improvement is multi-dimensional by design.

This relationship determines which session records feed the improvement signal evaluation for each athlete type. The model must be explicit about this mapping.

### 9.4 The Core Design Problem

Three tensions must be resolved:

**Tension 1 — Signal richness asymmetry**
STRENGTH sessions provide rich, structured performance data (weight × reps per set). Running sessions provide moderate data (time + optional distance). Boxing sessions provide thin data at MVP (mostly elapsed time + notes). Any model that evaluates all types on equivalent signal richness would systematically disadvantage athletes in lower-data types.

*Resolution path*: Each type is evaluated on the signals that are natural and available for that type. "Improvement" is defined per type using the richest signal available for that type. No type is evaluated using a different type's signals.

**Tension 2 — Hybrid ambiguity**
A Hybrid athlete trains across modalities. Their improvement is multi-dimensional. Requiring improvement across all active modalities would be overly demanding (an athlete in a deliberate Strength phase should not be penalized because their running pace hasn't improved). Requiring improvement in any single modality would be too permissive.

*Resolution path*: Hybrid improvement uses OR logic — demonstrated improvement in any of the athlete's actively trained types qualifies. This rewards genuine multi-modal development without punishing intentional periodization.

**Tension 3 — Data availability vs. evaluation completeness**
A Running athlete who never logs distance cannot have their pace evaluated. A Boxing athlete who logs only OTHER/CUSTOM sessions has almost no structured performance data. These situations are real and cannot be resolved by mandating different behavior from athletes.

*Resolution path*: Each type has a primary signal and a secondary fallback signal. When the primary signal is unavailable (insufficient data or data type not logged), the fallback applies. When neither is available, the improvement signal is marked as "insufficient data" — which is a neutral state, not a negative one.

### 9.5 The Structural Model: Personal Best Progression

**Recommended model:** Personal Best Progression

The Personal Improvement signal for each athlete type is evaluated by asking whether the athlete's personal best on their type-appropriate primary signal has advanced over time.

Model structure:
1. **Identify athlete type** — declared on the athlete's profile (declaration mechanism is a product UX and data model decision, deferred to TBD-12 and onboarding specifications)
2. **Select primary signal** — per the type-specific definitions in Section 9.6
3. **Identify personal best** — the highest level achieved by the athlete on the primary signal across all historical records
4. **Detect advancement** — whether the athlete has established new personal bests in a recent evaluation window (window definition = threshold, deferred)
5. **Apply fallback if needed** — if the primary signal has insufficient data, evaluate on the secondary signal
6. **Return improvement state** — improving (new personal bests demonstrated) or plateaued (no advancement in evaluation window) or insufficient data (cannot evaluate)

**Why this model:**

It treats improvement as the athlete reaching new performance peaks, not as sustained trend. This is the right model for rank because:
- It respects the variety of training approaches. An athlete alternating peak and deload phases will show peaks in the peak weeks. The model captures those peaks.
- It does not require constant improvement. An athlete at a genuine performance ceiling is not "failing" — they are maintaining. The rank system already has Training Consistency to credit ongoing participation. Personal Improvement specifically credits development. An athlete who has plateaued after years of progress is correctly recognized for the development they achieved.
- It is relatively gaming-resistant. An athlete cannot manufacture "improvement" without actually logging higher performance values on their primary signal.
- It is extensible. Adding a new athlete type requires only defining what "personal best" means for that type. The model structure is unchanged.

**What this model explicitly avoids:**
- A universal metric applied to all types (which would favor types with richer data)
- Complex trend analysis (which requires scoring formulas, excluded from this session)
- Time-weighted averages or decay functions (formula territory, deferred)
- Any requirement to track specific exercises over time (which would punish exercise variety)

### 9.6 Per-Type Improvement Definitions

#### Strength

**Primary performance signal:** Best logged performance on any tracked exercise — defined as the highest weight-to-reps ratio achieved for a given exercise across all sessions.

**What "better" means:** A new personal best on any frequently logged exercise. Personal best is evaluated at the exercise level, not the session level. An athlete who sets a new best on their squat has demonstrated strength improvement — regardless of what happened to their bench press in the same session.

**Improvement concept:** Progressive overload achieved and documented. The athlete is applying more stimulus than they previously could sustain.

**Data requirements:** Weight and reps per set (always present in W-9 STRENGTH sessions). No special data is required beyond what is logged in every strength session.

**Secondary fallback:** Total session volume — the sum of sets × weight × reps across the session — if exercise-level tracking is too sparse for a personal best comparison (e.g., very new athlete with only 1–2 sessions per exercise).

**Data availability:** Always available. Every W-9 session captures weight and reps. Strength is the richest data signal in the system.

**Import treatment:** Imported strength session data (if available with exercise, weight, and reps fields) extends the personal best history. An athlete whose imported history shows a higher best than any native session does not have that as a "current" personal best for improvement evaluation — the imported history establishes the historical floor. Improvement is evaluated relative to the athlete's trajectory, not their absolute maximum. (Specific treatment of imported performance data in the improvement evaluation is a threshold and scoring decision, deferred.)

---

#### Running

**Primary performance signal:** Best performance on distance-based metrics — specifically the combination of fastest pace (time per unit distance) achieved for any logged run distance, and longest distance logged in a single session.

Two distinct improvement dimensions exist within Running:
- **Pace improvement**: achieving a faster time for a previously run distance
- **Distance improvement**: achieving a new longest-distance record

Either dimension constitutes improvement. A runner who maintains pace while increasing distance is improving. A runner who covers the same distance faster is improving. Both are valid expressions of running development.

**What "better" means:** A new personal best on either dimension — a distance never previously run, or a pace faster than any previously recorded pace for a comparable distance.

**Improvement concept:** The athlete is capable of more (greater distance or faster pace) than at any prior point in their tracked history.

**Data requirements:**
- Pace improvement requires BOTH elapsed time AND distance to be logged. Elapsed time is always present (W-10 timer starts automatically). Distance is optional manual entry in W-10.
- Distance improvement requires only that distance is logged.

**Secondary fallback:** When no distance data exists, improvement falls back to session duration progression — longer sustained runs over time, measured by elapsed time only. This is a weaker signal (a runner who walks during long runs and a runner who runs the full session appear equivalent on duration alone) but is better than marking improvement as unevaluable.

**Data availability:** Depends on whether the athlete logs distance. Athletes who consistently log distance have full signal. Athletes who never log distance can only be evaluated on the secondary fallback.

**Guidance implication:** The in-app experience should make distance entry easy and encourage it for Running athletes — not because the rank system requires it, but because richer data produces better improvement tracking. This is a UX consideration for the Running session logging screen (W-10), not a rank system constraint.

**Import treatment:** Imported running sessions with distance data extend the personal best history for both pace and distance signals. Sessions without distance data contribute to the secondary fallback signal only.

---

#### Boxing

**The MVP constraint:** There is no dedicated boxing session type in the current logging system. Boxing athletes distribute their training across multiple activity types:
- Gym work: logged as STRENGTH (W-9), providing weight/reps data
- Conditioning rounds: logged as HIIT (W-14), providing rounds and elapsed time
- Sparring, bag work, pad work: logged as OTHER/CUSTOM (W-16), providing elapsed time and notes only

Boxing improvement at MVP is necessarily a proxy signal, not a direct performance measurement. This is an honest limitation of the MVP logging system, not a design failure. A future boxing-specific logging screen (tracking rounds, intensity, and technique metrics) would provide direct signal.

**Primary performance signal:** Session intensity progression across boxing-relevant session types, evaluated in two layers:

- **Layer 1 — Conditioning progression**: Improvement in HIIT rounds completed over time. An athlete who completes more rounds in the same duration, or maintains the same rounds with fewer rests, is demonstrating conditioning improvement. This is the best available proxy for boxing-relevant fitness at MVP.

- **Layer 2 — Strength progression**: Improvement in best logged performance on Strength exercises. Boxing requires functional strength — improvement in key lifts (bench press, deadlift, overhead press) reflects relevant physical development even if it isn't boxing-specific.

**What "better" means:** A new personal best in either Layer 1 (more rounds in HIIT) or Layer 2 (higher best lift in Strength). Either constitutes improvement.

**Improvement concept:** The athlete's conditioning and/or functional strength is increasing — proxied through available structured data, because direct boxing performance metrics are not yet capturable.

**Data requirements:**
- Layer 1 requires HIIT sessions with rounds logged (W-14)
- Layer 2 requires STRENGTH sessions with weight/reps logged (W-9)
- A boxing athlete who logs only OTHER/CUSTOM sessions (sparring only, no gym or HIIT work) has minimal structured improvement signal available

**Secondary fallback:** Session duration trends across any logged activity type. An athlete consistently logging longer training sessions is demonstrating sustained training capacity. This is the weakest possible proxy and should be treated as a last resort when Layer 1 and Layer 2 have insufficient data.

**Explicit limitation that must be documented and communicated:**
The Personal Improvement signal for Boxing athletes at MVP measures conditioning and strength proxies, not boxing-specific skill, technique, or performance. An elite boxer who does no gym work and no HIIT-format conditioning may have a very thin improvement signal despite genuine boxing development. This is a known gap. P-2 What's Next guidance for Boxing athletes should reflect the available signal honestly.

**Future extensibility:** Adding a dedicated boxing session type (W-X, round-based with intensity tracking) in a future release would replace the proxy Layer 1 signal with a direct rounds/intensity signal and dramatically improve improvement signal quality for Boxing athletes. The model structure would not change — Layer 1 would simply become richer.

**Import treatment:** Imported HIIT and Strength session data extends the historical baseline for both layers. Imported OTHER session data contributes to the secondary duration fallback only.

---

#### Hybrid

**Defining characteristic:** The Hybrid athlete intentionally trains across multiple primary modalities. Their training includes meaningful volume across at least two activity types. Their improvement is multi-dimensional by design.

**Primary performance signal:** Demonstrated improvement in at least one of the athlete's actively trained modalities, evaluated using that modality's type-specific improvement definition.

**Evaluation logic:** OR logic. The system evaluates improvement separately for each modality in which the athlete has meaningful logged history (using that modality's definition from above). If improvement is demonstrated in ANY evaluated modality, the athlete is classified as improving.

**What "better" means:** The athlete has established a new personal best in at least one of their primary training modalities.

**Improvement concept:** The athlete is developing in at least one dimension of their multi-modal training — which is the correct bar for Hybrid athletes. A Hybrid athlete in a deliberate Strength block who hasn't run a pace PR recently is not stagnating — they are developing, just not in every dimension simultaneously.

**Which modalities are evaluated:** The modalities in which the athlete has sufficient logged history to evaluate improvement. An athlete who logs both Strength and Running sessions is evaluated on both (using the Strength and Running definitions respectively). If improvement is found in either, improvement is credited. The system should not evaluate modalities in which the athlete has fewer than a minimum session count (minimum = threshold, deferred).

**Data requirements:** Depends on which modalities the athlete trains. A Hybrid athlete who trains Strength + Running needs the same data as each of those types individually.

**Secondary fallback:** If only one modality has sufficient data (the athlete's secondary modality is underdeveloped), evaluation falls back to the single available modality. If no modality has sufficient data, improvement is marked as insufficient data.

**Import treatment:** Imported session data extends the historical baseline per modality, using each modality's import treatment.

### 9.7 Improvement Vocabulary

The following terms are used consistently within the Personal Improvement model:

| Term | Definition |
|------|-----------|
| **Primary signal** | The type-appropriate performance metric that best captures improvement for a given athlete type |
| **Secondary fallback** | A lower-resolution signal used when the primary signal lacks sufficient data |
| **Personal best** | The highest value the athlete has achieved on the primary signal at the exercise or session level |
| **Improving** | The athlete has established new personal bests on the primary signal within the evaluation window |
| **Plateaued** | The athlete has not established new personal bests in the evaluation window, but has sufficient data to evaluate |
| **Insufficient data** | The athlete has too few sessions in a relevant modality to evaluate the primary signal reliably |

### 9.8 Model Extensibility

Future athlete types are accommodated by adding a new type entry to the per-type definitions. No structural change to the model is required. Each new type must define:

1. Which activity types contribute to its primary signal (the athlete type → activity type mapping)
2. What "personal best" means for the type
3. The primary performance signal and what "better" means for that signal
4. The secondary fallback signal when primary data is sparse
5. Any known data availability constraints or limitations

If a new athlete type requires a new logging screen (e.g., a climbing type requiring a dedicated climbing session), the logging screen must be designed and built before the improvement signal can be meaningfully evaluated. The model structure does not change in that case — the new activity type simply begins contributing data once the screen exists.

### 9.9 Type Fairness Confirmation

The model avoids favoring any athlete type through three mechanisms:

1. **Type-specific evaluation**: each type is evaluated on its own natural signals. Strength athletes are not penalized for not running. Running athletes are not penalized for not lifting. Each type's improvement is measured relative to that type's own signals.

2. **No universal metric**: there is no single "improvement metric" that all types are measured against. A model that evaluated all types on, for example, total distance covered would advantage Running athletes and disadvantage Strength athletes. The Personal Best Progression model uses type-appropriate signals throughout.

3. **Equivalent fallback treatment**: when primary signal data is sparse, all types fall back to weaker signals using the same structural principle (secondary signal → insufficient data). No type gets special preferential treatment when data is thin.

The known asymmetry is that signal richness varies by type: Strength has the richest data, Running has moderate data with an optional-data constraint, Boxing has the thinnest data at MVP, and Hybrid depends on which modalities the athlete trains. This asymmetry cannot be eliminated without changing the logging screens — but the model treats each type fairly within its own data constraints.

### 9.10 Open Product Decision: Athlete Type Declaration

The Personal Improvement model depends on knowing each athlete's type. This raises a product question that is not a TBD-8 decision but must be resolved before the improvement evaluation can be implemented:

**When and how does the athlete declare their type?**

Options include: declaration at onboarding (O-2 First-Time Setup), declaration on the Profile screen, or inference from session history (the system determines the athlete's "primary type" based on which activity type they log most frequently).

Type declaration mechanism is a product UX decision and a data model question (TBD-12 scope). It is flagged here as a dependency but not resolved in this session.

**What happens if the athlete's type changes over time?** A Strength athlete who transitions to Running shouldn't have their historical Strength improvement data erased. The model should support historical type changes gracefully — but the specific rules for type transitions are deferred.

### 9.11 Downstream Impacts

- **Athlete type declaration (TBD-12 dependency)**: the data model must store the athlete's declared type and any historical type changes. This is required before improvement evaluation can run for any athlete.

- **Running distance data quality**: the Running improvement signal depends on athletes logging distance. The W-10 UX should make distance entry easy and perhaps encourage it through contextual prompts without making it mandatory. This is a logging screen UX consideration, not a rank system requirement.

- **Boxing improvement disclosure in P-2 What's Next**: the proxy nature of the Boxing improvement signal should be reflected in athlete-facing guidance. A Boxing athlete in P-2 should see guidance that references their conditioning sessions and gym work — not vague language about "improvement" that implies metrics that don't exist.

- **Hybrid modality evaluation**: the evaluation service must determine which modalities to evaluate for a given Hybrid athlete based on their logged session history. The minimum session count for a modality to qualify for evaluation is a threshold question (deferred), but the evaluation service must implement the OR-logic structure.

- **Import pipeline and improvement baseline**: imported session data with weight/reps or distance fields extends the personal best history. The evaluation service must distinguish between imported and native personal bests for the purpose of improvement direction evaluation. (Imported history establishes historical context; current improvement is evaluated on native data within the evaluation window. Exact treatment = scoring/threshold question, deferred.)

- **Future logging screens for Boxing**: when a boxing-specific session type is introduced, the Boxing improvement Layer 1 signal should be updated to reference the new screen. The Layer 1 definition (conditioning progression) would become direct rather than proxied. This does not require a model structure change — it is a signal refinement within the existing framework.

---

## 10. TBD-10 — Recent Engagement Definition

### 10.1 Problem

Recent engagement is one of five promotion requirement types defined in Rank-System-Architecture.md §5.2. It applies "where applicable" — specifically at Architect and above. Its purpose is to ensure that promotion to prestige ranks reflects the athlete's current development trajectory, not only their historical accumulation.

Without a definition, recent engagement cannot be evaluated at the point of promotion consideration. For prestige ranks that apply it, promotion would be either always blocked (can't evaluate) or always permitted (the requirement can't be verified). Neither is acceptable.

This TBD also resolves a critical relationship: recent engagement governs promotion eligibility, but does NOT govern rank maintenance. An athlete who holds Craftsman and then becomes inactive for two years is still Craftsman on return. Recent engagement is a gate to advance — it is never a mechanism to reduce or expire a rank already held (consistent with RS-D1: rank never decreases).

### 10.2 Why Recent Engagement Exists

The Identity Credibility Principle (RSA §4) governs all timing and pacing decisions: promotions must feel believable. The rank family identities at Architect and above describe active, ongoing postures:

- Architect: "I'm intentionally shaping my development."
- Established: "I've built something real."
- Legacy: "My journey has become a meaningful story."
- Icon: "I repeatedly become the person I intend to become."

None of these can be credibly claimed by an athlete who has been completely inactive for an extended period. An athlete who trained intensively for two years, earned Craftsman, went dormant for three years, and then immediately attempted promotion to Architect — without having resumed training — does not reflect the Architect identity.

Recent engagement is the mechanism that tests whether the athlete's current state matches the identity they would receive. It prevents the promotion queue from advancing through prestige ranks based solely on historical evidence.

### 10.3 Structural Constraints

Any definition of recent engagement must satisfy four non-negotiable constraints:

**Constraint 1 — Promotion gate only**
Recent engagement is evaluated at the moment of promotion consideration. It does not affect held rank. An athlete who meets recent engagement in order to advance and then becomes inactive does not lose the rank they earned.

**Constraint 2 — Not duplicative of other requirements**
Recent engagement should not overlap with Training Consistency's active weeks and months signals. Training Consistency already captures density of participation as a ranked category — recent engagement must be distinct. It measures "are you currently active" as a binary eligibility gate, not as a competing density measurement.

**Constraint 3 — Type-agnostic**
Recent engagement must apply identically regardless of athlete type. A Boxing athlete and a Strength athlete satisfy recent engagement through the same structural criterion. Type-specific thresholds for recent engagement would create unfair promotion gates.

**Constraint 4 — Consistent with import treatment**
Imported session records may contribute to active weeks (TBD-6 establishes this under R-D46). The question of whether imported sessions satisfy recent engagement is addressed in 10.6 below.

### 10.4 Options Evaluated

**Option A — Any single session within the window**
Recent engagement = at least one saved session within a defined lookback window.
- Pro: Simplest possible definition. Any athlete who has trained recently qualifies.
- Con: A single session in the window may be too permissive for prestige ranks. An athlete who trains once in six months and then immediately pursues Architect promotion has not demonstrated recent development trajectory.

**Option B — Minimum active weeks within the window**
Recent engagement = a minimum number of active weeks (as defined in TBD-6) within a defined lookback window.
- Pro: Requires sustained recent participation, not just a single session. Reuses the established Active Week definition. Consistent with how Training Consistency already measures participation density.
- Con: "Minimum number" and "window duration" are both thresholds — deferred. But the structure is evaluable once thresholds are set.

**Option C — Minimum meaningful work sessions within the window**
Recent engagement = a minimum count of meaningful work sessions (as defined in TBD-7) within a lookback window.
- Pro: Requires quality-gated sessions, not just any session. Uses TBD-7's already-established definition.
- Con: A session count without week-distribution can be satisfied by training intensively for one week and then being absent. This misrepresents "recent engagement" for a rank system that values consistent development.

**Option D — Active months within the window**
Recent engagement = a minimum number of active months (as defined in TBD-6) within a lookback window.
- Pro: Requires sustained engagement at the monthly level. Active Month (from TBD-6) already captures week-density within a month, so a minimum number of recent active months is a strong, multi-dimensional signal.
- Con: Active Month requires a count threshold that hasn't been set (TBD-6 deferred). This creates a dependency on a threshold not yet defined.

**Option E — Category-specific recent engagement**
Recent engagement requirements vary by rank level — Architect requires recent Training Consistency signals; Established requires recent Training Consistency plus recent Program Progression; etc.
- Pro: Precisely matches the developing-rank identity.
- Con: High complexity. Introduces rank-specific rules into the recent engagement definition, making it difficult to reason about. Also risks duplicating the category requirements themselves (if Architect requires recent program work as a separate category requirement AND as a recent engagement condition, the distinction collapses).

### 10.5 Recommendation

**Recent engagement = active weeks within a defined lookback window.**

Structural definition:
- At the point of rank promotion evaluation for a prestige rank (Architect and above), a lookback window is applied
- Within that lookback window, the athlete must have accumulated a qualifying number of active weeks (as defined in TBD-6)
- Both the lookback window duration and the minimum active week count are numeric thresholds deferred to a future session

This is Option B.

**Rationale:**

1. **Reuses established definitions**: Active Week is already defined (TBD-6) as a calendar week containing at least one meaningful-work session. Recent engagement builds directly on this without introducing any new definitional concept.

2. **Requires sustained pattern, not a single event**: Requiring active weeks (rather than a single session or a session count) means the athlete must have trained across multiple calendar weeks within the lookback window. This is the correct standard for prestige rank promotion — the athlete should be in a training pattern, not a training event.

3. **Type-agnostic**: an active week is the same for a Strength athlete and a Running athlete and a Boxing athlete. The definition does not discriminate by type.

4. **Structurally distinct from Training Consistency category evaluation**: Training Consistency (TBD-6) evaluates accumulated active weeks over the full evaluation history and contributes to rank score. Recent engagement evaluates active weeks within a bounded recent window as a binary gate — eligible or not eligible. These are distinct uses of the same underlying unit.

5. **Communicable under Guided Transparency**: an athlete in P-2 What's Next can be told "your recent training consistency needs development" without exposing any formula. The athlete understands they need to be training consistently in recent weeks — a directly actionable signal.

**What this definition does NOT require:**
- Improvement in the recent window (improvement is a separate category)
- Program enrollment during the recent window (Program Progression is a separate category)
- Chapter activity during the recent window (Chapter Progression is a separate category)
- Any activity-type-specific behavior

**Critical clarification — the promotion queue interaction:**
When an athlete earns multiple promotions simultaneously (e.g., post-import), those promotions enter the queue (RSA §12). For prestige-rank promotions in the queue, recent engagement is evaluated at the time the promotion fires from the queue — not at the time the promotion entered the queue. If an athlete imports a large history and earns queued promotions that would advance them into Architect territory, but the athlete is not currently active, those prestige-rank promotions remain queued until recent engagement is satisfied. They do not expire — they wait. When the athlete resumes training and satisfies recent engagement, the queue resumes.

This queue behavior is a significant structural note: recent engagement is not a one-time check that can be satisfied retroactively. It is evaluated at the firing moment.

### 10.6 Import Treatment

Imported session records may satisfy recent engagement if they fall within the lookback window and meet the active week criteria (TBD-6 and TBD-7 standards apply).

However, this creates a potential exploit: an athlete could import recent session data (from a recently-active period in another app) and immediately satisfy recent engagement without actually training in Forge Legacy.

This tension is noted but not fully resolved here. Two possible treatments:
- **Native-only recent engagement**: imported sessions never satisfy recent engagement, even if they fall within the lookback window. This enforces that prestige ranks require current Forge Legacy engagement.
- **Import-eligible recent engagement**: imported sessions within the window satisfy recent engagement, consistent with R-D46's general partial-credit framework.

The "native-only" treatment is more defensible for recent engagement specifically, because the Identity Credibility Principle for prestige ranks centers on Forge-native development (R-D46: prestige ranks require Forge-native confirmation). An athlete satisfying recent engagement through a recent import would be gaming the spirit of the requirement even while satisfying the letter.

**This is flagged as an open product decision for Session 3.** The structural definition (active weeks within a lookback window) is settled. Whether those active weeks must be native-only for recent engagement purposes is a policy decision requiring user input.

### 10.7 Downstream Impacts

- **Prestige rank promotion evaluation (TBD-3, TBD-4)**: promotion thresholds for Architect and above must incorporate recent engagement as a binary gate alongside category thresholds. The order of evaluation (is recent engagement checked before category requirements, or in parallel?) is an evaluation service design question — relevant to TBD-16.

- **Promotion queue (RSA §12)**: the queue must hold prestige-rank promotions until recent engagement is satisfied at the firing moment. This requires the queue to re-evaluate recent engagement each time it processes a prestige-rank promotion — not just at the moment the promotion was earned.

- **P-2 No Hidden Blockers**: athletes approaching Architect who are not currently meeting recent engagement criteria should see P-2 What's Next guidance surfacing their recent training consistency as a development area. This prevents the scenario where an athlete discovers recent engagement as a surprise gate at the promotion moment.

- **Identity Credibility enforcement**: the combination of time gates (RSA §9) and recent engagement creates two distinct temporal requirements for prestige ranks. Time gates set the minimum elapsed time in the rank journey. Recent engagement ensures current activity. Both must be satisfied — neither substitutes for the other.

- **Import policy (open question)**: as noted in 10.6, the decision about whether imported sessions satisfy recent engagement is deferred and must be resolved before the evaluation service can be implemented.

---

## 11. Session 2 Refinement Report

### 11.1 What This Session Resolved

Two high-priority TBD items have been resolved:

| TBD | Decision Summary |
|-----|-----------------|
| TBD-8 | Personal Improvement uses the Personal Best Progression model. Each athlete type is evaluated on its own type-appropriate primary signal. Improvement = new personal best established in the evaluation window. Hybrid uses OR logic across actively trained types. Boxing uses a two-layer proxy (HIIT rounds + Strength load) at MVP with an explicit limitation acknowledgment. Model is extensible via addition of new type entries without structural change. |
| TBD-10 | Recent engagement = active weeks (as defined in TBD-6) within a defined lookback window. Applies as a binary promotion gate only for Architect and above. Does not affect held rank. Evaluated at queue-firing time, not at queue-entry time. Import treatment (native-only vs. import-eligible) is an open policy question flagged for Session 3. |

### 11.2 Structural Coherence Check

**TBD-8 builds on TBD-7 (Meaningful Work)**: The Personal Best Progression model uses session records as its input. Session records must meet the meaningful work criteria (TBD-7) to contribute to activity history. The models are coherent — no session that fails the meaningful work test feeds the improvement evaluation.

**TBD-10 builds on TBD-6 (Active Week)**: Recent engagement is defined in terms of active weeks. The active week definition from TBD-6 is reused without modification. No new participation concept is introduced.

**TBD-8 is independent of TBD-10**: Personal Improvement and Recent Engagement are separate systems. An athlete who demonstrates improvement but is not recently engaged (e.g., a dormant athlete with a historical peak) satisfies TBD-8 criteria but not TBD-10 criteria for prestige promotion. Both are correctly independent.

**TBD-8 and the Hybrid athlete type**: The Hybrid model (OR logic across actively trained types) is consistent with RSA §6.3, which states that future athlete types are "defined when type is added to the system." The Hybrid model handles multi-type athletes without requiring a structural change — it is the existing types' signals evaluated in parallel.

**TBD-8 and No Favored Type**: the model is verified against the constraint. Strength athletes are not advantaged because they have richer data — they are simply evaluated on that richer data. Running athletes are not disadvantaged for having optional distance fields — they have a defined secondary fallback. Boxing athletes' limitation is honestly named and compensated by a two-layer proxy. Hybrid athletes are evaluated across their actual training activity, not against a hypothetical universal standard.

### 11.3 Decisions Made That Carry Architectural Weight

**D-RCM-6: Personal Improvement evaluates personal bests, not trend lines.**
The model uses peak performance within evaluation windows, not averages or rolling trends. The evaluation service (TBD-16) must compute and store per-exercise and per-modality personal bests for each athlete. Peak tracking, not averaging, is the computational approach.

**D-RCM-7: The athlete type → activity type mapping is explicit and fixed per type.**
Strength type → STRENGTH sessions. Running type → RUN sessions. Boxing type → HIIT + STRENGTH sessions (Layer 1 + Layer 2). Hybrid type → evaluates improvement separately per each type the athlete actively logs. The mapping cannot be modified on a per-athlete basis — it is type-level, not athlete-level.

**D-RCM-8: Boxing improvement at MVP is a named proxy.**
This is not a silent limitation. The architecture acknowledges explicitly that Boxing improvement signal at MVP is a proxy for conditioning and strength gains. Documentation, P-2 guidance language, and any athlete-facing improvement communication for Boxing athletes must reflect this. It cannot be presented as a direct performance measurement.

**D-RCM-9: Recent engagement is a promotion gate, not a rank maintenance requirement.**
Once a rank is held, recent engagement is irrelevant to maintaining it. It is only evaluated at the moment of promotion consideration for prestige ranks. This must be implemented correctly in the evaluation service — recent engagement checks fire only at promotion evaluation time, not continuously.

**D-RCM-10: Recent engagement evaluates at queue-firing time.**
For athletes with queued promotions, recent engagement is checked when the queue attempts to fire a prestige-rank promotion — not when the promotion entered the queue. A promotion that entered the queue during a period of high activity may still be held if the athlete's recent activity has since lapsed. This is the correct behavior given the Identity Credibility Principle.

### 11.4 The Boxing Gap — Explicit Statement

The Personal Improvement model for Boxing athletes at MVP is a proxy. This deserves its own named acknowledgment.

The proxy works through two layers: HIIT rounds for conditioning, Strength load for functional strength. Neither directly measures boxing performance (speed, power, technique, timing, ring fitness). An elite boxer who does exclusively sparring and pad work — logged as OTHER/CUSTOM (W-16) — has almost no structured improvement signal. This is a genuine product gap.

The gap does not block the rank system from launching with Boxing as a supported athlete type. The proxy signals are real fitness signals that do correlate with boxing development, even if they do not measure it directly. The system is honest about this through explicit documentation and appropriate P-2 guidance language.

The gap should be formally added to the product backlog as: "Boxing-specific session logging screen (round-based, with intensity tracking)" as the path to a first-class Boxing improvement signal.

### 11.5 Items This Session Did Not Resolve (Explicitly Out of Scope)

- Numeric evaluation window duration for Personal Improvement (threshold — future session)
- Minimum session count per modality for Hybrid type evaluation (threshold — future session)
- Athlete type declaration UX and data model (TBD-12)
- Whether imported sessions satisfy recent engagement (policy — open question for Session 3)
- Lookback window duration and minimum active week count for recent engagement (thresholds — future session)
- Whether different prestige ranks have different recent engagement thresholds (policy — future session)
- All remaining open TBDs (TBD-1, TBD-2, TBD-3, TBD-4, TBD-5, TBD-11, TBD-12, TBD-16)

---

## 12. Open Questions for Session 3

The following questions require user decisions before Session 3 can proceed. They include both new questions from Session 2 and the six threshold questions carried from Session 1.

---

**Q1 — Meaningful Work Duration Floor** *(carried from Session 1)*

What is the minimum elapsed session duration for a session to constitute meaningful work?

*Context*: Numeric threshold that makes TBD-7 operational. Candidates: 5, 10, 15, 20 minutes. Affects Active Week computation and Training Volume accumulation.

*What you need to decide:* A specific minute value.

---

**Q2 — Active Month Definition (Week Count Threshold)** *(carried from Session 1)*

How many Active Weeks within a calendar month must exist for the month to qualify as an Active Month?

*Context*: Options: ≥ 1 (permissive), ≥ 2 (moderate), ≥ 3 (demanding). A month contains 4 or 5 calendar weeks. The threshold determines how demanding the monthly consistency signal is.

*What you need to decide:* Minimum active week count per month.

---

**Q3 — Imported Session Duration Handling** *(carried from Session 1)*

What happens to imported sessions that do not have a recoverable duration?

*Context*: Three options: (a) exclude from meaningful work, (b) apply a conservative default duration for well-structured imports, (c) include at reduced credit weight. Policy choice with data integrity implications.

*What you need to decide:* Policy for durationless imported sessions.

---

**Q4 — Goal Participation: Import Treatment** *(carried from Session 1)*

Does the import pipeline carry goal records from pre-Forge history? If yes, how do pre-Forge goal outcomes map to Forge Legacy participation events?

*What you need to decide:* Whether goal records are importable, and their mapping if they are.

---

**Q5 — Achievement Amplification for Goal Participation** *(carried from Session 1)*

At the scoring layer, should Achieved primary goal resolutions carry more weight than Not Achieved resolutions?

*What you need to decide:* Whether achievement amplification exists at the scoring layer.

---

**Q6 — Longevity Signal Unit** *(carried from Session 1)*

Is Longevity expressed in calendar months, years, or a hybrid display (years + months for the athlete, months for internal evaluation)?

*What you need to decide:* The unit of measurement.

---

**Q7 — Recent Engagement: Native Sessions Only or Import-Eligible?**

Can imported sessions (from Architecture Amendment 001 import pipeline) satisfy the recent engagement requirement for prestige rank promotions?

*Context*: The native-only position is more defensible under the Identity Credibility Principle (prestige ranks require Forge-native confirmation — R-D46). The import-eligible position is more consistent with R-D46's general partial-credit framework for Training Consistency.

*The case for native-only*: recent engagement is about current Forge Legacy development. An athlete who imports data from a recently-active period elsewhere and then claims recent engagement has not demonstrated current Forge Legacy engagement. Recent engagement should require native sessions.

*The case for import-eligible*: R-D46 permits imported history to contribute to Training Consistency. Recent engagement is built on the Active Week definition, which itself is import-eligible. Carving out a native-only exception introduces an inconsistency in how imported sessions are treated.

*Impact on:* evaluation service implementation, import pipeline UX (athletes should understand whether recent imports affect their promotion eligibility).

*What you need to decide:* Native sessions only, or import-eligible sessions, for recent engagement purposes.

---

**Q8 — Athlete Type Declaration**

When and how does the athlete declare their athlete type? How does the type change over time, and how do type changes affect historical improvement evaluation?

*Context*: The Personal Improvement model depends entirely on knowing the athlete's type. Options: (a) declared at onboarding (O-2 First-Time Setup), (b) declared on Profile screen (P-1), (c) inferred from session history (the system determines type from most-logged activity). Each has UX and data implications.

If the athlete can change their type: does historical improvement evaluation for the old type carry forward, reset, or freeze? This has significant implications for long-term athletes who transition between modalities.

*Impact on:* O-2 onboarding specification, P-1 Profile screen, TBD-12 data model, Personal Improvement evaluation service.

*What you need to decide:* When and how type is declared, and whether/how type changes are permitted.

---

**Q9 — Recent Engagement Thresholds**

How long is the lookback window for recent engagement, and how many active weeks are required within it?

*Context*: This is the threshold pair that makes TBD-10 operational. The lookback window is likely in the range of 3–6 months. The minimum active week count within that window is likely in the range of 4–12 weeks. The specific pairing matters: a shorter window with a lower count (e.g., 2 active weeks in the last 2 months) is very permissive; a longer window with a higher count (e.g., 10 active weeks in the last 4 months) is demanding.

The threshold should also be evaluated against the promotion timeline targets (RSA §10): Architect target is 1–2 years. Athletes approaching Architect should have had many opportunities to satisfy recent engagement if they are genuinely active.

*Impact on:* prestige rank promotion evaluation, P-2 What's Next guidance calibration.

*What you need to decide:* Lookback window duration and minimum active week count — or a framework for arriving at these values.

---

**Q10 — Different Recent Engagement Thresholds per Prestige Rank?**

Should Architect, Established, Legacy, and Icon have the same recent engagement threshold, or should the threshold scale with rank?

*Context*: The case for scaling: "I repeatedly become the person I intend to become" (Icon) requires more evidence of sustained current engagement than "I'm intentionally shaping my development" (Architect). A higher threshold at Legacy and Icon would require more recent training density for the most identity-demanding ranks.

The case for uniform: simplicity and predictability. Athletes understand one recent engagement standard; varying it per rank adds complexity and potential for confusion.

*Impact on:* evaluation service design, P-2 What's Next guidance (athletes need to know what threshold applies to their current rank context).

*What you need to decide:* Uniform or scaled recent engagement thresholds across prestige ranks.

---

---

## 13. TBD-3 — Sub-Tier Thresholds

### 13.1 Problem

Every rank family except Icon contains four sub-tiers (I · II · III · IV). Sub-tiers are locked structural elements — they exist in the architecture as progress markers and expressions of increasing maturity within a family identity. But what triggers advancement from sub-tier I to II, II to III, III to IV is entirely undefined.

Without sub-tier thresholds, the rank system has no internal structure within families. Athletes have no short-term development signal. The P-2 What's Next surface cannot compute sub-tier progress. The "sub-tier progress" dimension of R-D47 (both rank progress dimensions visible simultaneously) cannot be implemented.

Sub-tier thresholds are described in RSA §13: "Specific thresholds for sub-tier advancement within each family: TBD-3. These values are entirely undefined and represent a significant gap to resolve before implementation."

### 13.2 The Nature of Sub-Tiers

The architecture establishes two distinct properties of sub-tiers that constrain the threshold model:

1. **Sub-tiers are progress markers, not identity transitions.** Foundation · I and Foundation · IV share the identity "I've started." The movement from I to IV is increasing depth of that identity, not a transition to a new one. This means sub-tier thresholds can be lighter than family promotion requirements — they do not require multi-category convergence.

2. **Sub-tier advancement triggers no ceremony** (RS-D14). Sub-tier advances are surfaced through P-2 (TBD-2), not through M-1. This allows the threshold model to be simpler and more frequent than family promotion — sub-tier advances can feel like regular progress checkpoints without requiring ceremony-level achievement.

These two properties point toward a sub-tier model that is:
- Primarily driven by a single leading signal (simple, communicable)
- Progressively more demanding across families (matching the rank-level identity)
- With additional confirming evidence at specific sub-tiers for upper families (where depth of identity matters)

### 13.3 The Measurement Unit: Active Weeks Within Family

The primary signal for sub-tier advancement is **active weeks accumulated since entering the current rank family**.

This is deliberate: it reuses the Active Week definition from TBD-6 without introducing new signal concepts. It ensures sub-tier progress is directly driven by Training Consistency — the #1 primary category — in a way that is transparent, athlete-communicable, and non-gameable.

"Active weeks within family" (rather than cumulative since journey start) is the correct anchor because:
- It resets on family entry, giving each family its own progress arc
- It prevents earlier family activity from inflating current family sub-tier (an athlete who was very active in Foundation shouldn't immediately be at Builder · IV upon entry)
- It is computationally clean: the evaluation service needs only the current-family entry date and the active weeks accumulated since that date

### 13.4 Options Evaluated

**Option A — Active weeks within family (single signal)**
Each sub-tier I→II, II→III, III→IV is triggered by reaching a cumulative active week count within the current family. All families use the same signal; the specific counts scale with cadence expectations.

**Option B — Composite category score (proportional)**
Sub-tier thresholds = 25%, 50%, 75% of the family promotion category requirements respectively. Reaching sub-tier IV means the athlete has met 75% of family promotion requirements.

**Option C — Dominant category with confirming evidence**
Same as Option A (active weeks as primary signal) but at specific higher sub-tiers, a confirming category evidence requirement gates advancement. This ensures upper sub-tiers represent genuine multi-dimensional development, not only consistency.

**Option D — Time-based (calendar duration)**
Each sub-tier represents a time milestone within the expected family residence period. Foundation sub-tiers advance every 2 weeks; Builder sub-tiers advance every month; etc.

### 13.5 Tradeoffs

| Option | Pro | Con |
|--------|-----|-----|
| A — AW only | Simplest. Directly measures participation. Consistent with TBD-6. Athlete-facing explanation is clean ("you need X more active weeks in this rank"). | Sub-tier advancement becomes purely a consistency signal. Upper-rank sub-tiers should reflect multi-dimensional development, not just showing up. |
| B — Proportional composite | Automatically aligns sub-tiers with family promotion requirements. No separate model needed. | Requires defining the composite formula — excluded from scope. Also: if sub-tier IV = 75% of family requirements, an athlete who completes sub-tier IV should be very close to promotion eligibility. That's a correct design — but it means sub-tiers are inseparable from family promotion thresholds, which creates tight coupling. |
| C — AW + confirming evidence | Simple primary signal. Confirming evidence at upper sub-tiers introduces multi-dimensional check without a formula. Scales naturally with rank identity demands. | Requires defining confirming evidence per family, which adds specificity. But this is tractable, not a formula. |
| D — Calendar time | Extremely simple to implement. Zero data required. | Time-only sub-tier advances have no relationship to actual training behavior. An athlete who is inactive for the entire period would still advance sub-tiers. Contradicts the product philosophy that rank reflects earned development. |

### 13.6 Recommendation

**Option C — Active weeks within family as the primary sub-tier signal, with confirming category evidence at specific sub-tiers for Craftsman and above.**

**Rationale:**

1. Training Consistency is #1 for a reason. Sub-tier progress within a family should primarily reflect the athlete showing up. The active week count is the right leading signal for a progress marker.

2. Upper families require more than consistency. At Craftsman ("I know how to train"), Builder ("I'm building habits"), the identity is primarily about showing up. At Architect and above, the identity is about intentional shaping, achievement, and sustained development. Confirming evidence at upper sub-tiers ensures those sub-tiers represent genuine multi-dimensional progress, not just attendance.

3. Confirming evidence is not a formula. It is a qualitative threshold — one program graduation, one personal best event, one sealed chapter. These are binary facts that the evaluation layer can check without weighting.

4. The active weeks measure is transparent under Guided Transparency. An athlete can be told "you have X active weeks in Builder" and this is a comprehensible, actionable direction.

### 13.7 Sub-Tier Threshold Table

Active weeks (AW) are accumulated since entering the current rank family. The AW count resets on each family promotion. Confirming evidence is required only at the specific sub-tier where it is listed — not at other advances within the family.

| Family | I → II | II → III | III → IV | Confirming Evidence Required |
|--------|--------|----------|----------|------------------------------|
| Foundation | 2 AW | 4 AW | 6 AW | None at any sub-tier |
| Builder | 3 AW | 6 AW | 10 AW | None at any sub-tier |
| Craftsman | 4 AW | 8 AW | 14 AW | II → III: first improvement event on primary signal |
| Architect | 6 AW | 12 AW | 20 AW | II → III: 1 completed program graduation |
| Established | 8 AW | 16 AW | 26 AW | III → IV: 1 additional completed and sealed chapter |
| Legacy | 10 AW | 22 AW | 36 AW | III → IV: 1 additional program graduation |

**AW = active weeks within the current rank family since family entry**

**Reading the table:**
- Foundation · I → Foundation · II requires 2 active weeks accumulated in Foundation
- Builder · II → Builder · III requires 6 active weeks accumulated in Builder (no additional requirement)
- Craftsman · II → Craftsman · III requires 8 active weeks in Craftsman AND the first improvement event on the athlete's primary signal having been registered at any point
- Architect · II → Architect · III requires 12 active weeks in Architect AND 1 completed program graduation at any point
- Established · III → Established · IV requires 26 active weeks in Established AND 1 sealed chapter beyond what was required for the Architect signature milestone (i.e., an additional sealed chapter completed during the Established journey or prior)
- Legacy · III → Legacy · IV requires 36 active weeks in Legacy AND 1 program graduation beyond what was required at the Established milestone

**Timeline calibration:**

At a normally engaged athlete's pace (~3 active weeks per month):

| Family | AW to reach IV | Approx. months to reach IV | Expected cadence |
|--------|---------------|--------------------------|-----------------|
| Foundation | 6 AW | ~2 months | Fast ✓ |
| Builder | 10 AW | ~3.3 months | Moderate ✓ |
| Craftsman | 14 AW | ~4.7 months | Moderate ✓ |
| Architect | 20 AW | ~6.7 months | Slow ✓ |
| Established | 26 AW | ~8.7 months | Very Slow ✓ |
| Legacy | 36 AW | ~12 months | Extremely Slow ✓ |

These timings are consistent with the cadence descriptions in RSA §11.1.

### 13.8 Relationship to Family Promotion

Sub-tier IV completion does NOT automatically trigger or guarantee family promotion eligibility. Sub-tier IV is the highest within-family progress marker — it signals the athlete is deep into their current identity — but family promotion requires the full multi-requirement convergence defined in Section 14.

It is possible (and by design acceptable) for an athlete to reach sub-tier IV and then remain at sub-tier IV while continuing to develop toward family promotion. The sub-tier maximum is not a ceiling that blocks the athlete — it is the final progress marker before the family promotion gateway. Time spent at sub-tier IV, continuing to train and develop, is time well spent. P-2 What's Next guidance during this period should shift focus to the remaining family promotion requirements.

### 13.9 Import Treatment

Sub-tier thresholds use active weeks within the current family as their signal. For imported athletes who enter a rank above Foundation (because their imported history places them at Builder or Craftsman per the family promotion thresholds in Section 14), their sub-tier within the entered family begins at I upon entry. Imported active weeks from before the current-family entry date do not count toward the current family's sub-tier accumulation.

Imported active weeks from the period AFTER the import-eligible family entry can contribute if the import chronology supports it. (For example: an athlete is evaluated, their imported history places them in Builder, they continue logging natively — their native Builder active weeks count toward Builder sub-tier accumulation. Imported weeks during what would have been their Builder period, if determinable from the import record, also count under R-D46.)

For sub-tier thresholds specifically, this import treatment is simpler than for family promotion thresholds because sub-tiers use only the active week signal (not the multi-signal convergence). There is no Forge-native floor requirement at the sub-tier level.

### 13.10 Downstream Impacts

- **P-2 Progress Hub (R-D47, TBD-2)**: Sub-tier progress visualization requires knowing the athlete's current active week count within their family. The evaluation layer must expose "active weeks since entering current family" as a computed field. Sub-tier surfacing mechanism (TBD-2) remains deferred — but this section confirms the underlying data it needs.

- **TBD-2 (Sub-tier surfacing)**: The surfacing mechanism must handle the scenario where an athlete earns multiple sub-tier advances in a single evaluation period (e.g., enters a new family and quickly accumulates active weeks). The promotion queue handles delivery; TBD-2 determines how athletes see sub-tier advance notifications in P-2.

- **No Hidden Blockers**: The confirming evidence requirements (first improvement event, program graduation, additional sealed chapter) must be surfaced proactively in P-2 What's Next before they become blocking at a specific sub-tier. An athlete approaching Craftsman · II should see guidance about improvement tracking before hitting the Craftsman II → III gate.

- **Evaluation service (TBD-16)**: Must track family entry date per athlete and compute active weeks since that date as a specific counter distinct from total cumulative active weeks (which feeds family promotion thresholds in Section 14). These are two different accumulation counters that share the active week definition.

---

## 14. TBD-4 — Family Promotion Thresholds

### 14.1 Problem

Family promotion thresholds are the most critical numeric gap in the entire rank system. The architecture defines 6 family promotion transitions (Foundation→Builder through Legacy→Icon), each requiring multi-requirement convergence across up to 5 requirement types (RSA §5.2). Not a single numeric value exists for any threshold in any category at any transition.

Without these thresholds, the rank evaluation layer cannot determine promotion eligibility for any family transition. Sub-tier thresholds (Section 13) provide internal progress markers, but the family promotion is the definitive rank advancement event — it triggers M-1, changes the athlete's identity, and is permanently recorded.

TBD-4 also subsumes the time gate values described qualitatively in RSA §9. The time gate classifications (no gate, minimal, first meaningful, meaningful, major, exceptional) are locked — but the corresponding minimum elapsed-time values are entirely undefined.

### 14.2 The Multi-Requirement Convergence Model

Family promotions are governed by the hybrid model from RSA §5.2: all applicable requirement types must be satisfied simultaneously. No single requirement substitutes for another.

For each family transition, the applicable requirement types are:

| Requirement Type | F→B | B→C | C→A | A→E | E→L | L→I |
|-----------------|-----|-----|-----|-----|-----|-----|
| Development evidence | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Category requirements | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Signature milestone | — | — | ✓ | ✓ | ✓ | ✓ |
| Time eligibility | — | minimal | ✓ | ✓ | ✓ | ✓ |
| Recent engagement | — | — | ✓ | ✓ | ✓ | ✓ |

Development evidence is always required and is substantiated by the category requirements being met — it is not a separate additional check. Category requirements are the primary threshold block. Signature milestones, time eligibility, and recent engagement are additional gates that become progressively applicable as rank increases.

### 14.3 The Baseline Athlete

Threshold calibration uses a **baseline athlete** as the reference model for validating that thresholds align with timeline targets:

- **Training frequency**: 3 sessions per active week
- **Active week rate**: active approximately 75% of calendar weeks (~3 active weeks per month)
- **Program engagement**: participates in 1 program per 3-4 months of active training at mid-ranks
- **Chapter engagement**: seals chapters at a deliberate pace (1 sealed chapter every 6-9 months of active engagement)
- **Goal engagement**: sets and resolves primary goals alongside chapter sealing

At this baseline:
- Foundation→Builder: ~2 months ✓ (target: 0-2 months)
- Builder→Craftsman: ~6 months ✓ (target: 2-6 months)
- Craftsman→Architect: ~12 months ✓ (target: 1-2 years)
- Architect→Established: ~24 months ✓ (target: 2-4 years)
- Established→Legacy: ~60 months ✓ (target: 5-8 years, early end)
- Legacy→Icon: ~96 months ✓ (target: 8+ years)

Very active athletes (4-5 sessions/week) will be held at upper ranks by time gates, not by category thresholds — consistent with the Identity Credibility Principle. Less active athletes (~2 sessions/week) may take longer than the target timeline — which is acceptable given the targets are expected ranges, not hard windows.

### 14.4 Training Consistency Thresholds

Training Consistency (#1 category) is measured as **cumulative active weeks since journey start** (or since Forge Legacy first use for native athletes). This is the full-history accumulated signal, as distinct from the "within current family" count used in sub-tier thresholds.

Import treatment (per R-D46): for Foundation through pre-Architect thresholds, imported active weeks count at full credit. For Architect and above (prestige ranks), imported active weeks contribute at partial credit, and a Forge-native active week floor applies. The specific partial credit rate is a formula-level decision deferred to a future session; the structural floors are defined here.

**Cumulative Active Week thresholds:**

| Transition | Total AW required | Forge-native AW floor |
|-----------|------------------|-----------------------|
| F→B | 6 | — |
| B→C | 18 | — |
| C→A | 36 | 18 |
| A→E | 72 | 36 |
| E→L | 180 | 90 |
| L→I | 288 | 144 |

**The Forge-native floor** means: regardless of imported history, the athlete must have logged at least this many Forge-native active weeks before becoming eligible for the prestige rank transition. For Craftsman→Architect, a minimum of 18 Forge-native active weeks is required (~6 months of native active training). This operationalizes R-D46's "Forge-native confirmation" requirement at the first prestige gate.

The floor scales proportionally with rank: each prestige rank requires that 50% of the cumulative active week requirement be Forge-native. An athlete can import their way to meeting the total threshold, but cannot import their way past the native floor.

**Calibration check:**

At 3 AW/month, the cumulative thresholds arrive at:
- 6 AW: 2 months (F→B)
- 18 AW: 6 months (B→C)
- 36 AW: 12 months (C→A — AW threshold binding; time gate = 9 months means AW is the constraint at normal pace)
- 72 AW: 24 months (A→E — AW threshold binding; time gate = 18 months means AW is the constraint at normal pace)
- 180 AW: 60 months / 5 years (E→L — AW binding at 5 years; time gate = 48 months means AW binding at normal pace)
- 288 AW: 96 months / 8 years (L→I — AW binding at 8 years; time gate = 84 months means AW binding at normal pace)

Very active athletes (4+ AW/month) will be time-gate-constrained at prestige ranks.

### 14.5 Time Gate Values

Time gates express minimum elapsed time from journey start (or from Forge account creation for native-only athletes). They are floors — the athlete must have been in their training journey for at least this long, regardless of how many active weeks they have accumulated.

For imported athletes, journey start = earliest imported session date (consistent with the Longevity definition from TBD-14).

| Transition | Classification (RSA §9) | Time Gate (minimum) |
|-----------|------------------------|---------------------|
| F→B | No meaningful gate | None |
| B→C | No meaningful gate | 60 days (2 months) |
| C→A | First meaningful gate | 270 days (9 months) |
| A→E | Meaningful gate | 540 days (18 months) |
| E→L | Major gate | 1460 days (48 months / 4 years) |
| L→I | Exceptional gate | 2555 days (84 months / 7 years) |

**Notes on time gate values:**

- Builder has "no meaningful time gate" in the RSA, but a 60-day floor is applied here. Rationale: "I'm building habits" has no credibility if the athlete can exit Builder in days. The 60-day floor is the minimum, not a meaningful gate — it exists only to prevent absurdly fast progression by high-volume athletes, not to constrain normal athletes. It does not appear on the "meaningful gate" list in the architecture because it is the minimum required by common sense, not a deliberate identity-credibility gate.

- Craftsman→Architect (270 days / 9 months): the first gate that carries real weight. An athlete who enters at month 0 and trains intensively still cannot become Architect before 9 months. "I'm intentionally shaping my development" requires demonstrated duration of intention.

- Architect→Established (540 days / 18 months): "I've built something real" requires more than a year. 18 months is the minimum; the AW threshold at normal pace requires 24 months (2 years), making the AW binding in typical cases.

- Established→Legacy (1460 days / 4 years): "My journey has become a meaningful story" cannot be reached in under 4 years. Even the most active athlete cannot shortcut this. At normal pace, the AW threshold binds at 5 years — the time gate protects the identity at the floor.

- Legacy→Icon (2555 days / 7 years): "I repeatedly become the person I intend to become" over a 7-year minimum documented journey. The "exceptional" classification is warranted: a 7-year journey is genuinely exceptional.

### 14.6 Personal Improvement Thresholds

Personal Improvement is evaluated using the Personal Best Progression model from TBD-8. Thresholds for family promotion are expressed in terms of improvement evidence on the athlete's type-appropriate primary signal.

| Transition | Personal Improvement Requirement |
|-----------|----------------------------------|
| F→B | Not required — too early for meaningful improvement data |
| B→C | First improvement event — at least one new personal best on primary signal registered |
| C→A | Demonstrated improvement pattern — multiple personal best advancements across distinct time periods |
| A→E | Repeated improvement — a pattern of growth evidenced across multiple evaluation periods, not a single improvement phase |
| E→L | Multi-year improvement — sustained advancement across at least two distinct years of training history |
| L→I | Multi-phase improvement — multiple distinct phases of growth spanning years, evidencing continued development into advanced training |

These qualitative descriptions align directly with the Major Rank Identity Tests (RSA §15):
- Craftsman identity test: "Meaningful improvement — demonstrable progress in at least one primary signal" → met by B→C's first improvement event
- Architect identity test: "Meaningful improvement" → met by C→A's demonstrated pattern
- Established identity test: "Repeated improvement — a pattern of growth, not a single peak" → matches A→E description
- Legacy identity test: "Repeated improvement across different time periods" → matches E→L description
- Icon identity test: "Sustained growth — improvement that continues rather than plateauing" → matches L→I description

The exact numeric thresholds (how many personal best events, across how many months) for the "pattern" and "multi-year" requirements are deferred to Session 4 as Q13. The structural model — Personal Best Progression with time-distributed evidence — is resolved here.

### 14.7 Program Progression Thresholds

Program Progression (#3 category). Program Graduation is the primary signal (standardized per RSA §8.2, C-5).

| Transition | Program Graduations Required |
|-----------|------------------------------|
| F→B | 0 — not required |
| B→C | 0 — programs materially accelerate but are not required at this stage |
| C→A | 1 — at least 1 completed program graduation |
| A→E | 3 — multiple programs as part of the Established signature milestone |
| E→L | 6 — multiple structured journeys across distinct development phases |
| L→I | 10 — extensive program history representing multiple development cycles |

**Defining "multiple" in the Established signature milestone:**
RSA §14 states "multiple completed programs + multiple completed and sealed Chapters." This document defines:
- **"Multiple programs" for Established = 3 program graduations**
- This is the structural definition that fills the "Multiple" placeholder in RSA §14 for Established.

**Defining "multiple" and related terms for Legacy and Icon signature milestones:**
- **Legacy milestone** ("multiple programs representing distinct development phases"): 6 program graduations, spanning at least 2 different programs (not 6 repetitions of the same program). Distinct development phase requirement: at least 3 of the 6 graduations must be from different program categories or significantly different program designs.
- **Icon milestone** ("repeated cycles of commitment, development, achievement, reflection, and fulfillment"): 10 program graduations across multiple years.

These definitions fill the placeholder descriptions in RSA §14 for the combination and pattern milestones.

### 14.8 Training Volume Thresholds

Training Volume (#4 category). Measured as total meaningful work sessions (as defined in TBD-7). Volume thresholds confirm the athlete has accumulated a real body of training work, not merely reached the active week threshold through minimal sessions.

Import treatment: imported sessions count toward volume at full credit for Foundation and Builder thresholds. For prestige rank volume thresholds, imported sessions contribute at partial credit consistent with R-D46 (specific credit rate deferred).

| Transition | Volume Required (meaningful work sessions) |
|-----------|---------------------------------------------|
| F→B | 12 sessions |
| B→C | 36 sessions |
| C→A | 90 sessions |
| A→E | 200 sessions |
| E→L | 400 sessions |
| L→I | 700 sessions |

**Calibration check** at 3 sessions/active week × 3 active weeks/month = 9 sessions/month:
- 12 sessions: ~1.3 months (binding before AW threshold at F→B — appropriate: very early development check)
- 36 sessions: ~4 months (binding before AW threshold; AW binds at month 6 for B→C)
- 90 sessions: ~10 months (AW binds at month 12 for C→A; volume binds slightly earlier)
- 200 sessions: ~22 months (AW binds at month 24 for A→E; volume binds slightly earlier)
- 400 sessions: ~44 months (time gate binds at month 48; volume already met)
- 700 sessions: ~78 months (time gate binds at month 84; volume already met)

Volume is the binding constraint at Foundation and early Builder. At upper ranks, the AW threshold and time gate are binding; volume is a confirming floor. This is the correct design — volume confirms accumulated work but doesn't independently govern prestige promotions.

### 14.9 Sealed Chapter and Goal Participation Thresholds

These combine the Chapter Progression secondary category (TBD-13), Goal Participation secondary category (TBD-15), and signature milestone requirements (RSA §14) into concrete thresholds.

**Sealed chapters:**

| Transition | Sealed Chapters Required |
|-----------|--------------------------|
| F→B | 0 — not required |
| B→C | 0 — not required |
| C→A | 1 — Architect signature milestone (RSA §14: "First completed and sealed Chapter") |
| A→E | 2 — Established signature milestone ("multiple completed and sealed Chapters" = 2 minimum) |
| E→L | 3 — Legacy signature milestone requires chapter progression |
| L→I | 5 — Icon signature milestone requires "multiple meaningful journeys" |

**Defining "multiple" in the Established signature milestone (sealed chapters):**
- **"Multiple sealed chapters" for Established = 2 sealed chapters minimum**

This fills the second "multiple" placeholder in RSA §14 for Established.

**Goal participation events and goal achievement:**

| Transition | Goal Participation Events | Primary Goals Achieved (minimum) |
|-----------|--------------------------|----------------------------------|
| F→B | 0 | 0 |
| B→C | 0 | 0 |
| C→A | 1 participation event | 0 achieved required (any resolution qualifies) |
| A→E | 2 participation events | ≥1 primary goal achieved |
| E→L | 4 participation events | ≥2 primary goals achieved |
| L→I | 6 participation events | ≥4 primary goals achieved |

**Goal participation events** = primary or secondary goal resolution events through chapter sealing (TBD-15 definition). A chapter sealed with a primary goal defined constitutes 1 primary participation event plus any secondary event count.

**Primary goals achieved** = the count of primary goals that reached the Achieved outcome through chapter sealing. This satisfies the Established identity test ("goal fulfillment — goals set and achieved, not merely set") and scales through Legacy ("repeated goal fulfillment") and Icon ("repeated goal fulfillment over many years").

The ratio of achieved goals to total participation events is not a hard-coded formula here. The minimum achievement counts ensure that at upper ranks, the athlete has demonstrated genuine goal fulfillment — not merely goal participation. An athlete with 4 participation events and 0 achieved goals cannot be Established, regardless of how many total events they have.

### 14.10 Recent Engagement Requirement

Recent engagement (TBD-10) is required for Architect and above as a promotion gate. Its structural definition is: active weeks within a lookback window, evaluated at the moment of promotion consideration (not at queue entry).

The specific lookback window duration and minimum active week count are Q9 and Q10 decisions flagged for the user in Section 17. Those values are not defined here.

The family promotion threshold table references recent engagement as a required gate for Architect and above. No promotion to Craftsman or below has a recent engagement requirement.

For import treatment: whether imported sessions satisfy recent engagement is Q7, also unresolved. The threshold table marks it as required — the specific eligibility of imported sessions is pending.

### 14.11 Comprehensive Family Promotion Threshold Table

This table consolidates all threshold types per transition. Requirements marked — are not applicable at that transition.

| Requirement | F → B | B → C | C → A | A → E | E → L | L → I |
|-------------|-------|-------|-------|-------|-------|-------|
| **Time gate (minimum)** | None | 60 days | 270 days | 540 days | 1,460 days | 2,555 days |
| **Cumulative active weeks (total)** | 6 | 18 | 36 | 72 | 180 | 288 |
| **Forge-native AW floor** | — | — | 18 | 36 | 90 | 144 |
| **Personal improvement** | — | First event | Multi-period pattern | Repeated | Multi-year | Multi-phase |
| **Program graduations** | 0 | 0 | 1 | 3 | 6 | 10 |
| **Volume (meaningful work sessions)** | 12 | 36 | 90 | 200 | 400 | 700 |
| **Sealed chapters** | 0 | 0 | 1 | 2 | 3 | 5 |
| **Goal participation events** | 0 | 0 | 1 | 2 | 4 | 6 |
| **Primary goals achieved (minimum)** | 0 | 0 | — | ≥1 | ≥2 | ≥4 |
| **Recent engagement** | — | — | Required | Required | Required | Required |
| **Signature milestone** | None | None | 1st sealed chapter | 3 programs + 2 chapters | 6 programs + 3 chapters | 10 programs + 5 chapters |

F = Foundation, B = Builder, C = Craftsman, A = Architect, E = Established, L = Legacy, I = Icon

**Every row is a hard requirement.** An athlete who satisfies all rows except one is not eligible for family promotion. There are no substitute paths — this is the multi-requirement convergence model. The value in any cell is the minimum that must be met; exceeding a threshold does not compensate for a deficit in another.

### 14.12 The Signature Milestone Layer

The signature milestone column consolidates the Chapter + Program requirements into the milestone language from RSA §14:

- **Craftsman→Architect signature milestone**: first completed and sealed chapter. Satisfied by: sealed chapters ≥ 1.
- **Architect→Established signature milestone**: multiple programs + multiple chapters. Satisfied by: program graduations ≥ 3 AND sealed chapters ≥ 2. This operationalizes the RSA's two "multiple" placeholders as 3 + 2.
- **Established→Legacy signature milestone**: multi-year development + program progression + chapter progression + sustained improvement. Satisfied by: time gate (4 years) + 6 program graduations + 3 sealed chapters + multi-year improvement pattern. Each of these is individually checked; the combined satisfaction constitutes the milestone.
- **Legacy→Icon signature milestone**: repeated pattern milestone. Satisfied by: 10 program graduations + 5 sealed chapters + 4 primary goals achieved + multi-phase improvement + time gate (7 years). The convergence of all these requirements is the "repeated cycles of commitment, development, achievement, reflection, and fulfillment" pattern described in RSA §14.

### 14.13 Import Treatment at the Family Promotion Level

R-D46 establishes that imported history provides partial credit and contextual recognition, but cannot independently grant prestige ranks. The threshold table implements this through:

**Full credit (imported = native, for lower-rank thresholds):**
- Foundation→Builder and Builder→Craftsman: all thresholds accept imported signals at full credit
- An athlete with a documented imported training history can legitimately advance through Foundation and Builder quickly — their history IS their development record

**Partial credit (imported contributes, native floor required):**
- Craftsman→Architect and all prestige rank transitions: Forge-native AW floor is required
- Volume thresholds at prestige ranks accept imported sessions at partial credit (rate deferred)
- Sealed chapters and program graduations are Forge-native-only: an imported chapter that was sealed pre-Forge counts toward sealed chapter counts under R-D46's recognition of historical chapters in the import architecture. Program graduations from pre-Forge programs count if the import record confirms graduation.
- Goal participation events from pre-Forge history: import treatment is subject to Q4 (still open). If the import pipeline carries goal records, pre-Forge resolutions may count. If not, goal participation is Forge-native-only.

**Forge-native-only (no import credit):**
- Recent engagement always requires Forge-native activity if Q7 is resolved as "native-only" (pending user decision)
- The signature milestone layer requires genuine engagement with Forge Legacy systems — a chapter sealed pre-Forge cannot count as the Architect first-sealed-chapter milestone if the athlete has not engaged with Forge's chapter system at all

### 14.14 Downstream Impacts

- **Rank Evaluation Service (TBD-16)**: Must implement all 10 threshold checks per applicable transition and evaluate all simultaneously. Cannot be implemented until TBD-16 is resolved, but these thresholds define the evaluation service's inputs completely.

- **Promotion queue (RSA §12)**: Multi-promotion scenarios (e.g., post-import) will produce queued promotions based on these thresholds. The evaluation service processes transitions in order; after each promotion, thresholds for the next transition are checked.

- **P-2 No Hidden Blockers**: Every threshold in the table is a potential hidden blocker that must be surfaced in P-2 What's Next before it becomes a gate. Program graduation counts, sealed chapter counts, goal achievement counts, and AW progress must all be visible as development areas at appropriate stages. The specific surfacing logic depends on where the athlete is relative to each threshold — the threshold values here define the targets that P-2 guidance is calibrated toward.

- **Recent engagement (Q9, Q10)**: The threshold table references recent engagement as Required for Architect and above. The specific lookback window and minimum AW count (Q9) and whether the threshold scales per rank (Q10) must be resolved before the evaluation service can implement the recent engagement gate.

- **Import pipeline completeness**: The evaluation service must be able to determine, per session record, whether it is native or imported. The Forge-native floor requires distinguishing native active weeks from imported ones. This is an import pipeline data requirement.

- **D-RCM-13 dependency**: The definitions of "multiple" in the Established milestone (3 programs, 2 chapters) and "multiple" in the Legacy milestone (6 programs, 3 chapters) fill placeholders in RSA §14. These definitions become load-bearing once the document is locked — changing them would require an amendment.

---

## 15. TBD-5 — Promotion Spacing Values

### 15.1 Problem

Promotion spacing is the minimum time between successive rank promotions being delivered from the promotion queue. The philosophy is locked: spacing increases with rank. Specific spacing values are "TBD-5" (RSA §11.2): "Specific spacing values: TBD-5."

Spacing matters most in the post-import scenario: an athlete imports years of training history, earns multiple queued promotions, and the queue must deliver them with appropriate pacing. Without spacing values, the queue could deliver 10 promotions in rapid succession — which would make each promotion feel trivial and would undermine the M-1 ceremony's significance.

Spacing also matters when an athlete earns a sub-tier advance and then rapidly earns the next sub-tier advance in the same evaluation period. The queue should space these deliveries even if the underlying development evidence was earned simultaneously.

### 15.2 The Nature of Spacing

Spacing is the minimum elapsed time between when one promotion FIRES (is delivered to the athlete) and when the next promotion from the queue can fire. It is not:
- The time between when a promotion was EARNED and when it fires
- The time between successive evaluation events
- A new requirement on top of the development evidence requirements

Spacing applies only within the promotion queue. If an athlete earns only one promotion from a given training period (the normal case), spacing is irrelevant — the promotion fires immediately when triggered, with no queue competition.

The spacing clock starts when the previous promotion fires. A promotion waiting in the queue does not lose its place — it fires at the earliest moment after its development evidence is confirmed AND the spacing requirement since the last promotion has been satisfied.

### 15.3 Options Evaluated

**Option A — Flat universal spacing**
Every promotion, regardless of rank or type (sub-tier vs. family), has the same minimum spacing (e.g., 7 days between any two promotions).

**Option B — Rank-scaled spacing**
Spacing increases with rank: Foundation promotions fire quickly; Established and Legacy promotions fire slowly. Reflects the increasing weight and identity significance of upper-rank promotions.

**Option C — Type-differentiated spacing (sub-tier vs. family)**
Sub-tier advances have shorter spacing than family promotions. Within a family, there are multiple sub-tier advances that should be paced appropriately; family promotions are less frequent and more significant, warranting longer spacing.

**Option D — Rank-scaled + type-differentiated (combined)**
Spacing is different for sub-tier advances vs. family promotions, AND scales with rank across both types.

### 15.4 Tradeoffs

| Option | Pro | Con |
|--------|-----|-----|
| A — Flat | Simplest to implement and communicate. | All promotions treated equally. A Foundation sub-tier advance and a Legacy family promotion feel the same in the queue. This is wrong — they are not equally significant. |
| B — Rank-scaled | Correctly weights upper-rank promotions as more significant and deliberate. | Does not distinguish sub-tier from family promotions, which have meaningfully different significance (M-1 fires on family only; sub-tiers have no ceremony). |
| C — Type-differentiated | Correctly reflects the ceremony difference. Sub-tier advances are progress markers; family promotions are identity shifts. Different spacing for each. | Does not account for rank level. A Foundation sub-tier and a Legacy sub-tier should feel different, but flat type-differentiation treats them the same. |
| D — Rank + type (combined) | Most precisely calibrated. Sub-tier advances increase in spacing with rank; family promotions increase in spacing with rank; and family promotions are always longer than same-rank sub-tier spacing. | More complex spacing table. But the table itself is simple to implement as a lookup — complexity is only in the authoring, not the execution. |

### 15.5 Recommendation

**Option D — Rank-scaled and type-differentiated spacing.**

**Rationale:**

1. Foundation and Builder sub-tier advances should feel encouraging and frequent. A Foundation athlete who earns Foundation · II after their first 2 active weeks should experience that quickly — the encouragement is the product. Spacing these too long would make early rank feel stagnant.

2. Legacy sub-tier advances are meaningful events. An athlete who spends 10 active weeks to reach Legacy · II has been training for many weeks at the most demanding rank. The delivery of that advance should feel deliberate, not rushed. A 30-day spacing is appropriate for this level.

3. Family promotions always warrant more deliberateness than sub-tier advances. The M-1 ceremony fires on family promotions only. The sub-tier before the family promotion (sub-tier IV) is the final progress marker before the identity shift. After it fires, the athlete needs enough time to experience that state before the M-1 family promotion can follow.

4. The post-import queue scenario is the primary use case for spacing. An athlete who imports 8 years of history might earn: Foundation sub-tier advances (3), Foundation→Builder family promotion, Builder sub-tier advances (3), Builder→Craftsman family promotion — totaling 8 promotions. With rank-scaled and type-differentiated spacing, this queue clears over approximately 2-3 weeks (mostly driven by sub-tier spacing in Foundation and Builder). That is the right pace for clearing lower-rank history: meaningful but not drawn out.

### 15.6 Spacing Values

**Sub-tier advance spacing** (minimum time between sub-tier promotion deliveries, within and across families):

| Family | Sub-tier advance spacing |
|--------|--------------------------|
| Foundation | 1 day |
| Builder | 3 days |
| Craftsman | 7 days |
| Architect | 14 days |
| Established | 21 days |
| Legacy | 30 days |

**Family promotion spacing** (minimum time after the previous promotion of any kind before a family promotion can fire):

| Family Promotion | Minimum spacing |
|-----------------|-----------------|
| →Builder | 1 day |
| →Craftsman | 7 days |
| →Architect | 21 days |
| →Established | 30 days |
| →Legacy | 45 days |
| →Icon | 60 days |

**Critical rule:** Family promotion spacing is measured from the last queue event, not from the last family promotion. If an athlete earns Foundation · IV and then Foundation→Builder in rapid succession, the Foundation · IV sub-tier fires (1-day spacing after previous event), and then Builder family promotion cannot fire until 1 day (its minimum) after the sub-tier advance. In practice, the M-1 ceremony requires the athlete to dismiss it — so the family promotion fires when the athlete next opens the app post-spacing.

### 15.7 Queue Interaction Scenarios

**Scenario 1: Normal progression (no queue backlog)**
An athlete earns Foundation · II after 2 active weeks. The promotion fires immediately — no queue delay because no previous promotion is pending. When they then earn Foundation · III, spacing requires at least 1 day since · II fired. At normal training pace, Foundation · III will not be earned until at least 2 more active weeks later, so spacing is naturally satisfied. Spacing is effectively invisible in the normal-progression case.

**Scenario 2: Post-import queue**
An athlete imports 3 years of training history. Post-evaluation, the following promotions are queued (assuming all thresholds are met):
1. Foundation · II (fires immediately)
2. Foundation · III (fires after 1 day)
3. Foundation · IV (fires after 1 day)
4. Foundation→Builder (fires after 1 day — family spacing from Foundation · IV)
5. Builder · II (fires after 3 days)
6. Builder · III (fires after 3 days)
7. Builder · IV (fires after 3 days)
8. Builder→Craftsman (fires after 7 days — family spacing from Builder · IV)
9. Craftsman · II (fires after 7 days)
10. ... (continuing if Craftsman thresholds are met)

Total time to clear Foundation through Builder: ~3+3+3+7 = 16 days minimum for the first 8 promotions. The athlete experiences each promotion individually with deliberate spacing — not in one overwhelming burst.

**Scenario 3: Prestige rank queue**
An athlete earns Architect · IV (sufficient AW in Architect). The next item in the queue is the Architect→Established family promotion (assuming all Established thresholds are met). The Architect→Established family promotion spacing is 30 days after the Architect · IV sub-tier fired. This 30-day window is appropriate: the athlete experiences their final Architect sub-tier before the Established identity shift arrives.

**Scenario 4: Recent engagement gate in the queue**
An athlete earns enough development evidence for Craftsman→Architect but is not currently meeting the recent engagement requirement (they have been inactive for several months). The Craftsman→Architect promotion enters the queue but cannot fire until recent engagement is satisfied. When the athlete resumes training and satisfies the lookback window requirement, the promotion becomes eligible to fire. The spacing clock for the next queue item starts from when the Craftsman→Architect promotion actually fires — not from when it entered the queue.

### 15.8 Downstream Impacts

- **M-1 integration**: The M-1 ceremony architecture must account for spacing. When a family promotion becomes eligible to fire, if the athlete is mid-session or otherwise cannot receive the ceremony at that moment, the promotion should queue at the ceremony level and fire at the next available natural moment (e.g., app open, end of session). Spacing ensures the ceremony does not fire immediately after a sub-tier advance in a rapid-fire sequence.

- **Queue implementation (RSA §12)**: The queue must track per-promotion: when the promotion entered the queue, when it became eligible to fire, and the current spacing state. The spacing timer must reset each time a promotion fires — the next pending promotion in the queue becomes eligible only after the spacing interval from the last fired promotion.

- **Post-import UX**: Athletes who import history should be told, at import completion, that they have earned promotions that will be delivered over the coming days. The spacing prevents them from receiving all promotions at once, which would be overwhelming. P-2 should show pending queued promotions as a transparent, encouraging signal.

- **Spacing ≠ development deferral**: Spacing affects queue delivery timing only. It does not prevent the athlete from earning additional development evidence during the spacing period. An athlete who earns Craftsman · II and then trains intensively can earn Craftsman · III's development evidence immediately — it will just wait in the queue until the Craftsman sub-tier 7-day spacing has elapsed.

---

## 16. Session 3 Refinement Report

### 16.1 What This Session Resolved

Three high-priority TBD items have been resolved:

| TBD | Decision Summary |
|-----|-----------------|
| TBD-3 | Sub-tier thresholds = active weeks within current rank family as primary signal, with confirming evidence at specific sub-tiers for Craftsman and above. Threshold table provided: Foundation I→II at 2 AW through Legacy III→IV at 36 AW. Confirming evidence required at Craftsman II→III, Architect II→III, Established III→IV, Legacy III→IV. |
| TBD-4 | Family promotion thresholds defined across all 6 family transitions. Multi-requirement convergence model: all 5 requirement types must simultaneously be satisfied. Comprehensive threshold table provided. Time gates concretized. "Multiple" defined: 3 programs + 2 chapters for Established; 6 programs + 3 chapters for Legacy. Forge-native AW floors defined for prestige rank transitions (50% of total AW threshold must be native). |
| TBD-5 | Promotion spacing = rank-scaled and type-differentiated. Sub-tier spacing: 1 day (Foundation) to 30 days (Legacy). Family promotion spacing: 1 day (→Builder) to 60 days (→Icon). Spacing clock starts from previous promotion fire, not from queue entry. Spacing is invisible in normal progression; critical in post-import queue scenarios. |

### 16.2 Structural Coherence Check

**TBD-3 builds on TBD-6 and TBD-7**: Sub-tier thresholds use active weeks within the family (TBD-6 Active Week definition). Confirming evidence at specific sub-tiers uses improvement events (TBD-8 Personal Best model) and sealed chapters (TBD-13 definition). All three prior-session decisions feed cleanly into the sub-tier model without modification.

**TBD-4 builds on all prior sessions**: Family promotion thresholds integrate:
- Active weeks (TBD-6) for Training Consistency
- Meaningful work sessions (TBD-7) for Training Volume
- Personal Best Progression (TBD-8) for Personal Improvement
- Sealed chapters (TBD-13) for Chapter Progression and signature milestones
- Goal participation events (TBD-15) for Goal Participation
- Forge-native confirmation model (R-D46) for prestige rank floors
- Recent engagement gate (TBD-10) for Architect and above

All seven prior-session decisions are expressed in the threshold table. The table is the convergence point of the entire Computation Model.

**TBD-5 builds on RSA §11 and §12**: Spacing values implement the philosophy in RSA §11.2 ("spacing increases with rank") and the queue rules in RSA §12 (sequential, no skipping). The two-dimensional structure (rank × type) is not explicitly required by the architecture but is the natural extension of the cadence descriptions (Fast for Foundation, Final for Icon) to the queue level.

**TBD-3 and TBD-4 are correctly separated**: Sub-tier thresholds (active weeks within family) and family promotion thresholds (cumulative active weeks since journey start + multi-requirement convergence) use different counters and different models. Sub-tier progress and major rank progress are the two distinct dimensions R-D47 requires to be visible simultaneously in P-2 — the separation of TBD-3 and TBD-4 into two different measurement models makes those two dimensions genuinely independent.

**TBD-5 and the queue (RSA §12)**: The spacing values are consistent with the sequential, no-skipping queue architecture. Spacing is a floor — not a ceiling — so natural progression timelines are unaffected.

### 16.3 Decisions That Carry Architectural Weight

**D-RCM-11: Sub-tier active week counter resets on family entry.**
The active weeks counter for sub-tier progress is anchored to the current family entry date. It is a distinct counter from the cumulative active weeks counter used in family promotion thresholds. The evaluation layer must maintain both counters per athlete simultaneously. These are never interchangeable.

**D-RCM-12: Forge-native active week floor is 50% of total AW threshold at all prestige ranks.**
For Craftsman→Architect: 18 of 36 required AW must be Forge-native.
For Architect→Established: 36 of 72.
For Established→Legacy: 90 of 180.
For Legacy→Icon: 144 of 288.
This 50% native floor is the structural operationalization of R-D46's "Forge-native confirmation" requirement. It cannot be reduced without amending R-D46.

**D-RCM-13: "Multiple" in the Established signature milestone = 3 program graduations + 2 sealed chapters.**
RSA §14 used "multiple" as a placeholder. This document resolves it to specific numbers. These numbers become the authoritative definition of the Established milestone. Any reference to "multiple programs" or "multiple chapters" for Established now means 3 and 2 respectively.

**D-RCM-14: "Multiple" in the Legacy signature milestone = 6 program graduations + 3 sealed chapters.**
RSA §14 used qualitative language for the Legacy milestone. This document resolves the program and chapter components to 6 and 3. The full Legacy milestone also requires multi-year improvement and the time gate (4 years).

**D-RCM-15: Promotion spacing applies to the entire queue — sub-tier advances and family promotions share the same spacing clock.**
After any promotion fires (sub-tier or family), the spacing interval for the next queue item begins. There is no separate spacing clock for sub-tier vs. family. The table values reflect the type and rank of the promotion being fired, not the next promotion waiting. This means a Foundation sub-tier advance (1-day spacing) is followed immediately by the next queue item's timer — if the next item is a Builder family promotion (1-day spacing after Builder's sub-tier fire), the total gap is Foundation sub-tier advance + 1 day (Foundation spacing) + Builder sub-tier advances at 3-day spacing each + 1 day (Builder family spacing).

**D-RCM-16: Icon has no sub-tiers and therefore no sub-tier spacing.**
Icon is a single rank level. When an athlete earns Legacy→Icon, the Icon promotion enters the queue with 60-day spacing. There are no subsequent promotions. Icon is the final state.

**D-RCM-17: Primary goals achieved is a hard minimum at Established and above, not a weighted signal.**
An athlete with goal participation events but zero primary goals achieved cannot be Established, regardless of other category development. This operationalizes "goals set and achieved, not merely set" (Established identity test) as a hard gate. Achievement count is not a scoring weight — it is a binary requirement that must be satisfied.

### 16.4 Threshold Table Calibration Summary

The threshold table was calibrated against the RSA §10 timeline targets using a baseline athlete at 3 active weeks/month and 3 sessions/active week. The following summary shows how binding constraints shift across the rank ladder:

| Transition | Primary binding constraint at baseline pace |
|-----------|---------------------------------------------|
| F→B | Active weeks (training volume confirms early) |
| B→C | Active weeks (minor time gate of 60 days rarely binds) |
| C→A | Active weeks and volume (time gate binds for highly active athletes) |
| A→E | Active weeks (time gate binds for highly active athletes) |
| E→L | Time gate and active weeks bind simultaneously at baseline pace |
| L→I | Time gate and active weeks bind simultaneously at baseline pace |

For very active athletes (4-5 sessions/week), time gates are the binding constraint at every prestige rank. This is the intended design — the Identity Credibility Principle requires real elapsed time for the upper identities regardless of training intensity.

### 16.5 What This Session Did Not Resolve

- Import partial credit rate for signals at prestige rank thresholds (numeric rate deferred — Q11 in Session 4)
- Quantitative expression of "improvement pattern," "multi-year improvement," "multi-phase improvement" (deferred — Q13)
- Goal participation import treatment (Q4 — still open from Session 1)
- Meaningful Work duration floor (Q1 — still open from Session 1)
- Active Month week-count threshold (Q2 — still open from Session 1)
- Longevity signal unit (Q6 — still open from Session 1)
- Recent engagement numeric thresholds (Q9 — still open from Session 2)
- Athlete type declaration (Q8 — still open from Session 2)
- Recent engagement import eligibility (Q7 — still open from Session 2)
- Icon display format (TBD-11)
- Sub-tier surfacing mechanism (TBD-2)
- Rank evaluation trigger events (TBD-1)
- Rank data model (TBD-12)
- Rank Evaluation Service architecture (TBD-16)

---

## 17. Open Questions for Session 4

The following questions require user decisions before Session 4 can proceed. They include all carried-forward questions from Sessions 1 and 2 (Q1–Q10), plus new questions from Session 3.

---

**Q1 — Meaningful Work Duration Floor** *(carried from Session 1)*

What is the minimum elapsed session duration for a session to qualify as meaningful work?

*Context*: Numeric floor that makes TBD-7 operational. Candidates: 5, 10, 15, 20 minutes. Affects active week computation, volume accumulation, and the validity of the volume thresholds in Section 14. If the floor is very low (5 minutes), 700 sessions at Icon is achievable more quickly; if higher (20 minutes), it represents more genuine training investment.

*What you need to decide:* A specific minute value.

---

**Q2 — Active Month Week-Count Threshold** *(carried from Session 1)*

How many active weeks within a calendar month must exist for the month to qualify as an active month?

*Context*: Options: ≥1, ≥2, ≥3 active weeks per month. This threshold is not directly referenced in the family promotion tables (which use cumulative active weeks, not active months) — but it affects Training Consistency as a category signal and P-2 What's Next guidance that references monthly patterns.

*What you need to decide:* Minimum active week count per month.

---

**Q3 — Imported Session Duration Handling** *(carried from Session 1)*

What happens to imported sessions that do not have a recoverable duration?

*What you need to decide:* Policy for durationless imported sessions (exclude, default assumption, or reduced-credit inclusion).

---

**Q4 — Goal Participation: Import Treatment** *(carried from Session 1)*

Does the import pipeline carry goal records from pre-Forge history? If yes, how do pre-Forge goal outcomes map to Forge Legacy participation events?

*Context:* This decision directly affects whether athletes with imported history can satisfy goal participation thresholds (Section 14.9) from imported records. If goal records are not importable, imported athletes start with 0 goal participation events regardless of their pre-Forge goal history.

*What you need to decide:* Whether goal records are importable, and their mapping if they are.

---

**Q5 — Achievement Amplification for Goal Participation** *(carried from Session 1)*

At the scoring layer, should Achieved primary goal resolutions carry more weight than Not Achieved resolutions?

*Context:* Section 14.9 requires minimum primary goals achieved (≥1 for Established, ≥2 for Legacy, ≥4 for Icon). The minimum count is a hard gate, not a weight. If achievement amplification exists AT THE SCORING layer (not the threshold layer), it would affect rank evaluation between athletes who both meet the minimum but have different achievement rates.

*What you need to decide:* Whether achievement amplification exists at the scoring layer.

---

**Q6 — Longevity Signal Unit** *(carried from Session 1)*

Is Longevity expressed in calendar months, years, or a hybrid (years and months for display, months for internal evaluation)?

*Context:* The Longevity secondary category contributes to rank evaluation. The unit affects how precisely Longevity differentiates athletes with similar span lengths. The time gates from Section 14.5 create minimum longevity floors implicitly — but Longevity as a contributing signal provides positive credit beyond the gate minimums.

*What you need to decide:* The unit of measurement.

---

**Q7 — Recent Engagement: Native Sessions Only or Import-Eligible?** *(carried from Session 2)*

Can imported sessions satisfy the recent engagement gate for prestige rank promotions?

*Context:* Section 14.10 flags this as unresolved. The family promotion threshold table marks recent engagement as Required for Architect and above but does not specify whether imported sessions count. This affects the Forge-native AW floor interaction: if imported sessions don't count for recent engagement, an athlete who has recently imported sessions still needs native Forge sessions to satisfy the gate.

*What you need to decide:* Native sessions only, or import-eligible, for recent engagement.

---

**Q8 — Athlete Type Declaration** *(carried from Session 2)*

When and how does the athlete declare their athlete type, and how are type changes handled?

*Context:* The Personal Improvement threshold in the family promotion table ("first event," "multi-period pattern," "multi-year improvement") depends on evaluating the athlete's primary signal, which depends on knowing their type. Without type declaration, Personal Improvement is unevaluable. This is a blocking dependency for implementing C→A and above thresholds.

*What you need to decide:* Declaration mechanism (onboarding, Profile, or inference) and type-change policy.

---

**Q9 — Recent Engagement Thresholds** *(carried from Session 2)*

How long is the lookback window for recent engagement, and how many active weeks are required within it?

*Context:* Section 14.10 marks this as Required for Architect and above. The specific window and count make this threshold operational. A proposed range: lookback window of 12–16 weeks, minimum of 6–10 active weeks within that window. At baseline athlete pace (3 AW/month), a 12-week window with 8 active weeks required = ~67% active rate over the last 3 months. This feels appropriate for a prestige rank gate.

*What you need to decide:* Lookback window duration and minimum active week count.

---

**Q10 — Different Recent Engagement Thresholds per Prestige Rank?** *(carried from Session 2)*

Should Architect, Established, Legacy, and Icon have the same recent engagement requirement, or should it scale with rank?

*Context:* The case for scaling: Icon requires "I repeatedly become the person I intend to become" — a higher recent engagement bar for this identity is defensible. The case for uniform: simplicity and predictability. If thresholds do scale, the family promotion threshold table (Section 14.11) would need a Recent Engagement row that shows per-rank values rather than a uniform "Required" marker.

*What you need to decide:* Uniform or scaled recent engagement thresholds across prestige ranks.

---

**Q11 — Import Partial Credit Rate for Training Signals**

At prestige rank thresholds, imported active weeks and imported sessions are credited at a partial rate (per R-D46 and D-RCM-12). What is the specific partial credit rate?

*Context:* The Forge-native floor is 50% of the total threshold. The partial credit rate determines how much of the remaining 50% imported history can contribute. Options:
- 50% rate: imported weeks count as 0.5 native weeks. An athlete with 36 imported AW and 18 native AW would have 18 + (36 × 0.5) = 36 cumulative AW — exactly meeting the Craftsman→Architect threshold with the minimum native floor.
- 25% rate: imported weeks count as 0.25 native weeks. The same athlete would have 18 + (36 × 0.25) = 27 cumulative AW — below the 36 threshold. This would require more native training to compensate.
- Import-eligible only for consistency (not volume): a two-signal approach where active weeks get partial credit but volume requires native sessions only.

*Impact on:* evaluation service implementation, post-import promotion eligibility, athlete messaging about import effects.

*What you need to decide:* The partial credit rate for imported active weeks and imported sessions at prestige rank thresholds.

---

**Q12 — Forge-Native Session Floor for Training Volume at Prestige Ranks**

Should Training Volume (meaningful work sessions) have a Forge-native floor analogous to the Forge-native AW floor?

*Context:* Section 14.8 describes volume thresholds and notes import partial credit. But unlike the AW threshold, no Forge-native floor is defined for volume. Options:
- No floor: volume from imported sessions counts fully toward the threshold (with partial credit rate from Q11)
- Symmetric floor: 50% of volume sessions must be Forge-native (same 50% rule as AW floor)
- No partial credit: volume thresholds require entirely Forge-native sessions for prestige ranks

The AW and volume signals measure complementary things (consistency vs. accumulated work). Applying the same import treatment to both is consistent; treating them differently requires a rationale.

*What you need to decide:* Whether a Forge-native volume floor exists and at what proportion.

---

**Q13 — Quantitative Improvement Pattern Thresholds**

The family promotion table defines Personal Improvement requirements qualitatively ("first event," "multi-period pattern," "repeated," "multi-year," "multi-phase"). What specific event counts and time distributions make these operational?

*Context:* Proposed framework for discussion:
- "First event" (B→C): ≥1 personal best advancement on primary signal (at any time)
- "Multi-period pattern" (C→A): ≥3 personal best advancements, at least 2 separated by 30+ days
- "Repeated" (A→E): ≥6 personal best advancements, spread across at least 6 months of training history
- "Multi-year" (E→L): ≥10 personal best advancements, with at least 1 registered in each of 2 separate calendar years
- "Multi-phase" (L→I): ≥15 personal best advancements, with advancements registered in at least 3 separate calendar years

These are proposed starting points for discussion, not final recommendations. The numbers should be validated against athlete population modeling or product intuition about what a genuinely improving athlete at each rank would be expected to have.

*What you need to decide:* Specific minimum event counts and minimum time distributions for each qualitative improvement tier.

---

**Q14 — Legacy Signature Milestone: "Distinct Development Phases" Operationalization**

Section 14.7 states that Legacy requires 6 program graduations spanning "at least 3 of the 6 from different program categories or significantly different program designs." How should "distinct" and "significantly different" be defined?

*Context:* The intent is that a Legacy athlete cannot graduate the same 6-week Strength program 6 times and satisfy the Legacy milestone — they must have engaged with multiple types of structured development. But a formal definition of "distinct" requires either a category tag on programs or a minimum time separation between repeated programs.

Options: (a) program category tag (program must have a labeled category; 3+ distinct categories required), (b) time-separation rule (at least 12 months between any two graduations from the same program), (c) program authoring standard category field (PAS v1.1 already defines program activity type — 3+ different activity types in the 6-program set).

*What you need to decide:* The operationalization of "distinct development phases" for the Legacy program milestone.

---

## Amendment Log

*None. All decisions in this document are draft-status pending user review and lock.*

---

*Rank Computation Model — Sessions 1–3 DRAFT*
*June 2026*
*Computational Authority for Rank-System-Architecture.md v1.0 (LOCKED)*
