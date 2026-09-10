import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { destinationFor } from '../../domain/notifications/destination.ts';

/**
 * Amendment 006 / 0200 — a squad goal ENDS, and the squad hears about it.
 *
 * PO: *"A goal in the squad Moch 1 ended without anyone knowing. It didn't prompt us or post anything.
 * Didn't send a notification, and it still looks like it's going right now."* Every clause of that was a
 * missing path rather than a broken one, so these assert the paths exist and stay wired.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, '');

const MIG = read('supabase/migrations/0200_squad_goal_close.sql');
const BUNDLE = read('supabase/apply/pending-0200.sql');
const SQL = strip(MIG);

function fnBody(name, src = MIG) {
  const start = src.indexOf(`function public.${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const open = src.indexOf('as $$', start);
  return src.slice(start, src.indexOf('$$;', open + 5) + 3);
}

test('the paste bundle carries 0200 byte-for-byte', () => {
  assert.ok(BUNDLE.includes(MIG), 'supabase/apply/pending-0200.sql no longer contains the migration verbatim — regenerate it');
});

test('0200 does NOT restate the notification union or the preference functions (0195/0196 own the next copy)', () => {
  for (const fn of ['notification_events_for', 'push_pref_key', 'push_pref_default', 'push_enqueue_for', 'push_tg_squad_posts']) {
    assert.ok(!new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\(`).test(SQL), `0200 restates ${fn} — whichever of it and 0195/0196 is pasted second erases the other`);
  }
});

test('the weekly recap is 0057 plus ONE predicate — spliced, never retyped', () => {
  const OLD = 'if v_sq.goal_target is not null and v_sq.goal_started_at is not null then';
  const NEW = 'if v_sq.goal_target is not null and v_sq.goal_started_at is not null\n     and (v_sq.goal_closed_at is null or v_sq.goal_closed_at >= v_prev) then';
  const original = norm(fnBody('ensure_weekly_recap', read('supabase/migrations/0057_squad_weekly_recap.sql')));
  const restated = norm(fnBody('ensure_weekly_recap'));
  assert.ok(restated.includes(NEW), 'the closed-goal guard is gone');
  assert.equal(restated.split(NEW).join(OLD), original, 'ensure_weekly_recap differs from 0057 by more than the one guard');
});

test('the job is scheduled, and runs the close — not the read-only dry run', () => {
  assert.match(SQL, /cron\.schedule\('forge-squad-goals',\s*'\*\/15 \* \* \* \*',\s*\$cron\$ select public\.squad_goals_close_due\(\); \$cron\$\)/);
});

test('the act-as helper is unreachable from a client, and the inbox rows are reachable', () => {
  assert.match(SQL, /revoke execute on function public\.squad_goal_act_as\(uuid\) from public;/);
  assert.match(SQL, /grant execute on function public\.squad_goal_notifications\(\) to authenticated;/);
  // Transaction-local, or a run could leak an owner's identity into whatever the connection does next.
  const actAs = strip(fnBody('squad_goal_act_as'));
  assert.match(actAs, /set_config\('request\.jwt\.claim\.sub',[^;]*,\s*true\);/, 'the subject must be transaction-local');
  assert.match(actAs, /set_config\('request\.jwt\.claims',[^;]*,\s*true\);/, 'the claims must be transaction-local');
});

test('a closed goal is never worded as a failure (Amendment 006 §5)', () => {
  const close = strip(fnBody('squad_goal_record_close')).toLowerCase();
  for (const word of ['fail', 'missed', 'short', 'behind', ' to go']) {
    assert.ok(!close.includes(word), `the close wording contains "${word.trim()}"`);
  }
  assert.match(close, /logged together/);
});

test('the push honours squad_goals with an explicit false, and defaults it ON (D1)', () => {
  const close = strip(fnBody('squad_goal_record_close'));
  assert.match(close, /jsonb_typeof\(coalesce\(pr\.notif_prefs, '\{\}'::jsonb\) -> 'squad_goals'\) = 'boolean'\s+then \(pr\.notif_prefs ->> 'squad_goals'\)::boolean\s+else true/);
  assert.match(close, /insert into public\.push_outbox/);
});

test('backfill: a deadline more than 7 days gone closes silently, in the job AND the trigger', () => {
  assert.match(strip(fnBody('squad_goals_due')), /due_announce := r\.goal_ends_at is null or r\.goal_ends_at > now\(\) - interval '7 days'/);
  assert.match(strip(fnBody('squads_goal_lifecycle')), /old\.goal_ends_at > now\(\) - interval '7 days'/);
});

test('the trigger fires BEFORE the update, so the sum still reads the old window', () => {
  assert.match(SQL, /create trigger squads_goal_lifecycle\s+before update of goal, goal_target, goal_metric_kind, goal_metric_key, goal_started_at, goal_ends_at/);
});

// ── the client ─────────────────────────────────────────────────────────────────

test('the inbox merges the goal rows, and a missing function costs nothing', () => {
  const live = strip(read('src/data/notifications-live.ts'));
  assert.match(live, /supabase\.rpc\('squad_goal_notifications'\)/);
  assert.match(live, /if \(error \|\| !data\) return \[\];/);
  // Both the list and the bell.
  assert.equal((live.match(/, fetchGoalNotifications\(\)\]\)/g) ?? []).length, 2, 'the list and the unread count must both read the goal rows');
});

test('a goal push and a goal row open the goal; the owner reminder opens the editor', () => {
  assert.deepEqual(destinationFor({ kind: 'squad_goal_met', squadId: 's1' }), { pathname: '/squad/[id]/goal', params: { id: 's1' } });
  assert.deepEqual(destinationFor({ kind: 'squad_goal_closed', squadId: 's1' }), { pathname: '/squad/[id]/goal', params: { id: 's1' } });
  assert.deepEqual(destinationFor({ kind: 'squad_goal_closing', squadId: 's1' }), { pathname: '/squad/[id]', params: { id: 's1', editGoal: 'edit' } });
  assert.equal(destinationFor({ kind: 'squad_goal_closed' }), '/inbox');
});

test("the server's close is read tolerantly — never through SQUAD_COLS, which feeds the whole Squads tab", () => {
  const live = read('src/data/squad-live.ts');
  const cols = /const SQUAD_COLS = '([^']+)'/.exec(live)[1];
  assert.ok(!cols.includes('goal_closed_at') && !cols.includes('goal_outcome'), 'an unapplied 0200 would fail every squad select');
  assert.match(live, /select\('goal_closed_at, goal_outcome'\)/);
});

test('the S-2 card has three states and the owner actions; a member gets a sentence', () => {
  const s2 = read('src/app/squad/[id].tsx');
  assert.match(s2, /GOAL_SECTION_LABEL: Record<GoalPhase, string> = \{ live: 'Current Goal', met: 'Goal Complete', closed: 'Last Goal' \}/);
  assert.match(s2, /openGoalEditor\(goalPhase === 'met' \? 'new' : 'again'\)/);
  assert.match(s2, /openGoalEditor\(goalPhase === 'met' \? 'raise' : 'new'\)/);
  assert.match(s2, /The owner sets the next goal\./);
  // No pencil on a finished goal.
  assert.match(s2, /squad\.isOwner && goalPhase === 'live' \? \(\s*<Pressable onPress=\{\(\) => openGoalEditor\('edit'\)\}/);
});

test('a post the squad wrote is headed by the squad, not "Athlete"', () => {
  const s2 = read('src/app/squad/[id].tsx');
  assert.match(s2, /authorName=\{squadVoice \? squadName : post\.authorName\}/);
  assert.match(s2, /onAuthor=\{p\.authorId \?/);
  assert.match(read('src/data/squad-feed-live.ts'), /authorId: string \| null;/);
});
