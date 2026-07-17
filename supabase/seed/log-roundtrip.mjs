// Phase 3 round-trip proof — log → persist → it appears in the Legacy timeline.
//
// Exercises the same write sequence as src/domain/training/log-workout.ts against the live DB (authed,
// RLS-scoped to self): logs a session with two lifts — Back Squat 325 (beats the seeded 315 → PR) and
// Deadlift 395 (below the seeded 485 → NO PR) — then asserts the rows persisted, the PR was derived,
// an ACCOMPLISHMENT landed at the TOP of the timeline (what fetchLegacyData reads), and the active
// chapter's workout_count incremented. Cleans everything up so the demo DB stays at the seeded baseline.
//
//   SB_EMAIL=… SB_PASS=… node supabase/seed/log-roundtrip.mjs
import { signedInClient } from './_client.mjs';

const EVENT_LABEL = { CHAPTER_SEALED: 'Chapter Sealed', ACCOMPLISHMENT: 'Accomplishment', HONOR_EARNED: 'Honor Earned', PROGRAM_GRADUATED: 'Program Graduated', GOAL_ACHIEVED: 'Goal Achieved', RANK_UP: 'Rank Up' };
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };
const timelineTop = (rows) => rows.slice(0, 3).map((e) => `${EVENT_LABEL[e.event_type] ?? e.event_type} · ${e.object_name}`);

const { sb, uid } = await signedInClient();
const nowIso = new Date().toISOString();
const today = nowIso.slice(0, 10);
const lifts = [
  { name: 'Back Squat', weight: 325, reps: 3, catalogKey: 'barbell-back-squat' },
  { name: 'Deadlift', weight: 395, reps: 3, catalogKey: 'barbell-deadlift' },
];

// ── BEFORE ──
const { data: chapter } = await sb.from('chapters').select('id, workout_count').eq('athlete_id', uid).eq('is_active', true).maybeSingle();
const { data: tlBefore } = await sb.from('timeline_events').select('event_type, object_name, occurred_at').eq('athlete_id', uid).order('occurred_at', { ascending: false });
const { data: sqBefore } = await sb.from('personal_records').select('load_value').eq('athlete_id', uid).eq('exercise', 'Back Squat').eq('measure_kind', 'load').order('load_value', { ascending: false }).limit(1);
console.log('\n  BEFORE  timeline:', JSON.stringify(timelineTop(tlBefore)), '· Back Squat max:', sqBefore?.[0]?.load_value, '· workouts:', chapter?.workout_count);

// ── WRITE (mirrors the interim write path, since superseded by save_workout / W-9) ──
const prIds = [], tlIds = [];
let workoutId = null;
try {
  const { data: wk, error: we } = await sb.from('workouts').insert({
    athlete_id: uid, chapter_id: chapter?.id ?? null, workout_name: 'Lower A', activity_type: 'strength',
    started_at: nowIso, saved_at: nowIso, duration_sec: 3600, state: 'saved',
  }).select('id').single();
  if (we) throw we;
  workoutId = wk.id;

  const { data: exs, error: ee } = await sb.from('workout_exercises').insert(
    lifts.map((l, i) => ({ workout_id: workoutId, catalog_key: l.catalogKey, name: l.name, section: 'main', position: i })),
  ).select('id, position');
  if (ee) throw ee;
  const exByPos = new Map(exs.map((r) => [r.position, r.id]));

  const { error: se } = await sb.from('workout_sets').insert(
    lifts.map((l, i) => ({ workout_exercise_id: exByPos.get(i), set_index: 0, weight: l.weight, weight_unit: 'lb', reps: l.reps })),
  );
  if (se) throw se;

  const prs = [];
  for (const l of lifts) {
    const { data: best } = await sb.from('personal_records').select('load_value').eq('athlete_id', uid).eq('exercise', l.name).eq('measure_kind', 'load').order('load_value', { ascending: false }).limit(1);
    const max = best?.[0]?.load_value ?? null;
    if (max != null && l.weight <= max) continue;
    const { data: pr } = await sb.from('personal_records').insert({ athlete_id: uid, exercise: l.name, achieved_on: today, measure_kind: 'load', load_value: l.weight, load_unit: 'lb', load_reps: l.reps }).select('id').single();
    prIds.push(pr.id);
    const { data: tl } = await sb.from('timeline_events').insert({ athlete_id: uid, event_type: 'ACCOMPLISHMENT', object_name: `${l.name} — ${l.weight} lb PR`, chapter_id: chapter?.id ?? null, occurred_at: nowIso, source_entity_type: 'personal_record', source_entity_id: pr.id }).select('id').single();
    tlIds.push(tl.id);
    prs.push(l.name);
  }
  if (chapter) await sb.from('chapters').update({ workout_count: (chapter.workout_count ?? 0) + 1 }).eq('id', chapter.id);

  // ── AFTER + assertions ──
  const { data: exsAfter } = await sb.from('workout_exercises').select('id').eq('workout_id', workoutId);
  const { data: setsAfter } = await sb.from('workout_sets').select('id').in('workout_exercise_id', exsAfter.map((r) => r.id));
  const { data: tlAfter } = await sb.from('timeline_events').select('event_type, object_name, occurred_at').eq('athlete_id', uid).order('occurred_at', { ascending: false });
  const { data: sqAfter } = await sb.from('personal_records').select('load_value').eq('athlete_id', uid).eq('exercise', 'Back Squat').eq('measure_kind', 'load').order('load_value', { ascending: false }).limit(1);
  const { data: dlAfter } = await sb.from('personal_records').select('load_value').eq('athlete_id', uid).eq('exercise', 'Deadlift').eq('measure_kind', 'load').order('load_value', { ascending: false }).limit(1);
  const { data: chAfter } = await sb.from('chapters').select('workout_count').eq('id', chapter.id).single();
  console.log('  AFTER   timeline:', JSON.stringify(timelineTop(tlAfter)), '· Back Squat max:', sqAfter?.[0]?.load_value, '· workouts:', chAfter.workout_count, '\n');

  check(exsAfter.length === 2, 'workout persisted with 2 exercises');
  check(setsAfter.length === 2, 'workout persisted with 2 performed sets');
  check(prs.includes('Back Squat') && !prs.includes('Deadlift'), 'PR derived for Back Squat (325 > 315), NOT for Deadlift (395 < 485)');
  check(sqAfter?.[0]?.load_value === 325, 'Back Squat max is now 325');
  check(dlAfter?.[0]?.load_value === 485, 'Deadlift max unchanged at 485');
  check(tlAfter[0].event_type === 'ACCOMPLISHMENT' && tlAfter[0].object_name === 'Back Squat — 325 lb PR', 'PR is the TOP timeline entry (what Legacy shows first)');
  check(chAfter.workout_count === (chapter.workout_count ?? 0) + 1, 'active chapter workout_count incremented');
} finally {
  // ── CLEANUP — restore the seeded baseline ──
  if (tlIds.length) await sb.from('timeline_events').delete().in('id', tlIds);
  if (prIds.length) await sb.from('personal_records').delete().in('id', prIds);
  if (workoutId) await sb.from('workouts').delete().eq('id', workoutId);
  if (chapter) await sb.from('chapters').update({ workout_count: chapter.workout_count }).eq('id', chapter.id);
  console.log('  cleaned up — demo DB restored to seeded baseline');
}

console.log(`\n  ${fails.length === 0 ? 'PASS — round-trip proven: log → persist → appears in Legacy timeline' : `FAIL — ${fails.length} assertion(s)`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
