// Honor slice gate proof — the data-provable criteria (the 4-beat + honor-hero re-walk is by eyeball).
// One fresh athlete, in order:
//   5 ROLLBACK-COVERS-HONORS : save_workout with a malformed PR → rolls back the workout AND the honor
//     that would have fired (first_workout_logged) — nothing persists.
//   1 HEADLINE (D19) + 4 NO-FAB : first real workout earns first_workout_logged, and ONLY that (not _25
//     nor _in_chapter_10 on a 1-workout, count-1 athlete).
//   hero : the earned honor is matched by awarded_at = saved_at (the W-17 honor hero, id-scoped).
//   2 IDEMPOTENCY (DB) : re-run evaluate_honors → no second row (the two partial unique indexes do it).
//   3 REPEATABLE/CHAPTER : _in_chapter_10 fires once per chapter — same chapter re-eval → no dup; a NEW
//     chapter hitting 10 → earns again (distinct chapter_id).
//   6 LEGACY-FROM-DB : honor_instances rows exist for the Legacy Honors section to read.
//
// Requires 0007–0012 applied + Confirm-email OFF.
//   SB_EMAIL=… SB_PASS=… node supabase/seed/honor-roundtrip.mjs
import { anonClient } from './_client.mjs';

const nowIso = new Date().toISOString();
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };
const types = (rows) => (rows ?? []).map((r) => r.honor_type).sort();
const squat = (name, pr) => ({
  p_workout_name: name, p_activity_type: 'strength', p_started_at: nowIso, p_duration_sec: 1800, p_notes: null,
  p_exercises: [{ name: 'Back Squat', catalog_key: 'barbell-back-squat', section: 'main', position: 0, sets: [{ set_index: 0, weight: 225, weight_unit: 'lb', reps: 5 }] }],
  p_prs: pr,
});

const fresh = anonClient();
const { data: su, error: se } = await fresh.auth.signUp({ email: `isaiahaltamirano+honor${Date.now()}@gmail.com`, password: 'forge-test-1!' });
if (se || !su.session) { console.log(`  ✗ signUp: ${se?.message ?? 'no session'}`); process.exit(1); }
const fid = su.user.id;
await fresh.rpc('complete_onboarding', {
  p_name: 'Honor Athlete', p_first_name: 'H', p_handle: null, p_initials: 'HA',
  p_sex: 'male', p_avatar_url: null, p_athlete_type: 'Strength', p_environment: 'commercial_gym',
  p_chapter_name: 'Chapter I — Building Your Foundation',
});
const { data: ch1 } = await fresh.from('chapters').select('id').eq('athlete_id', fid).single();

// ── 5) rollback covers honors ──
console.log('\n  5) ROLLBACK COVERS HONORS');
const { error: rbErr } = await fresh.rpc('save_workout', squat('Bad', [{ exercise: 'Back Squat', weight: null, reps: 5 }]));
check(!!rbErr, 'malformed commit raises');
const { count: wc0 } = await fresh.from('workouts').select('id', { count: 'exact', head: true }).eq('athlete_id', fid);
const { count: hc0 } = await fresh.from('honor_instances').select('id', { count: 'exact', head: true }).eq('athlete_id', fid);
check(wc0 === 0 && hc0 === 0, 'no workout AND no honor persisted — honors rolled back with the workout');

// ── 1) headline + 4) no fabrication ──
console.log('\n  1) HEADLINE (D19) + 4) NO FABRICATION');
const { data: r1 } = await fresh.rpc('save_workout', squat('Full Body A', [{ exercise: 'Back Squat', weight: 225, reps: 5 }]));
const { data: h1 } = await fresh.from('honor_instances').select('honor_type').eq('athlete_id', fid);
check(JSON.stringify(types(h1)) === JSON.stringify(['first_workout_logged']), 'earns first_workout_logged, and ONLY that (not _25 / _in_chapter_10)');
const { data: wk } = await fresh.from('workouts').select('saved_at').eq('id', r1.workout_id).single();
const { data: hero } = await fresh.from('honor_instances').select('honor_type').eq('athlete_id', fid).eq('awarded_at', wk.saved_at);
check(JSON.stringify(types(hero)) === JSON.stringify(['first_workout_logged']), 'W-17 hero: honor matched by awarded_at = saved_at (id-scoped)');

// ── 2) DB idempotency ──
console.log('\n  2) IDEMPOTENCY (DB-enforced)');
const { data: again } = await fresh.rpc('evaluate_honors', { p_source: 'live_session' });
const { count: hcAfter } = await fresh.from('honor_instances').select('id', { count: 'exact', head: true }).eq('athlete_id', fid);
check((again ?? []).length === 0 && hcAfter === 1, 're-run evaluate_honors → nothing new, no second row (partial unique indexes)');

// ── 3) repeatable per chapter ──
console.log('\n  3) REPEATABLE PER CHAPTER');
await fresh.from('chapters').update({ workout_count: 10 }).eq('id', ch1.id);
await fresh.rpc('evaluate_honors', { p_source: 'live_session' });
const { data: chapA } = await fresh.from('honor_instances').select('id').eq('athlete_id', fid).eq('honor_type', 'workouts_in_chapter_10');
check(chapA?.length === 1, 'chapter I hits 10 → _in_chapter_10 (one row)');
await fresh.rpc('evaluate_honors', { p_source: 'live_session' });
const { data: chapA2 } = await fresh.from('honor_instances').select('id').eq('athlete_id', fid).eq('honor_type', 'workouts_in_chapter_10');
check(chapA2?.length === 1, 'same chapter re-eval → no dup');
const { data: ch2 } = await fresh.from('chapters').insert({ athlete_id: fid, name: 'Chapter II', start_date: '2026-01-01', is_active: false, workout_count: 10 }).select('id').single();
await fresh.rpc('evaluate_honors', { p_source: 'live_session' });
const { data: chapBoth } = await fresh.from('honor_instances').select('chapter_id').eq('athlete_id', fid).eq('honor_type', 'workouts_in_chapter_10');
const distinct = new Set((chapBoth ?? []).map((r) => r.chapter_id));
check(chapBoth?.length === 2 && distinct.size === 2 && distinct.has(ch1.id) && distinct.has(ch2.id), 'new chapter hits 10 → earns again (distinct chapter_id, 2 rows)');

// ── 6) Legacy from DB ──
const { count: legacyCount } = await fresh.from('honor_instances').select('id', { count: 'exact', head: true }).eq('athlete_id', fid);
check(legacyCount >= 1, 'honor_instances rows exist for the Legacy Honors section (fixture retired)');

// cleanup (honors FK chapters → delete honors first)
await fresh.from('honor_instances').delete().eq('athlete_id', fid);
await fresh.from('timeline_events').delete().eq('athlete_id', fid);
await fresh.from('personal_records').delete().eq('athlete_id', fid);
await fresh.from('workouts').delete().eq('athlete_id', fid);
await fresh.from('chapters').delete().eq('athlete_id', fid);
await fresh.from('profiles').delete().eq('id', fid);
console.log('  · cleaned up fresh rows');

console.log(`\n  ${fails.length === 0 ? 'PASS — rollback covers honors · D19 headline · no-fab · DB idempotency · repeatable/chapter · Legacy-from-DB' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
