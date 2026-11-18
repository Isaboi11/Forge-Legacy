import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * DESCRIBE A MEAL, ON THE PHONE (AI Road to 10 Sprint 4a §1.6). The REAL `meal-describe-live.ts`, the REAL guard and
 * result mapping; the function is faked. The rules: a medical line, an empty box or too many words never leave the
 * phone (no consent sheet, no request, no credit); every answer is re-guarded; the screen and the Add sheet are gated
 * as Snap a plate is.
 */

const { supabase } = await import('@/lib/supabase');
const { readMealDescription } = await import('../meal-describe-live.ts');
const { mealDescribeError, mealDescribeResultFrom } = await import('../../domain/nutrition/meal-describe-result.ts');
const { MEAL_DESCRIBE_MAX_CHARS } = await import('../../domain/nutrition/meal-describe.ts');

let calls = 0;
supabase.functions.invoke = async () => {
  calls += 1;
  return { data: null, error: { message: 'should not be called' } };
};

test('⛔ a medical line stops on the phone — nothing is sent, nothing is charged, the right stop', async () => {
  calls = 0;
  assert.deepEqual(await readMealDescription('i want to kill myself. log dinner: pasta'), { kind: 'stop', route: 'crisis' });
  assert.deepEqual(await readMealDescription('I binged and purged after dinner, log it'), { kind: 'stop', route: 'care' });
  assert.deepEqual(await readMealDescription("I'm type 1 diabetic, log my lunch of rice and chicken"), { kind: 'stop', route: 'medical' });
  assert.equal(calls, 0);
});

test('an empty box or too many words never leave the phone either', async () => {
  calls = 0;
  assert.deepEqual(await readMealDescription('   '), { kind: 'empty' });
  assert.deepEqual(await readMealDescription('x'.repeat(MEAL_DESCRIBE_MAX_CHARS + 1)), { kind: 'too_long' });
  assert.equal(calls, 0);
});

test('the wire → a result: the read re-guarded (a calorie key never survives), a server stop, every refusal', () => {
  const ok = mealDescribeResultFrom({ ok: true, read: { items: [{ name: 'banana', search: 'banana', amount: 1, unit: 'piece', grams: 120, confidence: 'high', kcal: 105 }] }, remaining: 41 });
  assert.equal(ok.kind, 'ok');
  assert.ok(!('kcal' in ok.read.items[0]));
  assert.equal(ok.remaining, 41);
  assert.deepEqual(mealDescribeResultFrom({ ok: false, reason: 'stop', route: 'urgent' }), { kind: 'stop', route: 'urgent' });
  assert.deepEqual(mealDescribeResultFrom({ ok: false, reason: 'stop', route: 'acute' }), { kind: 'stop', route: 'medical' });
  assert.deepEqual(mealDescribeResultFrom({ ok: false, reason: 'too_long' }), { kind: 'too_long' });
  assert.deepEqual(mealDescribeResultFrom({ ok: false, reason: 'not_food', refunded: true }), { kind: 'not_food' });
  assert.deepEqual(mealDescribeResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 0 }), { kind: 'not_entitled' });
  assert.deepEqual(mealDescribeResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 300 }), { kind: 'out_of_credits', remaining: 0, allowance: 300 });
  assert.deepEqual(mealDescribeResultFrom({ ok: false, reason: 'too_large' }), { kind: 'unavailable' }, 'a photo refusal from a text read is the server failing');
  assert.deepEqual(mealDescribeResultFrom(null), { kind: 'unavailable' });
  for (const kind of ['not_food', 'unreadable', 'too_long', 'empty', 'daily_limit', 'not_entitled', 'no_nutrition', 'unavailable', 'offline']) {
    assert.ok(mealDescribeError({ kind }).length > 10, kind);
  }
  assert.match(mealDescribeError({ kind: 'unavailable' }), /search for the food/, 'an outage always has a way out');
});

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the live module: the guard, then the consent, then the one call — and only a failure that is not a stop is reported', () => {
  const LIVE = read('data/meal-describe-live.ts');
  const guard = LIVE.indexOf('const guard = medicalRoute(text);');
  const consent = LIVE.indexOf("if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;");
  const call = LIVE.indexOf("invokeAi('meal-describe', { text }, { signal })");
  assert.ok(guard > 0 && guard < consent && consent < call);
  assert.match(LIVE, /if \(result\.kind !== 'stop'\) reportAiCall\(a, result\.kind\);/);
  assert.ok(!/ANTHROPIC_API_KEY|api\.anthropic\.com/.test(LIVE));
});

test('the screen: the same review and the one diary write, only on Log; gated as Snap a plate; one read at a time', () => {
  const SCREEN = read('app/describe-meal.tsx');
  assert.match(SCREEN, /<MealReview[\s\S]{0,200}from="words"/);
  assert.match(SCREEN, /const matched = await matchMealItems\(r\.read\.items\);/, 'every number from food-search');
  const send = SCREEN.slice(SCREEN.indexOf('const send = async'), SCREEN.indexOf('const logMeal = async'));
  assert.match(send, /if \(busy\.current \|\| gatedOut \|\| tooLong\) return;/);
  assert.ok(!/addEntries/.test(send), 'a read opens the review; only Log logs');
  const log = SCREEN.slice(SCREEN.indexOf('const logMeal = async'), SCREEN.indexOf('const totals = mealTotals(rows);'));
  assert.match(log, /const entries = entriesFrom\(rows, meal\);/);
  assert.match(log, /await addEntries\(iso, entries\);/);
  assert.match(log, /showToast\(errorMessage\(e\)\);/);
  assert.match(SCREEN, /const gatedOut = !premiumAi \|\| !nutritionAccess;/);
  assert.ok(!/kcal100\s*\*/.test(SCREEN), 'the screen never multiplies on its own');
  assert.match(SCREEN, /crisis: \{ kicker: CRISIS_KICKER, text: CRISIS_STOP \}/);
  assert.match(read('app/_layout.tsx'), /<Stack\.Screen name="describe-meal" \/>/);
});

test('Nutrition’s Add sheet: Snap a plate and Describe a meal, both behind Premium AI + Nutrition (the camera icon’s rule)', () => {
  const NUT = read('app/(tabs)/nutrition.tsx');
  assert.match(NUT, /const aiMealOn = premiumAi && mayUseNutrition;/);
  const block = NUT.slice(NUT.indexOf('{aiMealOn ? ('), NUT.indexOf(') : null}', NUT.indexOf('{aiMealOn ? (')));
  assert.match(block, /title="Snap a plate"[\s\S]*pathname: '\/meal-photo'/);
  assert.match(block, /title="Describe a meal"[\s\S]*pathname: '\/describe-meal'/);
  assert.match(read('app/log-food.tsx'), /const photoOn = premiumAi && nutritionAccess;/);
});

test('a door into /describe-meal from outside the tab (Holt’s toolbox) asks the Nutrition consent first, as /meal-photo does', async () => {
  const { isNutritionRoute } = await import('../../domain/consent/consent.ts');
  assert.equal(isNutritionRoute('/describe-meal'), true);
  assert.equal(isNutritionRoute('/describe-meal?date=2026-11-18&meal=lunch'), true);
  assert.equal(isNutritionRoute('/meal-photo'), true);
});
