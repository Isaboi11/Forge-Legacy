/**
 * onboarding-missing-profile.test.mjs — 0199 stays the shape that lets a profile-less account finish.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * A tester walked all seven onboarding steps and was refused at "Enter Forge" with
 * `chapters_athlete_id_fkey … Key is not present in table "profiles" (23503)`. His login existed; his
 * `profiles` row did not. Every screen before the finish tolerates a missing row (the router reads it as
 * "not onboarded yet", which is also what a healthy new account looks like), so the only statement that
 * needs it — the Chapter I insert inside `complete_onboarding` — is the last one to run, and no retry
 * can ever clear it.
 *
 * 0199 makes the finish mint the row (`ensure_my_profile()`) before it touches it. Every guarantee here is
 * carried by SQL and fails SILENTLY if a later edit relaxes it: drop the call and onboarding still works
 * for everyone with a row; drop the grant and it breaks for EVERYONE with no warning in `tsc` or lint.
 * `node --test` cannot reach Postgres, so each is held as a source guard, the same shape as
 * `trainer-core-migration.test.mjs`.
 *
 * Run:  node --test src/app/__tests__/onboarding-missing-profile.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const MIGRATION = read('../../../supabase/migrations/0199_mint_missing_profile.sql');
const BUNDLE = read('../../../supabase/apply/pending-0199.sql');
const PRIOR = read('../../../supabase/migrations/0066_onboarding_retryable.sql');

/** SQL with every `--` comment line removed, so a claim in prose can never satisfy an assertion. */
const stripComments = (sql) =>
  sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
const code = stripComments(MIGRATION);

/** One function's full `create … $$;` text, from the comment-stripped SQL. */
const fnBody = (sql, name) => {
  const m = new RegExp(`create or replace function (?:public\\.)?${name}\\([\\s\\S]*?\\n\\$\\$;`).exec(sql);
  assert.ok(m, `${name} is not defined in this file`);
  return m[0];
};

test('pending-0199.sql carries 0199_mint_missing_profile.sql verbatim', () => {
  assert.ok(
    BUNDLE.includes(MIGRATION.trim()),
    'pending-0199.sql does not contain the migration verbatim — the pasted file and the migration of record have diverged',
  );
});

test('complete_onboarding mints the row BEFORE the update that needs it', () => {
  const body = fnBody(code, 'complete_onboarding');
  const mint = body.indexOf('perform public.ensure_my_profile();');
  const update = body.indexOf('update profiles set');
  const insert = body.indexOf('insert into chapters');
  assert.ok(mint > -1, 'complete_onboarding no longer calls ensure_my_profile()');
  assert.ok(mint < update && update < insert, 'the mint must run before the profile update and the chapter insert');
});

test('⚠ the rest of complete_onboarding is 0066 unchanged — rebuilt from the newest body', () => {
  // `create or replace` rewrites the WHOLE body. Removing only the mint line must give back 0066 exactly,
  // so the retry-safe chapter insert and the not-found guard cannot be lost in a retype.
  const now = fnBody(code, 'complete_onboarding').replace(/\n  perform public\.ensure_my_profile\(\);\n\n/, '\n');
  const before = fnBody(stripComments(PRIOR), 'complete_onboarding');
  assert.equal(now, before);
});

test('ensure_my_profile is SECURITY DEFINER, zero-argument, and names only auth.uid()', () => {
  const body = fnBody(code, 'ensure_my_profile');
  assert.match(body, /create or replace function public\.ensure_my_profile\(\)\s*\n\s*returns boolean/);
  assert.match(body, /security definer/);
  assert.match(body, /set search_path = public, pg_temp/);
  assert.match(body, /v_uid\s+uuid := auth\.uid\(\);/);
  // Every insert names the caller — there is no parameter that could point it at somebody else.
  assert.match(body, /insert into public\.profiles \(id, name, first_name, handle, initials\)\s*\n\s*values \(v_uid,/);
  // Does not raise on a handle collision — it leaves the handle null, which 0009 made legal.
  assert.match(body, /on conflict do nothing/);
});

test('ensure_my_profile: revoked from BOTH public and anon, granted to authenticated', () => {
  assert.match(code, /revoke execute on function public\.ensure_my_profile\(\) from public;/);
  assert.match(code, /revoke execute on function public\.ensure_my_profile\(\) from anon;/);
  // ⚠ complete_onboarding is INVOKER. Without this grant the call above fails for every new athlete.
  assert.match(code, /grant\s+execute on function public\.ensure_my_profile\(\) to authenticated;/);
});

test('the backfill repairs live accounts only, and cannot roll itself back on one collision', () => {
  const m = /insert into public\.profiles \(id, name, first_name, handle, initials\)\s*\nselect[\s\S]*?;/.exec(code);
  assert.ok(m, 'the one-time backfill is gone');
  assert.match(m[0], /from auth\.users u/);
  assert.match(m[0], /not exists \(select 1 from public\.profiles p where p\.id = u\.id\)/);
  assert.match(m[0], /deleted_at/);
  assert.match(m[0], /on conflict do nothing;$/);
});

test('handle_new_user() is never retyped — only its trigger is restored if missing', () => {
  assert.doesNotMatch(code, /create or replace function (public\.)?handle_new_user/);
  assert.match(code, /create trigger on_auth_user_created after insert on auth\.users/);
});

test('the bundle asserts the grant in BOTH directions and reports in ONE result set', () => {
  assert.match(BUNDLE, /has_function_privilege\('anon', 'public\.ensure_my_profile\(\)', 'execute'\) then\s*\n\s*raise/);
  assert.match(BUNDLE, /if not has_function_privilege\('authenticated', 'public\.ensure_my_profile\(\)', 'execute'\) then/);
  const tail = BUNDLE.slice(BUNDLE.lastIndexOf('§3'));
  assert.equal((stripComments(tail).match(/^select\b/gm) ?? []).length, 1, '§3 must be a single select');
});
