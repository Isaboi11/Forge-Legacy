/**
 * session-suggest.test.mjs — ⭐ **the coach answers the question instead of opening a search box.**
 *
 * PO, 2026-08-21: *"when clicking on coach holt during a workout you should be able to swap or add
 * exercises, and then have him suggest based off of what the exercise is that you're doing or what
 * you've already done."*
 *
 * `SessionCoachSheet` already had both actions; both opened the Exercise Picker cold. What is new is
 * the selection, and selection logic is the kind that fails plausibly — a list that looks reasonable
 * and is subtly wrong reads as "the coach isn't very good" rather than as a bug.
 *
 * ⚠ A HAND-WRITTEN POOL, like `candidates.test.mjs`. Neither `exercise-picker/data.ts` nor the
 * relationship graph can be loaded by `node --test` (both import `.json` with no import attribute), so
 * the module takes them injected and this supplies fixtures instead of the real 721.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/session-suggest.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { addSuggestions, swapSuggestions, GAP_PATTERNS } from '../session-suggest.ts';

const ex = (key, name, pattern, equipId, primary, secondary = []) => ({
  key,
  name,
  pattern,
  equipId,
  primaryMuscleIds: primary,
  muscleIds: [...primary, ...secondary],
});

const POOL = [
  ex('barbell-bench-press', 'Barbell Bench Press', 'Horizontal Push', 'barbell', ['chest'], ['triceps', 'front-delts']),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', 'Horizontal Push', 'dumbbell', ['chest'], ['triceps']),
  ex('push-up', 'Push-Up', 'Horizontal Push', 'bodyweight', ['chest'], ['triceps']),
  ex('machine-chest-press', 'Machine Chest Press', 'Horizontal Push', 'machine', ['chest']),
  ex('barbell-row', 'Barbell Row', 'Horizontal Pull', 'barbell', ['back'], ['biceps', 'rear-delts']),
  ex('dumbbell-row', 'Dumbbell Row', 'Horizontal Pull', 'dumbbell', ['back'], ['biceps']),
  ex('back-squat', 'Back Squat', 'Squat / Knee Dominant', 'barbell', ['quads'], ['glutes']),
  ex('romanian-deadlift', 'Romanian Deadlift', 'Hinge / Hip Dominant', 'barbell', ['hamstrings'], ['glutes']),
  ex('plank', 'Front Plank', 'Core', 'bodyweight', ['abs']),
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SWAP — about the lift in front of you
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⭐ the authored graph wins, and keeps its own ranking', () => {
  const g = swapSuggestions({
    currentKey: 'barbell-bench-press',
    currentName: 'Barbell Bench Press',
    pool: POOL,
    // Deliberately NOT the order the same-pattern fallback would produce — dumbbell scores highest
    // there, so if the graph were being ignored this would come back dumbbell-first.
    alternativeKeys: ['machine-chest-press', 'push-up', 'dumbbell-bench-press'],
  });
  assert.ok(g);
  assert.deepEqual(
    g.picks.map((p) => p.key),
    ['machine-chest-press', 'push-up', 'dumbbell-bench-press'],
    'a curated edge order must survive — it is somebody’s judgement, not a score',
  );
  assert.equal(g.reason, 'Instead of Barbell Bench Press');
});

test('⚠ an edge pointing outside the visible catalogue is skipped, not rendered as an id', () => {
  /*
   * The graph is generated from a 797-row source file; the app shows 721. A target the picker cannot
   * resolve would otherwise surface as a raw slug the athlete taps and nothing happens.
   */
  const g = swapSuggestions({
    currentKey: 'barbell-bench-press',
    currentName: 'Barbell Bench Press',
    pool: POOL,
    alternativeKeys: ['some-retired-exercise', 'push-up'],
  });
  assert.ok(
    !g.picks.some((p) => p.key === 'some-retired-exercise'),
    'an unresolvable target must never surface as a raw slug the athlete can tap',
  );
  assert.equal(g.picks[0].key, 'push-up', 'the resolvable graph edge still leads');
  // The remaining slots fill from the same-pattern fallback, which is the designed behaviour.
  for (const p of g.picks) assert.ok(POOL.some((x) => x.key === p.key), `${p.key} is not in the catalogue`);
});

test('the same-pattern fallback answers when the graph is silent', () => {
  const g = swapSuggestions({
    currentKey: 'barbell-bench-press',
    currentName: 'Barbell Bench Press',
    pool: POOL,
    alternativeKeys: [],
  });
  assert.ok(g, 'no graph edges must not mean no answer');
  assert.equal(g.picks.length, 3);
  for (const p of g.picks) {
    const item = POOL.find((x) => x.key === p.key);
    assert.equal(item.pattern, 'Horizontal Push', `${p.name} is not the same movement`);
  }
  assert.ok(!g.picks.some((p) => p.key === 'barbell-bench-press'), 'it must never suggest the lift itself');
});

test('⚠ it never suggests something already on today’s card', () => {
  const g = swapSuggestions({
    currentKey: 'barbell-bench-press',
    currentName: 'Barbell Bench Press',
    pool: POOL,
    alternativeKeys: ['dumbbell-bench-press', 'push-up'],
    inSession: ['barbell-bench-press', 'dumbbell-bench-press'],
  });
  assert.ok(!g.picks.some((p) => p.key === 'dumbbell-bench-press'), 'swapping for a lift you are about to do anyway is not a swap');
});

test('a lift with no catalogue key still resolves, by name', () => {
  const g = swapSuggestions({ currentKey: null, currentName: 'Barbell Bench Press', pool: POOL });
  assert.ok(g);
  assert.ok(g.picks.length > 0, 'freestyle-added exercises carry a name and often no key');
});

test('an unknown lift with no graph edges suggests nothing rather than guessing', () => {
  const g = swapSuggestions({ currentKey: 'not-in-catalogue', currentName: 'Something Invented', pool: POOL });
  assert.equal(g, null, 'a coach with nothing useful to say should say nothing');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ADD — about the session
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⭐ add names the gap in today’s session, in priority order', () => {
  // Pressed and squatted, never pulled. Horizontal Pull outranks the rest of what is missing.
  const g = addSuggestions({ sessionKeys: ['barbell-bench-press', 'back-squat'], pool: POOL });
  assert.ok(g);
  assert.equal(g.reason, "You haven't pulled anything today");
  assert.deepEqual(g.picks.map((p) => p.key), ['barbell-row', 'dumbbell-row']);
});

test('⚠ ONE gap, not a list of everything the session is not', () => {
  const g = addSuggestions({ sessionKeys: ['barbell-bench-press'], pool: POOL });
  const patterns = new Set(g.picks.map((p) => POOL.find((x) => x.key === p.key).pattern));
  assert.equal(patterns.size, 1, 'one exercise from each of three gaps is a critique, not an answer');
});

test('⚠ work logged without a catalogue key still counts as work done', () => {
  /*
   * The regression this exists to catch: telling somebody who has just benched that they have not
   * pressed. Anything added freestyle can reach the session with a name and no key.
   */
  const withKey = addSuggestions({ sessionKeys: ['barbell-bench-press', 'barbell-row'], pool: POOL });
  const byName = addSuggestions({
    sessionKeys: [],
    sessionNames: ['Barbell Bench Press', 'Barbell Row'],
    pool: POOL,
  });
  assert.equal(byName.reason, withKey.reason, 'a name-only exercise must cover its pattern too');
  assert.notEqual(byName.reason, "You haven't pressed anything today");
});

test('nothing to say once the big patterns are covered', () => {
  const g = addSuggestions({
    sessionKeys: ['barbell-bench-press', 'barbell-row', 'back-squat', 'romanian-deadlift', 'plank'],
    pool: POOL,
  });
  // Only Vertical Pull / Vertical Push remain and the fixture pool holds neither, so there is no
  // trainable gap — and a gap nothing can fill must not be announced.
  assert.equal(g, null);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// EQUIPMENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⚠ a null home gym does NOT filter — it means "not answered", never "owns nothing"', () => {
  /*
   * The single most dangerous line in this module. `null` and `[]` are different facts, and reading the
   * first as the second empties every suggestion list in the app for everyone who skipped that setup
   * question — a feature that looks broken rather than empty.
   */
  const unset = swapSuggestions({ currentKey: 'barbell-bench-press', currentName: 'Barbell Bench Press', pool: POOL, owned: null });
  const absent = swapSuggestions({ currentKey: 'barbell-bench-press', currentName: 'Barbell Bench Press', pool: POOL });
  assert.ok(unset && unset.picks.length > 0, 'an unanswered home gym must not silence the coach');
  assert.deepEqual(unset.picks, absent.picks, 'null and undefined must behave identically');
});

test('a real equipment list narrows the offer', () => {
  const g = swapSuggestions({
    currentKey: 'barbell-bench-press',
    currentName: 'Barbell Bench Press',
    pool: POOL,
    owned: [],
  });
  assert.ok(g);
  const keys = g.picks.map((p) => p.key);
  assert.ok(keys.includes('push-up'), 'what needs nothing must always survive');
  assert.ok(!keys.includes('barbell-bench-press'), 'the lift itself is never a swap');
  assert.ok(!keys.includes('dumbbell-bench-press'), 'dumbbells are not owned');
  /*
   * ⚠ A MACHINE IS NOT FILTERED OUT, AND THAT IS `canDoExercise`'S RULE, NOT AN OVERSIGHT.
   * `EQUIP_UNLOCK` maps HOME gear ids; a cable stack or a chest press has none, so it requires nothing
   * and "nothing required = always yes". That is the right reading — the home-gym list says what the
   * athlete owns at home and says nothing at all about the gym they may be standing in. Asserted so a
   * later change here cannot quietly start hiding every machine from anyone with a home gym.
   */
  assert.ok(keys.includes('machine-chest-press'));
});

test('a gap nothing in the room can train is not the gap that gets named', () => {
  const g = addSuggestions({ sessionKeys: ['push-up'], pool: POOL, owned: [] });
  // Horizontal Pull is missing and is higher priority, but every row in the pool needs equipment.
  assert.ok(g === null || g.reason !== "You haven't pulled anything today");
});

test('the gap list is ordered, and every entry has words for it', () => {
  assert.equal(GAP_PATTERNS[0], 'Horizontal Push');
  assert.ok(GAP_PATTERNS.includes('Core'));
  // Every pattern must produce a sentence rather than the raw slot name.
  for (const p of GAP_PATTERNS) {
    const g = addSuggestions({ sessionKeys: [], pool: [ex('x', 'X', p, 'bodyweight', ['m'])] });
    assert.ok(g, `${p} produced no group`);
    assert.doesNotMatch(g.reason, /\//, `"${g.reason}" is a slot name, not a sentence`);
  }
});
