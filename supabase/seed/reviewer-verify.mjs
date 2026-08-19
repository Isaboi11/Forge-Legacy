// Verify the App Store review account — Launch Checklist §10.6.
//
// Run: SB_EMAIL=… SB_PASS=… node supabase/seed/reviewer-verify.mjs
//
// ══ WHY THIS IS A SEPARATE SCRIPT FROM THE SEED ══
//
// The seed reports what it WROTE. This reports what the reviewer's own session can READ, which is a
// different question and the only one that matters — Apple signs in as this account and sees exactly what
// its JWT is allowed to see. A row written successfully and then hidden by RLS, a column-level grant or a
// definer function's own filter is invisible to the seed and fatal at review.
//
// ⚠ EVERY LINE HERE IS A SCREEN A REVIEWER OPENS. A zero is not a warning, it is the finding: an empty tab
//   reads as Guideline 2.1 "app incomplete" rather than as an account with no data.
//
// Two lines double as regression checks for this session's migrations, which is why they name them:
//   · `experience readable` proves `0172` repaired the per-column grants `0169` skipped. Before it, this
//     read raised 42501 and took Coach Holt's whole profile lookup with it.
//   · `friends_feed reachable` proves `0171`'s rebuild of that function did not break it. It is SECURITY
//     DEFINER, so no policy assertion can cover it — only calling it can.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await sb.auth.signInWithPassword({
  email: process.env.SB_EMAIL,
  password: process.env.SB_PASS,
});
if (error) throw new Error(`sign-in failed — Apple would hit this too: ${error.message}`);
const uid = data.user.id;

let bad = 0;
const say = (label, value, ok = Boolean(value) && value !== 0) => {
  if (!ok) bad += 1;
  console.log(`${ok ? '  ok  ' : '  ⚠   '} ${label}: ${value}`);
};

console.log(`signed in as ${process.env.SB_EMAIL}\n`);

const w = await sb.from('workouts').select('id').eq('athlete_id', uid);
say('workout history', w.error ? `FAILED ${w.error.message}` : (w.data?.length ?? 0));

const prof = await sb
  .from('profiles')
  .select('name, handle, onboarded_at, experience, training_goals')
  .eq('id', uid)
  .single();
say('profile name', prof.error ? `FAILED ${prof.error.message}` : prof.data?.name);
say('onboarded (else the reviewer lands in onboarding)', prof.error ? 'unknown' : Boolean(prof.data?.onboarded_at));
say(
  'experience readable  ← 0172 grant repair',
  prof.error ? `FAILED ${prof.error.message}` : (prof.data?.experience ?? 'null'),
);

// ⚠ THE FIRST SCREEN APPLE OPENS. Without an ACTIVE program Home renders its cold-start state — "Start
//   Freestyle Workout" and nothing else — which the first seeded run produced and no gate noticed.
const prog = await sb.from('programs').select('name, state').eq('athlete_id', uid).eq('state', 'active').maybeSingle();
say('ACTIVE program (else Home is empty)', prog.error ? `FAILED ${prog.error.message}` : (prog.data?.name ?? 'NONE'), Boolean(prog.data));

// ⚠ THE LEGACY TAB'S SPINE. With no chapter that whole tab renders blank — INCLUDING the personal
//   records below, which live inside a chapter's context rather than as a standalone list. A run with
//   5 real records and no chapter showed an empty Legacy tab and reported nothing wrong.
const ch = await sb.from('chapters').select('name, is_active, sealed_at').eq('athlete_id', uid);
const active = (ch.data ?? []).filter((c) => c.is_active).length;
const sealed = (ch.data ?? []).filter((c) => c.sealed_at).length;
say('chapters (need ≥1 active)', ch.error ? `FAILED ${ch.error.message}` : `${active} active, ${sealed} sealed`, active >= 1);

const pr = await sb.from('personal_records').select('id').eq('athlete_id', uid);
say('personal records', pr.error ? `FAILED ${pr.error.message}` : (pr.data?.length ?? 0));

const hub = await sb.rpc('challenge_hub');
say('challenge hub reachable', hub.error ? `FAILED ${hub.error.message}` : 'yes', !hub.error);

const sq = await sb.from('squad_members').select('squad_id').eq('user_id', uid);
say('squads joined', sq.error ? `FAILED ${sq.error.message}` : (sq.data?.length ?? 0));

if (sq.data?.[0]) {
  const sid = sq.data[0].squad_id;
  const feed = await sb.rpc('squad_feed', { p_squad: sid, p_limit: 20, p_offset: 0 });
  say('squad feed posts', feed.error ? `FAILED ${feed.error.message}` : (feed.data?.length ?? 0));
  const mem = await sb.from('squad_members').select('user_id').eq('squad_id', sid);
  // ⚠ Two is the number that matters. One member is the empty-looking squad this whole exercise exists
  //   to prevent, and it renders as a working screen.
  const n = mem.error ? 0 : (mem.data?.length ?? 0);
  say('squad members (must be ≥2)', n, n >= 2);
}

const ff = await sb.rpc('friends_feed', { p_limit: 20 });
say(
  'friends_feed reachable ← 0171 rebuild',
  ff.error ? `FAILED ${ff.error.message}` : `${ff.data?.length ?? 0} posts`,
  !ff.error,
);

const bl = await sb.rpc('my_blocked_athletes');
say('blocked list reachable ← 0171', bl.error ? `FAILED ${bl.error.message}` : 'yes', !bl.error);

console.log(
  bad === 0
    ? '\n✅ Every surface a reviewer opens has content and is readable by this account.'
    : `\n⚠ ${bad} problem(s) above. Each one is a screen Apple would open and find empty or broken.`,
);
process.exit(bad === 0 ? 0 : 1);
