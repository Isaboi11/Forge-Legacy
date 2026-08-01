import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * The launch guard, extracted.
 *
 * `lib/workout-launch.ts` imports AsyncStorage, which `node --test` can't load — so the PREDICATE is
 * mirrored here and locked. It is worth locking because the original read
 *
 *     v.freestyle || v.programId ? v : null
 *
 * and every field added afterwards — templateId, exercises, conditioning — was written, stored, and
 * then silently discarded on the way out. Nothing errored: a guard returning null is indistinguishable
 * from "no launch", which is exactly how it survived three features being built around it.
 */
const carriesIntent = (v) =>
  !!v &&
  (!!v.freestyle ||
    (typeof v.programId === 'string' && !!v.programId) ||
    (typeof v.templateId === 'string' && !!v.templateId) ||
    !!v.conditioning ||
    (Array.isArray(v.exercises) && v.exercises.length > 0) ||
    (typeof v.partnerId === 'string' && !!v.partnerId));

test('every way to start a session survives the guard', () => {
  const intents = [
    ['freestyle', { freestyle: true }],
    ['a program day', { programId: 'p1' }],
    ['a saved template', { templateId: 't1' }],
    ['a training invite', { exercises: [{ name: 'Bench Press', sets: 3, targetReps: 8, catalogKey: null }] }],
    ['a treadmill run', { conditioning: { activity: 'run', modality: 'indoor' } }],
    ['an outdoor run', { conditioning: { activity: 'run', modality: 'outdoor' } }],
    ['a tagged partner', { partnerId: 'u1' }],
  ];
  for (const [what, payload] of intents) {
    assert.equal(carriesIntent(payload), true, `${what} was dropped by the guard`);
  }
});

test('a payload carrying no intent is not a launch', () => {
  assert.equal(carriesIntent(null), false);
  assert.equal(carriesIntent({}), false);
  assert.equal(carriesIntent({ workoutName: 'Legs' }), false, 'a name alone starts nothing');
});

test('empty and falsy values do not masquerade as intent', () => {
  assert.equal(carriesIntent({ programId: '' }), false);
  assert.equal(carriesIntent({ templateId: '' }), false);
  assert.equal(carriesIntent({ exercises: [] }), false);
  assert.equal(carriesIntent({ freestyle: false }), false);
  assert.equal(carriesIntent({ partnerId: '' }), false);
});

test('the name alongside a real intent still travels', () => {
  assert.equal(carriesIntent({ templateId: 't1', workoutName: 'Leg Day A' }), true);
  assert.equal(carriesIntent({ conditioning: { activity: 'run' }, workoutName: 'Treadmill Run' }), true);
});
