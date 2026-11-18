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

// Sprint 3b (11-18), lane C probe beside the eval's two "creamy" flags: `cream\b` stopped at the e, so "creamed" and
// "creams" were SHOWN to a dairy avoider — by name and by line. Fail closed.
test('"creamed" and "creams" are dairy - in a name and in a line', async () => {
  const { dishCards } = await import('../kitchen-cards.ts');
  const named = dish('Creamed Chicken', ['6 oz chicken breast']);
  assert.ok(allergensByWord(named).includes('dairy'));
  assert.ok(allergensByWord(dish('Chicken Bowl', ['1 cup creamed spinach'])).includes('dairy'));
  assert.ok(allergensByWord(dish('Sundae Bar', ['2 ice creams'])).includes('dairy'));
  const card = (name, text, food) => ({ name, why: '', cuisine: 'American', method: 'pan', minutes: 20, servings: 1, mealType: 'dinner', ingredients: [{ text: '6 oz chicken breast', quantity: 170, unit: 'g', food: 'chicken breast' }, { text, quantity: 30, unit: 'g', food }], steps: ['a', 'b'] });
  assert.equal(dishCards([card('Creamed Spinach Chicken', '1 cup creamed spinach', 'baby spinach')], ['dairy'], null).length, 0);
  // Nothing avoided: the same dish is still shown.
  assert.equal(dishCards([card('Creamed Spinach Chicken', '1 cup creamed spinach', 'baby spinach')], [], null).length, 1);
});
