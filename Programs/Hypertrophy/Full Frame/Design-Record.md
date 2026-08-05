# Full Frame (5-Day) — Design Record

**Status:** AUTHORED — original program. PO Lock Approval outstanding.
**Authored:** 2026-08-05, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/full-frame-5day.json`
**Family:** Muscle Building · **Theme:** hypertrophy · **Difficulty:** Intermediate

---

## 1. Provenance

The PO supplied a **five-day split as five tables** — Push, Pull, Legs, Upper, Lower — each listing
exercises against sets and rep ranges.

**The first draft of this program was rejected, and correctly.** It reproduced those five tables
verbatim for all six weeks: 35 prescriptions, of which 25 never changed at all, the other 10 gaining a
single set from week 3. The design record defended it as double progression — work the range, add
weight when you top it — which is sound advice and entirely absent from the file. The app renders sets
and reps; the load is whatever the athlete decides. So week 6 rendered identically to week 1, and the
progression existed only in prose nobody reads mid-set.

The PO then asked for it to be coached rather than transcribed. That is this version.

**The five days, their order, and their character are his.** What was authored here is everything the
tables could not say: how six weeks actually progress, which movements must never change and which
should, what needs switching up and why, rest, warm-ups, and the two places where the split as written
asks for more spinal loading than a person can recover from.

---

## 2. What the split actually is, and why that shape is correct

It is a **PPL / Upper-Lower hybrid** — the two are usually presented as rival five-day templates and
this runs both, in one week:

| Day | Session | Split |
|---|---|---|
| 1 | Push | `push` |
| 2 | Pull | `pull` |
| 3 | Legs | `legs` |
| 4 | Upper Body | `upper` |
| 5 | Lower Body | `legs` |

Days 1–3 are a complete PPL rotation. Days 4–5 then hit everything a **second time** in the week at
slightly lower per-muscle volume. That is the point of the shape: **every muscle group is trained
twice**, which is where the hypertrophy literature has settled, without any single session running to
nine or ten exercises.

**The overlap between Day 1/2 and Day 4 is deliberate and has been preserved.** Bench Press, Pull-Ups,
Shoulder Press, Incline Dumbbell Press, Lat Pulldowns and Face Pulls each appear on both an
early-week day and on Day 4. An author "cleaning this up" would swap Day 4 to variations to look less
repetitive. That would be inventing — the repeat exposure IS the second frequency hit, and the athlete
gets a second crack at the same lift in the same week, which is how you actually add weight to a bar.

### On `structure`

Deliberately **omitted**, following `strength-foundation-ii-4day`. The program is genuinely neither
`ppl` nor `upper_lower`, and picking one would make the other three days lie. Each workout carries its
own `split` instead.

Day 5 is therefore `split: 'legs'`, even though the athlete-facing name is **Lower Body**. `lower` is
only correct inside a declared `upper_lower` structure (`schema.ts`, resolver spec §08), and this
program declares none. The *name* is what the athlete reads; `split` is taxonomy.

This was authored as `lower` first and the validator caught it — but only after the validator itself
was fixed. `programs.test.mjs` enumerated its programs from a **hand-kept array of six**, so a seventh
definition was validated by nothing at all and the whole file still reported 31 green: no
dangling-key check, no enum check, no split check. It now reads the directory, the way
`route-guard.test.mjs` reads the filesystem. That fix matters more than this program does.

---

## 3. The spine, and the rotation

The single decision that shapes this program:

> **A movement you want to add weight to must never change. A movement you want to grow a muscle with
> should.**

You cannot progress a lift you keep swapping — six weeks of a moving target gives you six weeks of
first attempts. But six weeks of an *unchanging* lateral raise is a muscle that stopped adapting in
week three and a shoulder that has done the same 540 reps through the same arc.

So the program is split in two.

**THE SPINE — identical in week 6 and week 1.** Bench Press · Squat · Deadlift · Sumo Deadlift ·
Pull-Ups · Overhead Press · Barbell Row · Romanian Deadlift · Hip Thrust · Incline Dumbbell Press ·
Dips. These carry the load progression. Their reps come down and their weight goes up, and nothing
else about them moves.

**THE ROTATION — seven accessories change at week 5**, when the spine is at its heaviest and the
isolation work has given what a single angle can give:

| Day | Weeks 1–4 | Weeks 5–6 | Why |
|---|---|---|---|
| Push | Dumbbell Lateral Raise | **Cable** Lateral Raise | Constant tension through the bottom, where dumbbells are nearly unloaded |
| Push | Cable Cross-Body Extension | **Overhead** Triceps Extension | Long head under stretch — the head the cross-body version under-trains |
| Push | High-to-Low Cable Fly | **Pec Deck Fly** | Fixed path; lets you chase failure safely once the bench has taken 5 heavy sets |
| Pull | Lat Pulldown | **Close-Grip** Lat Pulldown | More elbow flexion, more lat stretch, different scapular path |
| Pull | Dumbbell Hammer Curl | **Cable Rope** Hammer Curl | Tension at the top, which the dumbbell loses |
| Legs | Dumbbell Walking Lunge | **Bulgarian Split Squat** | Same unilateral job, stationary — loadable to failure without a 40-yard walk while the squat is at 5 × 6 |
| Upper | Cable Seated Row | **Chest-Supported Row Machine** | Removes the lower back from the fifth training day of the week. Deliberate |

Everything else stays. Face Pulls never move, in any block, on either day they appear — they are
shoulder insurance, not a growth driver, and rotating them would be change for its own sake.

---

## 4. The six weeks

**The PO's original prescriptions are Block 2.** His week sits in the middle of the program, with a
ramp in and a peak out. That is why Block 2 looks familiar and the others do not.

| Block | Weeks | Primaries | Isolation | The job |
|---|---|---|---|---|
| **Groove** | 1–2 | 10–12 | 12–15 | Lighter and higher. Find working weights, groove the pattern, build the tissue tolerance for what is coming. Nobody's first heavy squat should be in week 1 of a five-day program |
| **Build** | 3–4 | 8–10 | 10–12 | The PO's tables, exactly. Volume peaks — the bench and the squat both add a fifth set here |
| **Press** | 5–6 | 6–8 | 12–15 | Primaries at their heaviest and lowest reps. Isolation goes back UP in reps and swaps to new angles: heavy compounds and heavy isolation in the same week is how elbows and shoulders go |

Sets per week: **112 → 117 → 120.** Nearly flat on purpose. Intensity carries Block 3, not volume —
adding both at once is the most common way an intermediate programme buries someone in week five.

Rest: 120s on primaries, opening to **150s in Block 3** because a set of six at a genuine load needs
it. Secondary work 90s. **Isolation stays at 60s in every block** — a lateral raise does not need
three minutes, and an athlete who takes it is adding twenty minutes to the session and buying nothing.

**No deload.** Six weeks is short enough to run through, the intensity curve is managed rather than
stacked, and a deload inside a six-week block mostly costs a training week. Run it again heavier
instead — the description says so.

---

## 5. Two things the split as written asks for, that it should not

These are the only places a prescribed movement was changed. Both are on Day 5, both are about the
same thing, and a coach who did not raise them would be transcribing rather than coaching.

### 5.1 Four heavy spinal sessions in five days

The tables as supplied load the spine on **four of the five days**:

| Day | Movement | Sets |
|---|---|---|
| 2 | Deadlift | 4 |
| 3 | Back Squat | 4 |
| 5 | Back Squat *(again)* | 4 |
| 5 | Sumo Deadlift | 4 |

Sixteen heavy axial sets across five consecutive days, with Day 5 asking for a heavy squat and a heavy
sumo pull **in the same session** — and Day 5 lands two days after Day 3's squat and three days after
Day 2's deadlift. Legs and lower back never get a full recovery window in the entire week.

This is not a theoretical objection. It is the most reliable way to make an otherwise good five-day
split unrunnable by week four, and it fails in the lower back rather than the legs, which is the part
that takes the longest to come back.

**Day 5's Back Squat becomes the Hack Squat Machine.** The quad work is kept — arguably increased,
since a hack squat holds the quads under tension through a longer range without a bar on your spine —
and the axial load is removed. The back squat still appears once a week, on Day 3, where it is the
heaviest thing in the program.

### 5.2 Four hinge exposures, one of them redundant

Deadlift (Day 2), Romanian Deadlift (Day 3), Sumo Deadlift (Day 5) and Romanian Deadlift *again*
(Day 5). The fourth buys nothing the first three have not already bought, and it lands after the sumo
in the same session, on the most fatigued day of the week.

**Day 5's Romanian Deadlift becomes the Seated Leg Curl.** The hamstring still gets trained — at the
knee rather than the hip, which is the function the three hinges *miss* — with zero spinal cost. The
day already carries the Hip Thrust for glutes, so nothing is left uncovered.

### What was NOT changed, though it was tempting

- **The Day 1 / Day 4 overlap stays.** Bench, Pull-Ups, Shoulder Press, Incline and Pulldowns appear
  on both. That is the second frequency hit and it is the best thing about this split. What changed is
  the *character*: **Day 1 is the heavy press day (5 × 6–8 by Block 3), Day 4 is the volume day
  (4 × 10–12)**, and Day 4's shoulder press is a seated dumbbell press against Day 1's barbell. Two
  hard exposures, not the same session twice.
- **Lunges kept at 4 sets in Block 2**, where the PO put them, despite sitting beside a 5-set squat.
- **No arm day, no extra ab work, no cardio, no AMRAP finishers.** Not in the tables, not added.

---

## 6. Exercise mapping — every row, and the four that needed a decision

Every prescription maps to a real id in the 797-exercise catalog. The validator
(`programs.test.mjs`) fails the build on a dangling key, so this is enforced rather than asserted.

**"Katana Extension" → `cable-cross-body-triceps-extension`.**
The only row that named an exercise the catalog does not carry under that name. "Katana extension" is
gym vernacular for the single-arm cable triceps extension drawn across the body — the motion of
drawing a sword. The catalog's `Cable Cross-Body Triceps Extension` is that movement. The
prescription (3 × 10–12, cable, triceps) matches on every axis.

⚠ **This one is worth the PO confirming**, because it is the single place where a name was
interpreted rather than looked up. If it meant an overhead variant instead, the fix is one key:
`cable-overhead-triceps-extension`.

The other three needed a variant chosen where the table named a family:

| Table says | Mapped to | Why |
|---|---|---|
| Tricep Dips | `parallel-bar-dip` | The loadable version. `bench-dip` cannot progress past bodyweight, and this is prescribed 3 × 8–10 beside a bench press |
| Cable Flyes | `high-to-low-cable-fly` | The default cable fly; hits the sternal fibres the bench and incline press on the same day do not |
| Bicep Curls (Barbell or DB) | `barbell-biceps-curl` | The table offers both; the barbell is the heavier of the two and it sits before Hammer Curls, which is already the dumbbell exposure |
| Calf Raises (Standing/Seated) | `standing-calf-raise-machine` | Standing biases gastrocnemius; seated biases soleus. Standing is the default, and Day 3 and Day 5 both run it, giving four calf sessions a fortnight |

Planks carry `unit: 'seconds'`, `reps: 30`, `repsMax: 60` — the table's `30–60s`, held as a duration
rather than converted into a rep count.

---

## 7. The name

**Full Frame.**

The program trains the whole body twice a week and specialises in nothing — that is its argument, and
the name had to say it without saying "Full Body", which this is not (there is no full-body session in
it). *Frame* is already the vocabulary this product uses for a physique, and it carries the building
sense the family needs.

`(5-Day)` follows `Strength Foundation I (3-Day)` — the catalog labels frequency in the name where
frequency is the thing that decides whether an athlete can run it.

Checked against the existing catalog for collision and for tone: it sits beside *Strength Foundation*,
*Iron & Engine*, *Squat Ascent*, *Bench Approach* and *Deadlift Measure* without reading like any of
them, and without reading like a generic template name ("5-Day PPL Split"), which is the failure mode
the Catalog Governance Review names as the catalog's biggest risk.

---

## 8. What this program deliberately does NOT do

- **No cardio.** The tables have none. A conditioning day would be a different program.
- **No arms day**, no direct forearm, trap or ab work beyond the planks and crunches the tables
  already carry.
- **No autoregulation, RPE, or AMRAP finisher.** The prescriptions are fixed ranges, which is the
  brief.
- **No successor.** It is not a rung on a ladder; `successorName` is absent. Run it again heavier.
- **Not LOCKED.** Phases of the Production Standard are complete and written down here, but Lock
  Approval is the product owner's signature and claiming it in a file would be forging one.
