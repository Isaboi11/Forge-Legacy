import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * 0281 — the meter knows coach-rewrite, and a change opened in Holt's chat rides that turn's credit (Holt Listens,
 * PO D11/D12). Read-only check 2026-11-19 against prod: coach_ai_reserve md5 fb7b8b01…, both anchor lines found
 * exactly once, no 'coach-rewrite' in it. The live body is 0272's + 0276 (opened_build) + 0277 (meal-describe), so
 * this rail rebuilds that body from the files and patches it the way §1a does.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MIG = read('supabase/migrations/0281_coach_rewrite_meter.sql');
const BUNDLE = read('supabase/apply/pending-0281.sql');
const M272 = read('supabase/migrations/0272_ai_credits_reweight_soft_floor.sql');
const M277 = read('supabase/migrations/0277_meal_describe_meter.sql');
const code = (s) => s.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join('\n');
const quoted = (src, name) => {
  const m = new RegExp(`${name} constant text := \\$q\\$([^$]*)\\$q\\$;`).exec(src);
  assert.ok(m, `${name} is declared`);
  return m[1];
};

const reserve272 = () => {
  const a = M272.indexOf('create or replace function public.coach_ai_reserve(');
  return M272.slice(a, M272.indexOf('$$;', M272.indexOf('$$', a) + 2));
};

test('§1 of the bundle is the migration, verbatim', () => {
  const body = MIG.slice(MIG.indexOf('begin;'), MIG.lastIndexOf('commit;') + 'commit;'.length);
  assert.ok(BUNDLE.includes(body));
});

test('it patches the live body — never retypes it — and is a no-op the second time', () => {
  const c = code(MIG);
  assert.match(c, /pg_get_functiondef\('public\.coach_ai_reserve\(text, text\)'::regprocedure\)/);
  assert.doesNotMatch(c, /create (or replace )?function/i, 'no retyped function');
  assert.match(MIG, /if position\(\$q\$'coach-rewrite'\$q\$ in v_def\) > 0 then[\s\S]{0,120}return;/);
  assert.match(MIG, /if v_n1 <> 1 or v_n2 <> 1 then\s+raise exception/);
  assert.match(MIG, /is distinct from v_want then\s+raise exception/);
});

test('both anchors are in the body 0277 left exactly once, and the patch changes only them', () => {
  const old1 = quoted(MIG, 'v_old1');
  const new1 = quoted(MIG, 'v_new1');
  const old2 = quoted(MIG, 'v_old2');
  const new2 = quoted(MIG, 'v_new2');
  assert.equal(new1, old1.replace("'meal-describe')", "'meal-describe', 'coach-rewrite')"));
  assert.equal(new2, old2.replace("v_fn = 'coach-author'", "v_fn in ('coach-author', 'coach-rewrite')"));
  // 0272's body with 0277's one line applied = the list prod holds (0276 does not touch either line).
  const body277 = reserve272().replace(quoted(M277, 'v_old'), quoted(M277, 'v_new'));
  assert.equal(body277.split(old1).length - 1, 1);
  assert.equal(body277.split(old2).length - 1, 1);
  const patched = body277.replace(old1, new1).replace(old2, new2);
  const list = [...patched.match(/when p_fn in \(([^)]*)\)/)[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  const ts = read('src/domain/ai/ai-failure.ts');
  const union = ts.slice(ts.indexOf('export type AiFunction'), ts.indexOf(';', ts.indexOf('export type AiFunction')));
  assert.deepEqual(list.sort(), [...[...union.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]), 'social-plan'].sort());
  assert.equal(list.length, 15);
});

test('no weight, floor, settle or table moves — only the function and its grants', () => {
  const c = code(MIG);
  assert.doesNotMatch(c, /action_credits\s*=|floor_actions\s*=|floor_per_day\s*=|credits_per_period\s*=/);
  assert.doesNotMatch(c, /coach_ai_settle|alter table|create table|policy/i);
  assert.match(c, /revoke execute on function public\.coach_ai_reserve\(text, text\) from public, anon;/);
  assert.match(c, /grant execute on function public\.coach_ai_reserve\(text, text\) to authenticated;/);
});

test('coach-ask marks a change turn opened_build, so the rewrite can ride it', () => {
  const ask = read('supabase/functions/coach-ask/index.ts');
  assert.match(ask, /c\.name === 'propose_program_change'\)\) openedBuild = true;/);
  assert.match(read('supabase/apply/deploy-coach-ask.ts'), /propose_program_change/);
});

test('§2 raises when it did not land or took something with it; §3 predicts its own row', () => {
  for (const s of [
    "0281 DID NOT APPLY: coach_ai_reserve does not list coach-rewrite",
    "0281 DID NOT APPLY: the typed_build waiver does not cover coach-rewrite",
    "0281: coach_ai_reserve lost part of its body",
    "0281: anon can execute coach_ai_reserve",
    "0281: authenticated cannot execute coach_ai_reserve",
    "0281: program is not 1 credit",
  ]) assert.ok(BUNDLE.includes(s), s);
  assert.match(BUNDLE, /reserve_lists_coach_rewrite = true · reserve_slug_count = 15 · waiver_covers_coach_rewrite = true/);
  assert.match(BUNDLE, /anon_can_reserve = false · authenticated_can_reserve = true · program_credits = 1/);
});
