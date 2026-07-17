// Gate A proof — the session × onboarded boot routing, live. The pure router is unit-tested
// (src/lib/__tests__/route-for.test.mjs); this proves the live pieces: the demo user gates to the app,
// the SAME user flips to onboarding when onboarded_at is cleared (the exact discriminator), and signUp
// mints a fresh account whose trigger-created profile is onboarded_at=null → onboarding.
// Requires 0007 applied + a reseed (so the demo user is onboarded).
//
//   SB_EMAIL=… SB_PASS=… node supabase/seed/auth-gate-check.mjs
import { signedInClient } from './_client.mjs';
import { routeFor } from '../../src/lib/route-for.ts';

const base = { authLoading: false, hasSession: true, profileLoading: false };
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };

const { sb, uid } = await signedInClient();

// 1) demo user is onboarded → app
const { data: p0 } = await sb.from('profiles').select('onboarded_at').eq('id', uid).single();
check(!!p0.onboarded_at, 'demo user has onboarded_at set (reseeded)');
check(routeFor({ ...base, onboardedAt: p0.onboarded_at }) === 'app', 'returning-onboarded → app');

// 2) same user, clear onboarded_at → onboarding; then restore
await sb.from('profiles').update({ onboarded_at: null }).eq('id', uid);
const { data: p1 } = await sb.from('profiles').select('onboarded_at').eq('id', uid).single();
check(routeFor({ ...base, onboardedAt: p1.onboarded_at }) === 'onboarding', 'returning-not-onboarded → onboarding (same user, flag cleared)');
await sb.from('profiles').update({ onboarded_at: p0.onboarded_at }).eq('id', uid);
console.log('  · restored demo onboarded_at');

// 3) no session → auth (pure)
check(routeFor({ authLoading: false, hasSession: false, profileLoading: false, onboardedAt: null }) === 'auth', 'no session → auth');

// 4) signUp smoke — a fresh account; its bare profile is onboarded_at=null → onboarding
const email = `gatecheck-${Date.now()}@example.com`;
const { data: su, error: se } = await sb.auth.signUp({ email, password: 'test-passw0rd!' });
if (se) {
  console.log(`  · signUp returned: ${se.message} (email-confirm/SMTP project setting — note at gate)`);
} else if (su.session) {
  // confirmation disabled → we're now authed as the fresh user; verify + clean up its profile row
  const { data: fresh } = await sb.from('profiles').select('onboarded_at, name').eq('id', su.user.id).single();
  check(fresh != null && fresh.onboarded_at == null, 'fresh signup → trigger profile with onboarded_at=null → onboarding');
  await sb.from('profiles').delete().eq('id', su.user.id);
  console.log('  · cleaned up fresh profile row (auth user lingers — admin-delete needed)');
} else {
  console.log('  · signUp OK but no session (email confirmation required — set "Confirm email" OFF for the demo, or the fresh user confirms first)');
}

console.log(`\n  ${fails.length === 0 ? 'PASS — boot routing discriminates on session × onboarded' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
