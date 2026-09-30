# Coach Holt writes what you typed — live test, 2026-09-30

**What this is:** the first live run of `coach-author` (`Coach-AI-Amendment-003`), the path where Holt reads a
typed or spoken ask and writes the workout or program himself.

**Result:** 121 of 126 requests were built exactly as asked. The five misses are listed below.

**Not yet true:** the function is not deployed and the app change is not published. Everything here was run
from this machine against the real model with the function's own prompt and the app's own checking code.

## How it was tested

- 126 requests written the way athletes type and dictate: 96 single workouts, 30 programs.
  `scripts/holt-corpus/corpus-author.mjs`.
- Each request carries checks for what the athlete said out loud: a count, a region, a named lift, a tool,
  an order, a superset, a warm-up, a rep range, something to leave out.
- Each request went to the real model, then through the device's checks (library, kit, level, limitations),
  and the result that would reach the card was scored. `scripts/holt-corpus/author-live.mjs`.
- Three rounds. After each one the failures were read, the prompt and the checking code were fixed, and the
  requests were run again.
- Every output was also read by eye for things a script cannot score.

| Round | Requests | Built as asked |
|---|---|---|
| 1 (first prompt) | 94 | 80 (85%) |
| 2 (revised prompt, 28 requests added) | 122 | 112 (92%) |
| 3 (final) | 126 | 121 (96%) |

Total spend across all rounds: **$3.94**, plus about 25¢ on the marathon work below.

## Final scores by kind of request

| What the athlete asked for | Built as asked |
|---|---|
| A region (upper chest, rear delts, lats, hamstrings, glutes) | 21 / 21 |
| A change to the previous answer ("add one more", "swap the row") | 6 / 6 |
| Supersets, circuits, giant sets | 6 / 6 |
| Warm-up and cool-down | 4 / 4 |
| A style (heavy, pump, light, single-leg, explosive) | 11 / 11 |
| Working around a limitation | 6 / 6 |
| Something to leave out | 6 / 6 |
| A program split (PPL, upper/lower, bro split, Arnold) | 9 / 9 |
| Beginner | 4 / 4 |
| An order | 3 / 3 |
| A count ("two triceps, the rest chest") | 10 / 11 |
| Specific sets and reps | 14 / 16 |
| Named exercises | 11 / 13 |
| Equipment (dumbbells only, machines, home, bodyweight) | 15 / 17 |
| Cardio (bike, treadmill, rower) | 4 / 5 |
| Voice dictation | 2 / 3 |

## The request that started this

> "I'm working out chest and tries today. I have about an hour. I really want to develop my upper chest and I'm
> usually trying to do about two tricep workouts and then the rest as a chest workout."

| Before (the rulebook) | Now |
|---|---|
| Barbell Bench Press 4×6 | Barbell Incline Bench Press 4×6-10 |
| Dumbbell Bench Press 4×8 | Dumbbell Incline Bench Press 3×8-12 |
| Machine Chest Press 4×12 | Barbell Bench Press 3×6-10 |
| Cable Triceps Pushdown 4×12 | Low-to-High Cable Fly 3×10-15 |
| Dumbbell Skull Crusher 4×12 | Cable Triceps Pushdown 3×10-15 |
| Barbell Skull Crusher 4×12 | Dumbbell Skull Crusher 3×8-12 |

Holt's line: *"Upper chest leads today with two inclines and a low-to-high fly, one flat press to keep the
pattern balanced, and triceps held to two movements just like you asked."*

## The five misses in the final round

1. **Garbled dictation.** "back and by seps for exercises for back to for biceps" means four for back, two
   for biceps. He gave four and four. He got it right in rounds 1 and 2.
2. **Off by one.** "bench 5×5, incline dumbbell 4×8, then 3 more you pick" came back with four more.
3. **Off by one.** "squat twice a week" in a four-day program came back with three squat days.
4. **A bike the athlete does not have.** "5 minutes on the bike" with only dumbbells on file: he wrote the
   bike, the app removed it and said so. The athlete sees the honest line; the ideal is for him to offer a walk.
5. **An invented exercise.** In a calisthenics program he wrote a "weighted pull-up" that is not in the
   library, and a split squat that needs a bench. The app removed both and said so.

In misses 4 and 5 the app's own checks caught the problem. Nothing wrong reached a card.

## What the three rounds changed

Found in round 1 and fixed:

- **Misspelled exercise names** cost the athlete a slot in 6 requests (`incline-dumbbell-bench-press` for
  `dumbbell-incline-bench-press`, `dips`). The app now reads those through the same name resolver a typed or
  imported exercise uses. A name it cannot place is still removed.
- **Deadlifts on back days nobody asked for**, and one on an upper-body day. Now a rule.
- **"Everything 5×5: squat, bench, row"** got three extra exercises. A listed session is now the session.
- **Dips written for "no equipment at all".** He was told equipment classes; a dip is "bodyweight" and needs
  bars. He is now told the exact movements the athlete's kit allows.
- **His sentence sometimes described a different order** than the card. It is now written last.
- **His notes leaked app jargon** ("Vertical Push section excluded"). Those lines are now cut.

Added because athletes ask for them and the first version could not express them:

- **Rep ranges.** "15 to 20" is now 15-20 on the card, not 18.
- **Supersets and circuits.** Written as real superset blocks the workout logger already runs, shown A1/A2.
- **Warm-ups and cool-downs**, only when asked.
- **Cardio.** "Five minutes on the bike" had nowhere to go: the exercise library has no bike, treadmill or
  rower. Those are now written as cardio bouts, the same kind the running plans use.

Found in round 2 and fixed:

- One reply in 122 stopped after a single warm-up exercise. The function now asks once more, on the same
  credit, when a workout comes back with fewer than three exercises.
- Warm-ups added when nobody asked. Now a rule.
- Notes cut off mid-sentence. Now kept whole or dropped.

## Cost and speed (measured, final round)

| | Single workout | Program (one week) |
|---|---|---|
| Cost per build | $0.009 | $0.019 |
| Typical wait | about 5.5 seconds | about 12 seconds |
| Slowest | 9 seconds | 16 seconds |

The first build after a quiet spell costs about 4¢ (the exercise library is loaded into the model's cache
for five minutes). A home-gym or bodyweight athlete costs about 40% more ($0.012), because the exact list of
movements their kit allows is sent with the request.

## Added the same day: a marathon, two runs, three lifts, seven weeks

> "I want to run twice a week and lift 3 times a week. I'm prepping for a marathon but I want to have weights
> and strength to help me. Build me a 7 week program for this."

| | Before | Now |
|---|---|---|
| Split | 4 runs, 1 lift | 2 runs, 3 lifts |
| Lifting | push-ups, bodyweight squats | squat, deadlift, split squat, rows, presses, calves, trunk |
| Length | counted from the race date only | 7 weeks |
| Who writes the lifting | the rulebook | Holt, from the sentence |
| Who writes the running | the rulebook | the rulebook (unchanged) |

He still says, once each: that a marathon usually takes about 16 weeks, and that two runs a week is light for
one. Then he builds it. If the race is further off than seven weeks, the program is the first seven weeks of
the longer build and he says the taper is not in it yet.

Four more requests of this kind were run live (lifting days beside a marathon, a half and a 5K, including
"upper body only" and "only one leg day"): 4 of 4 built as asked. `scripts/holt-corpus/marathon-e2e.mjs` runs
the sentence through all four stages and prints the program.

Known weak spot: the rulebook arranges the week so a heavy leg day is not the day before the long run, using
ITS OWN lifting days to decide. Holt's written days then take those slots, so that protection is approximate.

## What this test does not cover

- **The app screens.** The chat sheet wiring (what is sent, the card, the fallback lines) is typechecked and
  linted but has not been run on a phone or the web preview.
- **The deployed function.** The test calls the model directly. Credits, sign-in and the Premium AI gate are
  the same code `coach-kitchen` uses, but this function has not run on the server.
- **Week-to-week progression.** A typed program is one week repeated. No deload, no rep progression.
- **Whether the workouts are good training**, beyond what was read by eye. They read like what a competent
  coach would write. Nobody has trained them.
- **Rare failures.** Five in 126 missed; a different run will miss a different few. The model is not
  deterministic.

## Files

- `scripts/holt-corpus/corpus-author.mjs` — the 126 requests and their checks.
- `scripts/holt-corpus/author-live.mjs` — the runner. `--cap` is a hard dollar ceiling.
- `scripts/holt-corpus/live-author-2026-09-30-run1.jsonl` — round 1, every output.
- `scripts/holt-corpus/live-author-2026-09-30.jsonl` — the final round, every output.
- `src/domain/coach/__tests__/author.test.mjs` — 28 tests of the checking code; none calls the model.
