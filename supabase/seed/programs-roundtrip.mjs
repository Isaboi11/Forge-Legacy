// programs backend round-trip (0013) — the "build my own" save path. A fresh user creates a B1-shaped
// program (name + daysPerWeek + each day's `main`; warmup/cooldown empty, vary false), reads it back, and
// confirms the FULL .dc-shaped structure round-trips through the JSONB column. Also asserts owner RLS.
//
// Requires 0013 applied (hand-applied in the Supabase SQL editor) + Confirm-email OFF.
//   node supabase/seed/programs-roundtrip.mjs
import { anonClient } from './_client.mjs';

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };

const fresh = anonClient();
const { data: su, error: se } = await fresh.auth.signUp({ email: `isaiahaltamirano+prog${Date.now()}@gmail.com`, password: 'forge-test-1!' });
if (se || !su.session) { console.log(`  ✗ signUp: ${se?.message ?? 'no session'}`); process.exit(1); }
const fid = su.user.id;

// A B1 subset written into the full .dc shape (C fills warmup/cooldown/vary/weekPlans later, no schema change).
const structure = {
  name: 'My PPL', weeks: 8, daysPerWeek: 3, vary: false, weekPlans: null,
  days: [
    { letter: 'A', name: 'Push', warmup: [], main: [{ catalogKey: 'barbell-bench-press', name: 'Barbell Bench Press' }], cooldown: [] },
    { letter: 'B', name: 'Pull', warmup: [], main: [{ catalogKey: 'barbell-row', name: 'Barbell Row' }], cooldown: [] },
    { letter: 'C', name: 'Legs', warmup: [], main: [{ catalogKey: 'barbell-back-squat', name: 'Barbell Back Squat' }], cooldown: [] },
  ],
};

console.log('\n  PROGRAMS SAVE ROUND-TRIP');
const { data: ins, error: ie } = await fresh.from('programs').insert({ athlete_id: fid, name: structure.name, structure }).select('id').single();
if (ie) console.log('    insert error:', ie.message, '(is 0013 applied?)');
check(!ie && !!ins?.id, 'createProgram inserts (owner RLS permits self-write)');

const { data: rows, error: re } = await fresh.from('programs').select('id, name, structure').eq('athlete_id', fid);
check(!re && rows?.length === 1, 'fetchMyPrograms reads it back (one row)');
const got = rows?.[0];
check(got?.name === 'My PPL', 'name round-trips');
check(got?.structure?.daysPerWeek === 3 && got?.structure?.days?.length === 3, 'structure (daysPerWeek + days) round-trips');
check(got?.structure?.days?.[0]?.main?.[0]?.catalogKey === 'barbell-bench-press', 'day A main exercise round-trips (catalogKey)');
check(Array.isArray(got?.structure?.days?.[0]?.warmup) && got.structure.days[0].warmup.length === 0, 'warmup empty — the full .dc shape is preserved (B1 subset, C fills it)');

// RLS: another fresh athlete cannot read this program
const other = anonClient();
const { data: ou } = await other.auth.signUp({ email: `isaiahaltamirano+prog2${Date.now()}@gmail.com`, password: 'forge-test-1!' });
if (ou?.session && ins?.id) {
  const { data: leak } = await other.from('programs').select('id').eq('id', ins.id);
  check((leak ?? []).length === 0, 'RLS: another athlete cannot read the program');
  await other.from('profiles').delete().eq('id', ou.user.id);
}

// cleanup (auth users linger — admin-delete needed)
await fresh.from('programs').delete().eq('athlete_id', fid);
await fresh.from('profiles').delete().eq('id', fid);
console.log('  · cleaned up fresh rows');

console.log(`\n  ${fails.length === 0 ? 'PASS — programs save/read round-trip + owner RLS' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
