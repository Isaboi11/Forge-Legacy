# Rank Implementation Readiness Review
## June 2026

**Status:** COMPLETE — Ready for Engineering Review
**Type:** Implementation Readiness Assessment
**Date:** June 2026

**Documents Audited:**
- Rank-System-Architecture.md v1.0 (LOCKED)
- Rank-Computation-Model.md Sessions 1–3 (DRAFT)

**Purpose:**
Determine whether the Rank System is ready for engineering implementation. Identify missing dependencies, unresolved blockers, required downstream documents, and engineering prerequisites. This document does not redesign the rank system or create new architecture.

> ⚠️ **SUPERSEDED — For historical reference only.** This review was written against RCM Sessions 1–3 (DRAFT). All 8 blockers identified below have since been resolved: BLOCKER-1 (TBD-12) resolved in RCM Session 5 · BLOCKER-2 (TBD-16) resolved in RCM Session 4 · BLOCKER-3 (TBD-1) resolved in RCM Session 4 · BLOCKER-4 (Q1), BLOCKER-5 (Q8), BLOCKER-6 (Q9/Q10), BLOCKER-7 (Q13), BLOCKER-8 (Q2) all resolved in `Rank-Calibration-Decisions.md` (LOCKED). TBD-2 resolved by `P-2-Progress-Hub-Spec.md` (LOCKED). TBD-11 formally closed as non-blocking per RCM Amendment Log v1.0.1. **Architecture Freeze row 15 (Rank) is ✅ Complete as of 2026-06-30.**

---

## 1. Readiness Assessment

### Overall Verdict: NOT READY FOR FULL IMPLEMENTATION

The Rank System is **architecturally complete** and **computationally well-defined at the structural level**. Ten of fifteen TBDs are resolved. The threshold table (Section 14 of RCM) is the most significant deliverable produced: it gives engineering concrete, numeric targets for every family promotion transition.

However, five TBDs remain open, fourteen open questions await user decisions, and three high-priority system documents do not yet exist. Engineering cannot build a functioning evaluation pipeline until these gaps are closed.

**What is ready:** Foundational data tracking, lower-rank promotion evaluation (Foundation and Builder), promotion queue infrastructure, chapter/program/goal tracking, and P-2 rank display integration.

**What is blocked:** The rank evaluation service, prestige rank promotion logic, Personal Improvement evaluation, recent engagement gating, and the data model that everything else depends on.

---

## 2. TBD Resolution Status

### Resolved in RCM (10 of 15)

| TBD | Topic | Resolved In |
|-----|-------|-------------|
| TBD-3 | Sub-tier thresholds | RCM Section 13 |
| TBD-4 | Family promotion thresholds | RCM Section 14 |
| TBD-5 | Promotion spacing values | RCM Section 15 |
| TBD-6 | Active week / active month definitions | RCM Section 2 |
| TBD-7 | Meaningful work definition | RCM Section 3 |
| TBD-8 | Personal Improvement metrics by athlete type | RCM Section 9 |
| TBD-10 | Recent engagement definition | RCM Section 10 |
| TBD-13 | Chapter Progression definition | RCM Section 4 |
| TBD-14 | Longevity definition | RCM Section 5 |
| TBD-15 | Goal Participation definition | RCM Section 6 |

**Important caveat:** Several "resolved" TBDs are resolved at the structural level only. Their numeric values — the inputs that make them computable — are open questions (Q1, Q2, Q9, Q10, Q13). Structurally resolved does not mean implementable.

### Still Open (5 of 15)

| TBD | Topic | Priority | Implementation Impact |
|-----|-------|----------|-----------------------|
| TBD-1 | Rank evaluation trigger events | HIGH | Blocks evaluation service pipeline |
| TBD-2 | Sub-tier surfacing mechanism | MEDIUM | Blocks P-2 sub-tier progress display |
| TBD-11 | Legacy display format in M-1 | LOW | Only affects final promotion in system |
| TBD-12 | Rank data model / schema | HIGH | Blocks all data layer work and P-3 |
| TBD-16 | Rank Evaluation Service architecture | HIGH | Blocks evaluation service implementation |

---

## 3. Blockers List

The following are hard blockers. Engineering cannot implement the affected system area without resolution.

### BLOCKER-1: No Rank Data Model (TBD-12)
**Blocks:** Everything. All evaluation service work, P-3 Rank Detail, promotion queue persistence, and any query that reads an athlete's current rank state.

The rank schema does not exist. Fields, relationships, and query patterns are entirely undefined. This is the most foundational engineering prerequisite in the system.

**Required before:** Any database schema work, evaluation service design, P-3 authoring.

---

### BLOCKER-2: No Rank Evaluation Service Architecture (TBD-16)
**Blocks:** Rank evaluation implementation.

The computation engine does not exist as a designed system. Whether it is a standalone service or integrated with the Honor Evaluation Service, its inputs, outputs, evaluation pipeline, and failure behavior are all undefined. The threshold table (RCM Section 14) is complete — but there is no designed system to run it.

**Required before:** Any evaluation service development.

---

### BLOCKER-3: Evaluation Trigger Events Undefined (TBD-1)
**Blocks:** Evaluation service scheduling, data pipeline design.

The only confirmed trigger is M-5 (chapter seal). Training Consistency is Category #1. An athlete in an active chapter spanning months must still have their active weeks evaluated and counted. If evaluation runs only at chapter seal, athletes who are not sealing chapters cannot accumulate sub-tier progress or approach family promotion eligibility. This is C-2 from the RSA contradiction audit — acknowledged and deferred, but still unresolved.

**Required before:** Evaluation service scheduling logic, trigger integration points.

---

### BLOCKER-4: Meaningful Work Duration Floor Undefined (Q1)
**Blocks:** Active Week computation, Training Volume accumulation, all downstream thresholds.

TBD-7 defines the structure of meaningful work (saved, completed, any activity type, minimum duration). The minimum duration value is Q1 — not yet decided. Without a numeric floor, the system cannot classify any session as meaningful work. This makes TBD-6 (Active Week), TBD-3 (sub-tier thresholds), and TBD-4 (family promotion thresholds) inoperable.

**Required before:** Any session classification logic.

---

### BLOCKER-5: Athlete Type Declaration Undefined (Q8)
**Blocks:** Personal Improvement evaluation (Category #2).

The Personal Best Progression model (TBD-8) is fully defined per type. But the system must know each athlete's type to evaluate improvement. Whether type is declared at onboarding (O-2), on Profile (P-1), or inferred from session history — and how type changes over time — is entirely undefined. Without this decision, the evaluation service has no input for the #2 category.

**Required before:** O-2 or P-1 spec updates, athlete data model design, Personal Improvement evaluation logic.

---

### BLOCKER-6: Recent Engagement Thresholds Undefined (Q9, Q10)
**Blocks:** Prestige rank promotion evaluation (Architect and above).

TBD-10 defines the structure of recent engagement (active weeks within a lookback window). Q9 asks for the lookback window duration and minimum active week count. Q10 asks whether this threshold scales per prestige rank. Without these values, the recent engagement gate — marked Required for every prestige transition in the threshold table — cannot be evaluated. Any athlete approaching Architect cannot receive a promotion decision.

**Required before:** Prestige rank evaluation logic, P-2 No Hidden Blockers guidance calibration for Architect+.

---

### BLOCKER-7: Improvement Pattern Thresholds Undefined (Q13)
**Blocks:** Personal Improvement evaluation at Craftsman→Architect and above.

The family promotion table uses qualitative improvement requirements: "first event," "multi-period pattern," "repeated," "multi-year," "multi-phase." These cannot be evaluated without specific counts and time distributions. Q13 provides a proposed framework for discussion but no resolved values. The improvement evaluation is partially implemented for Builder→Craftsman ("first event" = ≥1 personal best) but incompletable for any prestige rank transition.

**Required before:** Personal Improvement evaluation logic for C→A and above.

---

### BLOCKER-8: Active Month Threshold Undefined (Q2)
**Blocks:** Active Month signal computation, Training Consistency category signal.

TBD-6 defines Active Month as a function of Active Week density within the month, with the count threshold deferred. Family promotion thresholds use cumulative Active Weeks (not Active Months), so this blocker does not prevent family promotion evaluation. However, Active Month is referenced as a primary signal for Training Consistency and is needed for P-2 consistency guidance. It also affects the No Hidden Blockers surface (athletes need to understand monthly consistency patterns).

**Severity:** Medium — does not block family promotion threshold evaluation but blocks Training Consistency signal completeness and P-2 consistency guidance.

---

## 4. Open Questions Requiring User Decisions

Fourteen questions are pending user decisions before Session 4. They range from hard blockers to calibration decisions that can be addressed after engineering begins.

| Question | Topic | Blocks Implementation | Priority |
|----------|-------|----------------------|----------|
| Q1 | Meaningful Work duration floor (minutes) | YES — see BLOCKER-4 | Critical |
| Q8 | Athlete type declaration mechanism | YES — see BLOCKER-5 | Critical |
| Q9 | Recent engagement lookback window + min AW count | YES — see BLOCKER-6 | Critical |
| Q13 | Improvement pattern quantitative thresholds | YES — see BLOCKER-7 | Critical |
| Q2 | Active Month week-count threshold | Partially — see BLOCKER-8 | High |
| Q10 | Scaled vs. uniform recent engagement per prestige rank | YES — affects prestige evaluation | High |
| Q7 | Recent engagement: native-only or import-eligible | YES — affects import athlete prestige eval | High |
| Q11 | Import partial credit rate for signals | YES — affects prestige threshold computation | High |
| Q3 | Imported session duration handling | Partial — affects import pipeline | Medium |
| Q4 | Goal Participation import treatment | YES — affects goal threshold computation | Medium |
| Q6 | Longevity signal unit (months vs. years) | NO — affects display only | Medium |
| Q12 | Forge-native session floor for Training Volume | YES — affects prestige volume threshold | Medium |
| Q5 | Achievement amplification for Goal Participation | NO — scoring layer only | Low |
| Q14 | Legend milestone "distinct development phases" definition | YES — affects L→I validation | Low (far-future) |

---

## 5. Required Downstream Documents

The following documents must be authored or amended before implementation areas can proceed. None currently exist unless noted.

### Must Exist Before Engineering Starts

| Document | Status | Blocks |
|----------|--------|--------|
| Rank Data Model Spec (TBD-12) | Does not exist | All schema work, P-3, evaluation service |
| Rank Evaluation Service Architecture (TBD-16) | Does not exist | Evaluation pipeline implementation |
| Rank Evaluation Trigger Spec (TBD-1) | Does not exist | Evaluation scheduling and integration |

### Must Exist Before P-2 Implementation Is Final

| Document | Status | Blocks |
|----------|--------|--------|
| Sub-tier Surfacing Mechanism Spec (TBD-2) | Does not exist | P-2 sub-tier progress display, Rank Journey Preview |
| P-3 Rank Detail Screen Spec | Does not exist (blocked on TBD-12) | P-3 implementation |

### Amendments Required to Existing Documents

| Document | Amendment Needed | Status |
|----------|-----------------|--------|
| M-1 Rank-Up-Modal-Spec | Replace "Apprentice" placeholder with actual rank names (C-1) | Pending — not a blocker |
| M-1 Rank-Up-Modal-Spec | Add Legacy display format when TBD-11 is resolved | Pending — low priority |
| P-2-Progress-Hub-Architecture.md | Incorporate TBD-2 resolution (sub-tier surfacing) | Pending — required before P-2 finalization |
| O-2 First-Time Setup or P-1 Profile | Add athlete type declaration (Q8 resolution) | Pending — required before Personal Improvement evaluation |

---

## 6. Implementation Risks

### Risk 1: Evaluation Service Depends on Four Unresolved Architecture Documents
The Rank Evaluation Service (TBD-16) needs TBD-1 (trigger events), TBD-12 (data model), and the resolved values from Q1, Q8, Q9, Q13 before it can be meaningfully specified. These are sequential dependencies. Authoring TBD-16 before TBD-12 is impossible. This is the highest-risk dependency chain in the system.

### Risk 2: Personal Improvement Evaluation Is Blocked at the Data Layer
The Personal Best Progression model (TBD-8) requires per-exercise personal best tracking for Strength athletes, per-modality personal best tracking for Running athletes, and layered signal computation for Boxing athletes. None of this can begin until the athlete type is known (Q8) and the data schema is defined (TBD-12). If type is inferred from session history, the inference algorithm must also be specified — that specification does not exist.

### Risk 3: Import Partial Credit Creates a Threshold Evaluation Branch
The family promotion threshold table defines a Forge-native AW floor (50% of total AW at prestige ranks) but the partial credit rate for the remaining 50% is undefined (Q11). The evaluation service must implement two branches: imported and native. If Q11 is resolved late, the import branch cannot be tested until after the native branch is built and validated. This is a testing sequencing risk.

### Risk 4: Recent Engagement Gate Is Required But Not Evaluable
The threshold table marks recent engagement as Required for all prestige rank transitions. Q9 and Q10 (lookback window and minimum AW count) are unresolved. Any athlete who earns enough development evidence to approach Architect cannot receive a promotion decision until Q9 and Q10 are resolved and the gate is implemented. This creates a scenario where engineering builds everything but cannot fully validate the end-to-end promotion flow for prestige ranks.

### Risk 5: Q13 Blocks Category #2 Evaluation at the Ranks That Matter Most
The "multi-period pattern" (Craftsman→Architect), "repeated" (Architect→Established), "multi-year" (Established→Legend), and "multi-phase" (Legend→Legacy) qualitative requirements are the gates for the upper half of the rank ladder. Until Q13 is resolved, these gates cannot be implemented. An athlete who has sufficient active weeks, volume, programs, and chapters cannot receive promotion consideration at C→A or above because the improvement evaluation is incomplete.

### Risk 6: Boxing Proxy Signal Is Explicitly Limited
The Boxing improvement signal is a named proxy (HIIT rounds + Strength load) with acknowledged gaps. This is documented in D-RCM-8. Engineering must implement the proxy as specified without over-engineering toward a direct boxing signal that doesn't exist. The risk is that engineers treat the proxy as a placeholder and defer implementation pending a future boxing session type — the proxy must be built for MVP.

---

## 7. What Can Start Now

Despite the blockers, the following areas can begin engineering work immediately, using the locked decisions from RCM and RSA.

### Can Start Now

| Area | What Enables It | Key Inputs |
|------|----------------|------------|
| Session record classification schema | TBD-7 structure locked (awaiting Q1 numeric) | 9 activity types, saved/completed flag, duration field required |
| Sealed chapter count tracker | TBD-13 locked | M-5 sealing transaction as trigger |
| Program graduation tracker | C-5 resolved (terminology) | M-4 graduation event as trigger |
| Goal lifecycle event tracker | TBD-15 locked | M-5 sealing transaction as trigger |
| Longevity span computation | TBD-14 locked | Earliest session date, most recent meaningful-work session date |
| Chapter sealing integration | M-5 confirmed trigger (RSA §19) | M-5 transaction step 7 |
| Promotion queue foundation | RSA §12 locked, TBD-5 spacing locked | Sequential delivery, spacing table from RCM Section 15 |
| Family sub-tier within-family AW counter | TBD-3 locked | Family entry date, active week definition structure |
| Foundation and Builder threshold evaluation | TBD-4 threshold table rows locked | 6 AW / 12 sessions → Builder; 18 AW / 36 sessions / 60 days → Craftsman |
| M-1 copy update | C-1 identified in RSA | Replace "Apprentice" with actual rank names |

### Cannot Start Until Blocker Is Resolved

| Area | Blocked By |
|------|-----------|
| Rank data model / schema | BLOCKER-1 (TBD-12) |
| Evaluation service design | BLOCKER-1 (TBD-12), BLOCKER-2 (TBD-16), BLOCKER-3 (TBD-1) |
| Session classification as meaningful work | BLOCKER-4 (Q1 — duration floor) |
| Active Week computation (operational) | BLOCKER-4 (Q1) |
| Personal Improvement evaluation | BLOCKER-5 (Q8 — athlete type declaration) |
| Prestige rank promotion gating | BLOCKER-6 (Q9/Q10 — recent engagement thresholds) |
| C→A and above improvement evaluation | BLOCKER-7 (Q13 — improvement pattern thresholds) |
| Import branch of evaluation service | Q7, Q11, Q12 — import policy decisions |
| P-3 Rank Detail screen | TBD-12 (data model must exist first) |
| P-2 sub-tier surfacing | TBD-2 (surfacing mechanism not yet defined) |

---

## 8. Recommended Implementation Sequence

### Phase 0 — Resolve Critical Open Questions (Before Any Engineering Begins)
Required decisions before engineering can meaningfully start:
1. **Q1**: Meaningful Work duration floor (numeric value in minutes)
2. **Q8**: Athlete type declaration mechanism (onboarding, profile, or inferred)
3. **Q9 + Q10**: Recent engagement lookback window and minimum AW count; scaled or uniform

These three decisions unblock the session classification, Personal Improvement evaluation, and prestige rank gating respectively.

### Phase 1 — Foundation Documents
1. Author **Rank Data Model Spec** (TBD-12) — schema for athlete rank state
2. Author **Rank Evaluation Trigger Spec** (TBD-1) — when and how evaluation runs
3. Author **Rank Evaluation Service Architecture** (TBD-16) — service design, inputs, outputs, pipeline

These three documents are the engineering prerequisites for all subsequent work. They cannot be authored in parallel with each other — TBD-12 must be authored before TBD-16 can be meaningfully specified.

### Phase 2 — Session 4 User Decisions
Conduct Session 4 to resolve remaining open questions:
- Q2, Q3, Q4, Q5, Q6, Q7, Q11, Q12, Q13, Q14
- Priority order within Session 4: Q13 (improvement patterns) → Q7, Q11, Q12 (import policy cluster) → Q2 (active month threshold) → Q3, Q4, Q6 → Q5, Q14

### Phase 3 — Parallel Engineering Tracks (After Phase 0 + Phase 1)
With Phase 0 decisions made and Phase 1 documents authored:

**Track A — Data and Schema**
- Implement rank data model per TBD-12 spec
- Implement session record classification (meaningful work — with Q1 floor)
- Implement active week computation (calendar week anchor)
- Implement longevity span computation
- Implement sealed chapter, program graduation, and goal lifecycle event trackers

**Track B — Evaluation Service Foundation**
- Implement evaluation trigger pipeline per TBD-1 spec
- Implement Foundation → Builder evaluation (all thresholds available — no prestige gates)
- Implement Builder → Craftsman evaluation (60-day time gate + AW + volume)
- Implement promotion queue with spacing table

**Track C — P-2 Integration**
- Implement rank display in identity strip
- Implement both rank progress dimensions (R-D47): sub-tier progress + family progress
- Sub-tier surfacing mechanism (requires TBD-2 resolution — can author TBD-2 in parallel with Track C)

### Phase 4 — Prestige Rank Engineering (After Phase 2 + Phase 3)
With remaining open questions resolved:
- Implement athlete type detection per Q8 decision (update O-2 or P-1 as applicable)
- Implement Personal Improvement evaluation per TBD-8 and Q13 values
- Implement recent engagement gate per Q9/Q10 values
- Implement Craftsman → Architect evaluation (prestige rank transition, all gates)
- Implement import partial credit branch per Q7, Q11, Q12 decisions
- Implement Architect → Established, Established → Legend, Legend → Legacy evaluations

### Phase 5 — Surface Layer
- Author P-3 Rank Detail screen spec (after TBD-12 complete)
- Implement P-3 screen
- Amend M-1 with TBD-11 (Legacy display format)
- Amend P-2 with TBD-2 resolution (sub-tier surfacing mechanism)
- Implement No Hidden Blockers guidance in P-2 What's Next (calibrated to Q9/Q13 values)

---

## 9. Recommendation: LOCK or REVISE Rank-Computation-Model.md

### Recommendation: LOCK with conditions

**Rationale for LOCK:**

The RCM is internally consistent. It does not contradict RSA. The decisions it makes are well-reasoned and carry appropriate architectural weight (D-RCM-1 through D-RCM-17). The threshold table (Section 14) is the most significant deliverable in the document — it fills the most critical gap in the entire system and represents a complete, calibrated framework across all six family transitions.

The document correctly identifies what it resolves, what it defers, and what requires user decisions. This is the right scope discipline. Forcing the document to also resolve Q1–Q14 would extend Session 3 indefinitely.

The five remaining open TBDs (TBD-1, TBD-2, TBD-11, TBD-12, TBD-16) are correctly scoped out of the computational authority document — they are architecture (TBD-1, TBD-12, TBD-16), UX surfacing mechanism (TBD-2), and a display format decision (TBD-11). These do not belong in a computational authority document.

**Conditions for LOCK:**

1. **The document must acknowledge** that eight of its open questions (Q1, Q2, Q9, Q10, Q13, Q7, Q11, Q12) are implementation blockers — not just product decisions to resolve at some future point. The Open Questions section (Section 17) frames them as "requiring user decisions before Session 4 can proceed." Engineering-facing readers must understand that Q1 and Q8 are the most immediate blockers.

2. **The Amendment Log must reflect** that the document is locked as of Session 3 with identified open questions carried forward. Currently the Amendment Log reads: "None. All decisions in this document are draft-status pending user review and lock." This should be updated at lock.

3. **The document should be re-labeled** from DRAFT to LOCKED before being used as an engineering reference. Keeping it as DRAFT after user approval will cause confusion about its authority status.

**What LOCK does not imply:**

Locking the RCM does not mean engineering can begin full implementation. The blockers listed in Section 3 of this review are engineering prerequisites that must be resolved independently, regardless of RCM lock status. LOCK means the computational decisions in Sessions 1–3 are authoritative and stable — not that all implementation prerequisites are satisfied.

---

## 10. Readiness Summary

| Area | Status |
|------|--------|
| Rank philosophy and ladder structure | Ready — fully locked |
| Promotion model (hybrid, multi-requirement) | Ready — fully locked |
| Primary category definitions | Ready — locked |
| Secondary category definitions | Ready — locked |
| Sub-tier threshold structure | Ready — locked (numeric values operational pending Q1) |
| Family promotion threshold table | Ready — locked (some gates pending Q9, Q13) |
| Promotion spacing table | Ready — locked and specific |
| Sealed chapter / program graduation / goal tracking | Ready — can begin |
| Active week computation structure | Ready — structure locked (pending Q1 for operation) |
| Longevity computation | Ready — can begin |
| Promotion queue foundation | Ready — can begin |
| Foundation → Builder evaluation | Ready — all thresholds available |
| Builder → Craftsman evaluation | Ready — time gate + AW + volume available |
| Rank data model | NOT READY — TBD-12 |
| Evaluation service | NOT READY — TBD-16, TBD-1 |
| Personal Improvement evaluation | NOT READY — Q8, Q13 |
| Prestige rank gating (Architect+) | NOT READY — Q9, Q10, Q13 |
| Import evaluation branch | NOT READY — Q7, Q11, Q12 |
| P-3 Rank Detail | NOT READY — TBD-12 |
| P-2 sub-tier surfacing | NOT READY — TBD-2 |

**Immediate next steps before engineering begins:**
1. User decisions on Q1 (duration floor), Q8 (athlete type declaration), Q9/Q10 (recent engagement thresholds)
2. Author TBD-12 (Rank Data Model)
3. Author TBD-1 (Evaluation Trigger Spec)
4. Session 4 for remaining Q decisions
5. Author TBD-16 (Rank Evaluation Service Architecture)

---

*Rank Implementation Readiness Review*
*June 2026*
*Audits: Rank-System-Architecture.md v1.0 (LOCKED) + Rank-Computation-Model.md Sessions 1–3 (DRAFT)*
