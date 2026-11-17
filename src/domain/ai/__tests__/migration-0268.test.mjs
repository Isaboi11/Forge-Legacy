import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ADULT_AGE, ageFrom, isUnderAge } from '../../nutrition/targets.ts';

/**
 * 0268 — the AI meter: reserve → model → settle (AI Road to 10, Sprint 1; `Docs/AI-Sprint-1-Build-Notes.md` §1–§2).
 *
 * The behaviour was proven against the real DDL in PGlite (the bundle run twice, as the anon and authenticated
 * roles with Supabase's default grants). This file is the rail that stays in the repo:
 *
 *   · the paste bundle's §1 is the migration, statement for statement (parsed, not eyeballed)
 *   · the reservation table is locked (RLS on, no policy, every privilege revoked)
 *   · every new function is revoked from public AND anon; authenticated gets only what the functions call
 *   · reserve CALLS coach_ai_spend_credits (never a copy of it), in the contract's order
 *   · settle is once-only, own-only, 30 minutes, and refunds to the reservation's period with a floor of 0
 *   · record_usage keeps its signature and is hardened; the /admin readers stop counting refunded credits
 *   · the server's age rule is the app's (`ageFrom` + `isUnderAge`)
 *   · §2 raises and §3 only reads
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MIG = read('supabase/migrations/0268_ai_meter_reserve_settle.sql');
const BUNDLE = read('supabase/apply/pending-0268.sql');

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

/** `create or replace function public.<name>(` … the end of its body. */
function fnDef(sql, name) {
  const all = [...sql.matchAll(new RegExp(`create or replace function public\\.${name}\\(`, 'g'))];
  assert.equal(all.length, 1, `${name} is defined exactly once in 0268`);
  const rest = sql.slice(all[0].index);
  return rest.slice(0, rest.search(/\n\$(function)?\$;\n/));
}
const code = (s) => s.replace(/--[^\n]*/g, ' ');

const NEW_FNS = {
  coach_ai_rate_cost: '(text, integer, integer, integer, integer)',
  coach_ai_reserve: '(text, text)',
  coach_ai_settle: '(uuid, text, text, integer, integer, integer, integer, integer, boolean)',
  coach_ai_record_admin_usage: '(text, text, integer, integer, integer, integer, integer, text)',
};

test('the paste bundle carries the migration verbatim: every statement, in order', () => {
  const body = migBody().trimEnd();
  assert.ok(BUNDLE.includes(body), 'pending-0268.sql §1 is not byte-for-byte the migration — regenerate it');
  const want = statements(body);
  const got = statements(S1);
  assert.deepEqual(got, want, '§1 differs from the migration');
  // Stated, as the migration skill asks: 47 of 47 (45 statements between `begin` and `commit`).
  assert.equal(want.length, 47, `0268 has ${want.length} statements — update this count if that is intended`);
  assert.equal(want[0], 'begin');
  assert.equal(want[want.length - 1], 'commit');
});

test('the reservation table is locked: RLS on, no policy, every privilege revoked', () => {
  const c = code(MIG);
  assert.match(c, /create table if not exists public\.coach_ai_reservation \(/);
  assert.match(c, /alter table public\.coach_ai_reservation enable row level security;/);
  assert.match(c, /revoke all on table public\.coach_ai_reservation from public, anon, authenticated;/);
  assert.ok(!/create policy[^;]*coach_ai_reservation/.test(c), 'a policy would let somebody read a reservation id');
  assert.ok(!/grant [^;]* on (table )?public\.coach_ai_reservation/.test(c), 'nothing is granted on the reservation table');
});

test('every new function is revoked from public AND anon; authenticated only where an Edge Function calls it', () => {
  const c = code(MIG);
  for (const [name, sig] of Object.entries(NEW_FNS)) {
    const esc = (s) => s.replace(/[()]/g, '\\$&');
    assert.match(c, new RegExp(`revoke all on function public\\.${name}${esc(sig)} from public, anon(, authenticated)?;`), `${name} is not revoked from public and anon`);
  }
  assert.match(c, /revoke all on function public\.coach_ai_rate_cost\(text, integer, integer, integer, integer\) from public, anon, authenticated;/);
  assert.ok(!/grant execute on function public\.coach_ai_rate_cost/.test(c), 'the rate function is for the definer functions only');
  for (const name of ['coach_ai_reserve', 'coach_ai_settle', 'coach_ai_record_admin_usage']) {
    assert.match(c, new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to authenticated;`), `${name} must be callable by the signed-in caller`);
    assert.ok(!new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to [^;]*anon`).test(c));
  }
  // The definer functions are definers; the rate function is not (it is only ever called by them).
  for (const name of ['coach_ai_reserve', 'coach_ai_settle', 'coach_ai_record_admin_usage', 'coach_ai_record_usage']) {
    assert.match(fnDef(MIG, name), /security definer/i, `${name} must be SECURITY DEFINER`);
  }
  assert.ok(!/security definer/i.test(fnDef(MIG, 'coach_ai_rate_cost')));
});

test('reserve CALLS the existing meter — never a copy of it — in the contract order', () => {
  const r = code(fnDef(MIG, 'coach_ai_reserve'));
  assert.match(r, /from public\.coach_ai_spend_credits\(p_action\) s;/);
  assert.ok(!/set spent = /.test(r), 'the guarded UPDATE lives in coach_ai_spend_credits, not here');
  assert.ok(!/coach_ai_period/.test(r), 'reserve never touches the period row itself');
  const auth = r.indexOf("errcode = '28000'");
  const entitled = r.indexOf("'not_entitled'::text");
  const consent = r.indexOf("hc.kind = 'ai_sharing'");
  const spend = r.indexOf('coach_ai_spend_credits(p_action)');
  const insert = r.indexOf('insert into public.coach_ai_reservation');
  assert.ok(auth > 0 && auth < entitled && entitled < consent && consent < spend && spend < insert, 'auth → Premium AI → consent → spend → reservation');
  assert.match(r, /if v_consent is distinct from 'granted' then/, 'no row at all is not a grant');
  assert.match(r, /order by hc\.created_at desc\s+limit 1;/, 'the NEWEST answer is the athlete’s current one (0224)');
  assert.match(r, /reservation_id uuid/);
});

test('the reserve function slugs are the AiFunction list (plus social-plan); anything else is stored as other', () => {
  const r = fnDef(MIG, 'coach_ai_reserve');
  const sqlList = [...r.match(/when p_fn in \(([^)]*)\)/)[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
  const ts = read('src/domain/ai/ai-failure.ts');
  const union = ts.slice(ts.indexOf('export type AiFunction'), ts.indexOf(';', ts.indexOf('export type AiFunction')));
  const tsList = [...union.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert.deepEqual(sqlList, [...tsList, 'social-plan'].sort());
  assert.match(r, /else 'other'/);
});

test('the server age is the app’s rule: this year minus the birth year, 18 is still a minor, unknown is not', () => {
  const r = code(fnDef(MIG, 'coach_ai_reserve'));
  assert.match(r, /when v_birth is null or v_birth < 1900 then null/);
  assert.match(r, /if v_age is not null and \(v_age < 0 or v_age >= 130\) then/);
  assert.match(r, new RegExp(`v_minor := v_age is not null and v_age <= ${ADULT_AGE};`));
  // …and that IS the app's rule, read from the module the app uses.
  const year = 2026;
  assert.equal(isUnderAge(ageFrom(year - 18, `${year}-06-01`)), true);
  assert.equal(isUnderAge(ageFrom(year - 19, `${year}-06-01`)), false);
  assert.equal(isUnderAge(ageFrom(null, `${year}-06-01`)), false);
  assert.equal(ageFrom(1899, `${year}-06-01`), null);
});

test('settle is once-only, own-only, inside 30 minutes, and refunds to the reservation’s period with a floor of 0', () => {
  const s = code(fnDef(MIG, 'coach_ai_settle'));
  const claim = s.slice(s.indexOf('update public.coach_ai_reservation r'), s.indexOf('returning r.* into v_res;'));
  for (const guard of ['r.id = p_reservation', 'r.athlete_id = v_uid', 'r.settled_at is null', "r.reserved_at > now() - interval '30 minutes'"]) {
    assert.ok(claim.includes(guard), `the claim must check ${guard}`);
  }
  assert.match(s, /if not found then\s+return query select false, false, null::numeric, null::integer;\s+return;/);
  assert.match(s, /set spent = greatest\(p\.spent - v_res\.credits, 0\)/);
  assert.match(s, /and p\.period = v_res\.period;/, 'the refund goes to the period the credits came out of');
  assert.ok(s.indexOf('if not found') < s.indexOf('update public.coach_ai_period'), 'nothing is refunded before the claim is won');
  assert.match(s, /cost_usd, uncharged, fn, outcome, latency_ms, reservation_id/);
  assert.match(s, /v_cost, v_refund, v_res\.fn, v_outcome, v_latency, v_res\.id/);
  assert.match(s, /least\(greatest\(coalesce\(p_input_tokens, 0\), 0\), 5000000\)/);
  assert.match(s, /least\(greatest\(p_latency_ms, 0\), 600000\)/);
  assert.match(MIG, /create unique index if not exists coach_ai_spend_reservation_uniq\s+on public\.coach_ai_spend \(reservation_id\)\s+where reservation_id is not null;/);
});

test('the outcome vocabulary is the one meter-server.ts settles with (settle adds `guarded`; the admin line does not)', () => {
  const ts = read('src/domain/ai/meter-server.ts');
  const union = ts.slice(ts.indexOf('export type SettleOutcome'), ts.indexOf(';', ts.indexOf('export type SettleOutcome')));
  const tsList = [...union.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  const sqlList = (name) => [...fnDef(MIG, name).match(/when p_outcome in \(([^)]*)\)/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  assert.ok(tsList.includes('guarded'), 'contract addition: coach-ask settles a server-guarded minor as `guarded`');
  assert.deepEqual(sqlList('coach_ai_settle'), tsList, "coach_ai_settle's outcome list");
  // An operator tool has no reservation and no guard after one, so its list is the settle list without `guarded`.
  assert.deepEqual(sqlList('coach_ai_record_admin_usage'), tsList.filter((o) => o !== 'guarded'), "coach_ai_record_admin_usage's outcome list");
});

test('record_usage keeps its signature and is hardened (P-D7); the admin tools get their own line (P-G10)', () => {
  const old = read('supabase/migrations/0144_coach_ai_credits.sql');
  const params = (s) => [...s.slice(0, s.indexOf(')')).matchAll(/(p_[a-z_]+)\s+(int|integer|text|boolean)/g)].map((m) => `${m[1]} ${m[2].replace(/^int$/, 'integer')}`);
  const before = old.slice(old.indexOf('create or replace function public.coach_ai_record_usage('));
  const after = fnDef(MIG, 'coach_ai_record_usage');
  assert.deepEqual(params(after), params(before), 'same signature — the deployed functions call it by these names');
  const u = code(after);
  assert.match(u, /using errcode = '42501'/);
  assert.match(u, /e\.coach_ai\s+and \(e\.coach_ai_until is null or e\.coach_ai_until > now\(\)\)/);
  assert.match(u, /v_weight := \(v_cfg\.action_credits ->> p_action\)::int;\s+if v_weight is null then\s+raise exception 'coach_ai_record_usage: unknown action %', p_action using errcode = '22023';/);
  assert.match(u, /least\(greatest\(coalesce\(p_credits, 0\), 0\), v_weight\)/);
  assert.match(u, /public\.coach_ai_rate_cost\(p_model, v_in, v_out, v_read, v_write\)/);
  assert.ok(!/usd_per_mtok/.test(u), 'the flat rate is gone from the old path');

  const a = code(fnDef(MIG, 'coach_ai_record_admin_usage'));
  assert.match(a, /if not public\.is_app_admin\(\) then\s+raise exception 'coach_ai_record_admin_usage: operators only' using errcode = '42501';/);
  assert.match(a, /p_action not in \('admin_bug_plain', 'admin_social_plan'\)/);
  assert.ok(!/coach_ai_period/.test(a), 'an operator call never touches anyone’s balance');
  assert.match(a, /p_action, 0, v_model,/, '0 credits');
});

test('the /admin readers stop counting a refunded row’s credits, and keep counting the pre-0268 "uncharged" ones', () => {
  const usage = code(fnDef(MIG, 'admin_ai_usage'));
  assert.match(usage, /\(sp\.uncharged and sp\.reservation_id is not null\) as refunded/);
  assert.match(usage, /'credits',\s+coalesce\(\(select sum\(credits\) filter \(where not s\.refunded\) from s\), 0\)/);
  assert.match(usage, /coalesce\(sum\(credits\) filter \(where not s\.refunded\), 0\) as credits/);
  assert.match(usage, /where left\(s\.action, 6\) <> 'admin_' group by athlete_id/);
  const card = code(fnDef(MIG, 'admin_user_card'));
  assert.equal(card.match(/sum\(credits\) filter \(where not \(uncharged and reservation_id is not null\)\)/g).length, 2);
  // Cost is untouched: a refunded call still cost real money.
  assert.match(usage, /'cost_usd',\s+coalesce\(\(select round\(sum\(cost_usd\), 4\) from s\), 0\)/);
});

test('the backfill keeps the old figure ONCE, then prices every row by the map', () => {
  const c = code(MIG);
  assert.match(c, /if not exists \(select 1 from public\.coach_ai_spend s where s\.cost_usd_legacy is not null\) then\s+update public\.coach_ai_spend s\s+set cost_usd_legacy = s\.cost_usd\s+where s\.cost_usd_legacy is null;/);
  assert.match(c, /update public\.coach_ai_spend s\s+set cost_usd = public\.coach_ai_rate_cost\(\s+s\.model, s\.input_tokens, s\.output_tokens, s\.cache_read_input_tokens, s\.cache_creation_input_tokens\);/);
  assert.ok(c.indexOf('set cost_usd_legacy = s.cost_usd') < c.indexOf('set cost_usd = public.coach_ai_rate_cost('), 'copy before re-pricing');
  assert.match(c, /set model_rates = '\{[\s\S]*?\}'::jsonb,\s+updated_at = now\(\)\s+where c\.id\s+and c\.model_rates is null;/, 'the map is set once; a later edit is not reverted by a re-run');
});

test('§2 raises when something is missing, and §3 only reads', () => {
  assert.match(S2, /^do \$\$/m);
  assert.ok((S2.match(/raise exception '0268:/g) ?? []).length >= 12, '§2 checks each piece');
  const dml = /\b(insert|update|delete|create|alter|drop|grant|revoke|truncate)\b/i;
  assert.ok(!dml.test(code(S2)), '§2 must not change anything');
  assert.ok(!dml.test(code(S3)), '§3 must be read-only');
  assert.equal(statements(S3).length, 1, '§3 is one select — the editor shows only the last result');
  assert.match(BUNDLE, /══ PREDICTED §3 \(2026-11-17/);
  assert.match(BUNDLE, /cost_usd_legacy ≈ 34\.7155 {2}· {2}cost_usd ≈ 19\.9313/);
  assert.match(BUNDLE, /PASTE THIS WHOLE FILE/);
  assert.match(BUNDLE, /Safe to run twice/);
});
