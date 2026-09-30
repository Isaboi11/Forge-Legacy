// node --test src/app/__tests__/personal-record-workout-migration.test.mjs
//
// Static guards on migration 0242 (QA F9 — a personal record knows the workout that set it). There is no
// PGlite harness in this repo, so these check the SQL TEXT: that the two restated functions are 0162's
// bodies with exactly the intended splice and nothing else (memory: never retype an existing function),
// that the bundle carries the migration verbatim, and that the client still reads records before 0242.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8');
const MIGRATION = read('0242_personal_record_workout.sql');
const PREVIOUS = read('0162_route_and_climb.sql');
const BUNDLE = readFileSync(new URL('../../../supabase/apply/pending-0242.sql', import.meta.url), 'utf8');
const RECORDS_LIVE = readFileSync(new URL('../../data/records-live.ts', import.meta.url), 'utf8');

function body(sql, start) {
  const a = sql.indexOf(start);
  assert.ok(a >= 0, `missing ${start}`);
  assert.equal(sql.indexOf(start, a + 1), -1, `${start} appears twice`);
  return sql.slice(a, sql.indexOf('$fn$;', a) + 5);
}

const COLS_OLD = 'load_value, load_unit, load_reps)';
const COLS_NEW = 'load_value, load_unit, load_reps, workout_id)';
const VALS_OLD = "(v_pr->>'reps')::int);";

for (const [name, start, id] of [
  ['save_workout', 'create or replace function save_workout(', 'v_workout'],
  ['continue_workout', 'create or replace function public.continue_workout(', 'p_workout_id'],
]) {
  test(`${name} is 0162's body plus the workout_id splice — nothing else`, () => {
    const now = body(MIGRATION, start);
    const was = body(PREVIOUS, start);
    const newVals = `(v_pr->>'reps')::int, ${id});`;
    assert.equal(now.split(COLS_NEW).length - 1, 1, 'workout_id column list');
    assert.equal(now.split(newVals).length - 1, 1, `values carry ${id}`);
    assert.equal(now.replace(COLS_NEW, COLS_OLD).replace(newVals, VALS_OLD), was);
  });
}

test('0162 is still the newest definition of both functions (no later migration restates them)', () => {
  const later = readdirSync(dir)
    // 0253 restates continue_workout from 0242 — guarded on its own below.
    .filter((f) => /^\d{4}_.*\.sql$/.test(f) && f.slice(0, 4) > '0162' && !f.startsWith('0242') && !f.startsWith('0253'))
    .filter((f) => /create or replace function (public\.)?(save_workout|continue_workout)\s*\(/i.test(read(f)));
  assert.deepEqual(later, []);
});

test('0253 is 0242’s continue_workout plus the into_position splice — nothing else (workout-05)', () => {
  const m = read('0253_continue_into_same_exercise.sql').replace(/\r\n/g, '\n');
  const start = 'create or replace function public.continue_workout(';
  const now = body(m, start);
  const was = body(MIGRATION.replace(/\r\n/g, '\n'), start);
  const open = '    if v_wex is null then\n';
  const a = now.indexOf('    -- 0253.');
  const b = now.indexOf(open, a);
  assert.ok(a > 0 && b > a, 'the lookup block moved');
  const unspliced = now.slice(0, a) + now.slice(b + open.length).replace('    v_pos := v_pos + 1;\n    end if;\n', '    v_pos := v_pos + 1;\n');
  assert.equal(unspliced, was);
  assert.match(now, /and we\.name = v_ex->>'name'/, 'a row is reused only for the same lift');
  const bundle = readFileSync(new URL('../../../supabase/apply/pending-0253.sql', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(bundle.includes(m), 'the bundle carries 0253 verbatim');
  assert.match(bundle, /raise exception '0253: the installed continue_workout does not append/);
  const later = readdirSync(dir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f) && f.slice(0, 4) > '0253')
    .filter((f) => /create or replace function (public\.)?continue_workout\s*\(/i.test(read(f)));
  assert.deepEqual(later, [], 'a later migration restates continue_workout — move this guard to it');
});

test('additive and guarded: nullable column, set-null FK, no drop, no backfill', () => {
  assert.match(MIGRATION, /alter table public\.personal_records add column if not exists workout_id uuid;/);
  assert.match(MIGRATION, /if not exists \(select 1 from pg_constraint where conname = 'personal_records_workout_id_fkey'\)/);
  assert.match(MIGRATION, /references public\.workouts\(id\) on delete set null/);
  assert.doesNotMatch(MIGRATION, /\bdrop\s+(function|table|column|policy)\b/i);
  assert.doesNotMatch(MIGRATION, /update\s+(public\.)?personal_records/i);
  assert.doesNotMatch(MIGRATION, /\brevoke\b/i);
});

test('the paste bundle carries the migration verbatim, then asserts (§2) and reports (§3)', () => {
  assert.ok(BUNDLE.includes(MIGRATION));
  const tail = BUNDLE.slice(BUNDLE.indexOf(MIGRATION) + MIGRATION.length);
  assert.match(tail, /§2/);
  assert.match(tail, /raise exception '0242: the installed save_workout does not write workout_id/);
  assert.match(tail, /raise exception '0242: the installed continue_workout does not write workout_id/);
  assert.match(tail, /has_function_privilege\('authenticated', r\.oid, 'EXECUTE'\)/);
  assert.match(tail, /§3/);
  assert.match(tail, /'load records with a workout'/);
});

test('the client still reads records before 0242 is pasted — it retries without workout_id', () => {
  assert.match(RECORDS_LIVE, /read\(`\$\{RECORD_COLS\}, workout_id`\)/);
  assert.match(RECORDS_LIVE, /if \(error\) \(\{ data, error \} = await read\(RECORD_COLS\)\);/);
  // RECORD_COLS itself must never name the new column, or the fallback asks for it too.
  const cols = RECORDS_LIVE.match(/export const RECORD_COLS = '([^']*)'/)[1];
  assert.doesNotMatch(cols, /workout_id/);
});
