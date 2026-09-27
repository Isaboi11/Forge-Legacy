import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildRecipePhotoReadDeploy, DEPLOY_COPY } from '../../../../scripts/build-recipe-photo-read-deploy.mjs';

/*
 * SOURCE TESTS for supabase/functions/recipe-photo-read/index.ts (Deno, live API, live meter — neither
 * reachable from `node --test`), its paste copy, migration 0220, and the app half. They pin the
 * properties that make it safe and cheap: both gates before the model, CORS, a single cached system
 * block, structured output with no nutrition field (NUT-D4), all four token counts, the code guard last,
 * and an entry point only Premium AI + Nutrition athletes see. Same shape as `coach-form-check-source`.
 */
const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('supabase/functions/recipe-photo-read/index.ts');
const DOMAIN = read('src/domain/nutrition/recipe-photo-read.ts');
const LIVE = read('src/data/recipe-photo-live.ts');
const SCREEN = read('src/app/my-recipes.tsx');
const MIGRATION = read('supabase/migrations/0220_recipe_photo_action.sql');
const BUNDLE = read('supabase/apply/pending-0220.sql');

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
  const image = at('image.length > RECIPE_PHOTO_MAX_BASE64');
  const nutrition = at(".rpc('has_nutrition_access')");
  const daily = at('.eq(\'action\', RECIPE_PHOTO_ACTION)');
  const spend = at(".rpc('coach_ai_spend_credits', { p_action: RECIPE_PHOTO_ACTION })");
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

/* ── cost ───────────────────────────────────────────────────────────────── */

test('Sonnet 5, no thinking, low effort, the cap from the shared module', () => {
  assert.match(SRC, /const MODEL = 'claude-sonnet-5';/);
  assert.match(SRC, /thinking: \{ type: 'disabled' \},/);
  assert.match(SRC, /output_config: \{ effort: 'low', format: \{ type: 'json_schema', schema: RECIPE_READ_SCHEMA \} \},/);
  assert.match(SRC, /max_tokens: RECIPE_PHOTO_OUTPUT_CAP,/);
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
  assert.match(DOMAIN, /export const RECIPE_PHOTO_ACTION = 'recipe_photo';/);
  assert.ok(!/credits?\s*[:=]\s*\d/i.test(SRC));
});

/* ── ⛔ NUT-D4 ──────────────────────────────────────────────────────────── */

test('⛔ the prompt forbids nutrition numbers, invented amounts and describing anyone', () => {
  const s = system();
  for (const rule of [
    'Never write a nutrition number',
    'There is no field for them',
    'Never invent an ingredient or an amount',
    'set "quantity" to null rather than guess',
    'Never add ingredients the page does not list',
    'Never describe the image',
    'rewritten briefly in plain words',
    '# When it is not a recipe',
  ]) assert.ok(s.includes(rule), `missing from SYSTEM: ${rule}`);
});

test('⛔ the LAST thing before the answer is the code guard, and the raw text is never the answer', () => {
  const guard = at('const verdict = readFromModelText(text);');
  const answer = at('return json({ ok: true, read: verdict.read, remaining: reserved.remaining });');
  assert.ok(guard < answer);
  assert.ok(!/read: text|read: payload|read: JSON\.parse/.test(SRC));
  assert.match(SRC, /if \(payload\?\.stop_reason === 'refusal'\)[\s\S]{0,120}reason: 'unreadable'/);
  assert.match(DOMAIN, /const read = sanitizeRecipeRead\(parsed\);/);
});

test('the function imports its guard and schema from the one domain module, which has no imports', () => {
  assert.match(SRC, /\} from '\.\.\/\.\.\/\.\.\/src\/domain\/nutrition\/recipe-photo-read\.ts';/);
  assert.ok(!/^import /m.test(DOMAIN));
});

/* ── the paste copy ─────────────────────────────────────────────────────── */

test('the dashboard paste copy is current and carries the guard and the schema', () => {
  const committed = read(DEPLOY_COPY);
  assert.equal(committed, buildRecipePhotoReadDeploy(), 'run `node scripts/build-recipe-photo-read-deploy.mjs`');
  assert.ok(!committed.includes("from '../../../src/"));
  assert.ok(committed.includes('export function sanitizeRecipeRead'));
  assert.ok(committed.includes('export const RECIPE_READ_SCHEMA'));
  assert.ok(committed.includes('Never write a nutrition number'));
  assert.ok(committed.includes('pending-0220.sql FIRST'));
  assert.ok(committed.length < 40_000, `paste is ${committed.length} chars — the editor cuts off near 40 KB`);
});

/* ── migration 0220 ─────────────────────────────────────────────────────── */

test('pending-0220.sql carries every statement of 0220 verbatim', () => {
  const stmts = code(MIGRATION);
  assert.ok(code(BUNDLE).includes(stmts), 'the paste bundle and the migration of record have diverged');
  assert.equal((stmts.match(/;\s*$/gm) ?? []).length, 5, 'begin, alter, update, comment, commit');
});

test('0220 merges recipe_photo = 3 with the new key on the LEFT, guarded, and asserts it', () => {
  const c = code(MIGRATION);
  assert.match(c, /set action_credits = jsonb_build_object\('recipe_photo', 3\) \|\| action_credits,/);
  assert.match(c, /where not \(action_credits \? 'recipe_photo'\);/);
  assert.match(c, /"recipe_photo": 3\}'::jsonb;/);
  // Every earlier weight is still in the default.
  for (const k of ['"message": 1', '"photo_read": 3', '"photo_import": 2', '"form_check": 6', '"summary": 0', '"web": 3']) assert.ok(c.includes(k), k);
  assert.match(BUNDLE, /raise exception '0220 DID NOT APPLY/);
});

/* ── the app half ───────────────────────────────────────────────────────── */

test('the app holds no key and calls only the Edge Function', () => {
  assert.ok(!/ANTHROPIC_API_KEY|x-api-key|api\.anthropic\.com/i.test(LIVE));
  assert.match(LIVE, /functions\.invoke\('recipe-photo-read'/);
  assert.match(LIVE, /ctx instanceof Response/);
  assert.match(LIVE, /return \{ kind: 'offline' \};/);
  assert.match(LIVE, /recipePhotoResultFrom\(body\)/, 'the device re-runs the guard');
});

test('the entry point needs Premium AI AND Nutrition, and is hidden otherwise', () => {
  assert.match(SCREEN, /const scanOn = premiumAi && nutritionAccess;/);
  assert.match(SCREEN, /\.\.\.\(scanOn \? \[\{ id: 'scan', title: 'Add a picture'/);
  assert.ok(!/title: 'Add a picture'[^}]*soon: true/.test(SCREEN), 'no "Soon" row for anyone');
});

test('the one picker path, library only, after the sheet is gone; the draft is not saved', () => {
  assert.ok(!/from 'expo-image-picker'/.test(SCREEN));
  // The AI consent (MHMDA, 0224) is asked between the two: after the add sheet is gone, before the picker —
  // and `ensureConsent` itself waits for ITS sheet to be gone before it answers.
  assert.match(
    SCREEN,
    /await callerModalGone\(\);\n(?:\s*\/\*[\s\S]*?\*\/\n)?\s*if \(!\(await ensureConsent\('ai_sharing'\)\)\) return;\n\s*const picked = await pickImagesFromLibrary\(1\);/,
  );
  // The read is its own step (`readPicked`) so a picture picked on the Nutrition tab runs the same one.
  const scan = SCREEN.slice(at('const readPicked = useCallback', SCREEN), at('const pickForLine', SCREEN));
  assert.ok(!/saveUserRecipe/.test(scan), 'a read opens a draft; only Save saves');
  assert.match(scan, /setOverride\(\{ form: draft\.form \}\);/);
  assert.match(scan, /if \(scanning\.current\) return;/);
});

test('the Nutrition tab’s Add sheet: one Recipe row that opens the ways to add one (PO 09-26)', () => {
  const TAB = read('src/app/(tabs)/nutrition.tsx');
  // "Add a recipe" and "Recipe from a screenshot" were one category — now one row, into My Recipes' add sheet.
  assert.match(TAB, /title="Recipe"[\s\S]{0,160}pathname: '\/my-recipes', params: \{ add: '1' \}/);
  assert.ok(!/pickImagesFromLibrary|Recipe from a screenshot/.test(TAB), 'the picture is picked on My Recipes, not the tab');
  assert.match(SCREEN, /useState\(\(\) => params\.add === '1'\)/);
});
