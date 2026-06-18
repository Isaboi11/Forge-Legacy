# Rank System Architecture v1.0

**Status:** LOCKED v1.0
**Type:** Architecture Specification
**Date:** June 2026

**Authority Chain:**
- FORGE_LEGACY_PRODUCT_DNA.md
- MVP-Architecture-Audit-v1.0.md

**Downstream Dependents:**
- Rank-Up-Modal-Spec-M1.md (integration — copy update required, see C-1)
- P-2-Progress-Hub-Architecture.md (integration — R-D47 governs rank progress visibility)
- M-5-Chapter-Sealing-Confirmation-Spec.md (integration — confirmed rank evaluation trigger)
- Rank-Computation-Model.md (computational authority — not yet authored; carries all deferred TBDs)
- [P-3 Rank Detail — not yet authored; depends on TBD-12 in Rank-Computation-Model.md]

**Amendment Log:** Amendment 001 applied (June 2026) — see Amendment Log.

---

## 1. Purpose & Scope

### 1.1 Purpose

This document defines the Rank System for Forge Legacy — the multi-dimensional, identity-based progression framework that recognizes long-term athlete development. It establishes the rank ladder, philosophy, promotion model, category definitions, milestone requirements, and integration contracts that govern how athletes advance through their development journey.

### 1.2 Scope

This document governs:
- Rank ladder structure (families, sub-tiers, identities)
- Rank philosophy and core principles
- Promotion model and requirement types
- Category definitions and weighted ordering
- Signature milestones and identity tests
- Time gate framework
- Promotion cadence and queue behavior
- Rank progress visibility
- Guided transparency and no-hidden-blockers rules
- Integration contracts with downstream systems

This document does NOT govern:
- Promotion ceremony design (see Rank-Up-Modal-Spec-M1.md)
- P-3 Rank Detail screen wireframe (not yet authored)
- Specific numeric promotion thresholds (deferred to Rank-Computation-Model.md)
- Scoring formulas, weighting ratios, or signal definitions (deferred to Rank-Computation-Model.md)
- Rank Evaluation Service implementation (deferred to Rank-Computation-Model.md)

---

## 2. Rank Ladder

### 2.1 Family Structure

The Forge Legacy rank system consists of seven rank families. Six families contain four sub-tiers each. The final family (Icon) has no sub-tiers.

| Order | Rank Family | Sub-Tiers | Total Levels |
|-------|-------------|-----------|--------------|
| 1 | Foundation | I · II · III · IV | 4 |
| 2 | Builder | I · II · III · IV | 4 |
| 3 | Craftsman | I · II · III · IV | 4 |
| 4 | Architect | I · II · III · IV | 4 |
| 5 | Established | I · II · III · IV | 4 |
| 6 | Legacy | I · II · III · IV | 4 |
| 7 | Icon | — | 1 |
| | **Total** | | **25** |

### 2.2 Rank Identities

Each rank family carries a locked identity statement — a single sentence that captures the athlete's relationship to their own training at that stage of development. These are not marketing copy. They are self-descriptions the athlete should be able to say honestly when they reach the rank.

| Rank Family | Identity |
|-------------|----------|
| Foundation | "I've started." |
| Builder | "I'm building habits." |
| Craftsman | "I know how to train." |
| Architect | "I'm intentionally shaping my development." |
| Established | "I've built something real." |
| Legacy | "My journey has become a meaningful story." |
| Icon | "I repeatedly become the person I intend to become." |

### 2.3 Display Format

Rank is displayed as "[Family] · [Sub-tier]" across all surfaces that show the athlete's rank (M-1 ceremony, P-2 identity strip, P-3 Rank Detail).

Examples:
- Foundation · II
- Craftsman · III
- Legacy · I

Icon has no sub-tier. The Icon display format in the M-1 ceremony context is **TBD-11** (see Section 22).

---

## 3. Rank Philosophy & Core Principles

### 3.1 What Rank Is

Rank represents long-term athlete development. It is:

**Earned** — Rank is not purchased, assigned, or conferred. It is produced by demonstrated development across multiple categories over time.

**Permanent** — Once earned, a rank level is never lost. Rank does not decrease. Rank does not decay with inactivity. Rank does not expire.

**Identity-based** — Rank describes who the athlete is becoming, not what they did last week. Each family carries a specific identity statement describing the athlete's relationship to their own training at that stage of development.

**Multi-dimensional** — No single category carries rank. Rank requires evidence across training consistency, improvement, structured development, and volume — not optimization of any one signal.

### 3.2 What Rank Is Not

| Anti-pattern | Why it does not apply |
|---|---|
| XP | No points accumulate toward rank. No numerical score is exposed to the athlete. |
| Gamification | Rank does not use badges-for-behavior, daily challenges, or streak mechanics as progression inputs. |
| Social comparison | Rank is self-referenced. Athletes are not ranked against one another. No leaderboards. No percentiles. |
| Streak-driven | Streaks are not a rank input. Missing a session does not reduce or endanger rank. |

### 3.3 Rank-Never-Decreases Rule

Rank never decreases. This rule has no exceptions.

An athlete who reaches Craftsman and then stops training for a year is still a Craftsman when they return. The Established rank earned over four years of consistent work is not revoked by six months of reduced activity.

This is not a permissive design choice — it is the only design consistent with identity-based rank. Identity is not erased by a rough patch.

---

## 4. Identity Credibility Principle

Rank promotions should occur only when the athlete can reasonably identify with the rank being awarded.

**Promotions must feel believable.**

If an athlete reaches Builder · I after three weeks of activity, they are unlikely to genuinely identify with "I'm building habits." If they reach Architect in four months, they are unlikely to genuinely identify with "I'm intentionally shaping my development."

This principle is the governing rationale for:
- Time gate placement (Section 9)
- Promotion cadence (Section 11)
- Promotion spacing (Section 11)
- The identity tests that define what evidence must be present at each rank (Section 15)

Every structural decision in this specification that relates to timing, pacing, or progression speed is traceable to this principle.

---

## 5. Promotion Model

### 5.1 Model Type: Hybrid

Rank promotions use a hybrid model. Promotion is not a single threshold crossed — it is a convergence of multiple requirement types that collectively confirm the athlete has earned the identity.

### 5.2 Promotion Requirement Types

| Requirement Type | Applicability |
|---|---|
| Development evidence | Always required |
| Category requirements | Always required |
| Signature milestones | Where applicable (Architect and above) |
| Time eligibility | Where applicable (Architect and above) |
| Recent engagement | Where applicable (TBD-10 — see Section 22) |

**Critical rule:** No single category can carry progression by itself.

An athlete with exceptional training volume but no consistency does not advance. An athlete with strong consistency but no structured development does not advance. An athlete who meets every category threshold but has not completed the signature milestone (where applicable) does not advance. The convergence requirement is the mechanism that enforces multi-dimensional development.

### 5.3 Family vs. Sub-Tier Promotions

**Family promotion** (e.g., Builder → Craftsman): Requires all applicable requirement types from Section 5.2. Triggers M-1 Rank Up ceremony.

**Sub-tier promotion** (e.g., Foundation I → Foundation II): Requires category evidence appropriate to the sub-tier level. Does NOT trigger M-1 ceremony. Sub-tier advancement surfacing is **TBD-2** (see Section 22).

---

## 6. Primary Categories

Primary categories are the four core inputs to rank evaluation. They are listed in weighted order — #1 carries the most weight; #4 the least.

**Important:** Weighted order expresses relative importance priority, not a defined numeric ratio. Specific weighting ratios and threshold values are **TBD-4** (see Section 22).

### 6.1 Category Table

| Priority | Category | Core Signal |
|----------|----------|-------------|
| #1 | Training Consistency | Sustained participation over time |
| #2 | Personal Improvement | Adaptive progress within athlete type |
| #3 | Program Progression | Structured development through programs |
| #4 | Training Volume | Accumulated meaningful work |

### 6.2 Training Consistency

Training Consistency measures sustained participation — the athlete's ability to show up regularly over extended time periods.

Primary signals:
- Active weeks
- Active months
- Sustained participation patterns

"Active week" and "active month" definitions: **TBD-6** (see Section 22).

Training Consistency is the #1 category because showing up is the prerequisite for all other development. Improvement cannot occur without sessions. Programs cannot progress without participation. Volume cannot accumulate without consistency. Consistency enables everything else.

### 6.3 Personal Improvement

Personal Improvement measures adaptive progress within the athlete's identified training type. This category is deliberately adaptive — what counts as improvement for a strength athlete is different from what counts for a runner or a boxer.

Athlete type adaptation:

| Athlete Type | Improvement Signal |
|---|---|
| Strength | TBD-8 |
| Running | TBD-8 |
| Boxing | TBD-8 |
| Hybrid | TBD-8 |
| Future athlete types | Defined when type is added to the system |

Per-type metric definitions: **TBD-8** (see Section 22). The category is locked. The per-type metrics are pending.

Personal Improvement is the #2 category because development without progress is maintenance, not growth. The rank system must distinguish athletes who are consistently developing from athletes who are consistently present but plateaued.

### 6.4 Program Progression

Program Progression measures structured development — the athlete's engagement with and completion of organized training programs.

Signals:
- Program participation
- Program completion
- Program graduation (primary signal)

Program graduation is standardized as the primary Program Progression signal. See Section 8 for the role programs play as development signals.

Program Progression is the #3 category because structured programs represent the most deliberate form of development available in Forge Legacy. Athletes who consistently graduate programs are demonstrating intentional, sequenced growth.

### 6.5 Training Volume

Training Volume measures accumulated meaningful work across the athlete's Forge Legacy history.

Signal: Accumulated meaningful work.

"Meaningful work" definition: **TBD-7** (see Section 22).

Training Volume is the #4 category because volume without consistency, improvement, or structure is activity, not development. Volume is a confirming signal — it validates the weight of accumulated training without driving rank on its own.

---

## 7. Secondary Categories

Secondary categories are supporting rank signals. They positively contribute to rank evaluation but are not primary advancement drivers.

| Category | Role |
|---|---|
| Chapter Progression | Depth and completion of the athlete's chapter journey |
| Longevity | Time-based evidence of sustained engagement |
| Goal Participation | Intentional goal-setting and pursuit |

Secondary categories are not hard-coded to exactly three. Additional secondary categories may be added via amendment as the product evolves.

### 7.1 Chapter Progression

Chapter Progression captures the athlete's engagement with the chapter system — the primary narrative structure of Forge Legacy.

Whether Chapter Progression counts all chapters or sealed chapters only: **TBD-13** (see Section 22). Note: Signature milestones (Section 14) explicitly require "completed and sealed" chapters for Architect and above, establishing a strong precedent for sealed-chapters-only within the milestone context.

### 7.2 Longevity

Longevity captures evidence of sustained engagement over time, distinct from the density-of-participation signal provided by Training Consistency.

Definition and distinction from Training Consistency's "active months" signal: **TBD-14** (see Section 22). Longevity likely reflects account tenure and total duration of the training journey; Training Consistency reflects the density of participation within that duration. These are different signals that must not overlap in computation.

Note: The Honor System contains a Longevity family (1-year, 3-year, 5-year, 10-year Forging milestones). These are distinct from the Longevity secondary category for rank. Honors are recognition signals — they are NOT direct rank inputs (RS-D17, Section 20).

### 7.3 Goal Participation

Goal Participation captures intentional, goal-directed behavior.

Definition of what constitutes participation (setting goals, completing goals, goal completion rate, or a combination): **TBD-15** (see Section 22).

### 7.4 Reflection

Reflection is NOT a standalone rank category.

Reflection participation is inherited through the Chapter completion and sealing architecture. Chapter Progression — a secondary category — captures the chapter lifecycle event that inherently includes the reflection step. Athletes who seal chapters have engaged with the reflection flow (L-6) as part of the sealing transaction. No additional reflection category is required or recognized.

---

## 8. Goals & Programs as Development Signals

### 8.1 Goals

Goals are supporting signals in rank evaluation.

- Goals positively influence rank progression
- Goals are not mandatory rank requirements — no promotion is blocked solely by the absence of goals
- Goal Participation is a secondary category (Section 7.3)
- Goal completion contributes to Major Rank Identity Tests (Section 15) as evidence — not as a hard gate for lower ranks

### 8.2 Programs

Programs are major development signals in rank evaluation.

- Programs are not universal promotion requirements — not every rank transition requires program graduation
- Programs materially accelerate development evidence across multiple primary categories (Training Consistency accumulates during active programs; Program Progression is directly contributed; Training Volume accumulates)
- Program graduation contributes as a component of signature milestone requirements for Established and Legacy (Section 14)
- Terminology: "Program Graduation" is the standard term for the event of completing a program, matching M-4 (Program Graduated modal) and Program Authoring Standard usage

The distinction between goals and programs in the rank evaluation context:
- Goals are supporting signals across all ranks
- Programs are major development signals that carry disproportionate weight at mid-to-upper ranks

### 8.3 Imported Training History

Imported pre-Forge training history receives partial credit and contextual recognition within the rank system. The treatment is governed by R-D46.

**What imported history may contribute to:**
- Training Volume
- Training Consistency
- Historical Improvement (as background context)
- Timeline History
- P-2 Progress Context
- Athlete Background

**What imported history may not independently grant:**

Imported history cannot independently grant Architect, Established, Legacy, or Icon. These are prestige ranks that require Forge-native confirmation. Architect and above require Forge-native evidence after import. Imported history alone cannot satisfy prestige-rank eligibility regardless of its volume or duration.

**Rationale:** This model preserves the Identity Credibility Principle while honoring the "Never Charge For History" principle (Monetization Amendment 001). An athlete with decades of pre-Forge training has a real development history — that history deserves recognition in Training Volume and contextual background. But "I'm intentionally shaping my development" (Architect) and above require demonstrated intentionality within Forge Legacy itself. Prestige rank identity is forged here, not imported.

---

## 9. Time Gate Framework

Time gates constrain how quickly athletes can advance through rank families. They exist to enforce the Identity Credibility Principle (Section 4) — ensuring athletes have sufficient lived experience at each rank to genuinely identify with it.

Timeline targets (Section 10) describe the expected duration for an athlete to reach each family. Time gates are the minimum eligibility constraint — the floor below which promotion cannot occur regardless of development pace.

| Rank Family | Time Gate Classification | Description |
|---|---|---|
| Foundation | No meaningful time gate | Promotion is driven by development evidence alone. Time is not a meaningful barrier at the entry stage. |
| Builder | No meaningful time gate | Promotion is driven by development evidence alone. Time is not a meaningful barrier at this stage. |
| Craftsman | Minimal time gate | A light time constraint begins to appear, reinforcing that "I know how to train" requires some accumulated experience to be credible. |
| Architect | First meaningful time gate | The first gate that carries real weight. Athletes cannot arrive at Architect quickly regardless of activity intensity. |
| Established | Meaningful time gate | A substantive time requirement. "I've built something real" requires real years, not months. |
| Legacy | Major time gate | Multi-year eligibility requirement. "My journey has become a meaningful story" cannot be reached in a few years of activity. |
| Icon | Exceptional time gate | The most stringent time gate in the system. Icon requires sustained excellence over many years. |

Specific time gate values (minimum months or years per family): subsumed under **TBD-4** (family promotion thresholds — see Section 22).

---

## 10. Timeline Targets

Timeline targets describe the expected duration for an athlete to reach each rank family under normal (not exceptional) engagement.

These are targets, not gates. Exceptional engagement may accelerate progression at lower ranks. Upper-rank eligibility remains constrained by time gates (Section 9) regardless of engagement intensity.

| Rank Family | Target Timeline |
|---|---|
| Foundation | 0–2 months |
| Builder | 2–6 months |
| Craftsman | 6–12 months |
| Architect | 1–2 years |
| Established | 2–4 years |
| Legacy | 5–8 years |
| Icon | 8+ years |

---

## 11. Promotion Cadence & Spacing

### 11.1 Cadence

Promotion cadence describes how frequently rank promotions are expected to occur within each family under normal engagement patterns.

| Rank Family | Cadence |
|---|---|
| Foundation | Fast |
| Builder | Moderate |
| Craftsman | Moderate |
| Architect | Slow |
| Established | Very Slow |
| Legacy | Extremely Slow |
| Icon | Final |

Icon has a cadence of Final — there is exactly one Icon promotion. It cannot be repeated.

### 11.2 Promotion Spacing

Promotion spacing increases with rank. Athletes must have sufficient time to experience and identify with each rank before becoming eligible to advance further.

Spacing philosophy: an athlete who earns Builder · I should not immediately become Builder · II. An athlete who reaches Craftsman should not immediately begin advancing toward Architect. The experience of holding a rank is itself part of earning the identity.

Specific spacing values (minimum time between successive promotions): **TBD-5** (see Section 22).

---

## 12. Promotion Queue

When an athlete earns multiple promotions simultaneously — for example, upon import of a significant training history, or following a chapter seal that produces multiple development milestones — promotions are not delivered in bulk.

Queue rules:
- Promotions are queued
- Promotions are delivered sequentially
- Every promotion is experienced individually
- No promotion skipping
- No bulk promotion behavior

**M-1 integration:** The promotion queue must integrate with the M-1 Rank Up ceremony architecture. M-1 is Priority 1 in the ceremony queue and fires on family-level promotions only. Sequential delivery ensures each family promotion receives its own M-1 ceremony.

Sub-tier promotions do not enter the M-1 ceremony queue (RS-D14, Section 20).

---

## 13. Sub-Tier Philosophy

### 13.1 Nature of Sub-Tiers

Sub-tiers are a hybrid of:
- **Progress markers** — measurable advancement within the rank family
- **Increasing maturity** — deeper expression of the rank identity over time

Sub-tiers are NOT separate identities. Foundation · I and Foundation · IV share the identity "I've started." The progression from I to IV represents increasing depth of that identity — not a transition to a new one. The athlete is still in their foundation; they are simply further into it.

### 13.2 Sub-Tier Ceremony

There is no ceremony for sub-tier advancement. M-1 fires only on family-level promotions (Foundation → Builder, Builder → Craftsman, etc.).

Sub-tier advancement surfacing: **TBD-2** (see Section 22). The most likely surfaces are P-2 Progress Hub Rank Journey Preview and What's Next section, consistent with the Guided Transparency principle (Section 17). This must be specified before P-2 implementation.

### 13.3 Sub-Tier Thresholds

Specific thresholds for sub-tier advancement within each family: **TBD-3** (see Section 22). These values are entirely undefined and represent a significant gap to resolve before implementation.

---

## 14. Signature Milestones

Signature milestones are specific achievements required for promotion to certain rank families. They represent concrete, verifiable evidence that an athlete has entered a new phase of development — evidence that cannot be accumulated passively.

No signature milestone is required for Foundation, Builder, or Craftsman. Signature milestones apply beginning at Architect.

| Rank Family | Signature Milestone |
|---|---|
| Foundation | None |
| Builder | None |
| Craftsman | None |
| Architect | First completed and sealed Chapter |
| Established | Combination milestone: multiple completed programs + multiple completed and sealed Chapters |
| Legacy | Combination milestone: multi-year development + program progression + chapter progression + sustained improvement |
| Icon | Repeated pattern milestone: repeated cycles of commitment, development, achievement, reflection, and fulfillment over many years |

"Multiple" in the Established milestone: specific program and chapter counts are subsumed under **TBD-4** (family promotion thresholds — see Section 22).

---

## 15. Major Rank Identity Tests

Identity tests describe the qualitative evidence that must be present for an athlete to genuinely hold a rank. These are not computed thresholds — they are descriptions of the reality the athlete must reflect when they earn the rank.

Identity tests begin at Builder. Foundation is the entry state; no test is required to enter Foundation.

### Builder — Identity Test

Evidence required:
- Basic consistency — showing up reliably within a short time window
- Meaningful participation — training sessions logged, not merely an account created

### Craftsman — Identity Test

Evidence required:
- Sustained consistency — reliable participation over a longer window
- Meaningful improvement — demonstrable progress in at least one primary signal
- Structured development — meaningful engagement with training structure through programs or deliberate programming

### Architect — Identity Test

Evidence required:
- Strong consistency history
- Meaningful improvement
- Structured development
- First sealed Chapter (signature milestone — see Section 14)
- Goal-directed behavior — intentional use of the goal system

### Established — Identity Test

Evidence required:
- Sustained consistency
- Repeated improvement — a pattern of growth, not a single peak
- Structured development through multiple programs
- Multiple graduated programs
- Multiple completed and sealed Chapters
- Goal fulfillment — goals set and achieved, not merely set
- A substantial body of work

### Legacy — Identity Test

Evidence required:
- Multi-year consistency
- Repeated improvement across different time periods
- Multiple structured journeys — multiple programs representing distinct development phases, not a single continuous program
- Multiple Chapters that collectively tell a real story
- Repeated goal fulfillment
- Narrative depth — the athlete's training history constitutes a genuine journey, not merely a collection of sessions

### Icon — Identity Test

Evidence required:
- Exceptional longevity
- Repeated goal fulfillment over many years
- Repeated development cycles — multiple distinct phases of intentional growth, not one long program
- Multiple meaningful journeys
- Sustained growth — improvement that continues rather than plateauing after early gains
- A demonstrated long-term pattern of fulfillment — the identity "I repeatedly become the person I intend to become" is evidenced by the record, not merely claimed

---

## 16. Rank Progress Visibility (R-D47)

P-2 Progress Hub must support visibility for both dimensions of rank progress simultaneously.

**Sub-tier progress** — the short-term journey. Where the athlete is within their current rank family. Progress toward the next sub-tier.

**Major rank progress** — the long-term journey. The overall development trajectory toward the next rank family. Progress toward the next family-level promotion.

Both dimensions are visible at once. Neither is surfaced at the expense of the other.

Guided Transparency applies (Section 17):
- Show direction — athletes see what they need to develop and where they are in the journey
- Do not expose formulas — no scoring values, no weighted calculations, no internal metrics are surfaced

The specific P-2 component(s) implementing rank progress visibility are governed by P-2-Progress-Hub-Architecture.md (Rank Journey Preview). This decision establishes the requirement that both dimensions exist and are simultaneously visible; P-2 spec determines the implementation surface.

---

## 17. Guided Transparency

Athletes should understand their development direction. Athletes should NOT see formulas.

### 17.1 What Athletes Can See

- Their current rank family and sub-tier
- Missing development areas ("Your chapter journey is an area to develop")
- Future development opportunities — what to focus on next
- Future promotion requirements — described directionally, not numerically
- Progress toward the next sub-tier (short-term journey — R-D47)
- Progress toward the next major rank family (long-term journey — R-D47)

### 17.2 What Athletes Cannot See

- Rank score or weighted rank score
- Category weights or weighting ratios
- Individual category scores or calculations
- The formula by which promotion is determined
- Specific threshold values for any promotion gate

### 17.3 Primary Transparency Surface

P-2 Progress Hub — specifically the What's Next section and Rank Journey Preview section. These are the primary surfaces through which athletes understand their development direction without encountering formulas.

---

## 18. No Hidden Blockers

Rank progression requirements may never function as hidden blockers.

If an athlete is missing a future advancement requirement, Forge Legacy must proactively surface that development area before the athlete encounters it as a blocking condition.

**The rule:** No athlete should be surprised to discover they are missing a requirement for a promotion they were expecting.

Examples of proactive surfacing:
- An athlete approaching Architect who has not yet sealed a Chapter should see Chapter guidance in P-2 What's Next before the sealed Chapter becomes a promotion requirement
- An athlete approaching Established who has not graduated multiple programs should see Program guidance in P-2 What's Next before multiple graduations become required
- An athlete approaching any upper rank should see Goal guidance if Goal Participation is an underdeveloped area

Primary surface: P-2 Progress Hub What's Next section (consistent with the five-level priority surfacing architecture in P-2-Progress-Hub-Architecture.md).

---

## 19. Integration Map

| System | Integration Type | Details |
|---|---|---|
| P-2 Progress Hub | Primary display and transparency surface | Current rank display (identity strip), Rank Journey Preview (sub-tier progress + family progress — R-D47), What's Next (development guidance, no-hidden-blockers surfacing). |
| M-1 Rank Up Ceremony | Family promotion recognition | Fires on family-level promotion only. Priority 1 in ceremony queue. No sub-tier ceremony (RS-D14). Displays "[Family] · [Sub-tier]" format. Final rank variant applies at Icon. |
| M-5 Chapter Sealing | Confirmed rank evaluation trigger | Rank evaluation runs as part of the M-5 sealing transaction (step 7 in M-5 architecture). One confirmed trigger. Additional trigger events: TBD-1. |
| Chapter Architecture | Signature milestone input | Sealed chapters are required for Architect (first sealed) and Established (multiple sealed) milestone requirements. Chapter Progression is a secondary category. Reflection is inherited through chapter sealing (not a standalone category). |
| Reflection Architecture | Indirect input only | Inherited through Chapter Progression. No standalone rank signal. L-6 reflection is part of the chapter sealing lifecycle; no separate rank credit for reflection. |
| Goal Architecture | Secondary category + supporting signal | Goal Participation is a secondary category. Goals positively influence rank. Goals are not mandatory gates at most ranks. Goal fulfillment contributes to Established and Legacy identity tests. |
| Program Architecture | Primary category (#3) + major signal | Program Progression is primary category #3. Program Graduation is the primary signal. Programs are major development signals that materially accelerate rank advancement. Programs are not universal gates. |
| Honors Architecture | No direct rank integration | Honors are NOT direct rank inputs (RS-D17). Honors and rank are separate recognition systems with a clean boundary explicitly preserved at MVP. |
| P-3 Rank Detail | Downstream dependent — not yet authored | P-3 will display rank family, sub-tier, promotion history, and development trajectory. Cannot be authored until TBD-12 (rank data model) is resolved. |
| Promotion Queue | Internal queue architecture | Sequential delivery. Integrates with M-1 Priority 1 queue position. Governs multi-promotion scenarios (e.g., import history processing). |

---

## 20. Architecture Decision Record

| Decision ID | Decision | Rationale |
|---|---|---|
| RS-D1 | Rank never decreases | Rank is identity-based. Identity is not erased by inactivity or a difficult period. Permanent rank enables authentic self-identification. |
| RS-D2 | Earned rank is permanent — no decay, no expiry | No activity level is required to maintain a rank. Permanence is essential to the identity model and to long-term athlete trust. |
| RS-D3 | Rank is identity-based, not performance-based | Rank describes who the athlete is becoming, not what their most recent performance metrics show. Performance can fluctuate; identity accumulates. |
| RS-D4 | Hybrid promotion model — multi-requirement convergence | No single category carries progression. Convergence of development evidence, category requirements, signature milestones, time eligibility, and recent engagement prevents gaming and enforces multi-dimensional growth. |
| RS-D5 | Primary categories in weighted order: Consistency > Improvement > Program Progression > Volume | This ordering reflects Forge Legacy product philosophy: showing up is foundational; growth is essential; structure accelerates; volume confirms. |
| RS-D6 | Secondary categories are supporting — not mandatory gates | Chapter Progression, Longevity, and Goal Participation contribute positively but do not block promotion in their absence (at most ranks). They provide a richer picture of development without creating additional mandatory barriers. |
| RS-D7 | Goals are supporting signals, not mandatory requirements | Goals positively influence rank but their absence does not block promotion. Some athletes pursue training without formal goal-setting; this does not invalidate their development. |
| RS-D8 | Programs are major development signals, not universal gates | Programs carry disproportionate weight as development evidence and materially accelerate rank progression. They are not required at every rank transition — but athletes who complete programs advance significantly faster. |
| RS-D9 | Reflection is not a standalone rank category | Reflection participation is meaningful but is captured through the Chapter sealing lifecycle (L-6). A separate reflection category would create a hidden dependency without adding evaluable signal beyond what Chapter Progression already captures. |
| RS-D10 | Time gate weight increases from Architect onward | Foundation and Builder are driven by development evidence; time is not a meaningful barrier. The Identity Credibility Principle requires real elapsed time for Architect and above — the identities are not credible at a fast cadence. |
| RS-D11 | Promotion cadence decreases with rank (Fast → Final) | Higher ranks require more accumulated evidence, longer sustained behavior, and deeper identity formation. Cadence reflects the increasing maturity threshold at each level. |
| RS-D12 | Promotions are queued and delivered sequentially | Every promotion must be individually experienced. Bulk promotion would bypass the M-1 ceremony architecture and violate the principle that each rank identity is individually acknowledged and felt. |
| RS-D13 | Four sub-tiers per family; Icon has no sub-tiers | Four sub-tiers provide sufficient granularity to mark within-family progress without making the structure feel arbitrary. Icon has one final, absolute state — sub-tiers would undermine its definiteness. |
| RS-D14 | Sub-tier advancement triggers no ceremony | M-1 fires on family-level changes only. Sub-tier advancement is a progress signal, not an identity shift. Ceremony frequency must remain meaningful; sub-tier ceremonies would dilute the significance of family-level promotions. |
| RS-D15 | Guided Transparency: athletes see direction, not formulas | Exposing scoring formulas invites optimization of inputs rather than authentic development. Athletes are guided toward growth areas without knowing the precise calculation behind their evaluation. |
| RS-D16 | No hidden blockers | Surprise requirements erode trust. If a future advancement requirement exists, it must be visible before it becomes a gate. Athletes must be able to prepare — they must not be ambushed by a requirement they had no way to anticipate. |
| RS-D17 | Honors are NOT direct rank inputs | Honors and rank are separate recognition systems. Honors recognize specific achievements; rank reflects long-term development trajectory. Clean separation preserves the integrity of both systems. This boundary is MVP-scoped and may be revisited via amendment. |
| RS-D18 | Identity Credibility Principle governs all timing decisions | Every decision about time gates, cadence, and spacing traces to the principle that promotions must feel believable. The athlete must be able to honestly say the rank's identity statement when they receive the promotion. |
| R-D46 | Imported history receives partial credit and contextual recognition; prestige ranks (Architect and above) require Forge-native confirmation | Partial credit honors the "Never Charge For History" principle and recognizes genuine pre-Forge development in Training Volume, Consistency, Historical Improvement, Timeline History, P-2 Progress Context, and Athlete Background. Prestige-rank eligibility cannot be satisfied by import alone because the Identity Credibility Principle requires that Architect and above reflect intentional development within Forge Legacy itself — identity forged here, not imported. |
| R-D47 | P-2 must surface both sub-tier progress and major rank progress simultaneously | Athletes need both the short-term journey (sub-tier — actionable, near-term) and the long-term journey (family-level — motivational context) at the same time. Surfacing only one creates tunnel vision or disorientation. Guided Transparency governs implementation: direction visible, formulas never visible. |

---

## Deliverable 2 — Contradiction Audit

### Audit Method

All locked decisions were cross-referenced against: Rank-Up-Modal-Spec-M1.md, P-2-Progress-Hub-Architecture.md, M-5-Chapter-Sealing-Confirmation-Spec.md, HonorInstance-Architecture-v1.0.md, Honor-Evaluation-Service-Architecture-v1.0.md, Chapter Architecture documentation (L-3/L-4, L-6, M-5), and Program Authoring Standard v1.0.

---

### C-1: M-1 Uses Placeholder Rank Names

**Source:** Rank-Up-Modal-Spec-M1.md uses "Apprentice" as an example rank name in the "[Rank] · [Sub-tier]" display format.

**Analysis:** The actual rank system uses Foundation, Builder, Craftsman, Architect, Established, Legacy, Icon. "Apprentice" is a placeholder used during M-1 authoring before the rank system was finalized. No contradiction exists between locked systems — M-1's structural and ceremony design is correct; only the example name in the copy is outdated.

**Action required:** M-1 must be updated to replace the "Apprentice" placeholder with representative actual rank names in all examples. This is a copy update, not a structural change to M-1.

**Status: RESOLVED — downstream copy update required in M-1. Not a blocker for this document.**

---

### C-2: Rank Evaluation Trigger Events Are Under-Defined

**Source:** M-5 Chapter Sealing explicitly triggers rank evaluation (M5-D7, transaction step 7). No other document specifies additional trigger events.

**Analysis:** Training Consistency is the #1 primary category. Athletes who are active but not sealing chapters — for example, an athlete in an active chapter spanning several months — must still accumulate evaluation credit for their consistency. If rank evaluation runs only at chapter sealing, these athletes may have rank go unevaluated for extended periods despite significant development occurring. This is an architectural gap, not a contradiction between two existing locked decisions.

**Action required:** TBD-1 must be resolved in Rank-Computation-Model.md. Candidate trigger events: (a) every session save, (b) chapter seal only, (c) periodic scheduled evaluation, (d) session save + chapter seal + program graduation + goal completion.

**Status: DEFERRED — TBD-1 moved to Rank-Computation-Model.md. Not a blocker for architectural lock.**

---

### C-3: Sub-Tier Advancement Has No Defined Surfacing Mechanism

**Source:** M-1 fires only on family promotions (locked in M-1 architecture). Sub-tier philosophy (Section 13) establishes that sub-tiers exist as progress markers. No current document describes how athletes discover a sub-tier advancement occurred.

**Analysis:** P-2 Progress Hub Rank Journey Preview and What's Next sections are the most likely surfaces, consistent with Guided Transparency. The gap exists at the decision level — not as a conflict between two locked decisions.

**Action required:** TBD-2 must be resolved in Rank-Computation-Model.md and the answer incorporated into P-2-Progress-Hub-Architecture.md via amendment.

**Status: DEFERRED — TBD-2 moved to Rank-Computation-Model.md. Not a blocker for architectural lock.**

---

### C-4: Icon Display Format in M-1 Integration

**Source:** M-1 displays "[Rank] · [Sub-tier]" for all rank promotions (locked format). Icon has no sub-tiers (locked).

**Analysis:** When an athlete reaches Icon, M-1 must fire for the final family promotion. The standard display format cannot apply as written because no sub-tier value exists for Icon. M-1 already has a Final Rank Variant specification with special artwork and copy ("Your legacy has been forged.") — but the rank display string format within that variant is undefined.

**Action required:** TBD-11 — Icon display format must be specified. Options: "Icon" alone with no separator, a unique format exclusive to the final variant, or the M-1 Final Rank Variant overrides the standard string. Should be resolved when M-1 is next amended.

**Status: GAP — minor. Requires TBD-11. Low priority; Icon is far-future.**

---

### C-5: "Program Completion" vs. "Program Graduation" Terminology

**Source:** The locked rank decisions reference both "program completion" and "program graduation" as signals. M-4 (Program Graduated modal) fires at program graduation. Program Authoring Standard defines completion as occurring when the final session is saved.

**Analysis:** Program graduation (M-4 event) and program completion (PAS definition: final session saved) are the same event described with different terminology. No decision contradicts another — this is a terminology consistency gap.

**Action required:** This specification standardizes on "Program Graduation" to match M-4 and PAS usage. Future documents should use "Program Graduation" when referencing the event of completing a structured program.

**Status: RESOLVED — terminology standardized in this document.**

---

### C-6: "Weighted Order" vs. Numeric Weights

**Source:** Primary categories are specified with a "Weighted order" (#1–#4). No numeric weights are defined anywhere.

**Analysis:** "Weighted order" could be misread as implying a defined numeric ratio (e.g., 40/30/20/10). It does not. Weighted order expresses relative importance priority only. Specific weights are TBD-4.

**Action required:** Disambiguated in Section 6.1 of this specification. No decision conflict exists.

**Status: RESOLVED — terminology disambiguated.**

---

### Contradiction Audit Summary

| Item | Type | Status |
|---|---|---|
| C-1: M-1 placeholder rank names | Downstream copy update needed | Resolved — M-1 copy update required |
| C-2: Rank evaluation trigger events | Architectural gap | Gap — requires TBD-1 |
| C-3: Sub-tier advancement surfacing | Architectural gap | Gap — requires TBD-2 |
| C-4: Icon display format | Minor format gap | Gap — requires TBD-11 (low priority) |
| C-5: Program completion terminology | Terminology inconsistency | Resolved — standardized here |
| C-6: Weighted order terminology | Terminology ambiguity | Resolved — disambiguated here |

**No genuine contradictions found between locked decisions.** Two gaps (C-2, C-3) deferred to Rank-Computation-Model.md. One minor gap (C-4) deferred to a future M-1 amendment. Two terminology items (C-5, C-6) resolved within this document. No contradictions remain that block architectural lock.

---

## Deliverable 3 — Future Compatibility Audit

### FC-1: Additional Athlete Types — COMPATIBLE

**Assessment:** Personal Improvement (Section 6.3) is explicitly designed for extensibility. Current athlete types (Strength, Running, Boxing, Hybrid) are a non-exhaustive list. The architecture accommodates new types by requiring that improvement metrics be defined when each new type is added. The category structure does not change.

**Verdict: Compatible by design. No architectural changes required when new athlete types are introduced.**

---

### FC-2: Squad and Community Rank Signals — COMPATIBLE WITH NOTE

**Assessment:** Community activity (Workout With Friend sessions, squad participation) is not currently a rank input. If future product iterations introduce community-based rank signals, they would most naturally enter as a new secondary category or as supporting signals within existing categories. The current architecture does not preclude this — secondary categories are not hard-coded to exactly three.

**Verdict: Compatible. Community signals can be added as a secondary category via amendment without structural disruption. Note: Community squad signals, if added, would surface through P-2 What's Next guidance under the Guided Transparency principle.**

---

### FC-3: Import History Treatment — RESOLVED

**Assessment:** Architecture Amendment 001 (Import) allows athletes to import pre-Forge training history. The tension between the Identity Credibility Principle (prestige ranks must feel earned within Forge Legacy) and the "Never Charge For History" principle (Monetization Amendment 001) required an explicit architectural decision.

**Resolution (R-D46):** Imported history receives partial credit and contextual recognition. It may contribute to Training Volume, Training Consistency, Historical Improvement, Timeline History, P-2 Progress Context, and Athlete Background. It may not independently grant Architect, Established, Legacy, or Icon. Prestige ranks require Forge-native confirmation — imported history alone cannot satisfy prestige-rank eligibility regardless of volume or duration.

This model resolves the tension: athletes with genuine pre-Forge development history receive recognition in the categories that reflect accumulated work and context, while the Identity Credibility Principle is preserved for the ranks where self-identification with the Forge Legacy journey is what gives the rank meaning.

**Verdict: RESOLVED — via R-D46 (locked). See Section 8.3 for full treatment. TBD-9 removed.**

---

### FC-4: Honors as Future Rank Signals — COMPATIBLE WITH BOUNDARY NOTE

**Assessment:** "Honors are NOT direct rank inputs" (RS-D17) is explicitly locked for MVP. This separation is intentional and protects the integrity of both systems.

Future iterations may wish to use accumulated honor patterns as rank evidence (e.g., the 25 Goals Achieved honor contributing to Established identity test evidence). The Evaluation Service architecture is extensible — adding honor pattern signals would require a formal amendment, not a structural rebuild.

**Verdict: Compatible with existing boundary. RS-D17 is MVP-scoped. It is not a permanent architectural prohibition — a future amendment could introduce honor signals into rank evaluation if the product requires it. The boundary must be explicitly preserved until such an amendment is made.**

---

### FC-5: P-3 Rank Detail Screen — DEPENDENCY IDENTIFIED

**Assessment:** M-1 links to P-3 (View Your Rank) as a secondary CTA visible on the final rank promotion and the final ceremony in a sequence. P-3 does not yet have a wireframe specification. When authored, P-3 will need to display: current rank family and sub-tier, rank identity statement, promotion history, sub-tier progress, and development trajectory toward the next family.

The rank data model (TBD-12) must expose all fields that P-3 requires before P-3 can be authored.

**Verdict: Dependency identified. P-3 cannot be authored until TBD-12 is resolved. P-3 should be scheduled after the rank data model is locked.**

---

### FC-6: Secondary Category Expansion — COMPATIBLE

**Assessment:** Three secondary categories today. The architecture does not treat "exactly three" as a structural invariant. Future secondary categories (community signals, body composition tracking, coaching engagement) can be added via amendment without requiring threshold restructuring for existing categories.

**Verdict: Compatible. No structural constraint prevents secondary category expansion.**

---

### FC-7: AI and Coaching Layer — COMPATIBLE

**Assessment:** Future AI or human coaching systems may need athlete rank as context for recommendations, program selection, or development planning. Rank family and sub-tier as readable fields on the athlete data model are inherently compatible with any coaching layer. The rank system exposes rank as an athlete attribute — AI systems can consume it without changes to the rank computation model.

**Verdict: Compatible. No changes required. Rank data model (TBD-12) should expose rank family and sub-tier as first-class readable fields.**

---

### Future Compatibility Audit Summary

| Item | Verdict |
|---|---|
| FC-1: Additional athlete types | Compatible by design |
| FC-2: Squad/community signals | Compatible — additive via amendment |
| FC-3: Import history treatment | Resolved — R-D46 locked |
| FC-4: Honors as future signals | Compatible with MVP boundary note |
| FC-5: P-3 dependency | Dependency identified — requires TBD-12 first |
| FC-6: Secondary category expansion | Compatible |
| FC-7: AI/coaching layer | Compatible |

**No risks remain.** All seven items compatible with existing or planned architecture, or resolved via locked decision.

---

## Deliverable 4 — Deferred Decisions (Rank-Computation-Model.md)

The following decisions are deferred to Rank-Computation-Model.md. They are computational and definitional in nature — not architectural. This document is locked without them. Each item retains its original priority classification for scheduling purposes within the Computation Model workstream.

| TBD ID | Decision Required | Priority | Notes |
|--------|------------------|----------|-------|
| TBD-1 | Rank evaluation trigger events — when does rank evaluation run? (session save, chapter seal, program graduation, goal completion, periodic schedule, or combination) | HIGH | M-5 is the only confirmed trigger. Training Consistency (#1 category) requires more frequent evaluation. See C-2. |
| TBD-2 | Sub-tier advancement surfacing — how does an athlete discover a sub-tier promotion? (P-2 What's Next, Rank Journey Preview, silent update, notification) | MEDIUM | No ceremony (RS-D14). Discovery mechanism is undefined. See C-3. |
| TBD-3 | Sub-tier thresholds — what triggers Foundation I→II, II→III, III→IV (and equivalents across all six sub-tier families)? | HIGH | Sub-tiers are locked structural elements with no defined advancement thresholds anywhere. |
| TBD-4 | Family promotion thresholds — specific numeric or metric thresholds for each primary category per family transition (Foundation→Builder through Legacy→Icon), including time gate minimum values | HIGH | The most critical numeric gap. No threshold value exists for any family-level promotion. |
| TBD-5 | Promotion spacing values — minimum time between successive rank promotions within the promotion queue | MEDIUM | Philosophy is locked (spacing increases with rank); specific values are not. |
| TBD-6 | "Active week" / "Active month" definitions — what constitutes an active week or active month for Training Consistency evaluation? | HIGH | #1 primary category cannot be evaluated without a definition of its core signals. |
| TBD-7 | "Meaningful work" definition — what counts as meaningful work for Training Volume? (minimum session duration, minimum effort threshold, activity type inclusions/exclusions) | HIGH | Training Volume (#4 primary category) cannot be computed without this definition. |
| TBD-8 | Personal Improvement metrics by athlete type — how is improvement measured for Strength, Running, Boxing, and Hybrid athlete types respectively? | HIGH | #2 primary category cannot be evaluated without per-type improvement metrics. |
| TBD-10 | "Recent engagement" definition — what time window and activity level qualifies as "recent" for the recent engagement promotion requirement? | MEDIUM | Applies where applicable (Section 5.2). Cannot be evaluated without a definition. |
| TBD-11 | Icon display format — how is Icon displayed in M-1's "[Rank] · [Sub-tier]" format given Icon has no sub-tiers? | LOW | Only surfaces when M-1 fires the final family promotion. See C-4. |
| TBD-12 | Rank data model — schema for athlete rank state (current family, current sub-tier, promotion history, evaluation state, fields available to P-3 and other consumers) | HIGH | P-3 cannot be authored without this. Rank Evaluation Service cannot be designed without this. |
| TBD-13 | Chapter Progression category definition — sealed chapters only, or all chapters (started and unsealed)? | MEDIUM | Signature milestones explicitly require "sealed" chapters; the secondary category definition is currently imprecise. |
| TBD-14 | Longevity secondary category definition — account age, continuous active months, a combination? How does this differ from Training Consistency's "active months" signal to avoid double-counting? | MEDIUM | Both reference time-based signals; the boundary between them must be explicitly defined. |
| TBD-15 | Goal Participation definition — setting goals, completing goals, goal completion rate, or a combination? | MEDIUM | Goal Participation is a named secondary category with no definition of what participation means in practice. |
| TBD-16 | Rank Evaluation Service architecture — separate service or integrated with Honor Evaluation Service? Inputs, outputs, evaluation pipeline, and failure behavior | HIGH | The computational infrastructure for rank evaluation does not yet exist as a designed system. |

**Total deferred: 15 items. 8 HIGH priority. 6 MEDIUM priority. 1 LOW priority.**

*TBD-9 (Import History Treatment) resolved by R-D46 (Amendment 001, June 2026) — removed from deferred list.*

---

## Refinement Report

### What Is Locked and Ready

The following are locked, fully specified, and ready to inform downstream work:

- All 7 rank families and their identity statements
- Sub-tier count (4 per family; Icon exception)
- All four rank philosophy principles (Earned, Permanent, Identity-based, Multi-dimensional)
- Identity Credibility Principle and its governing scope
- Rank-never-decreases rule (no exceptions)
- Hybrid promotion model structure (5 requirement types)
- All 4 primary categories and weighted order
- All 3 secondary categories and their supporting roles
- Reflection as non-standalone category (inherited through Chapter Progression)
- Goals and Programs as development signals — role definitions
- Time gate framework (classification-based; values pending TBD-4)
- Timeline targets (ranges locked)
- Promotion cadence descriptions (Fast → Final)
- Promotion queue rules (sequential, no skipping, no bulk behavior)
- Sub-tier philosophy (progress markers, no ceremony, RS-D14)
- Signature milestones (qualitative descriptions locked per rank)
- Major rank identity tests (qualitative evidence descriptions locked)
- Guided Transparency principle (direction visible, formulas hidden)
- No Hidden Blockers principle (proactive surfacing required)
- Rank Progress Visibility requirement (R-D47 — both dimensions required simultaneously)
- Integration map (all integration points identified and typed)
- Honors separation boundary (RS-D17, MVP-scoped)
- Architecture Decision Record (RS-D1–RS-D18 + R-D46 + R-D47)
- Import history treatment (R-D46 — partial credit, prestige ranks require Forge-native confirmation)

### Deferred to Rank-Computation-Model.md

The following items were pending at draft completion. They are computational and definitional — not architectural. This document locks without them. All 15 deferred items transfer to Rank-Computation-Model.md as that document's opening backlog.

| TBD | Deferred Decision |
|-----|------------------|
| TBD-1 | Rank evaluation trigger events |
| TBD-2 | Sub-tier advancement surfacing mechanism |
| TBD-3 | Sub-tier thresholds |
| TBD-4 | Family promotion thresholds |
| TBD-5 | Promotion spacing values |
| TBD-6 | Active week / active month definitions |
| TBD-7 | Meaningful work definition |
| TBD-8 | Personal Improvement metrics per athlete type |
| TBD-10 | Recent engagement definition |
| TBD-11 | Icon display format |
| TBD-12 | Rank data model |
| TBD-13 | Chapter Progression category definition |
| TBD-14 | Longevity secondary category definition |
| TBD-15 | Goal Participation definition |
| TBD-16 | Rank Evaluation Service architecture |

**Relationship between documents:** This document is the architectural authority. Rank-Computation-Model.md is the computational authority. When decisions in the Computation Model are locked, they fill the TBD placeholders in this document by reference — they do not amend this document unless an architectural principle is affected.

---

## Closure Record

**Locked:** June 2026
**Lock basis:** Architectural layer complete. All remaining open items are computational or definitional — deferred to Rank-Computation-Model.md per Option A recommendation in Refinement Report.

**What is locked:**
All rank philosophy, ladder structure, promotion model, category definitions and weighted order, secondary categories, import history treatment, signature milestones, identity tests, time gate framework, timeline targets, promotion cadence, promotion queue rules, sub-tier philosophy, rank progress visibility, guided transparency, no-hidden-blockers principle, and all integration contracts.

**What is not locked (deferred):**
Numeric thresholds, signal definitions, per-type improvement metrics, rank data model, evaluation trigger events, evaluation service architecture, sub-tier advancement mechanism, promotion spacing values, and secondary category operational definitions. All 15 deferred items carry to Rank-Computation-Model.md.

**Contradictions at lock:** None genuine. Three gaps identified (C-2, C-3, C-4) — all deferred. Two terminology items resolved within this document (C-5, C-6).

**Future compatibility at lock:** No risks. FC-3 (Import History) resolved via R-D46. FC-5 (P-3 dependency) acknowledged as downstream of TBD-12 in Rank-Computation-Model.md.

**Downstream work unblocked by this lock:**
- M-1 Rank Up Modal copy update (replace "Apprentice" placeholder — C-1)
- P-2 Progress Hub R-D47 implementation (both rank progress dimensions)
- Chapter sealing integration with rank evaluation (M-5 confirmed trigger)
- Honors boundary enforcement (RS-D17)
- Identity test authoring and qualitative coaching content
- Program Authoring Standard alignment (Program Graduation as rank signal)

---

## Amendment Log

| Amendment | Date | Description |
|-----------|------|-------------|
| Amendment 001 | June 2026 | R-D46 (Import History Treatment) locked. Imported history receives partial credit and contextual recognition; prestige ranks (Architect and above) require Forge-native confirmation. FC-3 resolved. TBD-9 removed. Section 8.3 added. |
