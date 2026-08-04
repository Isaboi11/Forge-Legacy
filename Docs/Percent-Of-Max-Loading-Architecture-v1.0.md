# Percent-of-Max Loading — Architecture v1.0

**Status:** 🟢 **BUILT 2026-08-03** — capability implemented, not yet LOCKED as architecture.
**Author basis:** 2026-08-03. Written against the committed tree, not against the design docs.
**Motivating work:** three 4-week single-lift specialization programs (squat / bench / deadlift).

> **Implementation record is in §10.** Three decisions below changed during the build and are marked
> where they did. The programs themselves are NOT authored — this is the capability they need.

> **Read `Program-Authoring-Standard-v1.0.md` §6 before this document.** That section already ruled on
> how intensity prescription is handled for MVP, and this proposal argues for a different answer in one
> specific case. It does not overturn PAS-D3 or PAS-D4.

---

## Section 1 — The Problem

A percentage-based program prescribes load as a fraction of a tested one-rep max:

```
Back Squat — 5 sets of 5 reps @ 75%
```

The app cannot express this. `ProgramExercise` (`src/data/programs-live.ts`) holds `sets`, `reps`,
`repScheme`, `durationSec`, and circuit grouping. There is no load field of any kind. The locked
`ExercisePrescription` schema (PAS §6.1) has `weightValue`/`weightUnit` — an **absolute** weight — and no
percentage.

The import path discards load deliberately, and its reasoning is sound
(`src/domain/program/import-scheme.ts:243`):

> *"A program prescribes sets and reps here; the weight is what the athlete logs on the day, and inventing
> a target load from somebody else's percentages would be prescribing a number nobody wrote."*

That is correct **for parsing a stranger's spreadsheet**, where the percentages refer to a max the app has
never seen. It is wrong for an authored program where the percentage *is* the prescription. Strip the
percentage from `5×5 @ 75%` and you have not simplified the session — you have deleted the training and
kept the shape.

### 1.1 Why the RPE precedent does not transfer

PAS-D3 encodes RPE in the `notes` field rather than amending the schema, and PAS-D12 records that a
dedicated field is the correct long-term fix. The obvious cheap move is to do the same for percentages.

**It does not work, and the reason is specific.** `RPE 8` in a notes field is directly actionable — the
athlete reads it and self-regulates. `@75%` in a notes field is not: it requires the athlete to recall
their max and do arithmetic, for every set, in the gym, under fatigue. The entire value of the feature is
the *resolved number*. A percentage the app declines to resolve is worse than no percentage at all,
because it looks like a prescription while still making the athlete do the work.

RPE-in-notes is a working accommodation. Percent-in-notes is a broken one.

### 1.2 What this does NOT unblock

Stated plainly so the scope is not oversold: **none of the 24 launch programs needs this.** All five locked
progression models (PAS §7.1) prescribe absolute weights, rep ranges, block structure, or set counts.
Percent-of-max appears nowhere in the locked catalog.

This capability serves a **new sub-family** of specialization blocks. It does not advance the 2-of-24
program backlog that the Master Status names as the project's biggest blocker. That trade is the PO's to
make, and it should be made with that fact in view.

---

## Section 2 — Decisions Proposed

| ID | Decision |
|---|---|
| **PCT-D1** | `ProgramExercise` gains `percentOfMax?: number` (1–150) and `percentOf?: string` (a catalog key naming the *reference lift*). |
| **PCT-D2** | The reference lift is **explicit, never inferred**. `percentOf` defaults to the exercise's own catalog key only when omitted. |
| **PCT-D3** | ~~A program declares the maxes it needs.~~ **CHANGED IN BUILD:** the required maxes are **derived** by walking the prescriptions (`requiredMaxKeys`). A declared list is one more thing that can drift from what it describes, and the drift would be silent — an undeclared lift would simply never be asked for, and every percentage against it would render unresolved with nothing indicating why. Walking the structure cannot disagree with the structure. |
| **PCT-D4** | The athlete enters those maxes **before the program starts**, on a gate screen at adoption. |
| **PCT-D5** | The max is **owned by the program run**, not tracked live — a PR mid-block does not silently shift it. The athlete may change it at any time (§4.2). |
| **PCT-D6** | The athlete's profile holds a *current known max* per lift, used only to **pre-fill** PCT-D4. The program's copy is authoritative once started. |
| **PCT-D7** | Resolved load = `round(max × percent)` to the nearest **5 lb / 2.5 kg**, computed from the true max every time — never compounded off a previous rounding. |
| **PCT-D8** | Display shows **both**: `5 × 5 @ 75% — 245 lb`. The percentage is the program's logic; the weight is what goes on the bar. |
| **PCT-D9** | An estimated max is **never** written to the PR system and is **always** labelled an estimate. See §5. |
| **PCT-D10** | A missing max **degrades, never blocks** — the program runs showing percentages only, with a persistent prompt to set the max. |

---

## Section 3 — The Reference-Lift Requirement (PCT-D2)

This is the non-obvious part of the schema, and it comes straight from the source material.

A percentage does not always refer to the lift being performed:

- *Front Squat 3 × 4 @ 45% — **% taken from Back Squat max***
- *Front Squat 1 × 8 @ 35–40% **of Back Squat max***
- *Close-Grip Bench, 100 reps @ 33% **of your Bench max***

A schema that assumes "percentage of this exercise's own max" would silently prescribe 45% of a front
squat max the athlete has never tested — a materially heavier or lighter bar than intended, presented with
full confidence. Hence `percentOf` as an explicit field.

It also means a single program can require several maxes. The squat block below needs three.

---

## Section 4 — The Max-Entry Gate (PCT-D4)

**When:** on Start, before the first session is reachable. Not during onboarding, not buried in settings.

**What it shows:** one row per entry in `requiredMaxes`, pre-filled from the profile (PCT-D6) where a value
exists, each with four ways to answer:

1. **I know it** — type it.
2. **Work it out from a set I remember** — "225 for 5" → ~260 lb. See §4.1.
3. **Estimate it from my logged workouts** — where history exists. See §5.
4. **Test it in session one** — the program opens with a max-finding session; percentages resolve after.

**Why a gate and not a nag:** every prescription in the program depends on this number. A program that
starts without it presents 23 sessions of unresolvable percentages, which is worse than one screen of
friction.

### 4.1 The athlete who does not know their max

This is the common case, not the edge case. Most people have never tested a true single, and a new athlete
has no logged history to estimate from either — so **"estimate from your logs" cannot be the only answer.**

Option 2 is the one that works for everybody: ask for any hard set they remember — weight and reps — and
run it through the existing `e1rm()` helper. It needs no app history, only a number the athlete already
knows. It is labelled an estimate (PCT-D9) and it is editable from day one.

Option 4 exists because a max-finding session is a legitimate and often better way to open a peaking block
— but it should never be *required*, because a first session that is a max attempt is an intimidating front
door for an athlete who has never taken one.

### 4.2 Changing the max mid-program (PCT-D5)

**The athlete can change it whenever they want.** An early draft of this document froze it outright; that
was wrong, and the reason it was wrong is that there are two entirely different situations behind the same
request:

- **The number was wrong.** They estimated, and week one felt absurdly light or crushing. This is
  *expected* — we are actively encouraging estimates (§4.1), so we own the correction path. Blocking it
  means the whole block runs at the wrong intensity.
- **They got stronger.** A genuine PR mid-block.

**The rule, which covers both:** changing the max recalculates **every session not yet completed**, and
**never touches a completed one.**

Completed sessions record what the athlete actually lifted. That is a fact about their training, and
rewriting it to match a new number would be inventing history — the same failure the Master Status warns
about when a displayed value is not the value that was true.

**What is not silent:** if the change lands during a peaking phase, say so plainly at the point of change —
*"Your last two weeks are built to peak from 405 lb. Raising it to 425 makes those days heavier than the
program intends."* Inform, do not block. It is their training.

**What the app should not do** is track a live PR into the program automatically. The source program runs
the whole month off one anchor and re-tests at the end; that is how the peak is built, and a max that moved
on its own would mean two athletes on the same program were running different programs without either of
them choosing to.

---

## Section 5 — Estimated Maxes, and an Existing Decision (PCT-D9)

`src/domain/workout/metrics.ts:116` carries a deliberate, well-argued rule under the heading
**"NO ESTIMATED MAX, ANYWHERE"**:

> *"An estimate is not a fact: an athlete told they set a 330 lb record never lifted 330 lb."*

That decision governs **records**, and it is right. This proposal does not touch it.

Using an Epley estimate to *pick a training weight* is a different job from *claiming a record*. A training
anchor is a starting guess the athlete corrects by feel in week one; a record is a permanent claim about
something they did. The rules that follow keep the two apart:

- An estimated max is labelled **"Estimated"** wherever it appears, and is editable.
- It is **never** written to `personal_records` and never triggers a PR celebration.
- The `e1rm()` helper is reused as-is — no new estimation maths.
- Day-30-style test sessions produce a **real** lift, which flows to the PR system normally, by the
  existing rules, with no exception.

---

## Section 6 — Display

```
Back Squat
5 × 5 @ 75% — 245 lb
```

Where the percentage varies per set, the resolved ladder is shown in full, consistent with how
`schemeText()` already refuses to collapse a ladder (`prescription.ts:79`):

```
Back Squat
5 @ 65% — 265 lb  ·  4 @ 75% — 305 lb  ·  3 @ 80% — 325 lb  ·  2 @ 87% — 355 lb  ·  1 @ 92% — 375 lb
```

**Bar-weight floor:** when a resolved load falls below the empty bar (45 lb / 20 kg), display the bar
weight with a note rather than a number nobody can load.

**No max set:** show `5 × 5 @ 75%` with the resolved half absent — never a fabricated weight, and never a
silent `0 lb`. This follows the standing lesson recorded in the Master Status: *a value that is only ever
its default is worse than an absent one.*

---

## Section 7 — Open Items the Source Material Exposes

Three things in the motivating programs that this schema does **not** solve, listed so they are not
discovered late:

### 7.1 Tempo conflicts with a locked decision

One session prescribes an explicit tempo (5 s eccentric, 2 s pause, normal concentric) applied to every
movement. **PAS-D4 excludes tempo from all MVP programs**, with a stated rationale about encoding
consistency.

Options: encode it as a day-level note (cheapest, consistent with PAS-D3's spirit); redesign the day
without tempo; or amend PAS-D4. **Recommend the day-level note** — it is one day, and reopening PAS-D4 for
it is disproportionate.

### 7.2 "As many sets as possible in a time window"

Two sessions prescribe *as many **sets** of 3 reps at 75% as possible in 10 minutes*, with the set count
recorded as the session's score. The prescription model has AMRAP-with-a-cap (`capSec` on a
`PrescriptionBlock`), which is close but counts rounds of a circuit, not sets of a single lift.

Needs a check against the existing block model before it is assumed to fit. It may already work; it may
need the block to accept a single member with an open round count.

### 7.3 Athlete's-choice days

One session offers five loading options (33 reps @ 70% · 26 @ 75% · 21 @ 80% · 15 @ 85% · 10 @ 90%) and
lets the athlete pick one, then break the sets down however they like. **The model has no "choose one of
N" concept at all.**

This is a genuine gap, not an encoding problem. Simplest resolution for V1: author the middle option as
the prescription and record the alternatives in notes. Full support is a separate feature.

---

## Section 8 — Implementation Order

1. Schema: `percentOfMax` / `percentOf` on `ProgramExercise`; `requiredMaxes` on `ProgramStructure`.
   Both additive and optional — every program authored to date reads unchanged.
2. Storage: per-athlete current maxes; per-adopted-program frozen snapshot. `programs.structure` is
   `jsonb`, so the program side needs no migration; the athlete's maxes do.
3. Resolution + rounding as a pure, unit-tested domain module. No React, no Supabase — same shape as
   `prescription.ts`, so `node --test` covers every rule.
4. The max-entry gate at adoption.
5. Display, in all three places a prescription renders: Program Detail, the day list, and the Active
   Workout header — via the existing shared reading, so the same program never describes itself two ways.
6. Test-day capture → offer to update the profile max.

Only after all six: author the three programs.

---

## Section 9 — What Needs a Decision

1. **Build this at all**, given §1.2 — it does not advance the 24-program backlog.
2. **Three programs or one.** The squat block is analysed from a real source; bench and deadlift versions
   would be extrapolated from its method, not from source material.
3. **§7.1 tempo** — day-level note (recommended), redesign, or amend PAS-D4.
4. **§7.3 athlete's choice** — author the middle option (recommended) or build the feature.

---

## Section 10 — Implementation Record (2026-08-03)

### What shipped

| Layer | Where |
|---|---|
| Prescription schema | `percentOfMax`, `percentScheme`, `percentOf` on `ProgramExercise` — all optional, all inside `programs.structure` (jsonb), so no shipped program changed meaning |
| Resolution | `src/domain/program/percent-max.ts` — pure, 35 unit tests |
| Session targets | `targetWeight` on `SessionSet`, populated by `sessionSetsFor` — 7 further tests |
| Storage | migration **0111** (`athlete_lift_maxes` + `programs.lift_maxes`) — **AUTHORED, NOT APPLIED** |
| Data layer | `src/data/lift-maxes-live.ts`; `liftMaxes` on `SavedProgram` |
| Entry gate | `src/components/forge/LiftMaxSheet.tsx`, gated on Start in Program Detail |
| Display | Program Detail day list (`@ 75% — 305 lb`), "Working from" row, Active Workout Target column |

Gate: tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · 943 `node --test` green · web export clean.

### Three things the build found

**A single is not an estimate (§5).** Epley is `w × (1 + r/30)`, so at one rep it returns `w × 31/30` — it
inflates a true single by 3.3%. An athlete entering "315 for 1" would have had **326** written down, a
number they have never lifted, and every percentage all block computed from it. A unit test caught it.
One-rep entries are now returned verbatim.

**Changing a max needs no recalculation pass (§4.2).** `buildLog` already draws a completed day from what
was logged and a future day from the prescription. Percentages resolve at render, so a new max moves
everything not yet trained and *cannot* touch anything already trained. The property the spec asked for
fell out of the existing structure rather than needing machinery.

**The ask is not the answer.** `targetWeight` sits beside `weight`, never in it. Pre-filling the logged
weight from a target would record a lift the athlete never made the moment they finished a session
without touching a set — and could announce a personal record for it. Same separation as `targetSec`
beside `durationSec`, and the same class of defect the 2026-08-03 set-logging fixes closed.

### Deliberately not built

**Estimate from logged workouts** (§4 option 3). "From a set you remember" covers the same need and works
with no history at all, which is the case that actually matters. Adding a second estimate route before
anyone has used the first is speculative.

**Test-day capture** (§8 step 6). A test day has to be *marked* by the program, and no program marks one
because none is authored yet. Building a detector for a flag nothing writes is precisely the class of
defect the 2026-08-01 audit named — a value that is only ever its default. The manual path exists: the
"Working from" row changes any max at any time, and `saveMyLiftMax` already accepts `source: 'tested'`.

### Still open before the programs can be authored

1. **Apply migration 0111.** Until then `programs.lift_maxes` does not exist; reads default to `{}` and
   the gate cannot save. Nothing shipped exercises it, so the app is unaffected meanwhile.
2. **§7.1 tempo** — and the cheap fix named there does not exist: `ProgramExercise` has **no notes field
   at all**, deliberately (`src/domain/training/schema.ts:349`). PAS-D3's RPE-in-notes accommodation is
   therefore not implementable in the built app either. The tempo day gets redesigned, or a note field
   gets built.
3. **§7.2** density protocol — check against the existing AMRAP block model.
4. **§7.3** athlete's-choice day — still no "choose one of N" concept.

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-03 | Initial proposal. Not locked. |
| v1.0 | 2026-08-03 | §4.1/§4.2 rewritten — the max is changeable, not frozen (PO). |
| v1.0 | 2026-08-03 | Built. PCT-D3 changed to derived; §10 implementation record added. |
