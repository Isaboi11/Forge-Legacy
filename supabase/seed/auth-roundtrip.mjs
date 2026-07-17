// 0.2 gate — the FIRST real signUp round-trip in the front-end rebuild. Proves the auth graft the UI
// wires to: fresh signUp yields a usable session (soft-verification / O-1 Decision 4), signIn works,
// a bad password surfaces an error. REPORTS the Confirm-email setting explicitly — if it's ON, that
// surfaces HERE, not silently later.
//   node supabase/seed/auth-roundtrip.mjs
import { anonClient } from './_client.mjs';

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };

const email = `isaiahaltamirano+auth${Date.now()}@gmail.com`;
const password = 'forge-test-1!';

// 1) fresh signUp → session present iff Confirm-email OFF (the soft-verification the boot router needs)
const c1 = anonClient();
const { data: su, error: se } = await c1.auth.signUp({ email, password });
if (se) { console.log(`  ✗ signUp raised: ${se.message}`); process.exit(1); }
const confirmEmailOff = !!su.session;
console.log(
  `\n  CONFIRM-EMAIL: ${confirmEmailOff
    ? 'OFF ✓ — fresh signup has a usable session; soft-verification works, boot router can route to onboarding.'
    : 'ON ✗ — fresh signup has NO session; soft-verification BROKEN. Toggle Supabase Auth → Email → "Confirm email" OFF.'}`,
);
check(!!su.user, 'signUp created a user');
check(confirmEmailOff, 'fresh signUp yields a usable session (Confirm-email OFF)');

// 2) signOut → signIn with the SAME creds → session present (the returning-athlete path)
await c1.auth.signOut();
const c2 = anonClient();
const { data: si, error: sie } = await c2.auth.signInWithPassword({ email, password });
check(!sie && !!si.session, 'signIn with correct creds → session present');

// 3) signIn with a BAD password → error surfaced, no session (the error the UI shows)
const c3 = anonClient();
const { data: bad, error: badErr } = await c3.auth.signInWithPassword({ email, password: 'wrong-password-x' });
check(!!badErr && !bad?.session, 'signIn with a bad password → error surfaced, no session');

// cleanup — delete the trigger-minted profile row (owner RLS); the auth.users row lingers (needs
// service_role to remove), an accepted throwaway artifact like the other round-trips.
const { data: whoami } = await c2.auth.getUser();
if (whoami?.user) {
  await c2.from('profiles').delete().eq('id', whoami.user.id);
  console.log('  · cleaned up profile row (auth user lingers — needs service_role to delete)');
}

console.log(`\n  ${fails.length === 0 ? 'PASS — Confirm-email OFF · signUp→session · signIn→session · bad-pw→error' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
