# Squat Ascent Intermediate — Design Record

**Status:** AUTHORED — original program. PO Lock Approval outstanding.
**Authored:** 2026-08-03, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/squat-ascent-intermediate.json`

---

## 1. Provenance — read this first

The **method** behind this program was analysed from a publicly-posted training month run by a third
party (an Instagram strength community, October 2024). The **program is original**: its structure,
session count, prescriptions, percentages, session names and copy were authored here, and none of the
source's are reproduced.

What was taken is not protectable and was never anyone's property: frequency, how intensity waves,
where volume peaks, the idea of rehearsing a near-max before testing one. Sets, reps and percentages are
functional facts about training, not creative expression.

What was deliberately **not** taken:

- the source's name, and any name resembling it
- its session titles, its written copy, its artwork
- its day-by-day sequence as authored
- its calendar. The source is a fixed 31-day October event; this is a 4-week block you start any Monday.

The athlete's personal transcription of the source lives outside this repository and is not part of the
product. Same posture as `scripts/bridger-logan/` — see that README for the general rule.

---

## 2. What it is

Four weeks, five sessions a week, twenty sessions. The back squat is trained in **every one**. Every
squat is loaded as a percentage of a single tested one-rep max, set before day one and not re-tested
until day twenty.

This is the **first percentage-loaded program in the catalog** (capability: migration 0111,
`Docs/Percent-Of-Max-Loading-Architecture-v1.0.md`). It cannot be read at all until the athlete answers
the max gate — which is why it is INTERMEDIATE and not a first program.

## 3. Prerequisites

- A tested or confidently estimated back-squat max.
- Competent squat technique at load. This program assumes the pattern, it does not teach it.
- Tolerance for five lifting sessions a week.

Not a successor to anything, and nothing succeeds it. It is a **standalone block** run between general
programs, not a rung on the Strength Foundation ladder. `successorName` is deliberately null.

## 4. The intensity architecture

| Week | Label | Squat volume (reps) | Peak intensity |
|---|---|---:|---:|
| 1 | Establish | 99 | 78% |
| 2 | Accumulate | 105 | 85% |
| 3 | Intensify | 87 | 93% |
| 4 | Realize | 75 | 100%+ |

Two rules govern the shape, and both are asserted in `programs.test.mjs`:

1. **Peak intensity climbs every week.** The athlete meets a heavier bar each week than the last.
2. **Volume peaks mid-block and the final week is the lightest.** Volume climbing into a test day is how
   you arrive at the test tired.

The bar is genuinely heavy on only four days of twenty. Everything else sits between 55% and 80%.

## 5. Why each week looks the way it does

**Week 1 — Establish.** Straight sets, a descending ladder, a tempo day, triples, and long sets. Five
different shapes, none of them hard. The purpose is exposure to squatting daily before any of it is
heavy, and to let the athlete find out whether the max they entered was honest.

**Week 2 — Accumulate.** The volume peak, including the block's biggest single session (6 × 6 @ 68%).
The first heavy exposure lands here at 85% for doubles, after a week of practice and not before.

**Week 3 — Intensify.** Volume recedes, the bar climbs. The week ends on a **dress rehearsal** ramping
to 93% — five days before the test. This is the most important day in the program: it means test day is
not the first time in a month the athlete has been under a near-maximal bar.

**Week 4 — Realize.** A reset day, two deliberately short speed days, the test, and a flush. The taper
is sharp and brief on purpose — a long taper bleeds the adaptation the previous three weeks built.

**Test day is a session on its own.** Nothing else is prescribed: `[5, 3, 2, 1, 1, 1, 1]` at
`[50, 65, 75, 85, 92, 97, 100]%`. Anything beyond 100% is the athlete's call on the day, which is the
honest way to prescribe a lift nobody can predict.

## 6. Supporting work

The block is a squat specialization, not a leg specialization. Bench press, deadlift, chin-ups, rows and
carries appear throughout so that four weeks of squatting does not cost the athlete their upper body.

Only the squat, front squat and the two competition lifts carry percentages. Accessories are prescribed
by sets and reps and left to the athlete's judgement, which is how accessories should be prescribed.

**The front squat borrows the BACK squat's max** (`percentOf: barbell-back-squat`). Resolving 48%
against an untested front-squat max would put a materially wrong bar in front of the athlete with full
confidence. Asserted in the acceptance test.

## 7. Two things the source did that this program does not

**A tempo day.** `PAS-D4` excludes tempo notation from every MVP Forge program, and `ProgramExercise`
has no notes field to carry it in anyway. Resolved without amending either: the catalog already contains
**`barbell-tempo-squat`** and **`barbell-pause-squat`** as first-class exercises. The tempo prescription
lives in the exercise, where the app can render it and the athlete can look it up.

**An athlete's-choice day and a density day.** The source offers "pick one of five loading options" and
"as many sets as possible in ten minutes". The prescription model has no "choose one of N" concept, and
its AMRAP block counts rounds of a circuit rather than sets of a single lift. **Neither is authored**,
rather than authored in a shape the app would render wrongly. Both are recorded as open items in
`Docs/Percent-Of-Max-Loading-Architecture-v1.0.md` §7.

## 8. Naming

`Squat Ascent Intermediate` — 25 characters, inside the PAS-D1 pattern
(`[Subject] [Tier Descriptor]`) and well inside the 40-character authoring target.

**"Ascent" is doing descriptive work, not decorative work.** The defining property of this block is that
the bar climbs every week and finishes above the number the athlete started from — 78% → 85% → 93% →
100%+. It also sits inside the app's own vocabulary, which is built on progression and standing rather
than on intensity adjectives.

The tier descriptor is kept deliberately. It is the signal that this program has real prerequisites — a
tested max and a competent squat — and dropping it would leave a beginner nothing to read that says so.

No superlative, no branded methodology, no outcome promise, and no echo of the source's name.

`structure` is omitted rather than guessed. The controlled vocabulary is `upper_lower | ppl | full_body`
and this program is none of them; claiming one would misdescribe it to the artwork resolver.

## 9. Open before Lock

1. PO review of the loading, which is the one thing a document cannot settle.
2. A real athlete running it end to end. Nothing here has been trained by anyone yet.
3. Decide whether the bench and deadlift equivalents get authored — they would be extrapolated from this
   program's method rather than analysed from a source.

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-03 | Authored. Not locked. |
