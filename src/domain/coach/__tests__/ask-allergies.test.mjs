import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { allergyNote, allergyReadFrom, withoutAllergens } from '../ask-allergies.ts';

/* AI re-audit 11-20 (P1): Holt's chat holds to the athlete's Meal Plan Setup allergies. */

const card = (id, allergens) => ({ id, name: id, allergens });
const BOOK = [card('pad-thai', ['peanuts', 'eggs', 'soy', 'fish']), card('oats', ['dairy']), card('rice-bowl', []), card('pesto-pasta', ['tree_nuts', 'dairy', 'gluten'])];

test('a peanut allergy keeps every peanut recipe out of get_recipes', () => {
  const kept = withoutAllergens(BOOK, { ok: true, allergens: ['peanuts'] });
  assert.deepEqual(kept.map((c) => c.id), ['oats', 'rice-bowl', 'pesto-pasta']);
});

test('several allergies: a recipe meeting ANY of them is out', () => {
  const kept = withoutAllergens(BOOK, { ok: true, allergens: ['dairy', 'tree_nuts'] });
  assert.deepEqual(kept.map((c) => c.id), ['pad-thai', 'rice-bowl']);
});

test('no allergies said: the whole book, and no note (the request is unchanged)', () => {
  const read = { ok: true, allergens: [] };
  assert.equal(withoutAllergens(BOOK, read).length, BOOK.length);
  assert.equal(allergyNote(read), null);
});

test('⛔ a failed read fails CLOSED: no recipe at all, and Holt asks first', () => {
  const read = { ok: false };
  assert.deepEqual(withoutAllergens(BOOK, read), []);
  assert.match(allergyNote(read), /ask whether they have any food allergies/);
});

test('the note names each allergy with its everyday hiding places', () => {
  const n = allergyNote({ ok: true, allergens: ['peanuts', 'shellfish', 'sesame'] });
  assert.match(n, /peanuts/);
  assert.match(n, /shrimp/);
  assert.match(n, /tahini/);
  assert.match(n, /online recipe/);
  assert.match(n, /sauces, toppings and garnishes/);
});

test('reading the row: none = no allergies; error or junk = a failed read', () => {
  assert.deepEqual(allergyReadFrom(null, null), { ok: true, allergens: [] });
  assert.deepEqual(allergyReadFrom({ allergens: ['Peanuts', 'peanuts', 'dairy'] }, null), { ok: true, allergens: ['peanuts', 'dairy'] });
  assert.deepEqual(allergyReadFrom({ allergens: null }, null), { ok: true, allergens: [] });
  assert.deepEqual(allergyReadFrom(null, { code: '500' }), { ok: false });
  assert.deepEqual(allergyReadFrom({ allergens: 'peanuts' }, null), { ok: false });
  assert.deepEqual(allergyReadFrom({ allergens: [1] }, null), { ok: false });
});

test('coach-ask reads the allergies, filters get_recipes with them, and names them in the USER turn', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/coach-ask/index.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /const recipes = withoutAllergens\(narrowRecipes\(body\.recipes\), allergies\);/);
  assert.match(src, /if \(allergyLine\) messages\[messages\.length - 1\]\.content \+= `\\n\\n\$\{allergyLine\}`;/);
  assert.match(src, /from\('meal_plan_prefs'\)\.select\('allergens'\)/);
  // The read sits after the reserve (a paid turn) and before the model is called.
  const reserve = src.indexOf(".rpc('coach_ai_reserve', { p_action: action, p_fn: 'coach-ask' })");
  const read = src.indexOf('const allergies = await allergyReadOf(');
  const model = src.indexOf("fetch('https://api.anthropic.com/v1/messages'", reserve);
  assert.ok(reserve > 0 && reserve < read && read < model);
});
