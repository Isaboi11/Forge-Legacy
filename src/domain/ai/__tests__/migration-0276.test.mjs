/**
 * migration-0276.test.mjs — "a build Holt's chat opened is ONE credit" (AI Road to 10 Sprint 4a §1.4, lane A).
 * The SQL cannot run here (no database); these pin the properties that make it safe to paste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const MIG = read('supabase/migrations/0276_typed_build_rides_on_holts_chat.sql');
const PENDING = read('supabase/apply/pending-0276.sql');
const ASK = read('supabase/functions/coach-ask/index.ts');

test('§1 of the paste bundle is the migration, byte for byte', () => {
  const body = MIG.slice(MIG.indexOf('begin;'), MIG.lastIndexOf('commit;') + 'commit;'.length);
  assert.ok(body.length > 2000);
  assert.ok(PENDING.includes(body));
});

test('⛔ the mark is service-role only — revoked from public, anon AND authenticated, invoker, and §2 checks it', () => {
  assert.match(MIG, /revoke execute on function public\.coach_ai_mark_build\(uuid\) from public, anon, authenticated;/);
  assert.match(MIG, /grant execute on function public\.coach_ai_mark_build\(uuid\) to service_role;/);
  assert.match(MIG, /security invoker/);
  assert.match(PENDING, /has_function_privilege\('authenticated', 'public\.coach_ai_mark_build\(uuid\)', 'execute'\)/);
  // It marks only a settled, kept, paid coach-ask reservation.
  for (const w of ["r.fn = 'coach-ask'", 'r.credits > 0', 'r.settled_at is not null', 'not r.refunded']) assert.ok(MIG.includes(w), w);
});

test('⛔ coach_ai_reserve is SPLICED from the live source, never retyped — guarded by the md5 before and after', () => {
  assert.doesNotMatch(MIG, /create or replace function public\.coach_ai_reserve/i, 'the reserve is never retyped');
  assert.match(MIG, /pg_get_functiondef\('public\.coach_ai_reserve\(text,text\)'::regprocedure\)/);
  assert.match(MIG, /md5\(v_src\) <> 'fe40ac392de7992efd0919eae8ca13ff'/);
  assert.match(MIG, /md5\(v_out\) <> 'b25d0243e98cefa56e27f04f5e27b981'/);
  assert.match(MIG, /\(r\.fn = 'coach-interpret' or \(r\.fn = 'coach-ask' and r\.opened_build\)\)/);
  assert.match(MIG, /if position\(v_new in v_src\) > 0 then/, 'safe to run twice');
  assert.match(PENDING, /reserve_md5 = b25d0243e98cefa56e27f04f5e27b981/, 'the prediction is written down');
});

test('coach-ask calls exactly this RPC, with the service key, with the reservation id', () => {
  assert.match(ASK, /rest\/v1\/rpc\/coach_ai_mark_build/);
  assert.match(ASK, /body: JSON\.stringify\(\{ p_reservation: reservation \}\)/);
});
