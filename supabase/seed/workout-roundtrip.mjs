// W-9 gate proof — the five acceptance criteria (data layer).
//
//  A) ATOMIC ROLLBACK: save_workout with valid exercises but a malformed PR (null weight → the
//     pr_measure_shape CHECK fires mid-commit). Assert NOTHING persisted — no workout, chapter
//     workout_count unchanged. That earns "atomic".
//  B) HEADLINE: a FRESH onboarded athlete logs a workout → multi-set persists → PR derived → a real
//     Legacy-timeline ACCOMPLISHMENT is the top entry → active chapter workout_count 0→1 (Home flips
//     off "awaiting first workout"). The render is the PO's eyeball; this proves the data + write.
//  (Resume is client-local AsyncStorage — verified by eyeball, not here.)
//
// Requires 0007–0010 applied + Confirm-email OFF.
//   SB_EMAIL=… SB_PASS=… node supabase/seed/workout-roundtrip.mjs
import { signedInClient, anonClient } from './_client.mjs';

const nowIso = new Date().toISOString();
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };
const EX = (name, key, sets) => ({ name, catalog_key: key, section: 'main', position: 0, sets });

// ── A) atomic rollback (demo user) ──
console.log('\n  A) ATOMIC ROLLBACK');
const { sb, uid } = await signedInClient();
const { count: wBefore } = await sb.from('workouts').select('id', { count: 'exact', head: true }).eq('athlete_id', uid);
const { data: chB } = await sb.from('chapters').select('id, workout_count').eq('athlete_id', uid).eq('is_active', true).single();
const { error: rbErr } = await sb.rpc('save_workout', {
  p_workout_name: 'ROLLBACK', p_activity_type: 'strength', p_started_at: nowIso, p_duration_sec: 100, p_notes: null,
  p_exercises: [EX('Probe', 'x', [{ set_index: 0, weight: 100, weight_unit: 'lb', reps: 5 }])],
  p_prs: [{ exercise: 'Probe', weight: null, reps: 5 }], // null weight → CHECK violation mid-commit
});
check(!!rbErr, 'save_workout raises on the malformed PR (mid-commit)');
const { count: wAfter } = await sb.from('workouts').select('id', { count: 'exact', head: true }).eq('athlete_id', uid);
const { data: chA } = await sb.from('chapters').select('workout_count').eq('id', chB.id).single();
check(wAfter === wBefore, 'no workout persisted — rolled back');
check(chA.workout_count === chB.workout_count, 'chapter workout_count unchanged — rolled back');

// ── B) headline: fresh athlete → log → timeline + off-awaiting ──
console.log('\n  B) HEADLINE — fresh athlete logs first workout');
const fresh = anonClient();
const email = `isaiahaltamirano+workout${Date.now()}@gmail.com`;
const { data: su, error: se } = await fresh.auth.signUp({ email, password: 'forge-test-1!' });
if (se || !su.session) {
  console.log(`  ✗ signUp: ${se?.message ?? 'no session (Confirm-email ON?)'}`);
  fails.push('fresh signUp failed');
} else {
  const fid = su.user.id;
  await fresh.rpc('complete_onboarding', {
    p_name: 'Test Athlete', p_first_name: 'Test', p_handle: null, p_initials: 'TA',
    p_sex: 'male', p_avatar_url: null, p_athlete_type: 'Strength', p_environment: 'commercial_gym',
    p_chapter_name: 'Chapter I — Building Your Foundation',
  });
  const { data: ch0 } = await fresh.from('chapters').select('id, workout_count').eq('athlete_id', fid).single();
  check(ch0.workout_count === 0, 'fresh Chapter I starts at 0 workouts (Home = awaiting)');

  const { error: swErr } = await fresh.rpc('save_workout', {
    p_workout_name: 'Full Body A', p_activity_type: 'strength', p_started_at: nowIso, p_duration_sec: 2400, p_notes: null,
    p_exercises: [EX('Back Squat', 'barbell-back-squat', [
      { set_index: 0, weight: 225, weight_unit: 'lb', reps: 5 },
      { set_index: 1, weight: 225, weight_unit: 'lb', reps: 5 },
      { set_index: 2, weight: 245, weight_unit: 'lb', reps: 3 },
    ])],
    p_prs: [{ exercise: 'Back Squat', weight: 245, reps: 3 }], // first lift → PR (no prior)
  });
  check(!swErr, 'save_workout committed');

  const { data: wk } = await fresh.from('workouts').select('id, state').eq('athlete_id', fid);
  check(wk?.length === 1 && wk[0].state === 'saved', 'workout persisted (state=saved)');
  const { data: exs } = await fresh.from('workout_exercises').select('id').eq('workout_id', wk[0].id);
  const { data: sets } = await fresh.from('workout_sets').select('id').in('workout_exercise_id', (exs ?? []).map((e) => e.id));
  check(sets?.length === 3, 'all 3 sets persisted');
  const { data: pr } = await fresh.from('personal_records').select('exercise, load_value').eq('athlete_id', fid);
  check(pr?.some((p) => p.exercise === 'Back Squat' && p.load_value === 245), 'PR derived (Back Squat 245)');
  const { data: tl } = await fresh.from('timeline_events').select('event_type, object_name').eq('athlete_id', fid).order('occurred_at', { ascending: false });
  check(tl?.[0]?.event_type === 'ACCOMPLISHMENT' && tl[0].object_name === 'Back Squat — 245 lb PR', 'real Legacy-timeline entry is the top event');
  const { data: ch1 } = await fresh.from('chapters').select('workout_count').eq('id', ch0.id).single();
  check(ch1.workout_count === 1, 'chapter workout_count 0→1 — Chapter I moves OFF "awaiting first workout"');

  // cleanup fresh rows
  await fresh.from('timeline_events').delete().eq('athlete_id', fid);
  await fresh.from('personal_records').delete().eq('athlete_id', fid);
  await fresh.from('workouts').delete().eq('athlete_id', fid);
  await fresh.from('chapters').delete().eq('athlete_id', fid);
  await fresh.from('profiles').delete().eq('id', fid);
  console.log('  · cleaned up fresh rows');
}

console.log(`\n  ${fails.length === 0 ? 'PASS — atomic finish + fresh-athlete log → timeline entry + chapter off-awaiting' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
