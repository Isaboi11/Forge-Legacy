/**
 * day-asked.test.mjs — what the athlete asked for BY NAME is in the session, and Holt says so.
 *
 * ══ THE BUG ══
 *
 * PO, 2026-09-30, spoken into the mic: the sentence in `SAID` below. Holt answered "Upper chest and
 * triceps it is" and built Barbell Bench · Dumbbell Bench · Machine Chest Press · Pushdown · two Skull
 * Crushers — no upper chest at all, and three triceps movements where two were asked for.
 *
 * ⚠ THE FIXTURE IS THE REAL SENTENCE, dictation slip and all ("chest and tries"). A tidy one would have
 * passed against a parser that the real one breaks.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/day-asked.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { buildDayWorkout, BODY_PART_MUSCLES } from '../day.ts';
import { askedLine, focusAskFromText, focusFromText, focusSaid, isRoom, roomAssumedLine, ROOM_CHIPS } from '../chat-core.ts';
import { EMPHASIS, EMPHASIS_IDS } from '../rulebook/emphasis.ts';
import { recentWorkFrom } from '../recent-work.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));

/** Verbatim, as it arrived on the PO's phone. */
const SAID =
  "I'm working out chest and tries today. I have about an hour. I really want to develop my upper chest and I'm usually trying to do about two tricep workouts and then the rest as a chest workout. Give me an hour to an hour 15 minute workout.";

/** The PO's own answers to the questions that followed. */
const build = (focus, over = {}) =>
  buildDayWorkout(
    { focus, goal: 'muscle', sessionMinutes: 60, experience: 'advanced', environment: 'full_gym', ownedEquipment: [], limitations: [], ...over },
    POOL,
    canDoExercise,
  );

const keysOf = (r) => r.day.main.map((m) => m.catalogKey);
const trains = (key, part) => BY_KEY.get(key).primaryMuscleIds.some((m) => BODY_PART_MUSCLES[part].includes(m));

// ─────────────────────────────────────────────────────────────────────────────
// THE RULEBOOK
// ─────────────────────────────────────────────────────────────────────────────

test('every emphasis key is in the visible catalogue and trains the part it is filed under', () => {
  for (const id of EMPHASIS_IDS) {
    const { part, keys } = EMPHASIS[id];
    assert.ok(keys.length >= 3, `${id} names too few movements to lead a day`);
    assert.equal(new Set(keys).size, keys.length, `${id} lists a key twice`);
    for (const k of keys) {
      assert.ok(BY_KEY.has(k), `${id}: "${k}" is not in the catalogue the app shows`);
      assert.ok(trains(k, part), `${id}: "${k}" does not train ${part}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HEARING IT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the real sentence: upper chest, and two for triceps', () => {
  assert.deepEqual(focusAskFromText(SAID), { counts: { triceps: 2 }, emphasis: ['upper_chest'] });
});

test('⚠ the real sentence, with the phrase the model hands back, is one focus carrying both', () => {
  assert.deepEqual(focusSaid('chest and triceps', SAID), {
    kind: 'body_parts',
    parts: ['chest', 'triceps'],
    counts: { triceps: 2 },
    emphasis: ['upper_chest'],
  });
});

test('⚠ "upper chest" is not an Upper body day, and "lower back" is not a leg day', () => {
  assert.deepEqual(focusFromText('upper chest and triceps'), { kind: 'body_parts', parts: ['chest', 'triceps'] });
  assert.equal(focusFromText('my lower back is tight'), null);
  // The splits themselves still stand.
  assert.deepEqual(focusFromText('upper body'), { kind: 'split', split: 'upper' });
  assert.deepEqual(focusFromText('upper'), { kind: 'split', split: 'upper' });
  assert.deepEqual(focusFromText('lower body today'), { kind: 'split', split: 'legs' });
});

test('a count is heard either side of its noun, and only with one', () => {
  assert.deepEqual(focusAskFromText('3 chest exercises and a couple of tricep movements').counts, { chest: 3, triceps: 2 });
  assert.deepEqual(focusAskFromText('two exercises for my biceps').counts, { biceps: 2 });
  // None of these counts movements.
  for (const s of ['3 sets of triceps', '4 back days a week', 'two triceps', 'an hour 15 minute workout', 'chest for 45 minutes']) {
    assert.deepEqual(focusAskFromText(s).counts, {}, s);
  }
});

test('a part that was counted or emphasised is in the day even if the phrase left it out', () => {
  assert.deepEqual(focusSaid('triceps', 'triceps today but really hit upper chest').parts, ['chest', 'triceps']);
});

test('nothing asked → exactly the focus there was before', () => {
  assert.deepEqual(focusSaid('back and biceps', 'back and biceps today'), { kind: 'body_parts', parts: ['back', 'biceps'] });
  assert.deepEqual(focusSaid('push', 'push day, two tricep exercises'), { kind: 'split', split: 'push' });
  assert.deepEqual(focusAskFromText('upper and lower chest').emphasis, []);
  assert.deepEqual(focusAskFromText('upper chest and lower chest').emphasis, []);
  assert.deepEqual(focusFromText('upper and lower chest'), { kind: 'body_parts', parts: ['chest'] });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUILDING IT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the session the PO got: three flat presses, three triceps — the defect, pinned', () => {
  const r = build({ kind: 'body_parts', parts: ['chest', 'triceps'] });
  assert.deepEqual(keysOf(r), [
    'barbell-bench-press',
    'dumbbell-bench-press',
    'machine-chest-press',
    'cable-triceps-pushdown',
    'dumbbell-skull-crusher',
    'barbell-skull-crusher',
  ]);
  assert.equal(r.asked, undefined, 'a focus that asked for nothing reports nothing');
});

test('⚠ the session he asked for: upper chest leads, triceps is two, the rest is chest', () => {
  const r = build(focusSaid('chest and triceps', SAID));
  const keys = keysOf(r);
  const upper = EMPHASIS.upper_chest.keys;

  assert.equal(keys.length, 6, 'the hour is still a six-movement session');
  assert.equal(keys.filter((k) => trains(k, 'triceps')).length, 2, `two triceps movements, got ${keys}`);
  assert.equal(keys.filter((k) => trains(k, 'chest')).length, 4, 'the rest is chest');
  assert.ok(upper.includes(keys[0]), `an upper-chest movement opens the day, got ${keys[0]}`);
  assert.equal(keys.filter((k) => upper.includes(k)).length, 3, 'three of the four chest movements are upper chest');
  assert.equal(keys.filter((k) => trains(k, 'chest') && !upper.includes(k)).length, 1, 'one standard press stays in');
  assert.equal(new Set(keys).size, keys.length, 'nothing is prescribed twice');
  assert.equal(r.day.name, 'Chest & Triceps');

  assert.deepEqual(r.asked, {
    emphasis: [{ id: 'upper_chest', got: 3, of: 4 }],
    counts: [{ part: 'triceps', asked: 2, got: 2 }],
  });
  assert.equal(askedLine(r.asked), 'Upper chest leads it: three of the four chest movements. Triceps is held to two, like you said.');
});

test('an emphasis with no count still leads the part and leaves the other part alone', () => {
  const plain = keysOf(build({ kind: 'body_parts', parts: ['chest', 'triceps'] }));
  const keys = keysOf(build({ kind: 'body_parts', parts: ['chest', 'triceps'], emphasis: ['upper_chest'] }));
  assert.ok(EMPHASIS.upper_chest.keys.includes(keys[0]));
  assert.deepEqual(keys.filter((k) => trains(k, 'triceps')), plain.filter((k) => trains(k, 'triceps')));
});

test('a count on the compound part holds too: two chest, the rest triceps', () => {
  const keys = keysOf(build({ kind: 'body_parts', parts: ['chest', 'triceps'], counts: { chest: 2 } }));
  assert.equal(keys.filter((k) => trains(k, 'chest')).length, 2);
  assert.equal(keys.filter((k) => trains(k, 'triceps')).length, 4);
});

test('counts that add up to less than a session are not honoured into a thin day', () => {
  const r = build({ kind: 'body_parts', parts: ['chest'], counts: { chest: 1 } });
  assert.ok(r.day.main.length >= 3, 'one movement is not a workout');
  assert.deepEqual(r.asked.counts, []);
});

test('⚠ the emphasis obeys the room: bodyweight gets the feet-raised push-up or is told there is nothing', () => {
  const r = build({ kind: 'body_parts', parts: ['chest', 'triceps'], emphasis: ['upper_chest'] }, { environment: 'bodyweight' });
  for (const k of keysOf(r)) assert.ok(canDoExercise(BY_KEY.get(k), []), `${k} needs kit a bodyweight athlete has not got`);
  const e = r.asked.emphasis[0];
  assert.equal(keysOf(r).filter((k) => EMPHASIS.upper_chest.keys.includes(k)).length, e.got, 'he reports what is really there');
});

test('⚠ the emphasis never reaches past a limitation or something they said to leave out', () => {
  const lead = EMPHASIS.upper_chest.keys[0];
  const r = build({ kind: 'body_parts', parts: ['chest', 'triceps'], emphasis: ['upper_chest'] }, { excludeExercises: [lead] });
  assert.ok(!keysOf(r).includes(lead));
});

test('variety: the upper-chest movement trained last session does not open this one', () => {
  const first = keysOf(build({ kind: 'body_parts', parts: ['chest'], emphasis: ['upper_chest'] }))[0];
  const next = keysOf(build({ kind: 'body_parts', parts: ['chest'], emphasis: ['upper_chest'] }, { recent: recentWorkFrom([[first]]) }))[0];
  assert.notEqual(next, first);
  assert.ok(EMPHASIS.upper_chest.keys.includes(next));
});

test('when he could not do it, he says that instead', () => {
  assert.equal(
    askedLine({ emphasis: [{ id: 'upper_chest', got: 0, of: 3 }], counts: [{ part: 'triceps', asked: 3, got: 1 }] }),
    "I've got nothing for upper chest with what you have to hand, so that's a straight chest day. I could only fit one for triceps.",
  );
  assert.equal(askedLine(undefined), null);
  assert.equal(askedLine({ emphasis: [], counts: [] }), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE ROOM HE REMEMBERS
// ─────────────────────────────────────────────────────────────────────────────

test('the room chips record one of the three rooms and carry the flag that stops a build', () => {
  assert.deepEqual(ROOM_CHIPS.map((c) => c.patch.environment), ['full_gym', 'home', 'bodyweight']);
  for (const c of ROOM_CHIPS) {
    assert.equal(c.roomOnly, true);
    assert.ok(isRoom(c.patch.environment));
  }
  // A race's default is not somewhere an athlete trains, and must never be remembered as one.
  assert.equal(isRoom('outdoor'), false);
  assert.equal(isRoom(null), false);
  assert.equal(roomAssumedLine('full_gym'), 'Built for a full gym, same as last time.');
});
