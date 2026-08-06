# Close Quarters (6-Day) — Design Record

**Status:** AUTHORED — original program. PO Lock Approval outstanding.
**Authored:** 2026-08-06, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/close-quarters-6day.json`
**Family:** Muscle Building · **Theme:** hypertrophy · **Structure:** `ppl` · **Difficulty:** Intermediate
**Catalog position:** **outside the locked 24** — no slot exists for a 6-day intermediate dumbbell program.

---

## 1. Provenance — read this first

The **idea** came from a third-party PDF the athlete brought in: *Dumbbell Only Workout: 6 Day Dumbbell
Workout Split*, published free on muscleandstrength.com, by Josh England. The **program is original.**
Nothing of that document is reproduced here.

What was taken is one structural observation, and it is not anyone's property: **a twelve-week, six-day
push/pull/legs run entirely on dumbbells is a coherent way to train an intermediate lifter who has no
gym.** Split topology and equipment constraints are facts about training, not authorship.

What was deliberately **not** taken: its name, its day titles, its exercise selection and ordering, its
prescriptions, its rest guidance, its written copy, its author's byline, and the three-program series it
is the fourth of.

Same posture as [`scripts/bridger-logan/`](../../../scripts/bridger-logan/README.md), Squat Ascent §1,
Body Recomposition Foundation §1 and Frame by Frame §1.

---

## 2. ⚠ The bench — the finding that mattered, and the decision taken

**This is the first program in the catalog that claims to be trainable at home**, and the app already has
a definition of what that means. `HOME_EQUIPMENT` in `starter-templates/core.ts`:

```
bodyweight · dumbbell · resistance_band · kettlebell · suspension_trainer · medicine_ball
```

Deliberately **narrower** than `equipment.json`'s "Home Gym" environment, which tags the barbell as home
equipment — *true of a home gym and false of a bedroom*, in that file's own words.

**Every exercise in this program passes that gate.** All 40 are tagged `dumbbell`. Checked mechanically,
not by eye, and asserted in `close-quarters.test.mjs`.

### And the gate cannot see the thing that actually blocks a home athlete

**Twelve of these prescriptions need an adjustable bench.** `dumbbell-bench-press` is tagged `dumbbell`,
because the equipment field records *what you load*, not *what you lie on*. So the rule that exists to
stop a program quietly requiring a gym is structurally blind to a bench.

| Day | Needs a bench |
|---|---|
| A — Push, Chest Lead | bench press · decline press · seated shoulder press · chest fly |
| B — Pull, Row Lead | chest-supported row · pullover |
| C — Legs, Squat Lead | hip thrust |
| D — Push, Shoulder Lead | incline press · incline fly · skull crusher |
| E — Pull, Unilateral Lead | incline bench row · pullover · incline rear delt fly |
| **F — Legs, Hinge Lead** | **none** |

The source half-knows this: it slips a **floor press** onto day 1, which is the no-bench answer to a
bench press, while every other pressing movement it prescribes needs one.

**The decision, taken by the product owner on 2026-08-06:** keep the bench and say so. Offered a truly
benchless rewrite, this version, or a per-exercise substitution for each of the twelve, he chose this.

**So the requirement lives in `environment`** — `"Home — dumbbells and an adjustable bench"` — which is
the only place in the app an athlete is told, since the equipment gate will not tell them. **A test
asserts that string still contains the word `bench`**, because if it is ever shortened to "Home" the
program silently starts claiming a spare room is enough.

---

## 3. What it is

Twelve weeks, six days a week, 72 sessions, six blocks. Push / Pull / Legs, twice through.

| | | |
|---|---|---|
| **A — Push, Chest Lead** | `push` | flat · decline · floor press · seated press · lateral · triceps · fly |
| **B — Pull, Row Lead** | `pull` | bent-over row · chest-supported row · pullover · rear delt · two curls · shrug |
| **C — Legs, Squat Lead** | `legs` | goblet · front squat · Bulgarian · hip thrust · calf · lunge · sumo squat |
| **D — Push, Shoulder Lead** | `push` | incline · overhead · Arnold · incline fly · lateral · skull crusher · front raise |
| **E — Pull, Unilateral Lead** | `pull` | one-arm row · incline row · pullover · hammer · reverse curl · rear delt · upright row |
| **F — Legs, Hinge Lead** | `legs` | RDL · sumo deadlift · split squat · glute bridge · single-leg RDL · calf · reverse lunge |

`structure` is **`ppl`** — and this is the **first program in the catalog that can honestly claim it.**
Full Frame omits it (its five days include Upper and Lower); Frame by Frame omits it (body-part split).
Both were right to. This one really is push/pull/legs run twice, and a test holds the day order to it.

**C and F are not the same leg day twice.** C is knee-dominant (goblet, front squat, Bulgarian, lunge);
F is hip-dominant (RDL, sumo deadlift, glute bridge, single-leg RDL). Training the same pattern twice a
week is the point of PPL; training the same *session* twice is just a copy.

---

## 4. Exercise selection

Drawn from the **92 visible dumbbell exercises** in the catalogue. Everything is `equipmentId: 'dumbbell'`
— not merely home-legal. A band or a kettlebell would pass `HOME_EQUIPMENT` and would not be this
program, so a second test asserts the stricter rule.

**No ab work**, following the source's own choice, which it states plainly. The Design Record notes it
rather than quietly diverging: a 6-day split already asks a lot of the week, and core work is the easiest
thing for an athlete to add at a frequency that suits them.

**No cardio.** Same reasoning, and the same as the source.

---

## 5. Progression — and the two deloads the source does not have

The Full Frame lesson applies here as it did to Frame by Frame: **the app renders sets and reps**, so
progression written in prose does not exist. The source is one table for twelve weeks with "choose a
weight that is challenging."

**Twelve weeks owes TWO deloads** under PAS-D7 (11–14 weeks: one at week 4 closing the opening
mesocycle, one at the penultimate week, leaving the final week as peak). The source has none at all —
across twelve weeks at six days, which is the highest weekly frequency in the catalog after Iron & Engine.

| Block | Weeks | Exercises | Sets | Primary | Accessories | Rep volume |
|---|---|---:|---:|---|---|---:|
| 1 | 1–3 | 6 | 19 | 4 × 8 | 3 × 10 | 182 |
| 2 | **4 — Deload** | 6 | 18 | 3 × 6 | 3 × 8 | **138** |
| 3 | 5–7 | 6 | 19 | 4 × 10 | 3 × 12 | 220 |
| 4 | 8–10 | 7 | 29 | 5 × 10 | 4 × 12 | 338 |
| 5 | **11 — Deload** | 6 | 18 | 3 × 8 | 3 × 8 | **144** |
| 6 | **12 — Peak** | 7 | 29 | 5 × 12 | 4 × 15 | **420** |

Both deloads cut **reps and the tail exercise, never the session** (PAS-D8), and both stay inside the
18–30 HYPERTROPHY envelope rather than dropping out the bottom of it.

**Rest is 150 / 120 / 60 s**, per PAS §10.3 INTERMEDIATE. The source prescribes **45–60 s throughout**,
which is below the range for a 5 × 8 dumbbell bench press and is a density cue rather than a hypertrophy
one.

---

## 6. Coaching audit — findings

| # | Finding | Resolution |
|---|---|---|
| 1 | **Six days a week is a large adherence ask**, and this program has no cardio or core to make a light day. | Accepted — it is the source's premise and the reason the volume fits. Managed by session length: 6–7 exercises at 18–29 sets is a 45–70 minute session, not a two-hour one. The two deloads exist partly for this. |
| 2 | **Load progression is limited by the dumbbells the athlete owns.** A home rack of fixed dumbbells jumps in 5 lb steps and stops somewhere. | This is why progression is authored as **reps and sets**, not load — it is the one axis a home athlete always controls. Named here because it is the single biggest difference between training at home and training in a gym, and no document in this repo had said it. |
| 3 | **Day A and day D both press heavily, 3 days apart.** | Accepted — that is PPL twice a week, and A leads with a flat press while D leads with an incline. |
| 4 | **Week 12 raises reps and sets together** at the end of twelve weeks. | Deliberate: it is the peak, it follows a deload, nothing is tested. Same posture and same first-thing-to-reverse as Body Recomposition Foundation and Frame by Frame. |
| 5 | **`dumbbell-pullover` appears on both pull days.** | Accepted. It is the only vertical-pull movement in the entire visible dumbbell catalogue (1 of 92) — there is no lat pulldown without a machine and no pull-up without a bar. Recorded because it looks like an oversight and is not. |
| 6 | **No cool-down.** | Not a finding as of 2026-08-06 — PAS Amendment 003. Never faked in `main` (PAS-A3-D4). |

---

## 7. PAS compliance

| Requirement | Status |
|---|---|
| PAS-D1 name length ≤ 60 | ✅ 22 |
| PAS-D7 two deloads for an 11–14 week program | ✅ weeks 4 and 11, peak week 12 |
| PAS-D8 deload holds frequency | ✅ still 6 sessions |
| PAS-D9 WARM_UP | ✅ 3 items per session, all catalogue-resolvable and all bodyweight |
| PAS-D9 COOL_DOWN | ✅ not required — Amendment 003 |
| PAS-D10 warm-up in its own section | ✅ `warmup[]` |
| PAS-D11 5–8 exercises / 18–30 sets | ✅ 6–7 / 18–29, including both deloads |
| PAS §10.3 INTERMEDIATE rest | ✅ 150 / 120 / 60 s |
| PAS §2.2 `dayOfWeek` always null | ✅ days are A–F |
| QC-2 visible progression | ✅ §5 |

---

## 8. Lock recommendation

**Recommend: hold**, on three things:

1. **The bench (§2).** The decision is recorded and the string is tested, but an athlete browsing the
   Program Catalog sees name, duration and frequency — not `environment`. **A home athlete with no bench
   can adopt this program and discover the problem on day 1.** That is a catalog-surface gap, not a
   program defect, and it is the reason this recommendation is a hold rather than an approve.
2. **Nobody has trained it.** Findings 1 and 2 are the ones to watch.
3. **It is the third program shipped outside the locked 24 in one day.** Iron & Engine, Full Frame, Frame
   by Frame and now this. The locked catalog is still 3 of 24. That is a catalog-shape question worth
   asking before a fourth.

`status` is deliberately not `LOCKED`.
