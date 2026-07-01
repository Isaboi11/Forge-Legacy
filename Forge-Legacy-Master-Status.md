# Forge Legacy — Master Status & Project Dashboard

> **🧭 READ THIS FIRST.** This is the permanent source of truth for Forge Legacy. Every Claude session must begin by reading this document before doing any work. It tells you where the project stands, what is already done (so you never duplicate it), what is blocked, and what comes next.
>
> **Maintenance rules (do not skip):**
> 1. Always update this file after major work.
> 2. Never delete completed milestones — move them to **§ Recently Completed**.
> 3. Add newly discovered work to the relevant section.
> 4. Keep all six completion percentages current.
> 5. Keep the **Decision Queue** current — remove a decision only when it is resolved.
> 6. Keep **Recently Completed** current (cap ~20 entries).
> 7. Update **Last Updated** and the **Dashboard** on every edit.

**Type:** Living Project Dashboard + Documentation Completion Audit
**Last Updated:** 2026-07-01 (Button/Input/Card Library v1.0 committed; `Forge-Design-System-Architecture-v1.0.md` governance doc LOCKED; Implementation Status updated to reflect first committed component code)
**Audit Basis:** Live repository scan (225 `Docs/*.md`, `src/`, `Programs/`, git log)

---

## 📊 Project Dashboard

| Dimension | Completion | Notes |
|---|---:|---|
| **Architecture Design** | **~100%** | All 21 Architecture Freeze rows ✅ Complete; V1 Architecture Freeze officially **FROZEN 2026-06-30** |
| **UI / Wireframes** | **~95%** | Nearly all screens specced; W19 lock-candidate; no Search/Rest-Timer/Community wireframe yet — Communities is architecture-only in this pass, no pixel layout authored |
| **Content Authoring** | **~12%** | ~4 of 24 programs; 0 of ~195 exercises active (195 narrative-authored); honors not data |
| **Backend Design** | **100%** | `Backend-Data-Model-Architecture-v1.0.1` LOCKED — Firebase stack ratified, 12 runtime services, all entities canonical |
| **Code Implementation** | **0%** | `src/` is the unmodified Expo Router starter |
| **Testing** | **0%** | No test framework, no tests |

| Snapshot | Value |
|---|---|
| **Current Phase** | **V1 Architecture Freeze FROZEN** — transitioning to implementation preparation |
| **Current Focus** | Architecture Freeze ✅ FROZEN 2026-06-30 — all 21 rows complete. Next: Amendment Reconciliation pass (P-1, O-2, Pinned Legacy); W-19 LOCK; canonical PRD decision; then implementation begins |
| **Biggest Blocker** | Amendment Reconciliation pass (P-1 001–004, O-2 001–002, Pinned Legacy) |
| **Last Updated** | 2026-07-01 (Button/Input/Card Library v1.0 committed; Forge Design System Architecture v1.0 governance doc LOCKED) |

> **30-second read:** Forge Legacy is a documentation-and-design project with world-class specs (~230 markdown docs, ~150 LOCKED) and **zero implemented code**. **The Backend/Data-Model architecture is now LOCKED** (`Backend-Data-Model-Architecture-v1.0.1` — Firebase stack, 12 runtime services, all entity schemas canonical). **Global Search is now also LOCKED** (`Global-Search-Architecture-v1.0.md` — Catalog Search/Discovery Search category split, Never-Searchable list, Performance Firewall-extended ranking/display rules, full reconciliation with both Backend §14 and `Community-Discovery-and-Search-v1.0`). The project can begin implementation as soon as the remaining Freeze rows resolve (Rest Timer, Component Library). **Rank is now ✅ Complete** — all 16 TBDs resolved/closed; RSA, RCM, Calibration Decisions, M-1, P-1, P-2 all LOCKED. Content authoring (programs/exercises) is also early (~12%). **New this session:** the Homepage Principles system is now fully architected and LOCKED — a quiet, rotating "digital inscription" of original Forge Legacy principles and reflection questions on Home (H-1), governed by `Homepage-Principles-Architecture-v1.0` with its canonical content in `Homepage-Principles-Library-v1.0`; the architecture states no fixed entry count so it cannot go stale as the library changes. **Also new this session:** the Communities subsystem (the fourth relationship pillar — Legacy/Friends/Squads/**Communities**) is now fully architected and LOCKED, with `Community-System-Architecture-v1.0`, `Community-Feed-Specification-v1.0`, `Community-Discovery-and-Search-v1.0`, `Community-Roles-and-Moderation-v1.0`, and a complete downstream reconciliation across Social, Challenge, Honor, Notification, Monetization, and Navigation architecture. **Also new this session:** the Squad System Architecture is LOCKED — Goals, Missions, daily Check-ins, a shared Streak, Momentum, a Weekly Summary, a Squad Feed, Honors integration (new `SQUAD` catalog category), inline Competition standings, and Analytics, all scoped to Squad-internal surfaces only. This **deliberately lifts the Performance Firewall for Squad surfaces alone** — Friends Feed, Communities, and Calendar keep the original no-comparison Firewall unchanged — superseding `Squad-Architecture-Amendment-001`/`002` and WSR-001's bounded Check-ins model for those surfaces. **Also new this session:** Exercise Library Phase 4 (Media Architecture & Standards) is LOCKED — new governing doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group and defines production standards for all 5 media/anatomy fields, including mandatory consistency rules for looping animations (neutral-stance start/end) and muscle target images (fixed model/pose/camera template). This is standards and schema only — media production itself remains entirely unstarted for all 195 exercises. **Also new this session:** the Exercise Library's 5 flagged naming-duplicate pairs are fully resolved (Phase 5) — one canonical V1 name locked per pair (Box Step-Up, Back Squat, Front Plank, Barbell Romanian Deadlift, Barbell Bench Press), catalog reduced from 200 to 195 exercises (44 anchors, down from 45), and a new `Exercise-Naming-Standard-v1.0.md` locks the naming principles and an immutability-after-publication governance rule for future authoring. **Also new this session:** the Honors System Final V1 Architecture is LOCKED — reconciled two previously-parallel, never-merged catalog lineages (the locked 82-type catalog and six unmerged Expansion Pass documents) into one coherent system, merged Endurance/Consistency/Prestige, and added a new Hidden category, reaching **167 honor types across 13 categories**; two brand-new Strength honor families (Sex-Specific Milestones, Relative Strength Milestones — 24 types) were designed in full and then deferred to V2 by PO decision before final lock; also discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md` (still showing the original 7 categories from before this project's own prior Competition/Communities/Squad work). Architecture and schema only — the full L-11 descriptive-content catalog pass remains a separate, future task.

---

## 🚦 Project Health

| Dimension | Health | Read |
|---|:---:|---|
| **Architecture** | 🟢 | All 21 Freeze rows ✅ Complete; **V1 Architecture Freeze FROZEN 2026-06-30** |
| **Documentation** | 🟢 | ~219 specs, ~142 LOCKED; only reconciliation lag + a few cosmetic gaps |
| **Content** | 🔴 | ~12% authored; 20 of 24 programs and ~200 exercises unwritten |
| **Backend** | 🔴 | No data-model/persistence design exists — universal blocker |
| **Code** | 🔴 | 0% — stock Expo starter only |
| **Testing** | 🔴 | 0% — no framework, no tests |
| **OVERALL** | 🟡 | Design-rich, build-empty. Architecture Freeze FROZEN — **cleared for implementation**. Content (programs/exercises/honors) is the next critical path. |

---

## 🏃 Current Sprint

**Sprint:** Close the V1 Architecture Freeze (pre-implementation)

**Objective:** Bring all 21 Architecture Freeze rows to ✅ Complete or an explicit written deferral, so the project can transition from design to build. (Row 20, Communities; Row 21, Homepage Principles; and Row 17, Global Search, are already ✅ Complete as of this session.)

**Tasks:**
- [x] Author **Backend / Data-Model / Persistence** architecture (Freeze #16, Decision #1) — **LOCKED**
- [x] Resolve **Rank readiness** — ✅ **COMPLETE** (Freeze #15, Decision #2) — all 16 TBDs resolved/closed; RCM LOCKED v1.0.1; Architecture Freeze row 15 ✅
- [x] Author **Global Search** spec + index model — ✅ **LOCKED** (Freeze #17, Decision #3) — `Global-Search-Architecture-v1.0.md`; full reconciliation with Backend §14 and `Community-Discovery-and-Search-v1.0` §6
- [x] Author **Standalone Rest Timer** spec (Freeze #19, Decision #4) — ✅ **COMPLETE** `Rest-Timer-Architecture-v1.0.md` LOCKED; 22 decisions (RT-D1–RT-D22); ProgressRing component owned; state machine, persistence, background strategy, accessibility, and future platform surface declarations authored
- [x] Author **Component Library / Design System** spec (Freeze #18, Decision #5) — ✅ **LOCKED** `Component-Library-Architecture-v1.0.md` (3 tiers, 37 components CLA-C01–C37, 6 principles, 20 decisions)
- [x] Reconcile **Challenge** filename/version mismatch (Freeze #12) — ✅ **COMPLETE** (2026-06-30) — filename convention documented; all C-series and cross-doc authority references updated; Architecture Freeze Row 12 ✅
- [ ] Run the **Amendment Reconciliation pass** (P-1 001–004, O-2 001–002, Pinned Legacy)
- [ ] Lock **W-19 Activity Detail**; resolve **L-10** honor-category fallback

**Sprint Complete When:** Architecture Freeze status reads **FROZEN** — every Freeze row is ✅ or explicitly deferred, and the Decision Queue contains no implementation-blocking decisions.

---

## 🧊 V1 Architecture Freeze

The official checklist of governing architecture documents required **before implementation can begin**. Implementation is gated on every row reading **✅ Complete** (or an explicit written deferral).

| # | Governing Architecture | Status | Source / Note |
|---|---|---|---|
| 1 | Product DNA | ✅ Complete | `FORGE_LEGACY_PRODUCT_DNA.md` LOCKED |
| 2 | Master PRD | ✅ Complete | `FORGE_LEGACY_PRD.md` + `Forge-Legacy-Master-PRD.md` LOCKED (Import Amend 001) |
| 3 | Global Architecture | ✅ Complete | `MVP-Architecture-Audit-v1.0.md`, `Global-Architecture-Status-Audit.md` |
| 4 | Onboarding / Auth | ✅ Complete | Onboarding-Journey + Account-Auth LOCKED |
| 5 | Calendar | ✅ Complete | `Calendar-System-Architecture-v1.0` LOCKED |
| 6 | Programs / Builder | ✅ Complete | Program Catalog + Ecosystem + Authoring Standard LOCKED |
| 7 | Exercise Library | ✅ Complete | `Exercise-Library-Architecture-v1.0` + Exercise-001/002/003 LOCKED |
| 8 | Legacy / Chapters | ✅ Complete | L-1/L-2/L-3–L-6/L-12–L-16 LOCKED |
| 9 | Honors | ✅ Complete | Honor Catalog v1.5 + Evaluation Service v1.1 + HonorInstance v1.1 LOCKED; `Honors-Architecture-V1-Final-v1.0` + `Honors-Authoring-Standards-v1.0` LOCKED |
| 10 | Social / Friends | ✅ Complete | `Social-System-Architecture-v1.0` (governing) LOCKED |
| 11 | Squads | ✅ Complete | S-1 v1.4/S-2 v1.6/S-3 v1.3 LOCKED + **`Squad-System-Architecture-v1.0` LOCKED** (Goals, Missions, Streak, Momentum, Weekly Summary, Feed, Honors, Competition, Notifications, Analytics, Commitment) |
| 12 | Competitions / Challenges | ✅ Complete | `Challenge-System-Architecture-v1.0.md` (v1.5) LOCKED + C1–C7 LOCKED; filename/version mismatch reconciled 2026-06-30 (filename = initial-publication convention; internal header tracks current version; all C-series and cross-doc authority references updated) |
| 13 | Notifications | ✅ Complete | P-5 (Arch + Wireframe + Amend 001) LOCKED |
| 14 | Settings | ✅ Complete | P-4/5/6/8/9 LOCKED (minor cosmetic stale text) |
| 15 | **Rank** | ✅ Complete | RSA LOCKED · RCM LOCKED v1.0.1 (all 16 TBDs closed) · Calibration Decisions LOCKED (Q1–Q14) · M-1/P-1/P-2 LOCKED · P-3 retired · TBD-11 formally closed as non-blocking |
| 16 | **Backend / Data Model** | ✅ Complete | `Backend-Data-Model-Architecture-v1.0.1` LOCKED — Firebase stack, 12 runtime services, all entity schemas, 6 remaining open questions tracked in §20 of that doc |
| 17 | **Global Search** | ✅ Complete | `Global-Search-Architecture-v1.0.md` LOCKED — Catalog Search/Discovery Search category split, Never-Searchable list, entity privacy filters, ranking, navigation targets, offline behavior, full Backend §14 reconciliation, `Community-Discovery-and-Search-v1.0` §6 updated |
| 18 | Component Library / Design System | ✅ Complete | `Component-Library-Architecture-v1.0.md` LOCKED — 3-tier hierarchy (CLA-C01–C37), 6 governing principles, 20 CLA-D decisions; dark-only V1, Phosphor Icons, system font |
| 19 | **Standalone Rest Timer** | ✅ Complete | `Rest-Timer-Architecture-v1.0.md` LOCKED — 22 decisions (RT-D1–RT-D22); ProgressRing component owned; state machine (INACTIVE/RUNNING/BACKGROUNDED/RECOVERABLE), wall-clock strategy, persistence/recovery, accessibility (Reduce Motion + screen reader), 4 open questions (non-blocking), full downstream reconciliation applied |
| 20 | **Communities** | ✅ Complete | `Community-System-Architecture-v1.0` + `Community-Feed-Specification-v1.0` + `Community-Discovery-and-Search-v1.0` + `Community-Roles-and-Moderation-v1.0`, all LOCKED; full downstream reconciliation applied to Social-System-Architecture (v1.1), Challenge-System-Architecture (v1.4), Honor Catalog (v1.3), P-5 (v1.3), Monetization Amendment 001, and Master PRD §6/§19 |
| 21 | **Homepage Principles** | ✅ Complete | `Homepage-Principles-Architecture-v1.0` (governing; the "digital inscription" on Home) + `Homepage-Principles-Library-v1.0` (canonical content, single source of truth for entry counts), both LOCKED; reconciled into `Home-Screen-Wireframe-Spec-H1` (→ v1.2, new non-tiered inscription element) and `Forge-Legacy-Master-PRD.md` Amendment Log |

**Freeze status:** **✅ FROZEN — 2026-06-30.** All 21 rows ✅ Complete. The V1 Architecture Freeze is officially declared. Implementation may begin.

---

## 📐 Documentation Status (Architecture only)

Specification maturity for governing/architecture and screen specs. **Content authoring is tracked separately in § Content Status.**

**Legend:** `[x]` LOCKED/complete · `[~]` partial/draft/lock-candidate · `[ ]` not started

### Foundations
- [x] **Product DNA** — `FORGE_LEGACY_PRODUCT_DNA.md` LOCKED
- [x] **Master PRD** — `FORGE_LEGACY_PRD.md` + `Forge-Legacy-Master-PRD.md` LOCKED (Amendment 001 Import applied)
- [x] **MVP Architecture Audit** — `MVP-Architecture-Audit-v1.0.md`
- [x] **Information Architecture (IA)** — in PRD (Phase 2A)

### Auth / Onboarding
- [x] **Account Creation (O-1)** — LOCKED
- [x] **First-Time Setup (O-2)** — LOCKED (+ Athlete-Type amendments)
- [~] **First Chapter/Goal (O-3)** — exists but **superseded** by Onboarding-Journey
- [x] **Onboarding First-Time Journey Arch** — LOCKED (governing)
- [x] **Account / Auth Architecture** — LOCKED (session lifecycle + delete account)

### Home
- [x] **Home Screen Wireframe (H-1)** — LOCKED **v1.2** (this session: adds the Homepage Principle digital inscription as a fixed, non-tiered element between the Chapter Card and the Program Card; the five-tier Information Hierarchy is unchanged)
- [x] **Homepage Principles Architecture** — LOCKED v1.0, new this session (governing). The Homepage Principle is a **digital inscription, not a motivational widget** — quiet reflection, not motivation; deterministic per-athlete daily rotation with a 14-day no-repeat window; never AI-generated at runtime (HP-D11); states no fixed library count of its own so it cannot go stale (HP-D10)
- [x] **Homepage Principles Library** — LOCKED v1.0, new this session (canonical content; single source of truth for all library counts; imported verbatim from the approved design session, organized by type — Principles / Reflection Questions)

### Workout (Logger + Active)
- [x] **Workouts Hub (W1)** — LOCKED
- [x] **Activity Type Picker (W8)** — Lock-Ready
- [x] **Active Workout Flow (W9–W16)** — LOCKED
- [x] **Workout Summary (W17)** — LOCKED
- [x] **Activity History (W18)** — LOCKED
- [~] **Activity Detail (W19)** — **LOCK CANDIDATE** (not yet LOCKED)
- [x] **Standalone Rest Timer** — `Rest-Timer-Architecture-v1.0.md` LOCKED (2026-06-30); 22 RT-D decisions; ProgressRing component contract owned; state machine/background/persistence/accessibility/future platform surfaces defined; closes Architecture Freeze Row 19 and Decision Queue #4

### Programs / Builder
- [x] **Program Browse / Detail / Create / Fork (W2–W5)** — LOCKED
- [x] **Workout Builder (W24)** — LOCKED
- [x] **Free Workout Builder (W25)** — LOCKED
- [x] **Workout Templates Hub/Detail (W26/W27)** — LOCKED

### Program Catalog (architecture)
- [x] **Program Catalog Architecture** — LOCKED
- [x] **Program Ecosystem Architecture** — LOCKED
- [x] **Program Authoring/Production Standard** — LOCKED
- [~] **Family Research + Blueprints (Stage 1)** — 6 families researched, Blueprints LOCKED

### Exercise Library (architecture)
- [x] **Exercise Library Architecture** — LOCKED **v1.2** (this session: adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group)
- [x] **Custom Exercise (Exercise-001 / W-28)** — LOCKED
- [x] **Substitution (Exercise-002)** — LOCKED
- [x] **Favorites (Exercise-003)** — LOCKED
- [x] **Library Wireframes (W21/W22/W23)** — LOCKED
- [x] **Exercise Media Architecture** — LOCKED, new this session (`Exercise-Media-Architecture-v1.0.md`) — adds `muscleTargetImageUrl` field + production standards for all 5 media/anatomy fields (incl. mandatory neutral-stance loop start/end rule and mandatory fixed-template muscle-image consistency rule); reconciled into Exercise-Library-Architecture (→ v1.2), W-22 (→ v1.0 R2, new §6.3a/§6.3b within the Identity block), Exercise-001 (→ v1.0 Media Field Reconciliation), W-28 (→ v1.0 Media Field Reconciliation), Anchor Authoring Framework (→ v1.0 Media Cross-Reference). Standards only — zero exercises have media produced.

### Calendar
- [x] **Calendar System Architecture** — LOCKED

### Goals
- [x] **Goal Hub / Detail / Create-Edit (G1/G2/G3)** — LOCKED

### Chapters / Legacy
- [x] **Legacy Hub (L1)** — LOCKED
- [x] **Legacy Timeline (L2)** — LOCKED
- [x] **Chapter Detail / Creation / Reflection (L3–L6)** — LOCKED
- [x] **Accomplishments (L12–L14)** — LOCKED
- [x] **Photos (L15/L16)** — LOCKED
- [x] **Honor Detail Sheet (L11)** — LOCKED

### Honors (architecture)
- [x] **Honor Catalog v1.5** — LOCKED (this session: reconciled two previously-parallel, never-merged lineages — the locked v1.4 catalog and six unmerged Expansion Pass documents — into one V1 architecture; merged Strength depth [Overhead Press, Pull-Up], Training/Chapters/Goals/Programs/Longevity depth, Endurance [Running/Walking/Cycling/Swimming only], Consistency, and Prestige; added a new Hidden category; fixed a recurring family-count arithmetic error; 167 types / 13 categories / 34 families. Two new Strength families [Sex-Specific Milestones, Relative Strength Milestones, 24 types] were fully designed and then deferred to V2 by PO decision before final lock — preserved in full in § DEFERRED TO V2. 18 honors separately, genuinely deferred — Hiking/Rowing Endurance, Comebacks & Resilience, Bodybuilding volume-PR — see `Honors-Architecture-V1-Final-v1.0.md` §9)
- [x] **Honor Evaluation Service Architecture v1.1** — LOCKED (new pipeline step [4.5] for Prestige; 6 new evaluator families; PR storage extended to 5 lifts; `cumulativeActiveWeeks` statistic added)
- [x] **HonorInstance Architecture v1.1** — LOCKED (metadata definitions for 4 new honor families merged in V1; Sex-Specific/Relative Strength metadata shapes designed and deferred to V2 alongside their honor families)
- [x] **Honors-Architecture-V1-Final-v1.0** — LOCKED, new this session — master synthesis/reconciliation document
- [x] **Honors-Authoring-Standards-v1.0** — LOCKED, new this session — defines the "Real Athlete Test" (6-item QC checklist) governing all future Honor authoring, including the still-pending full-descriptive-content pass for the 109 new honor types
- [x] **L-10 fallback for honors outside its category list** — ✅ resolved this session — L-10 was discovered stale even before this pass (still showed 7 categories / 53 types despite the catalog already being at 82/10 since last session); now reflects the full current 13-category / 167-type list. Pre-existing, separate staleness in §3's ASCII mockup and §7.2's per-category sort-order subsections (never backfilled for Partnership/Competition/Communities/Squad) remains open — flagged, not fixed this pass.

### Rank System
- [x] **Rank System Architecture** — LOCKED
- [x] **Rank Computation Model** — LOCKED v1.0.1 (Amendment 001 + TBD-11 formal closure) — all 16 TBDs resolved/closed
- [x] **Rank Calibration Decisions** — LOCKED (Q1–Q14 resolved)
- [x] **Rank Implementation Readiness Review** — superseded; all 8 originally-identified blockers since resolved (banner added)

### Social / Friends
- [x] **Social System Architecture (governing)** — LOCKED **v1.1** (Communities added as a peer relationship layer + Post audience extension, this session)
- [x] **Friend Relationship Architecture (+Amend 001)** — LOCKED
- [x] **Workout With Friend (WwF), Partner Select (W20), Train Together (S10)** — LOCKED
- [x] **Workout Share Result (WSR-001) + Share Card / SH1** — LOCKED

### Squads
- [x] **Squads Hub / Detail / Permissions (S1 v1.4 / S2 v1.6 / S3 v1.3)** — LOCKED
- [x] **`Squad-System-Architecture-v1.0`** — LOCKED, new this session (governing). Locks Squad Goals, Missions, daily Check-ins (+ optional video), Squad Streak, Squad Momentum, Weekly Summary, Squad Feed, Squad Honors (new `SQUAD` Honor Catalog category, 15 types), inline Competition standings, Analytics, and Commitment. **Deliberately lifts the Performance Firewall for Squad-internal surfaces only** — Friends Feed/Communities/Calendar Firewall is unchanged.
- [x] **Squad amendments (Challenge surfaces, Champions Firewall)** — LOCKED, **superseded for Squad-internal surfaces** by `Squad-System-Architecture-v1.0` (banner added to both amendment files; the challenge-creator-is-challenge-scoped rule is reinforced, not superseded)

### Communities (architecture) — new this session
- [x] **Community System Architecture** — LOCKED (governing; fourth relationship pillar)
- [x] **Community Feed Specification** — LOCKED
- [x] **Community Discovery and Search** — LOCKED (community-scoped only; does not close the project's separate Global Search gap, Decision Queue #3)
- [x] **Community Roles and Moderation** — LOCKED
- [~] **Platform-wide moderation escalation + AI moderation** — explicitly acknowledged as not built, not silently omitted (see Decision Queue #9)
- [ ] **Community wireframes (pixel layout)** — not yet authored; architecture-only in this pass

### Competitions / Challenges
- [x] **Challenge System Architecture v1.5 + C1–C7** — LOCKED (this session: v1.5 narrows the Firewall, CS-D2/CS-D22, for SQUAD-context challenges only — standings now render inline on the owning squad's own S-2 Competitions section; FRIENDS/COMMUNITY contexts unaffected)
- [x] **Challenge amendments 002/003 (Friend Challenges) + 004 (Community Competitions)** — LOCKED (third `COMMUNITY` roster context added, reusing the existing engine — no parallel competition architecture, per `Community-System-Architecture-v1.0` COM-D10)
- [x] **Challenge filename/version consistency** — ✅ reconciled 2026-06-30: filename `v1.0` is the initial-publication convention (same as Exercise-Library-Architecture, Social-System-Architecture, etc.); internal header and Amendment Log track current version (v1.5); versioning note added to the doc; all C-series and cross-doc authority references updated to `v1.0.md (v1.5)`

### Notifications
- [x] **P-5 Notifications (Arch + Wireframe)** — LOCKED **v1.4** (this session: Squad Feed Activity / Squad Reactions & Mentions relabeled + scope-expanded, new Squad Goal & Mission Updates toggle added per `Squad-System-Architecture-v1.0` SQ-D12)
- [~] **P-5 Wireframe Spec lags the Architecture** — ⚠️ discovered during this session's reconciliation: the wireframe was never updated for the Architecture's Sections C (Challenges)/D (Friend Requests)/E (Communities); flagged in the wireframe's §11, not resolved this session (see Decision Queue)

### Settings (P-4–P-9)
- [x] **P-4 Settings Root** — LOCKED
- [x] **P-5 / P-6 / P-8 / P-9** — LOCKED
- [~] **P-4 body text "Account/Auth doesn't exist"** — ⚠️ cosmetic stale text

### Modals / Ceremonies (M-series)
- [x] **M-1 Rank-Up, M-2 Honor-Earned, M-3 Goal-Achieved, M-4 Program-Graduated** — LOCKED
- [x] **M-5 Chapter Sealing, M-6 Destructive Confirm, M-7 Premium Upsell** — LOCKED

### Profile / Progress
- [x] **P-1 Profile, P-2 Progress Hub (Arch + Spec)** — LOCKED
- [x] **P-3 Rank Detail** — **RETIRED** (intentional)

### Cross-cutting / Monetization
- [x] **Monetization Amendment 001 (+ Amendment 002, Communities)** — LOCKED (this session: Free = 1 community membership / Premium = unlimited, flagged provisional; community ownership capped 1-per-athlete-all-tiers as a non-monetized constraint)
- [x] **Critical Decisions Amendment 001** — LOCKED
- [x] **Environment Tags MVP Amendment** — LOCKED

### Global Search (architecture) — new this session
- [x] **Global Search Architecture** — ✅ `Global-Search-Architecture-v1.0.md` LOCKED (2026-06-30) — Catalog Search (Exercises/Programs/HonorType catalog, client-filterable) and Discovery Search (Profiles/Communities, server-indexed) as independent categories with strict exclusivity; Never-Searchable list (Posts/WorkoutSessions/HonorInstances/Challenge standings/private chapters/memories/accomplishments/rest timer history); Performance Firewall principle extended by analogy; 5-entity privacy filter model (ownership, delegation, discoverability flag); canonical-screen navigation rule; entry-point deferred to future wireframe spec; full reconciliation with `Backend-Data-Model-Architecture-v1.0.1` §14 and `Community-Discovery-and-Search-v1.0` §6

### Infrastructure architecture
- [x] **App-wide Data-Model / Backend / Persistence Architecture** — ✅ `Backend-Data-Model-Architecture-v1.0.1` LOCKED (2026-06-30)
- [x] **Global Search spec** — ✅ `Global-Search-Architecture-v1.0.md` LOCKED (2026-06-30) — see Global Search subsection above
- [x] **Component-Library / Design-System spec** — ✅ `Component-Library-Architecture-v1.0.md` LOCKED (2026-06-30)
- [x] **Forge Design System Architecture (engineering governance)** — ✅ `Forge-Design-System-Architecture-v1.0.md` LOCKED (2026-07-01) — permanent engineering authority governing how component libraries are structured, implemented, validated, and maintained; 16 sections covering design philosophy, 4-level component hierarchy, repository layout, component rules, token rules, naming standards, state/accessibility standards, composition rules, export contracts, validation workflow, and verification checklist; covers all current (Button/Input/Card v1.0) and future libraries; supersedes any informal per-library conventions; companion to `Component-Library-Architecture-v1.0.md` (behavioral contracts) and `Forge-Legacy-Design-System-v1.0.md` (visual identity)
- [ ] **`.docx` → app-data conversion approach** — ❌
- [ ] **Navigation / Routing spec (standalone)** — 🚧 in PRD only
- [~] **Search / Indexing data model** — 🟡 behavioral authority LOCKED (`Global-Search-Architecture-v1.0`); Backend §14 (`Backend-Data-Model-Architecture-v1.0.1`) names the indexable fields and flags Algolia/Typesense sidecar as candidate without selecting one; index technology not yet selected

---

## 📦 Content Status (authored content, not architecture)

Architecture for these is LOCKED; the rows below track **authored content volume**.

| Content Stream | Authored | Target | % | Note |
|---|---:|---:|---:|---|
| **Program Packages** | ~4 | 24 | ~17% | Only Strength family `.docx` (SF I 3-day/4-day, SF II 3-day/4-day) |
| **Program Family Coverage** | 1 | 9 | ~11% | 8 empty folders: Bodyweight, Combat, Conditioning, Cycling, Hybrid, Hypertrophy, Mobility, Running |
| **Family Research + Blueprints** | 6 families | 6 | ~100% | Stage-1 research + Blueprints LOCKED (content scaffolding) |
| **Exercise Library (as data)** | 195 content / 0 active | ~195 | ~85% content, 0% schema-complete | All 195 catalog rows (originally 200; reduced by the 2026-06-30 naming-duplicate reconciliation) narrative-authored across 14 population passes (44 anchors APPROVED + non-anchor "content authored, pending review"); `category`/`movementPattern`/`equipment` assigned and relationship arrays (alternatives/progressions/regressions) validated with zero broken references; `primaryMuscles`/`secondaryMuscles` assigned (Phase 2) and `difficulty` assigned for all 195 (Phase 3, see `Exercise-Difficulty-Assignment-Pass-v1.0.md`); media production standards defined (Phase 4, `Exercise-Media-Architecture-v1.0.md`, 2026-06-29) — schema includes 5 media/anatomy fields (gifUrl, gifThumbnailUrl, videoUrl, imageUrl, muscleTargetImageUrl); **all 5 remain unassigned for all 195 rows**, so no row yet satisfies the locked FORGE `ExerciseDefinition` schema or can flip `isActive: true`. **Naming-duplicate pairs: 0 remaining (Phase 5, 2026-06-30) — all 5 resolved, see `Exercise-Naming-Standard-v1.0.md` and `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §3.** Not yet ready to mark frozen — see Decision Queue #11 |
| **Honors (as data)** | 0 | 167 | 0% | V1 architecture fully reconciled this session (`Honors-Architecture-V1-Final-v1.0`; catalog → v1.5, 167 types/13 categories/34 families; +24 types [Sex-Specific/Relative Strength Milestones] fully designed and deferred to V2 by PO decision); still 0% authored as L-11 descriptive content — that full-catalog content-authoring pass is the next, separate task, governed by `Honors-Authoring-Standards-v1.0`'s Real Athlete Test |
| **Badge / Honor Artwork** | 0 | 81+ | 0% | No artwork produced |

**Content roll-up:** ~12% overall. Documentation can be ~88% while content is ~12% — they are independent.

---

## 🏗️ Implementation Status (actual repository state)

Everything below reflects the **live `src/` tree and git history**, not specs.

| Layer | Status | Evidence |
|---|---|---|
| **Frontend** | ❌ Not started | `src/` = 19 files, all stock Expo Router starter (Welcome/Explore tutorial) |
| **Backend** | ❌ Not started | No server, no API, no functions |
| **Database** | ❌ Not started | No schema, migrations, Firebase/Supabase, or local DB |
| **Authentication** | ❌ Not started | Specced (O-1/Account-Auth) but no code |
| **Navigation** | 🚧 Starter only | Expo tab/stack scaffold present, not product IA |
| **Components** | 🚧 In progress | Expo boilerplate present; **Button Library v1.0 (6 components), Input Library v1.0 (10 components), and Card Library v1.0 (13 components) all LOCKED and committed** — `src/components/forge/buttons/`, `inputs/`, `cards/`; Forge Design Tokens live at `src/constants/tokens.ts`; design system engineering governance in `Forge-Design-System-Architecture-v1.0.md`; remaining libraries (Navigation, Modals, Badges, Progress, Avatars, Lists, Charts, Empty States, Toasts) not yet started |
| **State Management** | ❌ Not started | None |
| **Testing** | ❌ Not started | No framework, no tests |
| **Deployment / CI** | ❌ Not started | None |

**Git:** 10+ commits — `689bae8 Initial Expo setup` + docs/program commits + **3 component library commits** (Button Library v1.0 `2d20772`, Input Library v1.0 `d309b3b`, Card Library v1.0 `a91fea7`, lint fixes `3ac04ce`) + `Forge-Design-System-Architecture-v1.0.md` governance doc. **First non-boilerplate code committed (2026-07-01): Button/Input/Card libraries.**

---

## 🧠 Decision Queue (unresolved architectural decisions)

Open decisions blocking progress. **Remove a row only when the decision is resolved** (then log it in § Recently Completed).

| # | Decision | Why it's blocking | Owner action needed |
|---|---|---|---|
| ~~1~~ | ~~**Backend / Data Model / Persistence**~~ | ~~Universal blocker~~ | **RESOLVED — `Backend-Data-Model-Architecture-v1.0.1` LOCKED 2026-06-30. Firebase stack ratified.** |
| ~~2~~ | ~~**Rank Readiness**~~ | ~~Rank is build-blocked; evaluation-service, data model, trigger events, "meaningful-work" floor are TBDs~~ | **RESOLVED — Architecture Freeze row 15 ✅ Complete 2026-06-30. All 16 TBDs closed in locked RCM v1.0.1 + Calibration Decisions. No build blockers remain.** |
| ~~3~~ | ~~**Global Search Architecture**~~ | ~~No search surface or index model defined~~ | **RESOLVED — `Global-Search-Architecture-v1.0.md` LOCKED 2026-06-30. Catalog Search / Discovery Search categories defined; Never-Searchable list locked; full Backend §14 + Community-Discovery §6 reconciliation complete.** |
| ~~4~~ | ~~**Standalone Rest Timer**~~ | ~~Behavior trapped inside W9–W16, no reusable contract~~ | **RESOLVED — `Rest-Timer-Architecture-v1.0.md` LOCKED 2026-06-30. 22 decisions (RT-D1–RT-D22). ProgressRing component owned. Architecture Freeze row 19 ✅ Complete.** |
| ~~5~~ | ~~**Component Library / Design System**~~ | ~~No component contract → inconsistent build later~~ | **RESOLVED — `Component-Library-Architecture-v1.0.md` LOCKED 2026-06-30. 3-tier hierarchy, 37 components (CLA-C01–C37), 6 governing principles, 20 decisions. Architecture Freeze Row 18 ✅ Complete.** |
| 6 | **`.docx` → app-data conversion** | Programs authored as Word prose; no path to structured data | Decide the conversion/ingestion approach |
| 7 | **Honors runtime/UX docs stale against the v1.4 catalog** | A full Honors audit (2026-06-29) confirmed `Honors-Spec-L10.md`, `HonorInstance-Architecture-v1.0.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `Honor-Detail-Sheet-Spec-L11.md`, and `Honor-Earned-Modal-Spec-M2.md` are all still written against the 53-type/7-category baseline — none reflect Competition (v1.1), Communities/Partnership-rename (v1.3), or Squad (v1.4). L-10 has no display-category fallback for 29 of the 82 LOCKED honor types. The audit also found a separate, never-merged "Expansion Pass" draft track (53→150 honors, unrelated growth path) sitting alongside the LOCKED catalog. Full roadmap (Phase 0–6) recorded in memory (`project_honors_expansion_audit`); not yet executed against any `Docs/` file. | Run the Phase 0 reconciliation pass (update all 5 docs for the 82-type/10-category catalog) before any further Honors authoring — PO has explicitly sequenced authoring behind this |
| 8 | **Canonical PRD** | Two PRD files coexist | Decide which is canonical, cross-link the other |
| 9 | **Community platform-level moderation escalation + AI moderation** | `Community-Roles-and-Moderation-v1.0` CRM-D6 explicitly builds only a self-moderation model (reports route to each community's own Owner/Admin/Moderator); there is no Forge-staff appeal path if a community's own moderators are unresponsive or complicit, and no AI moderation exists (explicit V1 exclusion) | Decide whether/when to design a platform-level escalation path; until then this is an acknowledged, not a silent, gap |
| 10 | **P-5 Notifications Wireframe drift** | The wireframe spec was never updated alongside the Architecture's Sections C (Challenges)/D (Friend Requests)/E (Communities) — discovered during this session's Squad reconciliation, flagged in the wireframe's §11, not resolved | Run a P-5 wireframe reconciliation pass covering Sections C/D/E (and the new Squad Section A rows are already current as of this session) |
| 11 | **Exercise Library data completeness** | `primaryMuscles`/`secondaryMuscles` assigned for all 195 rows (Phase 2 complete); `difficulty` assigned for all 195 rows (Phase 3 complete); media production standards defined (`Exercise-Media-Architecture-v1.0.md`, Phase 4, 2026-06-29) — adds a 5th field, `muscleTargetImageUrl`, as a new "Exercise Anatomy" schema group separate from the existing Media block (FORGE-required, CUSTOM-optional), plus production standards for all 5 fields (incl. a mandatory neutral-stance loop start/end rule for animations and a mandatory fixed-model/pose/camera consistency rule for muscle target images) and a collision-proof uuid-keyed naming convention; **actual media production (all 5 fields, all 195 exercises) remains entirely unstarted** — 0 of 195 rows have any media/anatomy field populated; 4 exercises use closest-available muscle enum by intentional V1 design (Adductor Machine/Butterfly Stretch → `HIP_FLEXORS`; Neck Mobility Flow → `SHOULDERS`; Lacrosse Ball Foot Release → `CALVES` — V1 does not distinguish adductors, cervical musculature, or intrinsic foot musculature, PO decision 2026-06-29); **naming-duplicate pairs resolved (Phase 5, 2026-06-30) — 0 remaining**, see `Exercise-Naming-Standard-v1.0.md`; one follow-up remains — the Strength Foundation II (4-Day) `.docx` package still prescribes bare "Step-Up" and needs a binary-file content correction; no row can flip `isActive: true` until media is also produced | Run media production pass against the Exercise-Media-Architecture-v1.0.md standard; correct the Strength Foundation II (4-Day) `.docx` "Step-Up" → "Box Step-Up" content before any exercise goes active |
| 12 | **"Strength Standard" sex-specific Honor selector — parked** | PO approved both absolute and relative-strength milestone systems for Honors (2026-06-29) but explicitly held open whether absolute Strength milestones should differentiate by sex, pending a separate, broader product decision: whether Forge collects a sex field anywhere else in the product. If one emerges naturally elsewhere, Honors should reuse it rather than add an Honors-only field. | Decide whether/where Forge collects a sex field at the product level; only then revisit this Honors-specific question |

---

## ✅ Recently Completed (last ~20 milestones)

Newest first. Never delete — trim only when over ~20.

1. **Forge Design System Architecture v1.0 — Engineering Governance Document** — Authored and LOCKED `Docs/Forge-Design-System-Architecture-v1.0.md` (2026-07-01). Permanent engineering authority for all Forge Legacy reusable UI component libraries — past, present, and future. 16 sections: Purpose (authority scope, document relationships), Design Philosophy (11 principles: premium dark / bronze accent / strong hierarchy / soft lighting / minimal clutter / mobile-first / React Native–Expo / reusable primitives / composition over duplication / accessibility first / consistency over customization), Component Hierarchy (4-level model: Design Tokens → Primitives → Composed → Screens, with hard cross-level dependency rules), Repository Structure (required folder layout, mandatory and optional files per library, what must not live in `forge/`), Component Rules (10 hard rules: tokens only / no hardcoded values / context-agnostic / props over content / accessibility required / dark-mode / composition over duplication / no business logic / no API calls / no navigation), Token Rules (global vs. component-helper token split, when to use each), Naming Standards (components / folders / props / private helpers / types / barrel exports / Animated.Value initialization), State Standards (11 states with visual treatment per state), Accessibility Standards (44dp minimum targets / contrast requirements / screen reader labels / focus visibility), Composition Rules (BaseCard as source of truth / specialized components compose primitives / no duplication / slots for flexibility / intra-library imports permitted / no forking), Export Standards (library barrel requirements / root forge index structure / one-name rule / no deep imports in screens), Validation Workflow (12-step sequence: design lock → DesignSync → implementation → TypeScript → lint → export verification → architecture check → targeted commit), Verification Checklist (9 checks any reviewer can run), Current Library Status (Design Tokens + Button v1.0 `2d20772` + Input v1.0 `d309b3b` + Card v1.0 `a91fea7`/`3ac04ce`), Roadmap (9 remaining libraries in priority order), Governance (amendment process, precedence rules, maintenance obligations). Complements `Component-Library-Architecture-v1.0.md` (behavioral contracts) and `Forge-Legacy-Design-System-v1.0.md` (visual identity).
1. **Card Library v1.0 LOCKED and committed** — Authored and committed 13 card components under `src/components/forge/cards/` (commit `a91fea7`; lint fixes `3ac04ce`). **`BaseCard`** is the shared surface primitive: border, radius, padding, top-edge inner-highlight, elevation shadow, `glowing` variant bronze glow, pressed/disabled/selected states. **12 specialized cards** compose BaseCard: `StatCard` (metric/trend), `ProgramCard` (family chip, difficulty dot, progress bar, state-adaptive CTA), `WorkoutCard` (set/rep/volume summary), `HonorCard` (`expo-linear-gradient` bronze tint when earned), `ChallengeCard` (participants, deadline, progress), `LegacyCard` (featured/achieved bronze orb — radial gradient approximation), `MediaCard` (full card surface managed independently — square media area, upload overlay), `FeedPostCard` (avatar, author row, content, reactions), `CompactListCard` (row + optional ForgeToggle/ForgeCheckbox — legitimate intra-library cross-import), `SectionCard` (collapsible with ChevronRight), `BannerCard` (self-dismissing via internal useState, 4 variants with `expo-linear-gradient` tinted backgrounds), `SkeletonCard` (5 variants: base/stat/media/feed/compact, opacity-pulse Animated.loop). Shared types in `types.ts`; card-scoped visual constants in `_cardTokens.ts`. Barrel-exported from `cards/index.ts`; composites/index re-exports `../cards`. TypeScript and lint clean at commit.
1. **Input Library v1.0 LOCKED and committed** — 10 input controls committed under `src/components/forge/inputs/` (commit `d309b3b`). `ForgeTextInput`, `ForgePasswordInput` (eye toggle), `ForgeSearchInput`, `ForgeTextArea`, `ForgeSelectInput`, `ForgeNumberInput`, `ForgeDateInput`, `ForgeCheckbox`, `ForgeRadioGroup`, `ForgeToggle`. Shared token helpers in `_inputTokens.ts`, state utilities in `_inputUtils.ts`, base types in `_types.ts`. All lint-clean (react-hooks/refs useRef→useState fix applied, no-empty-object-type aliases, exhaustive-deps corrected).
1. **Button Library v1.0 LOCKED and committed** — 6 button variants committed under `src/components/forge/buttons/` (commit `2d20772`). `PrimaryButton`, `SecondaryButton`, `GhostButton`, `DestructiveButton`, `IconButton`, `FloatingActionButton`. Scale/shake Animated.Value uses `useState` lazy initializer (lint-clean, semantically equivalent to useRef). All lint-clean.
1. **V1 Architecture Freeze officially FROZEN — Row 12 (Challenge filename/version) reconciled ✅ (2026-06-30)** — The final remaining In-Progress row is now ✅ Complete. **Reconciliation decision:** the `-v1.0` suffix in `Challenge-System-Architecture-v1.0.md` is the initial-publication filename, consistent with the project-wide convention (same pattern as `Exercise-Library-Architecture-v1.0.md` at internal v1.2, `Social-System-Architecture-v1.0` at v1.1, etc.). The internal version header and §19 Amendment Log track the current state (v1.5). **A versioning note** was added to the Status block of `Challenge-System-Architecture-v1.0.md`. **Stale authority references updated** in 10 downstream docs: C1/C2/C3/C4 footer authority lines (`v1.3` → `v1.0.md (v1.5)`); C5/C6/C7 header authority block + footer (`v1.1.md`/`v1.1` → `v1.0.md (v1.5)`); `Calendar-System-Architecture-v1.0.md` inline + footer (`v1.3` → `v1.0.md (v1.5)`); `Community-System-Architecture-v1.0.md` authority block, inline body, reconciliation table, and footer (`v1.3.md`/`v1.3` → `v1.0.md`/`v1.0.md (v1.5)`); `Social-System-Architecture-v1.0.md` authority block (`v1.3.md` → `v1.0.md (v1.5)`). Amendment files 002/003/004 left unchanged — they are historical records of what they were amending. No architectural decisions changed. The V1 Architecture Freeze is now officially **FROZEN** — implementation may begin.
2. **Standalone Rest Timer — V1 Architecture Freeze row 19 marked ✅ Complete** — Authored and LOCKED `Rest-Timer-Architecture-v1.0.md` (Freeze #19, Decision #4). 22 decisions (RT-D1–RT-D22). **Timer mechanism:** wall-clock differential (elapsed = current wall-clock time − `restStartTimestamp`); no background process required. **State machine:** INACTIVE / RUNNING / BACKGROUNDED / RECOVERABLE — covers foreground, backgrounding, app kill, and cold-launch recovery. **Single-timer rule (RT-D22):** only one active Rest Timer per workout session at any time. **ProgressRing component ownership transferred from CLA:** visual contract (arc, `accent.primary` fill, `surface.muted` track, 2–3dp stroke, 72–84dp, linear fill capped at 1.0, unmount when conditions not met), scope restriction (rest-timer-specific only). **Accessibility:** Reduce Motion → static arc; VoiceOver labels on timer and ring. **Notifications:** V1 deferred (framework defined; RT-OQ-1 flagged for PO). **Persistence:** `restStartTimestamp` + `workoutSessionId` durably persisted on start; cold launch recovery with session-ID match guard. **Future platform surfaces declared:** Live Activities/Dynamic Island, Apple Watch/Wear OS companion, home screen widget (all require dedicated amendment; wall-clock strategy and persisted timestamp are the only prerequisites). **4 non-blocking open questions:** RT-OQ-1 (background notification), RT-OQ-2 (notification permission), RT-OQ-3 (max duration display), RT-OQ-4 (catch-up animation on recovery). **Downstream reconciliation applied:** `Component-Library-Architecture-v1.0.md` §1.2/§1.3/§17 pointers updated; `Active-Workout-Flow-Spec-W9-W16.md` §7.6 architecture pointer added; `W9-Amendment-003-Optional-Rest-Progress-Ring.md` governance note updated. Closes Architecture Freeze Row 19 and Decision Queue #4 (2026-06-30).
2. **Component Library / Design System — V1 Architecture Freeze row 18 marked ✅ Complete** — Authored and LOCKED `Component-Library-Architecture-v1.0.md` (Freeze #18, Decision #5). 3-tier component hierarchy: **Tier 1 Primitives** (CLA-C01–C05: Text/Icon/Divider/ProgressFill/AvatarGlyph), **Tier 2 Composites** (CLA-C06–C24: Surface/Card/Button/Chip/Badge/Avatar/ProgressBar/SearchBar/InputField/TextArea/ListItem/SectionHeader/AppBar/TabBar/Modal/BottomSheet/Toast/Skeleton/EmptyState), **Tier 3 Screen-level** (CLA-C25–C37: ChapterCard through HomepagePrinciple). 6 governing principles (CLA-P1 Earned Visual Weight · CLA-P2 Accountability Without Shame · CLA-P3 Performance Firewall at Component Layer · CLA-P4 Every Element Earns Its Place · CLA-P5 Reduce Motion Is First-Class · CLA-P6 Components Own Behavior; Screens Own Composition). 20 CLA-D decisions. Surface/Card split: Surface (CLA-C06) = generic container; Card (CLA-C07) = Surface + 8dp radius + 16dp padding + elevation contract (Card IS-A Surface, does not contain Surface). Modal uses Surface (not Card) at `elevation.modal`. ProgressRing excluded — owned by Standalone Rest Timer Architecture (Freeze Row 19). PO-confirmed: dark-only V1, Phosphor Icons as sole icon library (brand bespoke excepted), system font (SF Pro/Roboto), WCAG 2.1 AA target, semantic tokens only (hex values deferred to Branding Assets doc). 17 wireframe specs + 2 architecture docs receive header pointer. Closes Architecture Freeze Row 18 and Decision Queue #5 (2026-06-30).
2. **Global Search — V1 Architecture Freeze row 17 marked ✅ Complete** — Authored and LOCKED `Global-Search-Architecture-v1.0.md` (Freeze #17, Decision #3). Establishes two independent search categories: **Catalog Search** (Exercises FORGE+CUSTOM, Programs FORGE+athlete-owned, HonorType catalog — all client-filterable) and **Discovery Search** (Profiles, Communities — server-indexed). Governing exclusivity rule: every entity belongs to exactly one category, never both. Explicit Never-Searchable list (Posts, WorkoutSessions, Challenge standings/results, Performance metrics, HonorInstances, private Chapters/Memories/Accomplishments, rest timer history). Adopts Performance Firewall principle (CC-D2) by architectural extension to this always-on surface (CC-D2 itself governs squad surfaces only — this document's own governing decision, not a CC-D2 restatement). Privacy filters: CUSTOM Exercise/athlete-owned Programs use `authorId = :searchingAthleteId` (ownership, not a setting); Communities delegate to COM-D5; Profiles use Identity-Amendment-001 §7.1 discoverability flag (owned by Identity, surfaced by P-6 Settings). Navigation rule: always navigates to the canonical screen — never creates an alternate detail screen. Search history: local-only, query strings only, no analytics. Future Expansion governance checklist (§16) requires all six dimensions (category, privacy model, ranking, navigation target, offline behavior, indexing strategy) to be defined before any new entity may participate. Full reconciliation: `Backend-Data-Model-Architecture-v1.0.1` §14 amended to add `ProgramDefinition` and `HonorType` indexable fields; `Community-Discovery-and-Search-v1.0` §6 updated to reference this document as the now-LOCKED Global Search authority. 3 items PO-confirmed at LOCK (HonorType browsability, sectioned-results UX, entry-point standalone screen); 3 items carried forward non-blocking (entry-point affordance UI deferred to future Search wireframe spec, Program private-by-default assumption low-risk confirmation pending, inherited block-user gap). Closes Architecture Freeze row 17 and Decision Queue #3 (2026-06-30).
2. **Rank — V1 Architecture Freeze row 15 marked ✅ Complete** — Audit found the Rank system was materially closer to LOCK-ready than the dashboard reflected: `Rank-System-Architecture.md` and `Rank-Computation-Model.md` (RCM) were already LOCKED, `Rank-Calibration-Decisions.md` had already resolved Q1–Q14, and TBD-2 (sub-tier surfacing) had already been resolved by the LOCKED `P-2-Progress-Hub-Spec.md` — none of this had been reflected back into the dashboard. The one genuinely open item, **TBD-11 (Legacy display format)**, was formally closed this session via a new `Rank-Computation-Model.md` → **v1.0.1** amendment: governed by the already-LOCKED `Rank-Up-Modal-Spec-M1.md` (ceremony + Timeline Event format) and `Legacy-Timeline-Wireframe-Spec-L2.md` (Legacy display), requiring no new computational decision. Also investigated and ruled out the `Backend-Data-Model-Architecture-v1.0.1` §20 "RANK_XP" open item as a Rank blocker — it is a **Challenge-system** type deferral (per Challenge-System-Architecture's own scope decision), not a Rank schema field; Backend §20 item 2 updated to reflect the RCM's now-LOCKED status instead of "~15 open TBDs." Added a superseded banner to `Rank-Implementation-Readiness-Review.md` noting all 8 of its originally-identified blockers are resolved. **All 16 Rank TBDs are now resolved or formally closed; no Rank build blockers remain.** Closes Architecture Freeze row 15 and Decision Queue #2 (2026-06-30).
2. **Backend / Data-Model Architecture — LOCKED** — `Backend-Data-Model-Architecture-v1.0.1` is the new governing data-model authority for the entire app. Firebase (Firestore + Auth + Storage + Functions) ratified as the stack after a 3-way comparative evaluation vs. Supabase and custom (offline-first requirement was decisive). 12 runtime services defined with single authoritative-writer boundaries. Full entity model: 20+ entities canonicalized and reconciled across ~20 previously-locked specs (Account/Athlete split, AuthSession/WorkoutSession naming, Chapter/Goal/HonorInstance canonical schemas, WorkoutSession.source vs HonorInstance.source distinction, Chapter.honors[] population rule, Goal.isPrimary as source of truth). Previously-undefined entities (`Profile`, `Subscription`, `EntitlementCounter`, `TimelineEvent`, `CeremonyQueueItem`, `Notification`, `NotificationPreference`, `PrivacySettings`, `AthleteShareSettings`) all schema'd or explicitly deferred to governing source docs. Logical/Physical Storage Model split means entity model survives a future stack change. API Philosophy (6 principles: server owns all progression, offline writes provisional, Firewall enforced at query layer). Scalability assumptions documented. 6 remaining open questions tracked in §20 of the doc (Rank TBDs, dual privacy systems, deletion policy branch, RANK_XP dependency, offline sync conflict resolution, community moderation escalation). Reconciliation pointers added to 7 downstream docs (Account-Auth-Architecture, Honor-Evaluation-Service-Architecture, Rank-Computation-Model, Exercise-Library-Architecture, Social/Squad-System-Architecture, Architecture-Amendment-001-Import). Closes Architecture Freeze row 16 and Decision Queue #1 (2026-06-30).
2. **Exercise Library — Phase 5: Naming Duplicate Resolution** — Resolved all 5 flagged naming-duplicate pairs in the Launch Catalog Blueprint, locking one canonical V1 name per pair: **Box Step-Up** (kills generic Step-Up), **Back Squat** (kills generic Squat — its authored content relocated to the existing "Bodyweight Squat" row rather than lost), **Front Plank** (kills generic Plank), **Barbell Romanian Deadlift** (kills generic Romanian Deadlift), **Barbell Bench Press** (kills generic Bench Press). Catalog drops from 200 to 195 exercises; anchor count drops from 45 to 44 (Squat/Back Squat was the one pair where both sides were independently anchor = Y). New `Exercise-Naming-Standard-v1.0.md` locks 4 naming principles (prefer specific over generic; include implement/variation when multiple exist; one canonical name per `ExerciseDefinition`; retired names become aliases/search terms only — aspirational pending a schema field) plus a governance rule that published canonical names are immutable except through an equivalent formal reconciliation pass. Reconciled into the Blueprint (§§1–8, totals/tables, Change Log v1.1), 7 Population Pass docs (`Anchor-Exercise-Population-Pass-01/02/03`, `Exercise-Population-Pass-04/05/06/09/12` — content rename/migration, relationship-array retargeting, zero broken references re-confirmed), `Exercise-Library-Architecture-v1.0` (→ R1-5), `Anchor-Exercise-Authoring-Framework-v1.0`, `Program-Authoring-Standard-v1.0`, `Exercise-Difficulty-Assignment-Pass-v1.0` (totals/distribution recomputed to 195/44), `Exercise-002-Exercise-Substitution-Architecture`, `Exercise-Media-Architecture-v1.0`, and illustrative wireframe-mockup text across `Active-Workout-Flow-Spec-W9-W16`, `W9-Amendment-002`, `W-19`, `Accomplishments-Wireframe-Spec-L12-L14`, `Exercise-Detail-Wireframe-Spec-W22`, `Exercise-Picker-Wireframe-Spec-W23`, `Workout-Builder-Wireframe-Spec-W24`, `Workout-Summary-Spec-W17`, `Workouts-Hub-Wireframe-Spec-W1`, `Home-Screen-Wireframe-Spec-H1`, `Squad-Detail-Wireframe-Spec-S2`, `Challenge-Detail-Wireframe-Spec-C3`, `Strength-Family-Research-v1.0`, `Muscle-Building-Family-Research-v1.0`, and `Exercise-Library-Production-Plan`. **One follow-up remains outside this pass's scope:** the Strength Foundation II (4-Day) `.docx` package still prescribes bare "Step-Up" in its Day-2 Main Workout rows and needs a binary-file content correction (2026-06-30).
2. **Honors System — Final V1 Architecture** — reconciled two previously-parallel, never-merged lineages: the locked `Honor-Catalog-v1.0-LOCKED.md` (v1.4, 82 types) and six unmerged Expansion Pass documents (Strength depth, Endurance, Consistency, Prestige) that a prior audit's blocker (no cardio data model) had obscured — that blocker was separately resolved by `Endurance-Statistics-Architecture-Amendment-001.md` (LOCKED) but nothing ever recorded it, so the Endurance category sat finished but invisible. New master synthesis doc `Honors-Architecture-V1-Final-v1.0.md` and companion `Honors-Authoring-Standards-v1.0.md` (defines the "Real Athlete Test," a 6-item QC checklist for all future Honor authoring). Merged into `Honor-Catalog-v1.0-LOCKED.md` → **v1.5**: Strength depth (Overhead Press, Pull-Up, +8); Training/Chapters/Goals/Programs/Longevity depth (+25); new **Endurance** category (38, Running/Walking/Cycling/Swimming only — Hiking/Rowing explicitly deferred pending an `ActivityType` enum amendment); new **Consistency** family (5, cumulative non-streak Active Weeks); new **Prestige** category (8, requires new pipeline step `[4.5]`); new **Hidden** category (6, zero new schema — reuses L-10's existing zero-count-is-invisible rule for free). Fixed a recurring family-count arithmetic error (header claimed 22, table summed to 25 at v1.4). **PO review removed two brand-new Strength families before final lock:** Sex-Specific Strength Milestones (12, sex-adaptive thresholds) and Relative Strength Milestones (12, bodyweight-ratio) were fully designed — thresholds checked for collisions, metadata shapes specified, evaluator logic written, two new optional Profile fields scoped — and then **deferred to V2 by explicit PO decision**, not a technical blocker. Full design preserved in `Honor-Catalog-v1.0-LOCKED.md` § DEFERRED TO V2 and `Honors-Architecture-V1-Final-v1.0.md` §3 for a future V2 pass. `Profile-Wireframe-Spec-P1.md` ships unchanged at v1.3 as a direct consequence. Reconciled into `Honor-Evaluation-Service-Architecture-v1.0` (→ v1.1, 4 new evaluator families merged, 2 more designed-and-deferred, PR storage extended to 5 lifts) and `HonorInstance-Architecture-v1.0` (→ v1.1, new metadata shapes). **Discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md`** (→ v1.1): §5.1 still showed only the original 7 display categories and 53-type total, never updated for the v1.1/v1.3/v1.4 Competition/Communities/Squad additions from prior sessions — now reflects the full 13-category/167-type list. Final V1 manifest: **167 honor types, 13 categories, 34 families**. 42 honors explicitly deferred (24 by PO scope decision, design-complete; 18 genuinely blocked — Hiking/Rowing Endurance, Comebacks & Resilience, Bodybuilding volume-PR family) — written, intentional gaps, no placeholder logic invented. **Architecture/schema only — no L-11 descriptive content authored for any merged honor type; that full-catalog content pass is the next, separate Honors workstream item** (2026-06-30).
2. **Exercise Media Architecture — Anatomical Model Neutrality Standard** — `Exercise-Media-Architecture-v1.0.md` → v1.1: added a mandatory §3.3 standard, "Anatomical model character," requiring the muscle target image's reference figure to remain intentionally generic and educational — explicitly barred from depicting body fat, muscularity/body composition, sex-specific anatomy, skin tone, or any other identifying athlete characteristic. Clarifies (does not replace) the existing cross-exercise consistency requirement (same model/pose/camera/framing across all 200 exercises). No schema change; standards-only, no media assets produced or assigned.
2. **Featured/Pinned Honors decision + P-1 Amendment 004 merge** — Decision recorded: Strength milestone Honors (225 Bench, 1,000 Club, etc.) remain ordinary Honors — no separate "Recognition Clubs" system exists or was introduced. "Featured Honors" is realized entirely through the existing, already-LOCKED `P-1-Amendment-004-Pinned-Legacy.md` mechanism (max 6, athlete-curated, reorderable, display-only, zero effect on rank/progression/scoring/eligibility) rather than a new parallel system — Honors confirmed as a first-class Pinned Legacy eligible type. Closed the long-standing reconciliation gap: Amendment 004 was LOCKED but never merged into its base document — `Profile-Wireframe-Spec-P1.md` → v1.3 now contains Tier 1B and a full Section 4A specifying the mechanism, with explicit language confirming Honors' first-class status and that no new reward type/flag/screen was added. Added a reciprocal pointer in `HonorInstance-Architecture-v1.0.md` (→ v1.0.1, §5.3). No Honor Catalog edit required (already compliant) (2026-06-29).
3. **Exercise Library Phase 4 — Media Architecture & Standards** — new governing doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group on `ExerciseDefinition` (kept separate from the existing Media block; bespoke per-exercise anatomical diagram, FORGE-required before `isActive: true`, CUSTOM-optional) and defines production standards for all 5 media/anatomy fields: resolution/aspect/duration/fps/file-size/codec for the GIF-primary looping asset and its video/image fallbacks, with a **mandatory rule that every looping animation begin and end in the same neutral stance** to guarantee a seamless loop; resolution/style/highlight-color-convention/format for the new muscle target image, with a **mandatory rule that every muscle target image use the exact same anatomical model, pose, camera angle, proportions, scale, and framing — only the highlighted musculature changes**; plus a uuid-keyed file/CDN naming convention chosen specifically to be collision-proof against the 5 known naming-duplicate pairs. Reconciled into Exercise-Library-Architecture (→ v1.2, schema + §8.1/§8.3/§16 updates), W-22 (→ v1.0 R2, new §6.3a/§6.3b placed within the Identity block per the locked content-order constraint — no top-level section reordering), Exercise-001 (→ v1.0 Media Field Reconciliation, §5.1/§5.2 CUSTOM field updates), W-28 (→ v1.0 Media Field Reconciliation, W28-D7 deferral note + excluded-fields list), and Anchor Authoring Framework (→ v1.0 Media Cross-Reference, fulfilling its own §7 "one-line confirmation" invitation). **Standards and schema only — zero exercise media assets produced or assigned; Decision Queue #11 remains open** (2026-06-29).
4. **Exercise Library Metadata Completion — Phase 3: Difficulty Assignment** — `difficulty` assigned to all 200 V1 exercises (`BEGINNER`/`INTERMEDIATE`/`ADVANCED`, locked enum) in new doc `Exercise-Difficulty-Assignment-Pass-v1.0.md`, organized by the same Category/MovementPattern structure as the Launch Catalog Blueprint. Rated on technical skill/safety/coordination/learning curve, not load capacity, with consistency enforced across exercise families (e.g., machine-supported squat variants = BEGINNER, free-weight bilateral/split-stance = INTERMEDIATE, single-leg/free-balance = ADVANCED). Validated distribution: 122 BEGINNER (61%) / 65 INTERMEDIATE (32.5%) / 13 ADVANCED (6.5%) = 200; per-category counts cross-checked against the Blueprint's category totals with zero omissions or double-assignments. 10 genuinely ambiguous cases (e.g., Nordic Hamstring Curl, Sissy Squat, Yoke Carry as ADVANCED outliers within otherwise-BEGINNER patterns) flagged and resolved with documented rationale. Does not modify muscle assignments, taxonomy, media fields, exercise names, or architecture. **Media is now the only unassigned `ExerciseDefinition` field across all 200 exercises** (2026-06-29).
5. **Exercise Library Metadata Completion — Phase 2: Muscle Assignment** — `primaryMuscles` and `secondaryMuscles` assigned to all 200 V1 exercises across 14 population-pass docs using the locked 14-value `MuscleGroup` taxonomy. All 200 exercises satisfy the 1–4 primary / 0–4 secondary cardinality rule; zero invalid enum values; zero exercises missing a primary muscle. Architecture §5.3 canonical examples verified: Deadlift = `[LOWER_BACK, GLUTES]` primary / `[HAMSTRINGS, CORE]` secondary; Plank = `[CORE]` primary / `[LOWER_BACK]` secondary. Four exercises use closest-available enum by intentional V1 design (Adductor Machine → `HIP_FLEXORS`; Butterfly Stretch → `HIP_FLEXORS`; Neck Mobility Flow → `SHOULDERS`; Lacrosse Ball Foot Release → `CALVES`) — V1 does not distinguish adductors, cervical musculature, or intrinsic foot musculature (PO decision 2026-06-29). Remaining unassigned fields at the time: `difficulty`, all four media URLs. No architecture or schema change (2026-06-29).
6. **Exercise Library Metadata Completion — Phase 1: Muscle Taxonomy Lock** — verified the existing LOCKED 14-value `MuscleGroup` taxonomy (`Exercise-Library-Architecture-v1.0.md` §5) is canonical and sufficient to classify all 200 V1 catalog exercises; reconciled a brief calling for a singular-required primary + 0–5 secondary cardinality against the locked 1–4 primary array / 0–4 secondary array rule and **kept the locked rule unchanged** (owner decision, 2026-06-29) rather than reopening the W-22 display contract. Repo-wide audit found zero synonym conflicts and zero cardinality inconsistencies across all architecture/wireframe/population-pass docs. Fixed a cosmetic-only inconsistency in `Exercise-Picker-Wireframe-Spec-W23.md` §14.1/§15.2 (ASCII mockups used informal "Arms"/"Legs" groupings not in the 14-value enum). New doc: `Exercise-Library-Muscle-Taxonomy-Readiness-Report-v1.0.md` — verdict GO, taxonomy ready for the per-exercise assignment pass. **No schema or architecture amendment was needed** (2026-06-29).
7. **Homepage Principles system (V1 Architecture Freeze row 21)** — LOCKED; new governing doc `Homepage-Principles-Architecture-v1.0` establishes the Homepage Principle as a **digital inscription, not a motivational widget** — quiet reflection, not motivation — placed on Home (H-1) below the status area and above the primary action cards, explicitly not a sixth H-1 tier; deterministic per-athlete-and-day rotation (same entry on every device) with a 14-day no-repeat window and graceful fallback; never AI-generated at runtime (HP-D11); states no fixed entry count so it cannot go stale (HP-D10 — `Homepage-Principles-Library-v1.0` is the single source of truth for counts; existing entries may be revised or retired in future versions if they no longer satisfy the Editorial Standard). Canonical content (105 Principles + 22 Reflection Questions, imported verbatim from the approved design session) ships in the companion Library doc. Reconciled into `Home-Screen-Wireframe-Spec-H1` (→ v1.2) and the Master PRD Amendment Log (2026-06-29).
8. **Exercise Library V1 Freeze reconciliation + audit pass** — Phase 1 fixed 5 categories of documentation drift across the Exercise Library doc set: canonicalized `ExercisePrescription` field names (`setsTarget`/`repsTarget`/`weightTarget` → `sets`/`reps`/`weightValue` in Exercise-001); corrected the stale "Hypertrophy (3)" validation-checklist line in Exercise-Library-Architecture (now Hypertrophy (5), Cycling (0), Combat (0), Full Body/Home (5) = 24, matching Program-Ecosystem-Architecture); removed a stray "Hinge" 7th-row from W-23's category list (HINGE is a MovementPattern, not one of the 6 locked ExerciseCategory values); fixed header/footer version-stamp drift in Program-Authoring-Standard (v1.1→v1.3), Active-Workout-Flow-Spec-W9-W16 (v1.4→v1.5), and Workout-Builder-Wireframe-Spec-W24 (v1.0→v1.2, newly discovered); found and fixed a real locked-vs-locked contradiction — W-23 showed a visible tap-to-toggle heart icon that directly violated Exercise-003's EX-003-D4 (no visible favorite icon on W-23 rows; long-press contextual action sheet only); fixed inaccurate "W-21 has an inline creation sheet" wording in W-28; fixed a stray "W-24" reference in Exercise-003 that should have read "W-28". Phase 2 audited the 200-exercise catalog: confirmed zero broken relationship references (automated cross-check of every progression/regression/alternative target against the canonical 200-name Blueprint), confirmed all 6 categories/21 movement patterns/18 equipment tags populated within locked ranges, but found 2 previously-unflagged naming-duplicate pairs (Romanian Deadlift/Barbell Romanian Deadlift, Bench Press/Barbell Bench Press — corrected into the Launch Catalog Blueprint's own duplicate registry, now 5 pairs not 3) and confirmed `primaryMuscles`/`secondaryMuscles`/`difficulty`/media are unassigned for all 200 rows. **Verdict: NOT marked V1 COMPLETE/FROZEN** — architecture remains ✅ (Freeze row 7, unchanged), but the exercise data layer needs a muscle/difficulty/media assignment pass before any row can go active (2026-06-29).
9. **Squad System Architecture** — LOCKED; new governing doc `Squad-System-Architecture-v1.0` locks Squad Goals, Missions, daily Check-ins (+ optional video), Squad Streak, Squad Momentum, Weekly Summary, Squad Feed, Honors integration (new 15-type `SQUAD` Honor Catalog category), inline Competition standings, Notifications, Analytics, and Commitment. **Deliberately lifts the Performance Firewall for Squad-internal surfaces only**, superseding `Squad-Architecture-Amendment-001`/`002` and WSR-001's bounded Check-ins model for S-1/S-2 (Friends Feed/Communities/Calendar Firewall unchanged). Reconciled into S-1 → v1.4, S-2 → v1.6 (major layout: Goal/Mission/Check-ins/Feed/Competitions/Honors/Analytics sections), S-3 → v1.3 (Commitment field, Goal/Mission edit rights), Honor Catalog → v1.4, P-5 Notifications → v1.4 (Arch + Wireframe), Challenge-System-Architecture → v1.5 (CS-D2/CS-D22 narrowed for SQUAD-context) (2026-06-29).
10. **Communities subsystem (V1 Architecture Freeze row 20)** — LOCKED; fourth relationship pillar (Legacy/Friends/Squads/**Communities**). 4 new governing docs (`Community-System-Architecture-v1.0`, `Community-Feed-Specification-v1.0`, `Community-Discovery-and-Search-v1.0`, `Community-Roles-and-Moderation-v1.0`) + 5 reconciliation amendments applied directly into their target documents: Social-System-Architecture → v1.1 (Communities peer layer + Post audience extension), Challenge-System-Architecture → v1.4 (new `COMMUNITY` roster context, reusing the existing engine), Honor Catalog → v1.3 (found + fixed a `COMMUNITY`/`COMMUNITIES` category-name collision; +5 honors), P-5 Notifications → v1.3 (Section E), Monetization Amendment 001 (+Amendment 002, 1 free / unlimited premium community memberships), Master PRD §6/§19 (Home entry point, not a 5th tab) (2026-06-29).
11. **Workout Playlist Amendment 001** — LOCKED; optional Spotify/Apple Music playlist link attachable to a workout (no playback/sync/API integration in V1); merged into Active-Workout-Flow-Spec-W9-W16 (→ v1.5), Workout-Summary-Spec-W17 (→ v1.3), Activity-Detail-Wireframe-Spec-W19 (→ v1.4), and WSR-001 (→ v1.1) (2026-06-29).
12. **W9-Amendment-003 (Optional Rest Progress Ring)** — LOCKED; Active-Workout-Flow-Spec-W9-W16.md → v1.4; thin bronze ring fills (never drains) toward an opt-in personal or program `restSeconds` reference; off by default; preserves the count-up-only "Accountability Without Shame" rest philosophy (2026-06-29).
13. **Master Status dashboard** — refactored this file into the permanent project dashboard (2026-06-29).
14. **Repository Status Audit** — full code+docs audit; confirmed code = 0%, docs ~95% (2026-06-29).
15. **Pinned Legacy (P-1 Amendment 004)** — LOCKED; new Tier 1B reference-only PinnedLegacyItem. (Merged into base `Profile-Wireframe-Spec-P1.md` this session — see entry #1.)
16. **Challenge System** — private opt-in squad ranked competition; 4 LOCKED amendments.

---

## 🎯 Next Milestones (prioritized roadmap)

Only the highest-value remaining work. Each milestone gates the next.

```
✅ COMPLETED MILESTONE — V1 Architecture Freeze DECLARED FROZEN (2026-06-30)
   └─ All 21 Freeze rows ✅ Complete
   └─ Challenge filename/version reconciled ✅
   └─ Backend, Rank, Global Search, Rest Timer, Component Library, Communities, Homepage Principles — all LOCKED

▶ CURRENT MILESTONE — Implementation Preparation
   └─ Run the Amendment Reconciliation pass (P-1, O-2, Pinned Legacy merged)
   └─ Lock W-19 Activity Detail
   └─ Decide canonical PRD
   └─ Decide `.docx` → app-data conversion approach
        ↓
■ NEXT MILESTONE — App Skeleton (code begins)
   └─ `npm run reset-project`; auth-gated tab IA + persistence layer
   └─ First vertical slice: Auth/Onboarding → Workout Logger → Active Workout → Exercise Library
        ↓
□ FUTURE MILESTONE — Content & Systems
   └─ `.docx` → app-data conversion; author remaining 20 programs + ~200 exercises
   └─ Honors → Rank → Legacy systems; then Social/Competitive; then Settings/Notifications/Search
```

> **Note:** Code milestones are listed for sequencing only. **Do not start code or backend architecture until explicitly authorized.**

---

## 📈 Project Statistics

| Statistic | Count |
|---|---:|
| Total documentation files (`Docs/*.md` + Amendments) | 230 (+1 this session: `Rest-Timer-Architecture-v1.0.md`) |
| LOCKED documents | ~150 |
| Amendments (`Docs/Amendments/`) | 26 |
| Remaining architecture docs to author (infra) | 0 — all Architecture Freeze rows ✅ or In Progress |
| Program packages authored | ~4 of 24 |
| Program family folders populated | 1 of 9 |
| Exercises authored as data | 195 content-authored / `primaryMuscles`+`secondaryMuscles`+`difficulty` assigned for 195 / media production standards defined (5 fields) but 0 schema-complete (media unassigned) / 0 active, of ~195 |
| Honors defined (catalog) / authored as data | 167 / 0 (+24 PO-deferred, +18 genuinely blocked) |
| Honor / badge artwork produced | 0 of 81+ |
| Screens specified (MVP) | ~80 |
| Product feature areas (specced / coded) | 22 / 0 |
| Git commits (feature-code commits) | 6 (0) |
| Tests | 0 |

---

## 📋 Repository Evidence Snapshot

| Metric | Value |
|---|---|
| `Docs/*.md` specs (root) | 202 (+1 this session: `Component-Library-Architecture-v1.0.md`) |
| `Docs/Amendments/*.md` | 26 |
| **Total markdown specs** | **228** |
| Docs with `**Status:** LOCKED` (incl. `**LOCKED**`) | ~150 |
| Docs `Lock-Ready` / `Lock Candidate` | ~12 |
| Docs `DRAFT` | ~7 |
| Evaluation / audit / research docs (non-spec status) | ~30 |
| Program packages (`.docx`) | 19 files / 4 populated packages (Strength only) |
| Program family folders | 9 (Strength populated; 8 empty) |
| `src/` files | 19 — **all stock Expo Router starter** |
| Git commits | 6 (1 Expo setup + 5 docs/program) — **zero feature code** |
| Tests | None |
| Backend / DB / schema / migrations | None |

---

## 🔁 Duplicate / Superseded Docs

| Doc | Status | Action |
|---|---|---|
| `First-Chapter-First-Goal-Wireframe-Spec-O3.md` | Superseded by `Onboarding-First-Time-Journey-Architecture-v1.0` | Mark superseded header / archive |
| `P-3-Retirement-Amendment.md` + any P-3 Rank Detail refs | P-3 **RETIRED**; P-2.2 is sole rank-depth destination | Ensure no live refs remain |
| `Powerbuilding-Intermediate-Blueprint-v1.0.md` | Retired per `Program-Ecosystem-Amendment-001` | Mark retired |
| Pre-rename "Hypertrophy" naming (`Programs/Hypertrophy/` folder) | Renamed to **Muscle Building** (Amendment 001) | Folder name still stale |
| `FORGE_LEGACY_PRD.md` vs `Forge-Legacy-Master-PRD.md` | Two PRD files coexist | Confirm one is canonical / cross-link (Decision Queue #8) |
| Challenge architecture filename vs internal version | ✅ Reconciled 2026-06-30 — `-v1.0` is the initial-publication filename (project convention); internal version v1.5 tracked in header + Amendment Log; versioning note added to doc; all downstream authority references updated | None — resolved |
| `Squad-Architecture-Amendment-001`/`002` | **Superseded for Squad-internal surfaces** by `Squad-System-Architecture-v1.0` (banner added to both files this session; SA-D3/SA2-D3 reinforced, not superseded) | None — banner is the resolution; files retained for historical record |
| `WSR-001-Workout-Share-Result-Architecture.md` §6.1–§6.4 | **Superseded for Squad surfaces** — the bounded share-triggered Check-ins model replaced by the persistent Today's Check-ins card + Squad Feed (`Squad-System-Architecture-v1.0` SQ-D5); rest of WSR-001 unaffected | None — banner added this session (→ v1.2); section retained for historical record |

> No **code** duplication exists (there is no code). All duplication is doc-side superseded specs lingering alongside their replacements.

---

## 🧩 Amendments Not Reconciled Into Parent Docs

Recurring pattern: **"amendment LOCKED but never merged into base doc."**

- **P-1 Profile** — Amendments 001 (Progress Entry), 002 (Athlete-Type Editability), 003 (Consolidated Correction) merged previously; **004 (Pinned Legacy) merged this session** (`Profile-Wireframe-Spec-P1.md` → v1.3 — Tier 1B + Section 4A, Honors confirmed as a first-class pinnable type). Memory previously noted a LOCKED-vs-LOCKED type-model contradiction here — re-verify on next P-1 touch.
- **O-2** — Amendments 001 + 002 (Athlete-Type) separate from base spec.
- **W-3** — Amendment 001 (per memory) already satisfied in v1.6; verify base reflects it.
- **W-9** — Amendments 001 + 002 (Builder/Active integration, Substitution) integrated per memory; confirm base text current.
- **Rank Computation Model** — Amendment 001 LOCKED; verify merged (lock-audit done).
- **Muscle Building Rename** — Amendment 001 EXECUTED in docs, but `Programs/Hypertrophy/` folder + enum still carry old name (enum `HYPERTROPHY` intentionally kept).
- **Honor Catalog Amendment 001 (Challenge Honors)** — catalog additions LOCKED; confirm folded into `Honor-Catalog-v1.0-LOCKED.md`.

> Reference audits already in repo: `Forge-Legacy-Amendment-Reconciliation-Audit.md`, `Immediate-Repository-Correction-Pass.md`.

> **Counter-example, this session:** the 5 Communities reconciliation amendments (Social-Architecture-001, Challenge-Architecture-004, Honor-Catalog-002, P-5-002, Monetization-002) were each **merged directly into their target document** (version bumped, sections edited, change log updated) in the same pass that locked the amendment file — not left as a separate file pointing at an unedited base doc. This is the discipline the recurring pattern above is missing; it is called out here as the model to repeat for future amendments.

---

## 🕳️ Unresolved Documentation Gaps

1. ~~**App-wide data-model / backend / persistence architecture**~~ — **RESOLVED.** `Backend-Data-Model-Architecture-v1.0.1` LOCKED (2026-06-30).
2. ~~**Rank build blockers**~~ — **RESOLVED.** All 16 TBDs closed; RCM LOCKED v1.0.1; Architecture Freeze row 15 ✅ Complete (2026-06-30).
3. ~~**Standalone Rest Timer spec**~~ — **RESOLVED.** `Rest-Timer-Architecture-v1.0.md` LOCKED (2026-06-30); Architecture Freeze Row 19 ✅ Complete.
4. ~~**Global Search spec**~~ — **RESOLVED.** `Global-Search-Architecture-v1.0.md` LOCKED (2026-06-30); entry-point wireframe spec still needed (deferred, non-blocking).
~~5. **Component-library / design-system spec**~~ — **RESOLVED.** `Component-Library-Architecture-v1.0.md` LOCKED (2026-06-30); Architecture Freeze Row 18 ✅ Complete.
6. **`.docx` → app-data conversion approach** — programs authored as Word prose with no defined path to structured data.
7. **Activity Detail (W19)** — lock-candidate, not yet LOCKED.
8. **Program catalog content** — 20 of 24 packages unwritten (8 empty family folders).
9. **Exercise content** — all 195 catalog rows narrative-authored (content; reduced from 200 by the 2026-06-30 naming-duplicate reconciliation); `primaryMuscles`/`secondaryMuscles` (Phase 2) and `difficulty` (Phase 3) assigned for all 195; **media is the only remaining unassigned field**, so 0 of 195 are schema-complete and 0 are `isActive: true`. Naming-duplicate pairs resolved (Phase 5) — 0 remaining (Decision Queue #11).
10. **Community platform-level moderation escalation + AI moderation** — `Community-Roles-and-Moderation-v1.0` CRM-D6 builds only a self-moderation model; no Forge-staff appeal path and no AI moderation exist yet (explicit V1 exclusion). Acknowledged, not silent — see Decision Queue #9.
11. **Community wireframes** — no pixel-layout spec authored yet; Communities is architecture-only as of this pass.
12. **L-10 pre-existing staleness (partial)** — this session fixed §5.1's category table and §18's checklist (both were still showing the original 7 categories / 53 types despite the catalog already being at 82/10 last session). §3's ASCII mockup and §7.2's per-category sort-order subsections remain unbackfilled for Partnership/Competition/Communities/Squad — a separate, smaller, still-open gap.
13. **Honors content-authoring pass** — `Honors-Architecture-V1-Final-v1.0` defines all 167 V1 honor types (IDs, categories, thresholds) but authors no L-11 descriptive content; that pass is the next Honors workstream item, governed by `Honors-Authoring-Standards-v1.0`'s Real Athlete Test.
14. **Honors explicit deferrals** — two kinds, tracked separately: (a) **PO scope decision** — Sex-Specific Strength Milestones and Relative Strength Milestones (24 honors, design-complete, ready to merge as-is — see `Honor-Catalog-v1.0-LOCKED.md` § DEFERRED TO V2); (b) **genuinely blocked** — Hiking/Rowing Endurance (18 honors, content-ready, blocked on an `ActivityType` enum amendment), Comebacks & Resilience (0 honors, no gap-tracking statistic exists), Bodybuilding volume-PR family (0 honors, no volume-tracking statistic exists). All written, intentional deferrals, not silent gaps; see `Honors-Architecture-V1-Final-v1.0.md` §9.

---

## 🧹 Housekeeping (stray files to remove)

Non-spec artifacts present in the working tree (verified):
- `Scratch/temp_SF1-3D.txt`, `temp_SF1-4D.txt`, `temp_SF2-3D.txt`, `temp_SF2-3D_full.txt`, `temp_SF2-4D.txt`, `temp_catalog_index.txt`
- root `index_extract_tmp.txt`
- `_repo-audit/duplicate-filenames.csv`, `file-inventory.csv`, `messy-file-names.csv`

> Not deleted in this pass (audit-only). Recommend removing before next commit.

---

## ⚠️ Known Risks

**🔴 High**
- **Content backlog** — 20 programs + ~200 exercises + 81 honors-as-data + artwork unwritten; content can become the critical path even after code starts.

**🟡 Medium**
- **Amendment reconciliation lag** — recurring "LOCKED but not merged" pattern (esp. P-1) risks contradictory specs guiding the build; P-1 has a LOCKED-vs-LOCKED type-model contradiction.
- **No `.docx` → app-data path** — programs authored as Word prose with no defined ingestion approach.
- **Two coexisting PRDs** — ambiguity over the canonical source.
- **No component-library contract** — risks inconsistent UI once code begins.
- **Community moderation escalation gap** — self-moderation only (community's own Owner/Admin/Moderator); no Forge-staff appeal path or AI moderation exists yet (acknowledged, Decision Queue #9).

**🟢 Low**
- **Cosmetic stale text** (e.g. P-4 "Account/Auth doesn't exist").
- **Stray working-tree files** (`Scratch/temp_*`, `_repo-audit/*.csv`, `index_extract_tmp.txt`).
- **Stale folder name** `Programs/Hypertrophy/` post Muscle-Building rename.
- ~~**Challenge filename/version mismatch**~~ — **RESOLVED 2026-06-30** (Row 12 reconciliation).

---

## 🎯 Success Criteria

### V1 Ready for Development
- [x] Backend / Data-Model / Persistence architecture authored & LOCKED — `Backend-Data-Model-Architecture-v1.0.1` (2026-06-30)
- [x] Rank readiness resolved — all 16 TBDs closed; RCM LOCKED v1.0.1 (2026-06-30)
- [x] Global Search architecture authored & LOCKED — `Global-Search-Architecture-v1.0.md` (2026-06-30)
- [x] Rest Timer and Component Library specs authored — `Rest-Timer-Architecture-v1.0.md` LOCKED (2026-06-30); `Component-Library-Architecture-v1.0.md` LOCKED (2026-06-30)
- [x] All 21 Architecture Freeze rows ✅ or explicitly deferred (**FROZEN**) — ✅ **FROZEN 2026-06-30** — all 21 rows complete
- [ ] Amendment reconciliation pass complete (P-1, O-2, Pinned Legacy merged)
- [ ] Canonical PRD chosen; ~~Challenge filename/version reconciled~~ ✅ done 2026-06-30
- [x] L-10 honor-category fallback resolved (this session — §5.1/§18 updated to the full 13-category list)
- [ ] W-19 LOCKED
- [ ] `.docx` → app-data conversion approach decided

### V1 Ready for Alpha
- [ ] App skeleton built (auth-gated tab IA + persistence layer; starter removed)
- [ ] First vertical slice working: Auth/Onboarding → Workout Logger → Active Workout → Exercise Library
- [ ] Core data persists across sessions (real DB wired)
- [ ] Program catalog content authored (≥ first families) + ingested as data
- [ ] Exercise library populated as data (initial launch set)
- [ ] Honors → Rank → Legacy systems functional end-to-end
- [ ] Test framework in place with coverage on core flows
- [ ] Deployable build (CI + distribution channel) established

---

## 📝 Change Log

Newest first. One line per dashboard revision.

- **v1.18 — 2026-06-30** — **V1 Architecture Freeze officially FROZEN.** Challenge filename/version mismatch (Row 12) reconciled: filename convention documented in `Challenge-System-Architecture-v1.0.md` Status block (versioning note added); stale authority version references updated in 10 downstream docs (C1–C7 footer/header authority lines; Calendar-System-Architecture-v1.0.md; Community-System-Architecture-v1.0.md; Social-System-Architecture-v1.0.md). No architectural decisions changed. All 21 Architecture Freeze rows now ✅ Complete. Updated: Freeze table Row 12 (✅ Complete), Freeze status declaration (FROZEN), Competitions/Challenges Documentation Status item (✅), Duplicate/Superseded Docs row (resolved), Known Risks 🟢 item (struck), Sprint task ticked, Success Criteria checkbox ticked, Dashboard Architecture (~98%→~100%), Project Health Architecture row, Current Focus/Biggest Blocker/Last Updated snapshot, OVERALL health row, Next Milestones (restructured), Recently Completed (added #1), Change Log.
- **v1.17 — 2026-06-30** — Standalone Rest Timer V1 Architecture Freeze complete: `Rest-Timer-Architecture-v1.0.md` authored and LOCKED by PO. 22 decisions (RT-D1–RT-D22): wall-clock differential timer strategy (no background process), 4-state machine (INACTIVE/RUNNING/BACKGROUNDED/RECOVERABLE), single-timer-per-session rule, ProgressRing component contract (accent.primary fill, surface.muted track, 2–3dp, 72–84dp, unmount-not-hide, scope-restricted), Reduce Motion static-arc accessibility, cold-launch recovery with session-ID guard, V1 notifications deferred (framework defined), future platform surface declarations (Live Activities, Watch, widget). Downstream reconciliation applied to `Component-Library-Architecture-v1.0.md` (§1.2/§1.3/§17 — "forthcoming" pointers updated to LOCKED), `Active-Workout-Flow-Spec-W9-W16.md` (§7.6 architecture pointer added), `W9-Amendment-003-Optional-Rest-Progress-Ring.md` (governance note updated). Closes Architecture Freeze Row 19 and Decision Queue #4. Updated Dashboard (Architecture ~98%), Freeze status (0 Missing + 1 In Progress), Current Focus/Biggest Blocker/Last Updated snapshot, Project Health Architecture row, Sprint task ticked, Documentation Status Standalone Rest Timer item, Decision Queue #4 struck, Unresolved Gaps #3 struck, Success Criteria checkbox ticked, Project Statistics (+1 doc, +1 LOCKED, 0 infra remaining), Recently Completed (added #1), Next Milestones, Change Log.
- **v1.16 — 2026-06-30** — Global Search V1 Architecture Freeze complete: `Global-Search-Architecture-v1.0.md` authored, verified, repaired, and LOCKED by PO. Establishes Catalog Search (Exercises/Programs/HonorType catalog — client-filterable, ownership-filtered) and Discovery Search (Profiles/Communities — server-indexed, discoverability-flag-filtered) as two independent, mutually-exclusive search categories. Explicit Never-Searchable list. Performance Firewall principle adopted by architectural extension. Full reconciliation: `Backend-Data-Model-Architecture-v1.0.1` §14 amended to add `ProgramDefinition` and `HonorType` indexable fields; `Community-Discovery-and-Search-v1.0` §6/header/Non-Behaviors updated to reference this document as the Global Search authority it previously called "still open." Closes Architecture Freeze row 17 and Decision Queue #3. Updated Dashboard (Architecture ~96%), Freeze status (2 Missing + 1 In Progress), Current Focus/Biggest Blocker/Last Updated snapshot, 30-second read, Health table Architecture row, Sprint task ticked, Global Search Documentation Status (new subsection) + Infrastructure subsection updated, Decision Queue #3 struck, Unresolved Gaps #4 struck, Next Milestones, Success Criteria, Recently Completed (added #1, trimmed oldest 3 entries to hold ~20 cap), Project Statistics (228 docs, ~148 LOCKED, 2 infra docs remaining), Repository Evidence Snapshot (201 root specs, 227 total, ~149 LOCKED), Change Log.
- **v1.15 — 2026-06-30** — Rank V1 Architecture Freeze readiness audit complete: Rank marked **✅ Complete** (Freeze row 15). Audit found `Rank-System-Architecture.md`, `Rank-Computation-Model.md` (RCM), and `Rank-Calibration-Decisions.md` were all already LOCKED but the dashboard had never been updated to reflect it. Formally closed the one remaining genuine gap, **TBD-11 (Legacy display format)**, via new `Rank-Computation-Model.md` → v1.0.1 amendment (governed by already-LOCKED M-1 + L-2, no new computation required). Verified `Backend-Data-Model-Architecture-v1.0.1` §20's "RANK_XP" open item is a Challenge-system type deferral, not a Rank schema conflict — updated §20 item 2 to remove stale "~15 open TBDs" language. Added a superseded banner to `Rank-Implementation-Readiness-Review.md` (its 8 originally-identified blockers are all resolved). Closes Decision Queue #2. Updated Dashboard (Architecture ~95% note), Freeze status (3 Missing + 1 In Progress), Current Focus/Biggest Blocker/Last Updated snapshot, 30-second read, Sprint task ticked, Rank System documentation subsection, Decision Queue #2 struck, Unresolved Gaps #2 struck, Known Risks (removed Rank 🔴 High item), Next Milestones, Success Criteria, Recently Completed (added #1), Change Log.
- **v1.14 — 2026-06-30** — Backend / Data-Model Architecture LOCKED. `Backend-Data-Model-Architecture-v1.0.1` authored, audited, repaired, and locked by PO. Closes Architecture Freeze row 16 and Decision Queue #1. Updated Dashboard (Architecture ~95%, Backend 100%), Freeze status (3 Missing + 2 In Progress), Current Focus/Biggest Blocker snapshot, 30-second read, Infrastructure architecture section, Recently Completed (added #1), Sprint task ticked, Change Log.
- **v1.13 — 2026-06-30** — Exercise Library Phase 5 (Naming Duplicate Resolution) complete: resolved all 5 flagged naming-duplicate pairs, locking one canonical V1 name per pair — Box Step-Up, Back Squat (content relocated to "Bodyweight Squat" rather than lost), Front Plank, Barbell Romanian Deadlift, Barbell Bench Press. Catalog reduced 200→195 exercises; anchors reduced 45→44 (Squat/Back Squat was the only pair where both sides were independently anchor=Y). New `Exercise-Naming-Standard-v1.0.md` locks 4 naming principles plus a governance rule that published canonical names are immutable except through an equivalent formal reconciliation pass. Reconciled into `Exercise-Library-Launch-Catalog-Blueprint-v1.0` (§§1–8, Change Log v1.1), 7 Population Pass docs (relationship-array retargeting, zero broken references re-confirmed), `Exercise-Library-Architecture-v1.0` (→ R1-5), `Anchor-Exercise-Authoring-Framework-v1.0`, `Program-Authoring-Standard-v1.0`, `Exercise-Difficulty-Assignment-Pass-v1.0` (totals recomputed to 195/44), `Exercise-002-Exercise-Substitution-Architecture`, `Exercise-Media-Architecture-v1.0`, and illustrative wireframe-mockup text across 11 W-series/research docs. Updated Content Status Exercise Library row, Decision Queue #11, Unresolved Gaps #9, Project Statistics (doc count 226→227, exercise count 200→195), Dashboard summary, Recently Completed (added #1). **One follow-up remains outside this pass's scope:** the Strength Foundation II (4-Day) `.docx` package still prescribes bare "Step-Up" and needs a binary-file content correction.
- **v1.12 — 2026-06-30** — Honors System Final V1 Architecture complete: reconciled the locked v1.4 catalog (82 types) with six previously-unmerged Expansion Pass documents into `Honor-Catalog-v1.0-LOCKED.md` v1.5 (167 types / 13 categories / 34 families), via new master synthesis doc `Honors-Architecture-V1-Final-v1.0.md` and companion `Honors-Authoring-Standards-v1.0.md` (Real Athlete Test). Merged Endurance (38, Running/Walking/Cycling/Swimming only), Consistency (5), and Prestige (8, new pipeline step [4.5]); added Hidden category (6, zero new schema). Fixed a recurring family-count arithmetic error. Reconciled into `Honor-Evaluation-Service-Architecture-v1.0` (→ v1.1) and `HonorInstance-Architecture-v1.0` (→ v1.1). Discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md` (→ v1.1, still showed 7 categories/53 types despite the catalog being at 82/10 before this pass). **Approved with one modification:** two new Strength families designed in this pass — Sex-Specific Strength Milestones, Relative Strength Milestones (24 types) — were deferred to V2 by PO decision before final lock; full design preserved in `Honor-Catalog-v1.0-LOCKED.md` § DEFERRED TO V2; `Profile-Wireframe-Spec-P1.md` ships unchanged at v1.3 as a result (the two Profile fields they required are deferred alongside them). 42 honors total explicitly deferred (24 by PO scope decision, 18 genuinely blocked — Hiking/Rowing Endurance, Comebacks & Resilience, Bodybuilding volume-PR), no placeholder logic invented. Updated Honors architecture/content rows, Decision Queue / Unresolved Gaps list (resolved L-10 fallback item, added 3 new tracked items), Project Statistics, Repository Evidence Snapshot, Recently Completed (added #1, trimmed oldest to hold the ~20 cap). Architecture/schema only — zero L-11 descriptive content authored for any merged honor type.
- **v1.11 — 2026-06-30** — `Exercise-Media-Architecture-v1.0.md` → v1.1: added a mandatory anatomical-model-neutrality standard to §3.3 — the muscle target image's reference figure must remain generic/educational and must not depict body fat, muscularity, sex-specific anatomy, skin tone, or other identifying athlete characteristics. Standards-only; no schema change, no assets produced. Added Recently Completed #1 (trimmed oldest entry to hold the ~20 cap).
- **v1.10 — 2026-06-29** — Recorded a full Honors System V1 Completion Audit (architecture/audit only, no `Docs/` edits this pass): confirmed `Honor-Catalog-v1.0-LOCKED.md` (v1.4, 82 types) and a separate, never-merged "Expansion Pass" draft track (53→150 honors) are unreconciled lineages, and that L-10/HonorInstance/Evaluation-Service/L-11/M-2 are all stale against the 82-type catalog. Updated Decision Queue #7 (broadened from "L-10 fallback" to the full 5-doc staleness finding) and added #12 (new — "Strength Standard" sex-specific Honor selector explicitly parked by the PO pending a separate, broader product decision on sex-field collection). PO also approved (not yet authored): a Beginner→Progression→Mastery→Lifetime framework as the governing standard for future activity-based Honors, a Bodybuilding volume-based Honor family, Strength Club ceiling expansion (no duplicate "plate" naming), and promoted Hidden Honors from deferred to a curated V1.x candidate. Authoring is explicitly on hold until the Phase 0 reconciliation (Decision Queue #7) completes. Full detail in memory (`project_honors_expansion_audit`, `project_pinned_legacy_amendment`).
- **v1.9 — 2026-06-29** — Featured/Pinned Honors decision recorded and executed: confirmed Strength milestone Honors stay ordinary Honors (no "Recognition Clubs" system), and realized "Featured Honors" entirely through the existing LOCKED `P-1-Amendment-004-Pinned-Legacy.md` mechanism rather than a new system. Merged that amendment into its base document — `Profile-Wireframe-Spec-P1.md` → v1.3 (new Tier 1B + Section 4A, with Honors explicitly confirmed as a first-class pinnable type, display-only, zero progression effect) — closing a reconciliation gap flagged in § Amendments Not Reconciled. Added a reciprocal pointer in `HonorInstance-Architecture-v1.0.md` (→ v1.0.1, §5.3). Updated § Amendments Not Reconciled (removed the resolved Pinned Legacy row), Recently Completed (added #1, renumbered/trimmed to hold the ~20 cap).
- **v1.8 — 2026-06-29** — Exercise Library Phase 4 (Media Architecture & Standards) complete: new doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group (separate from the existing Media block) and defines production standards for all 5 media/anatomy fields — including a mandatory neutral-stance loop start/end requirement for animations and a mandatory fixed-model/pose/camera/proportions/scale/framing consistency requirement for muscle target images — plus a uuid-keyed naming convention. Reconciled into Exercise-Library-Architecture (v1.2), W-22 (v1.0 R2), Exercise-001, W-28, and Anchor Authoring Framework. Updated Decision Queue #11, Content Status Exercise Library row, Documentation Status Exercise Library subsection, Project Statistics, Repository Evidence Snapshot, and Recently Completed (added #1, trimmed oldest entry to hold the ~20 cap). Architecture-only — zero exercise media assets produced; Decision Queue #11 remains open (media production itself is still entirely unstarted for all 200 exercises).
- **v1.7 — 2026-06-29** — Exercise Library Phase 3 (Difficulty Assignment) complete: new doc `Exercise-Difficulty-Assignment-Pass-v1.0.md` assigns `difficulty` to all 200 V1 exercises (122 BEGINNER / 65 INTERMEDIATE / 13 ADVANCED), with 10 ambiguous cases flagged and resolved. Updated Content Status Exercise Library row (media now the only unassigned schema field), Decision Queue #11, Unresolved Gaps #10, Project Statistics exercise-count row, doc counts (221→222 specs / 222→223 total incl. amendments, root specs 196→197), added Recently Completed #1 and trimmed the 2 oldest entries (Profile & Progress ecosystem, Rank Computation Model) to hold the ~20 cap. Does not change Freeze status (Exercise Library architecture, row 7, remains ✅; the catalog data is still not schema-complete — media remains).
- **v1.6 — 2026-06-29** — Homepage Principles system locked and reconciled: added Freeze row 21 (`Homepage-Principles-Architecture-v1.0` + `Homepage-Principles-Library-v1.0`, both LOCKED); added a new "Home" subsection to Documentation Status; updated Current Sprint objective and Success Criteria to 21 Freeze rows; fixed a stale "19 Freeze rows" reference in Next Milestones; updated doc counts (+2 docs, +2 LOCKED, in both Project Statistics and the Repository Evidence Snapshot); added the new milestone to the top of Recently Completed and trimmed the oldest entry (Honors Expansion) to hold the ~20 cap. The architecture doc deliberately states no fixed library-entry count — the Library doc is the single source of truth for counts, per HP-D10.
- **v1.5 — 2026-06-29** — Exercise Library V1 Freeze reconciliation + audit pass (NOT marked frozen): fixed 5 categories of doc drift (ExercisePrescription field names, stale Hypertrophy(3) checklist line, W-23 stray Hinge row, 3 header/footer version mismatches, a real W-23-vs-Exercise-003 locked decision contradiction over the favorite icon, plus minor wording/reference fixes); audited the 200-exercise catalog (zero broken relationship references confirmed by automated cross-check; all taxonomy ranges satisfied; found 2 new naming-duplicate pairs, now 5 total; confirmed `primaryMuscles`/`secondaryMuscles`/`difficulty`/media unassigned for all 200 rows, 0 active); updated Content Status Exercise Library row, added Decision Queue #11, updated Unresolved Gaps #10, updated Project Statistics exercise-count row, added Recently Completed #1 (trimmed oldest entry, #20 Legacy L-series, to hold the ~20 cap).
- **v1.4 — 2026-06-29** — Squad System Architecture locked and fully reconciled: new governing doc `Squad-System-Architecture-v1.0` (Goals/Missions/Streak/Momentum/Weekly Summary/Feed/Honors/Competition/Notifications/Analytics/Commitment); updated Freeze row 11 note; updated Documentation Status (Squads, Honors, Competitions/Challenges, Notifications subsections); reconciled S-1→v1.4, S-2→v1.6, S-3→v1.3, Honor Catalog→v1.4, P-5 Arch+Wireframe→v1.4, Challenge-System-Architecture→v1.5; added superseded banners to Squad-Architecture-Amendment-001/002 and WSR-001 §6; added Decision Queue #10 (P-5 wireframe drift, discovered not introduced); updated doc counts (219→220 total, ~142→~143 LOCKED); added 2 rows to Duplicate/Superseded Docs.
- **v1.3 — 2026-06-29** — Communities subsystem (V1 Architecture Freeze row 20) locked and fully reconciled: added row 20 to the Freeze checklist; added a Communities subsection to Documentation Status; added Decision Queue #9 (moderation escalation/AI moderation gap, acknowledged not silent); updated doc counts (210→219 total, ~133→~142 LOCKED, 21→26 amendments); added 2 items to Unresolved Documentation Gaps; logged a counter-example note under Amendments Not Reconciled (Communities amendments were merged directly into target docs, not left orphaned).
- **v1.2 — 2026-06-29** — Added Project Health, Current Sprint, Project Statistics, Change Log, Known Risks, Success Criteria, and Workflow sections.
- **v1.1 — 2026-06-29** — Refactored audit into a living dashboard (Dashboard, V1 Architecture Freeze, Documentation/Content/Implementation split, Decision Queue, Recently Completed, Next Milestones).
- **v1.0 — 2026-06-29** — Initial `Forge-Legacy-Master-Status.md` created from repository documentation completion audit.

---

## 🔧 Workflow — How to Maintain This Dashboard

Follow this loop every working session:

1. **Read first** — open this file before any other work; it is the single source of truth.
2. **Complete current sprint** — work the **§ Current Sprint** tasks; do not start unrelated work mid-sprint.
3. **Update percentages** — refresh the six Dashboard metrics, Project Health, and Project Statistics to match reality.
4. **Move completed work** — shift finished items into **§ Recently Completed** (never delete; cap ~20) and tick the relevant Freeze / Success Criteria / Sprint boxes.
5. **Update Change Log** — add a new versioned line (newest first) describing the revision.
6. **Save** — update **Last Updated**, then save. Leave the dashboard accurate for the next session.

---

*This is the permanent source of truth for Forge Legacy. Keep it current. No code written, no app scaffolded, no backend/data-model architecture authored — per task constraints.*
