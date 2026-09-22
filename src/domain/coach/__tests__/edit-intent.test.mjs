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

// ─────────────────────────────────────────────────────────────────────────────
// MOVE — a reorder of one week, through the same code the Reorder sheet runs
// ─────────────────────────────────────────────────────────────────────────────

const namesOf = (s, w) => plannedDays(s, w).map((d) => d.name);

test('move — "swap Upper A and Upper B" trades the two sessions this week only', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'move', day: 'Upper A', to: 'Upper B' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.kind, 'structure');
  assert.equal(r.plan.label, 'Week 1 — Upper A and Upper B trade places');
  assert.deepEqual(r.plan.at, { weekIndex: 0, dayIndex: 0 });
  const after = applyOk(s, r.plan);
  assert.deepEqual(namesOf(after, 0), ['Upper B', 'Lower A', 'Upper A', 'Lower B']);
  assert.deepEqual(namesOf(after, 1), ['Upper A', 'Lower A', 'Upper B', 'Lower B'], 'just this week');
});

test('move — "Lower B first" lifts it to the front, and the rest of the block when asked', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'move', day: 'Lower B', to: 'first', scope: 'rest_of_block' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1 — Lower B goes first: Lower B · Upper A · Lower A · Upper B');
  const after = applyOk(s, r.plan);
  for (let w = 0; w < s.weeks; w += 1) assert.equal(namesOf(after, w)[0].replace(' [DELOAD]', ''), 'Lower B', `week ${w + 1}`);
});

test('move — a trained session keeps its place, exactly as the Reorder sheet pins it', () => {
  const s = program();
  const marks = [mark(0, 0)];
  const r = resolveEditIntent({ op: 'move', day: 'Lower B', to: 'first' }, s, marks, POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.match(r.plan.label, /as early as it can/);
  const after = applyOk(s, r.plan);
  assert.equal(plannedDays(after, 0)[0], plannedDays(s, 0)[0], 'the trained day is the same object, in the same place');
  assert.deepEqual(namesOf(after, 0), ['Upper A', 'Lower B', 'Lower A', 'Upper B']);
});

test('move — moving a trained session is refused in its own words; so is a trained destination', () => {
  const s = program();
  const moved = resolveEditIntent({ op: 'move', day: 'week 1 Upper A', to: 'Upper B' }, s, [mark(0, 0)], POOL);
  assert.equal(moved.ok, false);
  assert.equal(moved.ask, 'not_editable');
  assert.match(moved.message, /stays where it is/);

  const onto = resolveEditIntent({ op: 'move', day: 'Upper B', to: 'week 1 Upper A' }, s, [mark(0, 0)], POOL);
  assert.equal(onto.ok, false);
  assert.equal(onto.ask, 'which_position');
  assert.match(onto.message, /keeps its place/);
});

test('move — two sessions that fit "leg day" ask which; no destination asks where', () => {
  const s = program();
  const which = resolveEditIntent({ op: 'move', day: 'leg day', to: 'first' }, s, [], POOL);
  assert.equal(which.ask, 'which_day');
  assert.deepEqual(which.options, ['Week 1, Lower A', 'Week 1, Lower B']);
  const where = resolveEditIntent({ op: 'move', day: 'Upper A' }, s, [], POOL);
  assert.equal(where.ask, 'which_position');
  assert.ok(!where.options.includes('Week 1, Upper A'), 'never where it already is');
});

test('move — "Friday" onto a rest day is explained, not guessed; a weekday in a plan without them is asked', () => {
  const rest = resolveEditIntent({ op: 'move', day: 'Monday', to: 'Tuesday' }, gapped(), [], POOL);
  assert.equal(rest.ask, 'which_position');
  assert.match(rest.message, /rest day/);
  const noCalendar = resolveEditIntent({ op: 'move', day: 'Upper A', to: 'Friday' }, program(), [], POOL);
  assert.equal(noCalendar.ask, 'which_position');
  assert.equal(noCalendar.options.length, 4);
});

// ─────────────────────────────────────────────────────────────────────────────
// SKIP — a session mark, never a structure edit
// ─────────────────────────────────────────────────────────────────────────────

test('skip — "skip today" is the next session owed, and the plan hands back positions, not a structure', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'skip', day: 'today' }, s, [mark(0, 0)], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.kind, 'skip');
  assert.equal(r.plan.label, 'Skip Week 1, Lower A');
  assert.equal(r.plan.scope, 'this_week', 'a skip confirms; it has no reach to ask about');
  const res = r.plan.apply();
  assert.ok(res.ok);
  assert.deepEqual(res.skip, [{ weekIndex: 0, dayIndex: 1 }]);
  assert.equal(res.structure, s, 'the structure is untouched');
});

test('skip — "next week" asks until the week has begun, then means the week after; the label counts', () => {
  const s = program();
  const early = resolveEditIntent({ op: 'skip', week: 'next week' }, s, [], POOL);
  assert.equal(early.ok, false);
  assert.equal(early.ask, 'which_week');
  assert.deepEqual(early.options, ['Week 1', 'Week 2']);

  const r = resolveEditIntent({ op: 'skip', week: 'next week' }, s, [mark(0, 0)], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Skip all 4 sessions of week 2');
  assert.deepEqual(r.plan.apply().skip, [0, 1, 2, 3].map((d) => ({ weekIndex: 1, dayIndex: d })));

  const partly = resolveEditIntent({ op: 'skip', week: 'week 5' }, s, [mark(4, 2)], POOL);
  assert.equal(partly.plan.label, 'Skip the 3 sessions left in week 5');
  assert.ok(!partly.plan.sessions.some((p) => p.dayIndex === 2), 'a done session is never marked');
});

test('skip — a done session is refused in its own words; a done week too', () => {
  const s = program();
  const one = resolveEditIntent({ op: 'skip', day: 'week 1 Upper A' }, s, [mark(0, 0)], POOL);
  assert.equal(one.ask, 'not_editable');
  assert.match(one.message, /nothing to skip/);
  const week = resolveEditIntent({ op: 'skip', week: 'week 1' }, s, [0, 1, 2, 3].map((d) => mark(0, d)), POOL);
  assert.equal(week.ask, 'not_editable');
});

test('skip — skipping the last sessions says it finishes the program', () => {
  const s = program();
  const marks = [];
  for (let w = 0; w < s.weeks - 1; w += 1) for (let d = 0; d < 4; d += 1) marks.push(mark(w, d, 'skipped'));
  const r = resolveEditIntent({ op: 'skip', week: 'this week' }, s, marks, POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.match(r.plan.label, /^Skip all 4 sessions of week 8 — that's the last of the program, so it finishes it$/);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD / REMOVE
// ─────────────────────────────────────────────────────────────────────────────

test('add — a named movement, dosed from the rulebook, landing only where asked', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'add', exercise: 'hammer curls', day: 'Upper A' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Upper A — add Dumbbell Hammer Curl, 3 × 8–12');
  const after = applyOk(s, r.plan);
  assert.equal(trainingAt(after, 0, 0).main.length, trainingAt(s, 0, 0).main.length + 1);
  assert.equal(trainingAt(after, 1, 0).main.length, trainingAt(s, 1, 0).main.length, 'just this week');

  const block = applyOk(s, r.plan, 'rest_of_block');
  const added = (w) => trainingAt(block, w, 0).main.find((e) => e.catalogKey === 'dumbbell-hammer-curl');
  assert.equal(added(1).reps, 9, 'week 2 climbs the range like the rest of the block');
});

test('add — the athlete\'s own numbers are used as said', () => {
  const r = resolveEditIntent({ op: 'add', exercise: 'face pulls', day: 'Upper B', sets: 3, reps: 15 }, program(), [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Upper B — add Cable Face Pull, 3 × 15');
});

test('add — an ambiguous name asks; a duplicate, a walled movement and a trained day are refused', () => {
  const s = program();
  const vague = resolveEditIntent({ op: 'add', exercise: 'curl', day: 'Upper A' }, s, [], POOL);
  assert.equal(vague.ask, 'which_exercise');
  assert.ok(vague.options.length > 1);

  const dupe = resolveEditIntent({ op: 'add', exercise: 'bench press', day: 'Upper A' }, s, [], POOL);
  assert.equal(dupe.ask, 'not_editable');
  assert.match(dupe.message, /already in/);

  const ctx = contextFrom({ owned: [], canDo: canDoExercise, experience: 'intermediate', limitations: ['no_overhead'], limitationPatterns, excludeExercises: [] });
  const walled = resolveEditIntent({ op: 'add', exercise: 'dumbbell shoulder press', day: 'Upper A' }, s, [], POOL, undefined, { ctx });
  assert.equal(walled.ask, 'not_editable');
  assert.match(walled.message, /keep away from/);

  const trainedDay = resolveEditIntent({ op: 'add', exercise: 'hammer curls', day: 'week 1 Upper A' }, s, [mark(0, 0)], POOL);
  assert.equal(trainedDay.ask, 'not_editable');
});

test('remove — takes one row out; refuses to leave a session with fewer than two', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'remove', exercise: 'front squat', day: 'Lower A' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Lower A — take out Barbell Front Squat');
  const after = applyOk(s, r.plan);
  assert.ok(!trainingAt(after, 0, 1).main.some((e) => e.catalogKey === 'barbell-front-squat'));

  const short = resolveEditIntent({ op: 'remove', exercise: 'pull-ups', day: 'Friday' }, gapped(), [], POOL);
  assert.equal(short.ask, 'not_editable');
  assert.match(short.message, /fewer than 2/);
});

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME — "more arm work", "less cardio"
// ─────────────────────────────────────────────────────────────────────────────

test('volume — "more arm work" adds one set to every arm row this week, and the label lists them', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'volume', target: 'arms', direction: 'more' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(
    r.plan.label,
    'Week 1 — one more set each for arm work: Barbell Biceps Curl (Upper A) 3 → 4, Cable Triceps Pushdown (Upper A) 3 → 4, Barbell Biceps Curl (Upper B) 3 → 4, Cable Triceps Pushdown (Upper B) 3 → 4',
  );
  const after = applyOk(s, r.plan);
  assert.equal(trainingAt(after, 0, 0).main[4].sets, 4);
  assert.equal(trainingAt(after, 0, 2).main[4].sets, 4);
  assert.equal(trainingAt(after, 1, 0).main[4].sets, 3, 'just this week');
});

test('volume — a trained session is stepped over; the rest of the block reaches every week', () => {
  const s = program();
  const r = resolveEditIntent({ op: 'volume', target: 'arms', direction: 'more', scope: 'rest_of_block' }, s, [mark(0, 0)], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.doesNotMatch(r.plan.label, /Upper A/, 'the done session is not in the label');
  const after = applyOk(s, r.plan);
  assert.equal(trainingAt(after, 0, 0).main[4].sets, 3, 'the done session is untouched');
  assert.equal(trainingAt(after, 5, 0).main[4].sets, 4);
});

test('volume — never past the per-session set ceiling', () => {
  const s = program();
  // Upper A carries 20 sets; STRENGTH caps a session at 25. Four "more arms" passes stop at the ceiling.
  let cur = s;
  for (let i = 0; i < 6; i += 1) {
    const r = resolveEditIntent({ op: 'volume', target: 'arms', direction: 'more', day: 'Upper A' }, cur, [], POOL);
    if (!r.ok) {
      assert.equal(r.ask, 'not_editable');
      assert.match(r.message, /most sets/);
      break;
    }
    cur = applyOk(cur, r.plan);
  }
  const total = trainingAt(cur, 0, 0).main.reduce((n, e) => n + (e.sets ?? 0), 0);
  assert.equal(total, 25);
});

test('volume — "less" at one set takes one exercise out, asking which when there are two', () => {
  const s = program();
  let cur = s;
  for (let i = 0; i < 2; i += 1) cur = applyOk(cur, resolveEditIntent({ op: 'volume', target: 'biceps', direction: 'less', day: 'Upper A' }, cur, [], POOL).plan);
  const r = resolveEditIntent({ op: 'volume', target: 'biceps', direction: 'less', day: 'Upper A' }, cur, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Upper A — take out Barbell Biceps Curl');

  const after = applyOk(cur, r.plan);
  assert.ok(!trainingAt(after, 0, 0).main.some((e) => e.catalogKey === 'barbell-biceps-curl'));
  assert.ok(trainingAt(after, 0, 2).main.some((e) => e.catalogKey === 'barbell-biceps-curl'), 'Upper B keeps its curl');
});

test('volume — nothing trains it: asks which session, then adds one accessory within the caps', () => {
  const which = resolveEditIntent({ op: 'volume', target: 'calves', direction: 'more' }, gapped(), [], POOL);
  assert.equal(which.ask, 'which_day');
  assert.equal(which.options.length, 4);

  const s = gapped();
  const r = resolveEditIntent({ op: 'volume', target: 'calves', direction: 'more', day: 'Wednesday' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.match(r.plan.label, /^Week 1, Wednesday — add .+Calf.+, \d × [\d–]+, for more calf work$/);
  const after = applyOk(s, r.plan);
  assert.equal(plannedDays(after, 0)[2].main.length, 2);

  const full = resolveEditIntent({ op: 'volume', target: 'chest', direction: 'more', day: 'Lower A' }, program(), [], POOL);
  assert.equal(full.ask, 'not_editable');
  assert.match(full.message, /already at 6 exercises/);
});

test('volume — "less cardio" never removes a whole run day; a finisher inside a lift day can go', () => {
  const runs = resolveEditIntent({ op: 'volume', target: 'cardio', direction: 'less' }, gapped(), [], POOL);
  assert.equal(runs.ask, 'not_editable');
  assert.match(runs.message, /whole sessions/);

  const s = gapped();
  s.days[0].main.push({ name: 'Pull-Up', catalogKey: 'pull-up', sets: 3, reps: 8 });
  s.days[0].main.push({ name: 'Bike', catalogKey: '', kind: 'cardio', activity: 'bike', targetSec: 600 });
  const r = resolveEditIntent({ op: 'volume', target: 'cardio', direction: 'less' }, s, [], POOL);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.equal(r.plan.label, 'Week 1, Monday — take out Bike');
  const after = applyOk(s, r.plan);
  assert.equal(plannedDays(after, 0)[4].main.length, 1, 'the run day is untouched');

  const more = resolveEditIntent({ op: 'volume', target: 'cardio', direction: 'more' }, gapped(), [], POOL);
  assert.equal(more.ask, 'not_editable', 'more cardio asks for the athlete\'s own number');
});
