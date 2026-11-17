/**
 * kitchen-rules.test.mjs — the kitchen's allergies, diet and age FAIL CLOSED (AI audit 2026-11-16, N-D2).
 *
 * Before: `fetchMealPlanPrefs().catch(() => null)` (and the read itself answered null on an error), so bad signal
 * sent `allergens: []` / `diet: null` to the model and to the device's filter, and `isUnderAge(null)` let a minor
 * whose profile didn't load see calorie numbers.
 *
 * Run:  node --test --experimental-strip-types src/domain/nutrition/__tests__/kitchen-rules.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { kitchenRules, outcome } from '../kitchen-rules.ts';

const TODAY = '2026-11-16';
const ok = (value) => ({ ok: true, value });
const FAILED = { ok: false };
const ADULT = ok({ birthYear: 1990 });
const MINOR = ok({ birthYear: 2010 });

test('⛔ allergies that did not load are never "no allergies": the ask is refused', () => {
  assert.deepEqual(kitchenRules(FAILED, ADULT, TODAY), { kind: 'unreadable' });
  assert.deepEqual(kitchenRules(FAILED, FAILED, TODAY), { kind: 'unreadable' });
  assert.deepEqual(kitchenRules(FAILED, MINOR, TODAY), { kind: 'unreadable' });
});

test('a setup that was never saved (the server answered "none") is still an ordinary, open kitchen', () => {
  assert.deepEqual(kitchenRules(ok(null), ADULT, TODAY), { kind: 'ok', allergens: [], diet: null, minor: false });
});

test('a saved setup passes its allergens and diet through whole', () => {
  const r = kitchenRules(ok({ allergens: ['peanuts', 'tree_nuts'], diet: 'vegetarian' }), ADULT, TODAY);
  assert.deepEqual(r, { kind: 'ok', allergens: ['peanuts', 'tree_nuts'], diet: 'vegetarian', minor: false });
});

test('⛔ a profile that did not load reads as UNDER 18 for this ask — recipes, no numbers (NUT-D5)', () => {
  const r = kitchenRules(ok({ allergens: [], diet: 'anything' }), FAILED, TODAY);
  assert.equal(r.kind, 'ok');
  assert.equal(r.minor, true);
});

test('a birth year never entered keeps today’s behaviour (adult), as Targets and Meal Plan do', () => {
  assert.equal(kitchenRules(ok(null), ok({ birthYear: null }), TODAY).minor, false);
});

test('the under-18 door is the same one Targets uses: the year someone turns 18 is still under 18', () => {
  assert.equal(kitchenRules(ok(null), MINOR, TODAY).minor, true);
  assert.equal(kitchenRules(ok(null), ok({ birthYear: 2008 }), TODAY).minor, true);
  assert.equal(kitchenRules(ok(null), ok({ birthYear: 2007 }), TODAY).minor, false);
});

test('outcome() turns a throw into a failed read and an answer (even null) into a read that came back', async () => {
  assert.deepEqual(await outcome(Promise.reject(new Error('offline'))), { ok: false });
  assert.deepEqual(await outcome(Promise.resolve(null)), { ok: true, value: null });
});

/* ── the wiring: the reads are strict, and the refusal comes before anything is sent ─────────────────────────── */

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('⛔ kitchenRulesLive reads both strictly and never swallows a failure into "none"', () => {
  const src = read('src/data/coach-kitchen-live.ts');
  const body = src.slice(src.indexOf('export async function kitchenRulesLive'));
  assert.match(body, /fetchMealPlanPrefs\(strict\)/);
  assert.match(body, /fetchNutritionProfile\(strict\)/);
  assert.match(body, /const strict = \{ strict: true \}/);
  assert.doesNotMatch(body.slice(0, body.indexOf('\n}\n')), /\.catch\(\(\) => null\)/);
});

test('⛔ the chat refuses an unreadable kitchen BEFORE asking the model (no consent sheet, no credit)', () => {
  const src = read('src/components/forge/CoachChatSheet.tsx');
  const run = src.slice(src.indexOf('const runKitchen = async'));
  const refuse = run.indexOf("rules.kind === 'unreadable'");
  const ask = run.indexOf('askKitchenLive(');
  assert.ok(refuse > 0 && ask > refuse, 'the refusal comes before askKitchenLive');
  assert.match(run.slice(refuse, ask), /pick\('kitchen_prefs_unreadable'\)/);
});
