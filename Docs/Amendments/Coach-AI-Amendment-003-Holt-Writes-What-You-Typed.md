# Coach AI Amendment 003 — when you type it, Holt reads all of it and writes the session himself

**Status:** BUILT and LIVE-TESTED 2026-09-30 on PO direction (CW-D1…CW-D13). NOT DEPLOYED — `coach-author` is not
on the server yet and the app change is not published. Live test: 121 of 126 asks built exactly as asked
(`Docs/Coach-Holt-Author-Live-Test-2026-09-30.md`).
**Date:** 2026-09-30
**Owner:** Product
**Amends:** `Coach-AI-Amendment-001` **CA-D11** ("every number in a saved program comes from the athlete or from
the engine, never from the model's own head") and **CA-D3** (its state table: "Focus given → the engine, within
that focus") · `Coach-Chat-Design-Brief-v1.0` §0 and §10 ("Holt does not write programs. He calls a machine that
does.") · `AI-Coach-Capability-Scope-v0.1` safety rule 3 · `Coach-Holt-Everywhere-v1.0` rule 3, for reps and sets
only. Decision IDs are `CW-D*` because `CA3-D*` is taken by Challenge Amendment 003.
**Governs:** `supabase/functions/coach-author`, `src/domain/coach/author.ts`, `author-validate.ts`,
`author-catalogue.ts` (generated), `src/data/coach-author-live.ts`, `src/components/forge/CoachChatSheet.tsx`
(`advance`).

---

## Why

PO, 2026-09-30, by voice: *"I really want to develop my upper chest and I'm usually trying to do about two tricep
workouts and then the rest as a chest workout."* Holt replied "Upper chest and triceps it is" and built three flat
presses and three triceps movements.

The cause is the rule this amends. The model only filled a form, and the rulebook built from the form. The form has
one box for a day's focus, and it held "chest and triceps". Everything else in the sentence had no box.

A first fix taught the rulebook two more things (a region, a count). The PO's answer: *"No, I need the coach holt to
read and listen to everything I type and build a custom program to what I'm telling him. If I'm typing it probably
should just be read by ai then."* Adding boxes one complaint at a time never reaches "everything".

## Decisions

### CW-D1 — A typed or spoken ask is written by the model. (Amends CA-D11, CA-D3, Brief §0.)

When the athlete typed or spoke the request, the model reads every message of that request and chooses the
movements, their order, the sets and the reps. One call, `coach-author`, at the moment the card is built.

### CW-D2 — A tapped build is still the rulebook's.

No typed words, no model call. The free and Premium builds that come from chips are unchanged, byte for byte.
Typing is already Premium AI only (MA8-D6), so this is a Premium AI capability and is gated by the same credit
RPC (`coach_ai_spend_credits`, 0203).

### CW-D3 — He can only name movements the app shows.

The prompt carries the visible catalogue (733 movements, generated from `buildPickerDb`, never the raw file). A key
that is not in it is dropped on the device. A movement he wanted that is not in the library goes in `unmet` and is
said.

### CW-D4 — The device checks every movement, with the rulebook's own tables. Dropped, never repaired, never silent.

`validateAuthored` runs each movement through the same gates the rulebook builder uses: the athlete's kit
(`canDoExercise`), their level (the advanced tier stays gated), their stated limitations (`rulebook/limitations.ts`)
and anything they said to leave out. What fails is removed and Holt names it with the reason. Nothing is swapped in
by code. If the removals leave a day under three movements, the whole plan is refused and the rulebook builds.
This keeps CA-D12: a stated limitation is never silently violated.

### CW-D5 — Still no loads from the model.

The schema has no field for a weight, a percentage or an RPE, so he cannot write one. Weights keep coming from what
the athlete lifted last time. CA-D11's rule survives for loads, paces and distances.

### CW-D6 — Safety is unchanged and still in code.

`medicalRoute` runs on every message on the device and again in the function, before any credit is spent. A stop
goes through the same four stop cards. Any line of Holt's own that mentions discomfort (his sentence, a cue, an
`unmet` item) is cut, the same pair of checks CA2-D2 runs on a summary.

### CW-D7 — The running of a race stays with the rulebook. (Narrowed by CW-D13.)

The mileage curve, the long run, the taper and race week (PAS-A7-D3) are arithmetic the model is not trusted with.
A race block's RUNNING never reaches `coach-author`. Its lifting days do — see CW-D13.

### CW-D8 — When he cannot write it, the rulebook does, and he says so.

Out of credits, offline, no AI consent, or a plan that failed the checks: the rulebook builds from the focus and
Holt says it followed the focus, not every word.

### CW-D9 — A misspelled exercise name is read, not dropped. (Refines CW-D4.)

Round 1 of the live test lost a slot in 6 of 94 asks to `incline-dumbbell-bench-press` (the library says
`dumbbell-incline-…`), `dips`, `leg-press-machine`. Those are names, and a name goes through the app's own
resolver (`resolveAgainstCatalog`), the one a typed or imported exercise already uses. A name it cannot place is
still dropped and said. Code still never chooses a replacement.

### CW-D10 — He can write a rep range, a superset, a circuit, a warm-up and a cool-down.

Asked for in the athlete's words and impossible in the first version. A range is `reps` + `repsTo` and lands as
`reps`/`repsMax`. Adjacent movements sharing a letter become the superset or circuit block the logger already
runs (the same fields `pairWithNext` writes). Warm-up and cool-down go in the day's own sections and do not count
toward the session's three-movement floor. None of these is added unless the athlete asked.

### CW-D11 — Cardio is a bout, not a library movement.

The library has no bike, treadmill or rower. He writes `cardio-bike` with a duration and the device stores the
`kind: 'cardio'` row the endurance rulebook and the logger use. A machine needs the machine on file; a run or a
walk needs nothing; a limitation takes the run exactly as `LIMITATION_ACTIVITIES` says.

### CW-D12 — He is told the exact movements, and asked once more when a plan is not whole.

An equipment class is too coarse (a dip is "bodyweight" and needs bars), so the request carries the exact
movements the athlete's kit allows, or the ones it does not, whichever list is shorter. And once in 122 asks the
reply stopped after one movement: the function asks a second time on the same credit when any day has fewer than
three main movements.

### CW-D13 — A typed race block that lifts: their split, their gym, their length; Holt writes the lifting.

PO, 2026-09-30, after asking whether everything typed should go through the AI: *"I want to run twice a week and
lift 3 times a week. I'm prepping for a marathon but I want to have weights and strength to help me. Build me a 7
week program for this."* Run through the app as it stood, that came back as four runs and one lift, the lift
bodyweight, the seven weeks ignored. Four changes:

- **The split is theirs** (`CoachConstraints.splitAsSaid`, set only from typed words). `splitRaceWeek` no longer
  re-cuts it; the running gets the days they gave it, never fewer than `MIN_ENDURANCE_DAYS`. Holt says once that
  it is light for the distance (`CONCERN.fewRunsForRace`). This is CA-D12 applied to a race: suggest, then build.
- **The room is asked, or remembered.** A race that lifts reaches the `where` question (`liftsInRace`) and no
  longer defaults to `outdoor`, which built its lifting days from push-ups.
- **The length is theirs.** "A 7 week program" offers "at the end of the 7 weeks" as the first race-date answer.
  A race further off gets the first seven weeks of its build (`firstWeeksOf`) and is told the taper is not in it.
- **Holt writes the lifting days** (`AuthorRequest.beside`), told they sit beside a race and to write no
  running. `spliceLiftDays` puts them in place of the rulebook's in every week but race week, which keeps ONE of
  the rulebook's short upper-body lifts; the other lifting days that week become empty days.

The running is untouched by any of it.

## Smaller changes that ride with it

- A typed single day is no longer asked "what are we chasing today?". He reads the goal from their words. The
  rulebook fallback uses the goal onboarding recorded, else the moderate range.
- "Give me something for today, keep it light" used to lose the sentence when it opened the build door. It is kept.
- A message about a draft Holt just wrote ("add one more triceps movement") rewrites the draft with that message
  added, instead of trying to edit the running program.
- A typed program is one week written by Holt, repeated for the chosen length (`vary: false`). It has no deload
  week and no week-to-week rep progression. The rulebook's programs do. This is the main thing to decide after
  the first live run.

## Cost

One Sonnet 5 call per card (two, rarely — CW-D12). Measured 2026-09-30 over 126 asks: **$0.009 for a single
workout, $0.019 for a week**, about 5.5 and 12 seconds. The system block is 13.4k tokens, read from the cache at a
tenth of the input price; the first call after five quiet minutes writes the cache and costs about 4¢. A home-gym
or bodyweight athlete costs about 40% more, because the exact movement list rides in the uncached user turn. It
charges the existing `day` and `program` actions, so there is no migration.

⚠ `coach-interpret` still charges for each typed message on the way to the card, so a typed day now costs the
interpret credits plus one `day` credit. CA-D8 says a build should cost one credit with the conversation free.
That gap existed before this amendment and is not closed by it.

## Before it ships

1. ✅ Live test of the prompt and the checking code, 2026-09-30 — 121/126, $3.94 across three rounds.
2. Deploy `coach-author` (paste `supabase/apply/deploy-coach-author.ts` in the dashboard, or the CLI).
3. One request through the DEPLOYED function from the app: credits, sign-in and the Premium AI gate have not run.
4. Publish the app change (web, then the OTA), and see a written workout on a phone.
5. Decide the typed-program progression question above.

## Not changed

Holt changing a running program (CA2-D3), the Program Builder as the only way anything is saved, one active program
at a time, the under-18 rules, and everything in Nutrition (NUT-D4).
