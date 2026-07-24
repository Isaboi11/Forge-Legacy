# Prestige Combination Architecture — Design Pass

## v1.0 | June 2026

**Status:** ARCHITECTURE DESIGN PASS — pre-formalization. This document determines what a future, formally-drafted architecture note should contain. It is not itself that note, is not LOCKED, and is not an amendment. No Prestige honors, honor IDs, or catalog content are created here.

**Type:** Architecture Design Document

**Predecessor:** `Prestige-Category-Framework-Evaluation.md` (approved the Prestige framework; named the combination-check trigger as the one open architecture question; deliberately did not design it)

**Mandate:** Determine the smallest architecture capable of safely supporting Prestige honors, using only what is already documented. Where a real gap is found, name it precisely. Where existing architecture already covers the need, say so explicitly rather than inventing a parallel mechanism.

---

## Section 1 — Architecture Audit

### 1.1 Can Prestige truly operate on existing HonorInstances?

**Yes — more cleanly than the prior evaluation estimated.** The decisive finding from this audit: `HonorInstance-Architecture-v1.0.md` §6.3 already requires the Evaluation Service to maintain *"an earned-honor lookup structure per athlete enabling pre-award checks without a database query per honor type per session."* This structure exists today, for every athlete, specifically to support one-time-honor duplicate prevention. It is, without modification, **exactly the data Prestige needs** — a per-athlete set of currently-held `honorType` values. Prestige does not need a new query pattern, a new read path, or a new statistic. It needs to consult a structure the system already builds for an unrelated reason.

### 1.2 Hidden architecture conflicts

Four locked decisions were checked directly for conflict. None were found:

| Decision | Check | Result |
|----------|-------|--------|
| AD-27 ("Honors do not contribute to rank") | Does a Prestige honor touch rank? | No conflict — Prestige only reads other honors to produce a new honor; it has no path into rank computation. |
| ES-7 ("Retroactive evaluation is family-targeted; no full catalog re-evaluation") | Does Prestige's need to "see" other families' output violate this? | No conflict, once stated precisely. ES-7 prohibits *re-running another family's input-side computation* during a targeted retroactive pass. Prestige never re-runs another evaluator's logic — it only reads that evaluator's *output* (an already-created `HonorInstance`). Reading output is categorically different from re-deriving it, and several existing evaluators already share read access this way (`ClubEvaluator` and `StrengthEvaluator` already read the same PR records without conflict). |
| M-2 §10 E-4 ("the evaluation service must not award duplicates of one-time honors") | Does Prestige need a new duplicate-prevention mechanism? | No — see Section 3.3. Prestige honors are ordinary one-time honors under the existing uniqueness model; no new mechanism required. |
| AD-57 ("adding new honor types does NOT require a `schemaVersion` bump") | Does adding Prestige honor types touch `schemaVersion`? | No conflict — this decision already anticipates catalog growth of exactly this shape. |

### 1.3 The one real gap found

Every existing evaluator family is bound to one or more **named external trigger events** (Session Save, Goal Completion, Program Graduation, Chapter Seal, WwF Session Save) and reads **pre-existing, already-finalized statistics** (`Honor-Evaluation-Service-Architecture-v1.0.md` ES-11: statistics are updated *before* evaluators run). Prestige's qualifying condition can depend on a `HonorInstance` created **in the very same transaction**, by a *different* evaluator family, which does not exist yet at the moment evaluators conventionally run (pipeline step [4]) — it is only instantiated in step [5]. This is the one genuine sequencing gap. It is addressed directly in Section 2.

---

## Section 2 — Trigger Model

### 2.1 The existing precedent that resolves this

`LongevityEvaluator` already runs on **every** evaluation-triggering event, regardless of trigger type (ES-10: *"`LongevityEvaluator` runs on every evaluation-triggering event... no anniversary scheduler; first qualifying event after anniversary awards the honor"*). This is not a new trigger shape — it is the existing precedent for "an evaluator that isn't bound to one specific external event." Prestige should adopt the **identical rule**, not invent a new one: Prestige evaluation runs on every evaluation-triggering event, the same way Longevity's does.

### 2.2 Where Prestige must sit in the pipeline (the actual new piece)

Adopting Longevity's "always runs" rule is necessary but not sufficient — it tells us *how often*, not *when within the transaction*. Per Section 1.3's finding, Prestige cannot run alongside the other evaluators in step [4], because the honors it may depend on are not created until step [5]. The correct position is a new, narrow check inserted **after the other evaluators' qualifying honors are known but before Timeline Events are created** — i.e., the existing pipeline gains one new micro-step, not a parallel pipeline:

```
[4] RUN EVALUATORS (unchanged — existing 8 families, per existing trigger rules)
[5] CREATE HONORINSTANCES (unchanged — for each qualifying honor from step 4)
[5.5] CHECK PRESTIGE COMBINATIONS (new)
      Reads: the athlete's pre-existing held honorType set (existing lookup
      structure) UNION the honorTypes just created in this transaction's
      step [5]. For each Prestige rule not already held by the athlete,
      check whether the rule's condition is satisfied by that union.
      Any newly-satisfied rule produces an additional HonorInstance,
      created as part of the same atomic transaction.
[6] CREATE TIMELINE EVENTS (unchanged in mechanism — now also covers any
      Prestige HonorInstance from [5.5], one event per instance, same as
      every other honor)
[7] QUEUE M-2 CEREMONY PAYLOAD (unchanged in mechanism — Prestige honors
      from [5.5] are included in the same bundle, same ES-8 rule)
```

### 2.3 Recommended efficiency refinement

Prestige's check does not need to run unconditionally. If zero new `HonorInstance` rows were created in steps [4]–[5] of a given transaction, the athlete's held-honor set is unchanged from the last time Prestige was checked, and no new combination could have just become satisfied. **Recommendation: execute the Prestige check only when at least one new `HonorInstance` was created in the current transaction.** This is a smaller commitment than Longevity's literal "always evaluates its own condition" (Longevity's condition is independently date-based and can become true without any other honor firing; Prestige's condition can only become newly true *because* another honor just fired). This refinement costs nothing and avoids unnecessary work on the majority of transactions that produce no honors at all.

### 2.4 Retroactive / import behavior

Per `Honor-Evaluation-Service-Architecture-v1.0.md` §7.1, import retroactively runs only the evaluator families relevant to the imported data type, with `LongevityEvaluator` "also" running when applicable. Prestige should follow the identical pattern: after any retroactive family-targeted pass completes, Prestige's combination check runs once against the resulting (now larger) held-honor set. This requires no new retroactive mechanism — it reuses ES §7.1's existing structure exactly, the same way Longevity's import behavior already does.

**Trigger model recommendation: adopt Longevity's existing "always runs on every evaluation-triggering event" rule, refined with the zero-new-honors short-circuit in 2.3, positioned as a new step [5.5] rather than inside step [4].**

---

## Section 3 — Combination Evaluation Logic

### 3.1 How combinations should be represented

Per `HonorInstance-Architecture-v1.0.md` AD-50, derived facts about an honor (its category, its family) are computed from `honorType` **at runtime via the catalog** — never stored on the instance. Prestige combination rules should follow the identical principle: a rule is a piece of **catalog metadata** (a definition of which `honorType`s, or which category-tier facts, satisfy a given Prestige `honorType`), not a new field on `HonorInstance` and not a new standalone data structure. This keeps Section 6's data-model footprint at zero. The rule definitions themselves are content (deferred to a future authoring pass per Rule 7); what this pass establishes is only that **rules live in the catalog layer, evaluated at runtime against held-honor data, exactly like every other derived fact already does.**

### 3.2 How qualification should be checked

A pure function of two inputs: the athlete's held-`honorType` set (existing lookup structure, Section 1.1) and a rule definition (catalog content). No new query, no new statistic, no raw history read — fully consistent with ES-11's existing invariant that evaluators never read raw history, only finalized state.

### 3.3 How duplicate awards should be prevented

**No new mechanism required.** Prestige honors are one-time honors under the *already-locked* uniqueness model (`HonorInstance-Architecture-v1.0.md` §6.1: uniqueness key `(athleteId, honorType)`). There is no scenario in which a Prestige honor should be repeatable — once a combination is satisfied, the constituent honors that satisfied it are permanent and immutable (§7: "No field is editable after write. No honor is deletable by the athlete"), so the combination, once true, stays true forever. The existing one-time uniqueness check, already run by every evaluator before awarding, applies to Prestige without modification.

### 3.4 How reevaluation should behave

Because constituent honors are permanent, there is no "un-satisfying" case to handle — this is a simplifying property unique to Prestige among the categories evaluated so far. "Reevaluation" only ever means: on each new step [5.5] check, skip any Prestige rule the athlete already holds (standard one-time-honor skip, identical to every other family), and check only the remaining, not-yet-earned rules against the current held-honor set.

---

## Section 4 — Circular Dependency Review

### 4.1 The structural restriction that eliminates this risk category entirely

**Recommendation: a Prestige combination rule may never reference another Prestige `honorType` as a constituent.** Every Prestige rule's constituents must come from the six already-saturated, non-Prestige categories. This single restriction makes circularity, self-reference, and "Prestige chains" structurally impossible — there is no graph in which a cycle could form, because Prestige nodes only ever point outward to non-Prestige nodes, never to each other.

### 4.2 Why a structural restriction is preferable to runtime cycle detection

Per the goal of minimal architecture: a restriction enforced at rule-authoring time (a content-review discipline, like the existing duplicate/threshold checks every catalog addition already undergoes) requires zero runtime code, zero new data structures, and zero performance cost. Runtime cycle detection would require building a dependency graph and traversal logic that has no other use in this system. The structural restriction is strictly smaller and equally effective.

### 4.3 Determinism

Given (a) constituent honors are immutable once created, (b) Prestige rules reference only non-Prestige honor types, and (c) the qualification check is a pure function of the held-honor set, evaluation is fully deterministic: identical inputs always produce identical results, with no ordering ambiguity between Prestige rules (none depends on another's outcome, so all rules can be checked in any order, or in parallel, within step [5.5]).

**Recommendation: adopt the no-Prestige-on-Prestige restriction as a binding rule for all future Prestige catalog content. No runtime cycle-detection mechanism is required.**

---

## Section 5 — Existing System Integration

| System | Change Required? | Finding |
|--------|-------------------|---------|
| **HonorInstance creation** | None | Prestige honors are created via the same step [5]-shaped mechanism (now also covering [5.5]'s output) — same fields, same write path, no schema change. |
| **L-10 Honors Hub** | **Yes — a real, named gap.** | L-10 §5.1 defines exactly seven display categories with no documented fallback for an honor type outside that set. Unlike L-11 (next row), L-10 has no equivalent of a "generic" treatment. A Prestige honor awarded today, before L-10 is touched, would have no defined home in the category list. **This must be resolved before any real Prestige honor is awarded in production** — but it is a separate, small, future UX-architecture touch, not part of the evaluation pipeline this document designs, and not drafted here. |
| **L-11 Honor Detail** | None required to avoid breakage; cosmetic-only follow-up optional. | L-11 §6.4 already defines a graceful fallback: *"If the honor type cannot be mapped to a display category... display a neutral generic badge. Never render an empty badge area."* This was written for exactly this situation ("future catalog entry not yet recognized by client"). A Prestige honor would render correctly today with a generic badge. A bespoke Prestige badge is a nice-to-have for later, not a blocker. |
| **M-2 Honor Earned** | **Yes — a one-line, additive change.** | M-2 §8.3's bundling order ("Training → Strength → Club → ChapterDepth → Program → Community → Longevity") would need "Prestige" appended at the end, since Prestige can only ever be the *last* honor determined in a transaction (it depends on the others). This is an extension of an ordering list, not a revision of any locked decision — M-2's own minimum payload requirement (`honorId` + `displayName` only, §8.4) already works for any honor type without modification. |
| **Rank system** | None | AD-27 applies identically; Prestige has no path into rank computation. |
| **Share system (WSR-001)** | None | Sharing already operates generically off `HonorInstance.id` and snapshot metadata for any honor type, including `HONOR_EARNED` shares. No special-casing needed, provided Prestige's eventual metadata follows the same snapshot conventions every other honor already follows. |

---

## Section 6 — Data Model Impact

| Question | Answer |
|----------|--------|
| New fields required on `HonorInstance`? | **None.** Every field Prestige needs (`honorType`, `displayName`, `dateEarned`, `awardedAt`, `chapterId` = null, `source`, `schemaVersion` = 1, `metadata`) already exists. |
| Are existing structures sufficient? | **Yes**, confirmed directly by AD-57: *"Adding new honor types to the catalog (catalog expansion in V1.1+) does NOT require incrementing `schemaVersion`. The core structure is unchanged; only the set of valid `honorType` values grows."* Prestige is exactly this case. |
| New metadata pattern needed? | **No new mechanism.** `metadata`'s existing sparse-object design (AD-51) already accommodates whatever fields a Prestige `honorType` eventually needs (e.g., a snapshot of which constituent honors or categories satisfied the rule, similar in spirit to how Club snapshots its three constituent PRs). The *shape* of that metadata is content, decided when Prestige honors are actually authored — not an architecture decision. |

**Minimum viable solution: zero data model changes.**

---

## Section 7 — Failure Modes

| Risk | Mitigation |
|------|-----------|
| **Duplicate-award risk** | Fully mitigated by reusing the existing one-time uniqueness model unmodified (Section 3.3). No new risk introduced beyond what every other one-time honor already carries and already handles. |
| **Circular logic risk** | Eliminated structurally via the no-Prestige-on-Prestige restriction (Section 4.1), not via runtime detection. |
| **Future expansion risk** | The most likely real-world failure mode is not technical — it is content governance. If Prestige rules are added casually over time, the category's defining "value is inversely related to size" property (`Prestige-Category-Framework-Evaluation.md` §5.2) erodes. **Mitigation:** extend the existing "no honor types added without formal amendment" catalog discipline to Prestige explicitly, with an even higher bar — any proposed Prestige addition should have to justify itself against the rarity principle, not just pass the ordinary duplicate/threshold checks. |
| **Performance concerns** | Negligible. The check runs at most once per transaction (Section 2.3), only when new honors exist, against an already-in-memory lookup, over a rule set capped at roughly 8–12 entries per the Framework Evaluation's capacity guidance. This is the smallest-footprint evaluator in the entire system if that capacity guidance is respected — and is itself one more reason (beyond meaning and rarity) to keep Prestige small. |
| **Maintenance concerns** | Prestige rules hold referential dependencies on specific base-category `honorType` IDs. Since those IDs are already treated as stable, permanent identifiers under the locked catalog's own amendment discipline, this is a low but real ongoing dependency: any future amendment touching a base category's `honorType` values must check whether a Prestige rule references it. Worth naming as a standing checklist item for future catalog amendments, not a blocker now. |

No high, unmitigated risk was found.

---

## Section 8 — Final Recommendation

### 8.1 Architecture complexity assessment

**Low.** This is among the smallest additions evaluated in this entire workstream — smaller in net-new concept count than the original `HonorInstance` metadata design, and comparable in scope to a single new section of the existing Evaluation Service Architecture. Three of its four building blocks (the lookup structure, the "always runs" trigger pattern, the one-time uniqueness model) already exist and require zero modification; only the pipeline's insertion point ([5.5]) and the no-Prestige-on-Prestige restriction are genuinely new, and both are small, structural, and easy to state precisely.

### 8.2 Required changes

1. A new pipeline step [5.5] (Section 2.2), positioned after `HonorInstance` creation and before Timeline Event creation, within the same atomic transaction.
2. A binding content rule: no Prestige combination may reference another Prestige `honorType` (Section 4.1).
3. A one-line addition to M-2's bundling order, appending "Prestige" at the end of the existing evaluator sequence (Section 5).
4. A named, acknowledged dependency that must be resolved — separately, later, not in this design — before any real Prestige honor is awarded: L-10 needs a defined treatment for an honor type outside its current seven categories (Section 5).

### 8.3 Optional changes

- A Prestige-specific metadata convention (e.g., snapshotting which constituent honors satisfied a rule) — content-level, decide at authoring time.
- A bespoke L-11 Prestige badge — cosmetic; the existing generic-badge fallback already prevents any broken state in the meantime.

### 8.4 Risks

All named in Section 7; all rated low-to-moderate with a stated mitigation; no unmitigated high risk found.

### 8.5 Readiness

High readiness to proceed to a small, formally-drafted architecture note covering items 1–3 above. Low readiness to begin catalog authoring until item 4 (the L-10 integration gap) has its own resolution, even though that resolution does not require touching anything designed in this document.

### 8.6 Final Verdict

**B — Small architecture note required.**

Not A: real gaps exist (the new pipeline step, the circularity restriction, the M-2 ordering touch, and the L-10 integration dependency) — Prestige cannot simply launch on today's architecture exactly as documented.

Not C: nothing found here requires overturning, contradicting, or formally amending any locked decision. Every recommendation in this document *extends* an existing pattern (Longevity's always-runs trigger, AD-57's schemaVersion-stability rule, L-11's existing fallback design, the existing per-athlete honor lookup) rather than revising one.

Not D: nothing in this design pass undermines the prior Framework Evaluation's approval. If anything, this pass found the true architecture lift to be *smaller* than that evaluation estimated — the per-athlete lookup structure Prestige needs already exists for an unrelated reason, and Longevity's trigger rule is a near-exact precedent rather than a starting point for something new.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial architecture design pass for the Prestige combination-check mechanism. Found the core data dependency (per-athlete held-honor lookup) and trigger pattern (always-runs-on-every-event) both already exist as precedents (HonorInstance §6.3, ES-10) and require no new mechanism — only a new pipeline insertion point [5.5] and a structural no-Prestige-on-Prestige restriction are genuinely new. Confirmed zero data model changes (AD-57 already covers this exact growth case). Named one real, unresolved integration gap (L-10 has no fallback treatment for an honor outside its seven categories, unlike L-11 which already has one) as a dependency for production readiness, separate from this design. Final verdict: B — small architecture note required, not an amendment, not a reconsideration. |

---

*Prestige Combination Architecture — Design Pass — v1.0*
*Forge Legacy | June 2026*
