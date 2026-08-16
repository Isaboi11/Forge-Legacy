/**
 * chat-build-path.test.mjs — the sheet must never freeze, for any athlete.
 *
 * ══ THE BUG THIS EXISTS FOR ══
 *
 * `CoachChatSheet` disables its composer while `busy` is set — correctly, you cannot answer a question
 * Holt has not finished asking. But `busy` was cleared only on the paths that succeeded, so a throw
 * anywhere in assembly left it set forever: typing bubble pulsing, input dead, no error, no way out but
 * to kill the app. The PO reported it as "stalled or frozen", which is exactly what it was.
 *
 * ⚠ THE `try/finally` IN THE SHEET IS THE SAFETY NET, NOT THE FIX. A caught exception still means the
 * athlete asked for a program and got an apology. This file is the fix: it drives the REAL build path —
 * the same calls in the same order the sheet makes them — across every combination the chat can produce,
 * and fails if any of them throws.
 *
 * ⚠ AND IT COVERS THE HELPERS THAT USED TO BE UNREACHABLE. `completeFor`, `volumeFor` and `weeksBetween`
 * were defined inside the component file, which meant no test could import them, which meant the three
 * functions standing between a tapped chip and a finished program had zero coverage. They live in
 * `chat-core.ts` now for exactly this reason.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/chat-build-path.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { buildDayWorkout } from '../day.ts';
import { AUTHORED_GOALS } from '../rulebook/skeletons.ts';
import { rationaleFor } from '../rulebook/rationale.ts';
import {
  completeFor,
  volumeFor,
  weeksBetween,
  programCardFor,
  dayCardFor,
  refusalCardFor,
  mergeFocus,
  nextQuestion,
  readyToBuild,
  preamble,
} from '../chat-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/**
 * Everything `advance()` does between the last tapped chip and a rendered card, in that order.
 *
 * It deliberately mirrors the sheet rather than importing it — the component cannot be imported under
 * `node --test` — so if the sheet's order of operations changes, this must change with it.
 *
 * ⚠ ONE STEP HAPPENS BEFORE THIS AND IS NOT MIRRORED: the BUILD opener asks `sizeQuestion()` and puts
 * `weeks` into the state before `advance` is ever called. That is deliberate — it belongs to the door,
 * not to the turn cycle — so the mirror starts, correctly, from a state that already carries it.
 */
function runBuildPath(partial, mode) {
  // The mode decides which questions exist at all — a day never asks a program's questions.
  if (!readyToBuild(partial, mode)) return { outcome: 'asked', question: nextQuestion(partial, mode) };

  const c = completeFor(partial, mode);

  if (mode === 'day') {
    const r = buildDayWorkout(
      {
        focus: partial.dayFocus ?? { kind: 'split', split: 'full_body' },
        /* The goal decides the prescription AND the cue — 5 × 5 heavy or 3 × 12, and what he says about it. */
        goal: c.goal,
        sessionMinutes: c.sessionMinutes,
        experience: c.experience.lifting,
        environment: c.environment,
        ownedEquipment: c.ownedEquipment,
        limitations: c.limitations,
      },
      POOL,
      canDoExercise,
    );
    if (r.day.main.length === 0) return { outcome: 'empty-day' };
    return { outcome: 'day', card: dayCardFor(partial, r.day) };
  }

  const res = assemble(c, POOL, canDoExercise);
  if (!res.ok) {
    // The refusal path builds a card too, and a throw here freezes the sheet just as hard.
    refusalCardFor(c.goal, weeksBetween(c.raceDate), c.daysPerWeek, res.refusal.message);
    return { outcome: 'refused' };
  }

  const structure = res.assembly.structure;
  const volume = volumeFor(c, structure.weeks);
  const reason = rationaleFor({
    goal: c.goal,
    daysPerWeek: c.daysPerWeek,
    sessionMinutes: c.sessionMinutes,
    weeks: structure.weeks,
    splitStyle: c.splitStyle ?? null,
    deloadWeeks: res.assembly.deloadWeeks,
    restructuredBecause: res.assembly.restructured?.because,
  });
  preamble(c, structure.weeks);
  return { outcome: 'built', structure, card: programCardFor(c, structure, volume, reason) };
}

// A race far enough out that every distance is reachable, so refusals in this file are rulebook
// decisions rather than an artefact of the date.
const RACE = new Date(Date.now() + 300 * 24 * 3600 * 1000).toISOString().slice(0, 10);

const ENVIRONMENTS = ['full_gym', 'home', 'bodyweight', 'outdoor'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const LIMITATIONS = [[], ['knees'], ['shoulders'], ['lower_back'], ['no_jumping'], ['no_barbell'], ['knees', 'shoulders', 'lower_back']];

function* everyAthlete() {
  for (const goal of AUTHORED_GOALS) {
    for (const environment of ENVIRONMENTS) {
      for (const level of LEVELS) {
        for (const daysPerWeek of [2, 3, 4, 5, 6]) {
          for (const sessionMinutes of [30, 45, 60, 75]) {
            for (const limitations of LIMITATIONS) {
              yield {
                goal,
                environment,
                daysPerWeek,
                sessionMinutes,
                limitations,
                experience: { lifting: level, running: level },
                ownedEquipment: environment === 'home' ? ['dumbbells', 'bench'] : [],
                raceDate: RACE,
                currentWeeklyMi: 12,
                canRunContinuously: true,
                /*
                 * ⚠ **WITHOUT THIS THE WHOLE CROSS-PRODUCT TESTS NOTHING, AND SAYS SO IN GREEN.**
                 *
                 * A question was added to the questionnaire (`size`, 2026-08-14). These athletes did not
                 * answer it, so `readyToBuild` went false for every one of them, so `runBuildPath`
                 * returned `{outcome:'asked'}` 13,440 times without calling `assemble` once — and the
                 * file passed, because nothing threw. The only visible symptom was the suite getting
                 * faster.
                 *
                 * `assertReallyBuilt` below is the backstop: the next question added here fails loudly
                 * instead of quietly emptying this file.
                 */
                weeks: 8,
              };
            }
          }
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ASSERTION THAT WOULD HAVE CAUGHT THE FREEZE
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ no athlete the chat can describe makes the build path throw', () => {
  const failures = [];
  let ran = 0;
  let built = 0;

  for (const athlete of everyAthlete()) {
    ran++;
    try {
      const r = runBuildPath(athlete, 'program');
      if (r.outcome === 'built' || r.outcome === 'refused') built++;
    } catch (e) {
      const who = `${athlete.goal}/${athlete.environment}/${athlete.experience.lifting}/${athlete.daysPerWeek}d/${athlete.sessionMinutes}m/[${athlete.limitations}]`;
      failures.push(`${who} → ${e.message}`);
    }
  }

  assert.ok(ran > 1000, `expected a real cross-product, ran ${ran}`);
  /*
   * ⚠ **THE ASSERTION THAT THIS FILE IS STILL DOING ITS JOB.** "Nothing threw" is trivially true of a
   * run that never reached the engine, and that is exactly what happened when a question was added to
   * the questionnaire: every athlete came back `asked`, `assemble` was called zero times, and the file
   * stayed green. A coverage guard, not a behaviour one.
   */
  assert.equal(built, ran, `only ${built} of ${ran} athletes reached the engine — seed the new question in everyAthlete()`);
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} of ${ran} threw`);
});

test('⚠ the single-day path throws for nobody either', () => {
  const failures = [];
  for (const athlete of everyAthlete()) {
    try {
      runBuildPath(athlete, 'day');
    } catch (e) {
      failures.push(`${athlete.goal}/${athlete.environment}/${athlete.experience.lifting} → ${e.message}`);
    }
  }
  assert.deepEqual(failures.slice(0, 10), []);
});

test('a half-answered conversation asks rather than throws', () => {
  // Every prefix of the questionnaire must survive being handed to the build path, because the athlete
  // can tap a chip at any point and `advance` runs on every one of them.
  const fields = ['goal', 'daysPerWeek', 'sessionMinutes', 'environment', 'experience', 'limitations'];
  const full = {
    goal: 'strength', daysPerWeek: 4, sessionMinutes: 60, environment: 'full_gym',
    experience: { lifting: 'intermediate', running: 'intermediate' }, limitations: [],
  };
  for (let i = 0; i <= fields.length; i++) {
    const partial = Object.fromEntries(fields.slice(0, i).map((f) => [f, full[f]]));
    const r = runBuildPath(partial, 'program');
    if (r.outcome === 'asked') assert.ok(r.question, 'an incomplete constraint set must yield a question');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE HELPERS THAT USED TO BE UNTESTABLE
// ─────────────────────────────────────────────────────────────────────────────

test('completeFor sends an endurance goal outdoors and a lifting goal to the gym', () => {
  assert.equal(completeFor({ goal: 'run_marathon' }, 'program').environment, 'outdoor');
  assert.equal(completeFor({ goal: 'strength' }, 'program').environment, 'full_gym');
  // A single day is never assumed to be outdoors — "what should I train today" is a gym question.
  assert.equal(completeFor({ goal: 'run_marathon' }, 'day').environment, 'full_gym');
});

test('completeFor never invents a race date or a starting mileage', () => {
  // Both are refusal inputs. Defaulting either would let the engine build a marathon plan for someone
  // who never said when the race is, or assume mileage they never claimed.
  const c = completeFor({ goal: 'run_marathon' }, 'program');
  assert.equal(c.raceDate, null);
  assert.equal(c.currentWeeklyMi, null);
});

/*
 * ══ ⚠ THE ONE THAT WAS MISSING, AND WHAT IT COST ══
 *
 * `completeFor` rebuilds the constraint object field by field, so anything it does not name is DROPPED
 * — with no type error, because the optional fields are satisfied by omission.
 *
 * That was already live and already wrong: the sheet read `c.splitStyle ?? null` after this ran and
 * therefore always got `null`, whatever the athlete picked. And it would have made "build me one week"
 * a lie — the chip sets `weeks: 1`, the transcript says One week, every existing test passes, and
 * `assemble` reads `c.weeks ?? defaultWeeksFor(goal)` and builds eight.
 *
 * These assert the SURVIVAL of an answer, not a default. A new constraint the chat can set needs a line
 * here, or the engine goes on quietly using its own default while the conversation says otherwise.
 */
test('⚠ completeFor carries an answer through — it is a merge, not a whitelist', () => {
  const c = completeFor({ goal: 'strength', weeks: 1, splitStyle: 'full_body' }, 'program');
  assert.equal(c.weeks, 1, 'a one-week block would silently have become eight');
  assert.equal(c.splitStyle, 'full_body', 'this one was already live and already dropped');
});

test('completeFor still supplies defaults for what was never answered', () => {
  // The other half of the contract: the merge must not turn "unanswered" into "undefined reaches the
  // engine". `null` and absent behave identically downstream; a MISSING key does not.
  const c = completeFor({ goal: 'strength' }, 'program');
  assert.equal(c.weeks, null, 'absent, not undefined — assemble falls back to defaultWeeksFor');
  assert.equal(c.splitStyle, null);
  assert.equal(c.daysPerWeek, 4);
  assert.equal(c.sessionMinutes, 60);
  assert.deepEqual(c.limitations, []);
  assert.deepEqual(c.excludeExercises, []);
});

test('⚠ a field completeFor does NOT name still survives it', () => {
  /*
   * This is the one that actually guards the fix, and the first version of this test did not.
   *
   * `weeks` and `splitStyle` are now carried TWICE — by the `...c` spread and by an explicit line each.
   * So a test using only those two passes even with the spread deleted, which makes it no guard at all.
   * (Confirmed by mutation: removing `...c` left it green.)
   *
   * `recentRaceMi` / `recentRaceSec` are named nowhere in `completeFor`, so they can only arrive via the
   * spread. They are also real: `assemble` derives training paces from them, and without them Holt
   * describes effort instead of writing a pace (EPS-D10). Dropping them silently downgrades a race plan.
   */
  const c = completeFor({ goal: 'run_5k', recentRaceMi: 3.1, recentRaceSec: 1500 }, 'program');
  assert.equal(c.recentRaceMi, 3.1, 'only the spread can carry this — the fix is gone');
  assert.equal(c.recentRaceSec, 1500);
});

test('an answered field always beats the default, for every field completeFor names', () => {
  // Guards the shape of the fix rather than one field: `...c` first, defaults after, so a real answer
  // can never be overwritten by a `??` that was meant to fill a gap.
  const answered = {
    goal: 'muscle',
    daysPerWeek: 6,
    sessionMinutes: 30,
    environment: 'home_gym',
    limitations: ['knee'],
    excludeExercises: ['back-squat'],
    weeks: 2,
  };
  const c = completeFor(answered, 'program');
  for (const [k, v] of Object.entries(answered)) {
    assert.deepEqual(c[k], v, `completeFor overwrote the athlete's ${k} with a default`);
  }
});

test('volumeFor is empty for lifting and a real curve for running', () => {
  assert.deepEqual(volumeFor(completeFor({ goal: 'strength' }, 'program'), 8), []);
  const curve = volumeFor({ ...completeFor({ goal: 'run_marathon' }, 'program'), currentWeeklyMi: 20 }, 16);
  assert.equal(curve.length, 16, 'one entry per week');
  assert.ok(curve.every((w) => w.mileage > 0 && w.longRunMi > 0), 'every week has a real number');
});

test('weeksBetween counts down and floors at zero', () => {
  const now = Date.parse('2026-01-01');
  assert.equal(weeksBetween('2026-01-29', now), 4);
  assert.equal(weeksBetween('2025-06-01', now), 0, 'a race in the past is zero weeks away, not negative');
  assert.equal(weeksBetween(null, now), 0);
  assert.equal(weeksBetween('not a date', now), 0, 'garbage must not become NaN on the card');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ ONE WEEK IS ONE WEEK — end to end, chip to structure
// ─────────────────────────────────────────────────────────────────────────────

/*
 * The unit test above proves `weeks` survives `completeFor`. This proves the whole path: the chip's
 * patch reaches `assemble` and the block that comes back is one week long.
 *
 * It is the assertion the plan asked for by name, and the one that would have caught the original bug —
 * a "One week" chip that set the state, showed "One week" back in the transcript, passed every existing
 * test, and built eight.
 */
const WEEK_ATHLETE = {
  goal: 'strength',
  environment: 'full_gym',
  daysPerWeek: 3,
  sessionMinutes: 60,
  limitations: [],
  experience: { lifting: 'intermediate', running: 'intermediate' },
  ownedEquipment: [],
};

test('⚠ every rung of the length question builds exactly that many weeks', () => {
  for (const weeks of [1, 4, 8, 12]) {
    const r = runBuildPath({ ...WEEK_ATHLETE, weeks }, 'program');
    assert.equal(r.outcome, 'built', `${weeks} weeks must be buildable, not refused`);
    assert.equal(r.structure.weeks, weeks, `the athlete asked for ${weeks} and the engine built ${r.structure.weeks}`);
  }
  const one = runBuildPath({ ...WEEK_ATHLETE, weeks: 1 }, 'program');
  assert.match(one.card.subtitle, /1 week ·/, "and the card must say so in the coach's own voice");
});

test('⚠ every week on the card can be opened onto its own sessions', () => {
  /*
   * PO, 2026-08-14: *"be sure that we can see each individual day in a drop down from the week. It
   * won't show them right now."*
   *
   * ⚠ THE DAYS WERE NOT MISSING FROM THE UI, THEY WERE MISSING FROM THE CARD. Each week row carried
   * the string `"4 sessions"` — a count, composed for display — and nothing else, so there was nothing
   * for a row to open onto. This asserts the card CARRIES them, which is the half that was absent.
   */
  const r = runBuildPath({ ...WEEK_ATHLETE, weeks: 8 }, 'program');
  assert.equal(r.outcome, 'built');
  assert.equal(r.card.weeks.length, 8, 'one row per week');

  for (const w of r.card.weeks) {
    assert.ok(w.days.length > 0, `${w.label} has no sessions to open onto`);
    for (const d of w.days) {
      assert.ok(d.title?.trim(), `${w.label} has a session with no name`);
      assert.ok(d.marker?.trim(), `${w.label} has a session with no marker`);
    }
    /* ⚠ THE ROW AND THE DRAWER MUST AGREE. "5 sessions" over a list of four is the card contradicting
       itself in the space of one tap — and weeks genuinely differ in length in a real block. */
    assert.match(w.detail, new RegExp(`^${w.days.length} session`), `${w.label}: "${w.detail}" over ${w.days.length} days`);
  }
});

test('⚠ and each of those sessions carries the movements in it, not just its name', () => {
  /*
   * PO, 2026-08-16, looking at Preview program: *"It shows the weeks, but I need to be able to see the
   * days and what's within the days."*
   *
   * ⚠ THE SAME DEFECT AS THE TEST ABOVE, ONE LAYER DOWN. That one made `days` real and stopped there,
   * so a session was a marker and a title — enough to NAME a session, not enough to describe one — and
   * `PlanPreview` had nothing to draw under a week no matter what the UI did. The assertion above passes
   * on a card with no exercise anywhere in it, which is exactly the card that shipped.
   */
  const r = runBuildPath({ ...WEEK_ATHLETE, weeks: 8 }, 'program');
  assert.equal(r.outcome, 'built');

  for (const w of r.card.weeks) {
    for (const d of w.days) {
      assert.ok(d.items.length > 0, `${w.label} · ${d.title} prescribes nothing`);
      for (const it of d.items) {
        assert.ok(it.name?.trim(), `${w.label} · ${d.title} has a movement with no name`);
        assert.equal(typeof it.scheme, 'string', `${w.label} · ${d.title} · ${it.name} has no scheme field`);
      }
      /* A day whose every row is nameless-and-schemeless would satisfy the loop above trivially. At
         least one real prescription per session is the thing the athlete came here to read. */
      assert.ok(d.items.some((it) => it.scheme.trim()), `${w.label} · ${d.title}: not one stated prescription`);
    }
  }
});

test('⚠ the preview states a rep RANGE, because it reads the canonical renderer', () => {
  /*
   * `chat-core` carries its own `prescriptionText` for the single-day card and it cannot see `repsMax`,
   * so every range it renders loses its top: what Holt authored as `3 × 8-12` reaches the athlete as
   * `3 × 8`. That is not a formatting nit — it is `50a22de` exactly ("rep ranges were authored and
   * thrown away"), and the drawer would have reintroduced it on a brand-new surface.
   *
   * ⚠ THIS IS A REUSE ASSERTION, AND IT WAS MEASURED RATHER THAN ASSUMED. The first version pinned a
   * LADDER — a shape Holt never authors — so it passed under both renderers and proved nothing. Dumping
   * the real block's distinct schemes under each is what showed where they actually diverge:
   *
   *   schemeText        4 × 3-5 · 3 × 8-12 · 3 × 10-12 · 4 × 6-8 · 4 × 8
   *   prescriptionText  4 × 3   · 3 × 8    · 3 × 10    · 4 × 6   · 4 × 8
   *
   * So the claim is that ranges EXIST in the output — the one thing the flattened helper cannot produce
   * for any block, mutation-tested against it.
   */
  const r = runBuildPath({ ...WEEK_ATHLETE, weeks: 8 }, 'program');
  const schemes = r.card.weeks.flatMap((w) => w.days.flatMap((d) => d.items.map((it) => it.scheme)));

  assert.ok(
    schemes.some((s) => /\d+\s*-\s*\d+/.test(s)),
    `not one prescription states a range — every top has been dropped. Saw: ${[...new Set(schemes)].join(', ')}`,
  );
  // And nothing may fall back to a bare set count with the reps dropped altogether.
  for (const s of schemes) assert.doesNotMatch(s, /^\d+ sets$/, `"${s}" states sets and refuses to state reps`);
});

test('⚠ main is the whole session — a warm-up Holt started authoring would vanish from the preview', () => {
  /*
   * `daysOfWeek` lists `d.main` only, which omits nothing TODAY because `assemble.ts` writes
   * `warmup: []` and `cooldown: []` on every day it builds. That is an assumption about another file,
   * and the day it stops being true the preview starts lying by omission with every gate green.
   */
  const r = runBuildPath({ ...WEEK_ATHLETE, weeks: 8 }, 'program');
  for (const wp of r.structure.weekPlans) {
    for (const d of wp.days) {
      assert.deepEqual(d.warmup, [], `${d.name} authored a warm-up the preview does not show`);
      assert.deepEqual(d.cooldown, [], `${d.name} authored a cool-down the preview does not show`);
    }
  }
});

test('a card built without a real structure offers no drawer rather than an invented one', () => {
  // Several callers hand over a bare `{name, weeks, daysPerWeek}`. Filling that with `daysPerWeek` rows
  // of "Session 1" would be the card describing a shape nobody built.
  const bare = programCardFor(
    { ...WEEK_ATHLETE, excludeExercises: [], raceDate: null, currentWeeklyMi: null, canRunContinuously: null },
    { name: 'Bare', weeks: 3, daysPerWeek: 4 },
    [],
    'because',
  );
  for (const w of bare.weeks) assert.deepEqual(w.days, []);
  assert.match(bare.weeks[0].detail, /^4 sessions/, 'and it falls back to the configured count for the row');
});

test('a build that was never asked its length still gets the engine default', () => {
  /*
   * `null` and absent both mean "nobody chose", and `assemble` reads `c.weeks ?? defaultWeeksFor(goal)`.
   * The block must NOT collapse to one just because the field is now carried through `completeFor` —
   * that is the half of the original fix a test on `weeks: 1` alone cannot see, and it still matters for
   * every path that does not go through the chat.
   */
  const block = runBuildPath({ ...WEEK_ATHLETE, weeks: null }, 'program');
  assert.equal(block.outcome, 'built');
  assert.ok(block.structure.weeks > 1, `an unanswered length built ${block.structure.weeks} weeks`);

  /* ⚠ AND `undefined` IS NOT THE SAME AS `null` HERE, WHICH IS THE POINT OF THE GUARD IN `askProgram`.
     Absent means nobody has been asked yet, so the CHAT asks; `null` means asked-and-declined, or a
     build that arrived from somewhere with no length to state, and the ENGINE fills it in. Collapsing
     the two would either ask twice or never ask at all. */
  assert.equal(runBuildPath({ ...WEEK_ATHLETE, weeks: undefined }, 'program').outcome, 'asked');
});

test('⚠ a one-week block anchors mid-range rather than opening a mesocycle it has no room for', () => {
  /*
   * `short-block.test.mjs` proves the rulebook does this. This proves the CHAT reaches it: week 1 of a
   * twelve-week block is the lightest week of a ramp, and handing an athlete who asked for one week the
   * opening rung of a progression that is never going to happen is the wrong week entirely.
   */
  const week = runBuildPath({ ...WEEK_ATHLETE, weeks: 1 }, 'program');
  const twelve = runBuildPath({ ...WEEK_ATHLETE, weeks: 12 }, 'program');
  const repsOf = (r) => JSON.stringify(r.structure.weeks_ ?? r.structure).match(/"reps":\s*(\d+)/g) ?? [];
  const one = repsOf(week);
  const many = repsOf(twelve);
  // Preconditions, so the comparison below cannot pass by both sides being empty.
  assert.ok(one.length > 0, 'the one-week block prescribed nothing');
  assert.ok(many.length > one.length, 'the twelve-week block should carry far more prescriptions');
  assert.notDeepEqual(one, many.slice(0, one.length), 'a one-week block is not week one of twelve');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ A SHOULDER DAY — reported by the PO, 2026-08-12
// ─────────────────────────────────────────────────────────────────────────────

test('Holt can be asked for a shoulders-only day', () => {
  /* The engine always could: `day.ts` carries `shoulders` as a standalone BodyPart over four
     deltoid/cuff muscles, and 63 catalogue exercises name one of them as a PRIMARY mover. The chat
     simply never offered it — "Shoulders & arms" was the only chip that mentioned them. */
  const q = nextQuestion({}, 'day');
  assert.equal(q.id, 'day_focus');
  const shoulders = q.chips.find((c) => c.focus?.kind === 'part' && c.focus.part === 'shoulders');
  assert.ok(shoulders, 'no pill asks for shoulders');
  assert.deepEqual(mergeFocus([shoulders.focus]), { kind: 'body_parts', parts: ['shoulders'] }, 'on its own it is a delt day');
});

test('…and the paired shoulders-and-arms day survives the pairs being deleted', () => {
  /*
   * ⚠ **THIS TEST CHANGED BECAUSE THE PRODUCT DID** (PO, 2026-08-14: the focus pills are the parts now,
   * and you pick as many as you want). "Shoulders & arms" was a single chip; it is three taps.
   *
   * The property it was written to protect is untouched and is what is asserted: a delt-only session
   * and a delts-plus-arms session are DIFFERENT DAYS, because they divide a fixed exercise budget very
   * differently — so both must still be askable.
   */
  const q = nextQuestion({}, 'day');
  const pick = (part) => q.chips.find((c) => c.focus?.kind === 'part' && c.focus.part === part)?.focus;
  const paired = mergeFocus([pick('shoulders'), pick('biceps'), pick('triceps')]);
  assert.deepEqual(paired, { kind: 'body_parts', parts: ['shoulders', 'biceps', 'triceps'] });
});
