import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { AI_FEEDBACK_FEATURES } from '../ai-feedback-core.ts';

/**
 * 0272 — credits by real cost, one credit per typed build, a free tidy pass on every photo, and the soft floor
 * (AI Road to 10, Sprint 2 — UX-2; `Docs/AI-Sprint-2-Build-Notes.md` §1.3; Monetization Amendment 012).
 *
 * The behaviour was proven against the real functions in PGlite (Postgres 16): the bundle run twice against a
 * stand-in holding prod's LIVE sources (0268's reserve/settle and 0269's admin_ai_health are byte-identical to
 * pg_get_functiondef, checked by md5 on 2026-11-17), every §3 row green both times, plus 14 edge cases (the athlete's
 * local day, a lapsed Premium AI, a refunded cover, a hand-set weight, a 0-credit refund, 22023, 28000…). This file
 * is the rail that stays in the repo:
 *
 *   · the paste bundle's §1 is the migration, statement for statement
 *   · reserve and settle are the LIVE source plus marked additions — no live line retyped or lost
 *   · a weight moves only from its old value; meal_photo is never touched (1 on purpose, PO 09-28)
 *   · the floor sits AFTER the Premium AI gate and the consent, only on a refusal WITH an allowance, and only for
 *     a chat or a meal photo; a waived or floor reservation holds 0, so a refund can never create credit
 *   · the chip's read is revoked from public AND anon, and answers zeros without Premium AI
 *   · §2 raises and §3's rehearsal rolls itself back
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MIG = read('supabase/migrations/0272_ai_credits_reweight_soft_floor.sql');
const LIVE = read('supabase/migrations/0268_ai_meter_reserve_settle.sql');
const BUNDLE = read('supabase/apply/pending-0272.sql');

/** Split SQL into statements at top-level `;` — dollar-quoted bodies, strings and `--` comments respected. */
function statements(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl < 0 ? sql.length : nl;
      continue;
    }
    if (c === "'") {
      const end = sql.indexOf("'", i + 1);
      let j = end;
      while (sql[j + 1] === "'") j = sql.indexOf("'", j + 2);
      cur += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '$') {
      const tag = /^\$[a-z_]*\$/i.exec(sql.slice(i));
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        cur += sql.slice(i, end + tag[0].length);
        i = end + tag[0].length;
        continue;
      }
    }
    if (c === ';') {
      if (cur.trim()) out.push(cur.trim().replace(/\s+/g, ' '));
      cur = '';
      i += 1;
      continue;
    }
    cur += c;
    i += 1;
  }
  if (cur.trim()) out.push(cur.trim().replace(/\s+/g, ' '));
  return out;
}

const migBody = () => MIG.slice(MIG.indexOf('\nbegin;\n') + 1);
const section = (from, to) => BUNDLE.slice(BUNDLE.indexOf(from), to ? BUNDLE.indexOf(to) : undefined);
const S1 = section('-- §1 — THE STATEMENTS', '-- §2 — THE ASSERTION');
const S2 = section('-- §2 — THE ASSERTION', '-- §3 — THE REPORT');
const S3 = section('-- §3 — THE REPORT');

/** A function's body: between the `$$` after `create or replace function public.<name>(` and the closing `$$`. */
function body(sql, name) {
  const all = [...sql.matchAll(new RegExp(`create or replace function public\\.${name}\\(`, 'g'))];
  assert.equal(all.length, 1, `${name} is defined exactly once`);
  const a = sql.indexOf('$$', all[0].index) + 2;
  return sql.slice(a, sql.indexOf('$$', a));
}
const code = (s) => s.replace(/--[^\n]*/g, ' ');
const lines = (s) => s.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());

/** Every line of `live` is in `next`, in order — except the ones named, which were replaced. */
function keepsEveryLiveLine(live, next, replaced) {
  const want = lines(live).filter((l) => !replaced.includes(l.trim()));
  const got = lines(next);
  let j = 0;
  for (const l of want) {
    while (j < got.length && got[j] !== l) j += 1;
    assert.ok(j < got.length, `a live line is missing or out of order: ${l.trim()}`);
    j += 1;
  }
}

test('the paste bundle carries the migration verbatim: every statement, in order', () => {
  const b = migBody().trimEnd();
  assert.ok(BUNDLE.includes(b), 'pending-0272.sql §1 is not byte-for-byte the migration — regenerate it');
  const want = statements(b);
  assert.deepEqual(statements(S1), want, '§1 differs from the migration');
  // Stated, as the migration skill asks: 32 of 32 (begin … commit; admin_ai_health + its two grants added 11-17).
  assert.equal(want.length, 32, `0272 has ${want.length} statements — update this count if that is intended`);
  assert.equal(want[0], 'begin');
  assert.equal(want[want.length - 1], 'commit');
});

test('admin_ai_health is 0269’s (= live) plus the waived counts — no live line lost, the guard still first, grants restated', () => {
  const live = body(read('supabase/migrations/0269_ai_observability.sql'), 'admin_ai_health');
  const next = body(MIG, 'admin_ai_health');
  keepsEveryLiveLine(live, next, ["'legacy_calls', (select count(*) from s where s.fn is null)),"]);
  assert.match(next, /'legacy_calls', \(select count\(\*\) from s where s\.fn is null\),\n/);
  // What the page reads: overall and per function / per day, delivered calls only (a refunded one gave nothing).
  for (const w of ['floor', 'typed_build', 'photo_tidy']) {
    assert.ok(next.includes(`(select count(*) from s where s.waiver = '${w}' and not s.refunded)`), `totals.waivers.${w}`);
    assert.equal((next.match(new RegExp(`count\\(\\*\\) filter \\(where s\\.waiver = '${w}' and not s\\.refunded\\)`, 'g')) ?? []).length, 2, `${w} on by_fn and by_fn_day`);
  }
  assert.match(next, /as floor_uses,/);
  const c = code(next);
  assert.ok(c.indexOf('perform public.admin_guard();') < c.indexOf('with s as ('), 'nobody but an operator reads it');
  assert.match(MIG, /create or replace function public\.admin_ai_health\(p_days integer default 7, p_tz text default 'UTC'\)\nreturns jsonb\nlanguage plpgsql\nstable\nsecurity definer/);
  assert.match(code(MIG), /revoke all on function public\.admin_ai_health\(integer, text\) from public, anon;\ngrant execute on function public\.admin_ai_health\(integer, text\) to authenticated;/);
  assert.equal(read('supabase/migrations/0271_ai_deploys_and_drift.sql').includes('function public.admin_ai_health'), false, '0271 does not replace it');
});

test('reserve is the LIVE source plus marked additions — the profile read is the only live line replaced', () => {
  const live = body(LIVE, 'coach_ai_reserve');
  const next = body(MIG, 'coach_ai_reserve');
  keepsEveryLiveLine(live, next, ['select pr.birth_year into v_birth from public.profiles pr where pr.id = v_uid;']);
  assert.match(next, /select pr\.birth_year, pr\.tz into v_birth, v_tz from public\.profiles pr where pr\.id = v_uid;/);
  assert.match(code(next), /from public\.coach_ai_spend_credits\(p_action\) s;/, 'the charge is still the existing meter, CALLED');
  assert.ok(!/set spent\s*=/.test(code(next)), 'reserve never moves a balance itself');
});

test('settle is the LIVE source; the ledger row gains the waiver and nothing else changes', () => {
  const live = body(LIVE, 'coach_ai_settle');
  const next = body(MIG, 'coach_ai_settle');
  keepsEveryLiveLine(live, next, [
    'cost_usd, uncharged, fn, outcome, latency_ms, reservation_id',
    'v_cost, v_refund, v_res.fn, v_outcome, v_latency, v_res.id',
  ]);
  assert.match(next, /cost_usd, uncharged, fn, outcome, latency_ms, reservation_id, waiver\n/);
  assert.match(next, /v_cost, v_refund, v_res\.fn, v_outcome, v_latency, v_res\.id, v_res\.waiver\n/);
  assert.match(next, /if v_refund and v_res\.credits > 0 then/, 'a 0-credit refund moves no balance: a floor use can never create credit');
});

test('the reweight: form check 6→3, recipe photo 3→2, web 3→2 — each only from its old value; meal_photo never touched', () => {
  const c = code(MIG);
  assert.match(c, /from \(values \('form_check', 6, 3\), \('recipe_photo', 3, 2\), \('web', 3, 2\)\) as w\(k, old_w, new_w\)\s+where \(c\.action_credits ->> w\.k\)::integer = w\.old_w\)/);
  const update = c.slice(c.indexOf('update public.coach_ai_config c'), c.indexOf('alter table public.coach_ai_config'));
  assert.ok(!/meal_photo/.test(update), '⛔ meal_photo is 1 on purpose (PO 09-28) — no migration "fixes" it');
  assert.ok(!/workout_tidy|'day'|'program'|'message'/.test(update), 'the typed build and the tidy pass are waivers, not weights');
  const def = JSON.parse(/alter column action_credits set default\s+'([^']+)'::jsonb/.exec(c)[1]);
  assert.deepEqual(def, {
    day: 1, web: 2, kitchen: 2, message: 1, program: 1, summary: 0, form_check: 3, meal_photo: 1,
    photo_read: 3, photo_import: 2, recipe_photo: 2, workout_tidy: 1,
  });
});

test('the floor: after Premium AI and the consent, only on a refusal WITH an allowance, only chats and meal photos, the athlete’s day', () => {
  const r = code(body(MIG, 'coach_ai_reserve'));
  const entitled = r.indexOf("'not_entitled'::text, null::uuid");
  const consent = r.indexOf("if v_consent is distinct from 'granted' then");
  const refused = r.indexOf('if not coalesce(v_ok, false) then');
  const floor = r.indexOf("'floor')");
  assert.ok(entitled > 0 && entitled < consent && consent < refused && refused < floor, '⛔ no account without coach_ai ever reaches the floor');
  const branch = r.slice(refused, r.indexOf('-- 4.', refused) > 0 ? r.indexOf('-- 4.', refused) : undefined);
  assert.match(branch, /if coalesce\(v_allow, 0\) > 0\s+and coalesce\(v_cfg\.floor_per_day, 0\) > 0\s+and coalesce\(v_cfg\.floor_actions -> v_fn, '\[\]'::jsonb\) \? p_action then/);
  assert.match(branch, /r\.waiver = 'floor'\s+and not r\.refunded\s+and r\.reserved_at >= v_day0;/, 'a refunded floor call gives the day back');
  assert.match(branch, /if v_used < v_cfg\.floor_per_day then/);
  assert.match(branch, /values \(v_uid, date_trunc\('month', now\(\)\)::date, p_action, v_fn, 0, 'floor'\)/, 'a floor call holds 0 credits');
  assert.match(branch, /for update;/, 'one floor call at a time per athlete');
  assert.match(r, /pg_catalog\.pg_timezone_names z where z\.name = v_tz/, 'the athlete’s own time zone, else UTC');
  // What the floor covers — and never covers.
  const fa = JSON.parse(/add column if not exists floor_actions jsonb not null\s+default '([^']+)'::jsonb/.exec(MIG)[1]);
  assert.deepEqual(fa, { 'coach-ask': ['message'], 'coach-interpret': ['message', 'day', 'program'], 'meal-photo-read': ['meal_photo'] });
  assert.ok(!fa['coach-ask'].includes('web'), 'a web search is not a plain chat');
  for (const fn of ['coach-author', 'coach-kitchen', 'coach-form-check', 'workout-card-read', 'program-photo-read', 'recipe-photo-read', 'workout-tidy']) {
    assert.ok(!(fn in fa), `${fn} refuses at 0`);
  }
  assert.match(MIG, /add column if not exists floor_per_day integer not null default 5;/);
  assert.match(MIG, /add column if not exists credits_low_at integer not null default 20;/);
});

test('the waivers: coach-author rides on a PAID, settled, kept coach-interpret turn; workout-tidy on a paid photo read; 30 minutes; once', () => {
  const r = code(body(MIG, 'coach_ai_reserve'));
  assert.match(r, /when v_fn = 'coach-author' and p_action in \('day', 'program'\) then 'typed_build'/);
  assert.match(r, /when v_fn = 'workout-tidy' and p_action = 'workout_tidy' then 'photo_tidy'/);
  const pick = r.slice(r.indexOf('select r.reserved_at into v_paid_at'), r.indexOf('for update;', r.indexOf('select r.reserved_at into v_paid_at')));
  for (const guard of ['r.credits > 0', 'r.settled_at is not null', 'not r.refunded', "r.reserved_at > now() - interval '30 minutes'",
    "r.fn = 'coach-interpret'", "r.fn in ('workout-card-read', 'program-photo-read') and r.action = 'photo_import'"]) {
    assert.ok(pick.includes(guard), `the cover must check ${guard}`);
  }
  assert.match(r, /and a\.fn = v_fn\s+and not a\.refunded\s+and a\.reserved_at >= v_paid_at/, 'a cover is ridden once; a refunded ride frees it');
  assert.ok(r.indexOf("then 'typed_build'") < r.indexOf('coach_ai_spend_credits(p_action)'), 'a waived call is decided before anything is charged');
  assert.match(MIG, /check \(waiver is null or \(waiver in \('floor', 'typed_build', 'photo_tidy'\) and credits = 0\)\)/);
  assert.match(MIG, /check \(waiver is null or waiver in \('floor', 'typed_build', 'photo_tidy'\)\)/);
});

test('reserve keeps its shape and its reason names; no new reason reaches a deployed function', () => {
  const shape = (sql) => /create or replace function public\.coach_ai_reserve\((p_action text, p_fn text)\)\s*returns table\s*\(([^)]*)\)/.exec(sql)
    .slice(1)
    .map((s) => s.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim());
  assert.deepEqual(shape(MIG), shape(LIVE), 'the signature and the return columns are the live ones');
  assert.deepEqual(shape(MIG)[1], 'allowed boolean, reason text, reservation_id uuid, credits_spent integer, remaining integer, allowance integer, age_years integer, minor boolean');
  const reasons = [...code(body(MIG, 'coach_ai_reserve')).matchAll(/'([a-z_]+)'(?:::text| end\)::text)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(reasons)].sort(), ['no_consent', 'not_entitled', 'ok', 'out_of_credits'].sort());
});

test('the chip’s read: definer, revoked from public AND anon, granted to authenticated; zeros without Premium AI', () => {
  const c = code(MIG);
  assert.match(c, /create or replace function public\.coach_ai_credits\(\)\nreturns table\(\n  entitled boolean, remaining integer, allowance integer, spent integer, period date, resets_on date,\n  low_at integer, floor_per_day integer, floor_used_today integer, floor_left_today integer, on_floor boolean\n\)\nlanguage plpgsql\nstable\nsecurity definer/);
  assert.match(c, /revoke all on function public\.coach_ai_credits\(\) from public, anon;\ngrant execute on function public\.coach_ai_credits\(\) to authenticated;/);
  const b = code(body(MIG, 'coach_ai_credits'));
  assert.match(b, /return query select false, 0, 0, 0, v_period, \(v_period \+ interval '1 month'\)::date,\s+coalesce\(v_cfg\.credits_low_at, 0\), 0, 0, 0, false;/);
  assert.ok(b.indexOf('return query select false') < b.indexOf('coach_ai_period'), 'no balance is read for an account without Premium AI');
  assert.ok(!/insert |update |delete /.test(b), 'a read');
  for (const fn of ['coach_ai_reserve(text, text)', 'coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean)']) {
    assert.ok(c.includes(`revoke all on function public.${fn} from public, anon;`), fn);
  }
  assert.ok(!/create or replace function public\.coach_ai_balance/.test(c), 'coach_ai_balance stays as old phones read it');
  assert.ok(!/create or replace function public\.coach_ai_(spend_credits|quote|record_usage)/.test(c), 'the old path is untouched');
});

test('the thumbs feature list is the app’s (0269’s eight + workout_tidy)', () => {
  const list = MIG.match(/add constraint ai_feedback_feature_check\s+check \(feature in \(([^)]*)\)\)/)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  assert.deepEqual(list, [...AI_FEEDBACK_FEATURES]);
});

test('§2 raises when §1 did not land; §3 rehearses as two real accounts and rolls itself back; the last result is the report', () => {
  assert.match(S2, /raise exception '0272: a weight did not move/);
  assert.match(S2, /raise exception '0272: coach_ai_reserve''s shape changed/);
  assert.match(S2, /raise exception '0272: anon can EXECUTE %'/);
  assert.match(S2, /is missing or not callable — old phones and old functions would break/);
  // The rehearsal: a sub-block that raises its own sentinel, caught — every write it made is undone.
  assert.match(S3, /raise exception using errcode = 'P0001', message = 'r0272 rehearsal rolled back';\n\s+exception when others then/);
  assert.match(S3, /insert into r0272_report values \(20, 'the rehearsal left nothing'/);
  // Outside the rehearsal, §3 writes only to its own temp table.
  const outside = S3.slice(0, S3.indexOf('    begin\n')) + S3.slice(S3.indexOf("message = 'r0272 rehearsal rolled back'"));
  assert.ok(!/\b(update|delete from|insert into) public\./.test(code(outside)), '§3 outside the rehearsal is read-only');
  const all = statements(S3);
  assert.match(all[all.length - 1], /^select n, check_name, expected, actual, pass from r0272_report order by n$/);
  // Row 21: the AI health read counts what the rehearsal added, overall and per function.
  assert.match(S3, /v_h0 := public\.admin_ai_health\(7, 'UTC'\);/);
  assert.match(S3, /'n', 21, 'c', 'AI health counts what rode free'/);
  // The header's prediction names every row the report prints.
  for (let n = 1; n <= 21; n += 1) assert.match(BUNDLE, new RegExp(`^--\\s+${n} `, 'm'), `the prediction covers row ${n}`);
});
