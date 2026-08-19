// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE APP STORE REVIEW ACCOUNT — Launch Checklist §10.6.
//
// Run: SB_EMAIL=… SB_PASS=… SB2_EMAIL=… SB2_PASS=… node supabase/seed/reviewer-seed.mjs
//
// ══ WHY THIS EXISTS ══
//
// Apple reviews behind the login, and **the social half of this app is unreviewable from an empty
// account**. A reviewer who signs in to a blank Squads tab, a blank feed and a blank Legacy sees an app
// that does nothing — which reads as Guideline 2.1 "app incomplete", not as an account with no data.
//
// ══ ⚠ WHY TWO ACCOUNTS, AND WHY THAT IS NOT OPTIONAL ══
//
// Half the things a reviewer needs to SEE require someone else to exist: a squad with a second member, a
// feed with somebody else's post in it, a challenge with more than one entrant, a friendship. One account
// cannot produce any of them, and faking them by writing rows as the reviewer would produce a squad whose
// only member is the reviewer — exactly the empty-looking screen this script exists to prevent.
//
// So: `SB_*` is the reviewer, `SB2_*` is a demo squadmate. Both are real accounts created through the
// normal sign-up path.
//
// ══ ⚠ IT WRITES THROUGH THE ANON KEY, AS THE SIGNED-IN ATHLETE ══
//
// The same choice `seed.mjs` made, and the reason matters more here: every row goes through the same RLS
// the app uses, so anything this script creates is **provably reachable by the account Apple will sign in
// to**. A service-key seed can write rows the reviewer's own session cannot then read — which fails in
// the one way nobody would catch before submission.
//
// ⚠ THERE IS NO SERVICE KEY IN THIS PROJECT AND THIS DOES NOT NEED ONE.
//
// ══ ⚠ WHAT THIS DELIBERATELY DOES NOT DO ══
//
// It does not touch `entitlement_config` or grant anybody Premium. `default_tier` is `PREMIUM` today, so
// the reviewer already sees every feature; after Phase F flips it to `FREE`, the reviewer account needs a
// **seat-free PREMIUM grant** in the same pass — that is step 2 of Phase F in `Docs/GO-LIVE.md`, and it
// belongs there rather than here, because it is a billing decision and not seed data.
//
// Idempotent: every section clears its own rows first, so a re-run replaces rather than duplicates.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

function client() {
  return createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Sign in, or sign up if the account does not exist yet.
 *
 * ⚠ SIGN-IN IS TRIED FIRST, ALWAYS. Running this twice must not attempt a second sign-up of the same
 * address — that returns an error on some projects and a confirmation-pending user on others, and the
 * second is worse because it looks like it worked.
 */
async function account(label, email, password) {
  if (!email || !password) throw new Error(`${label}: pass both an email and a password at runtime`);
  const sb = client();
  let { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const up = await sb.auth.signUp({ email, password });
    if (up.error) throw new Error(`${label}: could not sign in or sign up — ${up.error.message}`);
    if (!up.data.session) {
      throw new Error(
        `${label}: signed up but got no session — email confirmation is ON for this project. ` +
          `Confirm the address, then re-run. Apple's reviewer cannot confirm an email, so this account ` +
          `MUST be confirmed before submission.`,
      );
    }
    data = up.data;
    console.log(`  ${label}: created`);
  } else {
    console.log(`  ${label}: signed in`);
  }
  return { sb, uid: data.user.id };
}

const REVIEWER = {
  name: 'Alex Reviewer',
  first_name: 'Alex',
  handle: 'alex.review',
  initials: 'AR',
};
const MATE = {
  name: 'Sam Torres',
  first_name: 'Sam',
  handle: 'sam.torres',
  initials: 'ST',
};

const iso = (daysAgo, hour = 17) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

console.log('── Accounts ─────────────────────────────');
const reviewer = await account('reviewer', process.env.SB_EMAIL, process.env.SB_PASS);
const mate = await account('squadmate', process.env.SB2_EMAIL, process.env.SB2_PASS);

// ── 1. Identity + onboarding ───────────────────────────────────────────────────────────────────
//
// ⚠ `onboarded_at` IS THE LOAD-BEARING FIELD. The boot router sends an athlete with a null one into the
// first-time journey, so without this the reviewer signs in and lands in onboarding rather than the app —
// and every screenshot they were sent to check is behind it.
//
// `experience` and `training_goals` are 0169's columns: null means "never asked", and Coach Holt asks.
// Filling them is what makes the coach open with a program instead of a questionnaire.
console.log('── Profiles ─────────────────────────────');
for (const [who, persona, extra] of [
  [reviewer, REVIEWER, {
    standard: 'Show up when it is hard. The work is the promise I keep to myself.',
    rank_family: 'established',
    rank_level: 2,
    experience: 'intermediate',
    training_goals: ['strength', 'muscle'],
    athlete_type: 'Strength',
    environment: 'commercial_gym',
  }],
  [mate, MATE, {
    standard: 'Consistency over intensity.',
    rank_family: 'established',
    rank_level: 1,
    experience: 'beginner',
    training_goals: ['health'],
    athlete_type: 'Hybrid',
    environment: 'commercial_gym',
  }],
]) {
  const { error } = await who.sb
    .from('profiles')
    .update({
      ...persona,
      ...extra,
      sex: 'unspecified',
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', who.uid);
  if (error) throw new Error(`profile ${persona.handle}: ${error.message}`);
  console.log(`  ${persona.handle}: set`);
}

// ── 1a. CHAPTERS — the Legacy tab's spine ──────────────────────────────────────────────────────
//
// ⚠ WITHOUT ONE, THE WHOLE LEGACY TAB IS BLANK — including the personal records, which render inside a
//   chapter's context rather than as a free-standing list. The first seeded run had 5 real records in the
//   database and a Legacy tab showing nothing, which is the worst combination: the data is right, the
//   screen is empty, and nothing anywhere reports a problem.
//
// ⚠ WHY THEY ARE INSERTED DIRECTLY. `complete_onboarding` is normally the only path that creates a
//   chapter, and this seed deliberately does not run it — it sets `onboarded_at` on the profile instead,
//   because calling the full onboarding RPC on an already-onboarded account is not idempotent. `seed.mjs`
//   has inserted chapters this way since the first demo account; owner-scoped RLS permits it.
//
// Two chapters, not one: an ACTIVE chapter and a SEALED one, because they render as different cards and a
// reviewer seeing only the active state has not seen what the app is actually for.
console.log('── Chapters ─────────────────────────────');
{
  // timeline_events references chapters, so it clears first (already done above, but this section can be
  // re-run in isolation during development).
  await reviewer.sb.from('timeline_events').delete().eq('athlete_id', reviewer.uid);
  await reviewer.sb.from('chapters').delete().eq('athlete_id', reviewer.uid);

  const today = new Date();
  const d = (back) => {
    const x = new Date(today);
    x.setUTCDate(x.getUTCDate() - back);
    return x.toISOString().slice(0, 10);
  };

  const { error } = await reviewer.sb.from('chapters').insert([
    {
      athlete_id: reviewer.uid,
      name: 'The Year I Got Serious',
      start_date: d(60),
      end_date: null,
      sealed_at: null,
      is_active: true,
      workout_count: 5,
      honor_count: 0,
      reflection: null,
    },
    {
      athlete_id: reviewer.uid,
      name: 'Coming Back From Injury',
      start_date: d(240),
      end_date: d(75),
      sealed_at: new Date(today.getTime() - 75 * 864e5).toISOString(),
      is_active: false,
      workout_count: 38,
      honor_count: 2,
      // ⚠ A sealed chapter with no reflection renders as a card with a hole in it. The reflection IS the
      //   seal — it is what M-5 asks for at the end — so a demo chapter without one shows the ceremony's
      //   output as blank.
      reflection: 'I stopped training to look like something and started training to be able to do things.',
    },
  ]);
  if (error) throw new Error(`chapters: ${error.message}`);
  console.log('  one active, one sealed');
}

// ── 1b. A RUNNING PROGRAM ──────────────────────────────────────────────────────────────────────
//
// ⚠ THE FIRST SCREEN APPLE OPENS, AND THE FIRST DRAFT OF THIS SEED LEFT IT EMPTY.
//
// §10.6 asks for "a real account with a running program". Without one, Home renders its cold-start state —
// "Start Freestyle Workout" and nothing else — which is precisely the "app incomplete" read this file
// exists to prevent, on the very first screen. Found by walking the checklist, not by any gate.
//
// ⚠ ADOPTED FROM A SHIPPED DEFINITION, NOT AUTHORED HERE. `structureFromDefinition` is the one path from
//   catalog to a real program row; hand-writing a `structure` jsonb would produce something that inserts
//   cleanly and renders wrong, in ways nothing here could see.
console.log('── Program ──────────────────────────────');
{
  const { structureFromDefinition } = await import('../../src/domain/program/adopt-core.ts');
  const def = JSON.parse(
    readFileSync(new URL('../../src/domain/training/programs/strength-foundation-i-3day.json', import.meta.url), 'utf8'),
  );
  const structure = structureFromDefinition(def);

  // Reuse rather than stack: `start_program` ends whatever was active, but a second row would still leave
  // the reviewer with two copies in their program list.
  const existing = await reviewer.sb
    .from('programs')
    .select('id, state')
    .eq('athlete_id', reviewer.uid)
    .eq('source_definition_id', def.id)
    .in('state', ['future', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let programId = existing.data?.id ?? null;
  if (!programId) {
    const { data, error } = await reviewer.sb
      .from('programs')
      .insert({
        athlete_id: reviewer.uid,
        name: structure.name,
        structure,
        source_definition_id: def.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(`adopt program: ${error.message}`);
    programId = data.id;
    console.log(`  adopted ${structure.name}`);
  } else {
    console.log(`  ${structure.name} already adopted — reusing`);
  }

  if (existing.data?.state !== 'active') {
    const st = await reviewer.sb.rpc('start_program', { p_program_id: programId });
    if (st.error) throw new Error(`start_program: ${st.error.message}`);
    console.log('  started — Home now has a next session');
  } else {
    console.log('  already active');
  }
}

// ── 2. Training history ────────────────────────────────────────────────────────────────────────
//
// ⚠ SAVED THROUGH `save_workout`, NOT INSERTED. The RPC is what writes `workout_exercises`, detects
// personal records, advances the program, and fires honor evaluation — a hand-inserted `workouts` row
// produces history that renders but has no PRs, no honors and no rank movement behind it. The reviewer
// would then see a Legacy tab with sessions in it and nothing else, which is a worse impression than an
// empty one because it looks broken rather than new.
console.log('── Workout history ──────────────────────');

/*
 * ⚠ CLEARED FIRST, OR A RE-RUN STACKS. `save_workout` has no upsert and no natural key — running this
 * script twice without this produced ten sessions and duplicate PRs the first time it was tried. Deleting
 * `workouts` cascades to `workout_exercises` and `workout_sets` (0001).
 */
for (const who of [reviewer, mate]) {
  const { error } = await who.sb.from('workouts').delete().eq('athlete_id', who.uid);
  if (error) throw new Error(`clear history: ${error.message}`);
  /*
   * ⚠ RECORDS AND TIMELINE TOO — THEY DO NOT CASCADE FROM `workouts`.
   *
   * `save_workout` writes `personal_records` and an ACCOMPLISHMENT `timeline_events` row alongside the
   * session, and neither has a foreign key to it — deliberately, because a record outlives the workout
   * that set it. So clearing only `workouts` let them accumulate: four runs of this seed produced
   * **twenty** personal records, four identical bench PRs among them, which the Legacy tab renders as
   * four separate achievements. Caught by `reviewer-verify.mjs` reporting 20 where 5 was right.
   */
  const rec = await who.sb.from('personal_records').delete().eq('athlete_id', who.uid);
  if (rec.error) throw new Error(`clear records: ${rec.error.message}`);
  const tl = await who.sb.from('timeline_events').delete().eq('athlete_id', who.uid);
  if (tl.error) throw new Error(`clear timeline: ${tl.error.message}`);
}
console.log('  cleared prior history, records and timeline');

/*
 * ⚠ `prs` IS NOT DECORATION — WITHOUT IT THE LEGACY TAB'S RECORDS SECTION IS EMPTY.
 *
 * `save_workout` does not detect records itself; the client computes them (`detectPRs`) and passes them in.
 * A first run of this seed sent `p_prs: []`, and the verify script duly reported `personal records: 0` — a
 * headline surface, blank, on the account Apple opens. Shape taken from 0124's insert:
 * `{ exercise, catalogKey, weight, reps }`.
 */
const SESSIONS = [
  { day: 18, name: 'Upper Strength', lifts: [
    ['Barbell Bench Press', 'barbell-bench-press', [[135, 8], [155, 8], [175, 6], [185, 5]]],
    ['Barbell Row', 'barbell-row', [[135, 8], [145, 8], [145, 8]]],
  ], prs: [{ exercise: 'Barbell Bench Press', catalogKey: 'barbell-bench-press', weight: 185, reps: 5 }] },
  { day: 15, name: 'Lower Strength', lifts: [
    ['Back Squat', 'back-squat', [[185, 5], [205, 5], [225, 5]]],
    ['Romanian Deadlift', 'romanian-deadlift', [[155, 8], [165, 8]]],
  ], prs: [{ exercise: 'Back Squat', catalogKey: 'back-squat', weight: 225, reps: 5 }] },
  { day: 11, name: 'Upper Strength', lifts: [
    ['Barbell Bench Press', 'barbell-bench-press', [[145, 8], [165, 6], [185, 5], [195, 3]]],
    ['Pull-Up', 'pull-up', [[0, 8], [0, 7], [0, 6]]],
  ], prs: [{ exercise: 'Barbell Bench Press', catalogKey: 'barbell-bench-press', weight: 195, reps: 3 }] },
  { day: 7, name: 'Lower Strength', lifts: [
    ['Back Squat', 'back-squat', [[205, 5], [225, 5], [245, 3]]],
    ['Walking Lunge', 'walking-lunge', [[40, 10], [40, 10]]],
  ], prs: [{ exercise: 'Back Squat', catalogKey: 'back-squat', weight: 245, reps: 3 }] },
  { day: 3, name: 'Upper Strength', lifts: [
    ['Barbell Bench Press', 'barbell-bench-press', [[155, 8], [175, 6], [195, 4], [205, 2]]],
    ['Overhead Press', 'overhead-press', [[95, 6], [95, 6], [95, 5]]],
  ], prs: [{ exercise: 'Barbell Bench Press', catalogKey: 'barbell-bench-press', weight: 205, reps: 2 }] },
];

for (const s of SESSIONS) {
  const exercises = s.lifts.map(([name, key, sets], position) => ({
    name,
    catalog_key: key,
    notes: null,
    section: 'main',
    position,
    group_id: null,
    group_name: null,
    group_kind: null,
    group_rounds: null,
    sets: sets.map(([weight, reps], i) => ({
      set_index: i,
      // `weight: 0` is BODYWEIGHT — an answer. `null` would mean unentered, which renders as an absence.
      weight,
      weight_unit: 'lb',
      reps,
      duration_sec: null,
      distance: null,
      distance_unit: null,
      completed: true,
    })),
  }));

  const { error } = await reviewer.sb.rpc('save_workout', {
    p_workout_name: s.name,
    p_activity_type: 'strength',
    p_started_at: iso(s.day),
    p_duration_sec: 52 * 60,
    p_notes: null,
    p_exercises: exercises,
    p_prs: s.prs ?? [],
    p_program_id: null,
    p_distance: null,
    p_distance_unit: null,
    p_template_id: null,
  });
  if (error) throw new Error(`workout ${s.name} (${s.day}d): ${error.message}`);
  console.log(`  ${s.day}d ago · ${s.name}`);
}

// A couple for the squadmate, so the squad feed and any shared surface has two people training in it.
for (const day of [9, 4]) {
  const { error } = await mate.sb.rpc('save_workout', {
    p_workout_name: 'Full Body',
    p_activity_type: 'strength',
    p_started_at: iso(day, 12),
    p_duration_sec: 40 * 60,
    p_notes: null,
    p_exercises: [{
      name: 'Goblet Squat', catalog_key: 'goblet-squat', notes: null, section: 'main', position: 0,
      group_id: null, group_name: null, group_kind: null, group_rounds: null,
      sets: [0, 1, 2].map((i) => ({
        set_index: i, weight: 50, weight_unit: 'lb', reps: 10,
        duration_sec: null, distance: null, distance_unit: null, completed: true,
      })),
    }],
    p_prs: [],
    p_program_id: null, p_distance: null, p_distance_unit: null, p_template_id: null,
  });
  if (error) throw new Error(`squadmate workout (${day}d): ${error.message}`);
  console.log(`  squadmate · ${day}d ago`);
}

// ── 3. Friendship ──────────────────────────────────────────────────────────────────────────────
//
// Mutual and accepted, so the Friends tab and the friends feed both have something in them. Requested by
// the squadmate and accepted by the reviewer — the direction matters only in that `remove_friendship`
// and the feed both key off the accepted row, not off who asked.
console.log('── Friendship ───────────────────────────');
{
  /*
   * ⚠ ASK THE STATE, DO NOT PATTERN-MATCH THE ERROR.
   *
   * A first version fired `request_friend` then `accept_friend_request` and tolerated errors matching
   * /already|not found/. On the second run that broke: the pair were already friends, so there was no
   * pending request and the RPC answered "no pending request from that athlete" — a correct, accurate
   * message that the regex did not cover. Tolerating errors by their wording means every re-run is one
   * rephrased message away from failing, so this asks `friendship_with` instead.
   */
  const state = await reviewer.sb.rpc('friendship_with', { p_athlete: mate.uid });
  const current = typeof state.data === 'string' ? state.data : state.data?.state ?? state.data?.status ?? null;

  if (current === 'friends' || current === 'ACCEPTED' || current === 'accepted') {
    console.log('  reviewer ↔ squadmate: already friends');
  } else {
    const req = await mate.sb.rpc('request_friend', { p_athlete: reviewer.uid });
    if (req.error) throw new Error(`friend request: ${req.error.message}`);
    const acc = await reviewer.sb.rpc('accept_friend_request', { p_athlete: mate.uid });
    if (acc.error) throw new Error(`accept: ${acc.error.message}`);
    console.log('  reviewer ↔ squadmate: friends');
  }
}


// ── 4. Squad, with a real second member ────────────────────────────────────────────────────────
console.log('── Squad ────────────────────────────────');
let squadId = null;
{
  /*
   * ⚠ `invite_code` IS NOT SELECTABLE — DO NOT ADD IT TO THIS SELECT.
   *
   * `0149` revoked the table-level SELECT on `squads` and re-granted each column individually, leaving
   * `invite_code` off the list on purpose: a readable code column is every private squad's front door.
   * `select id, invite_code from squads` raises **42501 for the whole statement**, which would take this
   * seed down at the squad step with an error that looks like a policy bug rather than a hidden column.
   *
   * The code comes from `squad_invite_info()` below, which is the only path the app itself uses.
   */
  const existing = await reviewer.sb.from('squads').select('id').eq('name', 'Iron Circle').maybeSingle();

  let inviteCode = null;
  squadId = existing.data?.id ?? null;

  if (!squadId) {
    const { data, error } = await reviewer.sb.rpc('create_squad', {
      p_name: 'Iron Circle',
      p_description: 'A few people who actually show up.',
      p_privacy: 'private',
      p_crest: 'swords',
      p_motto: 'Nobody carries it alone.',
      p_goal: null,
      p_category: null,
    });
    if (error) throw new Error(`create_squad: ${error.message}`);
    /*
     * ⚠ IT RETURNS `{ squad_id }` AND NOTHING ELSE — no invite code.
     *
     * A first draft read `row.invite_code` off this, got `undefined`, and would have skipped the join
     * silently, leaving the reviewer looking at a squad of one: the exact empty screen this file exists to
     * prevent, produced by the script meant to prevent it. The code is generated by a trigger
     * (`squads_set_invite_code`), so it has to be read back from the row.
     */
    const row = typeof data === 'string' ? JSON.parse(data) : data;
    squadId = row?.squad_id ?? null;
    console.log('  created Iron Circle');
  } else {
    console.log('  Iron Circle already exists — reusing');
  }

  if (!squadId) throw new Error('create_squad returned no squad_id — inspect its jsonb shape before re-running');

  // The one path that can see the code, and the one the app uses (`fetchSquadInvite`). Covers both the
  // just-created and the reused case.
  {
    const info = await reviewer.sb.rpc('squad_invite_info', { p_squad: squadId });
    if (info.error) throw new Error(`squad_invite_info: ${info.error.message}`);
    inviteCode = info.data?.invite_code ?? null;
  }

  if (inviteCode) {
    // `p_accept: true` skips the request queue. A pending request would leave the reviewer looking at a
    // squad of one, which is the exact empty screen this script exists to avoid.
    const join = await mate.sb.rpc('join_squad_by_code', { p_code: inviteCode, p_accept: true });
    if (join.error && !/already/i.test(join.error.message)) {
      console.log(`  ⚠ squadmate could not join: ${join.error.message}`);
    } else {
      console.log('  squadmate joined');
    }
  } else {
    console.log('  ⚠ no invite code returned — add the squadmate by hand before submitting');
  }
}

// ── 5. Squad feed ──────────────────────────────────────────────────────────────────────────────
//
// ⚠ POSTS FROM BOTH PEOPLE. A feed carrying only the reviewer's own posts still reads as an app nobody
// else uses, and it is also the surface where Guideline 1.2's Report control has to be demonstrable —
// which requires a post the reviewer did not write.
console.log('── Squad feed ───────────────────────────');
if (squadId) {
  await reviewer.sb.from('squad_posts').delete().eq('squad_id', squadId);
  /*
   * ⚠ `audience` DECIDES WHICH FEED A POST REACHES, AND IT DEFAULTS TO 'SQUAD' (0074).
   *
   * The first seeded run left it at the default and the verify script reported `friends_feed: 0 posts` —
   * reachable, and blank. `friends_feed` selects `audience in ('FRIENDS','BOTH')`, so a squad-only post is
   * invisible there by design. One post is marked 'BOTH' so the Friends tab has content too, and the rest
   * stay squad-only, which is also the more honest demonstration: the two feeds really are different.
   */
  const posts = [
    [mate, 'discussion', 'Back squat felt heavy today but it moved. Same time Thursday?', 'SQUAD'],
    [reviewer, 'pr', 'Bench 205 for a double. First time over two plates.', 'BOTH'],
    [mate, 'discussion', 'Nice. I am chasing 135 on that by spring.', 'SQUAD'],
  ];
  for (const [who, type, body, audience] of posts) {
    const { error } = await who.sb.from('squad_posts').insert({ squad_id: squadId, author_id: who.uid, type, body, audience });
    if (error) throw new Error(`squad post: ${error.message}`);
  }
  console.log(`  ${posts.length} posts, both authors`);

  /*
   * ⚠ NO CHECK-INS ARE SEEDED, AND THAT IS NOT AN OVERSIGHT.
   *
   * A first draft wrote `{ checkin_date, status: 'trained' }` here, from `0048`'s daily trained/rest
   * model. **`0049` DROPPED AND RECREATED THIS TABLE**: a check-in is now a VIDEO post
   * (`video_url text NOT NULL`), and the daily-state columns no longer exist. The insert failed with
   * "could not find the 'checkin_date' column", which is the honest answer.
   *
   * Seeding one would mean inventing a `video_url`, and a check-in whose video will not play is worse in a
   * reviewer's hands than no check-in at all — it turns "this squad has no videos yet" into "this app is
   * broken". The three squad posts above already carry the feed, which is what §10.6 actually needs.
   *
   * ⛔ If check-ins are ever wanted here, upload a real short clip to the `squad-media` bucket first and
   *    reference its public URL. Do not point this at a placeholder.
   */

}

// ── 6. A challenge, with both people in it ─────────────────────────────────────────────────────
//
// ⚠ A CHALLENGE WITH ONE ENTRANT RENDERS AS A LEADERBOARD OF ONE, which is the emptiest-looking screen in
// the app. Both accounts join.
console.log('── Challenge ────────────────────────────');
if (squadId) {
  const existing = await reviewer.sb
    .from('challenges').select('id').eq('squad_id', squadId).eq('name', 'February Volume').maybeSingle();

  let challengeId = existing.data?.id ?? null;
  if (!challengeId) {
    /*
     * ⚠ THE COLUMN NAMES ARE `creator_id` / `type` / `start_at` / `end_at` / `state`, and the enums are
     * upper-case. A first draft of this script guessed `created_by`, `metric`, `starts_at` and `status`,
     * and every one of those is a 42703 at run time. Taken from `createChallenge` in
     * `data/challenges-live.ts`, which is the only place that writes this table.
     */
    const starts = new Date();
    starts.setUTCDate(starts.getUTCDate() - 5);
    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + 9);
    const { data, error } = await reviewer.sb
      .from('challenges')
      .insert({
        context: 'SQUAD',
        squad_id: squadId,
        invited_ids: [],
        creator_id: reviewer.uid,
        name: 'February Volume',
        description: 'Most sessions logged before the window closes.',
        type: 'MOST_WORKOUTS',
        metric_key: null,
        tz: 'America/Denver',
        duration_type: 'CUSTOM',
        start_at: starts.toISOString(),
        end_at: ends.toISOString(),
        /*
         * ⚠ `ENROLLMENT`, NOT `ACTIVE` — and then advanced by the real state machine below.
         *
         * `0163`'s write-up records the trap: a competition whose window had already opened but whose
         * state was still ENROLLMENT expired seconds after creation, because the gate and the "Starts
         * Today" label disagreed. Writing `ACTIVE` by hand here would skip whatever `advance_challenges`
         * does on the way in and produce a row the app renders inconsistently.
         */
        state: 'ENROLLMENT',
      })
      .select('id')
      .single();
    if (error) throw new Error(`challenge: ${error.message}`);
    challengeId = data.id;
    console.log('  created February Volume');
  } else {
    console.log('  February Volume already exists — reusing');
  }

  /*
   * ⚠ INSERT ONLY IF ABSENT — `upsert` FAILS HERE ON THE SECOND RUN.
   *
   * With the row already present an upsert becomes an UPDATE, and `challenge_participants`' policy permits
   * an athlete to INSERT their own row but not to UPDATE one. The error is
   * "new row violates row-level security policy (USING expression)", which reads like a permissions bug in
   * the app and is actually the policy behaving exactly as intended.
   *
   * Same lesson as the friendship above: ask what is already true rather than relying on a write to be
   * idempotent for you.
   */
  for (const who of [reviewer, mate]) {
    const already = await who.sb
      .from('challenge_participants')
      .select('user_id')
      .eq('challenge_id', challengeId)
      .eq('user_id', who.uid)
      .maybeSingle();
    if (already.data) continue;
    const { error } = await who.sb
      .from('challenge_participants')
      .insert({ challenge_id: challengeId, user_id: who.uid });
    if (error) throw new Error(`join challenge: ${error.message}`);
  }
  console.log('  both in the competition');

  // Let the real state machine move ENROLLMENT → ACTIVE, rather than asserting the state by hand.
  const adv = await reviewer.sb.rpc('advance_challenges', { p_squad: squadId });
  if (adv.error) console.log(`  ⚠ advance_challenges: ${adv.error.message}`);
  const after = await reviewer.sb.from('challenges').select('state').eq('id', challengeId).single();
  console.log(`  state: ${after.data?.state ?? 'unknown'}`);
  if (after.data?.state !== 'ACTIVE') {
    console.log('  ⚠ not ACTIVE — the reviewer will see an enrolling competition, not a live leaderboard.');
  }
}

console.log('\n✅ Reviewer account seeded.');
console.log('   Sign in as SB_EMAIL to check every tab before pasting the credentials into App Store Connect.');
console.log('   ⚠ Reviewer notes: Docs/App-Store-Reviewer-Notes.md');
