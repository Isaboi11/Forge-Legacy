# Athletic Conditioning Foundation — Design Record

**Status:** AUTHORED — Stage 2 complete. PO Lock Approval outstanding.
**Authored:** 2026-08-06, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/athletic-conditioning-foundation.json`
**Blueprint (LOCKED):** `Docs/Athletic-Conditioning-Foundation-Blueprint-v1.0.md`
**Catalog slot:** **Sort 12** — the locked 24, Conditioning family, BEGINNER rung

---

## 1. Provenance

**No third-party source.** Authored from its Blueprint, like Bodyweight Foundation before it.

It was chosen over the other two remaining Wave 1 programs for one reason: **it is the only unbuilt
program whose distinction from an already-shipped program can be measured rather than argued.** See §2.

---

## 2. The convergence test, finally answerable

This program's Blueprint set a **four-part convergence test**, and Body Recomposition Foundation (Sort 13)
was written to pass it. The two share **CONDITIONING / BEGINNER / GYM** and differ only on goal
alignment — `IMPROVE_CONDITIONING + GENERAL_FITNESS` against `LOSE_FAT + BUILD_MUSCLE`.

Body Recomp's Blueprint §11 recorded **all four parts PASS** and the pair RESOLVED. But only one of the
two existed, so the verdict rested entirely on a description of a program nobody had written.

**Both now ship, so the test is asserted against the sibling's actual JSON.** If a later edit drifts
either toward the other, the suite goes red — and it goes red in *both directions*, because the
assertions read Body Recomposition Foundation too.

| Part | What is asserted, in code |
|---|---|
| **A — emphasis inversion** | This program **opens** every session on the bout; the sibling **opens on resistance and closes** on its finisher. |
| **C — resistance role** | Here resistance is ≤ 2 standalone lifts, a supporting minority. There it is ≥ 4 — the session's spine. |
| **D — non-derivability** | Four independent axes: **3 days vs 4**, **24 sessions vs 32**, session modality **`conditioning` vs `strength`**, and **circuits here, none there**. |

Part B (fat-loss orientation vs general fitness) is a goal-metadata distinction rather than a structural
one, and is left to the Blueprints rather than asserted — a test that claimed to measure intent from a
set count would be theatre.

**Mutation-checked in both directions**: moving the bout to the end, flattening the circuit, relabelling
sessions `strength`, and adding four standalone lifts each turn the suite red.

---

## 3. What it is

Eight weeks, three days a week, 24 sessions, five blocks. **The family's only 3-day program** — a
deliberate beginner-recovery choice the Blueprint calls out.

Every session runs the same shape, which is the method being taught:

1. **A steady bout** — ride, incline walk, or row. It comes **first**: the conditioning is the point.
2. **A three-move circuit**, repeated for rounds — the day's conditioning stimulus.
3. **Two simple lifts** — the supporting minority, and last.

| | | |
|---|---|---|
| **A — Ride & Circuit** | bike | goblet squat · push-up · seated row → leg press · dead bug |
| **B — Walk & Circuit** | incline walk | walking lunge · chest press · farmer carry → lat pulldown · plank |
| **C — Row & Circuit** | row | step-up · shoulder press · bird dog → leg curl · crunch |

`structure` is **omitted** — the controlled vocabulary is `upper_lower | ppl | full_body` and a
conditioning session is none of them. `split` and `modality` are both `conditioning`, which is honest and
is also one of the four axes §2 measures.

**No barbell anywhere.** PAS §11.3's complex-barbell caution applies in full here — this athlete may have
no strength-training background at all, which is a stronger claim than Body Recomposition Foundation's
"may have limited background". Machines, dumbbells and bodyweight only.

---

## 4. Progression — work capacity, not load

Blueprint §6: **Linear Progression or Volume Accumulation**, explicitly **not** Double Progression, which
arrives at Conditioning Intermediate. That absence is a model-level distinction between the two rungs, so
a rep range anywhere in this program would quietly promote it to its own successor's model. A test
forbids one.

What accumulates is **rounds and minutes**:

| Block | Weeks | Rounds | Bout | Support sets | Planned sets |
|---|---|---:|---:|---:|---:|
| 1 | 1–2 | 3 | 10 min | 2 | 14 |
| 2 | 3–4 | 4 | 12 min | 2 | 17 |
| 3 | 5–6 | 5 | 15 min | 2 | 20 |
| 4 | **7 — Deload** | 3 | 8 min | 1 | **12** |
| 5 | **8 — Peak** | 6 | 18 min | 2 | **23** |

**"Planned sets" is `plannedSetCount`, not a raw sum.** A circuit member carries `sets: 1` and is
performed once per round, so a three-move circuit run five times is **fifteen** working sets. Counting
the raw field would report this program at under half its real size and pass an envelope it fails — the
same trap `plannedSetCount` was written for. Every block sits inside PAS-D11's 12–24.

---

## 5. Coaching audit — findings

| # | Finding | Resolution |
|---|---|---|
| 1 | **Three sessions a week is thin for a conditioning program.** | The Blueprint fixes it, and defends it: this is the family's only 3-day program and a deliberate beginner-recovery choice. The athlete is new to structured conditioning entirely. |
| 2 | **The three sessions share one shape**, differing only in bout and circuit contents. | Deliberate — the shape *is* the method being taught (bout → circuit → simple lifts). A beginner learning work-to-rest structure benefits from repetition of the frame, not variety in it. Worth revisiting at the Intermediate rung. |
| 3 | **Week 8 jumps to 6 rounds from 5**, on top of an 18-minute bout. | It is the peak, it follows a deload, and rounds are the honest axis for a work-capacity program. First thing to reverse if it proves unrealistic. |
| 4 | **Carries (farmer carry) are prescribed in reps**, which is not how a carry is measured. | Accepted with a note: `ExercisePrescription` supports `durationSec`, but a carry inside a circuit reads more naturally as a set piece than a timer, and the model has no distance field for a carry. Recorded rather than fudged. |
| 5 | No cool-down. | Not a finding as of 2026-08-06 — PAS Amendment 003 — though CONDITIONING is the category that most wants one. |

---

## 6. PAS compliance

| Requirement | Status |
|---|---|
| PAS-D1 name length ≤ 60 | ✅ 32 |
| PAS-D3 no RPE at BEGINNER | ✅ none |
| PAS-D7 one deload for an 8-week program | ✅ week 7, peak week 8 |
| PAS-D8 deload cuts work, holds frequency | ✅ 3 sessions throughout |
| PAS-D9 WARM_UP | ✅ 3 items per session, catalogue-resolvable |
| PAS-D9 COOL_DOWN | ✅ not required — Amendment 003 |
| PAS-D11 4–8 exercises / 12–24 sets | ✅ 6 / 12–23, measured with `plannedSetCount` |
| PAS §7.2 permitted model | ✅ Volume Accumulation; Double Progression forbidden by test |
| PAS §11.3 `restSeconds` always populated | ✅ every prescription, asserted |
| PAS §11.3 complex-barbell caution | ✅ no barbell at all |
| QC-2 visible progression | ✅ §4 — rounds and minutes |

---

## 7. Lock recommendation

**Recommend: hold**, on two things:

1. **Finding 2 — the three sessions share one shape.** Defensible for a beginner learning a method, and
   the thing most likely to read as thin to a reviewer. Worth a second opinion before the Conditioning
   family's Foundation rung is locked.
2. **Nobody has trained it.** Finding 3 is the one to watch.

**What this program does close:** the Athletic Conditioning Foundation ↔ Body Recomposition Foundation
pair is now resolved *in code* rather than on paper. That was the largest open governance question in the
Conditioning family, and it is the reason this program was built ahead of its two Wave 1 siblings.

`successorName` is `Conditioning Intermediate` (Sort 14), **blueprinted and unbuilt**.

`status` is deliberately not `LOCKED`.
