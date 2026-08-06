# Muscle Building Intermediate — Design Record

**Status:** AUTHORED — Stage 2 complete. PO Lock Approval outstanding.
**Authored:** 2026-08-06, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/muscle-building-intermediate.json`
**Blueprint (LOCKED):** `Docs/Muscle-Building-Intermediate-Blueprint-v1.0.md`
**Catalog slot:** **Sort 6** — the locked 24, Muscle Building family, INTERMEDIATE rung

---

## 1. Provenance

The **prompt** was a third-party PDF: *Lean Mass: 6 Week Workout Program to Build Lean Muscle*,
muscleandstrength.com, by Josh England. The **program is original**, and in this case the source
contributed less than any of the three before it.

What it contributed: the observation that **an intermediate lifter training four days a week for muscle
is a real and common brief** — which is what made this the PDF worth checking the plan against. Its
frequency (4) matched the unbuilt Sort 6 slot, where the previous three had not.

What was **not** taken, and could not have been:

- its **split.** The PDF is a body-part split — Legs / Chest & Biceps / Back / Shoulders & Triceps, each
  muscle once a week. The Blueprint mandates **Upper/Lower × 2**, explicitly: *"PAS §11.2 names
  Push/Pull/Legs or Upper/Lower for HYPERTROPHY; at a 4-day frequency, Upper/Lower is the correct fit
  (PPL maps cleanly to 3 or 6 days, not 4) and gives each muscle group two exposures per week."*
- its **duration.** 6 weeks against the Blueprint's 10.
- its **deload.** It has none; the Blueprint fixes one at week 9.
- its name, day titles, exercise selection, prescriptions, rest guidance and copy.

**A locked Blueprint outranks a PDF.** Where the two disagreed, the Blueprint won every time, which is
why this program looks nothing like the document that prompted it.

Same posture as [`scripts/bridger-logan/`](../../../scripts/bridger-logan/README.md), Squat Ascent §1,
Body Recomposition Foundation §1, Frame by Frame §1 and Close Quarters §1.

---

## 2. It could not have been authored a day earlier

The Blueprint requires **Double Progression** on every exercise (§5): *a rep range is prescribed, and the
athlete adds load once they hit the top of the range on all sets.*

**That was unauthorable.** `ExercisePrescription.repsMax` existed on the catalog side and nowhere else —
`structureFromDefinition` did not copy it, `ProgramExercise` had no field for it, and nothing rendered
it. A range reached the athlete as its floor.

Full Frame had authored a range on **105 of 105** prescriptions, every one of them lost. Its own §1
records that its first draft was rejected for progression that "existed only in prose nobody reads
mid-set"; the rebuild had the same defect in a different costume.

So the field was carried end to end first — model, adoption, preview, and the Target column in the live
session — and Full Frame's ranges came back with it. **This program is the first that can honestly say
"4 × 6–10".**

---

## 3. What it is

Ten weeks, four days a week, 40 sessions, six blocks. **Upper / Lower, twice each.**

| | | |
|---|---|---|
| **A — Upper, Chest Lead** | `upper` | bench · barbell row · incline · pulldown · lateral raise · curl · rear-delt fly |
| **B — Lower, Squat Lead** | `legs` | back squat · RDL · leg extension · lying curl · seated calf · cable crunch |
| **C — Upper, Shoulder Lead** | `upper` | overhead press · seated row · dumbbell bench · pull-up · cable lateral · triceps · rear-delt fly |
| **D — Lower, Hinge Lead** | `legs` | hack squat · hip thrust · seated curl · Bulgarian · standing calf · back extension |

Session order follows Blueprint §3 exactly: press or squat compound first, row or hinge compound second,
isolation last. **A is chest-led and C is shoulder-led** so the two upper days are not one day twice —
the same reasoning that separates Lower B (knee-dominant) from Lower D (hip-dominant).

`structure` is `upper_lower`, which this program genuinely is — so the `lower`/`legs` distinction matters,
and the days are `legs` because the schema reserves `lower` for a declared upper/lower structure. Both
readings are satisfiable here; `legs` is used for consistency with every other leg day in the catalog.

---

## 4. Progression — two models at once

The Blueprint runs **Double Progression inside Volume Accumulation** (§2, §5), which are different axes
and are easy to conflate:

- **Double progression** is the athlete's job, within a block: the rep range never moves, and when they
  reach the top of it on every set, the load goes up. Compounds **6–10**, isolation **10–15**, lateral
  raises and calves **12–20**.
- **Volume accumulation** is the program's job, across blocks: **sets** climb weeks 1–8, reset at the
  week-9 deload, and peak in week 10.

| Block | Weeks | Primary | Secondary | High-vol isolation | Isolation | Sets/session (A B C D) |
|---|---|---:|---:|---:|---:|---|
| 1 | 1–2 | 3 | 3 | 4 | 3 | 22 · 19 · 22 · 19 |
| 2 | 3–4 | 4 | 3 | 5 | 3 | 25 · 22 · 25 · 21 |
| 3 | 5–6 | 4 | 4 | 5 | 3 | 27 · 24 · 27 · 24 |
| 4 | 7–8 | 5 | 4 | 5 | 3 | 29 · 26 · 29 · 25 |
| 5 | **9 — Deload** | 3 | 3 | 3 | 3 | **21 · 18 · 21 · 18** |
| 6 | **10 — Peak** | 5 | 4 | 6 | 3 | **30 · 27 · 30 · 26** |

Every session sits inside PAS-D11 (5–8 exercises, 18–30 sets), **including both ends** — the Blueprint's
"opening weeks near 18–22, peak weeks approaching 26–28" is met, with the peak at 26–30.

The deload cuts primary sets **from 5 to 3 (40%)**, which is the bottom of PAS-D8's 40–50% band, and
holds all four sessions.

**No RPE.** PAS-D3 permits it at HYPERTROPHY INTERMEDIATE and the Blueprint calls it *"permitted … not
required"* — and `ExercisePrescription` has no `notes` field to carry it, deliberately. Authoring it
would mean inventing a field nothing renders, which is the exact failure the schema warns about and PAS
Amendment 003 was written over.

---

## 5. The Blueprint's per-muscle bands — the finding, and the fix

Blueprint §4 set weekly per-muscle targets and §1 made them the program's identity: *"every major muscle
group is trained inside the 10–20 sets/week band, with no region prioritized over another."*

**Authoring against it exposed two problems in the Blueprint, both now fixed at the Standard.**

**1. It never said what counts as a set for a muscle.** A 5-set bench press is 5 chest sets — and is it
5 triceps sets, or 0? Measured both ways, the readings disagreed on **six of twelve** groups. Counting
direct only, arms landed at 3 against a 10–20 band, unreachable without four isolation exercises per
upper day. Counting indirect at full weight, front delts absorbed every press.

**2. Its "Shoulders 10–16" row is unsatisfiable by construction**, and worse, it *hid* a real defect.
Pressing feeds the front delt whatever the program does; **nothing but direct work feeds the lateral or
the rear.** One combined row read a healthy 26 while the **rear delt sat at 5** — an actually
under-trained muscle, invisible behind a total that looked fine.

It also narrowed PAS §11.2's own **10–20** band to 10–16 and 12–18, with no rationale recorded. The first
draft failed those narrower numbers, not the Standard's.

### What changed

`Program-Authoring-Standard-Amendment-004-Weekly-Volume-Counting.md` (LOCKED) states the convention once,
for all five Blueprints that carry a per-muscle table:

- **PAS-A4-D1** — a set counts **1.0** for the exercise's PRIMARY muscles, **0.5** for each SECONDARY.
- **PAS-A4-D2** — the delts are **three** groups, never one row.
- **PAS-A4-D3** — the band applies to **working blocks**, not the ramp-in or the deload.
- **PAS-A4-D4** — **10–20 governs**; a Blueprint may not narrow it without a stated reason.

### And what changed in the program

Direct rear-delt work was restored to **both** upper days — the first draft had dropped it while
balancing everything else, which is how it reached 5. Isolation doses in weeks 3–4 and week 10 were
raised so the lateral delt and the calf clear the floor at the peak rather than dipping under it.

**All twelve major groups now sit inside 10–20 across weeks 3–10:**

| | wk 1–2 | wk 3–4 | wk 5–6 | wk 7–8 | wk 9 | wk 10 |
|---|---|---|---|---|---|---|
| all 12 major groups inside 10–20 | ramp-in | ✅ | ✅ | ✅ | deload | ✅ |

Weeks 1–2 and week 9 sit **below** the band deliberately — that is Volume Accumulation opening light and
the deload discharging fatigue. PAS-A4-D3 exists so that reads as the model working rather than as a
violation, and the test asserts the ramp is genuinely a ramp rather than letting it pass unexamined.

## 6. Coaching audit — findings

| # | Finding | Resolution |
|---|---|---|
| 1 | **Shoulder volume is high** under the indirect reading (§5). | Accepted and argued. Front-delt volume from pressing is unavoidable in any upper/lower split; the alternative is cutting the lateral work, which is the only source that head has. |
| 2 | **Week 10 jumps primaries from 5 sets to 6** — the largest single-block step in the program. | Deliberate: it is one week, it follows a deload, and it is what makes the peak a peak. First thing to reverse if it proves unrealistic. |
| 3 | **Two barbell hinges in a week** (RDL on B, deadlift not used; hip thrust on D). | The competition deadlift is deliberately ABSENT — this is a hypertrophy program, and its spinal cost buys stimulus better bought elsewhere. RDL and hip thrust carry the hinge. |
| 4 | **Arms get one direct exercise each per week.** | Accepted under the indirect reading (12 sets each, in band). Adding more breaks the exercise ceiling. |
| 5 | **`cable-crunch` and `machine-back-extension` are the only core/erector work.** | Accepted. The Blueprint sets no core-compound minimum for HYPERTROPHY (Family Research Deliverable 6). |
| 6 | No cool-down. | Not a finding as of 2026-08-06 — PAS Amendment 003. Never faked in `main` (PAS-A3-D4). |

---

## 7. PAS compliance

| Requirement | Status |
|---|---|
| PAS-D1 name length ≤ 60 | ✅ 28 |
| PAS-D3 RPE permitted, not required | ✅ none authored — no field to carry it (§4) |
| PAS-D7 one deload for a 10-week program | ✅ week 9, peak week 10 |
| PAS-D8 deload holds frequency, cuts 40–50% | ✅ 4 sessions, primaries 5 → 3 |
| PAS-D9 WARM_UP | ✅ 3 items per session, catalogue-resolvable |
| PAS-D9 COOL_DOWN | ✅ not required — Amendment 003 |
| PAS-D10 warm-up in its own section | ✅ |
| PAS-D11 5–8 exercises / 18–30 sets | ✅ 6–7 / 18–30 |
| PAS §10.3 INTERMEDIATE rest | ✅ 150 / 120 / 75 / 60 s |
| PAS §11.2 per-muscle weekly band | ✅ **12 of 12** inside 10–20, weeks 3–10 — §5 |
| QC-2 visible progression | ✅ §4, both axes |

---

## 8. Lock recommendation

**Recommend: hold**, on one thing.

~~1. **The §5 band finding.**~~ ✅ **RESOLVED 2026-08-06** — the Standard now states the counting
convention (PAS Amendment 004), the delts are three groups rather than one, and the program was
rebalanced to satisfy all twelve major groups inside 10–20. The under-trained rear delt that the
combined "Shoulders" row was hiding has direct work on both upper days.

1. **Nobody has trained it.** Findings 2 and 4 in §6 — the week-10 primary jump and the arm dose — are
   the ones to watch. This is the only remaining reason to hold.

`successorName` is `Muscle Building Advanced` (Sort 7), which is **blueprinted and unbuilt** — so the
successor link resolves to nothing today. Import order is terminal-first (PAS §17.2).

`status` is deliberately not `LOCKED`.
