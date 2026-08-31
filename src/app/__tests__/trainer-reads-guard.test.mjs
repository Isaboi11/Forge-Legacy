/**
 * trainer-reads-guard.test.mjs — the guard is still there, and still FIRST.
 *
 * 0183 is the first migration that reads an athlete's training. Every function in it is
 * `SECURITY DEFINER` and takes an athlete id — the exact shape 0120 documents as a footgun, where
 * "that safety came from the missing parameter, not from RLS." A coach reads a NAMED client, so the
 * parameter cannot be missing, and the safety comes from exactly one line instead:
 *
 *     perform public.trainer_client_guard(p_athlete);
 *
 * Delete it from any one function and that function hands a stranger a named athlete's body, with
 * every other test in the repo still green. This file exists to make that impossible to do quietly.
 *
 * Run:  node --test src/app/__tests__/trainer-reads-guard.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const MIGRATION = read('../../../supabase/migrations/0183_trainer_reads.sql');
const BUNDLE = read('../../../supabase/apply/pending-0183.sql');

const code = MIGRATION.split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

/** Takes a named athlete → must call the per-client guard. */
const PER_CLIENT = [
  'trainer_client_body',
  'trainer_client_lifts',
  'trainer_client_adherence',
  'trainer_client_sessions',
];

/** Scoped to auth.uid() by the query itself → the seat guard is the right one. */
const SEAT_ONLY = ['trainer_roster', 'trainer_invitations'];

const ALL = [...PER_CLIENT, ...SEAT_ONLY];

/** The body of one function, from `create or replace` to its closing `$$;`. */
function bodyOf(name) {
  const m = code.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`));
  assert.ok(m, `${name} is missing from the migration`);
  return m[0];
}

/** The first executable statement after `begin`. */
function firstStatement(body) {
  const after = body.slice(body.indexOf('\nbegin') + 6);
  return after.slice(0, after.indexOf(';') + 1).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// the guard
// ─────────────────────────────────────────────────────────────────────────────

test('every function that takes an athlete id guards on that SAME id, first', () => {
  for (const fn of PER_CLIENT) {
    const first = firstStatement(bodyOf(fn));
    assert.equal(
      first,
      'perform public.trainer_client_guard(p_athlete);',
      `${fn}: the FIRST statement must be the per-client guard on p_athlete — found: ${first}`,
    );
  }
});

test('the roster functions guard on the seat', () => {
  for (const fn of SEAT_ONLY) {
    assert.equal(
      firstStatement(bodyOf(fn)),
      'perform public.trainer_guard();',
      `${fn}: the FIRST statement must be trainer_guard()`,
    );
  }
});

test('a guarded function never guards a DIFFERENT athlete than the one it reads', () => {
  // Guarding p_athlete and then selecting on some other id would pass every other assertion here.
  for (const fn of PER_CLIENT) {
    const body = bodyOf(fn);
    assert.ok(
      /where\s+\w+\.athlete_id\s*=\s*p_athlete/.test(body),
      `${fn} does not filter on athlete_id = p_athlete`,
    );
    assert.ok(
      !/athlete_id\s*=\s*auth\.uid\(\)/.test(body),
      `${fn} filters on auth.uid() — a coach is not the athlete, and this would return the COACH's data`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ⛔ photos are not here, and must not arrive before FC-D16
// ─────────────────────────────────────────────────────────────────────────────

test('no function reads photos — the buckets are still public (FC-D16)', () => {
  for (const table of ['transformation_entries', 'chapter_photos']) {
    assert.ok(
      !code.includes(table),
      `0183 reads ${table}. All seven storage buckets are public:true and createSignedUrl appears nowhere, so a row-level grant is theatre — the object is readable by anyone with the URL. Private buckets first.`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// the three things that are easy to get wrong
// ─────────────────────────────────────────────────────────────────────────────

test('lifts return the unit and convert nothing', () => {
  const body = bodyOf('trainer_client_lifts');
  assert.match(body, /weight_unit\s+text/, 'the unit must be part of the returned shape');
  assert.ok(
    !/2\.2046|0\.4536|\* *2\.2|\/ *2\.2/.test(body),
    'a unit conversion appeared in SQL — weights are stored as the athlete typed them, and converting here bakes the assumption into the database',
  );
});

test('adherence never returns a combined "touched" count', () => {
  const body = bodyOf('trainer_client_adherence');
  assert.match(body, /filter \(where ps\.state = 'completed'\)/);
  assert.match(body, /filter \(where ps\.state = 'skipped'\)/);
  assert.ok(
    !/count\(\*\)\s+as\s+touched/.test(body),
    'done and skipped must stay separate — a single figure reads as adherence while counting the weeks she gave up',
  );
});

test('the session limit is clamped in the function, not trusted from the caller', () => {
  assert.match(
    bodyOf('trainer_client_sessions'),
    /limit greatest\(1, least\(coalesce\(p_limit, 30\), 200\)\)/,
    'an unbounded limit on a definer function is a denial of service RLS cannot see',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// scoping and grants
// ─────────────────────────────────────────────────────────────────────────────

test('the roster shows only ACTIVE relationships, and invitations carry no training data', () => {
  const roster = bodyOf('trainer_roster');
  assert.match(roster, /tc\.trainer_id = auth\.uid\(\)/);
  assert.match(roster, /tc\.status = 'active'/);

  const invites = bodyOf('trainer_invitations');
  assert.match(invites, /tc\.status = 'invited'/);
  for (const leak of ['workouts', 'body_entries', 'program_sessions', 'workout_sets']) {
    assert.ok(!invites.includes(leak), `trainer_invitations reads ${leak} — a pending invitation is not consent`);
  }
});

test('every function is SECURITY DEFINER and granted to authenticated', () => {
  for (const fn of ALL) {
    assert.match(bodyOf(fn), /security definer/, `${fn} must be SECURITY DEFINER`);
    assert.match(
      code,
      new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\)\\s+to authenticated`),
      `${fn} is not granted to authenticated`,
    );
  }
});

test('pending-0183.sql carries 0183_trainer_reads.sql verbatim', () => {
  assert.ok(
    BUNDLE.includes(MIGRATION.trim()),
    'the pasted file and the migration of record have diverged',
  );
});
