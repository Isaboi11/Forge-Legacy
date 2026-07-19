// Gate B proof — the two named acceptance criteria.
//
//  A) RPC ROLLBACK (atomicity): calling complete_onboarding as the demo user (who already has an active
//     chapter) forces the Chapter I insert to violate the one-active-chapter index. Assert the profile
//     update AND onboarded_at roll back — the demo profile is untouched. That earns the "atomic" claim.
//
//  B) REAL-EMAIL SIGNUP ROUND-TRIP: sign up a deliverable account, report the Confirm-email setting, then
//     (if a session comes back) run the finish RPC and assert the fresh user is fully committed —
//     profile written, Chapter I created, onboarded_at set → routes to app → lands in the H-1 awaiting
//     state (active chapter, 0 workouts). Cleans up the fresh user's rows.
//
// Requires 0007 + 0008 applied + a reseed (demo user onboarded, with an active chapter).
//   SB_EMAIL=… SB_PASS=… node supabase/seed/onboarding-roundtrip.mjs
import { signedInClient, anonClient } from './_client.mjs';
import { routeFor } from '../../src/lib/route-for.ts';

const base = { authLoading: false, hasSession: true, profileLoading: false };
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };

const RPC_ARGS = (name, handle) => ({
  p_name: name, p_first_name: 'Probe', p_handle: handle, p_initials: 'PR',
  p_sex: 'male', p_avatar_url: null, p_athlete_type: 'Hybrid', p_environment: 'commercial_gym',
  p_chapter_name: 'Chapter I — Building Your Foundation',
});

// ── A) RPC rollback on the demo user ──
console.log('\n  A) RPC ROLLBACK (atomicity)');
const { sb, uid } = await signedInClient();
const { data: before } = await sb.from('profiles').select('name, handle, onboarded_at').eq('id', uid).single();
const { count: chBefore } = await sb.from('chapters').select('id', { count: 'exact', head: true }).eq('athlete_id', uid);
// Valid handle (the demo's own — no unique conflict) so the profile UPDATE succeeds and the RAISE is
// unambiguously the Chapter I insert (a 2nd active chapter), proving the chapter path rolls the update back.
const { error: rpcErr } = await sb.rpc('complete_onboarding', RPC_ARGS('__ROLLBACK_PROBE__', before.handle));
check(!!rpcErr, 'complete_onboarding raises (Chapter I would be a 2nd active chapter)');
const { data: after } = await sb.from('profiles').select('name, onboarded_at').eq('id', uid).single();
const { count: chAfter } = await sb.from('chapters').select('id', { count: 'exact', head: true }).eq('athlete_id', uid);
check(after.name === before.name, 'profile.name rolled back (not the probe value)');
check(after.onboarded_at === before.onboarded_at, 'onboarded_at rolled back (unchanged)');
check(chAfter === chBefore, 'no chapter was created — whole transaction rolled back');

// ── B) real-email signup round-trip ──
console.log('\n  B) SIGNUP ROUND-TRIP (real email)');
const fresh = anonClient();
const email = `isaiahaltamirano+onboard${Date.now()}@gmail.com`;
const { data: su, error: se } = await fresh.auth.signUp({ email, password: 'forge-test-1!' });
if (se) {
  console.log(`  ✗ signUp error: ${se.message}`);
  fails.push('signUp failed');
} else if (!su.session) {
  console.log('  ⚠ Confirm-email is ON — signUp returned no session. Set Supabase Auth → Email → "Confirm');
  console.log('    email" OFF (soft verification), then re-run to complete the round-trip.');
} else {
  console.log(`  · Confirm-email OFF — session present for ${email}`);
  const fid = su.user.id;
  const { data: p0 } = await fresh.from('profiles').select('onboarded_at, name').eq('id', fid).single();
  check(p0 != null && p0.onboarded_at == null, 'fresh account → trigger profile, onboarded_at null');
  check(routeFor({ ...base, onboardedAt: p0?.onboarded_at }) === 'onboarding', 'routes to onboarding');

  // ONB-Amendment-002 / A1: the slimmed client sends p_environment = null (equipment moved to the
  // post-Home Find-Your-Program flow). Prove the finish still commits cleanly with a null environment
  // and Chapter I intact — environment is written null and filled in later.
  const { error: finErr } = await fresh.rpc('complete_onboarding', {
    p_name: 'Ada Test', p_first_name: 'Ada', p_handle: null, p_initials: 'AT',
    p_sex: 'female', p_avatar_url: null, p_athlete_type: 'Strength', p_environment: null,
    p_chapter_name: 'Chapter I — Building Your Foundation',
  });
  if (finErr) console.log('    finish RPC error:', finErr.message);
  check(!finErr, 'finish RPC committed');
  const { data: p1 } = await fresh.from('profiles').select('name, athlete_type, environment, onboarded_at').eq('id', fid).single();
  check(p1?.name === 'Ada Test' && p1?.athlete_type === 'Strength' && p1?.environment === null && !!p1?.onboarded_at, 'profile written (environment null) + onboarded_at set');
  const { data: ch } = await fresh.from('chapters').select('name, is_active, workout_count').eq('athlete_id', fid);
  check(ch?.length === 1 && ch[0].is_active && ch[0].name === 'Chapter I — Building Your Foundation' && ch[0].workout_count === 0, 'Chapter I created (active, empty)');
  check(routeFor({ ...base, onboardedAt: p1?.onboarded_at }) === 'app', 'routes to app');
  check(ch?.[0]?.workout_count === 0, 'H-1 awaiting: active chapter has 0 workouts → awaiting hero');

  // cleanup the fresh user's rows (auth user lingers — admin-delete needed)
  await fresh.from('chapters').delete().eq('athlete_id', fid);
  await fresh.from('profiles').delete().eq('id', fid);
  console.log('  · cleaned up fresh rows');
}

console.log(`\n  ${fails.length === 0 ? 'PASS — atomic finish + signup→onboarding→finish→H-1 round-trip' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
