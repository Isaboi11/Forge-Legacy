import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 0236 `remove_external_workouts` against what it must not drift from: the client that calls it, the rules it
 * promises (imports only, ledger 'deleted', active chapter only), and the paste bundle the PO actually runs.
 * Line endings are normalised so a CRLF checkout reads the same as the repo.
 */

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
const MIG = read('supabase/migrations/0236_remove_imported_workouts.sql');
const BUNDLE = read('supabase/apply/pending-0236.sql');
const CLIENT = read('src/data/apple-health-sync-live.ts');

const fn = () => {
  const start = MIG.indexOf('create or replace function public.remove_external_workouts(');
  assert.ok(start >= 0);
  return MIG.slice(start, MIG.indexOf('$fn$;', start) + 5);
};

test('SECURITY INVOKER, authenticated only, capped at 200 ids', () => {
  const body = fn();
  assert.match(body, /security invoker/);
  assert.doesNotMatch(body, /security definer/);
  assert.match(body, /cardinality\(p_ids\) > 200/);
  assert.match(MIG, /revoke execute on function public\.remove_external_workouts\(uuid\[\]\) from public, anon;/);
  assert.match(MIG, /grant execute on function public\.remove_external_workouts\(uuid\[\]\) to authenticated;/);
});

test('only the caller’s imports are deleted — never a Forge-recorded workout', () => {
  const del = fn().match(/delete from public\.workouts w\n([\s\S]*?)returning/)[1];
  assert.match(del, /w\.athlete_id = v_uid/);
  assert.match(del, /w\.source <> 'forge'/);
  assert.match(del, /w\.id = any \(p_ids\)/);
});

test('each removal is remembered as deleted, so a re-sync never re-imports it', () => {
  assert.match(fn(), /insert into public\.external_activity_ledger[\s\S]*'deleted'[\s\S]*do update set outcome = 'deleted'/);
});

test('the chapter count comes back down — active chapter only, floored at 0, from the deleted rows', () => {
  const body = fn();
  assert.match(body, /update public\.chapters c\n\s+set workout_count = greatest\(0, c\.workout_count - x\.n\)/);
  assert.match(body, /from gone g/);
  assert.match(body, /and c\.is_active/);
  assert.match(body, /c\.athlete_id = v_uid/);
});

test('the client calls this RPC by name and falls back only when it is missing', () => {
  assert.match(CLIENT, /supabase\.rpc\('remove_external_workouts', \{ p_ids: part \}\)/);
  assert.match(CLIENT, /!== 'PGRST202'\) return null/);
  // The chunk the client sends fits the server's cap.
  const chunk = Number(CLIENT.match(/const IN_CHUNK = (\d+);/)[1]);
  assert.ok(chunk <= 200);
});

test('the paste bundle carries the function verbatim and asserts it', () => {
  assert.ok(BUNDLE.includes(fn()), 'bundle §1 differs from the migration');
  assert.ok(BUNDLE.includes('revoke execute on function public.remove_external_workouts(uuid[]) from public, anon;'));
  assert.ok(BUNDLE.includes('grant execute on function public.remove_external_workouts(uuid[]) to authenticated;'));
  assert.match(BUNDLE, /raise exception '0236 DID NOT APPLY/);
});
