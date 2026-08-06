# Iron & Engine — Design Record

**Version:** 1.0
**Status:** AUTHORED — Phases 1–8 complete, PO Lock Approval outstanding
**Program Family:** Conditioning *(fills the Catalog Index's Hybrid → "Strength + Conditioning Builder" slot — see §9)*
**Environment:** Commercial Gym
**Duration:** 6 Weeks
**Frequency:** 6 Days Per Week
**Difficulty:** Advanced
**Successor Program:** none yet
**Implementation:** `src/domain/training/programs/iron-and-engine.json`

---

## 0. Why this document is Markdown

Every Forge program before this one was written in Word and converted by `ingest/generate.mjs`. This one
was authored directly against the `ProgramDefinition` schema, so there is no `.docx` to be the source of
truth — this file is. The Production Standard requires a Program Source Document, a Design Record and a
Lock Record; the first two are folded together here, and the Lock Record is its sibling file.

`ingest/generate.mjs` neither produces nor validates this program. Running the ingest does not touch it.
The acceptance gate is `src/domain/training/programs/__tests__/programs.test.mjs` instead, which asserts
both the schema contract and the parts of the Production Standard a machine can hold us to.

**Provenance.** Iron & Engine is Forge-original. The name was previously used in this repository for a
purchased third-party program transcribed for one athlete's personal use (`scripts/bridger-logan/`, which
remains personal-only and outside `src/`). **Nothing in this program is derived from it** — not a session,
not a set-and-rep scheme, not an exercise order. The shared name describes the same training idea, the
way "5×5" does. If the two ever need to be told apart in conversation, this is the one in the catalog.

---

## 1. Phase 1 — Research

The gap in the catalog is the athlete who refuses the choice. The Strength family builds a barbell total
and prescribes no conditioning; the Running and Conditioning families build an engine and let the barbell
go stale. Everything in the Catalog Index's **Hybrid** row is unbuilt.

Three well-evidenced principles govern the design:

1. **Concurrent training works when the interference is managed.** Conditioning placed *after* lifting,
   kept short, and kept off the pattern that was just loaded costs very little strength adaptation.
   A long, hard, same-day aerobic block placed *before* the lift costs a great deal.
2. **Strength holds on very few lifts.** Four primaries, trained twice each across two weeks, waving
   6 → 4 → 3, is enough stimulus for an intermediate to add load over six weeks.
3. **Conditioning adherence collapses when the finisher is unbounded.** A finisher with a stated number
   of rounds or a stated clock gets done. "Row until you're tired" does not.

## 2. Phase 2 — Blueprint

**Athlete profile.** Advanced, and the frequency is why. Has trained the barbell lifts for years, can
perform a pull-up, is not intimidated by a sled or an erg, and — the real prerequisite — has already held
a five-day week without breaking. Not an intermediate stepping up; someone who has run out of room at
four or five days. Strength Foundation I and II are the programs below this.

**Mission.** Six weeks in which the barbell numbers go up *and* the finisher gets easier, so the athlete
stops believing those two things trade against each other.

**Weekly structure — 6 days: FOUR IRON + TWO ENGINE.**

| Day | Name | IRON (primary) | ENGINE |
|---|---|---|---|
| A | Squat & Sled | Barbell Back Squat | Sled / swing / bike → AMRAP |
| B | Press & Rope | Barbell Bench Press | Rope / burpee / bike → steady row at Peak |
| **C** | **Engine: Intervals** | **— none —** | carries · core · push-ups, then a 10–14 min AMRAP |
| D | Hinge & Drag | Barbell Deadlift | Drag / swing / bike → AMRAP |
| E | Pull & Bike | Pull-Up | Slam / box jump / bike → steady ride at Peak |
| **F** | **Engine: Long** | **— none —** | light squat/row/plank, then a 12–18 min steady erg |

> ### The six-day week adds NO barbell volume
>
> This is the single most important decision in the program and the reason it is survivable.
>
> Each of the four primaries is trained **once a week**, exactly as it was in the four-day draft. Going
> from four days to six did not add a fifth or sixth heavy lifting day — it added two ENGINE days. What
> increased is conditioning frequency, which is the adaptation that tolerates frequency best: mostly
> concentric, low eccentric load, minimal soreness, negligible interference with the next day's lift.
>
> Six heavy barbell days on top of six finishers would be a program almost nobody completes, and the
> Production Standard is unambiguous about which side of that trade Forge takes — *"Consistency before
> optimization"*, *"Consistent completion over maximal workload."*
>
> The acceptance test asserts this shape (`six days = four IRON days + two ENGINE days`, and no primary
> twice in a week), because it is exactly the property that would erode first: the tempting future edit
> is to give C and F a barbell primary "since we're in the gym anyway", which turns a recoverable six-day
> program into six heavy days without changing a single rep count.

**Progression model — the wave.**

| Block | Weeks | Primary scheme | Engine |
|---|---|---|---|
| Build | 1–2 | flat `4 × 6` (deadlift `4 × 5`) | 3-round circuits · C = 10 min AMRAP · F = 12 min row |
| Load | 3–4 | ladder `6-6-4-4` (deadlift `5-5-3-3`) | 4 rounds, first 8-minute AMRAPs · C = 12 min · F = 15 min |
| Peak | 5–6 | ladder `5-5-3-3` (deadlift `3-3-3`) | 10-min AMRAPs on A/D; **B and E convert to steady erg** · C = 14 min · F = 18 min |

The engine gets *longer* as the lifting gets *heavier and shorter*. Total session time stays flat; what
changes is where the minutes go. At Peak, the two upper-body lifting days drop their circuits for a
steady 10-minute erg piece — the week the athlete is most fatigued is the week to stop adding intensity
on top of intensity.

**Recovery strategy.** The intended order is **A · B · C · D · E · F**, which places an ENGINE day
between the squat and the deadlift and puts the long steady day last. No two heavy lower-body days are
adjacent. Rest climbs with intensity — 150s in Build, 165–180s in Load, 180–210s at Peak — and the Peak
block *cuts* accessory reps rather than adding them. The IRON days carry three main lifts, not four:
at six days a week the per-session accessory count has to come down or the week does not fit.

**One rest day is the whole margin.** At six days there is a single rest day, so the program says plainly
what to do when life takes one: **drop day C or day F, never an IRON day.** Losing an engine day costs
conditioning frequency; losing an iron day breaks the once-a-week stimulus the entire wave is built on.

**Success criteria.** The athlete completes 30 of 36 sessions, adds load to all four primaries, and
finishes the week-5 AMRAP with more rounds than the week-3 one.

## 3. Phase 3 — Exercise Selection Architecture

| Decision | Why selected | Why the alternative was rejected |
|---|---|---|
| **Back Squat** as day-A primary | The most load per unit of time of any leg movement; the lift most responsive to a six-week wave | Leg press builds the quad but not the brace, and this program's engine work punishes a weak brace |
| **Bench Press** as day-B primary | Same reason, upper body. Stable, easy to load in small jumps | Dumbbell pressing varies too much set to set to read progress off |
| **Pull-Up** as day-C primary | Foundational Movement Preservation (Standard §"Foundational Movement Preservation"). A bodyweight movement kept as a *primary*, not demoted because a loaded variation exists | A lat pulldown as the primary would make the whole program loadable without ever owning your own bodyweight |
| Band-assisted pull-up **substitution** | Confidence Before Complexity. An intermediate who cannot yet do `4 × 6` should run the program, not bounce off day C | Dropping the pull-up entirely removes the one lift that visibly changes over six weeks for this athlete |
| **Deadlift** as day-D primary, lowest volume | Highest systemic cost of the four; `4 × 5 → 3 × 3` respects that | `4 × 6` deadlifts alongside four conditioning days is the fastest way to lose the athlete in week 4 |
| **Box Step-Up** kept in every block | Foundational Movement Preservation, again — and it is the unilateral movement most tolerant of accumulated fatigue | Walking lunges degrade badly under fatigue and become a joint irritant by week 5 |
| **Push-Up to failure**, twice weekly | The Standard names push-up progression as an *adherence* mechanism: a visible, countable win that owes nothing to a loaded lift | A fixed rep count converts the one self-measuring movement into another prescription |
| **Air Bike** as the default third circuit item | No skill, no eccentric, no soreness — it adds heart rate without adding recovery cost to the next day's lift | Running as a finisher adds eccentric load to legs that just squatted |
| **Sled push / drag** on the two lower days | Almost pure concentric: high effort, near-zero soreness. The single best conditioning tool to pair with heavy lifting | Any jumping finisher after heavy squats or deadlifts is where knees and backs get hurt |
| **Steady row / ride** in weeks 5–6 only | Deliberately the easiest engine work of the program, placed in the hardest lifting week | A third block of AMRAPs would peak the engine and the barbell simultaneously |

**Environment compatibility.** Commercial Gym. The program requires a sled, a battle rope, a medicine
ball, a plyo box and an air bike — the reason it is not offered as a Home program. Every exercise resolves
to a real row in `exercises.json`; the acceptance test fails on a dangling key.

## 4. Phase 4 — Authoring

All three blocks authored (the Standard recommends starting with weeks 1–2; the wave is only legible
written out in full). **18 workouts, 36 sessions.**

## 5. Phase 5 — Coaching Audit

Reviewed as an independent coach would. Findings, and what was changed:

| # | Finding | Resolution |
|---|---|---|
| 1 | **Six days a week is the risk, full stop.** One rest day is no margin at all — a bad night's sleep or a late meeting and the week is already compromised. | **Accepted, and it is why the difficulty is Advanced rather than Intermediate.** Mitigated three ways: the two extra days are conditioning, not lifting; the IRON days carry three main lifts instead of four; and the program states which day to drop when a week goes wrong (C or F, never an IRON day). This is a real cost of the frequency, not a solved problem. |
| 2 | **Day A and day D are both lower-body.** Squat and deadlift in the same week is a lot of hinge and knee. | Mitigated by the six-day order rather than by cutting volume: day C sits between them. Day D's deadlift volume is the lowest in the program and drops to `3 × 3` at Peak, and day A's engine (sled) is deliberately non-eccentric. |
| 3 | **Six finishers a week is a great deal of conditioning.** | Deliberate — it is the program's name. Managed by *kind* rather than count: only four are circuits, C is a single AMRAP, F is steady-state, and at Peak two more convert to steady erg work. |
| 4 | **`4 × 6` pull-ups is a hard opening prescription.** | The band-assisted substitution was added because of this finding. |
| 5 | **An earlier draft put the finisher before the accessories.** | Corrected: every session runs Primary → Secondary → Development → Core/Carry → Engine, matching the Standard's session flow. A finisher before accessory work makes the accessories junk volume. |
| 6 | **Day C and day F are shorter than the 45-minute target if the accessories are thin.** | Fixed by adding a fourth item to each (face pulls on C, plank on F) — both now land in the 45–55 minute band rather than reading as half-sessions. |
| 7 | **Nothing prescribes a cool-down.** | ✅ **CLOSED 2026-08-06 — the rule changed.** Originally: not fixed, because the `ProgramWorkout` schema has no cooldown field and inventing one for a single program is worse than the omission. That reasoning held, and a second program (Body Recomposition Foundation) hit it and was locked in violation, which forced the question. **PAS Amendment 003** makes COOL_DOWN optional for every category. Day F's steady erg still partly serves the purpose. |

## 6. Phase 6 — Revision

Findings 4, 5 and 6 applied to the authored program. Findings 1, 2 and 3 accepted with the mitigations
named above — finding 1 is the one to watch in testing. Finding 7 recorded as open.

**Frequency changed after the first authoring pass.** The program was first written at 4 days and the
product owner asked for 6. Rather than scaling the four-day week up — which would have meant six heavy
barbell days — the two new days were authored as ENGINE days, and the IRON days lost an accessory each.
The audit above is the re-audit at six days, not the four-day one carried forward.

## 7. Phase 7 — PAS Compliance Review

| Standard | Requirement | Iron & Engine | Verdict |
|---|---|---|---|
| Warm-Up | 3–5 min; 1 general + 1–2 pattern prep + 1 rehearsal | 3–4 items per session, exactly that shape (engine days need no bar rehearsal) | ✅ *(asserted by test)* |
| Session Design | 45–60 min, max 60 | ~45–55 min estimated per session | ✅ |
| Session Flow | Warm-Up → Primary → Secondary → Development → Adherence → Core/Carry | followed, with Engine as the closing block | ✅ |
| Progression | prescribes exercise · sets · reps · rest; **no** fixed weights or percentages | `restSec` on every strength item; no load prescribed anywhere | ✅ |
| Stability vs Variety | 70–80% stability | 4 primaries fixed for 6 weeks; secondary work fixed; development and engine composition vary | ✅ *(asserted by test)* |
| Foundational Movement Preservation | bodyweight movements retained | Pull-Up as a primary, Push-Up and Box Step-Up in every block | ✅ |
| Recovery | protect recovery; rest scales with intensity | rest 150 → 165 → 210s; accessory volume *falls* at Peak; the two added days are conditioning, not lifting | ⚠️ **Met by design, but six days is one rest day.** See audit finding 1 — the mitigations are real and the residual risk is real too. |
| Adherence | visible, rewarding progress | push-up-to-failure, AMRAP round count, four loadable primaries | ✅ |
| Coaching Notes | programs carry coaching notes | ❌ **Not met.** `ProgramExercise` has no field for a per-exercise note, so one authored here would be dropped in adoption and rendered by nothing. The coaching voice lives in `description` and in this document. Recorded as a product gap, not worked around. |

## 8. Phase 8 — Lock Recommendation

**Strengths.** Fills the catalog's only completely empty *concept* (hybrid). Exercises the prescription
model as far as it goes — the first shipped program with ladders, circuits, AMRAPs, timed work and cardio
bouts. Primaries are stable and honestly progressive.

**Weaknesses.** ~~No cool-down (schema gap).~~ — no longer a compliance weakness as of 2026-08-06;
PAS Amendment 003 makes COOL_DOWN optional for every category, since no authored program can express
one. No coaching notes (schema gap). Equipment-heavy, so it is unavailable to home athletes. No
successor program.

**Risks.** Finding 2 — four finishers a week — is the adherence risk, and it is the thing to watch in
testing. If athletes drop day D, the finisher count is why.

**Confidence.** Moderate-to-high on the strength half, moderate on the conditioning volume. The wave is
conservative; the engine is the part that wants real-athlete data.

**Recommendation: LOCK**, subject to product-owner Lock Approval, which no document in this repository
can grant itself. Until that approval the program ships with
`status: "AUTHORED — Phases 1–8 complete, PO Lock Approval outstanding"`, and the acceptance test asserts
that it does — promoting the string to `LOCKED` without a Lock Record signature will fail the build.

## 9. Family assignment — a discrepancy, recorded not resolved

`Program-Catalog-Index.docx` lists **nine** families, including a **Hybrid** family whose planned entries
are "Hybrid Foundation I", "Hybrid Foundation II" and "Strength + Conditioning Builder". `ProgramFamily`
in `src/domain/training/schema.ts` has **six**, and Hybrid is not among them.

This program is filed under **`Conditioning`**, an existing enum value, because adding a seventh family
is an architecture change that touches the artwork resolver, onboarding recommendation and the Stage-1
family lock — and it is not this program's business to make it. The Catalog Index slot it actually fills
is Hybrid → *Strength + Conditioning Builder*.

**The six-versus-nine discrepancy predates this program and is unresolved.** It should be settled before
the Hybrid, Bodyweight, Cycling or Combat rows are built, since all four are unrepresentable today.
