/**
 * edit-intent.test.mjs — "change my program by typing", resolved against a real program.
 *
 * The athlete's words ("bench", "leg day", "tomorrow") are found in a program Holt actually built from the
 * real catalogue, and every change lands through `edit-ops`, so the invariants that file guards are
 * asserted again here from the typing side: a trained session is never touched, the session count never
 * moves, and a rest day in the week does not shift which session an edit reaches. Where two answers are
 * plausible, the resolver must ASK with the real options — never pick.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/edit-intent.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { plannedDays, totalSessions } from '../../program/progress-core.ts';
import { assemble } from '../assemble.ts';
import { contextFrom } from '../candidates.ts';
import { resolveEditIntent } from '../edit-intent.ts';
import { limitationPatterns } from '../rulebook/limitations.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/** A real Holt block: strength, four days — Upper A · Lower A · Upper B · Lower B, eight weeks. */
const program = () => {
  const res = assemble(
    {
      goal: 'strength',
      experience: { lifting: 'intermediate', running: 'intermediate' },
      daysPerWeek: 4,
      sessionMinutes: 60,
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
      excludeExercises: [],
    },
    POOL,
    canDoExercise,
  );
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  return res.assembly.structure;
};

const mark = (weekIndex, dayIndex, state = 'completed') => ({ weekIndex, dayIndex, state });
const trainingAt = (s, w, d) => plannedDays(s, w).filter((x) => x.main.length + x.warmup.length + x.cooldown.length > 0)[d];
const keyAt = (s, w, d, i) => trainingAt(s, w, d).main[i].catalogKey;

/** Apply and assert the invariant every successful edit must keep. */
const applyOk = (before, plan, scope) => {
  const r = plan.apply(scope);
  assert.ok(r.ok, r.ok ? '' : r.refusal.message);
  assert.equal(totalSessions(r.structure), totalSessions(before), 'totalSessions moved');
  return r.structure;
};

// ─────────────────────────────────────────────────────────────────────────────
// THE HAPPY PATHS
// ─────────────────────────────────────────────────────────────────────────────

test('swap by name — "swap bench for dumbbell press on Upper A"', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'swap', exercise: 'bench', to: 'dumbbell press', day: 'Upper A' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Upper A — Barbell Bench Press → Dumbbell Bench Press');
  assert.deepEqual(r.plan.at, { weekIndex: 0, dayIndex: 0, exerciseIndex: 0 });
  assert.equal(r.plan.scope, null, 'no reach said, so none is claimed');

  const after = applyOk(s, r.plan);
  assert.equal(keyAt(after, 0, 0, 0), 'dumbbell-bench-press');
  assert.equal(keyAt(after, 1, 0, 0), 'barbell-bench-press', 'just this week by default');
  // Only the movement changes — EX-002-D5.
  assert.equal(trainingAt(after, 0, 0).main[0].sets, trainingAt(s, 0, 0).main[0].sets);
});

test('no day named — the one session this week that holds the lift is the one', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'swap', exercise: 'bench', to: 'dumbbell press' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.deepEqual(r.plan.at, { weekIndex: 0, dayIndex: 0, exerciseIndex: 0 });
});

test('sets change — "5 sets of pull-ups on Upper B"', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'sets', exercise: 'pull-ups', sets: 5, day: 'Upper B' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Upper B — Pull-Up: 4 → 5 sets');
  const after = applyOk(s, r.plan);
  assert.equal(trainingAt(after, 0, 2).main[0].sets, 5);
  assert.equal(trainingAt(after, 0, 2).main[0].reps, trainingAt(s, 0, 2).main[0].reps, 'the reps stay');
});

test('reps change replaces a range with the count asked for', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'reps', exercise: 'overhead press', reps: 10, day: 'Upper A' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  const row = trainingAt(applyOk(s, r.plan), 0, 0).main[2];
  assert.equal(row.reps, 10);
  assert.equal(row.repsMax, null);
});

test('"tomorrow" in a plan with no weekdays is the next session owed', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'sets', exercise: 'deadlift', sets: 5, day: 'tomorrow' }, s, [mark(0, 0)], POOL, '2026-09-21');
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.at.weekIndex, 0);
  assert.equal(r.plan.at.dayIndex, 1, 'Upper A is done, so tomorrow is Lower A');
  assert.equal(keyAt(s, 0, 1, r.plan.at.exerciseIndex), 'barbell-deadlift');
});

test('the rest of the block reaches later weeks, and says so', () => {
  const s = program();
  const r = resolveEditIntent(
    { op: 'swap', exercise: 'bench', to: 'dumbbell press', day: 'Upper A', scope: 'rest_of_block' },
    s,
    [],
    POOL,
  );
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.scope, 'rest_of_block');
  const after = applyOk(s, r.plan);
  for (let w = 0; w < s.weeks; w++) {
    const row = trainingAt(after, w, 0).main[0];
    if (trainingAt(s, w, 0).main[0].catalogKey === 'barbell-bench-press') assert.equal(row.catalogKey, 'dumbbell-bench-press', `week ${w + 1}`);
  }
  assert.ok(s.weeks > 1);
});

test('totalSessions is unchanged by every kind of typed edit', () => {
  const s = program();
  const ctx = contextFrom({ owned: [], canDo: canDoExercise, experience: 'intermediate', limitations: ['shoulders'], limitationPatterns, excludeExercises: [] });
  for (const intent of [
    { op: 'swap', exercise: 'rows', to: 'dumbbell bent-over row', day: 'Upper B', scope: 'rest_of_block' },
    { op: 'sets', exercise: 'curl', sets: 2, day: 'Upper A', scope: 'rest_of_block' },
    { op: 'reps', exercise: 'calf raise', reps: 15, day: 'Lower A' },
    { op: 'rebuild', day: 'Upper A', scope: 'rest_of_block' },
  ]) {
    const r = resolveEditIntent(intent, s, [mark(0, 3)], POOL, undefined, { ctx });
    assert.ok(r.ok, `${intent.op}: ${r.ok ? '' : r.message}`);
    applyOk(s, r.plan);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IT ASKS RATHER THAN GUESSES
// ─────────────────────────────────────────────────────────────────────────────

test('an ambiguous exercise asks, with the real rows as options', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'sets', exercise: 'squat', sets: 5, day: 'Lower A' }, s, [], POOL);
  assert.equal(r.ok, false);
  assert.equal(r.ask, 'which_exercise');
  assert.equal(r.options.length, 2);
  assert.ok(r.options.some((o) => o.startsWith('Barbell Back Squat')));
  assert.ok(r.options.some((o) => o.startsWith('Barbell Front Squat')));
});

test('an unknown replacement asks, offering what trains the same thing', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'swap', exercise: 'bench', to: 'zorbulator thrust', day: 'Upper A' }, s, [], POOL);
  assert.equal(r.ok, false);
  assert.equal(r.ask, 'which_replacement');
  assert.ok(r.options.length > 0);
  assert.ok(!r.options.includes('Barbell Bench Press'));
  assert.match(r.message, /zorbulator thrust/);
});

test('two sessions that fit "leg day" ask which', () => {
  const r = resolveEditIntent({ op: 'sets', exercise: 'deadlift', sets: 5, day: 'leg day' }, program(), [], POOL);
  assert.equal(r.ok, false);
  assert.equal(r.ask, 'which_day');
  assert.deepEqual(r.options, ['Week 1, Lower A', 'Week 1, Lower B']);
});

test('a weekday in a plan with no weekdays is asked about, not mapped onto a session', () => {
  const r = resolveEditIntent({ op: 'sets', exercise: 'bench', sets: 5, day: 'Monday' }, program(), [], POOL);
  assert.equal(r.ok, false);
  assert.equal(r.ask, 'which_day');
  assert.equal(r.options.length, 4);
});

test('a missing number asks with values relative to what is there', () => {
  const r = resolveEditIntent({ op: 'sets', exercise: 'bench', day: 'Upper A' }, program(), [], POOL);
  assert.equal(r.ok, false);
  assert.equal(r.ask, 'which_value');
  assert.ok(!r.options.includes('4 sets'), 'never the value it already has');
});

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY CANNOT BE REWRITTEN
// ─────────────────────────────────────────────────────────────────────────────

test('a trained session is refused in Holt\'s words, and next week\'s is offered', () => {
  const s = program();
  const marks = [mark(0, 0)];
  const explicit = resolveEditIntent({ op: 'sets', exercise: 'bench', sets: 5, day: 'week 1 Upper A' }, s, marks, POOL);
  assert.equal(explicit.ok, false);
  assert.equal(explicit.ask, 'not_editable');
  assert.match(explicit.message, /already done/);

  const bare = resolveEditIntent({ op: 'sets', exercise: 'bench', sets: 5, day: 'Upper A' }, s, marks, POOL);
  assert.equal(bare.ok, false);
  assert.equal(bare.ask, 'not_editable');
  assert.deepEqual(bare.options, ['Week 2, Upper A']);

  const past = resolveEditIntent({ op: 'sets', exercise: 'bench', sets: 5, day: 'yesterday' }, s, marks, POOL);
  assert.equal(past.ask, 'not_editable');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ A WEEK WITH A REST DAY IN IT (Decision Queue #23)
// ─────────────────────────────────────────────────────────────────────────────

/* Mon · (rest) · Wed · Fri · Sat run. Schedule index 2 is Friday; raw index 2 is Wednesday. */
const gapped = () => {
  const row = (name, catalogKey, sets) => ({ name, catalogKey, sets, reps: 8, kind: 'strength' });
  const run = { name: 'Easy Run', catalogKey: '', kind: 'cardio', activity: 'run', targetMi: 3 };
  const d = (name, main) => ({ name, letter: '', warmup: [], main, cooldown: [] });
  return {
    name: 'Gapped', weeks: 2, daysPerWeek: 4, vary: false, weekPlans: null,
    days: [
      d('Mon', [row('Barbell Bench Press', 'barbell-bench-press', 3)]),
      d('Rest', []),
      d('Wed', [row('Barbell Back Squat', 'barbell-back-squat', 4)]),
      d('Fri', [row('Pull-Up', 'pull-up', 2)]),
      d('Sat', [run]),
    ],
  };
};
const setsBy = (s, w = 0) => Object.fromEntries(plannedDays(s, w).flatMap((x) => x.main.map((m) => [m.name, m.sets])));

test('⚠ "Friday" edits Friday when the week has a rest day before it', () => {
  const s = gapped();
  const r = resolveEditIntent({ op: 'sets', exercise: 'pull-ups', sets: 5, day: 'Friday' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.deepEqual(r.plan.at, { weekIndex: 0, dayIndex: 2, exerciseIndex: 0 });
  assert.equal(r.plan.label, 'Week 1, Friday — Pull-Up: 2 → 5 sets');
  const after = applyOk(s, r.plan);
  assert.deepEqual(setsBy(after), { 'Barbell Bench Press': 3, 'Barbell Back Squat': 4, 'Pull-Up': 5, 'Easy Run': undefined });
});

test('a rest day named is asked about, not edited', () => {
  const r = resolveEditIntent({ op: 'sets', exercise: 'squat', sets: 5, day: 'Tuesday' }, gapped(), [], POOL);
  assert.equal(r.ok, false);
  assert.equal(r.ask, 'which_day');
  assert.match(r.message, /rest day/);
});

test('"tomorrow" follows the calendar when the plan has weekdays', () => {
  // 2026-09-22 is a Tuesday, so tomorrow is Wednesday — schedule index 1.
  const r = resolveEditIntent({ op: 'sets', exercise: 'squat', sets: 5, day: 'tomorrow' }, gapped(), [], POOL, '2026-09-22');
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.deepEqual(r.plan.at, { weekIndex: 0, dayIndex: 1, exerciseIndex: 0 });
});

test('"Wednesday\'s session" already done this week offers next week\'s', () => {
  const r = resolveEditIntent({ op: 'sets', exercise: 'squat', sets: 5, day: "Wednesday's session" }, gapped(), [mark(0, 1)], POOL);
  assert.equal(r.ok, false);
  assert.equal(r.ask, 'not_editable');
  assert.deepEqual(r.options, ['Week 2, Wednesday']);
});

test('a distance change lands on the run', () => {
  const s = gapped();
  const r = resolveEditIntent({ op: 'distance', exercise: 'run', miles: 5, day: 'Saturday', scope: 'rest_of_block' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Saturday — Easy Run: 3 → 5 mi');
  const after = applyOk(s, r.plan);
  assert.equal(plannedDays(after, 0)[4].main[0].targetMi, 5);
  assert.equal(plannedDays(after, 1)[4].main[0].targetMi, 5);
});
