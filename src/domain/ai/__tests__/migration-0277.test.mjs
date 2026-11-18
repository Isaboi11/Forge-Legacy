import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * 0277 — the meter knows meal-describe: its slug in coach_ai_reserve's list, and the meal photo's soft floor
 * (AI Road to 10 Sprint 4a §1.6, NU-3, lane B).
 *
 * Proven 2026-11-18 in PGlite (Postgres 16, scratch install, not a repo dependency): 0272's coach_ai_reserve (the live
 * source; prod's pg_get_functiondef md5 fe40ac39… holds the same anchor line exactly once) with CRLF line ends, the
 * bundle run twice — §3 = the prediction both times (14 slugs, 4 floor keys, anon false, authenticated true,
 * meal_photo 1), the definition after = before with ONE line replaced (+17 chars), run 2 a no-op — and a stand-in
 * whose list is not 0272's raised and changed nothing. This file is the rail that stays in the repo.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MIG = read('supabase/migrations/0277_meal_describe_meter.sql');
const BUNDLE = read('supabase/apply/pending-0277.sql');
const M272 = read('supabase/migrations/0272_ai_credits_reweight_soft_floor.sql');
const code = (s) => s.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join('\n');
const quoted = (name) => {
  const m = new RegExp(`${name} constant text := \\$q\\$([^$]*)\\$q\\$;`).exec(MIG);
  assert.ok(m, `${name} is declared`);
  return m[1];
};

test('the paste bundle’s §1 is the migration, verbatim', () => {
  const stmts = MIG.slice(MIG.indexOf('begin;'), MIG.indexOf('commit;') + 'commit;'.length);
  assert.ok(BUNDLE.includes(stmts), 'pending-0277.sql §1 and the migration of record have diverged');
  assert.equal(code(stmts).split('\n').filter((l) => /;\s*$/.test(l)).length >= 6, true);
});

test('⛔ never retyped: no CREATE FUNCTION — the live definition is read, ONE line replaced, and checked after', () => {
  assert.doesNotMatch(code(MIG), /create (or replace )?function/i);
  assert.match(MIG, /v_def := pg_get_functiondef\('public\.coach_ai_reserve\(text, text\)'::regprocedure\);/);
  assert.match(MIG, /execute replace\(v_def, v_old, v_new\);/);
  assert.match(MIG, /if v_n <> 1 then\n\s+raise exception/);
  assert.match(MIG, /if pg_get_functiondef\('public\.coach_ai_reserve\(text, text\)'::regprocedure\) is distinct from replace\(v_def, v_old, v_new\) then\n\s+raise exception/);
  assert.match(MIG, /if position\(\$q\$'meal-describe'\$q\$ in v_def\) > 0 then[\s\S]{0,120}return;/, 'run twice: the second is a no-op');
});

test('the anchor is in the live source exactly once (0272’s body), and the patch only appends the slug', () => {
  const old = quoted('v_old');
  const neu = quoted('v_new');
  assert.equal(neu, old.replace("'social-plan')", "'social-plan', 'meal-describe')"));
  const a = M272.indexOf('create or replace function public.coach_ai_reserve(');
  const body = M272.slice(a, M272.indexOf('$$;', M272.indexOf('$$', a) + 2));
  assert.equal(body.split(old).length - 1, 1, 'the line 0277 replaces appears once in 0272’s coach_ai_reserve');
  const patched = body.replace(old, neu);
  const list = [...patched.match(/when p_fn in \(([^)]*)\)/)[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  // The AiFunction list (domain/ai/ai-failure.ts) + social-plan — the same rule 0268's test holds.
  const ts = read('src/domain/ai/ai-failure.ts');
  const union = ts.slice(ts.indexOf('export type AiFunction'), ts.indexOf(';', ts.indexOf('export type AiFunction')));
  assert.deepEqual(list.sort(), [...[...union.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]), 'social-plan'].sort());
  assert.equal(list.length, 14);
});

test('grants restated: revoked from public AND anon, authenticated keeps it', () => {
  assert.match(code(MIG), /revoke execute on function public\.coach_ai_reserve\(text, text\) from public, anon;/);
  assert.match(code(MIG), /grant execute on function public\.coach_ai_reserve\(text, text\) to authenticated;/);
});

test('the floor: meal-describe rides it for meal_photo only — merged, guarded; no weight moves (meal_photo = 1 on purpose)', () => {
  const c = code(MIG);
  assert.match(c, /set floor_actions = c\.floor_actions \|\| '\{"meal-describe": \["meal_photo"\]\}'::jsonb/);
  assert.match(c, /and not \(c\.floor_actions \? 'meal-describe'\);/);
  assert.doesNotMatch(c, /action_credits\s*=|floor_per_day\s*=|credits_per_period\s*=/, 'nothing but the floor map is written');
  assert.doesNotMatch(c, /coach_ai_settle/);
});

test('§2 raises when it did not land or took something with it; §3 predicts its own row', () => {
  for (const s of [
    '0277 DID NOT APPLY: coach_ai_reserve does not list meal-describe',
    '0277: coach_ai_reserve lost part of its body',
    '0277: anon can execute coach_ai_reserve',
    '0277: authenticated cannot execute coach_ai_reserve',
    '0277 DID NOT APPLY: floor_actions has no "meal-describe": ["meal_photo"]',
    '0277: the meal photo lost its floor',
    '0277: meal_photo is not 1 credit',
  ]) assert.ok(BUNDLE.includes(s), s);
  assert.match(BUNDLE, /reserve_lists_meal_describe = true · reserve_slug_count = 14 · floor_meal_describe = \["meal_photo"\]/);
  assert.match(BUNDLE, /floor_keys = 4 · anon_can_reserve = false · authenticated_can_reserve = true · meal_photo_credits = 1/);
  assert.match(BUNDLE, /PASTE THIS WHOLE FILE/);
  assert.match(BUNDLE, /Safe to run twice/);
});
