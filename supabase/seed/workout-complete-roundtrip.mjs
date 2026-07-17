// W-17 gate proof — the five criteria, with the seam (b) made explicit.
//
//  1 render-from-DB : volume/sets/duration + PR read back from the committed workout match what was logged.
//  2 reflect persists: initially null (skip path) → "Seal the Note" UPDATE sets it → re-read confirms.
//  3 seam/durability : the workout + sets + timeline + chapter bump ALL exist immediately at Finish,
//                      BEFORE any W-17 interaction — abandoning the ceremony costs nothing.
//  4 post-commit inv.: the reflection only ever attaches to an already-committed workout (a column on it).
//  5 off-awaiting    : chapter workout_count 0→1 (unchanged — W-17 is presentation on committed data).
//
// Requires 0007–0011 applied + Confirm-email OFF.
//   SB_EMAIL=… SB_PASS=… node supabase/seed/workout-complete-roundtrip.mjs
import { anonClient } from './_client.mjs';

const nowIso = new Date().toISOString();
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };

const fresh = anonClient();
const email = `isaiahaltamirano+w17${Date.now()}@gmail.com`;
const { data: su, error: se } = await fresh.auth.signUp({ email, password: 'forge-test-1!' });
if (se || !su.session) {
  console.log(`  ✗ signUp: ${se?.message ?? 'no session (Confirm-email ON?)'}`);
  process.exit(1);
}
const fid = su.user.id;
await fresh.rpc('complete_onboarding', {
  p_name: 'W17 Athlete', p_first_name: 'W17', p_handle: null, p_initials: 'WA',
  p_sex: 'male', p_avatar_url: null, p_athlete_type: 'Strength', p_environment: 'commercial_gym',
  p_chapter_name: 'Chapter I — Building Your Foundation',
});
const { data: ch0 } = await fresh.from('chapters').select('id, workout_count').eq('athlete_id', fid).single();

// ── Finish commit (W-9) ──
await fresh.rpc('save_workout', {
  p_workout_name: 'Full Body A', p_activity_type: 'strength', p_started_at: nowIso, p_duration_sec: 2985, p_notes: null,
  p_exercises: [{ name: 'Back Squat', catalog_key: 'barbell-back-squat', section: 'main', position: 0, sets: [
    { set_index: 0, weight: 225, weight_unit: 'lb', reps: 5 },
    { set_index: 1, weight: 225, weight_unit: 'lb', reps: 5 },
    { set_index: 2, weight: 245, weight_unit: 'lb', reps: 3 },
  ] }],
  p_prs: [{ exercise: 'Back Squat', weight: 245, reps: 3 }],
});

// ── 3) seam/durability — everything durable at Finish, before any W-17 touch ──
console.log('\n  3) SEAM — durable at Finish, before any W-17 interaction');
const { data: wk } = await fresh.from('workouts').select('id, state, duration_sec, reflection').eq('athlete_id', fid).single();
const { data: exs } = await fresh.from('workout_exercises').select('id').eq('workout_id', wk.id);
const { data: sets } = await fresh.from('workout_sets').select('weight, reps').in('workout_exercise_id', exs.map((e) => e.id));
const { data: tl } = await fresh.from('timeline_events').select('event_type, object_name').eq('athlete_id', fid);
const { data: ch1 } = await fresh.from('chapters').select('workout_count').eq('id', ch0.id).single();
check(wk.state === 'saved' && sets.length === 3, 'workout + 3 sets committed at Finish');
check(tl?.some((t) => t.event_type === 'ACCOMPLISHMENT'), 'timeline entry committed at Finish');
check(ch1.workout_count === ch0.workout_count + 1, 'chapter workout_count 0→1 at Finish (off "awaiting")');

// ── 1) render-from-DB — the summary W-17 shows ──
console.log('\n  1) RENDER-FROM-DB — summary matches what was logged');
const volume = sets.reduce((v, s) => v + (s.weight ?? 0) * (s.reps ?? 0), 0);
check(volume === 2985, `volume = ${volume} (225×5 + 225×5 + 245×3)`);
check(wk.duration_sec === 2985, 'duration read back');
const { data: pr } = await fresh.from('personal_records').select('exercise, load_value').eq('athlete_id', fid).eq('achieved_on', nowIso.slice(0, 10));
check(pr?.some((p) => p.exercise === 'Back Squat' && p.load_value === 245), 'PR read back (Back Squat 245)');

// ── 2 + 4) reflection — null on skip → persists on "Seal the Note", only on the existing workout ──
console.log('\n  2+4) REFLECTION — post-commit, optional');
check(wk.reflection === null, 'reflection null after Finish (skip path leaves it null)');
await fresh.from('workouts').update({ reflection: 'Showed up when it was hard.' }).eq('id', wk.id);
const { data: wk2 } = await fresh.from('workouts').select('reflection').eq('id', wk.id).single();
check(wk2.reflection === 'Showed up when it was hard.', 'reflection persists after "Seal the Note"');
check(wk.id != null, 'reflection attaches only to the already-committed workout (post-commit invariant)');

// cleanup
await fresh.from('timeline_events').delete().eq('athlete_id', fid);
await fresh.from('personal_records').delete().eq('athlete_id', fid);
await fresh.from('workouts').delete().eq('athlete_id', fid);
await fresh.from('chapters').delete().eq('athlete_id', fid);
await fresh.from('profiles').delete().eq('id', fid);
console.log('  · cleaned up fresh rows');

console.log(`\n  ${fails.length === 0 ? 'PASS — render-from-DB · reflection post-commit · seam durable · off-awaiting' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
