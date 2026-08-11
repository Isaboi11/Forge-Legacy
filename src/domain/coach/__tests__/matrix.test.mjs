/**
 * matrix.test.mjs — every athlete the coach claims to serve, against the real 733-exercise catalogue.
 *
 * ══ WHY THIS IS THE TEST THAT MATTERS ══
 *
 * The engine's whole promise is that one set of tables serves every combination of goal, experience,
 * schedule, room and injury. A promise like that cannot be spot-checked: the failure mode is not "the
 * code crashes", it is "the 6-day bodyweight plan for someone with a bad shoulder is quietly garbage",
 * and nobody finds that by trying three cases by hand.
 *
 * So this runs the whole cross-product and puts every result through the same three gates the app will.
 * Because the engine is pure functions over injected data, ~1,800 programs build and validate in under a
 * second — which is the entire payoff of having built it that way.
 *
 * ⚠ IT USES THE REAL CATALOGUE, NOT FIXTURES. `candidates.test.mjs` uses a hand-written pool to test the
 * selection LOGIC in isolation. This one loads the actual dataset, because the question here is different:
 * does the rulebook survive contact with the exercises that really exist? A pattern with three entries,
 * all of them advanced and all needing a machine, is invisible to a fixture and fatal to a real athlete.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/matrix.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { STRENGTH_GOALS } from '../constraints.ts';
import { assemble } from '../assemble.ts';
import { validateProgram } from '../validate-program.ts';
import { AUTHORED_GOALS, defaultWeeksFor, stylesForDays } from '../rulebook/skeletons.ts';

import { GOAL_CATEGORY } from '../rulebook/volume.ts';
import { PATTERN_PREFERENCES } from '../rulebook/preferences.ts';
import { buildDayWorkout, BODY_PARTS, SPLITS } from '../day.ts';

/*
 * ⚠ THIS MATRIX COVERS THE STRENGTH MACHINE ONLY, AND THAT IS NOT A GAP.
 *
 * `AUTHORED_GOALS` now includes the five endurance goals, which do not have a weekly split, a room, or a
 * limitation set — they have a race date, a starting mileage, and a volume curve. Running them through
 * `constraintsFor` produces a constraint set with no race date, which is correctly refused, and the
 * refusal then reads here as a failure of the strength rulebook.
 *
 * Their matrix is `endurance.test.mjs`, which asserts the properties that actually matter for a race
 * plan — the caps, the taper, the long run reaching a distance that could finish the race.
 */
const SPLIT_GOALS = AUTHORED_GOALS.filter((g) => STRENGTH_GOALS.includes(g));

// ─────────────────────────────────────────────────────────────────────────────
// THE REAL CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) =>
  JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

const KNOWN = new Set(POOL.map((e) => e.key));
const PATTERN_OF = new Map(POOL.map((e) => [e.key, e.pattern]));
const patternOf = (k) => PATTERN_OF.get(k);

test('the pool is the visible catalogue, not the raw file', () => {
  // The file holds 797; the app withholds some (advanced gymnastics, per the PO decision in catalog-core).
  // If this ever equals the file count, the withholding has been lost and the coach can prescribe
  // movements nobody can open.
  const raw = src('exercises.json').length;
  assert.ok(POOL.length > 700, `expected the visible catalogue, got ${POOL.length}`);
  assert.ok(POOL.length < raw, `the pool (${POOL.length}) must be smaller than the file (${raw})`);
});

/**
 * ⚠ THE TEST THAT KEEPS `preferences.ts` HONEST.
 *
 * A preference list is the only place in the engine where a typo does *nothing at all*, silently: an
 * unknown key simply never matches, the rank stays `Infinity`, and the ranker falls back to the old
 * alphabetical behaviour that produced band good-mornings in a full gym. Nothing errors, nothing logs,
 * and the file looks correct. So both halves are asserted — the key exists, and it carries the pattern it
 * is filed under.
 */
test('every preferred exercise exists and is filed under the pattern it claims', () => {
  const wrong = [];
  for (const [pattern, keys] of Object.entries(PATTERN_PREFERENCES)) {
    for (const key of keys) {
      if (!KNOWN.has(key)) {
        wrong.push(`${pattern}: "${key}" is not in the visible catalogue`);
      } else if (patternOf(key) !== pattern) {
        wrong.push(`${pattern}: "${key}" is actually ${patternOf(key)}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `preference lists are out of sync with the catalogue:\n  ${wrong.join('\n  ')}`);
});

test('a full gym reaches for the barbell, not whatever sorts first', () => {
  // The regression this file exists for. Every one of these was wrong before `preferences.ts`.
  const res = build(constraintsFor('strength', 'intermediate', 4, 'full_gym', 'none'));
  assert.ok(res.ok);
  const keys = new Set(
    res.assembly.structure.weekPlans[0].days.flatMap((d) => d.main.map((e) => e.catalogKey)),
  );
  assert.ok(keys.has('barbell-bench-press'), 'a horizontal push at a full gym is a bench press');
  assert.ok(keys.has('barbell-back-squat'), 'a squat pattern at a full gym is a back squat');
  assert.ok(keys.has('barbell-deadlift'), 'a hinge at a full gym is a deadlift');
});

test('a built program tells you how to lift it, not just how much', () => {
  /*
   * The wiring, not the table — `cues.test.mjs` owns the rules. This asserts the cue actually survives
   * onto a real prescription, because a rulebook nothing reads is the failure this repo keeps shipping.
   */
  const res = build(constraintsFor('muscle', 'intermediate', 4, 'full_gym', 'none'));
  assert.ok(res.ok);
  const day = res.assembly.structure.weekPlans[0].days[0];

  assert.ok(day.main[0].coachNote, 'the opening lift must carry the intent of the block');
  assert.match(day.main[0].coachNote, /three seconds down/i, 'a muscle block prescribes the eccentric');

  // ⚠ And a strength block must NOT. Slowing a heavy set down makes it a worse set, confidently.
  const strong = build(constraintsFor('strength', 'intermediate', 4, 'full_gym', 'none'));
  assert.ok(strong.ok);
  assert.doesNotMatch(strong.assembly.structure.weekPlans[0].days[0].main[0].coachNote ?? '', /seconds down/i);
});

test('a dumbbell room reaches for the dumbbell version of the same movement', () => {
  const keysFor = (owned) => {
    const res = build({
      ...constraintsFor('muscle', 'intermediate', 3, 'home', 'none'),
      ownedEquipment: owned,
    });
    assert.ok(res.ok, res.ok ? '' : res.refusal.message);
    return new Set(res.assembly.structure.weekPlans[0].days.flatMap((d) => d.main.map((e) => e.catalogKey)));
  };

  const noBench = keysFor(['dumbbells']);
  assert.ok(noBench.has('dumbbell-goblet-squat'), 'a squat with dumbbells is a goblet squat');
  assert.ok(noBench.has('dumbbell-romanian-deadlift'));
  // ⚠ NOT a dumbbell bench press, and that is right: `NEEDS_BENCH` composes a bench onto the load
  // requirement, so someone with dumbbells and a floor genuinely cannot do one. A push-up is the honest
  // horizontal push here — the preference list falls through to it rather than prescribing furniture.
  assert.ok(!noBench.has('dumbbell-bench-press'));
  assert.ok(noBench.has('push-up'));

  // Add the bench and the same slot upgrades. This is the equipment gate and the preference list working
  // together, which is the whole mechanism in one assertion.
  const withBench = keysFor(['dumbbells', 'bench']);
  assert.ok(withBench.has('dumbbell-bench-press'), 'a bench turns the push-up back into a press');
});

// ─────────────────────────────────────────────────────────────────────────────
// LIMITED EQUIPMENT — the middle ground the wizard's fourth option exists for
//
// A garage with three things in it is neither a full gym nor a bare floor, and it is the commonest real
// answer. The wizard lets the athlete name their gear item by item; these assert that naming it changes
// what gets built, in both directions — an odd room still produces a real program, and a room that was
// named as empty degrades honestly instead of quietly inventing equipment.
// ─────────────────────────────────────────────────────────────────────────────

const roomOf = (owned) => ({
  goal: 'muscle',
  experience: { lifting: 'intermediate', running: 'intermediate' },
  daysPerWeek: 3,
  sessionMinutes: 60,
  environment: 'home',
  ownedEquipment: owned,
  limitations: [],
  excludeExercises: [],
});

const keysOf = (res) =>
  new Set(res.assembly.structure.weekPlans[0].days.flatMap((d) => d.main.map((e) => e.catalogKey)));

test('a named room builds around exactly what is in it', () => {
  // Kettlebells, a pull-up bar and a mat — a real garage, and none of the combinations the ROOMS table
  // above happens to cover.
  const res = build(roomOf(['kettlebells', 'pullup', 'mat']));
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);

  const keys = [...keysOf(res)];
  assert.ok(keys.length > 0, 'a room with three useful things in it must produce a program');

  // The gate is the assertion: every prescribed movement must be doable with what was named. This is the
  // whole promise of the option — 'tell me what you have' is worthless if the plan then asks for a rack.
  const undoable = keys.filter((k) => {
    const ex = POOL.find((e) => e.key === k);
    return ex && !canDoExercise(ex, ['kettlebells', 'pullup', 'mat']);
  });
  assert.deepEqual(undoable, [], 'nothing may be prescribed that the named gear cannot do');
});

test('naming a piece of gear changes the program', () => {
  // The same room, plus a barbell and a rack. If the picker did nothing, these would be identical.
  const without = keysOf(build(roomOf(['dumbbells', 'bench'])));
  const withBar = build(roomOf(['dumbbells', 'bench', 'barbell', 'plates', 'rack']));
  assert.ok(withBar.ok, withBar.ok ? '' : withBar.refusal.message);
  const keys = keysOf(withBar);

  assert.notDeepEqual([...keys].sort(), [...without].sort(), 'adding a barbell must change something');
  assert.ok(keys.has('barbell-back-squat'), 'a rack and a bar means the squat is a back squat again');
});

test('a fan bike is the machine in the room when running is off the table', () => {
  // Outdoor running needs nothing and is first in the table, so it wins for almost everybody — the gear
  // list only decides the cardio bout once running is banned. That is the case worth asserting: sore knees
  // plus a fan bike should produce a ride, and before `airbike` was in the table it produced a WALK,
  // because the only id the cardio options knew was 'bike'.
  const boutsFor = (owned) => {
    const res = build({ ...roomOf(owned), goal: 'conditioning', limitations: ['no_running'] });
    assert.ok(res.ok, res.ok ? '' : res.refusal.message);
    return res.assembly.structure.weekPlans[0].days.flatMap((d) => d.main).filter((e) => e.kind === 'cardio');
  };

  const bouts = boutsFor(['airbike', 'mat']);
  assert.ok(bouts.length > 0, 'a conditioning block must contain conditioning');
  assert.deepEqual(
    [...new Set(bouts.map((b) => b.activity))],
    ['bike'],
    'the fan bike is the machine they own — walking past it is not a prescription',
  );

  // And with nothing at all, a walk is still the honest answer rather than a refusal.
  assert.deepEqual([...new Set(boutsFor([]).map((b) => b.activity))], ['walk']);
});

test('a room named as empty is bodyweight, not a refusal and not a lie', () => {
  // `[]` here is the athlete having answered — 'I told you, and it is nothing' — which is a different
  // thing from never having been asked. The engine must treat it as the floor, and still build.
  const res = build(roomOf([]));
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);

  const keys = [...keysOf(res)];
  assert.ok(keys.length > 0, 'someone with nothing can still train');
  const needsGear = keys.filter((k) => {
    const ex = POOL.find((e) => e.key === k);
    return ex && !canDoExercise(ex, []);
  });
  assert.deepEqual(needsGear, [], 'an empty room may only be prescribed bodyweight work');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE AXES
// ─────────────────────────────────────────────────────────────────────────────

const ROOMS = {
  full_gym: { environment: 'full_gym', ownedEquipment: [] },
  home: { environment: 'home', ownedEquipment: ['dumbbells', 'bench', 'pullup', 'bands', 'mat'] },
  dumbbells_only: { environment: 'home', ownedEquipment: ['dumbbells'] },
  bodyweight: { environment: 'bodyweight', ownedEquipment: [] },
};

const LIMITATION_SETS = {
  none: [],
  shoulders: ['shoulders'],
  knees: ['knees'],
  lower_back: ['lower_back'],
  no_barbell: ['no_barbell'],
  everything: ['shoulders', 'knees', 'lower_back', 'no_jumping', 'no_overhead', 'no_barbell', 'no_running'],
};

const EXPERIENCES = ['beginner', 'intermediate', 'advanced'];
const DAYS = [2, 3, 4, 5, 6];
const SESSIONS = [30, 45, 60, 75];

const constraintsFor = (goal, experience, daysPerWeek, room, limitations, sessionMinutes = 60) => ({
  goal,
  experience: { lifting: experience, running: experience },
  daysPerWeek,
  sessionMinutes,
  environment: ROOMS[room].environment,
  ownedEquipment: ROOMS[room].ownedEquipment,
  limitations: LIMITATION_SETS[limitations],
  excludeExercises: [],
});

const build = (c) => assemble(c, POOL, canDoExercise);

const validate = (structure, goal) =>
  validateProgram(structure, { knownKeys: KNOWN, patternOf, category: GOAL_CATEGORY[goal] });

// ─────────────────────────────────────────────────────────────────────────────
// THE MATRIX
// ─────────────────────────────────────────────────────────────────────────────

test('every authored goal × experience × schedule × room × limitation builds a valid program', () => {
  const refusals = [];
  const broken = [];
  let built = 0;

  for (const goal of SPLIT_GOALS) {
    for (const experience of EXPERIENCES) {
      for (const daysPerWeek of DAYS) {
        for (const room of Object.keys(ROOMS)) {
          for (const limitations of Object.keys(LIMITATION_SETS)) {
            const c = constraintsFor(goal, experience, daysPerWeek, room, limitations);
            const res = build(c);

            if (!res.ok) {
              refusals.push({ goal, experience, daysPerWeek, room, limitations, reason: res.refusal.reason });
              continue;
            }

            built++;
            const v = validate(res.assembly.structure, goal);
            if (!v.ok) {
              broken.push({
                where: `${goal}/${experience}/${daysPerWeek}d/${room}/${limitations}`,
                // First three is enough to diagnose; the whole list would bury the signal.
                failures: v.failures.slice(0, 3).map((f) => `${f.code}: ${f.message}`),
              });
            }
          }
        }
      }
    }
  }

  assert.ok(built > 0, 'nothing built at all');
  assert.deepEqual(
    broken,
    [],
    `${broken.length} of ${built + refusals.length} combinations produced an invalid program:\n` +
      broken
        .slice(0, 12)
        .map((b) => `  ${b.where}\n    ${b.failures.join('\n    ')}`)
        .join('\n'),
  );

  // A refusal is a legitimate outcome, but only for reasons we can name. An unexpected one means the
  // engine is quietly declining to serve someone it claims to serve.
  const unexpected = refusals.filter((r) => r.reason !== 'not_enough_equipment');
  assert.deepEqual(unexpected, [], 'every refusal must be about the room, not the goal');
});

test('a refusal only ever happens in a room that genuinely cannot support the plan', () => {
  const refused = [];
  for (const goal of SPLIT_GOALS) {
    for (const daysPerWeek of DAYS) {
      for (const room of Object.keys(ROOMS)) {
        const res = build(constraintsFor(goal, 'intermediate', daysPerWeek, room, 'none'));
        if (!res.ok) refused.push(`${goal}/${daysPerWeek}d/${room}`);
      }
    }
  }
  // A full gym and a normal home gym must always work. If either ever refuses, the rulebook has asked
  // for something the catalogue cannot express.
  const shouldNeverRefuse = refused.filter((r) => r.includes('full_gym') || r.includes('/home'));
  assert.deepEqual(shouldNeverRefuse, [], 'a full gym and a furnished home gym must always be servable');
});

test('every session length produces something trainable', () => {
  for (const sessionMinutes of SESSIONS) {
    for (const goal of SPLIT_GOALS) {
      const res = build(constraintsFor(goal, 'intermediate', 4, 'full_gym', 'none', sessionMinutes));
      assert.ok(res.ok, `${goal} at ${sessionMinutes} minutes refused`);
      const v = validate(res.assembly.structure, goal);
      assert.ok(v.ok, `${goal} at ${sessionMinutes} minutes: ${v.failures.map((f) => f.code).join(', ')}`);
      // A 30-minute session must actually be shorter, or the question was cosmetic.
      const day = res.assembly.structure.weekPlans[0].days[0];
      assert.ok(day.main.length > 0);
    }
  }

  const short = build(constraintsFor('strength', 'intermediate', 4, 'full_gym', 'none', 30));
  const long = build(constraintsFor('strength', 'intermediate', 4, 'full_gym', 'none', 75));
  assert.ok(
    short.assembly.structure.weekPlans[0].days[0].main.length <
      long.assembly.structure.weekPlans[0].days[0].main.length,
    'a 30-minute session must prescribe fewer movements than a 75-minute one',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISM
// ─────────────────────────────────────────────────────────────────────────────

test('the same answers produce the same program, every time', () => {
  const c = constraintsFor('muscle', 'intermediate', 4, 'home', 'shoulders');
  const a = build(c);
  const b = build(c);
  assert.deepEqual(a.assembly.structure, b.assembly.structure);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE THINGS THAT MUST BE REFUSED
// ─────────────────────────────────────────────────────────────────────────────

test('a running goal now BUILDS, and refuses only when it should', () => {
  /*
   * This test used to assert the opposite — that every running goal was refused because its rulebook was
   * unwritten. It is kept, inverted, rather than deleted: the refusal was a real product decision for as
   * long as it stood (better a plain no than a marathon plan written from memory), and the thing worth
   * guarding now is that the no became a yes for the right reason.
   *
   * The rulebook is `rulebook/endurance.ts`; the plans it produces are asserted in `endurance.test.mjs`.
   */
  const withRace = {
    ...constraintsFor('strength', 'intermediate', 5, 'full_gym', 'none'),
    goal: 'run_marathon',
    raceDate: '2027-06-05',
    currentWeeklyMi: 20,
    canRunContinuously: true,
  };
  const res = build(withRace);
  assert.ok(res.ok, res.ok ? '' : `a marathon with time and a base must build: ${res.refusal.message}`);
  assert.match(res.assembly.structure.name, /Marathon/i);

  // And the refusal that remains is about time and base, not about the rulebook being missing.
  const rushed = build({ ...withRace, raceDate: '2026-09-06' });
  assert.equal(rushed.ok, false);
  assert.match(rushed.refusal.message, /half marathon/i, 'a refusal still has to offer the alternative');
});

test('a running goal for someone who cannot run is a contradiction, not a puzzle', () => {
  const res = build({
    ...constraintsFor('strength', 'intermediate', 4, 'full_gym', 'no_barbell'),
    goal: 'run_5k',
    limitations: ['no_running'],
  });
  assert.equal(res.ok, false);
  // Ordering matters: an unauthored goal is reported first, since that is the more useful truth today.
  assert.ok(['goal_not_authored', 'limitation_conflicts_with_goal'].includes(res.refusal.reason));
});

// ─────────────────────────────────────────────────────────────────────────────
// DELOADS — PAS-D7 and PAS-D8
// ─────────────────────────────────────────────────────────────────────────────

test('an 8-week program deloads at week 7 and says so in the name', () => {
  const res = build(constraintsFor('strength', 'intermediate', 4, 'full_gym', 'none'));
  assert.ok(res.ok);
  const { structure, deloadWeeks } = res.assembly;
  assert.equal(structure.weeks, defaultWeeksFor('strength'));
  assert.deepEqual(deloadWeeks, [6], 'PAS-D7: 7–10 weeks deloads at the penultimate week');

  for (const day of structure.weekPlans[6].days) {
    assert.match(day.name, /\[DELOAD\]/, 'PAS-D8 (1): the marker is the encoding');
  }
  for (const day of structure.weekPlans[5].days) {
    assert.ok(!day.name.includes('[DELOAD]'));
  }
});

test('a deload is actually lighter than the week before it', () => {
  const res = build(constraintsFor('muscle', 'advanced', 4, 'full_gym', 'none'));
  const setsIn = (w) =>
    res.assembly.structure.weekPlans[w].days.reduce(
      (n, d) => n + d.main.reduce((m, e) => m + (e.sets ?? 0), 0),
      0,
    );
  assert.ok(setsIn(6) < setsIn(5), 'PAS-D8 (2): primary compound sets cut 40–50%');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE ROOM ACTUALLY CHANGES THE PLAN
// ─────────────────────────────────────────────────────────────────────────────

test('a bodyweight athlete gets bodyweight movements, not a barbell program with the barbell removed', () => {
  const res = build(constraintsFor('strength', 'beginner', 3, 'bodyweight', 'none'));
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  const keys = res.assembly.structure.weekPlans[0].days.flatMap((d) => d.main.map((e) => e.catalogKey));
  for (const k of keys) {
    if (!k) continue;
    const ex = POOL.find((e) => e.key === k);
    assert.ok(canDoExercise(ex, []), `${k} needs equipment a bodyweight athlete does not have`);
  }
});

test('a limitation removes its movements from the finished program, not just from the candidate list', () => {
  const res = build(constraintsFor('muscle', 'intermediate', 4, 'full_gym', 'shoulders'));
  assert.ok(res.ok);
  const patterns = res.assembly.structure.weekPlans
    .flatMap((w) => w.days)
    .flatMap((d) => d.main.map((e) => (e.catalogKey ? patternOf(e.catalogKey) : null)));
  assert.ok(!patterns.includes('Vertical Push'), 'overhead pressing must not survive anywhere in the block');
  assert.ok(!patterns.includes('Shoulder Isolation'));
});

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE-DAY WORKOUTS
// ─────────────────────────────────────────────────────────────────────────────

const dayFor = (over = {}) =>
  buildDayWorkout(
    {
      focus: { kind: 'split', split: 'push' },
      sessionMinutes: 60,
      experience: 'intermediate',
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
      ...over,
    },
    POOL,
    canDoExercise,
  );

test('every split and every body part produces a workout at a full gym', () => {
  const empty = [];
  for (const split of SPLITS) {
    const r = dayFor({ focus: { kind: 'split', split } });
    if (r.day.main.length === 0) empty.push(`split:${split}`);
  }
  for (const part of BODY_PARTS) {
    const r = dayFor({ focus: { kind: 'body_parts', parts: [part] } });
    if (r.day.main.length === 0) empty.push(`part:${part}`);
    if (r.missing.length > 0) empty.push(`part:${part} missing ${r.missing.join('/')}`);
  }
  assert.deepEqual(empty, [], 'a full gym must be able to train anything the wizard offers');
});

/**
 * ⚠ THE REGRESSION THIS EXISTS FOR. "Chest and arms" opened with a *Barbell Front Rack Carry* and "back"
 * with a *Barbell Clean* — both genuinely list those muscles as primary movers, and both are answers to a
 * question nobody asked. A body-part day now leads with the canonical movement for the muscle.
 */
test('a body-part day opens with the movement that body part is actually trained with', () => {
  const chest = dayFor({ focus: { kind: 'body_parts', parts: ['chest'] } });
  assert.equal(chest.day.main[0].catalogKey, 'barbell-bench-press');

  const back = dayFor({ focus: { kind: 'body_parts', parts: ['back'] } });
  assert.equal(back.day.main[0].catalogKey, 'barbell-bent-over-row');

  const legs = dayFor({ focus: { kind: 'body_parts', parts: ['legs'] } });
  assert.ok(['barbell-back-squat', 'barbell-deadlift'].includes(legs.day.main[0].catalogKey));
});

test('a chest day is chest, not everything that happens to involve the chest', () => {
  const r = dayFor({ focus: { kind: 'body_parts', parts: ['chest'] } });
  const chestMovers = r.day.main.filter((e) => {
    const ex = POOL.find((p) => p.key === e.catalogKey);
    return ex?.primaryMuscleIds.includes('chest');
  });
  assert.ok(chestMovers.length >= 3, 'a chest day made of movements that merely involve the chest is the commonest way this goes wrong');
});

test('a body-part day spreads across movements rather than repeating one', () => {
  // Chest + triceps must not be four bench variants, and must not be four pushdowns either.
  const r = dayFor({ focus: { kind: 'body_parts', parts: ['chest', 'triceps'] } });
  const patterns = r.day.main.map((e) => patternOf(e.catalogKey));
  assert.ok(new Set(patterns).size >= 2, `only ${new Set(patterns).size} distinct movements: ${patterns.join(', ')}`);
});

/**
 * Biceps and triceps are separate chips, not one "Arms".
 *
 * Nobody trains "arms" — they train chest and triceps, or back and biceps. When the two were collapsed,
 * an athlete asking for a chest-and-triceps day got curls they never asked for.
 */
test('asking for triceps does not get you biceps work', () => {
  const r = dayFor({ focus: { kind: 'body_parts', parts: ['chest', 'triceps'] } });
  const movers = r.day.main.flatMap((e) => POOL.find((p) => p.key === e.catalogKey)?.primaryMuscleIds ?? []);
  assert.ok(movers.includes('triceps'), 'triceps were asked for');
  assert.ok(!movers.includes('biceps'), 'and biceps were not');
});

test('back and biceps is a real pairing', () => {
  const r = dayFor({ focus: { kind: 'body_parts', parts: ['back', 'biceps'] } });
  const movers = r.day.main.flatMap((e) => POOL.find((p) => p.key === e.catalogKey)?.primaryMuscleIds ?? []);
  assert.ok(movers.includes('lats') || movers.includes('upper_back'));
  assert.ok(movers.includes('biceps'));
});

// ─────────────────────────────────────────────────────────────────────────────
// HOLT RESTRUCTURES RATHER THAN LYING ABOUT A DAY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ THE REPORTED BUG, AND THE MOST IMPORTANT TEST IN THIS FILE.
 *
 * A bodyweight athlete asked for a body-part split and got a "Back & Biceps" day containing a Sliding
 * Hamstring Curl and a Plank. With no bar there is no pulling pattern at all, so the day filled itself
 * with whatever it could still reach — and kept the name. It was not a thin back day; it was not a back
 * day, while saying it was, which the athlete has no way to detect.
 *
 * A day that cannot be honest about itself means the SPLIT is wrong for the room. Holt changes it and
 * says so.
 */
test('a split the room cannot support is restructured, not faked', () => {
  const res = build({
    ...constraintsFor('muscle', 'intermediate', 4, 'bodyweight', 'none'),
    splitStyle: 'body_part',
  });
  assert.ok(res.ok);

  const names = res.assembly.structure.weekPlans[0].days.map((d) => d.name);
  assert.ok(!names.some((n) => /Back & Biceps/.test(n)), 'a back day with no pulling equipment must not exist');
  assert.ok(names.every((n) => /Full Body/.test(n)), 'full body is the honest fallback');

  assert.ok(res.assembly.restructured, 'and the athlete is told');
  assert.match(res.assembly.restructured.because, /equipment you haven't got/i);
});

test('a split the room CAN support is left alone', () => {
  const res = build({
    ...constraintsFor('muscle', 'intermediate', 5, 'full_gym', 'none'),
    splitStyle: 'body_part',
  });
  assert.ok(res.ok);
  assert.equal(res.assembly.restructured, undefined, 'a full gym needs no rescuing');
  assert.equal(res.assembly.structure.weekPlans[0].days[1].name, 'Back & Biceps');
});

test('restructuring a conditioning block does not delete the conditioning', () => {
  // Holt changed the split and briefly took the cardio with it, which is a different lie in the same
  // shape: a conditioning block whose days contain no conditioning.
  const res = build({
    ...constraintsFor('conditioning', 'intermediate', 4, 'bodyweight', 'none'),
    splitStyle: 'body_part',
  });
  assert.ok(res.ok);
  assert.ok(res.assembly.restructured);
  for (const day of res.assembly.structure.weekPlans[0].days) {
    assert.ok(day.main.some((e) => e.kind === 'cardio'), `${day.name} lost its cardio`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// A PATTERN'S TAG IS NOT ITS MEANING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The catalogue files twelve leg curls under `Elbow Flexion` — `nordic-hamstring-curl`,
 * `lying-leg-curl-machine`, `band-leg-curl` and the rest — almost certainly because the word "curl" drove
 * the tagging. Every one lists `hamstrings` as its primary mover. That is how a hamstring curl became
 * somebody's biceps work.
 */
test('a leg curl is never prescribed as biceps work', () => {
  const legCurls = POOL.filter(
    (e) => e.pattern === 'Elbow Flexion' && e.primaryMuscleIds.includes('hamstrings'),
  ).map((e) => e.key);
  assert.ok(legCurls.length > 0, 'the misfiling still exists in the catalogue — this test is still needed');

  const res = build({ ...constraintsFor('muscle', 'intermediate', 4, 'full_gym', 'none') });
  const used = new Set(
    res.assembly.structure.weekPlans.flatMap((w) => w.days).flatMap((d) => d.main.map((e) => e.catalogKey)),
  );
  for (const k of legCurls) assert.ok(!used.has(k), `${k} was prescribed as an arm movement`);
});

test('a stretch is never prescribed for sets and reps', () => {
  const res = build({ ...constraintsFor('muscle', 'beginner', 3, 'bodyweight', 'none') });
  assert.ok(res.ok);
  for (const day of res.assembly.structure.weekPlans[0].days) {
    for (const e of day.main) {
      if (!e.catalogKey) continue;
      const item = POOL.find((p) => p.key === e.catalogKey);
      assert.notEqual(item?.modality, 'Mobility', `${e.catalogKey} is a mobility movement in a strength slot`);
    }
  }
});

test('a repeated full-body day is not lettered twice', () => {
  // Full-body weeks are authored A/B/C and a four-day week is [A, B, C, A]. The repeat used to be
  // re-lettered and came out as "Full Body A A".
  const res = build({ ...constraintsFor('strength', 'intermediate', 4, 'full_gym', 'none'), splitStyle: 'full_body' });
  assert.ok(res.ok);
  for (const d of res.assembly.structure.weekPlans[0].days) {
    assert.doesNotMatch(d.name, /\s[A-Z]\s[A-Z]$/, `"${d.name}" is lettered twice`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SESSION LENGTH ACTUALLY BUYS YOU SOMETHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ THE REGRESSION THIS EXISTS FOR. Every skeleton originally held five or six slots, so 45, 60 and 75
 * minutes all produced five exercises — the athlete paid for half an hour more and got the same workout,
 * because the plan had run out of things to say. Slot lists now run to eight.
 */
test('a longer session is a longer session', () => {
  const count = (m) => dayFor({ focus: { kind: 'split', split: 'push' }, sessionMinutes: m }).day.main.length;
  assert.equal(count(30), 4);
  assert.equal(count(45), 5);
  assert.equal(count(60), 6);
  assert.equal(count(75), 8);
});

test('a program session grows with the time too, up to what PAS allows', () => {
  const count = (goal, m) => {
    const res = build({ ...constraintsFor(goal, 'intermediate', 4, 'full_gym', 'none', m) });
    assert.ok(res.ok);
    return res.assembly.structure.weekPlans[0].days[0].main.length;
  };
  assert.equal(count('muscle', 60), 6);
  assert.equal(count('muscle', 75), 8, 'HYPERTROPHY tops out at 8 exercises (PAS-D11)');
  // STRENGTH is capped at 6 by PAS-D11, which is policy rather than a shortfall — a 75-minute strength
  // session buys heavier work, not a seventh exercise.
  assert.equal(count('strength', 75), 6);
});

// ─────────────────────────────────────────────────────────────────────────────
// SPLIT STYLE — the athlete's choice, honoured
// ─────────────────────────────────────────────────────────────────────────────

test('asking for a body-part split gets a body-part split', () => {
  const res = build({
    ...constraintsFor('muscle', 'intermediate', 5, 'full_gym', 'none'),
    splitStyle: 'body_part',
  });
  assert.ok(res.ok);
  const names = res.assembly.structure.weekPlans[0].days.map((d) => d.name);
  assert.deepEqual(names, ['Chest & Triceps', 'Back & Biceps', 'Legs', 'Shoulders', 'Arms']);
});

test('a style only reaches the day counts it can honestly support', () => {
  // Push/pull/legs across two days leaves a third of the body untrained. It is not offered, and asking
  // for it anyway falls back to the goal default rather than building something misshapen.
  assert.ok(!stylesForDays(2).includes('ppl'));
  assert.ok(stylesForDays(6).includes('ppl'));
  assert.ok(!stylesForDays(2).includes('body_part'));

  const res = build({ ...constraintsFor('muscle', 'intermediate', 2, 'full_gym', 'none'), splitStyle: 'ppl' });
  assert.ok(res.ok, 'an impossible style must fall back, not fail');
  assert.equal(res.assembly.structure.weekPlans[0].days.length, 2);
});

test('a conditioning block keeps its cardio whatever split is chosen', () => {
  const res = build({
    ...constraintsFor('conditioning', 'intermediate', 4, 'full_gym', 'none'),
    splitStyle: 'body_part',
  });
  assert.ok(res.ok);
  const hasCardio = res.assembly.structure.weekPlans[0].days.some((d) =>
    d.main.some((e) => e.kind === 'cardio'),
  );
  assert.ok(hasCardio, 'a conditioning block with no conditioning in it would be agreeing to something wrong');
});

test('a day workout honours the room and the limitations, same as a program', () => {
  const hotel = dayFor({ focus: { kind: 'split', split: 'full_body' }, environment: 'bodyweight', sessionMinutes: 30 });
  assert.ok(hotel.day.main.length > 0);
  for (const e of hotel.day.main) {
    const ex = POOL.find((p) => p.key === e.catalogKey);
    assert.ok(canDoExercise(ex, []), `${e.catalogKey} needs equipment a hotel room does not have`);
  }

  const sore = dayFor({ focus: { kind: 'split', split: 'push' }, limitations: ['shoulders'] });
  for (const e of sore.day.main) {
    assert.notEqual(patternOf(e.catalogKey), 'Vertical Push', 'overhead pressing with a sore shoulder');
  }
});

test('a shorter session is a shorter workout', () => {
  const short = dayFor({ focus: { kind: 'body_parts', parts: ['legs'] }, sessionMinutes: 30 });
  const long = dayFor({ focus: { kind: 'body_parts', parts: ['legs'] }, sessionMinutes: 75 });
  assert.ok(short.day.main.length < long.day.main.length);
});

test('no_barbell reaches every week, not just the first', () => {
  const res = build(constraintsFor('strength', 'advanced', 4, 'full_gym', 'no_barbell'));
  assert.ok(res.ok);
  for (const week of res.assembly.structure.weekPlans) {
    for (const day of week.days) {
      for (const ex of day.main) {
        if (!ex.catalogKey) continue;
        const item = POOL.find((e) => e.key === ex.catalogKey);
        assert.notEqual(item.equipId, 'barbell', `${ex.catalogKey} is a barbell movement`);
      }
    }
  }
});
