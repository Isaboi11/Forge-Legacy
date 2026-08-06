# Body Recomposition Foundation — Design Record

**Status:** ✅ **LOCKED** — PO Lock Approval granted 2026-08-06, over a §9 recommendation to hold. See `Lock-Record.md`.
**Authored:** 2026-08-06, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/body-recomposition-foundation.json`
**Blueprint (LOCKED):** `Docs/Body-Recomposition-Foundation-Blueprint-v1.0.md`
**Catalog slot:** Sort 13, Conditioning family, BEGINNER rung — `Program-Catalog-Stage2-Production-Plan-v1.0.md` §Wave 2

---

## 1. Provenance — read this first

The **idea** for authoring this program now came from a third-party PDF the athlete brought in: *8 Week
Beginner Fat Loss Workout*, published free on muscleandstrength.com, by Roger "Rock" Lockridge. The
**program is original.** Nothing of that document is reproduced here.

What was taken from it is one observation, and it is not anyone's property: **that an eight-week,
four-day, upper/lower beginner fat-loss block is a normal and sensible shape.** The source was a sanity
check on the Blueprint's metadata, not an input to the training.

What was deliberately **not** taken:

- its name, and any name resembling it
- its session titles (*Upper Body Workout A/B*, *Lower Body Workout A/B*)
- its exercise selection and the order it authored them in
- its prescriptions — its 2 sets, its 10-and-20-rep pairing, its rest table
- its written copy, its schedule prose, its branding, its author's byline

Same posture as `scripts/bridger-logan/` and Squat Ascent Intermediate §1 — see either for the general
rule. The distinction that matters: sets, reps, frequency and split are functional facts about training
and were never protectable; a named, authored, sequenced document is a piece of work someone published.

**The metadata is not downstream of the PDF.** Every number in this program's header —
8 weeks, 4 sessions, 32 workouts, GYM, `LOSE_FAT + BUILD_MUSCLE`, Week-7 deload — was fixed in
`Body-Recomposition-Foundation-Blueprint-v1.0.md` in **June 2026**, months before the PDF was seen. The
convergence is why the source was worth a look, and it is also why the source was not needed.

### The source is thinner than our own standard

Recorded because it is the substantive reason not to have copied it, independent of provenance:

| Standard | What it requires | What the source does |
|---|---|---|
| QC-2 / Blueprint §6 | visible progressive overload | **none** — its 10-rep and 20-rep days are two of the four workouts, not two phases; the same four sessions repeat for eight weeks |
| PAS-D9 | WARM_UP and COOL_DOWN each session | neither |
| PAS-D7/D8, Blueprint §2 | one deload, Week 7 | none |
| PAS-D11 | 12–24 MAIN sets | 12 (6 × 2) — the floor |
| PAS §11.3 | `restSeconds` populated | present, and the one thing it does carry |

Its overview text also says training runs "every other day" while its own Schedule Option 2 trains
Mon/Tue and Thu/Fri, and a sentence from an exercise description has leaked into the Monday bullet.

---

## 2. What it is

Eight weeks, four days a week, 32 sessions. **Upper / Lower ×2.** Every session is resistance-led and
closes with a steady-state conditioning finisher.

| | |
|---|---|
| **A — Press & Pull** | upper; horizontal + vertical press, horizontal + vertical pull, arms |
| **B — Squat & Stride** | lower; knee-dominant, single-leg, hamstring, calf |
| **C — Row & Raise** | upper; pull-emphasis, rear delts, arms |
| **D — Hinge & Bridge** | lower; hip-dominant, posterior chain, single-leg |

The name is the Blueprint's, unchanged. It is descriptive rather than promotional, carries no outcome
promise, and matches its successor (`Body Recomposition Intermediate`) — the Recomposition ladder has
matched names by design (Blueprint §9). 29 characters, inside the PAS-D1 limit.

---

## 3. The emphasis inversion, in authored structure

This is the property the Blueprint's convergence test rests on (§11, Parts A and C), so it is worth
stating as built rather than as intended: **resistance leads and is the majority; conditioning is a
caloric minority at the end.**

Per session, at Weeks 5–6: six resistance exercises, 18 working sets, roughly 30 minutes of loaded work
— then one 20-minute steady bout. That is the inverse of Athletic Conditioning Foundation (Sort 12),
which is conditioning-led with resistance in support, at 3 days rather than 4.

The finisher is placed **last, always.** A finisher before accessory work makes the accessories junk
volume — Iron & Engine's Phase-5 finding 5, applied here from the start rather than corrected into.

---

## 4. Exercise selection — why it is this simple

Blueprint §3's beginner simple-movement note governs: *machines, dumbbells, bodyweight, basic compounds
with instruction*, and the PAS §11.3 complex-barbell caution applies because this athlete may have no
strength background at all.

**There is no barbell in this program.** Not one prescription. That is a deliberate reading of §11.3
rather than a shortcut: a beginner in a caloric deficit is the worst-placed athlete in the catalog to be
learning a back squat — under-recovered, under-fuelled, and being asked to acquire technique at the same
time. The squat pattern is trained by the leg press and the goblet squat; the hinge by the machine hip
thrust and the dumbbell RDL. Both patterns are learned. Neither is tested.

All 23 catalog keys resolve against the **visible** catalogue (`PICKER_DB`, 721 of 797 rows), not merely
against `exercises.json` — the distinction that let Iron & Engine ship a hidden `air-bike` past seven
green test runs.

**The one substitution:** `assisted-pull-up-machine` on day C carries `machine-lat-pulldown`. Not every
commercial gym has an assisted pull-up machine, and a beginner who cannot find one should not be left
choosing for themselves what replaces a vertical pull.

---

## 5. Progression — Volume Accumulation

PAS §7.2 permits Linear Progression **or** Volume Accumulation at CONDITIONING BEGINNER. This program
uses **Volume Accumulation**, because load progression on machines is a beginner guessing at pin
positions, whereas "one more exercise, three more reps" is a target they can read.

| Block | Weeks | Exercises | MAIN sets | Reps | Rest (comp/iso) | Finisher |
|---|---|---:|---:|---:|---|---:|
| 1 | 1–2 | 5 + finisher | 15 | 10 | 90 / 60 s | 15 min |
| 2 | 3–4 | 5 + finisher | 15 | 12 | 90 / 60 s | 18 min |
| 3 | 5–6 | 6 + finisher | 18 | 12 | 75 / 60 s | 20 min |
| 4 | **7 — Deload** | 4 + finisher | 12 | 8 | 90 / 90 s | 12 min |
| 5 | **8 — Peak** | 6 + finisher | 18 | 15 | 60 / 60 s | 22 min |

Every row sits inside PAS-D11 (4–8 exercises, 12–24 MAIN sets), every rep count inside beginner
hypertrophy (8–15), every rest inside PAS §10.3 (60–90 s). Asserted, not asserted-about — see
`__tests__/body-recomp-foundation.test.mjs`.

**The deload keeps the four compounds and drops the isolation**, on all four days, and converts every
finisher to a 12-minute easy walk. It reduces resistance volume and conditioning load while holding four
sessions, which is exactly what PAS-D8 asks for. Frequency is the habit; volume is the stimulus. You
deload the stimulus.

**No RPE anywhere** — PAS-D3 excludes it at BEGINNER.

---

## 6. Conditioning — why steady, and why it is on the machines

Blueprint §5: deficit-oriented, moderate-intensity or steady-state, for caloric output — **not**
work-capacity development. So there are no intervals, no AMRAPs and no circuits in this program. Those
belong to Athletic Conditioning Foundation and to the Conditioning ladder.

Activity is matched to what the session just did:

- **A (upper)** → indoor bike. Legs are fresh; the upper body has just worked.
- **C (upper)** → elliptical. Same reasoning, different implement, so eight weeks is not one machine.
- **B and D (lower)** → incline treadmill walk. Legs are already loaded; walking is the lowest-impact
  way to spend calories on them without adding to what they already owe.

All four are authored `indoor`, which is the **author's default and not a rule** — the athlete may flip
the toggle on the day. The elliptical has no toggle to flip, being a machine (`OUTDOOR_CAPABLE`).

Each bout carries a real `targetSec`. None carries a `targetMi`, and none carries a zero: a zero would
read as a target already met the moment the athlete starts.

---

## 7. Coaching audit — findings

| # | Finding | Resolution |
|---|---|---|
| 1 | **Nothing prescribes a cool-down**, which PAS-D9 required for CONDITIONING. | ✅ **CLOSED 2026-08-06 — the rule changed, not the program.** `ProgramWorkout` has no cooldown field, so no authored program could satisfy this; **PAS Amendment 003** makes COOL_DOWN optional for every category. Refusing to fake it by appending a stretch to `main` — where it would be counted and logged as a working set — was the right call and is now written into the Standard as PAS-A3-D4. The steady walk closing days B and D still partly serves the purpose. |
| 2 | **Week 8 is the hardest week, and it is the last week.** No taper. | Deliberate. This block does not test anything, so there is nothing to arrive fresh for. The peak is the point: the athlete should finish knowing they did more in week 8 than in week 1. The successor opens at a lower dose. |
| 3 | **Machine-heavy, so it is unavailable to home athletes.** | Accepted — environment is GYM, fixed by the Blueprint. Home Conditioning (Sort 21) is the home answer and is unbuilt. |
| 4 | **Rest drops to 60 s in Week 8 while reps rise to 15.** Compounding difficulty on two axes at once. | Accepted and flagged as the thing to watch in testing. It is one week, it follows a deload, and the loads are machine-based and self-selected. If the peak proves unrealistic, shortening rest is the change to reverse first. |
| 5 | **Days B and D both close with the same walk.** | Accepted. Variety for its own sake would put a rower after a leg session. |
| 6 | An earlier draft opened every session with 5 minutes of easy cardio as a general warm-up. | **Removed.** PO decision 2026-08-06: a program prescribes only exercises really in the catalogue, and does not prescribe ramp sets. All warm-ups are now catalogue-resolvable pattern prep, 3 items per session. |

---

## 8. PAS compliance

| Requirement | Status |
|---|---|
| PAS-D1 name length ≤ 60 | ✅ 29 |
| PAS-D3 no RPE at BEGINNER | ✅ none |
| PAS-D7/D8 one deload, frequency held | ✅ Week 7, still 4 sessions |
| PAS-D9 WARM_UP (+ COOL_DOWN, until 2026-08-06) | ✅ warm-up ✅ · cool-down **no longer required** — PAS Amendment 003, finding 1 |
| PAS-D11 4–8 exercises / 12–24 MAIN sets | ✅ 5–7 / 12–18 |
| PAS §7.2 permitted progression model | ✅ Volume Accumulation |
| PAS §10.2 30–60 min sessions | ✅ ~35–55 incl. finisher |
| PAS §10.3 beginner rest 60–90 s | ✅ 60–90 |
| PAS §11.3 `restSeconds` populated | ✅ every resistance prescription |
| PAS §11.3 complex-barbell caution | ✅ no barbell at all — §4 |
| PAS §17.2 successor resolves | ⚠️ `successorName` is `Body Recomposition Intermediate`, which is **not yet authored** |

---

## 9. Lock recommendation

> **⚠ SUPERSEDED 2026-08-06 — LOCK APPROVED, THIS RECOMMENDATION OVERRIDDEN.**
> The product owner granted Lock Approval with all three items below still open. `status` is now
> `LOCKED`; `Lock-Record.md` is the record of what was signed.
>
> **Item 3 was then resolved the same day, and not by fixing the program.** Locking it made the PAS-D9
> cool-down violation a written contradiction between the Standard and the locked catalog — so the
> product owner amended the rule. `Program-Authoring-Standard-Amendment-003-Cooldown-Not-Required.md`
> (LOCKED) makes COOL_DOWN optional for every category, on the grounds that `ProgramWorkout` has no
> field for one and a requirement no author can satisfy is not a standard. **Items 1 and 2 remain open:
> nobody has trained it, and the Week-8 rest/rep pairing is unreviewed in practice.**
>
> This section is left standing rather than rewritten. A recommendation that gets overridden is part of
> the program's history, and editing it to agree with the outcome would erase the fact that the question
> was asked — and in this case the override is what surfaced a rule that had been quietly unsatisfiable
> since Iron & Engine.

**Recommend: hold.** Stage 2 is complete and the machine-checkable half of the Production Standard is
green, but three things are outstanding and none of them is a document's to settle:

1. **PO review of the progression**, particularly finding 4 — the Week-8 rest/rep pairing.
2. **A real athlete running it.** Nothing here has been trained by anyone.
3. **The cool-down gap (finding 1).** Either `ProgramWorkout` grows a cooldown field and a surface that
   renders it, or PAS-D9 is amended to acknowledge that the catalog model cannot express one. Two
   CONDITIONING programs now violate the same rule for the same reason; the second one is the point at
   which "recorded as an open gap" stops being sufficient.

`status` is deliberately **not** `LOCKED`. Lock Approval is the product owner's signature, and claiming
it here would be forging one.

---

## 10. Open, for the catalog rather than for this program

- **`successorName` points at an unauthored program.** Body Recomposition Intermediate (Sort 15) is
  blueprinted and unbuilt. Import order is terminal-first (PAS §17.2), so if these are ever imported as
  a pair, the Intermediate goes first.
- **The Conditioning family's Stage 1 is not complete.** Hybrid Foundation (Sort 16) is still
  un-blueprinted and the family review has not run — Blueprint §12's scope guard. Authoring this program
  does not change that; it was cleared for Stage 2 on its own resolved pair.
