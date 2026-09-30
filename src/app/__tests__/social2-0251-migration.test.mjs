import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * 0251 — squads count from when you joined, presence that expires, and the squad notices nobody got
 * (QA 09-26 round 2: social2-02 / 04 / 05 / 06 / 13 / 27). Applied in production by the PO 09-30.
 *
 * ⚠ FIVE EXISTING FUNCTIONS ARE RESTATED, AND A RESTATEMENT IS WHERE A MIGRATION QUIETLY ROLLS THINGS BACK.
 * Each is compared with the body it was built from, line by line: every source line must survive, except
 * exactly the lines the header says were changed. A newer definition appearing between that source and
 * 0251 fails too — 0251 would then be restating a stale body.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MIG = read('supabase/migrations/0251_squads_count_from_join_presence_expires.sql');
const BUNDLE = read('supabase/apply/pending-0251.sql');

/** The LAST `create or replace function public.<name>(` … `$$;` in a file. */
function fnDef(sql, name) {
  const re = new RegExp('create or replace function public\\.' + name + '\\([\\s\\S]*?\\n\\$\\$;', 'g');
  const all = sql.match(re);
  assert.ok(all, `${name} is not defined here`);
  return all[all.length - 1];
}

/** Source lines that do not survive into the restatement (multiset, trailing space ignored). */
function droppedLines(source, restated) {
  const left = new Map();
  for (const l of restated.split('\n').map((s) => s.trimEnd())) left.set(l, (left.get(l) ?? 0) + 1);
  const dropped = [];
  for (const l of source.split('\n').map((s) => s.trimEnd())) {
    const n = left.get(l) ?? 0;
    if (n > 0) left.set(l, n - 1);
    else dropped.push(l.trim());
  }
  return dropped;
}

const RESTATED = [
  // [function, source migration, the source lines 0251 is ALLOWED to change]
  ['notification_events_for', '0234_apple_health_import', 0],
  ['transfer_squad_ownership', '0047_transfer_ownership', 1],
  ['squad_metric_sum', '0103_squad_goal_dates', 5],
  ['squad_member_contributions', '0107_squad_goal_detail', 6],
  ['squad_goal_detail', '0107_squad_goal_detail', 1],
];

test('0251 restates each function from its newest body and changes only what its header says', () => {
  const files = readdirSync(resolve(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const [fn, source, allowed] of RESTATED) {
    const definers = files.filter((f) => f < '0251' && read('supabase/migrations/' + f).includes(`function public.${fn}(`));
    assert.equal(definers.at(-1), source + '.sql', `${fn}: the newest body before 0251 is ${definers.at(-1)}, not ${source}`);
    const dropped = droppedLines(fnDef(read(`supabase/migrations/${source}.sql`), fn), fnDef(MIG, fn));
    assert.equal(dropped.length, allowed, `${fn} lost lines it should not have:\n${dropped.join('\n')}`);
  }
});

test('the changed lines are the join bounds (social2-02, social2-04) and the owner stamp (social2-27)', () => {
  const union = fnDef(MIG, 'notification_events_for');
  assert.ok((union.match(/joined_at/g) ?? []).length >= 4, 'branches 15/16 are bounded by BOTH membership rows');
  assert.match(union, /owner_since/, 'branch 2 is bounded by the reader’s ownership');
  assert.match(union, /is_blocked/, '0225’s block filter is carried');
  assert.match(union, /w\.source = 'forge'/, '0234’s import filter is carried');

  const sum = fnDef(MIG, 'squad_metric_sum');
  assert.equal((sum.match(/greatest\(/g) ?? []).length, 5, 'all five metric kinds count from the later of goal start and join');
  assert.equal((fnDef(MIG, 'squad_member_contributions').match(/greatest\(/g) ?? []).length, 5);
  assert.match(fnDef(MIG, 'squad_goal_detail'), /greatest\(coalesce\(s\.goal_started_at, '-infinity'::timestamptz\), sm\.joined_at\)/);

  assert.match(fnDef(MIG, 'transfer_squad_ownership'), /owner_since = now\(\)/);
});

test('a competition cannot start before it exists (social2-05)', () => {
  const trig = fnDef(MIG, 'challenges_start_not_before_now');
  assert.match(trig, /new\.end_at := new\.end_at \+ \(now\(\) - new\.start_at\);/, 'the length chosen is kept');
  assert.match(trig, /new\.start_at := now\(\);/);
  assert.match(MIG, /before insert on public\.challenges/);
});

test('presence expires only for a build that phones home (social2-13)', () => {
  const sweep = fnDef(MIG, 'training_presence_sweep');
  assert.match(sweep, /h\.seen_at >= p\.training_since/, 'an old build that never heartbeats keeps the four-hour ceiling');
  assert.match(sweep, /h\.seen_at < now\(\) - interval '10 minutes'/);
  assert.doesNotMatch(sweep, /training_announced_at/, 'a sweep is a LEAVE: the announcement stamp is held (0202)');
  assert.match(MIG, /grant execute on function public\.training_heartbeat\(\) to authenticated;/);
});

test('the notices P-5 §3.3 says always fire — and none that the specs say stay silent', () => {
  assert.match(MIG, /check \(kind in \('squad_owner_changed', 'squad_deleted'\)\)/, 'no "removed" kind (S-3 §7.3)');
  assert.match(MIG, /before delete on public\.squads/);
  const notices = fnDef(MIG, 'social_notices');
  assert.match(notices, /'squad_challenge_open'::text/);
  assert.match(notices, /not public\.is_blocked\(v_uid, c\.creator_id\)/);
  assert.match(MIG, /grant execute on function public\.social_notices\(\) to authenticated;/);
});

test('the paste bundle carries 0251 byte-for-byte', () => {
  assert.ok(BUNDLE.includes(MIG.slice(MIG.indexOf('begin;'))), 'supabase/apply/pending-0251.sql no longer contains 0251 verbatim');
});

// ── the client ─────────────────────────────────────────────────────────────────

test('the heartbeat and the notices cost nothing on a database without 0251', () => {
  const presence = read('src/data/presence-live.ts');
  assert.match(presence, /supabase\.rpc\('training_heartbeat'\)/);
  assert.match(presence, /=== 'PGRST202'\) heartbeatUnavailable = true;/, 'asked once, not every two minutes');
  const session = read('src/hooks/useWorkoutSession.tsx');
  assert.match(session, /setInterval\(beat, TRAINING_HEARTBEAT_MS\)/);
  assert.match(session, /if \(alive && live === false\) void setTrainingStatus\(true, name\)/, 'taken off while still open → re-assert, never a new session');
});

test('Create Competition starts "Now" at now, not at midnight (social2-05)', () => {
  const create = read('src/app/create-challenge.tsx');
  assert.match(create, /startAt: startWhen === 'now' \? new Date\(\) : start,/);
  assert.match(create, /\{ v: 'now' as const, label: 'Now' \}/);
});
