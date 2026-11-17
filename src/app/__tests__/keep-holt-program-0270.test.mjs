/**
 * 0270 — keeping a Holt program charges and saves it in ONE step (`keep_holt_program`, AI Road to 10 Sprint 1).
 * The migration of record, its paste bundle (§1 verbatim, §2 raises, §3 read-only with a prediction), and the
 * properties that make it safe: it calls the live spend rather than retyping it, runs as the athlete, refuses a
 * short block, and is callable by authenticated only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const sql = read('../../../supabase/migrations/0270_keep_holt_program.sql');
const bundle = read('../../../supabase/apply/pending-0270.sql');

/** The migration's statements: everything from the function to the last grant (the header is comments). */
const statements = sql.slice(sql.indexOf('create or replace function public.keep_holt_program')).trimEnd();
const at = (s, needle) => {
  const i = s.indexOf(needle);
  assert.ok(i >= 0, `missing: ${needle}`);
  return i;
};

test('the paste bundle carries the migration verbatim in §1', () => {
  const s1 = bundle.slice(at(bundle, '-- §1 — THE STATEMENTS'), at(bundle, '-- §2 — THE ASSERTION'));
  assert.ok(s1.includes(statements), '§1 is the migration, byte for byte');
  // Nothing else that executes rides along in §1.
  const extra = s1.replace(statements, '').split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));
  assert.deepEqual(extra, []);
  // Every statement, counted: the function, its comment, the revoke, the grant.
  for (const head of ['create or replace function public.keep_holt_program(p_structure jsonb)', 'comment on function public.keep_holt_program(jsonb)', 'revoke all on function public.keep_holt_program(jsonb) from public, anon;', 'grant execute on function public.keep_holt_program(jsonb) to authenticated;']) {
    assert.equal(statements.split(head).length - 1, 1, head);
  }
});

test('one transaction: the live spend is CALLED (never retyped), and the row is written only after it allowed', () => {
  const body = statements;
  assert.equal(body.match(/public\.consume_holt_allowance\('program'\)/g)?.length, 1, 'called once');
  assert.doesNotMatch(body, /update public\.athlete_usage/, 'consume_holt_allowance’s own body is not copied here');
  const spend = at(body, "from public.consume_holt_allowance('program') s;");
  const refusal = at(body, 'if not coalesce(v_spend.allowed, false) then');
  const insert = at(body, 'insert into public.programs (athlete_id, name, structure)');
  assert.ok(spend < refusal && refusal < insert, 'spend → refused? → the row');
  assert.match(body, /return query select false, coalesce\(v_spend\.used, 0\), v_spend\.allowance, null::uuid;\n\s+return;/);
  assert.match(body, /return query select true, v_spend\.used, v_spend\.allowance, v_id;/);
  // Columns are qualified: the OUT params (allowed, used, allowance) are plpgsql variables too (42702).
  assert.match(body, /select s\.allowed, s\.used, s\.allowance\n\s+into v_spend/);
});

test('it runs as the athlete, refuses a short block before any spend, and is callable by authenticated only', () => {
  assert.match(statements, /\nsecurity invoker\nset search_path = public, pg_temp\n/);
  assert.doesNotMatch(statements, /security definer/i);
  assert.match(statements, /returns table\(allowed boolean, used integer, allowance integer, program_id uuid\)/);
  const short = at(statements, 'if not public.program_earns_credit(p_structure) then');
  assert.ok(short < at(statements, "consume_holt_allowance('program')"), 'MA4-D5 is checked before anything is spent');
  assert.ok(at(statements, "if v_uid is null then") < short);
  // Supabase grants new functions to anon AND authenticated directly: both PUBLIC and anon are named.
  assert.match(statements, /revoke all on function public\.keep_holt_program\(jsonb\) from public, anon;\ngrant execute on function public\.keep_holt_program\(jsonb\) to authenticated;$/);
});

test('§2 raises on every way it could have landed wrong — and on the old path going missing', () => {
  const s2 = bundle.slice(at(bundle, '-- §2 — THE ASSERTION'), at(bundle, '-- §3 — THE REPORT'));
  for (const r of [
    "raise exception '0270 DID NOT APPLY: public.keep_holt_program(jsonb) is missing'",
    "raise exception '0270: keep_holt_program is SECURITY DEFINER",
    "raise exception '0270: keep_holt_program returns %",
    "raise exception '0270: anon can still EXECUTE keep_holt_program'",
    "raise exception '0270: PUBLIC can still EXECUTE keep_holt_program'",
    "raise exception '0270: authenticated cannot EXECUTE keep_holt_program'",
    "raise exception '0270: consume_holt_allowance(text) is missing or not callable",
  ]) {
    assert.ok(s2.includes(r), r);
  }
});

test('§3 is read-only, and the header predicts every column it reports', () => {
  const s3 = bundle.slice(at(bundle, '-- §3 — THE REPORT'));
  const code = s3.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.doesNotMatch(code, /\b(insert|update|delete|create|alter|drop|grant|revoke|truncate)\b/i);
  const header = bundle.slice(0, at(bundle, '-- §1 — THE STATEMENTS'));
  const predicted = header.slice(at(header, '══ PREDICTED §3'));
  for (const col of ['keep_present', 'security', 'args', 'returns', 'search_path', 'anon_execute', 'authenticated_execute', 'public_execute', 'old_path_still_callable', 'programs_cap_guard_on']) {
    assert.match(code, new RegExp(`as ${col}\\b`), `§3 reports ${col}`);
    assert.match(predicted, new RegExp(`${col} = `), `the header predicts ${col}`);
  }
  assert.match(predicted, /security = invoker/);
  assert.match(predicted, /anon_execute = false · authenticated_execute = true/);
  assert.match(predicted, /old_path_still_callable = true/);
});

test('the bundle says it is safe twice, and the file numbers agree', () => {
  assert.match(bundle, /Safe to run twice/);
  assert.match(sql, /^-- 0270 — /);
  assert.match(bundle, /PENDING — 0270:/);
});
