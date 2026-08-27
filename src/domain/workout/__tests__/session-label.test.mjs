/**
 * `groupLabel` — what a day of training is called, from the muscles in it.
 *
 * The rule is shared by two surfaces (the Program Builder's day subtitle and the name an unnamed session
 * is saved under), which is why it is tested here rather than through either of them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { groupLabel, MUSCLE_GROUP, sessionLabel } from '../session-label.ts';

/**
 * ⚠ THE FIXTURE IS THE CATALOGUE, NOT A LIST TYPED OUT HERE — and that is the whole point.
 *
 * Every assertion below used to speak gym shorthand (`Quads`, `Lats`, `Abs`) that the app has never
 * produced. `buildPickerDb` emits the raw `muscles.json` display name, so the real inputs are
 * `Quadriceps`, `Latissimus Dorsi`, `Rectus Abdominis`. The map and the fixture shared one invented
 * dialect, agreed with each other, and stayed green while 64% of the catalogue could not name a
 * session. Reading the source tables is what makes that impossible to repeat.
 */
const SRC = fileURLToPath(new URL('../../exercise-relationships/source/', import.meta.url));
const read = (f) => JSON.parse(readFileSync(SRC + f, 'utf8'));
const MUSCLES = read('muscles.json');
const LINKS = read('exercise_muscles.json');

const NAME_BY_ID = new Map(MUSCLES.map((m) => [m.id, m.name]));
/** `region: 'System'` values are descriptors, not body parts — see the note on `MUSCLE_GROUP`. */
const ANATOMICAL = new Set(MUSCLES.filter((m) => m.region !== 'System').map((m) => m.name));

test('⚠ every anatomical muscle in the catalogue can name a session', () => {
  /*
   * THE REGRESSION THIS EXISTS FOR. Nine of the fifteen old keys — Lats, Quads, Abs, Back, Shoulders,
   * Side Delts, Rear Delts, Upper Chest, Core — matched no muscle at all, so a row's `Upper Back`
   * primary contributed nothing and the PO's chest/back/treadmill session saved as "Chest".
   */
  const unmapped = [...ANATOMICAL].filter((n) => !MUSCLE_GROUP[n]).sort();
  assert.deepEqual(unmapped, [], `unmapped anatomical muscles: ${unmapped.join(', ')}`);
});

test('⚠ every key in the map is a real muscle name', () => {
  // The other direction: a key nothing produces is dead weight that reads as coverage.
  const real = new Set(MUSCLES.map((m) => m.name));
  const phantom = Object.keys(MUSCLE_GROUP).filter((k) => !real.has(k)).sort();
  assert.deepEqual(phantom, [], `keys matching no muscle: ${phantom.join(', ')}`);
});

test('⚠ every exercise with an anatomical primary can contribute to a name', () => {
  const primaryNames = new Map();
  for (const l of LINKS) {
    if (l.role !== 'Primary') continue;
    const n = NAME_BY_ID.get(l.muscleId);
    if (n && ANATOMICAL.has(n)) primaryNames.set(l.exerciseId, n);
  }
  const blind = [...primaryNames.entries()].filter(([, n]) => !MUSCLE_GROUP[n]);
  assert.equal(blind.length, 0, `${blind.length} exercises cannot name a session`);
  assert.ok(primaryNames.size > 500, 'sanity: the catalogue should be mostly anatomical');
});

test('one group is that group', () => {
  assert.equal(groupLabel([['Quadriceps'], ['Hamstrings'], ['Glutes']]), 'Legs');
});

test('two groups are joined, most-worked first', () => {
  assert.equal(groupLabel([['Chest'], ['Chest'], ['Latissimus Dorsi']]), 'Chest & Back');
  assert.equal(groupLabel([['Latissimus Dorsi'], ['Latissimus Dorsi'], ['Chest']]), 'Back & Chest');
});

test('three or more is Full Body — a name, not a list', () => {
  assert.equal(groupLabel([['Chest'], ['Latissimus Dorsi'], ['Quadriceps']]), 'Full Body');
});

test('⚠ the PO’s session: a row is BACK, so this is not "Chest"', () => {
  /*
   * The real shapes, straight from `exercise_muscles.json`:
   *   Dumbbell Floor Press → Chest primary
   *   Push-Up             → Chest primary
   *   Single-Arm DB Row   → Upper Back primary  ← the one the old map could not see
   * plus a treadmill walk, which is cardio and does not sit in this list at all.
   */
  const lifts = [['Chest', 'Triceps'], ['Chest', 'Triceps'], ['Upper Back', 'Latissimus Dorsi', 'Biceps']];
  assert.equal(groupLabel(lifts), 'Chest & Back', 'the old map returned "Chest"');
  assert.equal(sessionLabel(lifts, { cardio: true }), 'Chest & Back + Cardio');
});

test('cardio is appended, never counted as a third group', () => {
  /*
   * Counting it would trip the 3+ rule and call a chest/back day with a warm-up walk "Full Body".
   *
   * ⚠ TWO CHEST TO ONE BACK, NOT ONE EACH. At one-each the groups genuinely tie and the alphabetical
   * tie-break decides — "Back & Chest" — which is the documented behaviour of `groupLabel`, not a
   * defect. Asserting the tied case here would be asserting the coin flip.
   */
  const lifts = [['Chest'], ['Chest'], ['Upper Back']];
  assert.equal(sessionLabel(lifts, { cardio: true }), 'Chest & Back + Cardio');
  assert.equal(sessionLabel(lifts, { cardio: false }), 'Chest & Back');
  assert.equal(sessionLabel([['Quadriceps']], { cardio: true }), 'Legs + Cardio');
});

test('a session with no lifting in it is Cardio', () => {
  assert.equal(sessionLabel([], { cardio: true }), 'Cardio');
});

test('a stretching session is Mobility, not the launch-path literal', () => {
  // 48 movements carry `Mobility` as their primary and no anatomical muscle at all.
  assert.equal(sessionLabel([['Mobility'], ['Mobility']]), 'Mobility');
  assert.equal(sessionLabel([['Mobility']], { cardio: true }), 'Mobility + Cardio');
});

test('one hip-opener does not rename a squat session', () => {
  assert.equal(sessionLabel([['Quadriceps'], ['Glutes'], ['Mobility']]), 'Legs');
});

test('sessionLabel still admits when there is nothing to say', () => {
  assert.equal(sessionLabel([]), '');
  assert.equal(sessionLabel([['Grip']]), '', 'a System descriptor is not a body part');
});

test('⚠ ONE bench press is "Chest" — not "Chest & Arms", and certainly not "Full Body"', () => {
  /*
   * THIS FUNCTION GOT IT WRONG TWICE BEFORE THIS TEST EXISTED, in both available directions:
   *
   *   · counting every muscle equally → Chest, Triceps and Shoulders each score 1, three groups, so a
   *     single bench press was called **"Full Body"**;
   *   · weighting the primary but still counting the rest → **"Chest & Arms"**, which is a name for a
   *     session that also had curls in it.
   *
   * The rule that survives is that assistance work cannot NAME anything. One exercise, one primary, one
   * group.
   */
  assert.equal(groupLabel([['Chest', 'Triceps', 'Front Deltoids']]), 'Chest');
  assert.equal(groupLabel([['Latissimus Dorsi', 'Biceps']]), 'Back');
});

test('the arms show up when something is actually training them', () => {
  /*
   * Two presses (Chest primary) and a curl (Biceps primary) — Arms has earned its half of the name now
   * that something is pointed at it, and Chest leads because more of the session was.
   *
   * ⚠ TWO PRESSES, NOT ONE, ON PURPOSE. At one-each the two groups genuinely tie and the order is a coin
   * flip that the secondary triceps happen to win — a real property of the rule, not a defect, and not
   * something to contort the ranking over. This asserts the case that HAS a right answer.
   */
  assert.equal(groupLabel([['Chest', 'Triceps'], ['Chest', 'Triceps'], ['Biceps']]), 'Chest & Arms');
});

test('a movement cannot be outvoted by its own secondaries', () => {
  assert.equal(groupLabel([['Chest', 'Triceps', 'Front Deltoids', 'Forearms']]), 'Chest');
});

test('five back movements outrank the one curl that came first', () => {
  // Order in the session must not decide the name — see the ranking note in `groupLabel`.
  const lists = [['Biceps'], ['Latissimus Dorsi'], ['Latissimus Dorsi'], ['Latissimus Dorsi'], ['Latissimus Dorsi'], ['Latissimus Dorsi']];
  assert.equal(groupLabel(lists), 'Back & Arms');
});

test('the same session logged in a different order gets the SAME name', () => {
  /*
   * ⚠ WITHOUT THE TIE-BREAK THIS IS ORDER-DEPENDENT. `Map` iterates in insertion order, so two groups on
   * equal weight would be named by whichever was logged first — and one athlete's "Chest & Back" would
   * be another's "Back & Chest" for an identical workout.
   */
  const a = groupLabel([['Chest'], ['Latissimus Dorsi']]);
  const b = groupLabel([['Latissimus Dorsi'], ['Chest']]);
  assert.equal(a, b);
});

test('nothing mappable is an empty string, never an invented name', () => {
  assert.equal(groupLabel([]), '');
  assert.equal(groupLabel([undefined, []]), '');
  assert.equal(groupLabel([['Tibialis Posterior']]), '', 'a name outside the taxonomy contributes nothing');
});

test('every value in the map is one of the five groups the label can produce', () => {
  // Guards a typo'd group name, which would otherwise surface as a workout called "Bak".
  const allowed = new Set(['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']);
  for (const [muscle, group] of Object.entries(MUSCLE_GROUP)) {
    assert.ok(allowed.has(group), `${muscle} maps to an unknown group: ${group}`);
  }
});
