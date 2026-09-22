# Coach Holt — Feature Discovery System

## v1.0 | September 2026 · PROPOSAL — for the PO to sign the numbers in §4.3 and the decisions in §0.3

**Status:** PROPOSAL. Nothing in this document is built. §1 describes what IS built; §4 describes what to build; §5 says in what order.
**Date:** 2026-09-09
**Owner:** Product
**Origin:** PO, 2026-09-09 — *"My worry is that people will miss out on all of the features and functions that will make them stay and pay for long… have a team of ten experts review the onboarding that we have built, build a list of all of the features, build out what it would look like for coach holt reminders or nudges, when and how he would, what features he would nudge towards, how people can respond if they don't want that nudge any more, how he would say it… And even triggers, so like if someone did a really heavy lift for their bench, coach holt can prompt them to go look at their progression in bench at the charts."* And, on the reply mechanics: *"they can just tap on a pill in his chat and it'll take them there."*
**Extends:** `Docs/Coach-Holt-Exploration-Nudges-Plan.md` (BUILT 2026-08-25 as `0179`; header corrected 2026-09-09) · `Onboarding-First-Time-Journey-Architecture-v1.0` ONB-D20/D21/D22 · `Onboarding-Amendment-003/004` · `W9-Amendment-006` · `P-5-Notifications-Architecture` v1.5 §3.2e · `Coach-Adaptive-Learning-Amendment-002` CI-D1–D12.
**Authority it does not touch:** `FORGE_LEGACY_PRODUCT_DNA.md` (governs every line here) · the paywall rule in `nudges.ts:76-79` · the ceremony queue order · the tour's device-local persistence (Amendment-003 §5).

---

## Contents

- §0 One page: what this is, what it changes, the decisions you need to make
- §1 As built — onboarding, the tour, the nudge system, analytics — and the ten defects
- §2 The ten-expert review — ten reports, one ranked list
- §3 The feature inventory — every feature, where it lives, who points at it today
- §4 The nudge system v2 — taxonomy · catalogue · cadence · opt-out · voice · push · measurement · tour fixes
- §5 Implementation roadmap
- §6 Documents this forces

---

## §0 — One page

### 0.1 The problem, stated plainly

Forge Legacy has roughly **170 features across 88 screens**. Twenty-eight of them are three or more taps deep, behind a long-press, or revealed only by a switch — including the progression chart the PO's own example points at. The app has two systems that could introduce them and neither reaches far: the **guided tour** (105 steps, device-local, and — verified this pass — it never runs at all before the first workout), and **Holt's exploration nudges** (eight invitations, live since 2026-08-25, which read eight counts and cannot react to anything that happens).

Nothing in the product can currently say *"you just benched 225 — the chart for that is here."* That sentence needs a fact, a destination, and a mouth. Holt has the mouth. This document supplies the other two.

### 0.2 What v2 is

Three kinds of line, one surface, one budget:

| | | |
|---|---|---|
| **MOMENTS** | a fact from the athlete's own record, ≤72 h old, spoken once | a personal record on a lift with history → that lift's chart · the first tracked run with a route → the run's page · a first-time exercise → its coaching page · a finished program → the next block |
| **INVITATIONS** | a part of Forge never opened, unlocked as training accumulates | the 81 shipped sessions · the home-gym profile · My Standard · Pinned Legacy · Export My Data · the second theme · and the eight already live |
| **WAYFINDING** | the athlete asks, Holt answers with a path and a pill | `HELP_TOPICS` grows from 11 rows to 37, in a two-stage menu |

All of it through the coach coin on the four idle tabs, never during a session. Tapping the coin opens Holt's chat with his line as a turn and three pills: **Take me there** · **Not now** · **Don't bring this up again**. Two switches in Preferences turn each kind off. **No push in v2** — see §4.8.

### 0.3 The eight decisions this needs from you

Each is argued in the section named; the recommendation is what §4 is written to.

| # | Decision | Recommendation | Where |
|---|---|---|---|
| **A** | Fix the first-mark leak before any PR moment? | **Yes, and it is not optional.** `save_workout` throws away the `isFirst` flag it is handed, so a beginner's first bench is stored as a personal record and already renders as a PR in the weekly review and the Legacy timeline. This is a live defect, not a v2 question. | §2 B1, §5 Stage 0 |
| **B** | Push for moments? | **No, not in v2, and not without a new locked condition.** Two experts independently found it has no authority: the ceremony specs refuse recognition-class push by name, and "program graduated" is already forbidden outright. | §4.8 |
| **C** | The cadence numbers | **≤2 unprompted lines per 7 days** (not 3), moments ≤1 per 48 h, invitations keep the 7-day global gap, moments expire silently at 72 h, and a line is spoken on the next app session — never the arrival that follows the seal screen. | §4.3 |
| **D** | Does the quietest coach setting silence Holt between sessions? | **Invitations silent, moments speak, quiet register, one line a week.** The Morning Briefing already binds tone to this dial outside a session, so its scope is settled; `volunteered: 0` is what makes invitations wrong at that level. | §4.3 |
| **E** | The exposure table | **Yes, and split by kind.** 23 route-level keys marked from the one existing pathname effect; 16 control-level keys marked in the handler that opens the thing. Route-only exposure would tell Holt an athlete has "never tried" a chart they open daily. | §4.6 |
| **F** | The onboarding drift (7 steps vs the locked identity-only amendment) | **Amend by document, and cut one step.** The reversal was reasoned and the Day-1 program is the payoff — but the chapter-naming step contradicts a locked decision *and* feeds nothing. | §6 |
| **G** | The ten data-gated walkthroughs | **Leave the tour data-gated; invitations own the empty state.** Two systems teaching one empty screen is the density problem returning. | §4.9 |
| **H** | Scope of the next pass | **Stage 0 (the three live defects) first, then Stage A.** Stage 0 is four small fixes that stand on their own merit and that v2 depends on. | §5 |

### 0.4 What the review changed about the design

The ten experts did not ratify the brief. Eight substantive changes, each argued in §2:

1. **The moment catalogue shrank from seven to four**, plus two once-ever wayfinding lines. Cut: plate-club crossings (a ceremony says it minutes earlier), stalls and deloads (a grade in disguise), the 5th-session template prompt (an invitation that already exists), chapter age in days (a calendar fact the DNA forbids in Holt's mouth), and the first photo as a moment.
2. **A finished program points at the next block, not at a chart.** A chart cannot answer "what now".
3. **Moments get one arbiter and a fact-keyed record**, reusing the weekly review's existing rarity ordering rather than inventing a tie-break.
4. **Push leaves v2 entirely.**
5. **Two lines a week, not three.**
6. **"Take me there" must actually arrive** — six route parameters, or the row is honest about being a description.
7. **The wayfinding sentence moves off the coin** into the sheet, because the coin clips at three lines and the path is what gets cut.
8. **Three live defects surfaced that have nothing to do with nudges** and should be fixed regardless: the first-mark leak, the push permission spent at sign-up, and a nudge that will walk athletes into a paywall the day the tiers flip.

---

## §1 — As built (verified 2026-09-09 against the working tree on `feat/route-map`)

### 1.1 Onboarding — seven steps and a reveal

`src/app/onboarding.tsx:76` — `BASE_SETUP = ['account','username','goal','experience','equipment','schedule','chapter']`, a conditional `gear` step after `equipment` when the athlete picks a home gym (`:298-300`), and a terminal `transition` outside the count (`:109`, `:318`).

| # | Step | Title | Collects | Skippable |
|---|---|---|---|---|
| 1 | `account` | "Claim your name" | name, avatar, sex, units | photo only |
| 2 | `username` | "Claim your handle" | handle (live uniqueness) | "Skip for now" |
| 3 | `goal` | "What are you working toward?" | up to 3 goals, first = primary | no |
| 4 | `experience` | "How long have you been training?" | beginner / intermediate / advanced | no |
| 5 | `equipment` | "Where will you be training?" | 1+ of 5 buckets (+ `gear` grid for home gym) | no |
| 6 | `schedule` | "How often can you train?" | days per week 2–6, minutes 30/45/60/75 | no |
| 7 | `chapter` | "Name this season" | Chapter I title | "Skip — you can rename it any time" |
| — | `transition` | "Your next chapter begins now." → Enter Forge, or a Day-1 reveal → Start Day 1 | — | — |

The finish (`src/domain/onboarding/service.ts:85`) uploads the avatar, calls the atomic `complete_onboarding` RPC (profile + silent Chapter I + `onboarded_at`), best-effort patches `experience` / `training_goals` / `home_gym_equipment`, writes units to `app_prefs`, and emits `onboarding_completed`. **Days per week and minutes are not persisted** (`onboarding.tsx:112-120`). If `first-week.ts` can build a program from the answers, the athlete lands on Home's `settled` face with a real Day-1 hero; if not, on the "How do you want to start?" chooser.

⚠ `src/domain/onboarding/first-week.ts` is a **program builder for sign-up**, not a first-week nudge system. `coachGoalForGoalId` returns null for `endurance` and `athletic` (`:16-22`), so two of six goals cannot get a Day-1 program.

⚠ **Three LOCKED decisions are contradicted by this code and nothing amends them.** ONB-A2-D1 (identity only — Account + Username, everything else opt-in post-Home), ONB-D14 (silent Chapter I — "no naming gate"), ONB-D12 (schedule held). The reversal was reasoned — `onboarding.tsx:49-70` records that device-local answers did not survive a reinstall and Holt could not read them — but the reasoning lives in a source comment, not in `Docs/`. §6 names the amendment.

### 1.2 The guided tour — 105 steps, device-local, phased on workouts logged

Two legs (TABS 4 steps · HOME 7 spotlit steps) plus 94 per-surface walkthroughs over 27 surfaces. All copy and planning are pure in `src/domain/onboarding/tour-plan.ts`; the machine is `src/hooks/useTour.tsx`; per-surface hosts are `src/components/tour/ScreenTour.tsx`.

- **Phases unlock on workouts logged 0 / 3 / 10** (`PHASE_UNLOCK`, `tour-plan.ts:1304`), server-seeded from `workouts` once (`src/lib/tour-phase.ts:58-77`); an unknown count means no restriction (ONB-A4-D10). A step's phase is its position in its surface's list (positions 1–2 → phase 1, 3–4 → phase 2, 5+ → phase 3). The Home leg thins to its first three steps on the first run (`HOME_PHASE_1_STEPS = 3`, `:1311`).
- **Everything the tour knows is AsyncStorage** (`forge_tour_v1`, `forge_home_tour_v1`, `forge_screen_prompts_seen_v1`, `forge_guided_tips_enabled_v1`, `forge_tour_workouts_v1` — `src/lib/tour.ts`, `src/lib/screen-prompts.ts`), by decision (Amendment-003 §5). Cleared on account switch.
- **Retirement:** a surface is retired when the athlete reaches step two; finishing and skipping are deliberate exits; a step whose anchor is not mounted is dropped from the run and the count.
- **Telemetry:** `tour_step_shown`, `tour_skipped`, `screen_tour_started`, and `tour_completed` — the last emitted by the guided run only.

The full step table (ids, surfaces, copy, phases) is reproduced in the explorer map `explore-onboarding.md §2h`; §3 below carries the per-feature mapping.

### 1.3 The nudge system — built, live, state-only

`Docs/Coach-Holt-Exploration-Nudges-Plan.md` said "PLAN, not yet built" until today. It was built and signed off on 2026-08-25 (`0db5868`), fixed on 2026-08-26 (`4383a50`), and is live on build 8.

| Piece | Where | What it does |
|---|---|---|
| Catalogue + cadence + decision | `src/domain/coach/nudges.ts` | 8 invitations in priority order (`photos` · `goals` · `honors` · `program` · `templates` · `progress` · `squads` · `metrics`); `MIN_SESSIONS=3`, `GAP_DAYS=7` **global across all nudges**, `DISMISS_COOLDOWN_DAYS=21`, `MAX_DISMISSALS=2`; `chooseNudge()` returns the first eligible row, and "shown but never answered" waits its turn |
| Signals | `coach_nudge_signals()` (0179, SECURITY INVOKER) | eight counts: workouts, transformation entries, goals, templates, squad memberships, honors, weigh-ins, active programs |
| State | `coach_nudge_state` (0179) | `(athlete_id, nudge_id text, shown_at, dismissed_count, dismissed_at, used_at)`; owner RLS; **no DELETE policy** so "never again" survives |
| Surface | `src/components/forge/CoachBubble.tsx` | the coin on `/`, `/workouts`, `/legacy`, `/squads`; line priority introduction → draft teaser → nudge; hidden by a live session, a ceremony, a running tour; **the display records `shown`**, only when visible |
| Reply | `CoachBubble.tsx:322-359` | a BottomSheet with "Show me" (→ `used`, navigate) and "Not now" (→ `dismissed`); closing the sheet is not a refusal |

**What it cannot do:** react to a moment. It reads counts. A PR, a first-time exercise, a graduated program, a sealed chapter — none can make Holt speak on an idle surface. And `/progress-hub` opens a lift's chart from local state only (`src/app/progress-hub.tsx:189,261`), so the PO's bench example has nowhere to land today.

**Owed defect:** nobody has verified that `coach_nudge_state` writes land — `markNudge` swallows every failure by design (`Docs/Status-Archive-2026-09.md:596-601`).

### 1.4 Holt's voice machinery

- `src/domain/coach/rulebook/voice.ts` — the conversation; `pick()` / `pickFrom()` with a module-level no-repeat memory; the rules in its header (terse, declarative, no "Great!", no exclamation marks, never compliments a tap, refuses plainly with the alternative).
- `src/domain/coach/rulebook/in-workout-voice.ts` — the gym; `LINES: Record<key, Record<'quiet'|'plain'|'direct', string[]>>`; `say(key, register, tokens)` returns null when a token is unfilled; **every line names the next action and never characterises what was done** (CI-D11).
- `src/domain/coach/rulebook/intensity.ts` — `coachIntensity` (`reminders | steady | push | drive`, default `steady`) × experience → `register`; `reminders` volunteers nothing and still receives safety cues (CI-D5); unknown experience → `beginner` (CI-D8).
- `src/domain/coach/rulebook/review.ts` — the weekly note: opener → the least ordinary true thing → a forward close; may say what the week sets up, never how it measured up (PO 2026-09-03).
- `HELP_TOPICS` in `src/domain/coach/chat-core.ts:1169` — eleven `{q, a, route, cta}` rows: the wayfinding voice already shipped ("Take me there").

### 1.5 The notification pipeline, as it bears on this

- `P-5-Notifications-Architecture` §1 — no marketing or re-engagement notification; ceremonies never push. §3.2e carves ONE exception, the Morning Briefing, bounded to five conditions: **opt-in · self-directed · content-bearing · self-silencing · never absence-referencing.** A notification failing any one is the pattern §1 forbids.
- `0120` — `push_outbox`, `push_tokens`, `profiles.push_baseline_at`, `notification_events_for()` (ONE function holding every event; `create or replace` rewrites it whole and has silently dropped branches three times).
- `0159` — the briefing writes `push_outbox` directly from a `pg_cron` job, worded in Postgres, tone from `coachIntensity`, with a regex test that no line characterises elapsed time, absence, or anything undone.

### 1.6 Analytics

`app_events` (0131) with an allowlisted prop vocabulary (`src/domain/analytics/props-core.ts`) and a 90-day prune. **Thirteen event names exist** — auth, onboarding, tour, workout, paywall, session. No `screen_viewed`, no `feature_first_used`, no nudge event. `/admin`'s feature-adoption block reads tables, not behaviour.

### 1.7 The ten defects

Found by this pass's exploration; each is carried into §2's master list with the expert findings that confirm it.

| # | Defect | Evidence | Severity |
|---|---|---|---|
| D1 | Home tour steps 4–7 (Mission, Your Circle, Train Together, Competitions) are **never reachable** — the leg thins to 3 at phase 1 and is persisted as one terminal flag | `tour-plan.ts:1408`; `src/lib/tour.ts:14-19`; `useTour.tsx:283-293` | HIGH |
| D2 | The guided run **never starts for a zero-workout athlete**; between sign-up and workout #1 the only orientation is the Explore Forge grid, which vanishes forever on save | `tour-plan.ts:1384-1389`; `useTour.tsx:380`; `(tabs)/index.tsx:106` | BLOCKER |
| D3 | Ten walkthroughs fire only after the feature has been used (`ready={list.length > 0}`): templates, honors, transformation, goals, squads, accomplishments, photos, timeline, squad-records, squad-requests | `templates.tsx:397`, `honors.tsx:174`, `transformation.tsx:263`, `goals.tsx:293`, `squads.tsx:185`, `accomplishments.tsx:210`, `photos.tsx:221`, `legacy-timeline.tsx:194`, `squad-records.tsx:134`, `squad-requests.tsx:251` | HIGH |
| D4 | ONB-D20's five discovery triggers (Calendar / first friend / first squad / first challenge / first chapter) were never built; Calendar and Challenges have no tour step | `Onboarding-First-Time-Journey-Architecture` §ONB-D20; Amendment-004 §7 claims "implemented" | MEDIUM |
| D5 | Tour and nudges share no exposure state; `eligible` checks entries, not whether the screen was ever opened | `nudges.ts:84`, `:96-98` | HIGH |
| D6 | A per-surface walkthrough walked to the end emits nothing; skip-rate has no denominator | `ScreenTour.tsx:126` | MEDIUM |
| D7 | No feature-usage event exists | `props-core.ts`; the 13 names | HIGH |
| D8 | Tour state dies on reinstall; a new device replays both legs at phase 3 — the opposite treatment to a first device | Amendment-003 §5; `tour-phase.ts:58-77` | LOW |
| D9 | Onboarding-vs-doc drift is unamended (ONB-A2-D1, ONB-D14, ONB-D12) | `onboarding.tsx:49-70` | HIGH |
| D10 | Endurance and athletic goals dead-end at sign-up: eight questions, no program, no reveal, no tour | `first-week.ts:16-22`; `onboarding.tsx:423-432` | BLOCKER |

---

## §2 — The ten-expert review

### 2.1 Method

Ten reviewers ran in parallel, each given the same three verified maps of the as-built system (the onboarding and tour map, the Holt and notification map, the feature inventory), its own lens and five to eight fixed questions, the files it had to read, and **one output schema** — finding id, severity, claim, evidence at `file:line`, the locked rule it touches, the fix, and what the fix implies. The schema is what makes the merge mechanical rather than editorial. Reports are in full at `scratchpad/discovery/expert-01…10`; **127 findings** were returned. This section carries the deduplicated master list and each lens's verdict.

Two reviewers were asked to read a section of this document that did not exist yet when they ran, and said so. That is recorded rather than hidden: the design they reviewed was the brief in their prompt, and §4 below is written to their findings.

### 2.2 The ten lenses, and what each concluded

| # | Lens | Verdict in one line | Findings |
|---|---|---|---|
| 1 | **Onboarding & activation UX** | The moments layer arrives too late for the population most at risk. The window between sign-up and workout #1 is a blackout — the tour is blocked and the only orientation vanishes on save. Fix that before adding fifteen invitations on top. | 11 |
| 2 | **Behavioural science** | The shape is right, but two mechanisms are missing: nothing decides which fact wins when several land in one window, and "spent on display" keyed on a category rather than a fact reproduces a bug the PO already reported once. | 14 |
| 3 | **Retention & monetization** | Direction right, sequence wrong. One already-shipped nudge walks athletes into the paywall the day tiers flip; four "Premium-planned" screens have no entitlement code at all; and the instrumentation that could prove any of this worked is 0% built. | 13 |
| 4 | **Strength & conditioning coach** | A coach volunteers two things unprompted: *that's the mark now* after a real record, and *next block* after one ends. Everything else on the list is a ceremony's job, an invitation's job, a calendar fact, or a grade in disguise. And the headline moment cannot ship: first-ever marks are stored as records. | 14 |
| 5 | **Copywriter** | The grammar the app already uses — fact, then where, then a question — carries all of it. Wrote 234 lines across 26 keys and three registers, plus the guard regex with its positive controls. Five of the eight shipped lines are generalities and were rewritten. | 10 |
| 6 | **Notification & permission strategist** | Push has no authority here, and the premise protecting it is already spent: the app asks for the OS permission at account creation, before onboarding, with no explainer. | 10 |
| 7 | **Information architecture** | "Land on the thing" is true today for 13 of 28 destinations. Six route parameters make it 20; the remaining 8 are in-session controls that must be catalogued as descriptions. A pill that lands *near* is worse than a sentence that is honest. | 14 |
| 8 | **Analytics & data engineering** | The derived-read design is sound and the SQL is straightforward, with five corrections — starting with the migration number, which was taken by a parallel session while this was being planned. | 14 |
| 9 | **RN + Supabase feasibility** | All of Stage A ships over the air. Two blockers are in the tour fixes, not the nudges: the tour gate has no leg discriminator, and the Home leg's flag has no phase awareness — so the headline tour fix would not work as described. | 14 |
| 10 | **Product DNA + accessibility** | Seventeen rows pass the seven-question test unchanged, ten need rewording, five should be cut. Moments pass when the fact is something the athlete *did* and fail when it is a number the calendar produced. One accessibility failure, and it is a one-token fix. | 14 |

### 2.3 The master list

Deduplicated across the ten reports and ranked. **Raised by** shows convergence — where several lenses reached the same finding independently, it is stronger evidence, not repetition.

#### BLOCKER — must be resolved before the dependent work ships

| # | Finding | Evidence | Fix | Raised by |
|---|---|---|---|---|
| **B1** | **First-ever marks are stored as personal records, and the flag that distinguishes them is discarded.** `metrics.ts` computes `isFirst` and states the rule ("you cannot break a record you have never set"); `save.ts` passes every row to the RPC; `save_workout` inserts all of them into `personal_records` and writes a timeline event reading "— lb PR". `isFirst` appears nowhere in 198 migrations. **A PR moment as designed would fire on every lift a beginner touches for the first time** — and the weekly review and Legacy timeline already call a first mark a PR today. | `src/domain/workout/metrics.ts:131-139,192`; `src/domain/workout/save.ts:20-21,136`; `supabase/migrations/0151_stair_floors.sql:148-156`; `src/data/legacy-timeline-live.ts:236-251`; `0191:111-114` | Add `personal_records.is_first`, write it from the payload already received, suppress the timeline "PR" event when true, and filter every reader. The seal screen already derives this guard client-side (`workout-complete-live.ts:386-389`) — the fix makes it the database's. | E4 |
| **B2** | **The one-shot iOS push permission is spent at account creation, before onboarding, with no explainer.** The registration effect fires on `[userId]` alone, gated by no toggle and no completed onboarding. This violates the locked "no front-loaded permissions" Non-Behavior, and it means the premise that protects every push decision in this product — *ask once, ask well* — has already been broken for the toggles that were ON by default. | `src/lib/push.tsx:142-160`; `src/app/_layout.tsx:123-135`; ONB Non-Behaviors | Gate registration behind completed onboarding and a first meaningful moment; add the explainer. Independent of everything in this document, and it should not wait for it. | E6 |
| **B3** | **A shipped nudge will walk athletes into the paywall the day tiers flip.** The `program` invitation routes to `/coach`, where `holt_programs` is capped at one lifetime and the gate fires the upsell *before* the six questions. Today `default_tier = 'PREMIUM'` masks it entirely; at Phase F, Holt invites and the paywall answers. This is the one thing the channel may never do. | `src/domain/coach/nudges.ts:103-108,76-79`; `src/app/coach.tsx:548`; `caps-core.ts` | Eligibility gains a remaining-allowance signal; when the allowance is spent the same key routes to the free catalogue and the wayfinding sentence changes with it. | E3, E4, E5 |
| **B4** | **Two of six onboarding goals dead-end at sign-up.** `coachGoalForGoalId` returns null for endurance and athletic, so those athletes answer eight questions, get no program, no Day-1 reveal, and — because they stay in the awaiting face — no tour either. Nothing on screen explains why they got less than the athlete beside them. | `src/domain/onboarding/first-week.ts:16-22`; `src/app/onboarding.tsx:423-432`; `src/domain/home/composition.ts:136,169-190` | Give them a real Day 1 (a tracked run, or the activity they chose) rather than the generic chooser. | E1 |
| **B5** | **There is no orientation at all between sign-up and workout #1.** The guided run is blocked outright until a workout is saved, and the only awareness surface disappears permanently on that same save. Every discovery mechanism in the product is gated behind the event it is supposed to help cause. ⚠ The obvious fix does not work as written: the gate has **one call site and no leg discriminator**, so allowing the tabs leg at zero would also let the Home leg's spotlight fire before there is anything to spotlight. | `tour-plan.ts:1384-1389`; `useTour.tsx:380`; `(tabs)/index.tsx:106`; `Onboarding-Amendment-003` §checklist | Split the gate per leg (`tabsMayStart` / `homeMayStart`); the tabs leg is four sentences and is never thinned, so it is safe at zero. Amendment-003's own validation checklist already says it should fire there. | E1, E9 |
| **B6** | **Moments need one arbiter and a fact-keyed record.** Nothing decides which fact wins when a record, a first-time lift and a weigh-in all land inside one window, and "spent on display" keyed on the *category* rather than the *fact* recreates the bug the PO reported in August — either the same record is re-announced, or the first record ever silences the category for good. | `src/domain/coach/rulebook/review.ts:80-141` (`weekHero` already ranks by rarity); `Status-Archive-2026-09.md:580-593`; `CoachBubble.tsx:258-294` | One selector resolves moments *and* invitations against the shared budget before either is consulted; the record is keyed `(kind, fact-id, date)`; the ordering is `weekHero`'s, extended — decided once, in one table. | E2, E4, E9 |
| **B7** | **The Home tour leg cannot be phased.** Its persistence is a single completed/skipped flag with no phase awareness, unlike the per-surface seen-set which solves exactly this. So the four steps that teach Mission, Your Circle, Train Together and Competitions are unreachable for anyone who is walked through Home once — and the proposed phase fix would not change that. | `src/lib/tour.ts:14-19`; `useTour.tsx:283-293`; `tour-plan.ts:1398,1408`; ONB-A4-D5 | Phase-key the flag the way `screen-prompts` already does, and let `planTour` return the steps a later phase opens. This is a violation of ONB-A4-D5 ("a phase only ever ADDS") in the code today. | E9, E1 |
| **B8** | **Program graduation is forbidden from push outright, by a rule the five-condition test never consults.** M-4's own Non-Behaviors list "fire as a push notification", and P-5 §1 makes it general. It is not a five-conditions failure to be fixed with better wording; it is a category that is closed. | `Docs/M-4-Program-Graduated-Spec.md` Non-Behaviors; `P-5-Notifications-Architecture.md:33` | Drop it from any push list. It remains a perfectly good in-app moment. | E6, E10 |

#### HIGH

| # | Finding | Evidence | Fix | Raised by |
|---|---|---|---|---|
| H1 | **"Take me there" cannot arrive for nine destinations** — the thing is local component state with no route parameter, including the PR chart the PO's example names. | `progress-hub.tsx:71,92,180,189`; `(tabs)/legacy.tsx:125-126,273,309`; no `useLocalSearchParams` in five target screens | Six parameters (§4.6). Until each exists, the row is a description and gets no pill. | E7, E5, E1, E3, E6 |
| H2 | **A parameter on a tab route re-opens its sheet on every refocus**, and a second identical push does nothing — the repo has hit both halves already. | `squad/[id].tsx:213-219,431,989`; `accomplishments.tsx:99-104` | Consume as initial state or as a derived flag with a dismissed guard, add a nonce so a repeat push differs, and clear the param on close. | E7 |
| H3 | **Route-level exposure cannot see 11 of the 28 features**, because they are controls inside a screen. Exposure by pathname would tell Holt an athlete has never tried a chart they open daily — the honors-repeat bug, rebuilt. | `analytics-tracker.tsx:27-34`; `props-core.ts:161-175` (the query is stripped); the 11 control sites | Split the key list: 23 route-level marked from the one existing pathname effect, 16 control-level marked in the handler. | E7 |
| H4 | **Three shipped help topics already misroute**, including "Understand my rank" → Honors, when the rank explainer is a screen with exactly one inbound link. | `chat-core.ts:1176-1187,1236-1241`; `_layout.tsx:383`; `progress-hub.tsx:153-159` | Reroute one, and make the two in-session rows honest describe-only rows. | E7, E5 |
| H5 | **Four of five "Premium-planned" screens have no entitlement code at all** — only the weekly review is gated. The exclusion rule is enforced by hand-audit, not by a test, unlike its sibling rule for Coach AI. | grep for `useEntitlement` across the five screens; `caps-core.ts` M7-D16 precedent | Add the test that walks the catalogue against the tier map. | E3 |
| H6 | **Holt's help copy speaks in the first person about capability Free athletes do not get** ("Swap an exercise" describes the in-workout coach, which is not rendered at all on Free), with no tier branching anywhere. | `chat-core.ts:1176-1181`; `workout.tsx:774` | Reword to what the free path actually offers. | E3 |
| H7 | **The 5th-session template moment duplicates a shipped invitation** with the same trigger and the same destination — and a session tally is activity-counting, which the DNA names directly. | `nudges.ts:110-115`; DNA §2 | One key. If kept, it triggers on a repeated session *shape*, never a count. | E2, E4, E10, E5 |
| H8 | **A finished program pointed at a chart is the wrong door.** A per-lift chart cannot answer "what next", and the shipped `program` invitation becomes eligible the moment a block ends — telling someone who just finished 24 prescribed sessions that they have "been going session to session". | `0104_program_graduation.sql:398-400`; `nudges.ts:103-108`; M4-D11 | Route to the shelf (`recommend`); suppress the `program` invitation for ~14 days after a graduation. | E4 |
| H9 | **Chapter age in days fails the copy rule on its face.** The binding rule bans characterising elapsed time, not merely absence; and there is nothing new on the chapter page on day 30. | `0159:185-188`; DNA §10; ONB-D22 | Trigger on what the chapter *holds* (sessions, records, a photo), never on how long it has been open. | E6, E10, E4, E5 |
| H10 | **Every pill is the athlete's own turn once the nudge moves into the chat**, and two of the three have no reply — the sheet used to close, and a chat cannot answer with silence. | `CoachChatSheet.tsx:1186-1191`; `voice.ts:279-283` | Two new voice keys, three variants each. | E5 |
| H11 | **The quietest coach level volunteers nothing by construction** (`volunteered: 0`), so invitations at that level contradict what the setting is documented and promised to be. | `intensity.ts:74,115,123,129`; `0159:183-184`; `preferences.tsx:50` | Moments only, quiet register, at that level. §4.3. | E5, E10 |
| H12 | **The chat's chip type has no field for a nudge outcome and no payload slot for which nudge is being answered**, so the integration cannot be wired without extending both. | `CoachChatSheet.tsx`; `useCoachDoor.tsx:38-52` | One optional field on the chip, one on the door value. | E9 |

#### MEDIUM — twenty-nine findings, grouped

- **Cadence and budget.** A flat 72-hour window is longer than "noticed" — speak within the next one or two app opens and keep 72 h only as the silent expiry (E2). Three lines a week triples the shipped rate on the object that also carries the rack-side coaching call; two until measured (E10). Nothing damps the frequency after refusals across *different* topics (E2). A permanent mute has no reversal path anywhere (E2). The quietest level needs its own cap, not the shared one (E2).
- **Signals.** The first-time-exercise fact exists only inside the lazy weekly review, which is frozen, capped at six, and weekly — not a 72-hour signal; it needs its own query from the save path (E6, E7, E4). "Weigh-in" has no one-shot key and would fire on every entry; scope it to the first, or the second where a chart first exists (E6, E4). Program completion as specified misses the `finished` state that short programs use (E8). The window must filter on `created_at`, not the server-dated `achieved_on` that every other reader uses (E8, E4).
- **Data.** Migration 0198 was taken by a parallel session; 0199 is next (E8). Reusing the nudge-state table for moment keys turns a bounded eight-row-per-athlete table with no delete policy into an unbounded one, while the client still reads it unfiltered (E8). `mark_feature_seen` on ~30 screens needs a debounce, which no comparable write in this schema lacks (E8). Exposure is new collection and has a disclosure gate the brief conflated with a different decision (E8).
- **Wayfinding.** Nudge and help destinations are untyped strings pushed `as never`; six parameter shapes would fork the one place a destination is decided (E7). The PR chart keys on the exercise *name*, not an id, so the parameter must be the exact string the series is built from (E7, E9). Thirty help rows in the current renderer is a chip wall, re-emitted in full after every answer; a two-stage menu uses shapes the renderer already has (E7, E9).
- **Voice and surface.** The wayfinding sentence cannot live on the coin — it clips at three lines and the path is exactly what gets cut (E7, E5). The shipped test asserts every nudge line ends in a question mark, which a register table breaks by design (E5). Count tokens cannot pluralise through the substitution helper, so "1 honors" would ship unless the token arrives formatted (E5). Every existing Holt copy path hardcodes pounds, so a metric athlete would be told a weight the chart then contradicts (E4).
- **Fit.** Several of the richest features run on a different clock than training frequency — home gym and spreadsheet import are answerable from onboarding, not from rep counts (E2). Three ladders now key off the same workout count (E3, E10, E9). Moments and invitations must resolve inside the domain module, not as a new branch in the component (E9).

#### LOW — fourteen findings

Pinned Legacy and My Standard are the most identity-aligned features in the app and appear in neither catalogue (E2). Plate-club chart marks and plate-club honors disagree about what counts, a pre-existing inconsistency (E4). Isolation-lift records are a Tuesday and should not speak (E4). The progress hub prints "Best streak · N weeks" while every Holt guard bans the word and the rank engine explicitly rejects the mechanic (E5). Bronze-on-cream fails contrast for the `HOLT` eyebrow in the light theme, at 3.40:1 — a one-token fix (E10). Nothing is announced to a screen reader when a line arrives (E10). At large type the three-line clip drops the half of the line that says where to go (E10). "New chapter" as an unprompted invitation is the app proposing that a season of someone's life has ended (E10). The chat sheet honours the OS reduce-motion setting but not the app's own switch (E10). The tests that check help routes strip the query string, so an unconsumed parameter passes green (E7). `personal_records.catalog_key` is nullable and needs the fallback convention the admin metrics already established (E8).

### 2.4 One finding that resolved itself

Two reviewers reported that this document did not exist — one filed it as their top blocker, correctly, since ten experts were reviewing a paraphrase. It exists now, and §4 is written to their findings rather than to the brief they were given. The lesson is recorded in §6: a plan doc whose header disagrees with the code is exactly how the nudge system came to be re-planned two weeks after it shipped.

---

## §3 — The feature inventory

**Method:** every route under `src/app/**` (88, excluding `_layout`, `+html`, and `src/deferred/`), every sub-feature inside the large screens, cross-checked against the wireframe specs and the locked pricing plan. **Tier caveat:** `entitlement_config.default_tier = 'PREMIUM'`, so nothing gates today; *Premium (gated)* means a real `usePremiumGate` / `useEntitlement` call exists and bites at Phase F; *Premium (planned)* means the pricing plan sells it and no code gate exists yet; *Cap N* means free up to N. **Discovery today** names who points at the feature: a tour step id (`tour-plan.ts`), a nudge id (`nudges.ts`), a help topic (`chat-core.ts` `HELP_TOPICS`), or **none**.

### 3.1 The inventory

| Feature | Where (route + how to reach it) | Tier | Depth | Discovery today |
|---|---|---|---|---|
| **SHELL & ONBOARDING** | | | | |
| 4-tab shell (Home · Workouts · Legacy · Squads) | always visible | Free | Core | tour: TABS leg |
| Sign in / Create account / Forgot password | `/sign-in` | Free | Core | — |
| Onboarding (7 steps + Day-1 reveal) | `/onboarding` | Free | Core | itself |
| Guided tour — TABS leg (4 cards) | automatic on first arrival — **but only after workout #1** (D2) | Free | Secondary | — |
| Guided tour — HOME leg (7 spotlit steps) | from the Initiative ceremony's "Keep Building"; only 3 steps ever fire (D1) | Free | Niche | — |
| Ceremony queue (rank-up · honor · goal · graduation) | automatic; never stacks; never during a workout | Free | Core | — |
| **HOME** | | | | |
| Home hub (fresh / awaiting / settled / live faces) | `/` | Free | Core | tour: `tab-home` |
| Chapter title block | Home, top | Free | Core | tour: `home-chapter` |
| Today's Workout card (start / resume / preview) | Home hero | Free | Core | tour: `home-workout` |
| Workout Preview sheet | Home → Today's Workout → Preview | Free | Secondary | **none** |
| Swap today's session for another in the week | Home → Today's Workout → give-back control | Free | Niche | **none** |
| Program path chooser (Build it with me / Bring your own / Just train) | Home, fresh athlete only | Free | Core | — |
| Experience-level intake stepper | Home → "Help me find one" | Free | Secondary | — |
| Mission tile (chapter goals) | Home grid → `/goals` | Free | Secondary | tour: `home-mission` (unreachable, D1) |
| Weekly Review card | Home, within 24 h of the week's row | Premium (gated) | Niche | **none** |
| Holt band ("Want a plan?") | Home, only with no program | Free | Secondary | itself |
| Your Circle card (live-now friends) | Home | Free | Secondary | tour: `home-circle` (unreachable, D1) |
| Quick Actions (Train Together · Competitions) | Home | Free | Secondary | tour: `home-train-together`, `home-competitions` (unreachable, D1) |
| Training Now sheet (who's training, invite) | Home → Train Together | Free | Niche | **none** |
| Explore Forge section (4 pillar tiles) | Home, only while awaiting workout #1 | Free | Niche | itself |
| Daily principle line | Home | Free | Niche | — |
| Notification bell → `/inbox` | Home AppBar | Free | Core | — |
| **ACTIVE WORKOUT** (`/workout`) | | | | |
| The logger | `/workout` from Home hero, Workouts, a template, a program, an invite | Free | Core | tour: `w-hero`, `w-sets` |
| Rest timer — Off / Auto / Manual | header chip; **the right-hand track cycles the mode** | Free | Core | tour: `w-rest` (P2) |
| Rest timer ±15 s / skip / pin / pause | rest overlay | Free | Secondary | — |
| Rest duration wheel (m:s) | tap the chip's **text**, not the track | Free | Niche | **none** |
| Per-set `Prev` column | set grid | Free | Secondary | — |
| Plinth: Goal · Best · Last Time | under the exercise name | Free | Secondary | tour: `w-hero` |
| "Last time, in full" | tap the plinth's Last Time | Free | Niche | **none** |
| "What you said last time" (carried-forward note) | under the plinth when a prior note exists | Free | Niche | **none** |
| How To pill (735 coaching records) | foot of the exercise rail | Free | Secondary | **none** |
| Exercise demo loop | top of the exercise card | Free | Secondary | — |
| Your note on this exercise | ⋮ → Add a note | Free | Secondary | tour: `w-options` (P3) |
| The plan's coach note | ⋮ (read-only) | Free | Niche | — |
| Effort prompt ("How did that feel?") | once, first set of a new movement | Free | Niche | — |
| Holt intensity (Cues only / Steady / Push me / Drive me) | Holt coin → sheet → chips; `/preferences` | Free | Niche | **none** |
| In-workout Coach Holt (coin) | `/workout` bottom-right | Premium (gated — suppressed on Free) | Core | — |
| Holt: progression chips / swap / add / take out / break superset | Holt sheet | Premium (gated) | Secondary | — |
| Supersets ("Superset with next") | exercise ⋮ / Picker toggle | Free | Niche | **none** |
| Workout Plan overview + jump + bulk remove | header → "View full workout plan" | Free | Secondary | tour: `w-addset` |
| Swipe pager between exercises | horizontal swipe | Free | Secondary | — |
| Warm-up / Main / Cool-down sections | kicker; chosen in the Picker | Free | Secondary | tour: `db-sections` |
| Cardio block inside a strength session | Picker → cardio rows | Free | Niche | tour: `db-cardio` |
| Live GPS run tracking | Workouts → Start Training → Track a Run | Free | Secondary | tour: `wk-start` (P3) |
| Auto-pause | automatic during a tracked run | Free | Niche | **none** |
| Route map + elevation | Activity Detail of a tracked run | Free | Niche | **none** |
| Route on a post (opt-in per post) | share sheet on a run | Free | Niche | **none** |
| AMRAP / hold clocks · % of max loading · change the bar forward | automatic per prescription | Free | Niche | — |
| "Trained with" partner tagging | ⋮ | Free | Niche | **none** |
| "Invite someone to join" mid-session | ⋮ | Free | Niche | **none** |
| Attach a playlist (Spotify / Apple Music link) | ⋮ | Free | Niche | **none** |
| Name this workout | ⋮ | Free | Niche | — |
| Publish your live session for friends | automatic if `/profile-visibility` → live session ≠ private | Free | Niche | **none** |
| Offline save queue | automatic | Free | Niche | — |
| Resume an interrupted session | `/workout` re-entry | Free | Secondary | — |
| **WORKOUT COMPLETE** | | | | |
| Seal ceremony (hold to finish) | `/workout-complete` | Free | Core | untutored by decision (ONB-D18) |
| Note for future you | Workout Complete | Free | Secondary | — |
| Add photo / video to today's chapter | Workout Complete → Add a photo or video | Cap 75 / 5 videos | Secondary | — |
| Save this session as a template | Workout Complete → The Record → Save as template | Cap 5 | Niche | nudge: `templates` (indirect) |
| Share session (Squad · Friends · Both · OS) | Workout Complete → Share; Activity Detail | Free | Secondary | — |
| Share-card image export | any Share → Save Image | Free | Secondary | **none** |
| PR detection | automatic on save | Free | Core | — |
| **WORKOUTS / PROGRAMS / TEMPLATES** | | | | |
| Workouts hub (My Workouts / Discover) | `/workouts` | Free | Core | tour: `wk-segments`, `wk-active` |
| Start Training sheet (5 doors) | Workouts → start button | Free | Core | tour: `wk-start` (P3) |
| Program catalogue (14 authored) | Workouts → Discover | Free | Core | tour: `wk-programs` |
| "Recommended Next" program | Discover, top | Free | Secondary | — |
| Program Detail (schedule · log · progress · lifecycle) | `/program/[id]` | Free | Core | tour: `pd-progress`, `pd-schedule`, `pd-actions` |
| Ask Holt (safe-edit one session) | Program Detail → Ask Holt | Premium (planned) | Niche | help: "Change a program" |
| Set your lift maxes | Program Detail → LiftMaxSheet | Free | Niche | **none** |
| Share Card for a program | Program Detail → Share Card | Free | Niche | **none** |
| Send Program (a real copy) | Program Detail → Send Program | Free (uses a recipient slot) | Niche | **none** |
| Receive a program | `/program-share/[id]` | Cap 3 (gated on accept) | Niche | — |
| Program Builder | `/program-builder` | Cap 3 lifetime | Core | tour: `pb-*` (5 steps) |
| Import from a spreadsheet / pasted table | Program Builder → Import; Holt → Import a program | Cap 1 lifetime | Niche | tour: `pb-import`; help: "Import a program" |
| Copy / jump / clear a week | Program Builder | Free | Niche | — |
| Save a week as a Week Template | Program Builder | Cap (short programs) | Niche | tour: `tp-new` |
| Per-exercise coaching note (author) | Program Builder → exercise → note | Free | Niche | — |
| Workout Builder (plan one day) | `/workout-builder` | Cap 5 | Secondary | tour: `db-*` |
| Templates hub | `/templates` | Cap 5 | Secondary | tour: `tp-list`, `tp-new` (data-gated, D3); nudge: `templates` |
| Forge Templates library (81 shipped sessions) | `/forge-templates` — Templates → Single Sessions | Free (never count) | Niche | **none** |
| Log a Run (after the fact) | Workouts → Start Training → Log a Run | Free | Secondary | — |
| Activity History | `/activity-history` — Workouts → Reference | Free | Secondary | tour: `wk-reference` (P3); help: "See my history" |
| Activity Detail | `/activity/[id]` | Free | Secondary | — |
| **EXERCISE LIBRARY** | | | | |
| Library hub + search (733) | `/exercise-library` — Workouts → Reference | Free | Secondary | tour: `el-hub`, `el-search` |
| Favourite an exercise | row → star | Free | Niche | **none** |
| Recently Used shelf | hub | Free | Niche | — |
| My Exercises / custom exercise | Library → My Exercises → + New; Picker | Cap 100 | Niche | **none** |
| Home Gym profile (32 items) | Account Settings → Training → My Home Gym; Library filter | Free | Niche | tour: `el-filters` (P2); help: Home Gym |
| Exercise Detail (why / how / cues / mistakes / alternatives) | `/exercise/[id]` | Free | Secondary | **none** |
| Exercise Picker | `/exercise-picker` | Free | Core | tour: `db-add` |
| **COACH HOLT** | | | | |
| The coin (4 tab surfaces) | bottom right | Free | Core | introduction line (once) |
| Chat sheet (chips) | tap the coin | Free | Core | — |
| Help topics (11) | chat sheet → "how do I…" | Free | Niche | itself |
| Exploration nudges (8) | coin line on a tab surface | Free | Niche | itself |
| Program wizard | `/coach` | Cap 1 lifetime | Core | nudge: `program`; Holt band |
| Single-day generation | `/coach` → Just today's workout | Cap 2 / month | Secondary | — |
| Race plans (5 distances) | `/coach` → endurance goal | Cap | Niche | **none** |
| **LEGACY** | | | | |
| Legacy hub | `/legacy` | Free | Core | tour: `lg-*` (7 steps) |
| Rank badge → Progress Hub | Legacy → badge | Free | Core | tour: `lg-rank`; nudge: `progress` |
| My Standard (creed) | Legacy → tap the Standard text | Free | Niche | tour: `lg-standard` (P1) |
| Pinned Legacy (6) + manager | Legacy → Pinned Legacy → Edit | Free | Niche | tour: `lg-pinned` (P2) |
| Featured Legacy Moment | automatic | Free | Niche | tour: `lg-featured` (P2) |
| Legacy Timeline | `/legacy-timeline` | Free | Secondary | tour: `tl-*` (data-gated, D3) |
| What Endures band → Transformation · Photos · Trophies | Legacy | Free | Secondary | tour: `lg-endures` (P3) |
| Accomplishments (+ Featured on Profile, max 3) | `/accomplishments` | Free | Secondary | tour: `ac-*` (data-gated, D3) |
| Honors Hub (131) | `/honors` | Free | Secondary | tour: `hn-*` (data-gated); nudge: `honors`; help |
| Chapter Detail | `/chapter/[id]` | Free | Core | tour: `cd-*` (5 steps) |
| Create a new chapter | `/chapter/new` — Legacy → Start a Chapter | Free | Niche | **none** |
| Seal a chapter + reflection (M-5) | Chapter Detail → Seal → `/chapter/reflect` | Free | Niche | tour: `cd-seal` (P3) |
| Photos gallery | `/photos` | Cap 75 | Secondary | tour: `pg-*` (data-gated, D3) |
| Add Photo (label, caption, backdate, cover) | `/add-photo` from Chapter Detail or Workout Complete | Cap 75 / 5 video | Niche | tour: `cd-archive` (P2) |
| Transformation Gallery (6 poses) | `/transformation` | Cap 75 (shared) | Secondary | tour: `tf-*` (data-gated); nudge: `photos` |
| Long-press an entry → Compare from here / Edit / Delete | Transformation → long-press | Free | Niche | **none** |
| New progress set | `/transformation-add` | Cap | Secondary | nudge: `photos` |
| Transformation Compare (slider) | `/transformation-compare` | Premium (planned) | Niche | tour: `tf-compare` (P2) |
| Drag / pinch to align at the seam | Compare → drag the photo | Free | Niche | **none** |
| Share Configuration (4 templates + 3 formats) | `/share-config` — only from Compare → Share | Free | Niche | **none** |
| Progress Photo Post (Instagram formats) | `/progress-photo-post` | Free | Niche | **none** |
| Trophy Case | `/trophy-case` | Free | Niche | tour: `tc-*` |
| **PROGRESS HUB / RANK / BODY** | | | | |
| Progress Hub | `/progress-hub` — Legacy → rank badge | Free | Secondary | tour: `ph-*` (4); nudge: `progress`, `metrics` |
| Rank Journey | Progress Hub | Free | Secondary | tour: `ph-rank` |
| Rank Progression (what each rank asks) | `/rank-progression` — Progress Hub → See every rank | Free | Niche | **none** |
| Strength tiles + Edit which lifts | Progress Hub → Strength → Edit | Free | Niche | tour: `ph-strength` |
| **Metric Detail — dated chart, PR marks, plate-club milestones** | Progress Hub → tap a strength tile (**no deep link**) | Free | Niche | **none** |
| Consistency stats | Progress Hub | Free | Secondary | tour: `ph-consistency` (P2) |
| Body metrics (opt-in): weigh-ins + chart | Progress Hub → Body → toggle on | Free | Niche | nudge: `metrics` |
| **GOALS** | | | | |
| Goal Hub (primary + supporting, chapter-scoped) | `/goals` | Free | Secondary | tour: `gl-*` (data-gated); nudge: `goals`; help |
| Auto-tracking goals (lift / distance / body weight) | Goal create → Track Progress | Free | Niche | tour: `gl-progress` (P2) |
| Update Progress / Mark Achieved (M-3) | Goal Detail | Free | Secondary | — |
| **SQUADS & SOCIAL** | | | | |
| Squads hub | `/squads` | Cap 1 | Core | tour: `sq-*` (data-gated, D3) |
| Create / Join by code / Discover / Preview | `/create-squad`, `/join-squad`, `/discover-squads`, `/squad-preview` | Cap 1 | Secondary | tour: `sq-discover`, `sq-create`, `sq-join`, `ds-*`, `sp-*`; nudge: `squads`; help |
| Squad Detail (hero, goal, feed, competitions, records) | `/squad/[id]` | Free | Core | tour: `sd-*` (6) |
| Squad Goal Detail (pace, contribution, waypoints) | Squad Detail → tap the goal card | Free | Niche | **none** |
| Feed + Composer (8 post types incl. Posted Workout) | Squad Detail → compose | Free | Secondary | tour: `sc-*` |
| Squad Post Detail | `/squad-post/[id]` | Free | Secondary | — |
| Weekly Squad Recap | `/squad-recap/[id]` — feed → weekly card | Premium (planned) | Niche | **none** |
| Squad Records (+ lineage) | `/squad-records` | Premium (planned) | Niche | tour: `srec-*` (data-gated) |
| Hall of Champions | `/hall-of-champions` | Free | Niche | — |
| Settings · Invite (code, QR, `ref=`) · Requests · Transfer | `/squad-settings`, `/squad-invite`, `/squad-requests`, `/squad-transfer` | Free | Niche | tour: `ss-*`, `sr-*` |
| Competitions hub | `/competitions` | Free (join) | Secondary | tour: `sd-competitions` (P3) |
| Create a Challenge | `/create-challenge` | Premium (planned) | Niche | excluded by rule |
| Standings · Podium · Results · Current Champions · History | `/challenge/[id]`, `/podium/[id]`, `/challenge-results/[id]`, `/current-champions`, `/competition-history` | Free | Secondary / Niche | — |
| Friends feed (4 reaction kinds) | `/friends` | Free | Secondary | tour: `fr-*` |
| 4-way reaction (hold the control) | feed → hold | Free | Niche | **none** |
| Add Friend (name or @handle) | `/add-friend` | Free | Secondary | tour: `af-*`; help |
| Athlete Profile | `/athlete/[id]` | Free | Secondary | — |
| Report / Block · Blocked People | Athlete Profile → bottom; `/blocked` | Free | Niche | excluded by rule |
| Ask a friend to train · accept an invite · join a live session · watch a live workout | `/train-invite`, `/workout-invite`, `/workout-join`, `/live-workout/[id]` | Free | Niche | tour: `home-train-together` (unreachable, D1) |
| **NOTIFICATIONS, SETTINGS, ACCOUNT** | | | | |
| Inbox | `/inbox` | Free | Secondary | — |
| Push preferences (P-5) | `/notifications` | Free | Secondary | — |
| Morning Briefing (days + hour editor, revealed by the toggle) | `/notifications` → Morning Briefing → on | Free | Niche | **none** |
| Profile Visibility | `/profile-visibility` | Free | Niche | **none** |
| Preferences: Units | `/preferences` | Free | Secondary | — |
| Preferences: Alabaster (light) theme | `/preferences` → Appearance | Free | Niche | **none** |
| Preferences: How hard Holt pushes | `/preferences` → Coaching | Free | Niche | **none** |
| Preferences: Reduce Motion · Sound · Haptics | `/preferences` → Experience | Free | Niche | — |
| Account Settings · Edit Profile (crop, handle, sex, athlete type) | `/account-settings`, `/edit-profile` | Free | Core / Secondary | — |
| Export My Data (CSV) | `/account-settings` → bottom | Free | Niche | **none** |
| Send Feedback | `/feedback` | Free | Niche | — |
| Subscription (P-8) | `/subscription` | — | Secondary | M-7 only |
| Referral code capture | squad invite `ref=` — **no surface to type one** | Free | Niche | open (Launch Checklist §4.4) |
| Creator Dashboard | `/admin` (admins) | Admin | Niche | excluded by rule |

### 3.2 The twenty-eight hardest to find

Each is three or more taps deep, behind a long-press or hidden gesture, or revealed only by a switch. The current eight nudges and eleven help topics cover **six** of them (Honors, Goals, Templates, Progress Hub, Body, Squads).

| # | Feature | The real path |
|---|---|---|
| 1 | Transformation: Compare from here / Edit / Delete | Legacy → What Endures → Transformation → **long-press** an entry |
| 2 | Align two photos at the seam | Compare → **drag the photograph**, pinch to size |
| 3 | Share Configuration | Legacy → What Endures → Transformation → Compare → Share (5 taps) |
| 4 | Rest-timer mode cycle | mid-workout, the **right-hand track** of the Rest chip |
| 5 | Everything under Holt's coin in a workout | swap, add, break superset, take out — coin only, not rendered on Free |
| 6 | Bulk-remove exercises | "View full workout plan" → × per row |
| 7 | Morning Briefing schedule | Account Settings → Privacy & Alerts → Notifications → Morning Briefing → **toggle on** |
| 8 | Alabaster theme | Account Settings → Training → Preferences → Appearance → Theme → restart |
| 9 | Export My Data | Account Settings → scroll past every section |
| 10 | Rank Progression | Legacy → rank badge → Progress Hub → Rank Journey → "See every rank" (4 taps) |
| 11 | Metric Detail chart + plate-club milestones | Progress Hub → **tap a strength tile** (reads as a static stat) |
| 12 | Edit which lifts | the small "Edit" beside Strength & Performance |
| 13 | Body metrics | Progress Hub → Body → **opt-in toggle** |
| 14 | Pinned Legacy manager | Legacy → Pinned Legacy → "Edit" |
| 15 | My Standard | Legacy → tap the Standard text (no chevron) |
| 16 | Forge Templates (81 sessions) | Workouts → Your Templates → Templates hub → "Single Sessions" |
| 17 | Spreadsheet import | Program Builder, between the length controls and the day list |
| 18 | Custom exercise | Workouts → Reference → Exercise Library → My Exercises → + New |
| 19 | Home Gym profile | Account Settings → Training → My Home Gym; or Library → Filter → Where you train |
| 20 | Playlist · Trained with · Invite someone | mid-workout ⋮ |
| 21 | Save this session as a template | Workout Complete → See the details → Save as template (after the ceremony) |
| 22 | 4-way reaction | **hold** the acknowledge control |
| 23 | Report / Block · unblock | Athlete Profile → scroll below everything; unblock lives in Account Settings |
| 24 | Squad Goal Detail | tap the goal card itself (reads as a progress bar) |
| 25 | Squad Weekly Recap | scroll the feed → tap the weekly card |
| 26 | Guided HOME tour | only from the Initiative ceremony's "Keep Building" |
| 27 | Auto-pause · route map | nothing announces either |
| 28 | Referral codes | no surface to type one in |

---

## §4 — The nudge system v2

> Everything in this section is written to the findings in §2, not to the brief the experts were given. Where a lens dissented, the dissent is recorded inline rather than resolved silently.

### 4.1 Taxonomy — three kinds, one mouth

| Kind | What it is | Trigger | Retires |
|---|---|---|---|
| **MOMENT** | a fact from the athlete's own record | a fact ≤72 h old, read fresh on arrival at an idle tab | on display, keyed to the **specific fact** — never the category (B6) |
| **INVITATION** | a part of Forge the athlete has never opened | a signal says never-opened, and the ladder allows it | when the feature is used, or after two refusals |
| **WAYFINDING** | a path, on request | the athlete opens Holt's help menu | never — it is a menu |

**Three rules bind all three.** They come from the shipped system and are not up for redesign: the **coin is the only surface** (no banner, no card, no new component); the coin appears on `/`, `/workouts`, `/legacy`, `/squads` and nowhere else; and **nothing is ever said during a session**, because that same object is carrying the progression call at the rack, and a nag here costs the coaching there.

**Moments are a derived read, never a fired event.** A new function returns the eight counts plus the facts from the last 72 hours; the client asks on arrival, exactly as it asks today. Nothing is enqueued at save time, so a crash, an offline save, or a second device changes nothing — the same reasoning that made the in-workout line derived rather than pushed (W9-A6-D3).

⚠ **A moment is spoken on the next app session, not on the arrival that follows the seal screen.** The seal already said "personal record"; the coach's second telling is the next morning, not sixty seconds later.

### 4.2 The catalogue

#### Moments — four, plus two spoken once in a lifetime

Cut from the brief, each for a stated reason: **plate-club crossings** (an honor ceremony says it minutes earlier, and outranks the coin), **stalls and deloads** (a flat chart pointed at is a grade delivered as a picture; the stall belongs in the next prescription, and the ledger that would detect it is locked as unread), **the 5th session** (a shipped invitation, and a tally), **chapter age in days** (a calendar fact the DNA forbids in Holt's mouth), **the first photo** (not a training fact, and its payoff screen is Premium-planned).

| id | Fires when | Destination | Freshness | Notes |
|---|---|---|---|---|
| `pr` | a `personal_records` row ≤72 h old, on a **compound** pattern, **with an earlier row for the same lift** — B1 | `/progress-hub?metric=<exercise>` | 72 h | The headline. Blocked on B1. Isolation lifts do not speak: a 2.5 lb curl record is a Tuesday. |
| `pr_multi` | two or more of the above in one session | `/progress-hub` (no lift named) | 72 h | One line, never two. Names the lifts, never ranks the day. |
| `program_done` | `programs.state` becomes `graduated` **or** `finished` ≤72 h ago, and after M-4 has been dismissed | Holt's chat, `recommend` intent — **the shelf, not a chart** (H8) | 72 h | Also suppresses the `program` invitation for 14 days. |
| `first_exercise` | first ever logged set of a catalogued exercise whose coaching is Published, not in the athlete's first week | `/exercise/[id]` | 72 h, **once ever** | Its job is to teach that 735 coaching pages exist. After that, firsts live in the weekly review. |
| `first_route` | the first workout with a GPS route | `/activity/[id]` | 72 h, **once ever** | Nothing in the app announces the map or auto-pause. |
| `weighin_chart` | the **second** body entry (the first at which a line exists) | `/progress-hub?section=body` | 72 h | Optional. Never states a direction — weight is the most shame-adjacent number in the app. |

**Priority when several are eligible** reuses the weekly review's existing rarity ordering rather than inventing one (B6): honor → single record → multiple records → first-time exercise → longest run → everything else. It is decided once, in one table, the way the review already decides it.

#### Invitations

The eight shipped rows stay, five of them rewritten (§4.5). New rows, with the ladder they sit on:

| id | Eligible when | Destination | Ladder |
|---|---|---|---|
| `forge_templates` | never opened | `/forge-templates` | P2 |
| `home_gym` | equipment says home or limited, and no gear list | `/home-gym` | **not the ladder** — answerable from onboarding, so eligible immediately (E2) |
| `custom_exercise` | none created, ≥10 sessions | `/custom-exercise` | P3 |
| `my_standard` | the creed is empty | `/legacy?open=standard` | P2 |
| `pinned_legacy` | ≥1 pinnable thing exists, none pinned | `/legacy?open=pinned` | P3 |
| `accomplishments` | none logged | `/accomplishments` | P3 |
| `legacy_timeline` | never opened | `/legacy-timeline` | P2 |
| `preview_swap` | a program is running, the swap has never been used | Home's hero | P2 |
| `rank_progression` | rank ≥ tier 2, never opened | `/rank-progression` | P3 |
| `export_data` | ≥25 sessions | `/account-settings?scroll=export` | P3 |
| `morning_briefing` | a program is running, the briefing is off, **and push permission is already granted** | `/notifications?section=briefing` | P3 |
| `alabaster` | the theme has never been changed | `/preferences?section=appearance` | P3, last |

**Cut, with reasons.** `exercise_note`, `playlist`, `trained_with` — the control exists only inside a live session, where the coin never speaks; they become help topics. `share_card` — the coach asking the athlete to distribute the app is marketing in Holt's mouth. `new_chapter` — the app proposing that a season of someone's life has ended; a help topic, never an invitation.

**Excluded by standing rule, recorded so it is not rediscovered:** anything behind the paywall (Transformation Compare, Squad Records, Squad Recap, Create a Challenge, the Weekly Review), anything that puts the athlete in front of other people uninvited (friend requests, challenges), Report and Block, and the operator dashboard. An invitation to spend money is not an invitation to explore, and it would poison a channel whose only asset is that it has never sold anything.

⚠ **Every invitation row carries its tier and its cap headroom** (H5, B3). A row whose destination fires a paywall on arrival is not eligible, and a test walks the catalogue against the tier map rather than trusting an audit.

#### The ladder

Phases key to workouts logged, reusing the counter the tour already seeds from the server: **P1 at 3 · P2 at 10 · P3 at 25.** Moments have no phase — a record at session two is real. Features whose value runs on a different clock than training frequency are not on the ladder at all (home gym, spreadsheet import). Nothing announces a phase; nothing asks.

### 4.3 Cadence and budget — the sign-off table

These numbers are the design. Everything else is a lookup table.

| Rule | Invitations | Moments |
|---|---|---|
| Earliest | 3 logged sessions | any time |
| Own gap | 7 days, measured globally across all invitations | 48 hours |
| **Combined ceiling** | **≤2 unprompted lines in any rolling 7 days** (E10 — the shipped rate is one; three triples it) | same budget, one ledger |
| Freshness | — | spoken within the next one or two app opens; **silently dropped at 72 h**, never spoken stale |
| When | on arrival at an idle tab | the **next app session** after the fact, never the arrival after the seal screen |
| "Not now" | returns in 21 days | not applicable — a moment is once |
| Refused twice | never again | not applicable |
| "Don't bring this up again" | that row, forever | that **kind**, forever |
| Acted on | retired forever | spent on display, keyed to the fact |
| Pattern of refusals | 2+ refusals on distinct topics in 30 days **widens the gaps** (invitations 7→14 days, moments 48→96 h) without the athlete having to say so | |
| During a session, a ceremony, or a running tour | never | never |
| At the quietest coach level | silent | **speaks**, quiet register, ≤1 per 7 days |

**Priority on the coin:** introduction → the draft you left in the builder → a moment → an invitation. Ceremonies, the tour and a live session still hide the coin entirely.

**On the quietest level (decision D).** `reminders` sets `volunteered: 0` — he answers when asked and otherwise stays quiet — so an invitation at that level contradicts the setting. A moment is different in kind: it is a fact about the athlete's own record, which is exactly what the Morning Briefing already delivers at that level, without a line of encouragement. One lens argued the dial should be in-session only; the briefing settles that it is not.

### 4.4 The opt-out ladder

**1 — In his chat.** Tapping the coin while a line is showing opens Holt's chat with the line as his turn, in the chip language the help menu already uses:

| Pill | Copy | Writes |
|---|---|---|
| Primary | **Take me there** | used — retires the row forever, then navigates. For a row with no honest destination: **Got it**, same write. |
| Secondary | **Not now** | dismissed — 21-day cooldown, two is an answer. Not "Later": later is a promise he would have to keep. |
| Tertiary, quiet, last | **Don't bring this up again** — and on a moment it names the kind: *"Stop noting records"* | mutes that row or that kind, permanently |

Closing the sheet by swipe or backdrop is **still not a refusal** — someone who opened it by accident has not said no. Every pill is echoed as the athlete's own turn, so **each gets a reply** (H10): *"Fair enough. It'll keep."* · *"Noted. That one's off the list."* No apology, no telling them when he will ask again — announcing your next nag is a nag.

**2 — Preferences → Coaching**, a second card under the intensity dial. Header: **What Holt brings up**. Hint: *On Home, Workouts, Legacy and Squads. Never during a session, never as a notification.*

| Switch | Label | Description | Default |
|---|---|---|---|
| 1 | **Things worth trying** | Parts of Forge you haven't used, one a week at most — a no is remembered | on |
| 2 | **Moments from your record** | A new best, a first, a finished block, and where it's kept — facts only | on |

Plus one action, because a permanent mute has no reversal path anywhere in the product today (E2): **Reset what Holt has offered** — clears the per-row mute state through a scoped function, never a raw delete grant, preserving the reason the table has no delete policy.

Footer, in the house style: *These are lines on Holt's coin, in the app. Turning one off never hides anything he pointed at.*

**3 — Guided Tips** (Account Settings) remains the tour's switch and does not touch Holt; the doc says so plainly in both directions.

**4 — The intensity dial**, per §4.3.

### 4.5 Voice

Lines live in a new pure table, `src/domain/coach/rulebook/nudge-voice.ts`, keyed by row and register, three variants per cell, reusing the no-repeat memory and the null-on-missing-token discipline the in-workout table already has. **A missing token nulls the line** rather than printing a brace at somebody.

**The grammar — three sentences, fixed order:**

```
[FACT or THING]   [WHERE]   [CLOSE]
```

- **FACT** (moments) — one declarative sentence from the athlete's own record, noun first, no adjective about the athlete. Any assessment is handed over as a conditional, never asserted.
- **THING** (invitations) — one sentence about what Forge has, never about what the athlete lacks. The signal is "never used"; the sentence is never "you haven't".
- **WHERE** — the wayfinding sentence (§4.6). Composed per row, not picked: the path is the proof he knows where it is, and a path that varies invites drift.
- **CLOSE** — quiet: none. Plain: a yes-or-no question. Direct: an imperative aimed at **the thing**, never at the athlete.

⚠ **The coin shows the fact and loses the path.** It clips at three lines, so the first sentence must stand alone and be ≤70 characters filled; the path and the question belong to the sheet. Never write a line whose meaning needs sentence two.

**The guard test** extends the three regexes already shipped — the briefing's absence rule, the intra-set grading rule, the review's comparison rule — plus money and app-speak, and runs with positive controls so it cannot rot. Lines that must fail include *"You haven't taken a progress photo yet"*, *"That looked easy. Go up next time"*, *"Most people can't see their own progress week to week"* (which is the shipped photos line, and fails on comparison), and anything with an exclamation mark, an emoji, or a price. Shape assertions ride alongside: quiet cells carry no question mark, plain cells end in one, direct cells end in a full stop, every cell has three variants, no line exceeds 180 characters filled, and count tokens arrive **pre-formatted with their noun** so "1 honors" cannot ship.

**The bench example, in three registers:**

- quiet — "Bench Press went to 225 lb. Its chart is under your rank badge in Legacy."
- plain — "Bench Press went to 225 lb. The whole line it sits on is under your rank badge in Legacy, on the Bench Press tile. Want to see it?"
- direct — "Bench Press, 225 lb. New best. Legacy, your rank badge, the Bench Press tile. Go look at the line."

Two more, one of each kind:

- first-time exercise, plain — "First Bulgarian Split Squat on the record. Its page in the Exercise Library, under Workouts, has the setup and the mistakes to watch. Want to read it before the next one?"
- the 81 shipped sessions, plain — "Forge ships 81 sessions, written and ready to run. They're under Single Sessions, in Workouts. Want to see them?"

The full set — 234 lines across 26 rows and three registers, plus the two reply keys — is in `scratchpad/discovery/expert-05-copywriter.md` §3 and is the drafting source for the module.

⚠ **One shipped test must change.** It asserts every nudge line ends in a question mark, which a register table breaks by design.

⚠ **Weights are formatted through the units helper, not interpolated.** Every existing Holt copy path hardcodes pounds; a metric athlete would otherwise be told a number the chart then contradicts.

### 4.6 Wayfinding, destinations, and exposure

#### The six parameters

"Land on the thing, not near it" is true today for 13 of 28 destinations. Six parameters make it 20; the rest are honest descriptions.

| Parameter | Opens | Work |
|---|---|---|
| `/progress-hub?metric=<exercise name>` | that lift's chart — the series is keyed by the exercise name, so the parameter is that exact string, URL-encoded, and a miss is silent | trivial |
| `/progress-hub?section=body` · `?section=strength&edit=1` | the body section, or the which-lifts editor | small |
| `/legacy?open=standard` · `?open=pinned` | the creed editor, or the pin manager | trivial |
| `/notifications?section=briefing` | scrolled to the briefing, which is the last section and below the fold | small |
| `/preferences?section=appearance` · `?section=coaching` | the theme card, or the intensity card | small |
| `/account-settings?scroll=export` | the bottom, where Export sits above Sign Out | trivial |

⚠ **Every parameter is consumed as initial state or as a derived flag with a dismissed guard, with a nonce so a repeat push differs, and cleared on close** (H2). The repo has already been bitten by both halves of this on a tab route. And destinations stop being untyped strings pushed past the type system: a second entry point beside the notification destination resolver, sharing its literal-pathname union, so the one place a destination is decided stays one place.

#### Destinations that stay descriptions

In-session controls (the rest-timer mode track, the note row, the three-dot menu, the bulk-remove sheet), gesture-only controls (the long-press on a transformation card, the four-way reaction hold, the drag-to-align), and anything needing a payload the coin does not have (Share Configuration). Holt names the path and offers the nearest screen. **A pill that lands near is worse than a sentence that is honest.**

#### Help topics

Eleven rows become 37, in a two-stage menu built from shapes the chat renderer already has: seven group chips, then that group's rows as cards. Thirty rows as a flat chip wall, re-emitted after every answer, is what the current renderer would produce.

**Three shipped rows are corrected first** (H4): "Understand my rank" routes to the rank explainer rather than to Honors; the two in-session rows say plainly that the control is inside a session and stop pretending their pill lands on it.

#### Exposure

A new insert-only table records the first time an athlete opens each catalogued destination, so "never tried" means never *seen* rather than never *created* — which is what the honors row already worked around by hand. **Two key sets** (H3): 23 route-level keys marked from the single pathname effect that already exists, and 16 control-level keys marked in the handler that opens the thing, because a chart opened daily changes no route. It is product state, not analytics — insert-only, owner-scoped, no update, no delete, not subject to the analytics opt-out, and debounced.

#### The path grammar

**Place, then control, then gesture — at most three named stops, each printed exactly as the app prints it, spoken as a sentence.** Tabs are the four words on the bar, plus Settings for the avatar. Section labels and control labels are quoted from the screen, never paraphrased. Gestures are verbs — *hold* a card, *drag* the photo, *tap its right-hand end* — never "long-press". In-session controls are prefixed "Mid-workout," and never get a pill.

### 4.7 Measurement

Six events on the existing pipeline, using prop keys already on the allowlist, so no schema change and no new vocabulary: `nudge_shown` · `nudge_opened` · `nudge_used` · `nudge_dismissed` (later or never) · `nudge_muted` · `feature_first_used`.

An `/admin` **Discovery** block, aggregates only: the invitation funnel by row, the moment funnel by kind, feature reach from the exposure table, median sessions-to-first-use per feature, and a mute summary. It must read as *reach* and be labelled distinctly from the feature-adoption tile that already ships, or the two numbers will be read as contradicting each other.

**The one number to watch weekly:** the share of shown lines that are acted on. If it falls below roughly a third, the catalogue is speaking to people who did not want it, and the budget comes down before the catalogue grows.

⚠ **The owed defect first.** Nobody has verified that the nudge-state writes land at all — the write helper swallows every failure by design, so a missing privilege looks exactly like the bug that was fixed in August. A dashboard built on an unverified write is worse than no dashboard. The probe is in Stage 0.

### 4.8 Push — not in v2, and what it would take

The brief proposed a P-5 Section G. Two lenses independently concluded it has no authority, and the design is withdrawn:

- **The ceremony specs refuse recognition-class push by name.** A record, an honor and a rank change each list "fire as a push notification" under their own Non-Behaviors, and P-5 §1 generalises it. A note about a record delivered to somebody who has left the app is recognition used as re-engagement — the class §1 rules out, whatever the wording.
- **Program graduation is closed outright** (B8), so the largest candidate fails before the five-condition test is reached.
- **The premise that protects the permission is already spent** (B2): the app asks at account creation, before onboarding, with no explainer.

If it is ever wanted, the shape is known and the cost is a locked decision, not a migration: a **sixth condition** added to P-5's five — *coaching, not recognition* (a push may point at a coaching page or a chart; it may never announce an achievement) — as a P-5 amendment; delivery folded into the existing briefing sender rather than a second cron, which solves the daily-cap and double-send questions by construction; and only after the in-app lines have tap-rates worth extending.

**Ship in-app, on the coin, behind the cadence, and nowhere else.** An ignored line costs nothing. An unwanted notification costs the permission permanently — including for the squad and training alerts the athlete did ask for.

### 4.9 The tour fixes this forces

Four, each from §2, each independently worth doing:

1. **Split the tour gate per leg** so the four-sentence tabs leg can run before the first workout, without letting the Home spotlight fire at a screen with nothing to spotlight (B5). Amendment-003's own validation checklist already says it should.
2. **Phase-key the Home leg's flag** the way the per-surface seen-set already does, so Mission, Your Circle, Train Together and Competitions become reachable (B7). This is a violation of the locked "a phase only ever ADDS" rule in the code today.
3. **Emit completion per surface**, so the skip rate has a denominator.
4. **Leave the ten data-gated walkthroughs data-gated** (decision G) — invitations own the empty state, and two systems teaching one empty screen is the density problem returning.

The five discovery triggers the locked architecture specified and nobody built (Calendar, first friend, first squad, first challenge, first chapter) are **answered by the invitation catalogue**, not by new tour machinery. §6 records that reconciliation.

---

## §5 — Implementation roadmap

Nothing here is built. Stages are sequenced so each is shippable on its own, and every stage before D is deliverable over the air.

### Stage 0 — the three live defects (do these regardless of v2)

| # | Work | Files | Needs |
|---|---|---|---|
| 0.1 | **The first-mark leak** (B1): add `personal_records.is_first`, write it from the payload `save_workout` already receives, stop writing a timeline "PR" event for a first mark, and filter the weekly review and the timeline. ⚠ The RPC must be rebuilt from its current full body — it is one function and a replace rewrites it whole. | migration `0199`, `src/data/legacy-timeline-live.ts` | a paste window |
| 0.2 | **The paywall collision** (B3): the `program` invitation gains an allowance signal and a second destination. | `nudges.ts`, the signals function | — |
| 0.3 | **The push permission** (B2): gate registration behind completed onboarding, add the explainer. | `src/lib/push.tsx`, `_layout.tsx` | PO sign-off on when to ask |
| 0.4 | **The write probe**: prove the nudge-state writes land before anything else is built on them. | a verification bundle | a paste window |

### Stage A — foundations (over the air)

| Order | Work | Why this order |
|---|---|---|
| A1 | `nudge-voice.ts` + its guard test; rewrite the five shipped lines that fail the regex | pure, no dependencies, testable alone |
| A2 | `nudges.ts` → one selector over both kinds: moment/invitation priority, the shared budget, the ladder, mute handling, the rarity ordering | pure; the cadence is the design and belongs where `node --test` holds it |
| A3 | The six route parameters + the typed destination resolver | independent of the coach entirely; makes "Take me there" honest |
| A4 | Migration `0199`: the discovery signals function, the exposure table, `mark_feature_seen`, and the probe | the client falls back to silence until it is pasted |
| A5 | Exposure marking: 23 route-level from the existing pathname effect, 16 control-level in the handler | needs A4 |
| A6 | The two Preferences switches and the reset action | small, isolated |
| A7 | The analytics events | one line each |
| A8 | The tour fixes (§4.9 1–3) | separate subsystem, separate risk |
| A9 | **The chat integration last, and alone**: the nudge becomes a Holt turn with three pills; the old bottom sheet retires | highest risk — it touches two rules the PO has already had to bug-report once (the display records shown; closing is not a refusal) |

**Tests to add:** cadence and budget (including the pattern-of-refusals damping), catalogue starvation, the voice regex with its positive controls, the ladder, parameter round-trips, the tier map, and one that asserts every catalogue route exists and every parameter it carries is actually consumed by that screen.

**Verification:** `node --test` green, `tsc` 0, lint clean, a web export — and then the on-device caveat, which is not optional here: the coin is not testable on the web preview, so a green build is not evidence.

### Stage B — the catalogue fills out

The remaining invitation rows, the 26 new help topics with the three corrections, and the two-stage help menu.

### Stage C — the Discovery block in `/admin`

One function, five tiles, aggregates only, labelled to distinguish reach from adoption.

### Stage D — push

Only if decision B is ever reopened, and only as §4.8 describes: a sixth locked condition first, then delivery folded into the existing sender.

---

## §6 — Documents this forces

| Document | What it needs | Status |
|---|---|---|
| `Docs/Coach-Holt-Exploration-Nudges-Plan.md` | Header corrected from "PLAN, not yet built" to BUILT, with the reasoning sections kept as the record and a pointer here | ✅ **done in this pass** |
| `Forge-Legacy-Master-Status.md` | A Recently Completed entry for this review, and a Decision Queue row carrying §0.3 | ✅ **done in this pass** |
| **`Onboarding-Amendment-005`** *(to write)* | Reconciles the shipped seven-step onboarding with ONB-A2-D1 (identity only), ONB-D14 (silent Chapter I) and ONB-D12 (schedule held). The reversal was reasoned — device-local answers did not survive a reinstall and Holt could not read them — but that reasoning lives in a source comment. **Recommendation: amend the documents, and cut the chapter-naming step**, which contradicts a locked decision and feeds nothing downstream. | ⛔ owed |
| **ONB-D20 reconciliation** *(a note, not an amendment)* | Amendment-004 asserts Progressive Discovery is "implemented, not amended". Two of its five specified triggers have no tour step at all. The honest reconciliation is that the invitation catalogue is where those five now live. | ⛔ owed |
| `P-5-Notifications-Architecture.md` | **No change.** Section G is withdrawn (§4.8). If push is ever revisited it needs a sixth condition, which is an amendment to write then, not now. | — |
| `Coach-Adaptive-Learning-Amendment-002.md` | One sentence noting that the intensity dial governs idle-surface speech as well as in-session speech, which the Morning Briefing already established in practice | ⛔ owed |
| `M-4-Program-Graduated-Spec.md` | A pointer noting that the graduation moment routes to the shelf, honouring M4-D11's "discovery belongs in W-2" rather than working around it | ⛔ owed |
| Decision Queue #21 (in-app help) | This document delivers option (b) — a searchable help surface — **inside Holt** rather than as a separate screen. Close it with that answer when Stage B ships. | pointer |

### One process note, recorded because it recurred

`Docs/Coach-Holt-Exploration-Nudges-Plan.md` said "PLAN. Awaiting PO sign-off… not yet built" for fifteen days after the code shipped, was applied as a migration, and was bug-fixed once in production. This session began by planning a greenfield build of a live feature, and two of ten expert reviewers independently filed the missing document as their top blocker. The repository already has a name for this failure — *"locked but never applied"* — and this is its mirror: **built but never recorded.** The cheapest guard is the one this pass used: `git log --grep` against the feature name before trusting any status header.

---

*Coach Holt — Feature Discovery System v1.0*
*Authority: `FORGE_LEGACY_PRODUCT_DNA.md` · `Onboarding-First-Time-Journey-Architecture-v1.0` ONB-D20/D21/D22 · `P-5-Notifications-Architecture` v1.5 · `W9-Amendment-006` · `Coach-Adaptive-Learning-Amendment-002` · `Coach-Holt-Exploration-Nudges-Plan` (BUILT)*
*Status: PROPOSAL — §0.3 needs eight decisions before Stage A begins. Stage 0 needs none of them.*
