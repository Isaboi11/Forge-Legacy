// node --experimental-strip-types --test src/app/__tests__/ai-deploys-0271.test.mjs
//
// Static guards on migration 0271 (AI Road to 10 Sprint 2, PL-5 + PL-1): the paste bundle is the builder's output and
// carries the migration statement for statement; the writers are postgres-only; the reader is admin_guard()-first;
// §4 closes exactly the definer functions the replay finds open (minus the four meant for strangers), and §2/§3 check
// the same list. The end-to-end run (PGlite: grants per role, the writers' validation, the reader's shape, the
// rollback when authenticated would lose a function, §2 catching five kinds of sabotage — 52 checks) was done in a
// scratch harness outside the repo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { normaliseStatement, readMigrations, splitSqlStatements } from '../../../scripts/rls-static-check.mjs';
import { checkDefinerGrants } from '../../../scripts/definer-grants-check.mjs';
import { ANON_ON_PURPOSE, NOT_OURS, buildPending0271, closedSignatures } from '../../../scripts/deploy-ai/build-pending-0271.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const MIGRATION = read('../../../supabase/migrations/0271_ai_deploys_and_drift.sql');
const BUNDLE = read('../../../supabase/apply/pending-0271.sql');
const section = (sql, from, to) => sql.slice(sql.indexOf(from), to ? sql.indexOf(to) : undefined);
const S1 = section(BUNDLE, '-- §1 — THE STATEMENTS', '-- §2 — THE ASSERTION');
const S2 = section(BUNDLE, '-- §2 — THE ASSERTION', '-- §3 — THE REPORT');
const S3 = section(BUNDLE, '-- §3 — THE REPORT');

function fnBody(name) {
  const m = new RegExp(`create or replace function public\\.${name}\\s*\\(([\\s\\S]*?)\\$\\$([\\s\\S]*?)\\$\\$;`).exec(MIGRATION);
  assert.ok(m, name);
  return { head: m[1], body: m[2] };
}

test('the committed paste bundle is the builder’s output (run `node scripts/deploy-ai/build-pending-0271.mjs`)', () => {
  assert.equal(BUNDLE, buildPending0271());
});

test('§1 is the migration, statement for statement (parsed, not eyeballed) and byte for byte', () => {
  const mig = splitSqlStatements(MIGRATION).map((s) => normaliseStatement(s.code));
  const s1 = splitSqlStatements(S1).map((s) => normaliseStatement(s.code));
  assert.equal(mig.length, 18, 'the migration has 18 statements');
  assert.equal(s1.length, mig.length, `§1 has ${s1.length} of ${mig.length}`);
  mig.forEach((st, i) => assert.equal(s1[i], st, `statement ${i + 1} differs`));
  const body = MIGRATION.slice(MIGRATION.lastIndexOf('\n-- ─', MIGRATION.indexOf('-- 0. admin_guard FIRST')) + 1).trimEnd();
  assert.ok(BUNDLE.includes(body));
  assert.match(BUNDLE.slice(0, 700), /APPLY BEFORE 0272/);
});

test('the two tables: RLS on, no policy, nothing granted to a client role or service_role', () => {
  for (const t of ['ai_deploy_log', 'ai_drift_checks']) {
    assert.match(MIGRATION, new RegExp(`alter table public\\.${t}\\s+enable row level security;`));
    assert.doesNotMatch(MIGRATION, new RegExp(`create policy[^;]*on public\\.${t}`));
    assert.doesNotMatch(MIGRATION, new RegExp(`grant [^;]* on (table )?public\\.${t}`));
  }
  assert.match(MIGRATION, /revoke all on table public\.ai_deploy_log, public\.ai_drift_checks from public, anon, authenticated, service_role;/);
});

test('⛔ the writers are postgres-only: SECURITY INVOKER, revoked from everyone, granted to nobody', () => {
  for (const [name, sig] of [
    ['ai_deploy_record', 'text, integer, text, text, text, text, text, text'],
    ['ai_drift_record', 'jsonb'],
  ]) {
    const { head } = fnBody(name);
    assert.match(head, /security invoker/);
    assert.doesNotMatch(head, /security definer/);
    assert.ok(MIGRATION.includes(`revoke all on function public.${name}(${sig})`), name);
    assert.match(MIGRATION, new RegExp(`revoke all on function public\\.${name}\\(${sig.replace(/[()]/g, '\\$&')}\\)\\s+from public, anon, authenticated, service_role;`));
    assert.doesNotMatch(MIGRATION, new RegExp(`grant execute on function public\\.${name}`));
  }
});

test('the reader: admin_guard() first, definer, revoked from public and anon, granted to authenticated', () => {
  const { head, body } = fnBody('admin_ai_deploys');
  assert.match(head, /security definer/);
  assert.match(head, /set search_path = public, pg_temp/);
  assert.match(body.replace(/--[^\n]*/g, ''), /^\s*declare[\s\S]*?begin\s+perform public\.admin_guard\(\);/);
  assert.match(MIGRATION, /revoke all on function public\.admin_ai_deploys\(integer\)\s+from public, anon;/);
  assert.match(MIGRATION, /grant execute on function public\.admin_ai_deploys\(integer\)\s+to authenticated;/);
});

test('§4 closes exactly what the replay finds open without it, minus the four meant for strangers', () => {
  const before = checkDefinerGrants(readMigrations(fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url))).filter((f) => !f.name.startsWith('0271_')));
  const expected = before.open.map((o) => `public.${o.key}`).filter((k) => !ANON_ON_PURPOSE.some((n) => k.startsWith(`public.${n}(`)));
  const listed = closedSignatures(MIGRATION);
  assert.equal(listed.length, 93);
  assert.deepEqual([...listed].sort(), [...expected].sort());
  for (const n of [...ANON_ON_PURPOSE, ...NOT_OURS]) assert.ok(!listed.some((s) => s.startsWith(`public.${n}(`)), `${n} is not revoked`);
  // It refuses to take a function away from signed-in users.
  assert.match(MIGRATION, /v_before := has_function_privilege\('authenticated', f, 'execute'\);/);
  assert.match(MIGRATION, /if v_before and not has_function_privilege\('authenticated', f, 'execute'\) then\s+raise exception/);
});

test('§2 and §3 check the same 93, §3 is read-only, and the prediction is written down', () => {
  const sigs = closedSignatures(MIGRATION);
  for (const s of sigs) {
    assert.ok(S2.includes(`('${s}')`), `§2 has ${s}`);
    assert.ok(S3.includes(`('${s}')`), `§3 has ${s}`);
  }
  const s3 = splitSqlStatements(S3);
  assert.equal(s3.length, 1);
  assert.doesNotMatch(s3[0].code.replace(/'(?:[^']|'')*'/g, "''"), /\b(insert|update|delete|truncate|alter|create|drop|grant|revoke)\b/i);
  assert.match(BUNDLE, /PREDICTED §3/);
  assert.match(BUNDLE, /closed_by_0271 = 93 of 93/);
  assert.match(BUNDLE, /anon_callable_definers = arcade_ops_push, arcade_ops_snapshot, report_client_error,/);
});
