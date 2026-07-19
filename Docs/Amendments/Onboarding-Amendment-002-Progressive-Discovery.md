# Onboarding Amendment 002 — Progressive Onboarding & Discovery

## Amendment to Onboarding / First-Time User Journey Architecture v1.0
### July 2026

**Status:** LOCKED

**Type:** Substantive Amendment (relocates the *timing* of already-LOCKED decisions; adds no new personalization data and reopens no locked decision's *content*)

**Date:** 2026-07-18

**Amends:** Onboarding-First-Time-Journey-Architecture-v1.0.md v1.0 → v1.1

**Origin:** PO friction review (2026-07-18). Two problems observed on the live demo build:
1. **The pre-Home setup front-loads seven gated steps** (Account → Username → Goals → Experience → Equipment → Schedule → Program) before the athlete ever sees Forge. Of these, only the primary goal (→ `athlete_type`, ONB-D8) and equipment (→ `environment`, ONB-D11) persist; Experience, Schedule, Units, and the Program choice are already ephemeral. The length is friction without a persistence payoff.
2. **First Home is a pure program funnel** — the awaiting-first-workout Home surfaces only a program card and omits every social/explore surface, so a new athlete dead-ends at "start a workout" with no invitation to look around.

**Governing philosophy (unchanged, now honored more literally):** ONB-D1 — onboarding "sells the vision, personalizes the starting point, and creates curiosity to train — it does not teach every feature." ONB-D13 — "Do not force a program… the recommendation is an offer, never a gate." ONB-D20 — feature education is delivered "later, when relevant." This amendment shortens the on-ramp and moves personalization to the moment the athlete acts on it, then makes ONB-D20 concrete.

**Amendment Log:** None at v1.0. Initial and final — no open questions.

---

## Section 1 — Purpose

Make onboarding a lean identity ramp and move program-fit personalization to a just-in-time flow, then turn the already-locked Progressive Discovery decision (ONB-D20) into concrete Home + in-context surfaces. **No personalization question is deleted and no taxonomy changes** — Experience, Equipment, and the Recommended Starting Point are *relocated*, not removed. The four amendment decisions below (ONB-A2-D1…D5) change **when** things are asked and **add discovery surfaces**; they do not alter the content of any locked ONB-D decision.

## Section 2 — What This Amendment Changes

| # | Locked decision | v1.0 behavior | v1.1 behavior (this amendment) |
|---|---|---|---|
| 1 | **ONB-D3 Journey Map** — Personalization movement | Steps 4–10: Account · About You · (Athlete Type derived) · Goals · Experience · Equipment · Schedule · Recommended Starting Point, all pre-Home | Pre-Home Personalization = **Account · About You · (Athlete Type derived) · Goals** only. Experience · Equipment · Recommended Starting Point relocate to a post-Home **"Find Your Program"** flow (ONB-A2-D1/D3). Schedule is **held** (ONB-A2-D3). |
| 2 | **ONB-D10 Experience** | Pre-Home step; personalizes ONB-D13 | Asked in **Find Your Program**, at program-selection time (content unchanged: Beginner · Intermediate · Advanced) |
| 3 | **ONB-D11 Equipment** | Pre-Home step; writes `profiles.environment` | Asked in **Find Your Program**; still writes `profiles.environment` (content unchanged; `environment` is simply **null until captured there** — valid, since filtering is opt-in/non-restrictive per ONB-D11) |
| 4 | **ONB-D12 Schedule** | Pre-Home step (days/week + preferred days + duration) | **Held** — not asked in the V1 slim onboarding nor the initial Find Your Program; folds in when the catalog/Calendar projection consumes it. (It was non-persisted in the build; nothing of record is lost.) |
| 5 | **ONB-D13 Recommended Starting Point** | Pre-Home "You're Ready" step | Becomes the outcome of **Find Your Program**; remains a deterministic, rule-based, explainable recommendation, never a gate |
| 6 | **ONB-D17 First Home** | Chapter anticipation + Start Workout; programs/social "visually secondary" | Gains an explicit **program-choice trio** + an **Explore Forge** section (ONB-A2-D2/D4), both secondary to chapter + Start Workout |
| 7 | **ONB-D20 Progressive Discovery** | Locked but abstract (a trigger table) | Realized as three concrete surfaces (ONB-A2-D4) |

## Section 3 — Amendment Decisions

### ONB-A2-D1 — Deferred Personalization (just-in-time)
The pre-Home Personalization movement is reduced to **Account (ONB-D6) → About You (ONB-D7) → Goals (ONB-D9)**, then the finish (ONB-D14/D16). **Athlete Type (ONB-D8) still derives from the primary goal** at finish and persists. **Experience, Equipment, Schedule, and the Recommended Starting Point no longer gate entry to Forge.** Rationale: a shorter on-ramp (ONB-D1) with questions asked when the athlete acts on them, never as a wall before the product.

### ONB-A2-D2 — First Home program-choice trio + preserved Start Workout
First Home (ONB-D17) presents three program doors, all **secondary to the chapter hero + Start Workout**:
- **Find My Program** → the Find Your Program flow (ONB-A2-D3).
- **Build My Own** → the Program Builder.
- **Browse the Catalog** → W-2 Program Browse.

**Build My Own and Browse are the express lane** — an athlete who already knows what they want reaches a program with **zero** Experience/Equipment questions, satisfying ONB-D13's first-class "Browse Programs." **Start Workout remains never-gated** (ONB-D17 Decision 6): the athlete can train immediately with no program chosen ("Skip For Now" preserved as a first-class path).

### ONB-A2-D3 — "Find Your Program" carries ONB-D10/D11/D13
A post-Home, dismissible flow that asks **Experience (ONB-D10)** + **Equipment (ONB-D11)**, writes `profiles.environment` (ONB-D11), and produces the deterministic **Recommended Starting Point (ONB-D13)** by ranking the existing Program Catalog. **Schedule (ONB-D12) is held** (not asked here yet). The recommendation is an offer with **Start this program** and **Build my own instead** — never a gate. Because equipment is captured here rather than at signup, a fresh athlete may hold `environment = null` between finish and this flow; that is valid state (opt-in, non-restrictive filtering — ONB-D11).

### ONB-A2-D4 — Progressive Discovery surfaces (implements ONB-D20)
ONB-D20 is realized as three concrete, single-moment, dismissible, no-shame surfaces:
- **(a) "Explore Forge" section on First Home** — an *awareness/invitation* surface (ONB-D21) offering Friends, Squads, Legacy, and Programs. Kept **visually secondary** to the chapter hero + Start Workout (ONB-D17). This is the invitation that *precedes* ONB-D20's in-context education (it prompts the athlete to first meet each system).
- **(b) Per-surface first-visit banners** on **Friends** and **Squads** — the in-context education ONB-D20 specifies ("introduce the Friends layer in context" / "introduce Squad accountability in context"), shown once, dismissible.
- **(c) Post-first-workout discovery moment** — after the ONB-D18 earned payoff, a single calm prompt ("You've forged your first session — now find your squad, or add a friend"), honoring earn-then-reveal (ONB-D22).

All three carry **no streak, no nudge-to-engage, no countdown, no shame** (ONB-D20/D22; DNA §8/§10). None emits a progression event (ONB-D22).

### ONB-A2-D5 — Full-force invitation, honest inert actions (implementation-state note)
The Progressive Discovery surfaces present **real calls-to-action** ("Add your first friend," "Join a squad"), per PO direction, on the commitment that the social backend ships before release. In the current demo build the **terminal social actions are inert** pending that backend (friendships / squad_members tables + RLS + join/add RPCs, wiring the existing `// not yet implemented` stubs); the surfaces route to the real screens and the actions activate when the backend lands. **No fake completion is ever shown** (ONB-D22). This is an implementation-sequencing note, not a product decision, and does not belong to the social backend's own scope.

## Section 4 — Reconciliation with ONB-D22 (No Fake Progress)
Unaffected and reaffirmed. Deferring Experience/Equipment/Schedule creates **zero** progression — planning was never progress (ONB-D22). The Explore Forge section, first-visit banners, and post-workout moment are awareness/education surfaces that **emit no progression event, no XP, no streak, no completion meter**. The first real payoff remains Workout #1 (ONB-D18).

## Section 5 — What This Amendment Does NOT Change
- **Goal taxonomy (ONB-D9)** and **Athlete-Type derivation (ONB-D8)** — unchanged; Goals stays in pre-Home onboarding and still drives `athlete_type`.
- **Silent Chapter I (ONB-D14)**, **Transition (ONB-D16)**, **First Workout payoff (ONB-D18)**, **First Honor (ONB-D19)** — unchanged.
- **The content** of Experience (ONB-D10), Equipment (ONB-D11), and the Recommendation (ONB-D13) — only their timing moves.
- **ONB-D2 Orchestration-Only Data Rule** — honored: Find Your Program reads/ranks the catalog and writes only the reserved profile `environment` field; it owns no program logic.

## Section 6 — Reconciliation Ledger (documents to reconcile to this amendment)
| Document | Required reconciliation |
|---|---|
| Onboarding-First-Time-Journey-Architecture-v1.0 → v1.1 | ONB-D3 journey map (slim Personalization); ONB-D10/D11/D13 timing note; ONB-D17 (trio + Explore section); ONB-D20 (three concrete surfaces). Change-log entry. |
| H-1 Home Screen Wireframe Spec | First Home awaiting sub-state gains the program-choice trio + Explore Forge section (secondary to chapter + Start Workout) |
| W-2 Program Browse | Reachable as the "Browse the Catalog" express door; the "Build Your Own" CTA routes to the Program Builder |
| ONB-D13 consumer (Find Your Program) | New post-Home surface; deterministic recommendation over the existing catalog |
| P-5 Notifications | Discovery surfaces are in-app only; ceremonies/discovery never push (unchanged) |

## Section 7 — Validation Checklist
- [ ] Pre-Home onboarding = Account · Username · Goals only; a fresh signup reaches Forge without Experience/Equipment/Schedule/Program steps
- [ ] Athlete Type still derives from primary goal and persists; `environment` is null until Find Your Program, then written
- [ ] First Home shows the trio (Find / Build / Browse) with Build + Browse skipping the questions, and Start Workout never gated
- [ ] Find Your Program asks Experience + Equipment, writes `environment`, and offers a rule-based recommendation (never a gate)
- [ ] Explore Forge section, per-surface first-visit banners, and the post-first-workout moment appear, are dismissible, and carry no streak/shame/progress
- [ ] No discovery surface emits a progression event (ONB-D22)

---

*Onboarding Amendment 002 — Progressive Onboarding & Discovery*
*Amends Onboarding-First-Time-Journey-Architecture-v1.0.md v1.0 → v1.1*
*July 2026 · Authority: PO friction review 2026-07-18*
*Status: LOCKED*
