# Onboarding Amendment 004 — Tutorial Phases

**Status:** LOCKED
**Date:** 2026-08-12
**Owner:** Product
**Amends:** `Onboarding-Amendment-003` ONB-A3-D6 · **implements** `Onboarding-First-Time-Journey-Architecture` ONB-D20
**Implemented by:** `domain/onboarding/tour-plan.ts` (`phaseFor`, `stepsFor`, `PHASE_UNLOCK`),
`lib/tour-phase.ts`, `lib/screen-prompts.ts`, `hooks/useTour.tsx`

---

## 1. The request

> *"We need to scope out the tutorial. It's really heavy and people either skip it or get overwhelmed. So
> I think we go in phases. Where the first time they download it we just have the basics and need to
> knows, then phase two is a little more in depth, then phase three is more niche things. And have to
> spread apart."* — PO, 2026-08-11

## 2. ⚠ This is a locked spec being implemented, not a new idea

`Onboarding-First-Time-Journey-Architecture` **ONB-D20 Progressive Discovery** has said since it locked:

> Feature education is delivered **later, when relevant** — never front-loaded.

**ONB-D21** names the two failure modes it sits between: an overwhelming feature tour, and a barren start.
The tutorial had drifted toward the first. This amendment is ONB-D20 finally being built; it decides only
*how*.

## 3. The correction to the diagnosis

The trigger was never the problem. A per-surface walkthrough **already** fires only on first arrival at
that surface — that is ONB-A2-D4b working as specified. **The density is the problem:** 105 authored
steps, and a new athlete meets about 23 of them (4 tab + 7 Home + 7 Workouts + 5 logger) before finishing
a single workout.

## 4. Decisions

**ONB-A4-D1 — Phases thin each first visit; they do not gate surfaces.** Every surface still explains
itself the first time it is reached, in at most two steps. The remaining steps arrive later.

⚠ **The alternative was rejected deliberately.** Gating whole surfaces by phase would mean an athlete who
opens Squads on day one is taught *nothing at all* — taught silence, which is a worse failure than the
density being fixed, and one they would have no way to ask about.

**ONB-A4-D2 — Phases unlock on WORKOUTS LOGGED: 0, 3, 10.** Counted in sessions rather than days because
teaching should track use, not the calendar. Somebody training four times a week has met far more of the
app by Friday than somebody who opened it twice, and a day-based gate teaches the second athlete things
they have no context for.

**ONB-A4-D3 — A step's phase is its POSITION in its surface's list**, not a per-step tag. Every
walkthrough was authored in reading order — what the screen is, then the decision it asks of you, then the
detail — so position already encodes depth. 94 hand-applied tags would encode the same thing less
reliably and would rot the first time somebody reordered a list.

**ONB-A4-D4 — ⚠ Every surface teaches something at phase 1.** No surface may resolve to zero steps on a
first visit. This is the invariant that makes thinning safe rather than a slower version of gating, and it
is test-enforced.

**ONB-A4-D5 — A phase only ever ADDS.** An athlete is never re-shown a step they have already seen, and
never loses one. The seen-set is keyed by `(surface, phase)`.

⚠ **Phase 1 keeps the BARE key in storage.** Every athlete in the field has a stored set of bare surface
names; suffixing all three phases would make those entries unrecognised, the validator would filter them
on read, and **every athlete would be walked through all 27 surfaces again on their next launch** — the
exact silent-and-permanent failure `screen-prompts.ts` documents.

**ONB-A4-D6 — This AMENDS ONB-A3-D6's "each surface is remembered separately, once".** A surface is now
something an athlete can be owed again when a new phase opens. Everything else in ONB-A3-D6 stands: teach
decisions not labels, the screen renders its own stage, no pre-marking, and Workout Complete is still
deliberately not tutorialised (ONB-D18).

**ONB-A4-D7 — Nothing announces a phase.** No ceremony, no banner, no badge. **ONB-D22 No Fake Progress**:
a tutorial phase is not an achievement. Phase 2 simply means that the next time the athlete opens Program
Detail, it walks them through it — which *is* Progressive Discovery.

**ONB-A4-D8 — Nothing asks.** **ONB-A3-D4** stands verbatim: *"the fresh athlete should be walked
through, not asked to decide."* There is no "want more depth?" prompt at any phase.

**ONB-A4-D9 — "Replay all tips" keeps its meaning and does NOT reset the counter.** Replaying is a request
to be shown what you are *owed* again; the counter is what you have *earned*. Clearing it would hand a
two-year athlete the beginner tutorial and make them re-earn phases 2 and 3 by training ten more times.
The label is a contract.

**ONB-A4-D10 — The count is SERVER-SEEDED, and an unknown count unlocks everything.** A device-local
counter starting at zero means a reinstall or a new phone demotes a veteran to phase 1 and replays 105
steps at them. An absent cache therefore reads the real count from `workouts` once.

⚠ **A failed read returns null, and null means "no restriction" — never zero.** Under-teaching on a
missing number is the failure that looks like the feature working.

**ONB-A4-D11 — The tabs leg is never thinned.** Four one-sentence steps naming what each tab is for is the
orientation everything else assumes. Only the Home leg thins (3 of 7 on the first run).

**ONB-A4-D12 — Phasing gates CONTENT, never ROUTING.** `planTour`'s one-leg-per-run rule is a bug fix, not
an aesthetic: a run is planned once against a snapshot of mounted anchors, and the tabs leg unmounts Home
on its way through. A phase may drop steps from a leg; it may never make a run span two.

## 5. Measurement

⚠ **The premise was unmeasurable when this was written.** `lib/analytics.ts` emitted no tour events at
all; skip and completion were written to AsyncStorage and never to Supabase. *"People skip it or get
overwhelmed"* was a reasonable read of the shape of the thing and **not an observation**.

Four events ship with this amendment — `tour_step_shown`, `tour_skipped`, `tour_completed`,
`screen_tour_started`, each carrying `section`, `step` and `total`. All ride the existing
`analyticsOptOut` consent and the `props-core` allowlist; no new prop key was needed. Without them this
change ships blind and nobody can tell afterwards whether it helped.

## 6. Result

| | Before | After |
| --- | --- | --- |
| Steps before a first workout | ~23 | **11** |
| Surfaces taught on day one | all reached | all reached *(unchanged)* |
| Steps ultimately reachable | 105 | 105 *(unchanged)* |

## 7. What did not change

| | Status |
| --- | --- |
| ONB-D20 / ONB-D21 | Implemented, not amended. |
| ONB-A3-D4 (no upfront choice) | Unchanged (ONB-A4-D8). |
| ONB-D22 (no fake progress) | Unchanged, and ONB-A4-D7 exists to keep it. |
| ONB-A3-D5 (two legs, two moments) | Unchanged. |
| The retire-on-step-two rule | Unchanged — it now applies per `(surface, phase)`. |
| Guided Tips master switch | Unchanged. Off still means off, everywhere. |
