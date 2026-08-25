/**
 * `groupLabel` — what a day of training is called, from the muscles in it.
 *
 * The rule is shared by two surfaces (the Program Builder's day subtitle and the name an unnamed session
 * is saved under), which is why it is tested here rather than through either of them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { groupLabel, MUSCLE_GROUP } from '../session-label.ts';

test('one group is that group', () => {
  assert.equal(groupLabel([['Quads'], ['Hamstrings'], ['Glutes']]), 'Legs');
});

test('two groups are joined, most-worked first', () => {
  assert.equal(groupLabel([['Chest'], ['Chest'], ['Lats']]), 'Chest & Back');
  assert.equal(groupLabel([['Lats'], ['Lats'], ['Chest']]), 'Back & Chest');
});

test('three or more is Full Body — a name, not a list', () => {
  assert.equal(groupLabel([['Chest'], ['Lats'], ['Quads']]), 'Full Body');
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
  assert.equal(groupLabel([['Chest', 'Triceps', 'Shoulders']]), 'Chest');
  assert.equal(groupLabel([['Lats', 'Biceps']]), 'Back');
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
  assert.equal(groupLabel([['Chest', 'Triceps', 'Shoulders', 'Forearms']]), 'Chest');
});

test('five back movements outrank the one curl that came first', () => {
  // Order in the session must not decide the name — see the ranking note in `groupLabel`.
  const lists = [['Biceps'], ['Lats'], ['Lats'], ['Lats'], ['Lats'], ['Lats']];
  assert.equal(groupLabel(lists), 'Back & Arms');
});

test('the same session logged in a different order gets the SAME name', () => {
  /*
   * ⚠ WITHOUT THE TIE-BREAK THIS IS ORDER-DEPENDENT. `Map` iterates in insertion order, so two groups on
   * equal weight would be named by whichever was logged first — and one athlete's "Chest & Back" would
   * be another's "Back & Chest" for an identical workout.
   */
  const a = groupLabel([['Chest'], ['Lats']]);
  const b = groupLabel([['Lats'], ['Chest']]);
  assert.equal(a, b);
});

test('nothing mappable is an empty string, never an invented name', () => {
  assert.equal(groupLabel([]), '');
  assert.equal(groupLabel([undefined, []]), '');
  assert.equal(groupLabel([['Tibialis']]), '', 'a muscle outside the map contributes nothing');
});

test('every value in the map is one of the five groups the label can produce', () => {
  // Guards a typo'd group name, which would otherwise surface as a workout called "Bak".
  const allowed = new Set(['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']);
  for (const [muscle, group] of Object.entries(MUSCLE_GROUP)) {
    assert.ok(allowed.has(group), `${muscle} maps to an unknown group: ${group}`);
  }
});
