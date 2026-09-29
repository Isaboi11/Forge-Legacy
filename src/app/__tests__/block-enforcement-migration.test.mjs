// node --test src/app/__tests__/block-enforcement-migration.test.mjs
//
// QA R2-F2 (App Store Guideline 1.2): a block must stop contact in both directions.
//   · 0225 put `is_blocked` into every SECURITY DEFINER function that creates contact. A later migration that
//     restates one of them from an older body would silently undo that — so this walks the WHOLE ledger and
//     checks the LATEST definition of each, wherever it now lives (0234 already restated the inbox union).
//   · 0241 closes the one contact channel added after 0225: squad-mate workout messages (0231) and the reply
//     push (0240). One RESTRICTIVE policy, no function restated.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const DIR = new URL('../../../supabase/migrations/', import.meta.url);
const FILES = readdirSync(DIR).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
const read = (f) => readFileSync(new URL(f, DIR), 'utf8');

const MIGRATION = read('0241_block_cheers.sql');
const BUNDLE = readFileSync(new URL('../../../supabase/apply/pending-0241.sql', import.meta.url), 'utf8');

/** The newest `create or replace function public.<name>(…) … $$;` across the ledger. */
function latestDefinition(name) {
  let found = null;
  const re = new RegExp(`create or replace function public\\.${name}\\s*\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`, 'gi');
  for (const f of FILES) {
    for (const m of read(f).matchAll(re)) found = { file: f, body: m[1] };
  }
  return found;
}

// Every definer reader/writer 0225 guarded, and the predicate it must still carry.
const GUARDED = {
  request_friend: /is_blocked\(v_uid, p_athlete\) then\s+return 'outgoing'/,
  notification_events_for: /not public\.is_blocked\(p_user, e\.actor_id\)/,
  training_now: /is_blocked\(/,
  training_partners: /is_blocked\(/,
  athlete_training_status: /is_blocked\(/,
  live_session_of: /is_blocked\(/,
  workout_invite: /is_blocked\(/,
  pending_join_requests: /is_blocked\(/,
  block_athlete: /delete from public\.workout_invites/,
  unblock_athlete: /delete from public\.workout_invites/,
};

for (const [name, guard] of Object.entries(GUARDED)) {
  test(`${name}: its latest definition still carries 0225's block guard`, () => {
    const def = latestDefinition(name);
    assert.ok(def, `${name} is not defined anywhere`);
    assert.ok(def.file >= '0225', `${name}'s latest definition is ${def.file}, older than 0225`);
    assert.match(def.body, guard, `${name} (latest: ${def.file}) lost its block guard`);
  });
}

test('the inbox union keeps all seventeen of 0164’s branches inside the block filter', () => {
  const { body } = latestDefinition('notification_events_for');
  for (const kind of ['join_request', 'friend_request', 'workout_join_request', 'squad_post', 'post_comment', 'post_reaction', 'squad_training_started', 'challenge_joined']) {
    assert.match(body, new RegExp(`'${kind}'::text`), `${kind} branch missing`);
  }
});

test('0231: a new workout message is refused across a block (INSERT policy)', () => {
  assert.match(read('0231_workout_cheers.sql'), /not public\.is_blocked\(auth\.uid\(\), workout_cheers\.to_id\)/);
});

test('0241: one RESTRICTIVE policy for ALL commands, symmetric is_blocked in USING and WITH CHECK', () => {
  const m = MIGRATION.match(/create policy workout_cheers_not_blocked on public\.workout_cheers([\s\S]*?);/);
  assert.ok(m, 'policy missing');
  assert.match(m[1], /as restrictive for all/);
  assert.match(m[1], /using \(not public\.is_blocked\(from_id, to_id\)\)/);
  assert.match(m[1], /with check \(not public\.is_blocked\(from_id, to_id\)\)/);
  assert.match(MIGRATION, /drop policy if exists workout_cheers_not_blocked on public\.workout_cheers;/);
});

test('0241 restates no function and drops nothing but its own policy', () => {
  assert.doesNotMatch(MIGRATION, /create or replace function|drop function|create function/i);
  const drops = [...MIGRATION.matchAll(/drop policy if exists (\w+)/g)].map((m) => m[1]);
  assert.deepEqual(drops, ['workout_cheers_not_blocked']);
  assert.doesNotMatch(MIGRATION.replace(/^--.*$/gm, ''), /\bdelete from\b|\btruncate\b|\bgrant\b|\brevoke\b/i);
});

test('0241 self-check raises on a missing or PERMISSIVE policy', () => {
  assert.match(MIGRATION, /permissive = 'RESTRICTIVE' and cmd = 'ALL'/);
  assert.match(MIGRATION, /raise exception '0241: workout_cheers_not_blocked is missing/);
});

test('the paste bundle carries 0241 byte-for-byte, then a read-only §3', () => {
  assert.ok(BUNDLE.includes(MIGRATION), 'bundle §1 is not verbatim');
  const s3 = BUNDLE.slice(BUNDLE.indexOf(MIGRATION) + MIGRATION.length).replace(/^--.*$/gm, '');
  assert.match(s3, /^\s*select\b/);
  assert.doesNotMatch(s3, /\b(insert|update|delete|create|drop|alter|grant|revoke)\b/i);
});
