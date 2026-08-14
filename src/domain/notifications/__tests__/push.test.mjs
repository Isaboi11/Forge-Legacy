import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { destinationFor } from '../destination.ts';
import { NOTIF_DEFAULTS, PUSH_KIND_PREF } from '../../settings/notifications.ts';

/**
 * The client and the sender have to agree, and nothing at runtime would report it if they stopped.
 *
 * `notif_prefs` is written by the P-5 screen using `NOTIF_DEFAULTS`, and read by `push_enqueue_for` using
 * `push_pref_default()`. A key present in one and not the other, or a default that differs between them,
 * means the screen shows a state the server does not act on — silently, in the direction of either
 * sending what the athlete switched off or withholding what they switched on.
 *
 * So this parses the migration and compares it to the TypeScript. It is the only place the two meet.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

/*
 * ⚠ EVERY ASSERTION MUST PARSE THE NEWEST MIGRATION THAT DEFINES THE FUNCTION IT IS ABOUT, not at 0120.
 *
 * This file was pinned to 0120 and every assertion below parsed 0120 and only 0120. The moment 0121
 * redefined `push_pref_key`, the deep-equality against `PUSH_KIND_PREF` was comparing the client to a
 * function body the database no longer runs — it would have gone red for the right reason and been
 * "fixed" by editing the client to match a stale file. Repointing it is part of adding a branch.
 *
 * ⚠ AND AS OF 0159 THERE IS NO SINGLE "NEWEST" ANY MORE, which is why `fnBody` now takes its source.
 * 0159 adds a notification NOBODY CAUSES — a scheduled briefing — so it restates the two preference
 * functions and deliberately does not touch `notification_events_for`, which it is not a branch of. The
 * union's newest body is therefore still 0153's while the preference map's is 0159's, and a single `SQL`
 * constant could only have been right about one of them. Read each from the file that owns it:
 *
 *   · `SQL`       0153 — the union, `push_enqueue_for`, the squad-training triggers
 *   · `SQL_PREFS` 0159 — `push_pref_key`, `push_pref_default`
 *   · `SQL_BASE`  0120 — the invariants that live ONLY there: the revokes, the outbox unique index, and
 *                        the thin `notification_events()` wrapper, none of which later files restate.
 */
const SQL_BASE = readFileSync(resolve(ROOT, 'supabase/migrations/0120_push_notifications.sql'), 'utf8');
const SQL_0121 = readFileSync(resolve(ROOT, 'supabase/migrations/0121_workout_join_requests.sql'), 'utf8');
const SQL_0122 = readFileSync(resolve(ROOT, 'supabase/migrations/0122_squad_feed_notifications.sql'), 'utf8');
const SQL_0127 = readFileSync(resolve(ROOT, 'supabase/migrations/0127_timed_set_readback.sql'), 'utf8');
/*
 * 0126 is still read for the ONE function it owns the newest copy of — `push_tg_squad_posts`, whose
 * null-safe fan-out is asserted below. 0135 rebuilt the union, the two preference functions,
 * `push_enqueue_for` and `push_drain`, and deliberately left the squad triggers alone.
 */
const SQL_0126 = readFileSync(resolve(ROOT, 'supabase/migrations/0126_squad_recap_notification.sql'), 'utf8');
const SQL_0134 = readFileSync(resolve(ROOT, 'supabase/migrations/0134_goal_contribution_workout.sql'), 'utf8');
/*
 * 0135 is still read for the one thing it now owns alone: `push_drain`'s payload, which 0153 had no
 * reason to touch. It is NO LONGER the newest union — see `SQL` below.
 */
const SQL_0135 = readFileSync(resolve(ROOT, 'supabase/migrations/0135_post_reply_notifications.sql'), 'utf8');
// 0153 is the newest definition of the union, `push_enqueue_for` and the squad-training triggers.
const SQL = readFileSync(resolve(ROOT, 'supabase/migrations/0153_squad_training_notifications.sql'), 'utf8');
// 0159 is the newest definition of the two preference functions — see the warning above.
const SQL_PREFS = readFileSync(resolve(ROOT, 'supabase/migrations/0159_training_briefing.sql'), 'utf8');

/** Every migration paired with the bundle that gets pasted into the dashboard. */
const BUNDLES = [
  ['0120_push_notifications', 'pending-0120', SQL_BASE],
  ['0121_workout_join_requests', 'pending-0121', SQL_0121],
  ['0122_squad_feed_notifications', 'pending-0122', SQL_0122],
  ['0126_squad_recap_notification', 'pending-0126', SQL_0126],
  /* 0127 defines none of the functions parsed below, but it belongs to the same release and the
     run-twice guard at the bottom is a property every migration in this set has to hold. */
  ['0127_timed_set_readback', 'pending-0127', SQL_0127],
  /* 0134 and 0135 ship together in one bundle: 0135 is the reason to open the SQL editor and 0134 is a
     one-function fix that would otherwise wait for a paste of its own. */
  ['0134_goal_contribution_workout', 'pending-0134-0135', SQL_0134],
  ['0135_post_reply_notifications', 'pending-0134-0135', SQL_0135],
  ['0153_squad_training_notifications', 'pending-0153', SQL],
  ['0159_training_briefing', 'pending-0159', SQL_PREFS],
];

/**
 * The migration is the record; the bundle is what actually gets pasted into the dashboard. If they
 * drift, the file everyone reads and the SQL the database ran are different — which is the same class of
 * fault as a function rebuilt from an older copy, and just as quiet.
 */
test('every paste-ready bundle carries its migration verbatim', () => {
  for (const [migration, bundle, body] of BUNDLES) {
    const text = readFileSync(resolve(ROOT, 'supabase/apply/' + bundle + '.sql'), 'utf8');
    assert.ok(
      text.includes(body),
      'supabase/apply/' + bundle + '.sql no longer contains ' + migration + '.sql byte-for-byte — regenerate it',
    );
  }
});

/**
 * The body of one SQL function, so a `when … then …` scan cannot stray into the next one — with SQL
 * COMMENTS REMOVED.
 *
 * ⚠ THE STRIPPING IS NOT TIDINESS. Every assertion below matches source text, so a branch that is
 * commented out still reads as present: `/* … *\/` around branch 14 and the sixteen-branch check stayed
 * green, which was found by mutation-testing this file rather than by anything failing. That is exactly
 * the fault mode this test exists for — 0088, 0092 and 0106 each shipped a union missing a branch — and
 * the guard could not see the most literal form of it.
 *
 * Only `--` to end-of-line and `/* … *\/` blocks. Neither delimiter appears inside a string literal in
 * any body parsed here (checked: the only hyphens are in route paths like `/squad-post/`, and there is
 * no `/*` in any of them), so the naive strip is safe and stays readable.
 */
function fnBody(name, src = SQL) {
  const start = src.indexOf(`function public.${name}(`);
  assert.notEqual(start, -1, `${name} is missing from the migration`);
  const open = src.indexOf('as $$', start);
  const close = src.indexOf('$$;', open);
  assert.ok(open !== -1 && close !== -1, `${name} has no readable body`);
  return src.slice(open, close)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, '');
}

/**
 * ONE branch of the union — from its own `select` to the next `union all`, and never past it.
 *
 * The tests below used to take a fixed slice (`at + 600`, `at + 1400`) and guess at the length. That was
 * wrong in both directions and quietly: too short and a real predicate at the bottom of a long branch is
 * invisible; too long — which is what stripping the comments made every one of them — and the slice runs
 * into the NEXT branch, so a guard on branch 15 passes because branch 16 still has the line. Mutation
 * testing caught exactly that: deleting the leader's gate from branch 15 kept every assertion green.
 */
function branchOf(body, kind) {
  const at = body.indexOf(`'${kind}'::text`);
  assert.notEqual(at, -1, `${kind} branch is missing`);
  const next = body.indexOf('union all', at);
  return body.slice(at, next === -1 ? body.length : next);
}

function pairs(body, valuePattern) {
  const out = {};
  const re = new RegExp(`when\\s+'([a-z_]+)'\\s+then\\s+${valuePattern}`, 'g');
  let m;
  while ((m = re.exec(body)) !== null) out[m[1]] = m[2];
  return out;
}

// ── the two sides agree ───────────────────────────────────────────────────────

test('the SQL kind→preference map is the one the client believes in', () => {
  const sql = pairs(fnBody('push_pref_key', SQL_PREFS), `'([a-z_]+)'`);
  assert.deepEqual(sql, PUSH_KIND_PREF, 'push_pref_key() and PUSH_KIND_PREF must be the same map');
});

/**
 * ⚠ 0159 RESTATED BOTH PREFERENCE FUNCTIONS, so it had to carry every key 0153 already had.
 *
 * A migration that adds a key by rebuilding these from an older copy silently reverts every other one —
 * the failure 0088, 0092 and 0106 each shipped, and the reason `push_pref_key` is restated whole rather
 * than patched. `squad_training` is the canary: it is the only default that breaks the ambient-is-off
 * habit, so a rebuild from a pre-0153 body flips it to false and the squad training alerts go quiet with
 * every toggle on screen still reading ON.
 */
test('the newest preference bodies did not drop a key an older migration added', () => {
  const keys = fnBody('push_pref_key', SQL_PREFS);
  for (const kind of ['squad_training_started', 'squad_training_finished', 'post_comment', 'squad_recap']) {
    assert.ok(keys.includes(`'${kind}'`), `0159's push_pref_key lost '${kind}' — it was rebuilt from a stale copy`);
  }
  const defaults = pairs(fnBody('push_pref_default', SQL_PREFS), `(true|false)`);
  assert.equal(defaults.squad_training, 'true', "0153's squad_training default did not survive 0159's restatement");
});

test('every default in the SQL matches the toggle the athlete actually sees', () => {
  const sql = pairs(fnBody('push_pref_default', SQL_PREFS), `(true|false)`);
  assert.ok(Object.keys(sql).length > 0, 'no defaults parsed — the regex has drifted from the SQL');

  for (const [key, value] of Object.entries(sql)) {
    assert.ok(key in NOTIF_DEFAULTS, `push_pref_default() answers for '${key}', which no toggle offers`);
    assert.equal(
      value === 'true',
      NOTIF_DEFAULTS[key],
      `'${key}' defaults to ${value} on the server and ${NOTIF_DEFAULTS[key]} on the screen`,
    );
  }

  // Every kind the sender can push must have a default, or it silently falls to the catch-all `false`
  // and a locked-ON preference like Friend Requests would never send for a fresh account.
  for (const prefKey of new Set(Object.values(PUSH_KIND_PREF))) {
    assert.ok(prefKey in sql, `'${prefKey}' is pushed but has no explicit default in push_pref_default()`);
  }
});

// ── the union keeps its branches ──────────────────────────────────────────────

/**
 * Three times now a migration has rebuilt a function from an older copy and silently deleted a feature:
 * 0088 and 0092 dropped both friend branches, 0106 dropped program graduation. Each compiled cleanly and
 * each was found by a person, not a test. This is that test.
 */
test('notification_events_for still has all sixteen branches', () => {
  const body = fnBody('notification_events_for');
  const kinds = [...body.matchAll(/select\s+'([a-z_]+)'::text/g)].map((m) => m[1]);
  // Branch 3 is built from the row's status rather than a literal, so it is matched separately.
  const hasRequestStatus = /\('request_'\s*\|\|\s*q\.status\)::text/.test(body);

  assert.deepEqual(
    kinds,
    [
      'join_request',
      'member_joined',
      'friend_request',
      'friend_accepted',
      'challenge_invite',
      'workout_invite',
      'program_shared',
      'workout_join_request',
      'squad_post',
      'squad_checkin',
      // Branch 12, added 0126 — the weekly review, which has no author and was therefore invisible to
      // branch 10's `author_id <> p_user` for four migrations.
      'squad_recap',
      /* Branches 13 and 14, added 0135. The first notifications in this union that are about a REPLY
         rather than an arrival — for twelve branches the app announced that you posted and never that
         anybody answered. Unlike 10/11/12 these do not fan out: one comment notifies one person. */
      'post_comment',
      'post_reaction',
      /* Branches 15 and 16, added 0153. The first branches whose subject is a fact about somebody's
         body rather than a row they wrote — `profiles.training_since` had been written on every
         session start since 0086 with nothing reading it, and `public.workouts` had never carried a
         trigger of any kind. */
      'squad_training_started',
      'squad_training_finished',
    ],
    'a branch has been added or lost — if this is intentional, update the list and say so in the migration',
  );
  assert.ok(hasRequestStatus, 'the request_approved/declined branch is gone');
});

/**
 * ⚠ `squad_post` AND `squad_recap` PARTITION ONE TABLE, and the partition has to stay total and disjoint.
 *
 * Both read `squad_posts`. Branch 10 takes the authored rows, branch 12 the authorless weekly summary.
 * Drop `author_id is not null` from branch 10 and nothing breaks visibly — `x <> NULL` is NULL, so the
 * recap simply stays excluded and the bug this migration exists to fix comes back silently. Drop the
 * `author_id is null` from branch 12 and every ordinary post fires twice, once worded as a review.
 */
test('an authored post and the weekly review cannot be confused for each other', () => {
  const body = fnBody('notification_events_for');
  assert.match(body, /'squad_post'::text[\s\S]*?sp\.author_id is not null/, 'branch 10 must exclude the authorless recap');
  assert.match(body, /'squad_recap'::text[\s\S]*?sp\.type = 'weekly'[\s\S]*?sp\.author_id is null/, 'branch 12 must take only the authorless weekly row');
});

/**
 * The push trigger has to be NULL-SAFE, which is the other half of the same bug.
 *
 * `m.user_id <> new.author_id` selected no members at all when the recap arrived with a null author, so
 * `push_enqueue_for` was never called and branch 12 would have had nothing to send.
 */
test('the squad_posts trigger fans out an authorless insert', () => {
  // Read from 0126, which still owns the newest copy of this trigger — 0135 rebuilt the union and the
  // preference functions and left the squad triggers exactly where they were.
  const body = SQL_0126.slice(SQL_0126.indexOf('function public.push_tg_squad_posts'));
  assert.match(body, /m\.user_id is distinct from new\.author_id/, 'the trigger must use a null-safe comparison');
});

/**
 * A reply notification goes to the POST AUTHOR, and never to the person who wrote it.
 *
 * SOC-D11 locks "to the post author". Two ways this could go wrong silently: drop `sp.author_id =
 * p_user` and every comment on every post in the database notifies everybody; drop the self-exclusion
 * and the athlete is notified about their own comment on their own post, every time they reply to
 * somebody. Neither would throw, and both would look like "notifications are noisy" rather than a bug.
 *
 * `is distinct from` rather than `<>`, for the same null-safety reason branch 10 needed it.
 */
test('a reply notifies the post author, and never the replier', () => {
  const body = fnBody('notification_events_for');
  assert.match(body, /'post_comment'::text[\s\S]*?sp\.author_id = p_user[\s\S]*?c\.author_id is distinct from p_user/);
  assert.match(body, /'post_reaction'::text[\s\S]*?sp\.author_id = p_user[\s\S]*?r\.user_id is distinct from p_user/);
});

/**
 * Both reply branches are WINDOWED, like every fan-out branch before them.
 *
 * Comments and reactions are append-only and unbounded. Without the predicate `/inbox` slowly becomes a
 * second copy of the feed, and `push_enqueue_for` re-scans an athlete's whole posting history on every
 * trigger — getting slower the more they post, which is exactly backwards.
 */
test('the reply branches cannot grow without bound', () => {
  const body = fnBody('notification_events_for');
  assert.match(body, /'post_comment'::text[\s\S]*?c\.created_at > now\(\) - interval '14 days'/);
  assert.match(body, /'post_reaction'::text[\s\S]*?r\.created_at > now\(\) - interval '14 days'/);
});

/**
 * A reply on a FRIENDS post must not route into a squad.
 *
 * `squad_id` is non-null on a `BOTH` post as well as a `SQUAD` one, so branching on its presence would
 * be right by accident half the time and would send a friend to a squad page they may not be a member
 * of. The audience is the only thing that answers which feed holds the post — asserted on both sides,
 * because the push and the inbox row have to land in the same place.
 */
test('a reply opens the feed that actually holds the post', () => {
  assert.equal(destinationFor({ kind: 'post_comment', postId: 'p1', postAudience: 'FRIENDS', squadId: 's1' }), '/friends');
  assert.equal(destinationFor({ kind: 'post_reaction', postId: 'p1', postAudience: 'BOTH', squadId: 's1' }).pathname, '/squad-post/[id]');
  assert.deepEqual(destinationFor({ kind: 'post_comment', postId: 'p1', postAudience: 'SQUAD', squadId: 's1' }), {
    pathname: '/squad-post/[id]',
    params: { id: 'p1' },
  });
  // No post id and no audience is not a squad page — it is the inbox, per this module's standing rule
  // that a missing id never becomes a route with an empty segment.
  assert.equal(destinationFor({ kind: 'post_comment' }), '/inbox');

  // And the SQL sender has to agree with all of the above.
  const enqueue = SQL.slice(SQL.indexOf('function public.push_enqueue_for'));
  assert.match(enqueue, /'post_comment'\s+then case when po\.audience = 'FRIENDS' then '\/friends'/);
  assert.match(enqueue, /'post_reaction'\s+then case when po\.audience = 'FRIENDS' then '\/friends'/);
  // `push_drain`'s payload is still 0135's — 0153 rebuilt the union and the sender and had no reason to
  // touch the transport, so this one assertion stays pointed at the migration that owns it.
  assert.match(SQL_0135, /'postAudience', \(select sp\.audience from public\.squad_posts sp where sp\.id = r\.post_id\)/, 'push_drain must send the audience or a tapped push cannot route');
});

/**
 * Branch 7 has to say `kind = 'INVITE'`.
 *
 * 0121 put a second shape in `workout_invites` — a request to JOIN a session, rather than an invitation
 * to start one. Without the predicate, every join request also matches the invitation branch: two rows
 * in the inbox for one ask, the wrong wording on both, and a push telling the host somebody "wants to
 * train with you" when they are already training.
 */
test('an invitation and a join request cannot be confused for each other', () => {
  const body = fnBody('notification_events_for');
  assert.match(body, /'workout_invite'::text[\s\S]*?i\.kind = 'INVITE'/, "branch 7 must narrow to kind = 'INVITE'");
  assert.match(body, /'workout_join_request'::text[\s\S]*?i\.kind = 'JOIN_REQUEST'/);
});

/**
 * A join request must not outlive the workout it is about.
 *
 * It is the only branch whose subject is a LIVE fact, and 0092's rule that declining deletes rather than
 * tombstones means nothing else would ever clear an unanswered one. The presence ceiling is what makes
 * "they stopped training" and "the ask is gone" the same event.
 */
test('a join request expires with the host presence it is about', () => {
  const body = fnBody('notification_events_for');
  assert.match(body, /'workout_join_request'::text[\s\S]*?h\.training_since > now\(\) - interval '4 hours'/);
});

/**
 * ⚠ THE WINDOW ON THE FAN-OUT BRANCHES IS LOAD-BEARING, not tidiness.
 *
 * `squad_post` and `squad_checkin` are the first branches where ONE row becomes one event per squad
 * member, over an append-only table. Unwindowed they would (1) fill all fifty inbox slots from one
 * chatty squad, (2) make the unread count report a number nobody reads, and (3) make `push_enqueue_for`
 * re-scan a squad's entire history once per member, inside the insert's own transaction.
 */
test('both fan-out branches are bounded in time', () => {
  const body = fnBody('notification_events_for');
  for (const kind of ['squad_post', 'squad_checkin', 'squad_recap']) {
    assert.match(branchOf(body, kind), /created_at > now\(\) - interval '14 days'/, kind + ' must stay windowed');
  }
});

/**
 * ⚠ EVERY MIGRATION HERE MUST SURVIVE BEING RUN TWICE.
 *
 * There is no Supabase CLI and no service key in this project: the dashboard is the whole deployment
 * mechanism, and the only recovery from a run that stops part-way is to paste the file again from the
 * top. 0120 shipped with a bare `create function public.notification_events_for(...)` — no matching
 * drop — so the second run raised **42723: function already exists with same argument types** and the
 * file could not be resumed at all. Every other statement in all four was already guarded; that one was
 * the single exception, and it was found by the PO hitting it rather than by anything here.
 *
 * This asserts the property directly, for every migration in the set: a bare CREATE of a thing that
 * can already exist has to be preceded by a DROP or carry its own IF NOT EXISTS.
 */
test('every migration can be run twice — nothing creates without a guard', () => {
  for (const [name, , body] of BUNDLES) {
    // Functions: `create function` (no OR REPLACE) needs a matching drop earlier in the file.
    for (const m of body.matchAll(/^create function public\.(\w+)\(/gm)) {
      const fn = m[1];
      const dropAt = body.indexOf(`drop function if exists public.${fn}(`);
      assert.ok(dropAt !== -1 && dropAt < m.index, `${name}: create function ${fn} has no preceding drop — a re-run raises 42723`);
    }
    // Triggers and policies: same rule, and both are dropped by name.
    for (const [re, kind] of [
      [/^create trigger (\w+)/gm, 'trigger'],
      [/^create policy (\w+)/gm, 'policy'],
    ]) {
      for (const m of body.matchAll(re)) {
        const dropAt = body.indexOf(`drop ${kind} if exists ${m[1]} `);
        assert.ok(dropAt !== -1 && dropAt < m.index, `${name}: create ${kind} ${m[1]} has no preceding drop`);
      }
    }
    // Tables and indexes carry their own guard.
    for (const m of body.matchAll(/^create (?:unique )?(table|index) (?!if not exists)(\w+)/gm)) {
      assert.fail(`${name}: create ${m[1]} ${m[2]} is missing IF NOT EXISTS`);
    }
    // A cron job cannot be scheduled twice under one name.
    for (const m of body.matchAll(/cron\.schedule\('([\w-]+)'/g)) {
      assert.ok(body.indexOf(`cron.unschedule('${m[1]}')`) < m.index, `${name}: ${m[1]} is scheduled without being unscheduled first`);
    }
  }
});

test('the union is parameterised, so the sender and the viewer read one definition', () => {
  assert.match(
    SQL_BASE,
    /create function public\.notification_events\(\)[\s\S]*?select \* from public\.notification_events_for\(auth\.uid\(\)\)/,
    'notification_events() must stay a thin wrapper — the body belongs to notification_events_for',
  );
  // 42P13: a returns-table function cannot change shape under `create or replace`.
  assert.ok(
    SQL_BASE.indexOf('drop function if exists public.notification_events();') <
      SQL_BASE.indexOf('create function public.notification_events_for('),
    'the old function must be dropped before the rebuild',
  );
});

/**
 * ⚠ THE REVOKE MUST SURVIVE EVERY REBUILD.
 *
 * 0120 revokes EXECUTE on `notification_events_for` from PUBLIC because it is SECURITY DEFINER over any
 * user id — it answers for whatever uuid you hand it. `CREATE OR REPLACE` preserves privileges; `DROP` +
 * `CREATE` resets them, restoring the default PUBLIC grant. A rebuild that dropped and forgot the revoke
 * would silently re-open the exact escalation it exists to close, while every other test here passed.
 *
 * ⚠ THIS TEST USED TO SAY "NEVER DROP", WHICH WAS THE RIGHT RULE FOR THE WRONG REASON. It is not the
 * drop that is dangerous, it is the drop WITHOUT the revoke — and 0135 had to drop, because adding
 * `post_id` changes the OUT columns and 42P13 forbids `create or replace` from doing that. A blanket ban
 * would have forced the column in through some other door (overloading `share_id` was the tempting one)
 * to satisfy a test rather than a property. So the rule is now stated as what it actually protects.
 */
test('a rebuild of the union never loses its revoke', () => {
  /* Applies only to migrations that touch the union at all: 0127 and 0134 are in this set for the
     run-twice guard and deliberately do not redefine it, and demanding a rebuild they have no reason to
     make would push a needless copy of a fourteen-branch body into an unrelated file — the exact
     pressure that produced 0088, 0092 and 0106. */
  for (const [name, , body] of BUNDLES.slice(1)) {
    if (!body.includes('function public.notification_events_for(')) continue;

    const drops = /drop function if exists public\.notification_events_for/.test(body);
    if (drops) {
      assert.match(
        body,
        /revoke execute on function public\.notification_events_for\(uuid\) from public;/,
        name + " drops notification_events_for without re-issuing 0120's revoke from PUBLIC",
      );
      // Order matters as much as presence: revoking and THEN dropping leaves it open.
      assert.ok(
        body.indexOf('create function public.notification_events_for(') <
          body.indexOf('revoke execute on function public.notification_events_for(uuid) from public;'),
        name + ' re-revokes before it rebuilds, which leaves the new function granted to PUBLIC',
      );
    } else {
      assert.match(body, /create or replace function public\.notification_events_for\(p_user uuid\)/, name + ' must rebuild in place');
    }
  }
});

/**
 * The wrapper stays granted, and the union stays un-granted.
 *
 * `notification_events()` is what the client calls and takes no argument — it can only ever answer for
 * `auth.uid()`. `notification_events_for(uuid)` answers for anyone, and is deliberately reachable only
 * from the two SECURITY DEFINER functions that call it. A rebuild that granted the parameterised one to
 * `authenticated` out of symmetry would hand every athlete everybody else's inbox.
 */
test('the parameterised union is never granted to authenticated', () => {
  for (const [name, , body] of BUNDLES) {
    assert.doesNotMatch(
      body,
      /grant execute on function public\.notification_events_for\(uuid\) to authenticated/,
      name + ' grants the parameterised union to authenticated — it answers for ANY user id',
    );
  }
  /*
   * ⚠ STATED AS A PROPERTY OF THE MIGRATIONS THAT DROP THE WRAPPER, not of "the newest file".
   *
   * This used to assert the grant against whichever migration `SQL` pointed at, which was right only for
   * as long as every union change happened to drop and rebuild `notification_events()`. 0153 rebuilds the
   * union IN PLACE — the OUT columns did not change, so 42P13 does not apply and `create or replace`
   * preserves privileges — and the old form would have gone red demanding a grant statement that would
   * have been pure noise in a file that never revoked anything. The rule is: whoever drops it, re-grants
   * it.
   */
  for (const [name, , body] of BUNDLES) {
    if (!/drop function if exists public\.notification_events\(\);/.test(body)) continue;
    assert.match(
      body,
      /grant execute on function public\.notification_events\(\) to authenticated;/,
      name + ' drops the wrapper without re-granting it — the client would lose its own inbox',
    );
  }
});

/**
 * 0153 — THE THREE GATES, and each of them is somebody's decision that the branch must not skip.
 *
 * Every one of these fails silently and looks like "notifications are quiet": drop `s.training_alerts`
 * and a squad announces sessions its leader never opted into; drop `me.notify_start` / `me.notify_finish`
 * and every member of that squad is notified whether or not they asked; drop `vis_clears` and an athlete
 * who set their training to private is announced to their squad anyway — by a preference belonging to
 * somebody else, which is the one failure here that cannot be undone by turning a switch off.
 */
test('a training alert needs the leader, the recipient AND the actor to allow it', () => {
  const body = fnBody('notification_events_for');

  for (const [kind, own] of [
    ['squad_training_started', 'me\\.notify_start'],
    ['squad_training_finished', 'me\\.notify_finish'],
  ]) {
    const branch = branchOf(body, kind);
    assert.match(branch, /s\.training_alerts/, kind + ": the squad leader's gate is gone");
    assert.match(branch, new RegExp('and ' + own), kind + ": the recipient's own toggle is gone");
    assert.match(
      branch,
      /vis_clears\(coalesce\(p\.visibility->>'training', 'squads'\), 'squad'\)/,
      kind + ": the ACTOR's own training audience is gone — this one publishes something they hid",
    );
    assert.match(branch, /other\.user_id <> p_user/, kind + ': the athlete would be notified about themselves');
  }
});

/**
 * ⚠ AND THEY ARE WINDOWED TIGHTER THAN EVERYTHING ABOVE THEM, deliberately.
 *
 * A start expires with the session: 4 hours is the presence ceiling `training_now()` and branch 9 both
 * use, and the row is an invitation to join — it is worthless the moment they finish. A finish gets 24
 * hours rather than the 14 days every written branch uses, because this is the widest fan-out in the
 * union: a 50-member squad training four times a week would put ~200 rows a fortnight in every member's
 * inbox and bury everything else in it.
 */
test('the training branches expire faster than the written ones', () => {
  const body = fnBody('notification_events_for');
  const started = branchOf(body, 'squad_training_started');
  const finished = branchOf(body, 'squad_training_finished');
  assert.match(started, /training_since > now\(\) - interval '4 hours'/);
  assert.match(finished, /saved_at > now\(\) - interval '24 hours'/);
  // A workout row exists before it is finished; without this the branch announces sessions in progress.
  assert.match(finished, /w\.state = 'saved'/, 'branch 16 must take only saved workouts');
});

/**
 * The two triggers must not be able to take a workout down with them.
 *
 * `push_workout_saved` is the FIRST trigger ever placed on `public.workouts`, and it fires inside
 * `save_workout` — the transaction that commits the session the athlete just trained. An unhandled raise
 * anywhere in the fan-out (a deleted squad, a null id, a permission drift three functions away) would
 * roll that back. This schema has already lost Finish Workout once to exactly that shape, with every
 * other gate green, so the exception block is the load-bearing line rather than defensive habit.
 */
test('a failed notification can never roll back the workout that caused it', () => {
  for (const fn of ['push_tg_training_started', 'push_tg_training_finished']) {
    const at = SQL.indexOf('function public.' + fn);
    assert.notEqual(at, -1, fn + ' is missing');
    const body = SQL.slice(at, SQL.indexOf('$$;', at));
    assert.match(body, /exception when others then/, fn + ' can raise into its caller');
    assert.match(body, /push_enqueue_for/, fn + ' does not actually enqueue anything');
  }
  // And the workouts trigger only fires on a session that is actually finished.
  assert.match(SQL, /create trigger push_workout_saved[\s\S]*?when \(new\.state = 'saved' and new\.saved_at is not null\)/);
  // The profiles trigger is narrowed to the one column, because profiles is written on nearly every
  // launch — the timezone, the seen stamp, the avatar — and each of those would walk the athlete's squads.
  assert.match(SQL, /create trigger push_training_started\s+after update of training_since on public\.profiles/);
  assert.match(SQL, /when \(new\.training_since is not null and new\.training_since is distinct from old\.training_since\)/);
});

/**
 * A member sets their own toggles through an RPC, and `squad_members` never gains an UPDATE policy.
 *
 * RLS gates ROWS, not COLUMNS. `for update using (user_id = auth.uid())` is the obvious way to let a
 * member flip these two switches and it would also let them rewrite their own `role` to 'owner' and
 * their own `squad_id` to any squad in the database — joining a private squad by updating a row they
 * legitimately own, past every approval path 0050 and 0053 exist to enforce.
 */
test('the per-squad toggles are written by a definer function, never by a policy', () => {
  assert.match(SQL, /create or replace function public\.set_squad_notify\(p_squad uuid, p_start boolean, p_finish boolean\)/);
  assert.match(SQL, /security definer/);
  // Only the two columns, and only the caller's own row.
  const at = SQL.indexOf('function public.set_squad_notify');
  const fn = SQL.slice(at, SQL.indexOf('$$;', at));
  assert.match(fn, /update public\.squad_members\s+set notify_start\s+= coalesce\(p_start,\s+notify_start\),\s+notify_finish = coalesce\(p_finish, notify_finish\)/);
  assert.match(fn, /user_id\s+= auth\.uid\(\)/, 'it must scope to the caller');
  /*
   * The SET list alone, not the whole body — `where squad_id = p_squad` is the scoping predicate and
   * matching on it would have made this assertion fail for the reason it exists to allow.
   */
  const setList = fn.slice(fn.indexOf('set notify_start') + 4, fn.indexOf('where squad_id'));
  assert.deepEqual(
    [...setList.matchAll(/(\w+)\s*=\s*coalesce/g)].map((m) => m[1]).sort(),
    ['notify_finish', 'notify_start'],
    'set_squad_notify writes a column other than the two toggles — role and squad_id must stay out of reach',
  );

  for (const [name, , body] of BUNDLES) {
    assert.doesNotMatch(
      body,
      /create policy \w+ on public\.squad_members for update/,
      name + ' adds an UPDATE policy to squad_members — that grants the whole row, including role',
    );
  }
});

// ── a rejection is never pushed ───────────────────────────────────────────────

test('request_declined is delivered to the inbox and never to a lock screen', () => {
  assert.ok(!('request_declined' in PUSH_KIND_PREF), 'a decline must map to no preference at all');
  assert.equal(fnBody('push_pref_key', SQL_PREFS).includes('request_declined'), false);
  // It is still a real feed row with a real destination — silenced, not erased.
  assert.equal(destinationFor({ kind: 'request_declined' }), '/discover-squads');
});

// ── tap-through ───────────────────────────────────────────────────────────────

test('a tapped push lands where the inbox row lands', () => {
  assert.deepEqual(destinationFor({ kind: 'workout_invite', inviteId: 'i1' }), {
    pathname: '/workout-invite',
    params: { id: 'i1' },
  });
  assert.deepEqual(destinationFor({ kind: 'program_shared', shareId: 's1' }), {
    pathname: '/program-share/[id]',
    params: { id: 's1' },
  });
  assert.deepEqual(destinationFor({ kind: 'challenge_invite', challengeId: 'c1' }), {
    pathname: '/challenge/[id]',
    params: { id: 'c1' },
  });
  assert.deepEqual(destinationFor({ kind: 'join_request', squadId: 'q1' }), {
    pathname: '/squad-requests',
    params: { id: 'q1' },
  });
  // Both friend kinds answer on the asker's profile — one place holds the whole relationship.
  for (const kind of ['friend_request', 'friend_accepted']) {
    assert.deepEqual(destinationFor({ kind, actorId: 'a1' }), { pathname: '/athlete/[id]', params: { id: 'a1' } });
  }
  assert.deepEqual(destinationFor({ kind: 'member_joined', squadId: 'q1' }), {
    pathname: '/squad/[id]',
    params: { id: 'q1' },
  });
  // A join request reuses the invite screen, which branches on `kind` internally (0121).
  assert.deepEqual(destinationFor({ kind: 'workout_join_request', inviteId: 'i2' }), {
    pathname: '/workout-invite',
    params: { id: 'i2' },
  });
  // The two fan-out kinds fall to the default arm — there is no per-post or per-check-in route, and a
  // check-in is watched in the squad screen's story viewer.
  for (const kind of ['squad_post', 'squad_checkin']) {
    assert.deepEqual(destinationFor({ kind, squadId: 'q1' }), { pathname: '/squad/[id]', params: { id: 'q1' } });
  }

  /*
   * 0153. The two training kinds must NOT fall to that default arm, and the way this breaks is quiet:
   * both carry a `squadId` (the push needs it to name the squad), so a missing case would route to the
   * squad page, look deliberate, and lose the only action either notification has.
   *
   * A start is joinable and the window is minutes long, so it opens the ASK side of Train Together. A
   * finish has nothing to join and opens the athlete.
   */
  assert.deepEqual(destinationFor({ kind: 'squad_training_started', actorId: 'a1', squadId: 'q1' }), {
    pathname: '/workout-join',
    params: { athlete: 'a1' },
  });
  assert.deepEqual(destinationFor({ kind: 'squad_training_finished', actorId: 'a1', squadId: 'q1' }), {
    pathname: '/athlete/[id]',
    params: { id: 'a1' },
  });
  // No actor is the inbox, never a route with an empty segment.
  for (const kind of ['squad_training_started', 'squad_training_finished']) {
    assert.equal(destinationFor({ kind, squadId: 'q1' }), '/inbox');
  }

  // And the SQL sender has to land in the same two places.
  const enqueue = SQL.slice(SQL.indexOf('function public.push_enqueue_for'));
  assert.match(enqueue, /'squad_training_started'\s+then '\/workout-join\?athlete=' \|\| e\.actor_id::text/);
  assert.match(enqueue, /'squad_training_finished'\s+then '\/athlete\/' \|\| e\.actor_id::text/);
});

test('a notification missing the id it routes on falls back to the inbox, never a broken route', () => {
  assert.equal(destinationFor({ kind: 'workout_invite' }), '/inbox');
  assert.equal(destinationFor({ kind: 'friend_request', actorId: null }), '/inbox');
  assert.equal(destinationFor({ kind: 'member_joined', squadId: '' }), '/inbox');
  assert.equal(destinationFor({ kind: 'something_this_build_has_never_heard_of' }), '/inbox');
});

// ── the sender's own invariants ───────────────────────────────────────────────

test('nothing is enqueued before the athlete has a device and a baseline', () => {
  const body = fnBody('push_enqueue_for');
  assert.match(body, /if v_baseline is null then return 0; end if;/, 'a null baseline must stop the enqueue');
  assert.match(body, /e\.at > v_baseline/, 'only events after the baseline may be filed');
  assert.match(body, /push_tokens t\s+where t\.user_id = p_user and t\.disabled_at is null/);
  assert.match(body, /push_prefs_allows\(v_prefs, e\.kind\)/, 'the preference must gate the enqueue');
});

test('the outbox deduplicates, so a re-scan cannot double-send', () => {
  assert.match(SQL_BASE, /create unique index if not exists push_outbox_event_uk/);
  assert.match(SQL, /on conflict do nothing/);
});

/**
 * Parameterising the union removed the thing that made it safe. `notification_events()` could only ever
 * answer for `auth.uid()`; `notification_events_for(p_user)` is SECURITY DEFINER and answers for anyone
 * named. Postgres grants EXECUTE to PUBLIC on every new function, so without an explicit revoke any
 * signed-in athlete could read every friend request, squad invitation and competition belonging to
 * anybody else — by passing their id.
 *
 * Revoking from `authenticated` would not do it: that role never held a direct grant, so the function
 * would stay reachable through PUBLIC and the revoke would read as protection while granting none.
 */
test('the parameterised union and the sender internals are revoked from PUBLIC', () => {
  for (const fn of [
    'notification_events_for(uuid)',
    'push_enqueue_for(uuid)',
    'push_drain(int)',
    'push_reconcile(int)',
  ]) {
    const re = new RegExp(`revoke execute on function public\\.${fn.replace(/[()]/g, '\\$&')} from public;`);
    assert.match(SQL_BASE, re, `${fn} must be revoked from PUBLIC, not merely from a role`);
  }
  assert.doesNotMatch(
    SQL_BASE,
    /revoke execute on function public\.notification_events_for\(uuid\) from authenticated/,
    'revoking from `authenticated` leaves the PUBLIC grant in place',
  );
});
