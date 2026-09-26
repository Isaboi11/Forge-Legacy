import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildMealPhotoReadDeploy, DEPLOY_COPY } from '../../../../scripts/build-meal-photo-read-deploy.mjs';

/*
 * SOURCE TESTS for supabase/functions/meal-photo-read/index.ts (Deno, live API, live meter — neither
 * reachable from `node --test`), its paste copy, migration 0223, and the app half. They pin the properties
 * that make it safe and cheap: both gates before the model, CORS, a single cached system block, structured
 * output with no nutrition field (NUT-D4), all four token counts, the code guard last, no photo stored
 * (NUT-D7), the one camera path, the one diary write path, and a door only Premium AI + Nutrition athletes
 * see. Same shape as `recipe-photo-source`.
 */
const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('supabase/functions/meal-photo-read/index.ts');
const DOMAIN = read('src/domain/nutrition/meal-photo-read.ts');
const MATCH = read('src/domain/nutrition/meal-photo-match.ts');
const LIVE = read('src/data/meal-photo-live.ts');
const SCREEN = read('src/app/meal-photo.tsx');
const LOG_FOOD = read('src/app/log-food.tsx');
const LAYOUT = read('src/app/_layout.tsx');
const MIGRATION = read('supabase/migrations/0223_meal_photo_action.sql');
const BUNDLE = read('supabase/apply/pending-0223.sql');

const at = (needle, hay = SRC) => {
  const i = hay.indexOf(needle);
  assert.ok(i >= 0, `expected to find: ${needle}`);
  return i;
};
const system = () => SRC.slice(SRC.indexOf('const SYSTEM = `'), SRC.indexOf('`;', SRC.indexOf('const SYSTEM = `')));
/** SQL without `--` lines or blank lines, so prose can never satisfy an assertion. */
const code = (sql) => sql.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join('\n');

/* ── the order ──────────────────────────────────────────────────────────── */

test('image → nutrition access → daily ceiling → credit (Premium AI) → model, in that order', () => {
  const image = at('image.length > MEAL_PHOTO_MAX_BASE64');
  const nutrition = at(".rpc('has_nutrition_access')");
  const daily = at(".eq('action', MEAL_PHOTO_ACTION)");
  const spend = at(".rpc('coach_ai_spend_credits', { p_action: MEAL_PHOTO_ACTION })");
  const model = at("fetch('https://api.anthropic.com/v1/messages'");
  assert.ok(image < nutrition && nutrition < daily && daily < spend && spend < model);
});

test('no nutrition access is a 403 that spends nothing', () => {
  assert.match(SRC, /if \(gateError \|\| mayUseNutrition !== true\) return json\(\{ ok: false, reason: 'no_nutrition' \}, 403\);/);
});

test('Premium AI is the meter’s gate (0203): not allowed → out_of_credits with the allowance, before the model', () => {
  assert.match(SRC, /if \(!reserved\?\.allowed\) \{[\s\S]{0,80}reason: 'out_of_credits'/);
  assert.ok(at('if (!reserved?.allowed)') < at("fetch('https://api.anthropic.com/v1/messages'"));
});

test('CORS: the preflight is answered first, and every response carries the headers', () => {
  assert.match(SRC, /if \(req\.method === 'OPTIONS'\) return new Response\('ok', \{ headers: CORS \}\);/);
  assert.ok(at("req.method === 'OPTIONS'") < at('await req.json()'));
  assert.match(SRC, /'Access-Control-Allow-Origin': '\*'/);
  assert.match(SRC, /'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'/);
  assert.match(SRC, /headers: \{ \.\.\.CORS, 'Content-Type': 'application\/json' \}/);
});

test('no service key: every RPC runs as the caller', () => {
  assert.ok(!/SERVICE_ROLE/i.test(SRC));
  assert.match(SRC, /global: \{ headers: \{ Authorization: authorization \} \}/);
});

/* ── cost ───────────────────────────────────────────────────────────────── */

test('Sonnet 5 (Architecture §5: photos), no thinking, low effort, the cap from the shared module', () => {
  assert.match(SRC, /const MODEL = 'claude-sonnet-5';/);
  assert.match(SRC, /thinking: \{ type: 'disabled' \},/);
  assert.match(SRC, /output_config: \{ effort: 'low', format: \{ type: 'json_schema', schema: MEAL_READ_SCHEMA \} \},/);
  assert.match(SRC, /max_tokens: MEAL_PHOTO_OUTPUT_CAP,/);
  assert.ok(!/max_tokens: \d/.test(SRC));
});

test('the system block is ONE cached constant, nothing interpolated, long enough to cache', () => {
  assert.match(SRC, /system: \[\{ type: 'text', text: SYSTEM, cache_control: \{ type: 'ephemeral' \} \}\]/);
  const s = system();
  assert.ok(!s.includes('${'), 'SYSTEM is the cache key');
  assert.ok(s.length > 5000, `SYSTEM is ${s.length} chars — too short to cache`);
  assert.match(SRC, /\{ type: 'image', source: \{ type: 'base64', media_type: mediaType, data: image \} \}/);
});

test('usage is recorded with all four counts, on success and on failure', () => {
  for (const p of [
    'p_input_tokens: usage.input_tokens',
    'p_output_tokens: usage.output_tokens',
    'p_cache_read_input_tokens: usage.cache_read_input_tokens',
    'p_cache_creation_input_tokens: usage.cache_creation_input_tokens',
  ]) assert.ok(SRC.includes(p), p);
  assert.equal(SRC.match(/coach_ai_record_usage/g).length, 2);
  assert.match(SRC, /p_uncharged: true,/);
  assert.match(SRC, /p_uncharged: false,/);
});

test('the weight lives in SQL, never in code', () => {
  assert.match(DOMAIN, /export const MEAL_PHOTO_ACTION = 'meal_photo';/);
  assert.ok(!/credits?\s*[:=]\s*\d/i.test(SRC));
});

/* ── ⛔ NUT-D4 ──────────────────────────────────────────────────────────── */

test('⛔ the prompt forbids nutrition numbers, invented foods, judging the meal and describing anyone', () => {
  const s = system();
  for (const rule of [
    'Never write a nutrition number',
    'There is no field for them',
    'Never invent a food you cannot see',
    'Never comment on the meal',
    'Never describe the photo',
    'Never guess a brand you cannot see',
    '# When it is not a meal',
  ]) assert.ok(s.includes(rule), `missing from SYSTEM: ${rule}`);
});

test('⛔ the LAST thing before the answer is the code guard, and the raw text is never the answer', () => {
  const guard = at('const verdict = readFromModelText(text);');
  const answer = at('return json({ ok: true, read: verdict.read, remaining: reserved.remaining });');
  assert.ok(guard < answer);
  assert.ok(!/read: text|read: payload|read: JSON\.parse/.test(SRC));
  assert.match(SRC, /if \(payload\?\.stop_reason === 'refusal'\)[\s\S]{0,120}reason: 'unreadable'/);
  assert.match(DOMAIN, /const read = sanitizeMealRead\(parsed\);/);
});

test('⛔ every number the screen shows or logs comes through portionMacros (database × portion)', () => {
  assert.match(MATCH, /return row\.food && row\.portion \? portionMacros\(row\.food, row\.portion\) : ZERO;/);
  assert.match(MATCH, /macros: portionMacros\(food, portion\),/);
  assert.ok(!/kcal100\s*\*/.test(SCREEN), 'the screen never multiplies on its own');
});

test('the function imports its guard and schema from the one domain module, which has no imports', () => {
  assert.match(SRC, /\} from '\.\.\/\.\.\/\.\.\/src\/domain\/nutrition\/meal-photo-read\.ts';/);
  assert.ok(!/^import /m.test(DOMAIN));
});

/* ── ⚠ NUT-D7: the photo is never stored ────────────────────────────────── */

test('⚠ no storage anywhere on the path — no bucket, no upload, no photo column', () => {
  for (const [name, src] of [['function', SRC], ['live', LIVE], ['screen', SCREEN]]) {
    assert.ok(!/\.storage\b|\.upload\(|from\('.*photo/.test(src), `${name} stores something`);
  }
  assert.ok(!/create table|storage\.buckets/i.test(code(MIGRATION)));
});

/* ── the paste copy ─────────────────────────────────────────────────────── */

test('the dashboard paste copy is current and carries the guard and the schema', () => {
  const committed = read(DEPLOY_COPY);
  assert.equal(committed, buildMealPhotoReadDeploy(), 'run `node scripts/build-meal-photo-read-deploy.mjs`');
  assert.ok(!committed.includes("from '../../../src/"));
  assert.ok(committed.includes('export function sanitizeMealRead'));
  assert.ok(committed.includes('export const MEAL_READ_SCHEMA'));
  assert.ok(committed.includes('Never write a nutrition number'));
  assert.ok(committed.includes('pending-0223.sql FIRST'));
  assert.ok(committed.length < 40_000, `paste is ${committed.length} chars — the editor cuts off near 40 KB`);
});

/* ── migration 0223 ─────────────────────────────────────────────────────── */

test('pending-0223.sql carries every statement of 0223 verbatim', () => {
  const stmts = code(MIGRATION);
  assert.ok(code(BUNDLE).includes(stmts), 'the paste bundle and the migration of record have diverged');
  assert.equal((stmts.match(/;\s*$/gm) ?? []).length, 5, 'begin, alter, update, comment, commit');
});

test('0223 merges meal_photo = 3 with the new key on the LEFT, guarded, and keeps every earlier weight', () => {
  const c = code(MIGRATION);
  assert.match(c, /set action_credits = jsonb_build_object\('meal_photo', 3\) \|\| action_credits,/);
  assert.match(c, /where not \(action_credits \? 'meal_photo'\);/);
  assert.match(c, /"meal_photo": 3\}'::jsonb;/);
  for (const k of ['"message": 1', '"photo_read": 3', '"photo_import": 2', '"form_check": 6', '"summary": 0', '"web": 3', '"recipe_photo": 3', '"kitchen": 2']) {
    assert.ok(c.includes(k), k);
  }
  assert.match(BUNDLE, /raise exception '0223 DID NOT APPLY/);
});

/* ── the app half ───────────────────────────────────────────────────────── */

test('the app holds no key and calls only the Edge Function; the device re-runs the guard', () => {
  assert.ok(!/ANTHROPIC_API_KEY|x-api-key|api\.anthropic\.com/i.test(LIVE));
  assert.match(LIVE, /functions\.invoke\('meal-photo-read'/);
  assert.match(LIVE, /ctx instanceof Response/);
  assert.match(LIVE, /return \{ kind: 'offline' \};/);
  assert.match(LIVE, /mealPhotoResultFrom\(body\)/);
  assert.match(LIVE, /searchFoods\(/, 'the numbers come from food-search');
});

test('the door on Log Food needs Premium AI AND Nutrition, and is absent otherwise', () => {
  assert.match(LOG_FOOD, /const photoOn = premiumAi && nutritionAccess;/);
  assert.match(LOG_FOOD, /\{photoOn \? \(\s*<Pressable[\s\S]{0,200}accessibilityLabel="Log from a photo"/);
  assert.match(LOG_FOOD, /pathname: '\/meal-photo', params: \{ date: iso, meal \}/);
  assert.match(LAYOUT, /<Stack\.Screen name="meal-photo" \/>/);
});

test('the one capture path, one read at a time, and the one diary write — only on Log', () => {
  assert.ok(!/from 'expo-image-picker'/.test(SCREEN));
  assert.match(SCREEN, /const \{ pick, mediaPickerSheet \} = useMediaPicker\(\);/);
  assert.match(SCREEN, /\{mediaPickerSheet\}/);
  const take = SCREEN.slice(at('const takePhoto = async', SCREEN), at('const logMeal = async', SCREEN));
  assert.match(take, /if \(busy\.current\) return;/);
  assert.ok(!/addEntries/.test(take), 'a read opens the review; only Log logs');
  const log = SCREEN.slice(at('const logMeal = async', SCREEN), at('const totals = mealTotals(rows);', SCREEN));
  assert.match(log, /await addEntries\(iso, entries\);/);
  assert.match(log, /const entries = entriesFrom\(rows, meal\);/);
});
