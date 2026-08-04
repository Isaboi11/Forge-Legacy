# Deadlift Measure Intermediate — Design Record

**Status:** AUTHORED — original program. PO Lock Approval outstanding.
**Authored:** 2026-08-03, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/deadlift-measure-intermediate.json`

---

## 1. Provenance — read this first

**This program was not analysed from any source.** It is **extrapolated from the method** already written
down in `Programs/Strength/Squat Ascent Intermediate/Design-Record.md` §4–§5 — one tested max anchoring a
whole block, peak intensity climbing every week, volume peaking mid-block, a different structural device
each day, a dress rehearsal before the test, and a short sharp taper.

That method was in turn analysed from a publicly-posted third-party training month, and **that analysis is
recorded in the squat program's Design Record, not repeated here**. Nothing in this block was read off a
source, transcribed from one, or reconstructed from one. No third-party name, title, session name, copy or
day-by-day sequence appears anywhere in this program or this document, and none was consulted while
authoring it.

**It also deliberately departs from that method on the one thing that matters most: frequency.** The squat
program trains its lift five days a week. This one pulls the competition deadlift **twice** a week. That is
not a simplification or a scheduling convenience — it is a disagreement, and §6 is the argument for it.

Sets, reps and percentages are functional facts about training rather than creative expression. What is
original here is the whole of it: the session structure, the day names, the percentages, the copy, and the
frequency decision that the rest of the block is built around.

---

## 2. What it is

Four weeks, **four sessions a week, sixteen sessions**. The competition deadlift is pulled in **eight** of
them — twice a week, never on back-to-back days. Every one of those pulls is loaded as a percentage of a
single tested one-rep max, set before day one and not re-tested until day sixteen.

The other eight sessions are not rest. They carry **pull variations** — deficit, paused, snatch-grip,
Romanian — and **squat work**, which builds the same positions and the same hip extension at a fraction of
the spinal cost.

This is the second percentage-loaded program in the catalog, after Squat Ascent Intermediate (capability:
migration 0111, `Docs/Percent-Of-Max-Loading-Architecture-v1.0.md`). Like its sibling it cannot be read at
all until the athlete answers the max gate, which is why it is INTERMEDIATE and not a first program.

## 3. Prerequisites

- A tested or confidently estimated deadlift max.
- Competent hinge technique at load. This program assumes the pattern, it does not teach it.
- A back squat and a bench press the athlete can also put a number to — both carry percentages here.

Not a successor to anything, and nothing succeeds it. It is a **standalone block** run between general
programs, not a rung on the Strength Foundation ladder. `successorName` is deliberately null.

## 4. The intensity architecture

Competition deadlift only — the tested lift. Variations and squats are counted separately in §7.

| Week | Label | Comp-deadlift sessions | Comp-deadlift volume (reps) | Peak intensity |
|---|---|---|---:|---:|
| 1 | Anchor | A + C | 36 | 72% |
| 2 | Accumulate | A + C | 46 | 82% |
| 3 | Intensify | A + D | 30 | 93% |
| 4 | Realize | B + C | 24 | 100%+ |

Two rules govern the shape, both inherited from the squat block and both machine-checkable:

1. **Peak intensity climbs every week.** 72 → 82 → 93 → 100. The athlete meets a heavier bar each week
   than the last, and the last one is a real max attempt.
2. **Volume peaks mid-block and the final week is the lightest.** 36 → 46 → 30 → 24. Volume climbing into
   a test day is how you arrive at it tired.

The bar is genuinely heavy on three days of sixteen: the 88% top wave in week 3, the 93% rehearsal that
closes week 3, and the test.

## 5. Why each week looks the way it does

**Week 1 — Anchor.** Straight sets, a squat day, a descending ladder, and a deficit day. Nothing above
72%. The purpose is to expose the athlete to a percentage-loaded pull twice, and to find out in week one
whether the max they entered was honest — while the cost of it being wrong is still nearly zero.

**Week 2 — Accumulate.** The volume peak, including the block's biggest single pulling session — nine
triples at 72%, on a day with nothing heavy after it. The first genuinely heavy exposure lands at the top
of the ascending ladder at 82%, after a week of practice and not before.

**Week 3 — Intensify.** Volume recedes, the bar climbs. Day A runs two waves ending at 88%. Day C is
snatch-grip pulls at 60% — deliberately the lightest hinge of the week, sitting between two hard days as
technical work rather than as more load. The week ends on a **dress rehearsal** ramping to 93%, **five days
before the test**. This is the most important day in the program: it means test day is not the first time
in a month the athlete has been under a near-maximal bar.

**Week 4 — Realize.** A reset day with no pull at all, one short speed session, the test, and a flush. The
taper is sharp and brief on purpose — a long taper bleeds the adaptation the previous three weeks built.

**Test day is a session on its own.** Nothing else is prescribed: `[5, 3, 2, 1, 1, 1, 1]` at
`[50, 65, 75, 85, 92, 97, 100]%`. Anything beyond 100% is the athlete's call on the day, which is the
honest way to prescribe a lift nobody can predict.

## 6. Frequency — the one judgement this block is built on

**This is the section to argue with, if any of it is going to be argued with.**

Squat Ascent trains the back squat five days a week. The obvious way to author a deadlift sibling is to
change the lift and keep the shape. **That would have been irresponsible, and it is the single decision
this program departs on.**

The squat tolerates daily submaximal work. The deadlift does not, for reasons that are specific rather
than a matter of taste:

- Every rep starts from a dead stop, so there is no stretch reflex doing part of the work — the same
  percentage costs more.
- The load is carried through a long, unsupported spinal lever with no rack, no unracking, and no eccentric
  to organise the position on the way down.
- There is no bottom position to sit into and correct. A pull that starts badly is finished badly or not
  finished.

Five heavy pulls a week is how people get hurt. Shipping that inside a product that presents its programs
with authority — and resolves a real number onto the athlete's bar — would be shipping advice we do not
believe.

**So the frequency is four sessions a week, and the competition deadlift is pulled in two of them.**

**Calendar assumption:** the four sessions land Mon / Tue / Thu / Sat. On that layout the competition
deadlift falls on days 0 · 3 · 7 · 10 · 14 · 19 · 22 · 24 of the block. **The smallest gap between any two
competition pulls is two days**, and it occurs exactly once — between the week-4 speed session and the
test, which is intended. There is no pair of consecutive training days that both pull a competition
deadlift, in any week, including across the week boundary.

**What the other two sessions do instead of nothing:**

| Session | Carries | Why it is not a comp pull |
|---|---|---|
| Squat day (W1 B · W2 B · W3 B · W4 A) | Back squat, front squat, upper accessories | Builds the same hip and trunk positions under a supported bar, and holds the athlete's squat through a pulling block |
| Variation day (W1 D · W2 D · W3 C) | Deficit · Paused · Snatch-grip | Trains the start position and the mid-shin range at 60–70%, where the technical return is highest and the fatigue is lowest |

**The volume difference is deliberate and it is large.** The competition deadlift is trained for **136
reps** across the block. The squat program trains the back squat for **366**. Including every barbell pull
from the floor — deficit, paused, snatch-grip, Romanian — this block still totals **207 reps**, 57% of the
squat program's specialized-lift volume, at a lower average intensity.

That is not this program being smaller. It is this program being the right size for the lift it is about.

## 7. Supporting work

The block is a deadlift specialization, not a posterior-chain specialization. Back squat, front squat,
bench press, pull-ups, rows, shrugs, hip thrusts, carries and a plank appear throughout, so that four weeks
of pulling does not cost the athlete their squat or their upper body.

Back-squat volume per week: **44 / 46 / 15 / 30**. It follows the same accumulate-then-recede shape as the
pull, so the two never peak against each other.

Only the deadlift, its four variations, the back squat, the front squat and the bench press carry
percentages. Everything else is prescribed by sets and reps and left to the athlete's judgement, which is
how accessories should be prescribed.

**Every deadlift variation borrows the COMPETITION deadlift's max** (`percentOf: barbell-deadlift`) —
deficit, paused, snatch-grip and Romanian alike. Nobody tests a "Deficit Deadlift max". Left implicit, each
variation would default to its own catalog key, the entry gate would ask the athlete for four maxes that do
not exist, and every one of those prescriptions would render with no weight against it. This is the exact
defect caught in review on the squat program, and it is asserted rather than remembered.

**The front squat borrows the BACK squat's max** (`percentOf: barbell-back-squat`), for the same reason.

**The gate asks for exactly three maxes:** `barbell-deadlift` · `barbell-back-squat` ·
`barbell-bench-press`. Every extra key there is one more number the athlete is asked for before they can
start.

## 8. Deliberately not authored

**Block pulls and rack pulls.** Both are in the catalog (`barbell-block-pull`, `barbell-rack-pull`) and
both are conventional in a deadlift block. Left out for two reasons. First, a partial-range pull is
prescribed *by its height* — mid-shin, below the knee, two-inch blocks — and `ExercisePrescription` has
**no per-exercise note field**, deliberately (`schema.ts:349`). The app could name the exercise and could
not tell the athlete where to set the pins, which is most of the prescription. Second, the useful version
of a rack pull is supramaximal, and adding supramaximal work to a block that already ends in a 100% single
buys very little and costs recovery this program has already decided to spend elsewhere.

**Sumo deadlift as an alternative stance.** `barbell-sumo-deadlift` exists, but the model has no "choose one
of N" concept, and a program that prescribed both stances would be prescribing twice the work rather than
offering a choice. The athlete pulls the stance they compete in; the percentages resolve against the max
they tested.

**Tempo work.** `barbell-tempo-deadlift` exists, but PAS-D4 excludes tempo notation from every MVP Forge
program and there is no notes field to carry the count in anyway. Where a positional device was wanted, the
**paused** deadlift is used instead — it is a first-class catalog exercise, so the prescription lives in
the exercise rather than in a note the app has nowhere to render.

**An "as many sets as possible in ten minutes" day and an athlete's-choice day.** The prescription model
has no "choose one of N" concept, and its AMRAP block counts rounds of a circuit rather than sets of a
single lift. Neither is authored, rather than authored in a shape the app would render wrongly. Both remain
open items in `Docs/Percent-Of-Max-Loading-Architecture-v1.0.md` §7.

## 9. Naming

`Deadlift Measure Intermediate` — 29 characters, inside the PAS-D1 pattern (`[Subject] [Tier Descriptor]`)
and well inside the 40-character authoring target.

**"Measure" is doing descriptive work, not decorative work,** and it is doing it twice. The defining
property of this block is that heavy pulling is *measured out* — two competition pulls a week, never
adjacent, 136 reps in a month where the squat sibling spends 366. And the block ends by *taking the
measure* of the lift: a ramp to 100% with nothing else on the day. Both readings describe what the program
actually does.

It is deliberately not a second elevation metaphor. "Ascent" belongs to the squat block; borrowing its
shape of word would suggest the two programs are the same program with the bar in a different place, which
is precisely what §6 says they are not.

The tier descriptor is kept. It is the signal that this program has real prerequisites — a tested max and a
competent hinge — and dropping it would leave a beginner nothing to read that says so.

No superlative, no branded methodology, no outcome promise.

`structure` is omitted rather than guessed. The controlled vocabulary is `upper_lower | ppl | full_body`
and this program is none of them; claiming one would misdescribe it to the artwork resolver.

**Per-workout `split` uses `legs`, not `lower`.** `schema.ts` is explicit that `lower` is only correct
inside a declared `upper_lower` structure and that otherwise a lower-body session is `legs`; with
`structure` omitted, `legs` is the honest value. Iron & Engine does the same. **Squat Ascent Intermediate
says `lower` with `structure` omitted, which appears to be a small inconsistency in that program** — noted
here rather than silently copied or silently fixed, since that file is not this program's to change.

## 10. Open before Lock

1. PO review of the loading, and of §6 specifically. The frequency decision is the one a document can
   argue for and only a product owner can accept.
2. A real athlete running it end to end. Nothing here has been trained by anyone yet.
3. Whether the pair of these programs implies a bench equivalent, or whether two is the right number of
   specialization blocks to ship before any of them has been run.
4. Whether the block-pull omission in §8 should instead motivate a per-exercise note field, which
   `Docs/Percent-Of-Max-Loading-Architecture-v1.0.md` §10 already lists as open for a different reason.

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-03 | Authored. Not locked. |
