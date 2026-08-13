# Forge Legacy — Endurance Programming Standard

## v1.0 | August 2026

**Status:** 🔒 **LOCKED 2026-08-09.** All thirteen decisions taken (§1), both build findings confirmed
(§6.1, §6.2), and every number encoded in `src/domain/coach/rulebook/endurance.ts` with a test behind it.
**Changes from here are AMENDMENTS, not edits.** See §6 for what the build itself turned up.
**Purpose:** the rulebook Coach Holt needs to build endurance programs — 5k, 10k, half marathon,
marathon, and triathlon. Holt used to **refuse** every one of these goals, in terms, because this
document did not exist. He now builds all five.

**Authority chain:**
- `Program-Authoring-Standard-v1.0.md` §7.1–7.2 (Block Periodization for RUNNING), §10.1 / **PAS-D11**
  (RUNNING = "1–3 duration-based"), §11.4 (RUNNING authoring rules), **PAS-D7/D8** (deload cadence)
- `Running-Family-Research-v1.0.md` (DRAFT) — the family philosophy this extends
- `Program-Catalog-Architecture-v1.0.md` §3.1 (category RUNNING)
- `FORGE_LEGACY_PRODUCT_DNA.md` (voice, and the anti-shame principles)
- **`project_third_party_program_provenance`** — methodology is taken and authored; **a named published
  plan is never transcribed.** Every table below is a principle plus a Forge number, not someone's plan.

**Scope:** the tables Holt reads — skeletons, session types, volume rules, progression, taper, refusal
thresholds — for five endurance goals. **Not in scope:** the locked program catalog (see §0.2), the
tracking subsystem, the AI layer.

---

## §0 — Read this before the tables

### §0.1 What the app can and cannot express

The engine is bounded by the data model. These are facts, verified in code, not preferences:

| | |
|---|---|
| **Activities available** | `run · walk · bike · row · elliptical · swim · stair` (`conditioning.ts`) |
| **Can be done outdoors** | run, walk, bike **only**. Row, elliptical, swim, stair are indoor-typed. |
| **Carries a rate** | **pace** (min/mi) for run and walk · **speed** (mph) for bike · **none** for row, elliptical, swim, stair |
| **Carries a distance** | everything except stair |
| **Carries floors** | stair **only** — and as of 0151 they are LOGGED, not just named here. See the note below. |
| **The athlete's program can hold** | `targetMi`, `targetSec`, `targetPaceSec`, `targetSpdMph`, `modality` — so **"run 6 mi @ 8:30" is fully expressible** |
| **Forge's own catalogue cannot** | `ExercisePrescription` has `targetMi`/`targetSec` but **no pace or speed fields** |
| **GPS live tracking** | run, walk, bike — **foreground only** |

> **📌 CORRECTION 2026-08-12 — the stair row changed, and this table is why it is allowed to.** §0.1 states
> that these are *"facts, verified in code"*, so when the code moves the fact moves with it; this is not a
> decision being reopened. Migration `0151` gives `workout_sets` a `floors` column and the log form a Floors
> field, so *"stair counts floors"* is now something the app does rather than something this document
> observed about a gap. **Nothing in §1–§6 depends on it**: Holt has never prescribed a stair bout by
> anything but the clock (`prescribe.ts` refuses to ask a stair climber for miles), and floors are logged,
> not targeted — the athlete's program still cannot hold a floor target, which is why the row above stops
> at "logged". Making floors prescribable WOULD be an amendment; **EPS-D12** is the natural home for it if
> the PO wants it. **Also corrected in the same pass, and it was a real defect rather than a gap:** the log
> form seeded its distance field for every activity alike, so a stair bout silently recorded one mile it
> never travelled — into the column distance goals, honors and challenge leaderboards all read.

**Three consequences that shape the whole standard:**

1. **A swim is prescribed as distance or duration, never as a pace.** A swimmer's honest metric is a
   per-100 split and the app computes none. An Ironman plan says *"swim 2,000 m"* or *"swim 45 min"*.
   The same is true of the rower. **EPS-D12** asks whether to change that.
2. **Holt can prescribe run training Forge's own catalogue cannot.** He writes the athlete's shape, which
   carries pace. This is a lucky asymmetry, not a loophole — but it means these plans will look more
   specific than any built-in program, and that difference should be intentional.
3. **An Ironman swim is logged, not tracked.** No GPS, and open water is not a modality the app knows.

### §0.2 ⚠ A governance flag the PO should see before anything else

`Running-Family-Research-v1.0.md` Finding B is explicit: the locked catalog's running journey **ends at
intermediate aerobic base.** There is no advanced rung and **no race-preparation program anywhere in the
locked catalog** — 5k, 10k, half and marathon are *not* in it, and "Running Advanced" is roadmap-only.

So this standard lets Holt build an athlete journey **the catalog deliberately does not have.**

That is defensible — coach-built programs are `ATHLETE_CREATED` (PC-D2), not catalog entries, and the
catalog roster governance (PEA §2.1, the 2–5 program family cap) does not apply to them. But it should be
a decision, not a side effect. **EPS-D13.**

### §0.3 The line on sources

Endurance methodology is public and largely settled in outline: easy-hard distribution, block
periodization, taper, the long run as an anchor. **The disagreement is in the numbers**, which is why
this document is mostly decisions rather than findings. Everything below cites a *principle* and then
proposes a *Forge number*. No named published plan is reproduced, and none should be — the recurring
temptation here is to "adapt" a well-known 16-week schedule, and that is the thing
`project_third_party_program_provenance` exists to forbid.

---

## §1 — The decision sheet — ✅ ALL THIRTEEN TAKEN 2026-08-09

**The PO approved every recommendation as written.** The table below is kept in full rather than
collapsed into a list of answers, because the *reasoning* is the part that matters when one of these is
revisited — a number without its argument is just a magic constant, and this file is the only place the
argument lives. Each row is now a decision; the "recommendation" column is what was adopted.

**Where each one is encoded:** `src/domain/coach/rulebook/endurance.ts`, one exported constant per
decision, each carrying its EPS id in the doc comment. Change a number there and it must change here in
the same pass, or the two stop meaning the same thing.

| ID | The call | Options | My recommendation | Why |
|---|---|---|---|---|
| **EPS-D1** | **Intensity distribution** | (a) 80/20 easy/hard · (b) 90/10 for beginners, 80/20 above · (c) coach-judged | **(b)** | 80/20 is the best-evidenced number in endurance training and holds across running, cycling and rowing. But a beginner's "hard" is unreliable and their tissue tolerance is lowest, so their first block should be nearly all easy. |
| **EPS-D2** | **Long run as a share of weekly volume** | (a) 20–30% · (b) 25–30% with a time cap · (c) 30–35% | **(b)** | The most commonly recommended band, and the time cap is what actually protects the slow runner — 30% of a beginner's week can still be a 3-hour effort. Sources range from 20% to 50%; the low-to-middle end is the safe error. |
| **EPS-D3** | **Weekly volume increase cap** | (a) keep PAS's 10%/week · (b) 10%/week **plus** a single-session spike cap · (c) replace with the spike cap alone | **(b)** | ⚠ **The 10% rule is locked in PAS §11.4 but is not well supported** — trials find similar injury rates at 10% and 50% weekly increases. What *does* predict injury is a sudden jump in one long run. Keep the locked rule (conservative, and changing it is an amendment), and add the guard that the evidence actually supports. See EPS-D3b. |
| **EPS-D3b** | **The spike cap number** | (a) long run ≤ 110% of the longest run in the past 30 days · (b) ≤ 120% | **(a)** | The published figure; a 30%+ jump is where risk climbs sharply. Holt knows the athlete's logged history, so he can enforce this for real rather than assume it. |
| **EPS-D4** | **Quality (hard) sessions per week** | (a) 1 beginner / 2 intermediate / 3 advanced · (b) 2 for everyone · (c) scale with days available | **(a)** | Falls out of EPS-D1 arithmetic and matches the locked "≥1 easy or rest day between intensity sessions" rule (PAS §11.4). Three is only reachable at 6 days/week. |
| **EPS-D5** | **Taper length** | (a) 2 weeks all distances · (b) 2 wk for 5k/10k/half, 3 wk for marathon/Ironman · (c) 3 weeks | **(b)** | The meta-analytic answer is ≤21 days with volume cut 41–60% and **intensity retained**; longer accumulated fatigue justifies the longer window for the long races. Beyond 3 weeks aerobic fitness starts to erode. |
| **EPS-D6** | **Taper volume cut** | (a) 40% · (b) 50% · (c) 60% | **(b)** | Mid-band of the evidenced 41–60%. **Non-negotiable regardless of choice: intensity and frequency are maintained.** Cutting intensity erases the taper's benefit entirely. |
| **EPS-D7** | **Minimum days/week for a beginner runner** | (a) 3 · (b) 4 | **(a)** | The locked catalog's Running Base I is 4 days, but that program assumes a *runner*. Holt must serve someone who has never run, and 3 days with rest between is the standard entry. **This is a deliberate departure from the locked family and should be a conscious one.** |
| **EPS-D8** | **Beginners who cannot yet run continuously** | (a) run/walk intervals · (b) refuse until they can run 20 min · (c) walk-only block first | **(a)** | Run/walk is the established path from nothing to a 5k in 8–12 weeks, and it is expressible today (`run` and `walk` are both activities). Refusing a complete beginner would be the coach failing the person most in need of it. |
| **EPS-D9** | **Marathon longest run** | (a) cap at distance (e.g. 20 mi) · (b) cap at **time** (2:30–3:00) · (c) both, whichever comes first | **(c)** | A distance cap punishes the slow runner with a 4-hour effort; a time cap alone lets a fast runner exceed useful distance. Both, whichever binds first, is the honest rule. |
| **EPS-D10** | **Prescribed pace** | (a) describe effort in `notes` only (PAS §11.4 as written) · (b) encode real paces when the athlete gives a recent race time or time trial, describe effort otherwise | **(b)** | ⚠ **This departs from a locked rule.** PAS §11.4 says pace lives in `notes` because "absolute pace doesn't account for individual fitness" — correct when you know nothing about the runner. Holt can *ask*, and paces derived from a recent all-out effort are the single most useful thing a coach gives a runner. Recommend: encode only when derived from a real result within 6 weeks; describe effort otherwise, never invent. |
| **EPS-D11** | **Triathlon discipline balance** | (a) 30/50/20 swim/bike/run by time · (b) weighted by race-day time share · (c) weighted toward the athlete's weakest | **(a) as the default, (c) as an override** | The commonly used balance, and it already leans toward the bike, which is both the biggest race-day time share and the lowest-impact place to add volume. Weakness-weighting is what a real coach does, but it needs an input Holt does not have yet. |
| **EPS-D12** | **Swim and row pace** | (a) accept distance/duration only · (b) extend `RATE_KIND` for per-100 swim and 500 m row splits | **(a) for now** | (b) is small and contained but touches a shared model, and it only matters for the longest triathlon builds. Ship (a); revisit if triathlon gets real use. |
| **EPS-D13** | **The §0.2 governance question** | (a) coach-built race prep is `ATHLETE_CREATED` and outside catalog governance · (b) the catalog must gain a race-prep rung first | **(a)** | The distinction already exists in PC-D2 and is exactly what it is for. But **Running Base II's terminal flag must still never be cited as evidence the running journey is covered** — that finding stands. |

---

## §2 — What is settled, and can be encoded once §1 is answered

These are not decisions. They are either locked in Forge already or uncontested in the sources.

### §2.1 The block model
**Base → Build → Peak → Taper.** Locked for RUNNING as Block Periodization (PAS §7.1–7.2): "structured
mileage or duration increases with alternating easy and intensity weeks."

- **Base** — volume climbs, almost all easy, one quality session at most. Habit and tissue adaptation.
- **Build** — volume continues, quality sessions gain specificity (tempo → threshold → race pace).
- **Peak** — highest volume and the longest long run; the sharpest week of the plan.
- **Taper** — volume cut per EPS-D5/D6, **intensity and frequency retained**.

### §2.2 The session types

| Type | What it is | Prescribed as | Rate |
|---|---|---|---|
| **Easy / recovery** | Conversational. The volume backbone, and active recovery — not filler. | duration | pace, if known |
| **Long run** | The weekly endurance anchor. | distance (+ time cap) | pace, if known |
| **Tempo / threshold** | "Comfortably hard", sustainable 20–40 min. Continuous or cruise intervals. | distance or duration | pace, if known |
| **Intervals** | 3–5 min repeats at VO₂max effort, equal or near-equal recovery. | distance × reps | pace, if known |
| **Strides / reps** | Short, fast, full recovery. Neuromuscular, not aerobic. | distance × reps | — |
| **Run/walk** | Beginner entry per EPS-D8. Run interval + walk interval, repeated. | duration × reps | — |
| **Brick** *(tri)* | Bike immediately followed by run. 1×/week is the working dose. | two blocks, back to back | per activity |

Locked constraints that apply to every one of them:
- **≥1 easy or rest day between intensity sessions** (PAS §11.4). Hard days are never consecutive.
- **WARM_UP and COOL_DOWN are both required** (PAS-D9) — **dynamic** warm-up, **static stretching only in
  the cool-down**, never before a run.
- **Easy volume dominates.** "All sessions at high intensity" is explicitly forbidden (PAS §11.4).
- **Deloads keep frequency and cut volume** (PAS-D8) — the runner keeps running, shorter.
- **Deload cadence is duration-driven** (PAS-D7): 8 weeks → week 7; 10 weeks → week 9.

### §2.3 Prerequisites and refusal thresholds

**This table is what makes Holt refuse honestly instead of building something dangerous.** "A marathon in
4 weeks from zero" must produce a plain refusal and an offer of the thing that *would* work.

| Goal | Minimum block | Assumed starting base | Refuse when |
|---|---|---|---|
| **5k** | 8 weeks | none — run/walk entry (EPS-D8) | < 6 weeks out |
| **10k** | 8 weeks | can run ~20 min continuously | < 6 weeks, or cannot yet run continuously *(offer the 5k build first)* |
| **Half marathon** | 12 weeks | ~10 mi/week, consistent | < 10 weeks, or base < 6 mi/week |
| **Marathon** | 16 weeks | 15–20 mi/week, consistent and uninjured | < 12 weeks, or base **< 15 mi/week** (§6.2, PO-confirmed) |
| **Sprint triathlon** | 12 weeks | swim ~800 m with rests · ride 30 min · run 15 min | any discipline unreachable *(no pool, no bike)* |
| **Olympic triathlon** | 16 weeks | swim 800 m continuous · ride 60 min · run 30 min | as above, or < 12 weeks |
| **Ironman / full** | 24 weeks | a completed Olympic-distance race, or equivalent base | < 20 weeks, or no long-course base |

**The refusal must always carry the alternative.** *"A marathon needs about 16 weeks and a base of 15–20
miles a week. You have 7 weeks — that's a half marathon build, and it's the right way to get to the
marathon later. Want me to build that instead?"* Refusing without an offer is the anti-shame principle
being broken (Product DNA), not upheld.

### §2.4 Triathlon specifics

- **Weekly hours by distance** — sprint ~4–5 · Olympic ~6–8 · Ironman ~10–14 for an age-grouper. These
  are *time* budgets, which is the natural currency for triathlon and maps cleanly onto `targetSec`.
- **One full rest day per week**, every distance.
- **Bricks: 1/week** (up to 2 for Ironman), placed after the long or moderately hard ride.
- **The swim is the technique-limited discipline**, and Holt cannot coach technique. A plan should say so
  rather than pretend volume is the answer.
- **Everything but the run is indoor-typed in this app.** A pool swim and a trainer ride are what Holt
  can express; open water is not a modality the app knows.

---

## §3 — What Holt must ask that he does not ask today

The wizard's current constraint set is missing four inputs. None is hard; all are blocking.

| Input | Why it is needed | Notes |
|---|---|---|
| **Race date** | Drives block lengths, deload placement and taper start. Without it there is no plan, only a phase. | The one field that cannot be guessed — `missingFor()` already has the shape for this |
| **Current weekly volume** | The 10%/week cap needs a starting point, and §2.3 needs it to refuse honestly | Miles/week for running; hours/week for triathlon |
| **Recent race time or time trial** | The only honest source of prescribed paces (EPS-D10) | **Optional** — absence means effort descriptions, never invented paces |
| **Per-discipline access** *(tri)* | A pool, a bike, somewhere to run | `ExperienceProfile` is already per-discipline; access is not |

---

## §4 — Open, deliberately

- **Cycling as a standalone goal** is not covered here. The activity exists and PAS §7.2 already assigns
  it Block Periodization, but no one has asked for it. Flagged, not built.
- **Heart-rate zones** are not used anywhere in this standard. The app does not read heart rate, and a
  zone the athlete cannot measure is a description, not a prescription.
- **Strength work alongside endurance** is well supported in the literature and completely unaddressed
  here. It is also the one thing this app is *best* at. Worth its own pass once the running rulebook has
  mileage behind it.
- **Ultra distances** — out of scope, and should stay out until marathon has real use.

---

## §6 — What the build turned up

Six things surfaced while encoding this that no amount of reading would have found. Two of them need the
PO before this document goes LOCKED.

### 6.1 ✅ CONFIRMED 2026-08-09 — the 10%/week cap governs NEW territory

PAS §11.4 caps weekly mileage growth at **10% week-over-week**. PAS §7.1 mandates **Block
Periodization**, which "alternates easy and intensity weeks" — a down week, then back to the ramp. Read
literally the second breaks the first every time: a deload to 75% followed by a return to where you were
is a +33% week.

Taken literally, every deload would permanently cost a quarter of the ramp, and a sixteen-week plan with
three deloads would **end lower than it started**.

**The reading, now the decision:** the cap governs **new territory** — no week may exceed 110% of the
highest week the athlete has already trained. Returning to a load you have already carried is a return,
not an increase.

**✅ PO confirmed 2026-08-09.** This is an interpretation of a LOCKED rule (PAS §11.4) and is recorded as
one — **PAS itself is not amended.** A future reader who finds the two rules in conflict is pointed here
rather than left to pick between them. `endurance.test.mjs` asserts it and names itself as the place it
changes if the reading is ever revisited.

### 6.2 ✅ CONFIRMED 2026-08-09 — the marathon entry threshold is 15 mi/week

I set the marathon's minimum base at 10 mi/week. A 12 mi/week athlete with 16 weeks passed that gate and
got a block whose **longest run reached 12.4 miles** — because the spike cap (correctly) will not take a
4.8-mile long run to 20 in sixteen weeks. The plan was safe, well-formed, and **not marathon
preparation**.

The cap was right; the door was too wide. **Raised to 15 mi/week** (half marathon: 6 → 8), which is what
the research assumes a 12–16 week marathon block starts from. Someone below it is now offered the half —
which is their real race.

**✅ PO confirmed 2026-08-09.** This supersedes the 10 mi/week figure in §2.3, which was mine rather than
a decision, and it is now the decision. Encoded as `RACE_SPEC.run_marathon.minBaseMi` with the reasoning
beside it, and asserted by a test — so raising or lowering it again means coming back here and saying
what changed about the spike cap that made a lower door safe.

### 6.3 The `notes` field the PAS specifies does not exist

PAS §11.4 says running pace guidance "lives in `notes`". **`ProgramExercise` has no `notes` field**, and
its absence is deliberate — the schema's own comment cites it as the standing warning against write-only
fields, a failure this repo has shipped more than once. So the PAS is describing a field that was never
built, which is the pattern `project_pas_governs_an_unbuilt_product` exists to flag.

Coaching cues therefore live in the row's **name**, which every surface already renders: *"Easy Run ·
easy means easy, this is where the base is built"*. Longer labels than a lifting row, and the right
trade — dropping the cue to keep names tidy would prescribe the distance while withholding the point of
it.

### 6.4 The catalogue has no dynamic warm-up drills

PAS §11.4 requires a **dynamic** warm-up and names the movements: leg swings, hip circles, high knees.
**The catalogue contains none of them.** It has the static stretches for the cool-down (which §11.4 also
requires, and correctly places after rather than before), but not one dynamic drill.

So a running day warms up with a progressive easy jog — legitimate and universal — and the drills are
named in the row's label rather than prescribed as rows nobody can tap. **Closing this properly means
appending to `exercises.json`**, which pulls coaching content, media and relationships along behind it
for each new movement. Reported as a content item, not done quietly.

### 6.5 The long run drives the build — the share guideline cannot be a ceiling

The first working version derived the long run as a share of weekly volume, per EPS-D2. It produced a
**seventeen-week marathon plan whose longest run was 7.3 miles**, and every structural check passed on
it: the weeks were there, the caps were never breached, the validator was happy.

Used as a ceiling, the 25–30% share caps the long run at whatever the athlete already runs. So the
dependency is inverted: **the long run climbs toward what the race needs** (bounded by the spike cap and
the time cap), and weekly volume is pulled up behind it to keep the week proportioned. EPS-D2 remains
true as a description of a well-built week at high mileage; it is not an instruction for how to build one.

### 6.6 Race week is not a training week

Taper arithmetic cuts volume and keeps intensity (EPS-D6), and applied blindly to the final week that
gave a marathon plan a **40-minute tempo and a long run in the same week as the marathon**. Volume-cut
arithmetic has no concept of the race being in it. The last week is now a couple of easy runs, a
shakeout, and the race — prescribed as its distance, with **no pace**, because the plan has no business
telling someone how fast to run the thing it spent seventeen weeks preparing them for.

---

## §7 — Where this stands

1. ✅ PO answered EPS-D1 … EPS-D13 (2026-08-09) — all thirteen recommendations approved as written.
2. ✅ Encoded in `src/domain/coach/rulebook/endurance.ts`; wired into `assemble()` behind the single
   family branch, so all five goals build.
3. ✅ The wizard asks the four inputs it was missing — race date (as weeks-to-race), current weekly
   mileage, whether they can run continuously, and an optional recent result for paces.
4. ✅ `endurance.test.mjs` — 24 tests over the properties that matter: no week into new territory past
   the cap, no long-run spike, no two hard days adjacent, the taper cuts volume and keeps intensity, the
   plan lands on the race date, every refusal carries an alternative, and **no pace is ever invented**.
5. ✅ Plans read as a coach would read them, across all five goals and a range of starting bases. Two
   defects were found that way and only that way — §6.2 and §6.5.
6. ✅ **§6.1 and §6.2 both confirmed 2026-08-09.** 🔒 **This standard is LOCKED.**

**Still open, deliberately:** cycling as a standalone goal · heart-rate zones (the app reads no heart
rate, and a zone nobody can measure is a description rather than a prescription) · strength work
alongside endurance, which is well supported and is the thing this app is best at · ultra distances.

---

## Sources — principles, not plans

Consulted for methodology. **Nothing was transcribed; every number above is a Forge decision.**

- [Polarized training intensity distribution — systematic review (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679080/)
- [Seiler — complete guide to polarized training (Fast Talk Labs)](https://www.fasttalklabs.com/pathways/polarized-training/)
- [Effects of tapering on performance in endurance athletes — systematic review & meta-analysis (PLOS One)](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0282838)
- [Tapering meta-analysis (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10171681/)
- [Training volume and longest endurance run related to performance and injuries (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7496388/)
- [Why the 10% rule fails as a preventive measure (OnTracx)](https://www.ontracx.com/insight/the-10-rule-why-it-fails-as-a-preventive-measure-for-running-related-injuries)
- [The 10% rule — does it hold true? (POGO Physio)](https://www.pogophysio.com.au/blog/the-10-rule-does-it-hold-true/)
- [How long should your long run be relative to weekly mileage (Strength Running)](https://strengthrunning.com/2016/02/how-long-should-my-long-run-be-relative-to-my-weekly-mileage/)
- [Should you cap your marathon long run at three hours (Laura Norris Running)](https://lauranorrisrunning.com/three-hour-long-run-marathon-training/)
- [Research-backed 5k interval, tempo and long run workouts (Runners Connect)](https://runnersconnect.net/workouts-for-the-5k/)
- [VDOT training paces explained](https://blacknave.com/blog/vdot-training-paces-explained)
- [Balancing swim-bike-run in triathlon training (TrainingPeaks)](https://www.trainingpeaks.com/blog/balancing-swim-bike-run-in-triathlon-training/)
- [Using brick workouts in triathlon training (TrainingPeaks)](https://www.trainingpeaks.com/blog/using-brick-workouts-in-triathlon-training/)
- [How many hours does it really take to conquer Ironman (Triathlete)](https://www.triathlete.com/training/how-many-hours-does-it-really-take-to-conquer-ironman/)
- [12-week beginner sprint triathlon plan — prerequisites (BetterTriathlete)](https://bettertriathlete.com/triathlon-training/12-week-sprint-plan/)
- [Final week training tips for marathoners (TrainingPeaks)](https://www.trainingpeaks.com/blog/final-week-training-tips-for-first-time-marathoners/)
