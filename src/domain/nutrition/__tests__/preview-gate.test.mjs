/**
 * preview-gate.test.mjs — 0206 keeps Nutrition to the preview allowlist.
 *
 * ══ WHAT THIS GUARDS ══
 *
 * PO, 2026-09-22: *"is there a way to only give access to me for the nutrition part? It's not done yet so
 * I don't want people using it. Me and the claudetest account."*
 *
 * Every guarantee that answer rests on is carried by SQL and by two client seams, and **all of them fail
 * SILENTLY**. Drop the gate from one RLS policy and that table is world-writable again with `tsc` and lint
 * both green. Drop the `food-search` check and any signed-in account can spend the project's FatSecret
 * quota. Change one `=== true` to a truthy test and a client from before 0206 starts rendering a diary the
 * server will not fill. `node --test` cannot reach Postgres, so each is held as a source guard — the same
 * shape as `onboarding-missing-profile.test.mjs` and `coach-form-check-source.test.mjs`.
 *
 * Run:  node --test src/domain/nutrition/__tests__/preview-gate.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const MIGRATION = read('../../../../supabase/migrations/0206_nutrition_preview_gate.sql');
const BUNDLE = read('../../../../supabase/apply/pending-0206.sql');
const FOOD_SEARCH = read('../../../../supabase/functions/food-search/index.ts');
const ENT_LIVE = read('../../../data/entitlement-live.ts');
const ENT_HOOKS = read('../../../lib/entitlement.tsx');
const NUTRITION_SCREEN = read('../../../app/(tabs)/nutrition.tsx');

/** SQL with every `--` comment line removed, so a claim in prose can never satisfy an assertion. */
const stripComments = (sql) =>
  sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');

const code = stripComments(MIGRATION);

/** The seven tables 0205 created. If this list and the migration disagree, one of them is wrong. */
const NUTRITION_TABLES = [
  'food_catalog',
  'user_foods',
  'food_log_entries',
  'food_favorites',
  'saved_meals',
  'saved_meal_items',
  'nutrition_targets',
];

/** Every `create policy … ;` statement in the migration, as whole statements. */
function policies(sql) {
  return [...sql.matchAll(/create policy\s+(\S+)\s+on\s+public\.(\S+)([\s\S]*?);/g)].map((m) => ({
    name: m[1],
    table: m[2],
    body: m[0],
  }));
}

// ── the SQL ──────────────────────────────────────────────────────────────────

test('EVERY nutrition policy consults the allowlist — one ungated policy is the whole hole', () => {
  const ps = policies(code);
  assert.equal(ps.length, 17, `expected 17 policies, found ${ps.length} — reconcile against 0205`);

  const ungated = ps.filter((p) => !p.body.includes('has_nutrition_access()'));
  assert.deepEqual(
    ungated.map((p) => `${p.table}.${p.name}`),
    [],
    'these policies do NOT check has_nutrition_access() and are reachable by any signed-in account',
  );
});

test('every one of the seven tables is covered — a table with no policy recreated here keeps 0205’s ungated one', () => {
  const covered = new Set(policies(code).map((p) => p.table));
  for (const t of NUTRITION_TABLES) {
    assert.ok(covered.has(t), `${t} has no policy in 0206, so it still carries 0205's ungated policy`);
  }
  assert.equal(covered.size, NUTRITION_TABLES.length, `unexpected table gated: ${[...covered].join(', ')}`);
});

test('each policy DROPS before it CREATES — otherwise the ungated 0205 policy survives alongside', () => {
  // RLS policies are permissive by default and OR together. Leaving 0205's policy in place next to a
  // gated one would mean the gate never denies anything — the most plausible way to get this wrong.
  for (const p of policies(code)) {
    assert.ok(
      new RegExp(`drop policy if exists ${p.name} on public\\.${p.table};`).test(code),
      `${p.name} is created but never dropped first — 0205's ungated version would remain and OR with it`,
    );
  }
});

test('the allowlist table has RLS on and ZERO policies, so the roster is not enumerable', () => {
  assert.match(code, /create table if not exists public\.nutrition_preview/);
  assert.match(code, /alter table public\.nutrition_preview enable row level security;/);
  assert.equal(
    policies(code).filter((p) => p.table === 'nutrition_preview').length,
    0,
    'nutrition_preview must have no policies at all (same posture as app_admins in 0129)',
  );
});

test('has_nutrition_access() is zero-argument, definer, and revoked from public', () => {
  assert.match(code, /create or replace function public\.has_nutrition_access\(\)\s*\n\s*returns boolean/);
  assert.match(code, /security definer/);
  assert.match(code, /set search_path = public, pg_temp/);
  assert.match(code, /revoke all on function public\.has_nutrition_access\(\) from public;/);
  assert.match(code, /grant execute on function public\.has_nutrition_access\(\) to authenticated;/);
});

test('⚠ there is NO self-serve grant — that is the difference from Premium AI', () => {
  // 0203 shipped `set_my_premium_ai()` so any account could switch its own AI on; the PO accepted that.
  // Here he asked the opposite. A `set_my_nutrition`-shaped function would quietly undo this migration.
  assert.doesNotMatch(code, /create or replace function public\.set_my_nutrition/i);
  assert.doesNotMatch(code, /insert into public\.nutrition_preview[\s\S]{0,200}auth\.uid\(\)/,
    'nothing may add the CALLER to the allowlist — only an explicit email seed run in the SQL editor');
});

test('both accounts are seeded by email, and by email only', () => {
  assert.match(code, /'isaiahaltamirano@gmail\.com'/);
  assert.match(code, /'claudetest@test\.com'/);
  assert.match(code, /on conflict \(user_id\) do nothing/, 'the seed must be re-runnable');
});

test('the app_admins bootstrap exists, so the PO’s access does not hang on an email string', () => {
  // `pending-0129-0130` STEP 2 seeded app_admins from the same address, and /admin works, so the email
  // does match. But "which account is the PO's" is a fact about the database; this is the safety net.
  assert.match(code, /insert into public\.nutrition_preview[\s\S]{0,200}from public\.app_admins/);
});

test('⚠ admin does NOT imply nutrition — app_admins is a SEED, not part of the check', () => {
  // If `has_nutrition_access()` consulted app_admins, every future operator would silently gain the
  // preview and the two tables would be one table again, which is the thing 0206 exists to avoid.
  const fn = /create or replace function public\.has_nutrition_access\(\)[\s\S]*?\n\$\$;/.exec(code);
  assert.ok(fn, 'has_nutrition_access is not defined');
  assert.doesNotMatch(fn[0], /app_admins/, 'the check must read nutrition_preview ONLY');
  assert.doesNotMatch(fn[0], /is_app_admin/);
  assert.match(fn[0], /from public\.nutrition_preview p where p\.user_id = auth\.uid\(\)/);
});

test('my_entitlement() returns the nutrition key, and is 0145’s body otherwise', () => {
  const fn = /create or replace function public\.my_entitlement\(\)[\s\S]*?\n\$\$;/.exec(code);
  assert.ok(fn, 'my_entitlement is not defined in 0206');
  assert.match(fn[0], /'nutrition',\s*public\.has_nutrition_access\(\)/);
  // The fields that would be LOST if someone retyped the body instead of copying it. `create or replace`
  // rewrites the whole function, so an omission here is a silent regression of 0145, not a syntax error.
  for (const key of ["'tier'", "'premiumKind'", "'premiumUntil'", "'coachAi'", "'founderSeat'", "'caps'", "'usage'"]) {
    assert.ok(fn[0].includes(key), `my_entitlement lost ${key} — the body was retyped, not copied`);
  }
  assert.match(fn[0], /holt_days_period = v_period/, 'the lazy holt-days refill was lost');
});

test('pending-0206.sql carries the migration verbatim', () => {
  const stmts = MIGRATION.slice(MIGRATION.indexOf('begin;')).replace(/\r\n/g, '\n').trimEnd();
  assert.ok(
    BUNDLE.replace(/\r\n/g, '\n').includes(stmts),
    'the paste bundle and the migration of record have diverged — the bundle is what actually gets applied',
  );
});

test('the bundle asserts the gate landed, rather than returning a tidy green', () => {
  assert.match(BUNDLE, /raise exception '0206 FAILED/);
  assert.match(BUNDLE, /has_nutrition_access%/, 'it must count gated policies out of pg_policies');
  assert.match(BUNDLE, /are UNGATED/);
});

// ── the Edge Function ────────────────────────────────────────────────────────

test('food-search refuses before it spends anybody’s quota', () => {
  assert.match(FOOD_SEARCH, /rpc\('has_nutrition_access'\)/);
  assert.match(FOOD_SEARCH, /nutrition_preview_only.*403|403.*nutrition_preview_only/s);

  // The check must come BEFORE the first outbound call, or the refusal costs the same as an allowance.
  const gate = FOOD_SEARCH.indexOf("rpc('has_nutrition_access')");
  const firstFetch = FOOD_SEARCH.indexOf('await fetch(', FOOD_SEARCH.indexOf('Deno.serve'));
  assert.ok(gate > -1, 'the gate is missing entirely');
  assert.ok(
    firstFetch === -1 || gate < firstFetch,
    'has_nutrition_access() is checked AFTER an outbound fetch — a refused caller would still cost quota',
  );
});

test('⚠ the gate is asked through the CALLER’s client, never the service role', () => {
  // `has_nutrition_access()` reads `auth.uid()`. Asked through the service-role client there is no
  // authenticated user, so it would answer false for everyone — including the PO — and Nutrition would
  // be off for all. This pins the call to the anon+Authorization client built from the request.
  const line = FOOD_SEARCH.slice(
    FOOD_SEARCH.lastIndexOf('\n', FOOD_SEARCH.indexOf("rpc('has_nutrition_access')")),
    FOOD_SEARCH.indexOf("rpc('has_nutrition_access')") + 40,
  );
  assert.match(line, /supabase\.rpc/, 'must be called on `supabase` (anon + caller Authorization), not `admin`');
  assert.doesNotMatch(line, /admin\.rpc/);
});

// ── the client ───────────────────────────────────────────────────────────────

test('the snapshot maps nutrition with === true, so a pre-0206 bundle fails CLOSED', () => {
  assert.match(ENT_LIVE, /nutrition:\s*d\.nutrition === true/);
  assert.match(ENT_LIVE, /nutrition: boolean/, 'the field must be on the interface, not just the mapper');
});

test('useNutritionAccess fails closed on loading and on unknown', () => {
  const fn = /export function useNutritionAccess\(\)[\s\S]*?\n}/.exec(ENT_HOOKS);
  assert.ok(fn, 'useNutritionAccess is not exported');
  assert.match(
    fn[0],
    /status === 'ready' && snapshot\?\.nutrition === true/,
    'it must require a READY snapshot AND a literal true — an optimistic read shows screens the server refuses',
  );
});

test('the Nutrition screen refuses a typed /nutrition rather than rendering an empty diary', () => {
  assert.match(NUTRITION_SCREEN, /if \(!mayUseNutrition\)/);
  assert.match(NUTRITION_SCREEN, /useNutritionAccess\(\)/);
  // And it must not claim "not available" while entitlement is still loading — that lies to the PO.
  assert.match(NUTRITION_SCREEN, /entitlementStatus === 'ready'/);
});
