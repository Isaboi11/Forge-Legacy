/**
 * Launch QA 11-08 — 0260, the database half: H13 (a blocked person could open your profile and find you), H17
 * ("Only me" sections leaked under "Recent"), H31 (a cut drew a full bar on a public profile), H2 (join asks never
 * expired), H8 (a joined competition starting later vanished), H34 (a Free athlete could not delete their recipe),
 * B5 (a backed-out Start burned a lifetime program). Built by script from each function's newest body.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const sql = read('../../../supabase/migrations/0260_launch_db_fixes.sql');
const bundle = read('../../../supabase/apply/pending-0260.sql');

test('each change is in the migration', () => {
  assert.match(sql, /if p\.id <> v_uid and public\.is_blocked\(v_uid, p_athlete\) then\n\s+return null;/, 'H13 profile');
  assert.match(sql, /and not public\.is_blocked\(v_uid, p\.id\)/, 'H13 search');
  assert.match(sql, /and public\.vis_clears\(coalesce\(v_vis->>'history', 'everyone'\), v_clear\)/, 'H17 chapters');
  assert.match(sql, /and public\.vis_clears\(coalesce\(v_vis->>'accomplishments', 'everyone'\), v_clear\)/, 'H17 accomplishments');
  assert.match(sql, /and i\.created_at >= now\(\) - interval '3 hours';/, 'H2');
  assert.match(sql, /where c\.state in \('ENROLLMENT', 'ACTIVE'\)/, 'H8 list');
  assert.match(sql, /'state', c\.state,/, 'H8 state key');
  assert.match(sql, /for delete\n\s+using \(athlete_id = auth\.uid\(\) and public\.has_nutrition_access\(\)\);/, 'H34');
  assert.match(sql, /revoke all on function public\.discard_unstarted_program\(uuid\) from public, anon;/, 'B5 grants');
});

test('the paste bundle carries the migration verbatim, then asserts and reports', () => {
  const body = sql.slice(sql.indexOf('create or replace function public.athlete_profile'));
  assert.ok(bundle.includes(body.trimEnd()), 'every statement of 0260 is in the bundle, unchanged');
  assert.match(bundle, /raise notice '0260: all seven changes in place\.';/);
  assert.match(bundle, /stale_asks_now_hidden/);
});

test('the app reads each change safely before 0260 is pasted', () => {
  assert.match(read('../../data/challenges-live.ts'), /state: r\.state === 'ENROLLMENT' \? \('ENROLLMENT' as const\) : \('ACTIVE' as const\)/);
  assert.match(read('../program/[id].tsx'), /const refunded = await discardUnstartedProgram\(id\)\.catch\(\(\) => false\);\n\s+if \(!refunded\) await deleteProgram\(id\);/);
});
