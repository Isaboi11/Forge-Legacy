# Forge Legacy — First-Time Setup Wireframe Specification
## O-2 | Phase 2B | Version 2.0 — July 2026

**Status:** Locked
**Authority:** `Onboarding-First-Time-Journey-Architecture-v1.0.md` (LOCKED, governing) — this document is a downstream wireframe spec and inherits from it. Also: Forge Legacy Master PRD Section 5 (MVP), Section 17 (Profile), Product DNA, Identity Amendment 001 v1.1, O-1 Account Creation.
**PRD Authority:** Section 5 (MVP Scope), Section 17 (Athlete Type enum / Profile)

---

> ## ⚠️ v2.0 Reconciliation Banner — READ FIRST
>
> **This version changes no governing product decision.** It updates this downstream wireframe spec to conform to the already-locked `Onboarding-First-Time-Journey-Architecture-v1.0.md` (Architecture Freeze Row 4). Where any earlier O-2 content conflicted with the governing architecture, the governing architecture wins and this document was corrected to match.
>
> **The governing principle (enforced here):** *Every athlete follows one unified onboarding path, begins Forge with the same empty first Chapter ("Chapter I — Building Your Foundation," created silently), and receives a personalized, deterministic starting recommendation based on their goals, experience, equipment, and schedule.* There is no beginner path, no experienced-athlete path, no import path, and no legacy-seeding path during onboarding.
>
> **What changed from O-2 v1.1 (all mandated by the governing §26 Reconciliation Ledger and §27 conflict resolutions):**
> 1. **Removed O-2a Path Selection entirely** (§27-D). There is no "new athlete vs. experienced athlete" fork. Experience level (ONB-D10) personalizes the recommendation and copy but **never branches the flow**.
> 2. **Removed the manual Athlete Type step** (ONB-D8 / §27-B). Athlete Type is now **derived deterministically** from the athlete's primary goal and written through the profile model. It is never asked as a question and never a tile group.
> 3. **Removed O-2e Prior Accomplishments from onboarding** (§27-D). The capability is **relocated to a post-onboarding P-1 affordance** and is not eliminated from the product — it is simply not part of first-time setup.
> 4. **Added the unified personalization steps** the governing architecture requires: **Goals** (ONB-D9), **Experience** (ONB-D10), **Equipment** (ONB-D11), **Training Schedule** (ONB-D12), and the **Sex** field (ONB-D7).
> 5. **Added the deterministic Recommended Starting Point** (ONB-D13) — rule-based, explainable, never AI, never forced.
> 6. **Replaced the old "Completion Moment" (v1.1 O-2f) with the Transition Into Forge ceremony** (ONB-D16). Onboarding celebrates **readiness**, not a completed accomplishment; the profile-reveal / rank / "Chapter comes alive" payoff is **withheld until Workout #1** (ONB-D18) so the first real reward is earned.
> 7. **Silent Chapter I** (ONB-D14) is prepared in the background during the transition — no naming gate, no manual creation.
>
> **Implementation note:** As of this reconciliation, **no onboarding code exists** in `src/` (verified: no onboarding routes, no path/type/accomplishments screens, no onboarding store, no Chapter service, no recommendation engine, no test framework). Section 20 (Implementation Requirements) therefore records the binding requirements the eventual implementation must satisfy — it is forward-looking, not a description of existing code.

---

## Preamble: What O-2 Is For

O-2 transforms a newly created account into a personalized athlete ready to train.

Before O-2, Forge Legacy knows the athlete's name and credentials (from O-1). After O-2, it knows enough about them — who they are and how they train — that the experience is personal from minute one, and it has silently prepared their first Chapter and recommended a starting point.

O-2 answers two questions in one uninterrupted arc: **"Who am I as an athlete?"** and **"Where do I start?"**

This is a declaration followed by a personalized hand-off — not a configuration wizard and not a fork in the road. Every athlete walks the same path. Their answers change the *recommendation*, never the *route*.

**O-2 owns the "First-Time Setup" phase of the governing journey — seven screens, one path for everyone:**

1. **O-2a — About You:** Name · Username (optional) · Profile photo (optional) · Sex
2. **O-2b — Goals:** Up to three; exactly one primary (required)
3. **O-2c — Experience:** Beginner · Intermediate · Advanced
4. **O-2d — Equipment:** Commercial Gym · Home Gym · Dumbbells Only · Bodyweight
5. **O-2e — Training Schedule:** Days per week · preferred days · preferred duration
6. **O-2f — Recommended Starting Point:** "You're Ready" — deterministic recommendation, Start / Browse / Skip
7. **O-2g — Transition Into Forge:** Silent Chapter I prepared; readiness ceremony; "Enter Forge"

**Athlete Type is derived, never a screen** (see Decision 2). **Path Selection and Prior Accomplishments no longer exist in onboarding** (see Section 19, Removed Screens).

O-2 hands off to the **First Home experience (H-1)**, where the athlete's first meaningful action is **Workout #1** — the first earned emotional payoff (owned by H-1 + W-17, governed by ONB-D17/D18).

---

## Architecture Decisions

Six decisions define this specification. All inherit from the governing Onboarding architecture; none originate a new product decision.

---

### Decision 1 — One Unified Path (no Path Selection)

**Locked. Enforces ONB-D10 / §27-D.** There is a single onboarding sequence for every athlete. O-2 does **not** ask the athlete to choose between routes ("new athlete" / "experienced athlete" / "start fresh" / "bring my history" / "build from scratch" / "import an existing path"). No such screen exists.

**Experience** (O-2c) is collected as a personalization signal. It affects the recommendation, the recommended program's difficulty/volume, and the tone of instructional copy. It **must not** affect which screens are shown, whether a Chapter is created, whether the athlete begins with empty progress, or whether the athlete can enter Forge.

The old O-2a "I'm just getting started." / "I've been training for a while." fork is retired. Beginner ≈ the former Path A; Intermediate/Advanced ≈ the former Path B — but this is now a three-level *preference*, not a branch.

---

### Decision 2 — Athlete Type: Derived, Never Asked

**Locked, load-bearing. Enforces ONB-D8 / §27-B.** The Rank Computation Model requires an Athlete Type (Strength · Bodybuilding · Endurance · Hybrid) to select each athlete's Personal-Improvement evaluation context. O-2 does **not** present a manual Athlete-Type step, tile group, or field. Instead, Athlete Type is **derived deterministically from the primary goal** (O-2b) and written through the profile model:

| Primary goal (O-2b) | Derived default Athlete Type |
|---|---|
| Increase Strength | Strength |
| Build Muscle | Bodybuilding |
| Improve Endurance | Endurance |
| Athletic Performance | Hybrid |
| Lose Weight | Hybrid |
| General Health | Hybrid |
| Improve Mobility | Hybrid |
| Build Consistency | Hybrid |

- The derivation is a **default, never a lock.** Athlete Type remains freely editable post-onboarding via **P-1.1 Edit Profile**. Hybrid is the always-valid catch-all.
- Onboarding **never re-implements Rank evaluation** — it only seeds the profile input the profile model already stores.
- **No Athlete-Type value is ever surfaced in the onboarding UI.** If a backend contract requires the field, it is derived from the answers above, marked as system-derived, and not shown to the athlete as a question. This spec never displays labels like "Powerlifter," "Runner," "Bodybuilder," "General Fitness Athlete," or "Strength/Endurance Athlete" as onboarding choices.

---

### Decision 3 — Personalization Steps: Goals, Experience, Equipment, Schedule

**Locked. Enforces ONB-D9–D12.** After identity (About You), O-2 collects exactly four personalization inputs, each of which must visibly improve the athlete's start (each drives the recommendation). No input is collected "for data."

- **Goals (O-2b):** up to three from the locked eight-option taxonomy; exactly one designated primary (required). The primary goal drives the recommendation and the Athlete-Type derivation.
- **Experience (O-2c):** one of Beginner · Intermediate · Advanced. Personalizes recommended difficulty/volume and copy tone. Never branches the flow (Decision 1).
- **Equipment (O-2d):** one training environment from the canonical enum, extended by `dumbbells_only`. Written to the profile environment field; constrains the recommendation and enables optional, non-restrictive library/catalog filtering (nothing is ever hidden — the athlete can always browse everything).
- **Schedule (O-2e):** days per week, preferred days, preferred duration. Journey-state preferences that constrain the recommendation. Never a quota, streak target, or shame surface.

These are personalization preferences owned by onboarding as journey state (ONB-D2). **Goals here are not Goal records** — they never auto-create anything in the Goal system. **Schedule here is not a schedule of record** — the Program Ecosystem owns `ProgramSlot`.

---

### Decision 4 — Sex Field (artwork only)

**Locked. Enforces ONB-D7.** O-2a collects a **Sex** selection. Its **only** use is selecting badge artwork and rank-silhouette variants (owned by the Rank/Honor artwork layer). It is **not** a health metric, drives **no** Rank/Honor/Goal/recommendation logic, is **never** used for comparison, and **never** branches the onboarding flow.

- Reuse the canonical profile field for this value; do not create a duplicate onboarding-only property.
- Use the exact label, options, optionality, data model, and privacy treatment specified in the governing architecture and the Profile/Backend data model. This spec does not expand the field's use beyond artwork selection.

---

### Decision 5 — Recommended Starting Point: Deterministic, Explainable, Never Forced

**Locked. Enforces ONB-D13.** After Goals + Experience + Equipment + Schedule, O-2f presents a calm "You're Ready" moment with a single recommended starting program.

- **Rule-based and deterministic** — the same inputs always produce the same recommendation. **Not AI, never presented as AI** (AI program generation remains Post-MVP).
- **Explainable** — the screen states *why* the program was recommended (e.g., "Built for Strength, beginner-friendly, fits a home gym and 3 days a week.").
- **Compatible** — the recommendation must never require equipment the athlete did not select, nor more weekly training days than the athlete chose.
- **Never forced** — the athlete can Start the program, Browse alternatives (→ W-2), or Skip For Now (proceed with no active program; the Workout CTA still works). Skip is first-class.

Recommendation logic and fallback behavior are specified in Section 9.

---

### Decision 6 — Readiness, Not Completion: Transition + Silent Chapter I

**Locked. Enforces ONB-D14 / D16 / D18 / D22.** O-2 does **not** end on a celebratory profile-reveal "completion moment." The old v1.1 O-2f (assembled profile + starting rank + "Your legacy starts here.") is replaced by the **Transition Into Forge** ceremony (O-2g), which celebrates **readiness**, not an accomplishment.

- During the transition, Forge **silently creates "Chapter I — Building Your Foundation"** via the Chapter API (ONB-D14). No naming gate, no manual creation, no confirmation step.
- The Chapter begins **empty** — no workouts, no fabricated progress, no fake timeline events, no artificial honors, no imported accomplishments, no seeded completion percentage, no invented history (ONB-D22).
- The **earned payoff is withheld** to Workout #1: the "Chapter comes alive" animation, the first rank surfacing, and the profile reveal all happen after the first real workout (ONB-D18), not during setup.
- Emotional outcome: **anticipation and ownership**, achieved through restraint — no confetti, no "Welcome to the community!", no fabricated celebration.

---

## Section 1 — Purpose

O-2 personalizes the athlete and prepares their start, in one path, for everyone.

After O-2, Forge Legacy can address the athlete by name, show their face and badge artwork, hold their derived training orientation, recommend a compatible starting program, and present an empty, ready first Chapter. The product feels personal from the first session — and every athlete's Forge record still begins at zero, because nothing has been earned yet.

**O-2 is a declaration followed by a personalized hand-off, not a configuration.** Every question improves the athlete's start. Nothing is collected "for data," and nothing branches the route.

---

## Section 2 — Screen Goals

**O-2 succeeds when:**
1. The athlete provides identity (name, optional username, optional photo, sex-for-artwork) with minimal friction.
2. The athlete declares a primary goal and three lightweight personalization inputs (experience, equipment, schedule), each of which visibly shapes the recommendation.
3. The athlete receives a deterministic, compatible, explainable recommended starting point they can accept, change, or skip.
4. Every athlete — beginner or advanced — traverses the same screens.
5. The athlete enters Forge with an empty, ready Chapter I and is pointed at Workout #1 as the first meaningful action.
6. The entire flow takes under 3 minutes.

**O-2 fails when:**
- Any screen asks the athlete to choose an onboarding path.
- Any screen asks the athlete to manually select an Athlete Type.
- Any screen asks the athlete to enter prior accomplishments, PRs, past programs, or historic achievements.
- The recommendation requires equipment or weekly days the athlete did not select.
- The flow fabricates progress, a completion meter, or a celebration the athlete has not earned.
- Experienced athletes are addressed with beginner-only language.

---

## Section 3 — Information Hierarchy

O-2 is a seven-screen sequential flow, one path for all. The hierarchy:

- **O-2a — About You (TIER 1, Identity):** Name (confirm/edit) · Username (optional) · Photo (optional) · Sex (artwork).
- **O-2b — Goals (TIER 1, Declarative):** The primary identity/orientation signal. Drives recommendation + Athlete-Type derivation.
- **O-2c — Experience (TIER 2, Personalization):** Three levels. Personalizes; never branches.
- **O-2d — Equipment (TIER 2, Personalization):** Training environment. Constrains recommendation.
- **O-2e — Training Schedule (TIER 2, Personalization):** Availability. Constrains recommendation.
- **O-2f — Recommended Starting Point (TIER 1, Payoff-of-setup):** Deterministic recommendation; Start / Browse / Skip.
- **O-2g — Transition Into Forge (TIER 1, Ceremonial):** Readiness ceremony; silent Chapter I prepared; "Enter Forge."

---

## Section 4 — O-2a: About You

Identity in one screen. Reuses O-1c (name) + Identity Amendment 001 (username) + photo, plus the new Sex field.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹                                                      │
│                                                         │
│  About you                    [22sp, primary weight]    │
│                                                         │
│  A few details so Forge feels  [15sp, secondary]        │
│  like yours.                                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│              ┌───────────────┐                          │
│              │      I A      │  ← Initials, 88dp circle │
│              └───────────────┘                          │
│              [  Add photo  ]      ← optional            │
│                                                         │
│  Name                               [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Isaiah                                          │   │  ← from O-1c; editable
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Username (optional)                [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  @  isaiahaltamirano                             │   │  ← auto-suggested
│  └─────────────────────────────────────────────────┘   │
│  Available ✓                  [13sp, success]           │
│                                                         │
│  Sex                                [13sp, muted]       │
│  ( ) [option]   ( ) [option]   …  [per canonical model] │
│                                                         │
│  [  Continue  ]                   ← Primary, 52dp      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Name:** pre-filled from O-1c if set; editable. If O-1c was skipped, the athlete can set it here; the field placeholder shows the display-name examples from O-1c. Not required to advance if a system placeholder is acceptable per O-1 (a name may still be added later via P-1.1).
- **Username:** optional, auto-suggested from the display name, live availability check. All username rules per Identity Amendment 001 v1.1. "Skip"/leaving empty is always allowed.
- **Photo:** optional. Initials avatar is the complete default (no incomplete-profile framing). Permission requested only on "Add photo" tap; denial is graceful (proceed with initials).
- **Sex:** selection per Decision 4. Label, options, optionality, and privacy treatment come from the canonical Profile/Backend data model. **Artwork/silhouette use only.**
- **Continue** advances to O-2b (Goals).
- **Back:** ‹ returns to Account Creation / the preceding onboarding surface per O-1.

---

## Section 5 — O-2b: Goals

The primary orientation signal. Drives the recommendation and the Athlete-Type derivation.

```
┌─────────────────────────────────────────────────────────┐
│  ‹                                                      │
│                                                         │
│  What are you working         [22sp, primary weight]    │
│  toward?                                                │
│                                                         │
│  Pick up to three. Choose one  [15sp, secondary]        │
│  as your main focus.                                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ☐ Build Muscle          ☐ Increase Strength           │
│  ☐ Improve Endurance     ☐ Athletic Performance        │
│  ☐ Lose Weight           ☐ General Health              │
│  ☐ Improve Mobility      ☐ Build Consistency           │
│                                                         │
│  ★ Primary: [ Increase Strength ▾ ]   (required)       │
│                                                         │
│  [  Continue  ]                   ← Primary, 52dp      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Locked taxonomy (the eight onboarding goal options — do not create a competing taxonomy):** Build Muscle · Increase Strength · Improve Endurance · Athletic Performance · Lose Weight · General Health · Improve Mobility · Build Consistency.
- **Up to 3 selectable; exactly 1 primary required.** Selecting fewer than three is fine; the primary is the only required choice in this step.
- These are **personalization preferences owned by onboarding as journey state** — not Goal records. Onboarding never creates a Goal record. The primary goal may later *suggest* (never auto-create) a chapter goal in the Goal system.
- **Continue** is disabled until a primary goal is designated. Advances to O-2c.
- **Athlete Type is derived from the primary goal** here (Decision 2) and written through the profile model — invisibly.

---

## Section 6 — O-2c: Experience

Three levels. Personalizes; never branches (Decision 1).

```
┌─────────────────────────────────────────────────────────┐
│  ‹                                                      │
│                                                         │
│  How much training            [22sp, primary weight]    │
│  experience do you have?                                │
│                                                         │
│  This tunes your starting      [15sp, secondary]        │
│  recommendation.                                        │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Beginner                                    →   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Intermediate                                →   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Advanced                                    →   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Locked three-level model:** Beginner · Intermediate · Advanced.
- Tapping a level selects it (300ms highlight) and advances to O-2d. No Continue button needed; no skip (a level is required, and any level is valid).
- **Experience affects:** recommended program difficulty, appropriate starting volume/complexity, instructional copy tone, the suggested starting point.
- **Experience must not affect:** which onboarding screens are shown, whether a Chapter is created, whether the athlete begins with empty progress, or whether they can access Forge.

---

## Section 7 — O-2d: Equipment

Training environment. Constrains the recommendation; enables optional non-restrictive filtering.

```
┌─────────────────────────────────────────────────────────┐
│  ‹                                                      │
│                                                         │
│  Where will you train?        [22sp, primary weight]    │
│                                                         │
│  We'll only recommend programs [15sp, secondary]        │
│  you can actually do.                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌────────────────────┐   ┌────────────────────┐       │
│  │  Commercial Gym    │   │   Home Gym         │       │
│  └────────────────────┘   └────────────────────┘       │
│  ┌────────────────────┐   ┌────────────────────┐       │
│  │  Dumbbells Only    │   │   Bodyweight       │       │
│  └────────────────────┘   └────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Canonical environment options (per ONB-D11):** Commercial Gym · Home Gym · Dumbbells Only · Bodyweight. These map onto the Environment-Tags enum extended by the additive value `dumbbells_only` (`commercial_gym`, `home_gym`, `dumbbells_only`, `bodyweight`) — the existing three values are unchanged, no migration of tagged programs. **Do not invent new equipment categories** beyond the canonical source.
- Written to the **profile environment field**. Feeds the recommendation (O-2f) and optional, opt-in, **non-restrictive** exercise/program filtering (the athlete can always browse everything).
- Tapping a tile selects it (300ms highlight) and advances to O-2e.
- Finer-grained owned-equipment definition ("Home Gym Builder") is a future enhancement per ONB-D11 — **not** part of V1 onboarding.

---

## Section 8 — O-2e: Training Schedule

Realistic availability. Constrains the recommendation.

```
┌─────────────────────────────────────────────────────────┐
│  ‹                                                      │
│                                                         │
│  When can you train?          [22sp, primary weight]    │
│                                                         │
│  Be honest — we'll fit the     [15sp, secondary]        │
│  recommendation to your week.                           │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Days per week                                          │
│  [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ]     ← single-select     │
│                                                         │
│  Preferred days (optional)                              │
│  [M][T][W][T][F][S][S]             ← multi-select       │
│                                                         │
│  Preferred session length                               │
│  [30] [45] [60] [75+] min          ← single-select     │
│                                                         │
│  [  Continue  ]                   ← Primary, 52dp      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Days per week** (single-select, per the locked schedule model, e.g. 2–6): the binding constraint on the recommendation. The recommendation must **not** require more weekly training days than selected.
- **Preferred days** (optional multi-select): may seed the Calendar's program projection context later; not required.
- **Preferred session length** (single-select): further tunes the recommendation.
- Journey-state preferences (ONB-D2). **Never** turned into a quota, streak target, or shame surface (ONB-D22).
- **Continue** advances to O-2f (days-per-week is required; preferred days optional).

---

## Section 9 — O-2f: Recommended Starting Point

The calm "You're Ready" moment. Deterministic recommendation. Never forced.

```
┌─────────────────────────────────────────────────────────┐
│  ‹                                                      │
│                                                         │
│  You're ready.                [22sp, primary weight]    │
│                                                         │
│  Based on your goal,           [15sp, secondary]        │
│  experience, equipment,                                 │
│  and schedule, we suggest:                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Program Name]                                  │   │
│  │  Built for Strength · beginner-friendly ·        │   │
│  │  fits a home gym · 3 days a week                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  Start Program  ]              ← Primary, 52dp      │
│  [  Browse Programs  ]            ← Secondary          │
│  [  Skip for now  ]               ← Tertiary text link │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 9.1 Recommendation Contract (deterministic)

The recommendation ranks the **existing Program Catalog** against the athlete's inputs. Onboarding owns no program logic (ONB-D2) — it performs a deterministic ranked read.

**Inputs (at minimum):** **primary goal (first-order determinant)** · experience level · equipment selection · weekly days available. Secondary goals are *not* a selection input (see below).

**Hard constraints (must never be violated):**
- The recommended program's required equipment must be a subset of the athlete's selected environment. Never recommend a program requiring equipment the athlete does not have.
- The recommended program's required weekly training days must be **≤** the athlete's selected days per week. Never recommend a program requiring more days than the athlete chose.

**Ranking (ordered, deterministic).** Among constraint-compatible programs, apply these keys **in strict priority order**:
1. **Primary-goal match (first, and dominant).** The athlete's single primary goal (O-2b) → program focus, including the Athlete-Type derivation (Decision 2). This is the first-order determinant of *which* program is recommended; no lower-priority key may promote a program above a better primary-goal match.
2. **Experience match** — difficulty/volume appropriate to Beginner/Intermediate/Advanced.
3. **Schedule fit** — days per week, then preferred session length.
4. **Secondary goals — lowest-weight tie-breaker only.** The athlete's non-primary goals (O-2b) may break a tie **only** among candidates already equal on keys 1–3, nudging toward a program that also serves a secondary goal. They may otherwise be retained purely as **display context** in the explanation. Secondary goals **must never override the primary goal, promote a program above a better primary-goal match, or produce an ambiguous selection.**
5. **Stable catalog order** — final deterministic tie-break so identical inputs always yield the identical single result (no ambiguity ever remains).

Because primary-goal match is dominant and the final tie-break is a stable total order, **the recommendation is always a unique, deterministic program**; secondary goals can influence only otherwise-perfect ties and can never make the selection ambiguous.

**Explanation:** the card states the concrete reasons the program matched (goal, experience-fit, equipment-fit, schedule-fit). Do not fabricate personalization copy the underlying rules do not support.

### 9.2 Fallback (no exact match)

If no program satisfies all hard constraints, fall back **without violating the athlete's equipment or schedule**:
1. Relax soft ranking preferences (session length, then experience-difficulty tolerance) before relaxing anything.
2. If still none, present the closest **equipment- and schedule-compatible** option and clearly frame it as a starting point they can change.
3. If truly nothing compatible exists, do not force a program — present "Skip for now" as the primary path and route Browse (→ W-2) as the alternative. **Never** silently recommend something that breaks the athlete's equipment or day constraints.

### 9.3 Actions
- **Start Program** — enrolls via the Program system; proceeds to O-2g.
- **Browse Programs** — → W-2 Program Browse; the athlete may return and proceed to O-2g with or without enrolling.
- **Skip for now** — proceeds to O-2g with no active program. The Workout CTA still works; training is never gated on accepting a program.

---

## Section 10 — O-2g: Transition Into Forge

The onboarding terminus. Celebrates **readiness**, not an accomplishment. Silent Chapter I is prepared here.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR (light text on dark)                 │
│                                                         │
│  [Dark charcoal. Restraint — no confetti.]              │
│                                                         │
│          Chapter I Prepared          [17sp, light]      │
│          Building Your Foundation     [22sp, light]     │
│                                                         │
│          Your first Chapter is ready.                   │
│          It begins the moment you                       │
│          complete your first workout.  [15sp, muted]    │
│                                                         │
│          Every great story has a beginning.             │
│          Today, yours is waiting to be written.         │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Enter Forge  ]              ← Primary CTA, 52dp    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Silent Chapter I creation (ONB-D14):** during/at this transition, Forge creates **"Chapter I — Building Your Foundation"** through the Chapter API. No naming gate, no manual creation, no confirmation. The Chapter is **prepared, not celebrated** — empty, holding no workouts and no fabricated state.
- **Copy beats (locked, ONB-D16):**
  1. "Chapter I Prepared"
  2. "Building Your Foundation"
  3. "Your first Chapter is ready."
  4. "It begins the moment you complete your first workout."
  5. "Every great story has a beginning. Today, yours is waiting to be written."
- **Button:** "Enter Forge." → First Home (H-1).
- **No profile-reveal, no starting-rank surfacing, no "Chapter comes alive" animation here** — those are withheld to Workout #1 (ONB-D18). Onboarding celebrates readiness; the accomplishment is still ahead.
- **No back navigation.** The arc is complete.
- **"Forging Since"** is set at account creation (O-1b), immutable, and is surfaced later on the profile — it is never an editable field and is not a terminus reveal in this reconciled flow.

---

## Section 11 — Skip Behavior

| Step | Skippable | Default if skipped |
|------|-----------|-------------------|
| O-2a About You — Name | Per O-1 (placeholder allowed) | System placeholder until set via P-1.1 |
| O-2a About You — Username | Yes | No username set (single P-1 prompt later) |
| O-2a About You — Photo | Yes | Initials avatar (no nudge) |
| O-2a About You — Sex | Per canonical model | Per canonical model (artwork default) |
| O-2b Goals | No — one primary required | N/A |
| O-2c Experience | No — one level required (any valid) | N/A |
| O-2d Equipment | No — one environment required | N/A |
| O-2e Training Schedule | Days/week required; preferred days optional | N/A / no preferred days |
| O-2f Recommended Starting Point | Yes — "Skip for now" is first-class | No active program (Workout CTA still works) |
| O-2g Transition | No — "Enter Forge" is the only forward path | N/A |

**Skip does not mean incomplete.** No "complete your profile" progress bar, no "X% complete" meter anywhere (ONB-D22). The only permitted post-onboarding nudge is a single P-1 prompt if username was skipped.

**Prior Accomplishments is not in this table because it is not an onboarding step** (Section 19). It is available post-onboarding via P-1 at any time.

---

## Section 12 — Privacy Defaults

Privacy defaults are set silently during account creation / O-2 processing; the athlete takes no privacy actions during onboarding (per O-2 v1.1 carry-over, consistent with ONB-D15 and P-6):

| Setting | Default | Governs |
|---------|---------|---------|
| Non-squad athlete search | On | Whether non-squad athletes can find this athlete by display name or username |
| WwF non-squad tagging | On (follows search) | Whether non-squad athletes can initiate a WwF tag request |
| Squad member visibility | On | Whether squad members can see presence and profile card |

All configurable post-onboarding in P-6. No privacy screen appears in O-2. Any passive disclosure is informational, never a consent wall.

---

## Section 13 — Abandoned Onboarding & Resume

**Progressive save (account-level).** Each step is saved server-side immediately: About You fields, each goal + primary designation, experience, equipment, schedule, and the recommendation state. Silent Chapter I is created only at the O-2g transition and must be **idempotent** (Section 20).

**Resume:** on return before completion, the athlete resumes at the nearest valid step in the **unified** flow, with previously saved answers pre-populated. The athlete may back up to change earlier answers.

**Legacy onboarding state normalization (for any partially-onboarded dev accounts created under the old dual-path model):** see Section 20.3 — old Athlete Type / Path / Prior Accomplishments state is normalized or dropped without creating fake history, and the athlete resumes in the unified flow.

**After completion:** O-2 is not reshown. Onboarding completion is account-level, not device-level.

---

## Section 14 — Navigation

### 14.1 Unified Flow (all athletes)

```
O-1 (Account Creation, incl. Your Next Chapter vision) — from O-1
         ↓ account created
O-2a (About You: name · username · photo · sex)
         ↓ Continue
O-2b (Goals: up to 3, 1 primary)               → derives Athlete Type
         ↓ Continue
O-2c (Experience: Beginner/Intermediate/Advanced)
         ↓ tile tap
O-2d (Equipment)
         ↓ tile tap
O-2e (Training Schedule)
         ↓ Continue
O-2f (Recommended Starting Point) — Start / Browse / Skip
         ↓
O-2g (Transition Into Forge) — silent Chapter I prepared
         ↓ "Enter Forge"
H-1 (First Home — Active Chapter · awaiting first workout)
         ↓ Start Workout
Workout #1 → earned payoff (ONB-D18)
```

### 14.2 Back Navigation

| Screen | Back navigates to |
|--------|-----------------|
| O-2a | Account Creation / preceding O-1 surface |
| O-2b | O-2a |
| O-2c | O-2b |
| O-2d | O-2c |
| O-2e | O-2d |
| O-2f | O-2e |
| O-2g | No back (arc complete) |

Back preserves saved answers. **There is no path-branch and no Athlete-Type step to navigate through.**

### 14.3 O-2 Does Not Navigate To
- A path-selection screen (does not exist).
- A manual Athlete-Type screen (does not exist).
- A Prior-Accomplishments screen (does not exist).
- O-3 (superseded — the transition/silent Chapter I replaces it).
- Any workout, squad, goal, or program screen except W-2 via "Browse Programs" on O-2f.

---

## Section 15 — Mobile UX

- **Screen types:** standard navigation screens in one sequential push stack. Not modals.
- **Keyboard:** About You fields auto-focus/keyboard-avoid; username live-check; all forms keep the active field above the keyboard.
- **Tap targets:** primary buttons full-width × 52dp; grid/list tiles ≥ 64–88dp; back ‹ 44×44dp; text links ≥ 44dp touch area.
- **Portrait only.**
- **Progressive save:** every step completion persists immediately (Section 13).

---

## Section 16 — Accessibility

Preserve the Forge component system and tokens; do not redesign the visual language. All controls must have clear labels, selected states, keyboard support where applicable, screen-reader labels, sufficient contrast, error messaging, back-navigation, persistence through interruption, and reduced-motion support.

- **O-2a:** each field labeled; initials avatar `accessibilityLabel` = "[Initials] — your default avatar"; Sex options labeled per canonical model.
- **O-2b:** each goal checkbox labeled; primary selector announces the chosen primary; Continue hint explains the primary requirement.
- **O-2c/O-2d:** each option `accessibilityLabel` = "[Value] — tap to select and continue"; selected state announced.
- **O-2e:** day/length selectors labeled; days-per-week announced as the binding choice.
- **O-2f:** recommendation card read as name + reasons; Start/Browse/Skip labeled; Skip is a first-class control.
- **O-2g:** copy beats in the accessibility tree; "Enter Forge" = "Enter Forge — begin your first Chapter."

---

## Section 17 — Edge Cases

- **Name skipped in O-1c:** O-2a pre-fills empty; a name can be added here or later via P-1.1; a system placeholder is used until set. Nothing blocks progress.
- **Username auto-suggestion taken / too long:** per Identity Amendment 001 (increment/truncate); no error.
- **Photo permission denied / upload fails:** graceful; proceed with initials; retry or skip.
- **No compatible program at O-2f:** Section 9.2 fallback; never violate equipment/schedule; Skip stays first-class.
- **Athlete changes primary goal after reaching a later step:** the derived Athlete Type re-derives from the new primary (Decision 2); recommendation recomputes deterministically.
- **Retry/refresh/network replay at O-2g:** silent Chapter I creation is idempotent — exactly one Chapter I, one completion state (Section 20.2).
- **Returning on a second device mid-flow:** resume from the nearest valid step (account-level state); completed users go straight to their current state (H-1 or Workout #1 payoff), never re-onboarded.

---

## Section 18 — Architecture Risks

### Risk 1 — Recommendation catalog coverage
**Issue:** The deterministic recommendation depends on the Program Catalog having constraint-compatible entries across goal × experience × equipment × schedule combinations. Content authoring is early (~4 of 24 programs).
**Recommendation:** The Section 9.2 fallback guarantees the flow never breaks or violates constraints, but recommendation *quality* improves only as the catalog fills. Track as a content dependency, not a flow blocker.
**Risk level:** Medium (content), Low (flow).

### Risk 2 — Chapter API + idempotency (implementation)
**Issue:** Silent Chapter I must be created through the Chapter service (single-writer architecture) and must not duplicate on retry.
**Recommendation:** Enforce idempotency at implementation (Section 20.2). No code exists yet; this is a forward requirement.
**Risk level:** Medium at implementation.

### Risk 3 — Legacy-state normalization (implementation)
**Issue:** Any accounts created under the old dual-path model carry obsolete Athlete-Type / Path / Prior-Accomplishments state.
**Recommendation:** Normalize per Section 20.3. Because no onboarding code shipped, in practice there are no production accounts to migrate today; the requirement is retained for dev/test fixtures and future safety.
**Risk level:** Low.

---

## Section 19 — Removed Screens (traceability)

These screens existed in O-2 v1.1 and are **removed from onboarding** by this reconciliation. Documented here so the removal is explicit and cannot be silently reintroduced.

| Removed (v1.1) | Reason | Replacement / relocation |
|---|---|---|
| **O-2a Path Selection** ("I'm just getting started." / "I've been training for a while.") | ONB-D10 / §27-D — one unified path | Experience (O-2c) as a non-branching preference |
| **O-2b Athlete Type** (manual tile group: Strength/Bodybuilding/Endurance/Hybrid) | ONB-D8 / §27-B — derived, never asked | Derived from primary goal (Decision 2), written invisibly |
| **O-2e Prior Accomplishments** (freeform prior-history entry, Path B only) | §27-D — keeps the arc lean; never seed fake history | Relocated to a post-onboarding **P-1** affordance (capability preserved, not eliminated) |
| **O-2f Completion Moment** (assembled profile + starting rank + "Your legacy starts here.") | ONB-D16/D18 — celebrate readiness, earn the payoff | Transition Into Forge (O-2g) + the Workout #1 payoff (ONB-D18, owned by H-1/W-17) |

**Copy, route maps, step counters, tests, mock data, and analytics events that referenced any removed screen must not be reintroduced.** No onboarding code references these today (verified); this table is the standing guard against regression.

---

## Section 20 — Implementation Requirements (forward-looking)

**No onboarding implementation exists in `src/` as of this reconciliation** (no onboarding routes, store, Chapter service, recommendation engine, or test framework). This section records the binding requirements the eventual implementation must satisfy so it is built as the unified flow and cannot resurrect the dual-path model. These map to the acceptance criteria in the reconciliation task.

### 20.1 Unified flow & absent screens
- No route/screen/state for path selection, manual Athlete Type, or Prior Accomplishments may be created.
- Beginner and Advanced athletes must traverse the identical screen sequence (Section 14.1). Experience must not gate screens.
- Athlete Type, if required by a backend contract, is derived (Decision 2), stored as system-derived, and never rendered as a question.

### 20.2 Chapter I creation & idempotency
- Create "Chapter I — Building Your Foundation" via the canonical Chapter service/API — **never** by writing Firestore directly or bypassing the single-writer architecture.
- Creation must be **idempotent**: retry/refresh/network-replay of onboarding completion must yield exactly one Chapter I and one onboarding-completion record (use a deterministic idempotency key, e.g. per-account onboarding-completion id).
- The Chapter begins empty: no workouts, no fabricated timeline events, no artificial honors, no imported accomplishments, no seeded completion percentage, no invented history.

### 20.3 State & migration
- Provide safe normalization for obsolete onboarding state on dev/test accounts: ignore a stored old Athlete Type (re-derive from goals); map an old beginner/experienced Path answer to the canonical Experience value where unambiguous; drop stale Prior-Accomplishments onboarding state **without** creating history; resume at the nearest valid unified step; never restart fully-completed users; never create a duplicate Chapter I.
- Remove/deprecate any obsolete types, schemas, form state, routes, analytics event names, resume-logic branches, fixtures, and seed data tied to the dual-path model when onboarding is implemented. Do not leave dead branch logic behind flags without a documented migration reason.

### 20.4 Recommendation determinism & tests
- Same inputs → same recommendation (pure, deterministic). Add unit tests asserting determinism and the hard constraints (equipment subset; required days ≤ selected days) once a test framework exists.
- Include the Section 9.2 fallback; assert fallback never violates equipment/schedule.

### 20.5 Import boundary (do not exceed MVP)
- Do **not** add historical workout, Apple Health, Strava, or photo import as part of onboarding or MVP. The only locked MVP import is **program / chapter-structure** import via the W-IM-1 → W-IM-4 flow (CSV/XLSX/pasted structure) per `Architecture-Amendment-001-Import.md`. No MVP copy may promise workout-history or photo import.

### 20.6 First Home & payoff
- First Home (H-1) must present the empty, ready Chapter I via the "Active Chapter · awaiting first workout" hero sub-state (H-1, per ONB-D17) — no fake progress, no countdown, no shame, Start Workout primary, experienced users not addressed with beginner-only language.
- The earned payoff (Chapter-comes-alive, first rank, profile reveal) fires only after Workout #1 (ONB-D18), layered on the standard W-17 summary, first-run only.

---

## Section 21 — Verification Scenarios

For implementation acceptance (and for validating the reconciled spec's internal consistency):

- **A — Beginner Strength / Full gym / 3 days:** unified path; compatible beginner strength recommendation; silent empty Chapter I; Home → Workout #1.
- **B — Advanced Build Muscle / Full gym / 5 days:** **same screens as A**; advanced-compatible hypertrophy recommendation; no beginner-condescending copy; same empty Chapter I.
- **C — Intermediate / Dumbbells + bands only / 4 days:** no recommendation requiring machines or barbells.
- **D — Intermediate Strength / Full gym / 2 days:** no recommendation requiring 3–6 mandatory days.
- **E — Resume legacy state (old Athlete Type + Path + Prior Accomplishments):** state normalized (Section 20.3); resume in unified flow; no fabricated legacy; no duplicate Chapter.
- **F — Retry completion (double-fire):** one Chapter I; one completion record; no duplicated timeline/recommendation records.

---

## Section 22 — Downstream Dependencies

| Dependency | What O-2 requires | Priority |
|------------|------------------|----------|
| `Onboarding-First-Time-Journey-Architecture-v1.0` | Governing authority for every decision here | Authoritative |
| Chapter service/API | Idempotent silent Chapter I creation (single-writer) | High (impl) |
| Program Catalog | Constraint-compatible entries for recommendation quality | Medium (content) |
| Profile / Backend data model | Canonical fields for name, username, photo, **Sex**, derived Athlete Type, environment | High |
| Rank / RCM | Consumes derived Athlete Type; onboarding writes no progression signal | High |
| H-1 | "Active Chapter · awaiting first workout" hero sub-state (ONB-D17) | High |
| W-17 | First-run Workout #1 payoff layered on the summary (ONB-D18) | Medium |
| P-1 | Prior Accomplishments relocated here (post-onboarding); identity block mirrors O-2a | Medium |
| Identity Amendment 001 | Username rules for O-2a | High |
| `Architecture-Amendment-001-Import` | Import boundary (program/chapter structure only) | Reference |

---

## Change Log

### v2.0 — July 2026 (Reconciliation to the governing Onboarding architecture)

Full reconciliation of O-2 to `Onboarding-First-Time-Journey-Architecture-v1.0.md` (LOCKED, governing). **No governing product decision changed** — this brings the downstream wireframe into conformance and removes contradictions.

- **Removed O-2a Path Selection** (one unified path; ONB-D10 / §27-D).
- **Removed the manual Athlete-Type step**; Athlete Type is now derived from the primary goal and written invisibly (ONB-D8 / §27-B).
- **Removed O-2e Prior Accomplishments** from onboarding; relocated to a post-onboarding P-1 affordance (§27-D). Capability preserved, not eliminated.
- **Added** About You Sex field (ONB-D7), Goals (ONB-D9), Experience (ONB-D10), Equipment incl. additive `dumbbells_only` (ONB-D11), Training Schedule (ONB-D12).
- **Added** the deterministic, explainable, never-forced Recommended Starting Point with hard equipment/schedule constraints and fallback (ONB-D13). Ranking is **primary-goal-first (dominant)**; secondary goals are a lowest-weight tie-breaker / display context only and can never override the primary goal or produce an ambiguous selection (§9.1).
- **Replaced** the v1.1 profile-reveal Completion Moment with the Transition Into Forge readiness ceremony + silent Chapter I creation (ONB-D14/D16); the earned payoff is withheld to Workout #1 (ONB-D18/D22).
- **Rewrote** the flow to a single seven-screen sequence (O-2a…O-2g); corrected navigation maps, skip table, hierarchy, decisions, and checklist.
- **Added** Section 19 (Removed Screens, traceability), Section 20 (Implementation Requirements, forward-looking), and Section 21 (Verification Scenarios).
- **Recorded** that no onboarding code exists yet; the implementation requirements are forward-looking.

### v1.1 — June 2026 (superseded by v2.0)
Reconciliation applying O-2-Amendment-002 (four-tile Athlete Type). Superseded: the manual Athlete-Type step it corrected is now removed entirely (derived), and the dual-path/Prior-Accomplishments structure it described is retired.

### v1.0 / v1.0.1 — June 2026 (historical)
Initial O-2 (dual-path identity declaration: Path Selection, manual Athlete Type, Username, Photo, Prior Accomplishments, Completion Moment) and its O-2-A1 batch-closure amendment. Retained as historical lineage; superseded by v2.0.

---

*Forge Legacy First-Time Setup Wireframe Specification — O-2*
*v2.0 — July 2026 | Reconciled to Onboarding-First-Time-Journey-Architecture-v1.0 (governing)*
*Authority: Onboarding-First-Time-Journey-Architecture-v1.0 (LOCKED); Master PRD §5/§17; Product DNA; Identity Amendment 001 v1.1; O-1 v1.0*
