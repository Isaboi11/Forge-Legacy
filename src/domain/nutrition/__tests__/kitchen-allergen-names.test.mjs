// node --experimental-strip-types --test src/domain/nutrition/__tests__/kitchen-allergen-names.test.mjs
//
// Sprint 3 (11-17): with coach-kitchen's real request (thinking off), the allergen eval found dishes NAMED for an
// allergen the athlete avoids — "Grilled Teriyaki Chicken Thighs" for a soy avoider, "Dairy-Free Herb Pesto Pasta" for a
// tree-nut avoider — whose ingredient lines were clean (honey + vinegar; parsley + parmesan). The filter read only the
// ingredients. It now reads the name too, minus "<allergen>-free" phrases. Inputs: the recorded dishes, trimmed.
import test from 'node:test';
import assert from 'node:assert/strict';

import { allergensByWord } from '../kitchen-dishes.ts';

const dish = (name, lines) => ({ name, why: '', cuisine: '', method: '', minutes: 20, servings: 2, mealType: 'dinner', ingredients: lines.map((t) => ({ text: t, food: t })), steps: [] });

test('a dish NAMED for an allergen is read as carrying it, even when its lines are clean', () => {
  const teriyaki = dish('Grilled Teriyaki Chicken Thighs', ['14 oz boneless chicken thighs', '2 tbsp honey', '1 tbsp cider vinegar']);
  assert.ok(allergensByWord(teriyaki).includes('soy'));
  const pesto = dish('Dairy-Free Herb Pesto Pasta', ['6 oz spaghetti', '2 cups fresh parsley', '3 tbsp olive oil']);
  assert.ok(allergensByWord(pesto).includes('tree_nuts'));
});

test('"<allergen>-free" in a name is not the allergen; an ordinary name adds nothing', () => {
  const free = dish('Dairy-Free Squash Mac', ['6 oz rice pasta', '1 cup butternut squash']);
  assert.ok(!allergensByWord(free).includes('dairy'));
  const plain = dish('Lemon Herb Chicken', ['2 chicken breasts', '1 lemon']);
  assert.deepEqual(allergensByWord(plain), []);
  // The ingredient lines still count exactly as before.
  assert.ok(allergensByWord(dish('Weeknight Bowl', ['2 tbsp soy sauce'])).includes('soy'));
});
