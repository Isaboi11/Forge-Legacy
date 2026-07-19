# Onboarding Amendment 002 — Progressive Onboarding & Discovery

## Amendment to Onboarding / First-Time User Journey Architecture v1.0
### July 2026

**Status:** LOCKED

**Type:** Substantive Amendment (relocates the *timing* of already-LOCKED questions to opt-in surfaces; defers athlete-type capture; adds discovery surfaces. Reopens no locked decision's *content*.)

**Date:** 2026-07-19

**Amends:** Onboarding-First-Time-Journey-Architecture-v1.0.md v1.0 → v1.1

**Origin:** PO friction review (2026-07-18/19). Two problems on the live demo build:
1. **The pre-Home setup front-loads seven gated steps** (Account → Username → Goals → Experience → Equipment → Schedule → Program) before the athlete ever sees Forge. Of these, only the primary goal (→ `athlete_type`, ONB-D8) and equipment (→ `environment`, ONB-D11) persist; the rest are already ephemeral. Length without a payoff.
2. **First Home is a pure program funnel** — the awaiting-first-workout Home surfaces only a program card and omits every social/explore surface, so a new athlete dead-ends at "start a workout."

**PO ruling:** *"A lot of those questions aren't necessary unless you want a suggested program. People should be able to skip and just explore, or opt into the questions."* So onboarding becomes a bare identity ramp, and everything else moves to opt-in / contextual surfaces.

**Governing philosophy (unchanged, honored more literally):** ONB-D1 — onboarding "personalizes the starting point and creates curiosity to train — it does not teach every feature." ONB-D13 — "Do not force a program… the recommendation is an offer, never a gate." ONB-D20 — feature education is delivered "later, when relevant."

**Amendment Log:** None at v1.0. Initial and final — no open questions.

---

## Section 1 — Purpose

Cut onboarding to **identity only** (Account + Username), and make every fit question **opt-in** — you answer level/equipment only if you *want* a suggested program; otherwise you skip straight into the app and explore. Athlete type is **not asked at all** (defaulted). Then turn the already-locked Progressive Discovery decision (ONB-D20) into concrete surfaces. No taxonomy changes; the questions still *exist* — they move to where the athlete acts on them, or are dropped where they have no consumer.

## Section 2 — What This Amendment Changes

| # | Locked decision | v1.0 behavior | v1.1 behavior (this amendment) |
|---|---|---|---|
| 1 | **ONB-D3 Journey Map** — Personalization movement | Steps 4–10 (Account · About You · derived Athlete Type · Goals · Experience · Equipment · Schedule · Recommended Starting Point), all pre-Home | Pre-Home = **Account (name/sex) · Username** only. Everything else moves to opt-in surfaces (ONB-A2-D1). |
| 2 | **ONB-D8 Athlete Type (derived)** | Derived from primary goal at finish, persisted | **Not asked, not derived. Defaults to `Hybrid`** (the locked catch-all). Revisit with a contextual prompt only if/when Rank surfaces athlete-type-specific content (ONB-A2-D1). |
| 3 | **ONB-D9 Goals** | Pre-Home step (≤3, 1 primary) | **Deferred.** With athlete-type no longer derived from it, goals has no functional consumer; dropped from onboarding. Re-introducible later as an opt-in personalization surface (taxonomy unchanged). |
| 4 | **ONB-D10 Experience** | Pre-Home step | Asked only inside the opt-in **"Get a recommendation"** flow (content unchanged) |
| 5 | **ONB-D11 Equipment** | Pre-Home step; writes `profiles.environment` | Asked only inside **"Get a recommendation"**; still writes `environment`. `environment` is simply **null until captured there** (valid — filtering is opt-in/non-restrictive per ONB-D11). |
| 6 | **ONB-D12 Schedule** | Pre-Home step | **Held** — not asked in V1; folds in when the catalog/Calendar consumes it (was non-persisted; nothing of record lost). |
| 7 | **ONB-D13 Recommended Starting Point** | Pre-Home "You're Ready" step | Becomes the outcome of the opt-in **"Get a recommendation"** flow; still deterministic, explainable, never a gate. |
| 8 | **ONB-D17 First Home** | Chapter anticipation + Start Workout | Card presents **[Start Training] + [Programs]** (the Programs tab is the hub for browse *and* build); plus an **Explore Forge** section (ONB-A2-D2/D4). |
| 9 | **ONB-D20 Progressive Discovery** | Locked but abstract | Realized as three concrete surfaces (ONB-A2-D4) |

## Section 3 — Amendment Decisions

### ONB-A2-D1 — Onboarding is identity only; fit questions are opt-in; athlete type is deferred
Pre-Home onboarding = **Account (name, sex) → Username → Enter Forge**. Goals, Experience, Equipment, Schedule, and the Recommended Starting Point are **not asked**; they live on opt-in, post-Home surfaces (ONB-A2-D3). **Athlete Type (ONB-D8) is not asked and not derived — the finish writes `athlete_type = 'Hybrid'`** (the locked catch-all), and `environment = null`. Rationale (PO): those questions "aren't necessary unless you want a suggested program"; a new athlete should be able to skip everything and explore. Deferring athlete type is safe because nothing user-visible depends on the *self* athlete type in V1 (the Home rank medallion is off; athlete type shows only on other athletes' profiles); if Rank later surfaces type-specific content, a contextual prompt is added then.

### ONB-A2-D2 — First Home: [Start Training] + [Programs], with the Programs tab as the hub
The awaiting-first-workout Home card presents two actions, both secondary to the chapter anticipation:
- **Start Training** (primary) → the first-workout logger (never gated — ONB-D17 Decision 6 preserved).
- **Programs** (secondary) → the Programs tab.

The label is **"Programs," not "Browse Programs"** — deliberately, so an athlete who wants to build their own doesn't read it as prebuilt-only. **The Programs tab is the single hub** for: **Browse** the catalog · **Build Your Own** (express → Program Builder, no questions) · **Get a recommendation** (the opt-in questions, ONB-A2-D3). Build-your-own and browse are the express lane — a confident athlete reaches a program with zero questions.

### ONB-A2-D3 — "Get a recommendation" carries ONB-D10/D11/D13 (opt-in)
An opt-in flow reached from the Programs tab. Asks **Experience (ONB-D10)** + **Equipment (ONB-D11)**, writes `profiles.environment` (owner-RLS self-update — the same RLS `complete_onboarding` relies on), and produces the deterministic **Recommended Starting Point (ONB-D13)** over the existing catalog. Schedule (ONB-D12) is held. Goals are not asked here (no consumer in the current recommendation). The recommendation is an offer with **Start this program** / **Build my own instead** — never a gate.

### ONB-A2-D4 — Progressive Discovery surfaces (implements ONB-D20)
Three concrete, single-moment, dismissible, no-shame surfaces:
- **(a) "Explore Forge" section on First Home** — an *awareness/invitation* surface (ONB-D21) offering Friends, Squads, Legacy, Programs; visually secondary to the chapter + Start Training (ONB-D17).
- **(b) Per-surface first-visit banners** on **Friends** and **Squads** — the in-context education ONB-D20 specifies, shown once.
- **(c) Post-first-workout discovery moment** — after the ONB-D18 payoff, one calm prompt ("You've forged your first session — now find your squad, or add a friend"), honoring earn-then-reveal (ONB-D22).

All carry no streak, no nudge-to-engage, no countdown, no shame (ONB-D20/D22). None emits a progression event.

### ONB-A2-D5 — Full-force invitation, honest inert actions (implementation-state note)
The discovery surfaces present **real calls-to-action** ("Add your first friend," "Join a squad"), per PO direction, on the commitment that the social backend ships before release. In the current build the **terminal social actions are inert** pending that backend (friendships / squad_members tables + RLS + join/add RPCs, wiring the existing `// not yet implemented` stubs); the surfaces route to the real screens and activate when the backend lands. **No fake completion is shown** (ONB-D22). This is a sequencing note, not a product decision, and is out of this amendment's scope.

## Section 4 — Reconciliation with ONB-D22 (No Fake Progress)
Reaffirmed. Deferring/dropping questions creates zero progression — planning was never progress. The discovery surfaces emit no XP, streak, or completion meter. The first real payoff remains Workout #1 (ONB-D18). Defaulting `athlete_type = Hybrid` is a neutral default, not a fabricated identity.

## Section 5 — What This Amendment Does NOT Change
- **Silent Chapter I (ONB-D14)**, **Transition (ONB-D16)**, **First Workout payoff (ONB-D18)**, **First Honor (ONB-D19)** — unchanged.
- **The content** of the Goals taxonomy (ONB-D9), Experience (ONB-D10), Equipment (ONB-D11), and the Recommendation (ONB-D13) — only their timing/placement moves.
- The `athlete_type` enum and its editability path (P-1.1) — unchanged; only its *default source* changes (Hybrid, not goal-derived).
- **ONB-D2 Orchestration-Only Data Rule** — honored: the opt-in flow reads/ranks the catalog and writes only the reserved profile `environment` field.

## Section 6 — Reconciliation Ledger (documents to reconcile to this amendment)
| Document | Required reconciliation |
|---|---|
| Onboarding-First-Time-Journey-Architecture-v1.0 → v1.1 | ONB-D3 (identity-only Personalization); ONB-D8 (Hybrid default, not derived); ONB-D9 (deferred); ONB-D10/D11/D13 (opt-in placement); ONB-D17 ([Start Training]+[Programs] + Explore section); ONB-D20 (three concrete surfaces). Change-log entry. |
| H-1 Home Screen Wireframe Spec | First Home awaiting sub-state: [Start Training]+[Programs] card + Explore Forge section (secondary to chapter + Start Training) |
| W-2 Program Browse | Reached as the "Programs" hub; "Build Your Own" routes to the Program Builder; hosts "Get a recommendation" |
| P-5 Notifications | Discovery surfaces are in-app only; nothing pushes (unchanged) |

## Section 7 — Validation Checklist
- [ ] Pre-Home onboarding = Account + Username only; a fresh signup reaches Forge without goals/experience/equipment/schedule/program/athlete-type steps
- [ ] Finish writes `athlete_type = Hybrid` and `environment = null`; Chapter I intact; routes to app
- [ ] First Home card shows **[Start Training] + [Programs]**; Programs tab offers Browse / Build Your Own (express) / Get a recommendation
- [ ] "Get a recommendation" asks Experience + Equipment, writes `environment`, offers a rule-based recommendation (never a gate)
- [ ] Explore Forge section, per-surface first-visit banners, and the post-first-workout moment appear, are dismissible, and carry no streak/shame/progress
- [ ] No discovery surface emits a progression event (ONB-D22)

---

*Onboarding Amendment 002 — Progressive Onboarding & Discovery*
*Amends Onboarding-First-Time-Journey-Architecture-v1.0.md v1.0 → v1.1*
*July 2026 · Authority: PO friction review 2026-07-18/19*
*Status: LOCKED*
