import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECIPE_READ_SCHEMA,
  readFromModelText,
  recipePhotoError,
  recipePhotoResultFrom,
  sanitizeRecipeRead,
} from '../recipe-photo-read.ts';
import { draftFromRead, gramsFor, importToast, ingredientFrom, matchFood, unmatchedNote } from '../recipe-import.ts';
import { detectAllergens, missingLine, recipeFrom, toBook, totalsOf } from '../user-recipes.ts';

/*
 * RECIPE PHOTO IMPORT — the domain half. The Edge Function reads the page; these hold what the app does
 * with the answer: NUT-D4 (no nutrition number the page or the model wrote survives), Kitchen-Scope §3.4
 * (unmatched is shown as unmatched, never guessed), NUT-D6 (the draft is unconfirmed), and the grams.
 *
 * ⚠ The fixture is HAND-BUILT in the schema's shape, not a live read — live reads cost money
 * (`feedback_live_ai_tests_spend_real_money`). When the first real read comes back, add it here.
 */

const MODEL_ANSWER = {
  isRecipe: true,
  name: 'Garlic butter chicken with rice and spinach — a weeknight classic that runs long',
  servings: 4,
  minutes: 33,
  mealType: 'dinner',
  ingredients: [
    { text: '1.5 lb chicken breasts', quantity: 1.5, unit: 'lb', food: 'chicken breasts' },
    { text: '2 tbsp butter', quantity: 2, unit: 'tbsp', food: 'butter' },
    { text: '4 cloves garlic, minced', quantity: 4, unit: 'cloves', food: 'garlic' },
    { text: '1 cup long-grain rice', quantity: 1, unit: 'cup', food: 'long-grain white rice' },
    { text: '2 large eggs', quantity: 2, unit: 'large', food: 'eggs' },
    { text: '1 tsp smoked sugar', quantity: 1, unit: 'tsp', food: 'sugar' },
    { text: 'Salt to taste', quantity: null, unit: '', food: 'salt' },
    { text: '1 cup salmon', quantity: 1, unit: 'cup', food: 'salmon' },
    { text: '2 tbsp harissa', quantity: 2, unit: 'tbsp', food: 'harissa' },
  ],
  steps: ['Season the chicken and brown it in butter.', 'Add garlic, then the rice and water; simmer 18 minutes.'],
  // ⛔ What a recipe card prints, and what the model must never be believed about (NUT-D4).
  calories: 9999,
  protein: 999,
  nutrition: { kcal: 9999, carbs: 1, fat: 1 },
};

/* ── NUT-D4 ─────────────────────────────────────────────────────────────── */

test('⛔ the schema has no field that can carry a nutrition number', () => {
  const keys = JSON.stringify(RECIPE_READ_SCHEMA).toLowerCase();
  for (const banned of ['calor', 'kcal', 'protein', 'carb', '"fat', 'macro', 'nutrition', 'sugar', 'sodium', 'fiber']) {
    assert.ok(!keys.includes(banned), `schema mentions ${banned}`);
  }
  assert.equal(RECIPE_READ_SCHEMA.additionalProperties, false);
  assert.equal(RECIPE_READ_SCHEMA.properties.ingredients.items.additionalProperties, false);
});

test('⛔ any nutrition the model sends is dropped by the guard — on the server and on the device', () => {
  const read = sanitizeRecipeRead(MODEL_ANSWER);
  assert.ok(read);
  assert.deepEqual(Object.keys(read).sort(), ['ingredients', 'mealType', 'minutes', 'name', 'servings', 'steps']);
  assert.ok(!JSON.stringify(read).includes('9999'));
  for (const x of read.ingredients) assert.deepEqual(Object.keys(x).sort(), ['food', 'quantity', 'text', 'unit']);

  const viaWire = recipePhotoResultFrom({ ok: true, read: MODEL_ANSWER, remaining: 40 });
  assert.equal(viaWire.kind, 'ok');
  assert.ok(!JSON.stringify(viaWire).includes('9999'));
});

test('⛔ the draft’s numbers are the app’s own USDA maths, whatever the page claimed', () => {
  const { form } = draftFromRead(sanitizeRecipeRead(MODEL_ANSWER));
  const t = totalsOf(form.ingredients);
  assert.ok(t.kcal > 0 && t.kcal < 9999);
  const saved = recipeFrom(form, 'u:x', '2026-09-25T00:00:00Z');
  const { recipe } = toBook({ ...saved, mealTypes: ['dinner'] });
  assert.equal(recipe.kcal, Math.round(t.kcal / form.yield));
});

/* ── the guard ──────────────────────────────────────────────────────────── */

test('the model’s abstain and a read with no ingredients are both "not a recipe to the app"', () => {
  assert.equal(sanitizeRecipeRead({ isRecipe: false, name: 'x', ingredients: [{ text: 'a', food: 'a' }] }), null);
  assert.equal(sanitizeRecipeRead({ isRecipe: true, name: 'x', ingredients: [] }), null);
  assert.deepEqual(readFromModelText('{"isRecipe":false,"name":"","servings":null,"minutes":null,"mealType":"unknown","ingredients":[],"steps":[]}'), { ok: false, reason: 'not_a_recipe' });
  assert.deepEqual(readFromModelText('This is a photo of a dog.'), { ok: false, reason: 'unreadable' });
  assert.equal(readFromModelText(JSON.stringify(MODEL_ANSWER)).ok, true);
});

test('caps: name 40, ingredients 40, steps 20; junk numbers become null', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({ text: `line ${i}`, quantity: 1, unit: 'g', food: 'egg' }));
  const read = sanitizeRecipeRead({ name: 'n'.repeat(90), servings: -2, minutes: 'soon', mealType: 'brunch', ingredients: many, steps: Array(30).fill('stir') });
  assert.equal(read.name.length, 40);
  assert.equal(read.ingredients.length, 40);
  assert.equal(read.steps.length, 20);
  assert.equal(read.servings, null);
  assert.equal(read.minutes, null);
  assert.equal(read.mealType, null);
});

/* ── matching: certain, or unmatched ────────────────────────────────────── */

test('a food matches only when a catalogue name IS that food', () => {
  assert.equal(matchFood('eggs').key, 'egg');
  assert.equal(matchFood('egg').key, 'egg');
  assert.equal(matchFood('chicken breasts').key, 'chicken_breast');
  assert.equal(matchFood('garlic').key, 'garlic');
  assert.equal(matchFood('Olive oil').key, 'olive_oil');
  assert.equal(matchFood('long-grain white rice').key, 'white_rice');
});

test('⛔ one loose hit is not a match — "sugar" is not brown sugar, "salmon" is not smoked salmon', () => {
  const sugar = matchFood('sugar');
  assert.equal(sugar.key, null);
  assert.ok(sugar.candidates.includes('brown_sugar'), 'offered as a choice, never picked');
  const salmon = matchFood('salmon');
  assert.equal(salmon.key, null);
  assert.ok(salmon.candidates.includes('salmon') && salmon.candidates.includes('smoked_salmon'));
  assert.deepEqual(matchFood('harissa'), { key: null, candidates: [] });
});

test('no hit on the whole phrase: each word’s hits are offered as choices only', () => {
  const r = matchFood('cheddar cheese');
  assert.equal(r.key, null);
  assert.ok(r.candidates.includes('cheddar'));
});

/* ── the amount ─────────────────────────────────────────────────────────── */

test('grams come from the ingredient’s own USDA measure', () => {
  assert.equal(gramsFor('chicken_breast', 1.5, 'lb'), 680.4);
  assert.equal(gramsFor('chicken_breast', 6, 'oz'), 170.1);
  assert.equal(gramsFor('butter', 2, 'tbsp'), 28.4); // tsp-measured: 2 × 3 × 4.73
  assert.equal(gramsFor('butter', 1, 'T'), 14.2);
  assert.equal(gramsFor('salt', 1, 't'), 6);
  assert.equal(gramsFor('milk', 1, 'cup'), 244);
  assert.equal(gramsFor('milk', 250, 'ml'), 257.8);
  assert.equal(gramsFor('garlic', 4, 'cloves'), 12);
  assert.equal(gramsFor('egg', 2, 'large'), 100);
  assert.equal(gramsFor('egg', 2, ''), 100);
  assert.equal(gramsFor('flour', 200, 'g'), 200);
});

test('⛔ an amount that does not convert is null, never a guess', () => {
  assert.equal(gramsFor('salmon', 1, 'cup'), null, 'a volume of an ounce-measured food');
  assert.equal(gramsFor('milk', 2, 'large'), null, 'a count of a volume-measured food');
  assert.equal(gramsFor('egg', 1, 'cup'), null);
  assert.equal(gramsFor('salt', null, ''), null, 'to taste');
  assert.equal(gramsFor('flour', 1, 'handful'), null, 'a unit nobody can weigh');
  assert.equal(gramsFor('olive_oil', 40, 'cups'), null, 'insane — a misread');
});

test('the form keeps the page’s own portion when it can, grams otherwise', () => {
  assert.deepEqual(ingredientFrom('milk', 1.5, 'cups'), { key: 'milk', g: 366, unit: 'portion', qty: 1.5 });
  assert.deepEqual(ingredientFrom('garlic', 4, 'cloves'), { key: 'garlic', g: 12, unit: 'portion', qty: 4 });
  assert.deepEqual(ingredientFrom('butter', 2, 'tbsp'), { key: 'butter', g: 28, unit: 'portion', qty: 2 });
  assert.deepEqual(ingredientFrom('chicken_breast', 1.5, 'lb'), { key: 'chicken_breast', g: 680, unit: 'g', qty: 680 });
  assert.deepEqual(ingredientFrom('milk', 0.33, 'cup'), { key: 'milk', g: 81, unit: 'g', qty: 81 });
});

/* ── the draft ──────────────────────────────────────────────────────────── */

test('the draft: matched lines join the form, everything else is unmatched and says why', () => {
  const r = draftFromRead(sanitizeRecipeRead(MODEL_ANSWER));
  assert.deepEqual(r.form.ingredients.map((x) => x.key), ['chicken_breast', 'butter', 'garlic', 'white_rice', 'egg']);
  assert.equal(r.matched, 5);
  const why = Object.fromEntries(r.unmatched.map((u) => [u.food, u.reason]));
  assert.deepEqual(why, { sugar: 'ambiguous', salt: 'amount', salmon: 'ambiguous', harissa: 'no_match' });
  // The line is shown as written.
  assert.equal(r.unmatched.find((u) => u.food === 'harissa').text, '2 tbsp harissa');
  // An amount-only miss offers exactly the food it is certain of.
  assert.deepEqual(r.unmatched.find((u) => u.food === 'salt').candidates, ['salt']);
});

test('⛔ NUT-D6: the draft is unconfirmed, with allergens pre-filled from the catalogue', () => {
  const r = draftFromRead(sanitizeRecipeRead(MODEL_ANSWER));
  assert.equal(r.form.confirmed, false);
  assert.deepEqual(r.form.allergens, detectAllergens(r.form.ingredients));
  assert.ok(r.form.allergens.includes('dairy') && r.form.allergens.includes('eggs'));
  assert.equal(r.form.editId, null, 'a new recipe, not an edit');
  assert.equal(toBook({ ...recipeFrom(r.form, 'u:y', 'now') }).plannable, false);
});

test('the draft carries the page’s name, yield, time and meal type — clamped to the form', () => {
  const r = draftFromRead(sanitizeRecipeRead(MODEL_ANSWER));
  assert.equal(r.form.name.length, 40);
  assert.equal(r.form.yield, 4);
  assert.equal(r.form.minutes, 35);
  assert.deepEqual(r.form.mealTypes, ['dinner']);
  assert.equal(r.form.steps.length, 2);
  assert.equal(missingLine(r.form), '');
  const bare = draftFromRead(sanitizeRecipeRead({ name: '', ingredients: [{ text: '2 eggs', quantity: 2, unit: '', food: 'eggs' }], steps: [] }));
  assert.deepEqual(bare.form.steps, ['']);
  assert.equal(bare.form.minutes, 20);
  assert.equal(missingLine(bare.form), 'Add a name and a meal type');
});

test('the copy: approximate totals, the toast, and every failure distinct from "offline"', () => {
  assert.equal(unmatchedNote(0), '');
  assert.equal(unmatchedNote(1), 'Approximate: 1 ingredient isn’t matched yet');
  assert.equal(importToast({ matched: 5, unmatched: [1, 2] }), 'Matched 5 of 7 ingredients. Pick or drop the rest.');
  assert.equal(importToast({ matched: 3, unmatched: [] }), 'Read all 3 ingredients. Check them and save.');

  assert.equal(recipePhotoResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 0 }).kind, 'not_entitled');
  assert.equal(recipePhotoResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 75 }).kind, 'out_of_credits');
  assert.equal(recipePhotoResultFrom({ ok: false, reason: 'no_nutrition' }).kind, 'no_nutrition');
  assert.equal(recipePhotoResultFrom({ ok: false, reason: 'not_a_recipe' }).kind, 'not_a_recipe');
  assert.equal(recipePhotoResultFrom({ ok: false, reason: 'upstream_error' }).kind, 'unavailable');
  assert.equal(recipePhotoResultFrom({ ok: true, read: { isRecipe: true, ingredients: [] } }).kind, 'unreadable');
  const words = new Set(['not_a_recipe', 'unreadable', 'unavailable', 'offline'].map((kind) => recipePhotoError({ kind })));
  assert.equal(words.size, 4);
});
