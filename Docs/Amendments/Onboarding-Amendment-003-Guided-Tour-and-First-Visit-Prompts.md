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

**Amendment Log:**

- **2026-08-02 — PO ruling: the tour is TWO LEGS at TWO MOMENTS, and the v2 spotlight is built.** Amends
  **ONB-A3-D1** and executes the **ONB-A3-D2** deferral. See §3 (both decisions annotated) and §8.
- **2026-08-02 — PO ruling: per-surface walkthroughs cover the BRANCHED screens.** Extends **ONB-A3-D2**
  past the four tabs to the whole Workouts cluster. See **ONB-A3-D6** and §9.

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

> **⚠ AMENDED 2026-08-02 (PO ruling) — the tour is TWO LEGS fired at TWO MOMENTS. See ONB-A3-D5.**
> The 4-tab leg no longer waits for the first move; the ceremony now hands into the **Home leg**.

### ONB-A3-D5 — The TABS leg runs on the GATED Home; the ceremony hands into the HOME leg *(2026-08-02, PO)*
Both legs fired at the same instant under D1, which put a map of four tabs in front of an athlete at the exact
moment the screen behind it filled with cards nothing described. They are now separated:

| Leg | Fires | Shape |
|---|---|---|
| **TABS** — Home · Workouts · Legacy · Squads | First arrival, while the athlete has **no program yet** | 4 cards, no spotlight — copy unchanged from v1 |
| **HOME** — Chapter · Today's Workout · Current Program · Mission · Your Circle · Train Together · Competitions | Once a **program exists**, from the ceremony's "Keep Building" (or automatically, for an account whose ceremony was announced long ago) | 7 **spotlit** steps over the real cards |

> **⚠ RESTATED 2026-08-02 — the Home GATE was removed** (see ONB-A3-D7). These two moments were originally
> "before the gate" and "at the un-gate". Home is now full from the first launch, so they are described by
> what is on the screen instead: **no program yet**, and **a program**. The moments themselves did not move.

**Binding sub-rules.**
- The tabs leg fires on arrival regardless of what the athlete does next; it is no longer conditioned on a
  chooser face, because there is no longer a face to be on. An athlete who dismisses it keeps the leg
  **owed** and it returns.
- The legs persist **separately** (`forge_tour_v1`, `forge_home_tour_v1`). One flag cannot express "saw the
  map, hasn't been shown the screen", which is the ordinary state between sign-up and the first program.
- A step whose card is **not mounted** is dropped from the run and from the step count — never rung around
  nothing. A freestyle athlete (no Program | Mission grid) gets a five-step Home leg that says "of 5".
- Everything ONB-A3-D4 established is preserved: no upfront choice, "Skip all" and "View Honor" remain the
  only escape hatches, and neither leg emits a progression event (ONB-D22 intact).

### ONB-A3-D2 — Auto per-tab first-visit walkthroughs (escalates ONB-A2-D4b)
The first time the athlete opens **Workouts, Legacy, Squads, or Friends**, a short (2–3 card) walkthrough of that surface's sections fires automatically, once. Suppressed while the guided tour is pending or running; a **completed** guided tour pre-marks the tabs it covered as seen (no double-teaching), while a **skipped** guided tour leaves them for the per-tab walkthroughs (the "explore on my own" path). Element-level spotlighting is deferred to a v2 pass; v1 is card-based.

> **✅ THE v2 SPOTLIGHT IS BUILT (2026-08-02)** — for the **Home leg** (ONB-A3-D5). It is a port of the design
> layer's own coach-mark engine (`design_reference/…/forge-coach.js`, already called by Progress Hub, Programs,
> Legacy and Community), not a new invention: per-step `pad`/`radius`, a 96px scroll margin, the card placed
> below the hole when there is room and above it when there is not, and the dim drawn as one 9999px spread
> shadow on the ring — which is how a **rounded** hole is cut on a platform with no way to cut one.
>
> **✅ EXTENDED TO THE WHOLE WORKOUTS CLUSTER (2026-08-02) — see ONB-A3-D6.** Legacy / Squads / Friends
> remain card-based; their steps already name real sections, so spotlighting them is anchor-registration
> work, not new machinery.

### ONB-A3-D6 — Per-surface walkthroughs cover BRANCHED screens, not just tabs *(2026-08-02, PO)*
ONB-A3-D2 scoped the per-surface walkthroughs to the four tabs. That stopped exactly where the app stops
explaining itself: the Program Builder (three views under one route) and the live session are the two largest
screens in the product and had no walkthrough at all. The key set is now the surface set.

**Built — Workouts cluster:** Workouts (6 steps) · Program Builder Setup (5) · Day Builder (4) · Active
Workout (5) · Program Detail (3) · Exercise Library (3) · Templates (2).

**Built — Squads cluster (2026-08-02):** Squads hub (5, replacing two card-only steps) · Squad Detail (6) ·
Discover (3) · Preview (3) · Settings (3) · Requests (2) · Records (2) · Composer (2) · **Friends (3 —
authored in the first pass and never mounted until now)** · Add Friend (2). The through-line is the
**consent model**: a squad is entered by approval and never by walking in, friendship is mutual and searched
by handle, and the Performance Firewall lifts for squad-mates and nobody else. Untutored on purpose:
`create-squad`, `join-squad`, `squad-invite`, `squad-transfer` (labelled forms and confirm flows that carry
their own copy) and `squad-recap` / `squad-post` (read-only).

**Built — Legacy cluster (2026-08-02):** Legacy hub (7, replacing three card-only steps) · Chapter Detail (5)
· Goals (4) · Progress Hub (4) · Transformation (3) · Accomplishments (3) · Photos (2) · Legacy Timeline (2)
· Honors (2) · Trophy Case (2). Where the Workouts walkthroughs teach mechanics, these teach **concepts** —
what a chapter is, what sealing costs, what is chosen for you, and the difference between a thing you declare
and a thing you earn.

**A walkthrough describes the APP, never the SPEC.** The Legacy hub's Featured step says "the last chapter you
sealed, chosen for you" because that is what `deriveFeatured` does — not what
`Featured-Legacy-Moment-Standards.md` (LOCKED) defines, which is a five-tier selection across nine event
types that has never been built. A test asserts the copy makes no promise of the unbuilt system. This is a
binding rule for every future walkthrough: **copy is written against the code, and changes when the code
does.**

**Binding sub-rules.**
- **A walkthrough teaches DECISIONS, not labels.** Each list leads with what the screen cannot say about
  itself — that a template is a session already trained, that Track and Log are different verbs, that the
  structure radio silently changes what the list beneath it means. Labels explain themselves; decisions don't.
- **Each surface is remembered separately.** Setup and the Day Builder are one route and two walkthroughs:
  opening your first day months later still explains the day.
- **A screen renders its own `SpotlightStage`.** Branched screens present OVER the tab shell, so a
  shell-hosted overlay draws behind them. This is a layering requirement, not a preference.
- **Workouts is no longer pre-marked by a completed tabs leg** (`TOUR_COVERED`). One sentence in a tab tour
  introduces a screen; it does not cover one, and suppressing the six-step walkthrough punished exactly the
  athletes who accepted being shown around.
- **The live session's walkthrough fires on the first session, immediately** — the same rule as every other
  surface, with "Skip all" one tap away.
- **Workout Complete is deliberately NOT tutorialized.** It is the earned moment (ONB-D18) and the app does
  not teach over one. Its real discoverability gap — *press and hold to seal* is a gesture with no
  affordance — is an affordance fix on the control, not a tour card, and is **open**.

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
- [ ] ~~"Keep Building" → the guided 4-tab tour runs~~ **(superseded by ONB-A3-D5 — see §8)**
- [ ] "View Honor" → the Honors Hub (Initiative shown); leaving the hub resumes the guided tour.
- [ ] First visit to Workouts/Legacy/Squads/Friends → a short walkthrough once each; suppressed during the guided tour; a completed tour pre-marks its covered tabs.
- [ ] The tour + walkthroughs emit no progression event; only the Initiative honor is granted (once, DB-idempotent).
- [ ] An athlete who **skips programs and just trains** earns Initiative on Workout #1 (alongside first_workout_logged), shown in the workout-complete honor hero.
- [ ] Workout #1 payoff (ONB-D18) still fires and is unaffected.

## Section 8 — Validation Checklist for ONB-A3-D5 (2026-08-02)
- [ ] A brand-new athlete lands on the **gated** Home chooser → after a beat, the 4-tab leg runs; finishing
      returns to Home with it still gated.
- [ ] Starting the intake stepper instead → **no** tour interrupts it; the tabs leg stays owed.
- [ ] First move → Initiative ceremony → "Keep Building" → the **7-step Home leg**, each step ringing its real
      card, scrolling the below-the-fold ones into view. "Start training" on the last step.
- [ ] An athlete who never sat on the chooser gets tabs-then-Home as **one run** with one continuous counter.
- [ ] A freestyle athlete (no program) gets a **5-step** Home leg — no ring around an absent Program or
      Mission tile, and the counter says "of 5".
- [ ] Quitting mid-leg re-runs **that leg only** on the next launch; "Skip all" retires the run's legs.
- [ ] Account Settings → "Replay all tips" replays **both** legs; Guided Tips **off** silences everything.
- [ ] A different account signing in on the same device gets both legs back (`resetFirstRunFlags`).

## Section 10 — Validation Checklist for ONB-A3-D7 (2026-08-02)
- [ ] A brand-new athlete's first Home shows the **full** screen — chapter, starting-point card, Your Circle,
      quick actions, Explore Forge — with no takeover at any point.
- [ ] The starting-point card cycles chooser → "Help me find one" stepper → recommendation, all inline, with
      everything around it still on screen.
- [ ] "Or just train today" works from every one of those three states.
- [ ] The tabs leg fires on first arrival; the Home leg waits for a program.
- [ ] The Initiative ceremony no longer says anything is being unlocked.
- [ ] A freestyle athlete with no program sees the same card, and their Home leg is 5 steps, not 7.

### ONB-A3-D7 — The Home gate is removed; the tour's two moments are re-described *(2026-08-02, PO)*
Home is **full from the very first launch** — chapter, Your Circle, quick actions, Explore Forge — with the
starting-point question living IN it as a card where the Program | Mission grid will go, rather than as a
screen in front of it. **This applies Onboarding-Amendment-002 rather than amending it:** 002's own origin
section names the funnel as the defect it was written to remove, and ONB-D13 already required the
recommendation to be *"an offer, never a gate."* A full-screen takeover that will not let you past until you
answer is a gate however gently it asks.

**"Help me find one" and "Build my own" are preserved verbatim** (PO), now as the three-state starting-point
slot: chooser → intake stepper → recommendation, with "Or just train today" under all three.

**Consequences for this amendment:**
- ONB-A3-D5's two moments are unchanged in timing but re-described: **no program yet** / **a program**. The
  Home leg still waits for a program because three of its seven steps ring cards a program-less Home does
  not draw.
- `TourFace` is `'no-program' | 'has-program'`; `planTour`'s input is `homeHasProgram`. The old
  `gated`/`unlocked` named a gate that no longer exists.
- **The ceremony no longer claims an unlock.** "the full forge is open" was true only while Home withheld
  itself. It now announces the honor and what actually changed — a program.
- `FirstSessionCard` is **retired** (it was already unreachable: it keyed on a loading state `useQuery` never
  produces, and the gate was its only host).

## Section 9 — Validation Checklist for ONB-A3-D6 (2026-08-02)
- [ ] First arrival on **Workouts** → 6 spotlit steps; held to the "My Workouts" side (four steps ring
      sections that don't exist on Discover).
- [ ] First open of the **Program Builder** → 5 steps on Setup. First open of a **day** → 4 more, remembered
      separately, whenever that happens.
- [ ] The Day Builder's sets/reps step is **dropped** on an empty day — nothing to ring, and the counter
      says so.
- [ ] Builder view swaps (Setup ⇄ Week ⇄ Day) never strand the spotlight on an unmounted card.
- [ ] First **live session** → 5 steps, immediately; "Skip all" exits and it never returns.
- [ ] **Program Detail / Exercise Library / Templates** each walk once; the Library holds to its hub face and
      Templates waits until there is a template to point at.
- [ ] Completing the guided tabs leg does **not** suppress the Workouts walkthrough.
- [ ] "Replay all tips" + Guided Tips **off** still govern every one of them.

---

## Section 11 — Implementation reconciliation (2026-08-02, PD-7: the build governs)

Two behaviours changed in code after this amendment locked. Neither reverses a decision above; both make the
shipped surface match what the decisions already said. Recorded here rather than edited into the locked text.

**1. The mid-tour control is labelled "Skip", not "Skip all."** Sections 4, 7 §133 and the Section 7/10
checklists all say "Skip all". The control has only ever retired the walkthrough in front of the athlete —
which is correct, and Section 3's own reasoning requires it ("a walkthrough you were never offered cannot be
one you declined"). The label was the only thing claiming otherwise, and an athlete who tapped it expecting
silence met the remaining twenty-six surfaces. **The genuine global off-switch is Guided Tips in Account
Settings**, which this amendment already establishes. Read every "Skip all" above as "Skip".

**2. Advancing past the first step retires a per-surface walkthrough.** §181 says "Quitting mid-leg re-runs
**that leg only** on the next launch", which remains true for the GUIDED RUN's two legs. It is not the rule
for the per-surface walkthroughs (ONB-A3-D2): finishing and skipping are deliberate exits, but simply leaving
— tapping a card, hitting back, switching tabs — is neither, and it left the surface owed so the walkthrough
reappeared on every visit. A surface is now recorded seen once the athlete **reaches step two**, the smallest
unambiguous signal they read step one and chose to continue; from there it counts as delivered however they
leave. Bailing on step one still keeps it owed, which preserves the accidental-dismissal case. Display alone
never retires anything.

**Also fixed, not a decision — the seen-set was losing writes.** Marking a surface seen was an unserialized
read-modify-write over one array of all 28 keys, so two walkthroughs recorded close together could erase each
other. The in-memory set hid it during the session; the loss surfaced on the next launch as a completed
walkthrough firing again. Operations are now serialized (`src/lib/screen-prompts-model.ts`, with a control
test proving the previous shape genuinely lost writes), and the key list is derived from `SCREEN_TOURS`
rather than retyped — a key present in one and missing from the other made that surface fire forever.

---

*Onboarding Amendment 003 — Guided Tour, Auto First-Visit Walkthroughs & the First-Move Honor*
*Amends Onboarding-First-Time-Journey-Architecture-v1.0.md v1.1 → v1.2*
*July 2026 · Authority: PO direction 2026-07-19*
*Status: LOCKED*
