# Onboarding Amendment 003 — Guided Tour, Auto First-Visit Walkthroughs & the First-Move Honor

## Amendment to Onboarding / First-Time User Journey Architecture v1.0 (as amended by 002)
### July 2026

**Status:** LOCKED

**Type:** Substantive Amendment. **Reverses a locked Non-Behavior** ("No feature tour / no coach-mark gauntlet") and **narrows the binding ONB-D22** to admit one persisted honor at program-commit. Escalates Amendment-002's ONB-A2-D4(b).

**Date:** 2026-07-19

**Amends:** Onboarding-First-Time-Journey-Architecture-v1.0.md v1.1 → v1.2 (v1.1 = Amendment-002)

**Origin:** PO direction on the live on-ramp build (2026-07-19). Two rulings:
1. *"Build a full tour."* Per-surface single-moment banners (ONB-A2-D4b) under-orient a fresh athlete on dense screens — the PO asked for an actual walkthrough of the app, and then a deeper walkthrough on each screen. This intentionally reverses the "no feature tour" Non-Behavior.
2. *"There's an honor that says everything is now unlocked."* The "first move" (first program built or chosen) is recognized with the designed **First Honor Ceremony** (Design b029488a) awarding a new **Initiative** honor — a **real, persisted** honor, not a presentational moment (see Honor-Catalog-Amendment-003).

**Governing philosophy (re-weighed):** ONB-D1 (onboarding creates curiosity, doesn't teach every feature) and ONB-D21 (awareness in onboarding, education later) drew the guardrail *against* an overwhelming tour. This amendment moves the tour to **after the first move**, opt-out (not front-loaded, not pre-Home), so it is education-in-context at the moment the forge opens — not a pre-Home feature gauntlet. ONB-D22's *spirit* (no fake progress, first payoff earned) is preserved; its literal "no honor for choosing a program" clause is the one thing narrowed, by PO direction.

**Amendment Log:** None. Initial and final.

---

## Section 1 — Purpose

Turn Amendment-002's passive discovery surfaces into an **active, opt-out guided experience** for the fresh athlete, triggered the moment they commit to a starting program:

1. A **First Honor Ceremony** unlock moment (Initiative honor) →
2. an **auto-run guided 4-tab tour** (Home → Workouts → Legacy → Squads), light (one line per tab) →
3. **auto per-tab walkthroughs** (2–3 cards) the first time each surface is opened.

Persistence is device-local (AsyncStorage); no new Supabase column for the tour. The Initiative honor IS persisted (Honor-Catalog-Amendment-003).

## Section 2 — What This Amendment Changes

| # | Locked item | Prior behavior | v1.2 behavior (this amendment) |
|---|---|---|---|
| 1 | **Non-Behavior — "No feature tour / no coach-mark gauntlet"** (ONB-D20/D21) | Prohibited | **Narrowed.** A feature tour is admitted **after the first move**, opt-out, one-time, dismissible, emitting no progression event. Still no *pre-Home* tour and no front-loading. |
| 2 | **ONB-A2-D4(b)** — per-surface first-visit *banners* (single moment) | Friends/Squads one-line banners | **Escalated** to short auto-firing per-tab **walkthroughs** (2–3 cards) on first visit to Workouts, Legacy, Squads, Friends. |
| 3 | **ONB-D22** — "choosing a recommended program contributes zero to Honor evaluation" | Binding | **Narrowed (bounded)** — the single **Initiative** honor is earned by the athlete's **first move**: program **built**, **chosen**, OR **first workout logged** (whichever comes first; one honor, DB-idempotent). Only the pick/build *early-grant* narrows D22 — the workout path IS real progress and is fully D22-compliant. Everything else in D22 preserved (no XP/streak/shame/meter; Workout #1 remains the primary payoff). |

## Section 3 — Amendment Decisions

### ONB-A3-D1 — The tour is a guided, opt-out, post-first-move walkthrough (reverses the Non-Behavior)
The moment a fresh athlete makes their first move — **program built (Program Builder) or chosen (accept a suggestion)** — Home un-gates and the **First Honor Ceremony** fires. Its **"Keep Building"** hands directly into a **guided 4-tab tour**: Home → Workouts → Legacy → Squads, one descriptive line per tab, driven by a shell-level overlay that navigates each tab in turn (a mid-tour **"Skip"** always exits). This reverses ONB-D20/D21's "no feature tour." It is *not* a front-loaded pre-Home gauntlet — it runs only after the athlete has committed, in the real product.

### ONB-A3-D2 — Auto per-tab first-visit walkthroughs (escalates ONB-A2-D4b)
The first time the athlete opens **Workouts, Legacy, Squads, or Friends**, a short (2–3 card) walkthrough of that surface's sections fires automatically, once. Suppressed while the guided tour is pending or running; a **completed** guided tour pre-marks the tabs it covered as seen (no double-teaching), while a **skipped** guided tour leaves them for the per-tab walkthroughs (the "explore on my own" path). Element-level spotlighting is deferred to a v2 pass; v1 is card-based.

### ONB-A3-D3 — The unlock moment = the First Honor Ceremony + the Initiative honor
The "first move" is recognized by the designed **First Honor Ceremony** (Design b029488a "Forge First Honor Ceremony"): a forged bronze medallion holding a per-honor symbol (the flame for Initiative) with the forge glow, announcing the earned **Initiative** honor. This ceremony is the reusable template for **every** honor-earned moment (per-honor symbol swaps). The Initiative honor is defined and persisted per **Honor-Catalog-Amendment-003**. The ceremony's secondary **"View Honor"** routes to the **Honors Hub** (L-10); leaving the hub resumes the guided tour.

### ONB-A3-D4 — No upfront tour choice
The tour is **not** presented as an upfront "Take the tour / Skip" choice — it auto-runs from the unlock ceremony's "Keep Building". The escape hatches are the in-tour **Skip** and the ceremony's **View Honor** (explore your honor instead; the tour resumes when you leave the hub). Rationale (PO): the fresh athlete should be walked through, not asked to decide.

## Section 4 — Reconciliation with ONB-D22 (No Fake Progress) — NARROWED, not discarded
ONB-D22 is preserved in spirit and in all but one clause:
- **Preserved:** no welcome XP, no streak, no "days since," no countdown, no profile-completion meter, no shame. The tour and per-tab walkthroughs emit **no** progression event — each is one-time and dismissible. **Workout #1 (ONB-D18) remains the primary emotional payoff**, and the ONB-D18 "chapter comes alive" reveal is untouched (it lives in the workout-complete flow, not this gate).
- **Narrowed (PO-directed, bounded):** ONB-D22's clause *"choosing a recommended program contributes zero to Honor evaluation"* is narrowed to admit the **single Initiative honor** — the athlete's "first move." Initiative is earned by whichever comes first: program **built**, program **chosen**, or **first workout logged** (Honor-Catalog-Amendment-003; DB-idempotent, one row). The **first-workout trigger is fully D22-compliant** (a logged session is real progress). Only the **pick/build early-grant** is the narrowing — the single planning-time progression event now permitted, deliberate, and the only one. The **Initiative honor precedes and does not replace** the first-workout honor (ONB-D19); both can co-occur on Workout #1 (Initiative if not already earned). The binding cross-references (CAL-D21, SOC-D13, CS-D4) govern their own systems and are **unaffected**.

## Section 5 — What This Amendment Does NOT Change
- **ONB-D17/D18** first-workout gate and payoff; **ONB-D19** first-workout honor (distinct from Initiative).
- The rest of **ONB-D22** (no fake progress beyond the one Initiative honor).
- **Amendment-002's** identity-only onboarding (ONB-A2-D1), the [Start Training]+[Programs] Home (ONB-A2-D2), "Get a recommendation" (ONB-A2-D3), and the **Explore Forge** section (ONB-A2-D4a) — all preserved; this amendment escalates only A2-D4(b).
- Persistence policy for the tour: **device-local AsyncStorage, no new Supabase column, no migration** (the Initiative honor's persistence is separate — Honor-Catalog-Amendment-003 / migration 0014).

## Section 6 — Reconciliation Ledger (documents to reconcile to this amendment)
| Document | Required reconciliation |
|---|---|
| Onboarding-First-Time-Journey-Architecture-v1.0 → v1.2 | Non-Behaviors: annotate "No feature tour / no coach-mark gauntlet" → **narrowed** (post-first-move, opt-out). §21 ONB-D20 / §22 ONB-D21: admit the post-commit guided tour + auto per-tab walkthroughs. §23 ONB-D22: **narrow** the "no honor for choosing a program" clause for the single Initiative honor. |
| Onboarding-Amendment-002-Progressive-Discovery | ONB-A2-D4(b) escalated from single banners to auto per-tab walkthroughs; A2-D4(a) Explore Forge preserved. |
| Honor-Catalog-Amendment-003-Initiative-Honor | Defines/persists the Initiative honor this ceremony awards. |
| Forge-Legacy-Master-Status.md | Recently-Completed entry; note the two reversals (tour Non-Behavior; ONB-D22 narrowing). |

## Section 7 — Validation Checklist
- [ ] First move (build or choose a program) → the First Honor Ceremony fires (Initiative), centered "View Honor" under "Keep Building".
- [ ] "Keep Building" → the guided 4-tab tour runs (Home→Workouts→Legacy→Squads); in-tour Skip exits.
- [ ] "View Honor" → the Honors Hub (Initiative shown); leaving the hub resumes the guided tour.
- [ ] First visit to Workouts/Legacy/Squads/Friends → a short walkthrough once each; suppressed during the guided tour; a completed tour pre-marks its covered tabs.
- [ ] The tour + walkthroughs emit no progression event; only the Initiative honor is granted (once, DB-idempotent).
- [ ] An athlete who **skips programs and just trains** earns Initiative on Workout #1 (alongside first_workout_logged), shown in the workout-complete honor hero.
- [ ] Workout #1 payoff (ONB-D18) still fires and is unaffected.

---

*Onboarding Amendment 003 — Guided Tour, Auto First-Visit Walkthroughs & the First-Move Honor*
*Amends Onboarding-First-Time-Journey-Architecture-v1.0.md v1.1 → v1.2*
*July 2026 · Authority: PO direction 2026-07-19*
*Status: LOCKED*
