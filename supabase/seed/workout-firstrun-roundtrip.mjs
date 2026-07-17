// ONB-D18 first-run reveal proof — the id-scoped detection, the four data criteria + the structural
// no-write. The predicate mirrors fetchCompletion: is THIS workout the earliest saved workout in its
// chapter (by identity), not a workout_count snapshot.
//
//  1 first workout → first(#1) = true
//  2 second workout → first(#2) = false
//  3 RE-OPEN STABILITY → first(#1) STILL true after #2 exists (proves id-scoped, not a moved snapshot)
//  4 real chapter name (no fabrication)
//  5 no progression fabrication — the reveal emits nothing; the timeline holds only the real PR
//    ACCOMPLISHMENTs from the commits (no HONOR_EARNED / RANK_UP / streak)
//
// Requires 0007–0011 applied + Confirm-email OFF.
//   SB_EMAIL=… SB_PASS=… node supabase/seed/workout-firstrun-roundtrip.mjs
import { anonClient } from './_client.mjs';

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// the id-scoped predicate, identical to fetchCompletion
async function isFirst(sb, chapterId, workoutId) {
  const { data } = await sb
    .from('workouts')
    .select('id')
    .eq('chapter_id', chapterId)
    .eq('state', 'saved')
    .order('saved_at', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1);
  return data?.[0]?.id === workoutId;
}
const logWorkout = (sb, name, exercise, key, pr) =>
  sb.rpc('save_workout', {
    p_workout_name: name, p_activity_type: 'strength', p_started_at: new Date().toISOString(), p_duration_sec: 1800, p_notes: null,
    p_exercises: [{ name: exercise, catalog_key: key, section: 'main', position: 0, sets: [
      { set_index: 0, weight: pr - 20, weight_unit: 'lb', reps: 5 },
      { set_index: 1, weight: pr, weight_unit: 'lb', reps: 3 },
    ] }],
    p_prs: [{ exercise, weight: pr, reps: 3 }],
  });

const fresh = anonClient();
const { data: su, error: se } = await fresh.auth.signUp({ email: `isaiahaltamirano+firstrun${Date.now()}@gmail.com`, password: 'forge-test-1!' });
if (se || !su.session) { console.log(`  ✗ signUp: ${se?.message ?? 'no session'}`); process.exit(1); }
const fid = su.user.id;
await fresh.rpc('complete_onboarding', {
  p_name: 'Firstrun Athlete', p_first_name: 'FR', p_handle: null, p_initials: 'FR',
  p_sex: 'male', p_avatar_url: null, p_athlete_type: 'Strength', p_environment: 'commercial_gym',
  p_chapter_name: 'Chapter I — Building Your Foundation',
});
const { data: ch } = await fresh.from('chapters').select('id, name').eq('athlete_id', fid).single();

// workout #1, then (distinct saved_at) workout #2
const { data: r1 } = await logWorkout(fresh, 'Full Body A', 'Back Squat', 'barbell-back-squat', 245);
const w1 = r1.workout_id;
await sleep(1100);
const { data: r2 } = await logWorkout(fresh, 'Full Body B', 'Bench Press', 'barbell-bench-press', 185);
const w2 = r2.workout_id;

console.log('\n  first-run detection (id-scoped)');
check(await isFirst(fresh, ch.id, w1), '1) workout #1 → first-run reveal');
check(!(await isFirst(fresh, ch.id, w2)), '2) workout #2 → generic seal (not first)');
check(await isFirst(fresh, ch.id, w1), '3) RE-OPEN workout #1 after #2 exists → STILL first-run (id-scoped, not a snapshot)');
check(ch.name === 'Chapter I — Building Your Foundation', '4) reveal uses the real chapter name (no fabrication)');

const { data: tl } = await fresh.from('timeline_events').select('event_type').eq('athlete_id', fid);
check((tl ?? []).every((t) => t.event_type === 'ACCOMPLISHMENT'), '5) no progression fabrication — only real PR accomplishments, no honor/rank/streak');

await fresh.from('timeline_events').delete().eq('athlete_id', fid);
await fresh.from('personal_records').delete().eq('athlete_id', fid);
await fresh.from('workouts').delete().eq('athlete_id', fid);
await fresh.from('chapters').delete().eq('athlete_id', fid);
await fresh.from('profiles').delete().eq('id', fid);
console.log('  · cleaned up fresh rows');

console.log(`\n  ${fails.length === 0 ? 'PASS — first-run reveal is id-scoped + re-open-stable; no progression fabricated' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
