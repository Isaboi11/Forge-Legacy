# Bench Approach Intermediate — Design Record

**Status:** AUTHORED — original program. PO Lock Approval outstanding.
**Authored:** 2026-08-03, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/bench-approach-intermediate.json`

---

## 1. Provenance — read this first

This program is **extrapolated from the method of `Squat Ascent Intermediate`, not analysed from any
source.** No training month, spreadsheet, article, video or posted block was read while authoring it. It
is the sibling that `Programs/Strength/Squat Ascent Intermediate/Design-Record.md` §9 item 3 names as an
open question, built by applying that program's already-recorded method to a different lift.

Stated plainly so nobody later credits this document with work it did not do:

- **The squat program's method was analysed** from a publicly-posted third-party training month.
  **This one's was not.** Its provenance is a document in this repository.
- What was carried across from that method is the same non-protectable material named there: frequency,
  how intensity waves, where volume peaks, the idea of rehearsing a near-max before testing one. Sets,
  reps and percentages are functional facts about training, not creative expression.
- **No third-party name, session title, written copy, artwork or day-by-day sequence appears anywhere in
  this program or this document.** None was consulted, so none could.

Every number below is an authoring judgement made here, and every one of them is the thing §9 says a PO
still has to review. Extrapolation is a weaker warrant than analysis, and the honest consequence is that
this program has *less* evidence behind its loading than its sibling, not the same amount.

---

## 2. What it is

Four weeks, five sessions a week, twenty sessions. The bench press is trained in **every one** — and
unlike the squat block, the **flat competition bench itself** appears in all twenty, not merely a member
of its family. Every press is loaded as a percentage of a single tested one-rep max, set before day one
and not re-tested until day twenty.

The second percentage-loaded program in the catalog (capability: migration 0111,
`Docs/Percent-Of-Max-Loading-Architecture-v1.0.md`). Like its sibling it cannot be read at all until the
athlete answers the max gate, which is why it is INTERMEDIATE and not a first program.

**Why five days is the right call for this lift specifically.** The bench is a short-range, low-systemic-
cost lift trained with a fraction of the muscle mass a squat uses. It recovers between sessions where a
heavy squat does not, and its limiting factor is as much bar path and groove as it is tissue. Twenty
exposures in twenty-eight days is a *skill* prescription as much as a strength one — which is why the
peak intensities here can climb on the same schedule as the squat block's while the moderate work sits
higher and more often.

## 3. Prerequisites

- A tested or confidently estimated bench-press max, and a back-squat max for the supporting work.
- Competent bench technique at load, including a stable setup and a spotter or safeties for the heavy
  singles. This program assumes the pattern, it does not teach it.
- Tolerance for five lifting sessions a week.

Not a successor to anything, and nothing succeeds it. It is a **standalone block** run between general
programs, not a rung on the Strength Foundation ladder. `successorName` is deliberately null.

## 4. The intensity architecture

| Week | Label | Bench volume (reps) | Peak intensity |
|---|---|---:|---:|
| 1 | Establish | 116 | 77% |
| 2 | Accumulate | 123 | 86% |
| 3 | Intensify | 93 | 93% |
| 4 | Realize | 78 | 100%+ |

*Volume counts flat `barbell-bench-press` reps only. Counting every percentage-loaded press — Spoto,
Larsen, pin press, close-grip, incline — the same shape holds: 150 · 163 · 138 · 93.*

Two rules govern the shape, and both belong in the acceptance test:

1. **Peak intensity climbs every week.** The athlete meets a heavier bar each week than the last.
2. **Volume peaks mid-block and the final week is the lightest.** Volume climbing into a test day is how
   you arrive at the test tired.

The bar is genuinely heavy — a flat-bench set at or above 85% — on exactly **four days of twenty**:
Week 2 D (86%), Week 3 A (90%), Week 3 E (93%), Week 4 D (100%). Of 101 flat-bench working sets, 83 sit
between 55% and 80%. One set is below 55%, and it is the opening rung of the test-day ramp.

## 5. Why each week looks the way it does

**Week 1 — Establish.** Straight fives, a descending ladder, a Spoto-press day, triples, and long sets.
Five different shapes, none of them hard. The purpose is exposure to pressing daily before any of it is
heavy, and to let the athlete find out whether the max they entered was honest.

**Week 2 — Accumulate.** The volume peak, including the block's biggest single session (6 × 6 @ 68%). The
first heavy exposure lands here at 86% for doubles, after a week of practice and not before.

**Week 3 — Intensify.** Volume recedes, the bar climbs. Nine clusters of three at 75% on day B and a
nine-set three-wave on day D carry the week's work; days A and E carry its intensity. The week ends on a
**dress rehearsal** ramping to 93% — five days before the test. This is the most important day in the
program: it means test day is not the first time in a month the athlete has been under a near-maximal
bar with a spotter behind them.

**Week 4 — Realize.** A reset day, two deliberately short sessions, the test, and a flush. The taper is
sharp and brief on purpose — a long taper bleeds the adaptation the previous three weeks built.

**Test day is a session on its own.** Nothing else is prescribed: `[5, 3, 2, 1, 1, 1, 1]` at
`[50, 65, 75, 85, 92, 97, 100]%`. Anything beyond 100% is the athlete's call on the day, which is the
honest way to prescribe a lift nobody can predict.

### 5.1 Twenty sessions, twenty different bench prescriptions

Novelty is doing real work in a block that trains one lift twenty times. Every session's flat-bench
prescription is structurally distinct from the other nineteen — verified, not asserted.

| Week | A | B | C | D | E |
|---|---|---|---|---|---|
| 1 | straight 5 × 5 | descending ladder | Spoto primary + back-off | triples | long sets |
| 2 | ascending 5 × 5 | volume 6 × 6 | Larsen primary + back-off | heavy doubles | back-off eights |
| 3 | ramp to a single | 9 × 3 clusters | pin press + back-off | three waves | dress rehearsal |
| 4 | reset fours | speed triples | sharpener doubles | **test** | flush |

Week 1 D and Week 4 B are both six sets of three, and that repetition is deliberate: 77% in week one and
70% in week four is the same shape asked to do the opposite job, which is what a speed day is.

## 6. Supporting work

The block is a bench specialization, not an upper-body specialization. Back squats, Romanian deadlifts,
rows, pull-ups, chin-ups, swings and carries appear throughout so that four weeks of benching does not
cost the athlete their legs and back. Lower-body work lands on seven of the twenty days — the back squat
on six of them, and a Romanian deadlift, swing or carry on all seven. Something is pulled on fifteen of
the twenty.

**Only two lifts carry percentages: the bench and the back squat.** Everything else is prescribed by sets
and reps and left to the athlete's judgement, which is how accessories should be prescribed.

**Every bench variation borrows the FLAT bench max** (`percentOf: barbell-bench-press`) — the Spoto
press, the Larsen press, the pin press, the close-grip bench and the incline bench, without exception.
Nobody tests a "Close-Grip Bench max". Resolving 68% against an untested one would put a materially wrong
bar in front of the athlete with full confidence, and the entry gate would ask for a number that does not
exist. This is the exact defect caught in review of the squat program's tempo and pause squats; it is
authored correctly here from the start and should be asserted in the acceptance test.

**The gate asks for two numbers, not three.** The squat block asks for three because it loads the
deadlift by percentage as well. This one does not: a bench specialization that demands a deadlift max in
order to prescribe maintenance hinging is asking the athlete for a number to spend on nothing. Romanian
deadlifts, rows and swings are prescribed by sets and reps.

Required maxes, derived by walking the prescriptions (PCT-D3):

| Lift | Why |
|---|---|
| `barbell-bench-press` | the tested lift; every press in the block resolves from it |
| `barbell-back-squat` | six squat sessions at 55–68%, held deliberately submaximal so leg work never competes with the press |

## 7. Things the app cannot express, and what was authored instead

**A pause, and a tempo.** `ProgramExercise` has **no notes field at all**, deliberately
(`src/domain/training/schema.ts:349`), and `PAS-D4` excludes tempo notation from every MVP Forge program.
So neither can be written as an instruction. Resolved the same way the squat program resolved it — with
real catalog exercises, where the app can render the movement and the athlete can look it up:

| Device | Exercise used | What it does |
|---|---|---|
| pause off the chest | `barbell-spoto-press` | stops the bar short of the chest and holds it |
| no leg drive | `barbell-larsen-press` | feet up; the press has to come from the upper body |
| dead stop at the sticking point | `barbell-pin-press` | starts from pins mid-range, no stretch reflex |

There is **no `barbell-pause-bench-press` and no `barbell-tempo-bench-press` in the catalog**, which is
why the bench block reaches for three named variations where the squat block reached for two. No catalog
row was added for this program.

**Deliberately not authored**, because the model would render them wrongly rather than not at all:

- **No "choose one of N loading options" day.** The prescription model has no "choose one of N" concept
  (`Docs/Percent-Of-Max-Loading-Architecture-v1.0.md` §7.3).
- **No "as many sets as possible in ten minutes" day.** The AMRAP block counts rounds of a circuit, not
  sets of a single lift (§7.2).
- **No supramaximal work.** Board presses and overloaded lockouts above 100% are a real bench device and
  the catalog has `barbell-board-press`. They are left out because the block's whole claim is that the
  bar climbs to a number the athlete has never lifted *on test day* — putting 105% on the bar in week
  three tells a different story, and one nobody has reviewed.
- **No RPE.** PAS-D3 permits it for STRENGTH at INTERMEDIATE, but only in `notes`, and there is no notes
  field to put it in. Every set here is prescribed by percentage, which is the whole point.

## 8. Naming

`Bench Approach Intermediate` — 27 characters, inside the PAS-D1 pattern (`[Subject] [Tier Descriptor]`)
and well inside the 40-character authoring target.

**"Approach" is doing descriptive work, not decorative work — and it is a noun, not a methodology.** It
is the run-up: the measured, structured distance an athlete covers before a single attempt, the way a
jumper's approach is the part of the jump that happens before the bar. That is literally the program's
shape — nineteen sessions of run-up and one attempt, arranged so that nothing on the day is a surprise.
It is not "an approach to benching", and this document says so in case a future reader reads it that way.

Deliberately **not** "Ascent". The squat block owns that word, and repeating it would make two different
blocks sound like two editions of one. The squat block is named for what the *load* does; this one is
named for what the *twenty sessions* do.

No superlative, no branded methodology, no outcome promise, no gendered term, no abbreviation.

`structure` is omitted rather than guessed. The controlled vocabulary is `upper_lower | ppl | full_body`
and this program is none of them; claiming one would misdescribe it to the artwork resolver. Per-workout
`split` carries the truth instead — `upper` on the eight days that are press plus pulling, `push` on the
five that are pressing alone, `full_body` on the seven that carry lower-body work.

## 9. Open before Lock

1. **PO review of the loading**, which is the one thing a document cannot settle — and which matters more
   here than in the sibling block, because §1 says plainly that this loading is extrapolated rather than
   observed.
2. A real athlete running it end to end. Nothing here has been trained by anyone yet.
3. **Registration.** This definition is authored but not registered in
   `src/domain/training/programs/index.ts` and has no acceptance-test coverage yet. Until both happen it
   ships nowhere and is validated by nothing in CI. The rules §4 and §6 name are the ones to assert.
4. Whether the deadlift equivalent gets authored, which would be extrapolated on the same warrant as
   this one and should carry the same §1.
5. Migration **0111** is authored and, per the architecture doc's §10, not applied. No percentage-loaded
   program resolves a weight until it is.

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-03 | Authored. Not locked. |
