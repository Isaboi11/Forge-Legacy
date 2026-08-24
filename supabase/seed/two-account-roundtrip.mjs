// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TWO-ACCOUNT ROUNDTRIP — every feature that cannot be proved by one person.
//
// Run: SB_EMAIL=… SB_PASS=… SB2_EMAIL=… SB2_PASS=… node supabase/seed/two-account-roundtrip.mjs
//
// ══ WHY THIS EXISTS ══
//
// Half of this product is a fact about a PAIR: a post someone else can see, a goal two people fill, a
// competition with a roster, an invitation that has to be accepted, a light that says somebody is in the
// gym right now. Every one of those has four directions — A does it / B sees it, B does it / A sees it —
// and a single device can only ever prove one of them. Every check below therefore reads BOTH sessions
// through their OWN JWT, because a row that exists is not a row the other athlete can see.
//
// ══ IT WRITES THROUGH THE ANON KEY, AS THE SIGNED-IN ATHLETE ══
//
// Same choice `reviewer-seed.mjs` made and for the same reason: everything goes through the RLS the app
// uses, so a pass here means the feature works for a real signed-in athlete, not for a service key.
// THERE IS NO SERVICE KEY IN THIS PROJECT AND THIS DOES NOT NEED ONE.
//
// ══ ⚠ IT WORKS IN ITS OWN SQUAD, NOT IN `Iron Circle` ══
//
// SB_EMAIL / SB2_EMAIL are the App Store review accounts. Iron Circle, its three posts and February
// Volume are what Apple opens, so nothing here touches them: the run creates its own squad, does all of
// its damage inside it, and deletes it at the end. What it CANNOT confine is the workout each account
// logs — a competition with no scores is not a competition — so teardown deletes those workouts by id
// and `--reseed` re-runs `reviewer-seed.mjs` to put the canonical history back.
//
// Flags:
//   --keep      leave everything standing (inspect it in the app, then re-run with --teardown-only)
//   --reseed    after teardown, re-run reviewer-seed.mjs to restore the demo account exactly
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const KEEP = process.argv.includes('--keep');
const RESEED = process.argv.includes('--reseed');

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

/*
 * Credentials come from the environment, exactly as every other script here takes them. As a
 * convenience they may instead sit in `.env.qa.local` — `.env*.local` is gitignored, so a password put
 * there cannot be committed by accident. Nothing in this file ever prints one.
 */
try {
  const extra = readFileSync(new URL('../../.env.qa.local', import.meta.url), 'utf8');
  for (const line of extra.split('\n')) {
    if (!line.includes('=') || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
} catch {
  // Not there — the environment is the normal path.
}

// ── Reporting ──────────────────────────────────────────────────────────────────────────────────
const results = [];
let phase = '';
const section = (t) => {
  phase = t;
  console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 78 - t.length))}`);
};
const ok = (label, detail = '') => {
  results.push({ phase, label, state: 'PASS' });
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
};
const bad = (label, detail = '') => {
  results.push({ phase, label, state: 'FAIL', detail });
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
};
const skip = (label, why) => {
  results.push({ phase, label, state: 'SKIP', detail: why });
  console.log(`  · ${label} — SKIPPED: ${why}`);
};
const note = (t) => console.log(`    ${t}`);
/** Assert, but never take the run down: one broken feature must not hide the state of the other twelve. */
const check = (cond, label, detail = '') => (cond ? ok(label, detail) : bad(label, detail));
const errText = (e) => (e ? `${e.code ? e.code + ' ' : ''}${e.message}` : '');

async function step(label, fn) {
  try {
    return await fn();
  } catch (e) {
    bad(label, e?.message ?? String(e));
    return null;
  }
}

// ── Accounts ───────────────────────────────────────────────────────────────────────────────────
function client() {
  return createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Sign in only. This script never signs up — it drives accounts that already exist. */
async function signIn(label, email, password) {
  if (!email || !password) throw new Error(`${label}: set its email and password in the environment before running`);
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label}: sign-in failed — ${error.message}`);
  return { label, sb, uid: data.user.id, email };
}

console.log('══════════════════════════════════════════════════════════════════════════════════');
console.log('  FORGE LEGACY — TWO-ACCOUNT ROUNDTRIP');
console.log('══════════════════════════════════════════════════════════════════════════════════');

section('Accounts');
if (!process.env.SB_EMAIL || !process.env.SB_PASS || !process.env.SB2_EMAIL || !process.env.SB2_PASS) {
  console.log('\n  ✗ No credentials. This script drives TWO real accounts and cannot invent either.\n');
  console.log('  Put them in `.env.qa.local` (gitignored) at the repo root:\n');
  console.log('    SB_EMAIL=…      SB_PASS=…       ← account A');
  console.log('    SB2_EMAIL=…     SB2_PASS=…      ← account B\n');
  console.log('  or pass them on the command line. Nothing here ever prints a password.\n');
  process.exit(2);
}
const A = await signIn('A', process.env.SB_EMAIL, process.env.SB_PASS);
const B = await signIn('B', process.env.SB2_EMAIL, process.env.SB2_PASS);
ok('both accounts signed in');

const profileOf = async (who) => {
  const { data } = await who.sb.from('profiles').select('name, handle, onboarded_at, visibility').eq('id', who.uid).maybeSingle();
  return data ?? {};
};
const pA = await profileOf(A);
const pB = await profileOf(B);
A.name = pA.name ?? 'A';
B.name = pB.name ?? 'B';
note(`A = ${A.name} (@${pA.handle}) · onboarded ${pA.onboarded_at ? 'yes' : 'NO'}`);
note(`B = ${B.name} (@${pB.handle}) · onboarded ${pB.onboarded_at ? 'yes' : 'NO'}`);
check(!!pA.onboarded_at && !!pB.onboarded_at, 'both accounts are past onboarding', 'a null onboarded_at sends the app into the first-run journey');

const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const RUN_START = new Date().toISOString();
const SQUAD_NAME = `QA Roundtrip ${stamp}`;

// Everything created, so teardown can find it again.
const made = { squadId: null, postIds: [], challengeIds: [], inviteIds: [], workoutIds: [] };
/** The latest `workouts.saved_at` this run produced, in SERVER time. See phase 9. */
let dbSavedAt = 0;

/*
 * ⚠ TWO THINGS `save_workout` DOES THAT DELETING THE WORKOUT DOES NOT UNDO.
 *
 * It bumps `chapters.workout_count` and it runs `evaluate_honors`. Neither has a foreign key to
 * `workouts`, deliberately — a record outlives the session that set it — so a run that logs two sessions
 * and then removes them leaves the active chapter claiming a session that is gone, and possibly an honor
 * the account had not earned before. Both are recorded here so teardown can put them back and, where it
 * cannot, say so out loud rather than leave a demo account quietly wrong.
 */
const baseline = {};
for (const who of [A, B]) {
  const ch = await who.sb.from('chapters').select('id, workout_count').eq('athlete_id', who.uid).eq('is_active', true).maybeSingle();
  const hon = await who.sb.from('honor_instances').select('id').eq('athlete_id', who.uid);
  baseline[who.label] = {
    chapterId: ch.data?.id ?? null,
    workoutCount: ch.data?.workout_count ?? null,
    honorIds: new Set((hon.data ?? []).map((h) => h.id)),
    honorErr: hon.error ? errText(hon.error) : null,
  };
  note(`${who.label} baseline · chapter ${ch.data?.workout_count ?? '—'} workouts · ${(hon.data ?? []).length} honors`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 1 · FRIENDSHIP — the graph everything else stands on
// ═══════════════════════════════════════════════════════════════════════════════════════════════
section('1 · Friendship (both directions)');
{
  const state = await A.sb.rpc('friendship_with', { p_athlete: B.uid });
  const current = typeof state.data === 'string' ? state.data : state.data?.state ?? state.data?.status ?? null;
  if (current === 'friends' || current === 'ACCEPTED' || current === 'accepted') {
    ok('A ↔ B already friends', String(current));
  } else {
    const req = await B.sb.rpc('request_friend', { p_athlete: A.uid });
    check(!req.error, 'B sends A a friend request', errText(req.error));
    // The ask must be visible to the person asked, not merely stored.
    const inbox = await A.sb.rpc('notification_feed', { p_limit: 50 });
    check(
      (inbox.data ?? []).some((r) => r.kind === 'friend_request' && r.actor_id === B.uid),
      'A is notified of the request',
      errText(inbox.error),
    );
    const acc = await A.sb.rpc('accept_friend_request', { p_athlete: B.uid });
    check(!acc.error, 'A accepts', errText(acc.error));
    const back = await B.sb.rpc('notification_feed', { p_limit: 50 });
    check(
      (back.data ?? []).some((r) => r.kind === 'friend_accepted' && r.actor_id === A.uid),
      'B is told it was accepted',
      errText(back.error),
    );
  }

  // Mutual means BOTH lists carry the other. One-sided is the bug this asserts against.
  const la = await A.sb.rpc('friend_list');
  const lb = await B.sb.rpc('friend_list');
  const has = (res, uid) => JSON.stringify(res.data ?? {}).includes(uid);
  check(has(la, B.uid), "B appears in A's friend list", errText(la.error));
  check(has(lb, A.uid), "A appears in B's friend list", errText(lb.error));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 2 · SQUAD — create, invite, join, leave, request, approve
// ═══════════════════════════════════════════════════════════════════════════════════════════════
section('2 · Squad membership loop');
{
  const { data, error } = await A.sb.rpc('create_squad', {
    p_name: SQUAD_NAME,
    p_description: 'Throwaway squad for the two-account roundtrip. Deleted at the end of the run.',
    p_privacy: 'private',
    p_crest: 'swords',
    p_motto: 'Prove it twice.',
    p_goal: null,
    p_category: null,
  });
  if (error) {
    bad('A creates a squad', errText(error));
  } else {
    const row = typeof data === 'string' ? JSON.parse(data) : data;
    made.squadId = row?.squad_id ?? null;
    check(!!made.squadId, 'A creates a squad', made.squadId ? SQUAD_NAME : 'create_squad returned no squad_id');
  }
}

const SQ = made.squadId;
if (!SQ) {
  bad('squad phases', 'no squad — every squad-scoped phase below is unreachable');
} else {
  // ── Invite code: the only path that can read it (0149 hid the column) ────────────────────────
  let code = null;
  {
    const info = await A.sb.rpc('squad_invite_info', { p_squad: SQ });
    code = info.data?.invite_code ?? null;
    check(!!code, 'A can read the invite code', errText(info.error));

    // The private squad's front door must NOT be readable off the table.
    const leak = await B.sb.from('squads').select('invite_code').eq('id', SQ).maybeSingle();
    check(!!leak.error || leak.data?.invite_code == null, 'the code is not selectable off `squads`', leak.error ? errText(leak.error) : 'column returned null');
  }

  // ── B joins by code ─────────────────────────────────────────────────────────────────────────
  if (code) {
    const join = await B.sb.rpc('join_squad_by_code', { p_code: code, p_accept: true });
    check(!join.error, 'B joins by code', errText(join.error));

    // Both sides must SEE the membership, not just the row exist.
    const asA = await A.sb.from('squad_members').select('user_id, role').eq('squad_id', SQ);
    const asB = await B.sb.from('squad_members').select('user_id, role').eq('squad_id', SQ);
    check((asA.data ?? []).length === 2, 'A sees 2 members', `${(asA.data ?? []).length}`);
    check((asB.data ?? []).length === 2, 'B sees 2 members', `${(asB.data ?? []).length}`);
    check((asA.data ?? []).find((m) => m.user_id === A.uid)?.role === 'owner', 'A is the owner');

    const nA = await A.sb.rpc('notification_feed', { p_limit: 50 });
    check(
      (nA.data ?? []).some((r) => r.kind === 'member_joined' && r.squad_id === SQ),
      'A is notified that someone joined',
      errText(nA.error),
    );
  }

  // ── Leave → request → approve: the Discover loop, driven from both ends ─────────────────────
  {
    const left = await B.sb.from('squad_members').delete().eq('squad_id', SQ).eq('user_id', B.uid);
    check(!left.error, 'B leaves the squad', errText(left.error));

    /*
     * ⚠ IT ANSWERS `{ok:false}` RATHER THAN RAISING, so `!error` is not a pass.
     *
     * The first version of this file checked only for an error, and a private squad's refusal read as a
     * successful request — three checks downstream then failed for a reason that was not their own.
     * `request_squad_join` refuses anything that is not `public` (0055): the queue exists for squads
     * Discover can reach, and a private squad's only door is its invite code.
     */
    const priv = await B.sb.rpc('request_squad_join', { p_squad: SQ, p_note: 'Should be refused.', p_accept: true });
    check(priv.data?.ok === false && priv.data?.reason === 'not_public', 'a private squad refuses a join request', JSON.stringify(priv.data));

    // The loop itself only exists for a public squad, so the squad is public for exactly this test.
    const pub = await A.sb.from('squads').update({ privacy: 'public', updated_at: new Date().toISOString() }).eq('id', SQ);
    check(!pub.error, 'A opens the squad to Discover', errText(pub.error));
    const disc = await B.sb.rpc('discover_squads');
    check((disc.data ?? []).some((s) => (s.id ?? s.squad_id) === SQ), 'B can find it in Discover', errText(disc.error) || `${(disc.data ?? []).length} listed`);

    const req = await B.sb.rpc('request_squad_join', { p_squad: SQ, p_note: 'Asking again, properly.', p_accept: true });
    check(req.data?.ok === true, 'B requests to join', errText(req.error) || JSON.stringify(req.data));

    const pending = await A.sb.rpc('squad_pending_requests', { p_squad: SQ });
    const rows = pending.data ?? [];
    check(rows.some((r) => (r.user_id ?? r.id ?? r.athlete_id) === B.uid), "the request is in A's queue", errText(pending.error) || `${rows.length} pending`);

    const nA = await A.sb.rpc('notification_feed', { p_limit: 50 });
    check((nA.data ?? []).some((r) => r.kind === 'join_request' && r.squad_id === SQ), 'A is notified of the request', errText(nA.error));

    const app = await A.sb.rpc('approve_squad_join_request', { p_squad: SQ, p_user: B.uid });
    check(!app.error, 'A approves', errText(app.error) || String(app.data ?? ''));

    const nB = await B.sb.rpc('notification_feed', { p_limit: 50 });
    check((nB.data ?? []).some((r) => r.kind === 'request_approved' && r.squad_id === SQ), 'B is told they were approved', errText(nB.error));

    const back = await B.sb.from('squad_members').select('user_id').eq('squad_id', SQ).eq('user_id', B.uid).maybeSingle();
    check(!!back.data, 'B is a member again', errText(back.error));

    const shut = await A.sb.from('squads').update({ privacy: 'private', updated_at: new Date().toISOString() }).eq('id', SQ);
    check(!shut.error, 'A closes it again', errText(shut.error));
  }

  /*
   * ── ⚠ CONSENT: can an owner approve a request nobody made? ───────────────────────────────────
   *
   * `approve_squad_join_request` (0052) checks that the caller owns the squad, that the target is not
   * already a member, and that the roster has room — and then INSERTS THE MEMBERSHIP. It never asks
   * whether a request exists. Read on its own that looks like tolerance for a double-tap; the question
   * this asks is whether an athlete can be put into a squad they never applied to, since squad
   * membership is what `visibility.training` defaults to trusting with Live Now.
   *
   * A SECOND squad, because the one above now holds an approved request row for B and could not answer
   * the question cleanly. Deleted immediately either way.
   */
  {
    const { data, error } = await A.sb.rpc('create_squad', {
      p_name: `QA Consent ${stamp}`,
      p_description: 'Consent probe. Deleted seconds after it is created.',
      p_privacy: 'private',
      p_crest: 'swords',
      p_motto: null,
      p_goal: null,
      p_category: null,
    });
    const row = typeof data === 'string' ? JSON.parse(data) : data;
    const sq2 = row?.squad_id ?? null;
    if (!sq2) {
      skip('an owner cannot add an athlete who never asked', errText(error) || 'probe squad not created');
    } else {
      const asked = await A.sb.from('squad_join_requests').select('user_id').eq('squad_id', sq2);
      const app = await A.sb.rpc('approve_squad_join_request', { p_squad: sq2, p_user: B.uid });
      const isMember = await B.sb.from('squad_members').select('user_id').eq('squad_id', sq2).eq('user_id', B.uid).maybeSingle();
      const added = !!isMember.data;
      check(
        !added,
        'an owner cannot add an athlete who never asked',
        `${(asked.data ?? []).length} requests existed · approve returned ${JSON.stringify(app.data)} · B ${added ? 'IS NOW A MEMBER' : 'is not a member'}`,
      );
      if (added) {
        // What that membership actually hands over, stated rather than assumed.
        const sees = await B.sb.from('squads').select('id, name').eq('id', sq2).maybeSingle();
        note(`B can now read the squad they never joined: ${sees.data?.name ?? '(not readable)'}`);
      }
      await A.sb.from('squads').delete().eq('id', sq2);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 3 · SQUAD POSTING — write, read, react, comment, and the two negative cases
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('3 · Squad posting');
  let postByA = null;
  let postByB = null;
  {
    const insert = async (who, row) => {
      const { data, error } = await who.sb
        .from('squad_posts')
        .insert({ squad_id: SQ, author_id: who.uid, ...row })
        .select('id')
        .single();
      if (error) return { id: null, error };
      made.postIds.push(data.id);
      return { id: data.id, error: null };
    };

    const a1 = await insert(A, { type: 'discussion', body: 'Roundtrip: A wrote this to the squad.', audience: 'SQUAD' });
    postByA = a1.id;
    check(!!postByA, 'A posts a discussion', errText(a1.error));

    const b1 = await insert(B, { type: 'pr', body: 'Roundtrip: B hit something.', pr_value: '225', pr_exercise: 'Back Squat', pr_label: 'Squad PR', audience: 'SQUAD' });
    postByB = b1.id;
    check(!!postByB, 'B posts a PR', errText(b1.error));

    // A post whose audience is BOTH is the only one that reaches the Friends feed (0074).
    const a2 = await insert(A, { type: 'discussion', body: 'Roundtrip: A wrote this to squad AND friends.', audience: 'BOTH' });
    check(!!a2.id, 'A posts to BOTH audiences', errText(a2.error));

    // ── The feed, read through each athlete's own session ──────────────────────────────────────
    const feedA = await A.sb.rpc('squad_feed', { p_squad: SQ, p_limit: 20, p_offset: 0 });
    const feedB = await B.sb.rpc('squad_feed', { p_squad: SQ, p_limit: 20, p_offset: 0 });
    const ids = (r) => (r.data ?? []).map((p) => p.id ?? p.post_id);
    check(ids(feedB).includes(postByA), "B sees A's post in the squad feed", errText(feedB.error));
    check(ids(feedA).includes(postByB), "A sees B's post in the squad feed", errText(feedA.error));

    // ── Friends feed: BOTH reaches it, SQUAD must not ──────────────────────────────────────────
    const ff = await B.sb.rpc('friends_feed', { p_limit: 40, p_before: null });
    const ffIds = (ff.data ?? []).map((p) => p.id ?? p.post_id);
    check(ffIds.includes(a2.id), "B's Friends feed carries A's BOTH post", errText(ff.error));
    check(!ffIds.includes(postByA), 'a SQUAD-only post stays out of the Friends feed');

    // ── Reactions. TWO systems, and both are real: the squad feed counts `respect_count` off a bare
    //    row in `squad_post_reactions`, the Friends feed sets a NAMED reaction through 0074's RPC.
    if (postByA) {
      const r = await B.sb.from('squad_post_reactions').insert({ post_id: postByA, user_id: B.uid });
      check(!r.error, "B reacts to A's squad post", errText(r.error));
      // `squad_post_one` returns a SETOF — the post is row 0, not the object.
      const one = await A.sb.rpc('squad_post_one', { p_post: postByA });
      const row = (one.data ?? [])[0] ?? {};
      check(Number(row.respect_count ?? 0) >= 1, 'A sees the count on their own post', errText(one.error) || `respect_count ${row.respect_count}`);
      check(!row.i_reacted, "and it does not claim A reacted to it themselves");
      const nA = await A.sb.rpc('notification_feed', { p_limit: 50 });
      check((nA.data ?? []).some((x) => x.kind === 'post_reaction' && x.actor_id === B.uid), 'A is notified of the reaction', errText(nA.error));
    }
    if (a2.id) {
      const r = await B.sb.rpc('set_post_reaction', { p_post: a2.id, p_reaction: 'respect' });
      check(!r.error && r.data === 'respect', "B leaves a named reaction on the Friends-feed post", errText(r.error) || String(r.data));
      const ff2 = await A.sb.rpc('friends_feed', { p_limit: 40, p_before: null });
      const mine = (ff2.data ?? []).find((p) => p.id === a2.id);
      check(Number(mine?.reaction_count ?? 0) >= 1, 'A sees it on their own Friends-feed post', `reaction_count ${mine?.reaction_count}`);
      check((mine?.reactors ?? []).some((x) => x.id === B.uid), 'and can see who left it');
    }

    // ── Comments, both directions ──────────────────────────────────────────────────────────────
    if (postByB) {
      const c = await A.sb.from('squad_post_comments').insert({ post_id: postByB, author_id: A.uid, body: 'Roundtrip: A commented on B.' });
      check(!c.error, "A comments on B's post", errText(c.error));
      const seen = await B.sb.from('squad_post_comments').select('author_id, body').eq('post_id', postByB);
      check((seen.data ?? []).some((x) => x.author_id === A.uid), 'B sees the comment', errText(seen.error));
      const nB = await B.sb.rpc('notification_feed', { p_limit: 50 });
      check((nB.data ?? []).some((x) => x.kind === 'post_comment' && x.actor_id === A.uid), 'B is notified of the comment', errText(nB.error));
    }

    // ── Fan-out: a squad post becomes an event for the OTHER member, never for its author ───────
    {
      const nB = await B.sb.rpc('notification_feed', { p_limit: 50 });
      const nA = await A.sb.rpc('notification_feed', { p_limit: 50 });
      check((nB.data ?? []).some((x) => x.kind === 'squad_post' && x.squad_id === SQ), "B is notified of A's squad post", errText(nB.error));
      check(
        !(nA.data ?? []).some((x) => x.kind === 'squad_post' && x.squad_id === SQ && x.actor_id === A.uid),
        'A is NOT notified of their own post',
      );
    }

    // ── Negative: an announcement is owner-only, and RLS is what says so ───────────────────────
    {
      const nope = await B.sb.from('squad_posts').insert({ squad_id: SQ, author_id: B.uid, type: 'announcement', body: 'Roundtrip: B should not be able to post this.', audience: 'SQUAD' }).select('id').single();
      if (nope.error) ok('a member cannot post an announcement', errText(nope.error));
      else {
        bad('a member cannot post an announcement', 'B posted one — RLS did not stop it');
        made.postIds.push(nope.data.id);
      }
      const mine = await A.sb.from('squad_posts').insert({ squad_id: SQ, author_id: A.uid, type: 'announcement', body: 'Roundtrip: owner announcement.', audience: 'SQUAD' }).select('id').single();
      if (!mine.error) made.postIds.push(mine.data.id);
      check(!mine.error, 'the owner can', errText(mine.error));
    }

    // ── Negative: an outsider's post into someone else's squad ────────────────────────────────
    // (Both accounts are members here, so the reachable half of this is the announcement above.)
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 4 · SQUAD GOAL — set it before the work, so the work counts toward it
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('4 · Squad goal — set');
  {
    const startsAt = new Date(Date.now() - 60_000).toISOString();
    const { error } = await A.sb
      .from('squads')
      .update({
        goal: 'Two sessions between us',
        goal_target: 2,
        goal_metric_kind: 'workout_count',
        goal_metric_key: null,
        goal_started_at: startsAt,
        goal_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', SQ);
    check(!error, 'A (owner) sets a measurable goal', errText(error) || 'workout_count · target 2');

    const nope = await B.sb.from('squads').update({ goal_target: 99 }).eq('id', SQ);
    const after = await A.sb.from('squads').select('goal_target').eq('id', SQ).maybeSingle();
    check(Number(after.data?.goal_target) === 2, 'a member cannot move the target', nope.error ? errText(nope.error) : `target is now ${after.data?.goal_target}`);

    for (const who of [A, B]) {
      const g = await who.sb.rpc('squad_goal_detail', { p_squad: SQ });
      const d = g.data ?? {};
      check(Number(d.target) === 2 && Number(d.total) === 0, `${who.label} sees the goal at 0 / 2`, errText(g.error) || `${d.total} / ${d.target}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 5 · COMPETITIONS — created before the work, for the same reason
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('5 · Squad competition — create and enrol');
  var squadComp = null;
  {
    const starts = new Date(Date.now() - 5 * 60_000);
    const ends = new Date(Date.now() + 2 * 60 * 60_000);
    const { data, error } = await A.sb
      .from('challenges')
      .insert({
        context: 'SQUAD',
        squad_id: SQ,
        invited_ids: [],
        creator_id: A.uid,
        name: `QA Squad Volume ${stamp}`,
        description: 'Roundtrip squad competition.',
        type: 'MOST_WORKOUTS',
        metric_key: null,
        tz: 'America/Denver',
        duration_type: 'CUSTOM',
        start_at: starts.toISOString(),
        end_at: ends.toISOString(),
        state: 'ENROLLMENT',
      })
      .select('id')
      .single();
    if (error) bad('A creates a squad competition', errText(error));
    else {
      squadComp = data.id;
      made.challengeIds.push(squadComp);
      ok('A creates a squad competition', 'MOST_WORKOUTS · ENROLLMENT');
    }

    if (squadComp) {
      // The creator enrols by creating (CS-D1); the squad-mate opts in from the hub.
      const jA = await A.sb.from('challenge_participants').insert({ challenge_id: squadComp, user_id: A.uid });
      check(!jA.error, 'A is enrolled', errText(jA.error));

      const hubB = await B.sb.rpc('challenge_hub');
      const open = hubB.data?.open ?? [];
      check(open.some((c) => (c.id ?? c.challenge_id) === squadComp), "it is on B's hub as joinable", errText(hubB.error) || `${open.length} open`);

      const jB = await B.sb.from('challenge_participants').insert({ challenge_id: squadComp, user_id: B.uid });
      check(!jB.error, 'B joins', errText(jB.error));

      const nA = await A.sb.rpc('notification_feed', { p_limit: 50 });
      check((nA.data ?? []).some((x) => x.kind === 'challenge_joined' && x.challenge_id === squadComp), 'A is told B joined', errText(nA.error));

      const adv = await A.sb.rpc('advance_challenges', { p_squad: SQ });
      const st = await A.sb.from('challenges').select('state').eq('id', squadComp).maybeSingle();
      check(st.data?.state === 'ACTIVE', 'the state machine promotes it to ACTIVE', errText(adv.error) || String(st.data?.state));
    }
  }

  section('6 · Head-to-head competition — invite → accept');
  var friendComp = null;
  {
    const starts = new Date(Date.now() - 5 * 60_000);
    const ends = new Date(Date.now() + 2 * 60 * 60_000);
    const { data, error } = await A.sb
      .from('challenges')
      .insert({
        context: 'FRIENDS',
        squad_id: null,
        invited_ids: [B.uid],
        creator_id: A.uid,
        name: `QA Head to Head ${stamp}`,
        description: 'Roundtrip 1v1.',
        type: 'MOST_VOLUME',
        metric_key: 'barbell-bench-press',
        tz: 'America/Denver',
        duration_type: 'CUSTOM',
        start_at: starts.toISOString(),
        end_at: ends.toISOString(),
        state: 'ENROLLMENT',
      })
      .select('id')
      .single();
    if (error) {
      bad('A invites B to a head-to-head', errText(error) + (error.code === '42703' ? ' — migration 0087 is not applied' : ''));
    } else {
      friendComp = data.id;
      made.challengeIds.push(friendComp);
      ok('A invites B to a head-to-head', 'FRIENDS · MOST_VOLUME · bench');
    }

    if (friendComp) {
      const jA = await A.sb.from('challenge_participants').insert({ challenge_id: friendComp, user_id: A.uid });
      check(!jA.error, 'A is enrolled as the creator', errText(jA.error));

      const nB = await B.sb.rpc('notification_feed', { p_limit: 50 });
      check((nB.data ?? []).some((x) => x.kind === 'challenge_invite' && x.challenge_id === friendComp), 'B receives the invitation', errText(nB.error));

      const det = await B.sb.rpc('challenge_detail', { p_challenge: friendComp });
      check(!!det.data, 'B can open it before joining', errText(det.error));
      check(det.data?.i_joined === false, 'and it knows B has not joined yet', String(det.data?.i_joined));

      const hubB = await B.sb.rpc('challenge_hub');
      check((hubB.data?.open ?? []).some((c) => (c.id ?? c.challenge_id) === friendComp), "it is on B's hub", errText(hubB.error));

      const jB = await B.sb.from('challenge_participants').insert({ challenge_id: friendComp, user_id: B.uid });
      check(!jB.error, 'B accepts by joining', errText(jB.error));

      const adv = await B.sb.rpc('advance_challenges', { p_squad: null });
      const st = await A.sb.from('challenges').select('state').eq('id', friendComp).maybeSingle();
      check(st.data?.state === 'ACTIVE', 'it goes ACTIVE', errText(adv.error) || String(st.data?.state));
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 7 · TRAIN TOGETHER — all four directions of the ask
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('7 · Train together');
  const SHAPE = [
    { catalogKey: 'barbell-bench-press', name: 'Barbell Bench Press', sets: 4, targetReps: 8 },
    { catalogKey: 'barbell-row', name: 'Barbell Row', sets: 3, targetReps: 8 },
  ];
  {
    // Who the tagger can even offer — friends and squad-mates, from both sides.
    for (const [who, other] of [[A, B], [B, A]]) {
      const p = await who.sb.rpc('training_partners');
      check((p.data ?? []).some((r) => r.id === other.uid), `${who.label} can see ${other.label} as a training partner`, errText(p.error));
    }

    /*
     * ⚠ A HAS TO ACTUALLY BE TRAINING BEFORE ANYONE CAN ASK TO JOIN — and the first run of this file
     * did not know that. `notification_events` branch 9 gates `workout_join_request` on the HOST's
     * `profiles.training_since` being set and under four hours old, which is correct: "let me in" is
     * only meaningful about a session that is happening, and the only route to the ask is the
     * `squad_training_started` notification. Asking first and starting the session afterwards produced
     * a row in the host's in-workout queue with no notification behind it, and that read as a missing
     * notification rather than as a test in the wrong order.
     */
    await A.sb.rpc('set_training_status', { p_active: true, p_label: 'Roundtrip Upper' });

    // ── Direction 1: A invites B ───────────────────────────────────────────────────────────────
    const inv = await A.sb
      .from('workout_invites')
      .insert({ from_id: A.uid, to_id: B.uid, workout_name: 'Roundtrip Upper', template_id: null, exercises: SHAPE, note: 'Same time?' })
      .select('id')
      .single();
    if (inv.error) bad('A invites B to train', errText(inv.error));
    else {
      made.inviteIds.push(inv.data.id);
      ok('A invites B to train');
      const seen = await B.sb.rpc('workout_invite', { p_invite: inv.data.id });
      const d = seen.data ?? {};
      check(!!seen.data, 'B can open the invitation', errText(seen.error));
      check(String(d.from_id) === A.uid && (d.exercises ?? []).length === 2, 'it carries the shape and names the sender', `${(d.exercises ?? []).length} lifts`);
      const nB = await B.sb.rpc('notification_feed', { p_limit: 50 });
      check((nB.data ?? []).some((x) => x.kind === 'workout_invite' && x.actor_id === A.uid), 'B is notified', errText(nB.error));

      const acc = await B.sb.from('workout_invites').update({ status: 'ACCEPTED', accepted_at: new Date().toISOString() }).eq('id', inv.data.id);
      check(!acc.error, 'B accepts', errText(acc.error));
    }

    // ── Direction 2: B asks to join the session A is already in ───────────────────────────────
    const jr = await B.sb
      .from('workout_invites')
      .insert({ from_id: B.uid, to_id: A.uid, kind: 'JOIN_REQUEST', workout_name: 'Roundtrip Upper', exercises: [], note: 'Room for one more?' })
      .select('id')
      .single();
    if (jr.error) bad('B asks to join A’s session', errText(jr.error) + (jr.error.code === '42703' ? ' — migration 0121 is not applied' : ''));
    else {
      made.inviteIds.push(jr.data.id);
      ok('B asks to join A’s session');
      const q = await A.sb.rpc('pending_join_requests');
      check((q.data ?? []).some((r) => r.id === jr.data.id), "it is in A's in-workout queue", errText(q.error) || `${(q.data ?? []).length} pending`);
      const nA = await A.sb.rpc('notification_feed', { p_limit: 50 });
      check((nA.data ?? []).some((x) => x.kind === 'workout_join_request' && x.actor_id === B.uid), 'A is notified', errText(nA.error));

      // The host writes the SHAPE and the POSITION at accept time — that is the whole feature.
      const acc = await A.sb
        .from('workout_invites')
        .update({ status: 'ACCEPTED', accepted_at: new Date().toISOString(), workout_name: 'Roundtrip Upper', exercises: SHAPE, start_index: 1 })
        .eq('id', jr.data.id);
      check(!acc.error, 'A accepts and snapshots the session', errText(acc.error));

      const back = await B.sb.rpc('workout_invite', { p_invite: jr.data.id });
      const d = back.data ?? {};
      check(Number(d.start_index) === 1 && (d.exercises ?? []).length === 2, 'B walks in where A actually is', `start_index ${d.start_index}, ${(d.exercises ?? []).length} lifts`);
    }

    // ── Direction 3: A pulls B into a session already under way ───────────────────────────────
    const live = await A.sb
      .from('workout_invites')
      .insert({ from_id: A.uid, to_id: B.uid, kind: 'INVITE', workout_name: 'Roundtrip Upper', exercises: SHAPE, start_index: 1, note: null })
      .select('id')
      .single();
    if (live.error) bad('A pulls B into a live session', errText(live.error));
    else {
      made.inviteIds.push(live.data.id);
      const d = (await B.sb.rpc('workout_invite', { p_invite: live.data.id })).data ?? {};
      check(Number(d.start_index) === 1, 'A pulls B into a live session', `start_index ${d.start_index}`);
      // ── Direction 4: declining deletes the row. There is no DECLINED state to find (CS-D3).
      const del = await B.sb.from('workout_invites').delete().eq('id', live.data.id);
      const gone = await B.sb.rpc('workout_invite', { p_invite: live.data.id });
      check(!del.error && !gone.data, 'B declines, and nothing records the refusal', errText(del.error));
      made.inviteIds = made.inviteIds.filter((x) => x !== live.data.id);
    }

    // ── The credit both athletes must derive from the SAME row ────────────────────────────────
    const since = new Date(Date.now() - 12 * 60 * 60_000).toISOString();
    for (const [who, other] of [[A, B], [B, A]]) {
      const { data, error } = await who.sb
        .from('workout_invites')
        .select('from_id, to_id, accepted_at')
        .eq('status', 'ACCEPTED')
        .gte('accepted_at', since)
        .or(`from_id.eq.${who.uid},to_id.eq.${who.uid}`);
      const others = new Set((data ?? []).map((r) => (r.from_id === who.uid ? r.to_id : r.from_id)));
      check(others.has(other.uid), `${who.label} is credited with training alongside ${other.label}`, errText(error));
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 8 · PRESENCE — somebody is in the gym right now
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('8 · Live Now + training alerts');
  {
    // The three switches 0153 puts between the fact and the notification.
    const lead = await A.sb.from('squads').update({ training_alerts: true, updated_at: new Date().toISOString() }).eq('id', SQ);
    check(!lead.error, 'the leader turns squad training alerts on', errText(lead.error));
    const mine = await B.sb.rpc('set_squad_notify', { p_squad: SQ, p_start: true, p_finish: true });
    check(!mine.error, 'B asks to be told about starts and finishes', errText(mine.error));
    const alsoA = await A.sb.rpc('set_squad_notify', { p_squad: SQ, p_start: true, p_finish: true });
    check(!alsoA.error, 'A asks for the same', errText(alsoA.error));

    const start = await A.sb.rpc('set_training_status', { p_active: true, p_label: 'Roundtrip Upper' });
    check(!start.error, 'A starts a session', errText(start.error));

    const now = await B.sb.rpc('training_now');
    const meA = (now.data ?? []).find((r) => r.user_id === A.uid);
    check(!!meA, 'B sees A in Live Now', errText(now.error) || `${(now.data ?? []).length} training`);
    check(meA?.label === 'Roundtrip Upper', 'with the session label A is actually in', String(meA?.label));
    const one = await B.sb.rpc('athlete_training_status', { p_athlete: A.uid });
    check(!!one.data?.training, "B can read A's status from their profile", errText(one.error) || JSON.stringify(one.data));

    const selfNow = await A.sb.rpc('training_now');
    check(!(selfNow.data ?? []).some((r) => r.user_id === A.uid), 'A does not appear in their own Live Now');

    const nB = await B.sb.rpc('notification_feed', { p_limit: 50 });
    check((nB.data ?? []).some((x) => x.kind === 'squad_training_started' && x.actor_id === A.uid), 'B is told A started training', errText(nB.error));
    const nA = await A.sb.rpc('notification_feed', { p_limit: 50 });
    check(!(nA.data ?? []).some((x) => x.kind === 'squad_training_started' && x.actor_id === A.uid), 'A is not told about their own start');
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 9 · THE WORK — one real session each, through `save_workout`
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('9 · Both athletes train');
  {
    const session = (who, weight) => ({
      p_workout_name: 'Roundtrip Upper',
      p_activity_type: 'strength',
      p_started_at: new Date(Date.now() - 45 * 60_000).toISOString(),
      p_duration_sec: 40 * 60,
      p_notes: null,
      p_exercises: [
        {
          name: 'Barbell Bench Press',
          catalog_key: 'barbell-bench-press',
          notes: null,
          section: 'main',
          position: 0,
          group_id: null,
          group_name: null,
          group_kind: null,
          group_rounds: null,
          sets: [0, 1, 2].map((i) => ({
            set_index: i,
            weight,
            weight_unit: 'lb',
            reps: 8,
            duration_sec: null,
            distance: null,
            distance_unit: null,
            completed: true,
          })),
        },
      ],
      // No PRs on purpose: `personal_records` does not cascade from `workouts`, and this run must not
      // leave a record behind on an account Apple opens.
      p_prs: [],
      p_program_id: null,
      p_distance: null,
      p_distance_unit: null,
      p_template_id: null,
    });

    for (const [who, other, weight] of [[A, B, 185], [B, A, 135]]) {
      const { data, error } = await who.sb.rpc('save_workout', session(who, weight));
      const id = data?.workout_id ?? (typeof data === 'string' ? JSON.parse(data)?.workout_id : null);
      if (error || !id) {
        bad(`${who.label} saves a session`, errText(error));
        continue;
      }
      made.workoutIds.push({ who, id });
      // The partner tag is a post-commit annotation, exactly as `save.ts` writes it.
      const ann = await who.sb.from('workouts').update({ partners: [other.name] }).eq('id', id);
      ok(`${who.label} saves a session`, `${weight} lb × 8 × 3${ann.error ? ' (partner tag failed)' : ` · trained with ${other.name}`}`);
    }

    // The tag has to survive the read the History screen makes.
    for (const { who, id } of made.workoutIds) {
      const r = await who.sb.from('workouts').select('partners, saved_at').eq('id', id).maybeSingle();
      check((r.data?.partners ?? []).length === 1, `${who.label}'s history says who they trained with`, JSON.stringify(r.data?.partners ?? []));
      /*
       * ⚠ THE DATABASE'S CLOCK, NOT THIS MACHINE'S — and the difference is not academic.
       *
       * Phase 11 has to put a competition's `end_at` in the past to close it. Reckoned from `Date.now()`
       * that is a guess against an unknown skew: one second behind local time was still in the SERVER's
       * future and the competition would not complete, while a minute behind excluded the two sessions
       * saved thirty seconds earlier and every podium froze at zero. `saved_at` is written by Postgres,
       * so anchoring to it is exact at both ends — provably after the work, provably in the past.
       */
      if (r.data?.saved_at) dbSavedAt = Math.max(dbSavedAt, Date.parse(r.data.saved_at));
    }

    const stop = await A.sb.rpc('set_training_status', { p_active: false, p_label: null });
    check(!stop.error, 'A ends the session', errText(stop.error));
    const nB = await B.sb.rpc('notification_feed', { p_limit: 50 });
    check((nB.data ?? []).some((x) => x.kind === 'squad_training_finished' && x.actor_id === A.uid), 'B is told A finished', errText(nB.error));
    const gone = await B.sb.rpc('training_now');
    check(!(gone.data ?? []).some((r) => (r.id ?? r.athlete_id) === A.uid), 'A drops out of Live Now');
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 10 · THE GOAL, FINISHED
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('10 · Squad goal — progress and completion');
  {
    for (const who of [A, B]) {
      const g = await who.sb.rpc('squad_goal_detail', { p_squad: SQ });
      const d = g.data ?? {};
      const contribs = d.contributions ?? [];
      check(Number(d.total) >= 2, `${who.label} sees the goal met`, errText(g.error) || `${d.total} / ${d.target}`);
      check(contribs.length === 2 && contribs.every((c) => Number(c.value) >= 1), `${who.label} sees BOTH contributions`, contribs.map((c) => `${c.name}:${c.value}`).join(' '));
      check(contribs.some((c) => c.isSelf), `${who.label}'s own line is marked as theirs`);
      check((d.events ?? []).length >= 2, `${who.label} sees both sessions in the goal's activity`, `${(d.events ?? []).length} events`);
    }

    const tot = await A.sb.rpc('squad_metric_total', { p_squad: SQ, p_kind: 'workout_count', p_key: null, p_started_at: new Date(Date.now() - 60 * 60_000).toISOString() });
    check(Number(tot.data ?? 0) >= 2, 'the squad total agrees', errText(tot.error) || String(tot.data));

    // Banking is what turns a met goal into history — and what the Squad Goal honors count.
    const arch = await A.sb.rpc('archive_squad_goal', { p_squad: SQ });
    check(!arch.error, 'A banks the finished goal', errText(arch.error));

    const after = await B.sb.rpc('squad_goal_detail', { p_squad: SQ });
    check((after.data?.past ?? []).length >= 1, 'B sees it in the squad’s past goals', `${(after.data?.past ?? []).length} banked`);

    const cleared = await A.sb.from('squads').update({ goal: null, goal_target: null, goal_started_at: null, updated_at: new Date().toISOString() }).eq('id', SQ);
    check(!cleared.error, 'A clears the goal to set the next one', errText(cleared.error));
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════
  // 11 · BOTH COMPETITIONS, RUN TO THE FINAL
  // ═════════════════════════════════════════════════════════════════════════════════════════════
  section('11 · Competitions — standings, close, podium');
  for (const [label, id, squadScope] of [['squad', squadComp, SQ], ['head-to-head', friendComp, null]]) {
    if (!id) {
      skip(`${label} competition finishes`, 'it was never created');
      continue;
    }
    // Standings, read through BOTH sessions — the leaderboard is the shared object.
    let liveByUser = {};
    for (const who of [A, B]) {
      const det = await who.sb.rpc('challenge_detail', { p_challenge: id });
      const d = det.data ?? {};
      const st = d.standings ?? [];
      check(st.length === 2, `${who.label} sees a roster of 2 in the ${label} competition`, errText(det.error) || `${st.length}`);
      check(st.filter((s) => s.is_self).length === 1, `exactly one row is marked as ${who.label}'s own`);
      check(st.find((s) => s.is_self)?.user_id === who.uid, 'and it is the right one');
      check(st.every((s) => Number(s.place ?? 0) >= 1), 'everyone is placed');
      if (st.length) note(`${who.label} sees: ${st.map((s) => `${s.name} ${s.score} (place ${s.place}${s.tied ? ', tied' : ''})`).join(' · ')}`);
      // Key-order-independent, or two identical leaderboards read in a different order would "differ".
      const stable = (rows) => rows.map((s) => `${s.user_id}=${Number(s.score ?? 0)}`).sort().join(' ');
      if (who === A) liveByUser = { map: Object.fromEntries(st.map((s) => [s.user_id, Number(s.score ?? 0)])), key: stable(st) };
      // Both athletes must be looking at the SAME leaderboard, not merely at a well-formed one.
      if (who === B) check(stable(st) === liveByUser.key, 'A and B see identical scores', `${liveByUser.key} vs ${stable(st)}`);
    }

    /*
     * Close the window. The creator is the commissioner (CS-D6) — `challenges_update` is creator-scoped.
     *
     * ⚠ ONE SECOND IN THE PAST, NOT SIXTY. Scoring windows on `w.saved_at >= c.start_at and
     * w.saved_at < c.end_at` (0059), so backdating the end by a minute retroactively pushed the two
     * sessions saved thirty seconds earlier OUT of the competition. Every frozen result then read 0,
     * both athletes tied at zero, and both were crowned co-winners — a podium that looked like a real
     * defect and was entirely an artifact of how this file stops the clock. The margin only has to be
     * enough for `advance_challenges` to see `now() >= end_at`.
     */
    const endAt = new Date((dbSavedAt || Date.now() - 60_000) + 1_000);
    const closed = await A.sb.from('challenges').update({ end_at: endAt.toISOString() }).eq('id', id);
    check(!closed.error, `A closes the ${label} competition's window`, errText(closed.error) || `end_at ${endAt.toISOString()}`);

    // Opening a screen IS the clock (there is no scheduler), so this is what the app does on arrival.
    let adv = await A.sb.rpc('advance_challenges', { p_squad: squadScope });
    let st = await A.sb.from('challenges').select('state').eq('id', id).maybeSingle();
    if (st.data?.state !== 'COMPLETED') {
      adv = await A.sb.rpc('advance_challenges', { p_squad: null });
      st = await A.sb.from('challenges').select('state').eq('id', id).maybeSingle();
    }
    check(st.data?.state === 'COMPLETED', `the state machine completes it`, errText(adv.error) || String(st.data?.state));

    // The frozen result — C-4 reads this, it never recomputes.
    for (const who of [A, B]) {
      const res = await who.sb.rpc('challenge_results_detail', { p_challenge: id });
      const d = res.data ?? {};
      const rows = d.standings ?? [];
      check(!!res.data, `${who.label} can open the final result`, errText(res.error));
      check(rows.length === 2, `${who.label} sees both athletes in the final standings`, `${rows.length}`);
      check((d.winners ?? []).length >= 1, `${who.label} sees a named winner`, (d.winners ?? []).map((w) => w.name).join(', '));
      check(rows.some((r) => r.is_winner) && rows.filter((r) => r.is_self).length === 1, 'the frozen result marks the winner and the self row');
      /*
       * ⚠ THE FROZEN RESULT MUST SAY WHAT THE LIVE LEADERBOARD SAID. C-4 reads `challenge_results` and
       * never recomputes, so if the freeze disagrees with the standings the athletes watched all season,
       * the disagreement is permanent and there is no second source to catch it.
       */
      const drift = rows.filter((r) => liveByUser.map[r.user_id] !== undefined && Number(r.score) !== liveByUser.map[r.user_id]);
      check(drift.length === 0, `${who.label}'s podium agrees with the leaderboard it froze`, drift.map((r) => `${r.name}: live ${liveByUser.map[r.user_id]} → frozen ${r.score}`).join(' · '));
      const winners = rows.filter((r) => r.is_winner);
      const topLive = Math.max(...Object.values(liveByUser.map));
      const tiedAtTop = Object.values(liveByUser.map).filter((v) => v === topLive).length;
      check(winners.length === tiedAtTop, `${who.label} sees ${tiedAtTop === 1 ? 'one winner' : `${tiedAtTop} co-winners`}, matching the scores`, `${winners.length} marked`);
      // CS-D3: nothing may surface a loser. A two-athlete result must not report a "last".
      check(!JSON.stringify(d).toLowerCase().includes('last place'), 'and nothing in it names a loser');
      if (rows.length) note(`${who.label} sees: ${rows.map((r) => `${r.name} ${r.score} (${r.place}${r.is_winner ? ' ★' : ''})`).join(' · ')}`);
      const hub = await who.sb.rpc('challenge_hub');
      check((hub.data?.history ?? []).some((h) => (h.id ?? h.challenge_id) === id), `it is in ${who.label}'s competition history`, errText(hub.error));
    }
  }

  if (squadComp) {
    const champ = await B.sb.rpc('squad_current_champions', { p_squad: SQ });
    check(!champ.error, 'the squad has a current champion', errText(champ.error) || JSON.stringify(champ.data ?? {}).slice(0, 90));
    const hall = await B.sb.rpc('squad_hall_of_champions', { p_squad: SQ });
    check(!hall.error, 'the Hall of Champions reads', errText(hall.error));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 12 · NOTIFICATIONS — what each athlete actually ends the run holding
// ═══════════════════════════════════════════════════════════════════════════════════════════════
section('12 · Notification feed and bell');
{
  // The allow-list in `notifications-live.ts` silently drops any kind it does not name. 0153's two
  // training kinds sat unlisted for eleven migrations — pushed, and invisible in /inbox. This is the
  // check that would have caught it: compare what the RPC returns against what the client will render.
  const KINDS = [
    'join_request', 'member_joined', 'request_approved', 'request_declined', 'friend_request',
    'friend_accepted', 'challenge_invite', 'challenge_joined', 'workout_invite', 'workout_join_request',
    'program_shared', 'squad_post', 'squad_checkin', 'squad_recap', 'post_comment', 'post_reaction',
    'squad_training_started', 'squad_training_finished',
  ];

  for (const who of [A, B]) {
    const feed = await who.sb.rpc('notification_feed', { p_limit: 100 });
    const rows = feed.data ?? [];
    const kinds = [...new Set(rows.map((r) => r.kind))];
    const dropped = kinds.filter((k) => !KINDS.includes(k));
    ok(`${who.label} holds ${rows.length} notifications`, kinds.join(', ') || 'none');
    check(dropped.length === 0, `${who.label}: every kind the server sends, the app can render`, dropped.length ? `THE APP WILL DROP: ${dropped.join(', ')}` : '');

    const unread = await who.sb.rpc('notification_unread_count');
    check(!unread.error && Number(unread.data ?? 0) > 0, `${who.label}'s bell shows unread`, errText(unread.error) || String(unread.data));

    await who.sb.from('profiles').update({ notifications_seen_at: new Date().toISOString() }).eq('id', who.uid);
    const after = await who.sb.rpc('notification_unread_count');
    check(Number(after.data ?? -1) === 0, `${who.label}: opening the inbox clears the bell`, String(after.data));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TEARDOWN
// ═══════════════════════════════════════════════════════════════════════════════════════════════
section('Teardown');
if (KEEP) {
  note('--keep: nothing removed.');
  note(`squad: ${made.squadId ?? '(none)'}`);
  note(`challenges: ${made.challengeIds.join(', ') || '(none)'}`);
  note(`workouts: ${made.workoutIds.map((w) => `${w.who.label}:${w.id}`).join(', ') || '(none)'}`);
} else {
  for (const { who, id } of made.workoutIds) {
    const { error } = await who.sb.from('workouts').delete().eq('id', id);
    check(!error, `${who.label}'s roundtrip workout removed`, errText(error));
  }
  // Timeline events do not cascade from `workouts` — reviewer-seed learned this the expensive way.
  for (const who of [A, B]) {
    await who.sb.from('timeline_events').delete().eq('athlete_id', who.uid).gte('created_at', RUN_START);
  }

  // The chapter counter and the honors — the two things the delete above cannot reach.
  for (const who of [A, B]) {
    const b = baseline[who.label];
    if (b.chapterId != null && b.workoutCount != null) {
      const { error } = await who.sb.from('chapters').update({ workout_count: b.workoutCount }).eq('id', b.chapterId);
      check(!error, `${who.label}'s chapter count restored to ${b.workoutCount}`, errText(error));
    } else {
      skip(`${who.label}'s chapter count restored`, 'no active chapter to read at the start of the run');
    }
    const hon = await who.sb.from('honor_instances').select('id, honor_type').eq('athlete_id', who.uid);
    const fresh = (hon.data ?? []).filter((h) => !b.honorIds.has(h.id));
    if (!fresh.length) ok(`${who.label} earned no honors during the run`);
    else {
      const del = await who.sb.from('honor_instances').delete().in('id', fresh.map((h) => h.id));
      if (del.error) {
        bad(`${who.label}'s ${fresh.length} run-earned honors removed`, errText(del.error));
        note(`Clear by hand: delete from public.honor_instances where id in (${fresh.map((h) => `'${h.id}'`).join(', ')});`);
      } else ok(`${who.label}'s ${fresh.length} run-earned honors removed`, fresh.map((h) => h.honor_type).join(', '));
    }
  }
  for (const id of made.inviteIds) await A.sb.from('workout_invites').delete().eq('id', id);
  for (const id of made.inviteIds) await B.sb.from('workout_invites').delete().eq('id', id);

  /*
   * ⚠ A DELETE THAT REMOVES NOTHING RESOLVES WITHOUT AN ERROR, so `!error` is not proof.
   *
   * `challenges` has select, insert and update policies (0059) and **no delete policy at all**. The
   * statement below therefore matches zero rows and reports success, every time. A SQUAD competition
   * still disappears — it cascades when the squad is deleted a few lines down — but a FRIENDS
   * competition has no squad to cascade from, so it survives, COMPLETED, in both athletes' history.
   * Six accumulated across the runs that built this file, invisible behind a teardown reporting
   * "every competition removed". The read-back is what turns that into a finding.
   */
  const orphans = [];
  for (const id of made.challengeIds) {
    await A.sb.from('challenges').delete().eq('id', id);
    const { data } = await A.sb.from('challenges').select('id').eq('id', id).maybeSingle();
    if (data) orphans.push(id);
  }
  if (made.squadId) {
    const { error } = await A.sb.from('squads').delete().eq('id', made.squadId);
    check(!error, 'the QA squad is deleted', errText(error));
  }
  const stillThere = [];
  for (const id of orphans) {
    const { data } = await A.sb.from('challenges').select('id, name').eq('id', id).maybeSingle();
    if (data) stillThere.push(data);
  }
  if (stillThere.length) {
    bad('every competition removed', `${stillThere.length} could not be deleted by the creator`);
    note('Paste this into the Supabase SQL editor to clear them:');
    note(`delete from public.challenges where id in (${stillThere.map((c) => `'${c.id}'`).join(', ')});`);
  } else {
    ok('every competition removed');
  }
  await A.sb.rpc('set_training_status', { p_active: false, p_label: null });
  await B.sb.rpc('set_training_status', { p_active: false, p_label: null });
  ok('presence cleared on both accounts');

  /*
   * ── ⚠ PROVE IT, DO NOT ASSUME IT ─────────────────────────────────────────────────────────────
   *
   * Every delete above resolved without an error, which is not the same as the row being gone: a delete
   * filtered by a policy that excludes the row succeeds and removes nothing. These accounts are what
   * Apple signs in to, so the run has to end by READING for its own leftovers rather than trusting its
   * own writes.
   */
  const residue = [];
  const sq = await A.sb.from('squads').select('id, name').like('name', 'QA %');
  if ((sq.data ?? []).length) residue.push(`${sq.data.length} QA squad(s): ${sq.data.map((s) => s.name).join(', ')}`);
  for (const who of [A, B]) {
    const w = await who.sb.from('workouts').select('id').eq('athlete_id', who.uid).eq('name', 'Roundtrip Upper');
    if ((w.data ?? []).length) residue.push(`${who.label}: ${w.data.length} Roundtrip workout(s)`);
    const inv = await who.sb.from('workout_invites').select('id').eq('workout_name', 'Roundtrip Upper');
    if ((inv.data ?? []).length) residue.push(`${who.label}: ${inv.data.length} Roundtrip invite(s)`);
    const p = await who.sb.from('squad_posts').select('id').eq('author_id', who.uid).like('body', 'Roundtrip:%');
    if ((p.data ?? []).length) residue.push(`${who.label}: ${p.data.length} Roundtrip post(s)`);
    const c = await who.sb.from('challenges').select('id, name').like('name', 'QA %');
    if ((c.data ?? []).length) residue.push(`${who.label} can still see ${c.data.length} QA competition(s)`);
  }
  check(residue.length === 0, 'nothing from this run is left on either account', residue.join(' · '));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
section('Summary');
const pass = results.filter((r) => r.state === 'PASS').length;
const fail = results.filter((r) => r.state === 'FAIL');
const skipped = results.filter((r) => r.state === 'SKIP');
console.log(`\n  ${pass} passed · ${fail.length} failed · ${skipped.length} skipped\n`);
if (fail.length) {
  console.log('  FAILURES');
  for (const f of fail) console.log(`    ✗ [${f.phase}] ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
}
if (skipped.length) {
  console.log('  SKIPPED');
  for (const s of skipped) console.log(`    · [${s.phase}] ${s.label} — ${s.detail}`);
}
if (RESEED && !KEEP) {
  console.log('\n  --reseed: restoring the demo account. Run reviewer-seed.mjs now:');
  console.log('    node supabase/seed/reviewer-seed.mjs   (same env)');
  console.log('    node supabase/seed/reviewer-verify.mjs (same env)');
}
console.log('');
process.exit(fail.length ? 1 : 0);
