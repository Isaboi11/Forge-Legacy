import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * SEASON TWELVE, DAY 1 — THE PHOTO PATH, END TO END, ON WHAT THE LIVE PROMPTS REALLY RETURNED (PO 2026-09-30).
 *
 * The PO photographed the card; nine squat sets were posted as one. The fixtures are the deployed prompts' own
 * answers for that photo (`fixtures/squatober-2026-day1.mjs`), so this file proves the path the PO agreed to that
 * day — every photo gets the AI pass, and the code still reads and checks every number — without spending again.
 */

const { readWrittenWorkout, writtenToTemplate, tsvToWrittenText, checkBeforePosting, tallyMismatch } = await import('../written-workout.ts');
const { whenToUseAi, checkAiRewrite } = await import('../workout-ai-gate.ts');
const { sanitizeTranscript } = await import('../../program/photo-transcript.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const S12 = await import('./fixtures/squatober-2026-day1.mjs');

const resolveKey = (n) => resolveExerciseName(n)?.key;
const read = (text) => {
  const w = readWrittenWorkout(text);
  return { w, rows: writtenToTemplate(w, resolveKey) };
};
const find = (rows, re) => rows.find((r) => re.test(r.name));
const repsOf = (r) => r.repScheme ?? Array.from({ length: r.sets }, () => r.targetReps);
const pctsOf = (r) => r.percentScheme ?? Array.from({ length: r.sets }, () => r.percentOfMax ?? null);
/** A lift's rest, whether it was written once for the lift or on every set. */
const restsOf = (r) => [...new Set(r.restScheme ?? [r.restSec ?? null])];

/** Everything the card prescribes, checked on a reading. */
function assertTheCard(rows, label) {
  const squat = find(rows, /back squat/i);
  const bench = find(rows, /bench/i);
  const dead = find(rows, /dead\s*lift/i);
  const dips = find(rows, /dips/i);
  const curls = find(rows, /curl/i);
  const pinch = find(rows, /pinch/i);
  assert.ok(squat && bench && dead && dips && curls && pinch, `${label}: all six lifts`);
  assert.equal(rows.length, 6, `${label}: six lifts and no seventh`);
  assert.deepEqual([squat.sets, repsOf(squat), pctsOf(squat)], [9, [5, 5, 5, 3, 3, 3, 1, 1, 1], [60, 65, 70, 73, 75, 78, 82, 85, 87]], `${label}: squat`);
  assert.deepEqual([bench.sets, repsOf(bench), pctsOf(bench)], [5, [3, 3, 3, 3, 3], [70, 75, 80, 80, 80]], `${label}: bench`);
  assert.deepEqual([dead.sets, repsOf(dead), pctsOf(dead)], [4, [3, 3, 3, 3], [75, 75, 75, 75]], `${label}: deadlift`);
  assert.deepEqual([dips.sets, dips.targetReps, dips.repsMax], [3, 8, 12], `${label}: dips`);
  assert.deepEqual([curls.sets, curls.targetReps], [3, 15], `${label}: curls`);
  assert.equal(pinch.sets, 3, `${label}: pinch holds`);
  assert.match(pinch.coachNote ?? '', /20 seconds/, `${label}: the hold's time is kept`);
  return { squat, bench, dead, dips, curls, pinch };
}

test('the photo as a table: a short row no longer throws, and every lift has its sets', () => {
  const clean = sanitizeTranscript(S12.S12_DAY1_TABLE);
  assert.equal(clean.ok, true);
  const box = tsvToWrittenText(clean.tsv);
  assert.doesNotMatch(box, /sets sets|reps reps|undefined/);
  const { w, rows } = read(box);
  const { squat, bench, dead } = assertTheCard(rows, 'table');
  assert.deepEqual([restsOf(squat), restsOf(bench), restsOf(dead)], [[120], [90], [90]]);
  assert.match(dead.coachNote, /No tapping or Bouncing/);
  assert.match(w.how, /Trunk Twists/, 'the warm-up is the warm-up, not lift number one');
  assert.match(w.after, /STEAK and Eggs · 30 min Walk · 8\+ hrs of DEEP sleep/);
  /* The table wrote the block into the lifts' names, so the rules say so and AI is asked. */
  assert.equal(whenToUseAi(box, w, rows).kind, 'ai');
});

for (const [label, source, tidied] of [
  ['table → AI layout, run 1', () => tsvToWrittenText(sanitizeTranscript(S12.S12_DAY1_TABLE).tsv), S12.S12_DAY1_TABLE_TIDY_1],
  ['table → AI layout, run 2', () => tsvToWrittenText(sanitizeTranscript(S12.S12_DAY1_TABLE).tsv), S12.S12_DAY1_TABLE_TIDY_2],
  ['whole card → AI layout, run 1', () => S12.S12_DAY1_CARD, S12.S12_DAY1_CARD_TIDY_1],
  ['whole card → AI layout, run 2', () => S12.S12_DAY1_CARD, S12.S12_DAY1_CARD_TIDY_2],
]) {
  test(`${label}: accepted by the check, and reads as the card is written`, () => {
    /* "DEAD lift" on the card, "Deadlift" in the rewrite: a faithful rewrite, and no longer thrown away for it. */
    assert.deepEqual(checkAiRewrite(source(), tidied, resolveKey), []);
    const { w, rows } = read(tidied);
    const { squat, bench, dead, dips, curls, pinch } = assertTheCard(rows, label);
    assert.deepEqual([restsOf(squat), restsOf(bench), restsOf(dead)], [[120], [90], [90]], 'every rest');
    assert.ok(dips.groupId && dips.groupId === curls.groupId && curls.groupId === pinch.groupId, 'super set all 3');
    assert.deepEqual([dips.restSec, curls.restSec, pinch.restSec], [90, 90, 90]);
    assert.match(dead.coachNote, /No tapping or bouncing/i);
    assert.match(w.how, /Trunk Twists/);
    assert.match(w.after, /Steak and Eggs/i);
    assert.equal(whenToUseAi(tidied, w, rows).kind, 'rules', 'nothing left for the poster but a name to check');
    assert.ok(!checkBeforePosting(w, rows).some((c) => /not read as sets|total sets|total reps|no reps were read|name may have/.test(c)));
  });
}

test('the whole card as the pen laid it out is NOT read by the rules alone — and the card’s own tally says so', () => {
  /* Two columns of handwriting come back interleaved ("• 9 total sets      3 reps 73%, 75%, 78%"). */
  const { w, rows } = read(S12.S12_DAY1_CARD);
  const squat = w.exercises.find((e) => /back squat/i.test(e.name));
  assert.deepEqual(squat.tally, { sets: 9, reps: 27 });
  assert.match(tallyMismatch(squat), /9 total sets, and 3 were read/);
  assert.ok(checkBeforePosting(w, rows).some((c) => /the card says 9 total sets/.test(c)));
  const call = whenToUseAi(S12.S12_DAY1_CARD, w, rows);
  assert.equal(call.kind, 'ai');
  assert.ok(call.reasons.some((r) => /9 total sets/.test(r)));
});

test('a tally that agrees says nothing; one that disagrees is named', () => {
  const ok = readWrittenWorkout('1. BACK SQUAT 4,6,8,6,4 reps @ 67%\n5 total sets, 28 total reps').exercises[0];
  assert.equal(tallyMismatch(ok), null);
  const sets = readWrittenWorkout('1. BACK SQUAT 5 reps @ 60%\n9 total sets').exercises[0];
  assert.match(tallyMismatch(sets), /9 total sets, and 1 was read/);
  const reps = readWrittenWorkout('1. BACK SQUAT 4,6,8,6,4 reps @ 67%\n5 total sets, 30 total reps').exercises[0];
  assert.match(tallyMismatch(reps), /30 total reps, and 28 were read/);
  /* "6 total sets of 30 yds" is a set count, not a tally. */
  assert.equal(readWrittenWorkout('1. Farmers Walk 6 total sets of 30 yds').exercises[0].tally, undefined);
});
