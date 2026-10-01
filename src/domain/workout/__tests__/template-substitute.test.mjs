import test from 'node:test';
import assert from 'node:assert/strict';

import { findTemplateRow, removeTemplateRow, replaceTemplateRow } from '../template-substitute.ts';

/**
 * "This & future workouts" really changes the template (library-02, QA 09-26) — Exercise-002 §7.3 / §9.1,
 * EX-002-D5: only the exercise changes.
 */

const row = (name, key, extra = {}) => ({ catalogKey: key, name, sets: 3, targetReps: 8, section: 'main', kind: 'strength', ...extra });
const TEMPLATE = [
  row('Barbell Bench Press', 'barbell-bench-press', { coachNote: 'Pause on the chest', restSec: 120, percentOfMax: 70, percentOf: 'bench' }),
  row('Barbell Row', 'barbell-row', { groupId: 'g1', groupKind: 'superset', groupName: 'Superset', groupRounds: 3 }),
  row('Dumbbell Curl', 'dumbbell-curl', { groupId: 'g1', groupKind: 'superset', groupName: 'Superset', groupRounds: 3 }),
  row('Crunch', 'crunch', { sets: 3, targetReps: 12, repsMax: 15 }),
  row('Plank', 'plank', { targetReps: 0, targetDurationSec: 45, restAfterSec: 20 }),
];
const to = (name, key, unit) => ({ name, catalogKey: key, unit });

test('⭐ only the exercise changes — sets, reps, %, rest, cue and section all stay (EX-002-D5)', () => {
  const out = replaceTemplateRow(TEMPLATE, { index: 0, catalogKey: 'barbell-bench-press', name: 'Barbell Bench Press' }, to('Dumbbell Bench Press', 'dumbbell-bench-press', 'reps'));
  assert.deepEqual(out[0], { ...TEMPLATE[0], catalogKey: 'dumbbell-bench-press', name: 'Dumbbell Bench Press' });
  assert.deepEqual(out.slice(1), TEMPLATE.slice(1), 'no other row is touched');
  assert.equal(TEMPLATE[0].name, 'Barbell Bench Press', 'the input is not mutated');
});

test('a superset member swapped stays in its superset', () => {
  const out = replaceTemplateRow(TEMPLATE, { index: 2, catalogKey: 'dumbbell-curl' }, to('Hammer Curl', 'hammer-curl', 'reps'));
  assert.equal(out[2].groupId, 'g1');
  assert.equal(out[2].name, 'Hammer Curl');
});

test('⭐ a template edited since the session began is never guessed at — position AND identity must agree', () => {
  // The session thinks row 0 is the bench; the template's row 0 is now something else.
  const edited = [row('Overhead Press', 'overhead-press'), ...TEMPLATE];
  assert.equal(replaceTemplateRow(edited, { index: 0, catalogKey: 'barbell-bench-press', name: 'Barbell Bench Press' }, to('X', 'x')), null);
  // Out of range (an exercise added mid-session is not a template row).
  assert.equal(replaceTemplateRow(TEMPLATE, { index: 9, catalogKey: 'barbell-bench-press' }, to('X', 'x')), null);
  assert.equal(findTemplateRow(TEMPLATE, { index: -1, name: 'Crunch' }), -1);
});

test('the same lift twice is two rows — the position picks which', () => {
  const twice = [row('Back Squat', 'back-squat', { sets: 1, targetReps: 3 }), row('Back Squat', 'back-squat', { sets: 3, targetReps: 8 })];
  const out = replaceTemplateRow(twice, { index: 1, catalogKey: 'back-squat' }, to('Leg Press', 'leg-press', 'reps'));
  assert.deepEqual(out.map((r) => r.name), ['Back Squat', 'Leg Press']);
  assert.equal(out[1].targetReps, 8);
});

test('a row saved without a catalogue key is matched by its name, case-insensitively', () => {
  const old = [row('Coach’s Weird Squat', null)];
  assert.equal(findTemplateRow(old, { index: 0, catalogKey: null, name: 'coach’s weird squat ' }), 0);
  assert.equal(findTemplateRow(old, { index: 0, catalogKey: 'something', name: 'Another' }), -1);
});

test('⭐ a counted row swapped for a HOLD becomes seconds — never "Plank 3 × 12"', () => {
  const out = replaceTemplateRow(TEMPLATE, { index: 3, catalogKey: 'crunch' }, to('Plank', 'plank', 'time'));
  assert.equal(out[3].targetDurationSec, 30);
  assert.equal(out[3].targetReps, 0);
  assert.equal(out[3].repsMax, null, 'a rep range means nothing on a hold');
  assert.equal(out[3].sets, 3, 'sets carry over');
});

test('⭐ a hold swapped for a counted move becomes reps — never still asking for seconds', () => {
  const out = replaceTemplateRow(TEMPLATE, { index: 4, catalogKey: 'plank' }, to('Crunch', 'crunch', 'reps'));
  assert.equal(out[4].targetDurationSec, null);
  assert.equal(out[4].restAfterSec, null);
  assert.equal(out[4].targetReps, 10);
});

test('hold → hold and reps → reps keep the dose; an unknown unit keeps the measure', () => {
  assert.equal(replaceTemplateRow(TEMPLATE, { index: 4, catalogKey: 'plank' }, to('Side Plank', 'side-plank', 'time'))[4].targetDurationSec, 45);
  assert.equal(replaceTemplateRow(TEMPLATE, { index: 4, catalogKey: 'plank' }, to('Mystery', 'custom:1'))[4].targetDurationSec, 45);
  assert.equal(replaceTemplateRow(TEMPLATE, { index: 3, catalogKey: 'crunch' }, to('Mystery', 'custom:1'))[3].targetReps, 12);
});

test('a lift ⇄ cardio swap is refused — a run has no sets to keep', () => {
  assert.equal(replaceTemplateRow(TEMPLATE, { index: 0, catalogKey: 'barbell-bench-press' }, to('Run', 'cardio:run')), null);
  const withRun = [{ catalogKey: 'cardio:run', name: 'Outdoor Run', sets: 1, targetReps: 0, kind: 'cardio', targetMi: 3 }];
  assert.equal(replaceTemplateRow(withRun, { index: 0, catalogKey: 'cardio:run' }, to('Squat', 'back-squat', 'reps')), null);
});

test('removing a row takes it out and leaves the rest in order', () => {
  const out = removeTemplateRow(TEMPLATE, { index: 3, catalogKey: 'crunch' });
  assert.deepEqual(out.map((r) => r.name), ['Barbell Bench Press', 'Barbell Row', 'Dumbbell Curl', 'Plank']);
  assert.equal(removeTemplateRow(TEMPLATE, { index: 3, catalogKey: 'plank' }), null, 'not the row it was told — nothing removed');
});

test('⭐ removing one of a PAIR leaves its partner a loose lift, not a superset of one', () => {
  const out = removeTemplateRow(TEMPLATE, { index: 1, catalogKey: 'barbell-row' });
  const curl = out.find((r) => r.name === 'Dumbbell Curl');
  assert.equal(curl.groupId, null);
  assert.equal(curl.groupKind, null);
  // …but a superset of three keeps its other two together.
  const three = [row('A', 'a', { groupId: 'g' }), row('B', 'b', { groupId: 'g' }), row('C', 'c', { groupId: 'g' })];
  assert.deepEqual(removeTemplateRow(three, { index: 0, catalogKey: 'a' }).map((r) => r.groupId), ['g', 'g']);
});
