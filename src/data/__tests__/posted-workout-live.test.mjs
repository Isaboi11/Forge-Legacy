import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * A SQUATOBER DAY, END TO END (PO 2026-09-27) — through the REAL `planned-workout-live.ts`.
 *
 * The poster writes Day 7 as it is on the card; it goes into the post's `layout`; a member taps Take it
 * (`take_posted_workout`, which copies the exercises into their one Home slot exactly as 0192's SQL does); Home
 * reads the slot back; the logger builds its sets. Every percentage, rep scheme, rest and note has to survive
 * that whole trip — through JSON, through the database, back out — and arrive as the member's own weights.
 */

const { db, ATHLETE } = await import('./harness/fake-supabase.mjs');
const live = await import('../planned-workout-live.ts');
const { readWrittenWorkout, writtenToTemplate } = await import('../../domain/workout/written-workout.ts');
const { prescribedSets, hasPrescription, maxKeyOf, maxKeysNeeded } = await import('../../domain/workout/template-prescription.ts');
const { LB_RULES } = await import('../../domain/program/percent-max.ts');

const KEY = (n) =>
  ({ 'Back Squat': 'barbell-back-squat', 'Bench Press': 'barbell-bench-press', 'Close Grip Bench Press': 'barbell-close-grip-bench-press', 'Single-Arm Dumbbell Row': 'single-arm-dumbbell-row' })[n];

const DAY7 = `"THE COUNTDOWN"
Day: 7 Monday 10-07-24
Warm Up: Get Loose and hit some light KB Swings 3 sets of 10 reps.
1. BACK SQUAT 5 total sets 15 total reps 2 min rest
5 reps @ 65%
4 reps @ 75%
3 reps @ 80%
2 reps @ 87%
1 rep @ 92%
2. a. BENCH PRESS "same as above"
super set b. ONE ARM DB Rows 5 sets of 5 reps
2 to 2½ min rest
Cardio
Close Grip Bench Press
Get 100 reps with 33% of your Bench Max.
Recovery
Steak & mashed potatoes
Big Sleep 8+ hrs`;

/** 0192's `take_posted_workout`, as the database runs it: RLS-visible post → the athlete's one slot, replaced. */
function installTake() {
  db.rpcs.take_posted_workout = ({ p_post }) => {
    const post = db.rows('squad_posts').find((p) => p.id === p_post && p.type === 'workout');
    if (!post?.layout) throw new Error('That workout is no longer available.');
    const slots = db.rows('planned_workouts').filter((r) => r.athlete_id !== ATHLETE);
    slots.push({
      athlete_id: ATHLETE,
      name: String(post.layout.name).slice(0, 60),
      /* jsonb: what comes back out is what JSON can carry — the round trip the test is here to prove. */
      exercises: JSON.parse(JSON.stringify(post.layout.exercises)),
      source_post_id: post.id,
      source_squad_id: post.squad_id,
      source_author_id: post.author_id,
      created_at: new Date().toISOString(),
    });
    db.tables.set('planned_workouts', slots);
    return post.layout.name;
  };
}

function postDay7() {
  const w = readWrittenWorkout(DAY7);
  const layout = { kind: 'posted-workout', name: w.name, exercises: writtenToTemplate(w, KEY), how: w.how, after: w.after };
  db.rows('squad_posts').push({ id: 'post-7', squad_id: 'sq-1', author_id: 'coach', type: 'workout', layout: JSON.parse(JSON.stringify(layout)) });
  return layout;
}

test.beforeEach(() => {
  db.reset();
  installTake();
});

test('posted → taken → on Home: the ramp, the percentages, the rest and the notes all survive the trip', async () => {
  const layout = postDay7();
  const name = await live.takePostedWorkout('post-7');
  assert.equal(name, 'Day 7: The Countdown');

  const slot = await live.fetchPlannedWorkout();
  assert.equal(slot.name, 'Day 7: The Countdown');
  assert.equal(slot.source.postId, 'post-7');
  assert.deepEqual(slot.exercises, JSON.parse(JSON.stringify(layout.exercises)), 'byte for byte what was posted');
  assert.match(slot.brief.how, /KB Swings 3 sets of 10/);
  assert.match(slot.brief.after, /Steak & mashed potatoes/);

  const [squat, bench, row, cg] = slot.exercises;
  assert.deepEqual(squat.repScheme, [5, 4, 3, 2, 1]);
  assert.deepEqual(squat.percentScheme, [65, 75, 80, 87, 92]);
  assert.equal(squat.restSec, 120);
  assert.equal(bench.groupId, row.groupId);
  assert.equal(bench.groupKind, 'superset');
  assert.equal(row.restSec, 150);
  assert.equal(cg.percentOf, 'barbell-bench-press');
});

test('the member starts it: THEIR weights, from THEIR maxes — two athletes, one post, two sets of numbers', async () => {
  postDay7();
  await live.takePostedWorkout('post-7');
  const slot = await live.fetchPlannedWorkout();
  const needed = maxKeysNeeded(slot.exercises.map((e) => ({ maxKey: hasPrescription(e) ? maxKeyOf(e) : null })));
  assert.deepEqual(needed, ['barbell-back-squat', 'barbell-bench-press'], 'the maxes sheet asks for exactly these two');

  const strong = { maxes: { 'barbell-back-squat': 405, 'barbell-bench-press': 315 }, unit: 'lb', rules: LB_RULES };
  const newer = { maxes: { 'barbell-back-squat': 185, 'barbell-bench-press': 135 }, unit: 'lb', rules: LB_RULES };
  assert.deepEqual(prescribedSets(slot.exercises[0], strong).map((s) => s.targetWeight), [265, 305, 325, 350, 375]);
  assert.deepEqual(prescribedSets(slot.exercises[0], newer).map((s) => s.targetWeight), [120, 140, 150, 160, 170]);
  assert.deepEqual(prescribedSets(slot.exercises[1], newer).map((s) => s.targetWeight), [90, 100, 110, 115, 125]);
  assert.equal(prescribedSets(slot.exercises[3], newer)[0].targetWeight, 45, '33% of 135 = 44.6 → never below the empty bar');
  const rests = prescribedSets(slot.exercises[2], strong).map((s) => s.restSec);
  assert.deepEqual(rests, [150, 150, 150, 150, 150]);
});

test('taking it again, or taking a newer post, replaces the one slot — never two workouts on Home', async () => {
  postDay7();
  await live.takePostedWorkout('post-7');
  await live.takePostedWorkout('post-7');
  assert.equal(db.rows('planned_workouts').length, 1);
  db.rows('squad_posts').push({ id: 'post-8', squad_id: 'sq-1', author_id: 'coach', type: 'workout', layout: { kind: 'posted-workout', name: 'Day 8', exercises: [{ name: 'Back Squat', catalogKey: 'barbell-back-squat', sets: 5, targetReps: 5, percentOfMax: 75 }] } });
  await live.takePostedWorkout('post-8');
  const slot = await live.fetchPlannedWorkout();
  assert.equal(slot.name, 'Day 8');
  assert.equal(slot.brief, null, 'a post with no notes brings none — never the last one\'s');
  assert.equal(db.rows('planned_workouts').length, 1);
});

test('a post deleted after it was taken still starts — the notes are simply gone, the workout is not', async () => {
  postDay7();
  await live.takePostedWorkout('post-7');
  db.tables.set('squad_posts', []);
  const slot = await live.fetchPlannedWorkout();
  assert.equal(slot.exercises.length, 4, 'the slot holds its own copy (SQ-A5-D1.1)');
  assert.equal(slot.brief, null);
});

test('a take that cannot reach the post says so — it never empties the slot', async () => {
  postDay7();
  await live.takePostedWorkout('post-7');
  await assert.rejects(() => live.takePostedWorkout('post-gone'), /no longer available/);
  assert.equal((await live.fetchPlannedWorkout()).name, 'Day 7: The Countdown');
});
