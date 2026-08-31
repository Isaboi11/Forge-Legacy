/**
 * trainer-core-migration.test.mjs — 0182 stays the shape that makes a coach read safe.
 *
 * Forge Coach Phase B, governed by `Docs/Forge-Coach-Architecture-v1.0.md`. FC-D4 is the whole
 * argument: a coach read is a clearance the ATHLETE grants, never a capability the coach holds.
 * That claim is carried entirely by SQL — two RLS shapes and a guard on every entry point — and
 * every one of them fails SILENTLY if a later migration or a helpful edit relaxes it. A table that
 * gains a policy still works. A definer function that loses its guard still returns rows.
 *
 * `node --test` cannot reach Postgres, so each invariant is held as a source guard — the same shape
 * as `live-workout-wiring.test.mjs`, for the same reason.
 *
 * Run:  node --test src/app/__tests__/trainer-core-migration.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const MIGRATION = read('../../../supabase/migrations/0182_trainer_core.sql');
const BUNDLE = read('../../../supabase/apply/pending-0182.sql');

/** SQL with every `--` comment line removed, so a claim in prose can never satisfy an assertion. */
const code = MIGRATION.split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

/** The six RPCs a client may call. The two guards are deliberately absent — see the grants test. */
const CLIENT_RPCS = [
  'is_trainer',
  'trainer_invite_client',
  'athlete_respond_to_coach',
  'athlete_revoke_coach',
  'trainer_end_client',
  'trainer_withdraw_invite',
];

// ─────────────────────────────────────────────────────────────────────────────
// the bundle is the migration
// ─────────────────────────────────────────────────────────────────────────────

test('pending-0182.sql carries 0182_trainer_core.sql verbatim', () => {
  assert.ok(
    BUNDLE.includes(MIGRATION.trim()),
    'pending-0182.sql does not contain 0182_trainer_core.sql verbatim — the pasted file and the migration of record have diverged',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// the two RLS shapes that ARE the security boundary
// ─────────────────────────────────────────────────────────────────────────────

test('both tables enable RLS', () => {
  assert.match(code, /alter table public\.trainers enable row level security/);
  assert.match(code, /alter table public\.trainer_clients enable row level security/);
});

test('trainers has ZERO policies — the seat register is not enumerable', () => {
  // 0129 makes this argument for app_admins: `profiles` is world-readable, so the list of who holds
  // a privileged seat must never become joinable to it. A later migration must not "fix" this.
  const onTrainers = code.match(/create policy\s+\w+\s+on\s+public\.trainers\b/g) ?? [];
  assert.equal(
    onTrainers.length,
    0,
    `trainers gained ${onTrainers.length} policy/policies — RLS-with-zero-policies is deliberate, see the migration header`,
  );
});

test('trainer_clients has exactly one policy and it is SELECT — no client write path', () => {
  const policies = code.match(/create policy\s+\w+\s+on\s+public\.trainer_clients\b[\s\S]*?;/g) ?? [];
  assert.equal(policies.length, 1, 'trainer_clients should have exactly one policy');
  assert.match(policies[0], /\bfor select\b/, 'the one trainer_clients policy must be SELECT');

  for (const cmd of ['insert', 'update', 'delete', 'all']) {
    assert.ok(
      !new RegExp(`on\\s+public\\.trainer_clients\\b[\\s\\S]{0,200}?\\bfor ${cmd}\\b`).test(code),
      `trainer_clients gained a "for ${cmd}" policy — a client that can write this table can grant itself a coaching relationship`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// consent is the gate, and every door is guarded
// ─────────────────────────────────────────────────────────────────────────────

test('only status=active unlocks a read, and the guard checks the seat too', () => {
  const guard = code.match(/create or replace function public\.trainer_client_guard[\s\S]*?\n\$\$;/)?.[0];
  assert.ok(guard, 'trainer_client_guard is missing');
  assert.match(guard, /public\.is_trainer\(\)/, 'the guard must also fail a SUSPENDED seat (FC-D15)');
  assert.match(guard, /tc\.status\s*=\s*'active'/, 'the guard must require an ACTIVE relationship');
  assert.match(guard, /tc\.trainer_id\s*=\s*auth\.uid\(\)/, 'the guard must bind to the CALLER');
  assert.match(guard, /errcode\s*=\s*'42501'/, 'the guard must raise, not return empty (0129)');
});

test('trainer_end_client calls the relationship guard before it writes', () => {
  const fn = code.match(/create or replace function public\.trainer_end_client[\s\S]*?\n\$\$;/)?.[0];
  assert.ok(fn, 'trainer_end_client is missing');
  const guardAt = fn.indexOf('trainer_client_guard');
  const writeAt = fn.indexOf('update public.trainer_clients');
  assert.ok(guardAt > -1, 'trainer_end_client does not call trainer_client_guard');
  assert.ok(guardAt < writeAt, 'the guard must come BEFORE the write');
});

test('is_trainer() takes no argument — 0129 records why an is_x(uuid) overload is a footgun', () => {
  assert.match(code, /create or replace function public\.is_trainer\(\)/);
  assert.ok(
    !/function public\.is_trainer\(\s*\w/.test(code),
    'is_trainer gained a parameter — a definer function taking an arbitrary uuid is the 0120 footgun',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FC-D6 — one coach at a time, enforced by an index rather than by a check that can race
// ─────────────────────────────────────────────────────────────────────────────

test('one active coach per athlete is a PARTIAL unique index', () => {
  const idx = code.match(/create unique index if not exists trainer_clients_one_active_coach[\s\S]*?;/)?.[0];
  assert.ok(idx, 'the one-active-coach index is missing');
  assert.match(idx, /\(athlete_id\)/, 'it must be unique on the ATHLETE');
  assert.match(idx, /where status = 'active'/, 'it must be PARTIAL — several open invitations are fine, and a past coach must never block a future one');
});

// ─────────────────────────────────────────────────────────────────────────────
// grants
// ─────────────────────────────────────────────────────────────────────────────

test('every client-callable RPC is SECURITY DEFINER and granted; the guards are neither', () => {
  for (const fn of CLIENT_RPCS) {
    const body = code.match(new RegExp(`create or replace function public\\.${fn}\\([\\s\\S]*?\\n\\$\\$;`))?.[0];
    assert.ok(body, `${fn} is missing`);
    assert.match(body, /security definer/, `${fn} must be SECURITY DEFINER`);
    assert.match(
      code,
      new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\)\\s+to authenticated`),
      `${fn} is not granted to authenticated`,
    );
  }

  // ⚠ Revoke FROM PUBLIC, never from `authenticated` — Postgres grants EXECUTE to PUBLIC on every
  // new function, so revoking from a role that never held a direct grant removes nothing (0120).
  for (const guard of ['trainer_guard\\(\\)', 'trainer_client_guard\\(uuid\\)']) {
    assert.match(
      code,
      new RegExp(`revoke execute on function public\\.${guard}\\s+from public`),
      `${guard} must be revoked FROM PUBLIC`,
    );
    assert.ok(
      !new RegExp(`grant execute on function public\\.${guard}`).test(code),
      `${guard} must never be granted — it is called from inside definer bodies`,
    );
  }
});

test('the trainer cannot coach themselves, and cannot be invited twice', () => {
  assert.match(code, /constraint trainer_clients_not_self check \(trainer_id <> athlete_id\)/);
  assert.match(code, /create unique index if not exists trainer_clients_one_live_pair[\s\S]*?where status in \('invited', 'active'\)/);
});
