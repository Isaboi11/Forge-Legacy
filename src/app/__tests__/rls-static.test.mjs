// node --test src/app/__tests__/rls-static.test.mjs
//
// PL-1 (Docs/AI-Road-To-10-Plan-v1.0.md §2), platform gate ① "0 public tables without row security (checked in
// CI)". Replays every migration and FAILS if any table created in public never gets `enable row level security`.
// The live half is supabase/apply/check-rls.sql (read-only).
//
// ⛔ ZERO EXCEPTIONS. If this fails, the migration is wrong: enable RLS on the table (and revoke what the client
// roles must not hold). Do not add an allow-list here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { checkRls, readMigrations, splitSqlStatements, statementEvents, tableName } from '../../../scripts/rls-static-check.mjs';

const MIGRATIONS = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
const DESIGN = new URL('../../../supabase/design/', import.meta.url);
const ALL = readMigrations(MIGRATIONS);

test('every public table the migrations create ends with row-level security on', () => {
  const r = checkRls(ALL);
  assert.ok(r.tables >= 132, `the ledger saw ${r.tables} tables — a parser that finds none passes trivially`);
  assert.deepEqual(r.dynamic, [], 'no table name built at run time (it could not be checked)');
  assert.deepEqual(
    r.missing,
    [],
    `public tables without RLS:\n${r.missing.map((m) => `  ${m.table} (created in ${m.createdIn})`).join('\n')}`,
  );
});

test('it would have caught coach_ai_config: without 0267, exactly that table, from 0144', () => {
  assert.ok(ALL.some((f) => f.name.startsWith('0267_')), '0267 is in this tree');
  const r = checkRls(ALL.filter((f) => !f.name.startsWith('0267_')));
  assert.deepEqual(r.missing, [{ table: 'coach_ai_config', createdIn: '0144_coach_ai_credits.sql' }]);
});

test('0269’s three tables are in the ledger with RLS on', () => {
  const { ledger } = checkRls(ALL);
  for (const t of ['ai_feedback', 'ai_ops_config', 'ai_canary_runs']) assert.equal(ledger.get(t)?.rls, true, t);
});

// ── the parser, on the shapes it must not get wrong ───────────────────────────────────────────────────────

const run = (...sqls) => checkRls(sqls.map((sql, i) => ({ name: `${String(i).padStart(4, '0')}_t.sql`, sql })));

test('create table, with and without if not exists, schema, quotes — and unqualified means public', () => {
  assert.deepEqual(run('create table public.a (id int);').missing.map((m) => m.table), ['a']);
  assert.deepEqual(run('create table if not exists b (id int);').missing.map((m) => m.table), ['b']);
  assert.deepEqual(run('CREATE TABLE "public"."C" (id int);').missing.map((m) => m.table), ['c']);
  assert.deepEqual(run('create table private.d (id int);').missing, [], 'another schema is not exposed');
  assert.deepEqual(run('create temp table e (id int);').missing, [], 'a temp table is not tracked');
  assert.deepEqual(run('create unlogged table f (id int);').missing.map((m) => m.table), ['f'], 'unlogged is still a table');
  assert.deepEqual(tableName('"public"."X"'), { schema: 'public', table: 'x' });
});

test('enable / disable, in order, across files', () => {
  assert.deepEqual(run('create table a (id int);', 'alter table public.a enable row level security;').missing, []);
  assert.deepEqual(run('create table a (id int); alter table if exists only a enable row level security;').missing, []);
  assert.deepEqual(
    run('create table a (id int); alter table a enable row level security;', 'alter table a disable row level security;').missing.map((m) => m.table),
    ['a'],
    'a later disable counts',
  );
  // `if not exists` on a table that already exists keeps its RLS; a plain re-create after a drop does not.
  assert.deepEqual(run('create table a (id int); alter table a enable row level security;', 'create table if not exists a (id int);').missing, []);
  assert.deepEqual(run('create table a (id int); alter table a enable row level security;', 'drop table a;', 'create table a (id int);').missing.map((m) => m.table), ['a']);
});

test('a dropped table is exempt; a renamed one keeps its state under the new name', () => {
  assert.deepEqual(run('create table a (id int);', 'drop table if exists public.a, b cascade;').missing, []);
  assert.deepEqual(run('create table a (id int);', 'alter table a rename to z;').missing.map((m) => m.table), ['z']);
  assert.deepEqual(run('create table a (id int); alter table a enable row level security;', 'alter table a rename to z;').missing, []);
});

test('comments, strings and function bodies are not DDL; DO blocks are', () => {
  assert.deepEqual(run("-- create table x (id int);\n/* create table y (id int); */ select 1;").missing, []);
  assert.deepEqual(run("comment on schema public is 'create table x (id int)';").missing, []);
  assert.deepEqual(
    run('create or replace function public.f() returns void language plpgsql as $$ begin create table x (id int); end $$;').missing,
    [],
    'a function body runs later, not at migration time',
  );
  assert.deepEqual(
    run("do $$ begin if to_regclass('public.q') is null then create table public.q (id int); end if; end $$;").missing.map((m) => m.table),
    ['q'],
    'a DO block runs now',
  );
  assert.deepEqual(run("do $$ begin create table public.q (id int); execute 'alter table public.q enable row level security'; end $$;").missing, []);
  assert.equal(run("do $$ declare t text := 'w'; begin execute format('alter table public.%I enable row level security', t); end $$;").dynamic.length, 1, 'a run-time name is reported, not guessed');
});

test('the splitter respects dollar quotes, quoted semicolons and nested comments', () => {
  const s = splitSqlStatements("select 'a;b'; create function f() returns int as $body$ select 1; $body$ language sql; /* a /* b; */ c; */ select \"x;y\";");
  assert.equal(s.length, 3);
  assert.match(s[1].code, /^create function f\(\)/);
  assert.equal(statementEvents(s[1].code).length, 0);
});

// ── supabase/design/ is paper ─────────────────────────────────────────────────────────────────────────────

test('supabase/design/ still holds only the paper model, which is never applied', () => {
  // 2026-11-17: `0002_full_model.sql` is design-on-paper — its header: "DELIBERATELY under supabase/design/ (NOT
  // supabase/migrations/) … NOT PUSHED". None of its 23 un-graduated tables exist live (checked via the MCP
  // 11-17); each cluster that graduated was created again by a real migration, where the test above checks it.
  // So its tables are not replayed here. If a new file lands in design/, or the header stops saying it is not
  // applied, this fails and somebody decides.
  const files = readdirSync(DESIGN).filter((f) => f.endsWith('.sql'));
  assert.deepEqual(files, ['0002_full_model.sql']);
  const head = readFileSync(new URL('0002_full_model.sql', DESIGN), 'utf8').slice(0, 400);
  assert.match(head, /design-on-paper/);
  assert.match(head, /NOT PUSHED/);
});

test('the live check is read-only and asks the right question', () => {
  const sql = readFileSync(new URL('../../../supabase/apply/check-rls.sql', import.meta.url), 'utf8');
  const statements = splitSqlStatements(sql);
  assert.equal(statements.length, 1, 'one statement');
  const code = statements[0].code;
  assert.match(code, /^with t as \(/);
  // Privilege names inside string literals ('insert,update,delete') are arguments, not statements.
  assert.doesNotMatch(code.replace(/'(?:[^']|'')*'/g, "''"), /\b(insert|update|delete|truncate|alter|create|drop|grant|revoke)\b/i);
  assert.match(code, /n\.nspname = 'public'/);
  assert.match(code, /c\.relkind in \('r', 'p'\)/);
  assert.match(code, /not t\.rls_on/);
});
