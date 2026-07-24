# Honors Taxonomy Reconciliation

## v1.0 | June 2026

**Status:** RECONCILIATION COMPLETE — Planning document only. No honors authored. No amendments drafted. No locked architecture redesigned.

**Type:** Reconciliation & Planning Document

**Predecessor:** `Docs/Honors-Expansion-Plan-v1.0.md`, `Docs/Honors-Expansion-Plan-Pre-Authoring-Audit.md` (13 findings, F1–F13)

**Audited Against:** `Honor-Catalog-v1.0-LOCKED.md`, `HonorInstance-Architecture-v1.0.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `Honors-Spec-L10.md` v1.0.1, `Honor-Detail-Sheet-Spec-L11.md` v1.1, `Honor-Earned-Modal-Spec-M2.md` v1.2, `FORGE_LEGACY_PRODUCT_DNA.md` (read in full this pass), `Exercise-Library-Architecture-v1.0.md`, `Goal-Create-Edit-Wireframe-Spec-G3.md`, `Chapter-Reflection-Wireframe-Spec-L6.md`

**Purpose:** Resolve the taxonomy/terminology question raised by the prior audit (F1, F11) before any catalog authoring begins, and convert the prior audit's findings into a concrete, ready-to-author family structure and allocation model — without amending anything or writing any honors.

---

## Section 1 — Current Taxonomy Audit

The Honors ecosystem already contains **three** distinct organizational layers, plus one derived attribute and one non-taxonomic UI view that are sometimes mistaken for a fourth and fifth layer. Each is documented below with purpose, authority, current usage, and relationship to the others.

### 1.1 Layer Inventory

| Layer | Count (as documented) | Purpose | Authority | Athlete-Facing? |
|-------|----------------------|---------|-----------|-----------------|
| **Category** | 7 | The athlete-facing grouping shown in L-10 sections and L-11 badges | `Honor-Catalog-v1.0-LOCKED.md` (Category Summary table) + `Honors-Spec-L10.md` §5.1 + `Honor-Detail-Sheet-Spec-L11.md` §6.1–6.2 | Yes |
| **Catalog Family** | Claimed 11; enumerable 14 (see 1.2 — inconsistency found) | Sub-grouping within a category; drives sort order within an expanded L-10 category | `Honor-Catalog-v1.0-LOCKED.md` only, operationalized by `Honors-Spec-L10.md` §7.2 | No (invisible to athlete, but load-bearing for display order) |
| **Evaluator Family** | 8 (`Training`, `Strength`, `Club`, `Goal`, `Program`, `Community`, `Chapter`, `Longevity`) | Backend service component that evaluates one coherent domain on a given trigger | `Honor-Evaluation-Service-Architecture-v1.0.md` §4, ES-5 | No |
| Badge (derived attribute, not an independent layer) | 7 — exactly 1:1 with Category | Visual treatment in L-11 | `Honor-Detail-Sheet-Spec-L11.md` §6.1: "One badge variant per display category" | Yes (visual only) |
| Recent Honors (UI view, not a taxonomy layer) | N/A | Date-sorted (`dateEarned` DESC, limit 5) view cutting across all categories | `Honors-Spec-L10.md` §4 | Yes |

### 1.2 Finding T1 — The Catalog Family count is internally inconsistent in a LOCKED document

`Honor-Catalog-v1.0-LOCKED.md`'s header ("53 honor types. 7 categories. 11 families.") and Closure Record both assert **11 families**. But the same document's own Category Summary table enumerates named families per category:

| Category | Named families listed in the table | Count |
|----------|------------------------------------|-------|
| Strength | Bench, Squat, Deadlift, Clubs lbs, Clubs kg | 5 |
| Chapters | Count, Depth | 2 |
| Training | Origin, Workout Count, Hours Forged | 3 |
| Goals | Goals | 1 |
| Programs | Programs | 1 |
| Community | Community | 1 |
| Longevity | Longevity | 1 |
| **Sum** | | **14** |

14 ≠ 11. There is no interpretation under which the table's own per-category breakdown sums to its own stated total — even discounting the four categories where the "family" name simply repeats the category name (Goals, Programs, Community, Longevity), the remaining three categories alone already total 10 (5+2+3), one short of 11, and including all seven totals 14, three over. This is a genuine arithmetic inconsistency in a document whose own closure record claims "No contradictions found" — the same documentation-lag pattern this project has found before in other LOCKED documents (cf. Rank-Computation-Model Lock Audit). It does not affect correctness of any individual honor's behavior (every honor still belongs to exactly one category and one named family), but it means **"11 families" is not a reliable number to design against.**

**Recommendation:** Treat 14 as the authoritative current family count (it is the only number that actually reconciles with the document's own per-category breakdown). This does not require an amendment to fix — rule 12 of this pass forbids drafting one — but it should be corrected the next time `Honor-Catalog-v1.0-LOCKED.md` is touched for any reason.

### 1.3 Finding T2 — Multiple layers are necessary; this is not drift

The Club example is the existing, locked, working proof that this project has *already* deliberately decided three layers are necessary, not redundant:

- **Evaluator Family:** Club is its own evaluator (`ClubEvaluator`), separate from `StrengthEvaluator` — different data inputs (sum of 3 PRs vs. a single PR), different uniqueness handling, distinct family in ES-5's list of 8.
- **Catalog Family:** Club is its own catalog family ("Clubs lbs Family," "Clubs kg Family") — distinct from "Bench Press Family," etc.
- **Category / Badge:** Club is *not* its own category. It is explicitly merged into the Strength display category and Strength badge, per `Honors-Spec-L10.md` §5.1's own "Design note": *"The catalog family separation is an architecture detail; the display category is Strength."*

This is the correct, intentional model: **backend execution structure (evaluator) and internal organization (catalog family) are allowed to be more granular than what the athlete ever sees (category/badge).** The three layers solve three different problems (who runs the check; how the doc/sort-order organizes itself; what the athlete sees) and collapsing them into one would either force backend implementation detail onto the athlete-facing UI, or force the UI's simplicity constraint onto the backend's evaluation logic. **Keep three layers.**

### 1.4 Finding T3 — The expansion plan's "Family" does not map onto any single existing layer

The Expansion Plan uses "Family" to mean something closer to a *category* in scale (12, comparable to today's 7) but uses *evaluator-style* domain language in its descriptions ("Endurance & Conditioning," "Squads & Community" — domains, not sort-order groupings). This is exactly the terminology collision flagged as F1/F11 in the prior audit, now confirmed: the plan is implicitly proposing a layer that doesn't exist today, sized between Category (7) and Catalog Family (14). Section 5 resolves this by mapping every surviving plan-family onto the *existing* Category layer rather than inventing a fourth.

---

## Section 2 — Existing Honor Mapping

All 53 locked honors map cleanly and without exception into the three layers above. Per the Honor Catalog's own Closure Record, every honor belongs to exactly one category, one catalog family, and (correspondingly) one evaluator. No duplicates, overlaps, or conflicts exist among the existing 53 — this audit re-confirms that finding rather than overturning it.

### 2.1 Full Mapping Table (grouped by Catalog Family — the finest existing layer)

| Category | Catalog Family | Honor Types | Evaluator Family | Display Category | Badge |
|----------|----------------|--------------|-------------------|-------------------|-------|
| Strength | Bench Press (4) | `bench_milestone_1/2/3/4` | StrengthEvaluator | Strength | Strength |
| Strength | Squat (4) | `squat_milestone_1/2/3/4` | StrengthEvaluator | Strength | Strength |
| Strength | Deadlift (4) | `deadlift_milestone_1/2/3/4` | StrengthEvaluator | Strength | Strength |
| Strength | Clubs lbs (3) | `club_1000/1200/1500` | **ClubEvaluator** (separate from StrengthEvaluator) | Strength | Strength |
| Strength | Clubs kg (3) | `club_400kg/500kg/600kg` | **ClubEvaluator** | Strength | Strength |
| Chapters | Count (4) | `first_chapter_sealed`, `chapters_sealed_5/10/25` | ChapterEvaluator → ChapterCount sub-evaluator | Chapters | Chapters |
| Chapters | Depth (4, repeatable) | `workouts_in_chapter_10/25/50/100` | ChapterEvaluator → ChapterDepth sub-evaluator | Chapters | Chapters |
| Training | Origin (1) | `first_workout_logged` | TrainingEvaluator | Training | Training |
| Training | Workout Count (5) | `workouts_logged_50/100/250/500/1000` | TrainingEvaluator | Training | Training |
| Training | Hours Forged (6) | `hours_forged_100/250/500/1000/2500/5000` | TrainingEvaluator | Training | Training |
| Goals | Goals (4) | `first_goal_achieved`, `goals_achieved_10/25/50` | GoalEvaluator | Goals | Goals |
| Programs | Programs (4) | `first_program_graduated`, `programs_graduated_5/10/25` | ProgramEvaluator | Programs | Programs |
| Community | Community (3) | `first_workout_with_friend`, `workout_with_friend_10/50` | CommunityEvaluator | Community | Community |
| Longevity | Longevity (4) | `longevity_1_year/3_years/5_years/10_years` | LongevityEvaluator (also runs on every other trigger, ES-10) | Longevity | Longevity |

**Total: 14 catalog families (confirming Finding T1), 53 honor types, 8 evaluator families (Club counted separately from Strength), 7 categories/display categories/badges.**

### 2.2 Duplicate / Overlap / Sparse / Overloaded Findings (existing 53 only)

| Finding | Detail |
|---------|--------|
| Duplicate concepts | **None.** Re-confirms the Catalog's own Closure Record. |
| Overlapping categories | **None.** Every honor belongs to exactly one category. |
| Overloaded category | **Strength (18 types)** is the largest category — more than 4× the size of the smallest. Training (12) is second-largest. |
| Sparse category | **Community (3 types)** is the smallest category in the entire locked catalog by a wide margin — the next-smallest is Longevity/Goals/Programs at 4 each. This is the existing category with the least room to absorb new content before it stops looking like a deliberate design and starts looking thin relative to its peers — directly relevant to the Expansion Plan's "Squads & Community" ambition (Section 3). |
| Intentional split (not an overlap) | **Club** shares a category with Strength but has its own evaluator and catalog family — see Finding T2. Correct, locked, not a defect. |

---

## Section 3 — Expansion Framework Reconciliation

Verdict for each of the 12 proposed families. "Survive" means the underlying concept is sound and should eventually be authored; it does not mean "ready today" — readiness is Section 7's question.

| # | Proposed Family | Verdict | Rationale |
|---|-----------------|---------|-----------|
| 1 | Consistency | **Reserve** | No existing statistics track streaks/frequency (ES §9.1's six counters don't include one). Directly adjacent to Product DNA's "not a streak app" identity and the explicitly-prohibited "streak pressure systems" (§10) — permitted only "with formal architecture review," which has not happened. See Section 4. |
| 2 | Workout Count | **Merge** into existing Training category | This is not a new family — it is the existing Workout Count catalog-family (and, once resolved, Hours Forged) under the existing Training category/evaluator. No new category needed. |
| 3 | Programs | **Survive** (mostly) | Extends `ProgramEvaluator`'s existing `programsGraduated` counter pattern. "Program family mastery" is new but well-grounded (uses the already-locked Program Ecosystem `successorProgramId` lineage). "Program streaks" sub-item is held to the same gate as Family 1 — see Section 4. |
| 4 | Goals | **Survive**, one open item | Extends `GoalEvaluator`'s `goalsAchieved` counter pattern. "Long-term goal completion" needs a goal-duration computation; the underlying creation/achievement dates plausibly already exist as implicit system fields (confirmed: `Goal-Create-Edit-Wireframe-Spec-G3.md` line 399 references "achievement dates" already being stored per progress entry), but their accessibility to `GoalEvaluator` is unconfirmed. Verify before authoring this specific sub-item only — the rest of Goals is unaffected. |
| 5 | Strength | **Survive**, scoped extension needed | Overhead Press and Pull-Up exist as canonical exercises today (`Exercise-Library-Architecture-v1.0.md` §3.3, under `PUSH`/`PULL`). PR-record storage is currently hard-scoped to 3 lifts (`Honor-Evaluation-Service-Architecture-v1.0.md` §9.2) and needs 2 new slots — a scoped addition, not a redesign. Whether Club totals expand from 3 lifts to 5 is an explicit open decision, not to be inferred. |
| 6 | Endurance & Conditioning | **Eliminate from this catalog cycle / Reserve indefinitely** | No exercise category, no distance/pace/time logging field exists anywhere in the documented data model (`Exercise-Library-Architecture-v1.0.md`'s 6 categories are all strength-pattern; honors qualification is explicitly "actual weight only," AD-30). This is a missing product capability, not a missing evaluator. Cannot be scoped further until cardio logging is an independent roadmap decision. |
| 7 | Legacy & Chapters | **Survive, with one sub-item eliminated** | Chapter creation/completion/sealing/duration extend the existing `ChapterEvaluator` cleanly. **"Reflection writing" should be eliminated**, not merely clarified — see Finding T4 below; this is now a confirmed contradiction with locked architecture, not an open question. |
| 8 | Longevity | **Survive unchanged** | `LongevityEvaluator` already runs on every triggering event (ES-10); pure threshold additions. Zero new architecture. Reference family for how the rest of this expansion should look. |
| 9 | Squads & Community | **Reserve** | No statistics exist for squad participation/encouragement/support anywhere in the Athlete Statistics Record. Also must be designed against the Architecture Guardrail "Squads Are Private... Not communities... Not social networks" (`FORGE_LEGACY_PRODUCT_DNA.md` §9) — any squad honor must reward private participation, never anything publicly comparative. Nearer-term than Endurance (S-2 already generates check-in/reaction data; it just isn't aggregated into counters yet), but still future-architecture-dependent. |
| 10 | Milestones & Firsts | **Eliminate entirely** | Confirmed in the prior audit (F2–F4): three of five items duplicate existing honors (`first_workout_logged`, `first_program_graduated`, `first_chapter_sealed`); "First Rank-Up" contradicts the Evaluation Service's explicit Rank-Up non-trigger rule; "First Honor" is self-referential with no defined evaluation order. No part of this family should be authored as catalog content. If a "first honor" emotional beat is still wanted, it belongs as a one-time UI treatment referencing an existing honor record, not a second `HonorInstance`. |
| 11 | Comebacks & Resilience | **Reserve** | No absence/gap-detection statistics exist. Directly implicated by Product DNA's "Accountability Without Shame" principle (*"never feel punished for... Taking time off... Starting over"*) — the mechanism itself (tracking gaps to detect a "comeback") sits adjacent to the prohibited "days since workout" mechanic even if the UI only ever shows positive outcomes. Requires the Product DNA Decision Test explicitly, before any design work. |
| 12 | Prestige | **Reserve** | Multi-condition (AND) qualification has only one existing precedent (`ClubEvaluator`'s PR-sum, which is still a single comparable value, not independent multi-counter logic). Criteria are intentionally vague in the plan, which means the Catalog's own required "no duplicate / no threshold conflict" consistency pass (performed at the 53-type lock) cannot yet be run against it. |

### 3.1 Finding T4 — "Reflection writing" contradicts L-6's own locked Decision 10

`Chapter-Reflection-Wireframe-Spec-L6.md` Decision 10 (LOCKED): *"Reflections Never Generate Timeline Events... Reflections are commentary on legacy events. They are not legacy events themselves."* An Honor, by definition, generates a Timeline Event (`HonorInstance-Architecture-v1.0.md` AD-53; every `HonorInstance` creates exactly one Timeline Event per the Evaluation Service pipeline step [6]). Awarding an honor for writing a reflection would necessarily create a Timeline Event for an act that L-6 has already, explicitly, and deliberately decided should never generate one. This is not a gray area requiring clarification — it is a direct contradiction with a locked decision, discovered by reading L-6 in full for this pass (it was not surfaced in the prior audit). Reflection is also explicitly optional (L-6 Decision 3) and explicitly protected from being treated as a quantified target — the entire screen's design philosophy (Section 5 framing, "the athlete who writes a reflection should feel that the product received it with respect") is about *not* turning reflection into a counted, gamified act, which a "reflection writing" honor ladder would do by definition, in tension with "Story Before Data."

**Verdict: eliminate the "reflection writing" sub-item from Family 7 outright.** The rest of Family 7 (creation, completion, sealing, duration) is unaffected and survives.

---

## Section 4 — Product DNA Validation

Before running this section, a terminology check on the validation criteria requested:

| Requested criterion | Found verbatim in `FORGE_LEGACY_PRODUCT_DNA.md`? | Closest actual locked principle |
|---------------------|---------------------------------------------------|----------------------------------|
| Accountability Without Shame | **Yes** — Core Principle, §2 | (verbatim) |
| Story Before Data | **Yes** — Core Principle, §2 | (verbatim) |
| Reflection Before Recognition | **No.** This phrase does not appear anywhere in `FORGE_LEGACY_PRODUCT_DNA.md`. | No single existing principle matches it directly. The closest adjacent ideas live outside Product DNA entirely, in `Honor-Detail-Sheet-Spec-L11.md`'s own framing ("a historical record with celebration," not "another ceremony") and in `Chapter-Reflection-Wireframe-Spec-L6.md` Decision 10 (Finding T4). Per Rule 3 of this pass, this audit does not treat it as a Product DNA principle — it is evaluated below only where Finding T4 already independently applies. |
| Legacy Mindset | **No**, not verbatim. | "Legacy First" (Core Principle, §2) is the closest match and is used below in its place. |
| Long-Term Journey Design | **No**, not verbatim. | The Mission statement (§1: *"build a meaningful fitness legacy over years and decades, not chase short-term performance metrics"*) and "Transformation Over Activity" (§2) are the closest matches and are used below in their place. |

**This is itself a finding worth naming:** two of the five requested validation criteria are not real, locked Product DNA principles. Continuing to reference "Reflection Before Recognition" or "Legacy Mindset" as if they were established Product DNA language in future planning documents would itself become exactly the kind of undocumented-assumption problem this project's working rules exist to prevent. The validation below uses only what is actually written in the locked document.

### 4.1 Validation Matrix — Surviving Families Only

| Family | Accountability Without Shame | Story Before Data | Legacy First (≈"Legacy Mindset") | Mission / Transformation Over Activity (≈"Long-Term Journey Design") | Verdict |
|--------|------------------------------|--------------------|-----------------------------------|--------------------------------------------------------------------|---------|
| Strength | Pass — milestone-only, no penalty for plateaus | Pass | Pass | Pass | Clear |
| Training (Workout Count / Hours Forged) | Pass | Pass | Pass | Pass | Clear |
| Programs | Pass | Pass | Pass | Pass | Clear |
| Goals | Pass | Pass | Pass | Pass | Clear |
| Chapters (minus reflection writing, per T4) | Pass | Pass | Pass | Pass | Clear |
| Longevity | Pass | Pass | Pass | Pass | Clear |
| Community (Squads & Community) | Caution — must reward private participation only, never comparison; ties to Architecture Guardrail "Squads Are Private" | Pass, if scoped to meaningful contribution rather than raw activity counts | Pass | Caution — "engagement" framing risks reading as "activity for activity's sake," which §2's "Transformation Over Activity" explicitly rejects | **Risk — needs explicit design care, not blocked** |
| Consistency (live-streak mechanism only) | **Risk** — a streak-shaped mechanic inherently implies something was "broken" when training stops, in tension with "never feel punished for... taking time off" | **Risk** — counting consecutive units is data-first by construction; the story-first version would be retrospective ("you trained through X"), not a live ticking counter | Pass | **Risk** — close to "activity for activity's sake" unless the threshold is meaningful, not just frequent | **Risk — requires the formal review Product DNA §10 itself calls for** |
| Comebacks & Resilience | **Risk** — same root issue as Consistency; requires detecting an absence to recognize a return | Pass, if framed purely retrospectively and positively | Pass — "starting over" is explicitly named as something the app should never shame, which cuts both ways: a *positive* comeback honor could be the right way to honor this principle, not a violation of it | Pass | **Risk, but possibly the *right kind* of risk** — see note below |
| Prestige | Pass, in principle | Caution — depends entirely on undefined criteria; cannot be fully validated yet | Pass | Pass | **Incomplete — criteria-dependent** |

**Note on Comebacks & Resilience:** this family is the one case in the matrix where the Product DNA risk cuts both directions. A well-designed, retrospective, positive-only "you came back and rebuilt" honor could be a *direct expression* of "Accountability Without Shame" rather than a violation of it — the principle explicitly protects athletes who take time off, and a calm, non-judgmental honor for resuming is arguably more aligned with that principle than silence would be. The risk is entirely in the *mechanism* (does the system need to track absence/gaps to compute this, and could that mechanism leak into any UI as a negative signal), not in the *intent*. This distinction should be preserved rather than collapsed into a blanket "reserve" — it is why Section 3 reserves it pending review rather than eliminating it outright.

### 4.2 Families That Risk Violating Product Identity

Per the request to "identify any family that risks violating product identity": **Consistency** and **Comebacks & Resilience** are the two families carrying genuine Product DNA risk, both rooted in the same underlying mechanism (tracking continuity/gaps over time). Neither is disqualified outright — Product DNA §10 explicitly permits prohibited-pattern-adjacent features "with formal architecture review" — but neither should be authored without that review happening first and being recorded as its own decision, separate from this taxonomy reconciliation.

---

## Section 5 — Final Family Structure

**Constraint discipline:** Per this pass's rules (no amendments, no architecture redesign), the final structure must fit entirely within the **already-locked 7 categories**. It does. Every survivable family from Section 3 nests under an existing category — exactly the precedent Club already set for Strength. No 8th category is introduced by this structure.

| Existing Category (unchanged) | Absorbs | Notes |
|-------------------------------|---------|-------|
| **Strength** | Strength family expansion (Overhead Press, Pull-Up ladders; Club scope decision pending) | Same evaluator pattern, extended with 2 new PR slots |
| **Training** | Workout Count expansion + Hours Forged expansion (resolves F9) + the *retrospective-only* slice of Consistency, if/when Product DNA review clears it | Same evaluator (`TrainingEvaluator`), same statistics pattern; live-streak content stays out until reviewed |
| **Programs** | Programs volume expansion + program-family-mastery (lineage-based) + retrospective-only program-streak content, same gate as Training | Same evaluator (`ProgramEvaluator`) |
| **Goals** | Goals volume expansion + long-term completion (pending date-field verification) | Same evaluator (`GoalEvaluator`) |
| **Chapters** | Chapter creation/completion/sealing/duration expansion | Same evaluator (`ChapterEvaluator`); reflection writing excluded per Finding T4 |
| **Longevity** | Longevity threshold expansion | Same evaluator (`LongevityEvaluator`); no changes needed beyond new thresholds |
| **Community** | Squads & Community expansion | Same category, but content blocked until new squad statistics exist (Section 7) — the *taxonomy slot* is ready now even though the *content* is not |

**Not given a home in this structure (by design):**

- **Endurance & Conditioning** — when/if cardio logging becomes a real product capability, it will most likely warrant a genuine 8th category (none of the existing 7 fit a movement-type-based domain like Training's volume-based one does). That is a forecast for a future pass, not an amendment drafted now.
- **Prestige** — rather than inventing an 8th category for cross-cutting, multi-condition honors, each eventual Prestige honor should be assigned to **one** of the existing 7 categories individually, based on its dominant theme, exactly as every other honor already is. This preserves the existing "exactly one category per honor" rule (`Honor-Catalog-v1.0-LOCKED.md` Closure Record) without needing a structural amendment.
- **Milestones & Firsts** — eliminated; no category required.

This satisfies every constraint in the request: compatible with the locked Catalog (extends existing categories/families only), compatible with the Evaluation Service (extends existing evaluators only, no new trigger types), compatible with future growth (Endurance and an 8th-category-pattern are explicitly anticipated rather than foreclosed), and requires no amendment to adopt as a planning foundation.

---

## Section 6 — Target Allocation

These are **planning targets for future catalog authoring**, not honors. No `honorType` IDs, thresholds, or qualification logic are implied.

| Category | Existing (locked) | Recommended Addition | New Target Total | Status |
|----------|--------------------|----------------------|-------------------|--------|
| Strength | 18 | +17 | 35 | Ready (pending PR-storage extension) |
| Training | 12 | +18 | 30 | Partially ready — Workout Count/Hours Forged ready now; Consistency slice reserved (see below) |
| Programs | 4 | +21 | 25 | Mostly ready — volume + family-mastery ready; streak slice reserved |
| Goals | 4 | +11 | 15 | Ready, pending one verification item |
| Chapters | 8 | +17 | 25 | Ready, minus reflection writing (eliminated) |
| Longevity | 4 | +16 | 20 | Ready — no blockers |
| Community | 3 | +17 | 20 | Reserved — needs new squad statistics before any of it is authorable |
| **Subtotal (existing 7 categories)** | **53** | **+117** | **170** | — |
| Endurance & Conditioning (reserved) | 0 | +20 (aspirational) | 20 | Future-architecture-dependent; not assignable to a category yet |
| Comebacks & Resilience (reserved) | 0 | +10 (aspirational) | 10 | Reserved pending Product DNA review |
| Prestige (reserved) | 0 | +20 (aspirational) | 20 | Reserved pending concrete criteria |
| Milestones & Firsts | 0 | 0 | 0 | Eliminated |
| **Grand Total** | **53** | **+167** | **~220** | — |

**Rationale for landing near, not exactly at, 225:** The original plan's 225 target included Milestones & Firsts (10, eliminated for duplicate-reward and contradiction reasons — Section 3) and assumed full-size Consistency (25) and full-size Workout Count (20) as independent families before they were merged and partially gated. ~220 is the honest reconciled figure once duplicates are removed and Product-DNA-gated content is counted at a conservative placeholder size rather than its original full size. This is a feature of the reconciliation, not a shortfall — recommending the same total as the unreviewed plan would mean silently re-absorbing the very problems this pass exists to catch.

---

## Section 7 — Expansion Readiness

| Family / Sub-item | Classification | Blocking Condition (if any) |
|--------------------|-----------------|------------------------------|
| Strength (OHP, Pull-Up ladders) | **Ready for immediate authoring** | Scoped PR-storage extension (2 new slots) — implementation detail, not a taxonomy blocker |
| Strength — Club scope (3-lift vs. 5-lift) | **Requires clarification** | Explicit decision needed; do not infer |
| Training — Workout Count / Hours Forged expansion | **Ready for immediate authoring** | None |
| Training — Consistency (retrospective-only design) | **Requires clarification** | Product DNA Decision Test must be run and pass explicitly first |
| Training — Consistency (live-streak mechanism) | **Future architecture dependent** | New statistics domain; Product DNA review |
| Programs — volume + family mastery | **Ready for immediate authoring** | None |
| Programs — streaks | **Requires clarification** | Same gate as Training Consistency |
| Goals — volume | **Ready for immediate authoring** | None |
| Goals — long-term completion | **Requires clarification** | Verify Goal creation/achievement dates are accessible to `GoalEvaluator` |
| Chapters — creation/completion/sealing/duration | **Ready for immediate authoring** | None |
| Chapters — reflection writing | **Eliminated** | Contradicts L-6 Decision 10 (Finding T4) — not reclassifiable as "ready," removed from scope |
| Longevity | **Ready for immediate authoring** | None — reference family |
| Community — Squads & Community | **Future architecture dependent** | New squad-statistics domain required; must also respect "Squads Are Private" guardrail |
| Endurance & Conditioning | **Future architecture dependent** | Cardio logging is not a documented product capability; contingent on an independent roadmap decision |
| Comebacks & Resilience | **Requires clarification**, escalating to **future architecture dependent** if cleared | Product DNA Decision Test first; if passed, still needs new absence-detection statistics |
| Prestige | **Requires clarification** | Concrete multi-condition criteria must be defined before duplicate/threshold-conflict checking is even possible |
| Milestones & Firsts | **Eliminated** | Not classified going forward |

---

## Section 8 — Summary for Next Workstream

The next workstream (actual honor authoring) can proceed immediately and safely for:

- **Longevity** (full expansion — the reference family)
- **Strength** (pending the small PR-storage extension)
- **Training** — Workout Count / Hours Forged only
- **Programs** — volume + family mastery only
- **Goals** — volume only
- **Chapters** — creation/completion/sealing/duration only

Everything else listed in Section 7 as "Requires clarification" or "Future architecture dependent" should **not** be authored in the next pass until its specific blocking condition is resolved. None of those blocking conditions were invented by this audit — each traces to either a locked document this pass read in full (L-6 Decision 10; ES §3.2/§9.1; Exercise-Library-Architecture's category enum; Product DNA §4/§9/§10) or an explicit, named open decision left for the user (Club's 3-lift-vs-5-lift scope; the Consistency/Comebacks Product DNA review; cardio logging's roadmap status).

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial taxonomy reconciliation. Resolved F1/F11 (terminology collision) by mapping all surviving expansion content onto the existing 7-category structure. Found 2 new issues not present in the prior audit: T1 (Honor Catalog's own "11 families" claim is arithmetically inconsistent with its per-category breakdown, which sums to 14) and T4 (Family 7's "reflection writing" sub-item directly contradicts L-6's locked Decision 10, not merely an open question). Produced a ~220-honor target allocation and a per-family/sub-item readiness classification. No honors authored; no amendments drafted. |

---

*Honors Taxonomy Reconciliation — v1.0*
*Forge Legacy | June 2026*
