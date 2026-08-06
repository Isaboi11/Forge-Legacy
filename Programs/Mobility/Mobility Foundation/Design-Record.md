# Mobility Foundation — Design Record

**Status:** AUTHORED — Stage 2 complete. PO Lock Approval outstanding.
**Authored:** 2026-08-06, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/mobility-foundation.json`
**Acceptance test:** `src/domain/training/programs/__tests__/mobility-foundation.test.mjs` (14 rules)
**Blueprint (LOCKED):** `Docs/Mobility-Foundation-Blueprint-v1.0.md`
**Catalog slot:** **Sort 23** — the locked 24, Mobility family, BEGINNER rung. **Opens the sixth and
final family.**
**Featured:** FALSE (PCA §5.3 — the two featured are Strength Foundation I and Bodyweight Foundation)

---

## 1. Provenance

**No third-party source.** Authored from its own Blueprint, like Bodyweight Foundation before it. There
was nothing worth taking: a beginner mobility routine is among the most-written things in fitness, and
what makes this one worth shipping is not its selection of stretches but that it is **the first program
in the catalog whose work is measured in seconds rather than reps**, wired into a logger that can now
say which side it means.

---

## 2. ⚠ The field that had to be fixed before a single session could be authored

This program is **76 per-side prescriptions out of 140**. Almost every stretch in it is held on one side
and then the other.

`ExercisePrescription.per` — the field that says so — was **authored on 142 prescriptions across all
thirteen existing programs and read by nothing**. Not `adopt-core`, not `schemeText`, not any screen.
Every Bulgarian split squat in the catalog reached the athlete as "3 × 10" when the author wrote 3 × 10
*per leg*.

It is the third write-only field found in this model, after `repsMax` and the rep ranges before it, and
it is the worst of the three: a dropped range shows *less* than was asked for, while a dropped side
shows a **different, complete-looking prescription**. There is no reading of "3 × 10" that recovers the
other leg.

Fixed first (`per-side.test.mjs`, 9 rules, mutation-tested), then this program was written. Had it been
authored a day earlier it would have shipped twenty sessions of stretches held on one side, and every
structural test would have passed it.

**The invariant that did not move:** `reps` stays per side — the number the athlete logs. Doubling it is
the obvious-looking fix and would have written twenty into the reps column for a set of ten-a-side,
corrupting volume, the e1RM behind PR detection, and every history row.

---

## 3. What it is

Four weeks · five sessions a week · **20 sessions** · 140 prescriptions · 29 distinct exercises.

| | |
|---|---|
| Environment | Home — a floor, a wall and a doorway |
| Goal | IMPROVE_MOBILITY (single) |
| Progression model | **Time-Based (Model 5)** — hold duration |
| Deload | None (PAS-D7, 4 weeks < 7) |
| Successor | Mobility Intermediate (Sort 24, unbuilt) |
| Session length | **8.0 → 12.7 minutes** (see §7) |

**The week rotates five regions**, so nothing is worked every day to the exclusion of the rest:

| Day | Session | Split | Shape |
|---|---|---|---|
| A | Breath & Spine | core | breathwork · 3 drills · 3 holds |
| B | Open Hips | legs | breathwork · 2 drills · 4 holds |
| C | Shoulders & Upper Back | upper | breathwork · 3 drills · 3 holds |
| D | Ground Up | legs | 3 drills · 4 holds |
| E | Full Body Flow | full_body | 4 drills · 3 holds |

Days D and E open on global movement (Inchworm, Cat-Cow) rather than breathwork, which §3 of the
Blueprint allows explicitly — *"global mobility **or** breathwork"*.

---

## 4. The family's structural signature: MAIN-only

MOBILITY is the catalog's one **MAIN-only** family (PAS-D9). All twenty sessions carry `warmup: []`.

This is the one place in the repo where an empty warm-up is a specification rather than a defect —
everywhere else it is the 2026-08-06 sweep having stripped a session that had nothing showable in it.
The acceptance test asserts the emptiness **on purpose**, so a future pass that "restores" the warm-ups
this family is defined by not having fails loudly.

There is a second reason it matters here and nowhere else: a mobility session **is** a warm-up, in the
sense that every other program's warm-up is drawn from this same toolkit. Giving it one would be asking
the athlete to warm up for their warm-up.

---

## 5. Progression — duration, and nothing else

| Week | Breathwork | Every hold |
|---|---:|---:|
| 1 | 60s | **20s** |
| 2 | 75s | **30s** |
| 3 | 90s | **40s** |
| 4 | 120s | **50s** |

The dynamic drills keep their sets and reps for all four weeks. **That is deliberate and it is the most
load-bearing decision in the program.**

Blueprint §4 makes the level distinction two-dimensional: (a) longer holds, used here; (b) *more
challenging variations in intermediate programs*, **withheld here**. §9 then rests the entire Mobility
Foundation ↔ Mobility Intermediate distinction on (b) — the pair is the leanest-differentiated in the
catalog, identical on goal, environment, frequency, athlete type, progression model and deload, and
separated only by level, duration and authored content depth.

So a well-meaning edit that swapped a couch stretch or a Cossack squat into week 4 would read as good
coaching and would **spend the successor's only means of being a different program**. Two tests hold
that line: *the exercise selection is identical in every week* and *the dynamic drills never progress*.

Progressing volume as well would also have made this a volume program wearing a mobility program's name,
which is not what Model 5 is.

---

## 6. Movement selection — and the four things it will not assume

Every exercise is drawn from the catalogue's **`Mobility` movement pattern** (51 visible rows) and from
nowhere else, and every one is `equipmentId: 'bodyweight'`.

**Four groups of that pattern were excluded by hand**, because the equipment gate cannot see them:

| Excluded | Rows | Why |
|---|---:|---|
| Foam roller | 7 | A tool. The PO ruled out recommending equipment (Bodyweight Foundation, 2026-08-06) |
| Lacrosse ball | 2 | Same |
| Bench | 2 | `lat-stretch-on-bench`, `thoracic-extension-on-bench` |
| Bar / kettlebell / band | 5 | Dead hangs need a bar; the windmill needs a bell |

**All of them are tagged `equipmentId: 'bodyweight'`,** because that field records what you *load*, not
what you need to own — the identical hole Close Quarters' twelve bench exercises fell through. It is
closed here by a name check in the acceptance test, not by a gate.

**Three positions were held back for Mobility Intermediate**, on the §4 boundary: the **couch stretch**,
the **sleeper stretch** (an aggressive shoulder internal-rotation position, routinely mis-taught), and
the **Cossack mobility drill**. Each is a legitimate mobility exercise and none of them belongs in a
program for someone who has never done this.

**Child's Pose appears in two of the five sessions** (A and C). Not an oversight: it is a spinal
decompression on the spine day and a lat stretch on the shoulder day, and a beginner benefits from
repeating a position they are still learning. The test caps any exercise at 2 of 5 sessions.

---

## 7. ⚠ Standard conflict: week 1 is under the session-length floor, and stays there

§10.2 asks for **10–30 minute sessions**. Measured — holds at their own clock, drill reps at a slow 4
seconds, transitions counted:

| | A | B | C | D | E |
|---|---:|---:|---:|---:|---:|
| Week 1 | 8.8 | **8.0** | 9.2 | 9.1 | 9.6 |
| Week 4 | 11.8 | 12.5 | 12.7 | 12.6 | 12.6 |

**Week 1 lands 0.4–2.0 minutes under the floor. It is left there.**

Reaching 10 would mean either lengthening week 1's holds past what a beginner should be asked to hold —
spending the bottom of the progression ramp to satisfy a table — or adding drills that would then have
to stay frozen for four weeks. That is bending the training to hit a number, which is precisely what the
2026-08-06 coaching audit found in Muscle Building Intermediate's twelve sets of lateral raises.

The Blueprint's own §6 says the 5-day cadence is *"practice consistency, not training stress"*. A
nine-minute first week that grows to thirteen is how a five-day habit survives.

**The ceiling is asserted exactly**, because the ceiling is the half that protects the athlete.

This is the **fourth** conflict of this shape found in the Standards, after PAS-D8 vs PAS-D11, the
band-vs-coaching-cap, and the cool-down (Amendment 003). The pattern is consistent and now hard to
dismiss: **the Standards encode volume, frequency and duration, and nothing in them encodes whether the
session is any good.**

---

## 8. PAS compliance

| Rule | Status |
|---|---|
| §11.8 static holds in seconds, drills in sets × reps | ✅ 80 timed, 60 in reps |
| §11.8 static never precedes dynamic | ✅ asserted per session |
| §11.8 deepest holds never front-loaded | ✅ 20s in week 1, 50s in week 4 |
| PAS-D9 MOBILITY is MAIN-only | ✅ 20 of 20 |
| PAS-D11 / §10.1 5–10 items in MAIN | ✅ 7 in every session |
| §10.2 10–30 minute sessions | ⚠ **ceiling met, floor missed in week 1** — §7 |
| PAS-D7 no deload under 7 weeks | ✅ none |
| PAS-D3 no RPE at BEGINNER | ✅ none |
| PAS-D1 name ≤ 60 characters | ✅ 19 |
| Model 5 duration is the progressed variable | ✅ and the only one |

---

## 9. Coaching audit — read as a coach, not as an engineer

Three findings, none of them structural. The 2026-08-06 audit's lesson was that every number can be
legal while the training is wrong, so these were looked for by reading the sessions rather than by
running the tests.

1. **Neck CARs at 2 × 5 per side in week 1.** Controlled articular rotations of the neck are the one
   drill here where a beginner moving badly can make themselves dizzy or worse. Kept, at the lowest
   dosage in the program, and it is the drill most in need of coaching content on its detail screen.
2. **No true thoracic extension anywhere.** Both catalogue rows for it need a bench or a foam roller
   (§6), so the T-spine is served by Cat-Cow, Thread the Needle and Wall Angel — flexion, rotation and
   overhead position, but not extension. **This is a genuine gap in the program and it is a gap in the
   catalogue**, not a selection error: there is no equipment-free thoracic extension row to pick.
3. **Nothing addresses the wrists except day E.** One Wrist CAR set, once a week. For an athlete whose
   primary training is barbell work — the majority of this catalog — that is thin. Left as is rather
   than padded, and noted as the first thing Mobility Intermediate should widen.

**Withdrawn on a second read:** an earlier note said the hips are over-served (day B plus figure-fours
on day E). They are, and that is correct — the hip is the joint that most limits the squat, the hinge
and the lunge, which is what the athletes running this program are doing on their other days.

---

## 10. What this hands forward to Mobility Intermediate

The Blueprint's §9 three-part falsifiable test, now with a concrete baseline to be measured against:

| # | Test | The baseline it must clear |
|---|---|---|
| 1 | More challenging variations | 29 foundational rows; **couch stretch, sleeper stretch and Cossack drill deliberately unspent** |
| 2 | Longer / deeper holds | 20 → 50 seconds; a beginner set of positions |
| 3 | Non-derivability | 5 sessions × 7 items, MAIN-only, duration-only progression |

**If Mobility Intermediate is these sessions at 60 seconds for six weeks, it fails.** The three held-back
positions are the start of what it should be built from, not the whole of it.

---

## 11. ⚠ Over half of it has no demonstration to show

Measured 2026-08-06 by **one bucket listing** of `exercise-media` (`POST /storage/v1/object/list`,
paginated) — not by per-id `HEAD` requests, which reported six false negatives the last time somebody
did it that way.

| | |
|---|---:|
| Bucket holds | 417 male · 297 female loops |
| Of this program's **29** exercises | |
| Both sexes | **9** |
| Male only | 3 |
| Female only | 2 |
| **No clip at all** | **15** |

The fifteen: 90/90 Hip Stretch · 90/90 Hip Switch · Ankle CAR · Breathing Drill 90/90 · Child's Pose ·
Crocodile Breathing · Cross-Body Shoulder Stretch · Figure-Four Stretch · Half-Kneeling Hip Flexor
Stretch · Knee-to-Wall Ankle Mobilization · Neck CAR · Standing Quad Stretch · Supine Diaphragmatic
Breathing · World's Greatest Stretch · Wrist CAR.

**This matters more here than in any other program.** A missing clip for a barbell row is a
disappointment; a missing clip for a Half-Kneeling Hip Flexor Stretch is a beginner who does not know
what position to get into, and the logger's fallback is an engraved dumbbell icon — for a stretch.
Every one of the fifteen is a position, not a lift, so the picture *is* the instruction. The three CARs
are the worst of them: a controlled articular rotation performed from a text label alone is very likely
to be performed wrong.

**They were deliberately NOT appended to `scripts/animation-processing/pending-clips.json`.** That queue
takes a source path per sex, `process_pending.py` **silently skips any entry whose srcs are null**, and
the PO's source drive was not connected when this was measured. Fifteen null-src rows would look like
work queued and would be work skipped without a word — which is the failure this note exists to avoid.
They need `match_catalog.py` run against the connected drive first.

---

## 12. Lock recommendation

**Recommend HOLD**, and this is a change from what §7 alone would have concluded.

The program itself is sound and its two deviations are argued rather than hidden. What holds the lock is
**§11**: fifteen of twenty-nine positions have no demonstration, and this is the one program in the
catalog where the demonstration is not a nicety. Locking it would be signing off a beginner mobility
practice that shows a beginner an icon of a dumbbell where a hip stretch should be.

Two things to settle before signing, both the PO's:

1. **The clips** (§11) — connect the drive, run `match_catalog.py`, queue the fifteen properly.
2. **Week-1 session length** (§7) — a deliberate deviation from a locked Standard on a coaching
   judgement, which is exactly the kind of call a signature is for.

Nobody has trained it.

---

*Forge Legacy — Mobility Foundation Design Record — 2026-08-06*
