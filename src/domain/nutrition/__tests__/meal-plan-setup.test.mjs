import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDislike,
  blockedNote,
  clampHousehold,
  draftFrom,
  freshDraft,
  parseBudget,
  prefsFrom,
  setupGate,
  toggleAllergen,
  toggleMeal,
} from '../meal-plan-setup.ts';

const TODAY = '2026-09-23';
const TARGET = { kcal: 2500, protein: 190, carb: 250, fat: 80 };

test('under 18 is shut even WITH a manual target — and says the year it opens', () => {
  assert.deepEqual(setupGate(2010, TARGET, TODAY), { kind: 'under-age', unlockYear: 2028 });
});

test('the age door is checked before the target door', () => {
  assert.equal(setupGate(2012, null, TODAY)?.kind, 'under-age');
});

test('an adult with no target is sent to set one — Forge never invents the number', () => {
  assert.deepEqual(setupGate(1994, null, TODAY), { kind: 'no-target' });
  assert.deepEqual(setupGate(1994, { ...TARGET, kcal: 0 }, TODAY), { kind: 'no-target' });
});

test('an adult with a target may set up', () => {
  assert.equal(setupGate(1994, TARGET, TODAY), null);
});

test('no birth year on file is not treated as under 18', () => {
  assert.equal(setupGate(null, TARGET, TODAY), null);
});

test('turning 18 this year opens the door', () => {
  assert.equal(setupGate(2008, TARGET, TODAY), null);
});

test('a fresh setup starts with allergies UNANSWERED, and Continue shut', () => {
  const d = freshDraft();
  assert.equal(d.allergyMode, null);
  assert.equal(blockedNote(1, d), 'Answer allergies to continue.');
});

test('"No allergies" opens Continue', () => {
  assert.equal(blockedNote(1, { ...freshDraft(), allergyMode: 'none' }), '');
});

test('"Add allergies" with nothing picked stays shut, and says both ways out', () => {
  assert.equal(
    blockedNote(1, { ...freshDraft(), allergyMode: 'add' }),
    'Pick at least one allergy, or choose No allergies.',
  );
  assert.equal(blockedNote(1, { ...freshDraft(), allergyMode: 'add', allergens: ['eggs'] }), '');
});

test('step 2 needs at least one meal', () => {
  assert.equal(blockedNote(2, { ...freshDraft(), meals: [] }), 'Pick at least one meal.');
  assert.equal(blockedNote(2, freshDraft()), '');
});

test('"No allergies" saves none, even if chips were tapped first', () => {
  const d = { ...freshDraft(), allergyMode: 'none', allergens: ['dairy', 'soy'] };
  assert.deepEqual(prefsFrom(d).allergens, []);
});

test('a saved setup reopens answered — "none" does not re-lock Continue', () => {
  const none = draftFrom({ ...prefsFrom({ ...freshDraft(), allergyMode: 'none' }) });
  assert.equal(none.allergyMode, 'none');
  assert.equal(blockedNote(1, none), '');
  const some = draftFrom({ ...prefsFrom({ ...freshDraft(), allergyMode: 'add', allergens: ['fish'] }) });
  assert.equal(some.allergyMode, 'add');
  assert.deepEqual(some.allergens, ['fish']);
});

test('dislikes: trimmed, lower-cased, no duplicates, nothing blank', () => {
  let list = addDislike([], '  Mushrooms ');
  list = addDislike(list, 'mushrooms');
  list = addDislike(list, '   ');
  list = addDislike(list, 'Blue   Cheese');
  assert.deepEqual(list, ['mushrooms', 'blue cheese']);
});

test('dislikes are capped in length and in count', () => {
  assert.equal(addDislike([], 'x'.repeat(80))[0].length, 30);
  const full = Array.from({ length: 50 }, (_, i) => `food ${i}`);
  assert.equal(addDislike(full, 'one more'), full);
});

test('allergens and meals keep their canonical order whatever order they were tapped', () => {
  assert.deepEqual(toggleAllergen(toggleAllergen([], 'sesame'), 'peanuts'), ['peanuts', 'sesame']);
  assert.deepEqual(toggleAllergen(['peanuts', 'sesame'], 'peanuts'), ['sesame']);
  assert.deepEqual(toggleMeal(['dinner'], 'breakfast'), ['breakfast', 'dinner']);
  assert.deepEqual(toggleMeal(['breakfast', 'dinner'], 'dinner'), ['breakfast']);
});

test('household stays between 1 and 8', () => {
  assert.equal(clampHousehold(0), 1);
  assert.equal(clampHousehold(12), 8);
  assert.equal(clampHousehold(3), 3);
});

test('budget: digits only, five at most, empty or zero means none', () => {
  assert.deepEqual(parseBudget('$1,25'), { text: '125', value: 125 });
  assert.deepEqual(parseBudget('1234567'), { text: '12345', value: 12345 });
  assert.deepEqual(parseBudget(''), { text: '', value: null });
  assert.deepEqual(parseBudget('000'), { text: '', value: null });
  assert.equal(prefsFrom({ ...freshDraft(), allergyMode: 'none', weeklyBudgetUsd: 0 }).weeklyBudgetUsd, null);
});
