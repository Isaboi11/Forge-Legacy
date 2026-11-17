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
import { checkDefinerGrants, doEvents, functionEvents, identityTypes, normalizeType } from '../../../scripts/definer-grants-check.mjs';
import { ANON_ON_PURPOSE } from '../../../scripts/deploy-ai/build-pending-0271.mjs';

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
  // The definer half rides in the same statement (the editor shows only the last result).
  assert.match(code, /p\.prosecdef/);
  assert.match(code, /acldefault\('f', p\.proowner\)/, 'a NULL proacl is the default ACL (PUBLIC), never empty');
  assert.match(code, /has_function_privilege\('anon', p\.oid, 'execute'\)/);
});

// ══ THE DEFINER-REVOKE HALF (PL-1, AI Road to 10 Sprint 2) ═══════════════════════════════════════════════════
//
// Every SECURITY DEFINER function's LATEST definition must end closed to `public` AND `anon`: Postgres grants
// EXECUTE to PUBLIC on every new function and Supabase grants it to anon directly, so `revoke … from public` alone
// leaves anon (0147's 33 revokes that "never worked"). scripts/definer-grants-check.mjs replays the migrations;
// supabase/apply/check-rls.sql asks the live database the same question.
//
// ⛔ The allowlist below is ONLY for functions that are meant to be called WITHOUT signing in. Each needs a reason,
// a real anon caller, and a body that is safe for a stranger. Anything else that fails here: revoke it from
// `public, anon` in a migration (prove first that nothing calls it signed out, and that `authenticated` keeps a
// direct grant — see 0271 §4).

/** name → why a stranger may call it. Read live 2026-11-17: each holds a DIRECT anon grant and no PUBLIC. */
const ANON_CALLABLE = {
  report_client_error:
    'src/data/errors-live.ts reports a crash that can happen before sign-in (0176); rate-limited and size-capped in the body.',
  request_testflight_invite:
    'The landing site (forgelegacy.app) posts the TestFlight form with the public key (0215); it only queues an email.',
  social_link_hit: 'The landing site counts a click on a social link with the public key (0247); one counter, no read.',
  survey_intake:
    'The survey webhook calls it through PostgREST with the public key (0243); the token is checked first and the payload capped.',
};

const DEFINERS = checkDefinerGrants(ALL);

test('every SECURITY DEFINER function ends closed to public AND anon, except the four meant for strangers', () => {
  // Web / trunk: 269 here — build 11's 0264 (server caps, its definer functions) is not in this line's migrations
  // folder. The floor only proves the parser found them; 265 still does.
  assert.ok(DEFINERS.definers >= 265, `the replay saw ${DEFINERS.definers} definer functions — a parser that finds none passes trivially`);
  assert.deepEqual(DEFINERS.dynamic, [], 'no grant built at run time that could not be expanded');
  const unexpected = DEFINERS.open.filter((o) => !Object.hasOwn(ANON_CALLABLE, o.key.slice(0, o.key.indexOf('('))));
  assert.deepEqual(
    unexpected.map((o) => o.key),
    [],
    `SECURITY DEFINER functions still open:\n  ${unexpected.map((o) => `${o.key} [${[o.public && 'PUBLIC', o.anon && 'anon'].filter(Boolean).join('+')}] (latest definition ${o.definedIn})`).join('\n  ')}`,
  );
});

test('the allowlist is not stale: each entry is a definer function that really is anon-callable, with a reason', () => {
  const open = new Set(DEFINERS.open.map((o) => o.key.slice(0, o.key.indexOf('('))));
  for (const [name, why] of Object.entries(ANON_CALLABLE)) {
    assert.ok(open.has(name), `${name} is no longer anon-callable — take it off the allowlist`);
    assert.ok(why.length > 40, `${name} needs a real reason`);
  }
  assert.deepEqual(Object.keys(ANON_CALLABLE).sort(), [...ANON_ON_PURPOSE].sort(), '0271’s §3 and this list agree');
  const live = readFileSync(new URL('../../../supabase/apply/check-rls.sql', import.meta.url), 'utf8');
  for (const name of Object.keys(ANON_CALLABLE)) assert.ok(live.includes(`'${name}'`), `check-rls.sql excludes ${name} too`);
});

test('it would have caught the 13 that were open live: without 0271, push_register_token and the trainer_* reads are open', () => {
  const r = checkDefinerGrants(ALL.filter((f) => !f.name.startsWith('0271_')));
  const keys = new Set(r.open.map((o) => o.key));
  for (const k of ['push_register_token(text, text, text)', 'is_trainer()', 'trainer_roster()', 'trainer_client_body(uuid, date)', 'athlete_revoke_coach()']) {
    assert.ok(keys.has(k), k);
  }
  assert.equal(r.open.length, 97, 'the 2026-11-17 replay: 97 open (93 closed by 0271, 4 on purpose)');
});

test('it would have caught 0147’s finding: without 0147’s sweep, ~95 more definer functions are anon-callable', () => {
  // 0147's own header: "~95 SECURITY DEFINER functions the anonymous role could execute". The replay agrees.
  const before = new Set(checkDefinerGrants(ALL.filter((f) => !f.name.startsWith('0271_'))).open.map((o) => o.key));
  const r = checkDefinerGrants(ALL.filter((f) => !f.name.startsWith('0147_') && !f.name.startsWith('0271_')));
  const extra = r.open.filter((o) => !before.has(o.key));
  assert.ok(extra.length >= 90 && extra.length <= 100, `${extra.length}`);
  assert.ok(extra.some((o) => o.key === 'accept_friend_request(uuid)' && o.public && o.anon));
  assert.ok(extra.some((o) => o.key === 'admin_overview(integer, text)' && o.anon && !o.public), 'revoked from public only — the 33 that never worked');
});

// ── the definer replay, on the shapes it must not get wrong ──────────────────────────────────────────────────

const fn = (...sqls) => checkDefinerGrants(sqls.map((sql, i) => ({ name: `${String(i).padStart(4, '0')}_t.sql`, sql })));
const openKeys = (...sqls) => fn(...sqls).open.map((o) => `${o.key}${o.public ? '+P' : ''}${o.anon ? '+A' : ''}`);
const DEF = (sig, extra = '') => `create or replace function public.${sig} returns int language sql security definer ${extra} as $$ select 1 $$;`;

test('a new definer function is open to PUBLIC and anon; revoking only one of them leaves the other', () => {
  assert.deepEqual(openKeys(DEF('f(p_a int)')), ['f(integer)+P+A']);
  assert.deepEqual(openKeys(DEF('f(p_a int)'), 'revoke execute on function public.f(int) from public;'), ['f(integer)+A'], '0147: from public leaves anon');
  assert.deepEqual(openKeys(DEF('f(p_a int)'), 'revoke all on function public.f(integer) from anon;'), ['f(integer)+P']);
  assert.deepEqual(openKeys(DEF('f(p_a int)'), 'revoke all on function f(int4) from public, anon, authenticated;'), []);
  assert.deepEqual(openKeys(DEF('f(p_a int)', 'set search_path = public'), 'revoke execute on function public.f from public, anon;'), [], 'no argument list = every overload');
});

test('an invoker function or a trigger function is not counted', () => {
  assert.deepEqual(openKeys('create function public.g() returns int language sql as $$ select 1 $$;'), []);
  assert.deepEqual(openKeys('create function public.t() returns trigger language plpgsql security definer as $$ begin return new; end $$;'), []);
  assert.deepEqual(openKeys('create function public.e() returns event_trigger language plpgsql security definer as $$ begin end $$;'), []);
  assert.deepEqual(openKeys("create function public.s() returns text language sql as $$ select 'security definer' $$;"), [], 'the words inside a body are not an attribute');
});

test('create or replace keeps the grants; drop + create starts open again; a later grant re-opens', () => {
  const closed = [DEF('f()'), 'revoke all on function public.f() from public, anon;'];
  assert.deepEqual(openKeys(...closed, DEF('f()')), [], 'create or replace of an existing identity keeps its ACL');
  assert.deepEqual(openKeys(...closed, 'drop function if exists public.f();', DEF('f()')), ['f()+P+A']);
  assert.deepEqual(openKeys(...closed, 'grant execute on function public.f() to anon;'), ['f()+A']);
  assert.deepEqual(openKeys(DEF('f()'), DEF('f(p int)'), 'revoke all on function public.f() from public, anon;'), ['f(integer)+P+A'], 'an overload is its own function');
});

test('schema-wide revokes, alter function, and the DO-loop form (arrays holding text[] signatures)', () => {
  assert.deepEqual(
    openKeys(DEF('f()'), DEF('g(p uuid[])'), 'revoke execute on all functions in schema public from public; revoke execute on all functions in schema public from anon;'),
    [],
  );
  assert.deepEqual(openKeys(DEF('f()'), 'revoke execute on all functions in schema public from public, anon;', DEF('h()')), ['h()+P+A'], 'only what exists then');
  assert.deepEqual(openKeys('create function public.f() returns int language sql as $$ select 1 $$;', 'alter function public.f() security definer;'), ['f()+P+A']);
  const loop = `do $$ declare f text; fns text[] := array['public.a(text[], int)', 'public.b()']; begin
    foreach f in array fns loop execute format('revoke execute on function %s from public, anon', f); end loop; end $$;`;
  assert.deepEqual(openKeys(DEF('a(p text[], q integer)'), DEF('b()'), loop), []);
  const loop2 = `do $$ declare f text; begin foreach f in array array['c(uuid)'] loop execute format('revoke execute on function public.%s from public', f); end loop; end $$;`;
  assert.deepEqual(openKeys(DEF('c(p uuid)'), loop2), ['c(uuid)+A'], 'the public.%s form, and from-public-only still leaves anon');
  assert.equal(doEvents("do $$ begin execute 'revoke all on function public.z() from anon'; end $$;").events.length, 1, 'static execute text is read');
  assert.equal(doEvents("do $$ begin execute format('revoke all on function %s from anon', x); end $$;").dynamic.length, 1, 'an unexpandable one is reported');
});

test('identity types: names, modes, defaults and aliases resolve the way Postgres prints them', () => {
  assert.deepEqual(identityTypes("p_a text default 'x', out p_b int, inout p_c int4, variadic p_d text[]"), ['text', 'integer', 'text[]']);
  assert.deepEqual(identityTypes('timestamptz, p_at timestamp with time zone, double precision, p_n numeric(10, 2)'), [
    'timestamp with time zone',
    'timestamp with time zone',
    'double precision',
    'numeric',
  ]);
  assert.deepEqual(identityTypes('p_kind public.modality, bool, varchar(20), int8'), ['modality', 'boolean', 'character varying', 'bigint']);
  assert.equal(normalizeType('TEXT []'), 'text[]');
  assert.equal(functionEvents('create or replace function "public"."F"(a int) returns int language sql security definer as $$ select 1 $$')[0].name, 'f');
});
